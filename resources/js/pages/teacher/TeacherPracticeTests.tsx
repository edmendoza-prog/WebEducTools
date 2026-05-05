import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import TeacherLayout from '../../components/ui/TeacherLayout';
import { csrfFetch } from '../../lib/csrf';
import { ClipboardCheck, Plus, Edit2, Trash2, Eye, X } from 'lucide-react';

type PracticeTest = {
  id: number;
  title: string;
  subject: string;
  className: string;
  questions: number;
  duration: number;
  updatedAt: string;
};

type Question = {
  id: string;
  type: 'multiple_choice' | 'true_false' | 'identification';
  question: string;
  options?: string[];
  correctAnswer: number | boolean | string;
  points: number;
};

type TestDetails = {
  id: number;
  title: string;
  subject: string;
  className: string;
  duration: number;
  instructions: string;
  questions: Question[];
};

export default function TeacherPracticeTests() {
  const navigate = useNavigate();
  const [practiceTests, setPracticeTests] = useState<PracticeTest[]>([]);
  const [viewingTest, setViewingTest] = useState<TestDetails | null>(null);
  const [deletingTestId, setDeletingTestId] = useState<number | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const response = await fetch('/api/teacher/practice-tests', {
          method: 'GET',
          credentials: 'include',
          headers: { Accept: 'application/json' },
        });

        if (response.ok) {
          const payload = (await response.json()) as { practiceTests?: PracticeTest[] };
          setPracticeTests(payload.practiceTests ?? []);
        }
      } catch {
        // Keep empty state if unavailable.
      }
    };

    load();
  }, []);

  const handleViewTest = async (testId: number) => {
    try {
      const response = await csrfFetch(`/api/teacher/practice-tests/${testId}`);
      if (response.ok) {
        const data = await response.json();
        setViewingTest(data.test);
      }
    } catch (error) {
      console.error('Failed to load test details:', error);
    }
  };

  const handleEditTest = (testId: number) => {
    navigate(`/teacher-dashboard/practice-tests/edit/${testId}`);
  };

  const handleDeleteTest = async (testId: number) => {
    setDeletingTestId(testId);
  };

  const confirmDelete = async () => {
    if (!deletingTestId) return;

    setIsDeleting(true);
    try {
      const response = await csrfFetch(`/api/teacher/practice-tests/${deletingTestId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setPracticeTests((prev) => prev.filter((test) => test.id !== deletingTestId));
        setDeletingTestId(null);
      }
    } catch (error) {
      console.error('Failed to delete test:', error);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <TeacherLayout>
      {() => (
        <div className="td-modern-dashboard">
          <div className="td-welcome-header">
            <div>
              <h1 className="td-page-title">Tests</h1>
              <p className="td-page-subtitle">Create and manage assessments for your students</p>
            </div>
            <button
              className="td-btn-primary"
              onClick={() => navigate('/teacher-dashboard/practice-tests/create')}
            >
              <Plus size={18} />
              Create Test
            </button>
          </div>

          <div className="td-modern-card">
            <div className="td-card-body" style={{ padding: 0 }}>
              {practiceTests.length === 0 ? (
                <div className="td-empty-state">
                  <div className="td-empty-icon">
                    <ClipboardCheck size={48} />
                  </div>
                  <h3>No tests yet</h3>
                  <p>Create your first test to get started</p>
                  <button
                    className="td-btn-primary"
                    onClick={() => navigate('/teacher-dashboard/practice-tests/create')}
                    style={{ marginTop: '1rem' }}
                  >
                    <Plus size={18} />
                    Create Test
                  </button>
                </div>
              ) : (
                <table className="td-table">
                  <thead>
                    <tr>
                      <th>Test Title</th>
                      <th>Subject</th>
                      <th>Class</th>
                      <th>Questions</th>
                      <th>Duration</th>
                      <th>Last Updated</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {practiceTests.map((test) => (
                      <tr key={test.id}>
                        <td>
                          <span className="td-test-title">{test.title}</span>
                        </td>
                        <td>
                          <span className="td-badge">{test.subject}</span>
                        </td>
                        <td>{test.className || '-'}</td>
                        <td>{test.questions}</td>
                        <td>{test.duration} min</td>
                        <td>
                          <span className="td-last-active">{test.updatedAt}</span>
                        </td>
                        <td>
                          <div className="td-table-actions">
                            <button
                              className="td-action-btn"
                              title="View"
                              onClick={() => handleViewTest(test.id)}
                            >
                              <Eye size={16} />
                            </button>
                            <button
                              className="td-action-btn td-action-btn-edit"
                              title="Edit"
                              onClick={() => handleEditTest(test.id)}
                            >
                              <Edit2 size={16} />
                            </button>
                            <button
                              className="td-action-btn td-action-btn-delete"
                              title="Delete"
                              onClick={() => handleDeleteTest(test.id)}
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
          </div>

          {/* View Test Modal */}
          {viewingTest && (
            <div className="td-modal-overlay" onClick={() => setViewingTest(null)}>
              <div className="td-modal-content" onClick={(e) => e.stopPropagation()}>
                <div className="td-modal-header">
                  <h2>{viewingTest.title}</h2>
                  <button className="td-modal-close" onClick={() => setViewingTest(null)}>
                    <X size={20} />
                  </button>
                </div>
                <div className="td-modal-body">
                  <div style={{ marginBottom: '1.5rem' }}>
                    <p><strong>Subject:</strong> {viewingTest.subject}</p>
                    <p><strong>Class:</strong> {viewingTest.className || 'N/A'}</p>
                    <p><strong>Duration:</strong> {viewingTest.duration} minutes</p>
                    <p><strong>Total Questions:</strong> {viewingTest.questions.length}</p>
                    {viewingTest.instructions && (
                      <p><strong>Instructions:</strong> {viewingTest.instructions}</p>
                    )}
                  </div>

                  <h3 style={{ marginBottom: '1rem' }}>Questions</h3>
                  <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
                    {viewingTest.questions.map((q, index) => (
                      <div key={q.id} style={{ marginBottom: '1.5rem', padding: '1rem', background: '#f9fafb', borderRadius: '0.5rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                          <strong>Question {index + 1}</strong>
                          <span className="td-badge">{q.type.replace('_', ' ')}</span>
                        </div>
                        <p style={{ marginBottom: '0.5rem' }}>{q.question}</p>
                        
                        {q.type === 'multiple_choice' && q.options && (
                          <div style={{ marginLeft: '1rem' }}>
                            {q.options.map((opt, i) => (
                              <div key={i} style={{ 
                                padding: '0.25rem',
                                fontWeight: i === q.correctAnswer ? 'bold' : 'normal',
                                color: i === q.correctAnswer ? '#10b981' : 'inherit'
                              }}>
                                {String.fromCharCode(65 + i)}. {opt}
                                {i === q.correctAnswer && ' ✓'}
                              </div>
                            ))}
                          </div>
                        )}
                        
                        {q.type === 'true_false' && (
                          <div style={{ marginLeft: '1rem', color: '#10b981', fontWeight: 'bold' }}>
                            Correct Answer: {q.correctAnswer ? 'True' : 'False'}
                          </div>
                        )}
                        
                        {q.type === 'identification' && (
                          <div style={{ marginLeft: '1rem', color: '#10b981', fontWeight: 'bold' }}>
                            Correct Answer: {q.correctAnswer}
                          </div>
                        )}
                        
                        <div style={{ marginTop: '0.5rem', fontSize: '0.875rem', color: '#6b7280' }}>
                          Points: {q.points}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="td-modal-footer">
                  <button className="td-btn-secondary" onClick={() => setViewingTest(null)}>
                    Close
                  </button>
                  <button 
                    className="td-btn-primary" 
                    onClick={() => {
                      setViewingTest(null);
                      handleEditTest(viewingTest.id);
                    }}
                  >
                    Edit Test
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Delete Confirmation Modal */}
          {deletingTestId && (
            <div className="td-modal-overlay" onClick={() => !isDeleting && setDeletingTestId(null)}>
              <div className="td-modal-content td-modal-sm" onClick={(e) => e.stopPropagation()}>
                <div className="td-modal-header">
                  <h2>Delete Test</h2>
                  <button className="td-modal-close" onClick={() => setDeletingTestId(null)} disabled={isDeleting}>
                    <X size={20} />
                  </button>
                </div>
                <div className="td-modal-body">
                  <p>Are you sure you want to delete this test? This action cannot be undone.</p>
                </div>
                <div className="td-modal-footer">
                  <button 
                    className="td-btn-secondary" 
                    onClick={() => setDeletingTestId(null)}
                    disabled={isDeleting}
                  >
                    Cancel
                  </button>
                  <button 
                    className="td-btn-danger" 
                    onClick={confirmDelete}
                    disabled={isDeleting}
                  >
                    {isDeleting ? 'Deleting...' : 'Delete'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </TeacherLayout>
  );
}
