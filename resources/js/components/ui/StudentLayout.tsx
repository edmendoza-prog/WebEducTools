import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { csrfFetch } from '../../lib/csrf';
import {
  BarChart3,
  Bell,
  Clock3,
  FileText,
  HelpCircle,
  Home,
  Layers,
  LogOut,
  Mail,
  Moon,
  Settings,
  Trash2,
  Users,
  X,
} from 'lucide-react';

type StudentNav = {
  label: string;
  path: string;
  icon: React.ReactNode;
};

const navItems: StudentNav[] = [
  { label: 'Dashboard', path: '/student-dashboard', icon: <Home size={18} /> },
  { label: 'Flashcards', path: '/student-dashboard/flashcards', icon: <Layers size={18} /> },
  { label: 'Quiz', path: '/student-dashboard/quiz', icon: <HelpCircle size={18} /> },
  { label: 'Practice Test', path: '/student-dashboard/practice-tests', icon: <FileText size={18} /> },
  { label: 'Reports', path: '/student-dashboard/reports', icon: <BarChart3 size={18} /> },
  { label: 'Search & Collaboration', path: '/student-dashboard/library', icon: <Users size={18} /> },
];

type AuthMeResponse = {
  user?: {
    name?: string;
    email?: string;
    profileImageUrl?: string | null;
  };
};

export type NotificationItem = {
  id: string;
  type?: string;
  title: string;
  message: string;
  read?: boolean;
  createdAt?: string | null;
};

export default function StudentLayout({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  const location = useLocation();

  const [profileName, setProfileName] = useState('Student Learner');
  const [profileEmail, setProfileEmail] = useState('student@example.com');
  const [profileImageUrl, setProfileImageUrl] = useState<string | null>(null);
  const [draftProfileImageFile, setDraftProfileImageFile] = useState<File | null>(null);
  const [draftProfileImagePreview, setDraftProfileImagePreview] = useState('');
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [isMailMenuOpen, setIsMailMenuOpen] = useState(false);
  const [isNotificationsMenuOpen, setIsNotificationsMenuOpen] = useState(false);
  const [activeMailItem, setActiveMailItem] = useState<NotificationItem | null>(null);
  const [isMailDeleting, setIsMailDeleting] = useState(false);
  const [mailDeletingItemId, setMailDeletingItemId] = useState<string | null>(null);
  const [profileError, setProfileError] = useState('');
  const [isProfileSaving, setIsProfileSaving] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [studentNotifications, setStudentNotifications] = useState<NotificationItem[]>([]);

  useEffect(() => {
    document.body.classList.toggle('is-student-dark-mode', isDarkMode);
    return () => { document.body.classList.remove('is-student-dark-mode'); };
  }, [isDarkMode]);

  useEffect(() => {
    if (!isProfileMenuOpen && !isMailMenuOpen && !isNotificationsMenuOpen) return undefined;

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.closest('.ss-user-menu-anchor')) return;
      setIsProfileMenuOpen(false);
      setIsMailMenuOpen(false);
      setIsNotificationsMenuOpen(false);
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsProfileMenuOpen(false);
        setIsMailMenuOpen(false);
        setIsNotificationsMenuOpen(false);
      }
    };

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isMailMenuOpen, isNotificationsMenuOpen, isProfileMenuOpen]);

  useEffect(() => {
    if (!activeMailItem) return undefined;
    const handleKeyDown = (event: KeyboardEvent) => { if (event.key === 'Escape') setActiveMailItem(null); };
    document.addEventListener('keydown', handleKeyDown);
    return () => { document.removeEventListener('keydown', handleKeyDown); };
  }, [activeMailItem]);

  useEffect(() => {
    if (!draftProfileImagePreview.startsWith('blob:')) return undefined;
    return () => URL.revokeObjectURL(draftProfileImagePreview);
  }, [draftProfileImagePreview]);

  useEffect(() => {
    const load = async () => {
      try {
        const [meRes, notificationsRes] = await Promise.all([
          fetch('/auth/me', { method: 'GET', credentials: 'include', headers: { Accept: 'application/json' } }),
          fetch('/api/student/notifications', { method: 'GET', credentials: 'include', headers: { Accept: 'application/json' } }),
        ]);

        if (meRes.ok) {
          const me = (await meRes.json()) as AuthMeResponse;
          if (me.user?.name) setProfileName(me.user.name);
          if (me.user?.email) setProfileEmail(me.user.email);
          setProfileImageUrl(me.user?.profileImageUrl ?? null);
        }

        if (notificationsRes.ok) {
          const payload = (await notificationsRes.json()) as { notifications?: NotificationItem[] };
          setStudentNotifications(payload.notifications ?? []);
        }
      } catch {
        // Keep fallback values.
      }
    };

    load();
  }, []);

  const profileInitials =
    profileName
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((name) => name[0]?.toUpperCase() ?? '')
      .join('') || 'SL';

  const teacherAnnouncements = studentNotifications.filter((item) => item.type === 'announcement');
  const unreadTeacherAnnouncementsCount = teacherAnnouncements.filter((item) => !item.read).length;

  const quizUploadNotifications = studentNotifications.filter(
    (item) => item.type === 'assignment' && /quiz/i.test(`${item.title} ${item.message}`),
  );
  const unreadQuizUploadNotificationsCount = quizUploadNotifications.filter((item) => !item.read).length;

  const formatNotificationTime = (createdAt?: string | null): string => {
    if (!createdAt) return 'Just now';
    const date = new Date(createdAt);
    if (Number.isNaN(date.getTime())) return 'Just now';
    return date.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
  };

  const handleLogout = async () => {
    if (isLoggingOut) return;
    setIsLoggingOut(true);
    try {
      const response = await csrfFetch('/auth/logout', { method: 'POST', headers: { Accept: 'application/json' } });
      if (!response.ok) throw new Error('Logout failed.');
    } catch {
      setIsLoggingOut(false);
      return;
    }
    window.location.replace('/login/student');
  };

  const openMailMenu = () => {
    setIsProfileMenuOpen(false);
    setIsNotificationsMenuOpen(false);
    setIsMailMenuOpen((c) => !c);
  };

  const openNotificationsMenu = () => {
    setIsProfileMenuOpen(false);
    setIsMailMenuOpen(false);
    setIsNotificationsMenuOpen((c) => !c);
  };

  const openProfileMenu = () => {
    setIsMailMenuOpen(false);
    setIsNotificationsMenuOpen(false);
    setIsProfileMenuOpen((c) => !c);
  };

  const openMailMessage = (item: NotificationItem) => {
    setIsMailMenuOpen(false);
    setActiveMailItem(item);
  };

  const closeMailMessage = () => {
    if (isMailDeleting) return;
    setActiveMailItem(null);
  };

  const mailSenderName = profileName ? `${profileName.split(' ')[0]}'s Teacher` : 'Your Teacher';

  const deleteMailById = async (notificationId: string, closeModalAfterDelete = false) => {
    if (mailDeletingItemId || (closeModalAfterDelete && isMailDeleting)) return;
    setMailDeletingItemId(notificationId);
    if (closeModalAfterDelete) setIsMailDeleting(true);
    try {
      const response = await csrfFetch(`/api/student/notifications/${notificationId}`, {
        method: 'DELETE',
        headers: { Accept: 'application/json' },
      });
      if (!response.ok) return;
      setStudentNotifications((current) => current.filter((item) => item.id !== notificationId));
      if (activeMailItem?.id === notificationId) setActiveMailItem(null);
    } catch {
      // Keep current UI state.
    } finally {
      setMailDeletingItemId(null);
      if (closeModalAfterDelete) setIsMailDeleting(false);
    }
  };

  const deleteMailMessage = async () => {
    if (!activeMailItem || isMailDeleting) return;
    await deleteMailById(activeMailItem.id, true);
  };

  const markMailAsRead = async () => {
    if (unreadTeacherAnnouncementsCount === 0) return;
    try {
      const response = await csrfFetch('/api/student/notifications/read-all', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ type: 'announcement' }),
      });
      if (!response.ok) return;
      setStudentNotifications((current) =>
        current.map((item) => (item.type === 'announcement' ? { ...item, read: true } : item)),
      );
    } catch {
      // Keep current state.
    }
  };

  const closeProfileModal = () => {
    if (draftProfileImagePreview.startsWith('blob:')) URL.revokeObjectURL(draftProfileImagePreview);
    setDraftProfileImageFile(null);
    setDraftProfileImagePreview('');
    setIsProfileMenuOpen(false);
    setIsProfileModalOpen(false);
  };

  const saveProfileImage = async () => {
    setIsProfileSaving(true);
    setProfileError('');
    try {
      const formData = new FormData();
      if (draftProfileImageFile) formData.append('profileImage', draftProfileImageFile);
      const response = await csrfFetch('/auth/profile', {
        method: 'PATCH',
        headers: { Accept: 'application/json' },
        body: formData,
      });
      if (!response.ok) { setProfileError('Unable to save profile image right now.'); return; }
      const payload = (await response.json()) as AuthMeResponse;
      setProfileImageUrl(payload.user?.profileImageUrl ?? (draftProfileImagePreview || null));
      closeProfileModal();
    } catch {
      setProfileError('Unable to save profile image right now.');
    } finally {
      setIsProfileSaving(false);
    }
  };

  return (
    <div className="ss-page">
      <aside className="ss-sidebar">
        <div className="ss-brand">
          <div className="ss-brand-mark">SE</div>
          <div>
            <p>Student Engine</p>
            <small>Interactive Learning</small>
          </div>
        </div>

        <nav className="ss-nav">
          {navItems.map((item) => (
            <button
              key={item.path}
              type="button"
              className={`ss-nav-item ${location.pathname === item.path ? 'is-active' : ''}`}
              onClick={() => navigate(item.path)}
            >
              {item.icon}
              <span>{item.label}</span>
            </button>
          ))}
        </nav>
      </aside>

      <main className="ss-main">
        <header className="ss-topbar">
          <div className="ss-header-copy">
            <h1>Student Dashboard</h1>
            <p>Continue learning and track your progress.</p>
          </div>

          <div className="ss-user-actions">
            {/* Mail */}
            <div className="ss-user-menu-anchor">
              <button type="button" className="ss-quick-action" onClick={openMailMenu} aria-label="Open teacher announcements">
                <Mail size={14} />
                {unreadTeacherAnnouncementsCount > 0 && <span className="ss-quick-action-badge">{unreadTeacherAnnouncementsCount}</span>}
              </button>

              {isMailMenuOpen && (
                <section className="ss-topbar-menu" role="menu" aria-label="Teacher announcements" onClick={(e) => e.stopPropagation()}>
                  <header className="ss-topbar-menu-head">
                    <strong>Mail</strong>
                    <span>Teacher Announcements</span>
                  </header>
                  <div className="ss-topbar-menu-list">
                    {teacherAnnouncements.length === 0 ? (
                      <p className="ss-topbar-menu-empty">No announcements yet.</p>
                    ) : (
                      teacherAnnouncements.map((item) => (
                        <article key={item.id} className={`ss-topbar-menu-item ss-topbar-mail-item ${item.read ? 'is-read' : ''}`}>
                          <button type="button" className="ss-topbar-mail-open" onClick={() => openMailMessage(item)}>
                            <h4>{item.title}</h4>
                            <p>{item.message}</p>
                            <small>{formatNotificationTime(item.createdAt)}</small>
                          </button>
                          <button
                            type="button"
                            className="ss-topbar-mail-delete"
                            aria-label="Delete mail"
                            onClick={() => deleteMailById(item.id)}
                            disabled={mailDeletingItemId === item.id}
                          >
                            <Trash2 size={13} />
                          </button>
                        </article>
                      ))
                    )}
                  </div>
                  {teacherAnnouncements.length > 0 && (
                    <footer className="ss-topbar-menu-foot">
                      <button type="button" className="ss-topbar-menu-action" onClick={markMailAsRead}>
                        Mark all read
                      </button>
                    </footer>
                  )}
                </section>
              )}
            </div>

            {/* Notifications */}
            <div className="ss-user-menu-anchor">
              <button type="button" className="ss-quick-action" onClick={openNotificationsMenu} aria-label="Open quiz notifications">
                <Bell size={14} />
                {unreadQuizUploadNotificationsCount > 0 && <span className="ss-quick-action-badge">{unreadQuizUploadNotificationsCount}</span>}
              </button>

              {isNotificationsMenuOpen && (
                <section className="ss-topbar-menu" role="menu" aria-label="Quiz notifications" onClick={(e) => e.stopPropagation()}>
                  <header className="ss-topbar-menu-head">
                    <strong>Notifications</strong>
                    <span>Quiz &amp; Uploads</span>
                  </header>
                  <div className="ss-topbar-menu-list">
                    {quizUploadNotifications.length === 0 ? (
                      <p className="ss-topbar-menu-empty">No new notifications.</p>
                    ) : (
                      quizUploadNotifications.map((item) => (
                        <article key={item.id} className={`ss-topbar-menu-item ${item.read ? 'is-read' : ''}`}>
                          <h4>{item.title}</h4>
                          <p>{item.message}</p>
                          <small>{formatNotificationTime(item.createdAt)}</small>
                        </article>
                      ))
                    )}
                  </div>
                </section>
              )}
            </div>

            {/* Profile */}
            <div className="ss-user-menu-anchor">
              <button type="button" className="ss-profile-btn" onClick={openProfileMenu} aria-label="Open profile menu">
                {profileImageUrl ? (
                  <img className="ss-profile-img" src={profileImageUrl} alt="Profile" />
                ) : (
                  <span className="ss-profile-initials">{profileInitials}</span>
                )}
              </button>

              {isProfileMenuOpen && (
                <section className="ss-topbar-menu ss-profile-menu" role="menu" aria-label="Profile menu" onClick={(e) => e.stopPropagation()}>
                  <header className="ss-topbar-menu-head">
                    <strong>{profileName}</strong>
                    <span>{profileEmail}</span>
                  </header>
                  <div className="ss-topbar-menu-list">
                    <button type="button" className="ss-topbar-menu-item ss-topbar-menu-btn" onClick={() => { setIsProfileMenuOpen(false); setDraftProfileImagePreview(profileImageUrl ?? ''); setIsProfileModalOpen(true); }}>
                      <Settings size={14} /> Edit Profile Photo
                    </button>
                    <button type="button" className="ss-topbar-menu-item ss-topbar-menu-btn" onClick={() => { setIsProfileMenuOpen(false); navigate('/student-dashboard/settings'); }}>
                      <Settings size={14} /> Settings
                    </button>
                    <button type="button" className="ss-topbar-menu-item ss-topbar-menu-btn" onClick={() => setIsDarkMode((d) => !d)}>
                      <Moon size={14} /> {isDarkMode ? 'Light Mode' : 'Dark Mode'}
                    </button>
                    <button type="button" className="ss-topbar-menu-item ss-topbar-menu-btn ss-logout-btn" onClick={handleLogout} disabled={isLoggingOut}>
                      <LogOut size={14} /> {isLoggingOut ? 'Signing out...' : 'Sign out'}
                    </button>
                  </div>
                </section>
              )}
            </div>
          </div>
        </header>

        {children}
      </main>

      {/* Mail message modal */}
      {activeMailItem && (
        <div className="ss-mail-overlay" role="presentation" onClick={closeMailMessage}>
          <div className="ss-mail-modal" role="dialog" aria-modal="true" aria-labelledby="mail-modal-title" onClick={(e) => e.stopPropagation()}>
            <header className="ss-mail-modal-head">
              <div>
                <p className="ss-mail-from">From: {mailSenderName}</p>
                <h2 id="mail-modal-title">{activeMailItem.title}</h2>
                <small>{formatNotificationTime(activeMailItem.createdAt)}</small>
              </div>
              <button type="button" className="ss-icon-btn" aria-label="Close mail" onClick={closeMailMessage}>
                <X size={16} />
              </button>
            </header>
            <div className="ss-mail-modal-body">
              <p>{activeMailItem.message}</p>
            </div>
            <footer className="ss-mail-modal-foot">
              <button type="button" className="ss-danger-btn" onClick={deleteMailMessage} disabled={isMailDeleting}>
                <Trash2 size={14} /> {isMailDeleting ? 'Deleting...' : 'Delete'}
              </button>
            </footer>
          </div>
        </div>
      )}

      {/* Profile photo modal */}
      {isProfileModalOpen && (
        <div className="ss-mail-overlay" role="presentation" onClick={closeProfileModal}>
          <div className="ss-mail-modal" role="dialog" aria-modal="true" aria-labelledby="profile-modal-title" onClick={(e) => e.stopPropagation()}>
            <header className="ss-mail-modal-head">
              <h2 id="profile-modal-title">Edit Profile Photo</h2>
              <button type="button" className="ss-icon-btn" aria-label="Close" onClick={closeProfileModal}>
                <X size={16} />
              </button>
            </header>
            <div className="ss-mail-modal-body">
              {draftProfileImagePreview && (
                <img className="ss-profile-img-preview" src={draftProfileImagePreview} alt="Preview" />
              )}
              <input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0] ?? null;
                  if (!file) return;
                  if (draftProfileImagePreview.startsWith('blob:')) URL.revokeObjectURL(draftProfileImagePreview);
                  setDraftProfileImageFile(file);
                  setDraftProfileImagePreview(URL.createObjectURL(file));
                }}
              />
              {profileError && <p className="ss-form-error">{profileError}</p>}
            </div>
            <footer className="ss-mail-modal-foot">
              <button type="button" className="ss-chip-btn" onClick={saveProfileImage} disabled={isProfileSaving}>
                {isProfileSaving ? 'Saving...' : 'Save Photo'}
              </button>
              <button type="button" className="ss-chip-btn" onClick={closeProfileModal} disabled={isProfileSaving}>
                Cancel
              </button>
            </footer>
          </div>
        </div>
      )}
    </div>
  );
}
