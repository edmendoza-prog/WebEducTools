import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { csrfFetch } from '../../lib/csrf';
import {
  Award,
  BarChart3,
  Bell,
  Check,
  ChevronDown,
  Clock3,
  HelpCircle,
  Home,
  Layers,
  LogOut,
  Mail,
  Pencil,
  Upload,
  Users,
  X,
} from 'lucide-react';

type ProfileResponse = {
  user?: {
    name?: string;
    email?: string;
    role?: string;
    profileImageUrl?: string | null;
  };
};

type NavItem = {
  label: string;
  path: string;
  icon: React.ReactNode;
};

const navItems: NavItem[] = [
  { label: 'Dashboard', path: '/student-dashboard', icon: <Home size={18} /> },
  { label: 'Flashcards', path: '/student-dashboard/flashcards', icon: <Layers size={18} /> },
  { label: 'Quiz', path: '/student-dashboard/quiz', icon: <HelpCircle size={18} /> },
  { label: 'Practice Test', path: '/student-dashboard/practice-tests', icon: <Clock3 size={18} /> },
  { label: 'Reports', path: '/student-dashboard/reports', icon: <BarChart3 size={18} /> },
  { label: 'Search & Collaboration', path: '/student-dashboard/library', icon: <Users size={18} /> },
];

/** Preset avatar options represented as colored circles with emoji characters */
const PRESET_AVATARS = [
  { id: 'av1',  bg: '#c2185b', emoji: '🦊' },
  { id: 'av2',  bg: '#5c35a8', emoji: '🦅' },
  { id: 'av3',  bg: '#7c3aed', emoji: '🐱' },
  { id: 'av4',  bg: '#0ea5e9', emoji: '🐧' },
  { id: 'av5',  bg: '#2196f3', emoji: '🐟' },
  { id: 'av6',  bg: '#f59e0b', emoji: '🦁' },
  { id: 'av7',  bg: '#a855f7', emoji: '🐰' },
  { id: 'av8',  bg: '#ef4444', emoji: '🐶' },
  { id: 'av9',  bg: '#0891b2', emoji: '🦋' },
  { id: 'av10', bg: '#6366f1', emoji: '🐺' },
  { id: 'av11', bg: '#ec4899', emoji: '🦩' },
  { id: 'av12', bg: '#1e40af', emoji: '🐼' },
  { id: 'av13', bg: '#059669', emoji: '🐢' },
  { id: 'av14', bg: '#0369a1', emoji: '🥷' },
  { id: 'av15', bg: '#1d4ed8', emoji: '🐦' },
  { id: 'av16', bg: '#b45309', emoji: '🦒' },
  { id: 'av17', bg: '#374151', emoji: '🐻' },
  { id: 'av18', bg: '#be185d', emoji: '🦌' },
  { id: 'av19', bg: '#4b5563', emoji: '🐨' },
  { id: 'av20', bg: '#b45309', emoji: '🦅' },
  { id: 'av21', bg: '#ef4444', emoji: '🦜' },
];

function initialsFromName(name: string): string {
  return (
    name
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? '')
      .join('') || 'SL'
  );
}

export default function StudentSettings() {
  const navigate = useNavigate();

  const [profileName, setProfileName]         = useState('Student Learner');
  const [profileEmail, setProfileEmail]       = useState('student@example.com');
  const [profileImageUrl, setProfileImageUrl] = useState<string | null>(null);
  const [localPreview, setLocalPreview]       = useState<string | null>(null);
  const [selectedPreset, setSelectedPreset]   = useState<string | null>(null);

  const [editingField, setEditingField] = useState<'username' | 'email' | null>(null);
  const [draftValue, setDraftValue]     = useState('');
  const [fieldError, setFieldError]     = useState('');
  const [isSaving, setIsSaving]         = useState(false);

  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  /* ── Load profile on mount ─────────────────────────────────────── */
  useEffect(() => {
    let mounted = true;

    const load = async () => {
      try {
        const res = await fetch('/auth/me', {
          method: 'GET',
          credentials: 'include',
          headers: { Accept: 'application/json' },
        });
        if (!mounted || !res.ok) return;

        const data = (await res.json()) as ProfileResponse;
        if (data.user?.name)  setProfileName(data.user.name);
        if (data.user?.email) setProfileEmail(data.user.email);
        setProfileImageUrl(data.user?.profileImageUrl ?? null);
      } catch {
        // keep defaults
      }
    };

    load();
    return () => { mounted = false; };
  }, []);

  /* ── Keyboard: Escape closes inline edit ───────────────────────── */
  useEffect(() => {
    if (!editingField) return undefined;

    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') cancelEdit();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [editingField]);

  /* ── Helpers ───────────────────────────────────────────────────── */
  const openEdit = (field: 'username' | 'email') => {
    setDraftValue(field === 'username' ? profileName : profileEmail);
    setFieldError('');
    setEditingField(field);
  };

  const cancelEdit = () => {
    setEditingField(null);
    setDraftValue('');
    setFieldError('');
  };

  const saveField = async (field: 'username' | 'email') => {
    const trimmed = draftValue.trim();
    if (!trimmed) {
      setFieldError(`${field === 'username' ? 'Username' : 'Email'} cannot be empty.`);
      return;
    }

    setIsSaving(true);
    setFieldError('');

    try {
      const formData = new FormData();
      if (field === 'username') {
        formData.append('name', trimmed);
        formData.append('email', profileEmail);
      } else {
        formData.append('name', profileName);
        formData.append('email', trimmed);
      }

      const res = await csrfFetch('/auth/profile', {
        method: 'PATCH',
        headers: { Accept: 'application/json' },
        body: formData,
      });

      if (!res.ok) {
        setFieldError('Unable to save. Please try again.');
        return;
      }

      const payload = (await res.json()) as ProfileResponse;
      if (field === 'username') setProfileName(payload.user?.name ?? trimmed);
      else setProfileEmail(payload.user?.email ?? trimmed);
      cancelEdit();
    } catch {
      setFieldError('Unable to save. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  /** Apply a preset avatar (stored as the emoji + background via a data URI) */
  const applyPreset = async (preset: { id: string; bg: string; emoji: string }) => {
    setSelectedPreset(preset.id);

    // Build a canvas image and show it instantly as a local preview
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = preset.bg;
    ctx.beginPath();
    ctx.arc(64, 64, 64, 0, Math.PI * 2);
    ctx.fill();

    ctx.font = '64px serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(preset.emoji, 64, 68);

    const dataUrl = canvas.toDataURL('image/png');
    setLocalPreview(dataUrl);

    canvas.toBlob(async (blob) => {
      if (!blob) return;

      const formData = new FormData();
      formData.append('name', profileName);
      formData.append('email', profileEmail);
      formData.append('profileImage', blob, 'avatar.png');

      try {
        const res = await csrfFetch('/auth/profile', {
          method: 'PATCH',
          headers: { Accept: 'application/json' },
          body: formData,
        });

        if (res.ok) {
          const payload = (await res.json()) as ProfileResponse;
          setProfileImageUrl(payload.user?.profileImageUrl ?? dataUrl);
          setLocalPreview(null);
        }
      } catch {
        // keep local preview visible
      }
    }, 'image/png');
  };

  const handleCustomUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedPreset(null);
    setLocalPreview(URL.createObjectURL(file));

    const formData = new FormData();
    formData.append('name', profileName);
    formData.append('email', profileEmail);
    formData.append('profileImage', file);

    try {
      const res = await csrfFetch('/auth/profile', {
        method: 'PATCH',
        headers: { Accept: 'application/json' },
        body: formData,
      });

      if (res.ok) {
        const payload = (await res.json()) as ProfileResponse;
        setProfileImageUrl(payload.user?.profileImageUrl ?? URL.createObjectURL(file));
      }
    } catch {
      // keep previous image
    }
  };

  const handleLogout = async () => {
    if (isLoggingOut) return;
    setIsLoggingOut(true);

    try {
      const res = await csrfFetch('/auth/logout', {
        method: 'POST',
        headers: { Accept: 'application/json' },
      });

      if (!res.ok) throw new Error('Logout failed.');
      window.location.replace('/login/student');
    } catch {
      setIsLoggingOut(false);
    }
  };

  const profileInitials = initialsFromName(profileName);

  /* ── Render ─────────────────────────────────────────────────────── */
  return (
    <div className="ss-page">
      {/* ── Sidebar ── */}
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
              className="ss-nav-item"
              onClick={() => navigate(item.path)}
            >
              {item.icon}
              <span>{item.label}</span>
            </button>
          ))}
        </nav>
      </aside>

      {/* ── Main ── */}
      <main className="ss-main sset-main">
        {/* Topbar */}
        <header className="ss-topbar">
          <div className="ss-header-copy">
            <h1>Settings</h1>
            <p>Manage your account preferences.</p>
          </div>

          <div className="ss-user-actions">
            <button
              type="button"
              className="ss-quick-action"
              onClick={() => navigate('/student-dashboard/library')}
              aria-label="Open mail"
            >
              <Mail size={14} />
            </button>
            <button
              type="button"
              className="ss-quick-action"
              onClick={() => navigate('/student-dashboard/notifications')}
              aria-label="Open notifications"
            >
              <Bell size={14} />
            </button>
            <button
              type="button"
              className="ss-quick-action"
              onClick={() => navigate('/student-dashboard/achievements')}
              aria-label="Achievements"
            >
              <Award size={14} />
            </button>
            <button
              type="button"
              className="ss-quick-action"
              onClick={handleLogout}
              disabled={isLoggingOut}
              aria-label="Sign out"
            >
              <LogOut size={14} />
            </button>
          </div>
        </header>

        {/* Settings card */}
        <div className="sset-card">
          <h2 className="sset-section-title">Personal information</h2>

          {/* ── Profile picture ── */}
          <div className="sset-row sset-row-avatar">
            <span className="sset-row-label">Profile picture</span>

            <div className="sset-avatar-area">
              {/* Current avatar */}
              <div className="sset-current-avatar" aria-label="Current profile picture">
                {(localPreview ?? profileImageUrl)
                  ? <img src={localPreview ?? profileImageUrl ?? ''} alt="Profile" className="sset-avatar-img" />
                  : <span className="sset-avatar-initials">{profileInitials}</span>
                }
              </div>

              {/* Preset grid */}
              <div className="sset-preset-grid">
                {PRESET_AVATARS.map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    className={`sset-preset-btn${selectedPreset === preset.id ? ' is-selected' : ''}`}
                    style={{ background: preset.bg }}
                    onClick={() => applyPreset(preset)}
                    aria-label={`Select ${preset.emoji} avatar`}
                  >
                    {preset.emoji}
                  </button>
                ))}

                {/* Custom upload */}
                <button
                  type="button"
                  className="sset-preset-btn sset-preset-upload"
                  onClick={() => fileInputRef.current?.click()}
                  aria-label="Upload custom photo"
                >
                  <Upload size={16} />
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="sset-hidden-input"
                  onChange={handleCustomUpload}
                />
              </div>
            </div>
          </div>

          <div className="sset-divider" />

          {/* ── Username ── */}
          <div className="sset-row">
            <span className="sset-row-label">Username</span>

            {editingField === 'username' ? (
              <div className="sset-inline-edit">
                <input
                  type="text"
                  className="sset-inline-input"
                  value={draftValue}
                  onChange={(e) => setDraftValue(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && saveField('username')}
                  autoFocus
                  aria-label="Edit username"
                />
                {fieldError && <p className="sset-field-error">{fieldError}</p>}
                <div className="sset-inline-actions">
                  <button type="button" className="sset-save-btn" onClick={() => saveField('username')} disabled={isSaving}>
                    <Check size={14} /> {isSaving ? 'Saving…' : 'Save'}
                  </button>
                  <button type="button" className="sset-cancel-btn" onClick={cancelEdit}>
                    <X size={14} /> Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="sset-row-value-group">
                <span className="sset-row-value">{profileName}</span>
                <button type="button" className="sset-edit-link" onClick={() => openEdit('username')}>
                  <Pencil size={13} /> Edit
                </button>
              </div>
            )}
          </div>

          <div className="sset-divider" />

          {/* ── Email ── */}
          <div className="sset-row">
            <span className="sset-row-label">Email</span>

            {editingField === 'email' ? (
              <div className="sset-inline-edit">
                <input
                  type="email"
                  className="sset-inline-input"
                  value={draftValue}
                  onChange={(e) => setDraftValue(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && saveField('email')}
                  autoFocus
                  aria-label="Edit email"
                />
                {fieldError && <p className="sset-field-error">{fieldError}</p>}
                <div className="sset-inline-actions">
                  <button type="button" className="sset-save-btn" onClick={() => saveField('email')} disabled={isSaving}>
                    <Check size={14} /> {isSaving ? 'Saving…' : 'Save'}
                  </button>
                  <button type="button" className="sset-cancel-btn" onClick={cancelEdit}>
                    <X size={14} /> Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="sset-row-value-group">
                <span className="sset-row-value">{profileEmail}</span>
                <button type="button" className="sset-edit-link" onClick={() => openEdit('email')}>
                  <Pencil size={13} /> Edit
                </button>
              </div>
            )}
          </div>

          <div className="sset-divider" />

          {/* ── Account type ── */}
          <div className="sset-row">
            <span className="sset-row-label">Account type</span>
            <div className="sset-row-value-group">
              <button type="button" className="sset-role-chip" aria-label="Account type: Student">
                Student <ChevronDown size={14} />
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

