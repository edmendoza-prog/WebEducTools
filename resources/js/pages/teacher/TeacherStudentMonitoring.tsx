import React, { useEffect, useState } from 'react';
import TeacherLayout from '../../components/ui/TeacherLayout';
import { CircleHelp, Users } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

type StudentRecord = {
  id: string;
  name: string;
  className: string;
  completion: number;
  quizScore: number;
  weakArea: string;
  lastActive: string;
};

type ClassMetric = {
  className: string;
  avgScore: number;
  completionRate: number;
  engagement: number;
};

function renderProgressBar(value: number) {
  return (
    <div className="td-progress">
      <span style={{ width: `${value}%` }} />
    </div>
  );
}

export default function TeacherStudentMonitoring() {
  const [students, setStudents] = useState<StudentRecord[]>([]);
  const [classMetrics, setClassMetrics] = useState<ClassMetric[]>([]);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      try {
        const response = await fetch('/api/teacher/dashboard', {
          method: 'GET',
          credentials: 'include',
          headers: { Accept: 'application/json' },
        });

        if (!mounted || !response.ok) return;

        const payload = (await response.json()) as {
          students?: StudentRecord[];
          classMetrics?: ClassMetric[];
        };
        setStudents(payload.students ?? []);
        setClassMetrics(payload.classMetrics ?? []);
      } catch {
        // Keep empty state if unavailable.
      }
    };

    load();

    return () => { mounted = false; };
  }, []);

  return (
    <TeacherLayout>
      {(search) => {
        const query = search.trim().toLowerCase();
        const filtered = query
          ? students.filter((s) =>
              [s.name, s.className, s.weakArea].some((v) => v.toLowerCase().includes(query)),
            )
          : students;

        return (
          <div className="td-dashboard-grid">
            <section className="td-panel td-panel-span-2">
              <div className="td-panel-head">
                <h2>Student Monitoring</h2>
                <Users size={16} />
              </div>
              <div className="td-table-card">
                {filtered.length === 0 ? (
                  <p className="td-empty-state">No students yet.</p>
                ) : (
                  <table className="td-table td-table-wide">
                    <thead>
                      <tr>
                        <th>Student</th>
                        <th>Class</th>
                        <th>Quiz score</th>
                        <th>Completion</th>
                        <th>Weak area</th>
                        <th>Last active</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.map((student) => (
                        <tr key={student.id}>
                          <td>{student.name}</td>
                          <td>{student.className}</td>
                          <td>{student.quizScore}%</td>
                          <td>
                            <div className="td-cell-progress">
                              {renderProgressBar(student.completion)}
                              <span>{student.completion}%</span>
                            </div>
                          </td>
                          <td>{student.weakArea}</td>
                          <td>{student.lastActive}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </section>

            <section className="td-panel">
              <div className="td-panel-head">
                <h2>Weak Areas</h2>
                <CircleHelp size={16} />
              </div>
              <div className="td-stack-list">
                {filtered.length === 0 ? (
                  <p className="td-empty-state">No weak areas yet.</p>
                ) : (
                  filtered.slice(0, 3).map((student) => (
                    <article key={student.id} className="td-stack-item">
                      <div>
                        <h3>{student.name}</h3>
                        <p>{student.weakArea}</p>
                      </div>
                      <span>{student.quizScore}%</span>
                    </article>
                  ))
                )}
              </div>
            </section>

            <section className="td-panel">
              <div className="td-panel-head">
                <h2>Completion Rates</h2>
                <Users size={16} />
              </div>
              <div className="td-chart-card">
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={classMetrics}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="className" />
                    <YAxis domain={[0, 100]} />
                    <Tooltip />
                    <Bar dataKey="completionRate" fill="#3b82f6" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </section>
          </div>
        );
      }}
    </TeacherLayout>
  );
}

