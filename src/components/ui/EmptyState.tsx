import type { ReactNode } from "react";
import { Icon } from "./Icon";
import ui from "./ui.module.css";

export function EmptyState({ title, description, action }: { title: string; description: string; action?: ReactNode }) {
  return (
    <div className={ui.empty}>
      <div className={ui.emptyIcon}>
        <Icon name="inbox" size={24} />
      </div>
      <p className={ui.emptyTitle}>{title}</p>
      <p className={ui.emptyText}>{description}</p>
      {action}
    </div>
  );
}