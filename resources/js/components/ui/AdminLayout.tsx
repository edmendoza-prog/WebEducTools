import React, { ReactNode, useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Users, 
  GraduationCap, 
  Sparkles, 
  Menu,
  X,
  LogOut,
  ChevronRight
} from 'lucide-react';

type AdminLayoutProps = {
  children: ReactNode | ((props: { isSidebarOpen: boolean; toggleSidebar: () => void }) => ReactNode);
};

type NavigationItem = {
  label: string;
  icon: React.ReactElement;
  path: string;
};

export default function AdminLayout({ children }: AdminLayoutProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [user, setUser] = useState<{ name: string; email: string; role: string } | null>(null);

  const navItems: NavigationItem[] = [
    { label: 'Dashboard', icon: <LayoutDashboard size={18} />, path: '/admin-dashboard' },
    { label: 'Students', icon: <Users size={18} />, path: '/admin-dashboard/students' },
    { label: 'Teachers', icon: <GraduationCap size={18} />, path: '/admin-dashboard/teachers' },
    { label: 'Gamification', icon: <Sparkles size={18} />, path: '/admin-dashboard/gamification' },
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

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

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
      <aside className={`admin-sidebar ${isSidebarOpen ? 'open' : 'closed'}`}>
        <div className="admin-sidebar-header">
          <div className="admin-logo">
            <Sparkles size={24} className="admin-logo-icon" />
            {isSidebarOpen && <span className="admin-logo-text">Admin Panel</span>}
          </div>
        </div>

        <nav className="admin-nav">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`admin-nav-item ${isActive(item.path) ? 'active' : ''}`}
            >
              <span className="admin-nav-icon">{item.icon}</span>
              {isSidebarOpen && (
                <>
                  <span className="admin-nav-label">{item.label}</span>
                  <ChevronRight size={16} className="admin-nav-arrow" />
                </>
              )}
            </Link>
          ))}
        </nav>

        <div className="admin-sidebar-footer">
          {user && (
            <div className="admin-user-info">
              {isSidebarOpen && (
                <>
                  <div className="admin-user-avatar">
                    {user.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="admin-user-details">
                    <p className="admin-user-name">{user.name}</p>
                    <p className="admin-user-role">Administrator</p>
                  </div>
                </>
              )}
            </div>
          )}
          <button onClick={handleLogout} className="admin-logout-btn" title="Logout">
            <LogOut size={18} />
            {isSidebarOpen && <span>Logout</span>}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className={`admin-main ${isSidebarOpen ? 'sidebar-open' : 'sidebar-closed'}`}>
        <header className="admin-header">
          <button onClick={toggleSidebar} className="admin-sidebar-toggle">
            {isSidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
          <div className="admin-header-title">
            <h1>{navItems.find(item => isActive(item.path))?.label || 'Admin Dashboard'}</h1>
          </div>
        </header>

        <main className="admin-content">
          {typeof children === 'function' 
            ? children({ isSidebarOpen, toggleSidebar })
            : children
          }
        </main>
      </div>
    </div>
  );
}
