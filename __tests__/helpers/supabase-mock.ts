// @/lib/supabase 모듈 대체 목. 테스트 파일에서:
//   vi.mock("@/lib/supabase", () => import("./helpers/supabase-mock"));
// 로 사용한다. page row는 실측 테이블 형상 전체를 반영한다
// (specs/003-supabase-page-posts/data-model.md §1.1).
import { vi } from "vitest";
import type { Post } from "@/lib/store";

export type PageRow = {
  id: string;
  created_at: string;
  title: string | null;
  content: string | null;
  user_id: string;
};

export type ProfileRow = {
  name: string | null;
  image_path: string | null;
  introduction: string | null;
};

type AuthCallback = (event: string, session: unknown) => void;
type SupaError = { message: string } | null;

export const state = {
  session: null as null | { user: unknown },
  authCallback: null as null | AuthCallback,
  pageRows: [] as PageRow[],
  selectError: null as SupaError,
  insertError: null as SupaError,
  updateError: null as SupaError,
  deleteError: null as SupaError,
  profileRow: null as null | ProfileRow,
  profileUpdateError: null as SupaError,
  // upsert 경합 시뮬레이션 — 세팅하면 upsert 시점에 "다른 탭이 먼저 만든 행"이
  // 존재하는 상황이 되어 DO NOTHING(반환 행 없음)으로 응답한다.
  profileUpsertConflictRow: null as null | ProfileRow,
  storageUploadError: null as SupaError,
  insertSeq: 0,
  // 타이밍 제어용 게이트 — 세팅하면 해당 요청이 이 promise를 기다린다.
  // 레이스(생성 vs 초기 조회, 로그아웃 중 in-flight 저장) 테스트에 사용.
  selectGate: null as null | Promise<void>,
  insertGate: null as null | Promise<void>,
  updateGate: null as null | Promise<void>,
};

export const spies = {
  pageSelectOrder: vi.fn(),
  pageInsert: vi.fn(),
  pageUpdate: vi.fn(),
  pageDelete: vi.fn(),
  profileSelect: vi.fn(),
  profileUpsert: vi.fn(),
  profileUpdate: vi.fn(),
  storageUpload: vi.fn(),
  storageRemove: vi.fn(),
  signInWithOAuth: vi.fn(),
  signOut: vi.fn(),
};

export function resetSupabaseMock() {
  state.session = null;
  state.authCallback = null;
  state.pageRows = [];
  state.selectError = null;
  state.insertError = null;
  state.updateError = null;
  state.deleteError = null;
  state.profileRow = { name: null, image_path: null, introduction: null };
  state.profileUpdateError = null;
  state.profileUpsertConflictRow = null;
  state.storageUploadError = null;
  state.insertSeq = 0;
  state.selectGate = null;
  state.insertGate = null;
  state.updateGate = null;
  for (const spy of Object.values(spies)) spy.mockClear();
  spies.signInWithOAuth.mockResolvedValue({ data: {}, error: null });
  spies.signOut.mockResolvedValue({ error: null });
}

export const googleSession = {
  user: {
    id: "user-1",
    email: "minsu.kim@gmail.com",
    user_metadata: {
      full_name: "김민수",
      avatar_url: "https://lh3.googleusercontent.com/a/photo",
    },
  },
};

export function makePageRow(overrides: Partial<PageRow> & { id: string }): PageRow {
  return {
    created_at: "2026-07-20T09:00:00.000Z",
    title: "제목",
    content: "",
    user_id: "user-1",
    ...overrides,
  };
}

export function makePost(overrides: Partial<Post> & { id: string }): Post {
  return {
    title: "제목",
    content: "",
    favorite: false,
    createdAt: Date.now(),
    ...overrides,
  };
}

// 게시글은 page 테이블에서 온다 — 로그인 세션과 서버 rows로 시딩한다.
export function seedPosts(posts: Post[]) {
  state.session = googleSession;
  state.pageRows = posts.map((p) =>
    makePageRow({
      id: p.id,
      title: p.title || null,
      content: p.content || null,
      created_at: new Date(p.createdAt).toISOString(),
    })
  );
}

function profileTable() {
  return {
    select: () => ({
      eq: (_col: string, _id: string) => ({
        maybeSingle: async () => {
          spies.profileSelect(_id);
          return { data: state.profileRow, error: null };
        },
      }),
    }),
    // ON CONFLICT DO NOTHING(ignoreDuplicates) 의미론: 이미 행이 있으면
    // 아무것도 만들지 않고 반환 행도 없다 — 호출부가 재조회로 승자 행을 읽는다.
    upsert: (
      row: { user_id: string; name: string | null },
      _opts?: { onConflict?: string; ignoreDuplicates?: boolean }
    ) => ({
      select: () => ({
        maybeSingle: async () => {
          spies.profileUpsert(row);
          if (state.profileUpsertConflictRow) {
            state.profileRow = state.profileUpsertConflictRow;
            return { data: null, error: null };
          }
          if (state.profileRow) return { data: null, error: null };
          state.profileRow = {
            name: row.name ?? null,
            image_path: null,
            introduction: null,
          };
          return { data: state.profileRow, error: null };
        },
      }),
    }),
    update: (patch: Partial<ProfileRow>) => ({
      eq: async (_col: string, id: string) => {
        spies.profileUpdate(patch, id);
        if (state.profileUpdateError) return { error: state.profileUpdateError };
        // 부분 patch 병합 — 지정되지 않은 컬럼(image_path 등)은 보존한다.
        state.profileRow = {
          name: null,
          image_path: null,
          introduction: null,
          ...state.profileRow,
          ...patch,
        };
        return { error: null };
      },
    }),
  };
}

function pageTable() {
  return {
    select: (_cols?: string) => ({
      order: async (col: string, opts: { ascending: boolean }) => {
        spies.pageSelectOrder(col, opts);
        // 실제 DB처럼 요청 시점 스냅샷을 응답한다 — 게이트로 응답을 늦추면
        // "스냅샷 이후의 변경을 모르는 낡은 응답"이 재현된다.
        const err = state.selectError;
        const snapshot = err ? null : [...state.pageRows];
        if (state.selectGate) await state.selectGate;
        if (err) return { data: null, error: err };
        return { data: snapshot, error: null };
      },
    }),
    insert: (row: { title: string; content: string; user_id: string }) => ({
      select: () => ({
        single: async () => {
          spies.pageInsert(row);
          if (state.insertGate) await state.insertGate;
          if (state.insertError) return { data: null, error: state.insertError };
          state.insertSeq += 1;
          const created: PageRow = {
            id: `00000000-0000-4000-8000-00000000000${state.insertSeq}`,
            created_at: "2026-07-22T03:00:00.000Z",
            title: row.title,
            content: row.content,
            user_id: row.user_id,
          };
          state.pageRows = [created, ...state.pageRows];
          return { data: created, error: null };
        },
      }),
    }),
    // 실제 PostgREST처럼: error 없이도 매칭 0행일 수 있고(삭제·RLS),
    // 성공한 patch는 rows에 병합되어 이후 조회와 일치한다.
    update: (patch: { title?: string; content?: string }) => ({
      eq: (_col: string, id: string) => {
        const run = async () => {
          spies.pageUpdate(patch, id);
          if (state.updateGate) await state.updateGate;
          if (state.updateError) return { data: null, error: state.updateError };
          const matched = state.pageRows.filter((r) => r.id === id);
          state.pageRows = state.pageRows.map((r) =>
            r.id === id ? { ...r, ...patch } : r
          );
          return { data: matched.map((r) => ({ ...r, ...patch })), error: null };
        };
        const promise = run();
        // 구식 체인(await …eq())과 신식(…eq().select()) 둘 다 지원.
        return Object.assign(promise, { select: () => promise });
      },
    }),
    delete: () => ({
      eq: async (_col: string, id: string) => {
        spies.pageDelete(id);
        if (!state.deleteError) {
          state.pageRows = state.pageRows.filter((r) => r.id !== id);
        }
        return { error: state.deleteError };
      },
    }),
  };
}

export const supabase = {
  auth: {
    onAuthStateChange(cb: AuthCallback) {
      state.authCallback = cb;
      cb("INITIAL_SESSION", state.session);
      return { data: { subscription: { unsubscribe: vi.fn() } } };
    },
    signInWithOAuth: spies.signInWithOAuth,
    signOut: spies.signOut,
  },
  from(table: string) {
    if (table === "profile") return profileTable();
    if (table === "page") return pageTable();
    throw new Error(`unexpected table: ${table}`);
  },
  // 프로필 이미지 업로드(saveAvatar) 경로 — 실제 클라이언트 표면과 동일 형상.
  storage: {
    from: (bucket: string) => ({
      upload: async (path: string, file: unknown, _opts?: unknown) => {
        spies.storageUpload(bucket, path, file);
        if (state.storageUploadError) {
          return { data: null, error: state.storageUploadError };
        }
        return { data: { path }, error: null };
      },
      remove: async (paths: string[]) => {
        spies.storageRemove(bucket, paths);
        return { data: [], error: null };
      },
    }),
  },
};
