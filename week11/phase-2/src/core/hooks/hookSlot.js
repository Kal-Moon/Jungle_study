import { findCurrentComponent, HOOK_ORDER_CHANGED_MESSAGE } from '../component/index.js';

// Hook 이름별 칸 종류. (Phase 2 문서 7장 권장 구조) 칸의 kind는 getHookSlot이 이 표대로 채운다.
// 새 Hook(예: useRef)을 만들면 이 표에 한 줄을 추가하고 getHookSlot으로 칸을 꺼낸다.
const HOOK_KIND_BY_NAME = new Map([
  ['useState', 'state'],
  ['useEffect', 'effect'],
  ['useMemo', 'memo'],
]);

/**
 * 지금 렌더링 중인 루트 컴포넌트에서 이번 Hook의 칸을 꺼내고 hookIndex를 한 칸 옮긴다.
 * 최초 렌더링이면 createSlot으로 칸을 새로 만들고 kind를 채운다. 세 Hook이 모두 이 함수로
 * 칸을 찾으므로 Hook 공통 규칙(7장)은 이 함수만 고친다.
 * @param {string} hookName Hook 이름 (HOOK_KIND_BY_NAME에 있는 이름, 에러 메시지에도 쓴다)
 * @param {(component: object) => object} createSlot 최초 렌더링에서 새 칸(kind 제외)을 만드는 함수
 * @returns {{ component: object, hook: object }} 렌더링 중인 컴포넌트와 이번 Hook의 칸
 * @throws {Error} 루트 컴포넌트 렌더링 밖(자식 컴포넌트 안 포함)이거나 Hook 호출 순서가 바뀌었을 때
 */
export function getHookSlot(hookName, createSlot) {
  const kind = HOOK_KIND_BY_NAME.get(hookName);

  // 새 Hook을 만들고 표에 넣는 것을 잊으면 순서 검사가 조용히 꺼지므로 바로 알린다.
  if (kind === undefined) {
    throw new Error(`[getHookSlot] HOOK_KIND_BY_NAME에 없는 Hook입니다: ${hookName}`);
  }

  const component = findCurrentComponent();

  if (component === null) {
    throw new Error(`[${hookName}] 루트 컴포넌트 렌더링 중에만 호출할 수 있습니다`);
  }

  const hookIndex = component.hookIndex;

  component.hookIndex += 1;

  if (component.isFirstRender && hookIndex === component.hooks.length) {
    const slot = createSlot(component);

    // 같은 객체에 kind를 붙인다. (useState의 상태 변경 함수가 이 칸 객체를 기억하기 때문)
    slot.kind = kind;
    component.hooks.push(slot);
  }

  const hook = component.hooks[hookIndex];

  // 칸이 없으면(이전보다 Hook을 더 부름) 또는 종류가 다르면 순서가 바뀐 것이다.
  if (hook === undefined || hook.kind !== kind) {
    throw new Error(`[${hookName}] ${HOOK_ORDER_CHANGED_MESSAGE}`);
  }

  return { component, hook };
}
