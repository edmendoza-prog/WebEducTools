import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import StudentLayout from '../../components/ui/StudentLayout';
import { Clock, FileText, Award, ArrowRight, CheckCircle, XCircle } from 'lucide-react';

type PracticeTest = {
  id: number;
  title: string;
  subject: string;
  className: string;
  questions: number;
  duration: number;
  instructions: string | null;
  status: 'not_started' | 'completed';
  score?: number;
  completedAt?: string;
};

export default function StudentPracticeTest() {
  const navigate = useNavigate();
  const [practiceTests, setPracticeTests] = useState<PracticeTest[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'available' | 'completed'>('all');

  useEffect(() => {
    loadPracticeTests();
  }, []);

  const loadPracticeTests = async () => {
    try {
      const response = await fetch('/api/student/practice-tests', {
        method: 'GET',
        credentials: 'include',
        headers: { Accept: 'application/json' },
      });

      if (response.ok) {
        const data = await response.json();
        setPracticeTests(data.practiceTests || []);
      }
    } catch (error) {
      console.error('Failed to load practice tests:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredTests = practiceTests.filter((test) => {
    if (filter === 'available') return test.status === 'not_started';
    if (filter === 'completed') return test.status === 'completed';
    return true;
  });

  const handleStartTest = (testId: number) => {
    navigate(`/student-dashboard/practice-tests/${testId}/take`);
  };

  const handleViewResults = (testId: number) => {
    navigate(`/student-dashboard/practice-tests/${testId}/results`);
  };

  return (
    <StudentLayout>
      <div className="sp-practice-test-container">
        {/* Header */}
        <div className="sp-header">
          <div>
            <h1 className="sp-page-title">Practice Tests</h1>
            <p className="sp-page-subtitle">Complete practice tests to assess your knowledge</p>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="sp-filter-tabs">
          <button
            className={`sp-filter-tab ${filter === 'all' ? 'active' : ''}`}
            onClick={() => setFilter('all')}
          >
            All Tests
          </button>
          <button
            className={`sp-filter-tab ${filter === 'available' ? 'active' : ''}`}
            onClick={() => setFilter('available')}
          >
            Available
          </button>
          <button
            className={`sp-filter-tab ${filter === 'completed' ? 'active' : ''}`}
            onClick={() => setFilter('completed')}
          >
            Completed
          </button>
        </div>

        {/* Practice Tests Grid */}
        {loading ? (
          <div className="sp-loading">Loading practice tests...</div>
        ) : filteredTests.length === 0 ? (
          <div className="sp-empty-state">
            <FileText size={48} style={{ color: '#cbd5e1' }} />
            <h3>No practice tests {filter !== 'all' ? filter : 'available'}</h3>
            <p>Your teacher will assign practice tests here</p>
          </div>
        ) : (
          <div className="sp-tests-grid">
            {filteredTests.map((test) => (
              <div key={test.id} className={`sp-test-card ${test.status === 'completed' ? 'completed' : ''}`}>
                <div className="sp-test-header">
                  <div className="sp-test-badge">{test.subject}</div>
                  {test.status === 'completed' && (
                    <div className="sp-completed-badge">
                      <CheckCircle size={14} />
                      Completed
                    </div>
                  )}
                </div>

                <h3 className="sp-test-title">{test.title}</h3>
                
                {test.className && (
                  <p className="sp-test-class">{test.className}</p>
                )}

                <div className="sp-test-meta">
                  <div className="sp-meta-item">
                    <FileText size={16} />
                    <span>{test.questions} Questions</span>
                  </div>
                  <div className="sp-meta-item">
                    <Clock size={16} />
                    <span>{test.duration} Minutes</span>
                  </div>
                </div>

                {test.status === 'completed' && test.score !== undefined && (
                  <div className="sp-score-display">
                    <Award size={20} />
                    <span className="sp-score-value">Score: {test.score}%</span>
                  </div>
                )}

                {test.instructions && test.status === 'not_started' && (
                  <p className="sp-test-instructions">{test.instructions}</p>
                )}

                <div className="sp-test-actions">
                  {test.status === 'not_started' ? (
                    <button
                      className="sp-btn-start"
                      onClick={() => handleStartTest(test.id)}
                    >
                      Start Test
                      <ArrowRight size={16} />
                    </button>
                  ) : (
                    <button
                      className="sp-btn-view"
                      onClick={() => handleViewResults(test.id)}
                    >
                      View Results
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </StudentLayout>
  );
}

