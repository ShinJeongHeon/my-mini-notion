import { afterEach, expect, test, vi } from "vitest";
import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import {
  THEME_INIT_SCRIPT,
  THEME_STORAGE_KEY,
  readLocalPref,
  resolveTheme,
  useTheme,
  writeLocalPref,
} from "@/lib/theme";
import { installMatchMedia } from "./helpers/match-media";

afterEach(() => {
  cleanup();
  localStorage.clear();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  delete document.documentElement.dataset.theme;
});

// ---------------------------------------------------------------------------
// resolveTheme — data-model.md의 유효 테마 진리표
// ---------------------------------------------------------------------------

test.each([
  // 명시 선택은 시스템 설정보다 우선한다 (FR-006)
  ["light", false, "light"],
  ["light", true, "light"],
  ["dark", false, "dark"],
  ["dark", true, "dark"],
  // 저장값 부재 → 시스템 따름 (FR-005)
  [null, false, "light"],
  [null, true, "dark"],
  [undefined, false, "light"],
  [undefined, true, "dark"],
  // 무효값은 "미설정"으로 정규화 → 시스템 따름 (contracts §2)
  ["blue", false, "light"],
  ["blue", true, "dark"],
  [123, true, "dark"],
])(
  "resolveTheme(%j, systemDark=%j) → %j",
  (stored, systemDark, expected) => {
    expect(resolveTheme(stored, systemDark as boolean)).toBe(expected);
  }
);

// ---------------------------------------------------------------------------
// THEME_STORAGE_KEY — 저장 계약의 키 (contracts §2)
// ---------------------------------------------------------------------------

test('THEME_STORAGE_KEY is "mini-notion-theme"', () => {
  expect(THEME_STORAGE_KEY).toBe("mini-notion-theme");
});

// ---------------------------------------------------------------------------
// readLocalPref / writeLocalPref — 제네릭 기기 로컬 선호값 접근자 (contracts §4)
// ---------------------------------------------------------------------------

test("readLocalPref returns the stored value when it is in the allowed list", () => {
  localStorage.setItem("pref-key", "dark");
  expect(readLocalPref("pref-key", ["light", "dark"])).toBe("dark");
});

test("readLocalPref returns null for a stored value outside the allowed list", () => {
  localStorage.setItem("pref-key", "banana");
  expect(readLocalPref("pref-key", ["light", "dark"])).toBeNull();
});

test("readLocalPref returns null when the key is absent", () => {
  expect(readLocalPref("pref-key", ["light", "dark"])).toBeNull();
});

test("readLocalPref returns null instead of throwing when storage access is blocked", () => {
  vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
    throw new Error("storage blocked");
  });
  expect(readLocalPref("pref-key", ["light", "dark"])).toBeNull();
});

test("writeLocalPref persists the value", () => {
  writeLocalPref("pref-key", "light");
  expect(localStorage.getItem("pref-key")).toBe("light");
});

test("writeLocalPref does not throw when storage access is blocked", () => {
  vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
    throw new Error("storage blocked");
  });
  expect(() => writeLocalPref("pref-key", "dark")).not.toThrow();
});

// ---------------------------------------------------------------------------
// useTheme — 토글 버튼용 훅 (contracts §4, US1)
// ---------------------------------------------------------------------------

test("useTheme applies the resolved theme to <html data-theme> on mount", () => {
  installMatchMedia(false);
  const { result } = renderHook(() => useTheme());
  expect(document.documentElement.dataset.theme).toBe("light");
  expect(result.current.theme).toBe("light");
});

test("useTheme resolves to dark on mount when the system is dark and nothing is stored", () => {
  installMatchMedia(true);
  const { result } = renderHook(() => useTheme());
  expect(document.documentElement.dataset.theme).toBe("dark");
  expect(result.current.theme).toBe("dark");
});

test("useTheme respects a stored explicit choice over the system setting on mount", () => {
  installMatchMedia(false);
  localStorage.setItem(THEME_STORAGE_KEY, "dark");
  renderHook(() => useTheme());
  expect(document.documentElement.dataset.theme).toBe("dark");
});

test("toggle() flips <html data-theme> immediately and updates theme", () => {
  installMatchMedia(false);
  const { result } = renderHook(() => useTheme());

  act(() => result.current.toggle());
  expect(document.documentElement.dataset.theme).toBe("dark");
  expect(result.current.theme).toBe("dark");

  act(() => result.current.toggle());
  expect(document.documentElement.dataset.theme).toBe("light");
  expect(result.current.theme).toBe("light");
});

// ---------------------------------------------------------------------------
// THEME_INIT_SCRIPT — 첫 페인트 전 no-FOUC 초기화 (contracts §1·§4, US2)
// 실제 DOM·실제 localStorage에 대해 스크립트 문자열을 실행해 검증한다.
// ---------------------------------------------------------------------------

function runInitScript() {
  new Function(THEME_INIT_SCRIPT)();
}

test("THEME_INIT_SCRIPT applies a stored dark choice to <html> immediately", () => {
  installMatchMedia(false);
  localStorage.setItem(THEME_STORAGE_KEY, "dark");
  runInitScript();
  expect(document.documentElement.dataset.theme).toBe("dark");
});

test("THEME_INIT_SCRIPT keeps a stored light choice even when the system is dark", () => {
  installMatchMedia(true);
  localStorage.setItem(THEME_STORAGE_KEY, "light");
  runInitScript();
  expect(document.documentElement.dataset.theme).toBe("light");
});

test("THEME_INIT_SCRIPT normalizes an invalid stored value to the system theme", () => {
  installMatchMedia(true);
  localStorage.setItem(THEME_STORAGE_KEY, "banana");
  runInitScript();
  expect(document.documentElement.dataset.theme).toBe("dark");
});

test("THEME_INIT_SCRIPT follows the system theme when nothing is stored", () => {
  installMatchMedia(false);
  runInitScript();
  expect(document.documentElement.dataset.theme).toBe("light");
});

test("THEME_INIT_SCRIPT does not throw when storage is blocked and falls back to the system", () => {
  installMatchMedia(true);
  vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
    throw new Error("storage blocked");
  });
  expect(() => runInitScript()).not.toThrow();
  expect(document.documentElement.dataset.theme).toBe("dark");
});

// ---------------------------------------------------------------------------
// 시스템 테마 실시간 추종 — 가드된 change 리스너 (FR-005·FR-006, US3)
// ---------------------------------------------------------------------------

test("THEME_INIT_SCRIPT follows live system changes while nothing is stored", () => {
  const media = installMatchMedia(false);
  runInitScript();
  expect(document.documentElement.dataset.theme).toBe("light");

  media.setSystemDark(true);
  expect(document.documentElement.dataset.theme).toBe("dark");

  media.setSystemDark(false);
  expect(document.documentElement.dataset.theme).toBe("light");
});

test("THEME_INIT_SCRIPT ignores system changes when an explicit choice was stored", () => {
  const media = installMatchMedia(false);
  localStorage.setItem(THEME_STORAGE_KEY, "light");
  runInitScript();

  media.setSystemDark(true);
  expect(document.documentElement.dataset.theme).toBe("light");
});

test("THEME_INIT_SCRIPT stops following the system after the user picks a theme mid-session", () => {
  const media = installMatchMedia(false);
  runInitScript();
  expect(document.documentElement.dataset.theme).toBe("light");

  // 사용 중 토글로 명시 선택이 저장된 상황 — 이후 시스템 변경은 무시(FR-006)
  localStorage.setItem(THEME_STORAGE_KEY, "light");
  media.setSystemDark(true);
  expect(document.documentElement.dataset.theme).toBe("light");
});

test("useTheme reflects external data-theme changes so the toggle label stays in sync", async () => {
  installMatchMedia(false);
  const { result } = renderHook(() => useTheme());
  expect(result.current.theme).toBe("light");

  // 시스템 추종 리스너(THEME_INIT_SCRIPT)가 속성을 바꾼 상황 — DOM 속성이 원본
  act(() => {
    document.documentElement.dataset.theme = "dark";
  });
  await waitFor(() => expect(result.current.theme).toBe("dark"));
});
