import { getHookSlot } from './hookSlot.js';
import { assertDependencies, isDepsChanged, copyDependencies } from './dependencies.js';

// 에러 문구와 getHookSlot에 쓰는 이름. Hook 이름을 바꾸면 이 줄과 HOOK_KIND_BY_NAME만 고친다.
const HOOK_NAME = 'useMemo';

/**
 * 의존성이 같으면 이전 계산 결과를 재사용한다. (Phase 2 문서 7.3)
 * @param {Function} factory 계산 함수 (DOM 변경, 상태 변경, 외부 요청을 하지 않는다)
 * @param {any[]} [dependencies] 의존성 배열 (생략하면 렌더링마다 계산)
 * @returns {any} 계산 결과
 * @throws {TypeError} factory가 함수가 아니거나 의존성이 배열이 아닐 때
 * @throws {Error} 루트 컴포넌트 렌더링 밖에서 호출하거나 Hook 호출 순서가 바뀌었을 때
 */
export function useMemo(factory, dependencies) {
  if (typeof factory !== 'function') {
    throw new TypeError(`[${HOOK_NAME}] 계산 함수가 필요합니다`);
  }

  assertDependencies(HOOK_NAME, dependencies);

  const { hook } = getHookSlot(HOOK_NAME, () => ({
    dependencies: undefined,
    value: undefined,
  }));

  if (isDepsChanged(hook.dependencies, dependencies)) {
    // 계산이 실패하면 의존성을 저장하지 않아 다음 렌더링에서 다시 계산한다.
    hook.value = factory();
    hook.dependencies = copyDependencies(dependencies);
  }

  return hook.value;
}
