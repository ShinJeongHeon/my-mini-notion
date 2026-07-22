"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  Bell,
  Calendar,
  ChevronsUpDown,
  CircleHelp,
  FileText,
  House,
  LayoutGrid,
  Menu,
  Moon,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  Search,
  Settings,
  SquareCheck,
  Sun,
  Trash2,
} from "lucide-react";
import { useApp } from "@/lib/store";
import { useTheme } from "@/lib/theme";
import { readLocalPref, writeLocalPref } from "@/lib/local-pref";
import { Avatar } from "@/components/ui/Avatar";
import { IconButton } from "@/components/ui/IconButton";
import { SidebarItem } from "@/components/ui/SidebarItem";
import { SidebarSection } from "@/components/ui/SidebarSection";

const SIDEBAR_PREF_KEY = "mini-notion-sidebar";
const SIDEBAR_PREF_VALUES = ["collapsed", "expanded"] as const;

export function AppShell({ children }: { children: React.ReactNode }) {
  const app = useApp();
  const router = useRouter();
  const pathname = usePathname();
  const [search, setSearch] = useState("");
  const { theme, toggle: toggleTheme } = useTheme();
  const themeLabel = theme === "dark" ? "라이트 모드" : "다크 모드";
  const [collapsed, setCollapsed] = useState(
    () =>
      readLocalPref(SIDEBAR_PREF_KEY, SIDEBAR_PREF_VALUES) === "collapsed"
  );

  const toggleSidebar = () =>
    setCollapsed((c) => {
      const next = !c;
      writeLocalPref(SIDEBAR_PREF_KEY, next ? "collapsed" : "expanded");
      return next;
    });

  // Client-side auth guard: bounce to /login when signed out.
  useEffect(() => {
    if (app.loaded && !app.loggedIn) router.replace("/login");
  }, [app.loaded, app.loggedIn, router]);

  if (!app.loaded || !app.loggedIn) return null;

  const q = search.trim().toLowerCase();
  const navPosts = q
    ? app.posts.filter((p) =>
        (p.title || "제목 없음").toLowerCase().includes(q)
      )
    : app.posts;

  const newPage = async () => {
    const post = await app.createPost("");
    if (!post) return; // 실패 안내는 postsError로 노출된다 (FR-008)
    router.push(`/posts/${post.id}`);
  };

  return (
    <div className="app-root">
      <header className="topbar">
        <span className="brand-chip">mini</span>
        <div className="topbar__workspace">
          <span className="topbar__title">미니 노션</span>
          <ChevronsUpDown size={14} />
        </div>
        <div className="topbar__spacer" />
        <div className="topbar__bell">
          <IconButton icon={Bell} title="알림" />
          <span className="topbar__bell-dot" />
        </div>
        <IconButton icon={Search} title="검색" />
        <IconButton icon={CircleHelp} title="도움말" />
        <IconButton icon={LayoutGrid} title="앱" />
        <IconButton icon={Menu} title="메뉴" />
      </header>

      <div className="app-body">
        {collapsed && (
          <div className="sidebar-expand">
            <IconButton
              icon={PanelLeftOpen}
              title="사이드바 펼치기"
              aria-expanded={false}
              onClick={toggleSidebar}
            />
          </div>
        )}
        {!collapsed && (
        <nav className="sidebar">
          <div className="sidebar__inner">
            <div className="sidebar__header">
              <IconButton
                icon={PanelLeftClose}
                title="사이드바 접기"
                aria-expanded
                onClick={toggleSidebar}
              />
            </div>
            <SidebarItem
              icon={House}
              label="홈"
              active={pathname === "/"}
              onClick={() => router.push("/")}
            />
            <div style={{ height: 8 }} />
            <div className="input-sm">
              <Search size={14} />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="글 검색"
              />
            </div>
            <div style={{ height: 12 }} />
            <div className="sidebar__scroll mn-scroll">
              <SidebarSection
                label="내 글"
                count={app.posts.length}
                actions={[
                  { icon: Plus, title: "새 페이지", onClick: () => void newPage() },
                ]}
              >
                {navPosts.map((post) => (
                  <SidebarItem
                    key={post.id}
                    icon={FileText}
                    label={post.title.trim() || "제목 없음"}
                    favorite={post.favorite}
                    active={pathname === `/posts/${post.id}`}
                    onClick={() => router.push(`/posts/${post.id}`)}
                  />
                ))}
                {app.postsLoaded && app.posts.length === 0 && (
                  <div className="sidebar-section__empty">
                    아직 글이 없어요.
                  </div>
                )}
              </SidebarSection>
              <div style={{ height: 10 }} />
              <SidebarSection label="앱">
                <SidebarItem icon={Calendar} label="캘린더" />
                <SidebarItem icon={SquareCheck} label="할 일" />
                <SidebarItem icon={Trash2} label="휴지통" />
              </SidebarSection>
            </div>

            <SidebarItem
              icon={theme === "dark" ? Sun : Moon}
              label={themeLabel}
              onClick={toggleTheme}
            />
          </div>

          <button
            type="button"
            className="sidebar__profile"
            onClick={() => router.push("/mypage")}
          >
            <Avatar name={app.displayName} src={app.avatar} size={28} />
            <span className="sidebar__profile-body">
              <span className="sidebar__profile-name">{app.displayName}</span>
              <br />
              <span className="sidebar__profile-sub">마이 페이지</span>
            </span>
            <Settings size={16} />
          </button>
        </nav>
        )}

        <main className="app-main mn-scroll">{children}</main>
      </div>
    </div>
  );
}
