import {
  FILTERS,
  addTodo,
  toggleTodo,
  removeTodo,
  removeDoneTodos,
  filterTodos,
  countRemaining,
  parseStoredTodos,
} from '../../../src/demos/phase_two/todoState.js';
import { test, assertEqual, assertThrows } from '../../testRunner.js';

const sampleTodos = [
  { id: 1, text: '하나', isDone: false },
  { id: 3, text: '셋', isDone: true },
];

test('todoState : addTodo는 가장 큰 id + 1로 맨 뒤에 붙이고 원래 배열은 그대로 둔다', () => {
  const nextTodos = addTodo(sampleTodos, '  넷  ');

  assertEqual(nextTodos[2], { id: 4, text: '넷', isDone: false });
  assertEqual(sampleTodos.length, 2);
});

test('todoState : toggleTodo, removeTodo, removeDoneTodos', () => {
  assertEqual(toggleTodo(sampleTodos, 1)[0].isDone, true);
  assertEqual(sampleTodos[0].isDone, false);
  assertEqual(removeTodo(sampleTodos, 3), [sampleTodos[0]]);
  assertEqual(removeDoneTodos(sampleTodos), [sampleTodos[0]]);
});

test('todoState : filterTodos와 countRemaining', () => {
  assertEqual(filterTodos(sampleTodos, FILTERS.ALL), sampleTodos);
  assertEqual(filterTodos(sampleTodos, FILTERS.ACTIVE), [sampleTodos[0]]);
  assertEqual(filterTodos(sampleTodos, FILTERS.DONE), [sampleTodos[1]]);
  assertEqual(countRemaining(sampleTodos), 1);
  assertThrows(() => filterTodos(sampleTodos, 'toString'), RangeError, '[filterTodos] 알 수 없는 필터');
});

test('todoState : parseStoredTodos는 형식이 틀린 항목과 겹치는 id를 버린다', () => {
  const storedText = JSON.stringify([
    { id: 1, text: '정상', isDone: false, extra: '버림' },
    { id: 1, text: '겹침', isDone: true },
    { id: '2', text: '문자 id', isDone: false },
    { id: 3, text: '', isDone: false },
    { id: 4, text: 'a'.repeat(101), isDone: false },
    null,
  ]);

  assertEqual(parseStoredTodos(storedText), [{ id: 1, text: '정상', isDone: false }]);
  assertEqual(parseStoredTodos(null), []);
  assertEqual(parseStoredTodos('{"not":"array"}'), []);
});
