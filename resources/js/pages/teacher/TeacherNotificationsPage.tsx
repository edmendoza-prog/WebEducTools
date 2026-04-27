import React, { useEffect, useState } from 'react';
import TeacherLayout from '../../components/ui/TeacherLayout';
import { csrfFetch } from '../../lib/csrf';
import { Sparkles } from 'lucide-react';

type NotificationItem = {
  id: string;
  title: string;
  message: string;
  createdAt?: string | null;
};

type TeacherClass = {
  id: number;
  name: string;
  subject: string;
};

export default function TeacherNotificationsPage() {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [classes, setClasses] = useState<TeacherClass[]>([]);
  const [announcement, setAnnouncement] = useState({ title: '', message: '', classId: '' });

  useEffect(() => {
    const load = async () => {
      try {
        const [notifRes, classesRes] = await Promise.all([
          fetch('/api/teacher/notifications', { method: 'GET', credentials: 'include', headers: { Accept: 'application/json' } }),
          fetch('/api/classes', { method: 'GET', credentials: 'include', headers: { Accept: 'application/json' } }),
        ]);

        if (notifRes.ok) {
          const payload = (await notifRes.json()) as { notifications?: NotificationItem[] };
          setNotifications(payload.notifications ?? []);
        }

        if (classesRes.ok) {
          const payload = (await classesRes.json()) as { classes?: TeacherClass[] };
          setClasses(payload.classes ?? []);
        }
      } catch {
        // Keep empty state if unavailable.
      }
    };

    load();
  }, []);

  const sendAnnouncement = async () => {
    if (!announcement.title || !announcement.message) return;
    try {
      await csrfFetch('/api/teacher/notifications/announcement', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({
          title: announcement.title,
          message: announcement.message,
          classId: announcement.classId ? Number(announcement.classId) : null,
        }),
      });
      setAnnouncement({ title: '', message: '', classId: '' });
    } catch {
      // Keep draft if send fails.
    }
  };

  const markRead = async (notificationId: string) => {
    try {
      await csrfFetch(`/api/teacher/notifications/${notificationId}/read`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ read: true }),
      });
    } catch {
      // Keep current state.
    }
  };

  return (
    <TeacherLayout>
      {() => (
        <div className="td-dashboard-grid">
          <section className="td-panel td-panel-span-2">
            <div className="td-panel-head">
              <h2>Send Announcement</h2>
              <Sparkles size={16} />
            </div>
            <div className="tcc-meta-grid">
              <label>
                Title
                <input
                  value={announcement.title}
                  onChange={(e) => setAnnouncement((a) => ({ ...a, title: e.target.value }))}
                  type="text"
                />
              </label>
              <label>
                Class (optional)
                <select
                  value={announcement.classId}
                  onChange={(e) => setAnnouncement((a) => ({ ...a, classId: e.target.value }))}
                >
                  <option value="">All Classes</option>
                  {classes.map((item) => (
                    <option key={item.id} value={item.id}>{item.name}</option>
                  ))}
                </select>
              </label>
            </div>
            <label>
              Message
              <input
                value={announcement.message}
                onChange={(e) => setAnnouncement((a) => ({ ...a, message: e.target.value }))}
                type="text"
              />
            </label>
            <button className="td-inline-action" type="button" onClick={sendAnnouncement}>
              Send Announcement
            </button>
          </section>

          <section className="td-panel td-panel-span-2">
            <div className="td-panel-head">
              <h2>Notifications</h2>
              <Sparkles size={16} />
            </div>
            <div className="td-stack-list">
              {notifications.length === 0 ? (
                <p className="td-empty-state">No notifications yet.</p>
              ) : (
                notifications.map((item) => (
                  <article key={item.id} className="td-stack-item">
                    <div>
                      <h3>{item.title}</h3>
                      <p>{item.message}</p>
                    </div>
                    <button className="td-inline-action" type="button" onClick={() => markRead(item.id)}>
                      Mark read
                    </button>
                  </article>
                ))
              )}
            </div>
          </section>
        </div>
      )}
    </TeacherLayout>
  );
}

