import React from 'react';
import { Bell } from 'lucide-react';

type NotificationItem = {
  id: string;
  title: string;
  message: string;
  createdAt?: string | null;
};

type NotificationCenterProps = {
  title: string;
  items: NotificationItem[];
  emptyText: string;
  className?: string;
};

export default function NotificationCenter({ title, items, emptyText, className }: NotificationCenterProps) {
  return (
    <section className={className ?? ''}>
      <div className="ss-panel-head td-panel-head">
        <h2>{title}</h2>
        <Bell size={16} />
      </div>

      {items.length === 0 && <p className="ss-insight">{emptyText}</p>}

      {items.length > 0 && (
        <div className="ss-card-list td-stack-list">
          {items.slice(0, 5).map((item) => (
            <article key={item.id} className="ss-list-card td-stack-item">
              <div>
                <h3>{item.title}</h3>
                <p>{item.message}</p>
              </div>
              <span>{item.createdAt ? new Date(item.createdAt).toLocaleTimeString() : 'now'}</span>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
