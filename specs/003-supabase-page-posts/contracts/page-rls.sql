-- RLS 정책 계약: public.page — owner-only 접근 (FR-001/003/004/005/006)
-- 테이블 구조는 변경하지 않는다(FR-007). 정책만 추가한다.
-- 적용 방법: 구현 단계에서 Supabase MCP apply_migration으로 이 파일 내용을 실행.
-- 관례: 기존 public.profile 정책과 동일한 (select auth.uid()) 형태(initplan 캐싱).
-- 전제: page 테이블은 이미 rls_enabled = true (실측 2026-07-22, 정책 0개 상태).

create policy "Users can view own pages"
  on public.page for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users can insert own pages"
  on public.page for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Users can update own pages"
  on public.page for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Users can delete own pages"
  on public.page for delete
  to authenticated
  using ((select auth.uid()) = user_id);

-- 검증 쿼리(적용 후 quickstart.md에서 사용):
--   select policyname, cmd from pg_policies
--   where schemaname = 'public' and tablename = 'page' order by policyname;
-- 기대: 위 4개 정책. anon 롤 대상 정책 없음 → 비로그인 접근은 전부 거부(FR-003).
