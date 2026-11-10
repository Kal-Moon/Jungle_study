import { render, setProp, removeProp, isIgnoredNode } from '../vdom/index.js';
import { PATCH_TYPES } from '../diff/index.js';
import { createVisibleChildren } from './visibleChildren.js';

const PATH_NOT_FOUND_MESSAGE = '[applyPatches] 경로를 찾을 수 없습니다';

// Patch 종류별 적용 방법. 새 Patch 종류를 지원하려면 이 표에 한 줄을 추가한다.
// 모든 applier는 (현재 루트, patch, 보이는 자식 목록)을 받아 적용 후의 현재 루트를 돌려준다.
const PATCH_APPLIER_BY_TYPE = new Map([
  [PATCH_TYPES.INSERT, applyInsert],
  [PATCH_TYPES.REMOVE, applyRemove],
  [PATCH_TYPES.REPLACE, applyReplace],
  [PATCH_TYPES.UPDATE_TEXT, applyUpdateText],
  [PATCH_TYPES.UPDATE_PROPS, applyUpdateProps],
]);

/**
 * 변경 목록을 실제 DOM에 적용한다. (Phase 1 문서 8.4)
 * patches를 앞에서부터 순서대로 하나씩 적용하고, 바뀌지 않은 노드는 건드리지 않는다.
 * @param {Node} rootNode path 기준이 되는 루트 DOM 노드 (부모가 있어야 한다)
 * @param {object[]} patches 적용할 Patch 배열
 * @returns {Node} 적용 후의 현재 루트 DOM 노드
 * @throws {TypeError} rootNode·patches 형식이 틀리거나 알 수 없는 patch.type일 때
 * @throws {RangeError} 경로나 index를 찾을 수 없을 때
 */
export function applyPatches(rootNode, patches) {
  if (!(rootNode instanceof Node) || rootNode.parentNode === null) {
    throw new TypeError('[applyPatches] 부모가 있는 루트 DOM 노드가 필요합니다');
  }

  if (!Array.isArray(patches)) {
    throw new TypeError('[applyPatches] Patch 배열이 필요합니다');
  }

  const visibleChildren = createVisibleChildren();
  let currentRoot = rootNode;

  for (const patch of patches) {
    const applyByType = findPatchApplier(patch);

    currentRoot = applyByType(currentRoot, patch, visibleChildren);
  }

  return currentRoot;
}

function findPatchApplier(patch) {
  const isObject = patch !== null && typeof patch === 'object';
  const applyByType = isObject ? PATCH_APPLIER_BY_TYPE.get(patch.type) : undefined;

  if (applyByType === undefined) {
    const patchType = isObject ? patch.type : patch;

    throw new TypeError(`[applyPatches] 알 수 없는 Patch 타입입니다: ${patchType}`);
  }

  return applyByType;
}

function applyInsert(rootNode, patch, visibleChildren) {
  const { node: parentNode } = findByPath(rootNode, patch.path, visibleChildren);
  const siblings = visibleChildren.of(parentNode);

  // index가 자식 수와 같으면 맨 뒤에 붙인다. 음수·소수는 맨 뒤에 붙는 일이 없도록 막는다.
  if (!isIndexInRange(patch.index, siblings.length)) {
    throw new RangeError(PATH_NOT_FOUND_MESSAGE);
  }

  const referenceNode = siblings[patch.index] || null;
  const newNode = render(patch.node);

  parentNode.insertBefore(newNode, referenceNode);
  visibleChildren.insert(parentNode, patch.index, newNode);

  return rootNode;
}

function applyRemove(rootNode, patch, visibleChildren) {
  const target = findByPath(rootNode, patch.path, visibleChildren);

  target.node.remove();
  visibleChildren.remove(target);

  return rootNode;
}

function applyReplace(rootNode, patch, visibleChildren) {
  const target = findByPath(rootNode, patch.path, visibleChildren);
  const newNode = render(patch.node);

  target.node.replaceWith(newNode);
  visibleChildren.replace(target, newNode);

  const isRootReplaced = target.node === rootNode;

  return isRootReplaced ? newNode : rootNode;
}

function applyUpdateText(rootNode, patch, visibleChildren) {
  const target = findByPath(rootNode, patch.path, visibleChildren);

  // 경로가 요소를 가리켰다면 textContent가 자식을 모두 바꾼다.
  target.node.textContent = patch.text;
  visibleChildren.forget(target.node);

  // 공백만 남은 텍스트는 이제 무시하는 노드이므로 보이는 자식에서도 뺀다.
  if (isIgnoredNode(target.node)) {
    visibleChildren.remove(target);
  }

  return rootNode;
}

function applyUpdateProps(rootNode, patch, visibleChildren) {
  const { node: targetNode } = findByPath(rootNode, patch.path, visibleChildren);

  for (const [key, value] of Object.entries(patch.set)) {
    setProp(targetNode, key, value);
  }

  for (const key of patch.remove) {
    removeProp(targetNode, key);
  }

  // <output>처럼 value를 바꾸면 자식이 바뀌는 요소가 있다.
  visibleChildren.forget(targetNode);

  return rootNode;
}

// path를 따라가 노드와, 그 노드가 부모의 몇 번째 보이는 자식인지 돌려준다. (루트면 parentNode가 null)
function findByPath(rootNode, path, visibleChildren) {
  let node = rootNode;
  let parentNode = null;
  let indexInParent = -1;

  for (const index of path) {
    const children = visibleChildren.of(node);

    if (!isIndexInRange(index, children.length - 1)) {
      throw new RangeError(PATH_NOT_FOUND_MESSAGE);
    }

    parentNode = node;
    indexInParent = index;
    node = children[index];
  }

  return { node, parentNode, indexInParent };
}

// 0 이상 maxIndex 이하의 정수인지 확인한다. ('length' 같은 문자열 인덱스도 막는다)
function isIndexInRange(index, maxIndex) {
  return Number.isInteger(index) && index >= 0 && index <= maxIndex;
}
