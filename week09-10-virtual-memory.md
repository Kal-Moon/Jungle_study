# Week 9~10 — Project 3: Virtual Memory (개념 공부)

## 배경

- 9~10주차(2026-10-23 ~ 11-05)의 원래 과제는 Project 3 Virtual Memory였다. 이 기간은 7·8주차(Project 1·2) 복습에 썼다.
- 2026-11-03(화): 남은 기간 **11/3(화) ~ 11/5(목) 저녁 전**에 Project 3을 **코드 구현 없이 개념만** 공부하기로 함. Project 4 File System도 개념만 공부한다([project4-file-system.md](project4-file-system.md)).
- 이 기간 동안 P2 복습([week08-user-programs.md](week08-user-programs.md), P3~P7)은 멈춘다.
- 일정: VM은 화~수, FS는 목.

## 1. 자료 (공부법 2 — 1번)

- KAIST PintOS Project 3 명세: https://casys-kaist.github.io/pintos-kaist/project3/introduction.html
- 권영진 교수님 Pintos Lab slides (Pintos_1~4.pdf) — 정글 LMS 링크
- 권영진 교수님 강의 PPT `OS_review.pdf` (67쪽) — 2026-11-03 사용자가 대화에 올림. 저장소에는 올리지 않고 [VM·FS 개념 노트](https://claude.ai/artifact/6CnQXicJwAHkiFhGEvi1D8)의 `refs/OS_review.pdf`에 둔다.
  - 쪽 번호는 PDF 뷰어 기준(슬라이드 아래 번호와 44쪽 이후로 어긋남).
  - 슬라이드의 빈칸 `(   )`은 확인 문제로 쓴다.

| 메뉴 | PPT 쪽 | 내용 |
|---|---|---|
| V0 | 13~15, 17~18, 50 | 프로세스가 추상화하는 것, 주소 공간, Level of indirection, 페이징 주소 변환(V 비트·TLB), "페이지 테이블은 어디에? OS·HW의 역할은?", 프로세스마다 다른 페이지 테이블 |
| V1 | 19 | Demand paging: 멈춤 → 칸 받기 → 0으로 채우기 → 페이지 테이블에 연결 → 재개 |
| V2 | 16, 20~21, 64 | MMU와 fault handler, 폴트 전·후 그림, 디스크 읽기(DMA·인터럽트), Paging review 6단계(restart instruction) |
| V2·V4 | 45 | PTE 비트: Present, R/W, U/S, Accessed, Dirty |
| V3 | 22, 28 | 파일 = 저장 장치의 추상화(가상 메모리와 비교), 페이지 캐시 |
| V4 | 64~66 | 스왑 디스크에서 가져오기, 교체 정책(victim), 자습 범위: Optimal·LRU·Clock·Belady's anomaly |
| (범위 밖) | 56~63 | 스케줄링 — Project 1 내용 |

- 정글 일정(참고): Pintos 기초 특강 VM(금 13:00), 운영체제 특강 (2)(VM 2주차 월 13:30~15:30), 퀴즈(화 13:00~14:00), 주간 결과 발표(목 13:00)
- 준비 자료: [VM·FS 개념 노트](https://claude.ai/artifact/6CnQXicJwAHkiFhGEvi1D8) — 진행 규칙 `menus/guide.md`, 메뉴 원고 `menus/<메뉴>.md`(그날 새로 쓰고 다 쓰면 여기에 추가).

### 자료 분석: 교육 기관이 원하는 것

- Lazy loading, 페이지 폴트 처리, 보조 페이지 테이블(SPT), 스왑 등 가상 메모리의 핵심 메커니즘을 직접 구현한다.
- OS의 메모리 관리 구조를 이해한다.
- AI나 코드 자동 생성에 기대지 않고 직접 구현·디버깅·검증하는 힘을 기른다.
- 키워드: Virtual Memory, Page Table, Swap in/out, Page Replacement
- 통과 기준: Project 3 테스트. 옵션 없이 전부 필수.

### 이번 목표 기준 (개념만)

- 각 메커니즘이 **왜 필요하고, 어떤 순서로 움직이는지 말로 설명**할 수 있다.
- 약점 이어 보기: 8주차의 "내용(물리 페이지에 채움) vs 연결(페이지 테이블에 적음)" 구분. VM에서 계속 짚는다.
- 8주차 보류: 유저 page fault = 그 프로세스만 `exit(-1)`(커널 멈춤 아님) → V2에서 확인.

## 2. 목표 (공부법 2 — 2번)

**카테고리**: A. Project 3: Virtual Memory (B. Project 4는 별도 파일)

- 메뉴를 위에서부터 순서대로 진행한다.
- 진행 방식: 함수 이름 없이 개념 먼저, 코드 이름은 끝의 대응표에만. 확인 문제는 사용자가 "이해했다"고 할 때만, 한 번에 하나씩.

| # | 메뉴 | 날짜 | 상태 |
|---|---|---|---|
| V0 | 큰 그림: 왜 VM인가, 세 가지 표(페이지 테이블·SPT·프레임 테이블) | 11/3(화) | ✅ 완료 (종합 3문항: 1번 틀림→다시 맞음, 2·3번 맞음) |
| V1 | 페이지의 종류와 Lazy Loading (uninit → anon/file) | 11/3(화) | 🔄 진행 중 |
| V2 | 페이지 폴트 처리 흐름과 스택 성장 | 11/4(수) | ⬜ |
| V3 | Memory-Mapped Files (`mmap`/`munmap`) | 11/4(수) | ⬜ |
| V4 | 스왑 in/out과 페이지 교체 (Clock, accessed/dirty 비트) | 11/4(수) | ⬜ |

## 3. 진도

### 2026-11-03
- VM·FS 개념 공부 시작(공부법 1 + 2). 자료 분석, 카테고리·메뉴 정함.
- V0 설명(소제목 1~8)을 보여 줌. 아직 질문·확인 문제 없음.
- 새 대화에서 이어 함. 2번 소제목 질문: Lazy Loading vs Demand paging 차이 → 답함(Lazy Loading = 일반 기법, Pintos에선 실행 파일 적재에 적용 / Demand paging = 첫 접근 때 칸 주는 OS 방식, 0 채우기·파일·스왑 포함). 원고 2번의 "같은 이름" 표현은 부정확해서 고쳐 보여 줌.
- 확인 문제 1개(스택 첫 접근 폴트는 Demand paging인가): 맞음. 처음 답에서 "Lazy Loading은 핀토스 기법"이라고 해서 "일반 기법을 핀토스가 적용"으로 보충.
- 아티팩트 DB(`questions`/`attempts`)는 VM·FS 개념 노트에 없어서 문제 기록은 하지 않음.
- V0 끝까지 읽음. 사용자: "이해는 잘 못 한 것 같다" → 종합 문제로 점검 시작.
- 종합 1(시작 직후 안 건드린 코드 페이지의 상태, 정답 ①④): 틀림(②③ 고름). P2처럼 "시작 때 연결이 이미 있다"고 생각함 → 약점 "메모(SPT) vs 연결(페이지 테이블)" 그대로. 2·3·5번을 다시 설명하고 다시 냄.
- 종합 1 다시(첫 폴트 처리 직후 상태, 정답 ②③): 맞음. ①(SPT 메모는 남음)·④(채운 뒤엔 uninit 아님) 이유도 스스로 설명함.
- 종합 2(익명 페이지 쫓아낸 직후, 정답 ①②): 맞음. ③④ 틀린 이유(SPT 메모가 남음)도 설명함.
- 종합 3(PPT 18쪽, 페이징에서 OS·HW 역할, 정답 ①②④): 맞음. ③(SPT 판단은 OS) 이유도 설명함.
- **V0 완료.** 종합 3문항 중 처음 풀이 기준 2 맞음, 틀린 1문항은 다시 풀어 맞음. 약점 "메모 vs 연결"은 다시 풀기 이후 안정.
- 다음 위치: V1 1번 소제목부터.
- V1 시작(새 대화). 원고 `menus/v1.md`를 새로 써서 개념 노트에 추가(소제목 1~10). V0 원고 5번 정정: Pintos에서 실행 파일 페이지는 **anon**(file은 mmap뿐) — V0에도 정정 메모 추가.
- V1 설명(소제목 1~10)을 보여 줌. 아직 질문·확인 문제 없음.
- **다음 위치: V1 1번 소제목부터 읽기** (원고 `menus/v1.md`).

## 4. 관심 키워드

없음

## 5. 나중에 볼 목록

- (Extra) Copy-on-Write — 2026-11-03, 메뉴 정할 때 제외
