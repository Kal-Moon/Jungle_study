# Phase 2 — Phase 1 팀 병합 후 만든 것

- **바탕:** 팀이 Phase 1을 합친 **Develop 병합본**(팀 레포 커밋 `6b12786`) 위에 만들었다.
  그래서 Phase 1 코드(`vdom`·`diff`·`patch`, Phase 1 데모)는 **팀 병합본**이고, 내 Phase 1은 [../phase-1](../phase-1/)에 있다.
- **기간:** 2026-11-10
- **범위:** 팀 협약 `docs/미니리액트_Phase2.md` (함수형 컴포넌트, State, Hooks)
- **팀 레포 커밋:** Kal-Moon 브랜치 `05d063c` ~ `c382555` (구현 6개), `9d3d63e` ~ `76e9d30` (최적화 4개)
- 이 폴더는 병합본 위에서 고친 결과를 **실행할 수 있는 상태 그대로** 올린 것이다. 아래 표가 내가 만들거나 고친 파일이다.

## 내가 만들거나 고친 파일

| 구분 | 파일 |
|---|---|
| 코어 (새로 구현) | `src/core/component/createElement.js`, `FunctionComponent.js`, `hookContext.js`, `index.js` |
| Hook (새로 구현) | `src/core/hooks/useState.js`, `useEffect.js`, `useMemo.js`, `hookSlot.js`, `dependencies.js` |
| Phase 1 쪽 수정 | `src/core/vdom/isIgnoredNode.js`(`isIgnoredText`·`isIgnoredTag` 공개), `src/core/vdom/index.js`, `src/core/patch/index.js`(새 진입점), `src/core/diff/diff.js`(같은 객체 건너뛰기 한 줄, 최적화 1) |
| 데모 | `src/demos/phase_two/` 전체 (`app.js`, `todoState.js`, `components/` 5개, `styles.css`), `index.html`, `src/main.js` |
| 테스트 | `tests/core/component/`, `tests/core/hooks/`, `tests/core/diff/diff.test.js`(최적화 1), `tests/demos/phase_two/`, `tests/index.html`, `tests/stress/stress.js`(Phase 2 시나리오) |
| 문서 | `docs/implementation_notes.md`의 Phase 2 부분 |

그 밖의 파일은 팀 병합본 그대로다.

## 구현 관점

1. **협약 우선** — 시그니처, 에러 문구, `hooks` 칸 구조를 협약대로. DOM은 Phase 1의 `render`·`diff`·`applyPatches`로만 바꾼다.
2. **한 곳만 고치면 되게** — 공통 규칙과 종류별 처리를 표·함수 하나에 모았다.
3. **Phase 1 path 규칙과 맞추기** — `applyPatches`가 공백 텍스트·script·style을 건너뛰고 세므로 `createElement`도 처음부터 만들지 않는다.
4. **보안** — script·style 태그 차단, 할 일 글자는 텍스트 노드로만, localStorage 값은 형식 검사.

## 데모: 할 일 목록

입력·추가·완료 토글·삭제·필터·남은 개수·완료 항목 지우기·저장.

- 상태와 Hook은 루트 `TodoApp`에만 있고, 자식 컴포넌트 5개는 props만 받는 순수 함수다.
- `useMemo`: 필터 결과, 남은 개수, 이벤트 핸들러(한 번만 만들어 갱신마다 리스너를 다시 달지 않음)
- `useEffect`: localStorage 저장, 탭 제목에 남은 개수(cleanup으로 원래 제목 복구), Esc 키 리스너(cleanup으로 해제)
- 목록 항목 이벤트는 `ul` 하나에서 `data-action`·`data-todo-id`로 받는다(이벤트 위임).
- 입력하는 동안 입력창 노드가 교체되지 않아 포커스가 유지된다 (브라우저에서 한글 입력으로 확인).

## 기능별 분석과 수정 (관점: 쉽게 고칠 수 있는가 + 보안)

| 기능 | 문제 | 수정 |
|---|---|---|
| createElement | 새 자식 종류를 받으려면 두 곳 수정 / 직접 만든 script VNode가 자식으로 통과 | `CHILD_RULES` 표 하나로 / 자식 VNode 태그도 검사 |
| getHookSlot | 칸 종류(`kind`)를 Hook마다 두 번 적어 어긋나면 순서 에러 | `HOOK_KIND_BY_NAME` 표 한 줄로 (새 Hook 추가 시 한 줄) |
| FunctionComponent | 에러 문구가 흩어짐 / 렌더링 실패 뒤 화면이 상태보다 뒤처짐 / cleanup 에러 시 DOM이 남음 | `ERROR_TEXTS`로 모음 / `isViewStale`로 다시 맞춤 / 해제를 끝까지 마침 |
| useState·useEffect·useMemo | Hook 이름 문자열이 파일마다 3~4번 반복 | `HOOK_NAME` 상수 하나 |
| 데모 | 목록에 새 동작을 넣으려면 네 곳 수정 | `TODO_ACTIONS`, `LIST_ACTION_BY_NAME`(동작 → 이벤트 종류 + 갱신 함수) |

리뷰어(서브 에이전트) 검토로 찾아 고친 것: Effect 안에서 `unmount()`·`update()`를 부를 때 순서가 섞임, Effect 에러 시 미뤄 둔 갱신이 사라짐, 잘못된 태그 이름, props의 `children`이 DOM 속성으로 들어감.

## 극한 상황 결과 (시간 예산 5초, 브라우저)

| 시나리오 | 결과 |
|---|---|
| 루트에 `useState` 5만 개 + `useMemo` 5만 개 | 통과 (mount 31ms, 갱신 14ms) |
| `useEffect` 5만 개 의존성 변경 + 해제 | 통과 (수십 ms) |
| 상태 변경 함수 2만 번 연속 | 통과 (5.3초, 횟수에 비례) |
| 자식 컴포넌트 3,000겹 중첩 | 통과 (0.7초) |
| 자식 컴포넌트 10,000겹 중첩 | **재귀 스택 초과** → 한계로 문서화 (Phase 1 `render`·`diff`도 같은 한계) |
| 데모 할 일 2만 개 | 통과 (mount 0.8초, 토글 0.35초, 한 글자 입력 0.34초, 맨 앞 삭제 1.2초) |

측정 중 배운 것: 문서에 붙지 않은 체크박스는 `click()`해도 change 이벤트가 나지 않는다. 그래서 측정용 container를 화면 밖에 붙였다.

## 최적화 (관점: 저사양 PC에서도 한 번 갱신 16ms 안)

내 PC 브라우저에서 할 일 개수를 늘려 가며 재고, 하나 고칠 때마다 다시 쟀다. 협약 기본 규칙(즉시 `update()`, 인덱스 비교)은 그대로 두었다.

| # | 원인 | 고친 방법 | 결과 (할 일 1,000개 / 5,000개) |
|---|---|---|---|
| 1 | 입력창 글자만 바뀌어도 목록 전체를 다시 만들고 diff | 목록 VNode를 `useMemo([todos, filter])`로 다시 쓰고, `diff`는 이전과 같은 객체면 내려가지 않음 | 한 글자 입력 25ms → 약 3ms / 110ms → 약 20ms |
| 2 | `createElement`가 자식을 넣을 때마다 아래를 끝까지 다시 검사 (깊이에 대해 O(N²)) | 자기가 만든 VNode를 `WeakSet`으로 표시해 건너뜀 (직접 만든 VNode 객체는 그대로 끝까지 검사) | 3,000겹 생성 700ms → 14ms, 10,000겹도 스택 초과 없이 생성 |
| 3 | 토글 하나에 바뀌지 않은 999줄도 다시 만듦 | 할 일 객체를 열쇠로 항목 VNode를 `WeakMap`에 기억 (불변 갱신이라 그대로인 할 일은 같은 객체) | 토글 25ms → 8ms / 110ms → 37ms |

추가(제출)도 70ms → 17ms / 334ms → 79ms로 함께 줄었다.

- 배운 것 : "같은 객체면 같은 내용"이 성립하려면 VNode와 상태를 **고치지 않고 새로 만드는 것(불변)**이 전제다. 그래서 메모이제이션이 안전하다.
- 남은 비용 : 갱신마다 루트에서 VNode 형식을 끝까지 검사(협약의 입력 검사)해서 5,000개 입력은 아직 약 20ms.
- **차별점 후보로 미룸** : Batching(추가할 때 렌더링 2번), `key`(맨 앞 삭제 1,000개 79ms — 뒤 항목 전부 변경)

## 협약에 없어 내가 정한 것 (팀 확인용)

1. 컴포넌트 이름을 PascalCase(`TodoApp`)로 — 협약 14장 "대문자 시작 함수 금지"와 충돌, 6장 `RootComponent` 표기를 근거로
2. `createElement`가 빈 글자·공백만 있는 글자를 버림, script·style·잘못된 태그 이름·props·자식은 `TypeError`
3. 자식 컴포넌트가 받는 `children`은 정규화한 VNode 배열, 요소 props의 `children` 키는 뺌
4. `FunctionComponent`: container가 요소가 아니면 `TypeError`, 생명주기 에러 표(해제 뒤 mount·update, mount 전 unmount, 두 번 unmount)
5. Hook 개수가 줄면 `[FunctionComponent] Hook 호출 순서가 바뀌었습니다`, 늘면 `[훅이름] …`
6. 렌더링 중 상태 변경 → `Error`
7. Effect 안 상태 변경은 진행 중인 mount·update가 끝난 뒤 한 번 갱신 ("즉시 update"의 예외)
8. Effect 순서: 이전 cleanup 전부 → effect 전부 (Hook 순서). 의존성이 배열이 아니거나 async 콜백이면 `TypeError`
9. 렌더링 실패 뒤에는 같은 값으로 상태를 바꿔도 다시 그림 (상태 되돌리기는 미구현)
10. 해제 중 cleanup 에러가 여럿이면 첫 에러만 던짐
11. `hookContext` 이름: `setCurrentComponent` / `findCurrentComponent`
12. 보조 파일: `component/index.js`, `patch/index.js`, `hooks/hookSlot.js`, `hooks/dependencies.js`, `demos/phase_two/todoState.js`

## 알려진 한계

- `key` 미지원, Batching 없음, 상태 되돌리기 없음, 중첩 깊이 한계 — 자세한 내용은 `docs/implementation_notes.md`
- `npm test`(node --test)는 팀 병합본에서 원래 실패한다(테스트가 브라우저용). 브라우저 `tests/index.html` 기준 134개 통과.
