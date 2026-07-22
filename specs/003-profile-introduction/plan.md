# Implementation Plan: 자기소개

**Branch**: `003-profile-introduction` | **Date**: 2026-07-22 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/003-profile-introduction/spec.md`

## Summary

마이페이지 프로필 카드의 별명 입력란 아래에 자기소개(여러 줄, 최대 500자) 입력란을
추가하고, 기존 "변경사항 저장" 버튼 하나로 별명과 자기소개를 **한 번의 profile
업데이트**로 함께 저장한다. 데이터는 사용자가 이미 만들어 둔 `public.profile.introduction`
컬럼(text, nullable — 2026-07-22 읽기 전용 조회로 실존 확인)만 사용하며 DB 구조는 일절
변경하지 않는다. 클라이언트는 기존 `lib/store.tsx`의 프로필 동기화·localStorage 캐시
패턴을 그대로 확장한다.

## Technical Context

**Language/Version**: TypeScript (strict), React 19, Next.js 16.2.10 (App Router)

**Primary Dependencies**: @supabase/supabase-js 2.110.5, lucide-react

**Storage**: Supabase Postgres `public.profile` (기존 테이블, RLS enabled) — `introduction`
컬럼만 사용, 스키마 변경 금지(FR-007). 보조: localStorage `mini-notion-v1` 캐시(기존 패턴)

**Testing**: Vitest 4 + React Testing Library + jsdom (`npm test`)

**Target Platform**: 웹(모던 브라우저), 클라이언트 컴포넌트만 변경

**Project Type**: Next.js 단일 웹앱 (프론트엔드 + Supabase BaaS)

**Performance Goals**: 저장 = Supabase 업데이트 1회 왕복(별명+자기소개 동시), 조회 =
기존 syncProfile 셀렉트에 컬럼 1개 추가(추가 왕복 0회)

**Constraints**: DB 스키마 불변(FR-007) · 자기소개 최대 500자, 줄바꿈 보존(FR-005) ·
로딩 중 빈 값이 저장값을 덮어쓰지 않음(US2-3) · 기존 마이페이지 기능 회귀 0(FR-008)

**Scale/Scope**: 화면 1개(마이페이지) · 수정 파일 4개(store, mypage, globals.css,
DESIGN.md) + 테스트 · 사용자당 자기소개 1개

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| # | 원칙 | 판정 | 근거 |
|---|------|------|------|
| I | Test-First (TDD 의무화) | PASS | 모든 프로덕션 변경(store 확장, 마이페이지 UI)은 실패 테스트 작성 → RED 확인 → 최소 구현 → GREEN 순서로 진행하도록 tasks에 강제한다. 신규 테스트: store의 introduction 로드/저장/정규화, 마이페이지 textarea 렌더·저장·로딩 순서. |
| II | 테스트 무결성 (모킹 규율) | PASS | 기존 `__tests__/auth-store.test.tsx`의 supabase 목 패턴을 재사용하되, **불완전한 목 금지** 규칙에 따라 profileRow 목을 실제 select 형상(`name, image_path, introduction`) 전체로 확장한다(현재는 `{name}`만 담은 부분 목 — research.md §5). |
| III | 디자인 시스템 준수 | PASS | DESIGN.md 선독 완료(§1 토큰, §2.7.6 `.field-input`, §4.4 마이페이지, §6.5 카피). 신규 CSS 조각 `.field-textarea`는 기존 `.field-input` 토큰만 재사용해 파생하며, 새 디자인 결정(조각·카피)은 같은 변경에서 DESIGN.md에 반영한다. |
| IV | 프레임워크 문서 우선 | PASS | 신규 Next.js API 표면 없음 — 기존 클라이언트 컴포넌트(`"use client"`) 2개 파일 수정뿐. 구현 시작 전 번들 문서의 클라이언트 컴포넌트 가이드로 가정(이벤트 핸들러·useState 사용)을 재확인하는 태스크를 둔다. |
| V | 단순성 (YAGNI) | PASS | 스토어 메서드 1개(`saveProfile`) + CSS 조각 1개 + textarea 1개가 전부. 글자 수 카운터·별도 저장 버튼·서버 측 검증 중복 등 스펙이 요구하지 않는 것은 만들지 않는다. 500자 제한은 `maxLength` 단일 지점에서 강제. |

**Post-Phase 1 재평가**: PASS 유지 — 설계 산출물(data-model, contracts)에 신규 추상화·
스키마 변경·요구 외 기능 없음. Complexity Tracking 해당 없음.

## Project Structure

### Documentation (this feature)

```text
specs/003-profile-introduction/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output (/speckit-plan command)
├── data-model.md        # Phase 1 output (/speckit-plan command)
├── quickstart.md        # Phase 1 output (/speckit-plan command)
├── contracts/
│   └── profile-store.md # 스토어 API·Supabase 쿼리 계약
└── tasks.md             # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

### Source Code (repository root)

```text
app/
└── (app)/
    └── mypage/
        └── page.tsx         # [수정] 자기소개 textarea 추가, saveProfile 호출로 전환
app/globals.css              # [수정] .field-textarea 조각 추가 (.field-input 파생)
components/ui/               # 변경 없음 (기존 프리미티브 재사용)
lib/
└── store.tsx                # [수정] introduction 상태·syncProfile select 확장·saveProfile
__tests__/
├── auth-store.test.tsx      # [수정] 목 형상 확장, saveProfile 계약으로 갱신
└── mypage-introduction.test.tsx  # [신규] 마이페이지 자기소개 UI 시나리오
DESIGN.md                    # [수정] .field-textarea 조각·§4.4 필드 순서·§6.5 카피 반영
```

**Structure Decision**: 기존 단일 Next.js 앱 구조를 그대로 사용한다. 신규 파일은 테스트
1개뿐이고, 나머지는 기존 파일 4개(store/mypage/globals.css/DESIGN.md)의 확장이다.

## Complexity Tracking

> Constitution Check 위반 없음 — 해당 없음.
