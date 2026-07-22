// formatDate — created_at이 서버 발급으로 바뀌면서 생긴 시계 오차 엣지 회귀 테스트.
// 클라이언트 시계가 서버보다 살짝 느리면 "방금 만든 글"의 타임스탬프가
// 로컬 기준 미래(다음 날짜)일 수 있다 — 내일 날짜로 표시되면 안 된다.
import { afterEach, expect, test, vi } from "vitest";
import { formatDate } from "@/lib/store";

vi.mock("@/lib/supabase", () => import("./helpers/supabase-mock"));

afterEach(() => {
  vi.useRealTimers();
});

test("서버 시계가 빨라 다음 날짜의 타임스탬프여도 '오늘'로 표시한다", () => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(2026, 6, 23, 23, 59, 0)); // 로컬 7/23 23:59
  const serverIssued = new Date(2026, 6, 24, 0, 1, 0).getTime(); // 서버 7/24 00:01
  expect(formatDate(serverIssued)).toBe("오늘");
});

test("같은 날은 '오늘', 하루 전은 '어제', 그 이전은 절대 날짜", () => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(2026, 6, 23, 12, 0, 0));
  expect(formatDate(new Date(2026, 6, 23, 9, 0, 0).getTime())).toBe("오늘");
  expect(formatDate(new Date(2026, 6, 22, 23, 0, 0).getTime())).toBe("어제");
  expect(formatDate(new Date(2026, 6, 20, 9, 0, 0).getTime())).toBe("7월 20일");
});
