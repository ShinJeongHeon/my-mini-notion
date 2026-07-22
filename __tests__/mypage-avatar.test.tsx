// 프로필 이미지 업로드(saveAvatar) — 공용 supabase mock의 storage 경로 검증.
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { cleanup, fireEvent, render, waitFor } from "@testing-library/react";
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

function pickFile(container: HTMLElement) {
  const input = container.querySelector(
    'input[type="file"]'
  ) as HTMLInputElement;
  const file = new File(["img"], "me.png", { type: "image/png" });
  fireEvent.change(input, { target: { files: [file] } });
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

test("사진 변경으로 파일을 고르면 스토리지에 올리고 image_path를 저장한다", async () => {
  const { container } = renderMyPage();
  await waitFor(() => expect(spies.profileSelect).toHaveBeenCalled());

  pickFile(container);

  await waitFor(() =>
    expect(spies.storageUpload).toHaveBeenCalledWith(
      "profile-image",
      expect.stringMatching(/\.png$/),
      expect.any(File)
    )
  );
  await waitFor(() =>
    expect(spies.profileUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ image_path: expect.stringMatching(/\.png$/) }),
      "user-1"
    )
  );
});

test("업로드가 실패하면 알림이 뜨고 profile은 갱신되지 않는다", async () => {
  state.storageUploadError = { message: "bucket down" };
  const alertSpy = vi.spyOn(window, "alert").mockImplementation(() => {});

  const { container } = renderMyPage();
  await waitFor(() => expect(spies.profileSelect).toHaveBeenCalled());

  pickFile(container);

  await waitFor(() => expect(alertSpy).toHaveBeenCalled());
  expect(spies.profileUpdate).not.toHaveBeenCalled();
});
