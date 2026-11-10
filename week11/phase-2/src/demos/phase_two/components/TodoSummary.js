import { createElement } from '../../../core/index.js';
import { TODO_ACTIONS } from '../todoState.js';

/**
 * 남은 개수와 완료 항목 지우기 버튼. (상태 없음)
 * @param {object} props
 * @param {number} props.remainingCount 남은 할 일 개수
 * @param {number} props.totalCount 전체 할 일 개수
 * @param {Function} props.onClearDone 완료 항목 지우기 click 이벤트 핸들러
 * @returns {object} VNode
 */
export function TodoSummary({ remainingCount, totalCount, onClearDone }) {
  const hasDoneTodos = remainingCount < totalCount;

  return createElement(
    'div',
    { class: 'todo-summary' },
    createElement(
      'p',
      { class: 'todo-count', 'data-role': 'todo-count' },
      `남은 할 일 ${remainingCount}개 / 전체 ${totalCount}개`,
    ),
    createElement('button', {
      class: 'todo-clear-button',
      type: 'button',
      'data-action': TODO_ACTIONS.CLEAR_DONE,
      disabled: !hasDoneTodos,
      onClick: onClearDone,
    }, '완료 항목 지우기'),
  );
}
