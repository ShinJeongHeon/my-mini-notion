import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { usePathname, useRouter } from "next/navigation";
import { PanelLeftClose } from "lucide-react";
import { IconButton } from "@/components/ui/IconButton";
import { AppShell } from "@/components/AppShell";
import { AppProvider } from "@/lib/store";
import { googleSession, resetSupabaseMock, state } from "./helpers/supabase-mock";

vi.mock("@/lib/supabase", () => import("./helpers/supabase-mock"));

vi.mock("next/navigation", () => ({
  useRouter: vi.fn(),
  usePathname: vi.fn(),
}));

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
  resetSupabaseMock();
  state.session = googleSession;
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

// ── IconButton 표준 button 속성 통과 (계약 §2) ──────────────────────────

describe("IconButton aria-expanded 통과", () => {
  test('aria-expanded가 true면 aria-expanded="true"를 출력한다', () => {
    render(
      <IconButton icon={PanelLeftClose} title="사이드바 접기" aria-expanded />
    );
    const btn = screen.getByRole("button", { name: "사이드바 접기" });
    expect(btn.getAttribute("aria-expanded")).toBe("true");
  });

  test('aria-expanded가 false면 aria-expanded="false"를 출력한다', () => {
    render(
      <IconButton
        icon={PanelLeftClose}
        title="사이드바 펼치기"
        aria-expanded={false}
      />
    );
    const btn = screen.getByRole("button", { name: "사이드바 펼치기" });
    expect(btn.getAttribute("aria-expanded")).toBe("false");
  });

  test("미지정 시 aria-expanded 속성 자체가 없다 (기존 사용처 무영향)", () => {
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
