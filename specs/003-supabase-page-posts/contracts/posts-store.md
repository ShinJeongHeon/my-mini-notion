# 계약: 게시글 스토어 (`lib/store.tsx` — `useApp()`)

화면(목록·상세·셸)이 의존하는 공개 동작 계약. 시그니처 변경은 아래 명시된 것만 허용된다.
데이터 형상은 [data-model.md](../data-model.md) §3.1 `Post` 참조.

## 상태

| 필드 | 타입 | 계약 |
|------|------|------|
| `loaded` | boolean | 인증 확인 **및** (로그인 시) 게시글 첫 로드가 끝나면 true. 화면 가드·리다이렉트 판단 기준 |
| `loggedIn` | boolean | Supabase 세션 존재 여부 (기존과 동일) |
| `posts` | Post[] | 로그인 계정 소유 글 전체, `createdAt` 내림차순. 비로그인이면 항상 `[]` |
| `postsError` | string \| null | **[신규]** 직전 저장·조회 실패 안내 문구. 성공한 다음 연산에서 null로 복원 |

## 연산

### `createPost(title: string): Promise<Post | null>`  **[시그니처 변경: 동기 → 비동기]**

- 로그인 상태에서만 동작. 비로그인 호출은 서버 요청 없이 `null` 반환 + 로그인 안내(FR-001).
- `page`에 `{ title: 트림된 제목, content: "", user_id: 세션 uid }` insert, 응답 row(`id`·`created_at` 포함)를 `Post`로 매핑해 목록 최상단에 삽입 후 반환.
- 실패 시 `null` 반환, `postsError` 설정, 목록 불변. **호출부는 null이면 상세로 이동하지 않는다.**
- 호출부 변경: `app/(app)/page.tsx`의 `createPage`, `components/AppShell.tsx`의 `newPage` — `await` 후 null 검사.

### `updatePost(id, patch: { title?, content? }): void`  **[시그니처 유지]**

- 로컬 상태 즉시 반영(입력 반응성 유지), 디바운스(≈600ms) 후 해당 글 1건 update 전송.
- 실패 시: 서버 재조회로 화면을 실제 상태에 재동기화 + `postsError` 설정(FR-008).
- 소유자 검증은 RLS가 수행 — 타인 글 update는 0 rows로 무시되고 원본 유지(US4-2).

### `deletePost(id): void`  **[시그니처 유지]**

- 로컬에서 즉시 제거 후 delete 전송. 실패 시 재조회로 복원 + `postsError` 설정.
- 타인 글 delete는 RLS에 의해 0 rows — 재조회 시 글이 그대로 남는다(US3-2).

### `toggleFavorite(id): void`  **[시그니처 유지]**

- 서버 왕복 없음. `mini-notion-fav:<userId>` 로컬 집합 토글(FR-010).

### 조회 (명시적 연산 없음 — 세션 이벤트에 연동)

- `SIGNED_IN`/`INITIAL_SESSION`(user 존재): `page` select — `order by created_at desc`. RLS가 소유자 격리(FR-003). 실패 시 `postsError` 설정 + 빈 목록 유지.
- `SIGNED_OUT`: `posts = []`, 대기 중 디바운스 저장 취소.
- 시딩 없음 — 신규 계정은 빈 목록(FR-009).

## 화면 계약 (동작 결과)

| 화면 | 계약 |
|------|------|
| 목록 (`app/(app)/page.tsx`) | `posts.length === 0`이면 기존 `.empty-state` 유지. `postsError` 존재 시 안내 표시(DESIGN.md 토큰·패턴 준수) |
| 상세 (`app/(app)/posts/[id]/page.tsx`) | `loaded && !post`면 "찾을 수 없음" `.empty-state` + 목록 이동 버튼 (침묵 리다이렉트 금지, US2-2) |
| 셸 (`components/AppShell.tsx`) | 비로그인 → `/login` 리다이렉트(기존 유지, FR-003의 화면 측 보조) |

## 오류 의미론

- 모든 쓰기 실패의 사용자 가시 결과는 동일: `postsError` 안내 + 화면·서버 상태 일치(FR-008, SC-004의 2초 내 안내 포함).
- 오류 문구는 DESIGN.md 문구 톤을 따르고, 새 문구가 필요하면 DESIGN.md에 함께 기록한다(Principle III).
