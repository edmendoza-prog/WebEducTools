import React, { ReactNode, useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Users, 
  GraduationCap, 
  LogOut
} from 'lucide-react';

type AdminLayoutProps = {
  children: ReactNode;
};

type NavigationItem = {
  label: string;
  icon: React.ReactElement;
  path: string;
};

export default function AdminLayout({ children }: AdminLayoutProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const [user, setUser] = useState<{ name: string; email: string; role: string } | null>(null);

  const navItems: NavigationItem[] = [
    { label: 'Dashboard', icon: <LayoutDashboard size={18} />, path: '/admin-dashboard' },
    { label: 'Students', icon: <Users size={18} />, path: '/admin-dashboard/students' },
    { label: 'Teachers', icon: <GraduationCap size={18} />, path: '/admin-dashboard/teachers' },
  ];

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const response = await fetch('/auth/me', {
          credentials: 'include',
          headers: { Accept: 'application/json' },
        });
        if (response.ok) {
          const data = await response.json();
          setUser(data.user);
          
          // Redirect if not admin
          if (data.user.role !== 'admin') {
            navigate('/');
          }
        }
      } catch (error) {
        console.error('Failed to fetch user', error);
      }
    };

    fetchUser();
  }, [navigate]);

  const handleLogout = async () => {
    try {
      await fetch('/auth/logout', {
        method: 'POST',
        credentials: 'include',
        headers: { Accept: 'application/json' },
      });
      navigate('/login');
    } catch (error) {
      console.error('Logout failed', error);
    }
  };

  const isActive = (path: string) => {
    if (path === '/admin-dashboard') {
      return location.pathname === path;
    }
    return location.pathname.startsWith(path);
  };

  return (
    <div className="admin-layout">
      {/* Sidebar */}
      <aside className="admin-sidebar">
        <div className="admin-brand">
          <img src="/eduquest-logo.png.png" alt="EduQuest" />
          <div className="admin-brand-text">
            <p>EduQuest</p>
            <small>Admin Panel</small>
          </div>
        </div>

        <nav className="admin-nav">
          {navItems.map((item) => (
            <button
              key={item.path}
              type="button"
              className={`admin-nav-item ${isActive(item.path) ? 'is-active' : ''}`}
              onClick={() => navigate(item.path)}
            >
              {item.icon}
              <span>{item.label}</span>
            </button>
          ))}
        </nav>
      </aside>

      {/* Main Content */}
      <main className="admin-main">
        <header className="admin-topbar">
          <div className="admin-header-copy">
            <h1>{navItems.find(item => isActive(item.path))?.label || 'Admin Dashboard'}</h1>
            <p>Manage your educational platform.</p>
          </div>

          <div className="admin-user-actions">
            {user && (
              <div className="admin-user-menu">
                <div className="admin-user-avatar">
                  {user.name.charAt(0).toUpperCase()}
                </div>
                <div className="admin-user-details">
                  <p className="admin-user-name">{user.name}</p>
                  <p className="admin-user-role">Administrator</p>
                </div>
              </div>
            )}
            <button onClick={handleLogout} className="admin-logout-btn" title="Logout">
              <LogOut size={18} />
              <span>Logout</span>
            </button>
          </div>
        </header>

        <div className="admin-content">
          {children}
        </div>
      </main>
    </div>
  );
}
