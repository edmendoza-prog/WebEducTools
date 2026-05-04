import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import TeacherLayout from '../../components/ui/TeacherLayout';
import { csrfFetch } from '../../lib/csrf';
import { BookOpen, Edit2, Eye, EyeOff, Filter, MoreVertical, Plus, Trash2, X } from 'lucide-react';

type StudySet = {
  id: string;
  title: string;
  subject: string;
  className: string;
  visibility: 'public' | 'private';
  cards: number;
  updatedAt: string;
};

type FilterOptions = {
  subject: string;
  className: string;
  visibility: string;
};

type SortOption = 'newest' | 'oldest' | 'title-asc' | 'title-desc' | 'cards-asc' | 'cards-desc';

export default function TeacherLibrary() {
  const navigate = useNavigate();
  const [studySets, setStudySets] = useState<StudySet[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filters, setFilters] = useState<FilterOptions>({ subject: '', className: '', visibility: '' });
  const [sortBy, setSortBy] = useState<SortOption>('newest');
  const [showFilters, setShowFilters] = useState(false);
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [editingSet, setEditingSet] = useState<StudySet | null>(null);
  const [deletingSet, setDeleteingSet] = useState<StudySet | null>(null);
  const [editForm, setEditForm] = useState({ title: '', subject: '', className: '', visibility: 'public' as 'public' | 'private' });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    loadStudySets();
  }, []);

  const loadStudySets = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/teacher/dashboard', {
        method: 'GET',
        credentials: 'include',
        headers: { Accept: 'application/json' },
      });

      if (response.ok) {
        const payload = (await response.json()) as { studySets?: StudySet[] };
        setStudySets(payload.studySets ?? []);
      }
    } catch {
      // Keep empty state
    } finally {
      setIsLoading(false);
    }
  };

  const openEditModal = (set: StudySet) => {
    setEditingSet(set);
    setEditForm({
      title: set.title,
      subject: set.subject,
      className: set.className,
      visibility: set.visibility,
    });
    setActiveMenu(null);
  };

  const handleUpdateSet = async () => {
    if (!editingSet) return;

    setIsSubmitting(true);
    try {
      const response = await csrfFetch(`/api/teacher/study-sets/${editingSet.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(editForm),
      });

      if (response.ok) {
        await loadStudySets();
        setEditingSet(null);
      }
    } catch {
      alert('Failed to update study set');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteSet = async () => {
    if (!deletingSet) return;

    setIsSubmitting(true);
    try {
      const response = await csrfFetch(`/api/teacher/study-sets/${deletingSet.id}`, {
        method: 'DELETE',
        headers: { Accept: 'application/json' },
      });

      if (response.ok) {
        await loadStudySets();
        setDeleteingSet(null);
      }
    } catch {
      alert('Failed to delete study set');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getUniqueValues = (key: keyof StudySet) => {
    return Array.from(new Set(studySets.map((set) => set[key]))).filter(Boolean);
  };

  return (
    <TeacherLayout>
      {(search) => {
        // Apply filters
        let filtered = studySets;

        if (search.trim()) {
          const query = search.trim().toLowerCase();
          filtered = filtered.filter((set) =>
            [set.title, set.subject, set.className].some((v) => v.toLowerCase().includes(query)),
          );
        }

        if (filters.subject) {
          filtered = filtered.filter((set) => set.subject === filters.subject);
        }

        if (filters.className) {
          filtered = filtered.filter((set) => set.className === filters.className);
        }

        if (filters.visibility) {
          filtered = filtered.filter((set) => set.visibility === filters.visibility);
        }

        // Apply sorting
        const sorted = [...filtered].sort((a, b) => {
          switch (sortBy) {
            case 'newest':
              return 0; // Already sorted by API
            case 'oldest':
              return 0; // Reverse would need timestamp
            case 'title-asc':
              return a.title.localeCompare(b.title);
            case 'title-desc':
              return b.title.localeCompare(a.title);
            case 'cards-asc':
              return a.cards - b.cards;
            case 'cards-desc':
              return b.cards - a.cards;
            default:
              return 0;
          }
        });

        return (
          <div className="td-library-container">
            {/* Header */}
            <div className="td-library-header">
              <div>
                <h2 style={{ margin: 0, fontSize: '1.5rem', color: '#f4f7ff' }}>Your Library</h2>
                <p style={{ margin: '0.25rem 0 0', fontSize: '0.875rem', color: '#b9c8ff' }}>
                  {studySets.length} study {studySets.length === 1 ? 'set' : 'sets'}
                </p>
              </div>

              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <button
                  className="td-inline-action"
                  type="button"
                  onClick={() => setShowFilters(!showFilters)}
                  style={{ background: showFilters ? 'rgba(118, 120, 237, 0.15)' : 'rgba(30, 41, 90, 0.3)', color: showFilters ? '#c5c7ff' : '#b9c8ff' }}
                >
                  <Filter size={14} /> Filters
                </button>
              </div>
            </div>

            {/* Filters */}
            {showFilters && (
              <div className="td-library-filters">
                <div>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.5rem', color: '#dce5ff' }}>Subject</label>
                  <select
                    value={filters.subject}
                    onChange={(e) => setFilters({ ...filters, subject: e.target.value })}
                    style={{ width: '100%', padding: '0.5rem', border: '1px solid rgba(148, 163, 184, 0.2)', borderRadius: '6px', background: 'rgba(30, 41, 90, 0.3)', color: '#eef1ff' }}
                  >
                    <option value="">All subjects</option>
                    {getUniqueValues('subject').map((subject) => (
                      <option key={subject} value={subject}>
                        {subject}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.5rem', color: '#dce5ff' }}>Class</label>
                  <select
                    value={filters.className}
                    onChange={(e) => setFilters({ ...filters, className: e.target.value })}
                    style={{ width: '100%', padding: '0.5rem', border: '1px solid rgba(148, 163, 184, 0.2)', borderRadius: '6px', background: 'rgba(30, 41, 90, 0.3)', color: '#eef1ff' }}
                  >
                    <option value="">All classes</option>
                    {getUniqueValues('className').map((className) => (
                      <option key={className} value={className}>
                        {className}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.5rem', color: '#dce5ff' }}>Visibility</label>
                  <select
                    value={filters.visibility}
                    onChange={(e) => setFilters({ ...filters, visibility: e.target.value })}
                    style={{ width: '100%', padding: '0.5rem', border: '1px solid rgba(148, 163, 184, 0.2)', borderRadius: '6px', background: 'rgba(30, 41, 90, 0.3)', color: '#eef1ff' }}
                  >
                    <option value="">All</option>
                    <option value="public">Public</option>
                    <option value="private">Private</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.5rem', color: '#dce5ff' }}>Sort by</label>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as SortOption)}
                    style={{ width: '100%', padding: '0.5rem', border: '1px solid rgba(148, 163, 184, 0.2)', borderRadius: '6px', background: 'rgba(30, 41, 90, 0.3)', color: '#eef1ff' }}
                  >
                    <option value="newest">Newest first</option>
                    <option value="oldest">Oldest first</option>
                    <option value="title-asc">Title (A-Z)</option>
                    <option value="title-desc">Title (Z-A)</option>
                    <option value="cards-asc">Fewest cards</option>
                    <option value="cards-desc">Most cards</option>
                  </select>
                </div>
              </div>
            )}

            {/* Cards Grid */}
            {isLoading ? (
              <div style={{ textAlign: 'center', padding: '3rem', color: '#9fb0ff' }}>
                <p>Loading your library...</p>
              </div>
            ) : sorted.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '3rem' }}>
                <BookOpen size={48} style={{ color: '#7678ed', margin: '0 auto 1rem' }} />
                <h3 style={{ margin: 0, color: '#dce5ff', fontSize: '1.125rem' }}>No study sets found</h3>
                <p style={{ margin: '0.5rem 0 1.5rem', color: '#9fb0ff' }}>
                  {search || filters.subject || filters.className || filters.visibility
                    ? 'Try adjusting your filters or search'
                    : 'Create your first study set to get started'}
                </p>
                {!search && !filters.subject && !filters.className && !filters.visibility && (
                  <button
                    className="td-inline-action"
                    type="button"
                    onClick={() => navigate('/teacher-dashboard/create-content')}
                    style={{ background: '#7678ed', color: 'white' }}
                  >
                    <Plus size={14} /> Create study set
                  </button>
                )}
              </div>
            ) : (
              <div className="td-library-grid">
                {sorted.map((set) => (
                  <div key={set.id} className="td-library-card">
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                      <div style={{ flex: 1 }}>
                        <h3 style={{ margin: 0, fontSize: '1.125rem', color: '#eef1ff', fontWeight: 600 }}>{set.title}</h3>
                        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem', flexWrap: 'wrap' }}>
                          <span style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem', background: 'rgba(118, 120, 237, 0.15)', color: '#b9c8ff', border: '1px solid rgba(118, 120, 237, 0.3)', borderRadius: '4px' }}>
                            {set.subject}
                          </span>
                          <span style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem', background: 'rgba(30, 41, 90, 0.5)', color: '#b9c8ff', border: '1px solid rgba(148, 163, 184, 0.15)', borderRadius: '4px' }}>
                            {set.className}
                          </span>
                        </div>
                      </div>

                      <div style={{ position: 'relative' }}>
                        <button
                          onClick={() => setActiveMenu(activeMenu === set.id ? null : set.id)}
                          style={{
                            padding: '0.5rem',
                            border: 'none',
                            background: 'transparent',
                            cursor: 'pointer',
                            borderRadius: '4px',
                            color: '#b9c8ff',
                          }}
                          onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(30, 41, 90, 0.5)')}
                          onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                        >
                          <MoreVertical size={18} />
                        </button>

                        {activeMenu === set.id && (
                          <div
                            style={{
                              position: 'absolute',
                              top: '100%',
                              right: 0,
                              background: '#0a0f3b',
                              border: '1px solid rgba(148, 163, 184, 0.3)',
                              borderRadius: '8px',
                              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
                              minWidth: '160px',
                              zIndex: 10,
                              marginTop: '0.25rem',
                            }}
                          >
                            <button
                              onClick={() => openEditModal(set)}
                              style={{
                                width: '100%',
                                padding: '0.75rem 1rem',
                                border: 'none',
                                background: 'none',
                                textAlign: 'left',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.5rem',
                                fontSize: '0.875rem',
                                color: '#dce5ff',
                              }}
                              onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(30, 41, 90, 0.5)')}
                              onMouseLeave={(e) => (e.currentTarget.style.background = 'none')}
                            >
                              <Edit2 size={14} /> Edit
                            </button>
                            <button
                              onClick={() => {
                                setDeleteingSet(set);
                                setActiveMenu(null);
                              }}
                              style={{
                                width: '100%',
                                padding: '0.75rem 1rem',
                                border: 'none',
                                background: 'none',
                                textAlign: 'left',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.5rem',
                                fontSize: '0.875rem',
                                color: '#f87171',
                                borderTop: '1px solid rgba(148, 163, 184, 0.2)',
                              }}
                              onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)')}
                              onMouseLeave={(e) => (e.currentTarget.style.background = 'none')}
                            >
                              <Trash2 size={14} /> Delete
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginTop: '1rem', paddingTop: '0.75rem', borderTop: '1px solid rgba(148, 163, 184, 0.15)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.875rem', color: '#b9c8ff' }}>
                        <BookOpen size={14} />
                        <span>{set.cards} cards</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.875rem', color: '#b9c8ff' }}>
                        {set.visibility === 'public' ? <Eye size={14} /> : <EyeOff size={14} />}
                        <span>{set.visibility}</span>
                      </div>
                      <div style={{ marginLeft: 'auto', fontSize: '0.75rem', color: '#94a3b8' }}>{set.updatedAt}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Edit Modal */}
            {editingSet && (
              <div
                style={{
                  position: 'fixed',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  background: 'rgba(0,0,0,0.7)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  zIndex: 50,
                }}
                onClick={() => !isSubmitting && setEditingSet(null)}
              >
                <div
                  style={{
                    background: '#0a0f3b',
                    borderRadius: '12px',
                    padding: '2rem',
                    maxWidth: '500px',
                    width: '90%',
                    border: '1px solid rgba(148, 163, 184, 0.3)',
                  }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                    <h3 style={{ margin: 0, fontSize: '1.25rem', color: '#eef1ff' }}>Edit Study Set</h3>
                    <button
                      onClick={() => setEditingSet(null)}
                      disabled={isSubmitting}
                      style={{ padding: '0.5rem', border: 'none', background: 'none', cursor: 'pointer', color: '#b9c8ff' }}
                    >
                      <X size={20} />
                    </button>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.5rem', color: '#dce5ff' }}>Title</label>
                      <input
                        type="text"
                        value={editForm.title}
                        onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                        style={{ width: '100%', padding: '0.625rem', border: '1px solid rgba(148, 163, 184, 0.2)', borderRadius: '6px', fontSize: '0.875rem', background: 'rgba(30, 41, 90, 0.3)', color: '#eef1ff' }}
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.5rem', color: '#dce5ff' }}>Subject</label>
                      <input
                        type="text"
                        value={editForm.subject}
                        onChange={(e) => setEditForm({ ...editForm, subject: e.target.value })}
                        style={{ width: '100%', padding: '0.625rem', border: '1px solid rgba(148, 163, 184, 0.2)', borderRadius: '6px', fontSize: '0.875rem', background: 'rgba(30, 41, 90, 0.3)', color: '#eef1ff' }}
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.5rem', color: '#dce5ff' }}>Class Name</label>
                      <input
                        type="text"
                        value={editForm.className}
                        onChange={(e) => setEditForm({ ...editForm, className: e.target.value })}
                        style={{ width: '100%', padding: '0.625rem', border: '1px solid rgba(148, 163, 184, 0.2)', borderRadius: '6px', fontSize: '0.875rem', background: 'rgba(30, 41, 90, 0.3)', color: '#eef1ff' }}
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.5rem', color: '#dce5ff' }}>Visibility</label>
                      <select
                        value={editForm.visibility}
                        onChange={(e) => setEditForm({ ...editForm, visibility: e.target.value as 'public' | 'private' })}
                        style={{ width: '100%', padding: '0.625rem', border: '1px solid rgba(148, 163, 184, 0.2)', borderRadius: '6px', fontSize: '0.875rem', background: 'rgba(30, 41, 90, 0.3)', color: '#eef1ff' }}
                      >
                        <option value="public">Public</option>
                        <option value="private">Private</option>
                      </select>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.5rem', justifyContent: 'flex-end' }}>
                    <button
                      onClick={() => setEditingSet(null)}
                      disabled={isSubmitting}
                      style={{
                        padding: '0.625rem 1.25rem',
                        border: '1px solid rgba(148, 163, 184, 0.2)',
                        background: 'rgba(30, 41, 90, 0.3)',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontSize: '0.875rem',
                        color: '#dce5ff',
                      }}
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleUpdateSet}
                      disabled={isSubmitting}
                      style={{
                        padding: '0.625rem 1.25rem',
                        border: 'none',
                        background: '#7678ed',
                        color: 'white',
                        borderRadius: '6px',
                        cursor: isSubmitting ? 'not-allowed' : 'pointer',
                        fontSize: '0.875rem',
                        opacity: isSubmitting ? 0.6 : 1,
                      }}
                    >
                      {isSubmitting ? 'Saving...' : 'Save Changes'}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Delete Confirmation */}
            {deletingSet && (
              <div
                style={{
                  position: 'fixed',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  background: 'rgba(0,0,0,0.7)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  zIndex: 50,
                }}
                onClick={() => !isSubmitting && setDeleteingSet(null)}
              >
                <div
                  style={{
                    background: '#0a0f3b',
                    borderRadius: '12px',
                    padding: '2rem',
                    maxWidth: '400px',
                    width: '90%',
                    border: '1px solid rgba(148, 163, 184, 0.3)',
                  }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <h3 style={{ margin: '0 0 1rem', fontSize: '1.25rem', color: '#eef1ff' }}>Delete Study Set?</h3>
                  <p style={{ margin: 0, fontSize: '0.875rem', color: '#b9c8ff', lineHeight: 1.6 }}>
                    Are you sure you want to delete "<strong>{deletingSet.title}</strong>"? This action cannot be undone and will remove all
                    associated flashcards and quizzes.
                  </p>

                  <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.5rem', justifyContent: 'flex-end' }}>
                    <button
                      onClick={() => setDeleteingSet(null)}
                      disabled={isSubmitting}
                      style={{
                        padding: '0.625rem 1.25rem',
                        border: '1px solid rgba(148, 163, 184, 0.2)',
                        background: 'rgba(30, 41, 90, 0.3)',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontSize: '0.875rem',
                        color: '#dce5ff',
                      }}
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleDeleteSet}
                      disabled={isSubmitting}
                      style={{
                        padding: '0.625rem 1.25rem',
                        border: 'none',
                        background: '#dc2626',
                        color: 'white',
                        borderRadius: '6px',
                        cursor: isSubmitting ? 'not-allowed' : 'pointer',
                        fontSize: '0.875rem',
                        opacity: isSubmitting ? 0.6 : 1,
                      }}
                    >
                      {isSubmitting ? 'Deleting...' : 'Delete'}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      }}
    </TeacherLayout>
  );
}

