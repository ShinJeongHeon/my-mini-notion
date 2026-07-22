import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { useParams, useRouter } from "next/navigation";
import PostDetailPage from "@/app/(app)/posts/[id]/page";
import { AppProvider } from "@/lib/store";
import { makePost, resetSupabaseMock, seedPosts } from "./helpers/supabase-mock";

vi.mock("@/lib/supabase", () => import("./helpers/supabase-mock"));

vi.mock("next/navigation", () => ({
  useParams: vi.fn(),
  useRouter: vi.fn(),
}));

const CONTENT_PLACEHOLDER =
  "내용을 입력하세요. 떠오르는 생각, 할 일, 메모를 자유롭게 기록해 보세요.";

beforeEach(() => {
  localStorage.clear();
  resetSupabaseMock();
  vi.mocked(useRouter).mockReturnValue({
    push: vi.fn(),
    replace: vi.fn(),
  } as any);
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

test("renders the post's current content length as content-char-count", async () => {
  seedPosts([makePost({ id: "post-1", content: "안녕" })]);
  vi.mocked(useParams).mockReturnValue({ id: "post-1" } as any);

  render(
    <AppProvider>
      <PostDetailPage />
    </AppProvider>
  );

  const badge = await screen.findByTestId("content-char-count");
  expect(badge.textContent).toBe("2");
});

test("increases immediately when the user types", async () => {
  seedPosts([makePost({ id: "post-1", content: "안녕" })]);
  vi.mocked(useParams).mockReturnValue({ id: "post-1" } as any);

  render(
    <AppProvider>
      <PostDetailPage />
    </AppProvider>
  );

  const textarea = await screen.findByPlaceholderText(CONTENT_PLACEHOLDER);
  fireEvent.change(textarea, { target: { value: "안녕하" } });

  expect(screen.getByTestId("content-char-count").textContent).toBe("3");
});

test("decreases immediately when the user deletes text", async () => {
  seedPosts([makePost({ id: "post-1", content: "안녕하세요" })]);
  vi.mocked(useParams).mockReturnValue({ id: "post-1" } as any);

  render(
    <AppProvider>
      <PostDetailPage />
    </AppProvider>
  );

  const textarea = await screen.findByPlaceholderText(CONTENT_PLACEHOLDER);
  fireEvent.change(textarea, { target: { value: "안녕" } });

  expect(screen.getByTestId("content-char-count").textContent).toBe("2");
});

test("reflects the full pasted length once paste completes", async () => {
  seedPosts([makePost({ id: "post-1", content: "" })]);
  vi.mocked(useParams).mockReturnValue({ id: "post-1" } as any);

  render(
    <AppProvider>
      <PostDetailPage />
    </AppProvider>
  );

  const textarea = await screen.findByPlaceholderText(CONTENT_PLACEHOLDER);
  fireEvent.change(textarea, { target: { value: "line1\nline2" } });

  expect(screen.getByTestId("content-char-count").textContent).toBe("11");
});

test('shows exactly "0" when content is empty', async () => {
  seedPosts([makePost({ id: "post-1", content: "" })]);
  vi.mocked(useParams).mockReturnValue({ id: "post-1" } as any);

  render(
    <AppProvider>
      <PostDetailPage />
    </AppProvider>
  );

  const badge = await screen.findByTestId("content-char-count");
  expect(badge.textContent).toBe("0");
});

test('recalculates to "0" after switching to a post with empty content', async () => {
  seedPosts([
    makePost({ id: "post-1", content: "안녕" }),
    makePost({ id: "post-2", content: "" }),
  ]);
  vi.mocked(useParams).mockReturnValue({ id: "post-1" } as any);

  const { rerender } = render(
    <AppProvider>
      <PostDetailPage />
    </AppProvider>
  );

  expect((await screen.findByTestId("content-char-count")).textContent).toBe(
    "2"
  );

  vi.mocked(useParams).mockReturnValue({ id: "post-2" } as any);
  rerender(
    <AppProvider>
      <PostDetailPage />
    </AppProvider>
  );

  expect((await screen.findByTestId("content-char-count")).textContent).toBe(
    "0"
  );
});

test("stays accurate for content of 10,000+ characters", async () => {
  const longContent = "가".repeat(12000);
  seedPosts([makePost({ id: "post-1", content: longContent })]);
  vi.mocked(useParams).mockReturnValue({ id: "post-1" } as any);

  render(
    <AppProvider>
      <PostDetailPage />
    </AppProvider>
  );

  const badge = await screen.findByTestId("content-char-count");
  expect(badge.textContent).toBe("12000");
});
