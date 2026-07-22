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
// 같은 사용자 SIGNED_IN 재발화(탭 포커스 복귀 등)의 재동기화 최소 간격.
const REFRESH_MIN_INTERVAL_MS = 60_000;
const POSTS_LOAD_ERROR = "글 목록을 불러오지 못했어요. 네트워크를 확인해 주세요.";
const POST_SAVE_ERROR = "변경 내용을 저장하지 못했어요. 네트워크를 확인해 주세요.";

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

// 프로필 폴백 캐시 — 소유 계정 id를 함께 저장해 계정 간 유출을 막는다.
type ProfileCache = {
  userId?: string | null;
  nickname?: string | null;
  introduction?: string | null;
  imagePath?: string | null;
};

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

  // 글별 대기 patch·타이머 — 입력은 즉시 화면에, 저장은 디바운스로.
  const pendingPatchRef = useRef(
    new Map<string, Partial<Pick<Post, "title" | "content">>>()
  );
  const saveTimerRef = useRef(new Map<string, ReturnType<typeof setTimeout>>());
  // 어느 계정의 목록을 이미 로드했는지 (재발화 가드 + 실패 시 재시도 재무장).
  const loadedUserRef = useRef<string | null>(null);
  // 세션 이벤트 기준의 현재 사용자 — 로그아웃 후 도착한 비동기 응답을 걸러낸다.
  const userIdRef = useRef<string | null>(null);
  // 목록 조회는 최신 요청만 반영한다 (늦게 도착한 옛 요청의 응답은 폐기).
  const fetchSeqRef = useRef(0);
  const lastLoadRef = useRef(0);
  // 조회 스냅샷 이후의 로컬 생성/삭제 — 낡은 응답이 새 글을 지우거나
  // 지운 글을 되살리지 않도록, 서버 응답이 확인해 줄 때까지 기억한다.
  const recentlyCreatedRef = useRef(new Map<string, Post>());
  const recentlyDeletedRef = useRef(new Set<string>());

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
      const seq = ++fetchSeqRef.current;
      const fetched = await fetchPosts(ownerId);
      if (seq !== fetchSeqRef.current) return; // 더 새 요청이 있음 — 그 결과만 반영
      if (!fetched) {
        // 실패를 "빈 계정"으로 위장하지 않는다 — postsLoaded는 켜지 않고
        // 오류만 알린 뒤, 다음 SIGNED_IN 재발화에서 처음부터 다시 시도한다.
        loadedUserRef.current = null;
        setState((s) => ({ ...s, postsError: POSTS_LOAD_ERROR }));
        return;
      }
      const fetchedIds = new Set(fetched.map((p) => p.id));
      // 서버가 확인해 준 생성/삭제는 기억에서 지운다.
      recentlyCreatedRef.current.forEach((_p, id) => {
        if (fetchedIds.has(id)) recentlyCreatedRef.current.delete(id);
      });
      recentlyDeletedRef.current.forEach((id) => {
        if (!fetchedIds.has(id)) recentlyDeletedRef.current.delete(id);
      });
      const merged = [
        ...[...recentlyCreatedRef.current.values()].filter(
          (p) => !fetchedIds.has(p.id)
        ),
        ...fetched.filter((p) => !recentlyDeletedRef.current.has(p.id)),
      ].map((p) => {
        // 저장 대기 중인 로컬 편집이 서버 스냅샷에 덮이지 않게 겹쳐 적는다.
        const pending = pendingPatchRef.current.get(p.id);
        return pending ? { ...p, ...pending } : p;
      });
      setState((s) => ({
        ...s,
        postsLoaded: true,
        postsError: null,
        posts: merged,
      }));
    },
    [fetchPosts]
  );

  // 쓰기 실패 시: 서버를 진실의 원천으로 재동기화한 뒤 실패를 알린다 (FR-008).
  // 안내는 재조회 후에 세팅해야 재조회 성공이 안내를 지워버리지 않는다.
  const resyncAfterError = useCallback(
    async (ownerId: string, message: string) => {
      await loadPosts(ownerId);
      setState((s) => ({ ...s, postsError: message }));
    },
    [loadPosts]
  );

  useEffect(() => {
    setState((s) => ({ ...s, dataLoaded: true }));
  }, []);

  // Pull the 1:1 profile row and use its name as the nickname. The DB trigger
  // (on_auth_user_created) creates the row on first login; the upsert here only
  // covers accounts that signed up before the trigger existed. ignoreDuplicates
  // (ON CONFLICT DO NOTHING)라서 두 탭이 동시에 최초 로그인해도 안전하다 —
  // 경합에서 지면 반환 행이 없으므로 재조회로 승자의 행을 읽는다.
  const syncProfile = useCallback(async (user: User) => {
    const selectProfile = () =>
      supabase
        .from("profile")
        .select("name, image_path, introduction")
        .eq("user_id", user.id)
        .maybeSingle();
    let { data } = await selectProfile();
    if (!data) {
      const { data: created } = await supabase
        .from("profile")
        .upsert(
          { user_id: user.id, name: toAccount(user).name },
          { onConflict: "user_id", ignoreDuplicates: true }
        )
        .select("name, image_path, introduction")
        .maybeSingle();
      data = created ?? (await selectProfile()).data;
    }
    if (data && userIdRef.current === user.id) {
      const name = data.name ?? null;
      const imagePath = data.image_path ?? null;
      const introduction = data.introduction ?? null;
      setState((s) => ({ ...s, nickname: name, imagePath, introduction }));
    }
  }, []);

  // Mirror the Supabase session (INITIAL_SESSION covers the first load,
  // including the OAuth code exchange when returning from Google).
  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      const user = session?.user ?? null;
      userIdRef.current = user?.id ?? null;
      if (!user) {
        // 로그아웃 — 대기 중인 자동 저장은 더 이상 이 계정의 것이 아니므로
        // 취소하고, 프로필 기기 캐시도 지워 다음 계정에게 새지 않게 한다.
        saveTimerRef.current.forEach((timer) => clearTimeout(timer));
        saveTimerRef.current.clear();
        pendingPatchRef.current.clear();
        recentlyCreatedRef.current.clear();
        recentlyDeletedRef.current.clear();
        loadedUserRef.current = null;
        try {
          localStorage.removeItem(KEY);
        } catch {}
      }
      const isNewLogin =
        !!user &&
        (event === "INITIAL_SESSION" || event === "SIGNED_IN") &&
        loadedUserRef.current !== user.id;
      // 캐시는 같은 계정의 것일 때만 프리필로 쓴다 (계정 간 유출 방지).
      const cached = isNewLogin ? readLocalJson<ProfileCache>(KEY) : null;
      const ownCache = user && cached?.userId === user.id ? cached : null;
      setState((s) => ({
        ...s,
        authLoaded: true,
        account: user ? toAccount(user) : null,
        ...(user
          ? {}
          : {
              // 비로그인 상태에서는 어떤 글도, 어떤 프로필도 남기지 않는다.
              postsLoaded: true,
              posts: [],
              postsError: null,
              nickname: null,
              introduction: null,
              imagePath: null,
            }),
        ...(isNewLogin
          ? {
              // 목록 로딩이 끝나기 전의 빈 목록은 확정 상태가 아니다.
              postsLoaded: false,
              posts: [],
              postsError: null,
              nickname: ownCache?.nickname ?? null,
              introduction: ownCache?.introduction ?? null,
              imagePath: ownCache?.imagePath ?? null,
            }
          : {}),
      }));
      // Supabase calls inside this callback can deadlock the auth lock,
      // so defer the profile/posts fetch to the next tick.
      if (isNewLogin) {
        loadedUserRef.current = user!.id;
        lastLoadRef.current = Date.now();
        setTimeout(() => {
          void syncProfile(user!);
          void loadPosts(user!.id);
        }, 0);
      } else if (
        user &&
        event === "SIGNED_IN" &&
        Date.now() - lastLoadRef.current > REFRESH_MIN_INTERVAL_MS
      ) {
        // 같은 사용자의 재발화(탭 포커스 복귀 등)는 스로틀을 걸어 프로필·목록을
        // 재동기화한다 — 멀티탭/기기 간 유일한 최신화 경로. loadPosts가 낡은
        // 응답을 버리고 pending 편집을 겹쳐 적으므로 입력 중에도 안전하다.
        lastLoadRef.current = Date.now();
        setTimeout(() => {
          void syncProfile(user);
          void loadPosts(user.id);
        }, 0);
      }
    });
    return () => subscription.unsubscribe();
  }, [syncProfile, loadPosts]);

  // Persist the local profile fallback on change, keyed to its owner account
  // (posts are never stored here).
  useEffect(() => {
    if (!state.dataLoaded || !state.account) return;
    writeLocalJson(KEY, {
      userId: state.account.id,
      nickname: state.nickname,
      introduction: state.introduction,
      imagePath: state.imagePath,
    });
  }, [
    state.dataLoaded,
    state.account,
    state.nickname,
    state.introduction,
    state.imagePath,
  ]);

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
      // 아직 서버 응답이 확인 안 된 새 글이면 기억해 둔 사본도 갱신한다.
      const rc = recentlyCreatedRef.current.get(id);
      if (rc) recentlyCreatedRef.current.set(id, { ...rc, ...patch });
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
            const { data, error } = await supabase
              .from("page")
              .update(pending)
              .eq("id", id)
              .select();
            // 로그아웃/계정 전환 뒤 도착한 응답은 무시한다 — 이전 세션의
            // 오류·재조회를 다음 세션에 흘리지 않는다.
            if (userIdRef.current !== userId) return;
            // error 없이 0행 매칭(다른 기기에서 삭제·RLS 필터)도 저장 실패다 —
            // "자동 저장됨"이 거짓말이 되지 않게 재동기화한다.
            if (error || (data ?? []).length === 0) {
              void resyncAfterError(userId, POST_SAVE_ERROR);
              return;
            }
            // 성공한 다음 연산은 이전 실패 안내를 지운다 (contracts §posts-store).
            setState((s) => (s.postsError ? { ...s, postsError: null } : s));
          })();
        }, SAVE_DEBOUNCE_MS)
      );
    },
    [userId, resyncAfterError]
  );

  // 탭 이탈(숨김/언로드) 시 대기 중인 자동 저장을 즉시 전송한다 — 디바운스
  // 창에서 탭을 닫아도 마지막 입력이 유실되지 않게 하는 best-effort 플러시.
  const flushPendingSaves = useCallback(() => {
    if (!userIdRef.current) return;
    saveTimerRef.current.forEach((timer) => clearTimeout(timer));
    saveTimerRef.current.clear();
    pendingPatchRef.current.forEach((pending, id) => {
      void supabase.from("page").update(pending).eq("id", id).select();
    });
    pendingPatchRef.current.clear();
  }, []);

  useEffect(() => {
    const onHide = () => {
      if (document.visibilityState === "hidden") flushPendingSaves();
    };
    document.addEventListener("visibilitychange", onHide);
    window.addEventListener("pagehide", flushPendingSaves);
    return () => {
      document.removeEventListener("visibilitychange", onHide);
      window.removeEventListener("pagehide", flushPendingSaves);
      // 제공자 해제 시에도 플러시 — 테스트/HMR에서 타이머가 살아남지 않게.
      flushPendingSaves();
    };
  }, [flushPendingSaves]);

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
      recentlyDeletedRef.current.add(id);
      recentlyCreatedRef.current.delete(id);
      setState((s) => ({ ...s, posts: s.posts.filter((p) => p.id !== id) }));
      void (async () => {
        const { error } = await supabase.from("page").delete().eq("id", id);
        if (userIdRef.current !== userId) return;
        if (error) {
          recentlyDeletedRef.current.delete(id);
          void resyncAfterError(
            userId,
            "글을 삭제하지 못했어요. 잠시 후 다시 시도해 주세요."
          );
          return;
        }
        setState((s) => (s.postsError ? { ...s, postsError: null } : s));
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
      // in-flight였던 조회 스냅샷이 이 글을 모른 채 도착해도 지워지지 않게.
      recentlyCreatedRef.current.set(post.id, post);
      setState((s) => ({ ...s, posts: [post, ...s.posts], postsError: null }));
      return post;
    },
    [userId]
  );

  // Persist nickname + introduction to the profile table in a single update so
  // both always save together. 상태는 DB 반영이 확인된 뒤에만 바꾼다 — 실패 시
  // 화면 전역(displayName 등)과 기기 캐시에 저장 안 된 값이 남지 않게.
  // Resolves false when the Supabase update fails.
  const saveProfile = useCallback(
    async (fields: { name: string; introduction: string }) => {
      const name = (fields.name || "").trim() || null;
      // Whitespace-only means "cleared"; real content is stored verbatim so
      // line breaks and inner spacing survive round-trips.
      const introduction =
        fields.introduction.trim() === "" ? null : fields.introduction;
      if (!userId) {
        setState((s) => ({ ...s, nickname: name, introduction }));
        return true;
      }
      const { error } = await supabase
        .from("profile")
        .update({ name, introduction })
        .eq("user_id", userId);
      if (error || userIdRef.current !== userId) return !error;
      setState((s) => ({ ...s, nickname: name, introduction }));
      return true;
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
