# Phase 0 Research: 콘텐츠 글자 수 표시

## 1. 글자(문자) 수 계산 방식

**Decision**: JavaScript 문자열의 `content.length`(UTF-16 code unit 개수)를 그대로 글자 수로
사용한다.

**Rationale**:
- 스펙 FR-004는 "공백과 줄바꿈을 포함해 존재하는 모든 문자를 각각 하나의 글자로 계산"만
  요구하며, 결합 문자(combining character)나 이모지 서로게이트 쌍의 시각적 그래핌 단위
  분리를 요구하지 않는다.
- 이 앱의 실제 콘텐츠는 한글·영문·숫자·공백·줄바꿈 위주이며, 한글 음절은 BMP 내 단일
  UTF-16 코드 유닛이므로 `.length`가 사용자가 체감하는 글자 수와 정확히 일치한다.
- YAGNI(헌법 원칙 V): `Intl.Segmenter`로 grapheme 단위 분리를 하면 이모지·결합 문자
  경계에서 더 "정확"할 수 있으나, 이 스펙이 요구하지 않는 복잡성을 추가하는 것이다.

**Alternatives considered**:
- `Intl.Segmenter('ko', { granularity: 'grapheme' })`로 순회하며 카운트 — 이모지/결합
  문자를 사용자가 보는 대로 1개로 셀 수 있지만, 이 기능 범위에서 요구되지 않고 구현·
  테스트 복잡도만 늘어나 기각.
- 공백 제외 카운트(`content.replace(/\s/g, '').length`) — 스펙 FR-004(공백 포함)와
  Assumptions에서 이미 "공백·줄바꿈 포함"으로 명시적으로 결정되어 기각.

## 2. 실시간 갱신 구현 방식

**Decision**: 별도 `useEffect`/디바운스 없이, 기존 `post.content` 상태가 매 keystroke마다
리렌더링을 트리거하는 것을 그대로 활용해 렌더 시점에 `post.content.length`를 계산해
표시한다.

**Rationale**:
- `app/(app)/posts/[id]/page.tsx`는 이미 `onChange={(e) => app.updatePost(post.id, { content: e.target.value })}`로
  매 입력마다 컨텍스트 상태를 갱신하고 리렌더링되는 구조다. 글자 수는 이 리렌더링에
  자연히 포함되는 순수 계산이므로 추가 상태·이펙트가 필요 없다(SC-001의 100ms 목표는
  React 리렌더 자체가 수 ms 내에 끝나므로 무리 없이 충족된다).
- 디바운스를 추가하면 오히려 "즉시 갱신"이라는 스펙 요구(FR-002)를 위반할 위험이 있다.

**Alternatives considered**:
- `useMemo(() => content.length, [content])` — 계산이 `.length` 프로퍼티 접근 수준으로
  매우 저렴해 메모이제이션 이득이 없고, 코드만 복잡해져 기각(YAGNI).

## 3. 화면 우측 하단 고정(floating) 배지 배치 방식

**Decision**: 글자 수 배지는 콘텐츠 편집 화면의 스크롤 컨테이너(`.app-main`, 이미
`overflow-y: auto`) 기준으로 `position: fixed`로 배치해, 문서 스크롤과 무관하게 항상
같은 화면 좌표(우측 하단)에 보이도록 한다. (Clarifications 2026-07-10 반영)

**Rationale**:
- `app/globals.css`의 레이아웃을 보면 `.app-root { height:100vh; overflow:hidden }`,
  `.app-main { overflow-y:auto }`로 전체 앱은 뷰포트에 고정되고 본문만 내부 스크롤된다.
  `position: fixed`는 뷰포트 기준으로 고정되므로 사이드바(`.sidebar`, 폭 264px)와
  겹치지 않도록 우측 여백을 기준으로 배치하면 요구된 "편집 화면 우측 하단 고정"과
  정확히 일치한다.
- `.detail-page`는 `max-width:760px; margin:0 auto`로 가운데 정렬되므로, 배지를
  `.detail-page` 내부에 `position: sticky`로 둘 경우 뷰포트 폭이 넓을 때 콘텐츠 우측이
  아니라 화면 중앙 근처에 위치하게 되어 "화면 우측 하단"이라는 요구와 어긋난다. 따라서
  뷰포트(정확히는 `.app-main` 영역) 기준 고정이 스펙 의도에 더 부합한다.

**Alternatives considered**:
- `.detail-page` 내부에 `position: sticky; bottom: 0`로 배치 — 페이지 컨테이너 폭
  기준으로 위치가 잡혀 넓은 화면에서 "우측 하단"이 아니라 "콘텐츠 우측 하단"처럼
  보일 수 있어, 뷰포트 전체 기준 고정보다 의도에서 벗어남. 기각.

## 4. 디자인 토큰 재사용

**Decision**: 새 클래스(`.detail-char-count`)는 기존 `DESIGN.md` 토큰만 사용해 스타일링한다
— 배경 `--surface-card` 또는 `--gray-900`(브랜드칩과 유사한 다크 배지 톤 중 택1은 Phase 1
`DESIGN.md` 갱신 시 확정), 텍스트 컬러 `--text-secondary`/`--text-muted`, `radius-md`,
`--shadow-xs`~`--shadow-sm`, 폰트 12~13px 스케일(`sidebar-item`/`badge`와 동일 계열).

**Rationale**: CLAUDE.md·헌법 원칙 III("새 값을 임의로 만들지 말고 정의된 토큰·컴포넌트·
패턴을 재사용")을 따른다. 구체적인 최종 값(배경색 1개, padding, 정확한 `bottom/right`
오프셋)은 Phase 1에서 `DESIGN.md`에 신규 섹션으로 기록하며 확정한다.

**Alternatives considered**: 임의의 새 색상/그림자 값 도입 — 헌법 위반이므로 기각.

## 남은 미해결 항목

없음 — Technical Context의 모든 필드가 기존 저장소 컨벤션으로 확정되었으며
NEEDS CLARIFICATION 표시가 남아있지 않다.
