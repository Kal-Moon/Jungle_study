import { FunctionComponent } from '../../../src/core/index.js';
import { TodoApp } from '../../../src/demos/phase_two/app.js';
import { test, assertEqual, assertTrue } from '../../testRunner.js';

// Phase 2 문서 13.2 기능 테스트. 저장소 없이(storage: null) 할 일 목록을 문서에 붙여 mount한다.
function mountTodoApp(storage = null) {
  const container = document.createElement('div');
  const instance = new FunctionComponent(TodoApp, { storage }, container);

  document.body.append(container);
  instance.mount();

  const find = (selector) => container.querySelector(selector);

  return {
    instance,
    container,
    find,
    typeDraft: (text) => {
      const input = find('[data-role="draft-input"]');

      input.value = text;
      input.dispatchEvent(new Event('input', { bubbles: true }));
    },
    submit: () => find('.todo-add-button').click(),
    findItemTexts: () => Array.from(
      container.querySelectorAll('.todo-text'),
      (node) => node.textContent,
    ),
    dispose: () => {
      if (instance.isMounted) {
        instance.unmount();
      }

      container.remove();
    },
  };
}

function addTodos(app, texts) {
  for (const text of texts) {
    app.typeDraft(text);
    app.submit();
  }
}

test('Phase 2 데모 : 입력하고 추가하면 목록과 남은 개수가 갱신되고 입력창이 비워진다', () => {
  const app = mountTodoApp();

  addTodos(app, ['장보기', '운동']);
  assertEqual(app.findItemTexts(), ['장보기', '운동']);
  assertEqual(app.find('[data-role="todo-count"]').textContent, '남은 할 일 2개 / 전체 2개');
  assertEqual(app.find('[data-role="draft-input"]').value, '');
  app.dispose();
});

test('Phase 2 데모 : 빈 글자를 추가하면 에러 문구만 보이고 목록은 그대로다', () => {
  const app = mountTodoApp();

  app.typeDraft('   ');
  app.submit();
  assertEqual(app.findItemTexts(), []);
  assertEqual(app.find('.todo-error').textContent, '할 일을 입력해 주세요');
  app.typeDraft('a');
  assertEqual(app.find('.todo-error').textContent, '');
  app.dispose();
});

test('Phase 2 데모 : 타이핑하는 동안 입력창 노드가 그대로라 포커스가 유지된다', () => {
  const app = mountTodoApp();
  const input = app.find('[data-role="draft-input"]');

  input.focus();

  for (const text of ['가', '가나', '가나다']) {
    app.typeDraft(text);
    assertTrue(app.find('[data-role="draft-input"]') === input, '입력창 노드가 교체됨');
    assertTrue(document.activeElement === input, '포커스를 잃음');
  }

  assertEqual(input.value, '가나다');
  app.dispose();
});

test('Phase 2 데모 : 완료 토글·필터·삭제·완료 항목 지우기', () => {
  const app = mountTodoApp();

  addTodos(app, ['하나', '둘', '셋']);
  app.container.querySelectorAll('[data-action="toggle"]')[1].click();
  assertEqual(app.find('[data-role="todo-count"]').textContent, '남은 할 일 2개 / 전체 3개');
  const secondItem = app.container.querySelectorAll('.todo-item')[1];

  assertTrue(secondItem.classList.contains('is-done'), '완료 표시 없음');

  app.find('[data-filter="done"]').click();
  assertEqual(app.findItemTexts(), ['둘']);
  app.find('[data-filter="active"]').click();
  assertEqual(app.findItemTexts(), ['하나', '셋']);
  app.find('[data-filter="all"]').click();

  app.container.querySelectorAll('[data-action="remove"]')[0].click();
  assertEqual(app.findItemTexts(), ['둘', '셋']);
  app.find('[data-action="clear-done"]').click();
  assertEqual(app.findItemTexts(), ['셋']);
  assertTrue(app.find('[data-action="clear-done"]').disabled, '완료 항목이 없는데 버튼이 켜져 있음');
  app.dispose();
});

test('Phase 2 데모 : 연속 조작 뒤에도 클릭 한 번에 한 번만 실행된다', () => {
  const app = mountTodoApp();

  addTodos(app, ['하나']);

  for (let i = 0; i < 5; i++) {
    app.typeDraft(`입력 ${i}`);
    app.find('[data-filter="active"]').click();
    app.find('[data-filter="all"]').click();
  }

  // 같은 리스너가 여러 번 달렸다면 한 번 클릭에 토글이 여러 번 일어나 결과가 어긋난다.
  app.find('[data-action="toggle"]').click();
  assertEqual(app.find('[data-role="todo-count"]').textContent, '남은 할 일 0개 / 전체 1개');
  app.find('[data-action="toggle"]').click();
  assertEqual(app.find('[data-role="todo-count"]').textContent, '남은 할 일 1개 / 전체 1개');
  app.dispose();
});

test('Phase 2 데모 : 바뀐 항목만 갱신하고 나머지 DOM 노드는 유지한다', () => {
  const app = mountTodoApp();

  addTodos(app, ['하나', '둘']);

  const items = Array.from(app.container.querySelectorAll('.todo-item'));
  const filterBar = app.find('.filter-bar');

  app.container.querySelectorAll('[data-action="toggle"]')[1].click();

  const nextItems = Array.from(app.container.querySelectorAll('.todo-item'));

  assertTrue(nextItems[0] === items[0] && nextItems[1] === items[1], '항목 노드가 교체됨');
  assertTrue(app.find('.filter-bar') === filterBar, '필터 노드가 교체됨');
  app.dispose();
});

test('Phase 2 데모 : Esc로 입력을 지우고, 해제 뒤에는 키 리스너와 제목 변경이 남지 않는다', () => {
  const originalTitle = document.title;
  const titleBefore = '제목';

  document.title = titleBefore;

  const app = mountTodoApp();

  addTodos(app, ['하나']);
  assertEqual(document.title, `(1) ${titleBefore}`);
  app.typeDraft('지울 글자');
  window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
  assertEqual(app.find('[data-role="draft-input"]').value, '');

  app.instance.unmount();
  assertEqual(document.title, titleBefore);
  // 해제 뒤 Esc는 아무것도 하지 않아야 한다. (상태 변경 함수도 무시된다)
  window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
  assertEqual(app.container.childNodes.length, 0);
  app.dispose();
  document.title = originalTitle;
});

test('Phase 2 데모 : 저장소에 저장하고 다시 mount하면 읽어 온다', () => {
  const savedItems = new Map();
  const storage = {
    getItem: (key) => (savedItems.has(key) ? savedItems.get(key) : null),
    setItem: (key, value) => savedItems.set(key, value),
  };
  const firstApp = mountTodoApp(storage);

  addTodos(firstApp, ['저장할 일']);
  firstApp.dispose();

  const secondApp = mountTodoApp(storage);

  assertEqual(secondApp.findItemTexts(), ['저장할 일']);
  secondApp.dispose();
});

test('Phase 2 데모 : 할 일 글자는 HTML로 해석되지 않는다', () => {
  const app = mountTodoApp();

  addTodos(app, ['<img src=x onerror="window.isInjected = true">']);
  assertEqual(app.container.querySelectorAll('img').length, 0);
  assertEqual(app.findItemTexts(), ['<img src=x onerror="window.isInjected = true">']);
  app.dispose();
});
