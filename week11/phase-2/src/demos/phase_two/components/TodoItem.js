import { createElement } from '../../../core/index.js';
import { TODO_ACTIONS } from '../todoState.js';

/**
 * 할 일 한 줄. 이벤트는 TodoList가 data-action과 data-todo-id로 한 번에 받는다. (상태 없음)
 * @param {object} props
 * @param {{ id: number, text: string, isDone: boolean }} props.todo 보여 줄 할 일
 * @returns {object} VNode
 */
export function TodoItem({ todo }) {
  return createElement(
    'li',
    { class: todo.isDone ? 'todo-item is-done' : 'todo-item', 'data-todo-id': String(todo.id) },
    createElement(
      'label',
      { class: 'todo-check' },
      createElement('input', {
        type: 'checkbox',
        checked: todo.isDone,
        'data-action': TODO_ACTIONS.TOGGLE,
      }),
      createElement('span', { class: 'todo-text' }, todo.text),
    ),
    createElement('button', {
      class: 'todo-remove-button',
      type: 'button',
      'data-action': TODO_ACTIONS.REMOVE,
      'aria-label': `${todo.text} 삭제`,
    }, '삭제'),
  );
}
