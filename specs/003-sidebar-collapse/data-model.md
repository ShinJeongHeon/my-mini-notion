# Data Model: 사이드바 접기/펼치기 (003-sidebar-collapse)

이 기능의 데이터는 스펙 Key Entities의 단일 엔티티뿐이다. 서버·DB 변경 없음.

## 1. 사이드바 표시 상태 (SidebarPref)

사용자가 마지막으로 선택한 접힘/펼침 여부. 기기·브라우저 로컬 선호값으로,
계정 간 동기화되지 않는다(스펙 Assumptions).

| 속성 | 값 |
|---|---|
| 저장소 | 브라우저 `localStorage` |
| 키 | `mini-notion-sidebar` (정본: `contracts/sidebar-contract.md` §1) |
| 타입 | 원시 문자열 열거형 — `"collapsed" \| "expanded"` |
| 기본값 | 펼침(`expanded` 해석) — 저장값 부재·무효·읽기 실패 시(FR-006) |
| 쓰기 시점 | 토글 버튼 클릭 직후(사용자 선택 즉시 기록) |
| 읽기 시점 | `AppShell` 마운트 시 1회(`useState` 지연 초기화 — research.md §5) |

### 런타임 상태와의 관계

- `AppShell` 로컬 상태 `collapsed: boolean`이 유일한 런타임 원본이다.
  - `true` ← 저장값이 정확히 `"collapsed"`일 때만
  - `false` ← 그 외 전부(`"expanded"`, `null`, 무효값, 예외)
- 앱 내 화면 이동 간 유지는 저장소가 아니라 레이아웃 상태 보존이 담당한다
  (research.md §4). 저장소는 새로고침·재방문 복원 전용.
- 다른 탭과의 실시간 동기화는 범위 밖(스펙에 요구 없음) — 각 탭은 자신의
  마운트 시점 값으로 시작한다.

### 상태 전이

```text
                ┌────────── 접기 버튼 클릭 ──────────┐
                │        (write "collapsed")         ▼
   [expanded 펼침] ◄──────────────────────── [collapsed 접힘]
                ▲        (write "expanded")          │
                └───────── 펼치기 버튼 클릭 ─────────┘

초기 상태 = readLocalPref("mini-notion-sidebar", ["collapsed","expanded"])
            === "collapsed" ? 접힘 : 펼침
```

전이는 토글 2개뿐이며 매 전이마다 저장값을 갱신한다. 연속 클릭은 각 클릭이
독립 전이이므로 최종 상태는 클릭 횟수의 짝홀로 수렴한다(Edge Case).

## 2. 접근 계층 (`lib/local-pref.ts`)

기기 로컬 UI 선호값의 공용 접근자 — 이후 `003-dark-mode`가 재사용 예정
(research.md §2).

```ts
readLocalPref(key: string, allowed: readonly string[]): string | null
// 저장값 ∈ allowed → 그 값, 그 외(부재·무효·예외) → null

writeLocalPref(key: string, value: string): void
// try/catch best-effort — 실패(프라이빗 모드 등)는 조용히 무시(Edge Case)
```

기존 `mini-notion-v1` 스토어 스키마(`DESIGN.md` §5.6)는 변경하지 않는다.
