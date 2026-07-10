# 미니 노션 (Mini Notion)

개인 업무 관리 웹 서비스. Claude Design 프로젝트(`미니 노션.dc.html`)의 하이파이 디자인과
ui:bowl 디자인 시스템을 Next.js(App Router)로 구현했습니다.

## 실행

```bash
npm install
npm run dev      # http://localhost:3000
```

## 페이지 구성 (하나의 서비스로 결합)

| 경로 | 화면 |
|------|------|
| `/login` | 로그인 — Google 계정으로 계속하기 (데모: 클릭 시 로그인 처리) |
| `/` | 업무 페이지 — 글 목록, `/page` 슬래시 커맨드로 새 글 생성 |
| `/posts/[id]` | 글 상세 — 제목·내용 편집(자동 저장), 즐겨찾기, 삭제 |
| `/mypage` | 마이 페이지 — 별명·프로필 이미지 변경, 로그아웃 |

로그인하지 않은 상태로 앱 경로에 접근하면 `/login` 으로 이동합니다.

## 구조

- `app/globals.css` — ui:bowl 디자인 토큰(색상·타이포·간격·그림자·모션) + 화면 스타일
- `app/fonts/PretendardVariable.woff2` — 서체 (`next/font/local`)
- `lib/store.tsx` — 앱 상태 + `localStorage`(`mini-notion-v1`) 영속화, 최초 방문 시 샘플 글 시드
- `components/ui/` — 디자인 시스템 프리미티브 (Button, IconButton, Badge, Avatar, SidebarItem, SidebarSection)
- `components/AppShell.tsx` — 상단바 + 사이드바 + 인증 가드
- 아이콘: [lucide-react](https://lucide.dev) (디자인 시스템과 동일한 Lucide 세트)

## 참고

- 데이터는 브라우저 `localStorage` 에만 저장됩니다(운영 비용 0원 — PRD 제약).
  실제 Google OAuth·DB 연동 시 `lib/store.tsx` 의 `login/logout` 과 persistence 부분만 교체하면 됩니다.
