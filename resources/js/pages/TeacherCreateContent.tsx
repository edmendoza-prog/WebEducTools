import React from 'react';
import {
  AlignJustify,
  Bell,
  ChevronUp,
  ClipboardCheck,
  FileText,
  FolderClosed,
  Globe,
  Home,
  ImagePlus,
  Keyboard,
  Menu,
  Plus,
  Search,
  Trash2,
  WandSparkles,
} from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';

const cardRows = [1, 2];

type NavItem = {
  label: string;
  icon: React.ReactNode;
  path: string;
};

const primaryNav: NavItem[] = [
  { label: 'Home', icon: <Home size={18} />, path: '/teacher-dashboard' },
  { label: 'Your library', icon: <FolderClosed size={18} />, path: '/teacher-dashboard/library' },
  { label: 'Notifications', icon: <Bell size={18} />, path: '/teacher-dashboard/notifications' },
];

const teacherTools: NavItem[] = [
  { label: 'Assign activity', icon: <ClipboardCheck size={18} />, path: '/teacher-dashboard/assign-activity' },
  { label: 'Study Guides', icon: <FileText size={18} />, path: '/teacher-dashboard/study-guides' },
  { label: 'Practice Tests', icon: <ClipboardCheck size={18} />, path: '/teacher-dashboard/practice-tests' },
];

export default function TeacherCreateContent() {
  const navigate = useNavigate();
  const location = useLocation();
  const profileInitials = 'TC';

  const navigateTo = (path: string) => {
    if (location.pathname === path) {
      return;
    }

    navigate(path);
  };

  return (
    <div className="td-page tcc-shell">
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
        <div className="td-group-title">Your classes</div>
        <button className="td-nav-item" type="button" onClick={() => navigateTo('/teacher-dashboard/new-class')}>
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
              onClick={() => navigateTo(item.path)}
            >
              <span className="td-nav-icon">{item.icon}</span>
              <span>{item.label}</span>
            </button>
          ))}
        </nav>
      </aside>

      <main className="td-main tcc-main-shell">
        <div className="td-topbar tcc-topbar">
          <div className="td-search tcc-search">
            <Search size={20} />
            <input type="text" placeholder="Search for a question" />
          </div>

          <div className="td-top-actions tcc-top-actions">
            <button className="td-plus-btn" type="button" aria-label="Create">
              <Plus size={22} />
            </button>
            <button className="td-avatar-btn" type="button" aria-label="Profile">
              <span className="td-avatar-initials">{profileInitials}</span>
              <span className="td-avatar-dot" aria-hidden="true" />
            </button>
          </div>
        </div>

        <section className="tcc-builder">
          <h1>Create a new flashcard set</h1>

          <button className="tcc-visibility-btn" type="button">
            <Globe size={15} />
            <span>Public</span>
          </button>

          <div className="tcc-input-stack">
            <input type="text" placeholder="Title" aria-label="Title" />
            <input type="text" placeholder="Add a description..." aria-label="Description" />
          </div>

          <div className="tcc-toolbar-row">
            <div className="tcc-toolbar-left">
              <button className="tcc-pill-btn" type="button">
                <Plus size={14} />
                <span>Import</span>
              </button>

              <button className="tcc-pill-btn" type="button">
                <Plus size={14} />
                <span>Add diagram</span>
              </button>
            </div>

            <div className="tcc-toolbar-right">
              <span>Suggestions</span>
              <button className="tcc-toggle" type="button" aria-label="Toggle suggestions" aria-pressed="true">
                <span />
              </button>
              <button className="tcc-round-icon" type="button" aria-label="Search">
                <Search size={15} />
              </button>
              <button className="tcc-round-icon" type="button" aria-label="Magic suggestions">
                <WandSparkles size={15} />
              </button>
              <button className="tcc-round-icon" type="button" aria-label="Keyboard shortcuts">
                <Keyboard size={15} />
              </button>
              <button className="tcc-round-icon" type="button" aria-label="Delete set">
                <Trash2 size={15} />
              </button>
            </div>
          </div>

          {cardRows.map((row) => (
            <article key={row} className="tcc-term-card">
              <div className="tcc-card-head">
                <span>{row}</span>
                <div className="tcc-card-actions">
                  <button className="tcc-subtle-icon" type="button" aria-label="Reorder card">
                    <AlignJustify size={16} />
                  </button>
                  <button className="tcc-subtle-icon" type="button" aria-label="Delete card">
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>

              <div className="tcc-card-body">
                <div className="tcc-field-wrap">
                  <input type="text" placeholder="Enter term" aria-label={`Enter term ${row}`} />
                  <div className="tcc-field-meta">
                    <label>TERM</label>
                    {row === 2 && <button type="button">CHOOSE LANGUAGE</button>}
                  </div>
                </div>

                <div className="tcc-field-wrap">
                  <input type="text" placeholder="Enter definition" aria-label={`Enter definition ${row}`} />
                  <div className="tcc-field-meta">
                    <label>DEFINITION</label>
                    {row === 2 && <button type="button">CHOOSE LANGUAGE</button>}
                  </div>
                </div>

                <button className="tcc-image-drop" type="button">
                  <ImagePlus size={16} />
                  <span>Image</span>
                </button>
              </div>

              {row === 2 && (
                <div className="tcc-image-panel">
                  <div className="tcc-image-search">
                    <input type="text" placeholder="Search Quizlet images" aria-label="Search Quizlet images" />
                    <Search size={18} />
                  </div>

                  <span className="tcc-image-or">or</span>

                  <button className="tcc-upload-btn" type="button">
                    <span>Upload</span>
                  </button>

                  <button className="tcc-close-image" type="button">
                    <ChevronUp size={14} />
                    <span>Close</span>
                  </button>
                </div>
              )}
            </article>
          ))}

          <div className="tcc-actions-footer">
            <button className="tcc-muted-btn" type="button">
              Add a card
            </button>
          </div>

          <div className="tcc-page-submit">
            <button className="tcc-primary-btn" type="button">
              Create
            </button>
          </div>
        </section>
      </main>
    </div>
  );
}
