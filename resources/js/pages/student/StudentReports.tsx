import React, { useEffect, useState } from 'react';
import { BarChart3, Brain, Clock3, Medal, Trophy } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import {
  BadgeGallery,
  XpProgressBar,
  LeaderboardTable,
  type GamifiedBadge,
  type LeaderboardEntry,
  type XpSnapshot,
} from '../../components/ui/GamificationWidgets';
import StudentLayout from '../../components/ui/StudentLayout';

type SessionLog = {
  id: string;
  date: string;
  minutes: number;
  topic: string;
  score: number;
};

type SubjectPerformance = {
  subject: string;
  score: number;
};

type RemoteBadge = {
  id: string;
  title: string;
  description: string;
  progress: number;
  required: number;
  icon: React.ReactNode;
};

type DashboardData = {
  subjectPerformance: SubjectPerformance[];
  sessionLogs: SessionLog[];
};

const fallbackDashboard: DashboardData = { subjectPerformance: [], sessionLogs: [] };

export default function StudentReports() {
  const [dashboard, setDashboard] = useState<DashboardData>(fallbackDashboard);
  const [badgeProgress, setBadgeProgress] = useState<RemoteBadge[]>([]);
  const [xpSnapshot, setXpSnapshot] = useState<XpSnapshot | null>(null);
  const [leaderboardScope, setLeaderboardScope] = useState<'weekly' | 'global'>('weekly');
  const [leaders, setLeaders] = useState<LeaderboardEntry[]>([]);
  const [myRank, setMyRank] = useState(0);
  const [gamifiedBadges, setGamifiedBadges] = useState<GamifiedBadge[]>([]);
  const [newBadgeIds, setNewBadgeIds] = useState<string[]>([]);

  useEffect(() => {
    const load = async () => {
      try {
        const [dashRes, achievementsRes, gamRes, lbRes, badgeRes] = await Promise.all([
          fetch('/api/student/dashboard', { credentials: 'include', headers: { Accept: 'application/json' } }),
          fetch('/api/student/achievements', { credentials: 'include', headers: { Accept: 'application/json' } }),
          fetch('/api/gamification/me', { credentials: 'include', headers: { Accept: 'application/json' } }),
          fetch('/api/gamification/leaderboard?scope=weekly', { credentials: 'include', headers: { Accept: 'application/json' } }),
          fetch('/api/gamification/badges', { credentials: 'include', headers: { Accept: 'application/json' } }),
        ]);

        if (dashRes.ok) {
          const payload = (await dashRes.json()) as Partial<DashboardData>;
          setDashboard({ ...fallbackDashboard, ...payload });
        }

        if (achievementsRes.ok) {
          const payload = (await achievementsRes.json()) as { badges?: RemoteBadge[] };
          setBadgeProgress(payload.badges ?? []);
        }

        if (gamRes.ok) {
          const payload = (await gamRes.json()) as { xp?: XpSnapshot };
          if (payload.xp) setXpSnapshot(payload.xp);
        }

        if (lbRes.ok) {
          const payload = (await lbRes.json()) as { leaders?: LeaderboardEntry[]; myRank?: number };
          setLeaders(payload.leaders ?? []);
          setMyRank(payload.myRank ?? 0);
        }

        if (badgeRes.ok) {
          const payload = (await badgeRes.json()) as { badges?: GamifiedBadge[]; newBadgeIds?: string[] };
          setGamifiedBadges(payload.badges ?? []);
          setNewBadgeIds(payload.newBadgeIds ?? []);
        }
      } catch {
        // Keep fallback data.
      }
    };
    load();
  }, []);

  const weakSubjects = dashboard.subjectPerformance.filter((item) => item.score < 75);
  const strongSubjects = dashboard.subjectPerformance.filter((item) => item.score >= 85);

  return (
    <StudentLayout>
      <div className="ss-grid">
        <section className="ss-panel">
          <XpProgressBar snapshot={xpSnapshot} />
        </section>

        <section className="ss-panel">
          <LeaderboardTable leaders={leaders} myRank={myRank} scope={leaderboardScope} onScope={setLeaderboardScope} />
        </section>

        <section className="ss-panel">
          <div className="ss-panel-head"><h2>Reports &amp; Analytics</h2><BarChart3 size={16} /></div>
          {dashboard.subjectPerformance.length === 0 ? (
            <p className="ss-empty">No report data yet.</p>
          ) : (
            <>
              <p className="ss-insight">Performance insights based on your study logs and quiz outcomes.</p>
              <div className="ss-chart-wrap">
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={dashboard.subjectPerformance}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="subject" />
                    <YAxis domain={[0, 100]} />
                    <Tooltip />
                    <Bar dataKey="score" fill="#2563eb" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </>
          )}
        </section>

        <section className="ss-panel">
          <div className="ss-panel-head"><h2>Study History Logs</h2><Clock3 size={16} /></div>
          <div className="ss-card-list">
            {dashboard.sessionLogs.length === 0 ? (
              <p className="ss-empty">No study history yet.</p>
            ) : (
              dashboard.sessionLogs.map((session) => (
                <article key={session.id} className="ss-list-card">
                  <div>
                    <h3>{session.topic}</h3>
                    <p>{session.date} · {session.minutes} mins</p>
                  </div>
                  <span>{session.score}%</span>
                </article>
              ))
            )}
          </div>
        </section>

        <section className="ss-panel">
          <div className="ss-panel-head"><h2>Strengths &amp; Weaknesses</h2><Brain size={16} /></div>
          {dashboard.subjectPerformance.length === 0 ? (
            <p className="ss-empty">No strengths or weaknesses data yet.</p>
          ) : (
            <>
              <h3 className="ss-sub-title">Strong Subjects</h3>
              <p className="ss-insight">{strongSubjects.map((item) => item.subject).join(', ') || 'Keep practicing to discover strengths.'}</p>
              <h3 className="ss-sub-title">Needs Focus</h3>
              <p className="ss-insight">{weakSubjects.map((item) => item.subject).join(', ') || 'No weak subjects right now.'}</p>
            </>
          )}
        </section>

        <section className="ss-panel">
          <div className="ss-panel-head"><h2>Achievements &amp; Badges</h2><Medal size={16} /></div>
          <div className="ss-card-list">
            {badgeProgress.length === 0 ? (
              <p className="ss-empty">No achievements yet.</p>
            ) : (
              badgeProgress.map((badge) => {
                const earned = badge.progress >= badge.required;
                return (
                  <article key={badge.id} className={`ss-list-card ${earned ? 'is-earned' : ''}`}>
                    <div>
                      <h3>{badge.icon} {badge.title}</h3>
                      <p>{badge.description}</p>
                      <div className="ss-meter">
                        <span style={{ width: `${Math.min((badge.progress / badge.required) * 100, 100)}%` }} />
                      </div>
                    </div>
                    <span>{badge.progress}/{badge.required}</span>
                  </article>
                );
              })
            )}
          </div>

          {gamifiedBadges.length > 0 && <BadgeGallery badges={gamifiedBadges} />}

          {newBadgeIds.length > 0 && (
            <div className="ss-notice">
              <Trophy size={16} />
              <p>New badge unlocked. You earned {newBadgeIds.length} achievement(s).</p>
            </div>
          )}
        </section>
      </div>
    </StudentLayout>
  );
}

