import React, { useEffect, useMemo, useState } from 'react';
import TeacherLayout from '../../components/ui/TeacherLayout';
import { csrfFetch } from '../../lib/csrf';
import { Pencil, Plus, Trash2, Users, X } from 'lucide-react';

type TeacherClass = {
  id: number;
  name: string;
  subject: string;
  description?: string | null;
  studentsCount: number;
  updatedAt: string;
};

type StudentRecord = {
  id: string;
  name: string;
  className: string;
  completion: number;
  quizScore: number;
  weakArea: string;
  lastActive: string;
};

type ClassStudentForm = {
  classId: string;
  studentId: string;
};

export default function TeacherClasses() {
  const [classesState, setClassesState] = useState<TeacherClass[]>([]);
  const [studentsState, setStudentsState] = useState<StudentRecord[]>([]);
  const [isClassFormOpen, setIsClassFormOpen] = useState(false);
  const [isAddStudentFormOpen, setIsAddStudentFormOpen] = useState(false);
  const [newClass, setNewClass] = useState({ name: '', subject: '' });
  const [editingClass, setEditingClass] = useState<TeacherClass | null>(null);
  const [deletingClassId, setDeletingClassId] = useState<number | null>(null);
  const [classStudentForm, setClassStudentForm] = useState<ClassStudentForm>({ classId: '', studentId: '' });
  const [classFormError, setClassFormError] = useState('');
  const [classStudentFormError, setClassStudentFormError] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        const [classesRes, dashboardRes] = await Promise.all([
          fetch('/api/classes', { method: 'GET', credentials: 'include', headers: { Accept: 'application/json' } }),
          fetch('/api/teacher/dashboard', { method: 'GET', credentials: 'include', headers: { Accept: 'application/json' } }),
        ]);

        if (classesRes.ok) {
          const payload = (await classesRes.json()) as { classes?: TeacherClass[] };
          setClassesState(payload.classes ?? []);
        }

        if (dashboardRes.ok) {
          const payload = (await dashboardRes.json()) as { students?: StudentRecord[] };
          setStudentsState(payload.students ?? []);
        }
      } catch {
        // Keep empty state if unavailable.
      }
    };

    load();
  }, []);

  useEffect(() => {
    if (!isClassFormOpen) return undefined;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') setIsClassFormOpen(false); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isClassFormOpen]);

  useEffect(() => {
    if (!isAddStudentFormOpen) return undefined;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') setIsAddStudentFormOpen(false); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isAddStudentFormOpen]);

  const selectableStudents = useMemo(() => {
    const seen = new Set<number>();
    return studentsState
      .map((s) => ({ id: Number(String(s.id).replace(/[^0-9]/g, '')), name: s.name, className: s.className }))
      .filter((s) => { if (!s.id || seen.has(s.id)) return false; seen.add(s.id); return true; });
  }, [studentsState]);

  const refreshClasses = async () => {
    const res = await fetch('/api/classes', { method: 'GET', credentials: 'include', headers: { Accept: 'application/json' } });
    if (res.ok) {
      const payload = (await res.json()) as { classes?: TeacherClass[] };
      setClassesState(payload.classes ?? []);
    }
  };

  const createClass = async () => {
    if (!newClass.name || !newClass.subject) { setClassFormError('Class name and subject are required.'); return; }
    try {
      const formData = new FormData();
      formData.append('name', newClass.name);
      formData.append('subject', newClass.subject);
      await csrfFetch('/api/classes', { method: 'POST', headers: { Accept: 'application/json' }, body: formData });
      await refreshClasses();
      setNewClass({ name: '', subject: '' });
      setClassFormError('');
      setIsClassFormOpen(false);
    } catch {
      setClassFormError('Unable to create class right now.');
    }
  };

  const updateClass = async () => {
    if (!editingClass || !editingClass.name || !editingClass.subject) {
      setClassFormError('Class name and subject are required.');
      return;
    }
    try {
      const formData = new FormData();
      formData.append('name', editingClass.name);
      formData.append('subject', editingClass.subject);
      formData.append('_method', 'PUT');
      await csrfFetch(`/api/classes/${editingClass.id}`, {
        method: 'POST',
        headers: { Accept: 'application/json' },
        body: formData,
      });
      await refreshClasses();
      setEditingClass(null);
      setClassFormError('');
      setIsClassFormOpen(false);
    } catch {
      setClassFormError('Unable to update class right now.');
    }
  };

  const deleteClass = async () => {
    if (!deletingClassId) return;
    try {
      await csrfFetch(`/api/classes/${deletingClassId}`, {
        method: 'DELETE',
        headers: { Accept: 'application/json' },
      });
      await refreshClasses();
      setDeletingClassId(null);
    } catch {
      alert('Unable to delete class right now.');
    }
  };

  const openEditForm = (classItem: TeacherClass) => {
    setEditingClass(classItem);
    setClassFormError('');
    setIsClassFormOpen(true);
  };

  const openCreateForm = () => {
    setEditingClass(null);
    setNewClass({ name: '', subject: '' });
    setClassFormError('');
    setIsClassFormOpen(true);
  };

  const handleClassFormSubmit = () => {
    if (editingClass) {
      updateClass();
    } else {
      createClass();
    }
  };

  const closeClassForm = () => {
    setIsClassFormOpen(false);
    setEditingClass(null);
    setNewClass({ name: '', subject: '' });
  };

  const addStudentToClass = async () => {
    const classId = Number(classStudentForm.classId);
    const studentId = Number(String(classStudentForm.studentId).replace(/[^0-9]/g, ''));
    if (!classId || !studentId) { setClassStudentFormError('Class and student are required.'); return; }
    try {
      const formData = new FormData();
      formData.append('studentId', String(studentId));
      const res = await csrfFetch(`/api/classes/${classId}/students`, { method: 'POST', headers: { Accept: 'application/json' }, body: formData });
      if (!res.ok) { setClassStudentFormError('Unable to add student right now.'); return; }
      await refreshClasses();
      setClassStudentFormError('');
      setIsAddStudentFormOpen(false);
      setClassStudentForm((c) => ({ ...c, studentId: '' }));
    } catch {
      setClassStudentFormError('Unable to add student right now.');
    }
  };

  return (
    <TeacherLayout>
      {() => (
        <div className="td-classes-container">
          <div className="td-classes-header">
            <div>
              <h1 className="td-classes-title">Classes</h1>
              <p className="td-classes-subtitle">Manage your classes and students</p>
            </div>
            <div className="td-classes-actions">
              <button 
                className="td-create-class-btn" 
                type="button" 
                onClick={() => { setClassStudentFormError(''); setIsAddStudentFormOpen(true); }}
              >
                <Users size={16} />
                Add Student
              </button>
              <button 
                className="td-create-class-btn td-create-class-btn-primary" 
                type="button" 
                onClick={openCreateForm}
              >
                <Plus size={16} />
                Create Class
              </button>
            </div>
          </div>

          <section className="td-classes-content">
            <div className="td-table-card">
              {classesState.length === 0 ? (
                <p className="td-empty-state">No classes yet. Create your first class to get started.</p>
              ) : (
                <table className="td-table">
                  <thead>
                    <tr>
                      <th>Class</th>
                      <th>Subject</th>
                      <th>Students</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {classesState.map((item) => (
                      <tr key={item.id}>
                        <td>{item.name}</td>
                        <td>{item.subject}</td>
                        <td>{item.studentsCount}</td>
                        <td>
                          <div className="td-table-actions">
                            <button
                              className="td-action-btn td-action-btn-edit"
                              type="button"
                              onClick={() => openEditForm(item)}
                              aria-label="Edit class"
                            >
                              <Pencil size={16} />
                            </button>
                            <button
                              className="td-action-btn td-action-btn-delete"
                              type="button"
                              onClick={() => setDeletingClassId(item.id)}
                              aria-label="Delete class"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </section>

          {isAddStudentFormOpen && (
            <div className="td-badge-overlay" role="presentation" onClick={() => setIsAddStudentFormOpen(false)}>
              <div className="td-badge-frame" role="dialog" aria-modal="true" aria-labelledby="add-student-form-title" onClick={(e) => e.stopPropagation()}>
                <section className="td-badge-modal">
                  <div className="td-badge-modal-head">
                    <div>
                      <h2 id="add-student-form-title">Add Student to Class</h2>
                      <p>Use floating form data to assign a student to a class.</p>
                    </div>
                    <button className="tcc-inline-icon" type="button" aria-label="Close" onClick={() => setIsAddStudentFormOpen(false)}>
                      <X size={16} />
                    </button>
                  </div>
                  <div className="tcc-meta-grid td-badge-form-grid td-material-form-grid">
                    <label>
                      Class
                      <select value={classStudentForm.classId} onChange={(e) => setClassStudentForm((c) => ({ ...c, classId: e.target.value }))}>
                        <option value="">Select class</option>
                        {classesState.map((item) => (
                          <option key={item.id} value={item.id}>{item.name}</option>
                        ))}
                      </select>
                    </label>
                    <label>
                      Student
                      <select value={classStudentForm.studentId} onChange={(e) => setClassStudentForm((c) => ({ ...c, studentId: e.target.value }))}>
                        <option value="">Select student</option>
                        {selectableStudents.map((s) => (
                          <option key={s.id} value={s.id}>{s.name} ({s.className})</option>
                        ))}
                      </select>
                    </label>
                  </div>
                  {classStudentFormError ? <p className="td-material-form-error">{classStudentFormError}</p> : null}
                  <div className="td-badge-modal-actions">
                    <button className="td-inline-action td-badge-save-action" type="button" onClick={addStudentToClass}>Add Student</button>
                    <button className="tcc-chip-toggle" type="button" onClick={() => setIsAddStudentFormOpen(false)}>Cancel</button>
                  </div>
                </section>
              </div>
            </div>
          )}

          {isClassFormOpen && (
            <div className="td-badge-overlay" role="presentation" onClick={closeClassForm}>
              <div className="td-badge-frame" role="dialog" aria-modal="true" aria-labelledby="class-form-title" onClick={(e) => e.stopPropagation()}>
                <section className="td-badge-modal">
                  <div className="td-badge-modal-head">
                    <div>
                      <h2 id="class-form-title">{editingClass ? 'Edit Class' : 'Create Class'}</h2>
                      <p>Use floating form data to {editingClass ? 'update' : 'create'} a class.</p>
                    </div>
                    <button className="tcc-inline-icon" type="button" aria-label="Close" onClick={closeClassForm}>
                      <X size={16} />
                    </button>
                  </div>
                  <div className="tcc-meta-grid td-badge-form-grid td-material-form-grid">
                    <label>
                      Class Name
                      <input
                        value={editingClass ? editingClass.name : newClass.name}
                        onChange={(e) => {
                          if (editingClass) {
                            setEditingClass({ ...editingClass, name: e.target.value });
                          } else {
                            setNewClass((c) => ({ ...c, name: e.target.value }));
                          }
                        }}
                        type="text"
                      />
                    </label>
                    <label>
                      Subject
                      <input
                        value={editingClass ? editingClass.subject : newClass.subject}
                        onChange={(e) => {
                          if (editingClass) {
                            setEditingClass({ ...editingClass, subject: e.target.value });
                          } else {
                            setNewClass((c) => ({ ...c, subject: e.target.value }));
                          }
                        }}
                        type="text"
                      />
                    </label>
                  </div>
                  {classFormError ? <p className="td-material-form-error">{classFormError}</p> : null}
                  <div className="td-badge-modal-actions">
                    <button className="td-inline-action td-badge-save-action" type="button" onClick={handleClassFormSubmit}>
                      {editingClass ? 'Update Class' : 'Create Class'}
                    </button>
                    <button className="tcc-chip-toggle" type="button" onClick={closeClassForm}>Cancel</button>
                  </div>
                </section>
              </div>
            </div>
          )}

          {deletingClassId !== null && (
            <div className="td-badge-overlay" role="presentation" onClick={() => setDeletingClassId(null)}>
              <div className="td-badge-frame" role="dialog" aria-modal="true" aria-labelledby="delete-confirm-title" onClick={(e) => e.stopPropagation()}>
                <section className="td-badge-modal">
                  <div className="td-badge-modal-head">
                    <div>
                      <h2 id="delete-confirm-title">Delete Class</h2>
                      <p>Are you sure you want to delete this class? This action cannot be undone.</p>
                    </div>
                    <button className="tcc-inline-icon" type="button" aria-label="Close" onClick={() => setDeletingClassId(null)}>
                      <X size={16} />
                    </button>
                  </div>
                  <div className="td-badge-modal-actions">
                    <button className="td-inline-action td-badge-delete-action" type="button" onClick={deleteClass}>
                      Delete Class
                    </button>
                    <button className="tcc-chip-toggle" type="button" onClick={() => setDeletingClassId(null)}>Cancel</button>
                  </div>
                </section>
              </div>
            </div>
          )}
        </div>
      )}
    </TeacherLayout>
  );
}

