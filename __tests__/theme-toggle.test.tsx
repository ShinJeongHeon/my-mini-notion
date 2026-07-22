import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { usePathname, useRouter } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { AppProvider } from "@/lib/store";
import { installMatchMedia } from "./helpers/match-media";
import { googleSession, resetSupabaseMock, state } from "./helpers/supabase-mock";

vi.mock("next/navigation", () => ({
  usePathname: vi.fn(),
  useRouter: vi.fn(),
}));

vi.mock("@/lib/supabase", () => import("./helpers/supabase-mock"));

function renderShell() {
  return render(
    <AppProvider>
      <AppShell>
        <div />
      </AppShell>
    </AppProvider>
  );
}

beforeEach(() => {
  localStorage.clear();
  resetSupabaseMock();
  state.session = googleSession;
  vi.mocked(usePathname).mockReturnValue("/");
  vi.mocked(useRouter).mockReturnValue({
    push: vi.fn(),
    replace: vi.fn(),
  } as any);
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  vi.unstubAllGlobals();
  localStorage.clear();
  delete document.documentElement.dataset.theme;
});

test("sidebar renders the theme toggle labeled 다크 모드 with a moon icon in light mode", async () => {
  installMatchMedia(false);
  renderShell();

  const btn = await screen.findByRole("button", { name: "다크 모드" });
  expect(btn.tagName).toBe("BUTTON");
  expect(btn.getAttribute("type")).toBe("button");
  expect(btn.querySelector("svg.lucide-moon")).not.toBeNull();
  expect(btn.querySelector("svg.lucide-sun")).toBeNull();
});

test("clicking the toggle switches the app to dark and relabels to 라이트 모드 with a sun icon", async () => {
  installMatchMedia(false);
  renderShell();

  const btn = await screen.findByRole("button", { name: "다크 모드" });
  fireEvent.click(btn);

  expect(document.documentElement.dataset.theme).toBe("dark");
  const relabeled = screen.getByRole("button", { name: "라이트 모드" });
  expect(relabeled).toBe(btn);
  expect(btn.querySelector("svg.lucide-sun")).not.toBeNull();
  expect(btn.querySelector("svg.lucide-moon")).toBeNull();
});

test("clicking the toggle records the explicit choice in localStorage", async () => {
  installMatchMedia(false);
  renderShell();

  const btn = await screen.findByRole("button", { name: "다크 모드" });
  fireEvent.click(btn);
  expect(localStorage.getItem("mini-notion-theme")).toBe("dark");

  fireEvent.click(btn);
  expect(localStorage.getItem("mini-notion-theme")).toBe("light");
});

test("clicking the toggle twice returns the app to light", async () => {
  installMatchMedia(false);
  renderShell();

  const btn = await screen.findByRole("button", { name: "다크 모드" });
  fireEvent.click(btn);
  fireEvent.click(btn);

  expect(document.documentElement.dataset.theme).toBe("light");
  expect(screen.getByRole("button", { name: "다크 모드" })).toBe(btn);
});
