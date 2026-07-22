"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Image as ImageIcon, LogOut, Mail } from "lucide-react";
import { useApp } from "@/lib/store";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";

export default function MyPage() {
  const app = useApp();
  const [nickDraft, setNickDraft] = useState("");
  const [introDraft, setIntroDraft] = useState("");
  const [saved, setSaved] = useState(false);
  const [uploading, setUploading] = useState(false);
  const savedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Fill the draft once profile data is loaded.
  useEffect(() => {
    if (app.loaded) setNickDraft(app.displayName);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [app.loaded]);

  useEffect(() => {
    return () => {
      if (savedTimer.current) clearTimeout(savedTimer.current);
    };
  }, []);

  const onSave = async () => {
    const ok = await app.saveProfile({
      name: nickDraft,
      introduction: introDraft,
    });
    if (!ok) {
      window.alert("저장에 실패했습니다. 잠시 후 다시 시도해주세요.");
      return;
    }
    setSaved(true);
    if (savedTimer.current) clearTimeout(savedTimer.current);
    savedTimer.current = setTimeout(() => setSaved(false), 1800);
  };

  // Upload to Supabase Storage; reset the input so picking the same file
  // again still fires change. Re-entry is blocked while an upload is pending.
  const onAvatarPick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || uploading) return;
    setUploading(true);
    const ok = await app.saveAvatar(file);
    setUploading(false);
    if (!ok) {
      window.alert("사진 업로드에 실패했습니다. 잠시 후 다시 시도해주세요.");
    }
  };

  return (
    <div className="mypage">
      <h1 className="mypage__title">마이 페이지</h1>
      <p className="mypage__subtitle">
        서비스에서 사용할 프로필 정보를 관리하세요.
      </p>

      <div className="mypage-card">
        <div className="mypage-avatar-row">
          <Avatar name={app.displayName} src={app.avatar} size={72} />
          <div className="mypage-avatar-row__body">
            <div className="mypage-avatar-row__name">프로필 이미지</div>
            <div className="mypage-avatar-row__hint">
              JPG, PNG · 정사각형 이미지를 권장합니다.
            </div>
            <label className="upload-btn">
              <ImageIcon size={16} />
              사진 변경
              <input
                type="file"
                accept="image/*"
                disabled={uploading}
                onChange={onAvatarPick}
                style={{ display: "none" }}
              />
            </label>
          </div>
        </div>

        <div className="mypage-field">
          <label htmlFor="nickname">별명</label>
          <input
            id="nickname"
            className="field-input"
            value={nickDraft}
            onChange={(e) => setNickDraft(e.target.value)}
            placeholder="사용할 별명을 입력하세요"
          />
        </div>

        <div className="mypage-field">
          <label htmlFor="introduction">자기소개</label>
          <textarea
            id="introduction"
            className="field-textarea"
            value={introDraft}
            onChange={(e) => setIntroDraft(e.target.value)}
            placeholder="자기소개를 입력하세요"
            maxLength={500}
          />
        </div>

        <div className="mypage-field mypage-field--email">
          <label>이메일</label>
          <div className="field-readonly">
            <Mail size={16} />
            <span className="field-readonly__value">{app.email}</span>
            <Badge>Google 계정</Badge>
          </div>
        </div>

        <div className="mypage-card__footer">
          <Button variant="primary" onClick={onSave}>
            변경사항 저장
          </Button>
          {saved && (
            <span className="saved-note">
              <Check size={16} />
              저장되었습니다
            </span>
          )}
        </div>
      </div>

      <div className="logout-card">
        <div className="logout-card__body">
          <div className="logout-card__title">로그아웃</div>
          <div className="logout-card__desc">
            이 기기에서 계정을 로그아웃합니다.
          </div>
        </div>
        <Button variant="secondary" iconLeft={LogOut} onClick={app.logout}>
          로그아웃
        </Button>
      </div>
    </div>
  );
}
