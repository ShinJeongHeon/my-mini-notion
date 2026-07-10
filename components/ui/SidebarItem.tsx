"use client";

import { Star, type LucideIcon } from "lucide-react";

type SidebarItemProps = {
  icon: LucideIcon;
  label: string;
  active?: boolean;
  favorite?: boolean;
  onClick?: () => void;
};

export function SidebarItem({
  icon: Icon,
  label,
  active,
  favorite,
  onClick,
}: SidebarItemProps) {
  return (
    <button
      type="button"
      className={`sidebar-item${active ? " is-active" : ""}`}
      onClick={onClick}
    >
      <span className="sidebar-item__icon">
        <Icon size={16} />
      </span>
      <span className="sidebar-item__label">{label}</span>
      {favorite && (
        <span className="sidebar-item__star">
          <Star size={13} />
        </span>
      )}
    </button>
  );
}
