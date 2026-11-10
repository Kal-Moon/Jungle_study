import { createElement, FunctionComponent, useState, useMemo } from '../../../src/core/index.js';
import { test, assertEqual, assertThrows, assertTrue } from '../../testRunner.js';

// Root를 mount하고, 렌더링마다 Root가 기록한 값(snapshot)을 함께 돌려준다.
function mountRoot(Root) {
  const container = document.createElement('div');
  const instance = new FunctionComponent(Root, {}, container);

  document.body.append(container);
  instance.mount();

  return {
    container,
    dispose: () => {
      if (instance.isMounted) {
        instance.unmount();
      }

      container.remove();
    },
  };
}

test('useState : 초기값을 돌려주고 렌더링 사이에 값을 유지한다', () => {
  let renderCount = 0;
  let setCount = null;
  const Root = () => {
    const [count, setNext] = useState(10);

    renderCount += 1;
    setCount = setNext;
    return createElement('p', null, String(count));
  };
  const { container, dispose } = mountRoot(Root);

  setCount(11);
  assertEqual(container.textContent, '11');
  setCount(12);
  assertEqual(container.textContent, '12');
  assertEqual(renderCount, 3);
  dispose();
});

test('useState : 초기값이 함수면 최초 렌더링에서 한 번만 호출한다', () => {
  let initializerCallCount = 0;
  let setCount = null;
  const Root = () => {
    const [count, setNext] = useState(() => {
      initializerCallCount += 1;
      return 1;
    });

    setCount = setNext;
    return createElement('p', null, String(count));
  };
  const { container, dispose } = mountRoot(Root);

  setCount(2);
  setCount(3);
  assertEqual(initializerCallCount, 1);
  assertEqual(container.textContent, '3');
  dispose();
});

test('useState : 함수형 갱신에는 최신 값을 넘긴다', () => {
  let setCount = null;
  const Root = () => {
    const [count, setNext] = useState(0);

    setCount = setNext;
    return createElement('p', null, String(count));
  };
  const { container, dispose } = mountRoot(Root);

  setCount((previousCount) => previousCount + 1);
  setCount((previousCount) => previousCount + 1);
  setCount((previousCount) => previousCount * 10);
  assertEqual(container.textContent, '20');
  dispose();
});

test('useState : 여러 상태는 서로 독립적이다', () => {
  const setters = {};
  const Root = () => {
    const [left, setLeft] = useState('a');
    const [right, setRight] = useState('b');

    Object.assign(setters, { setLeft, setRight });
    return createElement('p', null, `${left}-${right}`);
  };
  const { container, dispose } = mountRoot(Root);

  setters.setLeft('x');
  assertEqual(container.textContent, 'x-b');
  setters.setRight('y');
  assertEqual(container.textContent, 'x-y');
  dispose();
});

test('useState : 같은 값(Object.is)이면 다시 렌더링하지 않는다', () => {
  let renderCount = 0;
  let setValue = null;
  const sameObject = { name: '같음' };
  const Root = () => {
    const [value, setNext] = useState(sameObject);

    renderCount += 1;
    setValue = setNext;
    return createElement('p', null, value.name);
  };
  const { dispose } = mountRoot(Root);

  setValue(sameObject);
  setValue((previousValue) => previousValue);
  assertEqual(renderCount, 1);
  dispose();
});

test('useState : NaN도 Object.is 기준으로 같은 값으로 본다', () => {
  let renderCount = 0;
  let setValue = null;
  const Root = () => {
    const [value, setNext] = useState(NaN);

    renderCount += 1;
    setValue = setNext;
    return createElement('p', null, String(value));
  };
  const { dispose } = mountRoot(Root);

  setValue(NaN);
  assertEqual(renderCount, 1);
  dispose();
});

test('useState : 상태 변경 함수는 렌더링마다 같은 함수다', () => {
  const receivedSetters = [];
  let setCount = null;
  const Root = () => {
    const [count, setNext] = useState(0);

    receivedSetters.push(setNext);
    setCount = setNext;
    return createElement('p', null, String(count));
  };
  const { dispose } = mountRoot(Root);

  setCount(1);
  assertTrue(receivedSetters[0] === receivedSetters[1], '렌더링마다 상태 변경 함수가 바뀜');
  dispose();
});

test('useState : 렌더링 함수 본문에서 상태 변경 함수를 부르면 Error', () => {
  const Root = () => {
    const [count, setCount] = useState(0);

    setCount(count + 1);
    return createElement('p', null);
  };
  const container = document.createElement('div');
  const instance = new FunctionComponent(Root, {}, container);

  assertThrows(() => instance.mount(), Error, '[useState] 렌더링 중에는 상태를 바꿀 수 없습니다');
});

test('useState : 렌더링 밖에서 부르면 Error', () => {
  assertThrows(() => useState(0), Error, '[useState] 루트 컴포넌트 렌더링 중에만 호출할 수 있습니다');
});

test('useState : 조건문 때문에 Hook 종류가 바뀌면 Error', () => {
  let isFirst = true;
  let forceUpdate = null;
  const Root = () => {
    const [, setTick] = useState(0);

    forceUpdate = () => setTick((tick) => tick + 1);

    if (isFirst) {
      useState('a');
    } else {
      useMemo(() => 'b', []);
    }

    return createElement('p', null);
  };
  const { dispose } = mountRoot(Root);

  isFirst = false;
  assertThrows(forceUpdate, Error, '[useMemo] Hook 호출 순서가 바뀌었습니다');
  dispose();
});

test('useState : Hook 개수가 줄거나 늘면 Error', () => {
  let hookCount = 2;
  let forceUpdate = null;
  const Root = () => {
    const [, setTick] = useState(0);

    forceUpdate = () => setTick((tick) => tick + 1);

    for (let i = 1; i < hookCount; i++) {
      useState(i);
    }

    return createElement('p', null);
  };
  const { dispose } = mountRoot(Root);

  hookCount = 1;
  assertThrows(forceUpdate, Error, '[FunctionComponent] Hook 호출 순서가 바뀌었습니다');
  hookCount = 3;
  assertThrows(forceUpdate, Error, '[useState] Hook 호출 순서가 바뀌었습니다');
  dispose();
});
