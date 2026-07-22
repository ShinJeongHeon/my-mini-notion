# Quickstart: 계정 기반 페이지 게시글 저장 — 검증 가이드

기능이 끝났다고 선언하기 전에 아래를 순서대로 통과해야 한다
(헌장 "완료 게이트" + spec의 SC-001~005).

## 0. 전제

- `.env.local`에 `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` 설정(기존 그대로).
- Google 계정 2개 준비 (A·B) — 소유자 격리 검증에 필요.
- RLS 정책 적용 여부 확인 (contracts/page-rls.sql 적용 후):

  ```sql
  select policyname, cmd from pg_policies
  where schemaname = 'public' and tablename = 'page' order by policyname;
  -- 기대: Users can delete/insert/update/view own pages — 4행
  ```

## 1. 유닛 테스트 (자동)

```bash
npm test
```

- 기대: 전체 통과, 에러·경고 없는 출력(기존 22개 + 신규 page-posts 테스트).
- 신규 테스트가 커버: 목록 로드·정렬, 비로그인 차단, insert 페이로드(user_id 포함),
  실패 시 재조회+안내, 시딩 부재, 계정별 즐겨찾기 키. ([contracts/posts-store.md](./contracts/posts-store.md))

## 2. 수동 시나리오 (실제 브라우저 — `/verify` 스킬 사용 가능)

```bash
npm run dev   # http://localhost:3000
```

### S1. 등록·영속 (US1, SC-001)

1. 계정 A로 로그인 → 목록이 **비어 있는지** 확인(시딩 없음, FR-009. 단 A가 이전에 만든 글이 있으면 그 글만 보임).
2. `/page 첫 글` 입력 후 Enter → 상세로 이동, 본문 입력 → "자동 저장됨" 확인.
3. 새로고침 → 글이 그대로. 시크릿 창에서 A로 재로그인 → 같은 글이 보이면 통과.

### S2. 소유자 격리 (US2, SC-002)

1. A의 글 상세 URL(`/posts/<uuid>`)을 복사해 둔다.
2. 다른 브라우저(또는 시크릿)에서 계정 B 로그인 → 목록에 A의 글이 **없어야** 한다.
3. B 상태에서 A의 상세 URL 직접 접근 → 본문 노출 없이 "찾을 수 없음" 상태가 보이면 통과.
4. (선택, 저장소 계층 검증) B 세션의 개발자도구 콘솔에서 A 글 id로 select/update/delete를 시도
   → 모두 0 rows / 에러 없이 무효과여야 한다.

### S3. 비로그인 차단 (FR-001/003, SC-003)

1. 로그아웃 상태에서 `/` 접근 → `/login`으로 이동, 글이 전혀 보이지 않아야 한다.

### S4. 삭제 (US3)

1. A로 자신의 글 삭제 → 목록·사이드바에서 즉시 사라짐 → 새로고침 후에도 없음.
2. 삭제된 글의 상세 URL 재접근 → "찾을 수 없음" 상태.

### S5. 편집 유지 (US4, SC-005)

1. A의 글 제목·본문 수정 → 다른 브라우저에서 A 재로그인 → 수정 내용 일치.
2. 기존 흐름(목록 → 글 열기 → 편집 → 돌아오기)이 이전과 동일하게 동작(회귀 0건).

### S6. 실패 안내 (FR-008, SC-004)

1. 개발자도구 Network를 Offline으로 전환 후 본문 수정 → 2초 내 실패 안내 표시,
   Online 복귀 후 새로고침 시 화면과 서버 내용이 일치해야 한다.

### S7. 즐겨찾기 기기 보관 (FR-010)

1. A로 글 하나 별표 → 새로고침 후 유지(같은 브라우저).
2. 다른 브라우저에서 A 로그인 → 별표가 **없는 것이 정상**(기기별 보관).
3. 같은 브라우저에서 B로 전환 → B에게 A의 별표가 보이지 않아야 한다(계정별 키).

## 3. 완료 선언 전 최종 체크

- [ ] `npm test` 전체 통과, 출력 무결(에러·경고 없음)
- [ ] S1~S7 전부 통과
- [ ] TDD 완료 체크리스트(헌장 Principle I) 검증 — 모든 신규 동작에 선행 실패 테스트 존재
- [ ] DESIGN.md — 새 UI 결정(찾을 수 없음 상태·실패 안내 문구)이 문서에 반영되었는가
