import { createElement, FunctionComponent, useState, useMemo } from '../../../src/core/index.js';
import { test, assertEqual, assertThrows, assertTrue } from '../../testRunner.js';

function mountWithValue(createRoot, initialValue) {
  const container = document.createElement('div');
  const control = { setValue: null };
  const Root = () => {
    const [value, setValue] = useState(initialValue);

    control.setValue = setValue;
    return createRoot(value);
  };
  const instance = new FunctionComponent(Root, {}, container);

  instance.mount();

  return { instance, container, setValue: (value) => control.setValue(value) };
}

test('useMemo : 최초 렌더링에서 계산하고, 의존성이 같으면 계산 함수를 다시 부르지 않는다', () => {
  let factoryCallCount = 0;
  const results = [];
  const mounted = mountWithValue(({ number, label }) => {
    const doubled = useMemo(() => {
      factoryCallCount += 1;
      return { value: number * 2 };
    }, [number]);

    results.push(doubled);
    return createElement('p', null, `${label} ${doubled.value}`);
  }, { number: 2, label: 'a' });

  mounted.setValue({ number: 2, label: 'b' });
  assertEqual(factoryCallCount, 1);
  assertTrue(results[0] === results[1], '같은 의존성인데 다른 결과 객체');
  assertEqual(mounted.container.textContent, 'b 4');
  mounted.instance.unmount();
});

test('useMemo : 의존성이 바뀌면 다시 계산한다', () => {
  let factoryCallCount = 0;
  const mounted = mountWithValue((number) => {
    const doubled = useMemo(() => {
      factoryCallCount += 1;
      return number * 2;
    }, [number]);

    return createElement('p', null, String(doubled));
  }, 1);

  mounted.setValue(5);
  assertEqual(factoryCallCount, 2);
  assertEqual(mounted.container.textContent, '10');
  mounted.instance.unmount();
});

test('useMemo : 의존성을 생략하면 렌더링마다 계산하고, 빈 배열이면 한 번만 계산한다', () => {
  const callCounts = { everyRender: 0, once: 0 };
  const mounted = mountWithValue((number) => {
    useMemo(() => {
      callCounts.everyRender += 1;
    });
    useMemo(() => {
      callCounts.once += 1;
    }, []);
    return createElement('p', null, String(number));
  }, 0);

  mounted.setValue(1);
  mounted.setValue(2);
  assertEqual(callCounts, { everyRender: 3, once: 1 });
  mounted.instance.unmount();
});

test('useMemo : 의존성 배열을 나중에 고쳐도 저장한 비교 기준은 바뀌지 않는다', () => {
  const sharedDependencies = ['a'];
  let factoryCallCount = 0;
  const mounted = mountWithValue((tick) => {
    useMemo(() => {
      factoryCallCount += 1;
    }, sharedDependencies);
    return createElement('p', null, String(tick));
  }, 0);

  sharedDependencies[0] = 'b';
  mounted.setValue(1);
  assertEqual(factoryCallCount, 2);
  mounted.instance.unmount();
});

test('useMemo : 계산 함수가 함수가 아니거나 의존성이 배열이 아니면 TypeError', () => {
  const tryRoot = (Root) => new FunctionComponent(Root, {}, document.createElement('div')).mount();

  assertThrows(() => tryRoot(() => {
    useMemo(3, []);
    return createElement('p', null);
  }), TypeError, '[useMemo] 계산 함수가 필요합니다');
  assertThrows(() => tryRoot(() => {
    useMemo(() => 1, { length: 0 });
    return createElement('p', null);
  }), TypeError, '[useMemo] 의존성은 배열이어야 합니다');
});

test('useMemo : 렌더링 밖에서 부르면 Error', () => {
  assertThrows(() => useMemo(() => 1, []), Error, '[useMemo] 루트 컴포넌트 렌더링 중에만');
});
