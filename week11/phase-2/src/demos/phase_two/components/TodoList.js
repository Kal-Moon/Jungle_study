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
      todos.map((todo) => createElement(TodoItem, { todo })),
    ),
    isEmpty && createElement('p', { class: 'todo-empty' }, '보여 줄 할 일이 없습니다'),
  );
}
