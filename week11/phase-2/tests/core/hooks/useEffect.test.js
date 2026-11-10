import { createElement, FunctionComponent, useState, useEffect } from '../../../src/core/index.js';
import { test, assertEqual, assertThrows, assertTrue } from '../../testRunner.js';

// 렌더링마다 Root가 받을 값을 바꾸고 다시 렌더링하는 도구를 함께 돌려준다.
function mountWithValue(createRoot, initialValue) {
  const container = document.createElement('div');
  const control = { setValue: null };
  const Root = () => {
    const [value, setValue] = useState(initialValue);

    control.setValue = setValue;
    return createRoot(value);
  };
  const instance = new FunctionComponent(Root, {}, container);

  document.body.append(container);
  instance.mount();

  return { instance, container, setValue: (value) => control.setValue(value) };
}

function dispose({ instance, container }) {
  if (instance.isMounted) {
    instance.unmount();
  }

  container.remove();
}

test('useEffect : DOM 반영이 끝난 뒤 실행한다', () => {
  let textSeenByEffect = null;
  let isInDocument = false;
  const mounted = mountWithValue((value) => {
    useEffect(() => {
      const paragraph = document.querySelector('[data-role="effect-target"]');

      textSeenByEffect = paragraph.textContent;
      isInDocument = document.body.contains(paragraph);
    });
    return createElement('p', { 'data-role': 'effect-target' }, value);
  }, '처음');

  assertEqual(textSeenByEffect, '처음');
  assertTrue(isInDocument, 'Effect 실행 때 DOM이 문서에 없음');
  mounted.setValue('다음');
  assertEqual(textSeenByEffect, '다음');
  dispose(mounted);
});

test('useEffect : 의존성을 생략하면 렌더링마다, 빈 배열이면 처음 한 번만 실행한다', () => {
  const runCounts = { everyRender: 0, once: 0 };
  const mounted = mountWithValue((value) => {
    useEffect(() => {
      runCounts.everyRender += 1;
    });
    useEffect(() => {
      runCounts.once += 1;
    }, []);
    return createElement('p', null, String(value));
  }, 0);

  mounted.setValue(1);
  mounted.setValue(2);
  assertEqual(runCounts, { everyRender: 3, once: 1 });
  dispose(mounted);
});

test('useEffect : 의존성 값이 하나라도 바뀔 때만 다시 실행한다', () => {
  const seenValues = [];
  const mounted = mountWithValue(({ watched, other }) => {
    useEffect(() => {
      seenValues.push(watched);
    }, [watched]);
    return createElement('p', null, `${watched}${other}`);
  }, { watched: 'a', other: 1 });

  mounted.setValue({ watched: 'a', other: 2 });
  mounted.setValue({ watched: 'b', other: 2 });
  mounted.setValue({ watched: 'b', other: 3 });
  assertEqual(seenValues, ['a', 'b']);
  dispose(mounted);
});

test('useEffect : 다시 실행하기 전에 이전 cleanup을 먼저 부르고, cleanup들을 effect보다 먼저 부른다', () => {
  const calls = [];
  const mounted = mountWithValue((value) => {
    useEffect(() => {
      calls.push(`first effect ${value}`);
      return () => calls.push(`first cleanup ${value}`);
    }, [value]);
    useEffect(() => {
      calls.push(`second effect ${value}`);
      return () => calls.push(`second cleanup ${value}`);
    }, [value]);
    return createElement('p', null, String(value));
  }, 1);

  mounted.setValue(2);
  assertEqual(calls, [
    'first effect 1',
    'second effect 1',
    'first cleanup 1',
    'second cleanup 1',
    'first effect 2',
    'second effect 2',
  ]);
  calls.length = 0;
  mounted.instance.unmount();
  assertEqual(calls, ['first cleanup 2', 'second cleanup 2']);
  dispose(mounted);
});

test('useEffect : 해제할 때 cleanup을 한 번만 부르고, 이후 이벤트에서 작업이 남지 않는다', () => {
  let tickCount = 0;
  let cleanupCount = 0;
  const target = new EventTarget();
  const mounted = mountWithValue(() => {
    useEffect(() => {
      const handleTick = () => {
        tickCount += 1;
      };

      target.addEventListener('tick', handleTick);
      return () => {
        cleanupCount += 1;
        target.removeEventListener('tick', handleTick);
      };
    }, []);
    return createElement('p', null);
  }, 0);

  target.dispatchEvent(new Event('tick'));
  mounted.setValue(1);
  target.dispatchEvent(new Event('tick'));
  mounted.instance.unmount();
  target.dispatchEvent(new Event('tick'));
  assertEqual(tickCount, 2);
  assertEqual(cleanupCount, 1);
  dispose(mounted);
});

test('useEffect : Effect 안의 상태 변경은 지금 갱신이 끝난 뒤 다시 렌더링한다', () => {
  const renderedValues = [];
  const container = document.createElement('div');
  const Root = () => {
    const [value, setValue] = useState('처음');

    renderedValues.push(value);
    useEffect(() => {
      setValue('Effect가 바꿈');
    }, []);
    return createElement('p', null, value);
  };
  const instance = new FunctionComponent(Root, {}, container);

  instance.mount();
  assertEqual(renderedValues, ['처음', 'Effect가 바꿈']);
  assertEqual(container.textContent, 'Effect가 바꿈');
  instance.unmount();
});

test('useEffect : 해제 중 cleanup 안의 상태 변경은 무시한다', () => {
  let renderCount = 0;
  const container = document.createElement('div');
  const Root = () => {
    const [count, setCount] = useState(0);

    renderCount += 1;
    useEffect(() => () => setCount(count + 1), [count]);
    return createElement('p', null, String(count));
  };
  const instance = new FunctionComponent(Root, {}, container);

  instance.mount();
  instance.unmount();
  assertEqual(renderCount, 1);
});

test('useEffect : 콜백이 함수가 아니거나 의존성이 배열이 아니면 TypeError', () => {
  const tryRoot = (Root) => new FunctionComponent(Root, {}, document.createElement('div')).mount();

  assertThrows(() => tryRoot(() => {
    useEffect(null);
    return createElement('p', null);
  }), TypeError, '[useEffect] 콜백 함수가 필요합니다');
  assertThrows(() => tryRoot(() => {
    useEffect(() => {}, 'a');
    return createElement('p', null);
  }), TypeError, '[useEffect] 의존성은 배열이어야 합니다');
});

test('useEffect : async 콜백(Promise 반환)은 TypeError', () => {
  const instance = new FunctionComponent(() => {
    useEffect(async () => {}, []);
    return createElement('p', null);
  }, {}, document.createElement('div'));

  assertThrows(() => instance.mount(), TypeError, '[useEffect] 콜백은 cleanup 함수만 반환할 수 있습니다');
});

test('useEffect : 렌더링 밖에서 부르면 Error', () => {
  assertThrows(() => useEffect(() => {}), Error, '[useEffect] 루트 컴포넌트 렌더링 중에만');
});

test('useEffect : Effect 안에서 unmount하면 남은 Effect는 실행하지 않는다', () => {
  const calls = [];
  const container = document.createElement('div');
  const control = { instance: null };
  const Root = () => {
    useEffect(() => {
      calls.push('first');
      control.instance.unmount();
    }, []);
    useEffect(() => {
      calls.push('second');
      return () => calls.push('second cleanup');
    }, []);
    return createElement('p', null);
  };

  control.instance = new FunctionComponent(Root, {}, container);
  control.instance.mount();
  assertEqual(calls, ['first']);
});

test('useEffect : Effect 안에서 update()를 직접 불러도 남은 Effect가 끝난 뒤 갱신한다', () => {
  const calls = [];
  const container = document.createElement('div');
  const control = { instance: null, renderCount: 0 };
  const Root = () => {
    const renderNumber = control.renderCount;

    control.renderCount += 1;
    useEffect(() => {
      calls.push(`first ${renderNumber}`);

      if (renderNumber === 0) {
        control.instance.update();
      }
    });
    useEffect(() => {
      calls.push(`second ${renderNumber}`);
    });
    return createElement('p', null);
  };

  control.instance = new FunctionComponent(Root, {}, container);
  control.instance.mount();
  assertEqual(calls, ['first 0', 'second 0', 'first 1', 'second 1']);
  control.instance.unmount();
});

test('useEffect : 뒤 Effect가 에러를 던져도 앞 Effect의 상태 변경은 화면에 반영된다', () => {
  const container = document.createElement('div');
  const Root = () => {
    const [value, setValue] = useState(0);

    useEffect(() => {
      setValue(1);
    }, []);
    useEffect(() => {
      if (value === 0) {
        throw new Error('Effect 실패');
      }
    });
    return createElement('p', null, String(value));
  };
  const instance = new FunctionComponent(Root, {}, container);

  assertThrows(() => instance.mount(), Error, 'Effect 실패');
  assertEqual(container.textContent, '1');
  instance.unmount();
});
