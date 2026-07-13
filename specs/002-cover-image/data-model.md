# Phase 1 Data Model: 커버 이미지

이 기능은 **영속 데이터를 추가하지 않는다**(`Post` 스키마·localStorage 불변). 아래는
`PostCover` 컴포넌트의 **런타임 상태 모델**과 DOM 구조다.

## 1. 엔티티 — 커버 이미지 (Cover Image, transient)

편집 화면 상단에 표시되는 일시적 시각 요소. 저장소·`Post`에 저장되지 않는다.

| 속성 | 타입 | 설명 |
|---|---|---|
| `src` | `string` | 요청 URL. `COVER_ENDPOINT` + 마운트당 고유 캐시버스팅 토큰. **마운트당 1회** 계산, 이후 불변. |
| `status` | `'loading' \| 'loaded' \| 'error'` | 로드 상태. 초기값 `'loading'`. |

**상태 전이 (state machine)**

```
        (mount, src 생성)
             │
             ▼
        ┌─────────┐   <img> load 이벤트    ┌─────────┐
        │ loading │ ─────────────────────▶ │ loaded  │  (이미지 표시, 스켈레톤 제거)
        └─────────┘                        └─────────┘
             │
             │ <img> error 이벤트
             ▼
        ┌─────────┐
        │  error  │  (컴포넌트 null 반환 = 커버 collapse)
        └─────────┘
```

- `loading`: 고정 높이 컨테이너 + shimmer 스켈레톤 오버레이. `<img>`는 존재하되 `opacity:0`
  (아직 미표시) — 브라우저가 로드를 시작할 수 있도록 DOM에 있어야 함.
- `loaded`: 스켈레톤 제거, `<img>` `opacity:1` 페이드인. 컨테이너 높이 불변 → layout shift 0.
- `error`: 컴포넌트가 `null`을 반환해 커버 영역을 접음(편집 화면은 정상 유지).
- 인위적 타임아웃 없음 — `loading`은 `load`/`error` 이벤트가 오기 전까지 유지(FR-009).

**불변식(Invariants)**
- 스켈레톤과 실제 이미지의 렌더 높이는 **항상 동일**(고정 높이 컨테이너) → SC-003.
- `status` 전이는 단방향(`loading → loaded` 또는 `loading → error`), 되돌아가지 않음.
- `src`는 마운트 동안 불변 → 입력·리렌더로 이미지가 재요청/깜빡이지 않음(FR-006).

## 2. 컴포넌트 — `PostCover`

- **위치**: `components/PostCover.tsx` (신규, `"use client"`).
- **Props**: 없음(self-contained). 상수 `COVER_ENDPOINT = "https://cataas.com/cat/cute"`를
  내부에서 사용.
- **로컬 상태**: `status`(useState), `src`(useState 초기화 함수에서 1회 생성 — research §2).
- **핸들러**: `onLoad → setStatus('loaded')`, `onError → setStatus('error')`.

**렌더 규칙 (의사코드)**

```
if (status === 'error') return null;      // collapse

return (
  <div className="detail-cover" data-testid="detail-cover">
    <img
      className="detail-cover__img"
      data-testid="cover-image"
      src={src}
      alt=""                               // 장식용 (research §5)
      data-loaded={status === 'loaded'}    // CSS opacity 훅 (또는 클래스 토글)
      onLoad={...}
      onError={...}
    />
    {status !== 'loaded' && (
      <div className="detail-cover__skeleton" data-testid="cover-skeleton" aria-hidden="true" />
    )}
  </div>
);
```

## 3. DOM / CSS 계약 (globals.css `.detail-*` 섹션에 추가)

| 셀렉터 | 핵심 스타일 | 토큰/근거 |
|---|---|---|
| `.detail-cover` | `position: relative; width: 100%; height: 200px; border-radius: var(--radius-lg); overflow: hidden; margin-bottom: 20px;` | 고정 높이(layout shift 0), 카드 라운드, 브레드크럼–제목 사이 간격 |
| `.detail-cover__img` | `width: 100%; height: 100%; object-fit: cover; display: block; opacity: 0; transition: opacity var(--dur-normal) var(--ease-standard);` + `[data-loaded="true"] { opacity: 1 }` | Avatar와 동일한 `object-fit: cover`, 180ms 페이드인 |
| `.detail-cover__skeleton` | `position: absolute; inset: 0; background: linear-gradient(90deg, var(--surface-hover) 25%, var(--surface-subtle) 37%, var(--surface-hover) 63%); background-size: 200% 100%; animation: mnShimmer 1.4s linear infinite;` | 뉴트럴 램프 shimmer, 스피너 대신(FR-003) |
| `@keyframes mnShimmer` | `from { background-position: 200% 0 } to { background-position: -200% 0 }` | 신규 키프레임(모션) |

**data-testid (테스트 계약)**: `detail-cover`(컨테이너), `cover-image`(img), `cover-skeleton`(스켈레톤).

## 4. 통합 — `app/(app)/posts/[id]/page.tsx`

- `.detail-breadcrumb` 블록과 `<input className="detail-title">` **사이**에 `<PostCover />`를
  삽입한다(FR-001: 제목 입력창 바로 위).
- 페이지의 나머지 로직(자동 저장·삭제·가드)은 변경 없음. `PostCover`는 페이지 상태에 의존하지
  않는다(게시글 데이터와 무관한 랜덤 이미지 — FR-008).

## 5. 영속/스토어 영향 — 없음

- `lib/store.tsx`의 `Post` 타입·`updatePost`·localStorage 스키마 **변경 없음**.
- 커버 이미지는 저장·복원되지 않으며 매 마운트 새로 로드된다(FR-008, Assumptions).
