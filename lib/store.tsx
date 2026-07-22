"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import type { AuthError, User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import { readLocalJson, writeLocalJson } from "@/lib/local-pref";

export type Post = {
  id: string;
  title: string;
  content: string;
  favorite: boolean;
  createdAt: number;
};

const KEY = "mini-notion-v1";
// 제목·본문 자동 저장 디바운스 (research.md R5 — last-write-wins).
const SAVE_DEBOUNCE_MS = 600;
const OWNER_NAME = "김민수";
const PROFILE_IMAGE_BUCKET = "profile-image";

// Download URL = env base(스토리지 주소~버킷명) + "/" + image_path(버킷명 이후).
function profileImageUrl(path: string | null): string | null {
  const base = process.env.NEXT_PUBLIC_PROFILE_IMAGE_BASE_URL;
  if (!path || !base) return null;
  return `${base.replace(/\/+$/, "")}/${path}`;
}

// Profile fields surfaced from the signed-in Google account.
type Account = {
  id: string;
  email: string;
  name: string | null;
  avatarUrl: string | null;
};

function toAccount(user: User): Account {
  const meta = user.user_metadata ?? {};
  return {
    id: user.id,
    email: user.email ?? "",
    name: meta.full_name ?? meta.name ?? null,
    avatarUrl: meta.avatar_url ?? meta.picture ?? null,
  };
}

// public.page 실측 row 형상 (specs/003-supabase-page-posts/data-model.md §1.1).
type PageRow = {
  id: string;
  created_at: string;
  title: string | null;
  content: string | null;
  user_id: string;
};

function rowToPost(row: PageRow, favorites: Set<string>): Post {
  return {
    id: row.id,
    title: row.title ?? "",
    content: row.content ?? "",
    favorite: favorites.has(row.id),
    createdAt: Date.parse(row.created_at),
  };
}

// 즐겨찾기 표시는 기기(브라우저)별 보관이며 계정 키로 격리된다 (FR-010).
const FAV_PREFIX = "mini-notion-fav:";

function readFavorites(userId: string): Set<string> {
  const ids = readLocalJson<unknown>(FAV_PREFIX + userId);
  return new Set(Array.isArray(ids) ? (ids as string[]) : []);
}

function writeFavorites(userId: string, favorites: Set<string>) {
  writeLocalJson(FAV_PREFIX + userId, [...favorites]);
}

export function formatDate(ts: number): string {
  const d = new Date(ts);
  const now = new Date();
  const days = Math.floor(
    (new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime() -
      new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()) /
      864e5
  );
  if (days === 0) return "오늘";
  if (days === 1) return "어제";
  return `${d.getMonth() + 1}월 ${d.getDate()}일`;
}

type AppState = {
  dataLoaded: boolean;
  authLoaded: boolean;
  postsLoaded: boolean;
  posts: Post[];
  postsError: string | null;
  nickname: string | null;
  introduction: string | null;
  imagePath: string | null;
  account: Account | null;
};

type AppStore = {
  loaded: boolean;
  postsLoaded: boolean;
  loggedIn: boolean;
  posts: Post[];
  postsError: string | null;
  nickname: string | null;
  introduction: string | null;
  avatar: string | null;
  displayName: string;
  email: string;
  login(): Promise<AuthError | null>;
  logout(): void;
  createPost(title: string): Promise<Post | null>;
  updatePost(id: string, patch: Partial<Pick<Post, "title" | "content">>): void;
  toggleFavorite(id: string): void;
  deletePost(id: string): void;
  saveProfile(fields: { name: string; introduction: string }): Promise<boolean>;
  saveAvatar(file: File): Promise<boolean>;
};

const AppContext = createContext<AppStore | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AppState>({
    dataLoaded: false,
    authLoaded: false,
    postsLoaded: false,
    posts: [],
    postsError: null,
    nickname: null,
    introduction: null,
    imagePath: null,
    account: null,
  });

  // 계정 소유 글 전체를 page 테이블에서 가져온다 (RLS가 소유자 격리를 강제).
  // 실패하면 null — 호출부가 기존 화면 상태를 유지한다.
  const fetchPosts = useCallback(async (ownerId: string) => {
    const { data, error } = await supabase
      .from("page")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) return null;
    const favorites = readFavorites(ownerId);
    return ((data ?? []) as PageRow[]).map((row) => rowToPost(row, favorites));
  }, []);

  const loadPosts = useCallback(
    async (ownerId: string) => {
      const posts = await fetchPosts(ownerId);
      setState((s) => ({ ...s, postsLoaded: true, ...(posts ? { posts } : {}) }));
    },
    [fetchPosts]
  );

  // 쓰기 실패 시: 실패 안내를 띄우고 서버를 진실의 원천으로 재동기화한다 (FR-008).
  const resyncAfterError = useCallback(
    async (ownerId: string, message: string) => {
      setState((s) => ({ ...s, postsError: message }));
      await loadPosts(ownerId);
    },
    [loadPosts]
  );

  // Load the local profile fallback (nickname/imagePath) once. Posts live in
  // the page table only (FR-002) — no localStorage posts, no sample seeding.
  useEffect(() => {
    const d = readLocalJson<{
      nickname?: string | null;
      introduction?: string | null;
      imagePath?: string | null;
    }>(KEY);
    setState((s) => ({
      ...s,
      dataLoaded: true,
      nickname: d?.nickname || null,
      introduction: d?.introduction || null,
      imagePath: d?.imagePath || null,
    }));
  }, []);

  // Pull the 1:1 profile row and use its name as the nickname. The DB trigger
  // (on_auth_user_created) creates the row on first login; the insert here only
  // covers accounts that signed up before the trigger existed.
  const syncProfile = useCallback(async (user: User) => {
    let { data } = await supabase
      .from("profile")
      .select("name, image_path, introduction")
      .eq("user_id", user.id)
      .maybeSingle();
    if (!data) {
      const { data: created } = await supabase
        .from("profile")
        .insert({ user_id: user.id, name: toAccount(user).name })
        .select("name, image_path, introduction")
        .maybeSingle();
      data = created;
    }
    if (data) {
      const name = data.name ?? null;
      const imagePath = data.image_path ?? null;
      const introduction = data.introduction ?? null;
      setState((s) => ({ ...s, nickname: name, imagePath, introduction }));
    }
  }, []);

  // Mirror the Supabase session (INITIAL_SESSION covers the first load,
  // including the OAuth code exchange when returning from Google).
  const loadedUserRef = useRef<string | null>(null);
  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      const user = session?.user ?? null;
      if (!user) {
        // 로그아웃 — 대기 중인 자동 저장은 더 이상 이 계정의 것이 아니므로 취소.
        saveTimerRef.current.forEach((timer) => clearTimeout(timer));
        saveTimerRef.current.clear();
        pendingPatchRef.current.clear();
        loadedUserRef.current = null;
      }
      setState((s) => ({
        ...s,
        authLoaded: true,
        account: user ? toAccount(user) : null,
        // 비로그인 상태에서는 어떤 글도 남기지 않는다 (FR-003).
        ...(user ? {} : { postsLoaded: true, posts: [] }),
      }));
      // Supabase calls inside this callback can deadlock the auth lock,
      // so defer the profile fetch to the next tick. supabase-js는 탭 포커스
      // 복귀 등에서 같은 세션으로 SIGNED_IN을 재발화하므로, 같은 사용자면
      // 전체 재조회를 건너뛴다.
      if (
        user &&
        (event === "INITIAL_SESSION" || event === "SIGNED_IN") &&
        loadedUserRef.current !== user.id
      ) {
        loadedUserRef.current = user.id;
        setTimeout(() => {
          void syncProfile(user);
          void loadPosts(user.id);
        }, 0);
      }
    });
    return () => subscription.unsubscribe();
  }, [syncProfile, loadPosts]);

  // Persist the local profile fallback on change (posts are never stored here).
  useEffect(() => {
    if (!state.dataLoaded) return;
    writeLocalJson(KEY, {
      nickname: state.nickname,
      introduction: state.introduction,
      imagePath: state.imagePath,
    });
  }, [state.dataLoaded, state.nickname, state.introduction, state.imagePath]);

  const userId = state.account?.id;

  const login = useCallback(async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: window.location.origin + "/" },
    });
    return error;
  }, []);
  const logout = useCallback(() => {
    void supabase.auth.signOut();
  }, []);

  // 글별 대기 patch·타이머 — 입력은 즉시 화면에, 저장은 디바운스로.
  const pendingPatchRef = useRef(
    new Map<string, Partial<Pick<Post, "title" | "content">>>()
  );
  const saveTimerRef = useRef(
    new Map<string, ReturnType<typeof setTimeout>>()
  );

  const updatePost = useCallback(
    (id: string, patch: Partial<Pick<Post, "title" | "content">>) => {
      setState((s) => ({
        ...s,
        posts: s.posts.map((p) => (p.id === id ? { ...p, ...patch } : p)),
      }));
      if (!userId) return;
      pendingPatchRef.current.set(id, {
        ...pendingPatchRef.current.get(id),
        ...patch,
      });
      const timer = saveTimerRef.current.get(id);
      if (timer) clearTimeout(timer);
      saveTimerRef.current.set(
        id,
        setTimeout(() => {
          saveTimerRef.current.delete(id);
          const pending = pendingPatchRef.current.get(id);
          pendingPatchRef.current.delete(id);
          if (!pending) return;
          void (async () => {
            const { error } = await supabase
              .from("page")
              .update(pending)
              .eq("id", id);
            if (error) {
              void resyncAfterError(
                userId,
                "변경 내용을 저장하지 못했어요. 네트워크를 확인해 주세요."
              );
            }
          })();
        }, SAVE_DEBOUNCE_MS)
      );
    },
    [userId, resyncAfterError]
  );

  const toggleFavorite = useCallback(
    (id: string) => {
      if (!userId) return;
      const favorites = readFavorites(userId);
      if (favorites.has(id)) favorites.delete(id);
      else favorites.add(id);
      writeFavorites(userId, favorites);
      setState((s) => ({
        ...s,
        posts: s.posts.map((p) =>
          p.id === id ? { ...p, favorite: favorites.has(id) } : p
        ),
      }));
    },
    [userId]
  );

  // 낙관적으로 목록에서 제거하고 실패하면 재동기화한다. 타인 글은 RLS가
  // 0 rows로 무시하므로 소유자 검증은 서버가 담당한다 (US3-2).
  const deletePost = useCallback(
    (id: string) => {
      if (!userId) return;
      setState((s) => ({ ...s, posts: s.posts.filter((p) => p.id !== id) }));
      void (async () => {
        const { error } = await supabase.from("page").delete().eq("id", id);
        if (error) {
          void resyncAfterError(
            userId,
            "글을 삭제하지 못했어요. 잠시 후 다시 시도해 주세요."
          );
        }
      })();
    },
    [userId, resyncAfterError]
  );

  // 로그인 사용자만 등록 가능(FR-001). id·created_at은 서버 기본값이 발급하므로
  // insert 응답 row를 받아 목록에 반영한다.
  const createPost = useCallback(
    async (title: string): Promise<Post | null> => {
      if (!userId) {
        setState((s) => ({
          ...s,
          postsError: "로그인 후 글을 만들 수 있어요.",
        }));
        return null;
      }
      const { data, error } = await supabase
        .from("page")
        .insert({ title: (title || "").trim(), content: "", user_id: userId })
        .select()
        .single();
      if (error || !data) {
        setState((s) => ({
          ...s,
          postsError: "글을 등록하지 못했어요. 잠시 후 다시 시도해 주세요.",
        }));
        return null;
      }
      const post = rowToPost(data as PageRow, readFavorites(userId));
      setState((s) => ({ ...s, posts: [post, ...s.posts], postsError: null }));
      return post;
    },
    [userId]
  );
  // Update local state immediately, then persist nickname + introduction to
  // the profile table in a single update so both always save together.
  // Resolves false when the Supabase update fails.
  const saveProfile = useCallback(
    async (fields: { name: string; introduction: string }) => {
      const name = (fields.name || "").trim() || null;
      // Whitespace-only means "cleared"; real content is stored verbatim so
      // line breaks and inner spacing survive round-trips.
      const introduction =
        fields.introduction.trim() === "" ? null : fields.introduction;
      setState((s) => ({ ...s, nickname: name, introduction }));
      if (!userId) return true;
      const { error } = await supabase
        .from("profile")
        .update({ name, introduction })
        .eq("user_id", userId);
      return !error;
    },
    [userId]
  );

  // Upload the picked file to the profile-image bucket under a fresh UUID v4
  // name, persist the bucket-relative path in profile.image_path, then
  // best-effort remove the previous file. Resolves false on any failure.
  const imagePath = state.imagePath;
  const saveAvatar = useCallback(
    async (file: File) => {
      if (!userId) return false;
      const ext = (file.name.match(/\.(\w+)$/)?.[1] ?? "png").toLowerCase();
      const path = `${crypto.randomUUID()}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from(PROFILE_IMAGE_BUCKET)
        .upload(path, file, { contentType: file.type || undefined });
      if (uploadError) return false;
      const { error } = await supabase
        .from("profile")
        .update({ image_path: path })
        .eq("user_id", userId);
      if (error) {
        void supabase.storage.from(PROFILE_IMAGE_BUCKET).remove([path]);
        return false;
      }
      setState((s) => ({ ...s, imagePath: path }));
      if (imagePath) {
        void supabase.storage.from(PROFILE_IMAGE_BUCKET).remove([imagePath]);
      }
      return true;
    },
    [userId, imagePath]
  );

  const store: AppStore = {
    // 셸은 인증·로컬 폴백만 기다린다 — 글 목록 로딩은 postsLoaded로 따로
    // 노출해 글이 실제로 필요한 화면(목록 빈 상태, 상세 not-found)만 기다린다.
    loaded: state.dataLoaded && state.authLoaded,
    postsLoaded: state.postsLoaded,
    loggedIn: !!state.account,
    posts: state.posts,
    postsError: state.postsError,
    nickname: state.nickname,
    introduction: state.introduction,
    avatar: profileImageUrl(state.imagePath) ?? state.account?.avatarUrl ?? null,
    displayName: state.nickname || state.account?.name || OWNER_NAME,
    email: state.account?.email ?? "",
    login,
    logout,
    createPost,
    updatePost,
    toggleFavorite,
    deletePost,
    saveProfile,
    saveAvatar,
  };

  return <AppContext.Provider value={store}>{children}</AppContext.Provider>;
}

export function useApp(): AppStore {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within <AppProvider>");
  return ctx;
}
