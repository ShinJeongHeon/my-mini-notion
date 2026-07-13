# Phase 0 Research: 커버 이미지

Technical Context에 남은 미해결(NEEDS CLARIFICATION)은 없다. 아래는 구현 방식 결정과 근거다.

## 1. 이미지 표시 방식 — `next/image` vs 표준 `<img>`

**Decision**: 표준 HTML `<img>` 요소를 사용한다.

**Rationale**:
- 외부 임의 호스트(`cataas.com`)의 이미지를 `next/image`로 표시하려면 `next.config`에
  `images.remotePatterns`를 추가해야 하고, 최적화 파이프라인이 리사이즈·재인코딩을 시도한다.
  본 기능은 **매 진입 랜덤·캐시버스팅**(FR-008)이 핵심이라 최적화·캐싱이 오히려 방해가 된다.
- `<img>`는 `onLoad`/`onError` 이벤트를 직접 노출해 "스켈레톤 → 이미지" / "실패 → collapse"
  상태 전이를 명료하게 구현·검증할 수 있다(jsdom에서 `load`/`error` 이벤트 fire로 테스트 가능).
- 저장소의 기존 이미지 표시(`components/ui/Avatar.tsx`의 `.avatar img`)도 표준 `<img>` +
  `object-fit: cover`를 쓴다 — 동일 패턴 재사용(디자인 시스템 §2.4).
- YAGNI(헌법 원칙 V): 최적화·`next.config` 변경 없이 요구사항을 전부 충족한다.

**Alternatives considered**:
- `next/image` (`<Image fill>`): 원격 호스트 허용 설정 + 최적화가 필요하며, 랜덤/캐시버스팅과
  상충하고 jsdom 유닛 테스트에서 다루기 번거로움 → 기각.
- 배경 이미지(`background-image`): `onLoad`/`onError` 로드 상태 훅이 없어 스켈레톤·실패
  전이를 신뢰성 있게 잡기 어려움 → 기각.

**참고**: 이 체크아웃에는 `node_modules/next/dist/docs/`(AGENTS.md가 가리키는 번들 문서)가
존재하지 않는다. 따라서 신규 Next.js API를 도입하지 않고 저장소가 이미 검증한 패턴
(`"use client"` + 표준 DOM 요소)만 사용해 문서 부재로 인한 리스크를 회피한다.

## 2. "매 진입마다 새 랜덤 이미지" 보장 (FR-008) — 캐시버스팅

**Decision**: 컴포넌트 마운트 시 1회, URL에 고유 쿼리 토큰을 붙여 요청 URL을 만든다.
예: `https://cataas.com/cat/cute?t=<mount마다 고유값>`. 토큰은 `useState`(또는 `useRef`)
**초기화 함수에서 1회** 계산해 같은 마운트 내 리렌더에서는 안정적으로 유지한다.

**Rationale**:
- `cataas.com/cat/cute`는 요청마다 랜덤 이미지를 반환하지만, 동일 URL은 브라우저 캐시로
  재사용될 수 있어 재진입 시 같은 사진이 나올 수 있다. 고유 토큰으로 URL을 매 진입 유일화하면
  새 요청이 강제되어 FR-008(매번 새 랜덤)을 신뢰성 있게 충족한다.
- 마운트당 1회 고정이므로 입력·리렌더 중에 이미지가 깜빡이거나 재요청되지 않는다(FR-006).

**Alternatives considered**:
- 토큰 없이 고정 URL: 캐시로 같은 이미지 재사용 가능 → FR-008 불충족 위험 → 기각.
- 매 렌더 토큰 재생성: 리렌더마다 src가 바뀌어 이미지가 반복 재로드/깜빡임 → 기각.

**주의(구현)**: 토큰 생성은 앱 런타임(`Date.now()`/`Math.random()` 사용 가능)에서 수행한다.
스토어의 `uid()`와 동일한 기법을 재사용해도 된다. 단, 렌더 본문이 아니라 상태 초기화에서
1회만 생성해야 SSR/CSR·리렌더 안정성이 보장된다.

## 3. 스켈레톤(shimmer) — 스피너 대신 (FR-003) · 레이아웃 안정 (FR-004)

**Decision**: 커버 컨테이너를 **고정 높이**로 두고, 로딩 중에는 컨테이너를 채우는 절대배치
스켈레톤 오버레이(shimmer 그라디언트 애니메이션)를 표시한다. 이미지는 컨테이너 안에서
`object-fit: cover`로 채우며 로드 완료 시 opacity 0→1로 페이드인, 스켈레톤은 제거한다.
스켈레톤과 이미지가 **동일한 고정 높이**를 차지하므로 전환 시 위치 이동이 없다(SC-003).

**토큰 재사용(임의 값 금지 — 원칙 III)**:
- 컨테이너 라운드: `--radius-lg`(12px, 카드류 표준).
- 스켈레톤 베이스/하이라이트: `--surface-hover`(#f1f2f3) ↔ `--surface-subtle`(#f7f8f9) /
  `--gray-150`(#ebeced) 그라디언트(뉴트럴 램프 내 값).
- 페이드인 전환: `opacity var(--dur-normal) var(--ease-standard)`
  (`--dur-normal` 180ms — 그동안 "정의만/미사용"이던 토큰을 실제 사용).
- shimmer 키프레임 `@keyframes mnShimmer`는 신규(모션). 기존 `mnPop`처럼 지속시간은
  호출부에서 하드코딩(`1.4s linear infinite`) — 저장소의 키프레임 지속시간 하드코딩 관행과 일치.
- 커버 높이는 신규 고정 값이 필요하다(현재 토큰에 없음). `DESIGN.md`에 **새 결정으로 명시**하고
  상세 컨테이너(max-width 760px)에 어울리는 배너 높이 **200px**를 채택(§4.3에 기록).

**Rationale**: 고정 높이 + 오버레이 스켈레톤은 layout shift 0(SC-003)을 가장 단순하게 보장한다.
색·라운드·전환은 전부 기존 토큰이라 디자인 시스템과 이질감이 없다. 높이 200px는 문서 상단
배너로서 제목을 가리지 않는 적정 비율이다.

**Alternatives considered**:
- 스피너: 스펙이 명시적으로 금지(FR-003) → 기각.
- `aspect-ratio` 기반 가변 높이: 반응형엔 유리하나 데스크톱 단일 폭 기준에서 고정 높이가
  더 단순하고 예측 가능 → 고정 높이 채택.
- reduced-motion에서 shimmer 정지: 접근성상 바람직하나, 저장소가 현재 `prefers-reduced-motion`을
  전혀 구현하지 않음(DESIGN.md §7). 단일 요소만 예외 처리하면 일관성이 깨지므로 이번 범위에선
  기존 관행을 따르고, `DESIGN.md` §7의 기존 TODO(reduced-motion 미구현)에 shimmer도 포함해 둔다.

## 4. 로드 실패 처리 (FR-005) · 타임아웃 없음 (FR-009)

**Decision**: `<img>`의 `error` 이벤트가 발생하면 상태를 `error`로 바꾸고 커버 전체를
언마운트(collapse, 컴포넌트가 `null` 반환)한다. 인위적 setTimeout 타임아웃·재시도는 두지 않는다.
느리지만 에러가 아닌 로딩은 스켈레톤을 계속 유지한다(FR-009, Clarifications).

**Rationale**:
- 실패 판정을 브라우저 `error` 이벤트에 위임하면 깨진 이미지 아이콘이 노출되지 않고(SC-005),
  로직이 단순하다(YAGNI). 편집은 커버 상태와 독립적이라 collapse가 작업을 막지 않는다(SC-004).
- collapse로 인한 세로 이동은 실패 경로에서만 발생하며 SC-003(스켈레톤→이미지 전환)의 제약
  대상이 아니다.

**Alternatives considered**:
- 실패 시 빈 회색 박스 유지: 스펙상 허용("빈 커버 영역")이나, 랜덤 장식 요소가 실패했을 때
  자리를 남기는 것보다 접는 편이 깔끔 → collapse 채택(빈 박스도 스펙 위반은 아님).
- N초 타임아웃 후 숨김: Clarifications에서 "인위적 타임아웃 없음"으로 확정 → 기각.

## 5. 접근성 — 대체 텍스트 (clarify Deferred 항목 해소)

**Decision**: 커버 `<img>`는 `alt=""`(빈 대체 텍스트)로 장식용(decorative)임을 명시한다.

**Rationale**: 콘텐츠는 매 진입 무작위로 바뀌는 순수 장식 이미지이므로 의미 있는 대체
텍스트가 없다. 빈 `alt`는 스크린리더가 이미지를 건너뛰게 해 노이즈를 방지하는 표준 관행이다.
이로써 `/speckit-clarify`에서 계획 단계로 Deferred했던 접근성 항목을 확정한다.

**Alternatives considered**:
- `alt="커버 이미지"` 등 서술: 무작위 장식엔 부정확·불필요한 낭독 유발 → 기각.
- `role="presentation"` 별도 부여: 빈 `alt`로 충분 → 불필요.

## 결론 (모든 NEEDS CLARIFICATION 해소)

- 표시: 표준 `<img>` + `object-fit: cover`.
- 갱신: 마운트당 1회 캐시버스팅 토큰으로 새 랜덤 강제(FR-008).
- 로딩: 고정 높이 컨테이너 + shimmer 스켈레톤 오버레이(FR-003/FR-004, layout shift 0).
- 실패: `error` 이벤트 → collapse, 타임아웃 없음(FR-005/FR-009).
- 접근성: `alt=""` 장식 처리.
- 신규 디자인 결정(컴포넌트/`@keyframes mnShimmer`/높이 200px/§4.3 배치)은 `DESIGN.md`에
  반영(원칙 III) — 구현 태스크에 포함.
