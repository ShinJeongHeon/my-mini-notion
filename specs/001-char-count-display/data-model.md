# Data Model: 콘텐츠 글자 수 표시

## 개요

이 기능은 새로운 영속 엔티티나 스키마 변경을 도입하지 않는다. `lib/store.tsx`에 이미
정의된 `Post` 엔티티의 `content` 필드에서 파생(derived)되는 화면 전용 값 하나만 추가한다.

## 기존 엔티티 (변경 없음)

### Post (`lib/store.tsx`)

| 필드 | 타입 | 설명 |
|---|---|---|
| `id` | `string` | 게시글 고유 ID |
| `title` | `string` | 제목 |
| `content` | `string` | 본문 텍스트 — **이 기능의 유일한 입력 소스** |
| `favorite` | `boolean` | 즐겨찾기 여부 |
| `createdAt` | `number` | 생성 시각(epoch ms) |

## 파생 값 (신규, 비영속)

### CharCount (컴포넌트 로컬 계산값 — 저장되지 않음)

| 이름 | 계산식 | 타입 | 비고 |
|---|---|---|---|
| `charCount` | `post.content.length` | `number` | React 렌더마다 재계산. 별도 state·store 필드 없음(research.md §1, §2 참조). |

**검증/제약**:
- `post.content`가 빈 문자열(`""`)이면 `charCount === 0` (spec FR-005, SC-002).
- `charCount`는 항상 `post.content.length`와 동일해야 하며, 별도로 캐싱하거나
  낙관적으로 미리 계산하지 않는다(파생 값 불일치 방지, 헌법 원칙 V).

**상태 전이**: 없음 — `post.content`가 바뀔 때마다 매번 처음부터 다시 계산되는
순수 함수적 값이며, 자체적인 생명주기나 상태 전이가 없다.

## 스키마 변경

없음. `lib/store.tsx`의 `Post` 타입, localStorage 저장 포맷(`KEY = "mini-notion-v1"`)
모두 변경하지 않는다.
