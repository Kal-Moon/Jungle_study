# Phase 1 — 팀 병합 전 내 구현

- **바탕:** 팀 Develop 병합 **전**, 내 브랜치(`backup/Kal-Moon-before-develop`, 마지막 커밋 `2ff5445`)의 코드 그대로다.
- **기간:** 2026-11-07 ~ 11-09
- **범위:** Phase 1 (Virtual DOM 변환, Diff, Patch, 상태 이력). 팀 협약 문서 `docs/미니리액트_Phase1.md`를 따른다.
- `src/core/component/`, `src/core/hooks/`, `src/demos/phase_two/`는 팀이 정한 **Phase 2 빈 틀**(TODO만 있음)이다.
  `src/core/index.js`가 이 파일들을 불러오므로 실행되도록 함께 두었다. Phase 2 구현은 [../phase-2](../phase-2/)에 있다.

## 한 일

| 날짜 | 커밋 | 내용 |
|---|---|---|
| 11-07 | `ab6a6f9`, `c443bd1` | Phase 1 단위 테스트, 구현 안내(`docs/implementation_notes.md`) |
| 11-09 | `f560e33` | `domToVNode`의 무시·변환 규칙을 표로 정리 |
| 11-09 | `053431a` | Phase 1 규칙을 표로 모으고 문자열 이벤트 속성(`onclick="..."`) 차단 |
| 11-09 | `719ef1b` | 극한 규모 테스트 추가 (`tests/stress/`) |
| 11-09 | `4ce4573`, `56340db` | `applyPatches`가 같은 부모의 형제 목록을 다시 세지 않게 개선, `VisibleChildren`으로 분리 |
| 11-09 | `8ad679d`, `2ff5445` | `diff` 내부 함수 인자 통일, 데모 이력 이동 단순화 |

## 기능별 분석 (관점: 쉽게 고칠 수 있는가 + 보안)

기능 7개(domToVNode, render, props, diff, applyPatches, StateHistory, 데모)를 하나씩 보고 고쳤다.

- 종류별로 다른 처리를 `Map` 표로 모았다. 새 종류는 표에 한 줄을 추가한다.
  예: `IGNORE_RULE_BY_NODE_TYPE`, `CONVERTER_BY_NODE_TYPE`, `RENDERER_BY_VNODE_TYPE`,
  `SAME_TYPE_DIFFER_BY_VNODE_TYPE`, `PATCH_APPLIER_BY_TYPE`, `PROPERTY_SYNCER_BY_KEY`, `BUTTON_ACTIONS`
- 공백·script·style을 무시하는 기준을 `isIgnoredNode.js` 한 곳에 두어 `domToVNode`와 `applyPatches`가 같이 쓴다.
- **보안:** `on`으로 시작하는 키에 문자열이 오면 `TypeError` (문자열 이벤트 속성은 브라우저가 코드로 실행하므로).
  텍스트는 `createTextNode`로만 넣는다. 에러 메시지는 `textContent`로 보여 준다.
- 협약 때문에 막지 못한 것: `script` 태그 VNode를 `render`하면 실행되는 script가 생긴다, `href="javascript:…"`.

## 극한 상황 결과 (시간 예산 5초)

| 시나리오 | 결과 | 처리 |
|---|---|---|
| 중첩 깊이 | 약 2,500~5,000겹에서 재귀 스택 초과 (`diff`·`render`·`domToVNode`) | 한계로 문서화 |
| 같은 부모 아래 patch N개 | 5,000개에 약 14초 (O(N²)) | **고침** → 29ms (부모별 형제 목록 캐시) |
| `StateHistory` push N개 | 5만 개에 7.5초 (O(N²)) | 그대로 둠 |

## 협약에 없어 내가 정한 것 (팀 확인용)

1. "공백"은 HTML 소스 공백만, `&nbsp;`는 내용으로 남김
2. `on*` 키(대소문자 무관)에 함수가 아닌 값 → `TypeError` (협약 6.3을 8.4보다 우선)
3. 이벤트를 지울 때 문자열 이벤트 속성도 `removeAttribute`
4. `applyPatches`: 음수·정수 아닌 index/path → `RangeError`, `null` Patch → `TypeError`
5. `StateHistory`: VNode 검사를 `diff`와 같은 `isVNode`로, 내부 필드는 `#비공개`
6. 데모: 이력 이동 중 반영 실패 시 이력 위치를 되돌림
7. 보조 파일 `src/core/vdom/isVNode.js`, 극한 테스트 `tests/stress/`
