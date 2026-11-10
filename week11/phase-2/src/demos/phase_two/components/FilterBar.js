import { createElement } from '../../../core/index.js';
import { TODO_ACTIONS, getFilterOptions } from '../todoState.js';

/**
 * 필터 버튼 묶음. 누른 버튼은 data-filter로 루트 핸들러가 구분한다. (상태 없음)
 * @param {object} props
 * @param {string} props.filter 지금 선택한 필터 이름
 * @param {Function} props.onFilterClick 버튼 묶음의 click 이벤트 핸들러
 * @returns {object} VNode
 */
export function FilterBar({ filter, onFilterClick }) {
  const buttons = getFilterOptions().map(({ name, label }) => {
    const isSelected = name === filter;

    return createElement('button', {
      class: isSelected ? 'filter-button is-selected' : 'filter-button',
      type: 'button',
      'data-action': TODO_ACTIONS.FILTER,
      'data-filter': name,
      'aria-pressed': String(isSelected),
    }, label);
  });

  return createElement(
    'div',
    { class: 'filter-bar', role: 'group', 'aria-label': '필터', onClick: onFilterClick },
    buttons,
  );
}
