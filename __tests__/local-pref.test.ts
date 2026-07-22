// lib/local-pref 계약 테스트 — 기기 로컬 UI 선호값 접근자.
// (다크 모드 contracts §4 · 사이드바 접힘 계약 §1이 공유하는 단일 메커니즘)
import { afterEach, expect, test, vi } from "vitest";
import { readLocalPref, writeLocalPref } from "@/lib/local-pref";

const KEY = "pref-key";
const ALLOWED = ["light", "dark"] as const;

afterEach(() => {
  localStorage.clear();
  vi.restoreAllMocks();
});

test("write→read 라운드트립: 허용값은 그대로 돌아온다", () => {
  writeLocalPref(KEY, "dark");
  expect(readLocalPref(KEY, ALLOWED)).toBe("dark");
});

test("허용 목록에 없는 저장값은 null (무효값 폴백)", () => {
  localStorage.setItem(KEY, "banana");
  expect(readLocalPref(KEY, ALLOWED)).toBeNull();
});

test("키가 없으면 null", () => {
  expect(readLocalPref(KEY, ALLOWED)).toBeNull();
});

test("getItem이 throw해도 readLocalPref는 null을 돌려준다", () => {
  vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
    throw new Error("storage blocked");
  });
  expect(readLocalPref(KEY, ALLOWED)).toBeNull();
});

test("writeLocalPref가 값을 저장한다", () => {
  writeLocalPref(KEY, "light");
  expect(localStorage.getItem(KEY)).toBe("light");
});

test("setItem이 throw해도 writeLocalPref는 예외를 삼킨다 (best-effort)", () => {
  vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
    throw new Error("QuotaExceededError");
  });
  expect(() => writeLocalPref(KEY, "dark")).not.toThrow();
});
