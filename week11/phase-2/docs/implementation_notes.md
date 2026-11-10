# 구현 안내

> Phase 1 문서 13.1, Phase 2 문서 15.1 기준으로 채운다.

## Diff와 Patch의 동작 방식

- `diff`(`src/core/diff/diff.js`)는 루트부터 재귀로 내려가며 노드 하나씩 비교한다.
    - 타입이나 `tag`가 다르면 `REPLACE` 하나만 만들고 그 아래는 보지 않는다.
    - 텍스트끼리는 `text`가 다를 때 `UPDATE_TEXT`를 만든다.
    - 같은 `tag`의 요소는 props를 `Object.is`로 비교해 `set`(추가·변경)과 `remove`(삭제)를 모은
      `UPDATE_PROPS`를 만들고, 자식을 같은 인덱스끼리 비교한다.
    - 자식이 늘면 `INSERT`(index 오름차순), 줄면 `REMOVE`(index 내림차순)를 만든다.
- `applyPatches`(`src/core/patch/applyPatches.js`)는 Patch를 앞에서부터 하나씩 적용한다.
    - `path`는 루트의 `childNodes`를 따라가되, `domToVNode`가 무시하는 노드(주석, 공백 텍스트,
      `script`, `style`)는 건너뛰고 센다. 기준은 `src/core/vdom/isIgnoredNode.js` 하나로 둘이 공유한다.
    - 루트가 `REPLACE`되면 새 루트를 반환한다.
    - 부모별 "보이는 자식 목록"(무시하는 노드를 뺀 자식)은 한 번 센 뒤 기억해 두고, DOM을 바꿀 때 같은 이름의
      메서드로 함께 고친다(`src/core/patch/VisibleChildren.js`의 `VisibleChildren` 클래스). 같은 부모 아래 Patch가
      많아도 O(N²)이 되지 않는다.
    - 적용 전에 모든 Patch의 종류(알 수 없는 `type`이면 `TypeError`)와 형태(`path`가 배열인지, `INSERT`에 정수
      `index`와 VNode `node`가 있는지 등, 틀리면 `TypeError`)를 먼저 확인한다. 그래서 이 에러에서는 DOM이 그대로다.
      경로·index 범위 에러(`RangeError`)는 적용하다가 만나므로 앞선 Patch는 이미 적용된 상태다.
    - `<select>`의 `value`는 그 값의 `<option>`이 있어야 먹히므로, Patch 목록에서 option이 뒤에 `INSERT`되어도
      모든 Patch를 적용한 뒤 마지막 `value`를 한 번 더 맞춘다. `render`도 자식을 붙인 뒤 `value`, `checked`를
      다시 맞춘다(`restoreCurrentProps`).
- 속성·이벤트를 넣고 빼는 규칙은 `src/core/vdom/props.js`의 `setProp`, `removeProp`에 모아
  `render`와 `applyPatches`가 같이 쓴다.

## Hook 값이 유지되는 방식

- `FunctionComponent` 인스턴스의 `hooks` 배열에 Hook 하나당 칸 하나를 둔다. 렌더링을 시작할 때 `hookIndex`를
  0으로 되돌리고, Hook이 불릴 때마다 한 칸씩 옮긴다. 그래서 호출 순서가 같으면 같은 칸을 다시 찾는다.
    - state : `{ kind: 'state', value, setState }` — `setState`를 칸에 저장해 렌더링마다 같은 함수를 돌려준다.
    - effect : `{ kind: 'effect', dependencies, cleanup }`
    - memo : `{ kind: 'memo', dependencies, value }`
- 세 Hook은 모두 `src/core/hooks/hookSlot.js`의 `getHookSlot`으로 칸을 찾는다. Hook 공통 규칙(7장)은 이 함수
  하나에 있다.
    - 렌더링 중인 컴포넌트가 없으면(렌더링 밖, 자식 컴포넌트 안) `[훅이름] 루트 컴포넌트 렌더링 중에만 호출할 수 있습니다`
    - 칸이 새로 생기는 것은 최초 렌더링(`currentVNode`가 없을 때)뿐이다. 그 뒤에 칸이 없거나 종류가 다르면
      `[훅이름] Hook 호출 순서가 바뀌었습니다`
    - 이전보다 Hook을 적게 부르면 렌더링이 끝난 뒤 `[FunctionComponent] Hook 호출 순서가 바뀌었습니다`
- 렌더링 중인 컴포넌트는 `src/core/component/hookContext.js`의 모듈 변수 하나에 둔다.
  `createElement`는 자식 컴포넌트를 부르는 동안 이 값을 `null`로 바꿨다가 되돌린다.
- 의존성 비교(`isDepsChanged`)는 `src/core/hooks/dependencies.js` 한 곳에 있다. 어느 쪽이든 생략이면 바뀐 것,
  길이가 다르거나 `Object.is`가 하나라도 `false`면 바뀐 것이다. 저장할 때는 배열을 복사한다.

## 지원하는 DOM·속성·이벤트 범위

- 노드 : 요소, 텍스트. 주석·공백 텍스트·`script`·`style`은 무시한다.
    - "공백"은 HTML 소스 공백(스페이스, 탭, 줄바꿈, CR, FF)만 뜻한다. `&nbsp;`만 있는 텍스트는
      사용자가 친 띄어쓰기이므로 남긴다. (협약 6.2가 공백 범위를 정하지 않아 정한 해석, 팀 확인 필요)
- 속성 값 : 문자열, 불리언(`true`는 빈 문자열 속성, `false`·`null`·`undefined`는 제거), 함수(이벤트).
  그 밖의 값은 `TypeError`.
- `value`, `checked`는 속성과 함께 DOM 프로퍼티도 맞춘다.
- `style`은 문자열만 지원한다.
- 이벤트 : `onClick`처럼 `on` + 이벤트 이름. 이전 핸들러를 DOM의 `handlers` 객체에 기억해 두고,
  바뀌면 이전 것을 `removeEventListener`로 뺀 뒤 새로 단다.
    - `on`으로 시작하는 키(대소문자 무관)에 함수가 아닌 값(문자열 등)이 오면 `TypeError`.
      문자열 `onclick="..."`을 속성으로 넣으면 브라우저가 코드로 실행하기 때문이다.
      (협약 6.3 "이벤트 값은 함수"를 8.4 "문자열이면 setAttribute"보다 우선한 해석, 팀 확인 필요)
    - 그래서 `onclick="..."` 속성이 있는 DOM을 `domToVNode`로 읽어 `render`·`applyPatches`에 넘기면
      왕복 변환이 되지 않고 `TypeError`가 난다. (의도한 동작)
    - 이벤트 키에 `null`·`false`·`undefined`가 오면 리스너를 뺀다. 이벤트를 지울 때는 HTML로
      직접 들어 있던 문자열 이벤트 속성도 함께 지운다.
- `domToVNode`는 속성 값을 문자열 그대로 읽는다. 값이 없는 속성(`disabled`, `checked`)은 `''`이다.

## 규칙을 바꿀 때 고칠 곳

종류별로 다르게 처리하는 부분은 모두 `Map` 표로 모았다. 새 종류는 표에 한 줄을 추가하면 된다.
일반 객체 대신 `Map`을 쓰는 이유는 `'toString'`, `'constructor'` 같은 기본 객체 이름을 표에 있는
것으로 착각하지 않게 하기 위해서다.

| 바꾸고 싶은 것 | 파일 | 고칠 곳 |
|---|---|---|
| 무시할 태그 | `vdom/isIgnoredNode.js` | `IGNORED_TAGS` |
| 공백 텍스트 기준 | `vdom/isIgnoredNode.js` | `WHITESPACE_ONLY_PATTERN` |
| 노드 종류별 무시 여부 | `vdom/isIgnoredNode.js` | `IGNORE_RULE_BY_NODE_TYPE` |
| DOM 노드 종류별 VNode 변환 | `vdom/domToVNode.js` | `CONVERTER_BY_NODE_TYPE` |
| VNode 형식 검사 (diff, StateHistory, applyPatches 공용, 자식까지 확인) | `vdom/isVNode.js` | `SHAPE_CHECKER_BY_VNODE_TYPE` |
| VNode 종류별 DOM 생성 | `vdom/render.js` | `RENDERER_BY_VNODE_TYPE` |
| 이벤트로 볼 키 | `vdom/props.js` | `EVENT_PREFIX` |
| 프로퍼티까지 맞출 속성 (`value`, `checked`) | `vdom/props.js` | `PROPERTY_SYNCER_BY_KEY` |
| VNode 종류별 비교 | `diff/diff.js` | `SAME_TYPE_DIFFER_BY_VNODE_TYPE` |
| Patch 종류별 적용 | `patch/applyPatches.js` | `PATCH_APPLIER_BY_TYPE` |
| Patch 종류별 필수 값 검사 | `patch/applyPatches.js` | `SHAPE_CHECKER_BY_PATCH_TYPE` |
| 화면 요소의 id·data-action | `demos/phase_one/app.js` | `PAGE_SELECTORS` |
| 버튼과 동작 연결 | `demos/phase_one/app.js` | `BUTTON_ACTIONS` |
| 생명주기별로 막을 호출과 에러 문구 | `component/FunctionComponent.js` | `LIFECYCLE_ERROR_BY_ACTION` |
| 자식 값 종류별 처리 (`createElement`) | `component/createElement.js` | `CHILD_NORMALIZER_BY_KIND` |
| Hook 공통 규칙 (문맥·순서 검사) | `hooks/hookSlot.js` | `getHookSlot` |
| Hook 이름별 칸 종류 (새 Hook 추가) | `hooks/hookSlot.js` | `HOOK_KIND_BY_NAME` |
| 의존성 비교 기준 | `hooks/dependencies.js` | `isDepsChanged` |
| 할 일 필터 종류 | `demos/phase_two/todoState.js` | `FILTER_RULE_BY_NAME` |
| 목록 안 동작(토글·삭제)과 이벤트 종류 | `demos/phase_two/app.js` | `LIST_ACTION_BY_NAME` |
| 데모의 data-action 값 | `demos/phase_two/todoState.js` | `TODO_ACTIONS` |

- Patch 종류를 새로 만들면 `PATCH_APPLIER_BY_TYPE`과 `SHAPE_CHECKER_BY_PATCH_TYPE` 표에 함께 추가한다.
- VNode 종류를 새로 만들면 `isVNode`, `render`, `diff`의 표에 함께 추가한다. 무시하지 않는 DOM 노드
  종류를 늘리면 `isIgnoredNode`와 `domToVNode`의 표에 함께 추가한다. 하나를 빠뜨리면 조용히 넘어가지
  않고 에러가 난다.

## 렌더링 시점과 Batching 지원 여부

- Phase 1 : Patch 버튼을 누를 때만 diff와 반영이 일어난다. Batching은 없다.
- Phase 2 : Batching은 없다. 상태 변경 함수를 부르면 그 자리에서 바로 `update()`한다.
  (그래서 테스트는 기다리지 않고 바로 DOM을 확인하면 된다)
    - 예외 하나 : mount·update가 진행 중일 때(Effect 안에서 상태를 바꾼 경우) 들어온 요청은 모아 두었다가
      그 과정이 끝난 뒤 `update()`를 한 번 한다. 바로 하면 아직 실행하지 않은 Effect가 이전 렌더링 기준으로 돌기
      때문이다. (`FunctionComponent.requestUpdate`) 도중에 에러가 나도 모아 둔 갱신은 처리한다.
    - Effect 실행 순서 : DOM 반영 뒤, 다시 실행할 Effect들의 이전 cleanup을 Hook 순서대로 모두 부르고, 그다음
      Effect를 Hook 순서대로 부른다. `unmount()`는 남은 cleanup을 Hook 순서대로 부른다.
- 1회 갱신 흐름 : 상태 변경 함수 → `requestUpdate` → `update` → 루트 컴포넌트 실행 → `diff` → `applyPatches`
  → `pendingEffects` 실행

## 알려진 제한

- 자식은 인덱스로만 비교하므로 중간 자식을 지우면 뒤 자식들이 전부 변경으로 보인다. (`key` 미지원)
- 테스트 영역(`contenteditable`)에서는 속성을 직접 편집할 수 없다. checkbox를 클릭해도
  속성이 아니라 프로퍼티만 바뀌므로 Patch에 반영되지 않는다.
- 테스트 영역의 가장 바깥 노드를 지우면 비교할 루트가 없어 에러를 보여준다.
- 테스트 영역 최상위에 노드를 여러 개 만들면 첫 노드만 비교한다.
- 이력 이동 중 실제 영역 반영이 실패하면 이력 위치는 되돌리지만, 실패 전에 적용된 Patch는 되돌리지 않는다.
  Patch 버튼도 같아서, 중간에 실패하면 실제 영역이 일부만 바뀐 채 이력에는 저장되지 않는다.
  이 상태에서 다음 diff는 실제 DOM과 다른 VNode를 기준으로 계산되므로, 에러가 나면 새로고침해야 한다.
- 속성 이름이 `__proto__`이면 일반 객체인 `props`에 들어가지 않아 조용히 빠진다.
- (Phase 2) `key`가 없어 목록 중간 항목을 지우면 뒤 항목들은 노드를 그대로 두고 글자·속성만 바뀐다.
- (Phase 2) Effect 안에서 매번 다른 값으로 상태를 바꾸면 끝없이 다시 렌더링된다. 횟수 제한은 두지 않았다.
- (Phase 2) `update()` 중 `applyPatches`가 실패하면 DOM이 일부만 바뀐 채 `currentVNode`는 이전 값으로 남는다.
  Phase 1과 같은 제한이다.
- (Phase 2) 상태 변경 뒤 렌더링이 에러를 던지면 상태는 새 값으로 남고 화면은 이전 그대로다. (되돌리기 미구현)
  대신 `isViewStale`이 켜져, 같은 값으로 다시 바꿔도 다시 그려 화면을 맞춘다.
- (Phase 2) Effect 안에서 `unmount()`하면 남은 Effect는 실행하지 않는다. Effect 안에서 `update()`를 직접 부르면
  상태 변경과 같이 진행 중인 과정이 끝난 뒤 한 번 갱신한다.
- (Phase 2) 자식 컴포넌트를 약 3,000겹 넘게 중첩하면(10,000겹에서 확인) 재귀 호출 스택을 넘어 `RangeError`가 난다.
  `createElement`가 자식 컴포넌트를 바로 부르고, Phase 1의 `render`·`diff`도 재귀라 같은 한계를 가진다.
  극한 테스트(`tests/stress/`)의 `[Phase 2]` 시나리오로 확인한다.
- (Phase 2) `unmount()` 중 cleanup이 에러를 던져도 나머지 cleanup과 DOM 해제를 마치고 처음 에러만 던진다.
  두 번째 이후 에러는 버려진다. 갱신 중(의존성 변경) cleanup이 에러를 던지면 뒤의 cleanup·Effect는 불리지 않는다.

## 보안

- 막은 것
    - 문자열 이벤트 속성(`onerror="..."` 등) : `props.js`에서 `TypeError`. 데모에서는 에러 메시지로 보이고
      실제 영역에는 반영되지 않는다.
    - `script`, `style` : `domToVNode`가 버리므로 테스트 영역에서 실제 영역으로 넘어가지 않는다.
    - 텍스트 : `createTextNode`로 만들어 HTML로 해석되지 않는다. `innerHTML`은 코드에 적은 `SAMPLE_HTML`에만 쓴다.
    - 에러 메시지는 `textContent`로 보여 준다.
    - (Phase 2) `createElement('script' | 'style', …)` : `TypeError`. 실행되는 script를 막고, `applyPatches`가
      이 태그를 건너뛰고 세서 path가 어긋나는 것도 막는다.
    - (Phase 2) 할 일 글자는 텍스트 노드로만 들어간다. localStorage에서 읽은 값은 형식(id, text, isDone, 길이)을
      검사하고 틀린 항목은 버린다.
- 막지 못한 것 (협약과 부딪혀 코드로 막지 않음)
    - `render`에 `tag`가 `script`인 VNode를 직접 넘기면 실행되는 `<script>`가 만들어진다. `createElement`를
      거치면 막히지만, 손으로 만든 VNode 객체는 막지 않는다. 막으려면 7.2 에러 조건을 바꿔야 한다.
    - `href="javascript:…"` 같은 URL 속성은 8.4 "문자열이면 setAttribute"대로 그대로 들어간다.
    - 테스트 영역은 살아 있는 DOM이라, 브라우저가 붙여넣기에서 걸러 내지 못한 이벤트 속성은 테스트 영역
      안에서 바로 실행될 수 있다. (실제 영역으로는 넘어가지 않는다)

## 추가 구현 요소

- 협약 7장 표에 없지만 `core/index.js`에서 공개하는 보조 함수
    - `isIgnoredNode(domNode)` : 데모가 비교할 루트를 찾을 때 쓴다.
    - `isVNode(value)` (`src/core/vdom/isVNode.js`) : VNode 형식 검사. 자식까지 끝까지 확인한다.
      `diff`, `StateHistory`, `applyPatches`가 같이 쓴다.
    - `cloneVNode(vnode)` (`src/core/vdom/cloneVNode.js`) : VNode 깊은 복사. 지금 core 안에서는 쓰지 않는다.
      Phase 2에서 이전 VNode를 보관할 때 쓰려고 두었다. (협약 4장 "미리 만든 보조 파일 금지"와 부딪히면 지운다)

- Phase 2 (협약 5장 표에 없는 이름)
    - `FunctionComponent.requestUpdate()` : 상태 변경 함수가 부르는 갱신 요청. 해제 뒤면 무시, 진행 중이면 모아 둔다.
    - `FunctionComponent.isMounted`, `isFirstRender`, `isRendering` : Hook이 생명주기를 확인할 때 쓴다.
    - `setCurrentComponent`, `findCurrentComponent` (`hookContext.js`) : 이름은 8장 예시를 따르되,
      없을 수 있는 값이라 3.4 규칙대로 `get` 대신 `find`를 썼다.
    - `getHookSlot`, `HOOK_KIND_BY_NAME` (`hooks/hookSlot.js`), `isDepsChanged`, `assertDependencies`,
      `copyDependencies` (`hooks/dependencies.js`)
    - `isIgnoredText`, `isIgnoredTag` (`vdom/isIgnoredNode.js`) : `createElement`가 `domToVNode`·`applyPatches`와
      같은 기준으로 공백 텍스트와 script·style을 거르도록 기존 기준을 꺼내 공개했다.
    - `component/index.js`, `patch/index.js` : 다른 폴더에서 불러올 진입점 (3.5)
- Phase 2 데모 : 할 일 목록 (입력·추가·완료 토글·삭제·필터·남은 개수·완료 항목 지우기·저장)
    - 루트 `TodoApp`(`demos/phase_two/app.js`)만 상태와 Hook을 가진다. 자식(`components/`)은 props만 받는다.
    - `useMemo` : 목록 VNode(필터 적용 포함), 남은 개수, 이벤트 핸들러. 핸들러를 한 번만 만들어 갱신마다
      리스너를 다시 달지 않는다.
    - `useEffect` : localStorage 저장, 탭 제목에 남은 개수 표시(cleanup으로 원래 제목 복구),
      Esc 키 리스너(cleanup으로 해제)
    - 목록 항목의 클릭·체크는 `ul` 하나에서 `data-action`, `data-todo-id`로 받는다(이벤트 위임).
      항목이 늘어도 리스너가 늘지 않는다.
    - 상태를 바꾸는 순수 함수는 `demos/phase_two/todoState.js`에 모았다. 필터를 늘리려면
      `FILTERS`와 `FILTER_RULE_BY_NAME`에 한 줄씩 추가한다.

## 최적화 (Phase 2)

저사양 PC에서도 끊기지 않게(한 번 갱신 16ms 안) 할 일 목록 데모를 브라우저에서 재고 고쳤다.
협약 기본 규칙(즉시 `update()`, 인덱스 비교)은 그대로 두었다.

| 무엇을 | 어떻게 | 효과 (할 일 1,000개 / 5,000개) |
|---|---|---|
| 입력창 글자만 바뀌어도 목록 전체를 다시 만들고 비교 | 목록 VNode를 `useMemo([todos, filter])`로 다시 쓰고, `diff`는 이전과 같은 객체면 아래로 내려가지 않는다 | 한 글자 입력 25ms → 약 3ms / 110ms → 약 20ms |
| `createElement`가 자식을 넣을 때마다 아래를 끝까지 다시 검사 (깊이에 대해 O(N²)) | 자기가 만든 요소 VNode를 `WeakSet`으로 표시해 다시 검사하지 않는다. 직접 만든 VNode 객체는 지금처럼 끝까지 검사한다 | 3,000겹 생성 700ms → 14ms |
| 토글 하나에 바뀌지 않은 항목까지 다시 만듦 | `TodoList`가 할 일 객체를 열쇠로 항목 VNode를 `WeakMap`에 기억한다 (`todoState`는 바뀐 할 일만 새 객체로 만든다) | 토글 25ms → 8ms / 110ms → 37ms |

- 지킬 것 : VNode는 만든 뒤 고치지 않는다. 같은 객체를 다시 쓰므로 고치면 `diff`가 변경을 놓친다.
  할 일도 `todoState.js`의 함수처럼 새 객체로 바꿔야 한다.
- 남은 비용 : 갱신마다 루트에서 VNode 형식을 끝까지 검사한다(`FunctionComponent`의 루트 검사, `diff` 입력 검사).
  5,000개에서 한 글자 입력이 아직 약 20ms인 이유다. 협약의 입력 검사라 그대로 두었다.
- 차별점 후보로 미룬 것 : Batching(추가할 때 렌더링 2번), `key`(맨 앞 삭제 시 뒤 항목 전부 변경)

## 핵심 로직을 설명할 때 참고할 파일

- `src/core/vdom/domToVNode.js`, `src/core/vdom/render.js`, `src/core/vdom/props.js`
- `src/core/diff/diff.js`, `src/core/patch/applyPatches.js`
- `src/demos/phase_one/StateHistory.js`, `src/demos/phase_one/app.js`
- `src/core/component/FunctionComponent.js`, `src/core/component/createElement.js`
- `src/core/hooks/hookSlot.js`, `src/core/hooks/useState.js`, `src/core/hooks/useEffect.js`, `src/core/hooks/useMemo.js`
- `src/demos/phase_two/app.js`
- 테스트 : 로컬 서버를 띄우고 `/tests/index.html`을 연다.
