import { NODE_TYPES, isVNode } from '../vdom/index.js';
import { PATCH_TYPES } from './patchTypes.js';

const NOT_VNODE_MESSAGE = '[diff] VNode가 필요합니다';

// 종류가 같은 두 VNode를 비교하는 방법. 새 VNode 종류를 비교하려면 이 표에 한 줄을 추가한다.
// 모든 비교 함수는 (이전 VNode, 다음 VNode, path, patches)를 받아 patches에 결과를 쌓는다.
const SAME_TYPE_DIFFER_BY_VNODE_TYPE = new Map([
  [NODE_TYPES.TEXT, diffText],
  [NODE_TYPES.ELEMENT, diffElement],
]);

/**
 * 두 Virtual DOM을 비교해 변경 목록을 만든다. (Phase 1 문서 8.3)
 * 입력 VNode는 수정하지 않는다.
 * @param {object} previousVNode 이전 VNode
 * @param {object} nextVNode 다음 VNode
 * @returns {object[]} Patch 배열 (바뀐 게 없으면 빈 배열)
 * @throws {TypeError} 둘 중 하나라도 VNode가 아닐 때
 */
export function diff(previousVNode, nextVNode) {
  if (!isVNode(previousVNode) || !isVNode(nextVNode)) {
    throw new TypeError(NOT_VNODE_MESSAGE);
  }

  // 함수마다 새 배열을 만들어 이어 붙이지 않고, 이 배열 하나에 결과를 쌓는다.
  const patches = [];

  diffNode(previousVNode, nextVNode, [], patches);
  return patches;
}

// 입력 검증은 공개 함수 가드에서만 한다. (11장) 자식은 검증된 VNode라고 믿는다.
function diffNode(previousVNode, nextVNode, path, patches) {
  if (isReplaceNeeded(previousVNode, nextVNode)) {
    patches.push({ type: PATCH_TYPES.REPLACE, path, node: nextVNode });
    return;
  }

  const diffSameType = SAME_TYPE_DIFFER_BY_VNODE_TYPE.get(nextVNode.type);

  diffSameType(previousVNode, nextVNode, path, patches);
}

// 종류가 다르거나, 같은 요소라도 태그가 다르면 통째로 교체한다.
function isReplaceNeeded(previousVNode, nextVNode) {
  const isTypeChanged = previousVNode.type !== nextVNode.type;
  const isTagChanged = nextVNode.type === NODE_TYPES.ELEMENT && previousVNode.tag !== nextVNode.tag;

  return isTypeChanged || isTagChanged;
}

function diffText(previousVNode, nextVNode, path, patches) {
  if (previousVNode.text !== nextVNode.text) {
    patches.push({ type: PATCH_TYPES.UPDATE_TEXT, path, text: nextVNode.text });
  }
}

// 속성을 먼저 비교하고, 그다음 자식을 비교한다.
function diffElement(previousVNode, nextVNode, path, patches) {
  const { set, remove } = diffProps(previousVNode.props, nextVNode.props);
  const hasPropChanges = Object.keys(set).length > 0 || remove.length > 0;

  if (hasPropChanges) {
    patches.push({ type: PATCH_TYPES.UPDATE_PROPS, path, set, remove });
  }

  diffChildren(previousVNode.children, nextVNode.children, path, patches);
}

// set : 새로 생겼거나 값이 바뀐 속성, remove : 이전에만 있던 속성 이름
// 함수 값도 Object.is로 비교하므로 참조가 다르면 다른 값으로 본다.
// in 대신 Object.hasOwn을 써서 toString 같은 기본 객체 이름을 props로 착각하지 않는다.
function diffProps(previousProps, nextProps) {
  const set = {};
  const remove = [];

  for (const [key, value] of Object.entries(nextProps)) {
    const isNewKey = !Object.hasOwn(previousProps, key);

    if (isNewKey || !Object.is(previousProps[key], value)) {
      set[key] = value;
    }
  }

  for (const key of Object.keys(previousProps)) {
    if (!Object.hasOwn(nextProps, key)) {
      remove.push(key);
    }
  }

  return { set, remove };
}

// 같은 인덱스끼리 비교한다. 남는 새 자식은 INSERT(오름차순), 남는 이전 자식은 REMOVE(내림차순). (8.2)
function diffChildren(previousChildren, nextChildren, path, patches) {
  const commonLength = Math.min(previousChildren.length, nextChildren.length);

  for (let i = 0; i < commonLength; i++) {
    diffNode(previousChildren[i], nextChildren[i], [...path, i], patches);
  }

  for (let i = commonLength; i < nextChildren.length; i++) {
    patches.push({ type: PATCH_TYPES.INSERT, path, index: i, node: nextChildren[i] });
  }

  // 뒤에서부터 지워야 앞쪽 인덱스가 밀리지 않는다.
  for (let i = previousChildren.length - 1; i >= commonLength; i--) {
    patches.push({ type: PATCH_TYPES.REMOVE, path: [...path, i] });
  }
}
