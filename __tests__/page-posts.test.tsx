import { useState } from "react";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { AppProvider, useApp, type Post } from "@/lib/store";
import ListPage from "@/app/(app)/page";
import PostDetailPage from "@/app/(app)/posts/[id]/page";
import {
  googleSession,
  makePageRow,
  resetSupabaseMock,
  spies,
  state,
} from "./helpers/supabase-mock";

vi.mock("@/lib/supabase", () => import("./helpers/supabase-mock"));

const nav = vi.hoisted(() => ({
  push: vi.fn(),
  replace: vi.fn(),
  params: { id: "" },
}));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: nav.push, replace: nav.replace }),
  useParams: () => nav.params,
}));

function Probe() {
  const app = useApp();
  const [createResult, setCreateResult] = useState("");
  return (
    <div>
      <span data-testid="loaded">{String(app.loaded)}</span>
      <span data-testid="posts-count">{String(app.posts.length)}</span>
      <span data-testid="posts">{JSON.stringify(app.posts)}</span>
      <span data-testid="error">{app.postsError ?? ""}</span>
      <span data-testid="create-result">{createResult}</span>
      <button
        onClick={async () => {
          const post = await app.createPost("  새 글  ");
          setCreateResult(post === null ? "null" : post.id);
        }}
      >
        등록
      </button>
      <button onClick={() => app.toggleFavorite(app.posts[0]?.id ?? "")}>
        첫 글 즐겨찾기
      </button>
      <button onClick={() => app.deletePost(app.posts[0]?.id ?? "")}>
        첫 글 삭제
      </button>
      <button
        onClick={() =>
          app.updatePost(app.posts[0]?.id ?? "", { title: "고친 제목" })
        }
      >
        제목 수정
      </button>
      <button
        onClick={() =>
          app.updatePost(app.posts[0]?.id ?? "", { content: "고친 본문" })
        }
      >
        본문 수정
      </button>
    </div>
  );
}

function readPosts(): Post[] {
  return JSON.parse(screen.getByTestId("posts").textContent || "[]");
}

beforeEach(() => {
  localStorage.clear();
  resetSupabaseMock();
  nav.push.mockClear();
  nav.replace.mockClear();
  nav.params = { id: "" };
});

afterEach(() => {
  vi.useRealTimers();
  cleanup();
});

test("로그인하면 page 테이블 목록이 createdAt 내림차순 Post로 노출된다 (null은 빈 문자열, created_at은 ms 숫자)", async () => {
  const rowA = makePageRow({
    id: "11111111-0000-4000-8000-000000000001",
    created_at: "2026-07-21T09:00:00.000Z",
    title: "글 A",
    content: "본문 A",
  });
  const rowB = makePageRow({
    id: "22222222-0000-4000-8000-000000000002",
    created_at: "2026-07-20T09:00:00.000Z",
    title: null,
    content: null,
  });
  state.session = googleSession;
  state.pageRows = [rowA, rowB]; // 서버가 내림차순으로 반환

  render(
    <AppProvider>
      <Probe />
    </AppProvider>
  );

  await waitFor(() =>
    expect(screen.getByTestId("posts-count").textContent).toBe("2")
  );
  expect(spies.pageSelectOrder).toHaveBeenCalledWith("created_at", {
    ascending: false,
  });
  const posts = readPosts();
  expect(posts[0]).toMatchObject({
    id: rowA.id,
    title: "글 A",
    content: "본문 A",
    favorite: false,
    createdAt: Date.parse(rowA.created_at),
  });
  expect(posts[1]).toMatchObject({
    id: rowB.id,
    title: "",
    content: "",
    favorite: false,
    createdAt: Date.parse(rowB.created_at),
  });
});

test("샘플 시딩이 없다(FR-009): 서버가 빈 목록이면 posts는 비어 있고 localStorage에 posts를 기록하지 않는다", async () => {
  state.session = googleSession;
  state.pageRows = [];

  render(
    <AppProvider>
      <Probe />
    </AppProvider>
  );

  await waitFor(() =>
    expect(screen.getByTestId("loaded").textContent).toBe("true")
  );
  expect(screen.getByTestId("posts-count").textContent).toBe("0");
  const raw = localStorage.getItem("mini-notion-v1");
  const stored = raw ? JSON.parse(raw) : null;
  expect(stored?.posts).toBeUndefined();
});

test("createPost는 트림된 제목·빈 본문·세션 user_id로 insert하고 응답 row를 목록 최상단에 넣는다", async () => {
  state.session = googleSession;
  state.pageRows = [
    makePageRow({
      id: "11111111-0000-4000-8000-000000000001",
      created_at: "2026-07-21T09:00:00.000Z",
      title: "기존 글",
    }),
  ];

  render(
    <AppProvider>
      <Probe />
    </AppProvider>
  );
  await waitFor(() =>
    expect(screen.getByTestId("loaded").textContent).toBe("true")
  );

  fireEvent.click(screen.getByRole("button", { name: "등록" }));

  await waitFor(() =>
    expect(spies.pageInsert).toHaveBeenCalledWith({
      title: "새 글",
      content: "",
      user_id: "user-1",
    })
  );
  await waitFor(() =>
    expect(screen.getByTestId("posts-count").textContent).toBe("2")
  );
  const posts = readPosts();
  expect(posts[0]).toMatchObject({
    id: "00000000-0000-4000-8000-000000000001", // 서버 발급 uuid
    title: "새 글",
    content: "",
    favorite: false,
    createdAt: Date.parse("2026-07-22T03:00:00.000Z"), // 서버 발급 created_at
  });
  expect(screen.getByTestId("create-result").textContent).toBe(posts[0].id);
});

test("insert 실패 시 createPost는 null을 반환하고 postsError를 설정하며 목록은 불변이다", async () => {
  state.session = googleSession;
  state.pageRows = [
    makePageRow({ id: "11111111-0000-4000-8000-000000000001" }),
  ];
  state.insertError = { message: "network down" };

  render(
    <AppProvider>
      <Probe />
    </AppProvider>
  );
  await waitFor(() =>
    expect(screen.getByTestId("loaded").textContent).toBe("true")
  );

  fireEvent.click(screen.getByRole("button", { name: "등록" }));

  await waitFor(() =>
    expect(screen.getByTestId("create-result").textContent).toBe("null")
  );
  expect(screen.getByTestId("posts-count").textContent).toBe("1");
  expect(screen.getByTestId("error").textContent).not.toBe("");
});

test("비로그인 createPost는 서버 요청 없이 null을 반환한다(FR-001)", async () => {
  state.session = null;

  render(
    <AppProvider>
      <Probe />
    </AppProvider>
  );
  await waitFor(() =>
    expect(screen.getByTestId("loaded").textContent).toBe("true")
  );

  fireEvent.click(screen.getByRole("button", { name: "등록" }));

  await waitFor(() =>
    expect(screen.getByTestId("create-result").textContent).toBe("null")
  );
  expect(spies.pageInsert).not.toHaveBeenCalled();
});

test("목록 로드 시 즐겨찾기가 계정별 로컬 키에서 파생되고 다른 계정 키와 섞이지 않는다(FR-010)", async () => {
  const rowA = makePageRow({ id: "11111111-0000-4000-8000-000000000001" });
  const rowB = makePageRow({ id: "22222222-0000-4000-8000-000000000002" });
  localStorage.setItem("mini-notion-fav:user-1", JSON.stringify([rowA.id]));
  localStorage.setItem("mini-notion-fav:user-2", JSON.stringify([rowB.id]));
  state.session = googleSession; // user-1
  state.pageRows = [rowA, rowB];

  render(
    <AppProvider>
      <Probe />
    </AppProvider>
  );

  await waitFor(() =>
    expect(screen.getByTestId("posts-count").textContent).toBe("2")
  );
  const posts = readPosts();
  expect(posts[0].favorite).toBe(true); // user-1 키에 있음
  expect(posts[1].favorite).toBe(false); // user-2 키는 이 계정과 무관
});

test("toggleFavorite는 mini-notion-fav:<userId> 키에 id 집합으로 저장한다(FR-010)", async () => {
  const row = makePageRow({ id: "11111111-0000-4000-8000-000000000001" });
  state.session = googleSession;
  state.pageRows = [row];

  render(
    <AppProvider>
      <Probe />
    </AppProvider>
  );
  await waitFor(() =>
    expect(screen.getByTestId("posts-count").textContent).toBe("1")
  );

  fireEvent.click(screen.getByRole("button", { name: "첫 글 즐겨찾기" }));

  await waitFor(() => expect(readPosts()[0].favorite).toBe(true));
  expect(
    JSON.parse(localStorage.getItem("mini-notion-fav:user-1") ?? "[]")
  ).toEqual([row.id]);

  fireEvent.click(screen.getByRole("button", { name: "첫 글 즐겨찾기" }));

  await waitFor(() => expect(readPosts()[0].favorite).toBe(false));
  expect(
    JSON.parse(localStorage.getItem("mini-notion-fav:user-1") ?? "[]")
  ).toEqual([]);
});

test("로그아웃(SIGNED_OUT)하면 posts가 즉시 비워지고 이후 page 조회가 없다(FR-003)", async () => {
  state.session = googleSession;
  state.pageRows = [
    makePageRow({ id: "11111111-0000-4000-8000-000000000001" }),
  ];

  render(
    <AppProvider>
      <Probe />
    </AppProvider>
  );
  await waitFor(() =>
    expect(screen.getByTestId("posts-count").textContent).toBe("1")
  );
  const fetchCallsWhileLoggedIn = spies.pageSelectOrder.mock.calls.length;

  act(() => {
    state.authCallback?.("SIGNED_OUT", null);
  });

  await waitFor(() =>
    expect(screen.getByTestId("posts-count").textContent).toBe("0")
  );
  // 비로그인 상태에서는 page 조회를 다시 시도하지 않는다.
  expect(spies.pageSelectOrder.mock.calls.length).toBe(fetchCallsWhileLoggedIn);
});

test("deletePost는 해당 id로 delete를 전송하고 목록에서 즉시 제거한다", async () => {
  const rowA = makePageRow({
    id: "11111111-0000-4000-8000-000000000001",
    created_at: "2026-07-21T09:00:00.000Z",
  });
  const rowB = makePageRow({
    id: "22222222-0000-4000-8000-000000000002",
    created_at: "2026-07-20T09:00:00.000Z",
  });
  state.session = googleSession;
  state.pageRows = [rowA, rowB];

  render(
    <AppProvider>
      <Probe />
    </AppProvider>
  );
  await waitFor(() =>
    expect(screen.getByTestId("posts-count").textContent).toBe("2")
  );

  fireEvent.click(screen.getByRole("button", { name: "첫 글 삭제" }));

  await waitFor(() =>
    expect(screen.getByTestId("posts-count").textContent).toBe("1")
  );
  await waitFor(() => expect(spies.pageDelete).toHaveBeenCalledWith(rowA.id));
  expect(readPosts()[0].id).toBe(rowB.id);
});

test("delete 실패 시 재조회로 목록이 복원되고 postsError가 설정된다(FR-008)", async () => {
  const row = makePageRow({ id: "11111111-0000-4000-8000-000000000001" });
  state.session = googleSession;
  state.pageRows = [row];
  state.deleteError = { message: "network down" };

  render(
    <AppProvider>
      <Probe />
    </AppProvider>
  );
  await waitFor(() =>
    expect(screen.getByTestId("posts-count").textContent).toBe("1")
  );

  fireEvent.click(screen.getByRole("button", { name: "첫 글 삭제" }));

  await waitFor(() =>
    expect(screen.getByTestId("error").textContent).not.toBe("")
  );
  // 서버 재조회(진실의 원천)로 목록이 실제 저장 상태와 다시 일치한다.
  await waitFor(() =>
    expect(screen.getByTestId("posts-count").textContent).toBe("1")
  );
  expect(readPosts()[0].id).toBe(row.id);
});

test("updatePost는 로컬에 즉시 반영되고 디바운스 경과 후 병합된 patch로 update를 1회만 전송한다", async () => {
  const row = makePageRow({
    id: "11111111-0000-4000-8000-000000000001",
    title: "원래 제목",
    content: "원래 본문",
  });
  state.session = googleSession;
  state.pageRows = [row];

  render(
    <AppProvider>
      <Probe />
    </AppProvider>
  );
  await waitFor(() =>
    expect(screen.getByTestId("posts-count").textContent).toBe("1")
  );

  vi.useFakeTimers();
  fireEvent.click(screen.getByRole("button", { name: "제목 수정" }));
  fireEvent.click(screen.getByRole("button", { name: "본문 수정" }));

  // 로컬 즉시 반영 + 디바운스 전에는 요청 없음
  expect(readPosts()[0].title).toBe("고친 제목");
  expect(readPosts()[0].content).toBe("고친 본문");
  expect(spies.pageUpdate).not.toHaveBeenCalled();

  await act(async () => {
    await vi.advanceTimersByTimeAsync(700);
  });

  expect(spies.pageUpdate).toHaveBeenCalledTimes(1);
  expect(spies.pageUpdate).toHaveBeenCalledWith(
    { title: "고친 제목", content: "고친 본문" },
    row.id
  );
});

test("update 실패 시 서버 재조회로 재동기화되고 상세 화면에 실패 안내가 보인다(FR-008)", async () => {
  const row = makePageRow({
    id: "11111111-0000-4000-8000-000000000001",
    title: "원래 제목",
    content: "원래 본문",
  });
  state.session = googleSession;
  state.pageRows = [row];
  state.updateError = { message: "network down" };
  nav.params = { id: row.id };

  render(
    <AppProvider>
      <PostDetailPage />
    </AppProvider>
  );
  const titleInput = (await screen.findByPlaceholderText(
    "제목 없음"
  )) as HTMLInputElement;

  vi.useFakeTimers();
  fireEvent.change(titleInput, { target: { value: "고친 제목" } });
  await act(async () => {
    await vi.advanceTimersByTimeAsync(700);
  });
  vi.useRealTimers();

  // 상세 메타 영역에 실패 안내가 보인다.
  await screen.findByRole("alert");
  // 서버 재조회로 화면이 실제 저장 상태(원래 제목)와 다시 일치한다.
  await waitFor(() =>
    expect(
      (screen.getByPlaceholderText("제목 없음") as HTMLInputElement).value
    ).toBe("원래 제목")
  );
});

test("로그아웃하면 대기 중 디바운스 저장이 취소되어 요청이 나가지 않는다", async () => {
  const row = makePageRow({ id: "11111111-0000-4000-8000-000000000001" });
  state.session = googleSession;
  state.pageRows = [row];

  render(
    <AppProvider>
      <Probe />
    </AppProvider>
  );
  await waitFor(() =>
    expect(screen.getByTestId("posts-count").textContent).toBe("1")
  );

  vi.useFakeTimers();
  fireEvent.click(screen.getByRole("button", { name: "제목 수정" }));
  act(() => {
    state.authCallback?.("SIGNED_OUT", null);
  });
  await act(async () => {
    await vi.advanceTimersByTimeAsync(700);
  });
  vi.useRealTimers();

  expect(spies.pageUpdate).not.toHaveBeenCalled();
});

test("ListPage: 등록 실패 시 상세로 이동하지 않고 실패 안내가 보인다(FR-008)", async () => {
  state.session = googleSession;
  state.pageRows = [];
  state.insertError = { message: "network down" };

  render(
    <AppProvider>
      <ListPage />
    </AppProvider>
  );

  fireEvent.click(await screen.findByRole("button", { name: /새 페이지/ }));

  await waitFor(() =>
    expect(screen.getByRole("alert").textContent).not.toBe("")
  );
  expect(nav.push).not.toHaveBeenCalled();
});

test("ListPage: 등록 성공 시 서버가 발급한 id의 상세로 이동한다", async () => {
  state.session = googleSession;
  state.pageRows = [];

  render(
    <AppProvider>
      <ListPage />
    </AppProvider>
  );

  fireEvent.click(await screen.findByRole("button", { name: /새 페이지/ }));

  await waitFor(() =>
    expect(nav.push).toHaveBeenCalledWith(
      "/posts/00000000-0000-4000-8000-000000000001"
    )
  );
});
