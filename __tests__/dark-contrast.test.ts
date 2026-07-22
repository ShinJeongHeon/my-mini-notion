// 다크 모드 대비 회귀 테스트 — DESIGN.md §1.8은 다크 페어링의 WCAG AA(4.5:1)
// 충족을 명세한다. 토큰 값이 바뀌어 기준 아래로 내려가면 여기서 잡는다.
import { readFileSync } from "node:fs";
import path from "node:path";
import { expect, test } from "vitest";

const css = readFileSync(
  path.join(process.cwd(), "app", "globals.css"),
  "utf8"
);
const darkBlock = css.slice(css.indexOf('html[data-theme="dark"]'));

function token(name: string, scope: string): string {
  const m = new RegExp(`${name}:\\s*(#[0-9a-fA-F]{6})`).exec(scope);
  if (!m) throw new Error(`token not found: ${name}`);
  return m[1];
}

// WCAG 2.x 상대 휘도·대비율.
function luminance(hex: string): number {
  const channel = (i: number) => {
    const c = parseInt(hex.slice(1 + i * 2, 3 + i * 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(0) + 0.7152 * channel(1) + 0.0722 * channel(2);
}

function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

test("다크: 삭제 버튼 hover — --status-danger 텍스트가 --status-danger-soft 배경 위에서 AA(4.5:1)를 지킨다", () => {
  // --status-danger는 다크에서 오버라이드되지 않고 --red-500(#f0483e)을 상속한다.
  const dangerText = token("--red-500", css);
  const hoverBg = token("--status-danger-soft", darkBlock);
  expect(contrast(dangerText, hoverBg)).toBeGreaterThanOrEqual(4.5);
});
