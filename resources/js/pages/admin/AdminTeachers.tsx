import React, { useState, useEffect } from 'react';
import AdminLayout from '../../components/ui/AdminLayout';
import { csrfFetch } from '../../lib/csrf';
import { Search, Plus, Edit, Trash2, X, CheckCircle, AlertCircle, GraduationCap } from 'lucide-react';

type Teacher = {
  id: number;
  name: string;
  email: string;
  created_at: string;
};

type FormData = {
  name: string;
  email: string;
  password: string;
};

export default function AdminTeachers() {
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTeacher, setEditingTeacher] = useState<Teacher | null>(null);
  const [formData, setFormData] = useState<FormData>({ name: '', email: '', password: '' });
  const [formError, setFormError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const itemsPerPage = 10;

  useEffect(() => {
    fetchTeachers();
  }, [currentPage, searchQuery]);

  const fetchTeachers = async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `/api/admin/teachers?page=${currentPage}&per_page=${itemsPerPage}&search=${encodeURIComponent(searchQuery)}`,
        {
          credentials: 'include',
          headers: { Accept: 'application/json' },
        }
      );
      if (response.ok) {
        const data = await response.json();
        setTeachers(data.teachers || []);
        setTotalPages(Math.ceil((data.total || 0) / itemsPerPage));
      }
    } catch (error) {
      console.error('Failed to fetch teachers:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTeacher = () => {
    setEditingTeacher(null);
    setFormData({ name: '', email: '', password: '' });
    setFormError('');
    setIsModalOpen(true);
  };

  const handleEditTeacher = (teacher: Teacher) => {
    setEditingTeacher(teacher);
    setFormData({ name: teacher.name, email: teacher.email, password: '' });
    setFormError('');
    setIsModalOpen(true);
  };

  const handleDeleteTeacher = async (teacherId: number) => {
    if (!confirm('Are you sure you want to delete this teacher?')) return;

    try {
      const response = await csrfFetch(`/api/admin/users/${teacherId}`, {
        method: 'DELETE',
        headers: { Accept: 'application/json' },
      });

      if (response.ok) {
        setSuccessMessage('Teacher deleted successfully');
        setTimeout(() => setSuccessMessage(''), 3000);
        fetchTeachers();
      } else {
        const data = await response.json();
        alert(data.message || 'Failed to delete teacher');
      }
    } catch (error) {
      console.error('Delete failed:', error);
      alert('Failed to delete teacher');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!formData.name || !formData.email) {
      setFormError('Name and email are required');
      return;
    }

    if (!editingTeacher && !formData.password) {
      setFormError('Password is required for new teachers');
      return;
    }

    try {
      const url = editingTeacher ? `/api/admin/users/${editingTeacher.id}` : '/api/admin/users';
      const method = editingTeacher ? 'PUT' : 'POST';
      const body: any = {
        name: formData.name,
        email: formData.email,
        role: 'teacher',
      };

      if (formData.password) {
        body.password = formData.password;
      }

      const response = await csrfFetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify(body),
      });

      if (response.ok) {
        setSuccessMessage(editingTeacher ? 'Teacher updated successfully' : 'Teacher created successfully');
        setTimeout(() => setSuccessMessage(''), 3000);
        setIsModalOpen(false);
        fetchTeachers();
      } else {
        const data = await response.json();
        setFormError(data.message || 'Failed to save teacher');
      }
    } catch (error) {
      console.error('Submit failed:', error);
      setFormError('Failed to save teacher');
    }
  };

  const filteredTeachers = teachers;

  return (
    <AdminLayout>
      <div className="admin-page-container">
        <div className="admin-page-header">
          <div className="admin-page-title">
            <GraduationCap size={24} />
            <h1>Teacher Management</h1>
          </div>
          <button className="admin-btn-primary" onClick={handleCreateTeacher}>
            <Plus size={18} />
            Add Teacher
          </button>
        </div>

        {successMessage && (
          <div className="admin-alert admin-alert-success">
            <CheckCircle size={18} />
            {successMessage}
          </div>
        )}

        <div className="admin-search-bar">
          <Search size={18} />
          <input
            type="text"
            placeholder="Search teachers by name or email..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
          />
        </div>

        {loading ? (
          <div className="admin-loading">Loading teachers...</div>
        ) : (
          <>
            <div className="admin-table-container">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Created At</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTeachers.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="admin-table-empty">
                        No teachers found
                      </td>
                    </tr>
                  ) : (
                    filteredTeachers.map((teacher) => (
                      <tr key={teacher.id}>
                        <td>{teacher.id}</td>
                        <td>{teacher.name}</td>
                        <td>{teacher.email}</td>
                        <td>{new Date(teacher.created_at).toLocaleDateString()}</td>
                        <td className="admin-table-actions">
                          <button
                            className="admin-btn-icon admin-btn-edit"
                            onClick={() => handleEditTeacher(teacher)}
                            title="Edit teacher"
                          >
                            <Edit size={16} />
                          </button>
                          <button
                            className="admin-btn-icon admin-btn-delete"
                            onClick={() => handleDeleteTeacher(teacher.id)}
                            title="Delete teacher"
                          >
                            <Trash2 size={16} />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {totalPages > 1 && (
              <div className="admin-pagination">
                <button
                  className="admin-pagination-btn"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(currentPage - 1)}
                >
                  Previous
                </button>
                <span className="admin-pagination-info">
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  className="admin-pagination-btn"
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage(currentPage + 1)}
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}

        {isModalOpen && (
          <div className="admin-modal-overlay" onClick={() => setIsModalOpen(false)}>
            <div className="admin-modal" onClick={(e) => e.stopPropagation()}>
              <div className="admin-modal-header">
                <h2>{editingTeacher ? 'Edit Teacher' : 'Add New Teacher'}</h2>
                <button className="admin-modal-close" onClick={() => setIsModalOpen(false)}>
                  <X size={20} />
                </button>
              </div>

              {formError && (
                <div className="admin-alert admin-alert-error">
                  <AlertCircle size={18} />
                  {formError}
                </div>
              )}

              <form onSubmit={handleSubmit}>
                <div className="admin-form-group">
                  <label htmlFor="teacher-name">Name</label>
                  <input
                    id="teacher-name"
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Enter teacher name"
                    required
                  />
                </div>

                <div className="admin-form-group">
                  <label htmlFor="teacher-email">Email</label>
                  <input
                    id="teacher-email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="Enter teacher email"
                    required
                  />
                </div>

                <div className="admin-form-group">
                  <label htmlFor="teacher-password">
                    Password {editingTeacher && '(leave blank to keep unchanged)'}
                  </label>
                  <input
                    id="teacher-password"
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    placeholder={editingTeacher ? 'Enter new password' : 'Enter password'}
                    required={!editingTeacher}
                  />
                </div>

                <div className="admin-modal-actions">
                  <button type="button" className="admin-btn-secondary" onClick={() => setIsModalOpen(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="admin-btn-primary">
                    {editingTeacher ? 'Update' : 'Create'} Teacher
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
