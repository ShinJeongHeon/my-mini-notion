"use client";

import type { LucideIcon } from "lucide-react";
import { IconButton } from "./IconButton";

type SectionAction = {
  icon: LucideIcon;
  title: string;
  onClick: () => void;
};

type SidebarSectionProps = {
  label: string;
  count?: number;
  actions?: SectionAction[];
  children: React.ReactNode;
};

export function SidebarSection({
  label,
  count,
  actions,
  children,
}: SidebarSectionProps) {
  return (
    <div className="sidebar-section">
      <div className="sidebar-section__header">
        <span>{label}</span>
        {typeof count === "number" && (
          <span className="sidebar-section__count">{count}</span>
        )}
        {actions && actions.length > 0 && (
          <span className="sidebar-section__actions">
            {actions.map((a) => (
              <IconButton
                key={a.title}
                icon={a.icon}
                size="sm"
                title={a.title}
                onClick={a.onClick}
              />
            ))}
          </span>
        )}
      </div>
      {children}
    </div>
  );
}
