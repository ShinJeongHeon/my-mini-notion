"use client";

import type { LucideIcon } from "lucide-react";

// 표준 button 속성(aria-*, onClick, disabled, ref …)은 그대로 통과시킨다 —
// 속성마다 전용 prop을 늘리지 않는다. (React 19: ref도 일반 prop으로 전달됨)
type IconButtonProps = React.ComponentPropsWithRef<"button"> & {
  icon: LucideIcon;
  size?: "sm" | "md";
};

export function IconButton({
  icon: Icon,
  size = "md",
  title,
  className,
  ...rest
}: IconButtonProps) {
  return (
    <button
      type="button"
      className={`icon-btn${size === "sm" ? " icon-btn--sm" : ""}${
        className ? ` ${className}` : ""
      }`}
      title={title}
      aria-label={title}
      {...rest}
    >
      <Icon size={size === "sm" ? 14 : 16} />
    </button>
  );
}
