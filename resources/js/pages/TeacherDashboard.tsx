import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { csrfFetch } from '../lib/csrf';
import NotificationCenter from '../components/ui/NotificationCenter';
import { LeaderboardTable, type LeaderboardEntry } from '../components/ui/GamificationWidgets';
import {
  Award,
  BarChart3,
  BookOpen,
  ChevronDown,
  CircleHelp,
  ClipboardCheck,
  FileText,
  Flame,
  FolderClosed,
  Gamepad2,
  Home,
  Layers3,
  ListChecks,
  LogOut,
  Menu,
  Plus,
  Search,
  Shield,
  Sparkles,
  TrendingUp,
  Trophy,
  Users,
} from 'lucide-react';
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

type NavItem = {
  label: string;
  icon: React.ReactNode;
  path: string;
};

type AuthMeResponse = {
  user?: {
    name?: string;
    email?: string;
  };
};

type StudySet = {
  id: string;
  title: string;
  subject: string;
  className: string;
  visibility: 'public' | 'private';
  cards: number;
  updatedAt: string;
};

type StudentRecord = {
  id: string;
  name: string;
  className: string;
  completion: number;
  quizScore: number;
  weakArea: string;
  lastActive: string;
};

type ActivityRecord = {
  id: string;
  student: string;
  action: string;
  resource: string;
  time: string;
};

type ReportPoint = {
  label: string;
  engagement: number;
  completion: number;
  score: number;
};

type BadgeProgress = {
  id: string;
  badge: string;
  student: string;
  progress: number;
  target: number;
  description: string;
};

type ClassMetric = {
  className: string;
  avgScore: number;
  completionRate: number;
  engagement: number;
};

type DifficultQuestion = {
  question: string;
  correctRate: number;
  attempts: number;
  className: string;
};

type NotificationItem = {
  id: string;
  title: string;
  message: string;
  createdAt?: string | null;
};

type AdminBadge = {
  id: number;
  code: string;
  name: string;
  description?: string | null;
  requirement_type: string;
  requirement_value: number;
  xp_reward: number;
};

type TeacherClass = {
  id: number;
  name: string;
  subject: string;
  description?: string | null;
  studentsCount: number;
  updatedAt: string;
};

type TeacherAssignment = {
  id: number;
  materialType: 'study_guide' | 'study_set' | 'quiz';
  materialId: number;
  className: string;
  deadlineAt?: string | null;
  status: string;
};

type TeacherStudyGuide = {
  id: number;
  title: string;
  subject: string;
  content: string;
  imageUrl?: string | null;
  updatedAt: string;
};

const primaryNav: NavItem[] = [
  { label: 'Home', icon: <Home size={18} />, path: '/teacher-dashboard' },
  { label: 'Your library', icon: <FolderClosed size={18} />, path: '/teacher-dashboard/library' },
  { label: 'Classes', icon: <Users size={18} />, path: '/teacher-dashboard/classes' },
  { label: 'Student monitoring', icon: <Users size={18} />, path: '/teacher-dashboard/students' },
  { label: 'Notifications', icon: <Sparkles size={18} />, path: '/teacher-dashboard/notifications' },
  { label: 'Reports', icon: <BarChart3 size={18} />, path: '/teacher-dashboard/reports' },
  { label: 'Achievements', icon: <Trophy size={18} />, path: '/teacher-dashboard/achievements' },
  { label: 'Gamification Panel', icon: <Sparkles size={18} />, path: '/teacher-dashboard/gamification' },
  { label: 'Sharing', icon: <Sparkles size={18} />, path: '/teacher-dashboard/sharing' },
];

const teacherTools: NavItem[] = [
  { label: 'Assign activity', icon: <ListChecks size={18} />, path: '/teacher-dashboard/assign-activity' },
  { label: 'Study Guides', icon: <FileText size={18} />, path: '/teacher-dashboard/study-guides' },
  { label: 'Practice Tests', icon: <ClipboardCheck size={18} />, path: '/teacher-dashboard/practice-tests' },
  { label: 'Create content', icon: <Layers3 size={18} />, path: '/teacher-dashboard/create-content' },
];

const studySets: StudySet[] = [
  {
    id: 'set-1',
    title: 'Cell Structure Review',
    subject: 'Biology',
    className: 'Grade 10 - A',
    visibility: 'public',
    cards: 28,
    updatedAt: '1 hour ago',
  },
  {
    id: 'set-2',
    title: 'Constitution and Citizenship',
    subject: 'Civics',
    className: 'Grade 10 - B',
    visibility: 'private',
    cards: 34,
    updatedAt: 'Yesterday',
  },
  {
    id: 'set-3',
    title: 'Algebra Practice Test',
    subject: 'Mathematics',
    className: 'Grade 9 - A',
    visibility: 'public',
    cards: 19,
    updatedAt: '2 days ago',
  },
];

const students: StudentRecord[] = [
  {
    id: 'st-1',
    name: 'Alyssa Cruz',
    className: 'Grade 10 - A',
    completion: 92,
    quizScore: 95,
    weakArea: 'Biology vocab',
    lastActive: '10 min ago',
  },
  {
    id: 'st-2',
    name: 'Marco Reyes',
    className: 'Grade 10 - B',
    completion: 74,
    quizScore: 81,
    weakArea: 'Civics short answers',
    lastActive: '25 min ago',
  },
  {
    id: 'st-3',
    name: 'Nia Santos',
    className: 'Grade 9 - A',
    completion: 58,
    quizScore: 67,
    weakArea: 'Algebra transformations',
    lastActive: '1 hour ago',
  },
  {
    id: 'st-4',
    name: 'Jomar dela Cruz',
    className: 'Grade 9 - A',
    completion: 84,
    quizScore: 88,
    weakArea: 'Timed practice',
    lastActive: '2 hours ago',
  },
];

const activities: ActivityRecord[] = [
  { id: 'act-1', student: 'Alyssa Cruz', action: 'Completed quiz', resource: 'Cell Structure Review', time: '10 min ago' },
  { id: 'act-2', student: 'Marco Reyes', action: 'Reopened practice test', resource: 'Constitution and Citizenship', time: '25 min ago' },
  { id: 'act-3', student: 'Nia Santos', action: 'Studied flashcards', resource: 'Algebra Practice Test', time: '1 hour ago' },
  { id: 'act-4', student: 'Jomar dela Cruz', action: 'Earned badge', resource: 'Study Streak', time: '2 hours ago' },
];

const reportPoints: ReportPoint[] = [
  { label: 'Mon', engagement: 68, completion: 55, score: 74 },
  { label: 'Tue', engagement: 72, completion: 61, score: 77 },
  { label: 'Wed', engagement: 81, completion: 70, score: 82 },
  { label: 'Thu', engagement: 78, completion: 75, score: 80 },
  { label: 'Fri', engagement: 86, completion: 83, score: 88 },
  { label: 'Sat', engagement: 89, completion: 86, score: 90 },
];

const classMetrics: ClassMetric[] = [
  { className: 'Grade 10 - A', avgScore: 91, completionRate: 88, engagement: 94 },
  { className: 'Grade 10 - B', avgScore: 82, completionRate: 73, engagement: 79 },
  { className: 'Grade 9 - A', avgScore: 76, completionRate: 68, engagement: 71 },
];

const badgeProgress: BadgeProgress[] = [
  { id: 'b-1', badge: 'Flashcard Master', student: 'Alyssa Cruz', progress: 20, target: 20, description: 'Completed enough cards for mastery.' },
  { id: 'b-2', badge: 'Quiz Champion', student: 'Jomar dela Cruz', progress: 86, target: 90, description: 'Near-perfect quiz streak.' },
  { id: 'b-3', badge: 'Study Streak', student: 'Marco Reyes', progress: 6, target: 7, description: 'A single day away from the streak badge.' },
];

const difficultQuestions: DifficultQuestion[] = [
  { question: 'Explain why mitochondria are called the powerhouse of the cell.', correctRate: 58, attempts: 42, className: 'Grade 10 - A' },
  { question: 'Identify the amendment that protects due process.', correctRate: 51, attempts: 31, className: 'Grade 10 - B' },
  { question: 'Solve for x when a linear equation is simplified.', correctRate: 47, attempts: 39, className: 'Grade 9 - A' },
];

const summaryMetrics = [
  { label: 'Total study sets created', value: '128', delta: '+14 this week' },
  { label: 'Student engagement', value: '87%', delta: '+6% since last week' },
  { label: 'Class completion', value: '79%', delta: '+9% overall' },
  { label: 'Average quiz score', value: '84%', delta: '+3% improvement' },
];

function renderProgressBar(value: number) {
  return (
    <div className="td-progress">
      <span style={{ width: `${value}%` }} />
    </div>
  );
}

export default function TeacherDashboard() {
  const navigate = useNavigate();
  const location = useLocation();
  const [profileName, setProfileName] = useState('Teacher');
  const [profileEmail, setProfileEmail] = useState('teacher@example.com');
  const [search, setSearch] = useState('');
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [summaryMetricsState, setSummaryMetricsState] = useState(summaryMetrics);
  const [studySetsState, setStudySetsState] = useState(studySets);
  const [studentsState, setStudentsState] = useState(students);
  const [activitiesState, setActivitiesState] = useState(activities);
  const [reportPointsState, setReportPointsState] = useState(reportPoints);
  const [classMetricsState, setClassMetricsState] = useState(classMetrics);
  const [badgeProgressState, setBadgeProgressState] = useState(badgeProgress);
  const [difficultQuestionsState, setDifficultQuestionsState] = useState(difficultQuestions);
  const [teacherNotifications, setTeacherNotifications] = useState<NotificationItem[]>([]);
  const [adminTotals, setAdminTotals] = useState({ xp: 0, activeStudents: 0, engagementRate: 0, retentionRate: 0 });
  const [adminTrend, setAdminTrend] = useState<Array<{ day: string; events: number; xp: number }>>([]);
  const [adminLeaders, setAdminLeaders] = useState<LeaderboardEntry[]>([]);
  const [adminBadges, setAdminBadges] = useState<AdminBadge[]>([]);
  const [adminRules, setAdminRules] = useState<Record<string, number>>({});
  const [newBadge, setNewBadge] = useState({ code: '', name: '', requirementType: 'quiz_attempts', requirementValue: 3, xpReward: 25, description: '' });
  const [resetStudentId, setResetStudentId] = useState('');
  const [classesState, setClassesState] = useState<TeacherClass[]>([]);
  const [assignmentsState, setAssignmentsState] = useState<TeacherAssignment[]>([]);
  const [studyGuidesState, setStudyGuidesState] = useState<TeacherStudyGuide[]>([]);
  const [newClass, setNewClass] = useState({ name: '', subject: '', description: '' });
  const [announcement, setAnnouncement] = useState({ title: '', message: '', classId: '' });
  const [newAssignment, setNewAssignment] = useState({ classId: '', materialType: 'study_set', materialId: '', deadlineAt: '' });
  const [reportSummary, setReportSummary] = useState({ averageScore: 0, completionRate: 0 });
  const [topicDifficulty, setTopicDifficulty] = useState<Array<{ topic: string; averageScore: number; attempts: number }>>([]);

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const response = await fetch('/auth/me', {
          method: 'GET',
          credentials: 'include',
          headers: { Accept: 'application/json' },
        });

        if (!response.ok) {
          return;
        }

        const data = (await response.json()) as AuthMeResponse;

        if (data.user?.name) {
          setProfileName(data.user.name);
        }

        if (data.user?.email) {
          setProfileEmail(data.user.email);
        }
      } catch {
        // Keep fallback profile values when auth info is unavailable.
      }
    };

    loadProfile();
  }, []);

  useEffect(() => {
    let mounted = true;

    const loadLiveData = async () => {
      try {
        const [dashboardRes, notificationsRes, adminGamificationRes, adminBadgesRes, classesRes, assignmentsRes, studyGuidesRes, reportsRes] = await Promise.all([
          fetch('/api/teacher/dashboard', {
            method: 'GET',
            credentials: 'include',
            headers: { Accept: 'application/json' },
          }),
          fetch('/api/teacher/notifications', {
            method: 'GET',
            credentials: 'include',
            headers: { Accept: 'application/json' },
          }),
          fetch('/api/admin/gamification/dashboard', {
            method: 'GET',
            credentials: 'include',
            headers: { Accept: 'application/json' },
          }),
          fetch('/api/admin/badges', {
            method: 'GET',
            credentials: 'include',
            headers: { Accept: 'application/json' },
          }),
          fetch('/api/classes', {
            method: 'GET',
            credentials: 'include',
            headers: { Accept: 'application/json' },
          }),
          fetch('/api/teacher/assignments', {
            method: 'GET',
            credentials: 'include',
            headers: { Accept: 'application/json' },
          }),
          fetch('/api/teacher/study-guides', {
            method: 'GET',
            credentials: 'include',
            headers: { Accept: 'application/json' },
          }),
          fetch('/api/teacher/reports', {
            method: 'GET',
            credentials: 'include',
            headers: { Accept: 'application/json' },
          }),
        ]);

        if (!mounted) {
          return;
        }

        if (dashboardRes.ok) {
          const payload = (await dashboardRes.json()) as {
            summaryMetrics?: typeof summaryMetrics;
            studySets?: StudySet[];
            students?: StudentRecord[];
            activities?: ActivityRecord[];
            reportPoints?: ReportPoint[];
            classMetrics?: ClassMetric[];
            badgeProgress?: BadgeProgress[];
            difficultQuestions?: DifficultQuestion[];
          };

          if (payload.summaryMetrics?.length) {
            setSummaryMetricsState(payload.summaryMetrics);
          }

          if (payload.studySets?.length) {
            setStudySetsState(payload.studySets);
          }

          if (payload.students?.length) {
            setStudentsState(payload.students);
          }

          if (payload.activities?.length) {
            setActivitiesState(payload.activities);
          }

          if (payload.reportPoints?.length) {
            setReportPointsState(payload.reportPoints);
          }

          if (payload.classMetrics?.length) {
            setClassMetricsState(payload.classMetrics);
          }

          if (payload.badgeProgress?.length) {
            setBadgeProgressState(payload.badgeProgress);
          }

          if (payload.difficultQuestions?.length) {
            setDifficultQuestionsState(payload.difficultQuestions);
          }
        }

        if (notificationsRes.ok) {
          const payload = (await notificationsRes.json()) as { notifications?: NotificationItem[] };
          setTeacherNotifications(payload.notifications ?? []);
        }

        if (adminGamificationRes.ok) {
          const payload = (await adminGamificationRes.json()) as {
            totals?: { xp: number; activeStudents: number; engagementRate: number; retentionRate: number };
            engagementTrend?: Array<{ day: string; events: number; xp: number }>;
            leaderboard?: Array<{ name: string; rank: number; score: number }>;
            rules?: Record<string, number>;
          };

          if (payload.totals) {
            setAdminTotals(payload.totals);
          }
          if (payload.engagementTrend) {
            setAdminTrend(payload.engagementTrend);
          }
          if (payload.leaderboard) {
            setAdminLeaders(
              payload.leaderboard.map((entry, index) => ({
                userId: index + 1,
                name: entry.name,
                rank: entry.rank,
                score: entry.score,
              })),
            );
          }
          if (payload.rules) {
            setAdminRules(payload.rules);
          }
        }

        if (adminBadgesRes.ok) {
          const payload = (await adminBadgesRes.json()) as { badges?: AdminBadge[] };
          setAdminBadges(payload.badges ?? []);
        }

        if (classesRes.ok) {
          const payload = (await classesRes.json()) as { classes?: TeacherClass[] };
          setClassesState(payload.classes ?? []);
        }

        if (assignmentsRes.ok) {
          const payload = (await assignmentsRes.json()) as { assignments?: TeacherAssignment[] };
          setAssignmentsState(payload.assignments ?? []);
        }

        if (studyGuidesRes.ok) {
          const payload = (await studyGuidesRes.json()) as { studyGuides?: TeacherStudyGuide[] };
          setStudyGuidesState(payload.studyGuides ?? []);
        }

        if (reportsRes.ok) {
          const payload = (await reportsRes.json()) as {
            averageScore?: number;
            completionRate?: number;
            topicDifficulty?: Array<{ topic: string; averageScore: number; attempts: number }>;
          };
          setReportSummary({
            averageScore: payload.averageScore ?? 0,
            completionRate: payload.completionRate ?? 0,
          });
          setTopicDifficulty(payload.topicDifficulty ?? []);
        }
      } catch {
        // Fallback state remains available if API is not reachable.
      }
    };

    loadLiveData();
    const timer = window.setInterval(loadLiveData, 15000);

    return () => {
      mounted = false;
      window.clearInterval(timer);
    };
  }, []);

  const profileInitials = profileName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('') || 'TC';

  const activeTeacherSection =
    [...primaryNav, ...teacherTools].find((item) => item.path === location.pathname)?.label ?? 'Home';

  const filteredStudySets = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) {
      return studySetsState;
    }

    return studySetsState.filter((set) => [set.title, set.subject, set.className].some((value) => value.toLowerCase().includes(query)));
  }, [search, studySetsState]);

  const filteredStudents = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) {
      return studentsState;
    }

    return studentsState.filter((student) =>
      [student.name, student.className, student.weakArea].some((value) => value.toLowerCase().includes(query)),
    );
  }, [search, studentsState]);

  const saveRules = async () => {
    try {
      await csrfFetch('/api/admin/gamification/rules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ rules: adminRules }),
      });
    } catch {
      // Keep local rule changes if backend update fails.
    }
  };

  const createBadge = async () => {
    try {
      const response = await csrfFetch('/api/admin/badges', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(newBadge),
      });

      if (response.ok) {
        setNewBadge({ code: '', name: '', requirementType: 'quiz_attempts', requirementValue: 3, xpReward: 25, description: '' });
      }
    } catch {
      // Prevent blocking the panel when create fails.
    }
  };

  const updateBadge = async (badge: AdminBadge) => {
    try {
      await csrfFetch(`/api/admin/badges/${badge.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({
          name: badge.name,
          description: badge.description,
          requirementType: badge.requirement_type,
          requirementValue: badge.requirement_value,
          xpReward: badge.xp_reward,
        }),
      });
    } catch {
      // Keep editing possible while backend is unavailable.
    }
  };

  const resetStudentGamification = async () => {
    const studentId = Number(resetStudentId);
    if (!studentId) {
      return;
    }

    try {
      await csrfFetch('/api/admin/gamification/reset-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ studentId }),
      });
      setResetStudentId('');
    } catch {
      // No-op on reset failures.
    }
  };

  const createClass = async () => {
    if (!newClass.name || !newClass.subject) {
      return;
    }

    try {
      await csrfFetch('/api/classes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(newClass),
      });
      setNewClass({ name: '', subject: '', description: '' });
    } catch {
      // Keep local draft for retry.
    }
  };

  const createAssignment = async () => {
    if (!newAssignment.materialId) {
      return;
    }

    try {
      await csrfFetch('/api/teacher/assignments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({
          classId: newAssignment.classId ? Number(newAssignment.classId) : null,
          materialType: newAssignment.materialType,
          materialId: Number(newAssignment.materialId),
          deadlineAt: newAssignment.deadlineAt || null,
        }),
      });
      setNewAssignment({ classId: '', materialType: 'study_set', materialId: '', deadlineAt: '' });
    } catch {
      // Ignore failures for now.
    }
  };

  const sendAnnouncement = async () => {
    if (!announcement.title || !announcement.message) {
      return;
    }

    try {
      await csrfFetch('/api/teacher/notifications/announcement', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({
          title: announcement.title,
          message: announcement.message,
          classId: announcement.classId ? Number(announcement.classId) : null,
        }),
      });
      setAnnouncement({ title: '', message: '', classId: '' });
    } catch {
      // Keep draft announcement if send fails.
    }
  };

  const markTeacherNotification = async (notificationId: string, read: boolean) => {
    try {
      await csrfFetch(`/api/teacher/notifications/${notificationId}/read`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ read }),
      });
      setTeacherNotifications((current) =>
        current.map((item) => (item.id === notificationId ? { ...item, createdAt: item.createdAt } : item)),
      );
    } catch {
      // Keep current state.
    }
  };

  const handleAwardBadge = async (studentName: string, badgeName: string) => {
    const student = studentsState.find((item) => item.name === studentName);
    if (!student) {
      return;
    }

    const badgeCode = badgeName.toLowerCase().replace(/\s+/g, '-');

    try {
      await csrfFetch('/api/teacher/achievements/award', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({
          studentId: Number(String(student.id).replace(/[^0-9]/g, '')),
          badgeCode,
        }),
      });
    } catch {
      // Keep UI responsive even if API is temporarily unavailable.
    }
  };

  const handleAssignSet = async (studySetId: string) => {
    const numericSetId = Number(String(studySetId).replace(/[^0-9]/g, ''));
    const studentIds = studentsState
      .map((student) => Number(String(student.id).replace(/[^0-9]/g, '')))
      .filter((id) => id > 0)
      .slice(0, 10);

    if (!numericSetId || studentIds.length === 0) {
      return;
    }

    try {
      await csrfFetch(`/api/teacher/study-sets/${numericSetId}/assign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({
          studentIds,
          scope: 'class',
        }),
      });
    } catch {
      // Ignore temporary sync issues and keep local UX intact.
    }
  };

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

      navigate('/login/teacher');
    } catch {
      setIsLoggingOut(false);
    }
  };

  const navigateTo = (path: string) => {
    if (path === location.pathname) {
      return;
    }

    navigate(path);
  };

  const renderDashboard = () => (
    <div className="td-dashboard-grid">
      <section className="td-metric-grid">
        {summaryMetricsState.map((metric) => (
          <article key={metric.label} className="td-metric-card">
            <p>{metric.label}</p>
            <h3>{metric.value}</h3>
            <span>{metric.delta}</span>
          </article>
        ))}
      </section>

      <section className="td-panel td-panel-span-2">
        <div className="td-panel-head">
          <h2>Class Performance Overview</h2>
          <TrendingUp size={16} />
        </div>
        <div className="td-chart-card">
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={reportPointsState}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="label" />
              <YAxis domain={[0, 100]} />
              <Tooltip />
              <Line type="monotone" dataKey="engagement" stroke="#7c3aed" strokeWidth={3} />
              <Line type="monotone" dataKey="completion" stroke="#0f766e" strokeWidth={3} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className="td-panel">
        <div className="td-panel-head">
          <h2>Recent Student Activity</h2>
          <Sparkles size={16} />
        </div>
        <div className="td-stack-list">
          {activitiesState.map((activity) => (
            <article key={activity.id} className="td-stack-item">
              <div>
                <h3>{activity.student}</h3>
                <p>
                  {activity.action} · {activity.resource}
                </p>
              </div>
              <span>{activity.time}</span>
            </article>
          ))}
        </div>
      </section>

      <section className="td-panel">
        <NotificationCenter title="Live Notifications" items={teacherNotifications} emptyText="No teacher alerts yet." />
      </section>
    </div>
  );

  const renderContentLibrary = () => (
    <section className="td-panel td-panel-span-2">
      <div className="td-panel-head">
        <h2>Study Material Management</h2>
        <button className="td-inline-action" type="button" onClick={() => navigate('/teacher-dashboard/create-content')}>
          <Plus size={14} /> Create set
        </button>
      </div>

      <div className="td-table-card">
        <table className="td-table">
          <thead>
            <tr>
              <th>Set</th>
              <th>Subject</th>
              <th>Class</th>
              <th>Cards</th>
              <th>Visibility</th>
              <th>Updated</th>
            </tr>
          </thead>
          <tbody>
            {filteredStudySets.map((set) => (
              <tr key={set.id}>
                <td>{set.title}</td>
                <td>{set.subject}</td>
                <td>{set.className}</td>
                <td>{set.cards}</td>
                <td>{set.visibility}</td>
                <td>{set.updatedAt}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="td-inline-actions-wrap">
        <button className="td-inline-action" type="button">
          <BookOpen size={14} /> Edit selected content
        </button>
        <button className="td-inline-action" type="button">
          <ClipboardCheck size={14} /> Create quiz from set
        </button>
        <button className="td-inline-action" type="button">
          <Gamepad2 size={14} /> Generate practice test
        </button>
      </div>
    </section>
  );

  const renderMonitoring = () => (
    <div className="td-dashboard-grid">
      <section className="td-panel td-panel-span-2">
        <div className="td-panel-head">
          <h2>Student Monitoring</h2>
          <Users size={16} />
        </div>

        <div className="td-table-card">
          <table className="td-table td-table-wide">
            <thead>
              <tr>
                <th>Student</th>
                <th>Class</th>
                <th>Quiz score</th>
                <th>Completion</th>
                <th>Weak area</th>
                <th>Last active</th>
              </tr>
            </thead>
            <tbody>
              {filteredStudents.map((student) => (
                <tr key={student.id}>
                  <td>{student.name}</td>
                  <td>{student.className}</td>
                  <td>{student.quizScore}%</td>
                  <td>
                    <div className="td-cell-progress">
                      {renderProgressBar(student.completion)}
                      <span>{student.completion}%</span>
                    </div>
                  </td>
                  <td>{student.weakArea}</td>
                  <td>{student.lastActive}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="td-panel">
        <div className="td-panel-head">
          <h2>Weak Areas</h2>
          <CircleHelp size={16} />
        </div>
        <div className="td-stack-list">
          {filteredStudents.slice(0, 3).map((student) => (
            <article key={student.id} className="td-stack-item">
              <div>
                <h3>{student.name}</h3>
                <p>{student.weakArea}</p>
              </div>
              <span>{student.quizScore}%</span>
            </article>
          ))}
        </div>
      </section>

      <section className="td-panel">
        <div className="td-panel-head">
          <h2>Completion Rates</h2>
          <Users size={16} />
        </div>
        <div className="td-chart-card">
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={classMetricsState}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="className" />
              <YAxis domain={[0, 100]} />
              <Tooltip />
              <Bar dataKey="completionRate" fill="#f97316" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>
    </div>
  );

  const renderReports = () => (
    <div className="td-dashboard-grid">
      <section className="td-panel td-panel-span-2">
        <div className="td-panel-head">
          <h2>Reports & Analytics</h2>
          <BarChart3 size={16} />
        </div>
        <div className="td-chart-card">
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={reportPoints}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="label" />
              <YAxis domain={[0, 100]} />
              <Tooltip />
              <Line type="monotone" dataKey="engagement" stroke="#7c3aed" strokeWidth={3} />
              <Line type="monotone" dataKey="score" stroke="#0ea5e9" strokeWidth={3} />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div className="td-mini-metrics">
          <span>Average score {reportSummary.averageScore}%</span>
          <span>Completion rate {reportSummary.completionRate}%</span>
        </div>
      </section>

      <section className="td-panel">
        <div className="td-panel-head">
          <h2>Class Performance</h2>
          <TrendingUp size={16} />
        </div>
        <div className="td-stack-list">
          {classMetricsState.map((item) => (
            <article key={item.className} className="td-stack-item td-stack-item-column">
              <div>
                <h3>{item.className}</h3>
                <p>Average score {item.avgScore}%</p>
              </div>
              <div className="td-mini-metrics">
                <span>Completion {item.completionRate}%</span>
                <span>Engagement {item.engagement}%</span>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="td-panel">
        <div className="td-panel-head">
          <h2>Most Difficult Questions</h2>
          <CircleHelp size={16} />
        </div>
        <div className="td-stack-list">
          {[...difficultQuestionsState, ...topicDifficulty.map((topic) => ({
            question: topic.topic,
            className: 'All classes',
            correctRate: topic.averageScore,
            attempts: topic.attempts,
          }))].slice(0, 8).map((question) => (
            <article key={question.question} className="td-stack-item td-stack-item-column">
              <div>
                <h3>{question.question}</h3>
                <p>{question.className}</p>
              </div>
              <div className="td-mini-metrics">
                <span>Correct rate {question.correctRate}%</span>
                <span>{question.attempts} attempts</span>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );

  const renderAchievements = () => (
    <div className="td-dashboard-grid">
      <section className="td-panel td-panel-span-2">
        <div className="td-panel-head">
          <h2>Achievements Management</h2>
          <Award size={16} />
        </div>
        <div className="td-achievement-grid">
          {badgeProgressState.map((badge) => (
            <article key={badge.id} className="td-badge-card">
              <div className="td-badge-top">
                <Trophy size={16} />
                <span>{badge.student}</span>
              </div>
              <h3>{badge.badge}</h3>
              <p>{badge.description}</p>
              <div className="td-cell-progress">
                {renderProgressBar(Math.round((badge.progress / badge.target) * 100))}
                <span>
                  {badge.progress}/{badge.target}
                </span>
              </div>
              <button className="td-inline-action" type="button" onClick={() => handleAwardBadge(badge.student, badge.badge)}>
                Award badge
              </button>
            </article>
          ))}
        </div>
      </section>

      <section className="td-panel">
        <div className="td-panel-head">
          <h2>Top Performers</h2>
          <Flame size={16} />
        </div>
        <div className="td-stack-list">
          {studentsState
            .slice()
            .sort((left, right) => right.quizScore - left.quizScore)
            .slice(0, 3)
            .map((student) => (
              <article key={student.id} className="td-stack-item">
                <div>
                  <h3>{student.name}</h3>
                  <p>{student.className}</p>
                </div>
                <span>{student.quizScore}%</span>
              </article>
            ))}
        </div>
      </section>
    </div>
  );

  const renderSharing = () => (
    <div className="td-dashboard-grid">
      <section className="td-panel td-panel-span-2">
        <div className="td-panel-head">
          <h2>Content Sharing</h2>
          <Sparkles size={16} />
        </div>
        <div className="td-share-grid">
          {studySetsState.map((set) => (
            <article key={set.id} className="td-share-card">
              <h3>{set.title}</h3>
              <p>
                {set.subject} · {set.className}
              </p>
              <div className="td-report-chip-row">
                <span>{set.visibility}</span>
                <span>{set.cards} cards</span>
                <span>{set.updatedAt}</span>
              </div>
              <button className="td-inline-action" type="button" onClick={() => handleAssignSet(set.id)}>
                Assign to class
              </button>
            </article>
          ))}
        </div>
      </section>

      <section className="td-panel">
        <div className="td-panel-head">
          <h2>Assignment Targets</h2>
          <Users size={16} />
        </div>
        <div className="td-stack-list">
          {classMetricsState.map((item) => (
            <article key={item.className} className="td-stack-item td-stack-item-column">
              <div>
                <h3>{item.className}</h3>
                <p>Share public or private content here.</p>
              </div>
              <div className="td-mini-metrics">
                <span>Completion {item.completionRate}%</span>
                <span>Engagement {item.engagement}%</span>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );

  const renderGamification = () => (
    <div className="td-dashboard-grid">
      <section className="td-metric-grid">
        <article className="td-metric-card">
          <p>Total XP</p>
          <h3>{adminTotals.xp}</h3>
          <span>Across all students</span>
        </article>
        <article className="td-metric-card">
          <p>Active Students</p>
          <h3>{adminTotals.activeStudents}</h3>
          <span>Last 7 days</span>
        </article>
        <article className="td-metric-card">
          <p>Engagement Rate</p>
          <h3>{adminTotals.engagementRate}%</h3>
          <span>Gamification interaction</span>
        </article>
        <article className="td-metric-card">
          <p>Retention Rate</p>
          <h3>{adminTotals.retentionRate}%</h3>
          <span>Streak-based retention</span>
        </article>
      </section>

      <section className="td-panel td-panel-span-2">
        <div className="td-panel-head">
          <h2>Gamification Trends</h2>
          <Sparkles size={16} />
        </div>
        <div className="td-chart-card">
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={adminTrend}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="day" />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="events" stroke="#f59e0b" strokeWidth={3} />
              <Line type="monotone" dataKey="xp" stroke="#06b6d4" strokeWidth={3} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className="td-panel">
        <LeaderboardTable leaders={adminLeaders} myRank={0} scope="global" onScope={() => undefined} />
      </section>

      <section className="td-panel td-panel-span-2">
        <div className="td-panel-head">
          <h2>Points Rules Configuration</h2>
          <Shield size={16} />
        </div>
        <div className="tcc-meta-grid">
          {Object.entries(adminRules).map(([key, value]) => (
            <label key={key}>
              {key}
              <input
                type="number"
                value={value}
                onChange={(event) => setAdminRules((current) => ({ ...current, [key]: Number(event.target.value) || 0 }))}
              />
            </label>
          ))}
        </div>
        <button className="td-inline-action" type="button" onClick={saveRules}>
          Save XP Rules
        </button>
      </section>

      <section className="td-panel td-panel-span-2">
        <div className="td-panel-head">
          <h2>Badge Management</h2>
          <Award size={16} />
        </div>
        <div className="tcc-meta-grid">
          <label>
            Code
            <input value={newBadge.code} onChange={(event) => setNewBadge((current) => ({ ...current, code: event.target.value }))} type="text" />
          </label>
          <label>
            Name
            <input value={newBadge.name} onChange={(event) => setNewBadge((current) => ({ ...current, name: event.target.value }))} type="text" />
          </label>
          <label>
            Requirement
            <input value={newBadge.requirementType} onChange={(event) => setNewBadge((current) => ({ ...current, requirementType: event.target.value }))} type="text" />
          </label>
          <label>
            Requirement Value
            <input value={newBadge.requirementValue} onChange={(event) => setNewBadge((current) => ({ ...current, requirementValue: Number(event.target.value) || 1 }))} type="number" />
          </label>
          <label>
            XP Reward
            <input value={newBadge.xpReward} onChange={(event) => setNewBadge((current) => ({ ...current, xpReward: Number(event.target.value) || 0 }))} type="number" />
          </label>
        </div>
        <label>
          Description
          <input value={newBadge.description} onChange={(event) => setNewBadge((current) => ({ ...current, description: event.target.value }))} type="text" />
        </label>
        <button className="td-inline-action" type="button" onClick={createBadge}>
          Create Badge
        </button>

        <div className="td-stack-list">
          {adminBadges.map((badge) => (
            <article key={badge.id} className="td-stack-item td-stack-item-column">
              <div className="tcc-meta-grid">
                <label>
                  Name
                  <input
                    type="text"
                    value={badge.name}
                    onChange={(event) =>
                      setAdminBadges((current) =>
                        current.map((item) => (item.id === badge.id ? { ...item, name: event.target.value } : item)),
                      )
                    }
                  />
                </label>
                <label>
                  Requirement Type
                  <input
                    type="text"
                    value={badge.requirement_type}
                    onChange={(event) =>
                      setAdminBadges((current) =>
                        current.map((item) => (item.id === badge.id ? { ...item, requirement_type: event.target.value } : item)),
                      )
                    }
                  />
                </label>
                <label>
                  Requirement Value
                  <input
                    type="number"
                    value={badge.requirement_value}
                    onChange={(event) =>
                      setAdminBadges((current) =>
                        current.map((item) => (item.id === badge.id ? { ...item, requirement_value: Number(event.target.value) || 1 } : item)),
                      )
                    }
                  />
                </label>
                <label>
                  XP Reward
                  <input
                    type="number"
                    value={badge.xp_reward}
                    onChange={(event) =>
                      setAdminBadges((current) =>
                        current.map((item) => (item.id === badge.id ? { ...item, xp_reward: Number(event.target.value) || 0 } : item)),
                      )
                    }
                  />
                </label>
              </div>
              <button className="td-inline-action" type="button" onClick={() => updateBadge(badge)}>
                Save Badge
              </button>
            </article>
          ))}
        </div>
      </section>

      <section className="td-panel">
        <div className="td-panel-head">
          <h2>Moderation</h2>
          <Shield size={16} />
        </div>
        <label>
          Student ID
          <input value={resetStudentId} onChange={(event) => setResetStudentId(event.target.value)} type="number" />
        </label>
        <button className="td-inline-action" type="button" onClick={resetStudentGamification}>
          Reset Scores
        </button>
      </section>
    </div>
  );

  const renderClasses = () => (
    <div className="td-dashboard-grid">
      <section className="td-panel td-panel-span-2">
        <div className="td-panel-head">
          <h2>Create Class</h2>
          <Users size={16} />
        </div>
        <div className="tcc-meta-grid">
          <label>
            Class Name
            <input value={newClass.name} onChange={(event) => setNewClass((current) => ({ ...current, name: event.target.value }))} type="text" />
          </label>
          <label>
            Subject
            <input value={newClass.subject} onChange={(event) => setNewClass((current) => ({ ...current, subject: event.target.value }))} type="text" />
          </label>
        </div>
        <label>
          Description
          <input value={newClass.description} onChange={(event) => setNewClass((current) => ({ ...current, description: event.target.value }))} type="text" />
        </label>
        <button className="td-inline-action" type="button" onClick={createClass}>
          Create Class
        </button>
      </section>

      <section className="td-panel td-panel-span-2">
        <div className="td-panel-head">
          <h2>Class Management</h2>
          <Users size={16} />
        </div>
        <div className="td-table-card">
          <table className="td-table">
            <thead>
              <tr>
                <th>Class</th>
                <th>Subject</th>
                <th>Students</th>
                <th>Description</th>
                <th>Updated</th>
              </tr>
            </thead>
            <tbody>
              {classesState.map((item) => (
                <tr key={item.id}>
                  <td>{item.name}</td>
                  <td>{item.subject}</td>
                  <td>{item.studentsCount}</td>
                  <td>{item.description || 'No description'}</td>
                  <td>{item.updatedAt}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );

  const renderTeacherNotifications = () => (
    <div className="td-dashboard-grid">
      <section className="td-panel td-panel-span-2">
        <div className="td-panel-head">
          <h2>Send Announcement</h2>
          <Sparkles size={16} />
        </div>
        <div className="tcc-meta-grid">
          <label>
            Title
            <input value={announcement.title} onChange={(event) => setAnnouncement((current) => ({ ...current, title: event.target.value }))} type="text" />
          </label>
          <label>
            Class (optional)
            <select value={announcement.classId} onChange={(event) => setAnnouncement((current) => ({ ...current, classId: event.target.value }))}>
              <option value="">All Classes</option>
              {classesState.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </label>
        </div>
        <label>
          Message
          <input value={announcement.message} onChange={(event) => setAnnouncement((current) => ({ ...current, message: event.target.value }))} type="text" />
        </label>
        <button className="td-inline-action" type="button" onClick={sendAnnouncement}>
          Send Announcement
        </button>
      </section>

      <section className="td-panel td-panel-span-2">
        <div className="td-panel-head">
          <h2>Notifications</h2>
          <Sparkles size={16} />
        </div>
        <div className="td-stack-list">
          {teacherNotifications.map((item) => (
            <article key={item.id} className="td-stack-item">
              <div>
                <h3>{item.title}</h3>
                <p>{item.message}</p>
              </div>
              <button className="td-inline-action" type="button" onClick={() => markTeacherNotification(item.id, true)}>
                Mark read
              </button>
            </article>
          ))}
        </div>
      </section>
    </div>
  );

  const renderMaterialsHub = () => (
    <div className="td-dashboard-grid">
      <section className="td-panel td-panel-span-2">
        <div className="td-panel-head">
          <h2>Study Material Management</h2>
          <button className="td-inline-action" type="button" onClick={() => navigate('/teacher-dashboard/create-content')}>
            <Plus size={14} /> Create material
          </button>
        </div>
        <div className="td-stack-list">
          {studyGuidesState.map((guide) => (
            <article key={`guide-${guide.id}`} className="td-stack-item td-stack-item-column">
              <div>
                <h3>{guide.title}</h3>
                <p>
                  Study Guide · {guide.subject}
                </p>
              </div>
              <div className="td-mini-metrics">
                <span>{guide.updatedAt}</span>
                <span>{guide.content.length} chars</span>
              </div>
            </article>
          ))}
          {filteredStudySets.map((set) => (
            <article key={set.id} className="td-stack-item td-stack-item-column">
              <div>
                <h3>{set.title}</h3>
                <p>
                  {set.subject} · {set.className}
                </p>
              </div>
              <div className="td-mini-metrics">
                <span>{set.cards} cards</span>
                <span>{set.visibility}</span>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="td-panel td-panel-span-2">
        <div className="td-panel-head">
          <h2>Assign Activity</h2>
          <ListChecks size={16} />
        </div>
        <div className="tcc-meta-grid">
          <label>
            Class
            <select value={newAssignment.classId} onChange={(event) => setNewAssignment((current) => ({ ...current, classId: event.target.value }))}>
              <option value="">All Students</option>
              {classesState.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Material Type
            <select value={newAssignment.materialType} onChange={(event) => setNewAssignment((current) => ({ ...current, materialType: event.target.value }))}>
              <option value="study_set">Flashcards / Study Set</option>
              <option value="study_guide">Study Guide</option>
              <option value="quiz">Practice Test</option>
            </select>
          </label>
          <label>
            Material ID
            <input value={newAssignment.materialId} onChange={(event) => setNewAssignment((current) => ({ ...current, materialId: event.target.value }))} type="number" />
          </label>
          <label>
            Deadline
            <input value={newAssignment.deadlineAt} onChange={(event) => setNewAssignment((current) => ({ ...current, deadlineAt: event.target.value }))} type="datetime-local" />
          </label>
        </div>
        <button className="td-inline-action" type="button" onClick={createAssignment}>
          Assign Activity
        </button>

        <div className="td-stack-list">
          {assignmentsState.map((assignment) => (
            <article key={assignment.id} className="td-stack-item">
              <div>
                <h3>{assignment.materialType}</h3>
                <p>
                  {assignment.className} · material #{assignment.materialId}
                </p>
              </div>
              <span>{assignment.deadlineAt ? new Date(assignment.deadlineAt).toLocaleString() : 'No deadline'}</span>
            </article>
          ))}
        </div>
      </section>
    </div>
  );

  const renderSection = () => {
    switch (location.pathname) {
      case '/teacher-dashboard/library':
      case '/teacher-dashboard/study-guides':
      case '/teacher-dashboard/practice-tests':
      case '/teacher-dashboard/assign-activity':
        return renderMaterialsHub();
      case '/teacher-dashboard/classes':
        return renderClasses();
      case '/teacher-dashboard/notifications':
        return renderTeacherNotifications();
      case '/teacher-dashboard/students':
        return renderMonitoring();
      case '/teacher-dashboard/reports':
        return renderReports();
      case '/teacher-dashboard/achievements':
        return renderAchievements();
      case '/teacher-dashboard/gamification':
        return renderGamification();
      case '/teacher-dashboard/sharing':
        return renderSharing();
      default:
        return renderDashboard();
    }
  };

  return (
    <div className="td-page">
      <aside className="td-sidebar">
        <div className="td-brand-row">
          <button className="td-icon-btn" type="button" aria-label="Open menu">
            <Menu size={22} />
          </button>
          <div className="td-logo" aria-label="Web Educ Tools">
            <span>Web Educ</span>
            <span>Tools</span>
          </div>
        </div>

        <nav className="td-nav">
          {primaryNav.map((item) => (
            <button
              key={item.label}
              type="button"
              className={`td-nav-item ${location.pathname === item.path ? 'is-active' : ''}`}
              onClick={() => navigateTo(item.path)}
            >
              <span className="td-nav-icon">{item.icon}</span>
              <span>{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="td-divider" />
        <div className="td-group-title">Teacher tools</div>
        <nav className="td-nav td-nav-tight">
          {teacherTools.map((item) => (
            <button
              key={item.label}
              type="button"
              className={`td-nav-item ${location.pathname === item.path ? 'is-active' : ''}`}
              onClick={() => navigateTo(item.path)}
            >
              <span className="td-nav-icon">{item.icon}</span>
              <span>{item.label}</span>
            </button>
          ))}
        </nav>
      </aside>

      <main className="td-main">
        <div className="td-topbar td-topbar-teacher">
          <div className="td-search">
            <Search size={20} />
            <input type="text" placeholder="Search students, classes, sets, and reports" value={search} onChange={(event) => setSearch(event.target.value)} />
          </div>

          <div className="td-top-actions td-top-actions-teacher">
            <button className="td-inline-action" type="button" onClick={() => navigate('/teacher-dashboard/create-content')}>
              <Plus size={14} /> Create
            </button>
            <button className="td-avatar-btn" type="button" aria-label="Profile">
              <span className="td-avatar-initials">{profileInitials}</span>
              <span className="td-avatar-dot" aria-hidden="true" />
            </button>
            <button className="td-inline-action" type="button" onClick={handleLogout} disabled={isLoggingOut}>
              <LogOut size={14} /> {isLoggingOut ? 'Signing out...' : 'Sign out'}
            </button>
          </div>
        </div>

        <div className="dashboard-page-transition">
          {location.pathname !== '/teacher-dashboard' && (
            <section className="td-section">
              <div className="td-row-head">
                <h2>{activeTeacherSection}</h2>
              </div>
              <button className="td-action-card" type="button" onClick={() => navigate('/teacher-dashboard')}>
                <Home size={20} />
                <span>Back to Teacher Home</span>
              </button>
            </section>
          )}

          {renderSection()}
        </div>
      </main>
    </div>
  );
}