import { TodoList } from '../../../src/demos/phase_two/components/TodoList.js';
import { toggleTodo } from '../../../src/demos/phase_two/todoState.js';
import { test, assertTrue } from '../../testRunner.js';

function findItemVNodes(listVNode) {
  return listVNode.children[0].children;
}

test('TodoList : 그대로인 할 일은 같은 항목 VNode를 다시 쓰고, 바뀐 할 일만 새로 만든다', () => {
  const todos = [
    { id: 1, text: 'a', isDone: false },
    { id: 2, text: 'b', isDone: false },
  ];
  const onListEvent = () => {};
  const previousItems = findItemVNodes(TodoList({ todos, onListEvent }));
  const nextItems = findItemVNodes(TodoList({ todos: toggleTodo(todos, 2), onListEvent }));

  assertTrue(nextItems[0] === previousItems[0], '그대로인 항목은 같은 VNode여야 합니다');
  assertTrue(nextItems[1] !== previousItems[1], '바뀐 항목은 새 VNode여야 합니다');
  assertTrue(nextItems[1].props.class === 'todo-item is-done', '바뀐 내용이 반영되어야 합니다');
});
