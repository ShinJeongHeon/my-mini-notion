# Data Model: 다크모드 (003-dark-mode)

이 기능의 데이터는 서버·DB와 무관한 기기 로컬 UI 선호값 1개다.

## Entity: ThemePreference (테마 설정)

| 속성 | 값 | 설명 |
|---|---|---|
| 저장 위치 | `localStorage["mini-notion-theme"]` | 기기(브라우저) 단위, 계정 비귀속 (spec Key Entities) |
| 저장 값 | `"light"` \| `"dark"` | 원시 문자열. 그 외 값·부재는 읽기 시 "미설정"으로 정규화 |
| 논리 상태 | `light` / `dark` / **미설정(시스템 따름)** | 미설정은 저장소에 키 부재로 표현 |

### 파생 값: EffectiveTheme (유효 테마)

```
resolveTheme(stored, systemDark):
  stored ∈ {"light","dark"}  → stored          (FR-006: 명시 선택 우선)
  그 외(부재·무효)            → systemDark ? "dark" : "light"   (FR-005)
```

- `systemDark` = `matchMedia("(prefers-color-scheme: dark)").matches`
- EffectiveTheme은 항상 `<html data-theme>`에 구체값으로 반영된다
  (research.md §1). 별도 React 전역 상태·Context 없음 — DOM 속성이 원본.

### 상태 전이

| 현재 논리 상태 | 이벤트 | 다음 상태 | 부수효과 |
|---|---|---|---|
| any | 토글 클릭 | EffectiveTheme의 반대값으로 **명시 설정** | `data-theme` 갱신 + localStorage 기록(FR-002·004) |
| 미설정 | 시스템 테마 변경 | 미설정(유지) | EffectiveTheme 재계산 → `data-theme` 갱신(FR-005) |
| light/dark(명시) | 시스템 테마 변경 | 변화 없음 | 없음(FR-006) |
| any | 페이지 로드 | 유지 | 인라인 스크립트가 첫 페인트 전 `data-theme` 세팅(FR-007) |

- 전이에 "미설정으로 복귀"는 없다 — 토글 UI는 light/dark 2값만 오간다
  (spec Assumptions: "시스템 따름" 선택지 미노출).

### 검증 규칙

저장 프로토콜(키·허용값·무효 정규화·try/catch 폴백)의 정본은
`contracts/theme-contract.md` §2다. 요약: 두 허용값 외에는 전부 미설정 취급,
접근 실패는 조용히 무시하고 세션 내 토글은 DOM 속성만으로 동작(spec Edge Case).

### 다른 데이터와의 관계

- `mini-notion-v1`(posts/nickname/avatar, `lib/store.tsx`)과 **완전 독립** —
  스키마·로드 사이클을 공유하지 않는다(research.md §4).
- Supabase(`profile` 테이블)에 저장하지 않는다 — 계정 간 동기화는 범위 외
  (spec Assumptions).
- 이 엔티티의 저장 접근 패턴이 spec Assumptions의 공유 "기기 로컬 UI 선호값"
  메커니즘이다 — `003-sidebar-collapse`는 `lib/theme.ts`의 제네릭 접근자
  `readLocalPref`/`writeLocalPref`(계약 §4)를 재사용한다.
