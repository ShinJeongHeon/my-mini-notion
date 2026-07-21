# Research: 다크모드 (003-dark-mode)

Phase 0 산출물. Technical Context의 미확정 사항을 결정으로 확정한다.
근거 소스: `DESIGN.md`(전체), `app/globals.css` 토큰 구조,
`node_modules/next/dist/docs/01-app/03-api-reference/02-components/script.md`,
`node_modules/next/dist/docs/01-app/03-api-reference/04-functions/generate-viewport.md`.

## 1. 테마 적용 메커니즘

- **Decision**: `<html data-theme="light"|"dark">` 속성 스위치 + `globals.css`에
  `html[data-theme="dark"] { …시맨틱 토큰 오버라이드… }` 블록 1개. 속성은 항상
  구체값(light/dark)으로 세팅하며(시스템 따름 상태도 해석 결과를 기록), 해석은
  JS(`lib/theme.ts`)가 담당한다. 신규 라이브러리(next-themes 등) 도입하지 않음.
- **Rationale**: 이 앱의 모든 색은 이미 시맨틱 토큰(`--surface-*`/`--text-*`/
  `--border-*`/`--accent*`/`--status-*`)을 거치므로(DESIGN.md §1.1.4) 오버라이드
  블록 하나로 전 화면이 전환된다(화면 파일 수정 0). 속성을 항상 구체값으로
  해석해 두면 ① 다크 CSS 블록이 중복 없이 1개로 유지되고(media query 병행안은
  동일 블록 2벌 필요) ② 토글 아이콘이 현재 유효 테마를 바로 알 수 있으며
  ③ FR-005(시스템 실시간 추종)는 JS 리스너로 어차피 필요하다. next-themes는
  동일 패턴의 범용화일 뿐이라 YAGNI(헌법 V) 위반.
- **Alternatives considered**:
  - `light-dark()` CSS 함수 + `color-scheme`: 우아하지만 `:root` 토큰 72개 정의
    전체를 재작성해야 해 diff가 크고 DESIGN.md §1의 라인 단위 명세와 어긋난다.
  - `@media (prefers-color-scheme)`만 사용: 사용자 명시 선택(FR-004·006)을
    표현할 수 없다.
  - `.dark` 클래스: 속성과 동등하나, 값이 열거형(light/dark)임을 표현하는 데는
    `data-theme`이 명시적이다.

## 2. 첫 페인트 전 테마 적용 (no-FOUC, FR-007)

- **Decision**: 루트 레이아웃(`app/layout.tsx`) `<head>`에 **일반 인라인
  `<script dangerouslySetInnerHTML>`**로 초기화 스크립트를 넣는다. 스크립트
  본문은 `lib/theme.ts`의 `THEME_INIT_SCRIPT` 상수(순수 문자열)로 두어 단위
  테스트한다. `<html>`에 `suppressHydrationWarning`을 추가한다(서버 HTML에는
  `data-theme`이 없고 클라이언트가 하이드레이션 전에 세팅하므로 속성 불일치
  경고 억제 — React 19 표준 패턴).
- **Rationale**: 번들 문서 `script.md` 확인 결과 `next/script`의
  `beforeInteractive`조차 "execution **does not block page hydration**"이며 외부
  스크립트 로딩 최적화용이다. 파서가 즉시 실행하는 head 인라인 스크립트만이
  첫 페인트 전 실행을 보장한다(헌법 IV: 기억이 아니라 번들 문서로 확인).
- **Alternatives considered**: `next/script strategy="beforeInteractive"`(위
  근거로 부적합), 서버 컴포넌트에서 쿠키로 테마 SSR(쿠키 저장소 도입 + 캐시
  분기 비용 — localStorage 결정과 충돌, YAGNI).

## 3. 시스템 테마 추종·우선순위 (FR-005·FR-006)

- **Decision**: `window.matchMedia("(prefers-color-scheme: dark)")`로 해석.
  우선순위는 `저장된 선택 > 시스템 설정`. 저장된 선택이 **없을 때만**
  `change` 리스너를 활성화해 실시간 추종하고, 토글로 선택이 생기면 리스너
  결과를 무시한다(리스너 콜백에서 저장값 존재 시 no-op). 리스너는
  `THEME_INIT_SCRIPT`에 포함해 루트 레이아웃에서 1회 등록한다 — 사이드바
  (토글 훅)가 없는 로그인 화면에서도 FR-005가 동작해야 하기 때문
  (계약 §4).
- **Rationale**: spec FR-005/006의 우선순위 규칙을 그대로 코드화. 리스너를
  항상 등록하되 콜백에서 가드하는 편이 등록/해제 상태 관리보다 단순하다.
- **Alternatives considered**: 리스너 미지원(FR-005 후단 위반), 명시 선택 후
  리스너 해제(동작 동일하나 상태 관리 복잡도만 증가).

## 4. 저장 방식 (FR-004, Edge Case)

- **Decision**: 전용 키에 원시 문자열을 저장한다. 키·허용값·무효 정규화·
  try/catch 폴백의 정본 계약은 `contracts/theme-contract.md` §2(재방문 시 초기
  테마 복귀는 spec Edge Case 허용).
- **Rationale**: 기존 `mini-notion-v1`(posts/nickname/avatar, DESIGN.md §5.6)은
  스토어 로드 사이클과 스키마 검증에 묶여 있어, 첫 페인트 전 인라인
  스크립트가 JSON 파싱 없이 읽으려면 독립 키가 단순·안전하다. spec
  Assumptions의 "기기 로컬 UI 선호값 메커니즘 공유"(003-sidebar-collapse)는
  `lib/theme.ts`의 제네릭 접근자 `readLocalPref`/`writeLocalPref`(계약 §4)를
  후속 기능이 import해 재사용하는 것으로 충족한다 — 패턴 모방이 아니라 코드
  공유다.
- **Alternatives considered**: `mini-notion-v1` 확장(스토어 결합 + 인라인
  스크립트에서 JSON 파싱 필요), 쿠키(§2에서 기각).

## 5. 다크 팔레트 전략 (FR-008)

- **Decision**: **원시 램프(`--gray-*` 등)는 불변**, 시맨틱 토큰만 다크 값으로
  오버라이드한다. 시맨틱 계층을 우회한 하드코딩 사용처는 이번에 토큰화한다 —
  이관 대상·매핑의 정본 목록은 `contracts/theme-contract.md` §6이다(이 문서에
  중복 기재하지 않음). `::selection`은 이미 `--accent-soft` 토큰을 쓰므로 이관
  대상이 아니며 다크 블록에서 값만 오버라이드된다.

  구체적 다크 값 표와 대비 검증은 `contracts/theme-contract.md`에
  둔다. 그림자(`--shadow-*`)·포커스 링·구글 로고·Avatar 파랑 쌍은 다크에서도
  기준을 충족해 유지한다(계약 문서에 근거 기재).
- **Rationale**: 램프를 뒤집으면(대안 A) `--gray-900`을 쓰는 brand-chip 등이
  연쇄로 뒤집혀 의도 없는 결과가 나온다. 시맨틱 계층만 손대는 것이 디자인
  시스템 구조(DESIGN.md §1.1.4)와 §7의 "토큰 재매핑 필요" TODO에 부합한다.
  새 값을 임의로 흩뿌리지 않고 신규 시맨틱 토큰 4개(`--text-on-inverse`,
  `--scrollbar-thumb`, `--scrollbar-thumb-hover`, `--status-danger-soft`)로
  수렴시키며, 이는 DESIGN.md에 동시 반영한다(헌법 III).
- **Alternatives considered**: 원시 램프 오버라이드(위 부작용), 화면별 다크
  전용 클래스(토큰 시스템 붕괴), 하드코딩 색 방치(다크에서 brand-chip·글자수
  배지가 배경에 매몰 — FR-008 위반).

## 6. 테스트 전략 (헌법 I·II)

- **Decision**:
  - `resolveTheme(stored, systemDark)` 순수 함수 → 진리표 테스트(저장값
    light/dark/무효/부재 × 시스템 light/dark).
  - `THEME_INIT_SCRIPT` 문자열 → jsdom에서 `new Function`으로 실행 후 실제
    `document.documentElement.dataset.theme`과 실제 `localStorage`를 단언
    (목이 아닌 실 DOM 검증 — 헌법 II).
  - `useTheme` 훅·토글 버튼 → RTL로 렌더 후 클릭 → `data-theme` 속성 전환,
    `localStorage` 기록, 버튼 라벨/아이콘 상태 전환을 단언.
  - `matchMedia`: jsdom이 `change` 이벤트 디스패치를 구현하지 않으므로
    리스너 캡처가 가능한 최소 구현으로 대체하되, 실제 API 표면
    (`matches`/`media`/`addEventListener`/`removeEventListener`)을 전부 갖춘
    완전한 형태로 작성한다(불완전 목 금지 — 헌법 II).
  - E2E(플래시 부재·시스템 에뮬레이션·대비)는 jsdom 밖 관심사 →
    `quickstart.md`의 브라우저 검증 절차로 위임(`verify` 스킬).
- **Rationale**: async Server Component는 Vitest 미지원(헌법 Technology
  Stack)이므로 레이아웃 자체가 아니라 레이아웃에 주입되는 스크립트
  문자열을 테스트 단위로 삼는다 — 테스트하기 쉬운 인터페이스로 설계를
  단순화(헌법 V).
- **Alternatives considered**: Playwright 단위 도입(이 기능 범위엔 과함,
  quickstart 수동/스킬 검증으로 충분), 레이아웃 스냅샷 테스트(목 동작
  검증에 가까워 기각).

## 미해결 NEEDS CLARIFICATION

없음 — Technical Context의 모든 항목이 위 결정으로 확정됐다.
