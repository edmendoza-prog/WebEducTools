import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { csrfFetch } from '../lib/csrf';
import NotificationCenter from '../components/ui/NotificationCenter';
import {
  BadgeGallery,
  GameFeedbackCard,
  LeaderboardTable,
  XpProgressBar,
  type GamifiedBadge,
  type LeaderboardEntry,
  type XpSnapshot,
} from '../components/ui/GamificationWidgets';
import {
  Award,
  BarChart3,
  BookOpen,
  Brain,
  Check,
  Clock3,
  Flame,
  HelpCircle,
  Home,
  Layers,
  LogOut,
  Medal,
  RotateCcw,
  Search,
  Shuffle,
  Sparkles,
  Target,
  Trophy,
  Users,
  X,
} from 'lucide-react';
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

type AuthMeResponse = {
  user?: {
    name?: string;
    email?: string;
  };
};

type StudySet = {
  id: string;
  title: string;
  cards: number;
  updatedAt: string;
  owner: string;
};

type FlashCard = {
  id: string;
  term: string;
  definition: string;
  subject: string;
};

type QuizQuestion = {
  id: string;
  type: 'multiple_choice' | 'true_false' | 'identification';
  subject: string;
  prompt: string;
  choices?: string[];
  answer: string;
  explanation: string;
};

type SessionLog = {
  id: string;
  date: string;
  minutes: number;
  topic: string;
  score: number;
};

type SubjectPerformance = {
  subject: string;
  score: number;
};

type BadgeInfo = {
  id: string;
  title: string;
  description: string;
  progress: number;
  required: number;
  icon: React.ReactNode;
};

type NotificationItem = {
  id: string;
  title: string;
  message: string;
  createdAt?: string | null;
};

type DashboardData = {
  progressPercent: number;
  completionRate: number;
  studyStreak: number;
  weeklyScores: Array<{ day: string; score: number }>;
  weeklyProgress: Array<{ week: string; completed: number }>;
  recentSets: StudySet[];
  sessionLogs: SessionLog[];
  subjectPerformance: SubjectPerformance[];
};

type StudentNav = {
  label: string;
  path: string;
  icon: React.ReactNode;
};

const fallbackSets: StudySet[] = [
  { id: 'set-1', title: 'Biology: Cell Structure', cards: 28, updatedAt: '1 hour ago', owner: 'Public Group' },
  { id: 'set-2', title: 'Philippine Constitution Basics', cards: 42, updatedAt: 'Yesterday', owner: 'Teacher Ana' },
  { id: 'set-3', title: 'Intro to Economics', cards: 31, updatedAt: '2 days ago', owner: 'Campus Community' },
  { id: 'set-4', title: 'Algebra Transformations', cards: 19, updatedAt: '3 days ago', owner: 'Math Circle' },
];

const fallbackCards: FlashCard[] = [
  { id: 'card-1', term: 'Mitochondria', definition: 'Organelle that generates ATP via cellular respiration.', subject: 'Biology' },
  { id: 'card-2', term: 'Due Process', definition: 'Requirement that legal matters be resolved fairly under established rules.', subject: 'Civics' },
  { id: 'card-3', term: 'Elasticity', definition: 'A measure of how much demand responds to a price change.', subject: 'Economics' },
  { id: 'card-4', term: 'Distributive Property', definition: 'a(b + c) = ab + ac.', subject: 'Mathematics' },
];

const fallbackQuestions: QuizQuestion[] = [
  {
    id: 'q-1',
    type: 'multiple_choice',
    subject: 'Biology',
    prompt: 'Which organelle is known as the powerhouse of the cell?',
    choices: ['Nucleus', 'Ribosome', 'Mitochondria', 'Golgi Body'],
    answer: 'Mitochondria',
    explanation: 'Mitochondria produce ATP, the main energy source used by cells.',
  },
  {
    id: 'q-2',
    type: 'true_false',
    subject: 'Economics',
    prompt: 'Inflation always increases purchasing power.',
    choices: ['True', 'False'],
    answer: 'False',
    explanation: 'Inflation usually decreases purchasing power when wages do not keep up.',
  },
  {
    id: 'q-3',
    type: 'identification',
    subject: 'Mathematics',
    prompt: 'Name the property used in a(b + c) = ab + ac.',
    answer: 'Distributive Property',
    explanation: 'The equation is the standard form of the distributive property.',
  },
];

const fallbackDashboard: DashboardData = {
  progressPercent: 72,
  completionRate: 64,
  studyStreak: 9,
  weeklyScores: [
    { day: 'Mon', score: 78 },
    { day: 'Tue', score: 82 },
    { day: 'Wed', score: 86 },
    { day: 'Thu', score: 79 },
    { day: 'Fri', score: 90 },
    { day: 'Sat', score: 92 },
    { day: 'Sun', score: 88 },
  ],
  weeklyProgress: [
    { week: 'W1', completed: 28 },
    { week: 'W2', completed: 36 },
    { week: 'W3', completed: 44 },
    { week: 'W4', completed: 58 },
  ],
  recentSets: fallbackSets,
  sessionLogs: [
    { id: 's-1', date: '2026-04-08', minutes: 45, topic: 'Biology', score: 88 },
    { id: 's-2', date: '2026-04-09', minutes: 35, topic: 'Economics', score: 76 },
    { id: 's-3', date: '2026-04-10', minutes: 55, topic: 'Mathematics', score: 91 },
    { id: 's-4', date: '2026-04-11', minutes: 40, topic: 'Civics', score: 84 },
  ],
  subjectPerformance: [
    { subject: 'Biology', score: 88 },
    { subject: 'Mathematics', score: 91 },
    { subject: 'Economics', score: 72 },
    { subject: 'Civics', score: 84 },
  ],
};

const navItems: StudentNav[] = [
  { label: 'Dashboard', path: '/student-dashboard', icon: <Home size={18} /> },
  { label: 'Flashcards', path: '/student-dashboard/flashcards', icon: <Layers size={18} /> },
  { label: 'Quiz', path: '/student-dashboard/quiz', icon: <HelpCircle size={18} /> },
  { label: 'Practice Test', path: '/student-dashboard/practice-tests', icon: <Clock3 size={18} /> },
  { label: 'Reports', path: '/student-dashboard/reports', icon: <BarChart3 size={18} /> },
  { label: 'Achievements', path: '/student-dashboard/achievements', icon: <Medal size={18} /> },
  { label: 'Search & Collaboration', path: '/student-dashboard/library', icon: <Users size={18} /> },
];

function shuffleArray<T>(items: T[]): T[] {
  const next = [...items];
  for (let i = next.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [next[i], next[j]] = [next[j], next[i]];
  }
  return next;
}

function randomizeQuestions(questions: QuizQuestion[]): QuizQuestion[] {
  return shuffleArray(questions).map((question) => {
    if (!question.choices) {
      return question;
    }

    return {
      ...question,
      choices: shuffleArray(question.choices),
    };
  });
}

function normalizeAnswer(value: string): string {
  return value.trim().toLowerCase();
}

function badgeIcon(badgeId: string): React.ReactNode {
  switch (badgeId) {
    case 'flashcard-master':
      return <BookOpen size={16} />;
    case 'quiz-champion':
      return <Trophy size={16} />;
    case 'study-streak':
      return <Flame size={16} />;
    case 'perfect-score':
      return <Target size={16} />;
    default:
      return <Medal size={16} />;
  }
}

export default function StudentDasboard() {
  const navigate = useNavigate();
  const location = useLocation();

  const [profileName, setProfileName] = useState('Student Learner');
  const [profileEmail, setProfileEmail] = useState('student@example.com');
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [globalSearch, setGlobalSearch] = useState('');

  const [dashboard, setDashboard] = useState<DashboardData>(fallbackDashboard);
  const [flashcards, setFlashcards] = useState<FlashCard[]>(fallbackCards);
  const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[]>(fallbackQuestions);
  const [quizId, setQuizId] = useState<number | null>(null);
  const [studentNotifications, setStudentNotifications] = useState<NotificationItem[]>([]);
  const [remoteBadges, setRemoteBadges] = useState<BadgeInfo[] | null>(null);
  const [xpSnapshot, setXpSnapshot] = useState<XpSnapshot | null>(null);
  const [leaderboardScope, setLeaderboardScope] = useState<'weekly' | 'global'>('weekly');
  const [leaders, setLeaders] = useState<LeaderboardEntry[]>([]);
  const [myRank, setMyRank] = useState(0);
  const [gamifiedBadges, setGamifiedBadges] = useState<GamifiedBadge[]>([]);
  const [gameFeedback, setGameFeedback] = useState<{ mood: 'success' | 'warning'; message: string } | null>(null);

  const [flipped, setFlipped] = useState(false);
  const [cardIndex, setCardIndex] = useState(0);
  const [knownCards, setKnownCards] = useState<string[]>([]);
  const [reviewCards, setReviewCards] = useState<string[]>([]);
  const [reviewQueue, setReviewQueue] = useState<FlashCard[]>([]);

  const [quizIndex, setQuizIndex] = useState(0);
  const [quizInput, setQuizInput] = useState('');
  const [quizSelections, setQuizSelections] = useState<Record<string, string>>({});
  const [showFeedback, setShowFeedback] = useState(false);

  const [practiceStarted, setPracticeStarted] = useState(false);
  const [practiceFinished, setPracticeFinished] = useState(false);
  const [practiceQuestions, setPracticeQuestions] = useState<QuizQuestion[]>([]);
  const [practiceIndex, setPracticeIndex] = useState(0);
  const [practiceAnswers, setPracticeAnswers] = useState<Record<string, string>>({});
  const [practiceTimeLeft, setPracticeTimeLeft] = useState(0);

  const [newBadgeIds, setNewBadgeIds] = useState<string[]>([]);

  const timerRef = useRef<number | null>(null);
  const profileInitials = profileName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((name) => name[0]?.toUpperCase() ?? '')
    .join('') || 'SL';

  useEffect(() => {
    const loadData = async () => {
      try {
        const [meRes, dashboardRes, flashcardRes, quizRes, notificationsRes, achievementsRes, gamificationRes, leaderboardRes, badgeRes] = await Promise.all([
          fetch('/auth/me', { method: 'GET', credentials: 'include', headers: { Accept: 'application/json' } }),
          fetch('/api/student/dashboard', { method: 'GET', credentials: 'include', headers: { Accept: 'application/json' } }),
          fetch('/api/student/flashcards', { method: 'GET', credentials: 'include', headers: { Accept: 'application/json' } }),
          fetch('/api/student/quiz/questions', { method: 'GET', credentials: 'include', headers: { Accept: 'application/json' } }),
          fetch('/api/student/notifications', { method: 'GET', credentials: 'include', headers: { Accept: 'application/json' } }),
          fetch('/api/student/achievements', { method: 'GET', credentials: 'include', headers: { Accept: 'application/json' } }),
          fetch('/api/gamification/me', { method: 'GET', credentials: 'include', headers: { Accept: 'application/json' } }),
          fetch('/api/gamification/leaderboard?scope=weekly', { method: 'GET', credentials: 'include', headers: { Accept: 'application/json' } }),
          fetch('/api/gamification/badges', { method: 'GET', credentials: 'include', headers: { Accept: 'application/json' } }),
        ]);

        if (meRes.ok) {
          const me = (await meRes.json()) as AuthMeResponse;
          if (me.user?.name) {
            setProfileName(me.user.name);
          }
          if (me.user?.email) {
            setProfileEmail(me.user.email);
          }
        }

        if (dashboardRes.ok) {
          const payload = (await dashboardRes.json()) as Partial<DashboardData>;
          setDashboard({ ...fallbackDashboard, ...payload });
        }

        if (flashcardRes.ok) {
          const payload = (await flashcardRes.json()) as { cards?: FlashCard[] };
          if (payload.cards?.length) {
            setFlashcards(payload.cards);
          }
        }

        if (quizRes.ok) {
          const payload = (await quizRes.json()) as { quizId?: number; questions?: QuizQuestion[] };
          if (payload.quizId) {
            setQuizId(payload.quizId);
          }
          if (payload.questions?.length) {
            setQuizQuestions(payload.questions);
          }
        }

        if (notificationsRes.ok) {
          const payload = (await notificationsRes.json()) as { notifications?: NotificationItem[] };
          setStudentNotifications(payload.notifications ?? []);
        }

        if (achievementsRes.ok) {
          const payload = (await achievementsRes.json()) as {
            badges?: Array<{ id: string; title: string; description: string; progress: number; required: number }>;
          };

          if (payload.badges?.length) {
            setRemoteBadges(
              payload.badges.map((badge) => ({
                ...badge,
                icon: badgeIcon(badge.id),
              })),
            );
          }
        }

        if (gamificationRes.ok) {
          const payload = (await gamificationRes.json()) as XpSnapshot;
          setXpSnapshot(payload);
        }

        if (leaderboardRes.ok) {
          const payload = (await leaderboardRes.json()) as { leaders?: LeaderboardEntry[]; myRank?: number };
          setLeaders(payload.leaders ?? []);
          setMyRank(payload.myRank ?? 0);
        }

        if (badgeRes.ok) {
          const payload = (await badgeRes.json()) as { badges?: GamifiedBadge[] };
          const badges = payload.badges ?? [];
          setGamifiedBadges(badges);
          if (badges.length > 0) {
            setRemoteBadges(
              badges.map((badge) => ({
                id: badge.id,
                title: badge.title,
                description: badge.description,
                progress: badge.progress,
                required: badge.required,
                icon: badgeIcon(badge.id),
              })),
            );
          }
        }
      } catch {
        // Fallback data supports offline development until backend APIs are wired.
      }
    };

    loadData();
  }, []);

  useEffect(() => {
    const loadLeaderboard = async () => {
      try {
        const response = await fetch(`/api/gamification/leaderboard?scope=${leaderboardScope}`, {
          method: 'GET',
          credentials: 'include',
          headers: { Accept: 'application/json' },
        });

        if (!response.ok) {
          return;
        }

        const payload = (await response.json()) as { leaders?: LeaderboardEntry[]; myRank?: number };
        setLeaders(payload.leaders ?? []);
        setMyRank(payload.myRank ?? 0);
      } catch {
        // Keep previous leaderboard state when sync fails.
      }
    };

    loadLeaderboard();
  }, [leaderboardScope]);

  useEffect(() => {
    let mounted = true;

    const syncGamification = async () => {
      try {
        const [meRes, badgesRes] = await Promise.all([
          fetch('/api/gamification/me', { method: 'GET', credentials: 'include', headers: { Accept: 'application/json' } }),
          fetch('/api/gamification/badges', { method: 'GET', credentials: 'include', headers: { Accept: 'application/json' } }),
        ]);

        if (!mounted) {
          return;
        }

        if (meRes.ok) {
          const payload = (await meRes.json()) as XpSnapshot;
          setXpSnapshot(payload);
        }

        if (badgesRes.ok) {
          const payload = (await badgesRes.json()) as { badges?: GamifiedBadge[] };
          setGamifiedBadges(payload.badges ?? []);
        }
      } catch {
        // Continue using local state when sync fails.
      }
    };

    syncGamification();
    const timer = window.setInterval(syncGamification, 15000);

    return () => {
      mounted = false;
      window.clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    if (!practiceStarted || practiceFinished) {
      return;
    }

    timerRef.current = window.setInterval(() => {
      setPracticeTimeLeft((seconds) => {
        if (seconds <= 1) {
          setPracticeFinished(true);
          setPracticeStarted(false);
          return 0;
        }

        return seconds - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current !== null) {
        window.clearInterval(timerRef.current);
      }
    };
  }, [practiceFinished, practiceStarted]);

  useEffect(() => {
    const badgeIds = badgeProgress.filter((badge) => badge.progress >= badge.required).map((badge) => badge.id);
    setNewBadgeIds((current) => {
      if (current.length === badgeIds.length && current.every((id) => badgeIds.includes(id))) {
        return current;
      }

      return badgeIds;
    });
  }, [dashboard.studyStreak, knownCards.length, quizSelections]);

  const filteredSets = useMemo(() => {
    const query = normalizeAnswer(globalSearch);
    if (!query) {
      return dashboard.recentSets;
    }

    return dashboard.recentSets.filter((set) => normalizeAnswer(`${set.title} ${set.owner}`).includes(query));
  }, [dashboard.recentSets, globalSearch]);

  const currentCard = flashcards[cardIndex] ?? null;
  const smartReviewCards = useMemo(() => {
    if (!reviewQueue.length) {
      return flashcards.filter((card) => reviewCards.includes(card.id));
    }

    return reviewQueue;
  }, [flashcards, reviewCards, reviewQueue]);

  const currentQuiz = quizQuestions[quizIndex] ?? null;
  const quizScore = useMemo(() => {
    if (!quizQuestions.length) {
      return 0;
    }

    const correct = quizQuestions.reduce((total, question) => {
      const value = quizSelections[question.id] ?? '';
      return normalizeAnswer(value) === normalizeAnswer(question.answer) ? total + 1 : total;
    }, 0);

    return Math.round((correct / quizQuestions.length) * 100);
  }, [quizQuestions, quizSelections]);

  const practiceScore = useMemo(() => {
    if (!practiceQuestions.length) {
      return 0;
    }

    const correct = practiceQuestions.reduce((total, question) => {
      const answer = practiceAnswers[question.id] ?? '';
      return normalizeAnswer(answer) === normalizeAnswer(question.answer) ? total + 1 : total;
    }, 0);

    return Math.round((correct / practiceQuestions.length) * 100);
  }, [practiceAnswers, practiceQuestions]);

  const localBadgeProgress: BadgeInfo[] = [
    {
      id: 'flashcard-master',
      title: 'Flashcard Master',
      description: 'Mark 20 cards as known.',
      progress: knownCards.length,
      required: 20,
      icon: <BookOpen size={16} />,
    },
    {
      id: 'quiz-champion',
      title: 'Quiz Champion',
      description: 'Reach 85% quiz score.',
      progress: quizScore,
      required: 85,
      icon: <Trophy size={16} />,
    },
    {
      id: 'study-streak',
      title: 'Study Streak',
      description: 'Maintain a 7-day streak.',
      progress: dashboard.studyStreak,
      required: 7,
      icon: <Flame size={16} />,
    },
    {
      id: 'perfect-score',
      title: 'Perfect Score',
      description: 'Get 100% in a practice test.',
      progress: practiceScore,
      required: 100,
      icon: <Target size={16} />,
    },
  ];

  const badgeProgress = remoteBadges && remoteBadges.length > 0 ? remoteBadges : localBadgeProgress;

  const weakSubjects = dashboard.subjectPerformance.filter((item) => item.score < 75);
  const strongSubjects = dashboard.subjectPerformance.filter((item) => item.score >= 85);

  const handleLogout = async () => {
    if (isLoggingOut) {
      return;
    }

    setIsLoggingOut(true);
    try {
      const response = await csrfFetch('/auth/logout', {
        method: 'POST',
        headers: { Accept: 'application/json' },
      });

      if (!response.ok) {
        throw new Error('Logout failed.');
      }

      navigate('/login/student');
    } catch {
      setIsLoggingOut(false);
    }
  };

  const markCard = async (mode: 'known' | 'review') => {
    if (!currentCard) {
      return;
    }

    if (mode === 'known') {
      setKnownCards((current) => (current.includes(currentCard.id) ? current : [...current, currentCard.id]));
      setReviewCards((current) => current.filter((id) => id !== currentCard.id));
    } else {
      setReviewCards((current) => (current.includes(currentCard.id) ? current : [...current, currentCard.id]));
    }

    try {
      await csrfFetch('/api/student/flashcards/progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({
          cardId: currentCard.id,
          status: mode,
        }),
      });
    } catch {
      // Keep local state if API route is not yet available.
    }

    setFlipped(false);
    setCardIndex((index) => (index + 1) % flashcards.length);
  };

  const startSmartReview = () => {
    const difficult = flashcards.filter((card) => reviewCards.includes(card.id));
    if (!difficult.length) {
      return;
    }

    const randomized = shuffleArray(difficult);
    setReviewQueue(randomized);
    setCardIndex(flashcards.findIndex((card) => card.id === randomized[0]?.id));
    setFlipped(false);
  };

  const shuffleCards = () => {
    setFlashcards((current) => shuffleArray(current));
    setCardIndex(0);
    setFlipped(false);
  };

  const selectQuizAnswer = (value: string) => {
    if (!currentQuiz) {
      return;
    }

    setQuizSelections((current) => ({ ...current, [currentQuiz.id]: value }));
  };

  const submitQuizFeedback = () => {
    if (!currentQuiz) {
      return;
    }

    if (currentQuiz.type === 'identification') {
      setQuizSelections((current) => ({ ...current, [currentQuiz.id]: quizInput }));
    }

    const resolved = currentQuiz.type === 'identification' ? quizInput : quizSelections[currentQuiz.id] ?? '';
    const correct = normalizeAnswer(resolved) === normalizeAnswer(currentQuiz.answer);
    setGameFeedback({
      mood: correct ? 'success' : 'warning',
      message: correct ? 'Correct! Keep the streak alive.' : 'Try again. You can do this.',
    });

    setShowFeedback(true);
  };

  const submitQuizAttempt = async () => {
    try {
      const response = await csrfFetch('/api/student/quiz/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({
          quizId,
          answers: quizSelections,
        }),
      });

      if (response.ok) {
        const payload = (await response.json()) as { score?: number; xp?: XpSnapshot };
        if (payload.xp) {
          setXpSnapshot(payload.xp);
        }
        setStudentNotifications((current) => [
          {
            id: `quiz-${Date.now()}`,
            title: 'Quiz submitted',
            message: `Latest score synced: ${payload.score ?? quizScore}%`,
            createdAt: new Date().toISOString(),
          },
          ...current,
        ]);
      }
    } catch {
      // Retain local behavior if sync endpoint is not available.
    }
  };

  const nextQuizQuestion = async () => {
    const isLastQuestion = quizIndex === quizQuestions.length - 1;
    if (isLastQuestion && Object.keys(quizSelections).length > 0) {
      await submitQuizAttempt();
    }

    setShowFeedback(false);
    setQuizInput('');
    setQuizIndex((index) => (index + 1) % quizQuestions.length);
  };

  const startPracticeTest = () => {
    const randomized = randomizeQuestions(quizQuestions);
    setPracticeQuestions(randomized);
    setPracticeAnswers({});
    setPracticeIndex(0);
    setPracticeTimeLeft(randomized.length * 45);
    setPracticeStarted(true);
    setPracticeFinished(false);
  };

  const updatePracticeAnswer = (value: string) => {
    const current = practiceQuestions[practiceIndex];
    if (!current) {
      return;
    }

    setPracticeAnswers((answers) => ({ ...answers, [current.id]: value }));
  };

  const finishPractice = () => {
    setPracticeFinished(true);
    setPracticeStarted(false);
    if (timerRef.current !== null) {
      window.clearInterval(timerRef.current);
    }
  };

  const renderDashboard = () => (
    <div className="ss-grid">
      <section className="ss-panel">
        <XpProgressBar snapshot={xpSnapshot} />
      </section>

      <section className="ss-panel">
        <LeaderboardTable leaders={leaders} myRank={myRank} scope={leaderboardScope} onScope={setLeaderboardScope} />
      </section>

      <section className="ss-panel ss-gradient-panel">
        <div className="ss-kpi-grid">
          <article className="ss-kpi-card">
            <p>Study Progress</p>
            <h3>{dashboard.progressPercent}%</h3>
            <div className="ss-meter">
              <span style={{ width: `${dashboard.progressPercent}%` }} />
            </div>
          </article>
          <article className="ss-kpi-card">
            <p>Completion Rate</p>
            <h3>{dashboard.completionRate}%</h3>
            <div className="ss-meter">
              <span style={{ width: `${dashboard.completionRate}%` }} />
            </div>
          </article>
          <article className="ss-kpi-card">
            <p>Study Streak</p>
            <h3>{dashboard.studyStreak} days</h3>
            <small>Keep it going for your next badge.</small>
          </article>
          <article className="ss-kpi-card">
            <p>Quiz Score</p>
            <h3>{quizScore}%</h3>
            <small>Instantly updated from quiz module.</small>
          </article>
        </div>
      </section>

      <section className="ss-panel">
        <div className="ss-panel-head">
          <h2>Recent Study Sets</h2>
          <Sparkles size={16} />
        </div>
        <div className="ss-card-list">
          {dashboard.recentSets.map((set) => (
            <article key={set.id} className="ss-list-card">
              <div>
                <h3>{set.title}</h3>
                <p>
                  {set.cards} cards · {set.owner}
                </p>
              </div>
              <span>{set.updatedAt}</span>
            </article>
          ))}
        </div>
      </section>

      <section className="ss-panel">
        <NotificationCenter
          title="Live Notifications"
          items={studentNotifications}
          emptyText="No notifications yet."
        />
      </section>

      <section className="ss-panel">
        <div className="ss-panel-head">
          <h2>Score Trend</h2>
          <BarChart3 size={16} />
        </div>
        <div className="ss-chart-wrap">
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={dashboard.weeklyScores}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="day" />
              <YAxis domain={[0, 100]} />
              <Tooltip />
              <Line type="monotone" dataKey="score" stroke="#0e7490" strokeWidth={3} dot={{ r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className="ss-panel">
        <div className="ss-panel-head">
          <h2>Progress by Week</h2>
          <Target size={16} />
        </div>
        <div className="ss-chart-wrap">
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={dashboard.weeklyProgress}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="week" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="completed" fill="#f97316" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>
    </div>
  );

  const renderFlashcards = () => (
    <div className="ss-grid">
      <section className="ss-panel">
        <div className="ss-panel-head">
          <h2>Flashcard Learning</h2>
          <div className="ss-inline-actions">
            <button type="button" className="ss-chip-btn" onClick={shuffleCards}>
              <Shuffle size={14} /> Shuffle
            </button>
            <button type="button" className="ss-chip-btn" onClick={startSmartReview}>
              <Brain size={14} /> Smart Review
            </button>
          </div>
        </div>

        <button type="button" className={`ss-flip-card ${flipped ? 'is-flipped' : ''}`} onClick={() => setFlipped((prev) => !prev)}>
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
  );

  const renderQuiz = () => {
    if (!currentQuiz) {
      return null;
    }

    const currentAnswer = quizSelections[currentQuiz.id] ?? '';
    const isCorrect = normalizeAnswer(currentAnswer) === normalizeAnswer(currentQuiz.answer);

    return (
      <div className="ss-grid">
        <section className="ss-panel">
          <div className="ss-panel-head">
            <h2>Quiz System</h2>
            <span className="ss-pill">
              Question {quizIndex + 1}/{quizQuestions.length}
            </span>
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
                onChange={(event) => setQuizInput(event.target.value)}
              />
            )}

            <div className="ss-inline-actions">
              <button type="button" className="ss-chip-btn" onClick={submitQuizFeedback}>
                Submit
              </button>
              <button type="button" className="ss-chip-btn" onClick={nextQuizQuestion}>
                Next Question
              </button>
            </div>

            {showFeedback && (
              <div className={`ss-feedback ${isCorrect ? 'is-correct' : 'is-wrong'}`}>
                <p>{isCorrect ? 'Correct answer. Nice work.' : 'Not quite. Keep reviewing.'}</p>
                <small>
                  Correct answer: <strong>{currentQuiz.answer}</strong>
                </small>
                <small>{currentQuiz.explanation}</small>
              </div>
            )}

            {gameFeedback && <GameFeedbackCard mood={gameFeedback.mood} message={gameFeedback.message} />}
          </article>
        </section>

        <section className="ss-panel">
          <div className="ss-panel-head">
            <h2>Quiz Summary</h2>
            <Trophy size={16} />
          </div>
          <div className="ss-kpi-grid ss-kpi-grid-2">
            <article className="ss-kpi-card">
              <p>Current Score</p>
              <h3>{quizScore}%</h3>
            </article>
            <article className="ss-kpi-card">
              <p>Answered</p>
              <h3>{Object.keys(quizSelections).length}</h3>
            </article>
          </div>
          <p className="ss-insight">Instant feedback and answer explanations are shown right after each submission.</p>
        </section>
      </div>
    );
  };

  const renderPractice = () => {
    const activeQuestion = practiceQuestions[practiceIndex] ?? null;

    if (!practiceStarted && !practiceFinished) {
      return (
        <section className="ss-panel">
          <div className="ss-panel-head">
            <h2>Practice Test Mode</h2>
            <Clock3 size={16} />
          </div>
          <p className="ss-insight">Timed mode with randomized questions and a final score report.</p>
          <button type="button" className="ss-chip-btn" onClick={startPracticeTest}>
            Start Practice Test
          </button>
        </section>
      );
    }

    if (practiceFinished) {
      return (
        <section className="ss-panel">
          <div className="ss-panel-head">
            <h2>Final Score Report</h2>
            <Award size={16} />
          </div>
          <div className="ss-kpi-grid ss-kpi-grid-2">
            <article className="ss-kpi-card">
              <p>Practice Score</p>
              <h3>{practiceScore}%</h3>
            </article>
            <article className="ss-kpi-card">
              <p>Questions Attempted</p>
              <h3>{Object.keys(practiceAnswers).length}</h3>
            </article>
          </div>
          <button type="button" className="ss-chip-btn" onClick={startPracticeTest}>
            <RotateCcw size={14} /> Retake
          </button>
        </section>
      );
    }

    return (
      <section className="ss-panel">
        <div className="ss-panel-head">
          <h2>Practice Test In Progress</h2>
          <span className="ss-pill">Time left: {practiceTimeLeft}s</span>
        </div>

        {activeQuestion && (
          <article className="ss-question-card">
            <small>
              Question {practiceIndex + 1}/{practiceQuestions.length}
            </small>
            <h3>{activeQuestion.prompt}</h3>

            {(activeQuestion.type === 'multiple_choice' || activeQuestion.type === 'true_false') && (
              <div className="ss-option-grid">
                {(activeQuestion.choices ?? []).map((choice) => (
                  <button
                    key={choice}
                    type="button"
                    className={`ss-option-btn ${practiceAnswers[activeQuestion.id] === choice ? 'is-selected' : ''}`}
                    onClick={() => updatePracticeAnswer(choice)}
                  >
                    {choice}
                  </button>
                ))}
              </div>
            )}

            {activeQuestion.type === 'identification' && (
              <input
                className="ss-input"
                placeholder="Type your answer"
                value={practiceAnswers[activeQuestion.id] ?? ''}
                onChange={(event) => updatePracticeAnswer(event.target.value)}
              />
            )}

            <div className="ss-inline-actions">
              <button
                type="button"
                className="ss-chip-btn"
                onClick={() => setPracticeIndex((index) => Math.min(index + 1, practiceQuestions.length - 1))}
              >
                Next
              </button>
              <button type="button" className="ss-danger-btn" onClick={finishPractice}>
                Finish Test
              </button>
            </div>
          </article>
        )}
      </section>
    );
  };

  const renderReports = () => (
    <div className="ss-grid">
      <section className="ss-panel">
        <div className="ss-panel-head">
          <h2>Reports & Analytics</h2>
          <BarChart3 size={16} />
        </div>
        <p className="ss-insight">Performance insights based on your study logs and quiz outcomes.</p>
        <div className="ss-chart-wrap">
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={dashboard.subjectPerformance}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="subject" />
              <YAxis domain={[0, 100]} />
              <Tooltip />
              <Bar dataKey="score" fill="#0891b2" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className="ss-panel">
        <div className="ss-panel-head">
          <h2>Study History Logs</h2>
          <Clock3 size={16} />
        </div>
        <div className="ss-card-list">
          {dashboard.sessionLogs.map((session) => (
            <article key={session.id} className="ss-list-card">
              <div>
                <h3>{session.topic}</h3>
                <p>
                  {session.date} · {session.minutes} mins
                </p>
              </div>
              <span>{session.score}%</span>
            </article>
          ))}
        </div>
      </section>

      <section className="ss-panel">
        <div className="ss-panel-head">
          <h2>Strengths & Weaknesses</h2>
          <Brain size={16} />
        </div>
        <h3 className="ss-sub-title">Strong Subjects</h3>
        <p className="ss-insight">{strongSubjects.map((item) => item.subject).join(', ') || 'Keep practicing to discover strengths.'}</p>
        <h3 className="ss-sub-title">Needs Focus</h3>
        <p className="ss-insight">{weakSubjects.map((item) => item.subject).join(', ') || 'No weak subjects right now.'}</p>
      </section>
    </div>
  );

  const renderAchievements = () => (
    <section className="ss-panel">
      <div className="ss-panel-head">
        <h2>Achievements & Badges</h2>
        <Medal size={16} />
      </div>
      <div className="ss-card-list">
        {badgeProgress.map((badge) => {
          const earned = badge.progress >= badge.required;
          return (
            <article key={badge.id} className={`ss-list-card ${earned ? 'is-earned' : ''}`}>
              <div>
                <h3>
                  {badge.icon} {badge.title}
                </h3>
                <p>{badge.description}</p>
                <div className="ss-meter">
                  <span style={{ width: `${Math.min((badge.progress / badge.required) * 100, 100)}%` }} />
                </div>
              </div>
              <span>
                {badge.progress}/{badge.required}
              </span>
            </article>
          );
        })}
      </div>

      {gamifiedBadges.length > 0 && <BadgeGallery badges={gamifiedBadges} />}

      {newBadgeIds.length > 0 && (
        <div className="ss-notice">
          <Trophy size={16} />
          <p>New badge unlocked. You earned {newBadgeIds.length} achievement(s).</p>
        </div>
      )}
    </section>
  );

  const renderSearchAndCollab = () => (
    <section className="ss-panel">
      <div className="ss-panel-head">
        <h2>Search & Collaboration</h2>
        <Users size={16} />
      </div>
      <p className="ss-insight">Search study sets, browse public materials, and access shared content from your groups.</p>

      <LeaderboardTable leaders={leaders} myRank={myRank} scope={leaderboardScope} onScope={setLeaderboardScope} />

      <div className="ss-card-list">
        {filteredSets.map((set) => (
          <article key={set.id} className="ss-list-card">
            <div>
              <h3>{set.title}</h3>
              <p>
                {set.cards} cards · shared by {set.owner}
              </p>
            </div>
            <span>{set.updatedAt}</span>
          </article>
        ))}
      </div>
    </section>
  );

  const renderCurrentPage = () => {
    switch (location.pathname) {
      case '/student-dashboard/flashcards':
        return renderFlashcards();
      case '/student-dashboard/quiz':
        return renderQuiz();
      case '/student-dashboard/practice-tests':
        return renderPractice();
      case '/student-dashboard/reports':
        return renderReports();
      case '/student-dashboard/achievements':
        return renderAchievements();
      case '/student-dashboard/library':
      case '/student-dashboard/study-groups':
      case '/student-dashboard/notifications':
        return renderSearchAndCollab();
      default:
        return renderDashboard();
    }
  };

  return (
    <div className="ss-page">
      <aside className="ss-sidebar">
        <div className="ss-brand">
          <div className="ss-brand-mark">SE</div>
          <div>
            <p>Student Engine</p>
            <small>Interactive Learning</small>
          </div>
        </div>

        <nav className="ss-nav">
          {navItems.map((item) => (
            <button
              key={item.path}
              type="button"
              className={`ss-nav-item ${location.pathname === item.path ? 'is-active' : ''}`}
              onClick={() => navigate(item.path)}
            >
              {item.icon}
              <span>{item.label}</span>
            </button>
          ))}
        </nav>
      </aside>

      <main className="ss-main">
        <header className="ss-topbar">
          <div className="ss-search">
            <Search size={16} />
            <input
              placeholder="Search study sets, topics, and collaborators"
              value={globalSearch}
              onChange={(event) => setGlobalSearch(event.target.value)}
            />
          </div>

          <div className="ss-user-actions">
            <div className="ss-user-chip">
              <span>{profileInitials}</span>
              <div>
                <p>{profileName}</p>
                <small>{profileEmail}</small>
              </div>
            </div>
            <button type="button" className="ss-chip-btn" onClick={handleLogout}>
              <LogOut size={14} />
              {isLoggingOut ? 'Signing out...' : 'Sign out'}
            </button>
          </div>
        </header>

        <section className="dashboard-page-transition">{renderCurrentPage()}</section>
      </main>
    </div>
  );
}
