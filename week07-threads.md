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
| T0 | 큰 그림: 스레드 구조와 상태, `schedule()`·문맥 전환, 인터럽트 끄기 | — | ⬜ |
| T1 | Alarm Clock: busy waiting → 재우고 깨우기 | `alarm-*` 6개 | ⬜ |
| T2 | 동기화: race condition, semaphore / lock / condition variable | (T3·T4의 바탕) | ⬜ |
| T3 | 우선순위 스케줄링: 고르는 순서, 선점, 깨우는 순서 | `priority-fifo`, `-preempt`, `-change`, `-sema`, `-condvar`, `alarm-priority` | ⬜ |
| T4 | Priority Donation: 우선순위 역전, 여러 기부, 연쇄 기부, 복원 | `priority-donate-*` 7개 | ⬜ |
| T5 | MLFQS: nice, recent_cpu, load_avg, 고정소수점 | `mlfqs-*` 9개 | ⬜ |

## 3. 진도

### 2026-10-26
- T0 (큰 그림) 시작. 소제목 요약을 먼저 읽고 질문 6개(1·2·4·5·7번 소제목) → 답변.
- 확인 문제: 5번(인터럽트 끄기, 당일 질문 1개 추가) 채점 대기.
- **다음에 이어 할 위치: 확인 문제 채점 → 설명 1번 소제목부터 읽기.**

## 4. 관심 키워드

없음

## 5. 나중에 볼 목록

- (주제 밖) 다른 OS(리눅스 등)는 time slice를 어떻게 정하나 — 2026-10-26, T0 4번
- (목표보다 깊음) `palloc`·`malloc` 내부 구조(페이지 풀, 비트맵, 블록 나누기) — 2026-10-26, T0 7번
