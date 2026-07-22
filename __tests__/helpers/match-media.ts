import { vi } from "vitest";

// jsdom은 matchMedia의 change 이벤트 디스패치를 구현하지 않으므로, 리스너를
// 캡처할 수 있는 완전한 구현으로 대체한다. 실제 MediaQueryList API 표면
// (matches/media/onchange/add·removeEventListener/add·removeListener/dispatchEvent)
// 전체를 반영한다 — 불완전 목 금지 (헌법 II, research.md §6).

type ChangeListener = (ev: { matches: boolean; media: string }) => void;

const DARK_QUERY = "(prefers-color-scheme: dark)";

export function installMatchMedia(initialDark: boolean) {
  const state = { dark: initialDark };
  const listeners = new Set<ChangeListener>();

  const makeList = (query: string) => ({
    get matches() {
      return query === DARK_QUERY ? state.dark : false;
    },
    media: query,
    onchange: null as ChangeListener | null,
    addEventListener(type: string, cb: ChangeListener) {
      if (type === "change" && query === DARK_QUERY) listeners.add(cb);
    },
    removeEventListener(type: string, cb: ChangeListener) {
      if (type === "change") listeners.delete(cb);
    },
    addListener(cb: ChangeListener) {
      if (query === DARK_QUERY) listeners.add(cb);
    },
    removeListener(cb: ChangeListener) {
      listeners.delete(cb);
    },
    dispatchEvent() {
      return true;
    },
  });

  vi.stubGlobal(
    "matchMedia",
    vi.fn((query: string) => makeList(query))
  );

  return {
    /** 시스템 테마를 바꾸고 등록된 change 리스너에 통지한다. */
    setSystemDark(dark: boolean) {
      state.dark = dark;
      listeners.forEach((cb) => cb({ matches: dark, media: DARK_QUERY }));
    },
    get listenerCount() {
      return listeners.size;
    },
  };
}
