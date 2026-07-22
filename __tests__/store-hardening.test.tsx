// 코드리뷰에서 확인된 스토어 결함들의 회귀 테스트 (2026-07 4기능 병합 리뷰).
// 각 테스트는 결함 하나를 재현한다 — 수정 전에는 반드시 실패해야 한다.
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { AppProvider, useApp } from "@/lib/store";
import {
  googleSession,
  makePageRow,
  resetSupabaseMock,
  spies,
  state,
} from "./helpers/supabase-mock";

vi.mock("@/lib/supabase", () => import("./helpers/supabase-mock"));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}));

function gate() {
  let resolve!: () => void;
  const promise = new Promise<void>((r) => {
    resolve = r;
  });
  return { promise, resolve };
}

function Probe() {
  const app = useApp();
  return (
    <div>
      <span data-testid="posts-loaded">{String(app.postsLoaded)}</span>
      <span data-testid="posts-count">{String(app.posts.length)}</span>
      <span data-testid="first-content">{app.posts[0]?.content ?? ""}</span>
      <span data-testid="posts-ids">
        {app.posts.map((p) => p.id).join(",")}
      </span>
      <span data-testid="error">{app.postsError ?? ""}</span>
      <span data-testid="display-name">{app.displayName}</span>
      <span data-testid="nickname">{app.nickname ?? ""}</span>
      <button onClick={() => void app.createPost("레이스 글")}>등록</button>
      <button
        onClick={() =>
          app.updatePost(app.posts[0]?.id ?? "", { content: "새 본문" })
        }
      >
        본문 수정
      </button>
      <button
        onClick={() =>
          void app.saveProfile({ name: "새 별명", introduction: "소개" })
        }
      >
        프로필 저장
      </button>
    </div>
  );
}

function renderProbe() {
  return render(
    <AppProvider>
      <Probe />
    </AppProvider>
  );
}

beforeEach(() => {
  localStorage.clear();
  resetSupabaseMock();
});

afterEach(() => {
  vi.useRealTimers();
  cleanup();
  vi.clearAllMocks();
});

// ── F1: 초기 목록 조회 실패는 "빈 계정"으로 위장되면 안 된다 ────────────

test("초기 목록 조회가 실패하면 postsLoaded를 켜지 않고 실패 안내를 표시한다", async () => {
  state.session = googleSession;
  state.pageRows = [makePageRow({ id: "p1" })];
  state.selectError = { message: "network down" };

  renderProbe();
  await waitFor(() => expect(spies.pageSelectOrder).toHaveBeenCalled());

  await waitFor(() =>
    expect(screen.getByTestId("error").textContent).toContain(
      "글 목록을 불러오지 못했어요"
    )
  );
  // 실패는 로딩 완료가 아니다 — 빈 목록/not-found 판정을 열어주면 안 된다.
  expect(screen.getByTestId("posts-loaded").textContent).toBe("false");
});

test("조회 실패 후 SIGNED_IN 재발화가 재시도해 목록을 복구한다", async () => {
  state.session = googleSession;
  state.pageRows = [makePageRow({ id: "p1" })];
  state.selectError = { message: "network down" };

  renderProbe();
  await waitFor(() =>
    expect(screen.getByTestId("error").textContent).not.toBe("")
  );

  state.selectError = null;
  act(() => {
    state.authCallback?.("SIGNED_IN", state.session);
  });

  await waitFor(() =>
    expect(screen.getByTestId("posts-loaded").textContent).toBe("true")
  );
  expect(screen.getByTestId("posts-count").textContent).toBe("1");
  expect(screen.getByTestId("error").textContent).toBe("");
});

// ── F3: 0행 매칭 update는 성공이 아니다 ────────────────────────────────

test("다른 곳에서 삭제된 글의 자동 저장(0행 매칭)은 실패로 처리되어 재동기화된다", async () => {
  state.session = googleSession;
  state.pageRows = [makePageRow({ id: "p1", content: "본문" })];

  renderProbe();
  await waitFor(() =>
    expect(screen.getByTestId("posts-count").textContent).toBe("1")
  );

  // 다른 탭/기기에서 삭제된 상황 — 서버에는 더 이상 이 행이 없다.
  state.pageRows = [];

  vi.useFakeTimers();
  fireEvent.click(screen.getByRole("button", { name: "본문 수정" }));
  await act(async () => {
    await vi.advanceTimersByTimeAsync(700);
  });
  vi.useRealTimers();

  // error:null이어도 0행 매칭이면 저장 실패다 — "자동 저장됨" 거짓말 금지.
  await waitFor(() =>
    expect(screen.getByTestId("error").textContent).toContain(
      "저장하지 못했어요"
    )
  );
  await waitFor(() =>
    expect(screen.getByTestId("posts-count").textContent).toBe("0")
  );
});

// ── F4: 탭 숨김 시 대기 중 저장 즉시 플러시 ────────────────────────────

test("디바운스 대기 중 탭이 숨겨지면 pending 저장이 즉시 전송된다", async () => {
  state.session = googleSession;
  state.pageRows = [makePageRow({ id: "p1" })];

  renderProbe();
  await waitFor(() =>
    expect(screen.getByTestId("posts-count").textContent).toBe("1")
  );

  vi.useFakeTimers();
  fireEvent.click(screen.getByRole("button", { name: "본문 수정" }));
  expect(spies.pageUpdate).not.toHaveBeenCalled();

  const desc = Object.getOwnPropertyDescriptor(document, "visibilityState");
  Object.defineProperty(document, "visibilityState", {
    value: "hidden",
    configurable: true,
  });
  await act(async () => {
    fireEvent(document, new Event("visibilitychange"));
  });
  if (desc) Object.defineProperty(document, "visibilityState", desc);
  else delete (document as any).visibilityState;
  vi.useRealTimers();

  // 600ms를 기다리지 않고 즉시 전송되어야 한다.
  expect(spies.pageUpdate).toHaveBeenCalledWith({ content: "새 본문" }, "p1");
});

// ── F5: 초기 조회 스냅샷이 방금 만든 글을 지우면 안 된다 ────────────────

test("초기 조회가 느릴 때 만든 새 글이 조회 응답에 덮여 사라지지 않는다", async () => {
  state.session = googleSession;
  state.pageRows = [makePageRow({ id: "p1" })];
  const g = gate();
  state.selectGate = g.promise;

  renderProbe();
  await waitFor(() => expect(spies.pageSelectOrder).toHaveBeenCalled());

  // 초기 select가 in-flight인 동안 새 글 등록.
  fireEvent.click(screen.getByRole("button", { name: "등록" }));
  await waitFor(() => expect(spies.pageInsert).toHaveBeenCalled());

  await act(async () => {
    g.resolve();
    await g.promise;
  });
  state.selectGate = null;

  // insert 이전 스냅샷이 도착해도 새 글은 목록에 남아야 한다.
  await waitFor(() =>
    expect(screen.getByTestId("posts-count").textContent).toBe("2")
  );
  expect(screen.getByTestId("posts-ids").textContent).toContain(
    "00000000-0000-4000-8000-000000000001"
  );
  expect(screen.getByTestId("posts-ids").textContent).toContain("p1");
});

// ── F6: 재동기화가 입력 중인 내용을 되돌리면 안 된다 ────────────────────

test("저장 실패 재동기화가 그 사이 입력된 pending 편집을 덮어쓰지 않는다", async () => {
  state.session = googleSession;
  state.pageRows = [makePageRow({ id: "p1", content: "서버 본문" })];

  renderProbe();
  await waitFor(() =>
    expect(screen.getByTestId("posts-count").textContent).toBe("1")
  );

  vi.useFakeTimers();
  state.updateError = { message: "network down" };
  fireEvent.click(screen.getByRole("button", { name: "본문 수정" })); // "새 본문"
  const g = gate();
  state.selectGate = g.promise; // 재동기화 refetch를 붙잡는다
  await act(async () => {
    await vi.advanceTimersByTimeAsync(700); // 저장 실패 → 재동기화 시작
  });

  // 재동기화가 끝나기 전 사용자가 계속 입력(새 pending).
  fireEvent.click(screen.getByRole("button", { name: "본문 수정" }));
  state.updateError = null;

  await act(async () => {
    g.resolve();
    await vi.advanceTimersByTimeAsync(700);
  });
  state.selectGate = null;
  vi.useRealTimers();

  // 화면은 서버의 옛 본문("서버 본문")으로 되돌아가면 안 된다.
  expect(screen.getByTestId("first-content").textContent).toBe("새 본문");
});

// ── F7: 로그아웃·계정 전환 시 프로필 캐시가 새면 안 된다 ────────────────

test("로그아웃하면 프로필 상태와 mini-notion-v1 캐시가 함께 비워진다", async () => {
  state.session = googleSession;
  state.profileRow = { name: "민수짱", image_path: null, introduction: "소개" };

  renderProbe();
  await waitFor(() =>
    expect(screen.getByTestId("display-name").textContent).toBe("민수짱")
  );

  act(() => {
    state.authCallback?.("SIGNED_OUT", null);
  });

  expect(screen.getByTestId("nickname").textContent).toBe("");
  expect(localStorage.getItem("mini-notion-v1")).toBeNull();
});

test("다른 계정의 mini-notion-v1 캐시는 프리필에 쓰이지 않는다", async () => {
  localStorage.setItem(
    "mini-notion-v1",
    JSON.stringify({
      userId: "user-9",
      nickname: "A별명",
      introduction: "A소개",
      imagePath: null,
    })
  );
  state.session = googleSession; // user-1

  renderProbe();

  // 첫 렌더부터 다른 계정의 캐시 별명이 보이면 안 된다.
  expect(screen.getByTestId("display-name").textContent).not.toBe("A별명");
  await waitFor(() => expect(spies.profileSelect).toHaveBeenCalled());
  expect(screen.getByTestId("display-name").textContent).not.toBe("A별명");
});

// ── F8: 성공한 다음 저장은 postsError를 지운다 ─────────────────────────

test("자동 저장이 한 번 실패해도 다음 저장 성공 시 오류 안내가 사라진다", async () => {
  state.session = googleSession;
  state.pageRows = [makePageRow({ id: "p1" })];

  renderProbe();
  await waitFor(() =>
    expect(screen.getByTestId("posts-count").textContent).toBe("1")
  );

  vi.useFakeTimers();
  state.updateError = { message: "blip" };
  fireEvent.click(screen.getByRole("button", { name: "본문 수정" }));
  await act(async () => {
    await vi.advanceTimersByTimeAsync(700);
  });
  expect(screen.getByTestId("error").textContent).toContain(
    "저장하지 못했어요"
  );

  state.updateError = null;
  fireEvent.click(screen.getByRole("button", { name: "본문 수정" }));
  await act(async () => {
    await vi.advanceTimersByTimeAsync(700);
  });
  vi.useRealTimers();

  expect(screen.getByTestId("error").textContent).toBe("");
});

// ── F11: 재로그인 시 postsLoaded 래치 해제 ─────────────────────────────

test("로그아웃 후 재로그인하면 목록 로딩이 끝날 때까지 postsLoaded가 false다", async () => {
  state.session = googleSession;
  state.pageRows = [makePageRow({ id: "p1" })];

  renderProbe();
  await waitFor(() =>
    expect(screen.getByTestId("posts-loaded").textContent).toBe("true")
  );

  vi.useFakeTimers();
  act(() => {
    state.authCallback?.("SIGNED_OUT", null);
  });
  act(() => {
    state.authCallback?.("SIGNED_IN", state.session);
  });

  // 재조회가 끝나기 전 — 빈 목록을 확정 상태처럼 보여주면 안 된다.
  expect(screen.getByTestId("posts-loaded").textContent).toBe("false");

  await act(async () => {
    await vi.advanceTimersByTimeAsync(0);
  });
  vi.useRealTimers();
  await waitFor(() =>
    expect(screen.getByTestId("posts-loaded").textContent).toBe("true")
  );
});

// ── F13: 이전 세션의 오류·재조회가 다음 세션으로 흐르면 안 된다 ─────────

test("로그아웃하면 남아 있던 postsError가 지워진다", async () => {
  state.session = googleSession;
  state.pageRows = [makePageRow({ id: "p1" })];

  renderProbe();
  await waitFor(() =>
    expect(screen.getByTestId("posts-count").textContent).toBe("1")
  );

  vi.useFakeTimers();
  state.updateError = { message: "blip" };
  fireEvent.click(screen.getByRole("button", { name: "본문 수정" }));
  await act(async () => {
    await vi.advanceTimersByTimeAsync(700);
  });
  vi.useRealTimers();
  expect(screen.getByTestId("error").textContent).not.toBe("");

  act(() => {
    state.authCallback?.("SIGNED_OUT", null);
  });
  expect(screen.getByTestId("error").textContent).toBe("");
});

test("로그아웃 시점에 in-flight였던 저장 실패는 무시된다(재동기화·오류 없음)", async () => {
  state.session = googleSession;
  state.pageRows = [makePageRow({ id: "p1" })];

  renderProbe();
  await waitFor(() =>
    expect(screen.getByTestId("posts-count").textContent).toBe("1")
  );
  const selectCallsBefore = spies.pageSelectOrder.mock.calls.length;

  vi.useFakeTimers();
  state.updateError = { message: "revoked" };
  const g = gate();
  state.updateGate = g.promise;
  fireEvent.click(screen.getByRole("button", { name: "본문 수정" }));
  await act(async () => {
    await vi.advanceTimersByTimeAsync(700); // 타이머 발화 → update in-flight
  });

  act(() => {
    state.authCallback?.("SIGNED_OUT", null); // 응답 도착 전 로그아웃
  });
  await act(async () => {
    g.resolve();
    await vi.advanceTimersByTimeAsync(0);
  });
  state.updateGate = null;
  vi.useRealTimers();

  // 이전 세션의 실패가 재동기화를 일으키거나 오류를 남기면 안 된다.
  expect(spies.pageSelectOrder.mock.calls.length).toBe(selectCallsBefore);
  expect(screen.getByTestId("error").textContent).toBe("");
});

// ── F14: 같은 사용자 재발화도 스로틀을 두고 최신화한다 ──────────────────

test("60초가 지난 뒤의 SIGNED_IN 재발화는 프로필·목록을 재동기화한다", async () => {
  vi.useFakeTimers();
  state.session = googleSession;
  state.profileRow = { name: "옛이름", image_path: null, introduction: null };
  state.pageRows = [makePageRow({ id: "p1" })];

  renderProbe();
  await act(async () => {
    await vi.advanceTimersByTimeAsync(0);
  });
  expect(screen.getByTestId("display-name").textContent).toBe("옛이름");

  // 다른 탭에서 프로필이 바뀐 상황.
  state.profileRow = { name: "새이름", image_path: null, introduction: null };
  await act(async () => {
    await vi.advanceTimersByTimeAsync(61_000);
  });
  act(() => {
    state.authCallback?.("SIGNED_IN", state.session); // 탭 포커스 복귀 재발화
  });
  await act(async () => {
    await vi.advanceTimersByTimeAsync(0);
  });
  vi.useRealTimers();

  await waitFor(() =>
    expect(screen.getByTestId("display-name").textContent).toBe("새이름")
  );
});

// ── F15: 프로필 저장 실패 시 화면에 미저장 값이 남으면 안 된다 ──────────

test("프로필 저장이 실패하면 displayName이 저장 안 된 값으로 바뀌지 않는다", async () => {
  state.session = googleSession;
  state.profileRow = { name: "김민수", image_path: null, introduction: null };
  state.profileUpdateError = { message: "network down" };

  renderProbe();
  await waitFor(() => expect(spies.profileSelect).toHaveBeenCalled());

  fireEvent.click(screen.getByRole("button", { name: "프로필 저장" }));
  await waitFor(() => expect(spies.profileUpdate).toHaveBeenCalled());

  expect(screen.getByTestId("display-name").textContent).toBe("김민수");
  // 실패한 값이 기기 캐시에도 남지 않는다.
  const raw = localStorage.getItem("mini-notion-v1");
  expect(raw && JSON.parse(raw).nickname).not.toBe("새 별명");
});
