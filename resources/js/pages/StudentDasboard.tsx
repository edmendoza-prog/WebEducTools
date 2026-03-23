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
  FolderClosed,
  FolderPlus,
  Home,
  Lightbulb,
  LogOut,
  Menu,
  MoreVertical,
  Plus,
  Search,
  Settings,
  Shield,
  Sun,
  Trophy,
  Users,
} from 'lucide-react';

type SidebarItem = {
  label: string;
  icon: React.ReactNode;
  path: string;
  badge?: string;
};

type StudyCard = {
  title: string;
  meta: string;
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

const sidebarTop: SidebarItem[] = [
  { label: 'Home', icon: <Home size={18} />, path: '/student-dashboard' },
  { label: 'Your library', icon: <FolderClosed size={18} />, path: '/student-dashboard/library' },
  { label: 'Study groups', icon: <Users size={18} />, badge: 'New', path: '/student-dashboard/study-groups' },
  { label: 'Notifications', icon: <Bell size={18} />, path: '/student-dashboard/notifications' },
];

const sidebarBottom: SidebarItem[] = [
  { label: 'Flashcards', icon: <BookOpen size={18} />, path: '/student-dashboard/flashcards' },
  { label: 'Study Guides', icon: <FileText size={18} />, path: '/student-dashboard/study-guides' },
  { label: 'Practice Tests', icon: <ClipboardCheck size={18} />, path: '/student-dashboard/practice-tests' },
  { label: 'Expert Solutions', icon: <Lightbulb size={18} />, path: '/student-dashboard/expert-solutions' },
];

const cards: StudyCard[] = [
  {
    title: 'Key Philippine Government Agencies and Their Functions',
    meta: '42 cards · by pauDev505',
  },
  {
    title: "Wallerstein's World-Systems Theory",
    meta: '28 cards · by Trisha_Bayonas',
  },
  {
    title: 'Land Registration Law',
    meta: '38 cards · by annlabo',
  },
];

const profilePrimaryItems: ProfileMenuItem[] = [
  { key: 'achievements', label: 'Achievements', icon: <Trophy size={18} /> },
  { key: 'settings', label: 'Settings', icon: <Settings size={18} /> },
  { key: 'light-mode', label: 'Light mode', icon: <Sun size={18} /> },
];

const profileSecondaryItems: ProfileMenuItem[] = [
  { key: 'logout', label: 'Log out', icon: <LogOut size={18} /> },
  { key: 'privacy', label: 'Privacy policy', icon: <Shield size={18} /> },
  { key: 'help', label: 'Help and feedback', icon: <CircleHelp size={18} /> },
];

function rotateCards<T>(items: T[], offset: number): T[] {
  if (items.length === 0) {
    return items;
  }

  const normalizedOffset = ((offset % items.length) + items.length) % items.length;
  return [...items.slice(normalizedOffset), ...items.slice(0, normalizedOffset)];
}

export default function StudentDasboard() {
  const navigate = useNavigate();
  const location = useLocation();
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [activeProfileItem, setActiveProfileItem] = useState('settings');
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isPageSwitching, setIsPageSwitching] = useState(false);
  const [profileName, setProfileName] = useState('Student');
  const [profileEmail, setProfileEmail] = useState('student@example.com');
  const [cardOffset, setCardOffset] = useState(0);
  const [isPagingCards, setIsPagingCards] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement>(null);
  const pagingTimerRef = useRef<number | null>(null);
  const pageSwitchTimerRef = useRef<number | null>(null);
  const visibleCards = rotateCards(cards, cardOffset);

  const activeStudentSection =
    [...sidebarTop, ...sidebarBottom].find((item) => item.path === location.pathname)?.label ?? 'Home';

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
      if (pagingTimerRef.current !== null) {
        window.clearTimeout(pagingTimerRef.current);
      }

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
    .join('') || 'ST';

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

      navigate('/login/student');
    } catch {
      setIsLoggingOut(false);
    }
  };

  const handleNextCards = () => {
    if (isPagingCards) {
      return;
    }

    setIsPagingCards(true);
    pagingTimerRef.current = window.setTimeout(() => {
      setCardOffset((current) => (current + 1) % cards.length);
      setIsPagingCards(false);
    }, 170);
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
    <div className="sd-page">
      <aside className="sd-sidebar">
        <div className="sd-brand-row">
          <button className="sd-icon-btn" type="button" aria-label="Open menu">
            <Menu size={22} />
          </button>
          <div className="sd-logo">Q</div>
        </div>

        <nav className="sd-nav">
          {sidebarTop.map((item) => (
            <button
              key={item.label}
              type="button"
              className={`sd-nav-item ${location.pathname === item.path ? 'is-active' : ''}`}
              onClick={() => navigateFromSidebar(item.path)}
            >
              <span className="sd-nav-icon">{item.icon}</span>
              <span>{item.label}</span>
              {item.badge && <span className="sd-badge">{item.badge}</span>}
            </button>
          ))}
        </nav>

        <div className="sd-divider" />

        <div className="sd-folder-title">Your folders</div>
        <button className="sd-folder-action" type="button" onClick={() => navigateFromSidebar('/student-dashboard/folders/new')}>
          <FolderPlus size={18} />
          <span>New folder</span>
        </button>

        <div className="sd-divider" />

        <div className="sd-folder-title">Start here</div>
        <nav className="sd-nav sd-nav-tight">
          {sidebarBottom.map((item) => (
            <button
              key={item.label}
              type="button"
              className={`sd-nav-item ${location.pathname === item.path ? 'is-active' : ''}`}
              onClick={() => navigateFromSidebar(item.path)}
            >
              <span className="sd-nav-icon">{item.icon}</span>
              <span>{item.label}</span>
            </button>
          ))}
        </nav>
      </aside>

      <main className={`sd-main ${isPageSwitching ? 'is-page-switching' : ''}`}>
        <div className="sd-topbar">
          <div className="sd-search">
            <Search size={20} />
            <input type="text" placeholder="Find it faster with a search" />
          </div>

          <div className="sd-top-actions">
            <button className="sd-plus-btn" type="button" aria-label="Create">
              <Plus size={22} />
            </button>

            <div className="sd-profile-menu" ref={profileMenuRef}>
              <button
                className={`sd-avatar-btn ${isProfileMenuOpen ? 'is-open' : ''}`}
                type="button"
                aria-label="Open profile menu"
                aria-expanded={isProfileMenuOpen}
                onClick={() => setIsProfileMenuOpen((prev) => !prev)}
              >
                <span className="sd-avatar-initials">{profileInitials}</span>
                <span className="sd-avatar-dot" aria-hidden="true" />
              </button>

              {isProfileMenuOpen && (
                <div className="sd-profile-dropdown" role="menu" aria-label="Profile options">
                  <div className="sd-profile-user">
                    <div className="sd-profile-avatar">{profileInitials}</div>
                    <div>
                      <p className="sd-profile-name">{profileName} (Student)</p>
                      <p className="sd-profile-email">{profileEmail}</p>
                    </div>
                  </div>

                  <div className="sd-profile-group">
                    {profilePrimaryItems.map((item) => (
                      <button
                        key={item.key}
                        type="button"
                        className={`sd-profile-item ${activeProfileItem === item.key ? 'is-active' : ''}`}
                        onClick={() => handleProfileItemClick(item.key)}
                      >
                        <span>{item.icon}</span>
                        <span>{item.label}</span>
                      </button>
                    ))}
                  </div>

                  <div className="sd-profile-divider" />

                  <div className="sd-profile-group">
                    {profileSecondaryItems.map((item) => (
                      <button
                        key={item.key}
                        type="button"
                        className={`sd-profile-item ${activeProfileItem === item.key ? 'is-active' : ''}`}
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

        {location.pathname !== '/student-dashboard' && (
          <section className="sd-section">
            <h2 className="sd-section-label">Current page</h2>
            <article className="sd-hero-card">
              <h3>{activeStudentSection}</h3>
              <button className="sd-soft-btn" type="button" onClick={() => navigate('/student-dashboard')}>
                Back to Student Home
              </button>
            </article>
          </section>
        )}

        {location.pathname === '/student-dashboard' && (
          <section className="sd-section">
            <h2 className="sd-section-label">Personalize your content</h2>

            <div className="sd-hero-grid">
              <article className="sd-hero-card">
                <div className="sd-hero-icon">Q</div>
                <button className="sd-more-btn" type="button" aria-label="More options">
                  <MoreVertical size={18} />
                </button>

                <h3>Find the latest content based on your exams</h3>
                <button className="sd-soft-btn" type="button">
                  Update standardized exams
                </button>
              </article>

              <aside className="sd-video-card">
                <div className="sd-video-overlay">Watch More</div>
                <div className="sd-video-play">▶</div>
              </aside>
            </div>
          </section>
        )}

        {location.pathname === '/student-dashboard' && (
          <section className="sd-section">
            <div className="sd-row-head">
              <h2>For your next study session</h2>
              <button className="sd-more-btn" type="button" aria-label="More options">
                <MoreVertical size={18} />
              </button>
            </div>

            <div className={`sd-cards-wrap ${isPagingCards ? 'is-paging' : ''}`}>
              {visibleCards.map((card) => (
                <article key={card.title} className="sd-study-card">
                  <div className="sd-study-icon">
                    <BookOpen size={20} />
                  </div>
                  <h3>{card.title}</h3>
                  <p>{card.meta}</p>
                  <button className="sd-card-more" type="button" aria-label="More options">
                    <MoreVertical size={18} />
                  </button>
                </article>
              ))}

              <button className="sd-next-btn" type="button" aria-label="Next cards" onClick={handleNextCards}>
                <ChevronRight size={20} />
              </button>
            </div>
          </section>
        )}

        {location.pathname === '/student-dashboard' && (
          <section className="sd-section">
            <h2>Keep your brain fresh</h2>
            <div className="sd-banner" />
          </section>
        )}
        </div>
      </main>
    </div>
  );
}
