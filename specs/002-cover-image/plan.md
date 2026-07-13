# Implementation Plan: 커버 이미지

**Branch**: `002-cover-image` | **Date**: 2026-07-13 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/002-cover-image/spec.md`

**Note**: This template is filled in by the `/speckit-plan` command. See `.specify/templates/plan-template.md` for the execution workflow.

## Summary

게시글 상세(편집) 화면(`app/(app)/posts/[id]/page.tsx`)의 브레드크럼과 제목 입력창
(`.detail-title`) 사이에, 외부 랜덤 고양이 오픈 API(`https://cataas.com/cat/cute`)에서
가져온 커버 이미지를 배치한다. 이미지를 내려받는 동안에는 로딩 스피너가 아니라 커버와
동일한 크기의 **스켈레톤(shimmer) placeholder**로 자리를 유지해 이미지 도착 시 레이아웃
밀림(layout shift)이 없게 한다(FR-004). 로드 에러가 발생하면 커버를 접어(collapse) 숨기고
편집 화면은 정상 유지한다(FR-005). 이미지는 매 진입마다 새로 요청하며(FR-008) 게시글별로
저장·고정하지 않는다.

기술적으로는 자체 상태(로딩/표시/실패)를 가진 **클라이언트 컴포넌트** 하나(`PostCover`)를
새로 추가하고, 기존 디자인 토큰만 재사용해 CSS(`.detail-cover*`)와 shimmer 키프레임을
정의한다. 새 스토어 상태·영속화·서버 통신·신규 npm 의존성은 없다. 커버는 `Post` 데이터에
저장되지 않는 순수 표시용 일시(transient) 요소다.

## Technical Context

**Language/Version**: TypeScript (strict) — Next.js 16.2.10 (App Router), React 19

**Primary Dependencies**: Next.js, React — 신규 의존성 추가 없음. 이미지는 표준 `<img>`
요소로 표시(외부 호스트 `cataas.com`를 별도 `next.config` 설정 없이 사용하기 위함 —
research.md §1 참조).

**Storage**: N/A — 커버 이미지는 `Post`에 저장하지 않는 일시 표시 요소. 매 진입 시 외부
API에서 새로 가져오며 localStorage/스토어에 어떤 값도 추가하지 않는다(FR-008).

**Testing**: Vitest 4 + React Testing Library + jsdom (`npm test`) — 저장소 표준
(`vitest.config.mts`, `environment: 'jsdom'`, `tsconfigPaths: true`). `PostCover`는 동기
클라이언트 컴포넌트이므로 유닛 테스트 가능(헌법 Technology Stack의 async Server Component
제약에 해당하지 않음). jsdom에서 `<img>`에 `load`/`error` 이벤트를 fire해 상태 전이를 검증.

**Target Platform**: 웹 브라우저 (Next.js 클라이언트 컴포넌트, 데스크톱 웹 기준)

**Project Type**: 단일 웹 앱 (Next.js App Router, `app/` + `components/` + `lib/` 구조 —
frontend/backend 분리 없음)

**Performance Goals**: 화면 진입 즉시 스켈레톤 표시(추가 대기 0). 제목·본문 편집은 커버
로드 상태와 무관하게 즉시 가능(SC-004). 스켈레톤→이미지 전환 시 세로 위치 이동 0px(SC-003).

**Constraints**: 외부 API 의존(실패 가능) — 실패는 `<img>` `error` 이벤트로만 판정하고
인위적 타임아웃은 두지 않는다(FR-009, Clarifications). 스켈레톤과 실제 이미지는 동일한
고정 높이를 차지해야 한다(FR-004). 커버는 편집을 방해·가리지 않는다(FR-006). 새 디자인
값은 만들지 않고 `DESIGN.md` 토큰만 재사용하며, 신규 패턴은 `DESIGN.md`에 함께 기록한다.

**Scale/Scope**: 화면 1곳(`posts/[id]`)에 컴포넌트 1개 추가 + `globals.css`에 `.detail-cover*`
규칙·`@keyframes mnShimmer` 1개 추가 + `DESIGN.md` 갱신. 신규 파일: `components/PostCover.tsx`,
`__tests__/post-cover.test.tsx`.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| 원칙 | 상태 | 근거 |
|---|---|---|
| I. Test-First (TDD) | PASS | `PostCover`의 상태 전이(스켈레톤 표시 → load 시 이미지·스켈레톤 제거 → error 시 collapse)와 배치(제목 위)를 `/speckit-tasks`가 만들 태스크에서 실패 테스트 → 구현 순서로 진행. `__tests__/post-cover.test.tsx` 신규. |
| II. 테스트 무결성 | PASS | 실제 `PostCover` 컴포넌트를 RTL로 렌더하고 실제 DOM(`<img>`)에 `load`/`error` 이벤트를 fire해 실제 동작을 검증. `next/navigation`은 기존 테스트와 동일하게 최소 모킹, 커버 컴포넌트 자체는 모킹하지 않음. |
| III. 디자인 시스템 준수 | PASS (조건부) | `DESIGN.md`에 "커버 이미지/스켈레톤" 패턴이 아직 없음. 임의 값 없이 기존 토큰(색 `--surface-hover`/`--surface-subtle`/`--gray-*`, `--radius-lg`, `--dur-normal`/`--ease-standard`)만 재사용해 정의하고, 새 결정(신규 컴포넌트·`@keyframes mnShimmer`·§4.3 배치·`alt=""`)을 `DESIGN.md`에 함께 반영(구현 태스크에 포함). 착수 전 `DESIGN.md` 정독 완료. |
| IV. 프레임워크 문서 우선 | PASS (메모) | 이미지 표시 방식으로 `next/image` vs 표준 `<img>`를 검토해 `<img>`를 선택(research.md §1). 참고: 이 체크아웃에는 `node_modules/next/dist/docs/`가 존재하지 않아 번들 문서를 직접 인용할 수 없음 — 저장소가 이미 쓰는 `"use client"` + 훅 패턴과 웹 표준 `<img>`만 사용하고 신규 Next.js API·`next.config` 변경은 도입하지 않음으로써 리스크를 회피. |
| V. 단순성 (YAGNI) | PASS | 표준 `<img>` + 3-상태 로컬 상태만 사용. 인위적 타임아웃·재시도·이미지 저장·프리페치·`next/image` 최적화 파이프라인 없음(스펙이 요구하지 않음). 커버 조작(교체/제거)은 스펙에서 범위 제외. |

**Gate 결과: PASS** — Complexity Tracking 불필요.

**Post-Design Re-check (Phase 1 이후)**: `research.md`/`data-model.md`/`contracts/`/
`quickstart.md` 작성 결과 — 신규 npm 의존성 0, 신규 저장/스키마 0, 임의 디자인 값 0(모두
기존 토큰 참조), 새 Next.js API 0. 유일한 신규 산출물은 클라이언트 컴포넌트 1개 + CSS 규칙
+ shimmer 키프레임이며 모두 `DESIGN.md` 반영 대상으로 명시됨(원칙 III). Gate는 여전히
**PASS**.

## Project Structure

### Documentation (this feature)

```text
specs/002-cover-image/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output — 이미지 표시 방식·캐시버스팅·스켈레톤 토큰 결정
├── data-model.md        # Phase 1 output — 커버 3-상태 모델 + PostCover props/DOM
├── quickstart.md        # Phase 1 output — 수동/자동 검증 시나리오
├── contracts/           # Phase 1 output — UI 컴포넌트 계약 + 외부 API 계약
│   ├── post-cover-component.md
│   └── cataas-api.md
└── tasks.md             # Phase 2 output (/speckit-tasks — NOT created here)
```

### Source Code (repository root)

```text
app/
├── (app)/
│   └── posts/[id]/page.tsx     # [수정] 브레드크럼과 .detail-title 사이에 <PostCover/> 삽입
└── globals.css                 # [수정] .detail-cover* 규칙 + @keyframes mnShimmer 추가

components/
└── PostCover.tsx               # [신규] 커버 이미지 클라이언트 컴포넌트(로딩/표시/실패 상태 관리)

__tests__/
└── post-cover.test.tsx         # [신규] 스켈레톤/로드/에러/배치 상태 전이 테스트

DESIGN.md                       # [수정] 신규 컴포넌트·shimmer 키프레임·§4.3 배치·§8 커버리지 반영
```

**Structure Decision**: 기존 단일 웹 앱 구조를 그대로 따른다. 화면 특화 UI지만 자체
로드/에러 라이프사이클(상태 기계)을 가지므로, 001의 인라인 방식과 달리 **전용 클라이언트
컴포넌트 `components/PostCover.tsx`**로 캡슐화한다(테스트 격리·페이지 단순성). `page.tsx`는
`<PostCover />`를 제목 입력창 위에 렌더하기만 한다. 스타일은 기존 `.detail-*` 규칙과 같은
위치(globals.css 상세 섹션)에 `.detail-cover*`로 추가한다.

## Complexity Tracking

> Constitution Check가 모두 PASS이므로 작성 불필요(위반 없음).
