import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { usePathname, useRouter } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { AppProvider } from "@/lib/store";
import { installMatchMedia } from "./helpers/match-media";

vi.mock("next/navigation", () => ({
  usePathname: vi.fn(),
  useRouter: vi.fn(),
}));

// loggedIn은 Supabase 세션에서 파생되므로(lib/store.tsx) 세션을 목으로 제공한다.
vi.mock("@/lib/supabase", () => ({
  supabase: {
    auth: {
      onAuthStateChange: (
        cb: (event: string, session: unknown) => void
      ) => {
        cb("INITIAL_SESSION", {
          user: {
            id: "user-1",
            email: "minsu.kim@gmail.com",
            user_metadata: { full_name: "김민수", avatar_url: null },
          },
        });
        return { data: { subscription: { unsubscribe: vi.fn() } } };
      },
      signInWithOAuth: vi.fn().mockResolvedValue({ data: {}, error: null }),
      signOut: vi.fn().mockResolvedValue({ error: null }),
    },
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: async () => ({ data: { name: null }, error: null }),
        }),
      }),
      insert: (row: { name: string | null }) => ({
        select: () => ({
          maybeSingle: async () => ({
            data: { name: row.name ?? null },
            error: null,
          }),
        }),
      }),
      update: (patch: { name: string | null }) => ({
        eq: async () => ({ error: null }),
      }),
    }),
  },
}));

const STORAGE_KEY = "mini-notion-v1";

function seedPosts() {
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({ posts: [], nickname: null, avatar: null, loggedIn: true })
  );
}

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
  seedPosts();
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

  const btn = await screen.findByTestId("theme-toggle");
  expect(btn.tagName).toBe("BUTTON");
  expect(btn.getAttribute("type")).toBe("button");
  expect(btn.textContent).toContain("다크 모드");
  expect(btn.getAttribute("aria-label")).toBe("다크 모드");
  expect(btn.querySelector("svg.lucide-moon")).not.toBeNull();
  expect(btn.querySelector("svg.lucide-sun")).toBeNull();
});

test("clicking the toggle switches the app to dark and relabels to 라이트 모드 with a sun icon", async () => {
  installMatchMedia(false);
  renderShell();

  const btn = await screen.findByTestId("theme-toggle");
  fireEvent.click(btn);

  expect(document.documentElement.dataset.theme).toBe("dark");
  expect(btn.textContent).toContain("라이트 모드");
  expect(btn.getAttribute("aria-label")).toBe("라이트 모드");
  expect(btn.querySelector("svg.lucide-sun")).not.toBeNull();
  expect(btn.querySelector("svg.lucide-moon")).toBeNull();
});

test("clicking the toggle records the explicit choice in localStorage", async () => {
  installMatchMedia(false);
  renderShell();

  const btn = await screen.findByTestId("theme-toggle");
  fireEvent.click(btn);
  expect(localStorage.getItem("mini-notion-theme")).toBe("dark");

  fireEvent.click(btn);
  expect(localStorage.getItem("mini-notion-theme")).toBe("light");
});

test("clicking the toggle twice returns the app to light", async () => {
  installMatchMedia(false);
  renderShell();

  const btn = await screen.findByTestId("theme-toggle");
  fireEvent.click(btn);
  fireEvent.click(btn);

  expect(document.documentElement.dataset.theme).toBe("light");
  expect(btn.textContent).toContain("다크 모드");
});
