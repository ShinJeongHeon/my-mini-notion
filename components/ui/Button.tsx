"use client";

import type { LucideIcon } from "lucide-react";

type ButtonProps = {
  variant?: "primary" | "secondary";
  iconLeft?: LucideIcon;
  children: React.ReactNode;
  onClick?: React.MouseEventHandler<HTMLButtonElement>;
  type?: "button" | "submit";
};

export function Button({
  variant = "primary",
  iconLeft: IconLeft,
  children,
  onClick,
  type = "button",
}: ButtonProps) {
  return (
    <button type={type} className={`btn btn--${variant}`} onClick={onClick}>
      {IconLeft && <IconLeft size={16} />}
      {children}
    </button>
  );
}
