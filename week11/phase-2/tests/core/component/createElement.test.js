import { createElement, FunctionComponent, useState } from '../../../src/core/index.js';
import { test, assertEqual, assertThrows, assertTrue } from '../../testRunner.js';

const text = (value) => ({ type: 'text', text: value });

test('createElement : 요소 VNode를 만들고 문자열·숫자 자식을 텍스트 노드로 바꾼다', () => {
  assertEqual(createElement('p', { class: 'a' }, 'hi', 3), {
    type: 'element',
    tag: 'p',
    props: { class: 'a' },
    children: [text('hi'), text('3')],
  });
});

test('createElement : props가 null이면 빈 객체, 태그 이름은 소문자로 저장한다', () => {
  const vnode = createElement('DIV', null);

  assertEqual(vnode.tag, 'div');
  assertEqual(vnode.props, {});
  assertEqual(vnode.children, []);
});

test('createElement : null·undefined·true·false는 빼고 중첩 배열은 평탄화한다', () => {
  const vnode = createElement('ul', null, null, ['a', [false, 'b', [undefined, 0]]], true);

  assertEqual(vnode.children, [text('a'), text('b'), text('0')]);
});

test('createElement : 빈 글자·공백만 있는 글자는 VNode로 만들지 않는다 (Phase 1 6.2)', () => {
  const vnode = createElement('p', null, '', '  \n', 'a', ' ', 'b', text(' '));

  assertEqual(vnode.children, [text('a'), text('b')]);
});

test('createElement : 이미 만든 VNode를 자식으로 쓸 수 있다', () => {
  const child = createElement('b', null, '굵게');
  const vnode = createElement('p', null, child, text('글자'));

  assertTrue(vnode.children[0] === child, '같은 VNode를 그대로 써야 함');
  assertEqual(vnode.children[1], text('글자'));
});

test('createElement : 받은 props 객체를 복사해 둔다', () => {
  const props = { class: 'a' };
  const vnode = createElement('p', props);

  props.class = 'b';
  assertEqual(vnode.props.class, 'a');
});

test('createElement : 자식 컴포넌트는 props와 정규화한 children을 받아 바로 호출된다', () => {
  let receivedProps = null;
  const Child = (props) => {
    receivedProps = props;
    return createElement('span', null, props.label, props.children);
  };
  const vnode = createElement(Child, { label: '이름' }, 'a', null, ['b']);

  assertEqual(receivedProps, { label: '이름', children: [text('a'), text('b')] });
  assertEqual(vnode, createElement('span', null, '이름', 'a', 'b'));
});

test('createElement : 자식 컴포넌트가 null을 돌려주면 부모 자식에서 빠진다', () => {
  const Nothing = () => null;

  assertEqual(createElement('div', null, createElement(Nothing, null)).children, []);
});

test('createElement : 자식 컴포넌트 안에서 Hook을 부르면 Error, 끝나면 루트 문맥을 되돌린다', () => {
  const Child = () => {
    useState(0);
    return createElement('span', null);
  };
  const container = document.createElement('div');
  let rootCountAfterChild = null;
  const Root = () => {
    assertThrows(() => createElement(Child, null), Error, '[useState] 루트 컴포넌트 렌더링 중에만');
    // 자식 호출이 끝나면 루트에서는 다시 Hook을 쓸 수 있어야 한다.
    const [count] = useState(7);

    rootCountAfterChild = count;
    return createElement('div', null);
  };

  new FunctionComponent(Root, {}, container).mount();
  assertEqual(rootCountAfterChild, 7);
});

test('createElement : tag가 문자열도 함수도 아니면 TypeError', () => {
  assertThrows(() => createElement(null, null), TypeError, '[createElement] tag가 올바르지 않습니다');
  assertThrows(() => createElement(3, null), TypeError, '[createElement] tag가 올바르지 않습니다');
});

test('createElement : script·style 태그, 잘못된 props·자식은 TypeError', () => {
  assertThrows(() => createElement('script', null), TypeError, 'script, style');
  assertThrows(() => createElement('STYLE', null), TypeError, 'script, style');
  assertThrows(() => createElement('p', 'a'), TypeError, 'props');
  assertThrows(() => createElement('p', []), TypeError, 'props');
  assertThrows(() => createElement('p', null, { text: 'x' }), TypeError, '자식이 올바르지 않습니다');
  assertThrows(() => createElement('p', null, () => {}), TypeError, '자식이 올바르지 않습니다');
});

test('createElement : 직접 만든 VNode는 자식까지 검사하고, createElement로 만든 VNode는 그대로 넣는다', () => {
  const badNested = { type: 'element', tag: 'div', props: {}, children: [{ text: 'x' }] };
  const created = createElement('ul', null, createElement('li', null, 'a'));

  assertThrows(() => createElement('p', null, badNested), TypeError, '자식이 올바르지 않습니다');
  assertTrue(createElement('div', null, created).children[0] === created);
});

test('createElement : 10,000겹 중첩도 깊이에 비례하는 시간 안에 만든다', () => {
  const startedAt = performance.now();
  let vnode = createElement('span', null, 'leaf');

  for (let depth = 0; depth < 10000; depth++) {
    vnode = createElement('div', null, vnode);
  }

  const elapsed = performance.now() - startedAt;

  assertTrue(elapsed < 200, `너무 느림: ${Math.round(elapsed)}ms`);
});

test('createElement : 태그 이름에 공백·따옴표 등이 있거나 비어 있으면 TypeError', () => {
  assertThrows(() => createElement('div onclick', null), TypeError, 'tag가 올바르지 않습니다');
  assertThrows(() => createElement('', null), TypeError, 'tag가 올바르지 않습니다');
  assertEqual(createElement('my-widget', null).tag, 'my-widget');
});

test('createElement : props의 children은 요소 속성에 넣지 않는다', () => {
  const PassThrough = (props) => createElement('div', props, props.children);
  const vnode = createElement(PassThrough, { class: 'box' }, 'a');

  assertEqual(vnode.props, { class: 'box' });
  assertEqual(vnode.children, [text('a')]);
});

test('createElement : 직접 만든 script·style VNode를 자식으로 넣어도 TypeError', () => {
  const scriptVNode = { type: 'element', tag: 'script', props: {}, children: [] };

  assertThrows(() => createElement('div', null, scriptVNode), TypeError, 'script, style');
});
