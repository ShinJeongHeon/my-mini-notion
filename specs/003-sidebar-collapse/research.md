# Research: 사이드바 접기/펼치기 (003-sidebar-collapse)

Phase 0 산출물. Technical Context의 미확정 사항을 결정으로 확정한다.
근거 소스: `DESIGN.md`(전체 §1–§8), `components/AppShell.tsx`,
`components/ui/IconButton.tsx`(§2.2), `app/globals.css` 앱 셸 섹션,
`node_modules/next/dist/docs/01-app/01-getting-started/03-layouts-and-pages.md`,
`specs/003-dark-mode/research.md` §4(로컬 선호값 공유 계획),
`__tests__/auth-store.test.tsx`·`__tests__/post-detail-char-count.test.tsx`(목 패턴).

## 1. 접힘 메커니즘 — 조건부 렌더링 (vs CSS 숨김 vs 폭 애니메이션)

- **Decision**: 접힘 상태에서 `<nav className="sidebar">` 서브트리를 **렌더링하지
  않는다**(React 조건부 렌더링). 전환 애니메이션은 넣지 않는다(즉시 전환).
- **Rationale**:
  - FR-002(전체 콘텐츠 숨김 + 본문 확장): `.app-body`는 `display:flex`이고
    `.app-main`이 `flex:1`이므로(DESIGN.md §3.1) nav가 사라지면 본문이 사이드바
    폭(264px)만큼 자동으로 넓어진다 — CSS 수정 없이 레이아웃이 성립.
  - Edge Case(키보드): 언마운트된 요소는 탭 순서·접근성 트리에서 자동 제외 —
    `display:none`과 동등하되 별도 CSS가 필요 없다.
  - FR-008(상태 보존): 검색어 `search` 상태는 nav가 아니라 `AppShell`에 살고
    있으므로(§3.5) 언마운트해도 보존된다. 글 목록·활성 항목은 스토어/`pathname`
    파생값이라 다시 펼칠 때 최신 상태로 재렌더 — Acceptance 2의 "목록은 최신
    상태 반영"까지 자동 충족.
  - FR-007(1초 이내·깜빡임 없음): 단일 setState → 단일 리렌더로 즉시 완료.
    애니메이션은 스펙이 요구하지 않으며(YAGNI, 헌법 V) 미니 노션의 모션 원칙은
    "조용한 모션"(DESIGN.md §0) — 레이아웃 전환에 기존 앱은 애니메이션을 쓰지
    않는다.
- **Alternatives considered**:
  - `.sidebar--collapsed { display:none }` 클래스: 동등하나 DOM을 유지할 이유
    (보존해야 할 nav 내부 상태)가 없다 — 스펙이 요구하는 상태는 전부 nav 밖에
    있다. React 조건부가 더 관용적이고 테스트 단언(존재/부재)도 명확.
  - `width: 0` + `transition`: 부드러운 전환을 얻지만 내부 콘텐츠 squish 방지용
    `min-width`/`overflow` 보정과 transition 종료 후 포커스 제외 처리가 추가로
    필요. 스펙 요구 없음 → 기각(헌법 V).
  - 사이드바 스크롤 위치: 언마운트로 초기화될 수 있으나 스펙 FR-008의 열거
    대상(검색어·글 목록·활성 항목·프로필 이동)이 아니며 브라우저별 보존이
    보장되지 않는 항목 — 범위 밖으로 확정.

## 2. 저장 방식 — 전용 키 + 공유 접근자 `lib/local-pref.ts`

- **Decision**: 전용 키 `mini-notion-sidebar`에 원시 문자열
  `"collapsed" | "expanded"`를 저장한다. 접근자는 신규 모듈 `lib/local-pref.ts`의
  제네릭 2함수로 구현한다:
  - `readLocalPref(key, allowed)` → 저장값이 `allowed`에 있으면 그 값, 없음·무효·
    읽기 예외 시 `null`
  - `writeLocalPref(key, value)` → try/catch로 감싼 best-effort 쓰기(실패 무시)
  기본값은 펼침: `readLocalPref(...) === "collapsed"`만 접힘으로 해석(FR-006).
- **Rationale**:
  - 기존 `mini-notion-v1` 키는 스토어 로드 사이클·스키마 검증에 묶여 있다
    (DESIGN.md §5.6). UI 선호값을 넣으면 데이터 스키마 변경 + 스토어 결합이
    생긴다. `003-dark-mode` research §4가 같은 이유로 전용 키를 확정했다.
  - 제네릭 형태는 dark-mode research §4의 "후속 기능이 공유 접근자를 import해
    재사용"하는 계획과 합치. 다크모드가 아직 미구현이므로(`lib/theme.ts` 부재
    확인) 이 기능이 접근자를 먼저 만들고, 다크모드가 이를 재사용하게 된다 —
    지금 필요한 최소 API(2함수)만 만들므로 YAGNI 위반이 아니다.
  - Edge Case(저장값 손상): `allowed` 화이트리스트 검증 + try/catch 폴백으로
    "기본값(펼침) 동작, 오류 비노출"을 코드 레벨에서 강제.
- **Alternatives considered**: `mini-notion-v1` 확장(스토어 결합·스키마 마이그레이션
  비용), 쿠키(SSR 분기 필요 없음 — AppShell은 로그인 확인 전 `null`을 렌더하므로
  첫 페인트 깜빡임 문제가 애초에 없다), 다크모드 구현 대기(순서 역전 — 이 기능이
  먼저 진행 중).

## 3. 토글 컨트롤 — IconButton 재사용 + `PanelLeftClose`/`PanelLeftOpen`

- **Decision**:
  - **접기 버튼(펼침 상태)**: 사이드바 최상단에 신규 헤더 행
    `.sidebar__header`(우측 정렬)를 추가하고 그 안에
    `<IconButton icon={PanelLeftClose} title="사이드바 접기" ariaExpanded />`.
  - **펼치기 버튼(접힘 상태)**: 본문 좌상단(Clarifications 확정) —
    `.sidebar-expand` 래퍼(`position: fixed; top: 56px; left: 12px; z-index: 10`)
    안에 `<IconButton icon={PanelLeftOpen} title="사이드바 펼치기"
    ariaExpanded={false} />`.
  - `IconButton`에 선택적 `ariaExpanded?: boolean` prop을 추가해
    `aria-expanded`로 매핑한다(미지정 시 속성 미출력 — 기존 사용처 무영향).
- **Rationale**:
  - 헌법 III: 새 버튼을 만들지 않고 기존 프리미티브 `IconButton`(§2.2 — title이
    `aria-label`로 매핑됨)을 재사용. `title` 문구가 접근성 이름을, `aria-expanded`가
    상태를 제공해 FR-004를 충족한다.
  - 아이콘: 설치된 lucide-react에 `PanelLeftClose`/`PanelLeftOpen` 존재 확인
    (`node_modules/lucide-react/dist/esm/icons/panel-left-{close,open}.mjs`).
    사이드바 패널 개폐를 도상 그대로 표현하는 표준 쌍 — `ChevronsLeft/Right`보다
    의미가 명확(셰브론은 상단바 `ChevronsUpDown` 등 다른 용도로 이미 사용 중).
  - 펼치기 버튼 위치 값: `top: 56px` = 상단바 높이 48px + 8px(간격 스케일),
    `left: 12px` = 상단바 좌우 패딩 스케일(§1.6). `position: fixed`는
    `.detail-char-count`(§2.7.16)에서 검증된 패턴 — fixed의 containing block을
    바꾸는 조상 속성이 없음을 확인했고, 본문 스크롤과 무관하게 항상 보여야
    한다는 FR-003·Acceptance 3에 부합. `z-index: 10`(§2.7.16과 같은 계층,
    `.slash-menu`의 20보다 낮음).
  - 래퍼 div 방식은 `IconButton`에 className/style prop을 추가하지 않기 위함 —
    프리미티브 표면 변화를 `ariaExpanded` 하나로 최소화.
- **Alternatives considered**: 상단바에 펼치기 버튼 배치(Clarification에서 본문
  좌상단으로 확정), 인라인 `<button className="icon-btn">` 직접 작성(프리미티브
  우회 — 헌법 III 위반 소지), `aria-controls` 추가(단일 nav 대상이라 이득 없음 —
  YAGNI).

## 4. 화면 간 유지(FR-005) — App Router 레이아웃 상태 보존

- **Decision**: 별도 전역 상태·컨텍스트를 만들지 않는다. `collapsed`는
  `AppShell`의 로컬 `useState`로 두고, 앱 내 이동 간 유지는 레이아웃 상태 보존에
  맡긴다. localStorage는 새로고침·재방문 복원(FR-006)에만 사용한다.
- **Rationale**: 헌법 IV에 따라 번들 문서로 확인 —
  `01-getting-started/03-layouts-and-pages.md`: "On navigation, layouts preserve
  state, remain interactive, and do not rerender." `AppShell`은
  `app/(app)/layout.tsx`가 렌더하므로 `(app)` 그룹 내 모든 이동(홈↔상세↔마이)에서
  언마운트되지 않는다 → `collapsed`·`search` 상태가 그대로 유지된다.
  `/login`은 그룹 밖이지만 로그인 화면에는 사이드바가 없다(범위 밖).
- **Alternatives considered**: React Context/스토어 승격(레이아웃 보존으로 이미
  충족 — 불필요한 표면 확장), 라우트 변경마다 localStorage 재읽기(불필요한 IO,
  상태 이원화).

## 5. 초기값 읽기 시점 — `useState` 지연 초기화

- **Decision**: `useState(() => readLocalPref(KEY, ALLOWED) === "collapsed")`
  지연 초기화 함수에서 1회 읽는다. 쓰기는 토글 핸들러에서 즉시 수행한다.
- **Rationale**: `readLocalPref`가 try/catch로 SSR(서버에는 `localStorage` 없음)
  에서도 안전하게 `null`을 반환 → 서버 렌더는 기본값(펼침) 트리를 계산하지만
  실제로는 `app.loaded` 가드(`return null`, §3.5)로 아무것도 출력하지 않으므로
  하이드레이션 불일치가 발생하지 않는다. 클라이언트 마운트 시점의 초기화 함수가
  실제 저장값을 읽어 첫 표시부터 올바른 상태로 렌더한다(US3 Acceptance 1 —
  새로고침 시 접힌 상태로 "나타난다", 펼쳐졌다 접히는 깜빡임 없음).
- **Alternatives considered**: `useEffect`에서 읽기(첫 렌더가 항상 펼침 →
  접힘 저장 시 펼침→접힘 깜빡임 발생, FR-007 위반 소지), 다크모드식 인라인
  head 스크립트(첫 페인트 전 실행이 필요한 `<html>` 속성과 달리 여기는
  클라이언트 전용 셸 내부 상태라 불필요 — 과잉 설계).

## 6. 테스트 전략 (헌법 I·II)

- **Decision**: 신규 `__tests__/sidebar-collapse.test.tsx` 1파일.
  - **`lib/local-pref.ts` 단위**: 실제 jsdom `localStorage`로 라운드트립·무효값
    `null`·부재 `null`·(`setItem` 스파이로) 쓰기 예외 무시를 단언.
  - **`AppShell` 통합(RTL)**: `auth-store.test.tsx`의 완전한 `@/lib/supabase`
    목(세션 주입) + `next/navigation` 목(`useRouter`/`usePathname`) +
    `AppProvider` 래핑으로 로그인 상태의 셸을 렌더.
    1. 기본: nav 존재, "사이드바 접기" 버튼 `aria-expanded="true"`.
    2. 접기 클릭: nav 부재, "사이드바 펼치기" 버튼 `aria-expanded="false"`,
       실제 `localStorage["mini-notion-sidebar"] === "collapsed"`.
    3. 다시 펼치기: nav 복귀 + 접기 전 입력한 검색어가 인풋에 유지(FR-008).
    4. 사전 저장 `"collapsed"` → 첫 렌더부터 nav 부재(US3).
    5. 사전 저장 무효값(예: `"banana"`) → 펼침 기본값(Edge Case).
    6. 연속 클릭(접기→펼치기→접기 3연타): 최종 상태가 클릭 횟수와 일치
       (Edge Case 수렴).
  - 기존 22개 테스트 무손상(`npm test` 전체 그린)이 완료 게이트.
- **Rationale**: 목은 외부 경계(supabase·next/navigation)에만 — 이미 저장소에서
  검증된 완전한 형태를 재사용(불완전 목 금지, 헌법 II). localStorage·DOM·
  aria 속성은 실제 구현을 단언. 키보드 조작(Enter/Space)은 네이티브
  `<button>`의 표준 동작이라 별도 테스트 불요 — 접근성 이름·aria-expanded
  단언으로 FR-004를 검증한다. E2E 수준(본문 폭 확장 픽셀 검증·새로고침)은
  jsdom 밖 관심사 → `quickstart.md`의 브라우저 검증(`verify` 스킬)으로 위임.
- **Alternatives considered**: AppShell 전용 목 셸 제작(목 동작 검증 위험 —
  기각), Playwright 도입(이 범위엔 과함 — dark-mode research §6과 동일 판단).

## 미해결 NEEDS CLARIFICATION

없음 — Technical Context의 모든 항목이 위 결정으로 확정됐다.
