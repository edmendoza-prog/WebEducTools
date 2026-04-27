import React, { useEffect, useState } from 'react';
import AdminLayout from '../components/ui/AdminLayout';
import { Users, GraduationCap, TrendingUp, Activity } from 'lucide-react';

type DashboardStats = {
  totalStudents: number;
  totalTeachers: number;
  totalUsers: number;
  activeUsers: number;
};

type RecentUser = {
  id: number;
  name: string;
  email: string;
  created_at: string;
};

export default function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    totalStudents: 0,
    totalTeachers: 0,
    totalUsers: 0,
    activeUsers: 0,
  });
  const [recentStudents, setRecentStudents] = useState<RecentUser[]>([]);
  const [recentTeachers, setRecentTeachers] = useState<RecentUser[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const response = await fetch('/api/admin/dashboard', {
          credentials: 'include',
          headers: { Accept: 'application/json' },
        });

        if (response.ok) {
          const data = await response.json();
          setStats(data.stats);
          setRecentStudents(data.recentStudents);
          setRecentTeachers(data.recentTeachers);
        }
      } catch (error) {
        console.error('Failed to fetch dashboard data', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="admin-loading">Loading...</div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="admin-dashboard-container">
        {/* Stats Cards */}
        <div className="admin-stats-grid">
          <div className="admin-stat-card">
            <div className="admin-stat-icon users">
              <Users size={24} />
            </div>
            <div className="admin-stat-content">
              <p className="admin-stat-label">Total Students</p>
              <h3 className="admin-stat-value">{stats.totalStudents}</h3>
            </div>
          </div>

          <div className="admin-stat-card">
            <div className="admin-stat-icon teachers">
              <GraduationCap size={24} />
            </div>
            <div className="admin-stat-content">
              <p className="admin-stat-label">Total Teachers</p>
              <h3 className="admin-stat-value">{stats.totalTeachers}</h3>
            </div>
          </div>

          <div className="admin-stat-card">
            <div className="admin-stat-icon total">
              <TrendingUp size={24} />
            </div>
            <div className="admin-stat-content">
              <p className="admin-stat-label">Total Users</p>
              <h3 className="admin-stat-value">{stats.totalUsers}</h3>
            </div>
          </div>

          <div className="admin-stat-card">
            <div className="admin-stat-icon active">
              <Activity size={24} />
            </div>
            <div className="admin-stat-content">
              <p className="admin-stat-label">Active (7 days)</p>
              <h3 className="admin-stat-value">{stats.activeUsers}</h3>
            </div>
          </div>
        </div>

        {/* Recent Users */}
        <div className="admin-dashboard-grid">
          {/* Recent Students */}
          <div className="admin-panel">
            <div className="admin-panel-header">
              <h2 className="admin-panel-title">Recent Students</h2>
              <Users size={18} />
            </div>
            <div className="admin-user-list">
              {recentStudents.length === 0 ? (
                <p className="admin-empty-state">No students yet</p>
              ) : (
                recentStudents.map((student) => (
                  <div key={student.id} className="admin-user-item">
                    <div className="admin-user-avatar">
                      {student.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="admin-user-info">
                      <p className="admin-user-name">{student.name}</p>
                      <p className="admin-user-email">{student.email}</p>
                    </div>
                    <span className="admin-user-date">{formatDate(student.created_at)}</span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Recent Teachers */}
          <div className="admin-panel">
            <div className="admin-panel-header">
              <h2 className="admin-panel-title">Recent Teachers</h2>
              <GraduationCap size={18} />
            </div>
            <div className="admin-user-list">
              {recentTeachers.length === 0 ? (
                <p className="admin-empty-state">No teachers yet</p>
              ) : (
                recentTeachers.map((teacher) => (
                  <div key={teacher.id} className="admin-user-item">
                    <div className="admin-user-avatar">
                      {teacher.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="admin-user-info">
                      <p className="admin-user-name">{teacher.name}</p>
                      <p className="admin-user-email">{teacher.email}</p>
                    </div>
                    <span className="admin-user-date">{formatDate(teacher.created_at)}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
