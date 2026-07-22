# Contract: 사이드바 접기/펼치기 (003-sidebar-collapse)

이 문서가 저장 키·컨트롤·레이아웃 동작의 **정본 계약**이다. 구현·테스트·
DESIGN.md 반영은 모두 이 값을 따른다.

## 1. 저장 계약 (localStorage)

| 항목 | 값 |
|---|---|
| 키 | `mini-notion-sidebar` |
| 허용값 | `"collapsed"`, `"expanded"` (그 외 전부 무효) |
| 무효·부재·예외 시 | 펼침으로 해석. 저장값을 지우거나 덮어쓰지 않는다(다음 토글 때 자연 교정) |
| 쓰기 | 토글 클릭마다 다음 상태를 즉시 기록. 실패는 조용히 무시(오류 UI 없음) |
| 접근자 | `lib/local-pref.ts` — `readLocalPref(key, allowed)` / `writeLocalPref(key, value)` (data-model.md §2) |

## 2. 컨트롤 계약

두 버튼 모두 기존 프리미티브 `IconButton`(DESIGN.md §2.2)을 사용한다.
`IconButton`은 선택적 `ariaExpanded?: boolean` prop을 얻는다 —
지정 시 `aria-expanded="true|false"` 출력, 미지정 시 속성 없음(기존 사용처 무영향).

### 2.1 접기 버튼 — 펼침 상태에서만 존재

| 항목 | 값 |
|---|---|
| 위치 | 사이드바 최상단 헤더 행 `.sidebar__header`(우측 정렬), "홈" 항목 위 |
| 아이콘 | `PanelLeftClose` (lucide, size 16 — IconButton md 기본) |
| 접근성 이름 | `사이드바 접기` (IconButton `title` → `title`+`aria-label`) |
| 상태 | `aria-expanded="true"` |
| 클릭 | 접힘 상태로 전환 + `"collapsed"` 기록 |
| 키보드 | 네이티브 `<button>` — Tab 포커스, Enter/Space 활성화(FR-004) |

### 2.2 펼치기 버튼 — 접힘 상태에서만 존재

| 항목 | 값 |
|---|---|
| 위치 | 본문 좌상단 고정 — 래퍼 `.sidebar-expand` = `position: fixed; top: 56px; left: 12px; z-index: 10` (스펙 Clarifications 2026-07-22) |
| 아이콘 | `PanelLeftOpen` (lucide, size 16) |
| 접근성 이름 | `사이드바 펼치기` |
| 상태 | `aria-expanded="false"` |
| 클릭 | 펼침 상태로 전환 + `"expanded"` 기록 |
| 가시성 | 본문 스크롤·화면(홈/상세/마이)과 무관하게 항상 표시(FR-003, Acceptance US1-3) |

## 3. 레이아웃 계약

| 상태 | DOM | 결과 |
|---|---|---|
| 펼침 | `<nav class="sidebar">` 존재(내용은 DESIGN.md §3.3 그대로 + 상단 `.sidebar__header`) | 본문 `.app-main`은 기존 폭 |
| 접힘 | `<nav class="sidebar">` **미렌더**(전체 콘텐츠·프로필 포함 숨김, FR-002) | `.app-main`(`flex:1`)이 사이드바 폭 264px을 흡수해 확장(SC-002) |

- 전환은 즉시(애니메이션 없음, research.md §1) — FR-007의 1초 이내·깜빡임 없음.
- 접힘 중 사이드바 내부 요소는 DOM에 없으므로 탭 순서·접근성 트리에서 제외
  (Edge Case).
- `search` 검색어 상태는 `AppShell` 소유로 접기/펼치기와 무관하게 유지(FR-008).
- 상단바(`.topbar`)·본문 콘텐츠는 이 기능이 수정하지 않는다.

## 4. CSS 계약 (globals.css App shell 섹션에 추가)

```css
.sidebar__header {
  display: flex;
  justify-content: flex-end;
  margin-bottom: 4px;
}
.sidebar-expand {
  position: fixed;
  top: 56px;   /* 상단바 48px + 8px */
  left: 12px;
  z-index: 10; /* .detail-char-count와 동일 계층, .slash-menu(20) 아래 */
}
```

신규 토큰 없음 — 값은 기존 간격 스케일(4/8/12)과 z-index 계층(DESIGN.md
§2.7.16)에서 가져온다. 구현 시 DESIGN.md §2.2(IconButton prop), §3(사이드바
구조·접힘 상태), §1.7(아이콘 2종), §6.1(문구 2건)에 동시 반영한다(헌법 III).

## 5. 문구 계약 (DESIGN.md §6.1에 추가될 카피)

| 위치 | 문구 |
|---|---|
| 접기 버튼 title | `사이드바 접기` |
| 펼치기 버튼 title | `사이드바 펼치기` |
