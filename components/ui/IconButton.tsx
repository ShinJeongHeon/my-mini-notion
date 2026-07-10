"use client";

import type { LucideIcon } from "lucide-react";

type IconButtonProps = {
  icon: LucideIcon;
  size?: "sm" | "md";
  title?: string;
  onClick?: React.MouseEventHandler<HTMLButtonElement>;
};

export function IconButton({
  icon: Icon,
  size = "md",
  title,
  onClick,
}: IconButtonProps) {
  return (
    <button
      type="button"
      className={`icon-btn${size === "sm" ? " icon-btn--sm" : ""}`}
      title={title}
      aria-label={title}
      onClick={onClick}
    >
      <Icon size={size === "sm" ? 14 : 16} />
    </button>
  );
}
