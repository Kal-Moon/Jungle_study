import { NODE_TYPES, isVNode, render } from '../vdom/index.js';
import { diff } from '../diff/index.js';
import { applyPatches } from '../patch/index.js';
import { setCurrentComponent, HOOK_ORDER_CHANGED_MESSAGE } from './hookContext.js';

const LIFECYCLE = Object.freeze({
  READY: 'ready',
  MOUNTED: 'mounted',
  UNMOUNTED: 'unmounted',
});

// 이 클래스가 던지는 에러 문구. 앞의 [FunctionComponent]는 createErrorMessage가 붙인다.
const ERROR_TEXTS = Object.freeze({
  BAD_ROOT_COMPONENT: 'RootComponent는 함수여야 합니다',
  BAD_CONTAINER: 'container는 DOM 요소여야 합니다',
  BAD_ROOT_VNODE: '루트는 element VNode여야 합니다',
  HOOK_ORDER_CHANGED: HOOK_ORDER_CHANGED_MESSAGE,
});

// 메서드별로 호출할 수 없는 생명주기와 그때의 에러 메시지. (Phase 2 문서 6.2, 6.5)
// 생명주기나 메시지를 바꾸려면 이 표만 고친다. 표에 없는 조합은 호출할 수 있다.
const LIFECYCLE_ERROR_BY_ACTION = new Map([
  ['mount', new Map([
    [LIFECYCLE.MOUNTED, '이미 mount되었습니다'],
    [LIFECYCLE.UNMOUNTED, '해제된 컴포넌트는 다시 mount할 수 없습니다'],
  ])],
  ['update', new Map([
    [LIFECYCLE.READY, 'mount 전에 update할 수 없습니다'],
    [LIFECYCLE.UNMOUNTED, '해제된 뒤에는 update할 수 없습니다'],
  ])],
  ['unmount', new Map([
    [LIFECYCLE.READY, 'mount 전에 unmount할 수 없습니다'],
    [LIFECYCLE.UNMOUNTED, '이미 해제되었습니다'],
  ])],
]);

/**
 * 루트 함수형 컴포넌트의 실행·갱신·해제를 관리한다. (Phase 2 문서 6장)
 * DOM은 Phase 1의 render(최초)와 applyPatches(갱신)로만 바꾼다.
 */
export class FunctionComponent {
  #lifecycle = LIFECYCLE.READY;
  // mount·update 한 번(렌더링 → DOM 반영 → Effect 실행)이 진행 중인지
  #isUpdating = false;
  #hasQueuedUpdate = false;
  // 마지막 update가 DOM 반영 전에 실패해 화면이 상태보다 뒤처져 있는지
  #isViewStale = false;

  /**
   * @param {Function} RootComponent 루트 컴포넌트 함수
   * @param {object} props 루트 컴포넌트에 넘길 props
   * @param {Element} container 루트 DOM을 넣을 컨테이너
   * @throws {TypeError} RootComponent가 함수가 아니거나 container가 DOM 요소가 아닐 때
   */
  constructor(RootComponent, props, container) {
    if (typeof RootComponent !== 'function') {
      throw new TypeError(createErrorMessage(ERROR_TEXTS.BAD_ROOT_COMPONENT));
    }

    if (!(container instanceof Element)) {
      throw new TypeError(createErrorMessage(ERROR_TEXTS.BAD_CONTAINER));
    }

    this.RootComponent = RootComponent;
    this.props = props;
    this.container = container;
    this.hooks = [];
    this.hookIndex = 0;
    this.currentVNode = null;
    this.rootNode = null;
    this.pendingEffects = [];
    // 루트 컴포넌트 함수를 실행하는 중인지. 이때 상태 변경 함수를 부르면 useState가 에러를 낸다.
    this.isRendering = false;
  }

  /** @returns {boolean} mount되어 있고 아직 해제되지 않았으면 true */
  get isMounted() {
    return this.#lifecycle === LIFECYCLE.MOUNTED;
  }

  /**
   * 상태는 바뀌었는데 렌더링·반영이 실패해 화면이 뒤처져 있으면 true.
   * 이때는 같은 값으로 상태를 바꿔도 useState가 다시 갱신을 요청한다.
   * @returns {boolean}
   */
  get isViewStale() {
    return this.#isViewStale;
  }

  /** @returns {boolean} 아직 한 번도 반영하지 않아 Hook 칸을 새로 만들 수 있으면 true */
  get isFirstRender() {
    return this.currentVNode === null;
  }

  /**
   * 최초 렌더링. 만든 DOM 하나만 container에 넣고 Effect를 실행한다. (6.2)
   * @returns {void}
   * @throws {Error} 이미 mount되었거나 해제된 뒤일 때
   * @throws {TypeError} 루트 컴포넌트가 element VNode를 돌려주지 않을 때
   */
  mount() {
    this.#assertLifecycleAllows('mount');
    this.hooks = [];

    this.#runUpdateCycle(() => {
      const nextVNode = this.#renderRoot();
      const rootNode = render(nextVNode);

      this.container.replaceChildren(rootNode);
      this.#saveRendered(nextVNode, rootNode);
      this.#lifecycle = LIFECYCLE.MOUNTED;
    });
  }

  /**
   * 루트 컴포넌트를 다시 실행하고 바뀐 곳만 DOM에 반영한 뒤 Effect를 실행한다. (6.3)
   * @returns {void}
   * @throws {Error} mount 전이거나 해제된 뒤일 때, Hook 호출 순서가 바뀌었을 때
   * @throws {TypeError} 루트 컴포넌트가 element VNode를 돌려주지 않을 때
   */
  update() {
    this.#assertLifecycleAllows('update');

    // Effect 안에서 update()를 직접 불러도 진행 중인 과정이 끝난 뒤에 한다. (순서가 섞이지 않게)
    if (this.#isUpdating) {
      this.#hasQueuedUpdate = true;
      return;
    }

    this.#runUpdateCycle(() => {
      // 아래에서 에러가 나면 true로 남아, 상태와 화면이 어긋났음을 알린다.
      this.#isViewStale = true;

      const nextVNode = this.#renderRoot();
      // 루트가 교체되어도 applyPatches가 돌려준 새 루트를 쓴다.
      const rootNode = applyPatches(this.rootNode, diff(this.currentVNode, nextVNode));

      this.#saveRendered(nextVNode, rootNode);
      this.#isViewStale = false;
    });
  }

  /**
   * 남은 Effect cleanup을 Hook 순서대로 호출하고 루트 DOM을 container에서 뗀다. (6.4)
   * 해제한 뒤에는 상태 변경 함수를 불러도 갱신하지 않는다.
   * cleanup이 에러를 던져도 나머지 cleanup과 DOM 해제를 마친 뒤, 처음 난 에러를 던진다.
   * @returns {void}
   * @throws {Error} mount 전이거나 이미 해제되었을 때, cleanup이 에러를 던졌을 때(그 에러)
   */
  unmount() {
    this.#assertLifecycleAllows('unmount');
    // cleanup 안에서 상태 변경 함수를 불러도 갱신하지 않도록 먼저 해제 상태로 바꾼다.
    this.#lifecycle = LIFECYCLE.UNMOUNTED;
    this.pendingEffects = [];

    const firstCleanupError = runAllCleanups(this.hooks);

    this.rootNode.remove();
    this.rootNode = null;
    this.currentVNode = null;
    this.hooks = [];

    if (firstCleanupError !== null) {
      throw firstCleanupError;
    }
  }

  /**
   * 상태 변경 함수가 부른다. 해제된 뒤면 무시하고, mount·update가 진행 중이면(Effect 안에서
   * 상태를 바꾼 경우) 그 과정이 끝난 뒤 한 번 update한다. 그 밖에는 바로 update한다.
   * @returns {void}
   */
  requestUpdate() {
    if (!this.isMounted) {
      return;
    }

    this.update();
  }

  #assertLifecycleAllows(actionName) {
    const errorMessage = LIFECYCLE_ERROR_BY_ACTION.get(actionName).get(this.#lifecycle);

    if (errorMessage !== undefined) {
      throw new Error(createErrorMessage(errorMessage));
    }
  }

  // 렌더링 → DOM 반영(applyToDom) → Effect 실행을 한 묶음으로 처리한다.
  // 진행 중에 들어온 갱신 요청은 모아 두었다가 끝난 뒤 한 번만 처리한다.
  // 도중에 에러가 나도 모아 둔 요청은 처리해 상태와 화면이 어긋나지 않게 하고, 처음 에러를 던진다.
  #runUpdateCycle(applyToDom) {
    this.#isUpdating = true;
    this.#hasQueuedUpdate = false;

    try {
      applyToDom();
      this.#runPendingEffects();
    } finally {
      this.#isUpdating = false;
      this.#runQueuedUpdate();
    }
  }

  #runQueuedUpdate() {
    if (this.#hasQueuedUpdate) {
      this.#hasQueuedUpdate = false;
      this.requestUpdate();
    }
  }

  // 6.2의 2~4 : hookIndex를 0으로 되돌리고, 현재 컴포넌트를 이 인스턴스로 두고 실행한다.
  #renderRoot() {
    this.pendingEffects = [];
    this.hookIndex = 0;
    this.isRendering = true;

    const previousComponent = setCurrentComponent(this);
    let nextVNode;

    try {
      nextVNode = this.RootComponent(this.props);
    } finally {
      setCurrentComponent(previousComponent);
      this.isRendering = false;
    }

    this.#assertHookCountUnchanged();
    assertElementVNode(nextVNode);

    return nextVNode;
  }

  // 이전 렌더링보다 Hook을 적게 부르면(조건문 안의 Hook) 남은 칸이 엉뚱한 Hook과 짝지어진다.
  // 더 많이 부른 경우는 각 Hook이 칸을 찾을 때 에러를 낸다.
  #assertHookCountUnchanged() {
    if (!this.isFirstRender && this.hookIndex !== this.hooks.length) {
      throw new Error(createErrorMessage(ERROR_TEXTS.HOOK_ORDER_CHANGED));
    }
  }

  #saveRendered(nextVNode, rootNode) {
    this.currentVNode = nextVNode;
    this.rootNode = rootNode;
  }

  // 등록된 Effect의 이전 cleanup을 모두 부른 뒤 Effect를 순서대로 실행한다.
  // 실행 중 새로 등록되는 Effect와 섞이지 않게 목록을 먼저 떼어 낸다.
  // Effect 안에서 unmount()하면 남은 Effect는 실행하지 않는다. (정리되지 않는 cleanup이 생기므로)
  #runPendingEffects() {
    const pendingEffects = this.pendingEffects;

    this.pendingEffects = [];
    pendingEffects.forEach((pendingEffect) => runCleanup(pendingEffect.hook));

    for (const pendingEffect of pendingEffects) {
      if (!this.isMounted) {
        return;
      }

      pendingEffect.runEffect();
    }
  }
}

function assertElementVNode(vnode) {
  if (!isVNode(vnode) || vnode.type !== NODE_TYPES.ELEMENT) {
    throw new TypeError(createErrorMessage(ERROR_TEXTS.BAD_ROOT_VNODE));
  }
}

function createErrorMessage(text) {
  return `[FunctionComponent] ${text}`;
}

// 모든 칸의 cleanup을 부르고, 처음 난 에러를 돌려준다. (없으면 null)
function runAllCleanups(hooks) {
  let firstCleanupError = null;

  for (const hook of hooks) {
    try {
      runCleanup(hook);
    } catch (error) {
      firstCleanupError = firstCleanupError === null ? error : firstCleanupError;
    }
  }

  return firstCleanupError;
}

// cleanup은 한 번만 부르도록 부르기 전에 비운다.
function runCleanup(hook) {
  const { cleanup } = hook;

  if (typeof cleanup === 'function') {
    hook.cleanup = null;
    cleanup();
  }
}
