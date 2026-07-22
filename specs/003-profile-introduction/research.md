# Research: 자기소개 (003-profile-introduction)

**Date**: 2026-07-22 · **Input**: [spec.md](./spec.md) · Technical Context의 미확정
항목을 모두 해소한다. NEEDS CLARIFICATION 잔여 0건.

## 1. 저장 위치 — `public.profile.introduction` 실존 확인

- **Decision**: 사용자가 만들어 둔 `public.profile.introduction` 컬럼(text, nullable,
  updatable)을 그대로 사용한다. 스키마 변경(컬럼 추가·타입 변경·제약 추가) 일절 없음.
- **Rationale**: 2026-07-22 Supabase 읽기 전용 조회(list_tables)로 실존을 확인했다:
  `profile(id uuid PK, created_at timestamptz, name text null, user_id uuid unique →
  auth.users.id, introduction text null, image_path text null)`, RLS enabled.
  FR-007(구조 변경 금지)이 사용자 최상위 제약이다. text 타입은 500자·줄바꿈을 그대로
  수용하므로 DB 측 조치가 필요 없다.
- **Alternatives considered**: 별도 테이블 신설(거부 — 구조 변경 금지 위반이자 YAGNI),
  DB CHECK 제약으로 500자 강제(거부 — 스키마 변경 금지).

## 2. 스토어 API — 단일 `saveProfile`로 별명+자기소개 동시 저장

- **Decision**: `lib/store.tsx`의 `saveNickname(nick)`을
  `saveProfile(fields: { name: string; introduction: string }): Promise<boolean>`로
  대체한다. 내부는 단일 `supabase.from("profile").update({ name, introduction })
  .eq("user_id", userId)` 1회 호출. 로컬 상태는 기존 saveNickname처럼 즉시(낙관적)
  갱신하고, 오류 시 false를 반환한다.
- **Rationale**: 스펙 US1-3 "저장 버튼 한 번에 두 값이 모두 함께 저장"은 단일
  업데이트가 가장 단순하고 부분 실패(별명만 저장되고 자기소개는 실패)가 원천
  불가능하다. `saveNickname`의 호출처는 마이페이지 1곳 + 테스트 1건뿐이라 대체 비용이
  가장 작다(YAGNI — 죽은 API를 남기지 않는다).
- **Alternatives considered**:
  - `saveIntroduction` 별도 추가 후 마이페이지에서 2회 호출(거부 — 왕복 2회, 부분 실패
    상태가 생겨 FR-006/US1-3과 충돌하는 복잡성).
  - `saveNickname` 유지 + `saveProfile` 병행(거부 — 호출처 없는 중복 API 유지, YAGNI 위반).

## 3. 입력값 정규화 — 공백만이면 null, 내용은 원문 보존

- **Decision**: 저장 시 `introduction.trim() === ""`이면 `null`, 아니면 **입력 원문
  그대로**(내부 줄바꿈·공백 보존) 저장한다. `name`은 기존 saveNickname 규칙
  (`trim() || null`)을 그대로 승계한다.
- **Rationale**: FR-004(공백만 = 빈 자기소개) + FR-005/엣지(줄바꿈 보존, SC-002 "줄바꿈
  포함 100% 동일 재표시")를 동시에 만족하는 최소 규칙. 원문 trim은 스펙이 요구하지
  않으므로 하지 않는다.
- **Alternatives considered**: 전체 trim 후 저장(거부 — 의도적 들여쓰기/줄바꿈 훼손
  가능, 스펙 미요구), 빈 문자열 `""` 저장(거부 — "등록되지 않은 상태로 돌아간다"는
  US3-2와 일치하는 표현은 null; 기존 name 규칙과도 일관).

## 4. 500자 제한 — textarea `maxLength` 단일 지점 강제

- **Decision**: `<textarea maxLength={500}>`으로 입력 자체를 500자에서 차단한다(타이핑·
  붙여넣기 모두 브라우저가 잘라냄). 스토어·DB 측 중복 검증은 두지 않는다.
- **Rationale**: 스펙 엣지 케이스가 "오류 안내가 아닌 입력 차단 방식"을 명시했고,
  maxLength가 정확히 그 동작이다. 단일 강제 지점이 YAGNI(원칙 V)에 부합한다.
- **Alternatives considered**: 스토어에서 `.slice(0, 500)` 이중 방어(거부 — 도달 불가능한
  코드, 테스트 불가), 글자 수 카운터 UI(거부 — 스펙 미요구; 필요해지면 001 기능의
  `.detail-char-count` 패턴 재사용 가능하다고만 기록).

## 5. 테스트 전략 — 기존 목 확장 + 마이페이지 시나리오 신규

- **Decision**: `__tests__/auth-store.test.tsx`의 hoisted supabase 목을 실제 select 형상
  전체(`{ name, image_path, introduction }`)로 확장하고, saveProfile 계약(단일 update
  patch `{ name, introduction }`)으로 기존 "별명 저장" 테스트를 갱신한다. 마이페이지
  UI 시나리오(입력란 렌더·placeholder·로드 후 draft 채움·저장 성공/실패·비우기)는
  `__tests__/mypage-introduction.test.tsx`로 신규 작성한다.
- **Rationale**: 헌법 원칙 II "불완전한 목 금지" — syncProfile이 introduction을
  select하게 되면 `{name}`만 담은 현재 목은 침묵 속에서 깨지는 부분 목이 된다. 마이페이지는
  동기 클라이언트 컴포넌트라 Vitest+RTL로 직접 테스트 가능(헌법 기술 스택 절의 async
  서버 컴포넌트 제약에 걸리지 않음).
- **Alternatives considered**: E2E(verify 스킬)만으로 검증(거부 — 헌법 원칙 I이 유닛
  단위 TDD를 의무화; verify는 구현 완료 후 보조 검증으로만 사용).

## 6. UI 컴포넌트 — `.field-textarea` 조각을 `.field-input`에서 파생

- **Decision**: `globals.css`에 `.field-textarea` 조각을 신설한다. `.field-input`
  (DESIGN.md §2.7.6)의 토큰을 그대로 재사용: bg `--surface-card`, border `1px
  --border-default`, radius-md(8px), font 14, color `--text-body`, `:focus` 시
  border-color `--border-focus` + `--shadow-focus`. 다른 점만 추가: `min-height:
  96px`(여러 줄), `padding: 10px 12px`(고정 높이 42px 대신 상하 패딩), `line-height:
  1.6`(본문 계열 행간), `resize: vertical`, `font-family: inherit`. 마이페이지 별명
  필드 아래에 `.mypage-field` 패턴(label 13/600 + 컨트롤)으로 배치한다.
- **Rationale**: 헌법 원칙 III — 새 값을 임의로 만들지 않고 기존 토큰만 조합한다.
  textarea는 여러 줄(FR-005)에 필수라 `.field-input`(input 전용, 높이 42px 고정)을 그대로
  쓸 수 없다. line-height 1.6은 DESIGN.md 타입 스케일에 이미 존재하는 값(12px 계열,
  `.empty-state__desc` 등)이다. 신규 조각·카피는 같은 변경에서 DESIGN.md
  (§2.7 조각 카탈로그, §4.4 마이페이지 해부, §6.5 카피 표)에 반영한다.
- **Alternatives considered**: 인라인 스타일(거부 — 디자인 시스템 이탈), `.detail-content`
  재사용(거부 — 상세 편집기 전용: min-height 340px, font 15, border 없음 — 필드 맥락과
  다름).
- **카피(placeholder)**: `자기소개를 입력하세요` — 기존 별명 placeholder "사용할 별명을
  입력하세요", 검색 "글 검색" 등 명사+하세요 체의 기존 카피 톤을 따른다. label은
  `자기소개`.

## 7. 조회·로딩 순서 — 기존 `app.loaded` 게이트 패턴 승계

- **Decision**: `AppState`에 `introduction: string | null`을 추가하고 syncProfile의
  select를 `"name, image_path, introduction"`으로 확장한다. 마이페이지는 기존
  `useEffect([app.loaded])`에서 nickDraft와 함께 introDraft를 채운다. localStorage
  캐시(`mini-notion-v1`)에도 nickname/imagePath와 같은 방식으로 introduction을 포함한다.
- **Rationale**: US2-3(로딩 전 빈 값이 저장값을 덮어쓰지 않음)은 기존 게이트가 이미
  보장하는 구조라 같은 경로에 태우는 것이 최소 변경이다. localStorage 포함은 기존
  프로필 필드(nickname·imagePath)와의 일관성 유지 — 제외하면 새로고침 직후 DB 응답
  전까지 기존 두 필드와 다르게 동작한다.
- **Alternatives considered**: introduction만 localStorage 제외(거부 — 동작 비일관),
  별도 fetch(거부 — 왕복 추가, 기존 syncProfile로 충분).

## 8. Next.js 제약 확인 (헌법 원칙 IV)

- **Decision**: 이 기능은 신규 Next.js API 표면을 쓰지 않는다 — 기존 `"use client"`
  컴포넌트 2개(store 컨텍스트, 마이페이지)의 내부 로직·마크업 확장뿐이다. 구현 시작 시
  번들 문서(`node_modules/next/dist/docs/`)의 클라이언트 컴포넌트 가이드로 이벤트
  핸들러·상태 사용 관행을 재확인하는 태스크를 tasks.md 선두에 둔다.
- **Rationale**: 라우트·서버 컴포넌트·데이터 페칭 API를 새로 도입하지 않으므로 브레이킹
  체인지 노출면이 최소다. 재확인 태스크는 "기억으로 가정하지 않는다" 원칙의 이행 장치다.
