<!--
Sync Impact Report
==================
Version change: (template) → 1.0.0
Modified principles: n/a (initial ratification)
Added sections:
- Core Principles (I–V)
- Technology Stack & Test Environment
- Development Workflow & Quality Gates
- Governance
Removed sections: none
Templates requiring updates:
- ✅ .specify/templates/tasks-template.md — "Tests are OPTIONAL" 문구를 TDD 의무화에 맞게 수정
- ✅ .specify/templates/plan-template.md — Constitution Check 게이트가 본 헌법을 참조 (변경 불필요, 호환 확인)
- ✅ .specify/templates/spec-template.md — Independent Test 요구사항과 호환 (변경 불필요)
- ✅ .specify/templates/checklist-template.md — 헌법 참조 없음 (변경 불필요)
Follow-up TODOs: none
-->

# Mini Notion Constitution

## Core Principles

### I. Test-First — TDD 의무화 (NON-NEGOTIABLE)

모든 프로덕션 코드는 superpowers 플러그인의 `/test-driven-development`
(`superpowers:test-driven-development`) 스킬이 정의한 TDD 사이클을 따라 작성해야 한다(MUST).

- **Iron Law**: 실패하는 테스트 없이 프로덕션 코드를 작성하지 않는다.
  테스트보다 코드를 먼저 작성했다면 그 코드는 삭제하고 처음부터 다시 시작한다.
  "참고용으로 보관", "테스트 작성하면서 개조"는 금지된다 — 삭제는 삭제다.
- **Red-Green-Refactor**: ① 실패하는 최소 테스트 작성 → ② 실패를 직접 확인
  (기능 부재로 실패해야 하며, 오타·에러로 인한 실패는 무효) → ③ 통과하는 최소 코드 작성 →
  ④ 통과를 직접 확인 → ⑤ 그린 상태를 유지하며 리팩터링. 이 순서를 어기는 것은 위반이다.
- **RED 확인 생략 금지**: 테스트가 실패하는 것을 직접 보지 않았다면 그 테스트가 올바른 것을
  검증하는지 알 수 없다. 즉시 통과하는 테스트는 아무것도 증명하지 않는다.
- **GREEN은 최소 코드**: 테스트를 통과시키는 가장 단순한 코드만 작성한다.
  테스트가 요구하지 않는 기능·옵션·추상화를 추가하지 않는다(YAGNI).
- **버그 수정도 TDD**: 버그를 재현하는 실패 테스트를 먼저 작성한 뒤 수정한다.
  테스트 없는 버그 수정은 금지된다.
- **예외**: 일회성 프로토타입, 생성된 코드, 설정 파일은 사용자(인간 파트너)의 명시적 허락을
  받은 경우에만 TDD를 생략할 수 있다.
- **완료 선언 전 체크리스트**: 모든 새 함수/메서드에 테스트 존재, 각 테스트의 실패를 직접
  목격, 최소 구현, 전체 테스트 통과, 출력 무결(에러·경고 없음)을 모두 확인해야 한다.
  하나라도 체크할 수 없다면 TDD를 건너뛴 것이므로 다시 시작한다.

**근거**: 테스트를 먼저 작성하고 실패를 목격해야만 그 테스트가 실제로 무언가를 검증한다는
사실이 증명된다. 사후 테스트는 구현에 편향되어 "무엇을 해야 하는가"가 아니라
"무엇을 했는가"를 검증할 뿐이다.

### II. 테스트 무결성 — 모킹 규율

테스트는 목(mock)의 동작이 아니라 실제 동작을 검증해야 한다(MUST).
`superpowers:test-driven-development` 스킬의 `testing-anti-patterns.md`를 따른다.

- **목 동작을 테스트하지 않는다**: 목 요소(`*-mock` testid 등)에 대한 단언은 금지.
  실제 컴포넌트를 테스트하거나 목을 제거한다.
- **프로덕션 클래스에 테스트 전용 메서드를 추가하지 않는다**: 테스트 정리(cleanup)는
  테스트 유틸리티로 분리한다.
- **의존성을 이해하기 전에 모킹하지 않는다**: 실제 메서드의 부수효과를 파악하고,
  테스트가 그 부수효과에 의존하면 더 낮은 레벨(실제로 느리거나 외부인 연산)에서 모킹한다.
  불확실하면 실제 구현으로 먼저 실행해 관찰한 뒤 최소한으로 모킹한다.
- **불완전한 목 금지**: 목 응답은 실제 데이터 구조 전체를 반영해야 한다.
  당장 쓰는 필드만 담은 부분 목은 침묵 속에서 깨진다.
- **기본은 실제 코드**: 모킹은 불가피할 때만 사용한다. 목 설정이 테스트 로직보다 길어지면
  설계를 단순화하거나 실제 컴포넌트로 통합 테스트를 고려한다.

**근거**: 목은 격리를 위한 수단이지 검증 대상이 아니다. 목을 검증하는 테스트는
통과하더라도 실제 동작에 대해 아무것도 보장하지 않는다.

### III. 디자인 시스템 준수

UI·컴포넌트·화면·스타일을 생성하거나 수정하는 모든 작업은 시작 전에 `DESIGN.md`를
먼저 읽어야 한다(MUST). 기억이나 추측으로 진행하지 않는다.

- 새 값을 임의로 만들지 않고 `DESIGN.md`에 정의된 토큰·컴포넌트·패턴을 재사용한다.
- 문서에 없는 새 디자인 결정이 필요하면 `DESIGN.md`에도 함께 반영해 문서와 코드의
  불일치를 방지한다.
- 정답 기준(source of truth)은 실제 구현 코드(`app/`, `components/`, `lib/`)다.

**근거**: `CLAUDE.md`가 이 규칙을 기본 동작보다 우선하는 저장소 규칙으로 명시한다.

### IV. 프레임워크 문서 우선

이 프로젝트의 Next.js는 학습 데이터와 다른 브레이킹 체인지를 포함한다.
코드를 작성하기 전에 `node_modules/next/dist/docs/`의 관련 가이드를 읽어야 한다(MUST).

- API·컨벤션·파일 구조를 기억에 의존해 가정하지 않는다.
- 사용 중단(deprecation) 안내를 발견하면 따른다. 도구·라이브러리가 출력하는
  마이그레이션 경고도 동일하게 처리한다.

**근거**: `AGENTS.md`가 명시한 저장소 규칙이며, 잘못된 기억 기반 코드는 컴파일되더라도
런타임에서 미묘하게 어긋난다.

### V. 단순성 (YAGNI)

지금 필요한 것만 만든다(MUST).

- 테스트(요구사항)가 요구하지 않는 옵션·설정·추상화·확장 포인트를 추가하지 않는다.
- 테스트하기 어렵다면 설계가 복잡하다는 신호다 — 테스트를 비틀지 말고 인터페이스를
  단순화한다.
- 복잡성이 불가피하다면 계획 문서의 Complexity Tracking에 정당화를 기록해야 한다.

**근거**: TDD의 GREEN 단계가 요구하는 최소 구현 원칙의 일반화이며, 추측성 설계는
유지보수 비용만 늘린다.

## Technology Stack & Test Environment

이 프로젝트의 확정된 기술 스택과 테스트 환경. 변경 시 헌법 개정이 필요하다.

- **런타임**: Next.js 16.2.10 (App Router), React 19, TypeScript (strict)
- **테스트 프레임워크**: Vitest 4 + React Testing Library + jsdom
  - 선택 근거: 번들된 Next.js 공식 문서(`node_modules/next/dist/docs/01-app/02-guides/testing/vitest.md`)가
    App Router 유닛 테스트 표준으로 안내하는 조합이다.
- **설정**: `vitest.config.mts` — `@vitejs/plugin-react` + `resolve.tsconfigPaths: true`
  (tsconfig의 `@/*` 별칭 해석), `environment: 'jsdom'`
- **명령어**:
  - `npm test` — 전체 테스트 1회 실행 (`vitest run`). TDD 사이클의 RED/GREEN 확인에 사용.
  - `npm test -- <파일경로>` — 특정 테스트 파일만 실행.
  - `npm run test:watch` — 워치 모드 (`vitest`).
- **테스트 파일 위치**: `__tests__/*.test.tsx` 또는 소스 옆에 콜로케이션(`*.test.ts(x)`).
- **알려진 제약**: async Server Component는 Vitest가 지원하지 않는다 — 동기 Server/Client
  컴포넌트만 유닛 테스트하고, async 컴포넌트는 E2E로 검증한다(번들 문서 기준).

## Development Workflow & Quality Gates

- **작업 단위**: 모든 기능·버그픽스 태스크는 Principle I의 TDD 사이클로 진행한다.
  tasks.md의 각 태스크는 "테스트 작성 → 실패 확인 → 구현 → 통과 확인" 순서를 내포한다.
- **완료 게이트**: 태스크 완료 선언 전에 `npm test`(전체)를 실행해 통과와 무결한 출력
  (에러·경고 없음)을 확인해야 한다. 실패하는 테스트가 있으면 완료가 아니다.
- **계획 게이트**: `/speckit-plan`의 Constitution Check는 본 헌법의 원칙 I–V 위반 여부를
  점검한다. 위반은 Complexity Tracking에 정당화 없이는 통과할 수 없다.
- **디자인 게이트**: UI 관련 태스크는 시작 전 `DESIGN.md` 확인(Principle III),
  프레임워크 API 사용 전 번들 문서 확인(Principle IV)을 전제로 한다.

## Governance

- 본 헌법은 이 저장소의 다른 모든 개발 관행보다 우선한다. `CLAUDE.md`·`AGENTS.md`의
  저장소 규칙은 본 헌법에 통합되어 있으며(원칙 III·IV), 충돌 시 더 엄격한 쪽을 따른다.
- **개정 절차**: 개정은 이 파일의 수정으로 이루어지며, Sync Impact Report(파일 상단 주석)에
  변경 내역을 기록하고 의존 템플릿(`.specify/templates/*.md`)과의 일관성을 함께 갱신해야 한다.
- **버전 정책**: 시맨틱 버저닝을 따른다.
  - MAJOR: 원칙의 제거 또는 호환 불가능한 재정의
  - MINOR: 원칙·섹션의 추가 또는 실질적 확장
  - PATCH: 문구 명확화, 오타 수정 등 의미 변화 없는 정제
- **준수 검토**: 모든 계획(`/speckit-plan`)은 Constitution Check 게이트를 통과해야 하며,
  모든 구현(`/speckit-implement`)은 완료 전 Principle I의 완료 체크리스트를 검증해야 한다.

**Version**: 1.0.0 | **Ratified**: 2026-07-09 | **Last Amended**: 2026-07-09
