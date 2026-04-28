import React from 'react';
import { CircleHelp, Eye, X } from 'lucide-react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { csrfFetch } from '../lib/csrf';

type Role = 'student' | 'teacher' | 'admin';
type Mode = 'login' | 'signup';

type AuthResponse = {
  message?: string;
  user?: {
    role?: Role;
  };
  actual_role?: Role;
};

function normalizeRole(value: string | null): Role {
  return value === 'teacher' ? 'teacher' : value === 'admin' ? 'admin' : 'student';
}

function normalizeMode(value: string | null): Mode {
  return value === 'signup' ? 'signup' : 'login';
}

export default function AuthPortal() {
  const navigate = useNavigate();
  const location = useLocation();
  const [params] = useSearchParams();

  const forcedRole: Role | null =
    location.pathname === '/signup/student' || location.pathname === '/login/student'
      ? 'student'
      : location.pathname === '/signup/teacher' || location.pathname === '/login/teacher'
        ? 'teacher'
        : location.pathname === '/login/admin'
        ? 'admin'
        : null;

  const forcedMode: Mode | null =
    location.pathname === '/signup/student' || location.pathname === '/signup/teacher'
      ? 'signup'
      : location.pathname === '/login/student' || location.pathname === '/login/teacher'
        ? 'login'
        : null;

  const role = forcedRole ?? normalizeRole(params.get('role'));
  const mode = forcedMode ?? normalizeMode(params.get('mode'));
  const [username, setUsername] = React.useState('');
  const [birthDay, setBirthDay] = React.useState('');
  const [birthMonth, setBirthMonth] = React.useState('');
  const [birthYear, setBirthYear] = React.useState('');
  const [acceptTerms, setAcceptTerms] = React.useState(false);
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [suggestedLoginPath, setSuggestedLoginPath] = React.useState<string | null>(null);

  const roleLabel = role === 'teacher' ? 'Teacher' : role === 'admin' ? 'Admin' : 'Student';
  const isLogin = mode === 'login';
  const signUpPath = role === 'teacher' ? '/signup/teacher' : '/signup/student';
  const loginPath = role === 'teacher' ? '/login/teacher' : role === 'admin' ? '/login/admin' : '/login/student';

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setSuggestedLoginPath(null);

    try {
      const endpoint = isLogin ? '/auth/login' : '/auth/register';
      const payload = isLogin
        ? { email, password, expected_role: role }
        : { name: username, email, password, role };

      const response = await csrfFetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = (await response.json()) as AuthResponse;

      if (!response.ok) {
        setError(data.message ?? 'Authentication failed.');

        if (isLogin && response.status === 403 && (data.actual_role === 'student' || data.actual_role === 'teacher' || data.actual_role === 'admin')) {
          setSuggestedLoginPath(data.actual_role === 'admin' ? '/login/admin' : data.actual_role === 'teacher' ? '/login/teacher' : '/login/student');
        }

        return;
      }

      const targetRole = data?.user?.role === 'teacher' ? 'teacher' : data?.user?.role === 'admin' ? 'admin' : data?.user?.role === 'student' ? 'student' : role;
      navigate(targetRole === 'admin' ? '/admin-dashboard' : targetRole === 'teacher' ? '/teacher-dashboard' : '/student-dashboard');
    } catch {
      setError('Unable to connect to the server.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <section className="auth-left">
        <div className="auth-left-gradient" />
        <div className="auth-left-content">
          <h1>{isLogin ? 'Welcome back.' : 'The best way to study.\nSign up for free.'}</h1>
          <p>{roleLabel} account access for EduQuest.</p>
        </div>

        <div className="auth-logo-center">
          <img src="/eduquest-logo.png.png" alt="EduQuest" />
        </div>
      </section>

      <section className="auth-right">
        <Link to="/home" className="auth-close" aria-label="Close auth dialog">
          <X size={20} />
        </Link>

        <div className={`auth-card ${isLogin ? 'is-login' : 'is-signup'}`}>
          {role !== 'admin' && (
            <div className="auth-top-tabs">
              <Link
                to={signUpPath}
                className={`auth-tab ${!isLogin ? 'is-active' : ''}`}
              >
                Sign up
              </Link>
              <Link
                to={loginPath}
                className={`auth-tab ${isLogin ? 'is-active' : ''}`}
              >
                Log in
              </Link>
            </div>
          )}
          
          {role === 'admin' && (
            <div className="auth-admin-header">
              <h2>Admin Login</h2>
              <p>Enter your administrator credentials</p>
            </div>
          )}

          {!isLogin && role !== 'admin' && (
            <div className="auth-separator">
              <span>or email</span>
            </div>
          )}

          <form className="auth-form" onSubmit={handleSubmit}>
            {!isLogin && role !== 'admin' && (
              <label className="auth-label">
                <span className="auth-inline-label">
                  Date of birth <CircleHelp size={14} />
                </span>
                <div className="auth-dob-row">
                  <select
                    className="auth-input auth-select"
                    value={birthDay}
                    onChange={(e) => setBirthDay(e.target.value)}
                    required
                  >
                    <option value="">Day</option>
                    {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
                      <option key={d} value={String(d)}>{d}</option>
                    ))}
                  </select>
                  <select
                    className="auth-input auth-select"
                    value={birthMonth}
                    onChange={(e) => setBirthMonth(e.target.value)}
                    required
                  >
                    <option value="">Month</option>
                    {[
                      'January', 'February', 'March', 'April', 'May', 'June',
                      'July', 'August', 'September', 'October', 'November', 'December',
                    ].map((m) => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                  <select
                    className="auth-input auth-select"
                    value={birthYear}
                    onChange={(e) => setBirthYear(e.target.value)}
                    required
                  >
                    <option value="">Year</option>
                    {Array.from({ length: 80 }, (_, i) => new Date().getFullYear() - i).map((y) => (
                      <option key={y} value={String(y)}>{y}</option>
                    ))}
                  </select>
                </div>
              </label>
            )}

            <label className="auth-label">
              Email
              <input
                className="auth-input"
                type="email"
                placeholder="Enter your email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </label>

            {!isLogin && role !== 'admin' && (
              <label className="auth-label">
                Username
                <input
                  className="auth-input"
                  type="text"
                  placeholder="Choose a username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                />
              </label>
            )}

            <label className="auth-label">
              <span className="auth-label-row">
                Password
                {isLogin && <a href="#">Forgot password</a>}
              </span>
              <span className="auth-password-wrap">
                <input
                  className="auth-input"
                  type="password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  minLength={8}
                  required
                />
                <button className="auth-eye" type="button" aria-label="Toggle password visibility">
                  <Eye size={18} />
                </button>
              </span>
            </label>

            {error && <p className="auth-error">{error}</p>}

            {suggestedLoginPath && (
              <Link to={suggestedLoginPath} className="auth-secondary-btn auth-secondary-link">
                Go to the correct login portal
              </Link>
            )}

            {!isLogin ? (
              <label className="auth-checkbox-row">
                <input
                  type="checkbox"
                  checked={acceptTerms}
                  onChange={(e) => setAcceptTerms(e.target.checked)}
                  required
                />
                <span>
                  I accept EduQuest's <a href="#">Terms of Service</a> and <a href="#">Privacy Policy</a>
                </span>
              </label>
            ) : (
              <p className="auth-terms">
                By continuing, you accept EduQuest's <a href="#">Terms of Service</a> and{' '}
                <a href="#">Privacy Policy</a>.
              </p>
            )}

            <button className="auth-primary-btn" type="submit" disabled={loading}>
              {isLogin ? `Log in as ${roleLabel}` : 'Sign up'}
            </button>

            {role !== 'admin' && (
              <>
                <Link
                  to={isLogin ? signUpPath : loginPath}
                  className="auth-secondary-btn auth-secondary-link"
                >
                  {isLogin ? 'New here? Create an account' : 'Already have an account? Log in'}
                </Link>

                <button className="auth-magic-link" type="button">
                  Log in with a magic link
                </button>
              </>
            )}
            
            {role === 'admin' && (
              <Link to="/login/student" className="auth-secondary-btn auth-secondary-link">
                Not an admin? Go to student login
              </Link>
            )}
          </form>
        </div>
      </section>
    </div>
  );
}
