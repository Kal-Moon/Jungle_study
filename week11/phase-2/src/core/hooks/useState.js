import { getHookSlot } from './hookSlot.js';

// 에러 문구와 getHookSlot에 쓰는 이름. Hook 이름을 바꾸면 이 줄과 HOOK_KIND_BY_NAME만 고친다.
const HOOK_NAME = 'useState';

/**
 * 상태와 상태 변경 함수를 돌려준다. (Phase 2 문서 7.1)
 * 상태 변경 함수는 렌더링마다 같은 함수다.
 * @param {any} initialValue 초기값 (함수면 최초 렌더링에서 한 번만 호출)
 * @returns {[any, Function]} [현재 값, 상태 변경 함수]
 * @throws {Error} 루트 컴포넌트 렌더링 밖에서 호출하거나 Hook 호출 순서가 바뀌었을 때
 */
export function useState(initialValue) {
  const { hook } = getHookSlot(HOOK_NAME, (component) => {
    const stateHook = { value: resolveInitialValue(initialValue) };

    stateHook.setState = createSetState(component, stateHook);

    return stateHook;
  });

  return [hook.value, hook.setState];
}

function resolveInitialValue(initialValue) {
  return typeof initialValue === 'function' ? initialValue() : initialValue;
}

// 값 또는 함수형 갱신(이전 값 → 다음 값)을 받는다. 같은 값(Object.is)이면 다시 렌더링하지 않는다.
// 렌더링 중 호출은 무한 렌더링이 되므로 막고, 해제된 뒤 호출은 협약(6.4)대로 무시한다.
function createSetState(component, stateHook) {
  return function setState(nextValueOrUpdater) {
    if (component.isRendering) {
      throw new Error(`[${HOOK_NAME}] 렌더링 중에는 상태를 바꿀 수 없습니다`);
    }

    if (!component.isMounted) {
      return;
    }

    const nextValue = typeof nextValueOrUpdater === 'function'
      ? nextValueOrUpdater(stateHook.value)
      : nextValueOrUpdater;

    // 화면이 뒤처져 있으면(지난 갱신 실패) 같은 값이어도 다시 그려 맞춘다.
    if (Object.is(stateHook.value, nextValue) && !component.isViewStale) {
      return;
    }

    stateHook.value = nextValue;
    component.requestUpdate();
  };
}
