import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { useParams, useRouter } from "next/navigation";
import PostDetailPage from "@/app/(app)/posts/[id]/page";
import { AppProvider, type Post } from "@/lib/store";

vi.mock("next/navigation", () => ({
  useParams: vi.fn(),
  useRouter: vi.fn(),
}));

const STORAGE_KEY = "mini-notion-v1";
const CONTENT_PLACEHOLDER =
  "내용을 입력하세요. 떠오르는 생각, 할 일, 메모를 자유롭게 기록해 보세요.";

function seedPosts(posts: Post[]) {
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({ posts, nickname: null, avatar: null, loggedIn: true })
  );
}

function makePost(overrides: Partial<Post> & { id: string }): Post {
  return {
    title: "제목",
    content: "",
    favorite: false,
    createdAt: Date.now(),
    ...overrides,
  };
}

beforeEach(() => {
  localStorage.clear();
  vi.mocked(useRouter).mockReturnValue({
    push: vi.fn(),
    replace: vi.fn(),
  } as any);
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

test("renders detail-cover above the title input", async () => {
  seedPosts([makePost({ id: "post-1" })]);
  vi.mocked(useParams).mockReturnValue({ id: "post-1" } as any);

  const { container } = render(
    <AppProvider>
      <PostDetailPage />
    </AppProvider>
  );

  const cover = await screen.findByTestId("detail-cover");
  const title = container.querySelector(".detail-title");
  expect(title).not.toBeNull();
  expect(
    cover.compareDocumentPosition(title as Element) &
      Node.DOCUMENT_POSITION_FOLLOWING
  ).toBeTruthy();
});

test("cover-image src starts with the cataas endpoint", async () => {
  seedPosts([makePost({ id: "post-1" })]);
  vi.mocked(useParams).mockReturnValue({ id: "post-1" } as any);

  render(
    <AppProvider>
      <PostDetailPage />
    </AppProvider>
  );

  const img = await screen.findByTestId("cover-image");
  expect((img as HTMLImageElement).src.startsWith("https://cataas.com/cat/cute")).toBe(
    true
  );
});

test("cover-image has an empty alt (decorative)", async () => {
  seedPosts([makePost({ id: "post-1" })]);
  vi.mocked(useParams).mockReturnValue({ id: "post-1" } as any);

  render(
    <AppProvider>
      <PostDetailPage />
    </AppProvider>
  );

  const img = await screen.findByTestId("cover-image");
  expect(img.getAttribute("alt")).toBe("");
});

test("marks the cover image as loaded once it fires a load event", async () => {
  seedPosts([makePost({ id: "post-1" })]);
  vi.mocked(useParams).mockReturnValue({ id: "post-1" } as any);

  render(
    <AppProvider>
      <PostDetailPage />
    </AppProvider>
  );

  const img = await screen.findByTestId("cover-image");
  expect(img.getAttribute("data-loaded")).toBe("false");

  fireEvent.load(img);

  expect(img.getAttribute("data-loaded")).toBe("true");
});

test("shows a skeleton placeholder (not a spinner) before the cover loads", async () => {
  seedPosts([makePost({ id: "post-1" })]);
  vi.mocked(useParams).mockReturnValue({ id: "post-1" } as any);

  const { container } = render(
    <AppProvider>
      <PostDetailPage />
    </AppProvider>
  );

  expect(await screen.findByTestId("cover-skeleton")).toBeTruthy();
  expect(screen.queryByRole("status")).toBeNull();
  expect(container.querySelector("[class*='spinner']")).toBeNull();
});

test("removes the skeleton once the cover image loads", async () => {
  seedPosts([makePost({ id: "post-1" })]);
  vi.mocked(useParams).mockReturnValue({ id: "post-1" } as any);

  render(
    <AppProvider>
      <PostDetailPage />
    </AppProvider>
  );

  const img = await screen.findByTestId("cover-image");
  expect(await screen.findByTestId("cover-skeleton")).toBeTruthy();

  fireEvent.load(img);

  expect(screen.queryByTestId("cover-skeleton")).toBeNull();
});

test("collapses the cover container when the image fails to load", async () => {
  seedPosts([makePost({ id: "post-1" })]);
  vi.mocked(useParams).mockReturnValue({ id: "post-1" } as any);

  render(
    <AppProvider>
      <PostDetailPage />
    </AppProvider>
  );

  const img = await screen.findByTestId("cover-image");
  fireEvent.error(img);

  expect(screen.queryByTestId("detail-cover")).toBeNull();
});

test("still accepts content edits immediately after the cover fails", async () => {
  seedPosts([makePost({ id: "post-1", content: "" })]);
  vi.mocked(useParams).mockReturnValue({ id: "post-1" } as any);

  render(
    <AppProvider>
      <PostDetailPage />
    </AppProvider>
  );

  const img = await screen.findByTestId("cover-image");
  fireEvent.error(img);

  const textarea = await screen.findByPlaceholderText(CONTENT_PLACEHOLDER);
  fireEvent.change(textarea, { target: { value: "안녕" } });

  expect((textarea as HTMLTextAreaElement).value).toBe("안녕");
});
