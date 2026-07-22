import { afterEach, beforeEach, expect, test, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { AppProvider } from "@/lib/store";
import MyPage from "@/app/(app)/mypage/page";
import {
  googleSession,
  resetSupabaseMock,
  spies,
  state,
} from "./helpers/supabase-mock";

vi.mock("@/lib/supabase", () => import("./helpers/supabase-mock"));

function renderMyPage() {
  return render(
    <AppProvider>
      <MyPage />
    </AppProvider>
  );
}

beforeEach(() => {
  localStorage.clear();
  resetSupabaseMock();
  state.session = googleSession;
  state.profileRow = { name: "김민수", image_path: null, introduction: null };
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

test("자기소개 입력란이 별명 아래에 안내 문구와 함께 렌더된다", async () => {
  renderMyPage();
  const intro = screen.getByLabelText("자기소개");
  expect(intro.tagName).toBe("TEXTAREA");
  expect(intro.getAttribute("maxlength")).toBe("500");
  expect(intro.getAttribute("placeholder")).toBe("자기소개를 입력하세요");
  expect(intro.className).toContain("field-textarea");
  const nickname = screen.getByLabelText("별명");
  expect(
    nickname.compareDocumentPosition(intro) & Node.DOCUMENT_POSITION_FOLLOWING
  ).toBeTruthy();
  await waitFor(() => expect(spies.profileSelect).toHaveBeenCalled());
});

test("자기소개를 입력해 저장하면 별명과 함께 한 번의 업데이트로 저장되고 확인 노트가 보인다", async () => {
  renderMyPage();
  await waitFor(() => expect(spies.profileSelect).toHaveBeenCalled());
  fireEvent.change(screen.getByLabelText("자기소개"), {
    target: { value: "안녕하세요\n반갑습니다" },
  });
  fireEvent.click(screen.getByRole("button", { name: "변경사항 저장" }));
  await waitFor(() =>
    expect(spies.profileUpdate).toHaveBeenCalledWith(
      { name: "김민수", introduction: "안녕하세요\n반갑습니다" },
      "user-1"
    )
  );
  expect(screen.getByText("저장되었습니다")).toBeTruthy();
});

test("저장된 자기소개가 로딩 완료 후 입력란에 채워진다", async () => {
  state.profileRow = {
    name: "김민수",
    image_path: null,
    introduction: "기존 소개\n둘째 줄",
  };
  renderMyPage();
  await waitFor(() => {
    const intro = screen.getByLabelText("자기소개") as HTMLTextAreaElement;
    expect(intro.value).toBe("기존 소개\n둘째 줄");
  });
});

test("자기소개를 전부 지우고 저장하면 미등록(null)으로 저장되고 빈 입력란과 안내 문구가 남는다", async () => {
  state.profileRow = {
    name: "김민수",
    image_path: null,
    introduction: "지울 소개",
  };
  renderMyPage();
  await waitFor(() => {
    const intro = screen.getByLabelText("자기소개") as HTMLTextAreaElement;
    expect(intro.value).toBe("지울 소개");
  });
  fireEvent.change(screen.getByLabelText("자기소개"), {
    target: { value: "" },
  });
  fireEvent.click(screen.getByRole("button", { name: "변경사항 저장" }));
  await waitFor(() =>
    expect(spies.profileUpdate).toHaveBeenCalledWith(
      { name: "김민수", introduction: null },
      "user-1"
    )
  );
  const intro = screen.getByLabelText("자기소개") as HTMLTextAreaElement;
  expect(intro.value).toBe("");
  expect(intro.getAttribute("placeholder")).toBe("자기소개를 입력하세요");
});

test("저장이 실패하면 안내가 표시되고 입력한 내용은 유지된다", async () => {
  state.profileUpdateError = { message: "network error" };
  const alertSpy = vi.spyOn(window, "alert").mockImplementation(() => {});
  renderMyPage();
  await waitFor(() => expect(spies.profileSelect).toHaveBeenCalled());
  fireEvent.change(screen.getByLabelText("자기소개"), {
    target: { value: "지워지면 안 되는 내용" },
  });
  fireEvent.click(screen.getByRole("button", { name: "변경사항 저장" }));
  await waitFor(() => expect(alertSpy).toHaveBeenCalled());
  const intro = screen.getByLabelText("자기소개") as HTMLTextAreaElement;
  expect(intro.value).toBe("지워지면 안 되는 내용");
});
