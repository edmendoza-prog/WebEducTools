import React, { useEffect, useMemo, useState } from 'react';
import { Users } from 'lucide-react';
import { LeaderboardTable, type LeaderboardEntry } from '../../components/ui/GamificationWidgets';
import StudentLayout from '../../components/ui/StudentLayout';

type StudySet = {
  id: string;
  title: string;
  cards: number;
  updatedAt: string;
  owner: string;
};

function normalizeAnswer(value: string): string {
  return value.trim().toLowerCase();
}

export default function StudentSearchCollab() {
  const [recentSets, setRecentSets] = useState<StudySet[]>([]);
  const [globalSearch, setGlobalSearch] = useState('');
  const [leaderboardScope, setLeaderboardScope] = useState<'weekly' | 'global'>('weekly');
  const [leaders, setLeaders] = useState<LeaderboardEntry[]>([]);
  const [myRank, setMyRank] = useState(0);

  useEffect(() => {
    const load = async () => {
      try {
        const [dashRes, lbRes] = await Promise.all([
          fetch('/api/student/dashboard', { credentials: 'include', headers: { Accept: 'application/json' } }),
          fetch('/api/gamification/leaderboard?scope=weekly', { credentials: 'include', headers: { Accept: 'application/json' } }),
        ]);

        if (dashRes.ok) {
          const payload = (await dashRes.json()) as { recentSets?: StudySet[] };
          setRecentSets(payload.recentSets ?? []);
        }

        if (lbRes.ok) {
          const payload = (await lbRes.json()) as { leaders?: LeaderboardEntry[]; myRank?: number };
          setLeaders(payload.leaders ?? []);
          setMyRank(payload.myRank ?? 0);
        }
      } catch {
        // Keep fallback data.
      }
    };
    load();
  }, []);

  const filteredSets = useMemo(() => {
    const query = normalizeAnswer(globalSearch);
    if (!query) return recentSets;
    return recentSets.filter((set) => normalizeAnswer(`${set.title} ${set.owner}`).includes(query));
  }, [recentSets, globalSearch]);

  return (
    <StudentLayout>
      <section className="ss-panel">
        <div className="ss-panel-head">
          <h2>Library</h2>
          <Users size={16} />
        </div>
        <p className="ss-insight">Search study sets, browse public materials, and access shared content from your groups.</p>

        <input
          className="ss-input"
          placeholder="Search study sets…"
          value={globalSearch}
          onChange={(e) => setGlobalSearch(e.target.value)}
        />

        {leaders.length > 0 && (
          <LeaderboardTable leaders={leaders} myRank={myRank} scope={leaderboardScope} onScope={setLeaderboardScope} />
        )}

        <div className="ss-card-list">
          {filteredSets.length === 0 ? (
            <p className="ss-empty">No shared study sets yet.</p>
          ) : (
            filteredSets.map((set) => (
              <article key={set.id} className="ss-list-card">
                <div>
                  <h3>{set.title}</h3>
                  <p>{set.cards} cards · shared by {set.owner}</p>
                </div>
                <span>{set.updatedAt}</span>
              </article>
            ))
          )}
        </div>
      </section>
    </StudentLayout>
  );
}

