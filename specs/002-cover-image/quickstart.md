# Quickstart / 검증 가이드: 커버 이미지

이 기능이 端-to-端으로 동작함을 증명하는 실행·검증 시나리오. 구현 코드는 여기에 두지 않는다
(tasks/구현 단계 소관). 상세 상태·계약은 [data-model.md](./data-model.md) ·
[contracts/](./contracts/) 참조.

## 사전 조건

- 의존성 설치: `npm install` (신규 의존성 없음)
- 저장소 표준 테스트 스택: Vitest 4 + RTL + jsdom (`vitest.config.mts`)

## A. 자동 테스트 (TDD, 헌법 원칙 I)

`__tests__/post-cover.test.tsx` — 기존 `post-detail-char-count.test.tsx`의 패턴(로컬스토리지
시드 + `next/navigation` 모킹)을 재사용한다. 각 테스트는 **먼저 실패**(RED)를 확인한 뒤 구현한다.

실행:
```bash
npm test -- __tests__/post-cover.test.tsx     # 해당 파일만
npm test                                       # 전체(완료 게이트)
```

검증 시나리오 → 기대:

| # | 시나리오 | 조작 | 기대 결과 | 스펙 |
|---|---|---|---|---|
| 1 | 초기 로딩 | 상세 화면 렌더 | `cover-skeleton` 존재, 스피너 없음, `cover-image`는 아직 미표시 | FR-003, US2 |
| 2 | 로드 완료 | `cover-image`에 `load` 이벤트 fire | `cover-skeleton` 사라짐, `cover-image` 표시(`data-loaded="true"`) | FR-004, US2 |
| 3 | 로드 실패 | `cover-image`에 `error` 이벤트 fire | `detail-cover` 컨테이너 제거(collapse), 깨진 이미지 없음 | FR-005, US3 |
| 4 | 실패 후 편집 | error 상태에서 제목/본문 입력 | 입력이 정상 반영(자동 저장 동작 유지) | FR-006, SC-004 |
| 5 | 배치 | 렌더된 DOM 순서 확인 | `detail-cover`가 `.detail-title` 입력창보다 앞(위)에 위치 | FR-001 |
| 6 | 엔드포인트 | `cover-image`의 `src` | `https://cataas.com/cat/cute`로 시작 | FR-002 |
| 7 | 장식 alt | `cover-image`의 `alt` | 빈 문자열(`""`) | research §5 |

참고: jsdom은 실제 네트워크 로드를 하지 않으므로 `fireEvent.load(img)` /
`fireEvent.error(img)`로 상태 전이를 구동한다(모킹이 아니라 실제 컴포넌트의 실제 DOM 이벤트 —
헌법 원칙 II 준수).

## B. 수동 검증 (실제 앱, `/verify` 스킬 권장)

```bash
npm run dev        # 개발 서버
```

1. 로그인 후 아무 게시글이나 열기(`/posts/[id]`).
2. **로딩**: 진입 직후 제목 위에 스켈레톤(은은한 shimmer)이 보이고, 스피너는 없다(FR-003).
3. **표시**: 잠시 후 스켈레톤이 고양이 사진으로 바뀌며, **제목·본문 위치가 튀지 않는다**
   (layout shift 0, SC-003).
4. **편집 무관성**: 로딩 중에도 제목/본문을 즉시 입력할 수 있다(SC-004).
5. **매 진입 새 랜덤**: 목록으로 나갔다가 같은 글을 다시 열면 다른 고양이가 나올 수 있다(FR-008).
6. **실패 처리**: (DevTools Network에서 `cataas.com` 차단 또는 오프라인) 진입 시 깨진 이미지·무한
   스켈레톤 없이 커버가 접히고 편집은 정상 동작한다(FR-005/SC-005).

## C. 완료 게이트 (헌법 Development Workflow)

- [ ] `npm test` 전체 통과, 출력 무결(에러·경고 없음)
- [ ] 위 A 시나리오 1–7 모두 GREEN
- [ ] 수동 검증 B 2–6 확인
- [ ] `DESIGN.md`에 신규 커버 컴포넌트·`@keyframes mnShimmer`·§4.3 배치·`alt=""`·§8 커버리지
      반영(원칙 III) — 코드와 문서 일치
