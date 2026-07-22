# Implementation Plan: 계정 기반 페이지 게시글 저장

**Branch**: `003-supabase-page-posts` | **Date**: 2026-07-22 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/003-supabase-page-posts/spec.md`

## Summary

게시글(페이지)의 저장소를 브라우저 localStorage에서 Supabase `public.page` 테이블로 교체한다.
테이블 구조(id·created_at·title·content·user_id)는 이미 확정되어 있으며 변경하지 않는다(FR-007).
소유자 격리(FR-003/004/006)는 RLS 정책으로 데이터 계층에서 강제한다 — 현재 `page` 테이블은
RLS만 켜져 있고 정책이 0개라 모든 접근이 차단된 상태이므로, owner-only SELECT/INSERT/UPDATE/DELETE
정책 4개를 추가하는 것이 이 기능의 선행 조건이다. 즐겨찾기(FR-010)는 기기별 localStorage에 남기고,
샘플 글 시딩(FR-009)은 제거한다. 화면 구조는 유지하고 `lib/store.tsx`의 게시글 상태 관리만
Supabase CRUD(낙관적 갱신 + 실패 시 서버 재조회·안내)로 바꾼다.

## Technical Context

**Language/Version**: TypeScript (strict), React 19.2.4, Next.js 16.2.10 (App Router)

**Primary Dependencies**: `@supabase/supabase-js` 2.110.5 (브라우저 클라이언트, PKCE), `lucide-react`, 기존 `AppProvider` 컨텍스트 (`lib/store.tsx`)

**Storage**: Supabase Postgres `public.page` (구조 고정, RLS on) — 게시글. localStorage — 기기별 즐겨찾기 표시만 (`FR-010`). `public.profile`·Storage 버킷은 이번 범위 밖(기존 유지).

**Testing**: Vitest 4 + React Testing Library + jsdom (`npm test`), `@/lib/supabase` 모듈 경계에서만 모킹(기존 `__tests__/auth-store.test.tsx` 관례). RLS 자체는 유닛 테스트 불가 → `quickstart.md`의 2계정 시나리오 + SQL 정책 검증으로 확인.

**Target Platform**: 브라우저(클라이언트 사이드 SPA 패턴 — 앱 전체가 "use client" + 컨텍스트, 서버 컴포넌트에서 데이터 접근 없음. 기존 구조 유지)

**Project Type**: 단일 Next.js 웹앱

**Performance Goals**: 등록·수정·삭제 결과 2초 이내 화면 반영(SC-004) — 단건 row 연산이므로 낙관적 갱신 + 단일 요청으로 충족

**Constraints**:
- `page` 테이블 구조 변경 금지(FR-007) — 정책(RLS policy) 추가는 구조 변경이 아니며 FR-006의 요구 사항
- 클라이언트는 publishable key만 사용(서비스 키 없음) → 격리는 전적으로 RLS가 담당
- `updated_at` 컬럼 없음 → 수정 시각 추적 없이 last-write-wins (동시 편집 정책, /speckit-clarify 권고 반영)
- 이 워크트리의 `node_modules/next/dist/docs`는 비어 있음 → 번들 문서는 원본 체크아웃
  `C:\Users\LG\OneDrive\바탕 화면\dx-claudecode-master\03-notion\20-notion-deploy\node_modules\next\dist\docs\`에서 읽는다 (Principle IV)

**Scale/Scope**: 개인 메모 도구, 계정당 수십~수백 건. 화면 4개(목록·상세·마이페이지·로그인) 중 목록·상세·셸만 간접 영향.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| # | 원칙 | 상태 | 근거 |
|---|------|------|------|
| I | Test-First (TDD) | PASS | 모든 스토어 변경·화면 변경은 실패 테스트 선행. RED 확인 필수. 태스크 생성 시 "테스트 → 실패 확인 → 구현 → 통과" 순서 내포 |
| II | 테스트 무결성 (모킹 규율) | PASS | 모킹은 `@/lib/supabase` 경계 1곳만(외부 네트워크). 목 응답은 실제 `page` row 전체 형상(id·created_at·title·content·user_id) 반영. 목 요소 단언 금지 |
| III | 디자인 시스템 준수 | PASS (조건부) | UI 변경(상세 "찾을 수 없음" 상태, 저장 실패 안내) 시작 전 `DESIGN.md` 필독. 빈 상태는 `.empty-state`(§2.7.12), 안내 문구는 `.saved-note`(§2.7.13) 계열 재사용. 새 패턴이 필요하면 DESIGN.md에 동시 반영 |
| IV | 프레임워크 문서 우선 | PASS | 신규 라우팅·서버 API 도입 없음(기존 클라이언트 패턴 유지). 화면 파일 수정 전 원본 체크아웃의 번들 문서에서 해당 가이드 확인 |
| V | 단순성 (YAGNI) | PASS | 충돌 감지·오프라인 큐·버전 관리 없음(last-write-wins). 실패 복구는 "서버 재조회 + 안내"의 최소 구현. 추상 리포지토리 계층 도입하지 않고 기존 스토어 함수 시그니처 유지 |

**Post-Phase-1 재점검**: 설계 산출물(data-model·contracts·quickstart) 작성 후에도 위반 없음 — Complexity Tracking 비어 있음.

## Project Structure

### Documentation (this feature)

```text
specs/003-supabase-page-posts/
├── plan.md              # 이 파일
├── research.md          # Phase 0 — 결정·근거·대안
├── data-model.md        # Phase 1 — page 매핑·뷰모델·즐겨찾기 저장
├── quickstart.md        # Phase 1 — 검증 가이드 (2계정 시나리오 포함)
├── contracts/
│   ├── page-rls.sql     # RLS 정책 계약 (마이그레이션 원문)
│   └── posts-store.md   # 스토어 동작 계약 (성공·실패·상태 규칙)
└── tasks.md             # Phase 2 — /speckit-tasks가 생성 (이 명령 아님)
```

### Source Code (repository root)

```text
lib/
├── supabase.ts          # (변경 없음) 브라우저 클라이언트
└── store.tsx            # [수정] 게시글 상태: localStorage → page 테이블 CRUD
                         #   - seed() 제거(FR-009), 즐겨찾기만 localStorage 유지(FR-010)
                         #   - createPost 비동기화(서버 id·created_at 수신)
                         #   - updatePost 디바운스 자동 저장, deletePost 비동기화
                         #   - 실패 시 서버 재조회 + 안내 상태 노출(FR-008)

app/(app)/
├── page.tsx             # [수정] createPost await 전환, 저장 실패 안내 표시
├── posts/[id]/page.tsx  # [수정] "찾을 수 없음" 상태(.empty-state) — 침묵 리다이렉트 대체
└── layout.tsx           # (변경 없음)

components/
└── AppShell.tsx         # [수정] newPage의 createPost await 전환 (가드 로직은 기존 유지)

__tests__/
├── auth-store.test.tsx  # (기존) 모킹 관례의 기준
└── page-posts.test.tsx  # [신규] 스토어 CRUD·소유자 흐름·실패 처리·시딩 제거 검증

supabase (MCP apply_migration으로 적용, 저장소에는 contracts/page-rls.sql로 기록)
└── page 테이블 RLS 정책 4개 (owner-only select/insert/update/delete)
```

**Structure Decision**: 기존 단일 Next.js 앱 구조를 그대로 사용한다. 변경의 중심은
`lib/store.tsx` 하나이며, 화면은 비동기 전환·상태 안내만 반영한다. 별도 서비스 계층·
리포지토리 추상화는 도입하지 않는다(Principle V).

## Complexity Tracking

> 위반 없음 — 해당 없음.
