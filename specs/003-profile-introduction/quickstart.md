# Quickstart: 자기소개 검증 가이드 (003-profile-introduction)

구현이 스펙을 만족하는지 최단 경로로 확인하는 실행 가이드. 세부 계약은
[contracts/profile-store.md](./contracts/profile-store.md), 데이터 규칙은
[data-model.md](./data-model.md) 참조.

## 사전 조건

- `npm install` 완료, `.env.local` 존재(`.env.example` 참조 — Supabase URL/키,
  `NEXT_PUBLIC_PROFILE_IMAGE_BASE_URL`).
- Google 계정으로 로그인 가능한 Supabase 프로젝트(profile 테이블·RLS 기존 그대로).
- **DB는 절대 변경하지 않는다** — 마이그레이션·SQL 실행 없음이 정상이다.

## 1. 유닛 테스트 (헌법 게이트)

```bash
npm test                                      # 전체 — 통과 + 무결한 출력(에러·경고 0)
npm test -- __tests__/auth-store.test.tsx     # 스토어 계약(saveProfile·목 형상)
npm test -- __tests__/mypage-introduction.test.tsx  # 마이페이지 시나리오
```

기대: 전부 통과. 기존 테스트(post-cover, char-count, smoke) 회귀 0(FR-008/SC-004).

## 2. 실제 앱 검증 (수용 시나리오 매핑)

```bash
npm run dev   # http://localhost:3000
```

로그인 → 사이드바 하단 프로필 → 마이 페이지 진입 후:

| # | 시나리오(스펙) | 절차 | 기대 결과 |
|---|----------------|------|-----------|
| 1 | US1-1 빈 상태 | 자기소개 미등록 계정으로 진입 | 별명 아래 빈 textarea + placeholder "자기소개를 입력하세요" |
| 2 | US1-2 등록 | 내용 입력 → "변경사항 저장" | "저장되었습니다" 노트 표시 |
| 3 | US1-3 동시 저장 | 별명·자기소개 모두 수정 → 저장 1회 | 둘 다 반영(새로고침으로 확인) |
| 4 | US2-1/2 조회 | 새로고침, 로그아웃 후 재로그인 | 저장한 자기소개가 그대로 채워짐 |
| 5 | US2-3 로딩 | 진입 직후 관찰 | 로딩 완료 후 저장값이 채워짐(빈 값으로 덮이지 않음) |
| 6 | US3-1 수정 | 내용 변경 → 저장 → 새로고침 | 수정본 표시 |
| 7 | US3-2 비우기 | 전부 삭제(또는 공백만) → 저장 → 새로고침 | 빈 입력란 + placeholder (DB `introduction = null`) |
| 8 | 엣지 500자 | 500자 붙여넣기 후 추가 입력 시도 | 500자에서 차단(경고 없음) |
| 9 | 엣지 줄바꿈 | 여러 줄 입력 → 저장 → 새로고침 | 줄 구성 동일(SC-002) |
| 10 | FR-006 실패 | DevTools Network 오프라인 → 저장 | 실패 안내(alert), 입력 내용 유지 |
| 11 | FR-008 회귀 | 별명 변경·사진 변경·이메일 표시·로그아웃 | 기존과 동일 동작 |

브라우저 자동 검증이 필요하면 `/verify` 스킬로 위 표의 1–9를 재생한다.

## 3. 완료 판정

- [ ] `npm test` 전체 통과, 출력 무결(에러·경고 없음)
- [ ] 위 표 1–11 전부 기대 결과와 일치
- [ ] Supabase `profile` 테이블 구조가 시작 시점과 동일(스키마 diff 없음 — FR-007)
- [ ] DESIGN.md에 `.field-textarea` 조각·§4.4 필드 순서·§6.5 카피가 반영됨(헌법 III)
