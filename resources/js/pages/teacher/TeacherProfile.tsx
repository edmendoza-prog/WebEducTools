import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { csrfFetch } from '../../lib/csrf';
import {
  Award,
  Bell,
  BookOpen,
  FolderClosed,
  Home,
  Layers3,
  LogOut,
  Menu,
  Sparkles,
  UserRound,
  Users,
  Shield,
  X,
} from 'lucide-react';

type ProfileResponse = {
  user?: {
    name?: string;
    email?: string;
    role?: 'teacher' | 'student';
    profileImageUrl?: string | null;
  };
};

type NavItem = {
  label: string;
  icon: React.ReactNode;
  path: string;
};

const primaryNav: NavItem[] = [
  { label: 'Home', icon: <Home size={18} />, path: '/teacher-dashboard' },
  { label: 'Your library', icon: <FolderClosed size={18} />, path: '/teacher-dashboard/library' },
  { label: 'Notifications', icon: <Bell size={18} />, path: '/teacher-dashboard/notifications' },
  { label: 'Classes', icon: <Users size={18} />, path: '/teacher-dashboard/classes' },
];

const teacherTools: NavItem[] = [
  { label: 'Assign activity', icon: <BookOpen size={18} />, path: '/teacher-dashboard/assign-activity' },
  { label: 'Study Guides', icon: <Layers3 size={18} />, path: '/teacher-dashboard/study-guides' },
  { label: 'Tests', icon: <Award size={18} />, path: '/teacher-dashboard/practice-tests' },
  { label: 'Reports', icon: <Sparkles size={18} />, path: '/teacher-dashboard/reports' },
];

function initialsFromName(name: string) {
  return (
    name
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? '')
      .join('') || 'TC'
  );
}

export default function TeacherProfile() {
  const navigate = useNavigate();
  const [profileName, setProfileName] = useState('Teacher');
  const [profileEmail, setProfileEmail] = useState('teacher@example.com');
  const [profileImageUrl, setProfileImageUrl] = useState<string | null>(null);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [draftName, setDraftName] = useState('Teacher');
  const [draftEmail, setDraftEmail] = useState('teacher@example.com');
  const [draftProfileImageFile, setDraftProfileImageFile] = useState<File | null>(null);
  const [draftProfileImagePreview, setDraftProfileImagePreview] = useState('');
  const [editError, setEditError] = useState('');

  useEffect(() => {
    let mounted = true;

    const loadProfile = async () => {
      try {
        const response = await fetch('/auth/me', {
          method: 'GET',
          credentials: 'include',
          headers: { Accept: 'application/json' },
        });

        if (!mounted || !response.ok) {
          return;
        }

        const data = (await response.json()) as ProfileResponse;

        if (data.user?.name) {
          setProfileName(data.user.name);
        }

        if (data.user?.email) {
          setProfileEmail(data.user.email);
        }

        setProfileImageUrl(data.user?.profileImageUrl ?? null);
      } catch {
        // Keep fallback profile values.
      }
    };

    loadProfile();

    return () => {
      mounted = false;
    };
  }, []);

  const profileInitials = useMemo(() => initialsFromName(profileName), [profileName]);

  useEffect(() => {
    if (!isEditProfileOpen) {
      return undefined;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        closeEditProfile();
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isEditProfileOpen]);

  useEffect(() => {
    if (!isProfileMenuOpen) {
      return undefined;
    }

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.closest('.td-profile-menu')) {
        return;
      }
      setIsProfileMenuOpen(false);
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsProfileMenuOpen(false);
      }
    };

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isProfileMenuOpen]);

  useEffect(() => {
    if (!draftProfileImagePreview.startsWith('blob:')) {
      return undefined;
    }

    return () => URL.revokeObjectURL(draftProfileImagePreview);
  }, [draftProfileImagePreview]);

  const openEditProfile = () => {
    setDraftName(profileName);
    setDraftEmail(profileEmail);
    setDraftProfileImageFile(null);
    setDraftProfileImagePreview(profileImageUrl ?? '');
    setEditError('');
    setIsEditProfileOpen(true);
  };

  const closeEditProfile = () => {
    if (draftProfileImagePreview.startsWith('blob:')) {
      URL.revokeObjectURL(draftProfileImagePreview);
    }

    setDraftProfileImageFile(null);
    setDraftProfileImagePreview('');
    setIsEditProfileOpen(false);
  };

  const saveProfileChanges = async () => {
    const nextName = draftName.trim();
    const nextEmail = draftEmail.trim();

    if (!nextName || !nextEmail) {
      setEditError('Name and email are required.');
      return;
    }

    try {
      const formData = new FormData();
      formData.append('name', nextName);
      formData.append('email', nextEmail);

      if (draftProfileImageFile) {
        formData.append('profileImage', draftProfileImageFile);
      }

      const response = await csrfFetch('/auth/profile', {
        method: 'PATCH',
        headers: { Accept: 'application/json' },
        body: formData,
      });

      if (!response.ok) {
        setEditError('Unable to save profile right now.');
        return;
      }

      const payload = (await response.json()) as ProfileResponse;
      setProfileName(payload.user?.name ?? nextName);
      setProfileEmail(payload.user?.email ?? nextEmail);
      setProfileImageUrl(payload.user?.profileImageUrl ?? (draftProfileImagePreview || null));
      closeEditProfile();
    } catch {
      setEditError('Unable to save profile right now.');
    }
  };

  const handleLogout = async () => {
    if (isLoggingOut) {
      return;
    }

    setIsLoggingOut(true);

    try {
      const response = await csrfFetch('/auth/logout', {
        method: 'POST',
        headers: { Accept: 'application/json' },
      });

      if (!response.ok) {
        throw new Error('Logout failed.');
      }

      window.location.replace('/login/teacher');
    } catch {
      setIsLoggingOut(false);
    }
  };

  return (
    <div className="td-page td-profile-page">
      <aside className="td-sidebar">
        <div className="td-brand-row">
          <button className="td-icon-btn" type="button" aria-label="Open menu">
            <Menu size={22} />
          </button>
          <div className="td-logo" aria-label="Web Educ Tools">
            <span>Web Educ</span>
            <span>Tools</span>
          </div>
        </div>

        <nav className="td-nav">
          {primaryNav.map((item) => (
            <button key={item.label} type="button" className="td-nav-item" onClick={() => navigate(item.path)}>
              <span className="td-nav-icon">{item.icon}</span>
              <span>{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="td-divider" />
        <div className="td-group-title">Teacher tools</div>
        <nav className="td-nav td-nav-tight">
          {teacherTools.map((item) => (
            <button key={item.label} type="button" className="td-nav-item" onClick={() => navigate(item.path)}>
              <span className="td-nav-icon">{item.icon}</span>
              <span>{item.label}</span>
            </button>
          ))}
        </nav>
      </aside>

      <main className="td-main td-profile-main">
        <div className="td-topbar td-topbar-teacher">
          <div className="td-profile-title-block">
            <p className="td-profile-kicker">Teacher profile</p>
            <h1>Your account</h1>
          </div>

          <div className="td-top-actions td-top-actions-teacher">
            <button
              className="td-icon-btn"
              type="button"
              onClick={() => navigate('/teacher-dashboard/notifications')}
              aria-label="Notifications"
              title="Notifications"
            >
              <Bell size={18} />
            </button>

            <div className="td-profile-menu">
              <button
                type="button"
                className={`td-avatar-btn ${isProfileMenuOpen ? 'is-open' : ''}`}
                onClick={() => setIsProfileMenuOpen((current) => !current)}
                aria-label="Open profile menu"
              >
                {profileImageUrl ? (
                  <img className="td-avatar-image" src={profileImageUrl} alt="Teacher profile" />
                ) : (
                  <span className="td-avatar-initials">{profileInitials}</span>
                )}
                <span className="td-avatar-dot" />
              </button>

              {isProfileMenuOpen && (
                <div className="td-profile-dropdown" onClick={(event) => event.stopPropagation()}>
                  <div className="td-profile-user">
                    <div className="td-profile-avatar" aria-hidden="true">
                      {profileImageUrl ? (
                        <img className="td-avatar-image" src={profileImageUrl} alt="Teacher profile" />
                      ) : (
                        <span>{profileInitials}</span>
                      )}
                    </div>
                    <div>
                      <p className="td-profile-name">{profileName}</p>
                      <p className="td-profile-email">{profileEmail}</p>
                    </div>
                  </div>

                  <div className="td-profile-group">
                    <button
                      type="button"
                      className="td-profile-item"
                      onClick={() => {
                        setIsProfileMenuOpen(false);
                        navigate('/teacher-dashboard');
                      }}
                    >
                      <Home size={18} />
                      <span>Dashboard</span>
                    </button>

                    <div className="td-profile-divider" />

                    <button
                      type="button"
                      className="td-profile-item"
                      onClick={() => {
                        setIsProfileMenuOpen(false);
                        handleLogout();
                      }}
                      disabled={isLoggingOut}
                    >
                      <LogOut size={18} />
                      <span>{isLoggingOut ? 'Signing out...' : 'Sign out'}</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="dashboard-page-transition td-profile-layout">
          <section className="td-profile-hero">
            <div className="td-profile-hero-avatar">{profileImageUrl ? <img className="td-profile-hero-image" src={profileImageUrl} alt="Teacher profile" /> : profileInitials}</div>
            <div className="td-profile-hero-copy">
              <p className="td-profile-kicker">Profile overview</p>
              <h2>{profileName}</h2>
              <p>{profileEmail}</p>
              <div className="td-profile-chip-row">
                <span>Teacher</span>
                <span>Online</span>
                <span>Active workspace</span>
              </div>
            </div>
          </section>

          <section className="td-profile-grid">
            <article className="td-profile-card td-profile-card-wide">
              <div className="td-panel-head">
                <h2>Account Details</h2>
                <div className="td-profile-card-actions">
                  <button className="td-inline-action" type="button" onClick={openEditProfile}>
                    Edit
                  </button>
                  <UserRound size={16} />
                </div>
              </div>
              <div className="td-profile-detail-list">
                <div>
                  <span>Display name</span>
                  <strong>{profileName}</strong>
                </div>
                <div>
                  <span>Email address</span>
                  <strong>{profileEmail}</strong>
                </div>
                <div>
                  <span>Role</span>
                  <strong>Teacher</strong>
                </div>
                <div>
                  <span>Status</span>
                  <strong>Available for class work</strong>
                </div>
              </div>
            </article>

            <article className="td-profile-card td-profile-card-wide">
              <div className="td-panel-head">
                <h2>Quick Actions</h2>
                <Shield size={16} />
              </div>
              <div className="td-profile-action-grid">
                <button className="td-inline-action" type="button" onClick={() => navigate('/teacher-dashboard/create-content')}>
                  <Layers3 size={14} /> Create content
                </button>
                <button className="td-inline-action" type="button" onClick={() => navigate('/teacher-dashboard/reports')}>
                  <Sparkles size={14} /> View reports
                </button>
                <button className="td-inline-action" type="button" onClick={() => navigate('/teacher-dashboard/notifications')}>
                  <Bell size={14} /> Open notifications
                </button>
                <button className="td-inline-action" type="button" onClick={() => navigate('/teacher-dashboard/classes')}>
                  <Users size={14} /> Manage classes
                </button>
              </div>
            </article>
          </section>
        </div>

        {isEditProfileOpen && (
          <div className="td-profile-edit-overlay" role="presentation" onClick={closeEditProfile}>
            <section className="td-profile-edit-modal" role="dialog" aria-modal="true" aria-labelledby="edit-profile-title" onClick={(event) => event.stopPropagation()}>
              <div className="td-profile-edit-head">
                <h2 id="edit-profile-title">Edit Profile</h2>
                <button className="tcc-inline-icon" type="button" aria-label="Close edit profile form" onClick={closeEditProfile}>
                  <X size={16} />
                </button>
              </div>

              <div className="td-profile-edit-grid">
                <label>
                  Name
                  <input type="text" value={draftName} onChange={(event) => setDraftName(event.target.value)} />
                </label>
                <label>
                  Email
                  <input type="email" value={draftEmail} onChange={(event) => setDraftEmail(event.target.value)} />
                </label>
                <label className="td-profile-edit-field-wide">
                  Profile Image
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(event) => {
                      const file = event.target.files?.[0] ?? null;

                      if (draftProfileImagePreview.startsWith('blob:')) {
                        URL.revokeObjectURL(draftProfileImagePreview);
                      }

                      setDraftProfileImageFile(file);
                      setDraftProfileImagePreview(file ? URL.createObjectURL(file) : profileImageUrl ?? '');
                    }}
                  />
                </label>
              </div>

              <div className="td-profile-image-preview">
                {draftProfileImagePreview ? <img src={draftProfileImagePreview} alt="Profile preview" /> : <span>{profileInitials}</span>}
              </div>

              {editError ? <p className="td-profile-edit-error">{editError}</p> : null}

              <div className="td-profile-edit-actions">
                <button className="td-inline-action" type="button" onClick={saveProfileChanges}>
                  Save changes
                </button>
                <button className="tcc-chip-toggle" type="button" onClick={closeEditProfile}>
                  Cancel
                </button>
              </div>
            </section>
          </div>
        )}
      </main>
    </div>
  );
}
