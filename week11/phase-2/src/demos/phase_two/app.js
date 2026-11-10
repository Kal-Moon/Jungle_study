import {
  createElement,
  FunctionComponent,
  useState,
  useEffect,
  useMemo,
} from '../../core/index.js';
import {
  FILTERS,
  TODO_ACTIONS,
  addTodo,
  toggleTodo,
  removeTodo,
  removeDoneTodos,
  filterTodos,
  countRemaining,
  isKnownFilter,
  parseStoredTodos,
} from './todoState.js';
import { TodoForm } from './components/TodoForm.js';
import { FilterBar } from './components/FilterBar.js';
import { TodoList } from './components/TodoList.js';
import { TodoSummary } from './components/TodoSummary.js';

const CONTAINER_SELECTOR = '#phase-two-root';
const STORAGE_KEY = 'mini-react-phase-two-todos';
const CLEAR_DRAFT_KEY = 'Escape';
const EMPTY_DRAFT_MESSAGE = '할 일을 입력해 주세요';

// 목록 안 요소의 data-action별로, 어떤 이벤트에서 할 일 목록을 어떻게 바꿀지.
// 새 동작은 TODO_ACTIONS와 이 표에 한 줄씩 추가하고, TodoItem의 요소에 data-action을 단다.
const LIST_ACTION_BY_NAME = new Map([
  [TODO_ACTIONS.TOGGLE, { eventType: 'change', updateTodos: toggleTodo }],
  [TODO_ACTIONS.REMOVE, { eventType: 'click', updateTodos: removeTodo }],
]);

/**
 * Phase 2 데모를 시작한다. 할 일 목록 루트 컴포넌트를 mount한다. (Phase 2 문서 11장)
 * @returns {FunctionComponent} mount한 인스턴스
 * @throws {Error} 화면 요소(#phase-two-root)를 찾을 수 없을 때
 */
export function startPhaseTwo() {
  const container = document.querySelector(CONTAINER_SELECTOR);

  if (container === null) {
    throw new Error(`[startPhaseTwo] 화면 요소를 찾을 수 없습니다: ${CONTAINER_SELECTOR}`);
  }

  const instance = new FunctionComponent(TodoApp, { storage: findStorage() }, container);

  instance.mount();

  return instance;
}

/**
 * 할 일 목록 루트 컴포넌트. 상태와 Hook은 이 컴포넌트에만 있다. (Phase 2 문서 2장)
 * @param {object} props
 * @param {Storage | null} props.storage 할 일을 저장할 곳 (null이면 저장하지 않는다)
 * @returns {object} element VNode
 */
export function TodoApp({ storage }) {
  const [todos, setTodos] = useState(() => loadTodos(storage));
  const [draft, setDraft] = useState('');
  const [filter, setFilter] = useState(FILTERS.ALL);
  const [errorMessage, setErrorMessage] = useState('');
  const setters = { setTodos, setDraft, setFilter, setErrorMessage };

  // 상태 변경 함수는 렌더링마다 같으므로 핸들러도 한 번만 만든다. 그래서 갱신마다 리스너를 다시 달지 않는다.
  const handlers = useMemo(() => createHandlers(setters), []);
  const handleSubmit = useMemo(() => createSubmitHandler(draft, setters), [draft]);
  const remainingCount = useMemo(() => countRemaining(todos), [todos]);
  // 입력창 글자만 바뀔 때는 목록 VNode를 그대로 써서, diff가 목록 안으로 내려가지 않게 한다.
  const listVNode = useMemo(() => createListVNode(todos, filter, handlers), [todos, filter]);

  useEffect(() => saveTodos(storage, todos), [storage, todos]);
  useEffect(() => showRemainingInTitle(remainingCount), [remainingCount]);
  useEffect(() => listenClearDraftKey(setDraft), []);

  return createTodoAppVNode({
    draft,
    errorMessage,
    filter,
    listVNode,
    remainingCount,
    totalCount: todos.length,
    handlers: { ...handlers, onSubmit: handleSubmit },
  });
}

// 화면 순서 : 제목 → 입력 폼 → 에러 → 필터 → 목록 → 요약. 에러 문단은 비어 있어도 항상 두어
// 에러가 생기고 사라질 때 뒤 형제들의 인덱스가 밀려 교체되지 않게 한다.
function createTodoAppVNode(view) {
  const { handlers } = view;

  return createElement(
    'section',
    { class: 'todo-app' },
    createElement('h2', { class: 'todo-title' }, '할 일 목록'),
    createElement(TodoForm, {
      draft: view.draft,
      onDraftInput: handlers.onDraftInput,
      onSubmit: handlers.onSubmit,
    }),
    createElement('p', { class: 'todo-error', role: 'alert' }, view.errorMessage),
    createElement(FilterBar, { filter: view.filter, onFilterClick: handlers.onFilterClick }),
    view.listVNode,
    createElement(TodoSummary, {
      remainingCount: view.remainingCount,
      totalCount: view.totalCount,
      onClearDone: handlers.onClearDone,
    }),
  );
}

// 필터를 적용한 목록 VNode. handlers는 한 번만 만들어지므로 의존성에 넣지 않는다.
function createListVNode(todos, filter, handlers) {
  const visibleTodos = filterTodos(todos, filter);

  return createElement(TodoList, { todos: visibleTodos, onListEvent: handlers.onListEvent });
}

function createHandlers(setters) {
  const { setTodos, setDraft, setFilter } = setters;

  return {
    onDraftInput: (event) => runSafely(setters, () => setDraft(event.target.value)),
    onFilterClick: (event) => runSafely(setters, () => {
      const filterName = findActionTarget(event, TODO_ACTIONS.FILTER)?.dataset.filter;

      if (isKnownFilter(filterName)) {
        setFilter(filterName);
      }
    }),
    onClearDone: () => runSafely(setters, () => setTodos(removeDoneTodos)),
    onListEvent: (event) => runListAction(event, setters),
  };
}

function createSubmitHandler(draft, setters) {
  return (event) => {
    // 폼 제출로 페이지가 새로 고쳐지지 않게 한다.
    event.preventDefault();
    runSafely(setters, () => {
      if (draft.trim() === '') {
        setters.setErrorMessage(EMPTY_DRAFT_MESSAGE);
        return;
      }

      setters.setTodos((todos) => addTodo(todos, draft));
      setters.setDraft('');
    });
  };
}

// 목록 안 요소의 이벤트를 목록 하나에서 받아, 눌린 요소의 동작과 항목 id를 찾아 실행한다.
// 표에 없는 동작이거나 이벤트 종류가 다르면(체크박스 click 등) 아무것도 하지 않는다.
function runListAction(event, setters) {
  const actionTarget = event.target.closest('[data-action]');
  const actionName = actionTarget ? actionTarget.dataset.action : '';
  const listAction = LIST_ACTION_BY_NAME.get(actionName);
  const todoItem = actionTarget?.closest('[data-todo-id]');

  if (!listAction || listAction.eventType !== event.type || !todoItem) {
    return;
  }

  const todoId = Number(todoItem.dataset.todoId);

  runSafely(setters, () => setters.setTodos((todos) => listAction.updateTodos(todos, todoId)));
}

// 이벤트가 일어난 곳에서 가장 가까운 data-action 요소를 찾는다. (없을 수 있다)
function findActionTarget(event, actionName) {
  return event.target.closest(`[data-action="${actionName}"]`);
}

// core의 에러는 여기서 잡아 화면과 콘솔에 함께 남긴다. (Phase 2 문서 12장)
// 에러 메시지는 텍스트 노드로 들어가므로 HTML로 해석되지 않는다.
function runSafely({ setErrorMessage }, action) {
  try {
    setErrorMessage('');
    action();
  } catch (error) {
    console.error(error);
    setErrorMessage(error.message);
  }
}

function findStorage() {
  try {
    return window.localStorage;
  } catch (error) {
    // 사이트 데이터가 막힌 브라우저에서는 읽기만 해도 에러가 난다. 저장 없이 동작한다.
    console.warn('[startPhaseTwo] 저장소를 쓸 수 없어 저장하지 않습니다', error);
    return null;
  }
}

function loadTodos(storage) {
  if (storage === null) {
    return [];
  }

  try {
    return parseStoredTodos(storage.getItem(STORAGE_KEY));
  } catch (error) {
    console.warn('[TodoApp] 저장된 할 일을 읽지 못했습니다', error);
    return [];
  }
}

function saveTodos(storage, todos) {
  if (storage === null) {
    return;
  }

  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(todos));
  } catch (error) {
    // 저장 공간이 꽉 찼거나 막힌 경우. 화면 동작에는 영향이 없으므로 알리기만 한다.
    console.warn('[TodoApp] 할 일을 저장하지 못했습니다', error);
  }
}

// 탭 제목에 남은 개수를 보여 주고, 다시 실행되거나 해제될 때 원래 제목으로 되돌린다.
function showRemainingInTitle(remainingCount) {
  const previousTitle = document.title;

  document.title = `(${remainingCount}) ${previousTitle}`;

  return () => {
    document.title = previousTitle;
  };
}

// Esc를 누르면 입력 중인 글자를 지운다. 리스너는 한 번만 달고 해제할 때 뗀다.
function listenClearDraftKey(setDraft) {
  const handleKeydown = (event) => {
    if (event.key === CLEAR_DRAFT_KEY) {
      setDraft('');
    }
  };

  window.addEventListener('keydown', handleKeydown);

  return () => window.removeEventListener('keydown', handleKeydown);
}
