# Data Model: 계정 기반 페이지 게시글 저장

## 1. 영속 엔티티

### 1.1 `public.page` (기존 테이블 — 구조 변경 금지, FR-007)

| 컬럼 | 타입 | 제약 | 앱에서의 의미 |
|------|------|------|----------------|
| `id` | uuid | PK, default `gen_random_uuid()` | 게시글 식별자. 상세 URL `/posts/[id]`에 사용 |
| `created_at` | timestamptz | default `now()` | 생성일시. 목록 정렬 기준(내림차순) |
| `title` | text | nullable | 제목. 빈 제목 허용 — 화면에서 "제목 없음" 대체 표기 |
| `content` | text | nullable | 본문. 빈 본문 허용 — 목록에서 "내용 없음" 대체 표기 |
| `user_id` | uuid | NOT NULL, FK → `auth.users.id` | 소유자. RLS 정책의 격리 기준 |

- 관계: `auth.users (1) — (N) public.page` (`page_user_id_fkey`)
- 접근 제어: owner-only RLS 정책 4개 — 계약 원문은 [contracts/page-rls.sql](./contracts/page-rls.sql)
- 쓰기 규칙: insert 시 클라이언트가 `user_id = auth.uid()`를 명시하고 WITH CHECK가 검증.
  `id`·`created_at`은 DB 기본값에 위임. update는 `title`·`content`만 변경(last-write-wins).

### 1.2 `public.profile` · Storage `profile-image` (범위 밖 — 변경 없음)

닉네임·아바타는 기존 동작 유지. 이 기능에서 접근 코드 수정 없음.

## 2. 기기 로컬 저장 (localStorage)

### 2.1 즐겨찾기 집합 (FR-010)

| 항목 | 값 |
|------|-----|
| 키 | `mini-notion-fav:<userId>` |
| 값 | `string[]` — 즐겨찾기된 page id 배열 (JSON) |
| 수명 | 기기·브라우저 로컬. 계정 간 격리는 키의 userId로 보장. 기기 간 공유 안 됨(허용된 동작) |
| 정합성 | 목록 로드 시 존재하지 않는 id는 무시(청소는 선택 사항, 필수 아님) |

### 2.2 구 키 `mini-notion-v1` (폐기 — 읽지도 쓰지도 않음)

게시글·시딩 저장에 쓰이던 키. 이관·삭제 없이 방치한다(Assumptions: 이관 없음).
단, 닉네임·이미지 경로의 비로그인 폴백으로도 더 이상 게시글을 읽지 않는다.

## 3. 앱 뷰모델

### 3.1 `Post` (화면 계약 — 기존 형상 유지)

```ts
type Post = {
  id: string;        // page.id (uuid)
  title: string;     // page.title ?? ""
  content: string;   // page.content ?? ""
  favorite: boolean; // 로컬 즐겨찾기 집합에 id가 있는가 (2.1)
  createdAt: number; // Date.parse(page.created_at) — ms epoch, formatDate() 입력
};
```

매핑 규칙:
- DB → 앱: null 텍스트는 `""`로, `created_at`은 ms 숫자로. `favorite`는 조인이 아니라 로컬 집합에서 파생.
- 앱 → DB: `{ title, content }`만 왕복. `favorite`·`createdAt`은 DB로 보내지 않는다.

### 3.2 스토어 상태 전이

```text
[비로그인]  posts = []  (조회·등록·삭제 불가 — FR-001/003)
    │ 로그인(INITIAL_SESSION/SIGNED_IN)
    ▼
[로딩]      page 테이블 select (created_at desc) → postsLoaded
    ▼
[로그인]    posts = 계정 소유 글 전체
    │ createPost(title)  : insert → 응답 row를 목록 최상단 삽입 → 상세 이동 (실패: 이동 없음+안내)
    │ updatePost(id, …)  : 로컬 즉시 반영 → 디바운스 update (실패: 재조회+안내)
    │ deletePost(id)     : 로컬 즉시 제거 → delete (실패: 재조회+안내)
    │ toggleFavorite(id) : 로컬 집합 토글 (서버 왕복 없음)
    │ 로그아웃(SIGNED_OUT)
    ▼
[비로그인]  posts = [], 진행 중 디바운스 저장 취소
```

- 신규 계정 첫 로드는 빈 목록(FR-009 — 시딩 없음).
- 실패 후 재조회는 서버를 진실의 원천으로 삼아 FR-008(화면·저장 상태 불일치 금지)을 보장.

## 4. 검증 규칙 요약

| 규칙 | 출처 |
|------|------|
| 등록은 로그인 상태에서만 가능. 비로그인 등록 시도는 차단+안내 | FR-001 |
| 조회·수정·삭제는 소유자 본인 글만 — RLS가 강제, 클라이언트 쿼리는 보조 | FR-003/004/005/006 |
| 제목·본문 빈 값 허용. 제목은 등록 시 트림 | Edge case, 현행 UX |
| 삭제·타인 글 접근 → 상세에서 "찾을 수 없음" 상태 | US2-2, Edge case |
| 실패한 쓰기는 안내 표시 + 서버 재동기화 | FR-008 |
