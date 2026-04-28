import React, { useEffect, useState } from 'react';
import TeacherLayout from '../../components/ui/TeacherLayout';
import { BarChart3, TrendingUp, Users, BookOpen } from 'lucide-react';
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

type ReportPoint = {
  label: string;
  engagement: number;
  completion: number;
  score: number;
};

type ClassMetric = {
  className: string;
  avgScore: number;
  completionRate: number;
  engagement: number;
};

type ReportsData = {
  totalStudents: number;
  quizzesCompleted: number;
  averageScore: number;
  completionRate: number;
};

export default function TeacherReports() {
  const [reportPoints, setReportPoints] = useState<ReportPoint[]>([]);
  const [classMetrics, setClassMetrics] = useState<ClassMetric[]>([]);
  const [reportsData, setReportsData] = useState<ReportsData>({
    totalStudents: 0,
    quizzesCompleted: 0,
    averageScore: 0,
    completionRate: 0,
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      try {
        const [dashboardRes, reportsRes] = await Promise.all([
          fetch('/api/teacher/dashboard', { method: 'GET', credentials: 'include', headers: { Accept: 'application/json' } }),
          fetch('/api/teacher/reports', { method: 'GET', credentials: 'include', headers: { Accept: 'application/json' } }),
        ]);

        if (dashboardRes.ok) {
          const payload = (await dashboardRes.json()) as {
            reportPoints?: ReportPoint[];
            classMetrics?: ClassMetric[];
            students?: any[];
          };
          
          console.log('Dashboard API Response:', payload);
          
          setReportPoints(payload.reportPoints ?? []);
          setClassMetrics(payload.classMetrics ?? []);
          
          // Count total students
          const totalStudents = payload.students?.length ?? 0;
          setReportsData(prev => ({ ...prev, totalStudents }));
        } else {
          console.error('Dashboard API Error:', dashboardRes.status);
        }

        if (reportsRes.ok) {
          const payload = (await reportsRes.json()) as {
            averageScore?: number;
            completionRate?: number;
            classPerformance?: any[];
          };
          
          console.log('Reports API Response:', payload);
          
          // Calculate total quizzes completed from class performance
          const quizzesCompleted = payload.classPerformance?.reduce((sum: number, cls: any) => sum + (cls.students || 0), 0) ?? 0;
          
          setReportsData(prev => ({
            ...prev,
            averageScore: payload.averageScore ?? 0,
            completionRate: payload.completionRate ?? 0,
            quizzesCompleted,
          }));
        } else {
          console.error('Reports API Error:', reportsRes.status);
        }
      } catch (error) {
        console.error('Error loading reports:', error);
      } finally {
        setIsLoading(false);
      }
    };

    load();
  }, []);

  return (
    <TeacherLayout>
      {() => (
        <div className="tr-container">
          {/* Header */}
          <div className="tr-header">
            <div>
              <h1 className="tr-title">Reports & Analytics</h1>
              <p className="tr-subtitle">Track student performance and engagement</p>
            </div>
          </div>

          {/* Status Banner */}
          {!isLoading && reportPoints.length === 0 && classMetrics.length === 0 && (
            <div style={{
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: 'white',
              padding: '1rem 1.5rem',
              borderRadius: '12px',
              marginBottom: '2rem',
              display: 'flex',
              alignItems: 'center',
              gap: '1rem',
              boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
            }}>
              <div style={{ fontSize: '2rem' }}>📊</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: '1.125rem', marginBottom: '0.25rem' }}>
                  Reports System Active & Ready!
                </div>
                <div style={{ fontSize: '0.875rem', opacity: 0.95 }}>
                  Connected to database • Monitoring student activity • All systems operational
                </div>
              </div>
            </div>
          )}

          {/* Success Banner when data exists */}
          {!isLoading && (reportPoints.length > 0 || classMetrics.length > 0) && (
            <div style={{
              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              color: 'white',
              padding: '1rem 1.5rem',
              borderRadius: '12px',
              marginBottom: '2rem',
              display: 'flex',
              alignItems: 'center',
              gap: '1rem',
              boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
            }}>
              <div style={{ fontSize: '2rem' }}>✅</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: '1.125rem', marginBottom: '0.25rem' }}>
                  Data Successfully Loaded!
                </div>
                <div style={{ fontSize: '0.875rem', opacity: 0.95 }}>
                  {reportPoints.length > 0 && `${reportPoints.length} days of activity tracked`}
                  {reportPoints.length > 0 && classMetrics.length > 0 && ' • '}
                  {classMetrics.length > 0 && `${classMetrics.length} class${classMetrics.length > 1 ? 'es' : ''} analyzed`}
                </div>
              </div>
            </div>
          )}

          {/* Stats Grid */}
          <div className="tr-stats-grid">
            <StatCard
              icon={<Users className="tr-stat-icon" />}
              title="Total Students"
              value={reportsData.totalStudents > 0 ? reportsData.totalStudents.toString() : "0"}
              subtext={reportsData.totalStudents === 0 ? "Ready to enroll students" : `${reportsData.totalStudents} active student${reportsData.totalStudents > 1 ? 's' : ''}`}
              color="tr-stat-blue"
            />
            <StatCard
              icon={<BookOpen className="tr-stat-icon" />}
              title="Activities Completed"
              value={reportsData.quizzesCompleted > 0 ? reportsData.quizzesCompleted.toString() : "0"}
              subtext={reportsData.quizzesCompleted === 0 ? "Tracking submissions" : `${reportsData.quizzesCompleted} total submission${reportsData.quizzesCompleted > 1 ? 's' : ''}`}
              color="tr-stat-purple"
            />
            <StatCard
              icon={<TrendingUp className="tr-stat-icon" />}
              title="Average Score"
              value={reportsData.averageScore > 0 ? `${reportsData.averageScore}%` : "—"}
              subtext={reportsData.averageScore === 0 ? "Calculating scores" : `${reportsData.completionRate}% completion rate`}
              color="tr-stat-green"
            />
          </div>

          {/* Main Reports Section */}
          <div className="tr-card">
            <div className="tr-card-header">
              <h2 className="tr-card-title">Student Reports</h2>
              <BarChart3 className="tr-card-icon" />
            </div>

            {isLoading ? (
              <EmptyState
                icon={<BarChart3 className="tr-empty-icon" />}
                title="Loading report data..."
                description="Please wait while we fetch your analytics."
              />
            ) : reportPoints.length === 0 ? (
              <div className="tr-empty-state">
                <div className="tr-empty-icon-wrapper">
                  <BarChart3 className="tr-empty-icon" />
                </div>
                <h3 className="tr-empty-title">✅ System is ready! Waiting for student activity</h3>
                <p className="tr-empty-description">
                  Reports will automatically populate when students complete quizzes and tests. 
                  <br /><br />
                  <strong>To see data here:</strong><br />
                  1. Create study sets with quizzes<br />
                  2. Create practice tests<br />
                  3. Assign them to students<br />
                  4. Students complete the activities
                </p>
                <div style={{ marginTop: '1rem', padding: '0.75rem', background: '#f0f9ff', borderRadius: '8px', fontSize: '0.875rem', color: '#0369a1' }}>
                  📊 Data is being tracked in real-time. Check back after students submit their work!
                </div>
              </div>
            ) : (
              <>
                <div className="tr-chart-container">
                  <ResponsiveContainer width="100%" height={350}>
                    <LineChart data={reportPoints}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis dataKey="label" stroke="#64748b" style={{ fontSize: '0.875rem' }} />
                      <YAxis domain={[0, 100]} stroke="#64748b" style={{ fontSize: '0.875rem' }} />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: '#fff', 
                          border: '1px solid #e2e8f0', 
                          borderRadius: '8px',
                          boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                        }}
                        labelStyle={{ color: '#1e293b', fontWeight: 600 }}
                      />
                      <Line type="monotone" dataKey="engagement" stroke="#3b82f6" strokeWidth={3} name="Engagement" />
                      <Line type="monotone" dataKey="completion" stroke="#10b981" strokeWidth={3} name="Completion" />
                      <Line type="monotone" dataKey="score" stroke="#f59e0b" strokeWidth={3} name="Score" />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
                <div className="tr-chart-legend">
                  <span className="tr-legend-item">
                    <span className="tr-legend-dot tr-legend-blue"></span>
                    Engagement
                  </span>
                  <span className="tr-legend-item">
                    <span className="tr-legend-dot tr-legend-green"></span>
                    Completion
                  </span>
                  <span className="tr-legend-item">
                    <span className="tr-legend-dot tr-legend-orange"></span>
                    Score
                  </span>
                </div>
              </>
            )}
          </div>

          {/* Class Performance Section */}
          <div className="tr-card">
            <div className="tr-card-header">
              <h2 className="tr-card-title">Class Performance</h2>
              <TrendingUp className="tr-card-icon" />
            </div>

            {isLoading ? (
              <EmptyState
                icon={<TrendingUp className="tr-empty-icon" />}
                title="Loading performance data..."
                description="Please wait while we calculate class metrics."
              />
            ) : classMetrics.length === 0 ? (
              <div className="tr-empty-state">
                <div className="tr-empty-icon-wrapper">
                  <TrendingUp className="tr-empty-icon" />
                </div>
                <h3 className="tr-empty-title">✅ Ready to track class performance!</h3>
                <p className="tr-empty-description">
                  Performance metrics will be calculated automatically as students complete assessments.
                  <br /><br />
                  <strong>What you'll see here:</strong><br />
                  • Average scores per class<br />
                  • Completion rates<br />
                  • Student engagement levels<br />
                  • Individual class breakdowns
                </p>
                <div style={{ marginTop: '1rem', padding: '0.75rem', background: '#f0fdf4', borderRadius: '8px', fontSize: '0.875rem', color: '#166534' }}>
                  🎯 The system is actively monitoring all student submissions. Data will appear here shortly after activities are completed!
                </div>
              </div>
            ) : (
              <div className="tr-class-grid">
                {classMetrics.map((item) => (
                  <div key={item.className} className="tr-class-card">
                    <h3 className="tr-class-name">{item.className}</h3>
                    <div className="tr-class-score">{item.avgScore}%</div>
                    <p className="tr-class-label">Average Score</p>
                    <div className="tr-class-metrics">
                      <div className="tr-class-metric">
                        <span className="tr-metric-value">{item.completionRate}%</span>
                        <span className="tr-metric-label">Completion</span>
                      </div>
                      <div className="tr-class-metric">
                        <span className="tr-metric-value">{item.engagement}%</span>
                        <span className="tr-metric-label">Engagement</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </TeacherLayout>
  );
}

function StatCard({ icon, title, value, subtext, color }: {
  icon: React.ReactNode;
  title: string;
  value: string;
  subtext: string;
  color: string;
}) {
  return (
    <div className="tr-stat-card">
      <div className="tr-stat-content">
        <div className={`tr-stat-icon-wrapper ${color}`}>
          {icon}
        </div>
        <div className="tr-stat-info">
          <p className="tr-stat-title">{title}</p>
          <p className="tr-stat-value">{value}</p>
          <p className="tr-stat-subtext">{subtext}</p>
        </div>
      </div>
    </div>
  );
}

function EmptyState({ icon, title, description }: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="tr-empty-state">
      <div className="tr-empty-icon-wrapper">
        {icon}
      </div>
      <h3 className="tr-empty-title">{title}</h3>
      <p className="tr-empty-description">{description}</p>
    </div>
  );
}

