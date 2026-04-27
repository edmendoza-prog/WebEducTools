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
  };

  const shuffleCards = () => {
    setFlashcards((c) => shuffleArray(c));
    setCardIndex(0);
    setFlipped(false);
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

          {flashcards.length === 0 ? (
            <p className="ss-empty">No flashcards available yet.</p>
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

