# Contract: `PostCover` 컴포넌트 (UI)

애플리케이션이 사용자에게 노출하는 UI 계약. `components/PostCover.tsx`.

## 인터페이스

```ts
// "use client"
export function PostCover(): JSX.Element | null;
```

- **Props**: 없음.
- **반환**: `status === 'error'`이면 `null`(collapse), 그 외에는 커버 컨테이너 엘리먼트.
- **부수효과**: 마운트 시 외부 이미지 1회 요청(브라우저가 `<img src>` 로드). 스토어/localStorage
  변경 없음. 타이머·인터벌 없음.

## 렌더 계약 (관측 가능한 DOM)

| 상태 | `data-testid="detail-cover"` | `data-testid="cover-image"` | `data-testid="cover-skeleton"` |
|---|---|---|---|
| loading | 존재 | 존재(`opacity:0`, `data-loaded="false"`) | **존재** |
| loaded | 존재 | 존재(`opacity:1`, `data-loaded="true"`) | 없음 |
| error | **없음**(컴포넌트 null) | 없음 | 없음 |

- `cover-image`의 `src`는 `https://cataas.com/cat/cute`로 시작한다(캐시버스팅 쿼리 허용).
- `cover-image`의 `alt`는 빈 문자열(`""`) — 장식용.
- 로딩 중 표시는 **스켈레톤이며 스피너 요소가 아니다**(FR-003): 회전/로더 role·클래스 부재.

## 상태 전이 계약

| 트리거 | 전이 | 관측 결과 |
|---|---|---|
| 마운트 | → loading | 스켈레톤 표시, 이미지 미표시 |
| `<img>` `load` 이벤트 | loading → loaded | 스켈레톤 제거, 이미지 표시. 컨테이너 높이 불변 |
| `<img>` `error` 이벤트 | loading → error | 컨테이너 제거(collapse) |

- 되돌아가는 전이 없음. 타임아웃/재시도 없음(FR-009).

## 매핑 (요구사항 → 계약)

| 스펙 | 계약 지점 |
|---|---|
| FR-001 배치 | `page.tsx`에서 `.detail-breadcrumb`와 `.detail-title` 사이 렌더 |
| FR-002 랜덤 API | `src` = `cataas.com/cat/cute` |
| FR-003 스켈레톤(스피너 금지) | loading 시 `cover-skeleton` 존재, 스피너 없음 |
| FR-004 layout shift 0 | 고정 높이 컨테이너, loaded 전후 높이 동일 |
| FR-005 실패 정돈 | error → collapse, 깨진 이미지 노출 없음 |
| FR-006 편집 비방해 | Props 없음·페이지 상태 비의존, 커버는 제목/본문 위 별개 요소 |
| FR-008 매 진입 새 랜덤 | 마운트당 캐시버스팅 토큰으로 새 요청 |
| FR-009 타임아웃 없음 | `error` 이벤트로만 실패 판정 |
