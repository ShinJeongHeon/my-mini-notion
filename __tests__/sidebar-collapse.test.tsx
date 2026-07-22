import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { usePathname, useRouter } from "next/navigation";
import { PanelLeftClose } from "lucide-react";
import { IconButton } from "@/components/ui/IconButton";
import { AppShell } from "@/components/AppShell";
import { AppProvider } from "@/lib/store";
import { readLocalPref, writeLocalPref } from "@/lib/local-pref";

// 외부 경계 목 — __tests__/auth-store.test.tsx의 검증된 완전한 형태 재사용(헌법 II)
const mocks = vi.hoisted(() => ({
  session: null as null | { user: unknown },
  profileRow: null as null | { name: string | null },
}));

vi.mock("@/lib/supabase", () => ({
  supabase: {
    auth: {
      onAuthStateChange: (
        cb: (event: string, session: typeof mocks.session) => void
      ) => {
        cb("INITIAL_SESSION", mocks.session);
        return { data: { subscription: { unsubscribe: vi.fn() } } };
      },
      signInWithOAuth: vi.fn().mockResolvedValue({ data: {}, error: null }),
      signOut: vi.fn().mockResolvedValue({ error: null }),
    },
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: async () => ({ data: mocks.profileRow, error: null }),
        }),
        // page 테이블 목록 조회(fetchPosts) — 빈 목록이면 postsLoaded가 켜진다.
        order: async () => ({ data: [], error: null }),
      }),
      insert: (row: { user_id: string; name: string | null }) => ({
        select: () => ({
          maybeSingle: async () => {
            mocks.profileRow = { name: row.name ?? null };
            return { data: mocks.profileRow, error: null };
          },
        }),
      }),
      update: (patch: { name: string | null }) => ({
        eq: async () => {
          mocks.profileRow = { name: patch.name };
          return { error: null };
        },
      }),
    }),
  },
}));

vi.mock("next/navigation", () => ({
  useRouter: vi.fn(),
  usePathname: vi.fn(),
}));

const googleSession = {
  user: {
    id: "user-1",
    email: "minsu.kim@gmail.com",
    user_metadata: { full_name: "김민수" },
  },
};

const SIDEBAR_KEY = "mini-notion-sidebar";
const SEARCH_PLACEHOLDER = "글 검색";

function renderShell() {
  return render(
    <AppProvider>
      <AppShell>
        <div>본문</div>
      </AppShell>
    </AppProvider>
  );
}

beforeEach(() => {
  localStorage.clear();
  mocks.session = googleSession;
  mocks.profileRow = { name: null };
  vi.mocked(useRouter).mockReturnValue({
    push: vi.fn(),
    replace: vi.fn(),
  } as any);
  vi.mocked(usePathname).mockReturnValue("/");
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

// ── lib/local-pref: 기기 로컬 UI 선호값 접근자 (계약 §1) ────────────────

describe("lib/local-pref", () => {
  const ALLOWED = ["collapsed", "expanded"] as const;

  test("write→read 라운드트립: 허용값은 그대로 돌아온다", () => {
    writeLocalPref(SIDEBAR_KEY, "collapsed");
    expect(readLocalPref(SIDEBAR_KEY, ALLOWED)).toBe("collapsed");
  });

  test("허용 목록에 없는 저장값은 null (무효값 폴백)", () => {
    localStorage.setItem(SIDEBAR_KEY, "banana");
    expect(readLocalPref(SIDEBAR_KEY, ALLOWED)).toBeNull();
  });

  test("키가 없으면 null", () => {
    expect(readLocalPref(SIDEBAR_KEY, ALLOWED)).toBeNull();
  });

  test("setItem이 throw해도 writeLocalPref는 예외를 삼킨다 (best-effort)", () => {
    const spy = vi
      .spyOn(Storage.prototype, "setItem")
      .mockImplementation(() => {
        throw new Error("QuotaExceededError");
      });
    expect(() => writeLocalPref(SIDEBAR_KEY, "collapsed")).not.toThrow();
    spy.mockRestore();
  });
});

// ── IconButton ariaExpanded prop (계약 §2) ──────────────────────────────

describe("IconButton ariaExpanded", () => {
  test('ariaExpanded가 true면 aria-expanded="true"를 출력한다', () => {
    render(<IconButton icon={PanelLeftClose} title="사이드바 접기" ariaExpanded />);
    const btn = screen.getByRole("button", { name: "사이드바 접기" });
    expect(btn.getAttribute("aria-expanded")).toBe("true");
  });

  test('ariaExpanded가 false면 aria-expanded="false"를 출력한다', () => {
    render(
      <IconButton
        icon={PanelLeftClose}
        title="사이드바 펼치기"
        ariaExpanded={false}
      />
    );
    const btn = screen.getByRole("button", { name: "사이드바 펼치기" });
    expect(btn.getAttribute("aria-expanded")).toBe("false");
  });

  test("ariaExpanded 미지정 시 aria-expanded 속성 자체가 없다 (기존 사용처 무영향)", () => {
    render(<IconButton icon={PanelLeftClose} title="알림" />);
    const btn = screen.getByRole("button", { name: "알림" });
    expect(btn.getAttribute("aria-expanded")).toBeNull();
  });
});

// ── US1: 버튼 하나로 사이드바 접고 펼치기 ───────────────────────────────

describe("US1: 사이드바 접기/펼치기 토글", () => {
  test('기본 렌더 — 사이드바(nav) 존재 + "사이드바 접기" 버튼이 aria-expanded="true"', async () => {
    renderShell();
    await screen.findByPlaceholderText(SEARCH_PLACEHOLDER);
    const collapseBtn = screen.getByRole("button", { name: "사이드바 접기" });
    expect(collapseBtn.getAttribute("aria-expanded")).toBe("true");
  });

  test('접기 클릭 — 사이드바 전체가 사라지고 "사이드바 펼치기" 버튼이 aria-expanded="false"로 남는다', async () => {
    renderShell();
    await screen.findByPlaceholderText(SEARCH_PLACEHOLDER);

    fireEvent.click(screen.getByRole("button", { name: "사이드바 접기" }));

    expect(screen.queryByPlaceholderText(SEARCH_PLACEHOLDER)).toBeNull();
    expect(screen.queryByRole("button", { name: "홈" })).toBeNull();
    expect(screen.queryByRole("button", { name: "사이드바 접기" })).toBeNull();
    const expandBtn = screen.getByRole("button", { name: "사이드바 펼치기" });
    expect(expandBtn.getAttribute("aria-expanded")).toBe("false");
  });

  test("다시 펼치기 — 사이드바가 복귀하고 접기 전 검색어가 유지된다 (FR-008)", async () => {
    renderShell();
    const search = await screen.findByPlaceholderText(SEARCH_PLACEHOLDER);
    fireEvent.change(search, { target: { value: "회의" } });

    fireEvent.click(screen.getByRole("button", { name: "사이드바 접기" }));
    fireEvent.click(screen.getByRole("button", { name: "사이드바 펼치기" }));

    const restored = screen.getByPlaceholderText(
      SEARCH_PLACEHOLDER
    ) as HTMLInputElement;
    expect(restored.value).toBe("회의");
    expect(
      screen
        .getByRole("button", { name: "사이드바 접기" })
        .getAttribute("aria-expanded")
    ).toBe("true");
  });

  test("US2: 접힌 채 다른 화면으로 이동해도 접힘이 유지된다 (FR-005)", async () => {
    const view = renderShell();
    await screen.findByPlaceholderText(SEARCH_PLACEHOLDER);
    fireEvent.click(screen.getByRole("button", { name: "사이드바 접기" }));

    // 앱 내 이동 시뮬레이션: AppShell은 레이아웃이라 언마운트되지 않고
    // pathname만 바뀐다 (research.md §4 — App Router 레이아웃 상태 보존)
    vi.mocked(usePathname).mockReturnValue("/posts/post-1");
    view.rerender(
      <AppProvider>
        <AppShell>
          <div>본문</div>
        </AppShell>
      </AppProvider>
    );

    expect(screen.queryByPlaceholderText(SEARCH_PLACEHOLDER)).toBeNull();
    const expandBtn = screen.getByRole("button", { name: "사이드바 펼치기" });
    expect(expandBtn.getAttribute("aria-expanded")).toBe("false");
  });

  test("연속 3연타 — 최종 상태가 클릭 횟수에 수렴한다 (접힘)", async () => {
    renderShell();
    await screen.findByPlaceholderText(SEARCH_PLACEHOLDER);

    fireEvent.click(screen.getByRole("button", { name: "사이드바 접기" }));
    fireEvent.click(screen.getByRole("button", { name: "사이드바 펼치기" }));
    fireEvent.click(screen.getByRole("button", { name: "사이드바 접기" }));

    expect(screen.queryByPlaceholderText(SEARCH_PLACEHOLDER)).toBeNull();
    expect(
      screen.getByRole("button", { name: "사이드바 펼치기" })
    ).toBeTruthy();
  });
});

// ── US3: 다시 방문해도 마지막 상태 기억 (계약 §1) ───────────────────────

describe("US3: 접힘/펼침 상태 영속화", () => {
  test('저장값이 "collapsed"면 첫 렌더부터 접힌 상태로 나타난다', async () => {
    localStorage.setItem(SIDEBAR_KEY, "collapsed");
    renderShell();

    const expandBtn = await screen.findByRole("button", {
      name: "사이드바 펼치기",
    });
    expect(expandBtn.getAttribute("aria-expanded")).toBe("false");
    expect(screen.queryByPlaceholderText(SEARCH_PLACEHOLDER)).toBeNull();
  });

  test("저장값이 무효(banana)면 펼침 기본값으로 나타나고 오류가 없다", async () => {
    localStorage.setItem(SIDEBAR_KEY, "banana");
    renderShell();

    await screen.findByPlaceholderText(SEARCH_PLACEHOLDER);
    expect(
      screen.getByRole("button", { name: "사이드바 접기" })
    ).toBeTruthy();
  });

  test('토글할 때마다 localStorage에 다음 상태가 기록된다 ("collapsed" ↔ "expanded")', async () => {
    renderShell();
    await screen.findByPlaceholderText(SEARCH_PLACEHOLDER);

    fireEvent.click(screen.getByRole("button", { name: "사이드바 접기" }));
    expect(localStorage.getItem(SIDEBAR_KEY)).toBe("collapsed");

    fireEvent.click(screen.getByRole("button", { name: "사이드바 펼치기" }));
    expect(localStorage.getItem(SIDEBAR_KEY)).toBe("expanded");
  });
});
