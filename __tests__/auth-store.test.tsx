import { afterEach, beforeEach, expect, test, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { AppProvider, useApp } from "@/lib/store";
import LoginPage from "@/app/login/page";

const mocks = vi.hoisted(() => ({
  session: null as null | { user: unknown },
  signInWithOAuth: vi.fn().mockResolvedValue({ data: {}, error: null }),
  signOut: vi.fn().mockResolvedValue({ error: null }),
  // profile 테이블 상태: null이면 아직 행이 없는 최초 로그인 상황.
  // 실제 select 형상 전체(name, image_path, introduction)를 반영한다.
  profileRow: null as null | {
    name: string | null;
    image_path: string | null;
    introduction: string | null;
  },
  profileSelect: vi.fn(),
  profileInsert: vi.fn(),
  profileUpdate: vi.fn(),
}));

vi.mock("@/lib/supabase", () => ({
  supabase: {
    auth: {
      onAuthStateChange: (
        cb: (event: string, session: typeof mocks.session) => void
      ) => {
        cb("INITIAL_SESSION", mocks.session);
        return { data: { subscription: { unsubscribe: vi.fn() } } };
      },
      signInWithOAuth: mocks.signInWithOAuth,
      signOut: mocks.signOut,
    },
    from: (table: string) => ({
      select: () => ({
        eq: (_col: string, id: string) => ({
          maybeSingle: async () => {
            mocks.profileSelect(id);
            return { data: mocks.profileRow, error: null };
          },
        }),
      }),
      insert: (row: { user_id: string; name: string | null }) => ({
        select: () => ({
          maybeSingle: async () => {
            mocks.profileInsert(row);
            mocks.profileRow = {
              name: row.name ?? null,
              image_path: null,
              introduction: null,
            };
            return { data: mocks.profileRow, error: null };
          },
        }),
      }),
      update: (patch: { name: string | null; introduction: string | null }) => ({
        eq: async (_col: string, id: string) => {
          mocks.profileUpdate(patch, id);
          mocks.profileRow = {
            name: patch.name,
            image_path: mocks.profileRow?.image_path ?? null,
            introduction: patch.introduction,
          };
          return { error: null };
        },
      }),
      // page 목록 로드는 이 테스트의 관심사가 아니므로 빈 목록을 돌려준다.
      ...(table === "page"
        ? {
            select: () => ({
              order: async () => ({ data: [], error: null }),
            }),
          }
        : null),
    }),
  },
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}));

const googleSession = {
  user: {
    id: "user-1",
    email: "minsu.kim@gmail.com",
    user_metadata: {
      full_name: "김민수",
      avatar_url: "https://lh3.googleusercontent.com/a/photo",
    },
  },
};

function Probe() {
  const app = useApp();
  return (
    <div>
      <span data-testid="logged-in">{String(app.loggedIn)}</span>
      <span data-testid="email">{app.email}</span>
      <span data-testid="display-name">{app.displayName}</span>
      <span data-testid="avatar">{app.avatar ?? ""}</span>
      <span data-testid="introduction">{app.introduction ?? ""}</span>
      <button
        onClick={() =>
          void app.saveProfile({
            name: "새 별명",
            introduction: "소개글\n둘째 줄",
          })
        }
      >
        프로필 저장
      </button>
      <button
        onClick={() =>
          void app.saveProfile({ name: "새 별명", introduction: "  \n  " })
        }
      >
        공백 소개 저장
      </button>
    </div>
  );
}

beforeEach(() => {
  localStorage.clear();
  mocks.session = null;
  mocks.profileRow = null;
  mocks.signInWithOAuth.mockClear();
  mocks.profileSelect.mockClear();
  mocks.profileInsert.mockClear();
  mocks.profileUpdate.mockClear();
});

afterEach(() => {
  cleanup();
});

test("구글 세션이 있으면 loggedIn·이메일·이름·프로필 사진이 세션에서 파생된다", async () => {
  mocks.session = googleSession;
  render(
    <AppProvider>
      <Probe />
    </AppProvider>
  );
  expect(screen.getByTestId("logged-in").textContent).toBe("true");
  expect(screen.getByTestId("email").textContent).toBe("minsu.kim@gmail.com");
  expect(screen.getByTestId("display-name").textContent).toBe("김민수");
  expect(screen.getByTestId("avatar").textContent).toBe(
    "https://lh3.googleusercontent.com/a/photo"
  );
  // 프로필 동기화(다음 틱)까지 기다려 act 경고 없이 마무리.
  await waitFor(() => expect(mocks.profileSelect).toHaveBeenCalled());
});

test("세션이 없으면 로그아웃 상태고 profile을 조회하지 않는다", () => {
  render(
    <AppProvider>
      <Probe />
    </AppProvider>
  );
  expect(screen.getByTestId("logged-in").textContent).toBe("false");
  expect(mocks.profileSelect).not.toHaveBeenCalled();
});

test("로그인 버튼이 구글 OAuth 로그인을 시작한다", () => {
  render(
    <AppProvider>
      <LoginPage />
    </AppProvider>
  );
  fireEvent.click(
    screen.getByRole("button", { name: /Google 계정으로 계속하기/ })
  );
  expect(mocks.signInWithOAuth).toHaveBeenCalledTimes(1);
  expect(mocks.signInWithOAuth.mock.calls[0][0]).toMatchObject({
    provider: "google",
  });
});

test("최초 로그인이면 profile 행을 만들고 구글 이름을 name 초기값으로 넣는다", async () => {
  mocks.session = googleSession;
  render(
    <AppProvider>
      <Probe />
    </AppProvider>
  );
  await waitFor(() =>
    expect(mocks.profileInsert).toHaveBeenCalledWith({
      user_id: "user-1",
      name: "김민수",
    })
  );
});

test("profile 행이 이미 있으면 그 name이 별명(표시 이름)으로 로드된다", async () => {
  mocks.session = googleSession;
  mocks.profileRow = { name: "민수짱", image_path: null, introduction: null };
  render(
    <AppProvider>
      <Probe />
    </AppProvider>
  );
  await waitFor(() =>
    expect(screen.getByTestId("display-name").textContent).toBe("민수짱")
  );
  expect(mocks.profileInsert).not.toHaveBeenCalled();
});

test("프로필 저장 시 별명과 자기소개가 한 번의 업데이트로 저장된다(줄바꿈 원문 보존)", async () => {
  mocks.session = googleSession;
  mocks.profileRow = { name: "김민수", image_path: null, introduction: null };
  render(
    <AppProvider>
      <Probe />
    </AppProvider>
  );
  await waitFor(() => expect(mocks.profileSelect).toHaveBeenCalled());
  fireEvent.click(screen.getByRole("button", { name: "프로필 저장" }));
  await waitFor(() =>
    expect(mocks.profileUpdate).toHaveBeenCalledWith(
      { name: "새 별명", introduction: "소개글\n둘째 줄" },
      "user-1"
    )
  );
  expect(screen.getByTestId("display-name").textContent).toBe("새 별명");
});

test("공백·줄바꿈만 있는 자기소개는 null로 저장된다", async () => {
  mocks.session = googleSession;
  mocks.profileRow = {
    name: "김민수",
    image_path: null,
    introduction: "기존 소개",
  };
  render(
    <AppProvider>
      <Probe />
    </AppProvider>
  );
  await waitFor(() => expect(mocks.profileSelect).toHaveBeenCalled());
  fireEvent.click(screen.getByRole("button", { name: "공백 소개 저장" }));
  await waitFor(() =>
    expect(mocks.profileUpdate).toHaveBeenCalledWith(
      { name: "새 별명", introduction: null },
      "user-1"
    )
  );
});

test("profile 행의 introduction이 app.introduction으로 노출된다", async () => {
  mocks.session = googleSession;
  mocks.profileRow = {
    name: "김민수",
    image_path: null,
    introduction: "저장된 소개\n둘째 줄",
  };
  render(
    <AppProvider>
      <Probe />
    </AppProvider>
  );
  await waitFor(() =>
    expect(screen.getByTestId("introduction").textContent).toBe(
      "저장된 소개\n둘째 줄"
    )
  );
});

test("동기화된 introduction이 localStorage에 함께 저장된다", async () => {
  mocks.session = googleSession;
  mocks.profileRow = {
    name: "김민수",
    image_path: null,
    introduction: "캐시될 소개",
  };
  render(
    <AppProvider>
      <Probe />
    </AppProvider>
  );
  await waitFor(() => {
    const raw = localStorage.getItem("mini-notion-v1");
    expect(raw && JSON.parse(raw).introduction).toBe("캐시될 소개");
  });
});

test("localStorage에 저장된 introduction이 복원된다", async () => {
  localStorage.setItem(
    "mini-notion-v1",
    JSON.stringify({
      posts: [],
      nickname: "캐시별명",
      imagePath: null,
      introduction: "캐시된 소개",
    })
  );
  render(
    <AppProvider>
      <Probe />
    </AppProvider>
  );
  await waitFor(() =>
    expect(screen.getByTestId("introduction").textContent).toBe("캐시된 소개")
  );
});
