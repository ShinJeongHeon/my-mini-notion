# Tasks: 계정 기반 페이지 게시글 저장

**Input**: Design documents from `/specs/003-supabase-page-posts/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/(page-rls.sql·posts-store.md), quickstart.md

**Tests**: Tests are MANDATORY per the project constitution (Principle I: Test-First, NON-NEGOTIABLE).
모든 구현 태스크는 `superpowers:test-driven-development`의 사이클을 따른다 —
**RED 태스크에서 테스트를 먼저 쓰고 `npm test`로 실패를 직접 목격한 뒤**(기능 부재로 실패해야 유효,
오타·에러 실패는 무효) 대응 GREEN 태스크에서 통과하는 최소 코드만 작성한다.

**Organization**: 사용자 스토리별 phase. 대부분의 변경이 `lib/store.tsx` 한 파일에 모이므로
스토리 내부는 순차 실행이 기본이고, [P]는 실제로 다른 파일만 건드리는 태스크에만 붙였다.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: 병렬 가능 (다른 파일, 미완료 태스크 의존 없음)
- **[Story]**: US1(등록·보관) / US2(소유자 격리 조회) / US3(삭제) / US4(편집 유지)

## Path Conventions

단일 Next.js 앱 (repository root): `lib/`, `app/`, `components/`, `__tests__/`.
DB 변경은 코드가 아니라 Supabase MCP `apply_migration`으로 적용하고 원문은 `specs/003-supabase-page-posts/contracts/page-rls.sql`에 이미 기록되어 있다.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: 헌장 게이트 충족과 검증 전제 준비. 코드 변경 없음.

- [X] T001 헌장 게이트 준비 — `DESIGN.md` §2.7.12(빈 상태 `.empty-state`)·§2.7.13(저장 노트 `.saved-note`)·§0(문구 톤) 정독, 원본 체크아웃 `C:\Users\LG\OneDrive\바탕 화면\dx-claudecode-master\03-notion\20-notion-deploy\node_modules\next\dist\docs\01-app\` 의 클라이언트 컴포넌트 관련 가이드 확인 (이 워크트리의 docs 디렉토리는 비어 있음 — research.md R10)
- [X] T002 [P] 수동 검증 전제 — 워크트리에 `.env.local`이 없으면 원본 체크아웃 `…\20-notion-deploy\.env.local`에서 복사 (유닛 테스트에는 불필요, quickstart 실행에만 필요)
- [X] T003 [P] 테스트 베이스라인 확인 — `npm test` 전체 그린(기존 22개)·출력 무결을 확인하고 시작

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: RLS 정책 — 이것 없이는 클라이언트의 모든 `page` 읽기·쓰기가 거부되므로 **모든 스토리를 블로킹**한다. FR-006(저장소 계층 강제)의 구현이기도 하다.

**⚠️ CRITICAL**: 이 phase 완료 전에는 어떤 사용자 스토리도 동작할 수 없다

- [X] T004 `specs/003-supabase-page-posts/contracts/page-rls.sql`의 정책 4개를 Supabase MCP `apply_migration`(name: `page_owner_rls_policies`)으로 적용하고, 같은 파일 하단의 검증 쿼리(`pg_policies`)로 delete/insert/update/view 4행이 생겼는지, `anon` 대상 정책이 없는지 확인. 테이블 구조(컬럼)는 절대 건드리지 않는다(FR-007)

**Checkpoint**: 이후 owner-only 접근이 DB에서 강제됨 — 스토리 구현 시작 가능

---

## Phase 3: User Story 1 - 로그인 사용자의 게시글 등록과 계정 기반 보관 (Priority: P1) 🎯 MVP

**Goal**: 글이 브라우저가 아닌 계정에 귀속 — 로그인 시 `page`에서 목록 로드, 등록은 insert, 시딩 제거, 즐겨찾기는 기기 로컬 파생.

**Independent Test**: quickstart.md S1 — 로그인 → 글 등록 → 새로고침·시크릿 창 재로그인 → 동일 글 확인. 유닛으로는 T005~T013의 테스트 전체.

### Tests + Implementation for User Story 1 (TDD 사이클 — RED는 실패 목격 후에만 다음으로) ⚠️

- [X] T005 [US1] RED: `__tests__/page-posts.test.tsx` 신설 — `@/lib/supabase` 목(기존 `__tests__/auth-store.test.tsx`와 같은 경계·스타일, `from("page")` 체인 지원, 응답 row는 실측 형상 전체 `{id, created_at, title, content, user_id}` — data-model.md §1.1) 구성. 테스트: "로그인하면 page 목록이 createdAt 내림차순 Post[]로 노출된다 — null title/content는 빈 문자열, created_at은 ms 숫자로 매핑". `npm test -- __tests__/page-posts.test.tsx`로 **기능 부재에 의한 실패 직접 확인**
- [X] T006 [US1] GREEN: `lib/store.tsx` — SIGNED_IN/INITIAL_SESSION에서 `page` select(`order("created_at", { ascending: false })`) 후 Post 매핑(research.md R7), `loaded`가 게시글 첫 로드까지 포함하도록 갱신(contracts/posts-store.md §상태). 통과 + 전체 그린 확인
- [X] T007 [US1] RED: 같은 파일에 테스트 추가 — "샘플 시딩이 없다(FR-009): 서버가 빈 배열을 주면 목록은 비어 있고, localStorage `mini-notion-v1`에 posts를 기록하지 않는다". 실패 직접 확인
- [X] T008 [US1] GREEN: `lib/store.tsx` — `seed()` 및 localStorage 게시글 영속(읽기·쓰기) 제거. 닉네임·이미지 폴백 등 프로필 로컬 동작은 건드리지 않는다. 통과 확인
- [X] T009 [US1] RED: 테스트 추가 — "createPost는 `{title: 트림된 제목, content: '', user_id: 세션 uid}`를 insert하고 응답 row를 목록 최상단에 넣고 Post를 resolve한다; insert 실패 시 null resolve + `postsError` 설정 + 목록 불변; 비로그인 호출은 서버 요청 없이 null"(FR-001, contracts/posts-store.md). 실패 직접 확인
- [X] T010 [US1] GREEN: `lib/store.tsx` — `createPost`를 `Promise<Post | null>`로 전환 구현, `postsError` 상태 신설. 통과 확인
- [X] T011 [US1] RED: 테스트 추가 — "즐겨찾기(FR-010): toggleFavorite가 `mini-notion-fav:<userId>` 키에 id 집합으로 저장되고, 목록 로드 시 favorite가 그 집합에서 파생되며, 다른 userId 키와 섞이지 않는다". 실패 직접 확인
- [X] T012 [US1] GREEN: `lib/store.tsx` — 계정별 로컬 즐겨찾기 집합 구현(data-model.md §2.1). 통과 확인
- [X] T013 [US1] RED: 테스트 추가 — 목록 화면 연동: "ListPage에서 등록 실패 시 상세로 이동하지 않고 실패 안내가 보인다; 성공 시 새 글 상세로 이동한다"(AppProvider + ListPage 렌더, next/navigation 목). 실패 직접 확인
- [X] T014 [US1] GREEN: `app/(app)/page.tsx`의 `createPage`·`components/AppShell.tsx`의 `newPage`를 `await createPost` + null 검사로 전환, `postsError` 안내 표시(T001에서 확인한 DESIGN.md 패턴 재사용 — 새 문구·패턴이 필요하면 `DESIGN.md`에 동시 반영, Principle III). 통과 + 전체 그린 확인

**Checkpoint**: US1 독립 검증 가능 — quickstart S1 (필요시 `/verify` 스킬로 실브라우저 확인)

---

## Phase 4: User Story 2 - 자신의 글만 조회 · 소유자 격리 (Priority: P1)

**Goal**: 비로그인·타계정에게 글이 보이지 않음. 서버 측 격리는 Phase 2의 RLS가 이미 강제 — 이 phase는 클라이언트 상태·"찾을 수 없음" 화면을 맞춘다.

**Independent Test**: quickstart.md S2·S3 — 계정 B에서 A의 글이 목록·직접 URL 어느 쪽에도 안 보임. 유닛으로는 T015·T017의 테스트.

### Tests + Implementation for User Story 2 (TDD) ⚠️

- [X] T015 [US2] RED: `__tests__/page-posts.test.tsx`에 테스트 추가 — "비로그인이면 posts는 항상 빈 배열이고 page 조회를 시도하지 않는다(FR-003); SIGNED_OUT 이벤트에 posts가 즉시 비워진다". 실패 직접 확인
- [X] T016 [US2] GREEN: `lib/store.tsx` — 세션 이벤트 연동 구현(contracts/posts-store.md §조회). 통과 확인
- [X] T017 [P] [US2] RED: `__tests__/post-not-found.test.tsx` 신설 — "상세 화면: 로드 완료 후 해당 id 글이 없으면 본문 대신 '찾을 수 없음' 빈 상태(`.empty-state`)와 목록 이동 버튼이 보인다 — 침묵 리다이렉트 아님"(US2-2·삭제된 글 재접근 Edge case 겸용). 실패 직접 확인
- [X] T018 [US2] GREEN: `app/(app)/posts/[id]/page.tsx` — `router.replace("/")` 침묵 이동을 DESIGN.md §2.7.12 `.empty-state` 기반 "찾을 수 없음" 상태로 교체(새 문구는 `DESIGN.md`에 반영). 통과 + 전체 그린 확인

**Checkpoint**: US1+US2 — 계정 격리가 저장소(RLS)와 화면 양쪽에서 완성

---

## Phase 5: User Story 3 - 자신의 글 삭제 (Priority: P2)

**Goal**: 본인 글 삭제가 계정 저장소에 영구 반영. 타인 글 삭제는 RLS가 0 rows로 무시(T004).

**Independent Test**: quickstart.md S4 — 삭제 → 목록·사이드바에서 사라짐 → 새로고침 후에도 없음 → 상세 URL 재접근 시 찾을 수 없음.

### Tests + Implementation for User Story 3 (TDD) ⚠️

- [X] T019 [US3] RED: `__tests__/page-posts.test.tsx`에 테스트 추가 — "deletePost는 해당 id로 delete를 전송하고 목록에서 즉시 제거한다; delete 실패 시 select 재조회로 목록이 복원되고 `postsError`가 설정된다(FR-008)". 실패 직접 확인
- [X] T020 [US3] GREEN: `lib/store.tsx` — `deletePost` 비동기 전환 + 실패 시 재조회 재동기화(research.md R6). 상세 화면의 기존 삭제 버튼·확인 다이얼로그·목록 이동 흐름은 그대로 둔다. 통과 + 전체 그린 확인

**Checkpoint**: US1~US3 독립 동작

---

## Phase 6: User Story 4 - 자신의 글 편집 유지 (Priority: P2)

**Goal**: 제목·본문 수정이 디바운스 자동 저장으로 계정 저장소에 반영(last-write-wins, R5). 기존 "자동 저장됨" 경험 유지.

**Independent Test**: quickstart.md S5·S6 — 수정 후 다른 브라우저 재로그인 시 반영, 오프라인 수정 시 실패 안내.

### Tests + Implementation for User Story 4 (TDD) ⚠️

- [X] T021 [US4] RED: `__tests__/page-posts.test.tsx`에 테스트 추가(fake timers) — "updatePost는 로컬에 즉시 반영되고, 디바운스 경과 후 마지막 patch로 update가 **1회만** 전송된다(연속 입력 병합); 디바운스 전에는 요청이 없다". 실패 직접 확인
- [X] T022 [US4] GREEN: `lib/store.tsx` — 글별 디바운스(≈600ms) 자동 저장 구현. 통과 확인
- [X] T023 [US4] RED: 테스트 추가 — "update 실패 시 select 재조회로 화면이 서버 상태에 재동기화되고 `postsError`가 설정된다(FR-008); 로그아웃하면 대기 중 디바운스 저장이 취소되어 요청이 나가지 않는다". 실패 직접 확인
- [X] T024 [US4] GREEN: `lib/store.tsx` — 실패 재동기화 + 로그아웃 시 타이머 취소 구현. 통과 + 전체 그린 확인

**Checkpoint**: 모든 사용자 스토리 완성

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: 헌장 완료 게이트 + 스펙 SC 검증

- [X] T025 리팩터링(그린 유지) — `lib/store.tsx`에서 중복 제거·이름 정리(예: 재조회 헬퍼 추출). 동작 추가 금지, 각 단계 후 `npm test` 그린 확인
- [X] T026 헌장 Principle I 완료 체크리스트 검증 — 신규 동작 전부에 선행 실패 테스트가 있었는지, RED를 직접 목격했는지, 최소 구현이었는지 대조; `npm test` 전체 통과 + 출력 무결(에러·경고 0)
- [ ] T027 quickstart.md S1~S7 실브라우저 수동 검증 (2계정 필요, `/verify` 스킬 활용 가능; T002의 .env.local 전제) — SC-001~005 전 항목 확인
- [X] T028 [P] DESIGN.md 정합성 최종 확인 — 이번에 추가된 UI 결정("찾을 수 없음" 상태, 실패 안내 문구·패턴)이 `DESIGN.md`에 기록되어 코드와 어긋나지 않는지 확인

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: 의존 없음 — 즉시 시작
- **Foundational (Phase 2 = T004 RLS)**: Setup 후. **모든 스토리를 블로킹** (정책 없으면 조회·쓰기 전부 거부)
- **User Stories (Phase 3~6)**: Phase 2 완료 후. US2~US4는 US1이 만든 스토어 기반(목록 로드·postsError)을 확장하므로 **US1 → US2 → US3 → US4 순차 진행을 권장** (동일 파일 `lib/store.tsx`·동일 테스트 파일 수정이 많아 병렬 이득이 작음)
- **Polish (Phase 7)**: 모든 스토리 완료 후

### Within Each User Story

- RED 태스크의 실패 목격 없이 GREEN 태스크 시작 금지 (헌장 Principle I — 위반 시 코드 삭제 후 재시작)
- GREEN은 해당 테스트를 통과시키는 최소 코드만 (YAGNI)
- 각 GREEN 후 전체 `npm test` 그린 유지

### Parallel Opportunities

- Phase 1: T002 ∥ T003 (서로 다른 대상, T001과도 무관)
- Phase 4: T017(신규 테스트 파일 + 상세 화면)은 T015·T016(store)과 파일이 겹치지 않아 병렬 가능
- Phase 7: T028은 T025~T027과 병렬 가능
- 그 외 스토어 태스크는 전부 `lib/store.tsx`·`__tests__/page-posts.test.tsx`를 공유 → 의도적으로 순차

## Parallel Example: Phase 4 (US2)

```bash
# 병렬 트랙 A (store):        T015 RED → T016 GREEN
# 병렬 트랙 B (detail 화면):  T017 RED → T018 GREEN
# 두 트랙은 파일이 겹치지 않는다:
#   A: lib/store.tsx, __tests__/page-posts.test.tsx
#   B: app/(app)/posts/[id]/page.tsx, __tests__/post-not-found.test.tsx
```

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Phase 1(게이트·전제) → Phase 2(T004 RLS — 필수 블로커)
2. Phase 3(US1) 완료 → quickstart S1로 독립 검증 → 이 시점에 배포 가능한 MVP
   (서버 측 격리는 T004가 이미 보장하므로 US1만으로도 안전)

### Incremental Delivery

- US1(등록·보관) → US2(격리 화면·찾을 수 없음) → US3(삭제) → US4(편집) 순으로
  각 checkpoint에서 quickstart 해당 시나리오를 통과시키며 증분 배포 가능

---

## Notes

- 총 28개 태스크: Setup 3 · Foundational 1 · US1 10 · US2 4 · US3 2 · US4 4 · Polish 4
- RED/GREEN이 태스크로 분리된 이유: 헌장이 "실패 목격"을 완료 조건으로 요구 — RED 태스크의 산출물은 "예상 이유로 실패하는 테스트 실행 로그"다
- `page` 테이블 구조 변경 금지(FR-007) — T004도 정책만 추가한다
- 모킹은 `@/lib/supabase` 경계 1곳만, 목 응답은 실측 row 전체 형상(Principle II)
- 커밋은 태스크 또는 논리 단위마다
