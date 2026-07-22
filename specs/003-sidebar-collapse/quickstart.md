# Quickstart: 사이드바 접기/펼치기 검증 (003-sidebar-collapse)

기능이 end-to-end로 동작함을 증명하는 실행 가능한 검증 절차.
세부 값의 정본은 [contracts/sidebar-contract.md](./contracts/sidebar-contract.md),
데이터 규칙은 [data-model.md](./data-model.md) 참조.

## 사전 조건

- 의존성 설치: `npm install`
- Supabase 환경변수: `.env.local` (없으면 `.env.example` 참조 — 로그인에 필요)

## 1. 자동 테스트 (헌법 I 완료 게이트)

```bash
npm test                                    # 전체 — 기존 22개 + 신규 전부 그린이어야 완료
npm test -- __tests__/sidebar-collapse.test.tsx   # 이 기능 테스트만
```

기대: 실패 0, 에러·경고 없는 출력. 신규 테스트가 검증하는 것 —
local-pref 라운드트립/무효값 폴백, 토글 시 nav 존재↔부재, `aria-expanded`
전환, localStorage 기록, 검색어 유지, 사전 저장값 복원, 연속 클릭 수렴
(research.md §6 시나리오 목록).

## 2. 브라우저 검증 (jsdom 밖 관심사 — `verify` 스킬 사용 가능)

```bash
npm run dev   # http://localhost:3000
```

로그인 후 순서대로:

| # | 절차 | 기대 결과 | 근거 |
|---|---|---|---|
| 1 | 사이드바 상단의 "사이드바 접기" 버튼 클릭 | 사이드바 전체(홈·검색·내 글·앱·프로필)가 사라지고 본문이 264px만큼 넓어짐. 본문 좌상단에 "사이드바 펼치기" 버튼 표시 | US1-1, SC-002 |
| 2 | "사이드바 펼치기" 버튼 클릭 | 사이드바가 동일 구성으로 복귀 | US1-2 |
| 3 | 검색창에 검색어 입력 → 접기 → 펼치기 | 검색어·필터링된 목록 그대로 | US1-4, FR-008 |
| 4 | 접힌 상태로 글 상세·마이 페이지 이동 | 모든 화면에서 접힘 유지 + 펼치기 버튼 항상 표시(본문 스크롤 포함) | US2, US1-3 |
| 5 | 접힌 상태에서 새로고침(F5) | 접힌 상태로 나타남(펼침→접힘 깜빡임 없음) | US3-1, FR-007 |
| 6 | DevTools 콘솔: `localStorage.setItem("mini-notion-sidebar","banana")` → 새로고침 | 펼침 기본값, 오류 노출 없음 | Edge Case, FR-006 |
| 7 | Tab 키만으로 접기 버튼 포커스 → Enter, 이어서 펼치기 버튼 → Space | 마우스 없이 접기·펼치기 완료. 접힌 동안 Tab 순서에 사이드바 항목 없음 | SC-005, FR-004 |
| 8 | 토글 버튼 빠르게 5연타 | 최종 상태가 홀수=반전, 짝수=원위치로 수렴, 레이아웃 깨짐 없음 | Edge Case |

## 3. 완료 체크리스트 (구현 종료 전 확인)

- [ ] `npm test` 전체 그린 + 무결한 출력(에러·경고 없음) — 헌법 I·완료 게이트
- [ ] 위 브라우저 절차 1–8 통과
- [ ] DESIGN.md 반영 완료(헌법 III): §2.2 `ariaExpanded` prop, §3 사이드바
      헤더·접힘 상태·`.sidebar-expand`, §1.7 `PanelLeftClose`/`PanelLeftOpen`,
      §6.1 문구 2건 (계약 §4·§5)
- [ ] 신규 라이브러리·신규 토큰 없음(헌법 V, 계약 §4)
