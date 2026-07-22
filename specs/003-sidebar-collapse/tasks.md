# Tasks: 사이드바 접기/펼치기

**Input**: Design documents from `/specs/003-sidebar-collapse/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md,
contracts/sidebar-contract.md, quickstart.md — 전부 존재. 정본 값(키·문구·CSS·
aria)은 [contracts/sidebar-contract.md](./contracts/sidebar-contract.md)를 따른다.

**Tests**: Tests are MANDATORY per the project constitution (Principle I:
Test-First, NON-NEGOTIABLE). 모든 구현 태스크는 `superpowers:test-driven-development`
스킬의 사이클을 따른다: 실패하는 테스트 작성 → **실패를 직접 확인(RED)** →
최소 구현 → **통과 확인(GREEN)**. RED 확인 없이 프로덕션 코드를 쓰지 않는다.

**Organization**: 유저 스토리별 페이즈. 모든 신규 테스트는 단일 파일
`__tests__/sidebar-collapse.test.tsx`에 축적된다(research.md §6) — 같은 파일을
만지는 테스트 태스크끼리는 [P] 불가.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: 병렬 가능(다른 파일, 미완료 태스크 의존 없음)
- **[Story]**: 유저 스토리 라벨(US1/US2/US3) — 스토리 페이즈에만 부여

## Path Conventions

단일 Next.js 앱(저장소 루트): `app/`, `components/`, `lib/`, `__tests__/`
(plan.md Project Structure 참조).

---

## Phase 1: Setup

**Purpose**: 깨끗한 기준선 확보 — 신규 인프라 없음(기존 스택 그대로)

- [X] T001 기준선 확인: `npm test` 실행, 기존 22개 테스트 전부 그린·무결한
      출력(에러/경고 없음)임을 확인하고 기록 — 이후 실패는 전부 이 기능 작업분

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: US1·US3의 두 토글 버튼이 공통으로 쓰는 프리미티브 확장
(계약 §2 — `IconButton`의 `ariaExpanded` prop). 프리미티브가 먼저 완성돼야
스토리 구현이 계약대로 진행된다.

**⚠️ CRITICAL**: US1 시작 전에 완료해야 한다

- [X] T002 RED: `__tests__/sidebar-collapse.test.tsx` **신규 생성** —
      IconButton 단위 테스트 3건: ① `ariaExpanded` 시 `aria-expanded="true"`
      ② `ariaExpanded={false}` 시 `"false"` ③ 미지정 시 속성 자체가 없음
      (기존 사용처 무영향 — 계약 §2). `npm test -- __tests__/sidebar-collapse.test.tsx`
      로 **①·②가 속성 부재로 실패함을 직접 확인**(③은 현행 동작이라 통과 —
      회귀 고정용)
- [X] T003 GREEN: `components/ui/IconButton.tsx`에 선택적
      `ariaExpanded?: boolean` prop 추가(지정 시에만 `aria-expanded` 출력) —
      최소 구현. 같은 명령으로 3건 전부 통과 확인
- [X] T004 [P] `DESIGN.md` §2.2(IconButton) props 목록에 `ariaExpanded` 반영
      (헌법 III — 문서 태스크, T003과 다른 파일이라 T005와 병렬 가능)

**Checkpoint**: IconButton이 계약 §2를 충족 — 유저 스토리 구현 시작 가능

---

## Phase 3: User Story 1 - 버튼 하나로 사이드바 접고 펼치기 (Priority: P1) 🎯 MVP

**Goal**: 사이드바 상단 접기 버튼 → 사이드바 전체 숨김·본문 확장, 본문 좌상단
펼치기 버튼 → 원상 복귀. 접힌 상태에서 펼치기 컨트롤 상시 노출, 사이드바 내부
상태(검색어) 보존.

**Independent Test**: 앱을 열고 토글 버튼 클릭 → 사이드바 소멸, 다시 클릭 →
동일 구성 복귀(spec US1 Independent Test). 자동화: 아래 T005 시나리오만으로
검증 가능. 브라우저: quickstart.md §2 절차 1–3·7·8.

### Tests for User Story 1 (MANDATORY — TDD per constitution) ⚠️

> **NOTE: 구현(T006) 전에 작성하고 FAIL을 직접 확인한다**

- [X] T005 [US1] RED: `__tests__/sidebar-collapse.test.tsx`에 AppShell 통합
      테스트 추가 — `@/lib/supabase` 세션 목 + `next/navigation`
      (`useRouter`/`usePathname`) 목 + `AppProvider` 래핑은
      `__tests__/auth-store.test.tsx`의 완전한 목 형태를 재사용(헌법 II).
      시나리오(research.md §6-1·2·3·6):
      ① 기본 렌더 — `<nav>`(글 검색 인풋 존재로 식별) 존재 + 접근성 이름
      "사이드바 접기" 버튼이 `aria-expanded="true"` ② 접기 클릭 — nav 부재 +
      "사이드바 펼치기" 버튼 `aria-expanded="false"` ③ 다시 펼치기 — nav 복귀,
      접기 전 입력한 검색어가 인풋에 유지(FR-008) ④ 3연타 — 최종 상태 수렴
      (Edge Case). **토글 버튼 부재로 전부 실패함을 직접 확인**
- [X] T006 [US1] GREEN: `components/AppShell.tsx` 수정 — `collapsed`
      `useState(false)`(영속화는 US3에서), 토글 핸들러, 사이드바 최상단
      `.sidebar__header` 행 + `<IconButton icon={PanelLeftClose}
      title="사이드바 접기" ariaExpanded />`, 접힘 시 `<nav>` 조건부 미렌더 +
      `.sidebar-expand` 래퍼 안 `<IconButton icon={PanelLeftOpen}
      title="사이드바 펼치기" ariaExpanded={false} />`(계약 §2·§3). 최소 구현 —
      T005 전부 + 기존 테스트 전체 그린 확인

### Implementation for User Story 1

- [X] T007 [P] [US1] `app/globals.css` App shell 섹션에 계약 §4의
      `.sidebar__header`·`.sidebar-expand` 블록 추가(신규 토큰 없음).
      jsdom은 스타일시트를 적용하지 않으므로 시각 검증은 quickstart.md §2
      절차 1로 수행(research.md §6의 E2E 위임 결정)
- [X] T008 [P] [US1] `DESIGN.md` 반영(헌법 III): §3.3 사이드바 구성에 헤더
      행·접기 버튼·접힘 상태(§3.1 골격 주석 포함), §1.7 아이콘 표에
      `PanelLeftClose`/`PanelLeftOpen`(size 16), §6.1 문구 표에
      "사이드바 접기"/"사이드바 펼치기"(계약 §5)

**Checkpoint**: US1 단독으로 완전 동작 — MVP. quickstart.md §2 절차 1–3·7·8로
독립 검증 가능

---

## Phase 4: User Story 2 - 페이지를 오가도 접힘 상태 유지 (Priority: P2)

**Goal**: 접힘/펼침 상태가 앱 내 화면 이동(홈↔상세↔마이)에서 유지된다(FR-005).

**Independent Test**: 사이드바를 접고 다른 화면으로 이동 → 접힘 유지
(spec US2 Independent Test). 브라우저: quickstart.md §2 절차 4.

### Tests for User Story 2 (MANDATORY — TDD per constitution) ⚠️

- [X] T009 [US2] `__tests__/sidebar-collapse.test.tsx`에 내비게이션 유지
      테스트 추가 — 접기 클릭 후 `usePathname` 목 반환값을 다른 경로
      (`/posts/post-1` 등)로 바꿔 `rerender` → nav 여전히 부재 + 펼치기 버튼
      유지·조작 가능(US2 Acceptance 1). **주의**: 이 동작은 App Router
      레이아웃 상태 보존(research.md §4)으로 T006 구현에서 이미 성립할 수
      있다 — 실행해서 **실패하면** AppShell을 수정(TDD 사이클), **통과하면**
      프레임워크 보장을 고정하는 회귀 테스트로 결과를 기록한다(신규
      프로덕션 코드 없음 → 헌법 I 위배 아님)

**Checkpoint**: US1+US2 동작 — 이동 간 유지 검증 완료

---

## Phase 5: User Story 3 - 다시 방문해도 마지막 상태 기억 (Priority: P3)

**Goal**: 마지막 선택을 `localStorage`(`mini-notion-sidebar`)에 저장, 새로고침·
재방문 시 복원. 손상값은 조용히 펼침 폴백(FR-006, 계약 §1).

**Independent Test**: 접고 새로고침 → 접힌 채 나타남(spec US3 Independent
Test). 자동화: 사전 저장값 주입 후 첫 렌더 상태 단언. 브라우저: quickstart.md
§2 절차 5–6.

### Tests for User Story 3 (MANDATORY — TDD per constitution) ⚠️

> **NOTE: 각 RED를 직접 확인한 뒤에만 해당 GREEN으로 진행**

- [X] T010 [US3] RED: `__tests__/sidebar-collapse.test.tsx`에 `lib/local-pref`
      단위 테스트 추가(실제 jsdom localStorage — 헌법 II) — ① write→read
      라운드트립 ② 무효값 저장 시 `null` ③ 키 부재 시 `null` ④ `setItem`이
      throw해도 `writeLocalPref`가 예외를 삼킴(스파이로 throw 주입).
      **모듈 부재(기능 부재)로 실패함을 직접 확인**
- [X] T011 [US3] GREEN: `lib/local-pref.ts` 신규 —
      `readLocalPref(key, allowed): string | null` +
      `writeLocalPref(key, value): void`(try/catch best-effort), 계약 §1·
      data-model.md §2의 최소 API만. T010 통과 확인
- [X] T012 [US3] RED: AppShell 영속화 테스트 추가 — ① 사전
      `localStorage["mini-notion-sidebar"]="collapsed"` → 첫 렌더부터 nav 부재
      (US3 Acceptance 1) ② 사전 `"banana"`(무효) → 펼침 기본값(Edge Case)
      ③ 접기 클릭 → 실제 localStorage 값이 `"collapsed"`, 펼치기 클릭 →
      `"expanded"`(계약 §1). **AppShell이 저장소 미연동이라 실패함을 직접 확인**
- [X] T013 [US3] GREEN: `components/AppShell.tsx` — `useState(() =>
      readLocalPref("mini-notion-sidebar", ["collapsed","expanded"]) ===
      "collapsed")` 지연 초기화(research.md §5) + 토글 핸들러에서
      `writeLocalPref`로 다음 상태 즉시 기록. T012 + 파일 전체 + `npm test`
      전체 그린 확인

**Checkpoint**: 세 스토리 모두 독립 동작

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: 완료 게이트·문서 정합·브라우저 검증

- [X] T014 완료 게이트(헌법 Development Workflow): `npm test` 전체 실행 —
      기존 22개 + 신규 전부 그린, 무결한 출력(에러·경고 0) 확인
- [ ] T015 quickstart.md §2 브라우저 검증 절차 1–8 수행(`npm run dev`,
      `verify` 스킬 활용 가능) — 본문 264px 확장(SC-002)·새로고침 무깜빡임
      (US3)·키보드 전용 조작(SC-005) 등 jsdom 밖 항목
      **[부분 완료 — 2026-07-22]** 자동 검증 통과분: `/`·`/login` 200 컴파일
      무오류, 워크트리 코드 서빙 확인(CSS 청크 경로), `.sidebar__header`·
      `.sidebar-expand` 규칙 서빙 확인. **남은 것**: 절차 1–8의 로그인 후
      시각·키보드 검증 — 실제 Google OAuth 로그인이 필요해 자동화 불가
      (자격 증명 입력 금지)하고 이 세션에서 가시 브라우저(wmux CLI 부재,
      Chrome 확장 미연결)를 쓸 수 없었음. 사용자가 localhost:3000 로그인 후
      quickstart §2 표를 따라 수행
- [X] T016 [P] 문서 최종 대조: `DESIGN.md` 반영분(§2.2·§3·§1.7·§6.1)이 계약
      §2·§4·§5 값과 일치하는지, quickstart.md §3 체크리스트 전 항목 충족
      확인

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: 즉시 시작 가능
- **Phase 2 (Foundational)**: T001 후. **US1을 블로킹**
- **Phase 3 (US1)**: Phase 2 완료 후
- **Phase 4 (US2)**: US1(T006) 완료 후 — 접힘 상태가 있어야 이동 유지를 검증
- **Phase 5 (US3)**: US1(T006) 완료 후 — 토글이 있어야 영속화를 연결.
  US2와는 독립(순서 교환 가능하나 우선순위대로 P2 → P3 권장)
- **Phase 6 (Polish)**: 모든 스토리 완료 후

### Task-level Dependencies

```text
T001 → T002 → T003 → T005 → T006 → { T007, T008, T009, (T010 → T011 → T012 → T013) } → T014 → T015 → T016
              T004 ──┘(T003 후 아무 때나, T005와 병렬)
```

- 같은 테스트 파일(`__tests__/sidebar-collapse.test.tsx`)을 만지는
  T002·T005·T009·T010·T012는 서로 병렬 불가(순차)
- `components/AppShell.tsx`를 만지는 T006·T013은 순차

### Parallel Opportunities

- T004(DESIGN.md) ∥ T005(테스트 파일) — 다른 파일
- T006 완료 후: T007(globals.css) ∥ T008(DESIGN.md) ∥ T009(테스트 파일)
- T016(문서 대조) ∥ T015의 브라우저 절차 — 단일 작업자 기준으로는 순차 권장

## Parallel Example: User Story 1

```bash
# T006 완료(GREEN) 후 세 파일을 병렬로:
Task: "T007 app/globals.css에 .sidebar__header/.sidebar-expand 추가"
Task: "T008 DESIGN.md §3.3/§1.7/§6.1 반영"
Task: "T009 내비게이션 유지 테스트 추가(__tests__/sidebar-collapse.test.tsx)"
```

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Phase 1 → Phase 2(IconButton prop) → Phase 3(US1)
2. **STOP & VALIDATE**: quickstart.md §2 절차 1–3·7·8 — 접기/펼치기 단독 데모 가능
3. 이 시점의 한계: 새로고침 시 상태 미복원(US3 미구현) — 스펙상 P3 가치

### Incremental Delivery

1. US1 → 독립 검증 → MVP 데모
2. US2 → 이동 유지 검증(테스트 1건 — 대부분 프레임워크 보장 고정)
3. US3 → 영속화 검증 → 전체 완료(T014–T016)
4. 각 체크포인트에서 `npm test` 전체 그린 유지 — 이전 스토리 무파괴

## Notes

- 모든 RED 태스크는 "실패를 직접 확인"이 완료 조건의 일부다 — 즉시 통과하면
  테스트를 고친다(T009의 명시된 예외적 결과 기록은 제외)
- 커밋은 태스크 또는 논리적 그룹 단위로
- 정본 값(키·문구·CSS·aria·아이콘)은 전부 contracts/sidebar-contract.md 참조 —
  태스크 간 값 불일치 금지
