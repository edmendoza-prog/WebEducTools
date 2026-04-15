import React from 'react';
import { Crown, Medal, TrendingUp, Zap } from 'lucide-react';

export type XpSnapshot = {
  xp: number;
  level: number;
  title: string;
  totalPoints: number;
  xpToNextLevel: number;
  levelProgressPercent: number;
  streak: number;
  rank: number;
};

export type LeaderboardEntry = {
  userId: number;
  name: string;
  score: number;
  rank: number;
};

export type GamifiedBadge = {
  id: string;
  title: string;
  description: string;
  required: number;
  progress: number;
  xpReward: number;
  earned: boolean;
};

export function XpProgressBar({ snapshot }: { snapshot: XpSnapshot | null }) {
  if (!snapshot) {
    return null;
  }

  return (
    <article className="gm-card">
      <div className="gm-head">
        <h3>XP Progress</h3>
        <Zap size={16} />
      </div>
      <div className="gm-row">
        <strong>{snapshot.xp} XP</strong>
        <span>Level {snapshot.level}</span>
      </div>
      <div className="gm-meter">
        <span style={{ width: `${snapshot.levelProgressPercent}%` }} />
      </div>
      <p className="gm-muted">
        {snapshot.title} · {snapshot.xpToNextLevel} XP to next level
      </p>
    </article>
  );
}

export function BadgeGallery({ badges }: { badges: GamifiedBadge[] }) {
  return (
    <div className="gm-badge-grid">
      {badges.map((badge) => (
        <article key={badge.id} className={`gm-badge-card ${badge.earned ? 'is-earned' : ''}`}>
          <div className="gm-head">
            <h3>{badge.title}</h3>
            <Medal size={16} />
          </div>
          <p className="gm-muted">{badge.description}</p>
          <div className="gm-meter">
            <span style={{ width: `${Math.min(100, Math.round((badge.progress / Math.max(1, badge.required)) * 100))}%` }} />
          </div>
          <div className="gm-row">
            <span>
              {badge.progress}/{badge.required}
            </span>
            <span>+{badge.xpReward} XP</span>
          </div>
        </article>
      ))}
    </div>
  );
}

export function LeaderboardTable({
  leaders,
  myRank,
  scope,
  onScope,
}: {
  leaders: LeaderboardEntry[];
  myRank: number;
  scope: 'weekly' | 'global';
  onScope: (scope: 'weekly' | 'global') => void;
}) {
  return (
    <section className="gm-card">
      <div className="gm-head gm-head-space">
        <h3>Leaderboard</h3>
        <div className="gm-chip-row">
          <button type="button" className={`gm-chip ${scope === 'weekly' ? 'is-active' : ''}`} onClick={() => onScope('weekly')}>
            Weekly
          </button>
          <button type="button" className={`gm-chip ${scope === 'global' ? 'is-active' : ''}`} onClick={() => onScope('global')}>
            Global
          </button>
        </div>
      </div>
      <div className="gm-leaderboard">
        {leaders.map((entry) => (
          <article key={`${scope}-${entry.userId}`} className="gm-leader-row">
            <div>
              <strong>#{entry.rank}</strong> {entry.name}
            </div>
            <span>{entry.score} XP</span>
          </article>
        ))}
      </div>
      <p className="gm-muted">
        <Crown size={14} /> Your rank: {myRank > 0 ? `#${myRank}` : 'Unranked'}
      </p>
    </section>
  );
}

export function GameFeedbackCard({ message, mood }: { message: string; mood: 'success' | 'warning' }) {
  return (
    <article className={`gm-feedback ${mood === 'success' ? 'is-success' : 'is-warning'}`}>
      <TrendingUp size={16} />
      <p>{message}</p>
    </article>
  );
}
