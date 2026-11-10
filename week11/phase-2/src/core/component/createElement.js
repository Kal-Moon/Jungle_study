import { NODE_TYPES, isVNode, isIgnoredText, isIgnoredTag } from '../vdom/index.js';
import { setCurrentComponent } from './hookContext.js';

const BAD_TAG_MESSAGE = '[createElement] tag가 올바르지 않습니다';
const BAD_PROPS_MESSAGE = '[createElement] props는 객체나 null이어야 합니다';
const BAD_CHILD_MESSAGE = '[createElement] 자식이 올바르지 않습니다';
// 태그 이름으로 받을 글자. 공백·따옴표가 섞인 이름은 render의 DOMException 대신 여기서 TypeError로 막는다.
const TAG_NAME_PATTERN = /^[a-z][a-z0-9-]*$/i;
const IGNORED_TAG_MESSAGE = '[createElement] script, style 태그는 만들 수 없습니다';

// 자식 값의 종류별 규칙. 위에서부터 처음 맞는(matches) 규칙의 normalize로 처리한다.
// normalize는 (값, 결과 배열)을 받아 결과 배열에 VNode를 넣는다. 맞는 규칙이 없으면 TypeError.
// 새 종류의 자식을 받으려면 이 표에 한 줄만 추가한다.
const CHILD_RULES = [
  { matches: isEmptyChild, normalize: () => {} },
  { matches: Array.isArray, normalize: normalizeChildArray },
  { matches: (child) => typeof child === 'string', normalize: pushTextVNode },
  {
    matches: (child) => typeof child === 'number',
    normalize: (number, normalizedChildren) => pushTextVNode(String(number), normalizedChildren),
  },
  { matches: isCheckedVNode, normalize: pushVNode },
];

// createElement가 만든 요소 VNode. 자식까지 이미 검사했으므로 부모에 넣을 때 다시 끝까지 보지 않는다.
// (다시 보면 노드마다 조상 수만큼 검사해 중첩이 깊을 때 O(N²)이 된다)
// WeakSet이라 VNode가 버려지면 함께 사라진다.
const createdElementVNodes = new WeakSet();

/**
 * 요소 Virtual DOM을 만든다. (Phase 2 문서 5.1)
 * tag가 함수(자식 컴포넌트)면 바로 호출해서 나온 값을 돌려준다.
 * @param {string | Function} tag HTML 태그 이름 또는 자식 컴포넌트 함수
 * @param {object | null} props 속성
 * @param {...any} children 자식 (문자열, 숫자, VNode, 배열. null·undefined·불리언은 빠진다)
 * @returns {object} VNode (자식 컴포넌트가 null 등을 돌려주면 그 값)
 * @throws {TypeError} tag가 문자열도 함수도 아니거나 script·style일 때, props·자식이 올바르지 않을 때
 */
export function createElement(tag, props, ...children) {
  assertValidArguments(tag, props);

  const normalizedChildren = [];

  normalizeChild(children, normalizedChildren);

  if (typeof tag === 'function') {
    return callChildComponent(tag, { ...props, children: normalizedChildren });
  }

  const vnode = {
    type: NODE_TYPES.ELEMENT,
    tag: tag.toLowerCase(),
    props: copyElementProps(props),
    children: normalizedChildren,
  };

  createdElementVNodes.add(vnode);

  return vnode;
}

// 직접 만든 VNode 객체는 지금처럼 자식까지 끝까지 검사한다.
function isCheckedVNode(child) {
  return createdElementVNodes.has(child) || isVNode(child);
}

// 자식은 children 인자로만 받는다. 자식 컴포넌트가 받은 props를 그대로 넘겨도
// children이 DOM 속성으로 들어가 setProp 에러가 나지 않게 뺀다.
function copyElementProps(props) {
  const { children: ignoredChildren, ...elementProps } = props || {};

  return elementProps;
}

function assertValidArguments(tag, props) {
  const isValidTagName = typeof tag === 'string' && TAG_NAME_PATTERN.test(tag);

  if (!isValidTagName && typeof tag !== 'function') {
    throw new TypeError(BAD_TAG_MESSAGE);
  }

  if (typeof tag === 'string') {
    assertAllowedTag(tag);
  }

  const isPropsObject = typeof props === 'object' && !Array.isArray(props);

  if (props !== null && props !== undefined && !isPropsObject) {
    throw new TypeError(BAD_PROPS_MESSAGE);
  }
}

// applyPatches는 script, style DOM을 건너뛰고 세므로 만들면 path가 어긋난다. 실행되는 script도 막는다.
function assertAllowedTag(tagName) {
  if (isIgnoredTag(tagName)) {
    throw new TypeError(IGNORED_TAG_MESSAGE);
  }
}

// 자식 컴포넌트 안에서 Hook을 부르면 에러가 나도록, 호출하는 동안 현재 컴포넌트를 비운다. (2장, 5.1)
function callChildComponent(childComponent, props) {
  const parentComponent = setCurrentComponent(null);

  try {
    return childComponent(props);
  } finally {
    setCurrentComponent(parentComponent);
  }
}

function normalizeChild(child, normalizedChildren) {
  const childRule = CHILD_RULES.find((rule) => rule.matches(child));

  if (childRule === undefined) {
    throw new TypeError(BAD_CHILD_MESSAGE);
  }

  childRule.normalize(child, normalizedChildren);
}

// null, undefined, true, false는 렌더링 대상에서 뺀다. (5.1)
function isEmptyChild(child) {
  return child === null || child === undefined || typeof child === 'boolean';
}

function normalizeChildArray(children, normalizedChildren) {
  children.forEach((child) => normalizeChild(child, normalizedChildren));
}

// 빈 글자·공백만 있는 글자는 VNode로 만들지 않는다. (Phase 1 문서 6.2)
// render가 만든 공백 텍스트를 applyPatches가 건너뛰고 세므로, 만들면 자식 인덱스가 어긋난다.
function pushTextVNode(text, normalizedChildren) {
  if (!isIgnoredText(text)) {
    normalizedChildren.push({ type: NODE_TYPES.TEXT, text });
  }
}

// 직접 만든 VNode 객체도 받으므로, 문자열 태그와 같은 기준으로 script·style을 막는다.
function pushVNode(vnode, normalizedChildren) {
  if (vnode.type === NODE_TYPES.TEXT) {
    pushTextVNode(vnode.text, normalizedChildren);
    return;
  }

  assertAllowedTag(vnode.tag);
  normalizedChildren.push(vnode);
}
