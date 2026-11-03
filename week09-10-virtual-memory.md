# Week 9~10 — Project 3: Virtual Memory (개념 공부)

## 배경

- 9~10주차(2026-10-23 ~ 11-05)의 원래 과제는 Project 3 Virtual Memory였다. 이 기간은 7·8주차(Project 1·2) 복습에 썼다.
- 2026-11-03(화): 남은 기간 **11/3(화) ~ 11/5(목) 저녁 전**에 Project 3을 **코드 구현 없이 개념만** 공부하기로 함. Project 4 File System도 개념만 공부한다([project4-file-system.md](project4-file-system.md)).
- 이 기간 동안 P2 복습([week08-user-programs.md](week08-user-programs.md), P3~P7)은 멈춘다.
- 일정: VM은 화~수, FS는 목.

## 1. 자료 (공부법 2 — 1번)

- KAIST PintOS Project 3 명세: https://casys-kaist.github.io/pintos-kaist/project3/introduction.html
- 권영진 교수님 Pintos Lab slides (Pintos_1~4.pdf) — 정글 LMS 링크
- 교수님 강의 PPT — 사용자가 가지고 있음. 받으면 메뉴마다 참고 자료로 쓴다.
- 정글 일정(참고): Pintos 기초 특강 VM(금 13:00), 운영체제 특강 (2)(VM 2주차 월 13:30~15:30), 퀴즈(화 13:00~14:00), 주간 결과 발표(목 13:00)
- 준비 자료 아티팩트 없음. 설명은 명세 기준으로 그날 새로 쓴다.

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
| V0 | 큰 그림: 왜 VM인가, 세 가지 표(페이지 테이블·SPT·프레임 테이블) | 11/3(화) | 🔄 진행 중 (1번 소제목부터) |
| V1 | 페이지의 종류와 Lazy Loading (uninit → anon/file) | 11/3(화) | ⬜ |
| V2 | 페이지 폴트 처리 흐름과 스택 성장 | 11/4(수) | ⬜ |
| V3 | Memory-Mapped Files (`mmap`/`munmap`) | 11/4(수) | ⬜ |
| V4 | 스왑 in/out과 페이지 교체 (Clock, accessed/dirty 비트) | 11/4(수) | ⬜ |

## 3. 진도

### 2026-11-03
- VM·FS 개념 공부 시작(공부법 1 + 2). 자료 분석, 카테고리·메뉴 정함.
- V0 설명(소제목 1~8)을 보여 줌. 아직 질문·확인 문제 없음.
- **다음 위치: V0 1번 소제목부터 읽기.**

## 4. 관심 키워드

없음

## 5. 나중에 볼 목록

- (Extra) Copy-on-Write — 2026-11-03, 메뉴 정할 때 제외
