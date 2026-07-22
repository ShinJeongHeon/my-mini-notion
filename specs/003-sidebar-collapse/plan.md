# Implementation Plan: 사이드바 접기/펼치기

**Branch**: `003-sidebar-collapse` | **Date**: 2026-07-22 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/003-sidebar-collapse/spec.md`

## Summary

사이드바 상단의 토글 버튼으로 사이드바를 접고(전체 숨김), 본문 좌상단에 남는
펼치기 버튼으로 되돌린다. 접힘/펼침 상태는 `localStorage` 전용 키에 저장해
새로고침·재방문 시 복원하고, 앱 내 화면 이동 간 유지는 App Router 레이아웃의
상태 보존 특성으로 충족한다. 구현은 `AppShell` 조건부 렌더링 + CSS 2블록 +
경량 로컬 선호값 접근자(`lib/local-pref.ts`)로 한정하며 신규 라이브러리는 없다.

## Technical Context

**Language/Version**: TypeScript (strict), React 19, Next.js 16.2.10 (App Router)

**Primary Dependencies**: 기존 스택만 사용 — `lucide-react`(아이콘
`PanelLeftClose`/`PanelLeftOpen`, 설치본에 존재 확인), `lib/store.tsx`(기존
앱 상태). **신규 의존성 없음.**

**Storage**: 브라우저 `localStorage`, 전용 키 `mini-notion-sidebar`
(허용값 `"collapsed" | "expanded"` — 계약: `contracts/sidebar-contract.md`).
기존 `mini-notion-v1` 스토어 키와 분리(근거: research.md §2).

**Testing**: Vitest 4 + React Testing Library + jsdom (`npm test`).
기존 목 패턴 재사용: `@/lib/supabase` 세션 목 + `next/navigation` 목 +
`AppProvider` 래핑(`__tests__/auth-store.test.tsx` 참조). localStorage는
실제 jsdom 구현을 그대로 사용(헌법 II).

**Target Platform**: 데스크톱 웹(스펙 Assumptions — 모바일 오버레이 범위 밖)

**Project Type**: Next.js 단일 웹 앱(App Router)

**Performance Goals**: 토글 전환 시작→완료 1초 이내(FR-007) — 조건부 렌더링
단일 리렌더로 즉시 완료. 전환 애니메이션 없음(research.md §1).

**Constraints**: DESIGN.md 토큰·프리미티브만 사용(헌법 III), 새 디자인 결정은
DESIGN.md에 동시 반영. 접근성: 접근성 이름 + `aria-expanded` 상태 노출(FR-004).

**Scale/Scope**: 수정 파일 4개(`components/AppShell.tsx`,
`components/ui/IconButton.tsx`, `app/globals.css`, `DESIGN.md`) + 신규 2개
(`lib/local-pref.ts`, `__tests__/sidebar-collapse.test.tsx`). 화면 1곳(앱 셸).

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| 원칙 | 게이트 | 판정 |
|---|---|---|
| I. Test-First (TDD) | 모든 프로덕션 코드는 실패 테스트 선행. `lib/local-pref.ts` 순수 함수와 `AppShell` 토글 동작 모두 Vitest로 RED 확인 가능한 테스트 단위로 설계했다(research.md §6). tasks.md는 태스크마다 테스트 작성→실패 확인→구현 순서를 내포한다. | PASS |
| II. 테스트 무결성 | 목은 외부 경계(`@/lib/supabase`, `next/navigation`)에만 사용 — 기존 auth-store 테스트의 검증된 완전한 목 형태를 재사용. localStorage·DOM은 실제 jsdom 구현을 단언한다. 목 요소에 대한 단언 없음. | PASS |
| III. 디자인 시스템 준수 | 계획 전 `DESIGN.md` 전체(994줄)를 읽었다. 기존 토큰·프리미티브(IconButton, spacing 스케일, z-index 계층)만 재사용하고, 신규 결정(CSS 2블록, 아이콘 2종, IconButton `ariaExpanded` prop, 문구 2건)은 구현 시 DESIGN.md §2.2·§3·§1.7·§6.1에 동시 반영한다(quickstart.md 체크리스트). | PASS |
| IV. 프레임워크 문서 우선 | 번들 문서로 확인: `01-getting-started/03-layouts-and-pages.md` — "On navigation, layouts preserve state, remain interactive, and do not rerender" → FR-005는 레이아웃 상태 보존으로 충족(research.md §4). 테스트 환경은 번들 vitest 가이드 기반(헌법 Technology Stack). | PASS |
| V. 단순성 (YAGNI) | 애니메이션·신규 라이브러리·미니 레일 없음. `lib/local-pref.ts`는 이 기능이 지금 필요로 하는 최소 API(read/write 2함수)이며, 제네릭 형태는 `003-dark-mode` research §4가 명시한 공유 계획(코드 공유)과 합치 — 추측성 확장이 아니다. | PASS |

**위반 없음 → Complexity Tracking 불필요.**

**Post-Design Re-check (Phase 1 완료 후)**: 설계 산출물(research/data-model/
contracts/quickstart) 확정 후 재평가 — 위 5개 게이트 모두 PASS 유지. 설계가
추가한 표면은 IconButton 선택적 prop 1개와 CSS 2블록뿐이다.

## Project Structure

### Documentation (this feature)

```text
specs/003-sidebar-collapse/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output (/speckit-plan command)
├── data-model.md        # Phase 1 output (/speckit-plan command)
├── quickstart.md        # Phase 1 output (/speckit-plan command)
├── contracts/
│   └── sidebar-contract.md   # Phase 1 output (/speckit-plan command)
└── tasks.md             # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

### Source Code (repository root)

```text
app/
└── globals.css                  # [수정] .sidebar__header, .sidebar-expand 블록 추가 (App shell 섹션)

components/
├── AppShell.tsx                 # [수정] collapsed 상태 + 토글 버튼 + 조건부 렌더링
└── ui/
    └── IconButton.tsx           # [수정] 선택적 ariaExpanded prop 추가

lib/
└── local-pref.ts                # [신규] readLocalPref/writeLocalPref (기기 로컬 UI 선호값 접근자)

__tests__/
└── sidebar-collapse.test.tsx    # [신규] local-pref 단위 + AppShell 토글/복원 RTL 테스트

DESIGN.md                        # [수정] §1.7 아이콘 2종, §2.2 prop, §3 사이드바 접힘, §6.1 문구
```

**Structure Decision**: 기존 Next.js 단일 앱 구조를 그대로 사용한다. 앱 셸
(`components/AppShell.tsx`)이 사이드바의 유일한 소유자이므로 상태·토글·렌더링
분기는 전부 그 안에서 끝나고, 재사용 가능한 저장 로직만 `lib/`로 분리한다.
라우트 파일(`app/**`)은 수정하지 않는다.
