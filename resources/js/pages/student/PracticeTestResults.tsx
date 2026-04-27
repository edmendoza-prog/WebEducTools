import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import StudentLayout from '../../components/ui/StudentLayout';
import { ArrowLeft, Award, CheckCircle, XCircle, FileText } from 'lucide-react';

type QuestionResult = {
  id: number;
  type: 'multiple_choice' | 'true_false' | 'identification';
  questionText: string;
  options?: string[];
  studentAnswer: string | null;
  correctAnswer: string;
  isCorrect: boolean;
  points: number;
  earnedPoints: number;
};

type TestResult = {
  testId: number;
  testTitle: string;
  subject: string;
  totalQuestions: number;
  correctAnswers: number;
  totalPoints: number;
  earnedPoints: number;
  scorePercentage: number;
  completedAt: string;
  questions: QuestionResult[];
};

export default function PracticeTestResults() {
  const { testId } = useParams<{ testId: string }>();
  const navigate = useNavigate();
  const [results, setResults] = useState<TestResult | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadResults();
  }, [testId]);

  const loadResults = async () => {
    try {
      const response = await fetch(`/api/student/practice-tests/${testId}/results`, {
        method: 'GET',
        credentials: 'include',
        headers: { Accept: 'application/json' },
      });

      if (response.ok) {
        const data = await response.json();
        setResults(data);
      } else {
        navigate('/student-dashboard/practice-tests');
      }
    } catch (error) {
      console.error('Failed to load results:', error);
      navigate('/student-dashboard/practice-tests');
    } finally {
      setLoading(false);
    }
  };

  const getAnswerDisplay = (question: QuestionResult): { student: string; correct: string } => {
    if (question.type === 'multiple_choice' && question.options) {
      const studentIndex = parseInt(question.studentAnswer || '-1');
      const correctIndex = parseInt(question.correctAnswer);
      return {
        student: studentIndex >= 0 ? question.options[studentIndex] : 'No answer',
        correct: question.options[correctIndex],
      };
    } else if (question.type === 'true_false') {
      return {
        student: question.studentAnswer === 'true' ? 'True' : question.studentAnswer === 'false' ? 'False' : 'No answer',
        correct: question.correctAnswer === 'true' ? 'True' : 'False',
      };
    } else {
      return {
        student: question.studentAnswer || 'No answer',
        correct: question.correctAnswer,
      };
    }
  };

  if (loading) {
    return (
      <StudentLayout>
        <div className="sp-loading">Loading results...</div>
      </StudentLayout>
    );
  }

  if (!results) {
    return (
      <StudentLayout>
        <div className="sp-empty-state">
          <FileText size={48} style={{ color: '#cbd5e1' }} />
          <h3>Results not found</h3>
          <button className="sp-btn-back" onClick={() => navigate('/student-dashboard/practice-tests')}>
            Back to Practice Tests
          </button>
        </div>
      </StudentLayout>
    );
  }

  const isPassing = results.scorePercentage >= 75;

  return (
    <StudentLayout>
      <div className="sp-results-container">
        {/* Header */}
        <div className="sp-results-header">
          <button className="sp-back-link" onClick={() => navigate('/student-dashboard/practice-tests')}>
            <ArrowLeft size={18} />
            Back to Practice Tests
          </button>
          <h1 className="sp-page-title">Test Results</h1>
        </div>

        {/* Score Card */}
        <div className={`sp-score-card ${isPassing ? 'passing' : 'needs-improvement'}`}>
          <div className="sp-score-icon">
            <Award size={48} />
          </div>
          <div className="sp-score-content">
            <h2>{results.testTitle}</h2>
            <p className="sp-score-subject">{results.subject}</p>
            <div className="sp-score-display-large">
              <span className="sp-score-value">{results.scorePercentage}%</span>
              <span className="sp-score-label">{isPassing ? 'Passed!' : 'Keep Practicing'}</span>
            </div>
            <div className="sp-score-stats">
              <div className="sp-stat">
                <span className="sp-stat-value">{results.correctAnswers}</span>
                <span className="sp-stat-label">Correct</span>
              </div>
              <div className="sp-stat">
                <span className="sp-stat-value">{results.totalQuestions - results.correctAnswers}</span>
                <span className="sp-stat-label">Incorrect</span>
              </div>
              <div className="sp-stat">
                <span className="sp-stat-value">{results.earnedPoints}/{results.totalPoints}</span>
                <span className="sp-stat-label">Points</span>
              </div>
            </div>
          </div>
        </div>

        {/* Question Review */}
        <div className="sp-review-section">
          <h3 className="sp-review-title">Review Your Answers</h3>
          <div className="sp-questions-review">
            {results.questions.map((question, index) => {
              const answers = getAnswerDisplay(question);
              return (
                <div key={question.id} className={`sp-review-card ${question.isCorrect ? 'correct' : 'incorrect'}`}>
                  <div className="sp-review-header">
                    <div className="sp-review-number">
                      {question.isCorrect ? (
                        <CheckCircle size={20} style={{ color: '#10b981' }} />
                      ) : (
                        <XCircle size={20} style={{ color: '#ef4444' }} />
                      )}
                      <span>Question {index + 1}</span>
                    </div>
                    <span className="sp-review-points">
                      {question.earnedPoints}/{question.points} pts
                    </span>
                  </div>

                  <p className="sp-review-question">{question.questionText}</p>

                  <div className="sp-review-answers">
                    <div className={`sp-answer-box ${question.isCorrect ? '' : 'wrong'}`}>
                      <span className="sp-answer-label">Your Answer:</span>
                      <span className="sp-answer-value">{answers.student}</span>
                    </div>
                    {!question.isCorrect && (
                      <div className="sp-answer-box correct">
                        <span className="sp-answer-label">Correct Answer:</span>
                        <span className="sp-answer-value">{answers.correct}</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </StudentLayout>
  );
}
