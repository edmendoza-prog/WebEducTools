import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import TeacherLayout from '../../components/ui/TeacherLayout';
import { csrfFetch } from '../../lib/csrf';
import { ClipboardCheck, Plus, Edit2, Trash2, Eye } from 'lucide-react';

type PracticeTest = {
  id: number;
  title: string;
  subject: string;
  className: string;
  questions: number;
  duration: number;
  updatedAt: string;
};

export default function TeacherPracticeTests() {
  const navigate = useNavigate();
  const [practiceTests, setPracticeTests] = useState<PracticeTest[]>([]);

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

  return (
    <TeacherLayout>
      {() => (
        <div className="td-modern-dashboard">
          <div className="td-welcome-header">
            <div>
              <h1 className="td-page-title">Practice Tests</h1>
              <p className="td-page-subtitle">Create and manage assessments for your students</p>
            </div>
            <button
              className="td-btn-primary"
              onClick={() => navigate('/teacher-dashboard/practice-tests/create')}
            >
              <Plus size={18} />
              Create Practice Test
            </button>
          </div>

          <div className="td-modern-card">
            <div className="td-card-body" style={{ padding: 0 }}>
              {practiceTests.length === 0 ? (
                <div className="td-empty-state">
                  <div className="td-empty-icon">
                    <ClipboardCheck size={48} />
                  </div>
                  <h3>No practice tests yet</h3>
                  <p>Create your first practice test to get started</p>
                  <button
                    className="td-btn-primary"
                    onClick={() => navigate('/teacher-dashboard/practice-tests/create')}
                    style={{ marginTop: '1rem' }}
                  >
                    <Plus size={18} />
                    Create Practice Test
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
                            <button className="td-action-btn" title="View">
                              <Eye size={16} />
                            </button>
                            <button className="td-action-btn td-action-btn-edit" title="Edit">
                              <Edit2 size={16} />
                            </button>
                            <button className="td-action-btn td-action-btn-delete" title="Delete">
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
        </div>
      )}
    </TeacherLayout>
  );
}
