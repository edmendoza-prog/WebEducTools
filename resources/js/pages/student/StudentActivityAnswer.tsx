import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { csrfFetch } from '../../lib/csrf';
import { ArrowLeft, BookOpen, CheckCircle, ChevronLeft, ChevronRight, HelpCircle, RotateCcw, Star, Trophy } from 'lucide-react';

type FlashcardItem = {
  id: number;
  term: string;
  definition: string;
  imageUrl: string | null;
};

type QuizQuestionItem = {
  id: number;
  type: 'multiple_choice' | 'true_false' | 'identification';
  question: string;
  options: string[];
  correctAnswer: string;
};

type ActivityDetails = {
  id: number;
  title: string;
  description: string | null;
  subject: string | null;
  flashcardsCount: number;
  quizQuestionsCount: number;
};

type XpReward = {
  xp: number;
  level: number;
  title: string;
  xpToNextLevel: number;
  levelProgressPercent: number;
};

export default function StudentActivityAnswer() {
  const navigate = useNavigate();
  const { activityId } = useParams<{ activityId: string }>();
  const [activity, setActivity] = useState<ActivityDetails | null>(null);
  const [flashcards, setFlashcards] = useState<FlashcardItem[]>([]);
  const [quizQuestions, setQuizQuestions] = useState<QuizQuestionItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  // Flashcard mode state
  const [currentFlashcardIndex, setCurrentFlashcardIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [knownCards, setKnownCards] = useState<number[]>([]);

  // Quiz mode state
  const [mode, setMode] = useState<'overview' | 'flashcards' | 'quiz' | 'review'>('overview');
  const [currentQuizIndex, setCurrentQuizIndex] = useState(0);
  const [quizAnswers, setQuizAnswers] = useState<Record<number, string>>({});
  const [showResults, setShowResults] = useState(false);
  const [quizScore, setQuizScore] = useState(0);

  // Completion state
  const [hasCompleted, setHasCompleted] = useState(false);
  const [previousAnswers, setPreviousAnswers] = useState<Record<string, string> | null>(null);
  const [previousScore, setPreviousScore] = useState<number | null>(null);

  // Achievement state
  const [xpReward, setXpReward] = useState<XpReward | null>(null);
  const [showXpModal, setShowXpModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showFlashcardXpToast, setShowFlashcardXpToast] = useState(false);

  useEffect(() => {
    const fetchActivityDetails = async () => {
      try {
        setIsLoading(true);
        const response = await csrfFetch(`/api/student/activities/${activityId}`);
        if (response.ok) {
          const data = await response.json();
          setActivity(data.activity);
          setFlashcards(data.flashcards || []);
          setQuizQuestions(data.quizQuestions || []);
          setHasCompleted(data.hasCompleted || false);
          setPreviousAnswers(data.previousAnswers || null);
          setPreviousScore(data.previousScore || null);
          
          // If completed, set the quiz answers and show results
          if (data.hasCompleted && data.previousAnswers) {
            setQuizAnswers(data.previousAnswers);
            setQuizScore(data.previousScore || 0);
          }
        } else {
          setError('Failed to load activity');
        }
      } catch (err) {
        setError('An error occurred while loading the activity');
      } finally {
        setIsLoading(false);
      }
    };
    fetchActivityDetails();
  }, [activityId]);

  // Redirect to review if trying to access quiz mode when already completed
  useEffect(() => {
    if (hasCompleted && mode === 'quiz') {
      setMode('review');
    }
  }, [hasCompleted, mode]);

  const handleFlipCard = () => {
    setIsFlipped(!isFlipped);
  };

  const handleNextFlashcard = () => {
    setIsFlipped(false);
    if (currentFlashcardIndex < flashcards.length - 1) {
      setCurrentFlashcardIndex(currentFlashcardIndex + 1);
    }
  };

  const handlePrevFlashcard = () => {
    setIsFlipped(false);
    if (currentFlashcardIndex > 0) {
      setCurrentFlashcardIndex(currentFlashcardIndex - 1);
    }
  };

  const handleMarkAsKnown = async () => {
    const currentCardId = flashcards[currentFlashcardIndex]?.id;
    if (currentCardId && !knownCards.includes(currentCardId)) {
      setKnownCards([...knownCards, currentCardId]);
      
      // Save progress to backend and earn XP
      try {
        const response = await csrfFetch('/api/student/flashcards/progress', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            cardId: `card-${currentCardId}`,
            status: 'known',
          }),
        });
        
        if (response.ok) {
          // Show toast notification
          setShowFlashcardXpToast(true);
          setTimeout(() => setShowFlashcardXpToast(false), 2000);
        }
      } catch (err) {
        console.error('Failed to save flashcard progress:', err);
      }
    }
    handleNextFlashcard();
  };

  const handleQuizAnswer = (questionId: number, answer: string) => {
    setQuizAnswers({ ...quizAnswers, [questionId]: answer });
  };

  const handleNextQuiz = () => {
    if (currentQuizIndex < quizQuestions.length - 1) {
      setCurrentQuizIndex(currentQuizIndex + 1);
    }
  };

  const handlePrevQuiz = () => {
    if (currentQuizIndex > 0) {
      setCurrentQuizIndex(currentQuizIndex - 1);
    }
  };

  const handleSubmitQuiz = async () => {
    setIsSubmitting(true);
    
    // Prepare answers in the format expected by backend
    const formattedAnswers: Record<string, string> = {};
    quizQuestions.forEach((q) => {
      formattedAnswers[`q-${q.id}`] = quizAnswers[q.id] || '';
    });
    
    try {
      const response = await csrfFetch('/api/student/quiz/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          answers: formattedAnswers,
        }),
      });
      
      if (response.ok) {
        const data = await response.json();
        setQuizScore(data.score || 0);
        setShowResults(true);
        setHasCompleted(true);
        setPreviousScore(data.score || 0);
        setPreviousAnswers(formattedAnswers);
        
        // Display XP reward
        if (data.xp) {
          setXpReward(data.xp);
          setShowXpModal(true);
        }
      } else {
        // Fallback to client-side scoring if backend fails
        let correct = 0;
        quizQuestions.forEach((q) => {
          const userAnswer = quizAnswers[q.id]?.trim().toLowerCase();
          const correctAnswer = q.correctAnswer.trim().toLowerCase();
          if (userAnswer === correctAnswer) {
            correct++;
          }
        });
        setQuizScore(Math.round((correct / quizQuestions.length) * 100));
        setShowResults(true);
      }
    } catch (err) {
      console.error('Failed to submit quiz:', err);
      // Fallback to client-side scoring
      let correct = 0;
      quizQuestions.forEach((q) => {
        const userAnswer = quizAnswers[q.id]?.trim().toLowerCase();
        const correctAnswer = q.correctAnswer.trim().toLowerCase();
        if (userAnswer === correctAnswer) {
          correct++;
        }
      });
      setQuizScore(Math.round((correct / quizQuestions.length) * 100));
      setShowResults(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetQuiz = () => {
    setQuizAnswers({});
    setCurrentQuizIndex(0);
    setShowResults(false);
    setQuizScore(0);
  };

  if (isLoading) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <p>Loading activity...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <p style={{ color: '#ef4444' }}>{error}</p>
        <button onClick={() => navigate('/student-dashboard/activity')} style={{ marginTop: '16px', padding: '8px 16px', cursor: 'pointer' }}>
          Back to Activities
        </button>
      </div>
    );
  }

  const currentFlashcard = flashcards[currentFlashcardIndex];
  const currentQuiz = quizQuestions[currentQuizIndex];

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f8fafc', padding: '24px' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{ marginBottom: '24px' }}>
          <button
            onClick={() => navigate('/student-dashboard/activity')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 16px',
              backgroundColor: '#fff',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '14px',
              marginBottom: '16px',
            }}
          >
            <ArrowLeft size={16} />
            Back to Activities
          </button>
          <h1 style={{ fontSize: '28px', fontWeight: '700', color: '#0f172a', marginBottom: '8px' }}>
            {activity?.title}
          </h1>
          {activity?.description && (
            <p style={{ fontSize: '16px', color: '#64748b' }}>{activity.description}</p>
          )}
        </div>

        {/* Overview Mode */}
        {mode === 'overview' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
            {flashcards.length > 0 && (
              <div
                style={{
                  padding: '32px',
                  backgroundColor: '#fff',
                  borderRadius: '12px',
                  border: '1px solid #e2e8f0',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
                onClick={() => setMode('flashcards')}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = '#6366f1';
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(99, 102, 241, 0.1)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = '#e2e8f0';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                  <div style={{ padding: '12px', backgroundColor: '#eef2ff', borderRadius: '8px' }}>
                    <BookOpen size={24} style={{ color: '#6366f1' }} />
                  </div>
                  <div>
                    <h2 style={{ fontSize: '20px', fontWeight: '600', color: '#0f172a' }}>Flashcards</h2>
                    <p style={{ fontSize: '14px', color: '#64748b' }}>{flashcards.length} cards</p>
                  </div>
                </div>
                <p style={{ fontSize: '14px', color: '#64748b' }}>
                  Study terms and definitions at your own pace
                </p>
              </div>
            )}

            {quizQuestions.length > 0 && (
              <div
                style={{
                  padding: '32px',
                  backgroundColor: '#fff',
                  borderRadius: '12px',
                  border: '1px solid #e2e8f0',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
                onClick={() => hasCompleted ? setMode('review') : setMode('quiz')}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = '#6366f1';
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(99, 102, 241, 0.1)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = '#e2e8f0';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                  <div style={{ padding: '12px', backgroundColor: hasCompleted ? '#fef3c7' : '#ecfdf5', borderRadius: '8px' }}>
                    {hasCompleted ? <CheckCircle size={24} style={{ color: '#f59e0b' }} /> : <HelpCircle size={24} style={{ color: '#10b981' }} />}
                  </div>
                  <div>
                    <h2 style={{ fontSize: '20px', fontWeight: '600', color: '#0f172a' }}>
                      {hasCompleted ? 'Quiz Completed' : 'Quiz'}
                    </h2>
                    <p style={{ fontSize: '14px', color: '#64748b' }}>
                      {quizQuestions.length} questions
                      {hasCompleted && previousScore !== null && ` • Score: ${previousScore}%`}
                    </p>
                  </div>
                </div>
                <p style={{ fontSize: '14px', color: '#64748b' }}>
                  {hasCompleted 
                    ? 'View your answers and correct solutions' 
                    : 'Test your knowledge with multiple choice and identification questions'}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Flashcards Mode */}
        {mode === 'flashcards' && currentFlashcard && (
          <div>
            <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <button
                onClick={() => setMode('overview')}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#fff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '14px',
                }}
              >
                Exit Flashcards
              </button>
              <span style={{ fontSize: '14px', color: '#64748b' }}>
                Card {currentFlashcardIndex + 1} of {flashcards.length} • {knownCards.length} known
              </span>
            </div>

            <div
              style={{
                perspective: '1000px',
                minHeight: '400px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <div
                onClick={handleFlipCard}
                style={{
                  width: '100%',
                  maxWidth: '600px',
                  minHeight: '400px',
                  backgroundColor: '#fff',
                  borderRadius: '16px',
                  border: '2px solid #e2e8f0',
                  padding: '48px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  transition: 'all 0.3s',
                  transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0)',
                  transformStyle: 'preserve-3d',
                }}
              >
                <div style={{ transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0)' }}>
                  <p style={{ fontSize: '14px', color: '#6366f1', fontWeight: '600', marginBottom: '16px', textAlign: 'center' }}>
                    {isFlipped ? 'DEFINITION' : 'TERM'}
                  </p>
                  <h2 style={{ fontSize: '32px', fontWeight: '600', color: '#0f172a', textAlign: 'center' }}>
                    {isFlipped ? currentFlashcard.definition : currentFlashcard.term}
                  </h2>
                  {!isFlipped && currentFlashcard.imageUrl && (
                    <img
                      src={currentFlashcard.imageUrl}
                      alt="Flashcard"
                      style={{ marginTop: '24px', maxWidth: '100%', borderRadius: '8px' }}
                    />
                  )}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', marginTop: '24px' }}>
              <button
                onClick={handlePrevFlashcard}
                disabled={currentFlashcardIndex === 0}
                style={{
                  padding: '12px 20px',
                  backgroundColor: '#fff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  cursor: currentFlashcardIndex === 0 ? 'not-allowed' : 'pointer',
                  opacity: currentFlashcardIndex === 0 ? 0.5 : 1,
                }}
              >
                <ChevronLeft size={20} />
              </button>
              <button
                onClick={handleMarkAsKnown}
                style={{
                  padding: '12px 24px',
                  backgroundColor: '#10b981',
                  border: 'none',
                  borderRadius: '8px',
                  color: '#fff',
                  fontWeight: '600',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <CheckCircle size={20} />
                I Know This
              </button>
              <button
                onClick={handleNextFlashcard}
                disabled={currentFlashcardIndex === flashcards.length - 1}
                style={{
                  padding: '12px 20px',
                  backgroundColor: '#fff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  cursor: currentFlashcardIndex === flashcards.length - 1 ? 'not-allowed' : 'pointer',
                  opacity: currentFlashcardIndex === flashcards.length - 1 ? 0.5 : 1,
                }}
              >
                <ChevronRight size={20} />
              </button>
            </div>
          </div>
        )}

        {/* Quiz Mode */}
        {mode === 'quiz' && !showResults && !hasCompleted && currentQuiz && (
          <div>
            <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <button
                onClick={() => setMode('overview')}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#fff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '14px',
                }}
              >
                Exit Quiz
              </button>
              <span style={{ fontSize: '14px', color: '#64748b' }}>
                Question {currentQuizIndex + 1} of {quizQuestions.length}
              </span>
            </div>

            <div style={{ backgroundColor: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '32px' }}>
              <h3 style={{ fontSize: '20px', fontWeight: '600', color: '#0f172a', marginBottom: '24px' }}>
                {currentQuiz.question}
              </h3>

              {currentQuiz.type === 'multiple_choice' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {currentQuiz.options.map((option, idx) => (
                    <label
                      key={idx}
                      style={{
                        padding: '16px',
                        border: '2px solid',
                        borderColor: quizAnswers[currentQuiz.id] === option ? '#6366f1' : '#e2e8f0',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        backgroundColor: quizAnswers[currentQuiz.id] === option ? '#eef2ff' : '#fff',
                      }}
                    >
                      <input
                        type="radio"
                        name={`quiz-${currentQuiz.id}`}
                        value={option}
                        checked={quizAnswers[currentQuiz.id] === option}
                        onChange={(e) => handleQuizAnswer(currentQuiz.id, e.target.value)}
                        style={{ width: '18px', height: '18px' }}
                      />
                      <span style={{ fontSize: '16px', color: '#0f172a' }}>{option}</span>
                    </label>
                  ))}
                </div>
              )}

              {currentQuiz.type === 'true_false' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {['True', 'False'].map((option) => (
                    <label
                      key={option}
                      style={{
                        padding: '16px',
                        border: '2px solid',
                        borderColor: quizAnswers[currentQuiz.id] === option ? '#6366f1' : '#e2e8f0',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        backgroundColor: quizAnswers[currentQuiz.id] === option ? '#eef2ff' : '#fff',
                      }}
                    >
                      <input
                        type="radio"
                        name={`quiz-${currentQuiz.id}`}
                        value={option}
                        checked={quizAnswers[currentQuiz.id] === option}
                        onChange={(e) => handleQuizAnswer(currentQuiz.id, e.target.value)}
                        style={{ width: '18px', height: '18px' }}
                      />
                      <span style={{ fontSize: '16px', color: '#0f172a' }}>{option}</span>
                    </label>
                  ))}
                </div>
              )}

              {currentQuiz.type === 'identification' && (
                <input
                  type="text"
                  value={quizAnswers[currentQuiz.id] || ''}
                  onChange={(e) => handleQuizAnswer(currentQuiz.id, e.target.value)}
                  placeholder="Type your answer here"
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    border: '2px solid #e2e8f0',
                    borderRadius: '8px',
                    fontSize: '16px',
                    outline: 'none',
                  }}
                />
              )}
            </div>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'space-between', marginTop: '24px' }}>
              <button
                onClick={handlePrevQuiz}
                disabled={currentQuizIndex === 0}
                style={{
                  padding: '12px 20px',
                  backgroundColor: '#fff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  cursor: currentQuizIndex === 0 ? 'not-allowed' : 'pointer',
                  opacity: currentQuizIndex === 0 ? 0.5 : 1,
                }}
              >
                Previous
              </button>
              {currentQuizIndex === quizQuestions.length - 1 ? (
                <button
                  onClick={handleSubmitQuiz}
                  disabled={isSubmitting}
                  style={{
                    padding: '12px 24px',
                    backgroundColor: isSubmitting ? '#94a3b8' : '#6366f1',
                    border: 'none',
                    borderRadius: '8px',
                    color: '#fff',
                    fontWeight: '600',
                    cursor: isSubmitting ? 'not-allowed' : 'pointer',
                    opacity: isSubmitting ? 0.7 : 1,
                  }}
                >
                  {isSubmitting ? 'Submitting...' : 'Submit Quiz'}
                </button>
              ) : (
                <button
                  onClick={handleNextQuiz}
                  style={{
                    padding: '12px 24px',
                    backgroundColor: '#6366f1',
                    border: 'none',
                    borderRadius: '8px',
                    color: '#fff',
                    fontWeight: '600',
                    cursor: 'pointer',
                  }}
                >
                  Next Question
                </button>
              )}
            </div>
          </div>
        )}

        {/* Quiz Results */}
        {mode === 'quiz' && showResults && (
          <div style={{ backgroundColor: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '48px', textAlign: 'center' }}>
            <div style={{ marginBottom: '24px' }}>
              <div
                style={{
                  width: '120px',
                  height: '120px',
                  borderRadius: '50%',
                  backgroundColor: quizScore >= 70 ? '#d1fae5' : '#fee2e2',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 24px',
                }}
              >
                <span style={{ fontSize: '48px', fontWeight: '700', color: quizScore >= 70 ? '#10b981' : '#ef4444' }}>
                  {quizScore}%
                </span>
              </div>
              <h2 style={{ fontSize: '28px', fontWeight: '700', color: '#0f172a', marginBottom: '8px' }}>
                {quizScore >= 70 ? 'Great Job!' : 'Keep Practicing!'}
              </h2>
              <p style={{ fontSize: '16px', color: '#64748b' }}>
                You answered {Object.keys(quizAnswers).length} out of {quizQuestions.length} questions
              </p>
            </div>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <button
                onClick={() => setMode('review')}
                style={{
                  padding: '12px 24px',
                  backgroundColor: '#fff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  fontWeight: '600',
                }}
              >
                <BookOpen size={18} />
                View Answers
              </button>
              <button
                onClick={() => setMode('overview')}
                style={{
                  padding: '12px 24px',
                  backgroundColor: '#6366f1',
                  border: 'none',
                  borderRadius: '8px',
                  color: '#fff',
                  fontWeight: '600',
                  cursor: 'pointer',
                }}
              >
                Back to Overview
              </button>
            </div>
          </div>
        )}

        {/* Review Mode - Show all answers */}
        {mode === 'review' && (
          <div>
            <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <button
                onClick={() => setMode('overview')}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#fff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <ArrowLeft size={16} />
                Back to Overview
              </button>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '14px', color: '#64748b' }}>Your Score</div>
                <div style={{ fontSize: '24px', fontWeight: '700', color: previousScore && previousScore >= 70 ? '#10b981' : '#ef4444' }}>
                  {previousScore}%
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              {quizQuestions.map((question, index) => {
                const studentAnswer = previousAnswers ? previousAnswers[`q-${question.id}`] : quizAnswers[question.id];
                const isCorrect = studentAnswer?.trim().toLowerCase() === question.correctAnswer.trim().toLowerCase();

                return (
                  <div
                    key={question.id}
                    style={{
                      backgroundColor: '#fff',
                      borderRadius: '12px',
                      border: '2px solid',
                      borderColor: isCorrect ? '#10b981' : '#ef4444',
                      padding: '24px',
                    }}
                  >
                    {/* Question Header */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                      <div
                        style={{
                          width: '32px',
                          height: '32px',
                          borderRadius: '50%',
                          backgroundColor: isCorrect ? '#d1fae5' : '#fee2e2',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        {isCorrect ? (
                          <CheckCircle size={20} style={{ color: '#10b981' }} />
                        ) : (
                          <span style={{ fontSize: '18px', color: '#ef4444' }}>✕</span>
                        )}
                      </div>
                      <div>
                        <div style={{ fontSize: '12px', fontWeight: '600', color: '#64748b', textTransform: 'uppercase' }}>
                          Question {index + 1} • {question.type.replace('_', ' ')}
                        </div>
                        <div style={{ fontSize: '14px', fontWeight: '600', color: isCorrect ? '#10b981' : '#ef4444' }}>
                          {isCorrect ? 'Correct' : 'Incorrect'}
                        </div>
                      </div>
                    </div>

                    {/* Question */}
                    <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#0f172a', marginBottom: '16px' }}>
                      {question.question}
                    </h3>

                    {/* Options (for multiple choice and true/false) */}
                    {(question.type === 'multiple_choice' || question.type === 'true_false') && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
                        {(question.type === 'true_false' ? ['True', 'False'] : question.options).map((option, idx) => {
                          const isStudentChoice = studentAnswer === option;
                          const isCorrectChoice = question.correctAnswer === option;

                          return (
                            <div
                              key={idx}
                              style={{
                                padding: '12px 16px',
                                borderRadius: '8px',
                                border: '2px solid',
                                borderColor: isCorrectChoice ? '#10b981' : (isStudentChoice ? '#ef4444' : '#e2e8f0'),
                                backgroundColor: isCorrectChoice ? '#d1fae5' : (isStudentChoice ? '#fee2e2' : '#f8fafc'),
                                display: 'flex',
                                alignItems: 'center',
                                gap: '12px',
                              }}
                            >
                              {isCorrectChoice && <CheckCircle size={18} style={{ color: '#10b981' }} />}
                              {isStudentChoice && !isCorrectChoice && <span style={{ fontSize: '18px', color: '#ef4444' }}>✕</span>}
                              <span style={{ fontSize: '15px', color: '#0f172a', fontWeight: isCorrectChoice || isStudentChoice ? '600' : '400' }}>
                                {option}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Identification answers */}
                    {question.type === 'identification' && (
                      <div style={{ marginBottom: '16px' }}>
                        <div style={{ marginBottom: '12px' }}>
                          <div style={{ fontSize: '14px', fontWeight: '600', color: '#64748b', marginBottom: '8px' }}>
                            Your Answer:
                          </div>
                          <div
                            style={{
                              padding: '12px 16px',
                              borderRadius: '8px',
                              backgroundColor: isCorrect ? '#d1fae5' : '#fee2e2',
                              border: '2px solid',
                              borderColor: isCorrect ? '#10b981' : '#ef4444',
                              fontSize: '15px',
                              color: '#0f172a',
                              fontWeight: '600',
                            }}
                          >
                            {studentAnswer || '(No answer provided)'}
                          </div>
                        </div>
                        {!isCorrect && (
                          <div>
                            <div style={{ fontSize: '14px', fontWeight: '600', color: '#10b981', marginBottom: '8px' }}>
                              Correct Answer:
                            </div>
                            <div
                              style={{
                                padding: '12px 16px',
                                borderRadius: '8px',
                                backgroundColor: '#d1fae5',
                                border: '2px solid #10b981',
                                fontSize: '15px',
                                color: '#0f172a',
                                fontWeight: '600',
                              }}
                            >
                              {question.correctAnswer}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* XP Reward Modal */}
      {showXpModal && xpReward && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
          onClick={() => setShowXpModal(false)}
        >
          <div
            style={{
              backgroundColor: '#fff',
              borderRadius: '16px',
              padding: '48px',
              maxWidth: '500px',
              width: '90%',
              textAlign: 'center',
              position: 'relative',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Trophy Icon */}
            <div
              style={{
                width: '100px',
                height: '100px',
                borderRadius: '50%',
                backgroundColor: '#fef3c7',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 24px',
              }}
            >
              <Trophy size={48} style={{ color: '#f59e0b' }} />
            </div>

            {/* Achievement Message */}
            <h2 style={{ fontSize: '32px', fontWeight: '700', color: '#0f172a', marginBottom: '16px' }}>
              🎉 Achievement Unlocked!
            </h2>
            
            {/* XP Earned */}
            <div
              style={{
                backgroundColor: '#ede9fe',
                borderRadius: '12px',
                padding: '24px',
                marginBottom: '24px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', marginBottom: '12px' }}>
                <Star size={32} style={{ color: '#8b5cf6', fill: '#8b5cf6' }} />
                <span style={{ fontSize: '48px', fontWeight: '700', color: '#8b5cf6' }}>
                  +{xpReward.xp} XP
                </span>
              </div>
              
              {/* Level & Title */}
              <p style={{ fontSize: '18px', color: '#6b7280', marginBottom: '16px' }}>
                Level {xpReward.level} • {xpReward.title}
              </p>

              {/* Progress Bar */}
              <div style={{ marginBottom: '8px' }}>
                <div
                  style={{
                    height: '8px',
                    backgroundColor: '#e5e7eb',
                    borderRadius: '4px',
                    overflow: 'hidden',
                  }}
                >
                  <div
                    style={{
                      height: '100%',
                      backgroundColor: '#8b5cf6',
                      width: `${xpReward.levelProgressPercent}%`,
                      transition: 'width 0.5s ease',
                    }}
                  />
                </div>
                <p style={{ fontSize: '14px', color: '#9ca3af', marginTop: '8px' }}>
                  {xpReward.xpToNextLevel} XP to next level
                </p>
              </div>
            </div>

            {/* Close Button */}
            <button
              onClick={() => setShowXpModal(false)}
              style={{
                padding: '12px 32px',
                backgroundColor: '#6366f1',
                border: 'none',
                borderRadius: '8px',
                color: '#fff',
                fontSize: '16px',
                fontWeight: '600',
                cursor: 'pointer',
                width: '100%',
              }}
            >
              Continue
            </button>
          </div>
        </div>
      )}

      {/* Flashcard XP Toast Notification */}
      {showFlashcardXpToast && (
        <div
          style={{
            position: 'fixed',
            top: '24px',
            right: '24px',
            backgroundColor: '#10b981',
            color: '#fff',
            padding: '16px 24px',
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
            zIndex: 1000,
            animation: 'slideIn 0.3s ease',
          }}
        >
          <Star size={20} style={{ fill: '#fff' }} />
          <span style={{ fontWeight: '600' }}>+10 XP Earned!</span>
        </div>
      )}
    </div>
  );
}
