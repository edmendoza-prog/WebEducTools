import React, { useEffect, useState } from 'react';
import TeacherLayout from '../../components/ui/TeacherLayout';
import NotificationCenter from '../../components/ui/NotificationCenter';
import { Sparkles, TrendingUp } from 'lucide-react';
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

type SummaryMetric = {
  label: string;
  value: string;
  delta: string;
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

type NotificationItem = {
  id: string;
  title: string;
  message: string;
  createdAt?: string | null;
};

const defaultMetrics: SummaryMetric[] = [
  { label: 'Total study sets created', value: '0', delta: 'No activity yet' },
  { label: 'Student engagement', value: '0%', delta: 'No activity yet' },
  { label: 'Class completion', value: '0%', delta: 'No activity yet' },
  { label: 'Average quiz score', value: '0%', delta: 'No activity yet' },
];

export default function TeacherDashboard() {
  const [summaryMetrics, setSummaryMetrics] = useState<SummaryMetric[]>(defaultMetrics);
  const [activities, setActivities] = useState<ActivityRecord[]>([]);
  const [reportPoints, setReportPoints] = useState<ReportPoint[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      try {
        const [dashboardRes, notificationsRes] = await Promise.all([
          fetch('/api/teacher/dashboard', { method: 'GET', credentials: 'include', headers: { Accept: 'application/json' } }),
          fetch('/api/teacher/notifications', { method: 'GET', credentials: 'include', headers: { Accept: 'application/json' } }),
        ]);

        if (!mounted) return;

        if (dashboardRes.ok) {
          const payload = (await dashboardRes.json()) as {
            summaryMetrics?: SummaryMetric[];
            activities?: ActivityRecord[];
            reportPoints?: ReportPoint[];
          };
          setSummaryMetrics(payload.summaryMetrics ?? defaultMetrics);
          setActivities(payload.activities ?? []);
          setReportPoints(payload.reportPoints ?? []);
        }

        if (notificationsRes.ok) {
          const payload = (await notificationsRes.json()) as { notifications?: NotificationItem[] };
          setNotifications(payload.notifications ?? []);
        }
      } catch {
        // Keep fallback state if API is unavailable.
      }
    };

    load();
    const timer = window.setInterval(load, 15000);
    return () => { mounted = false; window.clearInterval(timer); };
  }, []);

  return (
    <TeacherLayout>
      {() => (
        <div className="td-dashboard-grid">
          <section className="td-metric-grid">
            {summaryMetrics.map((metric) => (
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
                <LineChart data={reportPoints}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="label" />
                  <YAxis domain={[0, 100]} />
                  <Tooltip />
                  <Line type="monotone" dataKey="engagement" stroke="#3b82f6" strokeWidth={3} />
                  <Line type="monotone" dataKey="completion" stroke="#1d4ed8" strokeWidth={3} />
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
              {activities.length === 0 ? (
                <p>No student activity yet.</p>
              ) : (
                activities.map((activity) => (
                  <article key={activity.id} className="td-stack-item">
                    <div>
                      <h3>{activity.student}</h3>
                      <p>{activity.action} � {activity.resource}</p>
                    </div>
                    <span>{activity.time}</span>
                  </article>
                ))
              )}
            </div>
          </section>

          <section className="td-panel">
            <NotificationCenter title="Live Notifications" items={notifications} emptyText="No teacher alerts yet." />
          </section>
        </div>
      )}
    </TeacherLayout>
  );
}

