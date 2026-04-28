import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { csrfFetch } from '../../lib/csrf';
import {
  BarChart3,
  Bell,
  ChevronDown,
  ClipboardCheck,
  FileText,
  FolderClosed,
  Home,
  ListChecks,
  LogOut,
  Menu,
  Search,
  Sparkles,
  Users,
} from 'lucide-react';

type NavItem = {
  label: string;
  icon: React.ReactNode;
  path: string;
};

const primaryNav: NavItem[] = [
  { label: 'Home', icon: <Home size={18} />, path: '/teacher-dashboard' },
  { label: 'Your library', icon: <FolderClosed size={18} />, path: '/teacher-dashboard/library' },
  { label: 'Classes', icon: <Users size={18} />, path: '/teacher-dashboard/classes' },
  { label: 'Student monitoring', icon: <Users size={18} />, path: '/teacher-dashboard/students' },
  { label: 'Reports', icon: <BarChart3 size={18} />, path: '/teacher-dashboard/reports' },
];

const teacherTools: NavItem[] = [
  { label: 'Create Activity', icon: <ListChecks size={18} />, path: '/teacher-dashboard/assign-activity' },
  { label: 'Study Guides', icon: <FileText size={18} />, path: '/teacher-dashboard/study-guides' },
  { label: 'Tests', icon: <ClipboardCheck size={18} />, path: '/teacher-dashboard/practice-tests' },
];

type AuthMeResponse = {
  user?: {
    name?: string;
    email?: string;
    profileImageUrl?: string | null;
  };
};

export default function TeacherLayout({
  children,
  floatingContent,
}: {
  children: (search: string) => React.ReactNode;
  floatingContent?: React.ReactNode;
}) {
  const navigate = useNavigate();
  const location = useLocation();
  const [profileName, setProfileName] = useState('Teacher');
  const [profileEmail, setProfileEmail] = useState('teacher@example.com');
  const [profileImageUrl, setProfileImageUrl] = useState<string | null>(null);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [search, setSearch] = useState('');
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const response = await fetch('/auth/me', {
          method: 'GET',
          credentials: 'include',
          headers: { Accept: 'application/json' },
        });
        if (!response.ok) {
          return;
        }
        const data = (await response.json()) as AuthMeResponse;
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
  }, []);

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

  const profileInitials =
    profileName
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? '')
      .join('') || 'TC';

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
    } catch {
      setIsLoggingOut(false);
      return;
    }
    window.location.replace('/login/teacher');
  };

  const navigateTo = (path: string) => {
    if (path === location.pathname) {
      return;
    }
    navigate(path);
  };

  return (
    <div className="td-page">
      <aside className="td-sidebar">
        <div className="td-brand-row">
          <button className="td-icon-btn" type="button" aria-label="Open menu">
            <Menu size={22} />
          </button>
          <div className="td-logo" aria-label="EduQuest">
            <img src="/eduquest-logo.png.png" alt="EduQuest" />
            <div className="td-logo-text">
              <span className="title">EduQuest</span>
              <span className="subtitle">Teacher Tools</span>
            </div>
          </div>
        </div>

        <nav className="td-nav">
          {primaryNav.map((item) => (
            <button
              key={item.label}
              type="button"
              className={`td-nav-item ${location.pathname === item.path ? 'is-active' : ''}`}
              onClick={() => navigateTo(item.path)}
            >
              <span className="td-nav-icon">{item.icon}</span>
              <span>{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="td-divider" />
        <div className="td-group-title">Teacher tools</div>
        <nav className="td-nav td-nav-tight">
          {teacherTools.map((item) => (
            <button
              key={item.label}
              type="button"
              className={`td-nav-item ${location.pathname === item.path ? 'is-active' : ''}`}
              onClick={() => navigateTo(item.path)}
            >
              <span className="td-nav-icon">{item.icon}</span>
              <span>{item.label}</span>
            </button>
          ))}
        </nav>
      </aside>

      <main className="td-main">
        <div className="td-topbar td-topbar-teacher">
          <div className="td-search">
            <Search size={20} />
            <input
              type="text"
              placeholder="Search students, classes, sets, and reports"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
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
                        navigate('/teacher-dashboard/profile');
                      }}
                    >
                      <Sparkles size={18} />
                      <span>Profile</span>
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

        <div className="dashboard-page-transition">
          {children(search)}
        </div>
        
        {floatingContent}
      </main>
    </div>
  );
}
