import { createElement } from '../../../core/index.js';
import { TODO_TEXT_MAX_LENGTH } from '../todoState.js';

const DRAFT_INPUT_ID = 'todo-draft';

/**
 * 할 일 입력 폼. 입력창 값은 루트의 draft 상태를 그대로 보여 준다. (상태 없음)
 * @param {object} props
 * @param {string} props.draft 입력 중인 글자
 * @param {Function} props.onDraftInput 입력창 input 이벤트 핸들러
 * @param {Function} props.onSubmit 폼 submit 이벤트 핸들러
 * @returns {object} VNode
 */
export function TodoForm({ draft, onDraftInput, onSubmit }) {
  return createElement(
    'form',
    { class: 'todo-form', onSubmit },
    createElement('label', { class: 'todo-label', for: DRAFT_INPUT_ID }, '할 일'),
    createElement('input', {
      id: DRAFT_INPUT_ID,
      class: 'todo-input',
      type: 'text',
      value: draft,
      maxlength: String(TODO_TEXT_MAX_LENGTH),
      placeholder: '할 일을 입력하고 Enter',
      autocomplete: 'off',
      'data-role': 'draft-input',
      onInput: onDraftInput,
    }),
    createElement('button', { class: 'todo-add-button', type: 'submit' }, '추가'),
  );
}
