"use client";

import { THEME_INIT_SCRIPT } from "@/lib/theme";

// 루트 레이아웃 <head>에서 렌더되는 no-FOUC 인라인 스크립트.
// 클라이언트 컴포넌트도 SSR 시 초기 HTML에 포함되므로 첫 페인트 전에 실행된다
// (번들 문서 preventing-flash-before-hydration.md의 Themes 패턴).
export function ThemeScript() {
  return <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />;
}
