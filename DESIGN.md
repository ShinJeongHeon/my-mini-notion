# DESIGN.md — 미니 노션 디자인 시스템 완전 명세

> 이 문서는 프로젝트에 구현된 "미니 노션"의 디자인 시스템 전체를 **유실 없이** 담은 복원용 명세다.
> 이 문서 하나만으로 원본 코드를 보지 않고도 지금과 동일한 화면·컴포넌트·색·간격·모션·상호작용을 재현할 수 있도록 작성했다.
>
> **원칙:** 값은 원문 그대로(hex/px/ms), 토큰은 이름·참조·최종값을 함께, 상태·문구·출처를 모두 표기. 요약보다 보존.
>
> **정답 기준:** 실제 구현된 코드(`app/`, `components/`, `lib/`)가 정답이다. `03-reference-design.png`(레퍼런스)와 어긋나는 지점은 각 섹션에 `> 레퍼런스 메모`로 남겼다.

---

## 목차

0. [개요 (Overview)](#0-개요-overview)
1. [파운데이션 / 디자인 토큰 (Foundations)](#1-파운데이션--디자인-토큰-foundations)
2. [컴포넌트 카탈로그 (Primitives)](#2-컴포넌트-카탈로그-primitives)
3. [앱 셸 / 레이아웃 (App Shell)](#3-앱-셸--레이아웃-app-shell)
4. [화면별 명세 (Screens)](#4-화면별-명세-screens)
5. [상호작용 · 동작 명세 (Behavior)](#5-상호작용--동작-명세-behavior)
6. [콘텐츠 / 카피 인벤토리 (Content)](#6-콘텐츠--카피-인벤토리-content)
7. [접근성 · 상태 디테일 (States & A11y)](#7-접근성--상태-디테일-states--a11y)
8. [부록: 커버리지 체크리스트 (Coverage)](#8-부록-커버리지-체크리스트-coverage)

---

## 0. 개요 (Overview)

- **제품 한 줄 설명:** "미니 노션(Mini Notion)" — 개인 업무를 글(페이지) 단위로 기록·편집·삭제하는 담백한 개인 업무 관리 웹 서비스. (출처: `02-prd.md`, `README.md`)
- **디자인 언어 이름:** `ui:bowl` — `globals.css` 상단 주석 "ui:bowl design tokens — ported from the design-system project"에서 명시. 별도 디자인 시스템 프로젝트에서 이식된 토큰 세트다.
- **지향 톤:** Notion 계열의 담백한 **그래파이트(graphite) 뉴트럴 UI**. 흰 배경, 회색 램프 중심, 파랑(`#4e97f0`) 단일 액센트, 얇은 경계선·미세한 그림자·짧은(120ms) 트랜지션으로 조용하고 정돈된 인상.
- **서체:** Pretendard Variable(로컬 가변 폰트) + 시스템 한글/라틴 폴백.
- **아이콘:** `lucide-react` 단일 세트(로그인 구글 로고만 인라인 SVG 예외).

### 디자인 원칙 (레퍼런스·PRD에서 도출)

1. **필요한 것만, 담백하게.** PRD의 "쓰지 않는 기능이 가득한 복잡한 화면"을 피한다는 페인 회피(가치 곡선: 기능 폭↓, 무료·개인화↑)를 그대로 반영 — 화면 요소가 적고 여백이 넉넉하다. (출처: `02-prd.md` §6)
2. **그래파이트 뉴트럴 + 단일 파랑 액센트.** 색은 회색 램프가 지배하고, 강조는 파랑 하나로 한정(`--accent`). 상태색(성공/경고/위험/즐겨찾기)만 제한적으로 추가.
3. **노션식 상호작용의 축소 재현.** `/page` 슬래시 커맨드, 자동 저장, 사이드바 페이지 리스트 등 익숙한 노션 패턴을 최소 형태로 구현. (출처: PRD A3, §7.2)
4. **콘텐츠 우선 타이포.** 큰 제목(28–34px/700)과 넉넉한 본문 행간(1.75)으로 글쓰기에 집중. 경계선은 얇게(`--border-subtle`), 그림자는 미세하게.
5. **조용한 모션.** 대부분의 트랜지션은 `120ms`(`--dur-fast`) + `cubic-bezier(0.2,0,0.1,1)`. 등장 애니메이션(`mnPop`)만 살짝 튀어오르는 `--ease-out`.

> 레퍼런스 메모: `03-reference-design.png`는 실제로 **다른 제품**(“유아이볼” AI 채팅/메신저 — 상단 워크스페이스 "유아이볼(2)", AI 컴포저 "AI에게 무엇이든 물어보세요.", 대화방 검색 "Cmd+J", 토픽/채팅/앱 섹션, 대시보드 카드, 도넛 차트)을 보여준다. 구현된 "미니 노션"과 제품 자체가 다르다. **공유되는 것**은 `ui:bowl` 디자인 언어(좌측 상단 `ui:bowl` 브랜드칩, 회색 사이드바 + 섹션 헤더 + 카운트 + 별(favorite) 아이콘, `홈` 항목, 검색 입력 + kbd 힌트, `앱` 섹션의 `캘린더`)뿐이고, 제품 콘텐츠/화면 구성은 코드가 정답이다.

---

## 1. 파운데이션 / 디자인 토큰 (Foundations)

출처: `app/globals.css` `:root {}` (라인 4–101). **정의된 CSS 변수 총 72개** 전부를 아래에 열거한다. (Neutral 13 + Blue 8 + Accent 5 + Text 7 + Surface 7 + Border 4 + Accent-surface 5 + Status 4 + Font 2 + Radius 7 + Shadow 5 + Motion 5 = 72)
`--font-pretendard`는 `:root`가 아니라 `next/font/local`이 `<html>`에 주입하는 변수(→ [1.2](#12-타이포그래피) 참조).

### 1.1 색상 (Color)

#### 1.1.1 Neutral 램프 — graphite (13색) · `globals.css:5-18`

| 토큰 | 최종값(hex) | 비고 / 주요 사용처 |
|---|---|---|
| `--gray-0` | `#ffffff` | 페이지·사이드바·카드 배경, on-inverse |
| `--gray-25` | `#fbfcfc` | (정의만; 코드 내 직접 사용 없음) |
| `--gray-50` | `#f7f8f9` | `--surface-subtle` |
| `--gray-100` | `#f1f2f3` | `--surface-hover`, badge 배경 |
| `--gray-150` | `#ebeced` | `--surface-active`, `--border-subtle` |
| `--gray-200` | `#e2e3e5` | `--border-default`, 스크롤바 thumb |
| `--gray-300` | `#d3d5d8` | `--border-strong`, 스크롤바 색/hover, meta dot |
| `--gray-400` | `#b0b3b8` | `--text-placeholder` |
| `--gray-500` | `#8a8f98` | `--text-muted` |
| `--gray-600` | `#6b7178` | `--text-secondary` |
| `--gray-700` | `#4a4f56` | (정의만; 코드 내 직접 참조 없음 — 램프 완전성용) |
| `--gray-800` | `#2c2f34` | `--text-body` |
| `--gray-900` | `#191919` | `--text-strong`, `--surface-inverse`, brand-chip 배경, 그림자 rgba 기준색(25,25,25) |

#### 1.1.2 Blue — primary (8색) · `globals.css:21-28`

| 토큰 | 최종값(hex) | 비고 / 주요 사용처 |
|---|---|---|
| `--blue-50` | `#eef4fe` | `--accent-soft` (slash tile·empty tile 배경, ::selection) |
| `--blue-100` | `#dbe9fd` | `.avatar` 배경 |
| `--blue-200` | `#bcd6fb` | (정의만; 직접 사용 없음) |
| `--blue-300` | `#93bdf8` | (정의만; 직접 사용 없음) |
| `--blue-400` | `#66a9ff` | (정의만; 직접 사용 없음) |
| `--blue-500` | `#4e97f0` | `--accent`, `--border-focus`, focus 링 rgba(78,151,240) 기준색 |
| `--blue-600` | `#3b82d6` | `--accent-hover`, `--text-link`, `--accent-soft-fg` |
| `--blue-700` | `#2f6bb5` | `--accent-active`, `.avatar` 이니셜 글자색 |

#### 1.1.3 Accent — gold/green/amber/red (5색) · `globals.css:31-35`

| 토큰 | 최종값(hex) | 비고 / 주요 사용처 |
|---|---|---|
| `--gold-300` | `#ffd45e` | (정의만; 직접 사용 없음) |
| `--gold-500` | `#ffbd18` | `--status-favorite`; 사이드바 별·즐겨찾기 활성 색(`.sidebar-item__star`, `.fav-btn.is-fav`, `.detail-fav-btn.is-fav`) |
| `--green-500` | `#2eb872` | `--status-success`; "저장되었습니다" 노트 |
| `--amber-500` | `#f5a623` | `--status-warning` (정의만; 직접 사용 없음) |
| `--red-500` | `#f0483e` | `--status-danger`; 삭제 버튼 텍스트, 상단바 알림 점 |

#### 1.1.4 시맨틱 매핑 — Text / Surface / Border / Accent / Status

색 토큰은 다른 토큰을 참조한다. `토큰명 | 참조 | 최종값 | 용도` 형태로 참조 관계와 해석된 값을 모두 표기한다.

**Text** · `globals.css:37-44`

| 토큰 | 참조 | 최종값 | 용도 |
|---|---|---|---|
| `--text-strong` | `var(--gray-900)` | `#191919` | 제목·강조 텍스트 |
| `--text-body` | `var(--gray-800)` | `#2c2f34` | 본문(body 기본색) |
| `--text-secondary` | `var(--gray-600)` | `#6b7178` | 보조 텍스트·서브타이틀 |
| `--text-muted` | `var(--gray-500)` | `#8a8f98` | 흐린 텍스트·아이콘·힌트 |
| `--text-placeholder` | `var(--gray-400)` | `#b0b3b8` | placeholder, 비활성 별, 카운트 |
| `--text-on-accent` | `#ffffff`(직접) | `#ffffff` | 파랑 버튼 위 텍스트 |
| `--text-link` | `var(--blue-600)` | `#3b82d6` | 링크(`a`) |

**Surface** · `globals.css:46-53`

| 토큰 | 참조 | 최종값 | 용도 |
|---|---|---|---|
| `--surface-page` | `var(--gray-0)` | `#ffffff` | 페이지/앱 본문 배경 |
| `--surface-sidebar` | `var(--gray-0)` | `#ffffff` | 사이드바 배경 |
| `--surface-card` | `var(--gray-0)` | `#ffffff` | 카드/입력/버튼 배경 |
| `--surface-subtle` | `var(--gray-50)` | `#f7f8f9` | 은은한 배경(검색 인풋·읽기전용·tile·로그인 페이지 배경) |
| `--surface-hover` | `var(--gray-100)` | `#f1f2f3` | hover 배경 |
| `--surface-active` | `var(--gray-150)` | `#ebeced` | active/선택 배경 |
| `--surface-inverse` | `var(--gray-900)` | `#191919` | (정의만; 직접 사용 없음) |

**Border** · `globals.css:55-59`

| 토큰 | 참조 | 최종값 | 용도 |
|---|---|---|---|
| `--border-subtle` | `var(--gray-150)` | `#ebeced` | 얇은 경계선(상단바·사이드바·카드 기본) |
| `--border-default` | `var(--gray-200)` | `#e2e3e5` | 기본 경계선(버튼·인풋·컴포저) |
| `--border-strong` | `var(--gray-300)` | `#d3d5d8` | hover 시 강조 경계선 |
| `--border-focus` | `var(--blue-500)` | `#4e97f0` | 포커스 경계선 |

**Accent 표면** · `globals.css:61-66`

| 토큰 | 참조 | 최종값 | 용도 |
|---|---|---|---|
| `--accent` | `var(--blue-500)` | `#4e97f0` | 파랑 버튼·강조 아이콘·tile 전경 |
| `--accent-hover` | `var(--blue-600)` | `#3b82d6` | 파랑 버튼 hover, 링크 hover |
| `--accent-active` | `var(--blue-700)` | `#2f6bb5` | 파랑 버튼 active |
| `--accent-soft` | `var(--blue-50)` | `#eef4fe` | 연한 파랑 배경(slash tile·empty tile·::selection) |
| `--accent-soft-fg` | `var(--blue-600)` | `#3b82d6` | (정의만; 직접 사용 없음) |

**Status** · `globals.css:68-72`

| 토큰 | 참조 | 최종값 | 용도 |
|---|---|---|---|
| `--status-success` | `var(--green-500)` | `#2eb872` | 저장 완료 노트 |
| `--status-warning` | `var(--amber-500)` | `#f5a623` | (정의만; 직접 사용 없음) |
| `--status-danger` | `var(--red-500)` | `#f0483e` | 삭제 버튼 텍스트 |
| `--status-favorite` | `var(--gold-500)` | `#ffbd18` | 즐겨찾기(정의; 실제 별색은 `--gold-500` 직접 참조) |

**토큰이 아닌 하드코딩 색** (원문 그대로 보존)

| 값 | 위치 | 용도 |
|---|---|---|
| `#fff` | `.brand-chip` color(`globals.css:227`) | 브랜드칩 글자 |
| `#fdeae9` | `.detail-delete-btn:hover` 배경(`globals.css:410`) | 삭제 버튼 hover 연한 빨강 |
| `rgba(25, 25, 25, …)` | 그림자 4종(`--shadow-xs~lg`) | 그림자 기준색(= `--gray-900`) |
| `rgba(78, 151, 240, 0.25)` | `--shadow-focus` | 포커스 링(= `--blue-500` 25%) |
| `#EA4335` / `#4285F4` / `#FBBC05` / `#34A853` | `app/login/page.tsx` `GoogleLogo` SVG | 구글 로고 4색 |

### 1.2 타이포그래피 (Typography)

#### 폰트 패밀리 · `globals.css:75-77`

- `--font-sans`:
  ```
  var(--font-pretendard), -apple-system, BlinkMacSystemFont,
  "Apple SD Gothic Neo", "Malgun Gothic", "Segoe UI", Roboto, sans-serif
  ```
- `--font-mono`:
  ```
  "SFMono-Regular", ui-monospace, "SF Mono", Menlo, Consolas, monospace
  ```
  (사용처: `.slash-menu kbd`)

- `--font-pretendard`: `app/layout.tsx`의 `next/font/local`이 주입.
  - `src: "./fonts/PretendardVariable.woff2"`, `display: "swap"`, `weight: "45 920"`(가변), `variable: "--font-pretendard"`.
  - `<html lang="ko" className={pretendard.variable}>`로 적용. `body { font-family: var(--font-sans) }`.
  - 렌더링: `-webkit-font-smoothing: antialiased; text-rendering: optimizeLegibility;` (`globals.css:112-113`)

#### 타입 스케일 (화면에서 실제 쓰인 값)

`크기 | 굵기 | letter-spacing | line-height | 쓰인 곳`. (line-height 미표기는 상속/기본)

| 크기 | 굵기 | letter-spacing | line-height | 쓰인 곳(클래스) |
|---|---|---|---|---|
| 34px | 700 | -0.02em | 1.25 | `.detail-title` (상세 제목) |
| 28px | 700 | -0.02em | — | `.list-page__title` (내 업무) |
| 26px | 700 | -0.02em | — | `.login-card h1`, `.mypage__title` |
| 16px | 600 | — | — | `.empty-state__title` |
| 15px | 700 | -0.01em | — | `.topbar__title` (미니 노션) |
| 15px | 700 | -0.02em | — | `.login-card .brand-chip`(로그인 변형) |
| 15px | 400 | — | — | `.composer input`(placeholder/입력) |
| 15px | 600 | — | — | `.mypage-avatar-row__name` |
| 15px | 400 | — | 1.75 | `.detail-content` (본문) |
| 14px | 600 | — | — | `.btn`, `.login-google-btn`, `.upload-btn` |
| 14px | 400 | — | 1.6 | `.login-card__desc` |
| 14px | 400 | — | — | `.list-page__subtitle`, `.mypage__subtitle`, `.field-input`, `.field-readonly__value` |
| 14px | 600 | — | — | `.post-card__title`, `.mypage-field label`? (label은 13px, 아래 참조) |
| 14px | 600 | — | — | `.logout-card__title` |
| 13px | 500 | — | — | `.sidebar-item`, `.detail-breadcrumb__current` |
| 13px | 400 | — | — | `.input-sm input`, `.post-card__preview`, `.detail-breadcrumb__root` |
| 13px | 600 | — | — | `.sidebar__profile-name`, `.slash-menu__name`, `.mypage-field label`, `.saved-note`, `.detail-delete-btn` |
| 13px | 400 | — | 1.6 | `.empty-state__desc` |
| 12px | 700 | -0.02em | — | `.brand-chip`(기본, 상단바) |
| 12px | 700 | 0.02em | — | `.sidebar-section__header`, `.list-head__label` |
| 12px | 400 | — | — | `.sidebar-section__empty`(lh 1.5), `.login-card__terms`(lh 1.6), `.composer-hint`, `.post-card__date`, `.detail-meta span`, `.mypage-avatar-row__hint`, `.slash-menu__desc`, `.logout-card__desc` |
| 11px | 600 | — | 1(line-height:1) | `.badge` |
| 11px | 400 | — | — | `.sidebar__profile-sub` |
| 11px | 700 | 0.02em | — | `.slash-menu__group` |
| 11px | 400 | — | — | `.slash-menu kbd`(mono) |

> 주요 값 요약: **본문 색 `--text-body`(#2c2f34)**, **제목 색 `--text-strong`(#191919)**. 큰 제목은 모두 `letter-spacing: -0.02em`, 섹션 라벨류는 `+0.02em`.

### 1.3 라운드 (Radius) · `globals.css:79-86`

| 토큰 | 값 | 주요 사용처 |
|---|---|---|
| `--radius-xs` | `4px` | (정의만; 직접 사용 없음) |
| `--radius-sm` | `6px` | `.icon-btn--sm`, `.fav-btn` |
| `--radius-md` | `8px` | 버튼·아이콘버튼·인풋·사이드바 항목·tile 등 기본 라운드(가장 많이 쓰임) |
| `--radius-lg` | `12px` | 카드·슬래시 메뉴·빈 상태·로그인 카드·마이 카드·로그아웃 카드·post-card |
| `--radius-xl` | `16px` | `.empty-state__tile` |
| `--radius-2xl` | `20px` | `.composer` (입력 바) |
| `--radius-pill` | `999px` | `.badge` |

**하드코딩 라운드:** `.brand-chip 7px`(로그인 변형 9px), `.topbar__bell-dot 50%`, `.avatar 50%`, `.detail-meta__dot 50%`, `.slash-menu kbd 5px`, `.mn-scroll thumb 8px`.

### 1.4 그림자 (Shadow) · `globals.css:88-93` — 원문 그대로

| 토큰 | 값 | 사용처 |
|---|---|---|
| `--shadow-xs` | `0 1px 1px rgba(25, 25, 25, 0.04)` | `.post-card`, `.mypage-card`, `.logout-card` |
| `--shadow-sm` | `0 1px 2px rgba(25, 25, 25, 0.05), 0 1px 3px rgba(25, 25, 25, 0.04)` | `.composer` |
| `--shadow-md` | `0 2px 6px rgba(25, 25, 25, 0.06), 0 4px 12px rgba(25, 25, 25, 0.05)` | `.login-card`, `.post-card:hover` |
| `--shadow-lg` | `0 8px 24px rgba(25, 25, 25, 0.08), 0 2px 8px rgba(25, 25, 25, 0.05)` | `.slash-menu` |
| `--shadow-focus` | `0 0 0 3px rgba(78, 151, 240, 0.25)` | `.input-sm:focus-within`, `.field-input:focus` |

### 1.5 모션 (Motion) · `globals.css:95-100, 127`

| 토큰 | 값 | 비고 |
|---|---|---|
| `--ease-standard` | `cubic-bezier(0.2, 0, 0.1, 1)` | 거의 모든 transition의 easing |
| `--ease-out` | `cubic-bezier(0.16, 1, 0.3, 1)` | 등장 애니메이션(`mnPop`) easing |
| `--dur-fast` | `120ms` | 대부분의 transition 지속시간 |
| `--dur-normal` | `180ms` | `.detail-cover__img`의 opacity 페이드인 전환 |
| `--dur-slow` | `260ms` | (정의만; 직접 사용 없음) |

**키프레임** (`globals.css:127`):
```css
@keyframes mnPop {
  from { opacity: 0; transform: translateY(-5px); }
  to   { opacity: 1; transform: none; }
}
```
- 적용: `.slash-menu { animation: mnPop 0.14s var(--ease-out); }`, `.saved-note { animation: mnPop 0.14s var(--ease-out); }` (지속시간 `0.14s` = 140ms, 하드코딩).

**키프레임** (`globals.css` 상세 섹션, 커버 스켈레톤):
```css
@keyframes mnShimmer {
  from { background-position: 200% 0; }
  to   { background-position: -200% 0; }
}
```
- 적용: `.detail-cover__skeleton { animation: mnShimmer 1.4s linear infinite; }`(지속시간 `1.4s`, 하드코딩 — 저장소의 키프레임 지속시간 하드코딩 관행과 일치). 로딩 스피너 대신 뉴트럴 shimmer로 커버 로딩 상태를 표시(§2.8, §4.3).

**transition이 걸린 요소 · 속성:**

| 요소 | transition 속성(모두 `var(--dur-fast) var(--ease-standard)`) |
|---|---|
| `.btn` | background, border-color, **transform** (`:active { transform: scale(0.97) }`) |
| `.icon-btn` | background, color |
| `.input-sm` | border-color, background, box-shadow |
| `.sidebar-item` | background, color |
| `.sidebar-section__actions` | opacity |
| `.sidebar__profile` | background |
| `.slash-menu__item` | background |
| `.post-card` | border-color, box-shadow, **transform** (`:hover { transform: translateY(-1px) }`) |
| `.fav-btn` / `.detail-fav-btn` / `.detail-delete-btn` | background |
| `.login-google-btn` | background, border-color |
| `.upload-btn` | background |
| `.field-input` | border-color, box-shadow |

### 1.6 간격 · 레이아웃 (Spacing & Layout)

**주요 컨테이너 폭·높이**

| 영역 | 값 | 출처 |
|---|---|---|
| 사이드바 폭 | `264px` | `.sidebar { width: 264px }` |
| 상단바 높이 | `48px` | `.topbar { height: 48px }` |
| 글 목록 컨테이너 | `max-width: 820px` (중앙 정렬) | `.list-page` |
| 글 상세 컨테이너 | `max-width: 760px` | `.detail-page` |
| 마이 페이지 컨테이너 | `max-width: 600px` | `.mypage` |
| 로그인 카드 | `width: 400px; max-width: 100%` | `.login-card` |
| 브레드크럼 현재 항목 | `max-width: 280px` (말줄임) | `.detail-breadcrumb__current` |
| 상세 본문 textarea | `min-height: 340px` | `.detail-content` |

**대표 padding / gap**

| 영역 | padding | gap |
|---|---|---|
| `.topbar` | `0 12px 0 14px` | 12px |
| `.sidebar__inner` | `10px 8px` | — |
| `.sidebar__scroll` | `padding-right: 4px; margin-right: -4px`(스크롤바 여백 보정) | — |
| `.sidebar__profile` | `10px 12px` | 10px |
| `.list-page` | `36px 28px 72px` | — |
| `.detail-page` | `18px 28px 96px` | — |
| `.mypage` | `40px 28px 80px` | — |
| `.login-card` | `44px 40px 32px` | — |
| `.composer` | `9px 10px 9px 16px` | 10px |
| `.mypage-card` | `28px` | — |
| `.post-card` | `13px 16px` | 14px |
| `.post-list` | — | 8px(카드 간격) |
| `.empty-state` | `56px 24px` | — |
| `.logout-card` | `18px 24px` | 14px |
| `.slash-menu` | `6px` | — |
| `.slash-menu__item` | `8px 10px` | 12px |

**표준 컴포넌트 높이:** 버튼 `34px`, 아이콘버튼 `30px`(sm `24px`), 검색/사이드바 항목 `32px`, 섹션 헤더 `28px`, 배지 `18px`, 로그인 구글 버튼 `46px`, 필드 인풋/읽기전용 `42px`, fav-btn `28px`.

### 1.7 아이콘 (Icons)

- **라이브러리:** `lucide-react` (README: "디자인 시스템과 동일한 Lucide 세트"). 예외: 로그인 화면 구글 로고는 인라인 `<svg>`(48×48 viewBox, 표시 18×18).
- **실제 사용된 lucide 아이콘 (23종)** 과 기본 size(px):

| 아이콘 | size | 사용 위치 |
|---|---|---|
| `Bell` | 16 | 상단바 알림(IconButton) |
| `Search` | 16 / 14 | 상단바 검색(16), 사이드바 검색 인풋(14) |
| `CircleHelp` | 16 | 상단바 도움말 |
| `LayoutGrid` | 16 | 상단바 앱 |
| `Menu` | 16 | 상단바 메뉴 |
| `ChevronsUpDown` | 14 | 상단바 워크스페이스 |
| `House` | 16 | 사이드바 "홈" |
| `FileText` | 16 / 18 | 사이드바 글 항목(16), slash tile(18), post-card tile(18) |
| `Plus` | 16 | "새 페이지" 버튼(Button 16), 섹션 액션(IconButton sm 14) |
| `Calendar` | 16 / 14 | 사이드바 "캘린더"(16), 상세 메타(14) |
| `SquareCheck` | 16 | 사이드바 "할 일" |
| `Trash2` | 16 | 사이드바 "휴지통"(16), 상세 삭제(16) |
| `Settings` | 16 | 사이드바 프로필 버튼 |
| `Star` | 16 / 13 / 18 | post-card fav(16), 사이드바 별(13), 상세 fav(18) |
| `SquarePen` | 18 | 컴포저 아이콘 |
| `ArrowUpDown` | 14 | 목록 정렬(IconButton sm) |
| `ChevronRight` | 16 / 14 | post-card 셰브론(16), 브레드크럼 구분(14) |
| `FilePlus2` | 40 | 빈 상태 tile |
| `ArrowLeft` | 16 | 상세 뒤로(IconButton) |
| `Mail` | 16 | 마이페이지 이메일 필드 |
| `Image`(→`ImageIcon`) | 16 | 마이페이지 "사진 변경" |
| `Check` | 16 | "저장되었습니다" |
| `LogOut` | 16 | 로그아웃 버튼(Button iconLeft) |

- **기본 size 규칙:** `IconButton` md=16 / sm=14, `Button` iconLeft=16, `SidebarItem` 아이콘=16·별=13. 그 외는 각 사용처에서 `size` prop으로 직접 지정(위 표).

---

## 2. 컴포넌트 카탈로그 (Primitives)

`components/ui/*`의 React 프리미티브 6개 + `globals.css`에 정의된 재사용 CSS 조각 전부. 각 항목: 용도 / props / 변형 / 크기 / 해부 / 상태별 스타일 / 예시 마크업.

### 2.1 Button · `components/ui/Button.tsx` + `.btn` (`globals.css:134-147`)

- **용도:** 주요 액션 버튼(파랑/보조).
- **props:** `variant?: "primary" | "secondary"`(기본 `primary`), `iconLeft?: LucideIcon`, `children`, `onClick?`, `type?: "button" | "submit"`(기본 `button`).
- **변형:** `.btn--primary`(파랑), `.btn--secondary`(흰 배경 + 경계선).
- **크기:** 높이 `34px`, padding `0 14px`, font 14/600, gap 7px, radius-md(8px). `iconLeft` 아이콘 size=16. `white-space: nowrap; flex: none`.
- **해부:** `<button class="btn btn--{variant}">` → (옵션)`<IconLeft size={16}/>` + `children`.
- **상태별 스타일:**

| 상태 | primary | secondary |
|---|---|---|
| default | bg `--accent`(#4e97f0), color `--text-on-accent`(#fff) | bg `--surface-card`(#fff), color `--text-body`, border `1px --border-default` |
| hover | bg `--accent-hover`(#3b82d6) | bg `--surface-hover`(#f1f2f3), border-color `--border-strong`(#d3d5d8) |
| active | bg `--accent-active`(#2f6bb5) + `transform: scale(0.97)` | `transform: scale(0.97)` |

- **예시:** `<Button variant="primary" iconLeft={Plus} onClick={...}>새 페이지</Button>` / `<Button variant="secondary" iconLeft={LogOut} onClick={app.logout}>로그아웃</Button>`

### 2.2 IconButton · `components/ui/IconButton.tsx` + `.icon-btn` (`globals.css:150-158`)

- **용도:** 아이콘 전용 정사각 버튼(상단바·정렬·섹션 액션·뒤로).
- **props:** `icon: LucideIcon`, `size?: "sm" | "md"`(기본 `md`), `title?`, `onClick?`. `title`은 `title` + `aria-label` 둘 다로 매핑.
- **변형/크기:** md `30×30`, radius-md, 아이콘 16 / sm `24×24`(`.icon-btn--sm`), radius-sm, 아이콘 14.
- **해부:** `<button type="button" class="icon-btn[ icon-btn--sm]" title aria-label><Icon size={16|14}/></button>`
- **상태별 스타일:** default color `--text-muted`(#8a8f98), bg none · hover bg `--surface-hover`, color `--text-secondary`(#6b7178) · active bg `--surface-active`(#ebeced).
- **예시:** `<IconButton icon={Bell} title="알림" />`, `<IconButton icon={ArrowUpDown} size="sm" title="정렬" />`

### 2.3 Badge · `components/ui/Badge.tsx` + `.badge` (`globals.css:161-165`)

- **용도:** 개수/라벨 pill.
- **props:** `children`.
- **크기/스타일:** 높이 `18px`, padding `0 7px`, radius-pill(999px), bg `--gray-100`(#f1f2f3), font 11/600, color `--text-secondary`, `line-height: 1`.
- **상태:** 단일(상태 없음).
- **예시:** `<Badge>{app.posts.length}</Badge>`, `<Badge>Google 계정</Badge>`

### 2.4 Avatar · `components/ui/Avatar.tsx` + `.avatar` (`globals.css:168-173`)

- **용도:** 프로필 아바타(이미지 or 이니셜 폴백).
- **props:** `name: string`, `src?: string | null`, `size?: number`(기본 `28`).
- **동작:** `src`가 있으면 `<img src={src} alt={name}>`, 없으면 `name.charAt(0)`(첫 글자) 표시.
- **크기 계산:** 인라인 style `width/height = size`, `fontSize = Math.round(size * 0.42)`. (예: 28→12px, 72→30px)
- **스타일:** 원형(50%), bg `--blue-100`(#dbe9fd), color `--blue-700`(#2f6bb5), font-weight 600, `overflow: hidden; user-select: none`. `img { width:100%; height:100%; object-fit: cover }`.
- **예시:** `<Avatar name={app.displayName} src={app.avatar} size={28} />`(사이드바), `size={72}`(마이페이지).

### 2.5 SidebarItem · `components/ui/SidebarItem.tsx` + `.sidebar-item` (`globals.css:191-202`)

- **용도:** 사이드바 네비 항목(홈·글·앱 메뉴).
- **props:** `icon: LucideIcon`, `label: string`, `active?: boolean`, `favorite?: boolean`, `onClick?`.
- **해부:** `<button class="sidebar-item[ is-active]">` → `.sidebar-item__icon`(Icon 16) + `.sidebar-item__label`(말줄임) + (favorite면)`.sidebar-item__star`(`Star size={13}`).
- **크기:** 높이 `32px`, padding `0 10px`, gap 8px, radius-md, font 13/500.
- **상태별 스타일:**

| 상태 | 스타일 |
|---|---|
| default | color `--text-secondary`; 아이콘 `--text-muted` |
| hover | bg `--surface-hover` |
| `.is-active` | bg `--surface-active`, color `--text-strong`, font-weight **600**; 아이콘 색 `--text-secondary` |
| `favorite`(`__star`) | 별 색 `--gold-500`(#ffbd18) |

- **예시:** `<SidebarItem icon={House} label="홈" active={pathname === "/"} onClick={...} />`, `<SidebarItem icon={FileText} label={title||"제목 없음"} favorite={post.favorite} active={...} />`

### 2.6 SidebarSection · `components/ui/SidebarSection.tsx` + `.sidebar-section*` (`globals.css:205-214`)

- **용도:** 사이드바 그룹(헤더 + 카운트 + 액션 + 내용/빈 상태).
- **props:** `label: string`, `count?: number`, `actions?: {icon, title, onClick}[]`, `children`.
- **해부:** `.sidebar-section` → `.sidebar-section__header`[ `<span>{label}` + (count 숫자면)`.sidebar-section__count` + (actions 있으면)`.sidebar-section__actions`(IconButton sm 목록) ] + `children`.
- **스타일:**
  - `__header`: 높이 28px, padding `0 10px`, gap 6px, font 12/700, color `--text-muted`, `letter-spacing: 0.02em`, `user-select: none`.
  - `__count`: font-weight 700, color `--text-placeholder`(#b0b3b8).
  - `__actions`: `margin-left: auto`, gap 2px, **기본 `opacity: 0`** → 헤더 hover 또는 `:focus-within` 시 `opacity: 1`.
  - `__empty`: padding `6px 10px`, font 12, color `--text-muted`, line-height 1.5.
- **예시:**
  ```tsx
  <SidebarSection label="내 글" count={app.posts.length}
    actions={[{ icon: Plus, title: "새 페이지", onClick: newPage }]}>
    {navPosts.map(...)}
    {app.posts.length === 0 && <div className="sidebar-section__empty">아직 글이 없어요.</div>}
  </SidebarSection>
  ```

### 2.7 CSS 전용 재사용 조각 (globals.css에 정의)

React 컴포넌트가 없는 인라인 프리미티브. 화면 코드에서 클래스로 직접 사용된다.

#### 2.7.1 검색 인풋 `.input-sm` · `globals.css:176-188`
- 용도: 사이드바 "글 검색". 높이 32px, padding `0 10px`, gap 7px, bg `--surface-subtle`, border `1px --border-subtle`, radius-md, color `--text-muted`.
- 자식 `input`: `flex:1; border:none; outline:none; background:transparent; font 13; color --text-body`.
- 상태: `:focus-within` → bg `--surface-card`, border-color `--border-focus`, box-shadow `--shadow-focus`.
- 마크업: `<div class="input-sm"><Search size={14}/><input placeholder="글 검색"/></div>`

#### 2.7.2 즐겨찾기 버튼 `.fav-btn` · `globals.css:359-367`
- 용도: post-card 별 토글. `28×28`, radius-sm, bg none, color `--text-placeholder`.
- 상태: hover bg `--surface-hover`; `.is-fav` color `--gold-500`.
- 마크업: `<button class="fav-btn[ is-fav]" title="즐겨찾기"><Star size={16}/></button>`

#### 2.7.3 상세 즐겨찾기 `.detail-fav-btn` · `globals.css:395-402`
- `30×30`, radius-md, color `--text-placeholder`; hover bg `--surface-hover`; `.is-fav` color `--gold-500`. 아이콘 `Star size={18}`.

#### 2.7.4 상세 삭제 버튼 `.detail-delete-btn` · `globals.css:403-410`
- 높이 30px, padding `0 12px`, gap 6px, font 13/600, color `--status-danger`(#f0483e), bg none, radius-md. hover bg `#fdeae9`(하드코딩 연빨강). 아이콘 `Trash2 size={16}` + 텍스트 "삭제".

#### 2.7.5 업로드 버튼 `.upload-btn` · `globals.css:440-447`
- 용도: 마이페이지 "사진 변경"(실제로는 `<label>` + 숨겨진 file input). 높이 34px, padding `0 14px`, gap 7px, bg `--surface-subtle`, radius-md, font 14/600, color `--text-body`. hover bg `--surface-hover`. `svg { color: --text-secondary }`. 아이콘 `ImageIcon size={16}`.

#### 2.7.6 필드 인풋 `.field-input` · `globals.css:452-458`
- 용도: 마이페이지 "별명". 폭 100%, 높이 42px, padding `0 12px`, bg `--surface-card`, border `1px --border-default`, radius-md, font 14, color `--text-body`, `outline:none`.
- 상태: `:focus` → border-color `--border-focus`, box-shadow `--shadow-focus`.

#### 2.7.7 읽기전용 필드 `.field-readonly` (+`__value`) · `globals.css:459-464`
- 용도: 마이페이지 "이메일". 높이 42px, padding `0 12px`, gap 8px, bg `--surface-subtle`, border `1px --border-subtle`, radius-md, color `--text-muted`.
- `__value`: `flex:1; font 14; color --text-secondary`. 마크업: `<Mail size={16}/> <span class="field-readonly__value">{email}</span> <Badge>Google 계정</Badge>`.

#### 2.7.8 브랜드칩 `.brand-chip` · `globals.css:225-229` (+ 로그인 변형 273)
- inline-flex, bg `--gray-900`(#191919), color `#fff`, radius `7px`, padding `3px 8px`, font 12/700, `letter-spacing: -0.02em`.
- 로그인 변형(`.login-card .brand-chip`): radius `9px`, padding `6px 11px`, font 15, `margin-bottom: 22px`.
- 내용: 텍스트 "mini".

#### 2.7.9 컴포저 `.composer` (+`-wrap`/`__icon`/`-hint`) · `globals.css:292-304`
- `-wrap`: `position: relative; margin: 24px 0 6px`(슬래시 메뉴 앵커).
- `.composer`: flex, gap 10px, bg `--surface-card`, border `1px --border-default`, radius-2xl(20px), shadow-sm, padding `9px 10px 9px 16px`.
- `__icon`: color `--text-muted`(`SquarePen size={18}`). `input`: flex:1, font 15, color `--text-body`.
- `-hint`: margin `0 0 26px`, font 12, color `--text-muted`; `b`는 color `--text-secondary`, weight 600.

#### 2.7.10 슬래시 메뉴 `.slash-menu*` · `globals.css:306-332`
- `.slash-menu`: `position:absolute; top: calc(100% + 6px); left:0; right:0`, bg `--surface-card`, border `1px --border-subtle`, radius-lg, shadow-lg, padding 6px, `z-index: 20`, `animation: mnPop 0.14s var(--ease-out)`.
- `__group`: padding `6px 10px 4px`, font 11/700, color `--text-muted`, `letter-spacing: 0.02em`.
- `__item`: flex, gap 12px, padding `8px 10px`, radius-md, bg none; hover bg `--surface-hover`.
- `__tile`: `34×34`, radius-md, bg `--accent-soft`, color `--accent`.
- `__name`: 13/600 `--text-strong`; `__desc`: 12 `--text-muted`.
- `kbd`: font-mono 11, color `--text-muted`, bg `--surface-subtle`, border `1px --border-subtle`, radius `5px`, padding `2px 7px`.

#### 2.7.11 글 카드 `.post-card*` · `globals.css:339-357`
- `.post-card`: flex, gap 14px, padding `13px 16px`, bg `--surface-card`, border `1px --border-subtle`, radius-lg, shadow-xs, cursor pointer.
  - hover: border-color `--border-default`, box-shadow `--shadow-md`, `transform: translateY(-1px)`.
- `__tile`: `38×38`, radius-md, bg `--surface-subtle`, color `--text-secondary`(`FileText size={18}`).
- `__title`: 14/600 `--text-strong`, 말줄임.
- `__preview`: 13 `--text-muted`, 말줄임, `margin-top: 1px`.
- `__date`: 12 `--text-muted`, `flex:none; white-space:nowrap`.
- `__chevron`: color `--text-muted`(`ChevronRight size={16}`).

#### 2.7.12 빈 상태 `.empty-state*` · `globals.css:369-380`
- `.empty-state`: center, padding `56px 24px`, `border: 1px dashed --border-default`, radius-lg, bg `--surface-subtle`.
- `__tile`: `64×64`, radius-xl, bg `--accent-soft`, color `--accent`, `margin-bottom: 16px`(`FilePlus2 size={40}`).
- `__title`: 16/600 `--text-strong`, `margin-bottom: 6px`.
- `__desc`: 13 `--text-secondary`, line-height 1.6; `b` color `--text-body`.

#### 2.7.13 저장 노트 `.saved-note` · `globals.css:467-471`
- inline-flex, gap 5px, font 13/600, color `--status-success`(#2eb872), `animation: mnPop 0.14s var(--ease-out)`. `Check size={16}` + "저장되었습니다".

#### 2.7.14 로그아웃 카드 `.logout-card*` · `globals.css:473-480`
- flex, gap 14px, `margin-top: 16px`, bg `--surface-card`, border `1px --border-subtle`, radius-lg, shadow-xs, padding `18px 24px`.
- `__title`: 14/600 `--text-strong`; `__desc`: 12 `--text-muted`, `margin-top: 1px`.

#### 2.7.15 스크롤바 `.mn-scroll` · `globals.css:122-125`
- `scrollbar-width: thin; scrollbar-color: var(--gray-300) transparent`.
- webkit: `::-webkit-scrollbar { width/height: 11px }`, thumb bg `--gray-200`, `border-radius: 8px`, `border: 3px solid var(--surface-page)`(트랙 여백 효과), thumb:hover bg `--gray-300`.
- 사용처: `.sidebar__scroll`, `.app-main`.

#### 2.7.16 글자 수 배지 `.detail-char-count` · `globals.css:424-430`
- 용도: 글 상세 화면 내용(content) 입력칸의 현재 글자 수를 화면 우측 하단에
  스크롤과 무관하게 항상 떠 있는 상태로 표시(spec FR-001~FR-003).
- **위치:** `position: fixed; right: 32px; bottom: 24px`. 뷰포트(`.app-root`/`.app-main`
  어느 조상에도 `transform`/`filter`/`will-change` 등 fixed의 containing block을
  바꾸는 속성이 없음을 확인) 기준 고정이며, 사이드바(`.sidebar`, 폭 264px)는 좌측에
  있으므로 우측 오프셋 기준 배치는 겹치지 않는다.
- **스타일:** bg `--gray-900`(#191919, `.brand-chip`과 동일 계열의 다크 배지 톤),
  color `--text-on-accent`(#ffffff), padding `4px 10px`, radius-md(8px),
  shadow-sm(`--shadow-sm`), font 12/600, `line-height: 1`.
- **레이어:** `z-index: 10`(본문 위, `.slash-menu`의 `z-index: 20`보다는 낮음),
  `pointer-events: none`(읽기 전용 표시이며 우측 하단 코너의 클릭·스크롤을 가리지 않음).
- **마크업:** `<span data-testid="content-char-count" class="detail-char-count">{post.content.length}</span>`
  — `.detail-content` textarea 바로 아래에 위치(`app/(app)/posts/[id]/page.tsx`).
- **값:** 항상 `post.content.length`(UTF-16 code unit 개수)를 그대로 표시하는 파생 값 —
  별도 상태·이펙트 없음(research.md §1·§2, data-model.md 참조).

### 2.8 PostCover · `components/PostCover.tsx` + `.detail-cover*` (`globals.css` 상세 섹션)

- **용도:** 글 상세 화면 상단(브레드크럼과 제목 사이)에 표시되는 랜덤 커버 이미지. 외부 오픈
  API에서 매 마운트 새로 받아온다. 엔드포인트는 환경변수 `NEXT_PUBLIC_COVER_IMAGE_URL`로
  설정하며(`.env.example` 참조), 미설정 시 기본값 `https://cataas.com/cat/cute`로 폴백한다.
  `Post` 데이터에 저장되지 않는 순수 표시용 일시(transient) 요소(spec FR-001·FR-002·FR-008).
- **props:** 없음(self-contained, `"use client"`).
- **로컬 상태(3-상태 기계):** `status: 'loading' | 'loaded' | 'error'`(초기 `'loading'`),
  `src`(마운트당 캐시버스팅 토큰을 붙인 요청 URL, `useState` 초기화 함수에서 1회 생성 —
  리렌더로 재요청/깜빡이지 않음).
- **상태 전이:**

  | 상태 | 렌더 | 트리거 |
  |---|---|---|
  | `loading` | 고정 높이 컨테이너 + shimmer 스켈레톤 오버레이. `<img>`는 DOM에 있으나 `opacity:0` | 마운트 시 진입 |
  | `loaded` | 스켈레톤 제거, `<img>` `opacity:1` 페이드인. 컨테이너 높이 불변(layout shift 0) | `<img>` `load` 이벤트 |
  | `error` | 컴포넌트가 `null` 반환 — 커버 영역 전체 collapse(편집 화면은 정상 유지) | `<img>` `error` 이벤트 |

  전이는 단방향(`loading → loaded` 또는 `loading → error`), 되돌아가지 않는다. 인위적
  타임아웃·재시도 없음(FR-009) — 스피너 대신 스켈레톤을 로드 완료까지 유지한다(FR-003).
- **해부(마크업):**
  ```tsx
  <div className="detail-cover" data-testid="detail-cover">
    <img
      className="detail-cover__img"
      data-testid="cover-image"
      src={src}
      alt=""                                 // 장식용, 매 진입 무작위라 서술 불가(§7)
      data-loaded={status === "loaded"}
      onLoad={() => setStatus("loaded")}
      onError={() => setStatus("error")}
    />
    {status !== "loaded" && (
      <div className="detail-cover__skeleton" data-testid="cover-skeleton" aria-hidden="true" />
    )}
  </div>
  ```
- **스타일:**

  | 셀렉터 | 스타일 | 토큰 |
  |---|---|---|
  | `.detail-cover` | `position: relative; width: 100%; height: 200px; border-radius: var(--radius-lg); overflow: hidden; margin-bottom: 20px;` | `--radius-lg`(12px). 높이 `200px`는 이 기능의 신규 확정값(상세 컨테이너 max-width 760px에 어울리는 배너 높이, research.md §3) |
  | `.detail-cover__img` | `width: 100%; height: 100%; object-fit: cover; display: block; opacity: 0; transition: opacity var(--dur-normal) var(--ease-standard);` + `[data-loaded="true"] { opacity: 1 }` | `--dur-normal`(180ms), `--ease-standard`. `Avatar`(§2.4)와 동일한 `object-fit: cover` 패턴 |
  | `.detail-cover__skeleton` | `position: absolute; inset: 0; background: linear-gradient(90deg, var(--surface-hover) 25%, var(--surface-subtle) 37%, var(--surface-hover) 63%); background-size: 200% 100%; animation: mnShimmer 1.4s linear infinite;` | `--surface-hover`(#f1f2f3), `--surface-subtle`(#f7f8f9) — 뉴트럴 램프, 스피너 대신(FR-003) |

- **캐시버스팅:** `src` = `COVER_ENDPOINT + "?t=" + <마운트당 고유 토큰>`. 동일 URL의 브라우저
  캐시 재사용을 막아 매 진입 새 랜덤 이미지를 강제한다(FR-008, research.md §2).
- **예시:** `app/(app)/posts/[id]/page.tsx`에서 `.detail-breadcrumb`와 `<input class="detail-title">`
  사이에 `<PostCover />`를 삽입(§4.3).

---

## 3. 앱 셸 / 레이아웃 (App Shell)

출처: `components/AppShell.tsx` + `.app-root/.topbar/.app-body/.sidebar/.app-main` (`globals.css:219-259`). 라우트 그룹 `app/(app)/layout.tsx`가 `<AppShell>`로 모든 앱 화면을 감싼다.

### 3.1 전체 골격

```
.app-root (height:100vh, column, overflow:hidden)
├── header.topbar (height:48px)
└── .app-body (flex:1, row, min-height:0)
    ├── nav.sidebar (width:264px)
    │   ├── .sidebar__inner (padding:10px 8px)
    │   │   ├── SidebarItem "홈"
    │   │   ├── spacer 8px
    │   │   ├── .input-sm (검색 "글 검색")
    │   │   ├── spacer 12px
    │   │   └── .sidebar__scroll.mn-scroll
    │   │       ├── SidebarSection "내 글" (count, +액션)
    │   │       ├── spacer 10px
    │   │       └── SidebarSection "앱" (캘린더/할 일/휴지통)
    │   └── button.sidebar__profile (하단 고정, border-top)
    └── main.app-main.mn-scroll → {children}
```

- `.app-root`: `height:100vh; display:flex; flex-direction:column; overflow:hidden; background:--surface-page`.
- `.app-body`: `flex:1; display:flex; min-height:0`.
- `.app-main`: `flex:1; min-width:0; height:100%; overflow-y:auto; background:--surface-page`.

### 3.2 상단바 (`.topbar`)

- 스타일: 높이 48px, `display:flex; align-items:center; gap:12px`, padding `0 12px 0 14px`, `border-bottom: 1px --border-subtle`, bg `--surface-page`, `flex:none`.
- **왼→오 순서:**
  1. `.brand-chip` — 텍스트 "mini".
  2. `.topbar__workspace`(flex, gap 5px, cursor pointer, color `--text-muted`): `.topbar__title` "미니 노션"(15/700, `--text-strong`, `-0.01em`) + `ChevronsUpDown size={14}`.
  3. `.topbar__spacer`(flex:1).
  4. `.topbar__bell`(position:relative): `<IconButton icon={Bell} title="알림" />` + `.topbar__bell-dot`.
     - `__bell-dot`: `position:absolute; top:5px; right:6px; 7×7; border-radius:50%; bg --red-500; border:1.5px solid --surface-page; pointer-events:none`.
  5. `<IconButton icon={Search} title="검색" />`
  6. `<IconButton icon={CircleHelp} title="도움말" />`
  7. `<IconButton icon={LayoutGrid} title="앱" />`
  8. `<IconButton icon={Menu} title="메뉴" />`

### 3.3 사이드바 (`.sidebar`)

- 스타일: `width:264px; flex:none; height:100%; display:flex; flex-direction:column; border-right:1px --border-subtle; bg --surface-sidebar`.
- `.sidebar__inner`: `flex:1; min-height:0; display:flex; flex-direction:column; padding:10px 8px`.
- `.sidebar__scroll`: `flex:1; min-height:0; overflow-y:auto; margin-right:-4px; padding-right:4px`(+`.mn-scroll`).
- **구성 순서:**
  1. `<SidebarItem icon={House} label="홈" active={pathname === "/"} onClick={()=>router.push("/")} />`
  2. 간격 `<div style={{height:8}} />`
  3. 검색 `.input-sm` — `<Search size={14}/>` + `<input placeholder="글 검색">`(상태 `search`).
  4. 간격 `<div style={{height:12}} />`
  5. `.sidebar__scroll`:
     - `SidebarSection label="내 글" count={app.posts.length}` + 액션 `[{icon:Plus, title:"새 페이지", onClick:newPage}]`.
       - 내용: `navPosts.map(post => <SidebarItem icon={FileText} label={post.title.trim()||"제목 없음"} favorite={post.favorite} active={pathname===`/posts/${post.id}`} onClick={()=>router.push(`/posts/${post.id}`)} />)`.
       - `app.posts.length === 0`이면 `<div class="sidebar-section__empty">아직 글이 없어요.</div>`.
     - 간격 `<div style={{height:10}} />`
     - `SidebarSection label="앱"`: `SidebarItem 캘린더(Calendar)`, `할 일(SquareCheck)`, `휴지통(Trash2)` — **onClick 없음(비활성/장식)**.

- **프로필 버튼(`.sidebar__profile`, 하단 고정):**
  - `display:flex; align-items:center; gap:10px; padding:10px 12px; width:100%; text-align:left; border-top:1px --border-subtle; bg transparent; color --text-muted`; hover bg `--surface-hover`.
  - 내용: `<Avatar name={app.displayName} src={app.avatar} size={28} />` + `.sidebar__profile-body`[`.sidebar__profile-name`(displayName) `<br/>` `.sidebar__profile-sub` "마이 페이지"] + `<Settings size={16} />`.
  - onClick: `router.push("/mypage")`.

### 3.4 본문 (`.app-main`)

- `<main class="app-main mn-scroll">{children}</main>` — 스크롤 가능한 콘텐츠 영역.

### 3.5 인증 가드 (AppShell 내부)

- `useEffect`: `if (app.loaded && !app.loggedIn) router.replace("/login")`.
- 렌더 가드: `if (!app.loaded || !app.loggedIn) return null;` — 로드 전/비로그인 시 셸 자체를 그리지 않음.
- 사이드바 검색 필터: `q = search.trim().toLowerCase()`; `navPosts = q ? app.posts.filter(p => (p.title||"제목 없음").toLowerCase().includes(q)) : app.posts`.
- `newPage = () => { const post = app.createPost(""); router.push(`/posts/${post.id}`) }`.

---

## 4. 화면별 명세 (Screens)

4개 화면: 로그인 `/login`, 업무 페이지(글 목록) `/`, 글 상세 `/posts/[id]`, 마이 페이지 `/mypage`.

### 4.1 로그인 `/login` · `app/login/page.tsx` + `.login-*`(`globals.css:264-283`)

- **레이아웃:** `.login-page`(min-height:100vh, center, bg `--surface-subtle`(#f7f8f9), padding 24px) 중앙에 `.login-card`.
- **`.login-card`:** `width:400px; max-width:100%; bg --surface-card; border:1px --border-subtle; border-radius:--radius-lg; box-shadow:--shadow-md; padding:44px 40px 32px; text-align:center`.
- **구성(위→아래):**
  1. `.brand-chip` "mini" (로그인 변형: radius 9px, padding 6px 11px, font 15, margin-bottom 22px).
  2. `<h1>` "미니 노션" (26/700, `--text-strong`, -0.02em, margin `0 0 8px`).
  3. `.login-card__desc` (14/1.6, `--text-secondary`, margin `0 0 30px`): "나만의 가벼운 업무 관리 공간." `<br/>` "구글 계정으로 바로 시작하세요."
  4. `.login-google-btn` (width 100%, height 46px, gap 10px, bg `--surface-card`, border 1px `--border-default`, radius-md, 14/600, `--text-body`): `<GoogleLogo/>`(인라인 SVG 4색) + "Google 계정으로 계속하기". hover: bg `--surface-hover`, border-color `--border-strong`.
  5. `.login-card__terms` (12/1.6, `--text-muted`, margin `22px 0 0`): "로그인하면 서비스 약관 및 개인정보 처리방침에" `<br/>` "동의하는 것으로 간주됩니다."
- **상호작용:**
  - `handleLogin`: `app.login()` → **실제 Google OAuth 리다이렉트 시작**(Supabase Auth `signInWithOAuth({ provider: "google" })`). 성공 시 브라우저가 Google로 떠나므로 라우팅 없음. 진행 중 재클릭은 `pending` 플래그 + `disabled`로 차단(시각적 변화 없음 — `:disabled` 스타일 미정의), 시작 실패(네트워크 등) 시 `pending` 해제로 재시도 가능.
  - 진입 시 `if (app.loaded && app.loggedIn) router.replace("/")` — 이미 로그인 상태면 워크스페이스로.
- **특수 상태:** 없음(에러/로딩 UI 없음 — pending 중에도 버튼 외관 불변).

### 4.2 업무 페이지(글 목록) `/` · `app/(app)/page.tsx` + `.list-*`(`globals.css:288-380`)

- **컨테이너:** `.list-page`(max-width 820px, 중앙, padding `36px 28px 72px`).
- **구성(위→아래):**
  1. `<h1 class="list-page__title">` "내 업무" (28/700).
  2. `<p class="list-page__subtitle">` "기록하고 싶은 것을 자유롭게 남겨보세요." (14, `--text-secondary`).
  3. **컴포저** `.composer-wrap > .composer`:
     - `.composer__icon`(`SquarePen size={18}`) + `<input placeholder="/page 를 입력하거나 할 일을 적어보세요">`(상태 `query`) + `<Button variant="primary" iconLeft={Plus} onClick={()=>createPage("")}>새 페이지</Button>`.
  4. **슬래시 메뉴** (`showSlash` = `query.trim().startsWith("/")`일 때만):
     - `.slash-menu`: `.slash-menu__group` "기본 블록" + `.slash-menu__item`(onClick `createPage("")`):
       - `.slash-menu__tile`(`FileText size={18}`) + `.slash-menu__body`[`.slash-menu__name` "페이지" `<br/>` `.slash-menu__desc` "제목과 내용이 있는 새 글을 만듭니다"] + `<kbd>/page</kbd>`.
  5. `<p class="composer-hint">` : "노션처럼 " `<b>/page</b>` " 를 입력하고 Enter를 누르면 새 글이 만들어져요."
  6. **목록 or 빈 상태** (`app.posts.length > 0` 분기):
     - **목록 있을 때:**
       - `.list-head`: `.list-head__label` "전체" + `<Badge>{count}</Badge>` + `.list-head__spacer` + `<IconButton icon={ArrowUpDown} size="sm" title="정렬" />`.
       - `.post-list`(gap 8px): 각 글 `.post-card`(`role="link" tabIndex={0}`, onClick/Enter → 상세):
         - `.post-card__tile`(`FileText size={18}`)
         - `.post-card__body`[`.post-card__title`(=`post.title.trim()||"제목 없음"`) `<br/>` `.post-card__preview`(=`post.content.replace(/\s+/g," ").trim().slice(0,90) || "내용 없음"`)]
         - `.post-card__date`(=`formatDate(post.createdAt)`)
         - `.fav-btn[ is-fav]`(title "즐겨찾기", `Star size={16}`, onClick `stopPropagation` + `toggleFavorite`)
         - `.post-card__chevron`(`ChevronRight size={16}`)
     - **빈 상태(`.empty-state`):**
       - `.empty-state__tile`(`FilePlus2 size={40}`)
       - `.empty-state__title` "첫 글을 만들어 보세요"
       - `.empty-state__desc`: "위 입력창에 " `<b>/page</b>` " 를 입력하고 Enter를 누르거나" `<br/>` "'새 페이지' 버튼을 눌러 시작하세요." (원문에 좌우 홑따옴표 `‘새 페이지’` 사용)
- **상호작용(슬래시 커맨드):** → [§5.1](#51-page-슬래시-커맨드로-새-글-생성) 참조.

### 4.3 글 상세 `/posts/[id]` · `app/(app)/posts/[id]/page.tsx` + `.detail-*`(`globals.css:385-430`)

- **컨테이너:** `.detail-page`(max-width 760px, 중앙, padding `18px 28px 96px`).
- **구성(위→아래):**
  1. **브레드크럼** `.detail-breadcrumb`(gap 8px, margin-bottom 22px):
     - `<IconButton icon={ArrowLeft} title="뒤로" onClick={()=>router.push("/")} />`
     - `.detail-breadcrumb__root`(13, `--text-muted`, hover `--text-secondary`) "내 업무" (onClick → `/`)
     - `.detail-breadcrumb__sep`(`ChevronRight size={14}`, color `--text-placeholder`)
     - `.detail-breadcrumb__current`(13/500, `--text-secondary`, max-width 280px 말줄임) = `post.title.trim() || "제목 없음"`
     - `.detail-breadcrumb__spacer`(flex:1)
     - `.detail-fav-btn[ is-fav]`(title "즐겨찾기", `Star size={18}`, onClick `toggleFavorite`)
     - `.detail-delete-btn`(`Trash2 size={16}` + "삭제", onClick `handleDelete`)
  2. **커버 이미지** `<PostCover />`(§2.8) — 브레드크럼과 제목 입력창 사이. 고정 높이
     `200px` 컨테이너(`.detail-cover`)에 랜덤 고양이 이미지(`cataas.com/cat/cute`)를
     로드하는 동안 shimmer 스켈레톤을 표시하고, 로드 완료 시 페이드인, 실패 시 컨테이너
     전체를 collapse한다(spec FR-001~FR-005·FR-008~FR-009).
  3. **제목** `<input class="detail-title" placeholder="제목 없음">` (34/700, -0.02em, lh 1.25, margin-bottom 10px), value=`post.title`, onChange → `updatePost(id,{title})`.
  4. **메타** `.detail-meta`(gap 7px, margin-bottom 22px, color `--text-muted`): `Calendar size={14}` + `<span>{formatDate(post.createdAt)} 작성</span>` + `.detail-meta__dot`(3×3 원, bg `--gray-300`) + `<span>자동 저장됨</span>`.
  5. **본문** `<textarea class="detail-content" placeholder="내용을 입력하세요. 떠오르는 생각, 할 일, 메모를 자유롭게 기록해 보세요.">` (15/1.75, `--text-body`, min-height 340px, `resize:none`), value=`post.content`, onChange → `updatePost(id,{content})`.
  6. **글자 수 배지** `.detail-char-count`(§2.7.16) — 화면 우측 하단 고정,
     `data-testid="content-char-count"` = `post.content.length`(spec FR-001·FR-002·FR-004~FR-006).
- **상호작용:**
  - `handleDelete`: `window.confirm("이 글을 삭제할까요? 삭제하면 되돌릴 수 없어요.")` → 확인 시 `deletePost(id)` + `router.push("/")`.
  - 가드: `if (app.loaded && !post) router.replace("/")`(삭제/없는 글). `if (!post) return null`.
  - 제목/내용은 입력 즉시 자동 저장(스토어 → localStorage).
  - 커버(`PostCover`)는 페이지 상태·`post`와 무관하게 독립 동작 — 편집을 방해·지연시키지
    않는다(FR-006, §2.8).

### 4.4 마이 페이지 `/mypage` · `app/(app)/mypage/page.tsx` + `.mypage*`(`globals.css:428-480`)

- **컨테이너:** `.mypage`(max-width 600px, 중앙, padding `40px 28px 80px`).
- **구성(위→아래):**
  1. `<h1 class="mypage__title">` "마이 페이지" (26/700).
  2. `<p class="mypage__subtitle">` "서비스에서 사용할 프로필 정보를 관리하세요." (14, `--text-secondary`, margin-bottom 28px).
  3. **프로필 카드** `.mypage-card`(bg card, border 1px `--border-subtle`, radius-lg, shadow-xs, padding 28px):
     - **아바타 행** `.mypage-avatar-row`(gap 18px, padding-bottom 24px, border-bottom 1px `--border-subtle`):
       - `<Avatar name={app.displayName} src={app.avatar} size={72} />`
       - `.mypage-avatar-row__body`: `__name` "프로필 이미지"(15/600) + `__hint` "JPG, PNG · 정사각형 이미지를 권장합니다."(12, `--text-muted`) + `.upload-btn`(`<label>`): `ImageIcon size={16}` + "사진 변경" + 숨겨진 `<input type="file" accept="image/*" style={{display:"none"}}>`.
     - **별명 필드** `.mypage-field`(padding `22px 0 4px`): `<label for="nickname">` "별명" + `<input id="nickname" class="field-input" placeholder="사용할 별명을 입력하세요">`(상태 `nickDraft`).
     - **이메일 필드** `.mypage-field.mypage-field--email`(padding `16px 0 24px`): `<label>` "이메일" + `.field-readonly`[`Mail size={16}` + `.field-readonly__value`(=`app.email`) + `<Badge>Google 계정</Badge>`].
     - **푸터** `.mypage-card__footer`(gap 12px, padding-top 20px, border-top 1px `--border-subtle`): `<Button variant="primary" onClick={saveProfile}>변경사항 저장</Button>` + (`saved`일 때)`.saved-note`(`Check size={16}` + "저장되었습니다").
  4. **로그아웃 카드** `.logout-card`(margin-top 16px, padding `18px 24px`): `.logout-card__body`[`__title` "로그아웃" + `__desc` "이 기기에서 계정을 로그아웃합니다."] + `<Button variant="secondary" iconLeft={LogOut} onClick={app.logout}>로그아웃</Button>`.
- **상호작용:**
  - 초기: `useEffect(()=>{ if(app.loaded) setNickDraft(app.displayName) }, [app.loaded])`.
  - `saveProfile`(async): `await saveNickname(nickDraft)`(Supabase `profile.name` 업데이트, §5.9) → 성공 시 `setSaved(true)` → `setTimeout(()=>setSaved(false), 1800)`(1800ms 후 노트 사라짐), 실패 시 `window.alert("저장에 실패했습니다. 잠시 후 다시 시도해주세요.")`(삭제 확인창과 같은 브라우저 기본 다이얼로그 패턴, §5.4). 언마운트 시 타이머 정리.
  - `onAvatarPick`(async): 파일 선택 → input value 즉시 리셋(같은 파일 재선택 허용) → `app.saveAvatar(file)`(Supabase Storage 업로드, §5.10). 업로드 중에는 `uploading` 플래그 + file input `disabled`로 재진입 차단(로그인 `pending`과 같은 무변화 가드 패턴, §4.1). 실패 시 `window.alert("사진 업로드에 실패했습니다. 잠시 후 다시 시도해주세요.")`. 성공 피드백은 별도 노트 없이 아바타 이미지 즉시 갱신으로 대신한다.
  - 로그아웃: `app.logout()` → (AppShell 가드가) `/login`으로 리다이렉트.

---

## 5. 상호작용 · 동작 명세 (Behavior)

출처: `lib/store.tsx` + 각 페이지 로직.

### 5.1 `/page` 슬래시 커맨드로 새 글 생성

- 목록 페이지 컴포저 `onQueryKey`(`app/(app)/page.tsx`):
  - `Escape` → `setQuery("")`(닫기).
  - `Enter`(그 외 키는 무시):
    - `q = query.trim()`; 빈 문자열이면 무시.
    - `q.toLowerCase().startsWith("/page")` → `createPage(q.slice(5).trim())`(`/page` 뒤 텍스트를 제목으로).
    - `q.startsWith("/")`(그 외 `/명령`) → **무시(대기)**.
    - 그 외 일반 텍스트 → `createPage(q)`(입력 자체를 제목으로).
  - `showSlash`(=`query.trim().startsWith("/")`)이면 슬래시 메뉴 표시. 메뉴 아이템 클릭 → `createPage("")`.
  - `createPage(title)`: `app.createPost(title)` → `setQuery("")` → `router.push(`/posts/${post.id}`)`.
- "새 페이지" 버튼(컴포저·사이드바 액션): `createPost("")` 후 상세로 이동.

### 5.2 제목/내용 자동 저장

- 상세 페이지에서 `onChange` 즉시 `updatePost(id, {title|content})` 호출 → 스토어 setState → `useEffect([state])`가 localStorage에 저장. 별도 저장 버튼 없음. UI 표기: 메타 영역 "자동 저장됨".

### 5.3 즐겨찾기 토글

- `toggleFavorite(id)`: 해당 post의 `favorite`를 반전. 목록 카드 별(`.fav-btn`, 이벤트 전파 차단), 상세 별(`.detail-fav-btn`), 사이드바 항목 별(`favorite` prop) 모두 반영. 활성 색 `--gold-500`.

### 5.4 글 삭제

- 상세 `handleDelete`: `window.confirm("이 글을 삭제할까요? 삭제하면 되돌릴 수 없어요.")` → 확인 시 `deletePost(id)`(배열에서 filter) → `/`로 이동.

### 5.5 로그인 / 로그아웃 / 인증 가드

- **실제 Google OAuth(Supabase Auth, PKCE)** 기반. 클라이언트: `lib/supabase.ts`(`@supabase/supabase-js` 브라우저 싱글턴, env `NEXT_PUBLIC_SUPABASE_URL`/`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`).
- `login()`: `supabase.auth.signInWithOAuth({ provider: "google", options: { redirectTo: origin + "/" } })` — Google로 리다이렉트, 실패 시 `AuthError` 반환. 인증 후 `{origin}/?code=…`로 복귀하면 supabase-js가 자동으로 코드 교환(`detectSessionInUrl`) 후 URL 정리.
- `logout()`: `supabase.auth.signOut()` — `SIGNED_OUT` 이벤트로 상태 반영.
- `loggedIn`은 **Supabase 세션 유무의 파생값**(`!!account`). 스토어는 `onAuthStateChange`(INITIAL_SESSION 포함)를 구독해 세션의 이메일/이름(`user_metadata.full_name ?? name`)/사진(`user_metadata.avatar_url ?? picture`)을 `account`로 매핑. 로그인 시 profile 행(별명) 동기화는 [§5.9](#59-supabase-profile-테이블-연동-별명-영속화) 참조.
- 로그인 페이지: 이미 로그인 시 `/`로 `replace`.
- AppShell: `loaded && !loggedIn` → `/login`으로 `replace`, 그 전까지 `return null`.
- 상세: `loaded && !post` → `/`로 `replace`.

### 5.6 상태 모델 · localStorage 영속화

- **Post 타입:** `{ id: string; title: string; content: string; favorite: boolean; createdAt: number }`.
- **AppState:** `{ dataLoaded, authLoaded, posts: Post[], nickname: string|null, imagePath: string|null, account: Account|null }`. `Account = { id, email, name, avatarUrl }`(구글 세션에서 매핑, §5.5; `id`는 `auth.users.id` — profile 연동 키, §5.9). `imagePath`는 업로드된 프로필 이미지의 버킷 내 경로(§5.10).
- **파생값(외부 API):** `loaded = dataLoaded && authLoaded`, `loggedIn = !!account`, `displayName = nickname || account.name || "김민수"`, `email = account.email ?? ""`, `avatar = profileImageUrl(imagePath) ?? account.avatarUrl ?? null`(업로드 이미지가 우선, 없으면 구글 프로필 사진; `profileImageUrl` = env 앞부분 + `/` + `imagePath`, §5.10).
- **localStorage 키:** `"mini-notion-v1"`.
- **저장 스키마:** `JSON.stringify({ posts, nickname, imagePath })` — **로그인 상태는 저장하지 않음**(세션은 supabase-js가 자체 관리). `dataLoaded` 이후 모든 변경 시 저장(`useEffect([state])`).
- **로드:** 최초 마운트에서 `localStorage.getItem(KEY)` → 있으면 파싱(`posts` 배열 검증, `nickname/imagePath` 없으면 null), 없거나 파싱 실패 시 `seed()`로 시드. 과거 스키마의 `loggedIn`·`avatar`(base64 dataUrl) 필드는 무시.
- **uid 생성:** `Date.now().toString(36) + Math.random().toString(36).slice(2, 6)`.
- **createPost:** `{ id, title: (title||"").trim(), content: "", favorite: false, createdAt: Date.now() }`를 배열 **맨 앞에 추가**(최신 우선).
- **saveNickname(async):** `(nick||"").trim() || null`(빈 값이면 null → displayName은 다시 구글 이름/"김민수")을 로컬 상태에 즉시 반영한 뒤 Supabase `profile.name`에 업데이트(§5.9). 성공 여부 `Promise<boolean>` 반환 — 마이페이지가 실패 알림에 사용(§4.4).
- **saveAvatar(async):** 선택한 파일을 Supabase Storage에 업로드하고 `profile.image_path`를 갱신(§5.10). 성공 여부 `Promise<boolean>` 반환 — 마이페이지가 실패 알림에 사용(§4.4).

### 5.7 날짜 포맷 규칙 (`formatDate`)

- 오늘 자정 기준 경과 일수 `days` 계산:
  - `days === 0` → `"오늘"`
  - `days === 1` → `"어제"`
  - 그 외 → `` `${d.getMonth()+1}월 ${d.getDate()}일` ``(예: "7월 3일")
- 상세 메타에서는 `` `${formatDate} 작성` ``으로 표시.

### 5.8 최초 방문 시드 데이터 (`seed()`)

`now = Date.now()`, `H = 3600e3`(1시간), `D = 24*H`(1일). 배열 순서대로:

| # | title | content | favorite | createdAt |
|---|---|---|---|---|
| 1 | `이번 주 할 일 정리` | `- 디자인 시안 마무리\n- 개발 일정 공유\n- 회의록 정리해서 팀에 전달\n- 다음 스프린트 백로그 다듬기` | `true` | `now - 2*D` |
| 2 | `회의 준비 메모` | `다음 주 킥오프 미팅 안건\n\n1. 이번 분기 목표 정렬\n2. 역할과 담당 분담\n3. 마일스톤과 일정 확정` | `false` | `now - 1*D` |
| 3 | `아이디어 노트` | `개인 생산성 도구에 추가하면 좋을 기능들을 떠오를 때마다 적어두는 공간. 태그, 검색, 할 일 체크박스 등.` | `false` | `now - 4*H` |
| 4 | `읽을거리 모음` | `""`(빈 내용) | `false` | `now - 40*60e3`(40분 전) |

### 5.9 Supabase profile 테이블 연동 (별명 영속화)

별명(nickname)은 localStorage와 별개로 Supabase `public.profile` 테이블(auth 사용자와 1:1)에 영속화된다.

- **스키마:** `profile { id uuid PK, created_at, name text|null, introduction text|null, image_path text|null, user_id uuid FK→auth.users.id (unique, on delete cascade) }`. `user_id` unique 제약으로 1:1 보장. RLS 활성 + 본인 행(select/insert/update, `auth.uid() = user_id`)만 허용. `introduction`은 자기소개 저장용 선택 컬럼(현재 UI 미사용 — `specs/003-profile-introduction` 예정). `image_path`는 프로필 이미지의 버킷 내 경로(§5.10).
- **최초 로그인 자동 생성:** DB 트리거 `on_auth_user_created`(`auth.users` insert 시 `public.handle_new_user()` — SECURITY DEFINER, REST 노출 차단)가 profile 행을 생성하고, `name` 초기값으로 auth 사용자의 Display name(`raw_user_meta_data`의 `display_name → full_name → name` 순 coalesce; 구글 계정 이름)을 넣는다.
- **클라이언트 로드(`syncProfile`):** `onAuthStateChange`의 `INITIAL_SESSION`/`SIGNED_IN`에서 다음 틱으로 미뤄(auth 락 교착 회피) `profile.name, image_path`를 조회해 `nickname`·`imagePath` 상태에 반영 — **DB가 별명·프로필 이미지의 원본**. 행이 없으면(트리거 도입 이전 가입자) 구글 이름을 초기값으로 insert.
- **저장:** `saveNickname`이 로컬 상태 반영 후 `profile.name`을 update(§5.6). 실패 UI는 §4.4.

### 5.10 Supabase Storage 프로필 이미지 연동 (아바타 영속화)

프로필 이미지는 base64/localStorage가 아니라 **Supabase Storage**에 영속화된다. (`lib/store.tsx` `saveAvatar`)

- **버킷:** `profile-image` (public). 파일명은 `crypto.randomUUID()`(UUID v4) + 원본 확장자(`.png` 폴백, 소문자) — 예: `550e8400-e29b-41d4-a716-446655440000.png`. 사용자별 하위 폴더 없음(경로 = 파일명).
- **다운로드 URL 분리 저장:** 전체 공개 URL을 두 부분으로 나눈다.
  - **앞부분(스토리지 주소~버킷명):** 환경변수 `NEXT_PUBLIC_PROFILE_IMAGE_BASE_URL` — 예: `https://<project>.supabase.co/storage/v1/object/public/profile-image` (`.env.example` 참조).
  - **뒷부분(버킷명 이후):** `profile.image_path` 컬럼 — 예: `550e8400-….png`.
  - 표시 URL은 `profileImageUrl(path)` = `base(끝 슬래시 제거) + "/" + path`. env 미설정 또는 `image_path` null이면 null → 구글 프로필 사진 폴백(§5.6).
- **업로드 흐름(`saveAvatar`):** ① Storage `upload(path, file, { contentType: file.type })` → ② `profile.image_path` update(실패 시 방금 올린 파일 제거 후 false) → ③ 로컬 `imagePath` 상태 갱신 → ④ 이전 파일 best-effort `remove`(고아 파일 방지, 실패 무시). 비로그인(`userId` 없음)이면 즉시 false.
- **Storage RLS 정책(`storage.objects`):** insert — `authenticated` + `bucket_id = 'profile-image'` / delete — `authenticated` + 본인 소유(`owner_id = auth.uid()::text`). 조회는 public 버킷의 공개 URL로 정책 불요. (마이그레이션 `profile_image_storage_policies`)

## 6. 콘텐츠 / 카피 인벤토리 (Content)

사용자에게 보이는 **모든 한국어/텍스트 문자열**을 화면별로 정리(원문 그대로). placeholder 데이터 포함.

### 6.1 공통 / 앱 셸

| 위치 | 문구 |
|---|---|
| 브랜드칩(상단바·로그인) | `mini` |
| 워크스페이스 타이틀 | `미니 노션` |
| 상단바 아이콘 title | `알림` / `검색` / `도움말` / `앱` / `메뉴` |
| 사이드바 홈 | `홈` |
| 사이드바 검색 placeholder | `글 검색` |
| 섹션 "내 글" 라벨 / 액션 title | `내 글` / `새 페이지` |
| 글 제목 폴백(사이드바·카드·브레드크럼·제목 placeholder) | `제목 없음` |
| 섹션 빈 상태 | `아직 글이 없어요.` |
| 섹션 "앱" + 항목 | `앱` / `캘린더` / `할 일` / `휴지통` |
| 프로필 서브 | `마이 페이지` |
| 프로필 이름(기본) | 구글 계정 이름 (별명 없을 때; 그것도 없으면 `김민수`) |
| 문서 메타(title/description) | `미니 노션` / `나만의 가벼운 업무 관리 공간` |

### 6.2 로그인

| 위치 | 문구 |
|---|---|
| 제목 | `미니 노션` |
| 설명 | `나만의 가벼운 업무 관리 공간.` / `구글 계정으로 바로 시작하세요.` |
| 버튼 | `Google 계정으로 계속하기` |
| 약관 | `로그인하면 서비스 약관 및 개인정보 처리방침에` / `동의하는 것으로 간주됩니다.` |

### 6.3 업무 페이지(글 목록)

| 위치 | 문구 |
|---|---|
| 제목 | `내 업무` |
| 서브타이틀 | `기록하고 싶은 것을 자유롭게 남겨보세요.` |
| 컴포저 placeholder | `/page 를 입력하거나 할 일을 적어보세요` |
| 새 페이지 버튼 | `새 페이지` |
| 슬래시 메뉴 그룹 | `기본 블록` |
| 슬래시 아이템 이름/설명/kbd | `페이지` / `제목과 내용이 있는 새 글을 만듭니다` / `/page` |
| 컴포저 힌트 | `노션처럼 /page 를 입력하고 Enter를 누르면 새 글이 만들어져요.` (`/page`만 강조) |
| 리스트 헤드 라벨 / 정렬 title | `전체` / `정렬` |
| 카드 내용 폴백 | `내용 없음` |
| fav 버튼 title | `즐겨찾기` |
| 빈 상태 제목 | `첫 글을 만들어 보세요` |
| 빈 상태 설명 | `위 입력창에 /page 를 입력하고 Enter를 누르거나` / `‘새 페이지’ 버튼을 눌러 시작하세요.` |

### 6.4 글 상세

| 위치 | 문구 |
|---|---|
| 뒤로 title | `뒤로` |
| 브레드크럼 루트 | `내 업무` |
| fav title | `즐겨찾기` |
| 삭제 버튼 | `삭제` |
| 제목 placeholder | `제목 없음` |
| 메타 | `{날짜} 작성` · `자동 저장됨` |
| 본문 placeholder | `내용을 입력하세요. 떠오르는 생각, 할 일, 메모를 자유롭게 기록해 보세요.` |
| 삭제 확인창 | `이 글을 삭제할까요? 삭제하면 되돌릴 수 없어요.` |

### 6.5 마이 페이지

| 위치 | 문구 |
|---|---|
| 제목 | `마이 페이지` |
| 서브타이틀 | `서비스에서 사용할 프로필 정보를 관리하세요.` |
| 아바타 행 이름/힌트 | `프로필 이미지` / `JPG, PNG · 정사각형 이미지를 권장합니다.` |
| 업로드 버튼 | `사진 변경` |
| 별명 라벨/placeholder | `별명` / `사용할 별명을 입력하세요` |
| 이메일 라벨/값/배지 | `이메일` / (로그인한 구글 계정의 실제 이메일) / `Google 계정` |
| 저장 버튼 / 저장 노트 | `변경사항 저장` / `저장되었습니다` |
| 저장 실패 알림(window.alert) | `저장에 실패했습니다. 잠시 후 다시 시도해주세요.` |
| 사진 업로드 실패 알림(window.alert) | `사진 업로드에 실패했습니다. 잠시 후 다시 시도해주세요.` |
| 로그아웃 카드 제목/설명/버튼 | `로그아웃` / `이 기기에서 계정을 로그아웃합니다.` / `로그아웃` |

### 6.6 placeholder / 시드 데이터

- 기본 소유자명: `김민수` (`OWNER_NAME`) — 별명·구글 계정 이름이 모두 없을 때의 최종 폴백. 이메일은 상수 없이 로그인한 구글 계정 값(§5.6).
- 시드 글 4건: [§5.8 표](#58-최초-방문-시드-데이터-seed) 참조(제목·본문 전문 포함).

---

## 7. 접근성 · 상태 디테일 (States & A11y)

- **포커스 링:** `--shadow-focus`(`0 0 0 3px rgba(78,151,240,0.25)`) + `--border-focus`(#4e97f0). 적용: `.input-sm:focus-within`, `.field-input:focus`. (나머지 인풋/textarea는 `outline:none`이며 별도 포커스 링 없음 — `.detail-title`, `.detail-content`, `.composer input` 등.)
- **placeholder 색:** `input::placeholder, textarea::placeholder { color: var(--text-placeholder) }`(#b0b3b8).
- **선택 영역:** `::selection { background: var(--accent-soft) }`(#eef4fe).
- **커스텀 스크롤바:** `.mn-scroll`(→ [§2.7.15](#2715-스크롤바-mn-scroll)). thumb 11px, 색 `--gray-200`/hover `--gray-300`, 트랙은 3px solid 페이지색 테두리로 여백감.
- **hover 규칙:** 대부분 `--surface-hover`(#f1f2f3) 배경 전환, 카드류는 border/shadow/transform까지. `--dur-fast`(120ms).
- **active/press:** `.btn:active { transform: scale(0.97) }`, `.icon-btn:active { background: --surface-active }`.
- **disabled:** 명시적 `:disabled` 스타일 없음(비활성 항목은 onClick 미지정 방식 — 사이드바 "캘린더/할 일/휴지통").
- **링크:** `a { color: --text-link; text-decoration: none } a:hover { color: --accent-hover }`.
- **키보드:** post-card는 `role="link" tabIndex={0}` + Enter로 이동. IconButton은 `aria-label`=title. 그 외 시맨틱은 기본 `<button>`.
- **커버 이미지(`PostCover`, §2.8):** `<img alt="">`(빈 대체 텍스트) — 매 진입 무작위로 바뀌는
  순수 장식 이미지라 서술 가능한 대체 텍스트가 없음. 빈 `alt`로 스크린리더가 건너뛰게 해
  노이즈를 방지(표준 관행). 스켈레톤 오버레이는 `aria-hidden="true"`.
- **reduced-motion / 다크모드:** **미구현**. `prefers-reduced-motion`, `prefers-color-scheme` 대응 없음(라이트 단일 테마).
  > TODO: 확인 필요 — 다크모드/reduced-motion은 현재 코드에 없음. 향후 요구되면 토큰 재매핑 필요.

---

## 8. 부록: 커버리지 체크리스트 (Coverage)

"소스의 이 부분 → 문서의 이 섹션" 매핑.

| 소스 파일 | 내용 | 반영 섹션 |
|---|---|---|
| `app/globals.css` `:root`(4–101) | CSS 변수 72개(색/타이포/라운드/그림자/모션) | §1.1–§1.5 (전량 열거) |
| `app/globals.css` Base(106–127) | reset, body, a, ::selection, placeholder, mn-scroll, mnPop | §1.5, §2.7.15, §7 |
| `app/globals.css` Primitives(133–214) | btn/icon-btn/badge/avatar/input-sm/sidebar-item/sidebar-section | §2.1–§2.7 |
| `app/globals.css` App shell(219–259) | app-root/topbar/sidebar/app-main | §3 |
| `app/globals.css` Login(264–283) | login-page/card/google-btn/terms | §4.1 |
| `app/globals.css` 목록(288–380) | list-page/composer/slash-menu/post-card/fav-btn/empty-state | §4.2, §2.7 |
| `app/globals.css` 상세(385–423+) | detail-*, `.detail-cover*`, `@keyframes mnShimmer` | §4.3, §2.8, §1.5 |
| `app/globals.css` 마이(428–480) | mypage-*/upload-btn/field-*/saved-note/logout-card | §4.4, §2.7 |
| `components/ui/Button.tsx` | Button | §2.1 |
| `components/ui/IconButton.tsx` | IconButton(+sm) | §2.2 |
| `components/ui/Badge.tsx` | Badge | §2.3 |
| `components/ui/Avatar.tsx` | Avatar(img/이니셜) | §2.4 |
| `components/ui/SidebarItem.tsx` | SidebarItem(active/favorite) | §2.5 |
| `components/ui/SidebarSection.tsx` | SidebarSection(count/actions/empty) | §2.6 |
| `components/PostCover.tsx` | PostCover(로딩/표시/실패 3-상태) | §2.8, §4.3, §7 |
| `components/AppShell.tsx` | 셸 구성·네비·인증 가드·검색·아이콘 | §3, §1.7 |
| `app/(app)/page.tsx` | 목록·컴포저·슬래시·카드·빈 상태 | §4.2, §5.1 |
| `app/(app)/posts/[id]/page.tsx` | 상세·커버·자동저장·삭제 | §4.3, §5.2/5.4 |
| `app/(app)/mypage/page.tsx` | 프로필·아바타 업로드·저장 노트·로그아웃 | §4.4, §5 |
| `app/login/page.tsx` | 로그인·구글 로고 SVG | §4.1, §1.1.4 |
| `app/(app)/layout.tsx` / `app/layout.tsx` | 셸 래핑 / 폰트·metadata | §3, §1.2, §6.1 |
| `lib/store.tsx` | 상태·영속화·시드·날짜포맷·상수·구글 세션 매핑·프로필 이미지 업로드 | §5, §6.6 |
| `lib/supabase.ts` | Supabase 브라우저 클라이언트(구글 OAuth, PKCE) | §5.5 |
| `03-reference-design.png` | ui:bowl 레퍼런스(다른 제품) | §0 레퍼런스 메모 |
| `02-prd.md`, `README.md` | 제품 맥락·원칙 | §0 |

### 자체 점검 결과

1. `:root` CSS 변수 72개 → §1에 **전부** 열거(미사용 토큰은 "정의만" 표기). ✅
2. `components/ui/` 파일 6개 = 문서 컴포넌트 6개(§2.1–2.6) + CSS 전용 조각 16개(§2.7) + `components/PostCover.tsx`(§2.8, `components/` 직속). 누락 없음. ✅
3. 4개 화면 모두 포함, 빈 상태·슬래시 메뉴·저장 노트·삭제 확인창·커버 이미지/스켈레톤까지 포함. ✅
4. 사용자 노출 한국어 문구 → §6에 화면별 전량 인용(시드/placeholder 포함). ✅
5. 근사·반올림 값 없음 — hex/px/ms/cubic-bezier 원문 유지. ✅
6. 확정 불가 항목(다크모드/reduced-motion 미구현, 레퍼런스 divergence)은 TODO/메모로 표시. ✅

> **미사용(정의만) 토큰 목록**(보존용): `--gray-25`, `--gray-700`(직접 참조 없음, 램프값으로만), `--blue-200`, `--blue-300`, `--blue-400`, `--gold-300`, `--surface-inverse`, `--accent-soft-fg`, `--status-warning`(및 그 참조원 `--amber-500`), `--radius-xs`, `--dur-slow`. — 삭제하지 말 것(디자인 시스템 원본에서 이식된 완전 램프/스케일의 일부). `--dur-normal`은 `.detail-cover__img`(§2.8)에서 사용을 시작해 이 목록에서 제외됨.
