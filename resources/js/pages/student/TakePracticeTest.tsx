import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import StudentLayout from '../../components/ui/StudentLayout';
import { csrfFetch } from '../../lib/csrf';
import { Clock, AlertCircle, CheckCircle, ArrowLeft, ArrowRight, Send } from 'lucide-react';

type Question = {
  id: number;
  type: 'multiple_choice' | 'true_false' | 'identification';
  questionText: string;
  options?: string[];
  points: number;
  orderNumber: number;
};

type PracticeTestData = {
  id: number;
  title: string;
  subject: string;
  duration: number;
  instructions: string | null;
  questions: Question[];
};

export default function TakePracticeTest() {
  const { testId } = useParams<{ testId: string }>();
  const navigate = useNavigate();

  const [testData, setTestData] = useState<PracticeTestData | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [timeLeft, setTimeLeft] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showConfirmSubmit, setShowConfirmSubmit] = useState(false);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    loadTestData();
  }, [testId]);

  useEffect(() => {
    if (timeLeft <= 0) return;

    timerRef.current = window.setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          handleAutoSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [timeLeft]);

  const loadTestData = async () => {
    try {
      const response = await fetch(`/api/student/practice-tests/${testId}`, {
        method: 'GET',
        credentials: 'include',
        headers: { Accept: 'application/json' },
      });

      if (response.ok) {
        const data = await response.json();
        setTestData(data);
        setTimeLeft(data.duration * 60); // Convert minutes to seconds
      } else {
        navigate('/student-dashboard/practice-tests');
      }
    } catch (error) {
      console.error('Failed to load test:', error);
      navigate('/student-dashboard/practice-tests');
    }
  };

  const handleAutoSubmit = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    submitTest();
  };

  const handleAnswerChange = (questionId: number, answer: string) => {
    setAnswers((prev) => ({ ...prev, [questionId]: answer }));
  };

  const handleSubmitClick = () => {
    const answeredCount = Object.keys(answers).length;
    const totalQuestions = testData?.questions.length || 0;
    
    if (answeredCount < totalQuestions) {
      setShowConfirmSubmit(true);
    } else {
      submitTest();
    }
  };

  const submitTest = async () => {
    if (!testData || isSubmitting) return;

    setIsSubmitting(true);

    try {
      const response = await csrfFetch(`/api/student/practice-tests/${testId}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answers }),
      });

      if (response.ok) {
        navigate(`/student-dashboard/practice-tests/${testId}/results`);
      } else {
        alert('Failed to submit test. Please try again.');
      }
    } catch (error) {
      console.error('Failed to submit test:', error);
      alert('Failed to submit test. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const goToQuestion = (index: number) => {
    setCurrentQuestionIndex(index);
  };

  const goToPrevious = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
    }
  };

  const goToNext = () => {
    if (testData && currentQuestionIndex < testData.questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    }
  };

  if (!testData) {
    return (
      <StudentLayout>
        <div className="sp-loading">Loading test...</div>
      </StudentLayout>
    );
  }

  const currentQuestion = testData.questions[currentQuestionIndex];
  const answeredCount = Object.keys(answers).length;
  const totalQuestions = testData.questions.length;
  const isLastQuestion = currentQuestionIndex === totalQuestions - 1;

  return (
    <StudentLayout>
      <div className="sp-take-test-container">
        {/* Timer Header */}
        <div className="sp-test-timer-bar">
          <div className="sp-timer-info">
            <Clock size={20} />
            <span className={`sp-timer-display ${timeLeft < 300 ? 'warning' : ''}`}>
              {formatTime(timeLeft)}
            </span>
          </div>
          <div className="sp-test-info">
            <h2>{testData.title}</h2>
            <span>{testData.subject}</span>
          </div>
          <div className="sp-progress-info">
            Question {currentQuestionIndex + 1} of {totalQuestions}
          </div>
        </div>

        <div className="sp-test-layout">
          {/* Main Question Area */}
          <div className="sp-question-area">
            <div className="sp-question-card">
              <div className="sp-question-header">
                <span className="sp-question-number">Question {currentQuestionIndex + 1}</span>
                <span className="sp-question-points">{currentQuestion.points} point{currentQuestion.points > 1 ? 's' : ''}</span>
              </div>

              <p className="sp-question-text">{currentQuestion.questionText}</p>

              <div className="sp-answer-section">
                {currentQuestion.type === 'multiple_choice' && currentQuestion.options && (
                  <div className="sp-options-list">
                    {currentQuestion.options.map((option, index) => (
                      <label key={index} className="sp-option-item">
                        <input
                          type="radio"
                          name={`question-${currentQuestion.id}`}
                          value={String(index)}
                          checked={answers[currentQuestion.id] === String(index)}
                          onChange={(e) => handleAnswerChange(currentQuestion.id, e.target.value)}
                        />
                        <span className="sp-option-text">{option}</span>
                      </label>
                    ))}
                  </div>
                )}

                {currentQuestion.type === 'true_false' && (
                  <div className="sp-true-false-options">
                    <label className="sp-option-item">
                      <input
                        type="radio"
                        name={`question-${currentQuestion.id}`}
                        value="true"
                        checked={answers[currentQuestion.id] === 'true'}
                        onChange={(e) => handleAnswerChange(currentQuestion.id, e.target.value)}
                      />
                      <span className="sp-option-text">True</span>
                    </label>
                    <label className="sp-option-item">
                      <input
                        type="radio"
                        name={`question-${currentQuestion.id}`}
                        value="false"
                        checked={answers[currentQuestion.id] === 'false'}
                        onChange={(e) => handleAnswerChange(currentQuestion.id, e.target.value)}
                      />
                      <span className="sp-option-text">False</span>
                    </label>
                  </div>
                )}

                {currentQuestion.type === 'identification' && (
                  <input
                    type="text"
                    className="sp-identification-input"
                    placeholder="Type your answer here..."
                    value={answers[currentQuestion.id] || ''}
                    onChange={(e) => handleAnswerChange(currentQuestion.id, e.target.value)}
                  />
                )}
              </div>

              {/* Navigation */}
              <div className="sp-question-nav">
                <button
                  className="sp-nav-btn"
                  onClick={goToPrevious}
                  disabled={currentQuestionIndex === 0}
                >
                  <ArrowLeft size={16} />
                  Previous
                </button>
                {!isLastQuestion ? (
                  <button className="sp-nav-btn sp-nav-btn-next" onClick={goToNext}>
                    Next
                    <ArrowRight size={16} />
                  </button>
                ) : (
                  <button className="sp-submit-btn" onClick={handleSubmitClick} disabled={isSubmitting}>
                    <Send size={16} />
                    {isSubmitting ? 'Submitting...' : 'Submit Test'}
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Sidebar - Question Navigator */}
          <div className="sp-question-sidebar">
            <div className="sp-sidebar-card">
              <h3 className="sp-sidebar-title">Questions</h3>
              <p className="sp-sidebar-subtitle">
                {answeredCount} of {totalQuestions} answered
              </p>

              <div className="sp-question-grid">
                {testData.questions.map((q, index) => (
                  <button
                    key={q.id}
                    className={`sp-question-bubble ${
                      index === currentQuestionIndex ? 'active' : ''
                    } ${answers[q.id] ? 'answered' : ''}`}
                    onClick={() => goToQuestion(index)}
                  >
                    {index + 1}
                    {answers[q.id] && <CheckCircle size={12} className="sp-check-icon" />}
                  </button>
                ))}
              </div>

              {testData.instructions && (
                <div className="sp-instructions-box">
                  <h4>Instructions</h4>
                  <p>{testData.instructions}</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Confirm Submit Modal */}
        {showConfirmSubmit && (
          <div className="sp-modal-overlay" onClick={() => setShowConfirmSubmit(false)}>
            <div className="sp-modal" onClick={(e) => e.stopPropagation()}>
              <div className="sp-modal-icon warning">
                <AlertCircle size={32} />
              </div>
              <h3>Submit Test?</h3>
              <p>
                You have answered {answeredCount} out of {totalQuestions} questions.
                <br />
                Are you sure you want to submit?
              </p>
              <div className="sp-modal-actions">
                <button className="sp-modal-btn sp-modal-btn-primary" onClick={submitTest}>
                  Yes, Submit
                </button>
                <button className="sp-modal-btn" onClick={() => setShowConfirmSubmit(false)}>
                  Continue Test
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </StudentLayout>
  );
}
