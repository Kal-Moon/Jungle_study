import { createElement } from '../../../core/index.js';
import { TodoItem } from './TodoItem.js';

/**
 * 할 일 목록. 항목마다 핸들러를 만들지 않고 목록 하나에서 받아,
 * 항목이 늘거나 다시 렌더링되어도 리스너가 늘지 않는다. (상태 없음)
 * @param {object} props
 * @param {object[]} props.todos 보여 줄 할 일 (필터 적용 후)
 * @param {Function} props.onListEvent 목록의 click·change 이벤트를 함께 받는 핸들러
 * @returns {object} VNode
 */
export function TodoList({ todos, onListEvent }) {
  const isEmpty = todos.length === 0;

  // 빈 안내는 목록 뒤에 둔다. 앞에 두면 나타날 때마다 뒤 형제의 인덱스가 밀려 교체된다.
  return createElement(
    'div',
    { class: 'todo-list-area' },
    createElement(
      'ul',
      { class: 'todo-list', onClick: onListEvent, onChange: onListEvent },
      todos.map(findTodoItemVNode),
    ),
    isEmpty && createElement('p', { class: 'todo-empty' }, '보여 줄 할 일이 없습니다'),
  );
}

// 할 일 객체 → 그 객체로 만든 항목 VNode. todoState는 바뀐 항목만 새 객체로 만들므로,
// 그대로인 항목은 같은 VNode를 다시 써서 diff가 그 줄 안으로 내려가지 않는다.
// TodoItem은 todo만 보고 그리므로 결과가 같다. WeakMap이라 지워진 할 일은 함께 사라진다.
const itemVNodeByTodo = new WeakMap();

function findTodoItemVNode(todo) {
  if (!itemVNodeByTodo.has(todo)) {
    itemVNodeByTodo.set(todo, createElement(TodoItem, { todo }));
  }

  return itemVNodeByTodo.get(todo);
}
