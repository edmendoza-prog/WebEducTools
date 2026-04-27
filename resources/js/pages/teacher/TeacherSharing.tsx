import React, { useEffect, useState } from 'react';
import TeacherLayout from '../../components/ui/TeacherLayout';
import { csrfFetch } from '../../lib/csrf';
import { Sparkles, Users } from 'lucide-react';

type StudySet = {
  id: string;
  title: string;
  subject: string;
  className: string;
  visibility: 'public' | 'private';
  cards: number;
  updatedAt: string;
};

type ClassMetric = {
  className: string;
  avgScore: number;
  completionRate: number;
  engagement: number;
};

type StudentRecord = {
  id: string;
  name: string;
};

export default function TeacherSharing() {
  const [studySets, setStudySets] = useState<StudySet[]>([]);
  const [classMetrics, setClassMetrics] = useState<ClassMetric[]>([]);
  const [students, setStudents] = useState<StudentRecord[]>([]);

  useEffect(() => {
    const load = async () => {
      try {
        const response = await fetch('/api/teacher/dashboard', {
          method: 'GET',
          credentials: 'include',
          headers: { Accept: 'application/json' },
        });

        if (!response.ok) return;

        const payload = (await response.json()) as {
          studySets?: StudySet[];
          classMetrics?: ClassMetric[];
          students?: StudentRecord[];
        };
        setStudySets(payload.studySets ?? []);
        setClassMetrics(payload.classMetrics ?? []);
        setStudents(payload.students ?? []);
      } catch {
        // Keep empty state if unavailable.
      }
    };

    load();
  }, []);

  const handleAssignSet = async (studySetId: string) => {
    const numericSetId = Number(String(studySetId).replace(/[^0-9]/g, ''));
    const studentIds = students
      .map((s) => Number(String(s.id).replace(/[^0-9]/g, '')))
      .filter((id) => id > 0)
      .slice(0, 10);

    if (!numericSetId || studentIds.length === 0) return;

    try {
      await csrfFetch(`/api/teacher/study-sets/${numericSetId}/assign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ studentIds, scope: 'class' }),
      });
    } catch {
      // Ignore temporary sync issues.
    }
  };

  return (
    <TeacherLayout>
      {() => (
        <div className="td-dashboard-grid">
          <section className="td-panel td-panel-span-2">
            <div className="td-panel-head">
              <h2>Content Sharing</h2>
              <Sparkles size={16} />
            </div>
            {studySets.length === 0 ? (
              <p className="td-empty-state">No shared study sets yet.</p>
            ) : (
              <div className="td-share-grid">
                {studySets.map((set) => (
                  <article key={set.id} className="td-share-card">
                    <h3>{set.title}</h3>
                    <p>{set.subject} · {set.className}</p>
                    <div className="td-report-chip-row">
                      <span>{set.visibility}</span>
                      <span>{set.cards} cards</span>
                      <span>{set.updatedAt}</span>
                    </div>
                    <button className="td-inline-action" type="button" onClick={() => handleAssignSet(set.id)}>
                      Assign to class
                    </button>
                  </article>
                ))}
              </div>
            )}
          </section>

          <section className="td-panel">
            <div className="td-panel-head">
              <h2>Assignment Targets</h2>
              <Users size={16} />
            </div>
            <div className="td-stack-list">
              {classMetrics.length === 0 ? (
                <p className="td-empty-state">No assignment targets yet.</p>
              ) : (
                classMetrics.map((item) => (
                  <article key={item.className} className="td-stack-item td-stack-item-column">
                    <div>
                      <h3>{item.className}</h3>
                      <p>Share public or private content here.</p>
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
        </div>
      )}
    </TeacherLayout>
  );
}

