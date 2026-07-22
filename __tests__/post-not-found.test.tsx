import { afterEach, beforeEach, expect, test, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import { useParams, useRouter } from "next/navigation";
import PostDetailPage from "@/app/(app)/posts/[id]/page";
import { AppProvider } from "@/lib/store";
import {
  googleSession,
  makePageRow,
  resetSupabaseMock,
  state,
} from "./helpers/supabase-mock";

vi.mock("@/lib/supabase", () => import("./helpers/supabase-mock"));

vi.mock("next/navigation", () => ({
  useParams: vi.fn(),
  useRouter: vi.fn(),
}));

const push = vi.fn();
const replace = vi.fn();

beforeEach(() => {
  localStorage.clear();
  resetSupabaseMock();
  push.mockClear();
  replace.mockClear();
  vi.mocked(useRouter).mockReturnValue({ push, replace } as any);
});

afterEach(() => {
  cleanup();
});

test("로드 완료 후 해당 글이 없으면 침묵 리다이렉트 대신 '찾을 수 없음' 빈 상태를 보여준다 (US2-2·삭제 글 재접근)", async () => {
  state.session = googleSession;
  state.pageRows = [
    makePageRow({ id: "11111111-0000-4000-8000-000000000001" }),
  ];
  // RLS 때문에 타인 글·삭제된 글 모두 "row 없음"으로 동일하게 관측된다.
  vi.mocked(useParams).mockReturnValue({
    id: "99999999-0000-4000-8000-000000000009",
  } as any);

  const { container } = render(
    <AppProvider>
      <PostDetailPage />
    </AppProvider>
  );

  await screen.findByText("글을 찾을 수 없어요");
  expect(container.querySelector(".empty-state")).not.toBeNull();
  expect(replace).not.toHaveBeenCalled(); // 침묵 리다이렉트 아님
  expect(container.querySelector(".detail-content")).toBeNull(); // 본문 미노출
});

test("'목록으로 돌아가기' 버튼을 누르면 목록으로 이동한다", async () => {
  state.session = googleSession;
  state.pageRows = [];
  vi.mocked(useParams).mockReturnValue({
    id: "99999999-0000-4000-8000-000000000009",
  } as any);

  render(
    <AppProvider>
      <PostDetailPage />
    </AppProvider>
  );

  fireEvent.click(
    await screen.findByRole("button", { name: "목록으로 돌아가기" })
  );
  expect(push).toHaveBeenCalledWith("/");
});
