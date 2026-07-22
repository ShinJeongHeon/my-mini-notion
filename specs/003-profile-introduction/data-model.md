# Data Model: 자기소개 (003-profile-introduction)

**Date**: 2026-07-22 · 근거: [research.md](./research.md) §1–3, §7

## 1. 영속 엔티티 — `public.profile` (기존, 변경 금지)

사용자당 1행(user_id unique). **이 기능은 어떤 스키마 변경도 하지 않는다**(FR-007).
아래는 2026-07-22 읽기 전용 조회로 확인한 실제 구조이며, 이 기능이 읽고 쓰는 컬럼만
`사용`으로 표시한다.

| 컬럼 | 타입 | 제약 | 이 기능에서 |
|------|------|------|-------------|
| `id` | uuid | PK, default `gen_random_uuid()` | 미사용 |
| `created_at` | timestamptz | default `now()` | 미사용 |
| `name` | text | nullable | **사용** — 별명(기존 동작 유지, 함께 저장) |
| `user_id` | uuid | unique, FK → `auth.users.id` | **사용** — 조회·갱신 키 |
| `introduction` | text | nullable | **사용** — 자기소개 (이 기능의 대상) |
| `image_path` | text | nullable | 읽기만(기존 syncProfile select에 포함) |

- RLS enabled — 본인 행만 접근(기존 정책 그대로, 정책 변경 없음).
- `introduction` 값 규칙: `null` = 미등록(빈 입력란 + placeholder 표시) / 문자열 =
  등록됨(줄바꿈 포함 원문 그대로, 최대 500자는 입력 단계에서 차단).

## 2. 클라이언트 상태 — `lib/store.tsx`

### AppState (내부) 변경

| 필드 | 타입 | 변경 | 비고 |
|------|------|------|------|
| `introduction` | `string \| null` | **추가** | 초기값 `null`. syncProfile·localStorage 복원·saveProfile에서 갱신 |

### AppStore (공개 컨텍스트) 변경

| 멤버 | 시그니처 | 변경 | 비고 |
|------|----------|------|------|
| `introduction` | `string \| null` | **추가** | 마이페이지 draft 초기화용 노출 |
| `saveProfile` | `(fields: { name: string; introduction: string }) => Promise<boolean>` | **추가** | 단일 update로 별명+자기소개 저장. 정규화 규칙은 계약 문서 참조 |
| `saveNickname` | `(nick: string) => Promise<boolean>` | **제거** | 호출처(마이페이지·테스트)가 saveProfile로 이전 — 죽은 API를 남기지 않음 |

### localStorage 페이로드 (`mini-notion-v1`)

```jsonc
{
  "posts": [...],            // 기존
  "nickname": "민수짱",       // 기존
  "imagePath": "abc.png",    // 기존
  "introduction": "안녕하세요\n두 줄째"  // 추가 — nickname과 동일한 캐시 규칙
}
```

- 읽기: 최초 마운트 시 `d.introduction || null` 복원(기존 nickname 패턴과 동일).
- 진실 원본(source of truth)은 DB — 로그인 세션이 서면 syncProfile 결과가 덮어쓴다.

## 3. 상태 전이

```text
[미등록] introduction = null
   │  저장(내용 입력 후, trim ≠ "")          ┌────────────┐
   ├────────────────────────────────────────▶│  [등록됨]   │ introduction = "원문"
   │                                         └─────┬──────┘
   │  저장(공백만 / 전부 삭제, trim === "")        │ 수정 저장(trim ≠ "")
   ◀───────────────────────────────────────────────┤   └─▶ [등록됨] (새 원문)
                                                   │ 전부 삭제 후 저장
                                                   ◀── [미등록] (null)
```

- 저장 실패(supabase error): 상태 전이는 **낙관적으로 이미 반영**(기존 saveNickname
  패턴 승계), 호출자는 `false`를 받아 실패 안내를 표시하고 draft(컴포넌트 state)는
  유지된다(FR-006). 다음 syncProfile(재로그인·새로고침)에서 DB 값으로 수렴한다.

## 4. 검증 규칙 (요구사항 ↔ 규칙 매핑)

| 규칙 | 적용 지점 | 근거 |
|------|-----------|------|
| 500자 초과 입력 차단 | `<textarea maxLength={500}>` (단일 강제 지점) | FR-005, 엣지(입력 차단 방식) |
| 공백만 입력 → `null` 저장 | `saveProfile` 내 `introduction.trim() === "" ? null : 원문` | FR-004 |
| 줄바꿈·내부 공백 보존 | 정규화에서 원문 무가공(전체 trim 안 함) | FR-005, SC-002 |
| name 규칙 승계 | `(name \|\| "").trim() \|\| null` | FR-008 (기존 동작 불변) |
| 로딩 전 덮어쓰기 금지 | 마이페이지 draft는 `app.loaded`와 `app.introduction`에 반응해 **사용자 미입력(pristine) 동안만** 스토어 값으로 동기화 — syncProfile이 `loaded` 이후 완료되는 경우(캐시 없는 새 기기)도 커버. 입력 시작 후에는 덮어쓰지 않음 | US2-3, US2-1 |
