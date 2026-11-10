// 할 일 목록의 상태를 바꾸는 순수 함수 모음. 모두 새 배열을 돌려주고 받은 배열은 고치지 않는다.
// 루트 컴포넌트는 이 함수들로 다음 상태를 만들고, 자식 컴포넌트는 결과를 props로만 받는다.

/**
 * 할 일 글자의 최대 길이. 입력창 maxlength와 저장소 검사가 같이 쓴다.
 */
export const TODO_TEXT_MAX_LENGTH = 100;

/**
 * 버튼·체크박스의 data-action 값. 자식 컴포넌트와 루트 핸들러가 같이 쓴다.
 */
export const TODO_ACTIONS = Object.freeze({
  TOGGLE: 'toggle',
  REMOVE: 'remove',
  FILTER: 'filter',
  CLEAR_DONE: 'clear-done',
});

/**
 * 필터 이름.
 */
export const FILTERS = Object.freeze({
  ALL: 'all',
  ACTIVE: 'active',
  DONE: 'done',
});

// 필터별 화면 이름과 남길 조건. 새 필터는 FILTERS와 이 표에 한 줄씩 추가한다. (순서 = 버튼 순서)
const FILTER_RULE_BY_NAME = new Map([
  [FILTERS.ALL, { label: '전체', isVisible: () => true }],
  [FILTERS.ACTIVE, { label: '진행 중', isVisible: (todo) => !todo.isDone }],
  [FILTERS.DONE, { label: '완료', isVisible: (todo) => todo.isDone }],
]);

/**
 * 필터 버튼을 그릴 목록을 돌려준다.
 * @returns {{ name: string, label: string }[]} 필터 이름과 화면 이름 (버튼 순서)
 */
export function getFilterOptions() {
  return Array.from(FILTER_RULE_BY_NAME, ([name, { label }]) => ({ name, label }));
}

/**
 * 필터 이름이 정해진 것인지 판단한다.
 * @param {string} filterName 확인할 이름
 * @returns {boolean} FILTERS 중 하나면 true
 */
export function isKnownFilter(filterName) {
  return FILTER_RULE_BY_NAME.has(filterName);
}

/**
 * 할 일을 맨 뒤에 추가한다. id는 지금 있는 가장 큰 id + 1이다.
 * @param {object[]} todos 지금 할 일 목록
 * @param {string} text 추가할 글자 (앞뒤 공백은 지운다)
 * @returns {object[]} 새 목록
 */
export function addTodo(todos, text) {
  const nextId = todos.reduce((maxId, todo) => Math.max(maxId, todo.id), 0) + 1;

  return [...todos, { id: nextId, text: text.trim(), isDone: false }];
}

/**
 * id가 같은 할 일의 완료 여부를 뒤집는다.
 * @param {object[]} todos 지금 할 일 목록
 * @param {number} todoId 바꿀 할 일 id
 * @returns {object[]} 새 목록
 */
export function toggleTodo(todos, todoId) {
  return todos.map((todo) => (todo.id === todoId ? { ...todo, isDone: !todo.isDone } : todo));
}

/**
 * id가 같은 할 일을 지운다.
 * @param {object[]} todos 지금 할 일 목록
 * @param {number} todoId 지울 할 일 id
 * @returns {object[]} 새 목록
 */
export function removeTodo(todos, todoId) {
  return todos.filter((todo) => todo.id !== todoId);
}

/**
 * 완료한 할 일을 모두 지운다.
 * @param {object[]} todos 지금 할 일 목록
 * @returns {object[]} 새 목록
 */
export function removeDoneTodos(todos) {
  return todos.filter((todo) => !todo.isDone);
}

/**
 * 필터에 맞는 할 일만 남긴다.
 * @param {object[]} todos 지금 할 일 목록
 * @param {string} filterName FILTERS 중 하나
 * @returns {object[]} 필터를 적용한 새 목록
 * @throws {RangeError} 정해지지 않은 필터 이름일 때
 */
export function filterTodos(todos, filterName) {
  const filterRule = FILTER_RULE_BY_NAME.get(filterName);

  if (filterRule === undefined) {
    throw new RangeError(`[filterTodos] 알 수 없는 필터입니다: ${filterName}`);
  }

  return todos.filter(filterRule.isVisible);
}

/**
 * 완료하지 않은 할 일 개수를 센다.
 * @param {object[]} todos 지금 할 일 목록
 * @returns {number} 남은 개수
 */
export function countRemaining(todos) {
  return todos.filter((todo) => !todo.isDone).length;
}

/**
 * 저장소에서 읽은 JSON 글자를 할 일 목록으로 바꾼다.
 * 저장소는 사용자가 고칠 수 있으므로 형식이 틀린 항목은 버린다.
 * @param {string | null} storedText 저장소에서 읽은 글자 (없으면 null)
 * @returns {object[]} 형식이 맞는 할 일만 담은 목록 (읽을 수 없으면 빈 배열)
 */
export function parseStoredTodos(storedText) {
  if (storedText === null) {
    return [];
  }

  let parsedValue;

  try {
    parsedValue = JSON.parse(storedText);
  } catch (error) {
    console.warn('[parseStoredTodos] 저장된 할 일을 읽지 못해 비웁니다', error);
    return [];
  }

  if (!Array.isArray(parsedValue)) {
    return [];
  }

  // 필요한 값만 새 객체로 옮기고, id가 겹치면 앞의 것만 남긴다. (토글·삭제가 한 항목만 가리키게)
  const seenIds = new Set();

  return parsedValue.filter(isTodoShape)
    .filter((todo) => !seenIds.has(todo.id) && seenIds.add(todo.id))
    .map(({ id, text, isDone }) => ({ id, text, isDone }));
}

function isTodoShape(value) {
  const isObject = value !== null && typeof value === 'object';

  return isObject
    && Number.isSafeInteger(value.id) && value.id > 0
    && typeof value.text === 'string' && value.text.trim() !== ''
    && value.text.length <= TODO_TEXT_MAX_LENGTH
    && typeof value.isDone === 'boolean';
}
