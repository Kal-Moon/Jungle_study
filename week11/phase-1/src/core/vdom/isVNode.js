import { NODE_TYPES } from './nodeTypes.js';

// VNode 형식(Phase 1 문서 6.1, 6.2)을 확인하는 기준을 이 파일 한 곳에 모은다.
// diff와 StateHistory가 같은 기준을 쓴다. 형식이 바뀌거나 종류가 늘면 이 표만 고친다.
const SHAPE_CHECKER_BY_VNODE_TYPE = new Map([
  [NODE_TYPES.TEXT, hasTextShape],
  [NODE_TYPES.ELEMENT, hasElementShape],
]);

/**
 * 값이 VNode 형식인지 판단한다. 자식까지 깊게 검사하지는 않는다.
 * @param {*} value 판단할 값
 * @returns {boolean} 텍스트·요소 VNode 형식이면 true
 */
export function isVNode(value) {
  if (value === null || typeof value !== 'object') {
    return false;
  }

  const shapeChecker = SHAPE_CHECKER_BY_VNODE_TYPE.get(value.type);

  return shapeChecker !== undefined && shapeChecker(value);
}

function hasTextShape(value) {
  return typeof value.text === 'string';
}

function hasElementShape(value) {
  const hasProps = value.props !== null && typeof value.props === 'object';

  return typeof value.tag === 'string' && hasProps && Array.isArray(value.children);
}
