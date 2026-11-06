# Jungle Study — 목표와 진도 기록

정글 공부법(공부법 2)으로 정한 **목표와 진도만** 기록한다.
코드 구현, 연습 문제 풀이, 설명 본문 같은 학습 내용은 여기에 올리지 않는다.

## 지금 상태

| 항목 | 내용 |
|---|---|
| 진행 중인 주차 | **11~12주차 (11/6~11/19) AI 함께하기** — 미니 리액트·레디스·DBMS 구현 (구현은 Claude, 사용자는 설계 이해) |
| 진행 중인 메뉴 | **A. 미니 리액트 R0 큰 그림** — 1번 소제목부터 읽는 중 · (지난 주차) FS F0 큰 그림 — 원고 `menus/f0.md` 작성 완료, 1번 소제목부터 읽는 중 (VM V0~V4 완료) · (멈춤) P2 복습 P3 유저 포인터 검증, 구현 D' Donation 혼자 다시 구현, T5 MLFQS 1번 소제목 |
| 관심 키워드 | 없음 |
| 적용 중인 공부법 | 공부법 1 + 2 + 3 (11~12주차: 확인 문제 없음, 구현 항목마다 공부법 3 평가) |

## 새 대화에서 이어 하기

- 새 대화를 열고 "공부법 1, 2로 VM V2 이어 하자"처럼 말하면 된다. Claude는 이 README → 해당 주차 파일 → (있으면) 아티팩트의 그 메뉴 원고 순서로 읽는다.
- **VM·FS 개념 공부(11/3~)**: 새 대화에서 "공부법 1, 2로 VM V0 이어 하자"(메뉴만 바꿔서)라고 말하면 된다. Claude는 이 README → `week09-10-virtual-memory.md`(FS면 `project4-file-system.md`)의 「다음 위치」 → [VM·FS 개념 노트](https://claude.ai/artifact/6CnQXicJwAHkiFhGEvi1D8)의 `menus/guide.md`(진행 규칙) → `menus/<메뉴>.md`(설명 원고, 없으면 새로 써서 추가) → `refs/OS_review.pdf`(교수님 PPT, 그 메뉴 쪽만) 순서로 읽는다. PDF를 다시 올릴 필요 없다.
- 새 대화는 Code 탭 왼쪽 목록의 `JungleWeek9-10` 묶음에 넣어 모아 둔다.
- 공부 중에 나온 새 질문·채점 결과는 아티팩트 저장소에, 진도 숫자는 이 저장소에 남긴다.

## 준비 자료

- [VM·FS 개념 노트](https://claude.ai/artifact/6CnQXicJwAHkiFhGEvi1D8) (Claude 아티팩트, 비공개, 2026-11-03에 만듦) — VM·FS 진행 규칙(`menus/guide.md`), 메뉴별 설명 원고(`menus/v0.md`, `menus/v1.md` ~), 권영진 교수님 강의 PPT(`refs/OS_review.pdf`). 아래 Pintos 복습 노트는 Project 1·2 복습용.

- [Pintos 복습 노트](https://claude.ai/artifact/2thcCz6zE3UcY47im2n23T) (Claude 아티팩트, 비공개, 2026-10-22에 만듦) — 메뉴마다 자료 링크, 설명, 확인 문제, 예상 질문, 종합 문제, 나중에 볼 목록 후보.
- Claude가 공부를 시작할 때: 이 아티팩트에서 해당 메뉴 원고만 `path`로 읽는다 — `menus/t0.md` ~ `menus/t5.md`, `menus/p0.md` ~ `menus/p7.md`, 사용법 `menus/guide.md`, 약점 지도 `menus/weak.md`, 최종 점검 퀴즈 `menus/final.md`.
- 학습 내용 자체라서 이 저장소에는 올리지 않고 링크만 남긴다.

### 새 질문은 준비 문제와 섞는다 (2026-10-23 결정)

공부하는 날 새로 나온 질문도 문제로 만들어, 미리 준비한 문제와 섞어서 낸다. 문제 내용은 아티팩트의 공유 저장소(`ArtifactData`)에 둔다.

1. 시작할 때: 저장소 `inbox`에서 그 메뉴의 `대기` 질문을 읽어 먼저 답하고, 문제로 만든다.
2. 공부 중: 새 질문에 답한 뒤 낸 확인 문제를 `questions`에 추가한다(객관식 ①~④ + ⑤ 모르겠다, 정답 개수 숨김).
3. 채점 결과는 `attempts`에 남긴다(`mode: 공부 중`).
4. 메뉴 끝 종합: 준비한 종합 1 + 그날 추가된 문제 2~3 + 전에 틀린 문제 1을 섞는다. 다음 날 몸풀기와 11/5 최종 점검도 섞는다.
5. 이 저장소의 진도에는 결과 숫자만 적는다(예: "종합 4문항 중 3 맞음, 당일 질문 2개 추가").
6. 문서 형식과 섞는 비율은 아티팩트 `menus/guide.md`의 「새 질문과 섞어 풀기」를 따른다. 준비 문제 목록은 아티팩트의 `bank.json`.

## 주차별 기록

9~10주차(2026-10-23 ~ 11-05)는 7·8주차(Project 1·2)를 복습하는 기간이다.
Project 2의 `wait`/`exit`가 Project 1의 세마포어 위에서 동작하므로 Threads를 먼저 한다.
두 카테고리 모두 메뉴를 빠짐없이 순서대로 진행한다.

2026-11-03: 남은 3일(11/3~11/5 저녁 전)은 원래 과제였던 Project 3 VM과 Project 4 FS를 **개념만** 공부하기로 바꿨다. P2 복습은 그동안 멈춘다.

| 주차 | 주제 | 진행 기간 | 파일 | 상태 |
|---|---|---|---|---|
| Week 7 | Project 1: Threads (복습) | 9주차 10/23(금) ~ 10/29(목) | [week07-threads.md](week07-threads.md) | 멈춤 (T0~T4 완료, T5·구현 D' 멈춤) |
| Week 8 | Project 2: User Programs (복습) | 10주차 10/30(금) ~ 11/05(목) | [week08-user-programs.md](week08-user-programs.md) | 멈춤 (P0~P2 완료, P3부터. 11/3 VM·FS 개념 공부로 전환) |
| Week 9~10 | Project 3: Virtual Memory (개념) | 11/3(화) ~ 11/4(수) | [week09-10-virtual-memory.md](week09-10-virtual-memory.md) | ✅ 완료 (V0~V4) |
| (추가) | Project 4: File System (개념) | 11/5(목) 저녁 전 | [project4-file-system.md](project4-file-system.md) | 진행 중 (F0) |
| Week 11~12 | AI 함께하기: 미니 리액트 · 미니 레디스 · 미니 DBMS (팀 구현) | 11/6(금) ~ 11/19(목) | [week11-12-ai-together.md](week11-12-ai-together.md) | 진행 중 (A. 미니 리액트 R0) |
