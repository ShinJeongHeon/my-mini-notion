---

description: "Task list template for feature implementation"
---

# Tasks: 콘텐츠 글자 수 표시

**Input**: Design documents from `/specs/001-char-count-display/`

**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/, quickstart.md

**Tests**: Tests are MANDATORY per the project constitution (Principle I: Test-First, NON-NEGOTIABLE). Every implementation task follows the TDD cycle from `superpowers:test-driven-development`: write a failing test, watch it fail, then implement. Do NOT generate implementation tasks without corresponding test-first tasks.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2)
- Include exact file paths in descriptions

## Path Conventions

이 저장소는 단일 Next.js App Router 프로젝트다(별도 backend/frontend 분리 없음, plan.md
Structure Decision 참조). 소스는 `app/`·`components/`·`lib/` 아래에, 테스트는 저장소
컨벤션에 따라 `__tests__/*.test.tsx`에 둔다.

## Phase 1: Setup

**해당 없음** — 신규 의존성, 신규 설정 파일, 신규 프로젝트 구조가 필요하지 않다.
기존 Next.js 16.2.10 / Vitest 4 스캐폴드를 그대로 사용한다(research.md 참조).

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: User Story 1·2가 공통으로 사용할 "우측 하단 고정 배지"의 디자인 결정과
스타일을 먼저 확정한다. 이 두 태스크가 끝나야 두 스토리의 구현 태스크(마크업 추가)가
가능하다.

- [X] T001 `DESIGN.md`에 "글자 수 배지"(`.detail-char-count`) 컴포넌트 패턴을 신규
      문서화한다 — 위치(뷰포트/`.app-main` 기준 `position: fixed`, 화면 우측 하단,
      사이드바 264px와 겹치지 않는 우측 오프셋), 기존 토큰만 재사용한 배경색·텍스트색·
      `radius-md`·`--shadow-xs`~`--shadow-sm`·폰트 크기(12~13px 스케일)를 확정한다
      (헌법 원칙 III 게이트, research.md §3·§4 참조).
- [X] T002 `app/globals.css`에 `.detail-char-count` 클래스를 추가한다 — T001에서
      확정한 값으로 `position: fixed`, 우측/하단 오프셋, 배경·텍스트·라운드·그림자·
      폰트 스타일을 정의한다. (depends on T001)

**Checkpoint**: 두 유저 스토리가 공유할 시각적 컨테이너 스타일이 준비됨.

---

## Phase 3: User Story 1 - 입력하면서 실시간으로 글자 수 확인하기 (Priority: P1) 🎯 MVP

**Goal**: 사용자가 내용 입력칸에 타이핑·삭제·붙여넣기하면 화면 우측 하단 고정 배지의
글자 수가 즉시 갱신된다(spec FR-001, FR-002, FR-004).

**Independent Test**: 게시글 상세 화면을 열고 내용 입력칸에 텍스트를 입력·삭제·
붙여넣기하면서 `content-char-count`의 텍스트가 즉시 바뀌는지 확인하는 것만으로
독립적으로 검증 가능하다.

### Tests for User Story 1 (MANDATORY — TDD per constitution) ⚠️

> **NOTE: 아래 테스트를 먼저 작성하고, 구현 전에 반드시 실패를 직접 확인한다**

- [X] T003 [US1] `__tests__/post-detail-char-count.test.tsx`에 실패하는 테스트를
      작성한다: (a) 내용이 있는 게시글을 열면 `data-testid="content-char-count"`가
      `post.content.length`와 같은 숫자 텍스트를 렌더한다, (b) 입력칸에 타이핑하면
      값이 즉시 증가한다, (c) 텍스트를 삭제하면 값이 즉시 감소한다, (d) 텍스트를
      붙여넣기(paste)하면 붙여넣은 전체 길이가 반영된다 — 값·형식은
      `contracts/char-count-display.md`의 입력→출력 표를 그대로 근거로 삼는다.
      `npm test -- __tests__/post-detail-char-count.test.tsx`를 실행해, `content-char-count`
      요소가 아직 없어서 4개 케이스 모두 실패하는 것을 직접 확인한다(오타로 인한
      실패가 아니라 "요소 없음"으로 실패해야 한다).

### Implementation for User Story 1

- [X] T004 [US1] `app/(app)/posts/[id]/page.tsx`의 `.detail-content` textarea
      아래에 `<span data-testid="content-char-count" className="detail-char-count">{post.content.length}</span>`를
      추가해 T003의 테스트를 통과시킨다. (depends on T002, T003)
      `npm test -- __tests__/post-detail-char-count.test.tsx`로 GREEN을 확인한 뒤
      `npm test`(전체)를 실행해 다른 테스트에 회귀가 없는지 확인한다.

**Checkpoint**: User Story 1은 이 시점에서 독립적으로 완전히 동작하고 검증 가능하다
(MVP 완료).

---

## Phase 4: User Story 2 - 빈 내용의 글자 수 확인 (Priority: P2)

**Goal**: 내용 입력칸이 비어 있을 때, 그리고 다른 게시글로 전환했을 때도 글자 수가
정확히(빈 내용이면 리터럴 `"0"`) 표시된다(spec FR-005, FR-006, SC-002).

**Independent Test**: 내용이 없는 새 게시글을 열었을 때 `content-char-count`가
정확히 `"0"`인지, 내용이 있는 글에서 내용이 없는 다른 글로 전환했을 때 `"0"`으로
다시 계산되는지 확인하는 것만으로 독립적으로 검증 가능하다.

### Tests for User Story 2 (MANDATORY — TDD per constitution) ⚠️

- [X] T005 [US2] `__tests__/post-detail-char-count.test.tsx`에 테스트를 추가한다:
      (a) 내용이 빈 문자열(`""`)인 게시글을 열면 `content-char-count` 텍스트가
      정확히 `"0"`이다(SC-002), (b) 내용이 있는 게시글에서 내용이 빈 다른 게시글로
      전환하면 `content-char-count`가 새 게시글 기준 `"0"`으로 다시 계산된다(FR-006).
      `npm test -- __tests__/post-detail-char-count.test.tsx`를 실행한다: T004의
      범용 구현(`post.content.length`)이 이미 두 케이스를 구조적으로 만족시켜 즉시
      통과할 수 있다 — 이 경우 "구현 없이 통과"가 아니라 "User Story 1 구현이 이미
      이 요구를 충족함을 확인하는 독립 회귀 테스트"임을 작업 기록에 남긴다. 만약
      실패한다면 T006에서 수정한다.

### Implementation for User Story 2

- [X] T006 [US2] T005가 실패한 경우에만 `app/(app)/posts/[id]/page.tsx`의 글자 수
      렌더링 로직을 수정해 빈 내용·게시글 전환 케이스를 통과시킨다. T005가 이미
      통과했다면 이 태스크는 "변경 없음"으로 표시하고 건너뛴다. 이후 `npm test`
      (전체)로 회귀가 없는지 확인한다.

**Checkpoint**: User Story 1 + User Story 2 모두 독립적으로 동작하고 검증 가능하다.

---

## Phase 5: Polish & Cross-Cutting Concerns

- [X] T007 [P] `__tests__/post-detail-char-count.test.tsx`에 10,000자 이상의 긴
      내용에 대한 회귀 테스트를 추가한다 — 매우 긴 문자열에서도 글자 수가 정확히
      계산되는지 확인한다(SC-003).
- [X] T008 [P] `quickstart.md` 시나리오 3("스크롤 시 고정 위치 확인")을 `npm run dev`로
      띄운 실제 브라우저에서 수동 검증한다 — jsdom은 실제 `position: fixed` 레이아웃을
      검증할 수 없으므로 이 항목은 브라우저 수동 확인이 유일한 검증 경로다(FR-003).
- [X] T009 `npm test`(전체 스위트)를 최종 실행해 오류·경고 없이 전부 통과하는지
      확인한다(헌법 완료 게이트, T007 완료 후 실행). (depends on T007)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: 해당 없음 — 즉시 다음 단계로.
- **Foundational (Phase 2)**: Setup 없이 바로 시작 가능 — User Story 1·2의 구현
  태스크(T004, T006)를 블로킹한다.
- **User Stories (Phase 3+)**: 모두 Foundational(Phase 2) 완료에 의존한다.
  - User Story 1(P1)은 다른 스토리에 의존하지 않는다.
  - User Story 2(P2)는 Foundational에만 의존하며, 코드상으로는 US1과 같은 렌더링
    로직을 공유하지만(T004) 독립적인 테스트(T005)로 검증한다.
- **Polish (Phase 5)**: 원하는 유저 스토리(최소 US1, 권장 US1+US2) 완료에 의존한다.

### User Story Dependencies

- **User Story 1 (P1)**: Foundational(T001, T002) 이후 시작 가능. 다른 스토리에
  의존하지 않는다.
- **User Story 2 (P2)**: Foundational 이후 시작 가능. US1의 구현(T004)과 같은 코드
  경로를 공유하므로 US1 이후에 진행하는 것을 권장하지만, 테스트(T005) 자체는 US1의
  테스트와 독립적으로 작성·실행된다.

### Within Each User Story

- 테스트를 먼저 작성하고 실패를 직접 확인한 뒤 구현한다(헌법 원칙 I, 예외 없음).
- 같은 테스트 파일(`__tests__/post-detail-char-count.test.tsx`)을 여러 태스크가
  공유하므로, 해당 파일을 다루는 태스크끼리는 병렬([P])로 표시하지 않는다.
- 스토리가 끝나야 다음 우선순위 스토리로 넘어간다(원하는 경우 순서를 바꿔도 무방).

### Parallel Opportunities

- Phase 2의 T001은 T002보다 먼저 끝나야 하므로 병렬이 아니다(T002가 T001의 결정값을
  사용).
- Phase 5의 T007(테스트 파일 추가)과 T008(브라우저 수동 검증)은 서로 다른 산출물이라
  병렬로 진행할 수 있다.
- 이 기능은 규모가 작아 팀 병렬 분배(여러 개발자가 동시에)를 상정하지 않는다 — 순차
  진행을 권장한다.

---

## Parallel Example: Phase 5 (Polish)

```bash
# T007과 T008은 서로 다른 산출물(테스트 파일 vs 브라우저 수동 확인)이므로 병렬 진행 가능:
Task: "10,000자 이상 긴 내용 회귀 테스트 추가 in __tests__/post-detail-char-count.test.tsx"
Task: "quickstart.md 시나리오 3(스크롤 시 고정 위치) 브라우저 수동 검증"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Phase 2(Foundational) 완료: DESIGN.md 문서화(T001) + CSS 클래스 추가(T002)
2. Phase 3(User Story 1) 완료: 실패 테스트(T003) → 구현(T004)
3. **STOP and VALIDATE**: User Story 1을 독립적으로 검증(quickstart.md 시나리오 1·2)
4. 여기까지만으로도 spec의 핵심 가치(실시간 글자 수 확인)는 완전히 동작한다.

### Incremental Delivery

1. Foundational 완료 → 공유 스타일 준비 완료
2. User Story 1 추가 → 독립 검증 → MVP로 데모 가능
3. User Story 2 추가 → 독립 검증(빈 내용/게시글 전환) → 전체 스펙 완성
4. Polish(T007-T009) → 긴 내용 회귀 테스트, 스크롤 고정 위치 수동 확인, 전체
   테스트 스위트 최종 확인

---

## Notes

- [P] 태스크 = 서로 다른 파일이며 의존성이 없는 작업만 해당.
- [Story] 라벨은 각 태스크를 spec.md의 유저 스토리에 매핑한다(추적성).
- 각 유저 스토리는 독립적으로 완료·검증 가능해야 한다(User Story 2는 US1과 구현
  코드를 공유하지만 테스트는 독립적으로 작성·실행한다).
- 구현 전 반드시 테스트가 실패하는 것을 확인한다(헌법 원칙 I).
- 논리적 단위(태스크)마다 커밋한다.
- 각 체크포인트에서 멈춰 해당 스토리를 독립적으로 검증할 수 있다.
- 피할 것: 모호한 태스크, 같은 파일 동시 편집 충돌, 스토리 간 독립성을 깨는
  교차 의존성.
