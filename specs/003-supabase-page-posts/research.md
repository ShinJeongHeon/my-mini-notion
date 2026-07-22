# Phase 0 Research: 계정 기반 페이지 게시글 저장

조사 시점: 2026-07-22. 조사 방법: 실제 DB 스키마 조회(MCP `list_tables`, `pg_policies`),
기존 코드(`lib/store.tsx`, `lib/supabase.ts`, 화면 4개, `__tests__/auth-store.test.tsx`) 정독.
Technical Context에 NEEDS CLARIFICATION 항목 없음 — 아래는 설계 결정 기록이다.

## R1. `page` 테이블 실측 구조 (변경 금지 대상)

**Decision**: 아래 실측 구조를 그대로 사용한다. 컬럼 추가·변경·삭제 없음.

| 컬럼 | 타입 | 제약 |
|------|------|------|
| `id` | uuid | PK, default `gen_random_uuid()` |
| `created_at` | timestamptz | default `now()` |
| `title` | text | nullable |
| `content` | text | nullable |
| `user_id` | uuid | NOT NULL, FK → `auth.users.id` |

**Rationale**: FR-007. `updated_at`·`favorite` 컬럼이 없다는 사실이 아래 R4·R5 결정을 강제한다.

**Alternatives considered**: 없음 — 사용자 지시로 구조는 불변.

## R2. RLS 정책 추가 (기능 성립의 선행 조건)

**Decision**: `public.page`에 owner-only 정책 4개를 추가한다
(`authenticated` 롤, `(select auth.uid()) = user_id` 조건의 SELECT / INSERT / UPDATE / DELETE).
원문은 `contracts/page-rls.sql`. 적용은 구현 단계에서 MCP `apply_migration`으로 수행.

**Rationale**:
- 실측 결과 `page`는 `rls_enabled: true`인데 **정책이 0개** → 현재 클라이언트에서 모든 읽기·쓰기가 거부된다. 정책 없이는 기능 자체가 동작하지 않는다.
- FR-006이 "화면이 아닌 저장소 계층 강제"를 요구 — 클라이언트는 publishable key만 가지므로 RLS가 유일한 강제 수단이다.
- 정책은 테이블 구조(컬럼)가 아니므로 FR-007 위반이 아니다.
- `(select auth.uid())` 형태는 기존 `profile` 정책과 동일한 관례이며, Supabase가 권장하는 initplan 캐싱 형태다.

**Alternatives considered**:
- 서버 라우트 + 서비스 키로 격리 → 클라이언트 전용 구조에 서버 계층을 신설해야 하므로 YAGNI 위반, 기각.
- SELECT에 `user_id = auth.uid()` 필터를 클라이언트 쿼리에만 두기 → 화면 단 강제라 FR-006 위반, 기각(단, 명시적 `.eq("user_id", …)`를 쿼리에 병기하는 것은 가독성 목적으로 허용).

## R3. 데이터 접근 방식 — 기존 클라이언트 사이드 패턴 유지

**Decision**: `lib/supabase.ts`의 브라우저 클라이언트로 `lib/store.tsx` 안에서 직접 CRUD 한다.
서버 컴포넌트·Route Handler·미들웨어 도입 없음.

**Rationale**: 앱 전체가 이미 "use client" + 컨텍스트 구조이고 인증도 브라우저 PKCE 세션이다.
profile 저장(닉네임·아바타)이 같은 패턴으로 이미 검증되어 있다. 새 계층 도입은 Principle V 위반.

**Alternatives considered**: `@supabase/ssr` 쿠키 세션 + 서버 페칭 → 인증 체계 교체가 필요해
스펙 범위(Assumptions: 인증 변경 없음)를 벗어남, 기각.

## R4. 즐겨찾기 보관 방식 (FR-010)

**Decision**: localStorage에 **계정별 즐겨찾기 id 집합**만 남긴다.
키: `mini-notion-fav:<userId>`, 값: `string[]`(page id 배열). 기존 `mini-notion-v1` 키의
게시글 저장·시딩 로직은 제거하고, 남아 있는 옛 데이터는 건드리지 않는다(이관·삭제 모두 안 함).

**Rationale**: `page` 테이블에 favorite 컬럼이 없고(FR-007) 스펙이 기기별 보관을 확정(FR-010).
userId를 키에 포함해 같은 브라우저에서 계정을 바꿔도 표시가 섞이지 않게 한다.
옛 키 삭제는 스펙 밖 파괴적 행동이므로 하지 않는다(Assumptions: 이관 없음).

**Alternatives considered**: 기존 키 재사용 → 계정 간 섞임, 기각. profile 테이블에 저장 → 범위 밖 스키마 변경, 기각.

## R5. 수정 저장 모델 — 디바운스 자동 저장 + last-write-wins

**Decision**: 제목·본문 입력은 지금처럼 로컬 상태에 즉시 반영하고, 입력 종료 후 짧은 디바운스
(600ms 내외)로 `update`를 전송한다. 같은 글을 여러 기기에서 고치면 마지막 저장이 이긴다.
비교·병합·버전 관리 없음.

**Rationale**: 기존 UX("자동 저장됨")의 연속성(FR-005). `updated_at`이 없어 충돌 감지 자체가
불가능하며, 개인 도구에서 LWW는 표준 기본값(/speckit-clarify 결과 반영). 키 입력마다 요청을
보내지 않아 SC-004(2초) 여유 충족.

**Alternatives considered**: 저장 버튼 명시화 → 기존 경험 회귀(FR-005 위반), 기각.
버전 컬럼 추가 → FR-007 위반, 기각.

## R6. 실패 처리 전략 (FR-008)

**Decision**: 쓰기 연산(등록·수정·삭제)은 낙관적으로 화면에 먼저 반영하되, 요청 실패 시
① 서버에서 목록을 재조회해 화면을 실제 저장 상태로 되돌리고 ② 실패 안내를 표시한다.
등록(insert)만은 서버가 id·created_at을 발급하므로 **응답 수신 후** 목록에 넣고 상세로 이동한다
(실패 시 이동하지 않고 안내만 표시).

**Rationale**: "화면 상태가 실제 저장 상태와 어긋난 채 남지 않는다"(FR-008)를 가장 단순하게
보장하는 방법은 실패 시 서버를 진실의 원천으로 재동기화하는 것. 개별 연산 롤백 로직보다
코드가 적고 검증이 쉽다(Principle V).

**Alternatives considered**: 연산별 역연산 롤백 → 상태 조합 폭발, 기각. 실패 무시 후 재시도 큐 → 오프라인 지원은 범위 밖, 기각.

## R7. 타입 매핑과 정렬

**Decision**:
- DB row → 앱 `Post`: `title ?? ""`, `content ?? ""`, `createdAt = Date.parse(created_at)` (ms number), `favorite`는 R4 집합에서 파생.
- 앱 → DB: 등록 시 `{ title: 제목(트림), content: "" }`만 전송(`id`·`created_at`·`user_id`는 서버/RLS 기본값·세션에서 결정 — insert에 `user_id`를 명시하고 WITH CHECK가 검증).
- 정렬: `created_at` 내림차순 조회 + 신규 글은 목록 최상단 삽입(현행 UX 동일).

**Rationale**: 화면·기존 테스트가 쓰는 `Post` 형상(`createdAt: number`)을 유지해 변경 반경을
스토어 내부로 가둔다. `formatDate(ts)`도 그대로 재사용.

**Alternatives considered**: 화면까지 ISO 문자열로 교체 → 변경 반경만 커짐, 기각.

## R8. "찾을 수 없음" 상태 (US2-2, Edge case)

**Decision**: 상세 화면에서 로드 완료 후 글이 없으면(타인 글 uuid 직접 접근·삭제된 글 재접근
— RLS 때문에 둘 다 "row 없음"으로 동일하게 관측됨) 침묵 리다이렉트 대신 `.empty-state`
패턴(DESIGN.md §2.7.12)으로 "글을 찾을 수 없어요" 안내와 목록 이동 버튼을 보여준다.

**Rationale**: 스펙이 명시적으로 "'찾을 수 없음' 상태를 안내받는다"를 요구. 현행 코드는
`router.replace("/")`로 침묵 이동이라 스펙 미충족. RLS가 존재 여부를 구분해 주지 않으므로
(타인 글도 0 rows) 정보 노출 없이 동일 안내가 가능하다.

**Alternatives considered**: 현행 침묵 리다이렉트 유지 → 수용 시나리오(US2-2) 불충족, 기각.

## R9. 테스트 전략 (Principle I·II 적합)

**Decision**: 신규 `__tests__/page-posts.test.tsx`에서 `@/lib/supabase` 모듈만 모킹한다
(기존 auth-store.test.tsx와 동일 경계·동일 스타일). 목의 `from("page")` 응답은 실측 row 형상
전체(`id`·`created_at`·`title`·`content`·`user_id`)를 반영한다. 검증 항목:
로그인 시 목록 로드(정렬 포함), 비로그인 시 조회·등록 차단(FR-001/003), insert 페이로드에
`user_id` 포함, 삭제·수정 요청 전송, 실패 시 재조회+안내(FR-008), 시딩 부재(FR-009),
즐겨찾기 localStorage 계정별 키(FR-010). RLS 강제 자체는 유닛 테스트로 증명 불가 →
quickstart.md의 2계정 수동 시나리오 + 정책 존재 SQL 검증으로 커버.

**Rationale**: 네트워크 경계 바깥만 모킹(Principle II). RED 확인이 가능한 세밀한 단위.

**Alternatives considered**: supabase 로컬 스택 통합 테스트 → 이 저장소에 CLI·Docker 전제가 없고 범위 초과, 기각(수동 quickstart로 대체).

## R10. Next.js 번들 문서 확인 경로 (Principle IV)

**Decision**: 이 워크트리의 `node_modules/next/dist/docs`는 빈 디렉토리이므로, 구현 중 문서
확인은 원본 체크아웃 `…\20-notion-deploy\node_modules\next\dist\docs\`에서 읽는다.
이번 기능은 신규 라우팅·데이터 API를 도입하지 않으므로(클라이언트 컨텍스트 유지) 필수 확인
대상은 화면 파일을 수정할 때의 App Router 클라이언트 컴포넌트 관례 정도다.

**Rationale**: AGENTS.md/Principle IV 준수와 워크트리 npm install이 문서를 누락한 실측 상황의 절충.

**Alternatives considered**: 원본 node_modules를 워크트리로 복사 → OneDrive 동기화 부담만 증가, 기각.
