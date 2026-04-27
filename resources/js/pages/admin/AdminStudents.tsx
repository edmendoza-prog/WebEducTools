import React, { useState, useEffect } from 'react';
import AdminLayout from '../../components/ui/AdminLayout';
import { csrfFetch } from '../../lib/csrf';
import { Search, Plus, Edit, Trash2, X, CheckCircle, AlertCircle, Users } from 'lucide-react';

type Student = {
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

export default function AdminStudents() {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [formData, setFormData] = useState<FormData>({ name: '', email: '', password: '' });
  const [formError, setFormError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const itemsPerPage = 10;

  useEffect(() => {
    fetchStudents();
  }, [currentPage, searchQuery]);

  const fetchStudents = async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `/api/admin/students?page=${currentPage}&per_page=${itemsPerPage}&search=${encodeURIComponent(searchQuery)}`,
        {
          credentials: 'include',
          headers: { Accept: 'application/json' },
        }
      );
      if (response.ok) {
        const data = await response.json();
        setStudents(data.students || []);
        setTotalPages(Math.ceil((data.total || 0) / itemsPerPage));
      }
    } catch (error) {
      console.error('Failed to fetch students:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateStudent = () => {
    setEditingStudent(null);
    setFormData({ name: '', email: '', password: '' });
    setFormError('');
    setIsModalOpen(true);
  };

  const handleEditStudent = (student: Student) => {
    setEditingStudent(student);
    setFormData({ name: student.name, email: student.email, password: '' });
    setFormError('');
    setIsModalOpen(true);
  };

  const handleDeleteStudent = async (studentId: number) => {
    if (!confirm('Are you sure you want to delete this student?')) return;

    try {
      const response = await csrfFetch(`/api/admin/users/${studentId}`, {
        method: 'DELETE',
        headers: { Accept: 'application/json' },
      });

      if (response.ok) {
        setSuccessMessage('Student deleted successfully');
        setTimeout(() => setSuccessMessage(''), 3000);
        fetchStudents();
      } else {
        const data = await response.json();
        alert(data.message || 'Failed to delete student');
      }
    } catch (error) {
      console.error('Delete failed:', error);
      alert('Failed to delete student');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!formData.name || !formData.email) {
      setFormError('Name and email are required');
      return;
    }

    if (!editingStudent && !formData.password) {
      setFormError('Password is required for new students');
      return;
    }

    try {
      const url = editingStudent ? `/api/admin/users/${editingStudent.id}` : '/api/admin/users';
      const method = editingStudent ? 'PUT' : 'POST';
      const body: any = {
        name: formData.name,
        email: formData.email,
        role: 'student',
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
        setSuccessMessage(editingStudent ? 'Student updated successfully' : 'Student created successfully');
        setTimeout(() => setSuccessMessage(''), 3000);
        setIsModalOpen(false);
        fetchStudents();
      } else {
        const data = await response.json();
        setFormError(data.message || 'Failed to save student');
      }
    } catch (error) {
      console.error('Submit failed:', error);
      setFormError('Failed to save student');
    }
  };

  const filteredStudents = students;

  return (
    <AdminLayout>
      <div className="admin-page-container">
        <div className="admin-page-header">
          <div className="admin-page-title">
            <Users size={24} />
            <h1>Student Management</h1>
          </div>
          <button className="admin-btn-primary" onClick={handleCreateStudent}>
            <Plus size={18} />
            Add Student
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
            placeholder="Search students by name or email..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
          />
        </div>

        {loading ? (
          <div className="admin-loading">Loading students...</div>
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
                  {filteredStudents.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="admin-table-empty">
                        No students found
                      </td>
                    </tr>
                  ) : (
                    filteredStudents.map((student) => (
                      <tr key={student.id}>
                        <td>{student.id}</td>
                        <td>{student.name}</td>
                        <td>{student.email}</td>
                        <td>{new Date(student.created_at).toLocaleDateString()}</td>
                        <td className="admin-table-actions">
                          <button
                            className="admin-btn-icon admin-btn-edit"
                            onClick={() => handleEditStudent(student)}
                            title="Edit student"
                          >
                            <Edit size={16} />
                          </button>
                          <button
                            className="admin-btn-icon admin-btn-delete"
                            onClick={() => handleDeleteStudent(student.id)}
                            title="Delete student"
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
                <h2>{editingStudent ? 'Edit Student' : 'Add New Student'}</h2>
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
                  <label htmlFor="student-name">Name</label>
                  <input
                    id="student-name"
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Enter student name"
                    required
                  />
                </div>

                <div className="admin-form-group">
                  <label htmlFor="student-email">Email</label>
                  <input
                    id="student-email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="Enter student email"
                    required
                  />
                </div>

                <div className="admin-form-group">
                  <label htmlFor="student-password">
                    Password {editingStudent && '(leave blank to keep unchanged)'}
                  </label>
                  <input
                    id="student-password"
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    placeholder={editingStudent ? 'Enter new password' : 'Enter password'}
                    required={!editingStudent}
                  />
                </div>

                <div className="admin-modal-actions">
                  <button type="button" className="admin-btn-secondary" onClick={() => setIsModalOpen(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="admin-btn-primary">
                    {editingStudent ? 'Update' : 'Create'} Student
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
