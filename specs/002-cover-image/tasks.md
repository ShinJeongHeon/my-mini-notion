---

description: "Task list template for feature implementation"
---

# Tasks: 커버 이미지

**Input**: Design documents from `/specs/002-cover-image/`

**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/, quickstart.md

**Tests**: Tests are MANDATORY per the project constitution (Principle I: Test-First, NON-NEGOTIABLE). Every implementation task follows the TDD cycle from `superpowers:test-driven-development`: write a failing test, watch it fail, then implement. Do NOT generate implementation tasks without corresponding test-first tasks.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

이 저장소는 단일 Next.js App Router 프로젝트다(별도 backend/frontend 분리 없음, plan.md
Structure Decision 참조). 소스는 `app/`·`components/`·`lib/` 아래에, 테스트는 저장소
컨벤션에 따라 `__tests__/*.test.tsx`에 둔다. 커버 기능은 신규 클라이언트 컴포넌트
`components/PostCover.tsx` 하나(로딩/표시/실패 3-상태 기계)에 응집되며, 세 유저 스토리는
같은 컴포넌트/테스트 파일을 **순차적으로 확장**한다(→ 같은 파일이라 대부분 [P] 아님).

## Phase 1: Setup

**해당 없음** — 신규 npm 의존성, 신규 설정 파일, 신규 프로젝트 구조가 필요하지 않다.
기존 Next.js 16.2.10 / Vitest 4 스캐폴드를 그대로 사용한다. 이미지는 표준 `<img>`로 표시해
`next.config` 원격 이미지 설정도 불필요하다(research.md §1).

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: 세 유저 스토리가 공통으로 렌더하는 커버 컨테이너의 **디자인 결정과 스타일**을
먼저 확정한다(헌법 원칙 III 디자인 게이트). 이 두 태스크가 끝나야 커버가 시각적으로 자리를
유지(고정 높이)하고 스켈레톤을 표시할 수 있다.

- [X] T001 `DESIGN.md`에 "커버 이미지 / 스켈레톤" 패턴을 신규 문서화한다 — (1) 신규 컴포넌트
      `PostCover`와 CSS 조각 `.detail-cover*`, (2) 신규 키프레임 `@keyframes mnShimmer`(§1.5
      모션에 추가), (3) 화면 명세 §4.3(글 상세)에 "브레드크럼과 제목 사이 커버 배치" 단계 추가,
      (4) 접근성 §7에 커버 `alt=""`(장식) 명시, (5) §8 커버리지 매핑 추가. **임의 값 없이**
      기존 토큰만 사용한다: 라운드 `--radius-lg`, 색 `--surface-hover`/`--surface-subtle`/
      `--gray-150`, 페이드인 `--dur-normal`/`--ease-standard`, 커버 높이는 신규 확정값 **200px**
      로 문서에 기록(research.md §3 근거).
- [X] T002 `app/globals.css`의 "글 상세" 섹션에 `.detail-cover`(position: relative, width:100%,
      height:200px, border-radius: var(--radius-lg), overflow:hidden, margin-bottom:20px),
      `.detail-cover__img`(width/height 100%, object-fit:cover, display:block, opacity:0,
      transition: opacity var(--dur-normal) var(--ease-standard); `[data-loaded="true"]`→opacity:1),
      `.detail-cover__skeleton`(position:absolute, inset:0, 뉴트럴 그라디언트 + `animation: mnShimmer
      1.4s linear infinite`), 그리고 `@keyframes mnShimmer`(background-position 200%→-200%)를
      추가한다 — T001에서 확정한 값 그대로. (depends on T001, data-model.md §3 표 참조)

**Checkpoint**: 세 스토리가 공유할 커버 컨테이너/스켈레톤/페이드인 스타일이 준비됨(고정 높이로
layout shift 0 보장의 기반).

---

## Phase 3: User Story 1 - 편집 화면 상단에서 커버 이미지 보기 (Priority: P1) 🎯 MVP

**Goal**: 게시글 편집 화면을 열면 제목 입력창 바로 위에 커버 영역이 나타나고, 랜덤 고양이
API(`cataas.com/cat/cute`)에서 이미지를 받아 표시한다(spec FR-001·FR-002·FR-008,
US1 Acceptance 1·2·3).

**Independent Test**: 상세 화면을 열었을 때 `detail-cover`가 `.detail-title` 입력창보다 위에
렌더되고, `cover-image`의 `src`가 cataas 엔드포인트로 시작하며, `cover-image`에 load 이벤트가
발생하면 이미지가 표시(`data-loaded="true"`)되는지 확인하는 것만으로 독립 검증 가능하다.

### Tests for User Story 1 (MANDATORY — TDD per constitution) ⚠️

> **NOTE: 아래 테스트를 먼저 작성하고, 구현 전에 반드시 실패를 직접 확인한다**

- [X] T003 [US1] `__tests__/post-cover.test.tsx`를 신규 작성한다(기존
      `post-detail-char-count.test.tsx`의 localStorage 시드 + `next/navigation` 모킹 패턴 재사용).
      실패 테스트: (a) 상세 화면 렌더 시 `data-testid="detail-cover"`가 DOM에서 `.detail-title`
      입력창보다 **앞(위)** 에 위치한다(FR-001), (b) `data-testid="cover-image"`의 `src`가
      `https://cataas.com/cat/cute`로 시작한다(FR-002), (c) `cover-image`의 `alt`가 빈
      문자열이다(research §5), (d) `cover-image`에 `fireEvent.load` 후 `data-loaded` 속성이
      `"true"`가 된다. `npm test -- __tests__/post-cover.test.tsx`로 커버가 아직 없어 4케이스가
      모두 실패("요소 없음")하는 것을 직접 확인한다. (contracts/post-cover-component.md 렌더
      계약 근거)

### Implementation for User Story 1

- [X] T004 [US1] `components/PostCover.tsx`를 신규 생성한다(`"use client"`). `status`(초기
      `'loading'`)·`src`(마운트당 캐시버스팅 토큰을 붙인 `COVER_ENDPOINT`, `useState` 초기화
      함수에서 1회 생성 — research §2) 로컬 상태를 두고, `<div className="detail-cover"
      data-testid="detail-cover">` 안에 `<img className="detail-cover__img" data-testid="cover-image"
      src={src} alt="" data-loaded={status==='loaded'} onLoad={()=>setStatus('loaded')} />`를
      렌더한다(스켈레톤·에러 처리는 US2/US3에서 추가 — YAGNI). T003의 (b)(c)(d)를 통과시킨다.
      (depends on T002, T003)
- [X] T005 [US1] `app/(app)/posts/[id]/page.tsx`를 수정한다 — `PostCover`를 import하고
      `.detail-breadcrumb` 블록과 `<input className="detail-title">` **사이**에 `<PostCover />`를
      삽입해 T003의 (a) 배치 테스트를 통과시킨다. `npm test -- __tests__/post-cover.test.tsx`로
      GREEN을 확인한 뒤 `npm test`(전체)로 기존 테스트(글자 수 등) 회귀가 없는지 확인한다.
      (depends on T004)

**Checkpoint**: User Story 1은 이 시점에서 독립적으로 동작·검증 가능하다 — 커버가 제목 위에
나타나고 로드 완료 시 고양이 사진이 표시된다(MVP 완료).

---

## Phase 4: User Story 2 - 로딩 중 스켈레톤으로 자리 유지하기 (Priority: P2)

**Goal**: 커버를 내려받는 동안 회전 스피너가 아니라 커버와 동일한 크기의 스켈레톤
placeholder를 표시하고, 이미지 도착 시 스켈레톤을 실제 사진으로 매끄럽게 교체한다
(spec FR-003·FR-004, US2 Acceptance 1·2·3, SC-002·SC-003).

**Independent Test**: 초기 렌더(로드 전)에 `cover-skeleton`이 존재하고 스피너 요소가 없으며,
`cover-image`에 load 이벤트가 발생하면 `cover-skeleton`이 사라지는지 확인하는 것만으로 독립
검증 가능하다. (고정 높이로 인한 layout shift 0은 브라우저 수동 검증 — Phase 6)

### Tests for User Story 2 (MANDATORY — TDD per constitution) ⚠️

- [X] T006 [US2] `__tests__/post-cover.test.tsx`에 실패 테스트를 추가한다: (a) 상세 화면을 막
      렌더한 직후(load 이벤트 전) `data-testid="cover-skeleton"`이 존재하고, 회전 스피너/loader
      요소(role="status"·`*-spinner` 등)는 존재하지 않는다(FR-003, SC-002), (b) `cover-image`에
      `fireEvent.load` 후 `cover-skeleton`이 DOM에서 사라진다(FR-004). `npm test --
      __tests__/post-cover.test.tsx`로 현재 US1 구현엔 스켈레톤이 없어 (a)가 실패하는 것을 직접
      확인한다.

### Implementation for User Story 2

- [X] T007 [US2] `components/PostCover.tsx`를 수정한다 — `status !== 'loaded'`일 때 컨테이너
      안에 `<div className="detail-cover__skeleton" data-testid="cover-skeleton" aria-hidden="true" />`
      오버레이를 렌더하고, `loaded`가 되면 렌더하지 않는다. T006을 통과시킨다.
      `npm test -- __tests__/post-cover.test.tsx`로 GREEN을 확인한 뒤 `npm test`(전체)로 회귀를
      확인한다. (depends on T005, T006)

**Checkpoint**: User Story 1 + 2 모두 독립적으로 동작·검증 가능하다 — 로딩 중 스켈레톤,
도착 시 사진으로 전환(스피너 없음).

---

## Phase 5: User Story 3 - 커버 이미지를 불러오지 못했을 때 (Priority: P3)

**Goal**: 이미지 API가 실패하면 깨진 이미지나 멈춘 스켈레톤을 남기지 않고 커버를 접어(collapse)
숨기며, 편집 화면은 정상적으로 계속 사용할 수 있다(spec FR-005·FR-009, US3 Acceptance 1·2,
SC-005).

**Independent Test**: `cover-image`에 error 이벤트를 발생시켰을 때 `detail-cover` 컨테이너가
DOM에서 제거되고(깨진 이미지 없음), 그 상태에서 제목·본문 입력이 정상 반영되는지 확인하는
것만으로 독립 검증 가능하다.

### Tests for User Story 3 (MANDATORY — TDD per constitution) ⚠️

- [X] T008 [US3] `__tests__/post-cover.test.tsx`에 실패 테스트를 추가한다: (a) `cover-image`에
      `fireEvent.error` 후 `data-testid="detail-cover"`가 DOM에서 사라진다(collapse, 깨진 이미지
      없음 — FR-005·SC-005), (b) error 발생 후에도 본문 textarea에 입력하면 값이 즉시 반영된다
      (FR-006·SC-004 — 기존 자동 저장 동작 유지). `npm test -- __tests__/post-cover.test.tsx`로
      현재 구현엔 error 처리가 없어 (a)가 실패하는 것을 직접 확인한다.

### Implementation for User Story 3

- [X] T009 [US3] `components/PostCover.tsx`를 수정한다 — `<img>`에
      `onError={()=>setStatus('error')}`를 추가하고, `status === 'error'`이면 컴포넌트가 `null`을
      반환(커버 collapse)하도록 한다. 인위적 타임아웃·재시도는 두지 않는다(FR-009). T008을
      통과시킨다. `npm test -- __tests__/post-cover.test.tsx`로 GREEN을 확인한 뒤 `npm test`
      (전체)로 회귀를 확인한다. (depends on T007, T008)

**Checkpoint**: 세 유저 스토리 모두 독립적으로 동작·검증 가능하다(표시 / 스켈레톤 / 실패 collapse).

---

## Phase 6: Polish & Cross-Cutting Concerns

- [X] T010 [P] `quickstart.md` §B(수동 검증)를 `npm run dev`로 띄운 실제 브라우저에서 수행한다 —
      jsdom이 검증할 수 없는 항목: 스켈레톤 shimmer 애니메이션, 스켈레톤→이미지 전환 시 layout
      shift 0(SC-003, 제목·본문 위치 불변), 매 진입 새 랜덤 이미지(FR-008), Network 차단/오프라인
      시 커버 collapse(FR-005). 결과를 작업 기록에 남긴다.
- [X] T011 [P] 구현된 `components/PostCover.tsx`·`app/globals.css`의 실제 클래스·값이 T001에서
      문서화한 `DESIGN.md` 내용과 일치하는지 대조하고, 어긋난 부분이 있으면 `DESIGN.md`를 갱신해
      문서-코드 일치를 확정한다(헌법 원칙 III — source of truth는 구현 코드).
- [X] T012 `npm test`(전체 스위트)를 최종 실행해 오류·경고 없이 전부 통과하는지 확인한다
      (헌법 완료 게이트). (depends on T009, T010, T011)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: 해당 없음 — 바로 다음 단계로.
- **Foundational (Phase 2)**: 바로 시작 가능 — 모든 유저 스토리의 구현을 블로킹한다(커버
  컨테이너 스타일이 없으면 시각적 자리 유지·스켈레톤이 성립하지 않음).
- **User Stories (Phase 3+)**: 모두 Foundational 완료에 의존한다. 세 스토리는 같은 컴포넌트
  파일을 순차 확장하므로 **우선순위 순서(US1 → US2 → US3)로 진행**한다.
- **Polish (Phase 6)**: 원하는 유저 스토리(최소 US1, 권장 US1+US2+US3) 완료에 의존한다.

### User Story Dependencies

- **User Story 1 (P1)**: Foundational(T001·T002) 이후 시작. 다른 스토리에 의존하지 않는다.
  `PostCover` 컴포넌트를 생성하고 페이지에 배치한다(MVP).
- **User Story 2 (P2)**: US1이 만든 `PostCover.tsx`에 스켈레톤 오버레이를 **추가**한다 — 같은
  파일을 확장하므로 US1 이후 진행. 테스트(T006)는 US1 테스트와 독립적으로 검증한다.
- **User Story 3 (P3)**: US2까지 확장된 `PostCover.tsx`에 error→collapse를 **추가**한다 — 같은
  파일이라 US2 이후 진행. 테스트(T008)는 독립적으로 검증한다.

### Within Each User Story

- 테스트를 먼저 작성하고 실패를 직접 확인한 뒤 구현한다(헌법 원칙 I, 예외 없음).
- 각 스토리는 "테스트 추가 → RED 확인 → 최소 구현 → GREEN 확인 → 전체 회귀"를 1사이클로 한다.
- `components/PostCover.tsx`와 `__tests__/post-cover.test.tsx`는 세 스토리가 공유하므로,
  이 두 파일을 다루는 태스크끼리는 병렬([P])로 표시하지 않는다.

### Parallel Opportunities

- 이 기능은 커버 컴포넌트 1개에 응집되어 있어 대부분의 태스크가 같은 두 파일을 순차 편집한다 —
  스토리 내/스토리 간 병렬 여지가 거의 없다(정직하게 순차 진행 권장).
- 예외: Phase 6의 T010(브라우저 수동 검증)과 T011(DESIGN.md 대조)은 서로 다른 산출물이라
  병렬([P]) 가능하다. 최종 T012(전체 테스트)는 둘 다 끝난 뒤 실행한다.

---

## Parallel Example: Phase 6 (Polish)

```bash
# T010과 T011은 서로 다른 산출물(브라우저 수동 검증 vs 문서 대조)이라 병렬 진행 가능:
Task: "quickstart.md §B 브라우저 수동 검증 (layout shift 0 · 매 진입 새 랜덤 · 실패 collapse)"
Task: "PostCover.tsx/globals.css ↔ DESIGN.md 문서-코드 일치 대조"
# 이후:
Task: "npm test 전체 스위트 최종 실행 (완료 게이트)"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Phase 2(Foundational) 완료: DESIGN.md 문서화(T001) + CSS·키프레임 추가(T002).
2. Phase 3(User Story 1) 완료: 실패 테스트(T003) → `PostCover` 생성(T004) → 페이지 배치(T005).
3. **STOP and VALIDATE**: 상세 화면에서 제목 위 커버가 나타나고 로드 시 사진이 뜨는지 독립 검증
   (quickstart §A 시나리오 1·5·6·7).
4. 여기까지만으로도 스펙의 핵심 가치(편집 화면 상단 커버)는 완전히 동작한다.

### Incremental Delivery

1. Foundational 완료 → 커버 컨테이너 스타일 준비.
2. US1 추가 → 독립 검증 → MVP 데모(커버 표시).
3. US2 추가 → 독립 검증(스켈레톤·전환) → 로딩 UX 완성.
4. US3 추가 → 독립 검증(실패 collapse) → 견고성 완성.
5. Polish(T010-T012) → 브라우저 수동 검증, 문서-코드 일치, 전체 테스트 최종 확인.

### Parallel Team Strategy

이 기능은 컴포넌트 1개에 응집되어 있어 여러 개발자 병렬 분배에 적합하지 않다. 한 명이
US1 → US2 → US3 순서로 진행하는 것을 권장한다.

---

## Notes

- [P] 태스크 = 서로 다른 파일이며 의존성이 없는 작업만 해당(이 기능에선 Polish의 T010·T011뿐).
- [Story] 라벨은 각 태스크를 spec.md의 유저 스토리에 매핑한다(추적성).
- 세 유저 스토리는 같은 `PostCover.tsx`를 순차 확장하지만, 각 스토리의 테스트는 독립적으로
  작성·실행되어 독립 검증이 가능하다.
- 구현 전 반드시 테스트가 실패하는 것을 직접 확인한다(헌법 원칙 I). GREEN은 최소 구현(YAGNI).
- 시각/애니메이션/네트워크 경로(layout shift·shimmer·매 진입 랜덤·실패)는 jsdom으로 검증할 수
  없으므로 T010에서 브라우저로 수동 검증한다.
- 신규 디자인 결정은 `DESIGN.md`에 반영(T001)하고 최종 일치(T011)를 확인한다 — 원칙 III.
- 논리적 단위(태스크)마다 커밋한다. 각 체크포인트에서 멈춰 해당 스토리를 독립 검증할 수 있다.
