import React, { useEffect, useMemo, useState } from 'react';
import { Award, Brain, Check, X } from 'lucide-react';
import { csrfFetch } from '../../lib/csrf';
import StudentLayout from '../../components/ui/StudentLayout';

type FlashCard = {
  id: string;
  term: string;
  definition: string;
  subject: string;
};

function shuffleArray<T>(items: T[]): T[] {
  const next = [...items];
  for (let i = next.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [next[i], next[j]] = [next[j], next[i]];
  }
  return next;
}

export default function StudentFlashcards() {
  const [flashcards, setFlashcards] = useState<FlashCard[]>([]);
  const [flipped, setFlipped] = useState(false);
  const [cardIndex, setCardIndex] = useState(0);
  const [knownCards, setKnownCards] = useState<string[]>([]);
  const [reviewCards, setReviewCards] = useState<string[]>([]);
  const [reviewQueue, setReviewQueue] = useState<FlashCard[]>([]);
  const [reviewedCards, setReviewedCards] = useState<string[]>([]);
  const [isCompleted, setIsCompleted] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch('/api/student/flashcards', { credentials: 'include', headers: { Accept: 'application/json' } });
        if (res.ok) {
          const payload = (await res.json()) as { cards?: FlashCard[] };
          setFlashcards(payload.cards ?? []);
        }
      } catch {
        // Keep empty state.
      }
    };
    load();
  }, []);

  const currentCard = flashcards[cardIndex] ?? null;

  const smartReviewCards = useMemo(() => {
    if (!reviewQueue.length) return flashcards.filter((card) => reviewCards.includes(card.id));
    return reviewQueue;
  }, [flashcards, reviewCards, reviewQueue]);

  const markCard = async (mode: 'known' | 'review') => {
    if (!currentCard) return;

    if (mode === 'known') {
      setKnownCards((c) => (c.includes(currentCard.id) ? c : [...c, currentCard.id]));
      setReviewCards((c) => c.filter((id) => id !== currentCard.id));
    } else {
      setReviewCards((c) => (c.includes(currentCard.id) ? c : [...c, currentCard.id]));
    }

    try {
      await csrfFetch('/api/student/flashcards/progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ cardId: currentCard.id, status: mode }),
      });
    } catch {
      // Keep local state.
    }

    // Mark this card as reviewed
    const newReviewedCards = reviewedCards.includes(currentCard.id) 
      ? reviewedCards 
      : [...reviewedCards, currentCard.id];
    setReviewedCards(newReviewedCards);

    // Check if all cards have been reviewed
    if (newReviewedCards.length >= flashcards.length) {
      setIsCompleted(true);
      setFlipped(false);
      return;
    }

    setFlipped(false);
    setCardIndex((index) => (index + 1) % flashcards.length);
  };

  const startSmartReview = () => {
    const difficult = flashcards.filter((card) => reviewCards.includes(card.id));
    if (!difficult.length) return;
    const randomized = shuffleArray(difficult);
    setReviewQueue(randomized);
    setCardIndex(flashcards.findIndex((card) => card.id === randomized[0]?.id));
    setFlipped(false);
    setIsCompleted(false);
    setReviewedCards([]);
  };

  const shuffleCards = () => {
    setFlashcards((c) => shuffleArray(c));
    setCardIndex(0);
    setFlipped(false);
    setIsCompleted(false);
    setReviewedCards([]);
  };

  const restartReview = () => {
    setCardIndex(0);
    setFlipped(false);
    setIsCompleted(false);
    setReviewedCards([]);
  };

  return (
    <StudentLayout>
      <div className="ss-grid">
        <section className="ss-panel">
          <div className="ss-panel-head">
            <h2>Flashcard Learning</h2>
            <div className="ss-inline-actions">
              <button type="button" className="ss-chip-btn" onClick={shuffleCards}>
                Shuffle
              </button>
              <button type="button" className="ss-chip-btn" onClick={startSmartReview}>
                <Brain size={14} /> Smart Review
              </button>
            </div>
          </div>

          {!isCompleted && flashcards.length > 0 && (
            <div style={{ 
              padding: '12px 16px', 
              backgroundColor: '#1e293b', 
              borderRadius: '8px', 
              marginBottom: '16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <span style={{ fontSize: '14px', color: '#94a3b8', fontWeight: '500' }}>
                Card {reviewedCards.length + 1} of {flashcards.length}
              </span>
              <div style={{ 
                flex: 1, 
                maxWidth: '200px', 
                height: '8px', 
                backgroundColor: '#334155', 
                borderRadius: '4px',
                marginLeft: '16px',
                overflow: 'hidden'
              }}>
                <div style={{
                  height: '100%',
                  width: `${(reviewedCards.length / flashcards.length) * 100}%`,
                  backgroundColor: '#6366f1',
                  transition: 'width 0.3s ease'
                }} />
              </div>
            </div>
          )}

          {flashcards.length === 0 ? (
            <p className="ss-empty">No flashcards available yet.</p>
          ) : isCompleted ? (
            <div style={{ 
              textAlign: 'center', 
              padding: '48px 24px',
              display: 'flex',
              flexDirection: 'column',
              gap: '24px',
              alignItems: 'center'
            }}>
              <div style={{ fontSize: '64px' }}>🎉</div>
              <div>
                <h2 style={{ fontSize: '28px', fontWeight: '700', marginBottom: '8px' }}>
                  Review Complete!
                </h2>
                <p style={{ color: '#94a3b8', fontSize: '16px' }}>
                  You've reviewed all {flashcards.length} flashcards
                </p>
              </div>
              
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: '1fr 1fr', 
                gap: '16px', 
                width: '100%',
                maxWidth: '400px',
                marginTop: '16px'
              }}>
                <div style={{
                  padding: '20px',
                  backgroundColor: '#065f46',
                  borderRadius: '12px',
                  border: '2px solid #10b981'
                }}>
                  <p style={{ fontSize: '14px', marginBottom: '4px', opacity: 0.9 }}>Known</p>
                  <h3 style={{ fontSize: '32px', fontWeight: '700' }}>{knownCards.length}</h3>
                </div>
                <div style={{
                  padding: '20px',
                  backgroundColor: '#7c2d12',
                  borderRadius: '12px',
                  border: '2px solid #f97316'
                }}>
                  <p style={{ fontSize: '14px', marginBottom: '4px', opacity: 0.9 }}>Review</p>
                  <h3 style={{ fontSize: '32px', fontWeight: '700' }}>{reviewCards.length}</h3>
                </div>
              </div>

              <div style={{ 
                display: 'flex', 
                gap: '12px', 
                marginTop: '8px',
                flexWrap: 'wrap',
                justifyContent: 'center'
              }}>
                <button 
                  type="button" 
                  className="ss-chip-btn" 
                  onClick={restartReview}
                  style={{
                    padding: '12px 24px',
                    backgroundColor: '#6366f1',
                    color: '#fff',
                    fontWeight: '600'
                  }}
                >
                  Review Again
                </button>
                {reviewCards.length > 0 && (
                  <button 
                    type="button" 
                    className="ss-chip-btn" 
                    onClick={startSmartReview}
                    style={{
                      padding: '12px 24px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}
                  >
                    <Brain size={16} /> Review Difficult Cards
                  </button>
                )}
              </div>
            </div>
          ) : (
            <>
              <button
                type="button"
                className={`ss-flip-card ${flipped ? 'is-flipped' : ''}`}
                onClick={() => setFlipped((prev) => !prev)}
              >
                <div className="ss-flip-face ss-flip-front">
                  <small>{currentCard?.subject}</small>
                  <h3>{currentCard?.term ?? 'No card available'}</h3>
                  <p>Tap to reveal</p>
                </div>
                <div className="ss-flip-face ss-flip-back">
                  <small>Definition</small>
                  <h3>{currentCard?.definition ?? 'No definition available'}</h3>
                </div>
              </button>

              <div className="ss-inline-actions">
                <button type="button" className="ss-danger-btn" onClick={() => markCard('review')}>
                  <X size={16} /> Needs Review
                </button>
                <button type="button" className="ss-success-btn" onClick={() => markCard('known')}>
                  <Check size={16} /> Known
                </button>
              </div>
            </>
          )}
        </section>

        <section className="ss-panel">
          <div className="ss-panel-head">
            <h2>Progress Saved</h2>
            <Award size={16} />
          </div>
          <div className="ss-kpi-grid ss-kpi-grid-2">
            <article className="ss-kpi-card">
              <p>Known Cards</p>
              <h3>{knownCards.length}</h3>
            </article>
            <article className="ss-kpi-card">
              <p>Needs Review</p>
              <h3>{reviewCards.length}</h3>
            </article>
          </div>
          <h3 className="ss-sub-title">Difficult Cards Queue</h3>
          <div className="ss-card-list">
            {smartReviewCards.length ? (
              smartReviewCards.map((card) => (
                <article key={card.id} className="ss-list-card">
                  <div>
                    <h3>{card.term}</h3>
                    <p>{card.subject}</p>
                  </div>
                  <span>Repeat</span>
                </article>
              ))
            ) : (
              <p className="ss-empty">No difficult cards yet. Great job.</p>
            )}
          </div>
        </section>
      </div>
    </StudentLayout>
  );
}

