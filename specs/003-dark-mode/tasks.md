# Tasks: 다크모드

**Input**: Design documents from `/specs/003-dark-mode/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/theme-contract.md, quickstart.md

**Tests**: Tests are MANDATORY per the project constitution (Principle I: Test-First, NON-NEGOTIABLE). 모든 구현 태스크는 `superpowers:test-driven-development`의 사이클을 따른다 — 실패하는 테스트 작성 → 실패 직접 확인(RED) → 최소 구현 → 통과 확인(GREEN). CSS 토큰 값 자체는 "설정"에 준해 단위 테스트 대상이 아니며(plan.md Constitution Check I) quickstart.md의 브라우저 검증으로 확인한다.

**Organization**: 유저 스토리별 그룹화 — 각 스토리는 독립적으로 구현·검증 가능한 증분이다.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: 병렬 실행 가능(다른 파일, 미완료 태스크 의존 없음)
- **[Story]**: 소속 유저 스토리(US1, US2, US3)
- 모든 태스크에 정확한 파일 경로 포함

## Path Conventions

단일 Next.js 앱(App Router) — plan.md Project Structure 기준: `app/`, `components/`, `lib/`, `__tests__/` 저장소 루트.

---

## Phase 1: Setup

**Purpose**: 작업 전 게이트 통과와 그린 베이스라인 확보

- [X] T001 워크트리에서 `npm test` 실행해 기존 스위트(22개) 전부 통과·에러/경고 0 확인 (그린 베이스라인 — 헌법 완료 게이트의 비교 기준)
- [X] T002 게이트 문서 정독: `DESIGN.md` §1(토큰)·§2.5(SidebarItem)·§3(사이드바)·§7(다크모드 TODO), `contracts/theme-contract.md` 전체, `node_modules/next/dist/docs/01-app/03-api-reference/02-components/script.md` (헌법 III·IV — 기억이 아닌 문서로 진행)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: 모든 스토리가 의존하는 테마 해석 코어와 토큰 계층 정비

**⚠️ CRITICAL**: 이 페이즈 완료 전에는 어떤 유저 스토리도 시작할 수 없다

- [X] T003 [RED] `__tests__/theme.test.tsx` 신규 작성 — `resolveTheme(stored, systemDark)` 진리표(저장값 light/dark/무효/부재 × 시스템 light/dark → data-model.md 해석 규칙), `readLocalPref`(허용값 검증·무효 정규화)·`writeLocalPref`(저장 차단 시 예외 없이 무시 — 실제 `localStorage`를 막아 검증) 실패 테스트 작성 후 `npm test -- __tests__/theme.test.tsx`로 **모듈 부재로 인한 실패를 직접 확인**
- [X] T004 [GREEN] `lib/theme.ts` 신규 생성 — `THEME_STORAGE_KEY`("mini-notion-theme"), `resolveTheme`, `readLocalPref`, `writeLocalPref` 최소 구현(contracts §4 시그니처), T003 테스트 통과 확인
- [X] T005 `app/globals.css` 시맨틱 이관 — `:root`에 신규 토큰 4종 라이트 값 추가(`--text-on-inverse: #ffffff`, `--scrollbar-thumb: #e2e3e5`, `--scrollbar-thumb-hover: #d3d5d8`, `--status-danger-soft: #fdeae9`) 후 contracts §6 정본 표의 7곳(`.brand-chip`, `.detail-char-count`, `.badge`, `.mn-scroll` thumb/scrollbar-color, `.detail-delete-btn:hover`, `.slash-menu__tile`·`.empty-state__tile` 전경) 토큰화 — 라이트 계산값 전부 동일(시각 회귀 0), `npm run dev`로 라이트 외관 불변 확인
- [X] T006 `DESIGN.md` §1.1에 신규 시맨틱 토큰 4종과 이관 사실 반영 (헌법 III — 구현과 동시 문서화)

**Checkpoint**: 테마 해석 코어 완성 + 전 색상이 시맨틱 토큰 경유 — 스토리 구현 시작 가능

---

## Phase 3: User Story 1 - 사이드바 토글로 다크모드 전환 (Priority: P1) 🎯 MVP

**Goal**: 사이드바 토글 버튼 클릭으로 앱 전체가 즉시 다크↔라이트 전환 (세션 내, FR-001·002·003)

**Independent Test**: 토글 클릭 시 전 화면(사이드바·목록·편집)이 어두운 테마로 바뀌고 재클릭 시 밝은 테마로 복귀하는지 확인 (quickstart.md §2)

### Tests for User Story 1 (MANDATORY — TDD per constitution) ⚠️

> **NOTE: 테스트를 먼저 작성하고, 구현 전에 실패를 직접 확인한다**

- [X] T007 [P] [US1] `__tests__/theme.test.tsx`에 `useTheme` 훅 실패 테스트 추가 — 마운트 시 유효 테마를 실제 `document.documentElement.dataset.theme`에 반영, `toggle()` 호출 시 속성 즉시 반전과 `theme` 값 갱신(contracts §4). 실행해 실패 확인
- [X] T008 [P] [US1] `__tests__/theme-toggle.test.tsx` 신규 작성 — 사이드바 토글 버튼 실패 테스트: `data-testid="theme-toggle"` 존재, 라이트 상태에서 `다크 모드` 라벨+Moon 아이콘, 클릭 → `data-theme="dark"` + `라이트 모드` 라벨+Sun 아이콘, `<button type="button">`·`aria-label` 일치(contracts §3, FR-003). 실행해 실패 확인
- [X] T009 [US1] [RED 확인 게이트] `npm test -- __tests__/theme.test.tsx __tests__/theme-toggle.test.tsx` — T007·T008이 기능 부재로 실패함을 확인(오타·임포트 에러로 인한 실패는 무효, 수정 후 재확인)

### Implementation for User Story 1

- [X] T010 [US1] `lib/theme.ts`에 `useTheme` 훅 구현 — `{ theme, toggle }` 반환, 토글 시 유효 테마 반전을 `data-theme`에 즉시 반영(contracts §4 — localStorage 쓰기는 US2에서 추가), T007 통과 확인
- [X] T011 [US1] `components/AppShell.tsx` 사이드바 하단(`.sidebar__scroll` 아래, `.sidebar__profile` 위)에 테마 토글 버튼 추가 — SidebarItem 시각 패턴 재사용, `lucide-react`의 `Moon`/`Sun` `size={16}`, contracts §3 계약 전체 충족, T008 통과 확인
- [X] T012 [US1] `app/globals.css`에 `html[data-theme="dark"]` 오버라이드 블록 추가 — contracts §5 표(5.1 Surface, 5.2 Text, 5.3 Border/Accent/Status/신규 4종)의 다크 값 그대로, 원시 램프(`--gray-*`) 불변(research.md §5). 단위 테스트 비대상(설정) — quickstart §2로 검증
- [X] T013 [US1] `DESIGN.md` 갱신 — §1.8 다크 토큰 표 신설(contracts §5 반영), 토글 컴포넌트 규격(§2), §3.3 사이드바 배치 (헌법 III — 구현과 동시 문서화)

**Checkpoint**: 토글로 전 화면 즉시 전환 동작(새로고침 시 초기화는 US2 전까지 허용) — quickstart §2 독립 검증 가능 (MVP!)

---

## Phase 4: User Story 2 - 선택한 테마 유지 (Priority: P2)

**Goal**: 선택 테마가 저장되어 새로고침·재방문 시 깜빡임(FOUC) 없이 그대로 적용 (FR-004·007)

**Independent Test**: 다크 전환 → 새로고침 시 라이트 화면이 한 프레임도 비치지 않고 다크 유지 (quickstart.md §3)

### Tests for User Story 2 (MANDATORY — TDD per constitution) ⚠️

- [X] T014 [US2] 실패 테스트 추가 후 실패 확인 — ① `__tests__/theme-toggle.test.tsx`: 토글 클릭 시 실제 `localStorage["mini-notion-theme"]`에 명시 선택 기록(contracts §2) ② `__tests__/theme.test.tsx`: `THEME_INIT_SCRIPT` 문자열을 `new Function`으로 실행 → 저장값 dark/light/무효/부재 각각에서 첫 실행 직후 `document.documentElement.dataset.theme`이 올바른 유효 테마(무효·부재는 시스템 따름)로 세팅되고, 저장소 접근 차단 시에도 예외 없이 동작(실 DOM·실 localStorage 단언 — 헌법 II)

### Implementation for User Story 2

- [X] T015 [US2] `lib/theme.ts` 확장 — `useTheme.toggle`에 `writeLocalPref` 호출 추가, `THEME_INIT_SCRIPT` 상수(순수 문자열) 구현: 저장값 읽기 → `resolveTheme` 로직 인라인 → `data-theme` 세팅, 전체 try/catch(contracts §2·§4), T014 통과 확인
- [X] T016 [US2] `app/layout.tsx` 수정 — `<head>`에 인라인 `<script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }}>` 주입(첫 페인트 전 실행 — research.md §2, `next/script` 부적합 근거 확인됨), `<html suppressHydrationWarning>` 추가. async Server Component라 단위 테스트 비대상(헌법 Technology Stack) — quickstart §3의 no-FOUC 검증으로 확인

**Checkpoint**: US1+US2 — 전환·지속·no-FOUC 동작, quickstart §3 독립 검증 가능

---

## Phase 5: User Story 3 - 첫 방문 시 시스템 설정 따르기 (Priority: P3)

**Goal**: 저장 선택이 없으면 시스템 테마를 초기값으로 쓰고 변경을 실시간 추종, 직접 선택이 항상 우선 (FR-005·006)

**Independent Test**: 저장값 없이 시스템 다크 에뮬레이션으로 접속 → 다크 표시, 에뮬레이션 전환 → 실시간 추종, 토글 선택 후엔 불변 (quickstart.md §4)

> 참고: "저장값 부재 → 시스템 따름" 정적 해석은 T003(resolveTheme 진리표)과 T014(init 스크립트)에서 이미 검증됨. 이 페이즈는 **실시간 추종 리스너**를 추가한다.

### Tests for User Story 3 (MANDATORY — TDD per constitution) ⚠️

- [X] T017 [US3] `__tests__/theme.test.tsx`에 실패 테스트 추가 후 실패 확인 — `THEME_INIT_SCRIPT`가 `matchMedia("(prefers-color-scheme: dark)")`의 `change` 리스너를 등록하고: ① 저장값 없음 + 시스템 변경 이벤트 → `data-theme` 실시간 갱신(FR-005) ② 저장값 존재 + 동일 이벤트 → no-op(FR-006 가드). jsdom 미지원 지점만 최소 대체 — `matches`/`media`/`addEventListener`/`removeEventListener` 전부 갖춘 완전한 matchMedia 구현으로(불완전 목 금지 — 헌법 II, research.md §6)

### Implementation for User Story 3

- [X] T018 [US3] `lib/theme.ts`의 `THEME_INIT_SCRIPT`에 가드된 `change` 리스너 추가 — 콜백에서 저장값 존재 시 no-op(research.md §3: 등록/해제 관리 대신 콜백 가드), 사이드바 없는 로그인 화면에서도 동작(contracts §4), T017 통과 확인

**Checkpoint**: 세 스토리 전부 독립 동작 — quickstart §4 독립 검증 가능

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: 완료 게이트·E2E 검증·문서 정합

- [X] T019 `npm test` 전체 실행 — 기존+신규 스위트 전부 통과, 출력 무결(에러·경고 0), 헌법 원칙 I 완료 체크리스트(모든 신규 함수에 테스트, RED 목격, 최소 구현) 항목별 확인
- [X] T020 quickstart.md §2–§6 브라우저 검증 실행(`verify` 스킬 활용) — 토글 전환(US1), no-FOUC·지속성(US2), 시스템 에뮬레이션 추종·우선순위(US3), 다크 상태 전 화면·상태 대비 스캔(SC-004: 이슈 0건, 기준 contracts §5), 저장 차단 엣지 케이스
- [X] T021 `DESIGN.md` §7의 "다크모드 미구현" TODO 해소(라인 947–948) 및 문서↔코드 최종 대조 — contracts §5 표는 병합 시점에 동결(정본은 DESIGN.md로 이관), `specs/003-dark-mode/checklists/requirements.md` 상태 확인

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: 의존 없음 — 즉시 시작
- **Foundational (Phase 2)**: Phase 1 완료 후 — **모든 유저 스토리를 블록**
- **US1 (Phase 3)**: Phase 2 완료 후. 다른 스토리 의존 없음
- **US2 (Phase 4)**: Phase 2 완료 후. `useTheme`(T010) 확장이 포함되므로 US1 완료 후 진행 권장
- **US3 (Phase 5)**: Phase 2 완료 후. `THEME_INIT_SCRIPT`(T015) 확장이므로 US2 완료 후 진행
- **Polish (Phase 6)**: 모든 스토리 완료 후

### User Story Dependencies

- **US1 (P1)**: Foundational만 필요 — 독립 MVP
- **US2 (P2)**: 독립 검증 가능하나 구현상 `useTheme`(US1 산출)에 쓰기 로직을 추가 — US1 뒤 순차
- **US3 (P3)**: 독립 검증 가능하나 구현상 `THEME_INIT_SCRIPT`(US2 산출)에 리스너를 추가 — US2 뒤 순차

### Within Each User Story

- 테스트 작성 → **실패 직접 확인** → 최소 구현 → 통과 확인 (헌법 원칙 I — 예외 없음)
- `lib/theme.ts` 로직 → UI(`AppShell.tsx`) → 스타일(`globals.css`) → 문서(`DESIGN.md`)

### Parallel Opportunities

- T007·T008: 서로 다른 테스트 파일 — 병렬 작성 가능
- 그 외는 같은 파일(`lib/theme.ts`, `globals.css`)을 순차 확장하므로 병렬 불가 — 단일 세션 순차 실행이 안전

---

## Parallel Example: User Story 1

```bash
# US1 테스트 2건을 병렬로 작성 (서로 다른 파일):
Task: "T007 — __tests__/theme.test.tsx에 useTheme 훅 실패 테스트 추가"
Task: "T008 — __tests__/theme-toggle.test.tsx 신규 작성(토글 버튼 계약 테스트)"

# 이후 T009에서 두 파일의 RED를 한 번에 확인:
npm test -- __tests__/theme.test.tsx __tests__/theme-toggle.test.tsx
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Phase 1: Setup (베이스라인 + 게이트 문서)
2. Phase 2: Foundational (resolveTheme 코어 + 토큰 이관) — CRITICAL
3. Phase 3: US1 (토글 전환)
4. **STOP and VALIDATE**: quickstart §2로 US1 독립 검증 → 배포/데모 가능 (세션 내 전환 완결)

### Incremental Delivery

1. Setup + Foundational → 코어 준비
2. + US1 → 토글 전환 검증 → **MVP!**
3. + US2 → 지속성·no-FOUC 검증 → 배포/데모
4. + US3 → 시스템 추종 검증 → 배포/데모
5. Polish → 대비 스캔·엣지 케이스·문서 동결 → 최종 완료

각 증분은 이전 스토리를 깨지 않고 가치를 더한다.

---

## Notes

- [P] = 다른 파일 + 미완료 의존 없음. 이 기능은 단일 모듈(`lib/theme.ts`) 중심이라 병렬 기회가 의도적으로 적다(헌법 V — 파일 분산보다 단순성)
- 모든 태스크 완료 시점마다 커밋 권장
- RED 없이 GREEN 금지: 테스트가 즉시 통과하면 기존 동작을 테스트한 것 — 테스트를 고친다
- CSS 값(T005·T012)의 정답 기준은 contracts §5·§6 표 — 임의 값 생성 금지(헌법 III)
- 각 체크포인트에서 멈추고 quickstart 해당 절로 독립 검증 가능
