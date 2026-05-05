import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import Home from './pages/home';
import StudentDashboard from './pages/student/StudentDashboard';
import StudentFlashcards from './pages/student/StudentFlashcards';
import StudentQuiz from './pages/student/StudentQuiz';
import StudentPracticeTest from './pages/student/StudentPracticeTest';
import TakePracticeTest from './pages/student/TakePracticeTest';
import PracticeTestResults from './pages/student/PracticeTestResults';
import StudentReports from './pages/student/StudentReports';
import StudentActivityAnswer from './pages/student/StudentActivityAnswer';
import TeacherDashboard from './pages/teacher/TeacherDashboard';
import TeacherLibrary from './pages/teacher/TeacherLibrary';
import TeacherClasses from './pages/teacher/TeacherClasses';
import TeacherStudentMonitoring from './pages/teacher/TeacherStudentMonitoring';
import TeacherNotificationsPage from './pages/teacher/TeacherNotificationsPage';
import TeacherReports from './pages/teacher/TeacherReports';
import TeacherStudyGuides from './pages/teacher/TeacherStudyGuides';
import TeacherPracticeTests from './pages/teacher/TeacherPracticeTests';
import CreatePracticeTest from './pages/teacher/CreateTest';
import TeacherAssignActivity from './pages/teacher/TeacherAssignActivity';
import TeacherProfile from './pages/teacher/TeacherProfile';
import StudentSettings from './pages/student/StudentSettings';
import AuthPortal from './pages/AuthPortal';
import AdminDashboard from './pages/AdminDashboard';
import AdminStudents from './pages/admin/AdminStudents';
import AdminTeachers from './pages/admin/AdminTeachers';

type Role = 'student' | 'teacher' | 'admin';

type AuthMeResponse = {
  authenticated?: boolean;
  user?: {
    role?: Role;
  };
};

function RoleGate({ allowedRole, children }: { allowedRole: Role; children: React.ReactElement }) {
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [role, setRole] = useState<Role | null>(null);

  useEffect(() => {
    let mounted = true;

    const loadAuth = async () => {
      try {
        const response = await fetch('/auth/me', {
          method: 'GET',
          credentials: 'include',
          headers: {
            Accept: 'application/json',
          },
        });

        if (!mounted) {
          return;
        }

        if (!response.ok) {
          setIsAuthenticated(false);
          setRole(null);
          setIsLoading(false);
          return;
        }

        const data = (await response.json()) as AuthMeResponse;
        const currentRole = data.user?.role === 'teacher' ? 'teacher' : data.user?.role === 'student' ? 'student' : data.user?.role === 'admin' ? 'admin' : null;

        setIsAuthenticated(Boolean(data.authenticated && currentRole));
        setRole(currentRole);
      } catch {
        if (!mounted) {
          return;
        }

        setIsAuthenticated(false);
        setRole(null);
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    loadAuth();

    return () => {
      mounted = false;
    };
  }, []);

  if (isLoading) {
    return null;
  }

  if (!isAuthenticated || !role) {
    return <Navigate to={allowedRole === 'teacher' ? '/login/teacher' : allowedRole === 'admin' ? '/login/admin' : '/login/student'} replace />;
  }

  if (role !== allowedRole) {
    return <Navigate to={role === 'admin' ? '/admin-dashboard' : role === 'teacher' ? '/teacher-dashboard' : '/student-dashboard'} replace />;
  }

  return children;
}

function RoleHomeRedirect() {
  const [isLoading, setIsLoading] = useState(true);
  const [role, setRole] = useState<Role | null>(null);

  useEffect(() => {
    let mounted = true;

    const resolveHome = async () => {
      try {
        const response = await fetch('/auth/me', {
          method: 'GET',
          credentials: 'include',
          headers: {
            Accept: 'application/json',
          },
        });

        if (!mounted || !response.ok) {
          return;
        }

        const data = (await response.json()) as AuthMeResponse;

        if (data.authenticated && (data.user?.role === 'teacher' || data.user?.role === 'student' || data.user?.role === 'admin')) {
          setRole(data.user.role);
        }
      } catch {
        // Keep public home fallback on request failures.
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    resolveHome();

    return () => {
      mounted = false;
    };
  }, []);

  if (isLoading) {
    return null;
  }

  if (role === 'admin') {
    return <Navigate to="/admin-dashboard" replace />;
  }

  if (role === 'teacher') {
    return <Navigate to="/teacher-dashboard" replace />;
  }

  if (role === 'student') {
    return <Navigate to="/student-dashboard" replace />;
  }

  return <Home />;
}

function AnimatedRoutes() {
  const location = useLocation();
  const studentGuard = (element: React.ReactElement) => (
    <RoleGate allowedRole="student">{element}</RoleGate>
  );
  const teacherGuard = (element: React.ReactElement) => (
    <RoleGate allowedRole="teacher">{element}</RoleGate>
  );
  const adminGuard = (element: React.ReactElement) => (
    <RoleGate allowedRole="admin">{element}</RoleGate>
  );
  const studentSettingsPage = (
    <RoleGate allowedRole="student">
      <StudentSettings />
    </RoleGate>
  );

  return (
    <div key={`${location.pathname}${location.search}`} className="route-transition">
      <Routes location={location}>
        <Route path="/" element={<RoleHomeRedirect />} />
        <Route path="/home" element={<RoleHomeRedirect />} />
        <Route path="/auth" element={<AuthPortal />} />
        <Route path="/login" element={<AuthPortal />} />
        <Route path="/signup" element={<AuthPortal />} />
        <Route path="/login/student" element={<AuthPortal />} />
        <Route path="/login/teacher" element={<AuthPortal />} />
        <Route path="/login/admin" element={<AuthPortal />} />
        <Route path="/signup/student" element={<AuthPortal />} />
        <Route path="/signup/teacher" element={<AuthPortal />} />
        <Route path="/student-dashboard/settings" element={studentSettingsPage} />
        <Route path="/student-dashboard/activity/:activityId" element={studentGuard(<StudentActivityAnswer />)} />
        <Route path="/student-dashboard/practice-tests" element={studentGuard(<StudentPracticeTest />)} />
        <Route path="/student-dashboard/practice-tests/:testId/take" element={studentGuard(<TakePracticeTest />)} />
        <Route path="/student-dashboard/practice-tests/:testId/results" element={studentGuard(<PracticeTestResults />)} />
        <Route path="/student-dashboard/*" element={studentGuard(<StudentDashboard />)} />
        <Route path="/student-dashboard" element={studentGuard(<StudentDashboard />)} />
        <Route path="/admin-dashboard" element={adminGuard(<AdminDashboard />)} />
        <Route path="/admin-dashboard/students" element={adminGuard(<AdminStudents />)} />
        <Route path="/admin-dashboard/teachers" element={adminGuard(<AdminTeachers />)} />
        <Route path="/teacher-dashboard" element={teacherGuard(<TeacherDashboard />)} />
        <Route path="/teacher-dashboard/library" element={teacherGuard(<TeacherLibrary />)} />
        <Route path="/teacher-dashboard/classes" element={teacherGuard(<TeacherClasses />)} />
        <Route path="/teacher-dashboard/students" element={teacherGuard(<TeacherStudentMonitoring />)} />
        <Route path="/teacher-dashboard/notifications" element={teacherGuard(<TeacherNotificationsPage />)} />
        <Route path="/teacher-dashboard/new-class" element={teacherGuard(<TeacherClasses />)} />
        <Route path="/teacher-dashboard/assign-activity" element={teacherGuard(<TeacherAssignActivity />)} />
        <Route path="/teacher-dashboard/study-guides" element={teacherGuard(<TeacherStudyGuides />)} />
        <Route path="/teacher-dashboard/practice-tests" element={teacherGuard(<TeacherPracticeTests />)} />
        <Route path="/teacher-dashboard/practice-tests/create" element={teacherGuard(<CreatePracticeTest />)} />
        <Route path="/teacher-dashboard/practice-tests/edit/:id" element={teacherGuard(<CreatePracticeTest />)} />
        <Route path="/teacher-dashboard/reports" element={teacherGuard(<TeacherReports />)} />
        <Route path="/teacher-dashboard/profile" element={teacherGuard(<TeacherProfile />)} />
      </Routes>
    </div>
  );
}

const root = createRoot(document.getElementById('app')!);

root.render(
  <React.StrictMode>
    <BrowserRouter>
      <AnimatedRoutes />
    </BrowserRouter>
  </React.StrictMode>
);
