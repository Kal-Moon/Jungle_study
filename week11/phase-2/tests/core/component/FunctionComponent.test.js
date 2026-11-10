import { createElement, FunctionComponent, useState, useEffect } from '../../../src/core/index.js';
import { test, assertEqual, assertThrows, assertTrue } from '../../testRunner.js';

function createContainer() {
  const container = document.createElement('div');

  document.body.append(container);
  return container;
}

test('FunctionComponent : mount하면 container에 루트 DOM 하나만 넣고 props를 넘긴다', () => {
  const container = createContainer();

  container.append(document.createElement('hr'));

  const instance = new FunctionComponent(
    ({ name }) => createElement('p', { class: 'hello' }, `안녕 ${name}`),
    { name: '정글' },
    container,
  );

  instance.mount();
  assertEqual(container.childNodes.length, 1);
  assertTrue(container.firstChild === instance.rootNode, 'rootNode가 container의 자식이 아님');
  assertEqual(container.innerHTML, '<p class="hello">안녕 정글</p>');
  assertEqual(instance.currentVNode.tag, 'p');
  instance.unmount();
  container.remove();
});

test('FunctionComponent : update는 diff·patch로 바뀐 곳만 반영하고 노드를 유지한다', () => {
  const container = createContainer();
  let setLabel = null;
  const Root = () => {
    const [label, setNextLabel] = useState('하나');

    setLabel = setNextLabel;
    return createElement(
      'div',
      null,
      createElement('input', { type: 'text' }),
      createElement('p', null, label),
    );
  };
  const instance = new FunctionComponent(Root, {}, container);

  instance.mount();

  const inputNode = container.querySelector('input');
  const paragraphNode = container.querySelector('p');

  setLabel('둘');
  assertEqual(paragraphNode.textContent, '둘');
  assertTrue(container.querySelector('input') === inputNode, 'input 노드가 교체됨');
  assertTrue(container.querySelector('p') === paragraphNode, 'p 노드가 교체됨');
  instance.unmount();
  container.remove();
});

test('FunctionComponent : 루트 태그가 바뀌면 새 루트 노드를 쓴다', () => {
  const container = createContainer();
  let setIsSection = null;
  const Root = () => {
    const [isSection, setNext] = useState(false);

    setIsSection = setNext;
    return createElement(isSection ? 'section' : 'div', null, '내용');
  };
  const instance = new FunctionComponent(Root, {}, container);

  instance.mount();
  setIsSection(true);
  assertEqual(instance.rootNode.tagName, 'SECTION');
  assertTrue(container.firstChild === instance.rootNode, '새 루트가 container에 없음');
  setIsSection(false);
  assertEqual(container.innerHTML, '<div>내용</div>');
  instance.unmount();
  container.remove();
});

test('FunctionComponent : unmount하면 DOM을 떼고 cleanup을 부르며, 이후 상태 변경은 무시한다', () => {
  const container = createContainer();
  const calls = [];
  let setCount = null;
  const Root = () => {
    const [count, setNext] = useState(0);

    setCount = setNext;
    useEffect(() => () => calls.push('cleanup'), []);
    calls.push(`render ${count}`);
    return createElement('p', null, String(count));
  };
  const instance = new FunctionComponent(Root, {}, container);

  instance.mount();
  instance.unmount();
  setCount(5);
  assertEqual(calls, ['render 0', 'cleanup']);
  assertEqual(container.childNodes.length, 0);
  assertTrue(!instance.isMounted, '해제 뒤에도 mount 상태');
  container.remove();
});

test('FunctionComponent : 생명주기에 맞지 않는 호출은 Error', () => {
  const container = createContainer();
  const instance = new FunctionComponent(() => createElement('p', null), {}, container);
  const prefix = '[FunctionComponent]';

  assertThrows(() => instance.update(), Error, `${prefix} mount 전에 update할 수 없습니다`);
  assertThrows(() => instance.unmount(), Error, `${prefix} mount 전에 unmount할 수 없습니다`);
  instance.mount();
  assertThrows(() => instance.mount(), Error, `${prefix} 이미 mount되었습니다`);
  instance.unmount();
  assertThrows(() => instance.unmount(), Error, `${prefix} 이미 해제되었습니다`);
  assertThrows(() => instance.update(), Error, `${prefix} 해제된 뒤에는 update할 수 없습니다`);
  assertThrows(() => instance.mount(), Error, `${prefix} 해제된 컴포넌트는 다시 mount할 수 없습니다`);
  container.remove();
});

test('FunctionComponent : RootComponent가 함수가 아니거나 container가 요소가 아니면 TypeError', () => {
  assertThrows(() => new FunctionComponent('App', {}, document.body), TypeError, 'RootComponent');
  assertThrows(() => new FunctionComponent(() => null, {}, null), TypeError, 'container');
});

test('FunctionComponent : 루트가 element VNode가 아니면 TypeError, 고친 뒤 다시 mount할 수 있다', () => {
  const container = createContainer();
  let isBroken = true;
  const Root = () => (isBroken ? null : createElement('p', null, 'ok'));
  const instance = new FunctionComponent(Root, {}, container);

  assertThrows(() => instance.mount(), TypeError, '[FunctionComponent] 루트는 element VNode여야 합니다');
  assertTrue(!instance.isMounted, '실패했는데 mount 상태');
  isBroken = false;
  instance.mount();
  assertEqual(container.innerHTML, '<p>ok</p>');
  instance.unmount();
  container.remove();
});

test('FunctionComponent : 텍스트 VNode를 루트로 돌려주면 TypeError', () => {
  const container = createContainer();
  const instance = new FunctionComponent(() => ({ type: 'text', text: '글자' }), {}, container);

  assertThrows(() => instance.mount(), TypeError, '루트는 element VNode여야 합니다');
  container.remove();
});

test('FunctionComponent : 렌더링이 실패한 뒤 같은 값으로 다시 바꾸면 화면을 맞춘다', () => {
  const container = createContainer();
  const control = { isBroken: false, setValue: null };
  const Root = () => {
    const [value, setValue] = useState(0);

    control.setValue = setValue;

    if (control.isBroken) {
      throw new Error('렌더링 실패');
    }

    return createElement('p', null, String(value));
  };
  const instance = new FunctionComponent(Root, {}, container);

  instance.mount();
  control.isBroken = true;
  assertThrows(() => control.setValue(1), Error, '렌더링 실패');
  assertTrue(instance.isViewStale, '실패했는데 화면이 맞다고 봄');
  control.isBroken = false;
  control.setValue(1);
  assertEqual(container.textContent, '1');
  assertTrue(!instance.isViewStale, '맞췄는데 뒤처졌다고 봄');
  instance.unmount();
  container.remove();
});

test('FunctionComponent : cleanup이 에러를 던져도 나머지 cleanup과 DOM 해제를 마친다', () => {
  const container = createContainer();
  const calls = [];
  const Root = () => {
    useEffect(() => () => {
      calls.push('first');
      throw new Error('cleanup 실패');
    }, []);
    useEffect(() => () => calls.push('second'), []);
    return createElement('p', null);
  };
  const instance = new FunctionComponent(Root, {}, container);

  instance.mount();
  assertThrows(() => instance.unmount(), Error, 'cleanup 실패');
  assertEqual(calls, ['first', 'second']);
  assertEqual(container.childNodes.length, 0);
  assertTrue(!instance.isMounted, '해제되지 않음');
  container.remove();
});
