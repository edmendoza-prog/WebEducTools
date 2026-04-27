import React, { useEffect, useState } from 'react';
import TeacherLayout from '../../components/ui/TeacherLayout';
import { BarChart3, CircleHelp, TrendingUp } from 'lucide-react';
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

type DifficultQuestion = {
  question: string;
  correctRate: number;
  attempts: number;
  className: string;
};

export default function TeacherReports() {
  const [reportPoints, setReportPoints] = useState<ReportPoint[]>([]);
  const [classMetrics, setClassMetrics] = useState<ClassMetric[]>([]);
  const [difficultQuestions, setDifficultQuestions] = useState<DifficultQuestion[]>([]);
  const [reportSummary, setReportSummary] = useState({ averageScore: 0, completionRate: 0 });
  const [topicDifficulty, setTopicDifficulty] = useState<Array<{ topic: string; averageScore: number; attempts: number }>>([]);

  useEffect(() => {
    const load = async () => {
      try {
        const [dashboardRes, reportsRes] = await Promise.all([
          fetch('/api/teacher/dashboard', { method: 'GET', credentials: 'include', headers: { Accept: 'application/json' } }),
          fetch('/api/teacher/reports', { method: 'GET', credentials: 'include', headers: { Accept: 'application/json' } }),
        ]);

        if (dashboardRes.ok) {
          const payload = (await dashboardRes.json()) as {
            reportPoints?: ReportPoint[];
            classMetrics?: ClassMetric[];
            difficultQuestions?: DifficultQuestion[];
          };
          setReportPoints(payload.reportPoints ?? []);
          setClassMetrics(payload.classMetrics ?? []);
          setDifficultQuestions(payload.difficultQuestions ?? []);
        }

        if (reportsRes.ok) {
          const payload = (await reportsRes.json()) as {
            averageScore?: number;
            completionRate?: number;
            topicDifficulty?: Array<{ topic: string; averageScore: number; attempts: number }>;
          };
          setReportSummary({ averageScore: payload.averageScore ?? 0, completionRate: payload.completionRate ?? 0 });
          setTopicDifficulty(payload.topicDifficulty ?? []);
        }
      } catch {
        // Keep empty state if unavailable.
      }
    };

    load();
  }, []);

  const allDifficult = [
    ...difficultQuestions,
    ...topicDifficulty.map((t) => ({ question: t.topic, className: 'All classes', correctRate: t.averageScore, attempts: t.attempts })),
  ];

  return (
    <TeacherLayout>
      {() => (
        <div className="td-dashboard-grid">
          <section className="td-panel td-panel-span-2">
            <div className="td-panel-head">
              <h2>Reports &amp; Analytics</h2>
              <BarChart3 size={16} />
            </div>
            {reportPoints.length === 0 ? (
              <p className="td-empty-state">No report data yet.</p>
            ) : (
              <>
                <div className="td-chart-card">
                  <ResponsiveContainer width="100%" height={280}>
                    <LineChart data={reportPoints}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="label" />
                      <YAxis domain={[0, 100]} />
                      <Tooltip />
                      <Line type="monotone" dataKey="engagement" stroke="#3b82f6" strokeWidth={3} />
                      <Line type="monotone" dataKey="score" stroke="#0ea5e9" strokeWidth={3} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
                <div className="td-mini-metrics">
                  <span>Average score {reportSummary.averageScore}%</span>
                  <span>Completion rate {reportSummary.completionRate}%</span>
                </div>
              </>
            )}
          </section>

          <section className="td-panel">
            <div className="td-panel-head">
              <h2>Class Performance</h2>
              <TrendingUp size={16} />
            </div>
            <div className="td-stack-list">
              {classMetrics.length === 0 ? (
                <p className="td-empty-state">No class performance data yet.</p>
              ) : (
                classMetrics.map((item) => (
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
                ))
              )}
            </div>
          </section>

          <section className="td-panel">
            <div className="td-panel-head">
              <h2>Most Difficult Questions</h2>
              <CircleHelp size={16} />
            </div>
            <div className="td-stack-list">
              {allDifficult.length === 0 ? (
                <p className="td-empty-state">No difficult questions yet.</p>
              ) : (
                allDifficult.slice(0, 8).map((q) => (
                  <article key={q.question} className="td-stack-item td-stack-item-column">
                    <div>
                      <h3>{q.question}</h3>
                      <p>{q.className}</p>
                    </div>
                    <div className="td-mini-metrics">
                      <span>Correct rate {q.correctRate}%</span>
                      <span>{q.attempts} attempts</span>
                    </div>
                  </article>
                ))
              )}
            </div>
          </section>
        </div>
      )}
    </TeacherLayout>
  );
}

