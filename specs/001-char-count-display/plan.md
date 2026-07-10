# Implementation Plan: 콘텐츠 글자 수 표시

**Branch**: `001-char-count-display` | **Date**: 2026-07-10 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/001-char-count-display/spec.md`

**Note**: This template is filled in by the `/speckit-plan` command. See `.specify/templates/plan-template.md` for the execution workflow.

## Summary

게시글 상세(콘텐츠 편집) 화면의 내용 입력칸(textarea)에 이미 반응형으로 보관 중인
`post.content` 문자열의 길이를 그대로 계산해, 화면 우측 하단에 스크롤과 무관하게 항상
떠 있는(fixed) 배지로 실시간 표시한다. 새 상태·저장 로직이나 서버 통신은 필요 없고,
기존 `lib/store.tsx`의 `content` 상태 갱신에 얹혀가는 순수 파생(derived) 렌더링이다.

## Technical Context

**Language/Version**: TypeScript (strict) — Next.js 16.2.10 (App Router), React 19

**Primary Dependencies**: Next.js, React, `lucide-react`(아이콘, 필요 시) — 신규 의존성 추가 없음

**Storage**: N/A — 글자 수는 `lib/store.tsx`가 이미 관리하는 `Post.content` 문자열에서
매 렌더마다 클라이언트에서 계산하는 파생 값이며, 별도 저장·영속화가 필요 없다.

**Testing**: Vitest 4 + React Testing Library + jsdom (`npm test`) — 저장소 표준
(`vitest.config.mts`, `environment: 'jsdom'`, `tsconfigPaths: true`)

**Target Platform**: 웹 브라우저 (Next.js 클라이언트 컴포넌트, 데스크톱 웹 기준)

**Project Type**: 단일 웹 앱 (Next.js App Router, `app/` + `components/` + `lib/` 구조 — 별도
frontend/backend 분리 없음)

**Performance Goals**: 입력/삭제 후 100ms 이내 화면 갱신(spec SC-001)

**Constraints**: 클라이언트 전용 계산(네트워크 왕복 없음), 기존 자동 저장 동작에 영향 없음,
스크롤 위치와 무관하게 화면 우측 하단에 고정 표시(spec FR-003, Clarifications 2026-07-10)

**Scale/Scope**: 게시글 상세 화면(`app/(app)/posts/[id]/page.tsx`) 1곳에 UI 요소 1개 추가,
콘텐츠 길이 최대 10,000자 이상에서도 지연 없이 정확해야 함(spec SC-003)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| 원칙 | 상태 | 근거 |
|---|---|---|
| I. Test-First (TDD) | PASS | 신규 파생 로직(글자 수 계산)과 렌더링은 `/speckit-tasks`가 생성할 태스크에서 실패하는 테스트 작성 → 구현 순서로 진행. 새 함수/컴포넌트 동작마다 테스트 필요. |
| II. 테스트 무결성 | PASS | 실제 DOM에 렌더된 글자 수 텍스트를 RTL로 직접 검증. 모킹 대상 없음(순수 문자열 길이 계산 + 실제 컴포넌트). |
| III. 디자인 시스템 준수 | PASS (조건부) | `DESIGN.md`에 "우측 하단 고정 배지" 패턴이 아직 없음 — 기존 토큰(색·간격·라운드·그림자)만 재사용해 새 컴포넌트를 정의하고, 결정을 `DESIGN.md`에도 함께 기록한다(Phase 1에서 반영). |
| IV. 프레임워크 문서 우선 | PASS | 기존 `"use client"` + 컨텍스트 상태 패턴을 그대로 재사용하며 신규 Next.js API를 도입하지 않음. 새 API 사용이 생기면 사전에 `node_modules/next/dist/docs/`를 확인한다. |
| V. 단순성 (YAGNI) | PASS | `post.content.length`를 그대로 표시하는 최소 구현. 새 스토어 메서드, 설정값, 상한 로직 없음(spec Assumptions). |

Gate 결과: **PASS** — Complexity Tracking 불필요.

**Post-Design Re-check (Phase 1 이후)**: `research.md`/`data-model.md`/`contracts/`
작성 결과 신규 의존성, 신규 저장 스키마, 임의의 디자인 값이 발생하지 않았음을 확인.
`DESIGN.md` 갱신 항목(원칙 III)만 구현 단계에서 함께 반영하면 되므로 Gate는 여전히
**PASS**이다.

## Project Structure

### Documentation (this feature)

```text
specs/001-char-count-display/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output (/speckit-plan command)
├── data-model.md        # Phase 1 output (/speckit-plan command)
├── quickstart.md        # Phase 1 output (/speckit-plan command)
├── contracts/           # Phase 1 output (/speckit-plan command)
│   └── char-count-display.md
└── tasks.md             # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

### Source Code (repository root)

```text
app/
└── (app)/
    └── posts/
        └── [id]/
            └── page.tsx        # 수정: 글자 수 계산 + 고정 배지 렌더링 추가

app/
└── globals.css                 # 수정: 새 클래스(예: .detail-char-count) 추가, 기존 토큰만 사용

DESIGN.md                       # 수정: 신규 컴포넌트/패턴을 문서화(Principle III)

__tests__/
└── post-detail-char-count.test.tsx   # 신규: 글자 수 표시/갱신 동작 테스트 (TDD)
```

**Structure Decision**: 이 저장소는 단일 Next.js 앱(Option 1 계열, App Router 구조)이며
별도 backend/frontend 분리가 없다. 새 라우트나 새 모듈 디렉터리는 필요 없고, 기존
`app/(app)/posts/[id]/page.tsx`(콘텐츠 편집 화면)와 `app/globals.css`(스타일 토큰)를
수정하는 것으로 충분하다. 테스트는 저장소 컨벤션에 따라 `__tests__/*.test.tsx`에 둔다.

## Complexity Tracking

> Constitution Check에 위반 사항이 없어 이 섹션은 해당 없음(N/A).
