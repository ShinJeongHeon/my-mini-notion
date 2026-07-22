"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowUpDown,
  ChevronRight,
  FilePlus2,
  FileText,
  Plus,
  SquarePen,
  Star,
} from "lucide-react";
import { formatDate, useApp } from "@/lib/store";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { IconButton } from "@/components/ui/IconButton";

export default function ListPage() {
  const app = useApp();
  const router = useRouter();
  const [query, setQuery] = useState("");

  const showSlash = query.trim().startsWith("/");

  const createPage = async (title: string) => {
    const post = await app.createPost(title);
    if (!post) return; // 실패·비로그인 — postsError 안내가 표시된다 (FR-001/008)
    setQuery("");
    router.push(`/posts/${post.id}`);
  };

  const onQueryKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Escape") {
      setQuery("");
      return;
    }
    if (e.key !== "Enter") return;
    e.preventDefault();
    const q = query.trim();
    if (!q) return;
    if (q.toLowerCase().startsWith("/page")) {
      void createPage(q.slice(5).trim());
      return;
    }
    if (q.startsWith("/")) return; // unknown command, wait
    void createPage(q);
  };

  return (
    <div className="list-page">
      <h1 className="list-page__title">내 업무</h1>
      <p className="list-page__subtitle">
        기록하고 싶은 것을 자유롭게 남겨보세요.
      </p>

      <div className="composer-wrap">
        <div className="composer">
          <span className="composer__icon">
            <SquarePen size={18} />
          </span>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onQueryKey}
            placeholder="/page 를 입력하거나 할 일을 적어보세요"
          />
          <Button
            variant="primary"
            iconLeft={Plus}
            onClick={() => void createPage("")}
          >
            새 페이지
          </Button>
        </div>

        {showSlash && (
          <div className="slash-menu">
            <div className="slash-menu__group">기본 블록</div>
            <button
              type="button"
              className="slash-menu__item"
              onClick={() => void createPage("")}
            >
              <span className="slash-menu__tile">
                <FileText size={18} />
              </span>
              <span className="slash-menu__body">
                <span className="slash-menu__name">페이지</span>
                <br />
                <span className="slash-menu__desc">
                  제목과 내용이 있는 새 글을 만듭니다
                </span>
              </span>
              <kbd>/page</kbd>
            </button>
          </div>
        )}
      </div>
      <p className="composer-hint">
        노션처럼 <b>/page</b> 를 입력하고 Enter를 누르면 새 글이 만들어져요.
      </p>
      {app.postsError && (
        <p className="error-note" role="alert">
          {app.postsError}
        </p>
      )}

      {app.posts.length > 0 ? (
        <>
          <div className="list-head">
            <span className="list-head__label">전체</span>
            <Badge>{app.posts.length}</Badge>
            <div className="list-head__spacer" />
            <IconButton icon={ArrowUpDown} size="sm" title="정렬" />
          </div>
          <div className="post-list">
            {app.posts.map((post) => (
              <div
                key={post.id}
                className="post-card"
                role="link"
                tabIndex={0}
                onClick={() => router.push(`/posts/${post.id}`)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") router.push(`/posts/${post.id}`);
                }}
              >
                <span className="post-card__tile">
                  <FileText size={18} />
                </span>
                <span className="post-card__body">
                  <span className="post-card__title">
                    {post.title.trim() || "제목 없음"}
                  </span>
                  <br />
                  <span className="post-card__preview">
                    {post.content.replace(/\s+/g, " ").trim().slice(0, 90) ||
                      "내용 없음"}
                  </span>
                </span>
                <span className="post-card__date">
                  {formatDate(post.createdAt)}
                </span>
                <button
                  type="button"
                  className={`fav-btn${post.favorite ? " is-fav" : ""}`}
                  title="즐겨찾기"
                  onClick={(e) => {
                    e.stopPropagation();
                    app.toggleFavorite(post.id);
                  }}
                >
                  <Star size={16} />
                </button>
                <span className="post-card__chevron">
                  <ChevronRight size={16} />
                </span>
              </div>
            ))}
          </div>
        </>
      ) : (
        <div className="empty-state">
          <span className="empty-state__tile">
            <FilePlus2 size={40} />
          </span>
          <div className="empty-state__title">첫 글을 만들어 보세요</div>
          <div className="empty-state__desc">
            위 입력창에 <b>/page</b> 를 입력하고 Enter를 누르거나
            <br />
            ‘새 페이지’ 버튼을 눌러 시작하세요.
          </div>
        </div>
      )}
    </div>
  );
}
