import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { csrfFetch } from '../../lib/csrf';
import {
  BadgeGallery,
  GameFeedbackCard,
  LeaderboardTable,
  XpProgressBar,
  type GamifiedBadge,
  type LeaderboardEntry,
  type XpSnapshot,
} from '../../components/ui/GamificationWidgets';
import {
  Award,
  BarChart3,
  Bell,
  BookOpen,
  Brain,
  Check,
  Clock3,
  FileText,
  Flame,
  HelpCircle,
  Home,
  Layers,
  LogOut,
  Medal,
  Mail,
  RotateCcw,
  Shuffle,
  Target,
  Trophy,
  Settings,
  Moon,
  Trash2,
  Users,
  X,
} from 'lucide-react';
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

type AuthMeResponse = {
  user?: {
    name?: string;
    email?: string;
    profileImageUrl?: string | null;
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

type ClassMaterial = {
  id: string;
  title: string;
  description: string;
  type: string;
  uploadedBy: string;
  uploadedAt: string;
  fileUrl?: string;
  className?: string;
};

type SubjectPerformance = {
  subject: string;
  score: number;
};

type NotificationItem = {
  id: string;
  type?: string;
  title: string;
  message: string;
  read?: boolean;
  createdAt?: string | null;
};

type AssignedActivity = {
  id: number;
  title: string;
  description: string | null;
  subject: string | null;
  schedule: string | null;
  className: string;
  teacherName: string;
  flashcardsCount: number;
  quizQuestionsCount: number;
  hasAttempted: boolean;
  createdAt: string;
  updatedAt: string;
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

const fallbackSets: StudySet[] = [];
const fallbackCards: FlashCard[] = [];
const fallbackQuestions: QuizQuestion[] = [];

const fallbackDashboard: DashboardData = {
  progressPercent: 0,
  completionRate: 0,
  studyStreak: 0,
  weeklyScores: [],
  weeklyProgress: [],
  recentSets: fallbackSets,
  sessionLogs: [],
  subjectPerformance: [],
};

const navItems: StudentNav[] = [
  { label: 'Dashboard', path: '/student-dashboard', icon: <Home size={18} /> },
  { label: 'Classes', path: '/student-dashboard/classes', icon: <BookOpen size={18} /> },
  { label: 'Activity', path: '/student-dashboard/activity', icon: <Brain size={18} /> },
  { label: 'Test', path: '/student-dashboard/practice-tests', icon: <FileText size={18} /> },
  { label: 'Reports', path: '/student-dashboard/reports', icon: <BarChart3 size={18} /> },
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

export default function StudentDashboard() {
  const navigate = useNavigate();
  const location = useLocation();

  const [dashboard, setDashboard] = useState<DashboardData>(fallbackDashboard);
  const [flashcards, setFlashcards] = useState<FlashCard[]>(fallbackCards);
  const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[]>(fallbackQuestions);
  const [quizId, setQuizId] = useState<number | null>(null);
  const [quizCompleted, setQuizCompleted] = useState(false);
  const [studentNotifications, setStudentNotifications] = useState<NotificationItem[]>([]);
  const [remoteBadges, setRemoteBadges] = useState<Array<{ id: string; title: string; description: string; progress: number; required: number; icon: React.ReactNode }> | null>(null);
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
  const [classMaterials, setClassMaterials] = useState<ClassMaterial[]>([]);
  const [assignedActivities, setAssignedActivities] = useState<AssignedActivity[]>([]);
  const [isLoadingActivities, setIsLoadingActivities] = useState(true);
  const [classMembers, setClassMembers] = useState<Array<{ id: string; name: string; avatar: string | null; isOnline: boolean }>>([]);

  // Profile & UI state
  const [profileName, setProfileName] = useState('');
  const [profileEmail, setProfileEmail] = useState('');
  const [profileImageUrl, setProfileImageUrl] = useState<string | null>(null);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [isMailMenuOpen, setIsMailMenuOpen] = useState(false);
  const [isNotificationsMenuOpen, setIsNotificationsMenuOpen] = useState(false);
  const [activeMailItem, setActiveMailItem] = useState<NotificationItem | null>(null);
  const [draftProfileImagePreview, setDraftProfileImagePreview] = useState('');
  const [draftProfileImageFile, setDraftProfileImageFile] = useState<File | null>(null);
  const [profileError, setProfileError] = useState('');
  const [isProfileSaving, setIsProfileSaving] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [globalSearch, setGlobalSearch] = useState('');
  const [isMailDeleting, setIsMailDeleting] = useState(false);
  const [mailDeletingItemId, setMailDeletingItemId] = useState<string | null>(null);
  
  // Activity tab management
  const [activeActivityTab, setActiveActivityTab] = useState<'materials' | 'members'>('materials');
  const [expandedMaterials, setExpandedMaterials] = useState<Set<string>>(new Set());
  
  // Classes tab management
  const [activeClassesTab, setActiveClassesTab] = useState<'materials' | 'members'>('materials');

  const timerRef = useRef<number | null>(null);
  const profileInitials = profileName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((name) => name[0]?.toUpperCase() ?? '')
    .join('') || 'SL';

  useEffect(() => {
    document.body.classList.toggle('is-student-dark-mode', isDarkMode);

    return () => {
      document.body.classList.remove('is-student-dark-mode');
    };
  }, [isDarkMode]);

  useEffect(() => {
    if (!isProfileMenuOpen && !isMailMenuOpen && !isNotificationsMenuOpen) {
      return undefined;
    }

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.closest('.ss-user-menu-anchor')) {
        return;
      }

      setIsProfileMenuOpen(false);
      setIsMailMenuOpen(false);
      setIsNotificationsMenuOpen(false);
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsProfileMenuOpen(false);
        setIsMailMenuOpen(false);
        setIsNotificationsMenuOpen(false);
      }
    };

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isMailMenuOpen, isNotificationsMenuOpen, isProfileMenuOpen]);

  useEffect(() => {
    if (!activeMailItem) {
      return undefined;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setActiveMailItem(null);
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [activeMailItem]);

  useEffect(() => {
    if (!draftProfileImagePreview.startsWith('blob:')) {
      return undefined;
    }

    return () => URL.revokeObjectURL(draftProfileImagePreview);
  }, [draftProfileImagePreview]);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [meRes, dashboardRes, flashcardRes, quizRes, notificationsRes, achievementsRes, gamificationRes, leaderboardRes, badgeRes, classRes, membersRes] = await Promise.all([
          fetch('/auth/me', { method: 'GET', credentials: 'include', headers: { Accept: 'application/json' } }),
          fetch('/api/student/dashboard', { method: 'GET', credentials: 'include', headers: { Accept: 'application/json' } }),
          fetch('/api/student/flashcards', { method: 'GET', credentials: 'include', headers: { Accept: 'application/json' } }),
          fetch('/api/student/quiz/questions', { method: 'GET', credentials: 'include', headers: { Accept: 'application/json' } }),
          fetch('/api/student/notifications', { method: 'GET', credentials: 'include', headers: { Accept: 'application/json' } }),
          fetch('/api/student/achievements', { method: 'GET', credentials: 'include', headers: { Accept: 'application/json' } }),
          fetch('/api/gamification/me', { method: 'GET', credentials: 'include', headers: { Accept: 'application/json' } }),
          fetch('/api/gamification/leaderboard?scope=weekly', { method: 'GET', credentials: 'include', headers: { Accept: 'application/json' } }),
          fetch('/api/gamification/badges', { method: 'GET', credentials: 'include', headers: { Accept: 'application/json' } }),
          fetch('/api/student/class-materials', { method: 'GET', credentials: 'include', headers: { Accept: 'application/json' } }),
          fetch('/api/student/class-members', { method: 'GET', credentials: 'include', headers: { Accept: 'application/json' } }),
        ]);

        if (meRes.ok) {
          const me = (await meRes.json()) as AuthMeResponse;
          if (me.user?.name) {
            setProfileName(me.user.name);
          }
          if (me.user?.email) {
            setProfileEmail(me.user.email);
          }

          setProfileImageUrl(me.user?.profileImageUrl ?? null);
        }

        if (dashboardRes.ok) {
          const payload = (await dashboardRes.json()) as Partial<DashboardData>;
          setDashboard({ ...fallbackDashboard, ...payload });
        }

        if (flashcardRes.ok) {
          const payload = (await flashcardRes.json()) as { cards?: FlashCard[] };
          setFlashcards(payload.cards ?? []);
        }

        if (quizRes.ok) {
          const payload = (await quizRes.json()) as { quizId?: number | null; questions?: QuizQuestion[]; completed?: boolean };
          if (payload.quizId) {
            setQuizId(payload.quizId);
            setQuizCompleted(false);
          } else {
            setQuizId(null);
            setQuizCompleted(payload.completed ?? true);
          }
          setQuizQuestions(payload.questions ?? []);
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

        if (classRes.ok) {
          const payload = (await classRes.json()) as { materials?: ClassMaterial[] };
          setClassMaterials(payload.materials ?? []);
        }

        if (membersRes.ok) {
          const payload = (await membersRes.json()) as { members?: Array<{ id: string; name: string; avatar: string | null; isOnline: boolean }> };
          setClassMembers(payload.members ?? []);
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

  // Fetch assigned activities
  useEffect(() => {
    const fetchActivities = async () => {
      try {
        setIsLoadingActivities(true);
        const response = await csrfFetch('/api/student/activities');
        if (response.ok) {
          const data = await response.json();
          setAssignedActivities(data.activities || []);
        }
      } catch (error) {
        console.error('Failed to fetch activities:', error);
      } finally {
        setIsLoadingActivities(false);
      }
    };
    fetchActivities();
  }, []);

  // Handle URL-based tab selection for Activity section
  useEffect(() => {
    if (location.pathname === '/student-dashboard/activity') {
      // Keep current tab
    } else if (location.pathname === '/student-dashboard/flashcards' || location.pathname === '/student-dashboard/quiz' || location.pathname === '/student-dashboard/practice-tests') {
      // Legacy URLs default to materials tab
      setActiveActivityTab('materials');
    }
  }, [location.pathname]);

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

  const badgeProgress = remoteBadges ?? [];

  const teacherAnnouncements = useMemo(
    () => studentNotifications.filter((item) => item.type === 'announcement'),
    [studentNotifications],
  );

  const unreadTeacherAnnouncementsCount = useMemo(
    () => teacherAnnouncements.filter((item) => !item.read).length,
    [teacherAnnouncements],
  );

  const quizUploadNotifications = useMemo(
    () =>
      studentNotifications.filter((item) => {
        if (item.type !== 'assignment') {
          return false;
        }

        return /quiz/i.test(`${item.title} ${item.message}`);
      }),
    [studentNotifications],
  );

  const unreadQuizUploadNotificationsCount = useMemo(
    () => quizUploadNotifications.filter((item) => !item.read).length,
    [quizUploadNotifications],
  );

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
    } catch {
      setIsLoggingOut(false);
      return;
    }

    window.location.replace('/login/student');
  };

  const openProfileModal = () => {
    setDraftProfileImageFile(null);
    setDraftProfileImagePreview(profileImageUrl ?? '');
    setProfileError('');
    setIsMailMenuOpen(false);
    setIsNotificationsMenuOpen(false);
    setIsProfileMenuOpen((current) => !current);
  };

  const openMailMenu = () => {
    setIsProfileMenuOpen(false);
    setIsNotificationsMenuOpen(false);
    setIsMailMenuOpen((current) => !current);
  };

  const openNotificationsMenu = () => {
    setIsProfileMenuOpen(false);
    setIsMailMenuOpen(false);
    setIsNotificationsMenuOpen((current) => !current);
  };

  const formatNotificationTime = (createdAt?: string | null): string => {
    if (!createdAt) {
      return 'Just now';
    }

    const date = new Date(createdAt);
    if (Number.isNaN(date.getTime())) {
      return 'Just now';
    }

    return date.toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  const markMailAsRead = async () => {
    if (unreadTeacherAnnouncementsCount === 0) {
      return;
    }

    try {
      const response = await csrfFetch('/api/student/notifications/read-all', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ type: 'announcement' }),
      });

      if (!response.ok) {
        return;
      }

      setStudentNotifications((current) =>
        current.map((item) => (item.type === 'announcement' ? { ...item, read: true } : item)),
      );
    } catch {
      // Keep current state if the notification update request fails.
    }
  };

  const openMailMessage = (item: NotificationItem) => {
    setIsMailMenuOpen(false);
    setActiveMailItem(item);
  };

  const closeMailMessage = () => {
    if (isMailDeleting) {
      return;
    }

    setActiveMailItem(null);
  };

  const mailSenderName = profileName ? `${profileName.split(' ')[0]}'s Teacher` : 'Your Teacher';

  const deleteMailById = async (notificationId: string, closeModalAfterDelete = false) => {
    if (mailDeletingItemId || (closeModalAfterDelete && isMailDeleting)) {
      return;
    }

    setMailDeletingItemId(notificationId);
    if (closeModalAfterDelete) {
      setIsMailDeleting(true);
    }

    try {
      const response = await csrfFetch(`/api/student/notifications/${notificationId}`, {
        method: 'DELETE',
        headers: { Accept: 'application/json' },
      });

      if (!response.ok) {
        return;
      }

      setStudentNotifications((current) => current.filter((item) => item.id !== notificationId));
      if (activeMailItem?.id === notificationId) {
        setActiveMailItem(null);
      }
    } catch {
      // Keep current UI state when delete request fails.
    } finally {
      setMailDeletingItemId(null);
      if (closeModalAfterDelete) {
        setIsMailDeleting(false);
      }
    }
  };

  const deleteMailMessage = async () => {
    if (!activeMailItem || isMailDeleting) {
      return;
    }

    await deleteMailById(activeMailItem.id, true);
  };

  const openProfileSettings = () => {
    setIsProfileMenuOpen(false);
    navigate('/student-dashboard/settings');
  };

  const closeProfileModal = () => {
    if (draftProfileImagePreview.startsWith('blob:')) {
      URL.revokeObjectURL(draftProfileImagePreview);
    }

    setDraftProfileImageFile(null);
    setDraftProfileImagePreview('');
    setIsProfileMenuOpen(false);
    setIsProfileModalOpen(false);
  };

  const saveProfileImage = async () => {
    setIsProfileSaving(true);
    setProfileError('');

    try {
      const formData = new FormData();

      if (draftProfileImageFile) {
        formData.append('profileImage', draftProfileImageFile);
      }

      const response = await csrfFetch('/auth/profile', {
        method: 'PATCH',
        headers: { Accept: 'application/json' },
        body: formData,
      });

      if (!response.ok) {
        setProfileError('Unable to save profile image right now.');
        return;
      }

      const payload = (await response.json()) as AuthMeResponse;
      setProfileImageUrl(payload.user?.profileImageUrl ?? (draftProfileImagePreview || null));
      closeProfileModal();
    } catch {
      setProfileError('Unable to save profile image right now.');
    } finally {
      setIsProfileSaving(false);
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
    if (!quizQuestions.length) {
      return;
    }

    const isLastQuestion = quizIndex === quizQuestions.length - 1;
    if (isLastQuestion) {
      await submitQuizAttempt();
    }

    setShowFeedback(false);
    setQuizInput('');

    if (isLastQuestion) {
      setQuizCompleted(true);
      return;
    }

    setQuizIndex((index) => index + 1);
  };

  const startPracticeTest = () => {
    if (!quizQuestions.length) {
      return;
    }

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
          <h2>Score Trend</h2>
          <BarChart3 size={16} />
        </div>
        {dashboard.weeklyScores.length === 0 ? (
          <p className="ss-empty">No score data available yet. Complete quizzes to see your progress.</p>
        ) : (
          <div className="ss-chart-wrap">
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={dashboard.weeklyScores}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="day" />
                <YAxis domain={[0, 100]} />
                <Tooltip />
                <Line type="monotone" dataKey="score" stroke="#2563eb" strokeWidth={3} dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </section>

      <section className="ss-panel">
        <div className="ss-panel-head">
          <h2>Progress by Week</h2>
          <Target size={16} />
        </div>
        {dashboard.weeklyProgress.length === 0 ? (
          <p className="ss-empty">No weekly progress data yet. Start learning to track your progress.</p>
        ) : (
          <div className="ss-chart-wrap">
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={dashboard.weeklyProgress}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="week" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="completed" fill="#3b82f6" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
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

        {flashcards.length === 0 ? (
          <p className="ss-empty">No flashcards available yet.</p>
        ) : (
          <>
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
  );

  const renderQuiz = () => {
    if (quizCompleted && quizQuestions.length === 0) {
      return (
        <section className="ss-panel">
          <div className="ss-panel-head">
            <h2>Quiz System</h2>
            <HelpCircle size={16} />
          </div>
          <p className="ss-empty">All assigned quizzes are completed.</p>
        </section>
      );
    }

    if (quizCompleted) {
      return (
        <section className="ss-panel">
          <div className="ss-panel-head">
            <h2>Quiz System</h2>
            <HelpCircle size={16} />
          </div>
          <p className="ss-empty">Quiz completed. Wait for new content from your teacher.</p>
        </section>
      );
    }

    if (!currentQuiz) {
      return (
        <section className="ss-panel">
          <div className="ss-panel-head">
            <h2>Quiz System</h2>
            <HelpCircle size={16} />
          </div>
          <p className="ss-empty">No quiz questions available yet.</p>
        </section>
      );
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
            <h2>Test Mode</h2>
            <Clock3 size={16} />
          </div>
          <p className="ss-insight">
            {quizQuestions.length > 0
              ? 'Timed mode with randomized questions and a final score report.'
              : 'No practice questions available yet.'}
          </p>
          <button type="button" className="ss-chip-btn" onClick={startPracticeTest} disabled={quizQuestions.length === 0}>
            Start Test
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
          <h2>Test In Progress</h2>
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
        {dashboard.subjectPerformance.length === 0 ? (
          <p className="ss-empty">No report data yet.</p>
        ) : (
          <>
            <p className="ss-insight">Performance insights based on your study logs and quiz outcomes.</p>
            <div className="ss-chart-wrap">
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={dashboard.subjectPerformance}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="subject" />
                  <YAxis domain={[0, 100]} />
                  <Tooltip />
                  <Bar dataKey="score" fill="#2563eb" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </>
        )}
      </section>

      <section className="ss-panel">
        <div className="ss-panel-head">
          <h2>Study History Logs</h2>
          <Clock3 size={16} />
        </div>
        <div className="ss-card-list">
          {dashboard.sessionLogs.length === 0 ? (
            <p className="ss-empty">No study history yet.</p>
          ) : (
            dashboard.sessionLogs.map((session) => (
              <article key={session.id} className="ss-list-card">
                <div>
                  <h3>{session.topic}</h3>
                  <p>
                    {session.date} · {session.minutes} mins
                  </p>
                </div>
                <span>{session.score}%</span>
              </article>
            ))
          )}
        </div>
      </section>

      <section className="ss-panel">
        <div className="ss-panel-head">
          <h2>Strengths & Weaknesses</h2>
          <Brain size={16} />
        </div>
        {dashboard.subjectPerformance.length === 0 ? (
          <p className="ss-empty">No strengths or weaknesses data yet.</p>
        ) : (
          <>
            <h3 className="ss-sub-title">Strong Subjects</h3>
            <p className="ss-insight">{strongSubjects.map((item) => item.subject).join(', ') || 'Keep practicing to discover strengths.'}</p>
            <h3 className="ss-sub-title">Needs Focus</h3>
            <p className="ss-insight">{weakSubjects.map((item) => item.subject).join(', ') || 'No weak subjects right now.'}</p>
          </>
        )}
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
        {badgeProgress.length === 0 ? (
          <p className="ss-empty">No achievements yet.</p>
        ) : (
          badgeProgress.map((badge) => {
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
          })
        )}
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

  const renderClasses = () => {
    // Get unique class names from materials
    const uniqueClasses = Array.from(new Set(classMaterials.map(m => m.className).filter(Boolean)));
    const displayClassName = uniqueClasses.length === 1 ? uniqueClasses[0] : uniqueClasses.length > 1 ? 'Your Classes' : 'Your Class';

    return (
      <div className="ss-activity-container">
        <div className="ss-activity-header">
          <div className="ss-activity-header-main">
            <h1 className="ss-activity-class-name">{displayClassName}</h1>
            <p className="ss-activity-class-location">
              <BookOpen size={14} /> View and study lessons from your teachers
            </p>
          </div>
        </div>

        <div className="ss-activity-tabs">
          <button
            type="button"
            className={`ss-activity-tab ${activeClassesTab === 'materials' ? 'is-active' : ''}`}
            onClick={() => setActiveClassesTab('materials')}
          >
            Materials
          </button>
          <button
            type="button"
            className={`ss-activity-tab ${activeClassesTab === 'members' ? 'is-active' : ''}`}
            onClick={() => setActiveClassesTab('members')}
          >
            Members
          </button>
        </div>

        {activeClassesTab === 'materials' ? (
          <div className="ss-activity-content">
            {classMaterials.length === 0 ? (
              <div className="ss-activity-empty">
                <p>No materials available yet.</p>
              </div>
            ) : (
              classMaterials.map((material) => (
                <div key={material.id} className="ss-activity-section">
                  <div className="ss-activity-time-label">{material.uploadedAt}</div>
                  
                  <div className="ss-material-card ss-material-card-inline">
                    <div className="ss-material-icon">
                      <BookOpen size={20} />
                    </div>
                    <div className="ss-material-info">
                      <h3 className="ss-material-title">{material.title}</h3>
                      <p className="ss-material-meta">
                        {material.type} {material.className ? `• ${material.className}` : ''} • Uploaded by {material.uploadedBy}
                      </p>
                      {material.description && (
                        <p className="ss-material-description">{material.description}</p>
                      )}
                    </div>
                    {material.fileUrl && (
                      <a 
                        href={material.fileUrl} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="ss-chip-btn"
                      >
                        View
                      </a>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        ) : (
          <div className="ss-activity-content">
            <div className="ss-members-section">
              <button
                type="button"
                className="ss-members-header"
                onClick={() => setExpandedMaterials((prev) => {
                  const next = new Set(prev);
                  if (next.has('classes-members-list')) {
                    next.delete('classes-members-list');
                  } else {
                    next.add('classes-members-list');
                  }
                  return next;
                })}
              >
                <span className="ss-members-count">{classMembers.length} members</span>
                <span className={`ss-members-toggle ${expandedMaterials.has('classes-members-list') ? 'is-expanded' : ''}`}>
                  <Target size={16} />
                </span>
              </button>

              {expandedMaterials.has('classes-members-list') && classMembers.length > 0 && (
                <div className="ss-members-list">
                  {classMembers.map((member) => (
                    <div key={member.id} className="ss-member-item">
                      <div className="ss-member-avatar">
                        {member.avatar ? (
                          <img src={member.avatar} alt={member.name} className="ss-member-avatar-img" />
                        ) : (
                          <span className="ss-member-avatar-text">
                            {member.name
                              .split(' ')
                              .slice(0, 2)
                              .map((n) => n[0]?.toUpperCase() ?? '')
                              .join('')}
                          </span>
                        )}
                        {member.isOnline && <span className="ss-member-online-badge" />}
                      </div>
                      <span className="ss-member-name">{member.name}</span>
                    </div>
                  ))}
                </div>
              )}

              {classMembers.length === 0 && (
                <div className="ss-activity-empty" style={{ marginTop: '1rem' }}>
                  <p>No members yet.</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderSearchAndCollab = () => (
    <section className="ss-panel">
      <div className="ss-panel-head">
        <h2>Search & Collaboration</h2>
        <Users size={16} />
      </div>
      <p className="ss-insight">Search study sets, browse public materials, and access shared content from your groups.</p>

      {leaders.length === 0 ? (
        <p className="ss-empty">No leaderboard data yet.</p>
      ) : (
        <LeaderboardTable leaders={leaders} myRank={myRank} scope={leaderboardScope} onScope={setLeaderboardScope} />
      )}

      <div className="ss-card-list">
        {filteredSets.length === 0 ? (
          <p className="ss-empty">No shared study sets yet.</p>
        ) : (
          filteredSets.map((set) => (
            <article key={set.id} className="ss-list-card">
              <div>
                <h3>{set.title}</h3>
                <p>
                  {set.cards} cards • shared by {set.owner}
                </p>
              </div>
              <span>{set.updatedAt}</span>
            </article>
          ))
        )}
      </div>
    </section>
  );

  const renderActivity = () => {
    // Empty state - no mock data
    const className = "";
    const classLocation = "";
    
    const learningMaterials: Array<{
      id: string;
      type: 'flashcard' | 'quiz' | 'practice';
      title: string;
      itemCount: number;
      author: string;
      uploadedAt: string;
      icon: React.ReactNode;
    }> = [];

    const handleMaterialClick = (material: typeof learningMaterials[0]) => {
      if (material.type === 'flashcard') {
        setCardIndex(0);
        setFlipped(false);
      } else if (material.type === 'quiz') {
        setQuizIndex(0);
        setShowFeedback(false);
      } else if (material.type === 'practice') {
        setPracticeStarted(false);
        setPracticeFinished(false);
      }
    };

    const toggleMaterialExpand = (materialId: string) => {
      setExpandedMaterials((prev) => {
        const next = new Set(prev);
        if (next.has(materialId)) {
          next.delete(materialId);
        } else {
          next.add(materialId);
        }
        return next;
      });
    };

    return (
      <div className="ss-activity-container">
        <div className="ss-activity-header">
          <div className="ss-activity-header-main">
            <h1 className="ss-activity-class-name">Assigned Activities</h1>
            <p className="ss-activity-class-location">
              <Brain size={14} /> Complete your class activities
            </p>
          </div>
        </div>

        <div className="ss-activity-tabs">
          <button
            type="button"
            className={`ss-activity-tab ${activeActivityTab === 'materials' ? 'is-active' : ''}`}
            onClick={() => setActiveActivityTab('materials')}
          >
            Materials
          </button>
          <button
            type="button"
            className={`ss-activity-tab ${activeActivityTab === 'members' ? 'is-active' : ''}`}
            onClick={() => setActiveActivityTab('members')}
          >
            Members
          </button>
        </div>

        {activeActivityTab === 'materials' ? (
          <div className="ss-activity-content">
            {isLoadingActivities ? (
              <div className="ss-activity-empty">
                <p>Loading activities...</p>
              </div>
            ) : assignedActivities.length === 0 ? (
              <div className="ss-activity-empty">
                <p>No activities assigned yet.</p>
              </div>
            ) : (
              assignedActivities.map((activity) => (
                <div key={activity.id} className="ss-activity-section">
                  <div className="ss-activity-time-label">
                    {activity.schedule ? new Date(activity.schedule).toLocaleString() : 'No deadline'}
                  </div>
                  
                  <div className="ss-material-card ss-material-card-inline">
                    <div className="ss-material-icon">
                      <Layers size={20} />
                    </div>
                    <div className="ss-material-info">
                      <h3 className="ss-material-title">{activity.title}</h3>
                      <p className="ss-material-meta">
                        {activity.className} • {activity.subject || 'General'} • By {activity.teacherName}
                      </p>
                      {activity.description && (
                        <p style={{ fontSize: '14px', color: '#64748b', marginTop: '4px' }}>
                          {activity.description}
                        </p>
                      )}
                      <div style={{ display: 'flex', gap: '12px', marginTop: '8px', fontSize: '13px', color: '#94a3b8' }}>
                        {activity.flashcardsCount > 0 && (
                          <span>
                            <BookOpen size={14} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '4px' }} />
                            {activity.flashcardsCount} Flashcards
                          </span>
                        )}
                        {activity.quizQuestionsCount > 0 && (
                          <span>
                            <HelpCircle size={14} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '4px' }} />
                            {activity.quizQuestionsCount} Quiz Questions
                          </span>
                        )}
                      </div>
                    </div>
                    <button
                      className="ss-chip-btn"
                      onClick={() => navigate(`/student-dashboard/activity/${activity.id}`)}
                      style={{
                        backgroundColor: activity.hasAttempted ? '#10b981' : '#6366f1',
                        color: '#fff',
                        border: 'none',
                        padding: '8px 16px',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontSize: '14px',
                        fontWeight: '600',
                      }}
                    >
                      {activity.hasAttempted ? 'Review' : 'Start'}
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        ) : (
          <div className="ss-activity-content">
            <div className="ss-members-section">
              <button
                type="button"
                className="ss-members-header"
                onClick={() => setExpandedMaterials((prev) => {
                  const next = new Set(prev);
                  if (next.has('members-list')) {
                    next.delete('members-list');
                  } else {
                    next.add('members-list');
                  }
                  return next;
                })}
              >
                <span className="ss-members-count">{classMembers.length} members</span>
                <span className={`ss-members-toggle ${expandedMaterials.has('members-list') ? 'is-expanded' : ''}`}>
                  <Target size={16} />
                </span>
              </button>

              {expandedMaterials.has('members-list') && classMembers.length > 0 && (
                <div className="ss-members-list">
                  {classMembers.map((member) => (
                    <div key={member.id} className="ss-member-item">
                      <div className="ss-member-avatar">
                        {member.avatar ? (
                          <img src={member.avatar} alt={member.name} className="ss-member-avatar-img" />
                        ) : (
                          <span className="ss-member-avatar-text">
                            {member.name
                              .split(' ')
                              .slice(0, 2)
                              .map((n) => n[0]?.toUpperCase() ?? '')
                              .join('')}
                          </span>
                        )}
                        {member.isOnline && <span className="ss-member-online-badge" />}
                      </div>
                      <span className="ss-member-name">{member.name}</span>
                    </div>
                  ))}
                </div>
              )}

              {classMembers.length === 0 && (
                <div className="ss-activity-empty" style={{ marginTop: '1rem' }}>
                  <p>No members yet.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {gameFeedback && (
          <div className="ss-activity-toast">
            <GameFeedbackCard mood={gameFeedback.mood} message={gameFeedback.message} />
          </div>
        )}
      </div>
    );
  };

  const renderCurrentPage = () => {
    switch (location.pathname) {
      case '/student-dashboard/classes':
        return renderClasses();
      case '/student-dashboard/activity':
      case '/student-dashboard/flashcards': // Legacy support
      case '/student-dashboard/quiz': // Legacy support
      case '/student-dashboard/practice-tests': // Legacy support
        return renderActivity();
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
          <div className="ss-header-copy">
            <h1>Student Dashboard</h1>
            <p>Continue learning and track your progress.</p>
          </div>

          <div className="ss-user-actions">
            <div className="ss-user-menu-anchor">
              <button type="button" className="ss-quick-action" onClick={openMailMenu} aria-label="Open teacher announcements">
                <Mail size={14} />
                {unreadTeacherAnnouncementsCount > 0 && <span className="ss-quick-action-badge">{unreadTeacherAnnouncementsCount}</span>}
              </button>

              {isMailMenuOpen && (
                <section className="ss-topbar-menu" role="menu" aria-label="Teacher announcements" onClick={(event) => event.stopPropagation()}>
                  <header className="ss-topbar-menu-head">
                    <strong>Mail</strong>
                    <span>Teacher Announcements</span>
                  </header>

                  <div className="ss-topbar-menu-list">
                    {teacherAnnouncements.length === 0 ? (
                      <p className="ss-topbar-menu-empty">No announcements yet.</p>
                    ) : (
                      teacherAnnouncements.map((item) => (
                        <article key={item.id} className={`ss-topbar-menu-item ss-topbar-mail-item ${item.read ? 'is-read' : ''}`}>
                          <button
                            type="button"
                            className="ss-topbar-mail-open"
                            onClick={() => openMailMessage(item)}
                          >
                            <h4>{item.title}</h4>
                            <p>{item.message}</p>
                            <small>{formatNotificationTime(item.createdAt)}</small>
                          </button>

                          <button
                            type="button"
                            className="ss-topbar-mail-delete-icon"
                            onClick={() => void deleteMailById(item.id)}
                            aria-label="Delete mail message"
                            disabled={isMailDeleting || mailDeletingItemId === item.id}
                          >
                            <Trash2 size={14} />
                          </button>
                        </article>
                      ))
                    )}
                  </div>

                  <div className="ss-topbar-menu-footer">
                    <button
                      type="button"
                      className="ss-topbar-menu-action"
                      onClick={markMailAsRead}
                      disabled={unreadTeacherAnnouncementsCount === 0}
                    >
                      Mark All as Read
                    </button>
                  </div>
                </section>
              )}
            </div>

            <div className="ss-user-menu-anchor">
              <button type="button" className="ss-quick-action" onClick={openNotificationsMenu} aria-label="Open quiz notifications">
                <Bell size={14} />
                {unreadQuizUploadNotificationsCount > 0 && <span className="ss-quick-action-badge">{unreadQuizUploadNotificationsCount}</span>}
              </button>

              {isNotificationsMenuOpen && (
                <section className="ss-topbar-menu" role="menu" aria-label="Quiz upload notifications" onClick={(event) => event.stopPropagation()}>
                  <header className="ss-topbar-menu-head">
                    <strong>Notifications</strong>
                    <span>Quiz Upload Alerts</span>
                  </header>

                  <div className="ss-topbar-menu-list">
                    {quizUploadNotifications.length === 0 ? (
                      <p className="ss-topbar-menu-empty">No quiz upload notifications yet.</p>
                    ) : (
                      quizUploadNotifications.map((item) => (
                        <article key={item.id} className={`ss-topbar-menu-item ${item.read ? 'is-read' : ''}`}>
                          <h4>{item.title}</h4>
                          <p>{item.message}</p>
                          <small>{formatNotificationTime(item.createdAt)}</small>
                        </article>
                      ))
                    )}
                  </div>
                </section>
              )}
            </div>
            <div className="ss-user-menu-anchor">
              <button type="button" className="ss-user-chip ss-user-chip-button ss-user-chip-avatar" onClick={openProfileModal} aria-label="Open student profile">
                {profileImageUrl ? <img className="ss-user-avatar-image" src={profileImageUrl} alt="Student profile" /> : <span>{profileInitials}</span>}
              </button>

              {isProfileMenuOpen && (
                <section className="ss-profile-menu" role="menu" aria-label="Student profile menu" onClick={(event) => event.stopPropagation()}>
                  <div className="ss-profile-menu-head">
                    <div className="ss-profile-menu-avatar">
                      {profileImageUrl ? <img className="ss-user-avatar-image" src={profileImageUrl} alt="Student profile" /> : <span>{profileInitials}</span>}
                    </div>
                    <div className="ss-profile-menu-copy">
                      <strong>{profileName}</strong>
                      <span>{profileEmail}</span>
                    </div>
                  </div>

                  <div className="ss-profile-menu-divider" />

                  <button type="button" className="ss-profile-menu-item is-active" onClick={() => {
                    setIsProfileMenuOpen(false);
                    navigate('/student-dashboard/achievements');
                  }}>
                    <Award size={18} />
                    <span>Achievement</span>
                  </button>

                  <button type="button" className="ss-profile-menu-item" onClick={openProfileSettings}>
                    <Settings size={18} />
                    <span>Settings</span>
                  </button>

                  <button type="button" className="ss-profile-menu-item" onClick={() => setIsDarkMode((current) => !current)}>
                    <Moon size={18} />
                    <span>Dark mode</span>
                    <span className={`ss-toggle-pill ${isDarkMode ? 'is-on' : ''}`} aria-hidden="true">
                      <span />
                    </span>
                  </button>

                  <div className="ss-profile-menu-divider" />

                  <button
                    type="button"
                    className="ss-profile-menu-logout"
                    onClick={() => {
                      setIsProfileMenuOpen(false);
                      handleLogout();
                    }}
                    disabled={isLoggingOut}
                  >
                    <LogOut size={18} />
                    <span>{isLoggingOut ? 'Logging out...' : 'Sign out'}</span>
                  </button>
                </section>
              )}
            </div>
          </div>
        </header>

        <section className="dashboard-page-transition">{renderCurrentPage()}</section>

        {activeMailItem && (
          <div className="ss-mail-overlay" role="presentation" onClick={closeMailMessage}>
            <section className="ss-mail-modal" role="dialog" aria-modal="true" aria-labelledby="student-mail-title" onClick={(event) => event.stopPropagation()}>
              <div className="ss-mail-modal-head">
                <p className="ss-mail-modal-kicker">Message from {mailSenderName}</p>
                <button className="ss-icon-btn" type="button" aria-label="Close mail message" onClick={closeMailMessage}>
                  <X size={18} />
                </button>
              </div>

              <h2 id="student-mail-title" className="ss-mail-modal-title">{activeMailItem.title}</h2>

              <div className="ss-mail-modal-meta">
                <div className="ss-mail-modal-row">
                  <span className="ss-mail-modal-label">From</span>
                  <p className="ss-mail-modal-value">
                    <strong>{mailSenderName}</strong>
                    <span>{formatNotificationTime(activeMailItem.createdAt)}</span>
                  </p>
                </div>
                <div className="ss-mail-modal-row">
                  <span className="ss-mail-modal-label">To</span>
                  <p className="ss-mail-modal-value">
                    <strong>{profileName}</strong>
                    <span>Student recipient</span>
                  </p>
                </div>
              </div>

              <div className="ss-mail-modal-divider" />

              <div className="ss-mail-modal-body">
                <p>{activeMailItem.message}</p>
              </div>

              <div className="ss-mail-modal-actions">
                <button
                  type="button"
                  className="ss-mail-delete-icon-btn"
                  onClick={deleteMailMessage}
                  aria-label="Delete mail message"
                  disabled={isMailDeleting}
                >
                  <Trash2 size={15} />
                </button>
              </div>
            </section>
          </div>
        )}

        {isProfileModalOpen && (
          <div className="ss-profile-overlay" role="presentation" onClick={closeProfileModal}>
            <section className="ss-profile-modal" role="dialog" aria-modal="true" aria-labelledby="student-profile-image-title" onClick={(event) => event.stopPropagation()}>
              <div className="ss-profile-modal-head">
                <h2 id="student-profile-image-title">Update Profile Image</h2>
                <button className="ss-icon-btn" type="button" aria-label="Close profile image form" onClick={closeProfileModal}>
                  <X size={16} />
                </button>
              </div>

              <label className="ss-profile-modal-field">
                Profile Image
                <input
                  type="file"
                  accept="image/*"
                  onChange={(event) => {
                    const file = event.target.files?.[0] ?? null;

                    if (draftProfileImagePreview.startsWith('blob:')) {
                      URL.revokeObjectURL(draftProfileImagePreview);
                    }

                    setDraftProfileImageFile(file);
                    setDraftProfileImagePreview(file ? URL.createObjectURL(file) : profileImageUrl ?? '');
                  }}
                />
              </label>

              <div className="ss-profile-preview">
                {draftProfileImagePreview ? <img src={draftProfileImagePreview} alt="Profile preview" /> : <span>{profileInitials}</span>}
              </div>

              {profileError ? <p className="ss-profile-modal-error">{profileError}</p> : null}

              <div className="ss-profile-modal-actions">
                <button type="button" className="ss-chip-btn" onClick={saveProfileImage} disabled={isProfileSaving}>
                  {isProfileSaving ? 'Saving...' : 'Save image'}
                </button>
                <button type="button" className="ss-chip-btn ss-chip-btn-ghost" onClick={closeProfileModal} disabled={isProfileSaving}>
                  Cancel
                </button>
              </div>
            </section>
          </div>
        )}
      </main>
    </div>
  );
}



