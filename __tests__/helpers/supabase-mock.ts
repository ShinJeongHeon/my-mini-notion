// @/lib/supabase 모듈 대체 목. 테스트 파일에서:
//   vi.mock("@/lib/supabase", () => import("./helpers/supabase-mock"));
// 로 사용한다. page row는 실측 테이블 형상 전체를 반영한다
// (specs/003-supabase-page-posts/data-model.md §1.1).
import { vi } from "vitest";

export type PageRow = {
  id: string;
  created_at: string;
  title: string | null;
  content: string | null;
  user_id: string;
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
  profileRow: null as null | { name: string | null; image_path: string | null },
  insertSeq: 0,
};

export const spies = {
  pageSelectOrder: vi.fn(),
  pageInsert: vi.fn(),
  pageUpdate: vi.fn(),
  pageDelete: vi.fn(),
  profileSelect: vi.fn(),
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
  state.profileRow = { name: null, image_path: null };
  state.insertSeq = 0;
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
    insert: (row: { user_id: string; name: string | null }) => ({
      select: () => ({
        maybeSingle: async () => {
          state.profileRow = { name: row.name ?? null, image_path: null };
          return { data: state.profileRow, error: null };
        },
      }),
    }),
    update: (patch: { name: string | null }) => ({
      eq: async (_col: string, _id: string) => {
        state.profileRow = { name: patch.name, image_path: null };
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
        if (state.selectError) return { data: null, error: state.selectError };
        return { data: [...state.pageRows], error: null };
      },
    }),
    insert: (row: { title: string; content: string; user_id: string }) => ({
      select: () => ({
        single: async () => {
          spies.pageInsert(row);
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
    update: (patch: { title?: string; content?: string }) => ({
      eq: async (_col: string, id: string) => {
        spies.pageUpdate(patch, id);
        return { error: state.updateError };
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
};
