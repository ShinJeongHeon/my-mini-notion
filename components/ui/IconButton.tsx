"use client";

import type { LucideIcon } from "lucide-react";

type IconButtonProps = {
  icon: LucideIcon;
  size?: "sm" | "md";
  title?: string;
  ariaExpanded?: boolean;
  onClick?: React.MouseEventHandler<HTMLButtonElement>;
};

export function IconButton({
  icon: Icon,
  size = "md",
  title,
  ariaExpanded,
  onClick,
}: IconButtonProps) {
  return (
    <button
      type="button"
      className={`icon-btn${size === "sm" ? " icon-btn--sm" : ""}`}
      title={title}
      aria-label={title}
      aria-expanded={ariaExpanded}
      onClick={onClick}
    >
      <Icon size={size === "sm" ? 14 : 16} />
    </button>
  );
}
