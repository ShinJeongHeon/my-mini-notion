# Implementation Plan: 다크모드

**Branch**: `003-dark-mode` | **Date**: 2026-07-21 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/003-dark-mode/spec.md`

**Note**: This template is filled in by the `/speckit-plan` command. See `.specify/templates/plan-template.md` for the execution workflow.

## Summary

사이드바에 테마 토글 버튼을 추가해 앱 전체를 라이트/다크로 즉시 전환한다.
접근 방식: `<html data-theme="light|dark">` 속성 + `globals.css` 시맨틱 토큰
(`--surface-*`, `--text-*`, `--border-*`, `--accent*`)의 다크 오버라이드 블록.
선택은 `localStorage`(`mini-notion-theme`)에 저장하고, 루트 레이아웃의 인라인
스크립트가 첫 페인트 전에 속성을 세팅해 깜빡임(FOUC)을 차단한다. 저장된 선택이
없으면 `prefers-color-scheme`을 따르고 변경을 실시간 반영한다. 새 라이브러리
없이 `lib/theme.ts` 한 모듈로 구현한다.

## Technical Context

**Language/Version**: TypeScript 5 (strict), React 19.2.4, Next.js 16.2.10 (App Router, Turbopack)

**Primary Dependencies**: 기존 의존성만 사용 — `lucide-react`(Moon/Sun 아이콘). 신규 패키지 없음(next-themes 등 도입하지 않음, research.md §1)

**Storage**: `localStorage` 키 `mini-notion-theme` (`"light" | "dark"`, 부재 = 시스템 따름). 기존 `mini-notion-v1` 스키마는 건드리지 않음 (data-model.md)

**Testing**: Vitest 4 + React Testing Library + jsdom (`npm test`). matchMedia는 jsdom 미지원 이벤트만 최소 모킹 (research.md §6)

**Target Platform**: 에버그린 데스크톱 브라우저 (기존 앱과 동일)

**Project Type**: 단일 Next.js 웹 앱 (App Router)

**Performance Goals**: 토글 후 1초 이내 전체 반영(SC-002 — 실제로는 CSS 변수 재해석으로 즉시), 로드 시 반대 테마 플래시 0회(FR-007)

**Constraints**: 다크모드 텍스트/UI 대비 WCAG AA — 일반 텍스트 4.5:1, 큰 텍스트·UI 구성요소 3:1 (FR-008); 저장 차단 환경에서도 세션 내 토글 동작(Edge Case)

**Scale/Scope**: 화면 4개(목록·상세·마이·로그인) + 앱 셸. 시맨틱 토큰 약 30개 오버라이드 + 하드코딩 색 6곳 토큰화. 신규 컴포넌트 1개(사이드바 토글), 신규 모듈 1개(`lib/theme.ts`)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| # | 원칙 | 게이트 판정 |
|---|---|---|
| I | Test-First (TDD) | ✅ PASS — 테마 해석 로직·토글 컴포넌트·no-FOUC 스크립트를 실패 테스트부터 작성. CSS 토큰 값 자체는 "설정"에 준해 테스트 대상 아님(E2E는 quickstart.md로 검증). tasks 단계에서 각 태스크에 RED→GREEN 순서 명시 |
| II | 테스트 무결성 (모킹 규율) | ✅ PASS — 단언 대상은 실제 DOM(`document.documentElement.dataset.theme`)과 실제 `localStorage`(jsdom 내장). 모킹은 jsdom이 구현하지 않는 `matchMedia` 변경 이벤트 1곳뿐이며 실제 API 형태 전체를 반영 (research.md §6) |
| III | 디자인 시스템 준수 | ✅ PASS — `DESIGN.md` 전체(§1 토큰 72개, §3 사이드바, §7 "다크모드 미구현" TODO) 선행 확인 완료. 새 디자인 결정(다크 토큰 값, 신규 시맨틱 토큰 4개, 토글 배치)은 구현과 동시에 `DESIGN.md`에 반영 (contracts/theme-contract.md가 초안) |
| IV | 프레임워크 문서 우선 | ✅ PASS — 번들 문서 확인 완료: `01-app/03-api-reference/02-components/script.md`(beforeInteractive는 하이드레이션을 막지 않음 → 인라인 script 태그 채택 근거), `04-functions/generate-viewport.md`(`themeColor` media 배열). 세부는 research.md §2 |
| V | 단순성 (YAGNI) | ✅ PASS — 신규 의존성 0, 테마 2종만, "시스템 따름" UI 미노출, Provider/Context 없이 훅 1개, 기존 프리미티브(SidebarItem 패턴) 재사용 |

**위반 없음 → Complexity Tracking 불요.**

### Post-Design Re-check (Phase 1 완료 후)

설계 산출물(research.md, data-model.md, contracts/, quickstart.md) 재검토 결과
위반 없음 유지: 신규 추상화는 `lib/theme.ts` 단일 모듈, 엔티티는 ThemePreference
1개, 계약은 DOM 속성 + storage 키 + 토큰 테이블뿐이다. ✅

## Project Structure

### Documentation (this feature)

```text
specs/003-dark-mode/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output (/speckit-plan command)
├── data-model.md        # Phase 1 output (/speckit-plan command)
├── quickstart.md        # Phase 1 output (/speckit-plan command)
├── contracts/
│   └── theme-contract.md  # DOM/storage/토글 UI/다크 토큰 계약
└── tasks.md             # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

### Source Code (repository root)

```text
app/
├── globals.css          # [수정] 다크 토큰 오버라이드 블록 + 하드코딩 색 6곳 토큰화
├── layout.tsx           # [수정] no-FOUC 인라인 스크립트 + <html suppressHydrationWarning>
└── (기타 화면 파일)      # 변경 없음 — 토큰만으로 전환

components/
├── AppShell.tsx         # [수정] 사이드바 하단(프로필 위)에 테마 토글 버튼 추가
└── ui/                  # 변경 없음 (SidebarItem 스타일 패턴 재사용)

lib/
└── theme.ts             # [신규] THEME_STORAGE_KEY·resolveTheme·useTheme 훅·THEME_INIT_SCRIPT

__tests__/
├── theme.test.tsx       # [신규] 해석 로직·초기화 스크립트·훅 동작 (TDD)
└── theme-toggle.test.tsx # [신규] 사이드바 토글 버튼 렌더·클릭 전환·상태 표시 (TDD)

DESIGN.md                # [수정] §1 다크 토큰 표(신규 §1.8)·§2 토글 컴포넌트·§3.3 배치·§7 TODO 해소
```

**Structure Decision**: 기존 단일 Next.js 앱 구조를 그대로 사용한다. 테마 로직은
`lib/`(스토어와 동급), 토글 UI는 `components/AppShell.tsx` 내부(사이드바 소유자),
스타일은 `app/globals.css`의 토큰 계층에만 손을 대 화면 파일 수정을 0으로 만든다.

## Complexity Tracking

> Constitution Check 위반 없음 — 해당 없음.
