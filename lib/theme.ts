"use client";

// 다크모드 테마 모듈 — 계약: specs/003-dark-mode/contracts/theme-contract.md
// 이 Next.js 버전은 서버 컴포넌트가 import하는 모듈의 훅 import 자체를 거부하므로
// 모듈 전체를 클라이언트로 두고, 레이아웃에는 components/ThemeScript.tsx(클라이언트
// 컴포넌트 — SSR 시에도 <head>에 렌더됨)를 통해 THEME_INIT_SCRIPT를 주입한다.

import { useCallback, useEffect, useState } from "react";
import { readLocalPref, writeLocalPref } from "@/lib/local-pref";

export type Theme = "light" | "dark";

export const THEME_STORAGE_KEY = "mini-notion-theme";

export function resolveTheme(stored: unknown, systemDark: boolean): Theme {
  if (stored === "light" || stored === "dark") return stored;
  return systemDark ? "dark" : "light";
}

export { readLocalPref, writeLocalPref };

// 루트 레이아웃 <head>의 인라인 스크립트 본문 — 첫 페인트 전에 실행되어
// 반대 테마 플래시(FOUC)를 차단한다 (번들 문서 preventing-flash-before-hydration.md).
// resolveTheme와 동일한 해석 규칙을 ES5 문법으로 인라인한다.
export const THEME_INIT_SCRIPT = `(function () {
  var stored = null;
  try { stored = window.localStorage.getItem("${THEME_STORAGE_KEY}"); } catch (e) {}
  var mql = null;
  try { mql = window.matchMedia("(prefers-color-scheme: dark)"); } catch (e) {}
  var theme = stored === "light" || stored === "dark"
    ? stored
    : (mql && mql.matches ? "dark" : "light");
  document.documentElement.setAttribute("data-theme", theme);
  if (mql && mql.addEventListener) {
    mql.addEventListener("change", function (e) {
      var s = null;
      try { s = window.localStorage.getItem("${THEME_STORAGE_KEY}"); } catch (err) {}
      if (s === "light" || s === "dark") return; /* 명시 선택 우선 — FR-006 가드 */
      document.documentElement.setAttribute("data-theme", e.matches ? "dark" : "light");
    });
  }
})();`;

function systemPrefersDark(): boolean {
  return (
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-color-scheme: dark)").matches
  );
}

export function useTheme(): { theme: Theme; toggle: () => void } {
  const [theme, setTheme] = useState<Theme>(() => {
    // SSR/프리렌더에는 DOM이 없다 — 셸은 어차피 null을 렌더하므로 기본값이면 충분
    // (번들 문서 preventing-flash-before-hydration.md의 lazy initializer 가드).
    if (typeof window === "undefined") return "light";
    // DOM 속성이 원본(data-model.md) — 인라인 스크립트가 이미 세팅했다면 채택
    const current = document.documentElement.dataset.theme;
    if (current === "light" || current === "dark") return current;
    return resolveTheme(
      readLocalPref(THEME_STORAGE_KEY, ["light", "dark"]),
      systemPrefersDark()
    );
  });

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  // DOM 속성이 원본 — THEME_INIT_SCRIPT의 시스템 추종 리스너가 속성을 바꾸면
  // 훅 상태(토글 라벨)도 따라간다 (FR-003 × FR-005).
  useEffect(() => {
    const observer = new MutationObserver(() => {
      const current = document.documentElement.dataset.theme;
      if (current === "light" || current === "dark") setTheme(current);
    });
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });
    return () => observer.disconnect();
  }, []);

  const toggle = useCallback(() => {
    const next: Theme = theme === "dark" ? "light" : "dark";
    writeLocalPref(THEME_STORAGE_KEY, next); // 쓰기는 토글 클릭 시에만 (contracts §2)
    setTheme(next);
  }, [theme]);

  return { theme, toggle };
}
