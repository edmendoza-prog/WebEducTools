import React, { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { csrfFetch } from '../lib/csrf';
import {
  Bell,
  BookOpen,
  CircleHelp,
  ChevronRight,
  ClipboardCheck,
  FileText,
  Flame,
  FolderClosed,
  Gamepad2,
  Home,
  ListChecks,
  LogOut,
  Menu,
  MoreVertical,
  Plus,
  Search,
  Settings,
  Shield,
  Sun,
} from 'lucide-react';

type NavItem = {
  label: string;
  icon: React.ReactNode;
  path: string;
};

type StudyCard = {
  title: string;
  meta: string;
  learners: string;
};

type ProfileMenuItem = {
  key: string;
  label: string;
  icon: React.ReactNode;
};

type AuthMeResponse = {
  authenticated?: boolean;
  user?: {
    name?: string;
    email?: string;
  };
};

const primaryNav: NavItem[] = [
  { label: 'Home', icon: <Home size={18} />, path: '/teacher-dashboard' },
  { label: 'Your library', icon: <FolderClosed size={18} />, path: '/teacher-dashboard/library' },
  { label: 'Notifications', icon: <Bell size={18} />, path: '/teacher-dashboard/notifications' },
];

const teacherTools: NavItem[] = [
  { label: 'Assign activity', icon: <ListChecks size={18} />, path: '/teacher-dashboard/assign-activity' },
  { label: 'Study Guides', icon: <FileText size={18} />, path: '/teacher-dashboard/study-guides' },
  { label: 'Practice Tests', icon: <ClipboardCheck size={18} />, path: '/teacher-dashboard/practice-tests' },
];

const cards: StudyCard[] = [
  {
    title: 'Use the appropriate tool or protocol to solve networking',
    meta: '18 cards · by ashadeofdarkwa',
    learners: '61 studiers today',
  },
  {
    title: 'My flashcard',
    meta: '15 cards · by normor26',
    learners: '123 studiers today',
  },
  {
    title: 'Words for MOD 1 set',
    meta: '26 cards · by danlop28',
    learners: '19 studiers today',
  },
];

const profilePrimaryItems: ProfileMenuItem[] = [
  { key: 'streaks-achievements', label: 'Streaks and achievements', icon: <Flame size={18} /> },
  { key: 'settings', label: 'Settings', icon: <Settings size={18} /> },
  { key: 'light-mode', label: 'Light mode', icon: <Sun size={18} /> },
];

const profileSecondaryItems: ProfileMenuItem[] = [
  { key: 'logout', label: 'Log out', icon: <LogOut size={18} /> },
  { key: 'privacy', label: 'Privacy policy', icon: <Shield size={18} /> },
  { key: 'help', label: 'Help and feedback', icon: <CircleHelp size={18} /> },
  { key: 'group-discounts', label: 'Group discounts', icon: <Flame size={18} /> },
];

function rotateCards<T>(items: T[], offset: number): T[] {
  if (items.length === 0) {
    return items;
  }

  const normalizedOffset = ((offset % items.length) + items.length) % items.length;
  return [...items.slice(normalizedOffset), ...items.slice(0, normalizedOffset)];
}

function StudyRow({ title }: { title: string }) {
  const [cardOffset, setCardOffset] = useState(0);
  const [isPaging, setIsPaging] = useState(false);
  const pagingTimerRef = useRef<number | null>(null);
  const visibleCards = rotateCards(cards, cardOffset);

  useEffect(() => {
    return () => {
      if (pagingTimerRef.current !== null) {
        window.clearTimeout(pagingTimerRef.current);
      }
    };
  }, []);

  const handleNextCards = () => {
    if (isPaging) {
      return;
    }

    setIsPaging(true);
    pagingTimerRef.current = window.setTimeout(() => {
      setCardOffset((current) => (current + 1) % cards.length);
      setIsPaging(false);
    }, 170);
  };

  return (
    <section className="td-section">
      <div className="td-row-head">
        <h2>{title}</h2>
        <button className="td-more-btn" type="button" aria-label="More options">
          <MoreVertical size={18} />
        </button>
      </div>

      <div className={`td-cards-wrap ${isPaging ? 'is-paging' : ''}`}>
        {visibleCards.map((card) => (
          <article key={`${title}-${card.title}`} className="td-study-card">
            <div className="td-study-top">
              <div className="td-study-icon">
                <BookOpen size={20} />
              </div>
              <span className="td-pill">{card.learners}</span>
            </div>
            <h3>{card.title}</h3>
            <p>{card.meta}</p>
            <button className="td-card-more" type="button" aria-label="More options">
              <MoreVertical size={18} />
            </button>
          </article>
        ))}

        <button className="td-next-btn" type="button" aria-label="Next cards" onClick={handleNextCards}>
          <ChevronRight size={20} />
        </button>
      </div>
    </section>
  );
}

export default function TeacherDashboard() {
  const navigate = useNavigate();
  const location = useLocation();
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [activeProfileItem, setActiveProfileItem] = useState('settings');
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isPageSwitching, setIsPageSwitching] = useState(false);
  const [profileName, setProfileName] = useState('Teacher');
  const [profileEmail, setProfileEmail] = useState('teacher@example.com');
  const profileMenuRef = useRef<HTMLDivElement>(null);
  const pageSwitchTimerRef = useRef<number | null>(null);

  const activeTeacherSection =
    [...primaryNav, ...teacherTools].find((item) => item.path === location.pathname)?.label ?? 'Home';

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const response = await fetch('/auth/me', {
          method: 'GET',
          credentials: 'include',
          headers: {
            Accept: 'application/json',
          },
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
      } catch {
        // Keep fallback profile values when auth info is unavailable.
      }
    };

    loadProfile();
  }, []);

  useEffect(() => {
    const onDocumentMouseDown = (event: MouseEvent) => {
      if (!profileMenuRef.current) {
        return;
      }

      if (!profileMenuRef.current.contains(event.target as Node)) {
        setIsProfileMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', onDocumentMouseDown);
    return () => document.removeEventListener('mousedown', onDocumentMouseDown);
  }, []);

  useEffect(() => {
    return () => {
      if (pageSwitchTimerRef.current !== null) {
        window.clearTimeout(pageSwitchTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    setIsPageSwitching(false);
  }, [location.pathname]);

  const profileInitials = profileName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('') || 'TC';

  const handleProfileItemClick = async (key: string) => {
    setActiveProfileItem(key);

    if (key !== 'logout' || isLoggingOut) {
      return;
    }

    setIsLoggingOut(true);

    try {
      const response = await csrfFetch('/auth/logout', {
        method: 'POST',
        headers: {
          Accept: 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Logout failed.');
      }

      navigate('/login/teacher');
    } catch {
      setIsLoggingOut(false);
    }
  };

  const navigateFromSidebar = (path: string) => {
    if (path === location.pathname || isPageSwitching) {
      return;
    }

    setIsPageSwitching(true);
    pageSwitchTimerRef.current = window.setTimeout(() => {
      navigate(path);
    }, 220);
  };

  return (
    <div className="td-page">
      <aside className="td-sidebar">
        <div className="td-brand-row">
          <button className="td-icon-btn" type="button" aria-label="Open menu">
            <Menu size={22} />
          </button>
          <div className="td-logo">Q</div>
        </div>

        <nav className="td-nav">
          {primaryNav.map((item) => (
            <button
              key={item.label}
              type="button"
              className={`td-nav-item ${location.pathname === item.path ? 'is-active' : ''}`}
              onClick={() => navigateFromSidebar(item.path)}
            >
              <span className="td-nav-icon">{item.icon}</span>
              <span>{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="td-divider" />
        <div className="td-group-title">Your classes</div>
        <button className="td-nav-item" type="button" onClick={() => navigateFromSidebar('/teacher-dashboard/new-class')}>
          <span className="td-nav-icon">
            <Plus size={18} />
          </span>
          <span>New class</span>
        </button>

        <div className="td-divider" />
        <div className="td-group-title">Teacher tools</div>
        <nav className="td-nav td-nav-tight">
          {teacherTools.map((item) => (
            <button
              key={item.label}
              type="button"
              className={`td-nav-item ${location.pathname === item.path ? 'is-active' : ''}`}
              onClick={() => navigateFromSidebar(item.path)}
            >
              <span className="td-nav-icon">{item.icon}</span>
              <span>{item.label}</span>
            </button>
          ))}
        </nav>
      </aside>

      <main className={`td-main ${isPageSwitching ? 'is-page-switching' : ''}`}>
        <div className="td-topbar">
          <div className="td-search">
            <Search size={20} />
            <input type="text" placeholder="Search for study guides" />
          </div>

          <div className="td-top-actions">
            <button className="td-plus-btn" type="button" aria-label="Create">
              <Plus size={22} />
            </button>

            <div className="td-profile-menu" ref={profileMenuRef}>
              <button
                className={`td-avatar-btn ${isProfileMenuOpen ? 'is-open' : ''}`}
                type="button"
                aria-label="Open profile menu"
                aria-expanded={isProfileMenuOpen}
                onClick={() => setIsProfileMenuOpen((prev) => !prev)}
              >
                <span className="td-avatar-initials">{profileInitials}</span>
                <span className="td-avatar-dot" aria-hidden="true" />
              </button>

              {isProfileMenuOpen && (
                <div className="td-profile-dropdown" role="menu" aria-label="Profile options">
                  <div className="td-profile-user">
                    <div className="td-profile-avatar">{profileInitials}</div>
                    <div>
                      <p className="td-profile-name">{profileName} (Teacher)</p>
                      <p className="td-profile-email">{profileEmail}</p>
                    </div>
                  </div>

                  <div className="td-profile-group">
                    {profilePrimaryItems.map((item) => (
                      <button
                        key={item.key}
                        type="button"
                        className={`td-profile-item ${activeProfileItem === item.key ? 'is-active' : ''}`}
                        onClick={() => handleProfileItemClick(item.key)}
                      >
                        <span>{item.icon}</span>
                        <span>{item.label}</span>
                      </button>
                    ))}
                  </div>

                  <div className="td-profile-divider" />

                  <div className="td-profile-group">
                    {profileSecondaryItems.map((item) => (
                      <button
                        key={item.key}
                        type="button"
                        className={`td-profile-item ${activeProfileItem === item.key ? 'is-active' : ''}`}
                        onClick={() => handleProfileItemClick(item.key)}
                        disabled={item.key === 'logout' && isLoggingOut}
                      >
                        <span>{item.icon}</span>
                        <span>{item.key === 'logout' && isLoggingOut ? 'Logging out...' : item.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <div key={location.pathname} className="dashboard-page-transition">

        {location.pathname !== '/teacher-dashboard' && (
          <section className="td-section">
            <div className="td-row-head">
              <h2>{activeTeacherSection}</h2>
            </div>
            <button className="td-action-card" type="button" onClick={() => navigate('/teacher-dashboard')}>
              <Home size={20} />
              <span>Back to Teacher Home</span>
            </button>
          </section>
        )}

        {location.pathname === '/teacher-dashboard' && (
          <div className="td-layout-grid">
            <div className="td-content-col">
              <section className="td-actions-row">
                <button className="td-action-card" type="button">
                  <FileText size={20} />
                  <span>Create content</span>
                </button>
                <button className="td-action-card" type="button">
                  <ListChecks size={20} />
                  <span>Assign an activity</span>
                </button>
                <button className="td-action-card" type="button">
                  <Gamepad2 size={20} />
                  <span>Play class games</span>
                </button>
              </section>

              <StudyRow title="Fresh finds" />
              <StudyRow title="Based on your recent studying" />
            </div>

            <aside className="td-right-rail">
              <div className="td-watch-card">
                <div className="td-watch-label">Watch More</div>
                <div className="td-watch-text">Every class, every test, one ultimate study app.</div>
              </div>
            </aside>
          </div>
        )}
        </div>
      </main>
    </div>
  );
}
