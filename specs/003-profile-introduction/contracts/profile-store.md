# Contract: 프로필 스토어 API · Supabase 쿼리 (003-profile-introduction)

이 기능이 노출·소비하는 인터페이스 계약. UI(마이페이지) ↔ 스토어(`lib/store.tsx`) ↔
Supabase(`public.profile`) 경계를 고정한다. 타입 상세는
[data-model.md](../data-model.md) 참조.

## 1. 스토어 공개 계약 (`useApp()` 컨텍스트)

### 1.1 `introduction: string | null` (읽기)

- `null` = 미등록. 문자열 = 저장된 자기소개 원문(줄바꿈 포함).
- `loaded === true`가 되기 전 값은 신뢰하지 않는다(소비자는 loaded 게이트 후 읽는다).

### 1.2 `saveProfile(fields: { name: string; introduction: string }): Promise<boolean>`

- **입력**: 마이페이지 draft 원문 2개(정규화 전 값을 그대로 전달).
- **정규화(스토어 책임)**:
  - `name`: `(name || "").trim() || null` — 기존 saveNickname 규칙 그대로.
  - `introduction`: `introduction.trim() === ""` 이면 `null`, 아니면 **원문 그대로**.
- **동작**: 로컬 상태(nickname, introduction) 즉시 갱신 → 로그인 상태면 Supabase
  update 1회(§2.2). 비로그인(userId 없음)이면 로컬만 갱신하고 `true`(기존 saveNickname
  동작 승계).
- **반환**: 성공 `true` / Supabase 오류 `false`. `false`여도 로컬 상태·호출자 draft는
  건드리지 않는다(FR-006 — 입력 유실 금지는 호출자 draft 유지로 보장).
- **금지**: 500자 절단·별도 검증(입력 차단은 UI `maxLength` 단일 지점), 부분 저장
  (name만/introduction만 갱신하는 호출 경로 없음).

### 1.3 제거: `saveNickname(nick: string)`

- 이 계약 발효와 함께 삭제된다. 잔존 호출처가 있으면 계약 위반(컴파일 에러로 검출).

## 2. Supabase 쿼리 계약 (`public.profile`)

### 2.1 조회 (syncProfile — 기존 쿼리 확장)

```ts
supabase.from("profile")
  .select("name, image_path, introduction")   // introduction 추가
  .eq("user_id", user.id)
  .maybeSingle();
```

- 행 없음 → 기존 insert 폴백 유지: `insert({ user_id, name }).select("name,
  image_path, introduction").maybeSingle()` — **introduction은 insert에 넣지 않는다**
  (컬럼 default인 null로 생성; 스키마·트리거 불변).

### 2.2 갱신 (saveProfile)

```ts
supabase.from("profile")
  .update({ name, introduction })   // 정규화된 값, 항상 두 컬럼 함께
  .eq("user_id", userId);
```

- 단일 호출 = 원자적 동시 저장(US1-3). 다른 컬럼(image_path 등)은 절대 포함하지 않는다.

## 3. UI 계약 (마이페이지 `app/(app)/mypage/page.tsx`)

| 항목 | 계약 |
|------|------|
| 배치 | 별명 필드 바로 아래, 이메일 필드 위 — `.mypage-field` 패턴(label + 컨트롤) |
| 마크업 | `<label htmlFor="introduction">자기소개</label>` + `<textarea id="introduction" className="field-textarea" maxLength={500} placeholder="자기소개를 입력하세요" />` |
| draft 초기화 | `useEffect([app.loaded, app.introduction])`에서 **사용자가 아직 자기소개를 입력하지 않은 동안(pristine)** `setIntroDraft(app.introduction ?? "")` — `loaded`는 syncProfile(DB 조회) 완료 **전에** true가 되므로, 캐시가 없는 환경(새 기기·저장소 초기화)에서 늦게 도착한 DB 값도 pristine이면 반영한다. 사용자가 textarea를 건드린 뒤에는 절대 덮어쓰지 않는다(US2-3) |
| 저장 | 기존 "변경사항 저장" 버튼의 `saveProfile()` 핸들러가 `app.saveProfile({ name: nickDraft, introduction: introDraft })` 호출. 성공 시 기존 `.saved-note`("저장되었습니다") 재사용, 실패 시 기존 alert 패턴 재사용 + draft 유지 |
| 스타일 | `.field-textarea` — `.field-input` 토큰 파생(research.md §6). 신규 토큰 생성 금지 |

## 4. 테스트가 고정해야 하는 계약 지점

1. syncProfile select 형상에 `introduction` 포함 + 목 profileRow 완전 형상
   (`{ name, image_path, introduction }`).
2. `saveProfile` update patch가 정확히 `{ name, introduction }` 두 키(정규화 결과)로
   호출되고 `user_id`로 필터된다.
3. 공백만 introduction → patch에 `introduction: null`.
4. 줄바꿈 포함 원문이 무가공으로 patch에 실린다.
5. 마이페이지: 로드 후 draft 채움(빈 값 덮어쓰기 없음), 저장 성공 노트, 실패 시 draft
   유지, `maxLength=500` 속성 존재.
