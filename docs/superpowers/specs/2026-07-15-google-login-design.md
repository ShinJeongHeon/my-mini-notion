# 구글 로그인 실제 구현 (Supabase Auth) — 설계

날짜: 2026-07-15
대상: `/login` 화면의 "Google 계정으로 계속하기" 버튼을 가짜(localStorage 플래그) 로그인에서 **실제 Google OAuth 로그인**으로 전환.

## 목표 / 범위

- 로그인 버튼 클릭 → 실제 Google 계정 선택/동의 → 앱으로 복귀 → 로그인 상태.
- 마이 페이지 이메일 필드에 실제 구글 계정 이메일 표시, 프로필 이름/사진 기본값을 구글 계정 정보로.
- 로그아웃 버튼 → 실제 세션 종료 → `/login`으로 복귀.
- **범위 밖:** 글(posts)·별명·업로드 아바타의 서버 저장(현행 localStorage 유지), 이메일/비밀번호 로그인, 다중 프로바이더.

## 전제 (확인 완료)

- Supabase 프로젝트: `sirfchtyxayhlyatpyhl` (`https://sirfchtyxayhlyatpyhl.supabase.co`)
- `GET /auth/v1/settings` 확인 결과 **Google provider 활성화됨** (`"google": true`) — 대시보드 추가 설정 불필요.
- Publishable key: `sb_publishable_…` (공개 가능하나 실제 값은 `.env.local`에만 보관 — `.env.example` 참조)

## 접근 방식 비교

1. **(채택) 클라이언트 사이드 `@supabase/supabase-js` + PKCE** — 앱 전체가 `"use client"` + localStorage 스토어 + 클라이언트 가드 구조라 아키텍처가 그대로 유지됨. 세션은 supabase-js가 localStorage에 저장·자동 갱신. 서버 코드/쿠키/proxy 불필요, 최소 diff.
2. `@supabase/ssr` + 쿠키 세션 + `proxy.ts` 가드 — 서버 렌더링 보호가 필요할 때 정석이지만, 이 앱은 보호할 서버 데이터가 없어 복잡도만 증가. 기각.
3. Google GIS(One Tap) + `signInWithIdToken` — 별도 GIS 스크립트/클라이언트 ID 프론트 노출 필요. 기각.

## 구성 요소

- **`lib/supabase.ts` (신규):** 브라우저 클라이언트 싱글턴. `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` 사용, `flowType: "pkce"`.
- **`lib/store.tsx` (수정):**
  - `loggedIn`을 localStorage 플래그 대신 **Supabase 세션 유무**로 파생. localStorage 저장 스키마에서 `loggedIn` 제거(기존 값은 무시).
  - `onAuthStateChange` 구독(INITIAL_SESSION 포함)으로 인증 상태 반영. `loaded = 데이터 로드 && 인증 초기화` 둘 다 완료 시 true(외부 API 불변).
  - 구글 프로필 매핑: `email`, 이름(`user_metadata.full_name ?? name`), 사진(`user_metadata.avatar_url ?? picture`).
  - 파생값: `displayName = nickname ?? 구글 이름 ?? "김민수"`, `avatar = 업로드 아바타 ?? 구글 사진`, `email = 세션 이메일 ?? ""`.
  - `login()` → `signInWithOAuth({ provider: "google", options: { redirectTo: origin + "/" } })` (에러 반환). `logout()` → `signOut()`.
- **`app/login/page.tsx` (수정):** `handleLogin`이 `router.push` 대신 OAuth 리다이렉트를 시작. 진행 중 재클릭 방지(pending 플래그, 시각적 변경 없음 — DESIGN.md §4.1 "특수 상태 없음" 유지). 실패 시 pending 해제.
- **화면 변경 없음:** AppShell 가드·마이페이지 마크업은 그대로(스토어 파생값만 실제 데이터로 바뀜).

## 데이터 흐름

1. `/login`에서 버튼 클릭 → `supabase.auth.signInWithOAuth` → Google로 리다이렉트.
2. 인증 후 Supabase가 `{origin}/?code=…`로 복귀 → supabase-js가 자동으로 코드 교환(`detectSessionInUrl`) + URL 정리 → `SIGNED_IN/INITIAL_SESSION` 이벤트.
3. 스토어가 세션 반영 → AppShell 가드 통과 → 워크스페이스 표시.
4. 로그아웃 → `SIGNED_OUT` → `loggedIn=false` → 기존 가드가 `/login`으로 replace.

## 에러 처리

- `signInWithOAuth` 실패(네트워크 등): pending 해제로 재시도 가능. 별도 에러 UI는 현행 디자인(특수 상태 없음)을 따름.
- 코드 교환 실패 시 세션 없음 → 가드가 `/login` 유지(치명적 상태 없음).

## 테스트 / 검증

- vitest: 스토어가 Supabase 세션 → `loggedIn`/`email`/`displayName`/`avatar`를 올바르게 파생하는지(모듈 모킹), 로그인 페이지 버튼이 `signInWithOAuth`를 호출하는지.
- `npm test` + `npm run build` 통과.
- 실제 브라우저에서 E2E 확인(로그인 → 워크스페이스 → 마이페이지 이메일 → 로그아웃).

## DESIGN.md 동기화

§4.1(로그인 상호작용), §5.5(로그인/로그아웃), §5.6(상태 모델·저장 스키마), §6.5(이메일 값) 갱신.
