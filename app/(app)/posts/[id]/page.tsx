"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Calendar, ChevronRight, Star, Trash2 } from "lucide-react";
import { formatDate, useApp } from "@/lib/store";
import { IconButton } from "@/components/ui/IconButton";
import { PostCover } from "@/components/PostCover";

export default function PostDetailPage() {
  const app = useApp();
  const router = useRouter();
  const { id } = useParams<{ id: string }>();

  const post = app.posts.find((p) => p.id === id);

  // Deleted or unknown post → back to the list.
  useEffect(() => {
    if (app.loaded && !post) router.replace("/");
  }, [app.loaded, post, router]);

  if (!post) return null;

  const handleDelete = () => {
    if (window.confirm("이 글을 삭제할까요? 삭제하면 되돌릴 수 없어요.")) {
      app.deletePost(post.id);
      router.push("/");
    }
  };

  return (
    <div className="detail-page">
      <div className="detail-breadcrumb">
        <IconButton
          icon={ArrowLeft}
          title="뒤로"
          onClick={() => router.push("/")}
        />
        <button
          type="button"
          className="detail-breadcrumb__root"
          onClick={() => router.push("/")}
        >
          내 업무
        </button>
        <span className="detail-breadcrumb__sep">
          <ChevronRight size={14} />
        </span>
        <span className="detail-breadcrumb__current">
          {post.title.trim() || "제목 없음"}
        </span>
        <div className="detail-breadcrumb__spacer" />
        <button
          type="button"
          className={`detail-fav-btn${post.favorite ? " is-fav" : ""}`}
          title="즐겨찾기"
          onClick={() => app.toggleFavorite(post.id)}
        >
          <Star size={18} />
        </button>
        <button
          type="button"
          className="detail-delete-btn"
          onClick={handleDelete}
        >
          <Trash2 size={16} />
          삭제
        </button>
      </div>

      <PostCover />

      <input
        className="detail-title"
        value={post.title}
        onChange={(e) => app.updatePost(post.id, { title: e.target.value })}
        placeholder="제목 없음"
      />
      <div className="detail-meta">
        <Calendar size={14} />
        <span>{formatDate(post.createdAt)} 작성</span>
        <span className="detail-meta__dot" />
        <span>자동 저장됨</span>
      </div>
      <textarea
        className="detail-content"
        value={post.content}
        onChange={(e) => app.updatePost(post.id, { content: e.target.value })}
        placeholder="내용을 입력하세요. 떠오르는 생각, 할 일, 메모를 자유롭게 기록해 보세요."
      />
      <span data-testid="content-char-count" className="detail-char-count">
        {post.content.length}
      </span>
    </div>
  );
}
