// 지금 렌더링 중인 컴포넌트를 모듈 안 변수 하나에 저장하고 꺼낸다. (Phase 2 문서 8장)
// Hook과 createElement는 이 값으로 자기가 속한 컴포넌트를 찾는다.

let currentComponent = null;

/**
 * Hook 호출 순서가 바뀌었을 때의 에러 설명. Hook과 FunctionComponent가 같이 쓴다.
 * 앞에 붙는 [이름]은 쓰는 쪽이 붙인다.
 */
export const HOOK_ORDER_CHANGED_MESSAGE = 'Hook 호출 순서가 바뀌었습니다';

/**
 * 지금 렌더링 중인 컴포넌트를 바꾼다.
 * @param {object | null} component 렌더링 중인 FunctionComponent (렌더링 밖이면 null)
 * @returns {object | null} 바꾸기 전 컴포넌트 (호출한 쪽이 끝난 뒤 되돌릴 때 쓴다)
 */
export function setCurrentComponent(component) {
  const previousComponent = currentComponent;

  currentComponent = component;

  return previousComponent;
}

/**
 * 지금 렌더링 중인 컴포넌트를 찾는다.
 * 자식 컴포넌트 호출 중이거나 렌더링 밖이면 없으므로 null을 돌려준다. (Phase 1 문서 3.4 find 규칙)
 * @returns {object | null} 렌더링 중인 FunctionComponent
 */
export function findCurrentComponent() {
  return currentComponent;
}
