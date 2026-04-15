import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import Home from './pages/home';
import StudentDasboard from './pages/StudentDasboard';
import TeacherDashboard from './pages/TeacherDashboard';
import TeacherCreateContent from './pages/TeacherCreateContent';
import AuthPortal from './pages/AuthPortal';

type Role = 'student' | 'teacher';

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
        const currentRole = data.user?.role === 'teacher' ? 'teacher' : data.user?.role === 'student' ? 'student' : null;

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
    return <Navigate to={allowedRole === 'teacher' ? '/login/teacher' : '/login/student'} replace />;
  }

  if (role !== allowedRole) {
    return <Navigate to={role === 'teacher' ? '/teacher-dashboard' : '/student-dashboard'} replace />;
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

        if (data.authenticated && (data.user?.role === 'teacher' || data.user?.role === 'student')) {
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
  const studentPage = (
    <RoleGate allowedRole="student">
      <StudentDasboard />
    </RoleGate>
  );
  const teacherPage = (
    <RoleGate allowedRole="teacher">
      <TeacherDashboard />
    </RoleGate>
  );
  const teacherCreatePage = (
    <RoleGate allowedRole="teacher">
      <TeacherCreateContent />
    </RoleGate>
  );

  return (
    <div key={`${location.pathname}${location.search}`} className="route-transition">
      <Routes location={location}>
        <Route path="/" element={<RoleHomeRedirect />} />
        <Route path="/home" element={<RoleHomeRedirect />} />
        <Route path="/auth" element={<AuthPortal />} />
        <Route path="/login/student" element={<AuthPortal />} />
        <Route path="/login/teacher" element={<AuthPortal />} />
        <Route path="/signup/student" element={<AuthPortal />} />
        <Route path="/signup/teacher" element={<AuthPortal />} />
        <Route path="/student-dashboard" element={studentPage} />
        <Route path="/student-dashboard/library" element={studentPage} />
        <Route path="/student-dashboard/study-groups" element={studentPage} />
        <Route path="/student-dashboard/notifications" element={studentPage} />
        <Route path="/student-dashboard/flashcards" element={studentPage} />
        <Route path="/student-dashboard/quiz" element={studentPage} />
        <Route path="/student-dashboard/study-guides" element={studentPage} />
        <Route path="/student-dashboard/practice-tests" element={studentPage} />
        <Route path="/student-dashboard/reports" element={studentPage} />
        <Route path="/student-dashboard/achievements" element={studentPage} />
        <Route path="/student-dashboard/expert-solutions" element={studentPage} />
        <Route path="/student-dashboard/folders/new" element={studentPage} />
        <Route path="/teacher-dashboard" element={teacherPage} />
        <Route path="/teacher-dashboard/library" element={teacherPage} />
        <Route path="/teacher-dashboard/classes" element={teacherPage} />
        <Route path="/teacher-dashboard/students" element={teacherPage} />
        <Route path="/teacher-dashboard/notifications" element={teacherPage} />
        <Route path="/teacher-dashboard/new-class" element={teacherPage} />
        <Route path="/teacher-dashboard/assign-activity" element={teacherPage} />
        <Route path="/teacher-dashboard/study-guides" element={teacherPage} />
        <Route path="/teacher-dashboard/practice-tests" element={teacherPage} />
        <Route path="/teacher-dashboard/reports" element={teacherPage} />
        <Route path="/teacher-dashboard/achievements" element={teacherPage} />
        <Route path="/teacher-dashboard/gamification" element={teacherPage} />
        <Route path="/teacher-dashboard/sharing" element={teacherPage} />
        <Route path="/teacher-dashboard/create-content" element={teacherCreatePage} />
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
