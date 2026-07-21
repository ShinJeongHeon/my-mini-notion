# UI Contract: 다크모드 (003-dark-mode)

이 앱이 외부(브라우저·테스트·후속 기능)에 노출하는 테마 인터페이스의 계약.
구현·`DESIGN.md` 갱신의 기준 문서다. (다크 값의 최종 원본은 병합 후
`DESIGN.md` + `app/globals.css`)

## 1. DOM 프로토콜

| 항목 | 계약 |
|---|---|
| 테마 속성 | `<html data-theme="light" \| "dark">` — 항상 구체값(미설정 상태도 해석 결과 기록) |
| 세팅 시점 | `<head>` 인라인 스크립트가 첫 페인트 전 1회(FR-007), 이후 토글·시스템 변경 시 즉시 갱신 |
| 소비자 | `globals.css`의 `html[data-theme="dark"]` 오버라이드 블록. 화면·컴포넌트 CSS는 시맨틱 토큰만 참조 |
| 하이드레이션 | `<html suppressHydrationWarning>` (서버 HTML엔 속성 없음) |

## 2. 저장 계약

| 항목 | 계약 |
|---|---|
| 키 | `localStorage["mini-notion-theme"]` |
| 값 | `"light"` \| `"dark"` (그 외/부재 = 미설정 → 시스템 따름) |
| 쓰기 | 토글 클릭 시에만. "미설정으로 복귀" 쓰기는 없음 |
| 실패 | 모든 접근 try/catch — 차단 시 세션 내 DOM 속성만으로 동작 |

## 3. ThemeToggle UI 계약

| 항목 | 계약 |
|---|---|
| 위치 | 사이드바 하단 — `.sidebar__scroll` 아래, `.sidebar__profile`(border-top) 위 (`components/AppShell.tsx`) |
| 형태 | `SidebarItem`과 동일한 시각 패턴의 버튼 (규격은 DESIGN.md §2.5) |
| 아이콘/라벨 | 라이트 상태: `Moon size={16}` + `다크 모드` / 다크 상태: `Sun size={16}` + `라이트 모드` — 클릭 시 전환될 대상을 표기(FR-003) |
| testid | `data-testid="theme-toggle"` |
| 동작 | 클릭 → EffectiveTheme 반전을 명시 저장 + `data-theme` 즉시 갱신(FR-002·004) |
| 접근성 | `<button type="button">`, `aria-label` = 현재 라벨과 동일 |

## 4. `lib/theme.ts` 모듈 계약

| export | 시그니처 | 설명 |
|---|---|---|
| `THEME_STORAGE_KEY` | `"mini-notion-theme"` | §2의 키 |
| `resolveTheme` | `(stored: unknown, systemDark: boolean) => "light"\|"dark"` | data-model.md의 순수 해석 함수 |
| `THEME_INIT_SCRIPT` | `string` | no-FOUC 인라인 스크립트 본문(§1 프로토콜 구현) + 가드된 `matchMedia` change 리스너(저장값 없을 때만 `data-theme` 갱신 — FR-005 실시간 추종을 로그인 화면 포함 전 화면에서 담당). 레이아웃이 주입, 테스트가 실행 검증 |
| `useTheme` | `() => { theme: "light"\|"dark"; toggle: () => void }` | 토글 버튼용 훅 — 명시 선택 쓰기 + 라벨 상태(FR-006). 시스템 추종 리스너는 `THEME_INIT_SCRIPT` 담당(위) |
| `readLocalPref` | `(key: string, allowed: string[]) => string \| null` | 제네릭 기기 로컬 선호값 읽기(허용값 검증 + try/catch). 테마가 소비하고 `003-sidebar-collapse`가 재사용(spec Assumptions의 공유 메커니즘) |
| `writeLocalPref` | `(key: string, value: string) => void` | 제네릭 쓰기(try/catch). 위와 동일한 공유 접근자 |

## 5. 다크 토큰 오버라이드 표

`html[data-theme="dark"]` 블록의 값. 원시 램프(`--gray-*` 등)는 불변
(research.md §5). 대비는 WCAG AA 기준 상대 휘도 계산값(주 배경 `#191919`,
카드 `#232323` 기준 재확인). 라이트 현행값은 이 문서에 중복 기재하지 않는다 —
정본은 `DESIGN.md` §1.1 + `app/globals.css`(신규 토큰 4종만 라이트 값을 여기
기재). 이 표는 DESIGN.md §1.8 반영(병합) 시점에 동결되며 이후 갱신하지
않는다 — 병합 후 정본은 DESIGN.md다.

### 5.1 Surface

| 토큰 | 다크 | 비고 |
|---|---|---|
| `--surface-page` | `#191919` | `--gray-900`과 동일값 |
| `--surface-sidebar` | `#191919` | 경계는 `--border-subtle`로 구분(현행과 동일한 구조) |
| `--surface-card` | `#232323` | 카드·인풋·버튼 |
| `--surface-subtle` | `#202020` | 검색 인풋·읽기전용·tile·로그인 배경 |
| `--surface-hover` | `#2a2a2a` | |
| `--surface-active` | `#333333` | |
| `--surface-inverse` | `#f1f2f3` | brand-chip·글자수 배지 배경(§6 이관) |

### 5.2 Text

| 토큰 | 다크 | 대비(다크, on `#191919`) |
|---|---|---|
| `--text-strong` | `#f5f6f7` | ≈16:1 ✅ |
| `--text-body` | `#e6e7e9` | ≈14:1 ✅ |
| `--text-secondary` | `#a8adb4` | ≈7.8:1 ✅ |
| `--text-muted` | `#9aa0a8` | ≈6.4:1 ✅ |
| `--text-placeholder` | `#8a8f98` | ≈5.2:1 (카드 위 ≈4.7:1) ✅ |
| `--text-on-accent` | `#ffffff` | on `#4e97f0` ≈3.0:1 — 14/600 세미볼드 버튼 라벨, 라이트 현행과 동일(UI 구성요소 3:1 충족) |
| `--text-link` | `#66a9ff` | ≈7.2:1 ✅ |
| `--text-on-inverse` **(신규)** | `#191919` | inverse 표면 위 전용(§6). 라이트 값 `#ffffff` |

### 5.3 Border / Accent / Status / 기타

| 토큰 | 다크 | 비고 |
|---|---|---|
| `--border-subtle` | `#2a2a2a` | 장식 구분선(라이트 현행도 ≈1.3:1 — 동일 정책) |
| `--border-default` | `#333333` | 인풋 경계는 배경 차 + 포커스 링 병행 |
| `--border-strong` | `#454545` | |
| `--border-focus` | `#66a9ff` | |
| `--accent` | `#4e97f0` | 라이트와 동일. on `#191919` ≈5.8:1 ✅ |
| `--accent-hover` | `#66a9ff` | 다크에선 밝은 쪽이 hover |
| `--accent-active` | `#3b82d6` | |
| `--accent-soft` | `#1c3252` | slash tile·empty tile·`::selection` |
| `--accent-soft-fg` | `#93bdf8` | tile 전경으로 사용 시작 |
| `--status-success` | `#2eb872` | 라이트와 동일. ≈6.8:1 ✅ |
| `--status-danger` | `#f0483e` | 라이트와 동일. ≈4.7:1 ✅ (13/600 삭제 버튼) |
| `--status-favorite` | `#ffbd18` | 라이트와 동일. ≈10:1 ✅ |
| `--status-danger-soft` **(신규)** | `#3a201e` | 삭제 버튼 hover 배경(하드코딩 대체). 라이트 값 `#fdeae9` |
| `--scrollbar-thumb` **(신규)** | `#3a3a3a` | `.mn-scroll`의 `--gray-200` 직접 참조 대체. 라이트 값 `#e2e3e5` |
| `--scrollbar-thumb-hover` **(신규)** | `#4a4a4a` | 〃 (`--gray-300`). 라이트 값 `#d3d5d8` |
| `--shadow-*` 5종 | 현행 유지 | 다크에선 경계·표면 차가 구분을 담당, 그림자는 보조(변경 없음) |

### 5.4 유지(변경 없음) 항목과 근거

- **Avatar** `--blue-100`/`--blue-700` 쌍: 자체 완결 색 조합(배경+글자)으로
  다크 배경 위에서도 내부 대비 불변 — 유지.
- **구글 로고 4색·포커스 링 rgba**: 브랜드 고정색/양 테마 공용 글로우 — 유지.
- **커버 이미지**: 사진 원본 그대로, 스켈레톤은 `--surface-hover/subtle`
  토큰이라 자동 전환(spec Edge Case).

## 6. 시맨틱 이관(라이트 외관 불변 리팩터링)

다크 블록이 작동하려면 아래 사용처가 토큰을 거치도록 선행 수정한다.
이 표가 이관 대상·매핑의 **정본 목록**이다(다른 문서에는 중복 기재하지 않음).
라이트 모드 계산값은 전부 동일(시각 회귀 0):

| 위치 | 변경 |
|---|---|
| `.brand-chip` | `background: var(--gray-900) → var(--surface-inverse)`, `color: #fff → var(--text-on-inverse)` |
| `.detail-char-count` | `background: var(--gray-900) → var(--surface-inverse)`, `color: var(--text-on-accent) → var(--text-on-inverse)` |
| `.badge` | `background: var(--gray-100) → var(--surface-hover)` |
| `.mn-scroll` | thumb `--gray-200/300 → --scrollbar-thumb(-hover)` (`scrollbar-color` 포함) |
| `.detail-delete-btn:hover` | `#fdeae9 → var(--status-danger-soft)` |
| `.slash-menu__tile`·`.empty-state__tile` 전경 | `--accent → var(--accent-soft-fg)` — 필수(다크에서 `#4e97f0` on `#1c3252` ≈2.5:1로 UI 구성요소 3:1 기준(FR-008) 미달) |
