# Quickstart: 다크모드 검증 (003-dark-mode)

구현이 끝난 뒤 기능이 end-to-end로 동작함을 증명하는 실행 가이드.
계약 세부는 [contracts/theme-contract.md](./contracts/theme-contract.md),
상태 규칙은 [data-model.md](./data-model.md) 참조.

## 사전 조건

- `npm install` 완료, `.env.local`에 Supabase 변수 존재(`.env.example` 참조)
- 브라우저(Chrome 권장 — 시스템 테마 에뮬레이션 사용)

## 1. 단위 테스트 (TDD 게이트)

```bash
npm test                          # 전체 — 기존 스위트와 신규 테마 테스트 전부 통과, 에러·경고 0
npm test -- __tests__/theme.test.tsx        # 해석 로직·초기화 스크립트·훅
npm test -- __tests__/theme-toggle.test.tsx # 사이드바 토글 버튼
```

기대: 전부 통과. 실패 테스트가 하나라도 있으면 완료 아님(헌법 게이트).

## 2. 브라우저 검증 (US1 — 토글 전환)

```bash
npm run dev   # http://localhost:3000
```

1. 로그인 후 `/` 진입 → 사이드바 하단(프로필 위)에 `다크 모드` 버튼(달 아이콘) 확인.
2. 클릭 → 새로고침 없이 전 영역(상단바·사이드바·본문)이 즉시 다크 전환,
   버튼이 `라이트 모드`(해 아이콘)로 변경. DevTools에서
   `document.documentElement.dataset.theme === "dark"` 확인.
3. 목록 → 상세 → 마이 페이지로 이동해도 다크 유지. 커버 이미지 스켈레톤·
   빈 목록·삭제 버튼 hover 등 상태 화면 판독 가능 확인.
4. 다시 클릭 → 라이트 복귀.

## 3. 지속성 검증 (US2)

1. 다크 전환 → `localStorage.getItem("mini-notion-theme") === "dark"` 확인.
2. 새로고침(Ctrl+R) 및 강력 새로고침(Ctrl+Shift+R) → **라이트 화면이 한 프레임도
   비치지 않고** 처음부터 다크(FR-007). 의심스러우면 DevTools Performance 탭
   녹화로 첫 페인트 프레임 확인.
3. 탭 닫고 재접속 → 다크 유지.

## 4. 시스템 따름 검증 (US3)

1. `localStorage.removeItem("mini-notion-theme")` 후 새로고침.
2. DevTools → Rendering → "Emulate CSS prefers-color-scheme: dark" → 앱이
   다크로 표시(저장 없이). light 에뮬레이션 → 라이트 표시.
3. 에뮬레이션을 열어둔 채 값 전환 → 새로고침 없이 실시간 추종(FR-005).
4. 토글로 명시 선택 → 에뮬레이션을 반대로 바꿔도 앱 테마 불변(FR-006).

## 5. 접근성 검증 (SC-004)

- 다크 상태에서 spec SC-004의 화면·상태 목록을 순회(로그인 화면은 로그아웃 후
  `/login`), DevTools Lighthouse(또는 CSS Overview → Colors)로 대비 이슈 0건
  확인 — 기준값은 contracts §5 표.

## 6. 저장 차단 엣지 케이스

1. DevTools Application → Storage에서 사이트 데이터 차단(또는 시크릿 모드 +
   서드파티 차단 설정) 후 접속.
2. 토글 클릭 → 콘솔 에러 없이 세션 내 전환 동작. 새로고침 → 초기 테마 복귀
   (허용된 동작, spec Edge Case).

## 자동 브라우저 검증

`verify` 스킬(`.claude/skills/verify/SKILL.md`)의 Playwright 절차를 따른다.
로그인 없이 `/login` 화면에서 검증 가능한 것은 §4의 시스템 따름(테마는 로그인
화면에도 적용 — FR-002 후단·FR-005)과, DevTools로
`localStorage["mini-notion-theme"]`를 미리 심은 뒤 확인하는 §3의
no-FOUC·지속성이다. §2의 토글 시나리오는 토글이 사이드바에만 있으므로
로그인 후 화면에서 실행한다.
