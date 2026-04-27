import React, { useEffect, useMemo, useState } from 'react';
import { HelpCircle, Trophy } from 'lucide-react';
import { csrfFetch } from '../../lib/csrf';
import { GameFeedbackCard, type XpSnapshot } from '../../components/ui/GamificationWidgets';
import StudentLayout from '../../components/ui/StudentLayout';

type QuizQuestion = {
  id: string;
  type: 'multiple_choice' | 'true_false' | 'identification';
  subject: string;
  prompt: string;
  choices?: string[];
  answer: string;
  explanation: string;
};

function normalizeAnswer(value: string): string {
  return value.trim().toLowerCase();
}

export default function StudentQuiz() {
  const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[]>([]);
  const [quizId, setQuizId] = useState<number | null>(null);
  const [quizCompleted, setQuizCompleted] = useState(false);
  const [quizIndex, setQuizIndex] = useState(0);
  const [quizInput, setQuizInput] = useState('');
  const [quizSelections, setQuizSelections] = useState<Record<string, string>>({});
  const [showFeedback, setShowFeedback] = useState(false);
  const [gameFeedback, setGameFeedback] = useState<{ mood: 'success' | 'warning'; message: string } | null>(null);
  const [xpSnapshot, setXpSnapshot] = useState<XpSnapshot | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch('/api/student/quiz/questions', { credentials: 'include', headers: { Accept: 'application/json' } });
        if (res.ok) {
          const payload = (await res.json()) as { quizId?: number | null; questions?: QuizQuestion[]; completed?: boolean };
          if (payload.quizId) {
            setQuizId(payload.quizId);
            setQuizCompleted(false);
          } else {
            setQuizCompleted(payload.completed ?? false);
          }
          setQuizQuestions(payload.questions ?? []);
        }
      } catch {
        // Keep empty state.
      }
    };
    load();
  }, []);

  const currentQuiz = quizQuestions[quizIndex] ?? null;

  const quizScore = useMemo(() => {
    if (!quizQuestions.length) return 0;
    const correct = quizQuestions.reduce((total, question) => {
      const value = quizSelections[question.id] ?? '';
      return normalizeAnswer(value) === normalizeAnswer(question.answer) ? total + 1 : total;
    }, 0);
    return Math.round((correct / quizQuestions.length) * 100);
  }, [quizQuestions, quizSelections]);

  const selectQuizAnswer = (value: string) => {
    if (!currentQuiz) return;
    setQuizSelections((c) => ({ ...c, [currentQuiz.id]: value }));
  };

  const submitQuizFeedback = () => {
    if (!currentQuiz) return;
    if (currentQuiz.type === 'identification') {
      setQuizSelections((c) => ({ ...c, [currentQuiz.id]: quizInput }));
    }
    const resolved = currentQuiz.type === 'identification' ? quizInput : quizSelections[currentQuiz.id] ?? '';
    const correct = normalizeAnswer(resolved) === normalizeAnswer(currentQuiz.answer);
    setGameFeedback({ mood: correct ? 'success' : 'warning', message: correct ? 'Correct! Keep the streak alive.' : 'Try again. You can do this.' });
    setShowFeedback(true);
  };

  const submitQuizAttempt = async () => {
    try {
      const res = await csrfFetch('/api/student/quiz/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ quizId, answers: quizSelections }),
      });
      if (res.ok) {
        const payload = (await res.json()) as { score?: number; xp?: XpSnapshot };
        if (payload.xp) setXpSnapshot(payload.xp);
      }
    } catch {
      // Keep local state.
    }
  };

  const nextQuizQuestion = async () => {
    if (!quizQuestions.length) return;
    const isLast = quizIndex === quizQuestions.length - 1;
    if (isLast) await submitQuizAttempt();
    setShowFeedback(false);
    setQuizInput('');
    if (isLast) { setQuizCompleted(true); return; }
    setQuizIndex((i) => i + 1);
  };

  if (quizCompleted && quizQuestions.length === 0) {
    return (
      <StudentLayout>
        <section className="ss-panel">
          <div className="ss-panel-head"><h2>Quiz System</h2><HelpCircle size={16} /></div>
          <p className="ss-empty">All assigned quizzes are completed.</p>
        </section>
      </StudentLayout>
    );
  }

  if (quizCompleted) {
    return (
      <StudentLayout>
        <section className="ss-panel">
          <div className="ss-panel-head"><h2>Quiz System</h2><HelpCircle size={16} /></div>
          <p className="ss-empty">Quiz completed. Wait for new content from your teacher.</p>
        </section>
      </StudentLayout>
    );
  }

  if (!currentQuiz) {
    return (
      <StudentLayout>
        <section className="ss-panel">
          <div className="ss-panel-head"><h2>Quiz System</h2><HelpCircle size={16} /></div>
          <p className="ss-empty">No quiz questions available yet.</p>
        </section>
      </StudentLayout>
    );
  }

  const currentAnswer = quizSelections[currentQuiz.id] ?? '';
  const isCorrect = normalizeAnswer(currentAnswer) === normalizeAnswer(currentQuiz.answer);

  return (
    <StudentLayout>
      <div className="ss-grid">
        <section className="ss-panel">
          <div className="ss-panel-head">
            <h2>Quiz System</h2>
            <span className="ss-pill">Question {quizIndex + 1}/{quizQuestions.length}</span>
          </div>

          <article className="ss-question-card">
            <small>{currentQuiz.subject}</small>
            <h3>{currentQuiz.prompt}</h3>

            {(currentQuiz.type === 'multiple_choice' || currentQuiz.type === 'true_false') && (
              <div className="ss-option-grid">
                {(currentQuiz.choices ?? []).map((choice) => (
                  <button
                    key={choice}
                    type="button"
                    className={`ss-option-btn ${currentAnswer === choice ? 'is-selected' : ''}`}
                    onClick={() => selectQuizAnswer(choice)}
                  >
                    {choice}
                  </button>
                ))}
              </div>
            )}

            {currentQuiz.type === 'identification' && (
              <input
                className="ss-input"
                placeholder="Type your answer"
                value={quizInput}
                onChange={(e) => setQuizInput(e.target.value)}
              />
            )}

            <div className="ss-inline-actions">
              <button type="button" className="ss-chip-btn" onClick={submitQuizFeedback}>Submit</button>
              <button type="button" className="ss-chip-btn" onClick={nextQuizQuestion}>Next Question</button>
            </div>

            {showFeedback && (
              <div className={`ss-feedback ${isCorrect ? 'is-correct' : 'is-wrong'}`}>
                <p>{isCorrect ? 'Correct answer. Nice work.' : 'Not quite. Keep reviewing.'}</p>
                <small>Correct answer: <strong>{currentQuiz.answer}</strong></small>
                <small>{currentQuiz.explanation}</small>
              </div>
            )}

            {gameFeedback && <GameFeedbackCard mood={gameFeedback.mood} message={gameFeedback.message} />}
          </article>
        </section>

        <section className="ss-panel">
          <div className="ss-panel-head"><h2>Quiz Summary</h2><Trophy size={16} /></div>
          <div className="ss-kpi-grid ss-kpi-grid-2">
            <article className="ss-kpi-card"><p>Current Score</p><h3>{quizScore}%</h3></article>
            <article className="ss-kpi-card"><p>Answered</p><h3>{Object.keys(quizSelections).length}</h3></article>
          </div>
          <p className="ss-insight">Instant feedback and answer explanations are shown right after each submission.</p>
        </section>
      </div>
    </StudentLayout>
  );
}

