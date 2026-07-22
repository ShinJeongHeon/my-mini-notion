// 글 생성 진입점(컴포저·사이드바)의 중복 제출/IME/무반응 실패 회귀 테스트
// (2026-07 4기능 병합 코드리뷰 F9·F10·F12).
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { usePathname, useRouter } from "next/navigation";
import ListPage from "@/app/(app)/page";
import { AppShell } from "@/components/AppShell";
import { AppProvider } from "@/lib/store";
import {
  googleSession,
  resetSupabaseMock,
  spies,
  state,
} from "./helpers/supabase-mock";

vi.mock("@/lib/supabase", () => import("./helpers/supabase-mock"));

vi.mock("next/navigation", () => ({
  useRouter: vi.fn(),
  usePathname: vi.fn(),
}));

const COMPOSER_PLACEHOLDER = "/page 를 입력하거나 할 일을 적어보세요";

function gate() {
  let resolve!: () => void;
  const promise = new Promise<void>((r) => {
    resolve = r;
  });
  return { promise, resolve };
}

beforeEach(() => {
  localStorage.clear();
  resetSupabaseMock();
  state.session = googleSession;
  vi.mocked(useRouter).mockReturnValue({
    push: vi.fn(),
    replace: vi.fn(),
  } as any);
  vi.mocked(usePathname).mockReturnValue("/mypage");
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

// ── F9: insert 왕복 동안 재제출 금지 ───────────────────────────────────

test("insert가 in-flight인 동안 Enter를 다시 눌러도 글이 한 번만 만들어진다", async () => {
  const g = gate();
  state.insertGate = g.promise;

  render(
    <AppProvider>
      <ListPage />
    </AppProvider>
  );
  const input = await screen.findByPlaceholderText(COMPOSER_PLACEHOLDER);

  fireEvent.change(input, { target: { value: "/page 회의록" } });
  fireEvent.keyDown(input, { key: "Enter" });
  fireEvent.keyDown(input, { key: "Enter" }); // 느린 응답 중 재입력

  g.resolve();
  state.insertGate = null;
  await waitFor(() => expect(spies.pageInsert).toHaveBeenCalled());

  expect(spies.pageInsert).toHaveBeenCalledTimes(1);
});

// ── F10: IME 조합 확정 Enter는 제출이 아니다 ───────────────────────────

test("IME 조합 중(isComposing) Enter는 글을 만들지 않는다", async () => {
  render(
    <AppProvider>
      <ListPage />
    </AppProvider>
  );
  const input = await screen.findByPlaceholderText(COMPOSER_PLACEHOLDER);

  fireEvent.change(input, { target: { value: "/page 회의록" } });
  fireEvent.keyDown(input, { key: "Enter", isComposing: true });

  // 마이크로태스크가 흐를 시간을 준 뒤에도 insert가 없어야 한다.
  await Promise.resolve();
  expect(spies.pageInsert).not.toHaveBeenCalled();
});

// ── F12: 사이드바 새 페이지 실패는 어느 화면에서든 보이게 알린다 ────────

test("postsError 표시가 없는 화면에서 사이드바 새 페이지 실패 시 알림이 뜬다", async () => {
  state.insertError = { message: "network down" };
  const alertSpy = vi.spyOn(window, "alert").mockImplementation(() => {});

  render(
    <AppProvider>
      <AppShell>
        <div>마이페이지 본문</div>
      </AppShell>
    </AppProvider>
  );
  // 사이드바 "내 글" 섹션의 + (새 페이지) 액션.
  const addBtn = await screen.findByRole("button", { name: "새 페이지" });
  fireEvent.click(addBtn);

  await waitFor(() => expect(alertSpy).toHaveBeenCalled());
  expect(String(alertSpy.mock.calls[0][0])).toContain("등록하지 못했어요");
});
