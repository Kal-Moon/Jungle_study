import { getHookSlot } from './hookSlot.js';
import { assertDependencies, isDepsChanged, copyDependencies } from './dependencies.js';

// 에러 문구와 getHookSlot에 쓰는 이름. Hook 이름을 바꾸면 이 줄과 HOOK_KIND_BY_NAME만 고친다.
const HOOK_NAME = 'useEffect';

/**
 * DOM 반영 이후 실행할 작업을 등록한다. (Phase 2 문서 7.2)
 * 렌더링 중에는 pendingEffects에 넣기만 하고, FunctionComponent가 DOM 반영 뒤에
 * 이전 cleanup → effect 순서로 실행한다.
 * @param {Function} effect 실행할 작업 (함수를 반환하면 cleanup)
 * @param {any[]} [dependencies] 의존성 배열 (생략하면 매번, 빈 배열이면 처음 한 번)
 * @returns {void}
 * @throws {TypeError} effect가 함수가 아니거나 의존성이 배열이 아닐 때
 * @throws {Error} 루트 컴포넌트 렌더링 밖에서 호출하거나 Hook 호출 순서가 바뀌었을 때
 */
export function useEffect(effect, dependencies) {
  if (typeof effect !== 'function') {
    throw new TypeError(`[${HOOK_NAME}] 콜백 함수가 필요합니다`);
  }

  assertDependencies(HOOK_NAME, dependencies);

  const { component, hook } = getHookSlot(HOOK_NAME, () => ({
    dependencies: undefined,
    cleanup: null,
  }));

  if (!isDepsChanged(hook.dependencies, dependencies)) {
    return;
  }

  const nextDependencies = copyDependencies(dependencies);

  component.pendingEffects.push({
    hook,
    runEffect: () => {
      hook.dependencies = nextDependencies;
      hook.cleanup = toCleanup(effect());
    },
  });
}

// async 함수는 Promise를 돌려주므로 cleanup으로 저장하지 않고 에러를 낸다. (7.2 async 금지)
function toCleanup(returnedValue) {
  if (typeof returnedValue === 'function') {
    return returnedValue;
  }

  if (returnedValue !== undefined) {
    throw new TypeError(`[${HOOK_NAME}] 콜백은 cleanup 함수만 반환할 수 있습니다`);
  }

  return null;
}
