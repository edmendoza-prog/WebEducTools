import React, { useEffect, useState } from 'react';
import TeacherLayout from '../../components/ui/TeacherLayout';
import { csrfFetch } from '../../lib/csrf';
import { Sparkles, MessageSquarePlus, X } from 'lucide-react';

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
  const [notifications, setNotifications] = useState<NotificationItem[]>([
    {
      id: '1',
      title: 'Student completed quiz',
      message: 'eddohehe completed a quiz with 100%.',
      createdAt: new Date().toISOString(),
    },
    {
      id: '2',
      title: 'New study guide submission',
      message: 'Maria Santos submitted the "World History Chapter 5" study guide.',
      createdAt: new Date().toISOString(),
    },
    {
      id: '3',
      title: 'Test completed',
      message: 'John Miller finished the "Mathematics Final Review" test with a score of 85%.',
      createdAt: new Date().toISOString(),
    },
    {
      id: '4',
      title: 'Student needs help',
      message: 'Sarah Johnson requested assistance on "Physics Assignment 3".',
      createdAt: new Date().toISOString(),
    },
    {
      id: '5',
      title: 'Student message',
      message: 'Maria Santos to John Miller: "Hey! Can you help me with the math homework?"',
      createdAt: new Date().toISOString(),
    },
    {
      id: '6',
      title: 'Student message',
      message: 'John Miller to Maria Santos: "Sure! Which problem are you stuck on?"',
      createdAt: new Date().toISOString(),
    },
    {
      id: '7',
      title: 'Student message',
      message: 'Sarah Johnson to eddohehe: "Great job on the quiz! How did you prepare?"',
      createdAt: new Date().toISOString(),
    },
    {
      id: '8',
      title: 'Student message',
      message: 'eddohehe to Sarah Johnson: "Thanks! I used the study guide and tests."',
      createdAt: new Date().toISOString(),
    },
  ]);
  const [classes, setClasses] = useState<TeacherClass[]>([]);
  const [announcement, setAnnouncement] = useState({ title: '', message: '', classId: '' });
  const [isAnnouncementModalOpen, setIsAnnouncementModalOpen] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const [notifRes, classesRes] = await Promise.all([
          fetch('/api/teacher/notifications', { method: 'GET', credentials: 'include', headers: { Accept: 'application/json' } }),
          fetch('/api/classes', { method: 'GET', credentials: 'include', headers: { Accept: 'application/json' } }),
        ]);

        if (notifRes.ok) {
          const payload = (await notifRes.json()) as { notifications?: NotificationItem[] };
          if (payload.notifications && payload.notifications.length > 0) {
            setNotifications(payload.notifications);
          }
        }

        if (classesRes.ok) {
          const payload = (await classesRes.json()) as { classes?: TeacherClass[] };
          setClasses(payload.classes ?? []);
        }
      } catch {
        // Keep default sample notifications if API unavailable.
      }
    };

    load();
  }, []);

  useEffect(() => {
    if (!isAnnouncementModalOpen) {
      return undefined;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsAnnouncementModalOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isAnnouncementModalOpen]);

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
      setIsAnnouncementModalOpen(false);
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
    <TeacherLayout
      floatingContent={
        <>
          <button
            className="td-fab"
            type="button"
            onClick={() => setIsAnnouncementModalOpen(true)}
            aria-label="Send announcement"
            title="Send announcement"
          >
            <MessageSquarePlus size={24} />
          </button>

          {isAnnouncementModalOpen && (
            <div className="td-announcement-overlay" role="presentation" onClick={() => setIsAnnouncementModalOpen(false)}>
              <section className="td-announcement-modal" role="dialog" aria-modal="true" aria-labelledby="announcement-title" onClick={(event) => event.stopPropagation()}>
                <div className="td-announcement-head">
                  <h2 id="announcement-title">Send Announcement</h2>
                  <button className="td-icon-btn" type="button" aria-label="Close announcement form" onClick={() => setIsAnnouncementModalOpen(false)}>
                    <X size={16} />
                  </button>
                </div>

                <div className="td-announcement-form">
                  <label>
                    Title
                    <input
                      value={announcement.title}
                      onChange={(e) => setAnnouncement((a) => ({ ...a, title: e.target.value }))}
                      type="text"
                      placeholder="Enter announcement title"
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
                  <label>
                    Message
                    <textarea
                      value={announcement.message}
                      onChange={(e) => setAnnouncement((a) => ({ ...a, message: e.target.value }))}
                      placeholder="Enter your announcement message"
                      rows={4}
                    />
                  </label>
                </div>

                <div className="td-announcement-actions">
                  <button className="td-inline-action" type="button" onClick={sendAnnouncement} disabled={!announcement.title || !announcement.message}>
                    <Sparkles size={14} /> Send Announcement
                  </button>
                  <button className="tcc-chip-toggle" type="button" onClick={() => setIsAnnouncementModalOpen(false)}>
                    Cancel
                  </button>
                </div>
              </section>
            </div>
          )}
        </>
      }
    >
      {() => (
        <div className="td-dashboard-grid">
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
                  <article 
                    key={item.id} 
                    className={`td-stack-item ${item.title === 'Student message' ? 'td-stack-item-chat' : ''}`}
                  >
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

