// 기기 로컬 UI 선호값 접근자 (specs/003-sidebar-collapse/contracts/sidebar-contract.md §1)
// 저장값 손상·프라이빗 모드 등 어떤 실패에서도 조용히 기본 동작으로 폴백한다.

export function readLocalPref(
  key: string,
  allowed: readonly string[]
): string | null {
  try {
    const value = localStorage.getItem(key);
    return value !== null && allowed.includes(value) ? value : null;
  } catch {
    return null;
  }
}

export function writeLocalPref(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    // best-effort: 저장 실패는 무시(다음 방문 시 기본값으로 동작)
  }
}
