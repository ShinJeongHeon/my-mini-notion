# Tasks: 자기소개 (003-profile-introduction)

**Input**: Design documents from `/specs/003-profile-introduction/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/profile-store.md, quickstart.md

**Tests**: 테스트는 헌법 원칙 I(Test-First, NON-NEGOTIABLE)에 따라 **의무**다. 모든 구현
태스크는 `superpowers:test-driven-development`의 사이클을 따른다: RED 태스크에서 실패
테스트를 작성하고 `npm test`로 **실패를 직접 확인**(기능 부재로 실패해야 유효) → GREEN
태스크에서 통과하는 최소 코드 작성 → `npm test` 전체 green + 무결한 출력 확인.

**Organization**: 스토리별 독립 구현·검증이 가능하도록 사용자 스토리 단위로 그룹화.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: 병렬 실행 가능(다른 파일, 미완료 태스크 의존 없음)
- **[Story]**: 소속 사용자 스토리(US1/US2/US3)
- 설명에 정확한 파일 경로 포함

## Path Conventions

Next.js 단일 웹앱(저장소 루트): `app/`, `components/`, `lib/`, `__tests__/` — plan.md
Project Structure 참조.

---

## Phase 1: Setup (준비 — 코드 변경 없음)

**Purpose**: 헌법 게이트 이행과 기준선 확보. 파일 변경이 없는 확인 태스크다.

- [X] T001 헌법 IV 이행 — `node_modules/next/dist/docs/`에서 클라이언트 컴포넌트 관련 가이드를 읽고, 이 기능이 쓰는 관행(`"use client"` 내 useState/이벤트 핸들러/controlled textarea)에 브레이킹 체인지·deprecation이 없는지 확인. 발견 시 research.md §8에 추가 기록
- [X] T002 [P] 기준선 확인 — `npm test` 전체 실행, 22개 통과 + 무결한 출력(에러·경고 0)을 확인하고 시작
- [X] T003 [P] 헌법 III 이행 — `DESIGN.md` §1(토큰)·§2.7.6(`.field-input`)·§4.4(마이페이지 해부)·§6.5(카피)를 재확인. research.md §6의 `.field-textarea` 파생 스펙(토큰 조합)과 어긋나는 점이 없는지 대조

**Checkpoint**: 기준선 green — 스토리 구현 시작 가능

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: 없음 — 이 기능은 차단형 선행 인프라가 없다. DB는 사용자가 이미 만든
`public.profile.introduction`을 그대로 쓰고(변경 금지, FR-007), 스토어·화면·테스트
장치가 전부 기존에 존재한다. 바로 Phase 3으로 진행한다.

---

## Phase 3: User Story 1 - 자기소개 등록하기 (Priority: P1) 🎯 MVP

**Goal**: 마이페이지 별명 아래 자기소개 입력란을 추가하고, 기존 "변경사항 저장" 버튼
한 번으로 별명+자기소개를 단일 profile 업데이트로 함께 저장한다.

**Independent Test**: 자기소개가 비어 있는 계정으로 마이페이지 진입 → 자기소개 입력 →
저장 버튼 → "저장되었습니다" 확인 표시. (quickstart.md 표 #1–3)

### Tests for User Story 1 (MANDATORY — TDD per constitution) ⚠️

> **NOTE: 테스트를 먼저 작성하고, 구현 전에 `npm test`로 실패(saveProfile 부재)를 직접 확인한다**

- [X] T004 [P] [US1] RED: `__tests__/auth-store.test.tsx`의 "별명 저장" 테스트를 saveProfile 계약(contracts/profile-store.md §1.2)으로 전환 — Probe가 `app.saveProfile({ name: "새 별명", introduction: "소개글\n둘째 줄" })`을 호출하고 update 목이 patch `{ name: "새 별명", introduction: "소개글\n둘째 줄" }` + `"user-1"`로 호출됨을 단언(줄바꿈 원문 보존 계약 포함). update 목의 patch 타입을 `{ name: string | null; introduction: string | null }`로 확장. `npm test -- __tests__/auth-store.test.tsx` 실패 확인
- [X] T005 [P] [US1] RED: 신규 `__tests__/mypage-introduction.test.tsx` 작성 — auth-store.test.tsx의 hoisted supabase 목 패턴을 재사용해 `<AppProvider><MyPage/></AppProvider>`를 실제 렌더(목 동작이 아닌 실제 컴포넌트 검증, 헌법 II). 단언: (1) `label` "자기소개" + `textarea#introduction.field-textarea`가 별명 필드 아래 렌더되고 `maxLength=500`, placeholder "자기소개를 입력하세요" (2) 자기소개 입력 후 "변경사항 저장" 클릭 → update 목이 introduction 포함 patch로 호출되고 "저장되었습니다" 노트 표시 (3) update 목이 error를 반환하면 alert 호출(spy) + textarea 값 유지(FR-006). `npm test -- __tests__/mypage-introduction.test.tsx` 실패 확인

### Implementation for User Story 1

- [X] T006 [US1] GREEN: `lib/store.tsx` — `saveNickname` 제거, `saveProfile(fields: { name: string; introduction: string }): Promise<boolean>` 구현(contracts §1.2): name은 기존 규칙(`trim() || null`), introduction은 이 단계에서는 원문 그대로, 로컬 상태 낙관 갱신 후 단일 `update({ name, introduction }).eq("user_id", userId)`. AppStore 타입 갱신. T004 green + 기존 테스트 회귀 0 확인 — T005는 T007에서 green이 되는 것이 정상 (T004, T005의 스토어 계약 부분에 의존)
- [X] T007 [US1] GREEN: `app/(app)/mypage/page.tsx`에 introDraft state + 자기소개 필드(`.mypage-field`: label "자기소개" + `textarea#introduction.field-textarea` maxLength 500) 추가, saveProfile 호출로 전환 + `app/globals.css`에 `.field-textarea` 조각 추가(research.md §6: `.field-input` 토큰 파생 — bg `--surface-card`, border `1px var(--border-default)`, radius-md, font 14, `min-height: 96px`, `padding: 10px 12px`, `line-height: 1.6`, `resize: vertical`, `font-family: inherit`, `:focus`는 `--border-focus`+`--shadow-focus`). T005 통과 + 전체 green 확인 (T006에 의존)
- [X] T008 [US1] `DESIGN.md` 반영(헌법 III — 코드와 같은 변경에서) — §2.7에 `.field-textarea` 조각 항목 추가, §4.4 마이페이지 해부에 자기소개 필드(별명과 이메일 사이) 반영, §6.5 카피 표에 label "자기소개"·placeholder "자기소개를 입력하세요" 추가, §1.2 타입 스케일 표에 신규 사용처 반영 (T007에 의존)

**Checkpoint**: US1 단독으로 완전 동작 — 등록 MVP 검증 가능

---

## Phase 4: User Story 2 - 저장된 자기소개 조회하기 (Priority: P2)

**Goal**: 재진입·새로고침·재로그인 시 저장된 자기소개가 입력란에 채워져 표시된다.
로딩 전 빈 값이 저장값을 덮어쓰지 않는다.

**Independent Test**: 자기소개 저장 → 새로고침·재로그인 → 저장한 내용이 그대로
textarea에 표시. (quickstart.md 표 #4–5)

### Tests for User Story 2 (MANDATORY — TDD per constitution) ⚠️

- [ ] T009 [P] [US2] RED: `__tests__/auth-store.test.tsx` — profileRow 목을 실제 select 형상 전체 `{ name, image_path, introduction }`로 확장(부분 목 금지, 헌법 II · contracts §4-1)하고 테스트 추가: (1) profile 행에 introduction이 있으면 `app.introduction`으로 노출된다 (2) localStorage `mini-notion-v1` 페이로드에 introduction이 포함되어 저장·복원된다(data-model.md §2). 실패 확인
- [ ] T010 [P] [US2] RED: `__tests__/mypage-introduction.test.tsx` — 저장된 자기소개가 있는 계정(목 profileRow에 introduction 설정)으로 렌더 → `waitFor`로 textarea 값이 저장값으로 채워짐을 단언(로딩 완료 후 채움 = 빈 값이 저장값을 덮지 않음, US2-3). 실패 확인

### Implementation for User Story 2

- [ ] T011 [US2] GREEN: `lib/store.tsx` — `AppState.introduction: string | null` 추가, syncProfile select를 `"name, image_path, introduction"`으로 확장(insert 폴백의 select 동일, introduction은 insert 값에 넣지 않음 — contracts §2.1), setState 반영, localStorage 저장·복원에 introduction 포함, `AppStore.introduction` 노출. T009 green + 기존 테스트 회귀 0 확인 — T010은 T012에서 green이 되는 것이 정상
- [ ] T012 [US2] GREEN: `app/(app)/mypage/page.tsx` — draft 동기화 이펙트 추가: `useEffect([app.loaded, app.introduction])`에서 사용자가 아직 자기소개를 입력하지 않은 동안(pristine ref)만 `setIntroDraft(app.introduction ?? "")`. `loaded`가 syncProfile 완료 전에 true가 되는 경우(캐시 없는 새 기기)를 커버하고, 입력 시작 후에는 덮어쓰지 않는다(contracts §3). T010 통과 + 전체 green 확인 (T011에 의존)

**Checkpoint**: US1+US2 — 등록·조회 왕복이 완전 동작

---

## Phase 5: User Story 3 - 자기소개 수정·삭제하기 (Priority: P3)

**Goal**: 기존 자기소개를 고쳐 재저장하거나, 전부 지워(또는 공백만 입력해) 미등록
상태(null)로 되돌린다.

**Independent Test**: 기존 내용 수정 저장 후 새로고침 시 수정본 표시, 전부 지우고 저장
후 빈 입력란 + placeholder 표시. (quickstart.md 표 #6–7)

> 참고: "수정 후 재저장" 경로는 US2(채움)+US1(저장)과 동일 코드 경로라 즉시 통과하는
> 테스트가 되므로(헌법 I — 즉시 통과 테스트는 무효) RED 대상은 **비우기 정규화**다.
> 수정 경로는 quickstart.md 표 #6으로 검증한다.

### Tests for User Story 3 (MANDATORY — TDD per constitution) ⚠️

- [ ] T013 [P] [US3] RED: `__tests__/auth-store.test.tsx` — 공백·줄바꿈만인 introduction(`"  \n  "`)으로 saveProfile 호출 시 update patch가 `introduction: null`임을 단언(FR-004, contracts §4-3). 실패 확인(현재는 원문 그대로 전달되므로 실패해야 정상)
- [ ] T014 [P] [US3] RED: `__tests__/mypage-introduction.test.tsx` — 기존 자기소개가 채워진 상태에서 textarea를 전부 비우고 저장 → update patch `introduction: null` + 저장 후 textarea가 빈 값·placeholder 노출 상태임을 단언(US3-2). 실패 확인

### Implementation for User Story 3

- [ ] T015 [US3] GREEN: `lib/store.tsx` — saveProfile에 정규화 추가: `introduction.trim() === ""`이면 `null`, 아니면 원문 그대로(내부 줄바꿈·공백 무가공 — research.md §3). T013·T014 통과 + 전체 green 확인

**Checkpoint**: 세 스토리 전부 독립 검증 가능

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: 완료 게이트·회귀·실환경 검증

- [ ] T016 헌법 완료 게이트 — `npm test` 전체 통과 + 무결한 출력(에러·경고 0), 기존 테스트(post-cover·char-count·smoke) 회귀 0 확인(FR-008/SC-004). 원칙 I 완료 체크리스트(모든 새 동작에 테스트 존재·RED 목격·최소 구현) 자체 점검
- [ ] T017 [P] quickstart.md 표 #1–11 실환경 검증 — `npm run dev` + 실제 로그인으로 수동 재생(브라우저 자동화가 가능하면 `/verify` 스킬 사용). Supabase `profile` 스키마가 시작 시점과 동일함(변경 0건, FR-007)을 재확인
- [ ] T018 [P] 마무리 정리 — 저장소 전체에서 `saveNickname` 잔존 참조 0건 검색 확인, DESIGN.md §8 커버리지 체크리스트와 실제 변경(§2.7 조각·§4.4·§6.5) 대조, specs 문서와 구현의 어긋남이 있으면 문서 갱신

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: 의존 없음 — 즉시 시작
- **Foundational (Phase 2)**: 해당 없음(태스크 0개)
- **User Stories (Phase 3–5)**: Setup 완료 후. **순서 권장 P1 → P2 → P3** — US2의
  draft 채움과 US3의 비우기 UI는 US1이 만든 textarea·saveProfile 위에 쌓이므로
  이 기능은 순차 진행이 가장 단순하다(스토리별 검증 기준은 각자 독립).
- **Polish (Phase 6)**: 원하는 스토리 완료 후 (T016 → T017·T018)

### Within Each User Story

- RED 태스크(테스트 작성 + 실패 목격) → GREEN 태스크(최소 구현 + 통과 목격) 순서 강제
- 스토어(lib/store.tsx) → 화면(mypage/page.tsx) → 문서(DESIGN.md) 순서
- 각 GREEN 태스크 종료 시 `npm test` 전체 green 확인 후 커밋

### Parallel Opportunities

- Phase 1: T002 ∥ T003 (T001과도 병렬 가능 — 모두 읽기 전용)
- US1: T004 ∥ T005 (서로 다른 테스트 파일)
- US2: T009 ∥ T010 (서로 다른 테스트 파일)
- US3: T013 ∥ T014 (서로 다른 테스트 파일)
- Polish: T017 ∥ T018
- 구현(GREEN) 태스크는 같은 파일(lib/store.tsx, mypage/page.tsx)을 연쇄 수정하므로 병렬 불가

## Parallel Example: User Story 1

```bash
# US1의 RED 테스트 2건을 함께 작성 (서로 다른 파일):
Task: "T004 auth-store.test.tsx의 별명 저장 테스트를 saveProfile 계약으로 전환"
Task: "T005 mypage-introduction.test.tsx 신규 작성 (렌더·저장·실패 시나리오)"

# 실패 확인은 한 번에:
npm test   # 두 파일 모두 saveProfile 부재로 실패해야 유효한 RED
```

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Phase 1(Setup) 완료 → 기준선 green
2. Phase 3(US1) 완료: T004·T005 RED → T006·T007 GREEN → T008 문서
3. **STOP & VALIDATE**: quickstart.md 표 #1–3으로 US1 단독 검증 → 배포/데모 가능(MVP)

### Incremental Delivery

1. US1(등록) → 독립 검증 → MVP
2. US2(조회) 추가 → 표 #4–5 검증
3. US3(수정·삭제) 추가 → 표 #6–7 검증
4. Polish(T016–T018) → 완료 선언

## Notes

- 사용자 DB(`public.profile`)는 어떤 태스크에서도 변경하지 않는다 — 마이그레이션·SQL
  실행 태스크가 없는 것이 정상이다(FR-007)
- 목은 실제 데이터 형상 전체(`{ name, image_path, introduction }`)를 반영한다(헌법 II)
- 원칙 I 예외 기록: `app/globals.css`의 `.field-textarea` 룰셋은 jsdom 유닛 테스트로
  실패를 목격할 수 없는 스타일 선언이므로, 테스트는 마크업 계약(className·maxLength·
  placeholder)으로 갈음하고 시각 결과는 DESIGN.md 게이트(헌법 III) + quickstart 실환경
  검증(T017)으로 확인한다 — /speckit-analyze 보고(CA1) 후 /speckit-implement 진행으로
  승인된 것으로 기록. T007+T008은 같은 커밋으로 묶는다(헌법 III "함께 반영")
- 각 태스크(또는 논리 그룹) 완료 후 커밋, 체크포인트마다 스토리 독립 검증 가능
