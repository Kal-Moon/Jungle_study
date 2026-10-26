# Week 7 — Project 1: Threads (복습)

## 배경

- 2026-10-22: 9~10주차 2주를 7·8주차 복습 기간으로 정하고, Threads를 먼저 하기로 함.
- 기간: **9주차 2026-10-23(금) ~ 10-29(목)**

## 1. 자료 (공부법 2 — 1번)

- KAIST PintOS Project 1 명세: https://casys-kaist.github.io/pintos-kaist/project1/introduction.html
- 권영진 교수님 Pintos Lab slides (Pintos_1~4.pdf) — 정글 LMS 링크
- 팀 정리 문서 (`Kal-Moon/Jungle_Pintos` 저장소)
  - `week7/Priority-Scheduling-Behaviors.md` — 우선순위 스케줄링에서 바뀌어야 할 동작
  - `week7/study-notes/semaphore-restaurant.md` — 맛집 비유로 본 세마포어
  - `week7/week7_issues_complete.csv` — 테스트별 이슈 목록
- 7주차 팀 코드: `pinn99k/jungle_pintos` `dev` @ `61fac76` (Alarm, 우선순위, donation 체인. MLFQS 구현 없음)
- 준비 자료: [Pintos 복습 노트](https://claude.ai/artifact/2thcCz6zE3UcY47im2n23T) 메뉴 T0~T5 (`menus/t0.md` ~ `menus/t5.md`). 다시 묻기 #7~#18이 어느 확인 문제로 이어지는지는 `menus/weak.md`.

### 자료 분석: 교육 기관이 원하는 것

- 커널 스레드의 생성·스케줄링·동기화를 직접 구현한다.
- race condition을 막는 semaphore·lock·condition variable의 의미를 체득한다.
- MLFQS로 스케줄러 설계 원리를 이해한다.
- AI나 코드 자동 생성에 기대지 않고 직접 구현·디버깅·검증하는 힘을 기른다.
- 키워드: threads, synchronization, priority scheduling, priority inversion, MLFQS
- 통과 기준: Project 1 테스트 27개 (alarm 6 · priority 12 · mlfqs 9). 옵션 없이 전부 필수.

## 2. 목표 (공부법 2 — 2번)

**카테고리**: Project 1: Threads (1개)

- 메뉴를 빠짐없이 위에서부터 순서대로 진행한다. 하루 단위 목표는 따로 정하지 않는다.
- 참고 속도: 메뉴 6개 / 7일. T4(Donation)·T5(MLFQS)가 가장 무겁다.
- T5(MLFQS)는 팀 코드에 구현이 없고 노트에도 기록이 없다 → 복습이 아니라 처음 배우는 속도로 잡는다.

| # | 메뉴 | 관련 테스트 | 상태 |
|---|---|---|---|
| T0 | 큰 그림: 스레드 구조와 상태, `schedule()`·문맥 전환, 인터럽트 끄기 | — | ✅ 완료 (10/26) |
| T1 | Alarm Clock: busy waiting → 재우고 깨우기 | `alarm-*` 6개 | ✅ 완료 (10/26) |
| T2 | 동기화: race condition, semaphore / lock / condition variable | (T3·T4의 바탕) | 🔄 진행 중 (10/26 시작) |
| T3 | 우선순위 스케줄링: 고르는 순서, 선점, 깨우는 순서 | `priority-fifo`, `-preempt`, `-change`, `-sema`, `-condvar`, `alarm-priority` | ⬜ |
| T4 | Priority Donation: 우선순위 역전, 여러 기부, 연쇄 기부, 복원 | `priority-donate-*` 7개 | ⬜ |
| T5 | MLFQS: nice, recent_cpu, load_avg, 고정소수점 | `mlfqs-*` 9개 | ⬜ |

## 3. 진도

### 2026-10-26
- T0 (큰 그림) 시작. 소제목 요약을 먼저 읽고 질문 6개(1·2·4·5·7번 소제목) → 답변.
- 설명 1~7번 소제목 끝까지 읽음. 소제목별 확인 문제: 14회 채점 중 맞음 6 · 절반 6 · 틀림 2(다시 낸 문제 포함) (당일 질문으로 만든 문제 12개 추가).
  - 다시 틀린 패턴: time slice 끝을 BLOCKED로 답함(다시 묻기 #8), BLOCKED 스레드가 스스로 깨어날 수 있다고 답함 → 재설명 후 정답.
- 종합(4문항): 맞음 2 · 절반 1 · 틀림 1. 서술형(스레드 A의 상태 흐름)에서 "READY → BLOCKED"와 "함수가 끝난 뒤 = RUNNING"으로 답함 → 재설명 후 다시 풀기.
- 요청: 함수 이름보다 **개념 먼저** 설명하고 묻기.
- 서술형 다시 풀기: 상태 전환은 모두 맞음. "있는 곳"을 상태 이름으로 답함 → 재설명 후 확인 문제 정답. 해제 시점: 1회 오답(Project 2 `wait`의 부모·자식과 섞음) → 재설명 후 정답.
- **T0 완료 (2026-10-26).**
- **다음에 이어 할 위치: T1 Alarm Clock 시작.**
- T1 (Alarm Clock) 시작. inbox 대기 질문 없음. 설명 1~6번 끝까지 읽음, 질문 3개(1·2·3번 소제목) → 답변.
  - 당일 질문 확인 문제: 7회 채점 중 맞음 3 · 절반 4 (당일 질문으로 만든 문제 4개 추가).
  - 헷갈린 패턴: 인자 `ticks`(상대)·`start`(절대)·`timer_elapsed` 반환값(상대)·`wakeup_tick`(절대, 고친 코드에만)을 섞음 → 3번 다시 풀어 정답. 리스트에 스레드가 복사된다고 답함 → 재설명 후 정답.
- 준비 확인 문제(4·5·6번 소제목): 9회 채점 중 맞음 6 · 절반 1 · 틀림 2(다시 낸 문제 포함).
  - 틀린 패턴: `sleep_list`의 `wakeup_tick` 값을 우선순위로 읽음 → 재설명 후 정답. 8주차 방식(끝까지 훑기)을 "전부 깨우기"로 읽음 → 재설명 후 정답. 8주차 팀 코드는 본 적 없음.
- 종합(4문항): 맞음 2 · 절반 2. 서술형에서 `sleep_list`를 넣은 순서로, 잠드는 시각을 깨는 시각으로 답함 → 다시 풀기 정답. `elem` 문제에서 RUNNING 스레드가 `ready_list`·`sleep_list`에 걸려 있다고 답함 → 2번 다시 풀어 정답.
- 다시 묻기 #11(상태·필드·리스트 구분), #16(정렬과 `break`): 이번에는 맞음.
- **T1 완료 (2026-10-26).**
- **다음에 이어 할 위치: T2 동기화 시작.**
- T2 (동기화) 시작. 시작 전 질문 "동기화가 Alarm Clock과 연관되나?" → 답변(인터럽트 끄기, 재우고 깨우기 = 세마포어 속 동작). inbox 대기 질문 없음. 설명 1~6번 보여 줌.
  - 질문 1개(3번 소제목): "세마포어는 priority scheduling의 개념인가? 없이도 Alarm Clock을 풀 수 있나?" → 답변. 확인 문제(`2026-10-26-t2-01`)는 내고 답하기 전에 멈춤.
  - (그 대화의 설명은 읽지 않은 채 멈춤.)
- T2 새 대화에서 **처음부터 다시 시작**. 설명 1~6번 끝까지 읽음, 질문 없음(5번 조건 변수는 이해가 덜 됐다고 함).
- 소제목별 확인 문제: 23회 채점 중 맞음 10 · 절반 6 · 틀림 7(다시 낸 문제 포함) (오답에서 만든 문제 12개 추가: `2026-10-26-t2-02` ~ `t2-13`).
  - 틀린 패턴: `value`를 `sema_init` 시작값 그대로 읽음(다시 묻기 #10) → 2번 다시 풀어 정답. `sema_down`이 "값이 0이면 통과"라고 반대로 읽음, `sema_up` 횟수만큼 값이 쌓이는 것을 못 셈 → 쪽지 세기 표로 재설명 후 정답.
  - 락: 같은 스레드가 두 번 `lock_acquire`하면 통과한다고 답함 → 재설명 후 정답(ASSERT 패닉).
  - 조건 변수: 번호는 맞았지만 "깨어나면 다시 확인" 이유를 패닉으로 답함 → Mesa 방식 재설명 후 정답.
  - 무엇을 언제: 락과 세마포어(0)의 쓰임을 바꿔 말함 → "여는 사람이 잠근 사람과 같은가?"로 재설명, 2번 더 틀린 뒤 정답.
  - 다시 묻기 #9(lost update), #18(`cond->waiters` 원소): 이번에는 맞음.
- **다음에 이어 할 위치**: T2 종합 문제(준비 종합 + 당일 추가 `t2-06`·`t2-11` + 안 푼 `t2-01`).

## 4. 관심 키워드

없음

## 5. 나중에 볼 목록

- (주제 밖) 다른 OS(리눅스 등)는 time slice를 어떻게 정하나 — 2026-10-26, T0 4번
- (목표보다 깊음) `palloc`·`malloc` 내부 구조(페이지 풀, 비트맵, 블록 나누기) — 2026-10-26, T0 7번
