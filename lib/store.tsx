"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import type { AuthError, User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

export type Post = {
  id: string;
  title: string;
  content: string;
  favorite: boolean;
  createdAt: number;
};

const KEY = "mini-notion-v1";
const OWNER_NAME = "김민수";

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

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

function seed(): Post[] {
  const now = Date.now();
  const H = 3600e3;
  const D = 24 * H;
  return [
    {
      id: uid(),
      title: "이번 주 할 일 정리",
      content:
        "- 디자인 시안 마무리\n- 개발 일정 공유\n- 회의록 정리해서 팀에 전달\n- 다음 스프린트 백로그 다듬기",
      favorite: true,
      createdAt: now - 2 * D,
    },
    {
      id: uid(),
      title: "회의 준비 메모",
      content:
        "다음 주 킥오프 미팅 안건\n\n1. 이번 분기 목표 정렬\n2. 역할과 담당 분담\n3. 마일스톤과 일정 확정",
      favorite: false,
      createdAt: now - 1 * D,
    },
    {
      id: uid(),
      title: "아이디어 노트",
      content:
        "개인 생산성 도구에 추가하면 좋을 기능들을 떠오를 때마다 적어두는 공간. 태그, 검색, 할 일 체크박스 등.",
      favorite: false,
      createdAt: now - 4 * H,
    },
    {
      id: uid(),
      title: "읽을거리 모음",
      content: "",
      favorite: false,
      createdAt: now - 40 * 60e3,
    },
  ];
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
  posts: Post[];
  nickname: string | null;
  avatar: string | null;
  account: Account | null;
};

type AppStore = {
  loaded: boolean;
  loggedIn: boolean;
  posts: Post[];
  nickname: string | null;
  avatar: string | null;
  displayName: string;
  email: string;
  login(): Promise<AuthError | null>;
  logout(): void;
  createPost(title: string): Post;
  updatePost(id: string, patch: Partial<Pick<Post, "title" | "content">>): void;
  toggleFavorite(id: string): void;
  deletePost(id: string): void;
  saveNickname(nick: string): Promise<boolean>;
  setAvatar(dataUrl: string): void;
};

const AppContext = createContext<AppStore | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AppState>({
    dataLoaded: false,
    authLoaded: false,
    posts: [],
    nickname: null,
    avatar: null,
    account: null,
  });

  // Load once from localStorage; seed sample posts on first visit.
  useEffect(() => {
    let posts: Post[] = [];
    let nickname: string | null = null;
    let avatar: string | null = null;
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const d = JSON.parse(raw);
        posts = Array.isArray(d.posts) ? d.posts : [];
        nickname = d.nickname || null;
        avatar = d.avatar || null;
      } else {
        posts = seed();
      }
    } catch {
      posts = seed();
    }
    setState((s) => ({ ...s, dataLoaded: true, posts, nickname, avatar }));
  }, []);

  // Pull the 1:1 profile row and use its name as the nickname. The DB trigger
  // (on_auth_user_created) creates the row on first login; the insert here only
  // covers accounts that signed up before the trigger existed.
  const syncProfile = useCallback(async (user: User) => {
    let { data } = await supabase
      .from("profile")
      .select("name")
      .eq("user_id", user.id)
      .maybeSingle();
    if (!data) {
      const { data: created } = await supabase
        .from("profile")
        .insert({ user_id: user.id, name: toAccount(user).name })
        .select("name")
        .maybeSingle();
      data = created;
    }
    if (data) {
      const name = data.name ?? null;
      setState((s) => ({ ...s, nickname: name }));
    }
  }, []);

  // Mirror the Supabase session (INITIAL_SESSION covers the first load,
  // including the OAuth code exchange when returning from Google).
  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      const user = session?.user ?? null;
      setState((s) => ({
        ...s,
        authLoaded: true,
        account: user ? toAccount(user) : null,
      }));
      // Supabase calls inside this callback can deadlock the auth lock,
      // so defer the profile fetch to the next tick.
      if (user && (event === "INITIAL_SESSION" || event === "SIGNED_IN")) {
        setTimeout(() => void syncProfile(user), 0);
      }
    });
    return () => subscription.unsubscribe();
  }, [syncProfile]);

  // Persist on every change after initial load.
  useEffect(() => {
    if (!state.dataLoaded) return;
    try {
      localStorage.setItem(
        KEY,
        JSON.stringify({
          posts: state.posts,
          nickname: state.nickname,
          avatar: state.avatar,
        })
      );
    } catch {}
  }, [state]);

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

  const createPost = useCallback((title: string): Post => {
    const post: Post = {
      id: uid(),
      title: (title || "").trim(),
      content: "",
      favorite: false,
      createdAt: Date.now(),
    };
    setState((s) => ({ ...s, posts: [post, ...s.posts] }));
    return post;
  }, []);

  const updatePost = useCallback(
    (id: string, patch: Partial<Pick<Post, "title" | "content">>) => {
      setState((s) => ({
        ...s,
        posts: s.posts.map((p) => (p.id === id ? { ...p, ...patch } : p)),
      }));
    },
    []
  );

  const toggleFavorite = useCallback((id: string) => {
    setState((s) => ({
      ...s,
      posts: s.posts.map((p) =>
        p.id === id ? { ...p, favorite: !p.favorite } : p
      ),
    }));
  }, []);

  const deletePost = useCallback((id: string) => {
    setState((s) => ({ ...s, posts: s.posts.filter((p) => p.id !== id) }));
  }, []);

  // Update local state immediately, then persist to the profile table.
  // Resolves false when the Supabase update fails.
  const userId = state.account?.id;
  const saveNickname = useCallback(
    async (nick: string) => {
      const name = (nick || "").trim() || null;
      setState((s) => ({ ...s, nickname: name }));
      if (!userId) return true;
      const { error } = await supabase
        .from("profile")
        .update({ name })
        .eq("user_id", userId);
      return !error;
    },
    [userId]
  );

  const setAvatar = useCallback((dataUrl: string) => {
    setState((s) => ({ ...s, avatar: dataUrl }));
  }, []);

  const store: AppStore = {
    loaded: state.dataLoaded && state.authLoaded,
    loggedIn: !!state.account,
    posts: state.posts,
    nickname: state.nickname,
    avatar: state.avatar ?? state.account?.avatarUrl ?? null,
    displayName: state.nickname || state.account?.name || OWNER_NAME,
    email: state.account?.email ?? "",
    login,
    logout,
    createPost,
    updatePost,
    toggleFavorite,
    deletePost,
    saveNickname,
    setAvatar,
  };

  return <AppContext.Provider value={store}>{children}</AppContext.Provider>;
}

export function useApp(): AppStore {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within <AppProvider>");
  return ctx;
}
