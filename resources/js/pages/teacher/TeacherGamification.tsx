import React, { useEffect, useState } from 'react';
import TeacherLayout from '../../components/ui/TeacherLayout';
import { csrfFetch } from '../../lib/csrf';
import { LeaderboardTable, type LeaderboardEntry } from '../../components/ui/GamificationWidgets';
import { Award, Flame, Shield, Sparkles, X } from 'lucide-react';
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

type AdminBadge = {
  id: number;
  code: string;
  name: string;
  description?: string | null;
  requirement_type: string;
  requirement_value: number;
  xp_reward: number;
};

export default function TeacherGamification() {
  const [adminTotals, setAdminTotals] = useState({ xp: 0, activeStudents: 0, engagementRate: 0, retentionRate: 0 });
  const [adminTrend, setAdminTrend] = useState<Array<{ day: string; events: number; xp: number }>>([]);
  const [adminLeaders, setAdminLeaders] = useState<LeaderboardEntry[]>([]);
  const [adminBadges, setAdminBadges] = useState<AdminBadge[]>([]);
  const [adminRules, setAdminRules] = useState<Record<string, number>>({});
  const [resetStudentId, setResetStudentId] = useState('');
  const [isBadgeFormOpen, setIsBadgeFormOpen] = useState(false);
  const [newBadge, setNewBadge] = useState({ code: '', name: '', requirementType: 'quiz_attempts', requirementValue: 3, xpReward: 25, description: '' });

  useEffect(() => {
    const load = async () => {
      try {
        const [gamRes, badgesRes] = await Promise.all([
          fetch('/api/admin/gamification/dashboard', { method: 'GET', credentials: 'include', headers: { Accept: 'application/json' } }),
          fetch('/api/admin/badges', { method: 'GET', credentials: 'include', headers: { Accept: 'application/json' } }),
        ]);

        if (gamRes.ok) {
          const payload = (await gamRes.json()) as {
            totals?: { xp: number; activeStudents: number; engagementRate: number; retentionRate: number };
            engagementTrend?: Array<{ day: string; events: number; xp: number }>;
            leaderboard?: Array<{ name: string; rank: number; score: number }>;
            rules?: Record<string, number>;
          };
          if (payload.totals) setAdminTotals(payload.totals);
          if (payload.engagementTrend) setAdminTrend(payload.engagementTrend);
          if (payload.leaderboard) {
            setAdminLeaders(payload.leaderboard.map((e, i) => ({ userId: i + 1, name: e.name, rank: e.rank, score: e.score })));
          }
          if (payload.rules) setAdminRules(payload.rules);
        }

        if (badgesRes.ok) {
          const payload = (await badgesRes.json()) as { badges?: AdminBadge[] };
          setAdminBadges(payload.badges ?? []);
        }
      } catch {
        // Keep empty state if unavailable.
      }
    };

    load();
  }, []);

  useEffect(() => {
    if (!isBadgeFormOpen) return undefined;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') setIsBadgeFormOpen(false); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isBadgeFormOpen]);

  const saveRules = async () => {
    try {
      await csrfFetch('/api/admin/gamification/rules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ rules: adminRules }),
      });
    } catch {
      // Keep local rule changes if backend update fails.
    }
  };

  const createBadge = async () => {
    try {
      const response = await csrfFetch('/api/admin/badges', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(newBadge),
      });
      if (response.ok) {
        setNewBadge({ code: '', name: '', requirementType: 'quiz_attempts', requirementValue: 3, xpReward: 25, description: '' });
        setIsBadgeFormOpen(false);
      }
    } catch {
      // Prevent blocking the panel when create fails.
    }
  };

  const updateBadge = async (badge: AdminBadge) => {
    try {
      await csrfFetch(`/api/admin/badges/${badge.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({
          name: badge.name,
          description: badge.description,
          requirementType: badge.requirement_type,
          requirementValue: badge.requirement_value,
          xpReward: badge.xp_reward,
        }),
      });
    } catch {
      // Keep editing possible while backend is unavailable.
    }
  };

  const resetStudentGamification = async () => {
    const studentId = Number(resetStudentId);
    if (!studentId) return;
    try {
      await csrfFetch('/api/admin/gamification/reset-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ studentId }),
      });
      setResetStudentId('');
    } catch {
      // No-op on reset failures.
    }
  };

  return (
    <TeacherLayout>
      {() => (
        <div className="td-dashboard-grid">
          <section className="td-metric-grid">
            <article className="td-metric-card"><p>Total XP</p><h3>{adminTotals.xp}</h3><span>Across all students</span></article>
            <article className="td-metric-card"><p>Active Students</p><h3>{adminTotals.activeStudents}</h3><span>Last 7 days</span></article>
            <article className="td-metric-card"><p>Engagement Rate</p><h3>{adminTotals.engagementRate}%</h3><span>Gamification interaction</span></article>
            <article className="td-metric-card"><p>Retention Rate</p><h3>{adminTotals.retentionRate}%</h3><span>Streak-based retention</span></article>
          </section>

          <section className="td-panel td-panel-span-2">
            <div className="td-panel-head">
              <h2>Gamification Trends</h2>
              <Sparkles size={16} />
            </div>
            {adminTrend.length === 0 ? (
              <p className="td-empty-state">No gamification trend data yet.</p>
            ) : (
              <div className="td-chart-card">
                <ResponsiveContainer width="100%" height={260}>
                  <LineChart data={adminTrend}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="day" />
                    <YAxis />
                    <Tooltip />
                    <Line type="monotone" dataKey="events" stroke="#1d4ed8" strokeWidth={3} />
                    <Line type="monotone" dataKey="xp" stroke="#38bdf8" strokeWidth={3} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </section>

          <section className="td-panel">
            {adminLeaders.length === 0 ? (
              <p className="td-empty-state">No leaderboard data yet.</p>
            ) : (
              <LeaderboardTable leaders={adminLeaders} myRank={0} scope="global" onScope={() => undefined} />
            )}
          </section>

          <section className="td-panel td-panel-span-2">
            <div className="td-panel-head">
              <h2>Points Rules Configuration</h2>
              <Shield size={16} />
            </div>
            {Object.entries(adminRules).length === 0 ? (
              <p className="td-empty-state">No XP rules configured yet.</p>
            ) : (
              <div className="tcc-meta-grid">
                {Object.entries(adminRules).map(([key, value]) => (
                  <label key={key}>
                    {key}
                    <input
                      type="number"
                      value={value}
                      onChange={(e) => setAdminRules((r) => ({ ...r, [key]: Number(e.target.value) || 0 }))}
                    />
                  </label>
                ))}
              </div>
            )}
            <button className="td-inline-action" type="button" onClick={saveRules}>
              Save XP Rules
            </button>
          </section>

          <section className="td-panel td-panel-span-2">
            <div className="td-panel-head">
              <h2>Badge Management</h2>
              <div className="td-panel-head-actions">
                <button className="td-inline-action" type="button" onClick={() => setIsBadgeFormOpen(true)}>Create Badge</button>
                <Award size={16} />
              </div>
            </div>
            <div className="td-stack-list">
              {adminBadges.length === 0 ? (
                <p className="td-empty-state">No badges yet.</p>
              ) : (
                adminBadges.map((badge) => (
                  <article key={badge.id} className="td-stack-item td-stack-item-column">
                    <div className="tcc-meta-grid">
                      <label>
                        Name
                        <input type="text" value={badge.name} onChange={(e) => setAdminBadges((b) => b.map((x) => x.id === badge.id ? { ...x, name: e.target.value } : x))} />
                      </label>
                      <label>
                        Requirement Type
                        <input type="text" value={badge.requirement_type} onChange={(e) => setAdminBadges((b) => b.map((x) => x.id === badge.id ? { ...x, requirement_type: e.target.value } : x))} />
                      </label>
                      <label>
                        Requirement Value
                        <input type="number" value={badge.requirement_value} onChange={(e) => setAdminBadges((b) => b.map((x) => x.id === badge.id ? { ...x, requirement_value: Number(e.target.value) || 1 } : x))} />
                      </label>
                      <label>
                        XP Reward
                        <input type="number" value={badge.xp_reward} onChange={(e) => setAdminBadges((b) => b.map((x) => x.id === badge.id ? { ...x, xp_reward: Number(e.target.value) || 0 } : x))} />
                      </label>
                    </div>
                    <button className="td-inline-action td-badge-save-action" type="button" onClick={() => updateBadge(badge)}>
                      Save Badge
                    </button>
                  </article>
                ))
              )}
            </div>
          </section>

          <section className="td-panel">
            <div className="td-panel-head">
              <h2>Moderation</h2>
              <Shield size={16} />
            </div>
            <label>
              Student ID
              <input value={resetStudentId} onChange={(e) => setResetStudentId(e.target.value)} type="number" />
            </label>
            <button className="td-inline-action" type="button" onClick={resetStudentGamification}>
              Reset Scores
            </button>
          </section>

          {isBadgeFormOpen && (
            <div className="td-badge-overlay" role="presentation" onClick={() => setIsBadgeFormOpen(false)}>
              <div className="td-badge-frame" role="dialog" aria-modal="true" aria-labelledby="badge-form-title" onClick={(e) => e.stopPropagation()}>
                <section className="td-badge-modal">
                  <div className="td-badge-modal-head">
                    <div>
                      <h2 id="badge-form-title">Create Badge</h2>
                      <p>Float a new badge form, save it, and keep editing the list below.</p>
                    </div>
                    <button className="tcc-inline-icon" type="button" aria-label="Close badge form" onClick={() => setIsBadgeFormOpen(false)}>
                      <X size={16} />
                    </button>
                  </div>
                  <div className="tcc-meta-grid td-badge-form-grid">
                    <label>Code<input value={newBadge.code} onChange={(e) => setNewBadge((b) => ({ ...b, code: e.target.value }))} type="text" /></label>
                    <label>Name<input value={newBadge.name} onChange={(e) => setNewBadge((b) => ({ ...b, name: e.target.value }))} type="text" /></label>
                    <label>Requirement<input value={newBadge.requirementType} onChange={(e) => setNewBadge((b) => ({ ...b, requirementType: e.target.value }))} type="text" /></label>
                    <label>Requirement Value<input value={newBadge.requirementValue} onChange={(e) => setNewBadge((b) => ({ ...b, requirementValue: Number(e.target.value) || 1 }))} type="number" /></label>
                    <label>XP Reward<input value={newBadge.xpReward} onChange={(e) => setNewBadge((b) => ({ ...b, xpReward: Number(e.target.value) || 0 }))} type="number" /></label>
                    <label className="td-badge-description">Description<input value={newBadge.description} onChange={(e) => setNewBadge((b) => ({ ...b, description: e.target.value }))} type="text" /></label>
                  </div>
                  <div className="td-badge-modal-actions">
                    <button className="td-inline-action td-badge-save-action" type="button" onClick={createBadge}>Create Badge</button>
                    <button className="tcc-chip-toggle" type="button" onClick={() => setIsBadgeFormOpen(false)}>Cancel</button>
                  </div>
                </section>
              </div>
            </div>
          )}
        </div>
      )}
    </TeacherLayout>
  );
}

