import React, { useEffect, useState } from 'react';
import { FileText, Search } from 'lucide-react';
import api from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import PageHeader from '../../components/PageHeader';
import DarkTH from '../../components/DarkTH';
import Spinner from '../../components/Spinner';
import StatusBadge from '../../components/StatusBadge';

const tdCls = 'px-4 py-2.5 text-sm text-gray-700';
const inputCls = 'border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-300';

export default function StudentResults() {
  const { user, hasRole } = useAuth();
  const [studentNo, setStudentNo] = useState('');
  const [studentId, setStudentId] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [gpa, setGpa] = useState(null);

  const isStudent = hasRole('student') && !hasRole('admin', 'registrar', 'hod', 'dean', 'lecturer');

  async function lookup() {
    // For demo: if user is student, their student_id should be known
    // For staff: search by student_no
    if (!studentId && !isStudent) return;
    setLoading(true);
    const id = studentId;
    const r = await api.get(`/marks/students/${id}`);
    setResults(r.data);
    // Calculate GPA
    const published = r.data.filter(m => m.status === 'published' && m.grade_point != null);
    if (published.length > 0) {
      const totalPoints = published.reduce((acc, m) => acc + m.grade_point * m.credit_units, 0);
      const totalUnits = published.reduce((acc, m) => acc + Number(m.credit_units), 0);
      setGpa((totalPoints / totalUnits).toFixed(2));
    } else {
      setGpa(null);
    }
    setLoading(false);
  }

  useEffect(() => { if (studentId) lookup(); }, [studentId]);

  // Group by year + semester
  const grouped = results.reduce((acc, r) => {
    const key = `${r.academic_year_label} — Semester ${r.semester}`;
    if (!acc[key]) acc[key] = [];
    acc[key].push(r);
    return acc;
  }, {});

  return (
    <div>
      <PageHeader icon={FileText} title="Student Results" subtitle="View academic results by student" />

      {!isStudent && (
        <div className="flex gap-2 mb-4">
          <input
            className={inputCls}
            placeholder="Student ID (UUID)…"
            value={studentId}
            onChange={e => setStudentId(e.target.value)}
          />
          <button onClick={lookup} disabled={!studentId || loading} className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white text-sm font-semibold rounded-xl disabled:opacity-60">
            <Search size={14} /> View
          </button>
        </div>
      )}

      {loading ? <Spinner /> : results.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-6 py-12 text-center text-sm text-gray-400">
          {isStudent ? 'No results available yet' : 'Enter a student ID to view results'}
        </div>
      ) : (
        <>
          {gpa && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-5 py-4 mb-4 inline-flex items-center gap-3">
              <div>
                <p className="text-xs text-gray-500">Cumulative GPA</p>
                <p className="text-2xl font-bold text-gray-800">{gpa}</p>
              </div>
              <div className="ml-4">
                <p className="text-xs text-gray-500">Total Published Units</p>
                <p className="text-lg font-semibold text-gray-700">
                  {results.filter(m => m.status === 'published').reduce((s, m) => s + Number(m.credit_units), 0)}
                </p>
              </div>
            </div>
          )}

          {Object.entries(grouped).map(([group, items]) => (
            <div key={group} className="mb-5">
              <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">{group}</h3>
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <table className="w-full">
                  <thead>
                    <DarkTH cols={[
                      { label: 'Code', cls: 'w-28' },
                      { label: 'Course' },
                      { label: 'CU', cls: 'w-16 text-center' },
                      { label: 'C/W', cls: 'w-20 text-center' },
                      { label: 'Exam', cls: 'w-20 text-center' },
                      { label: 'Total', cls: 'w-20 text-center' },
                      { label: 'Grade', cls: 'w-16 text-center' },
                      { label: 'GP', cls: 'w-16 text-center' },
                      { label: 'Status', cls: 'w-28' },
                    ]} />
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {items.map((m, i) => (
                      <tr key={m.id} className={i % 2 === 1 ? 'bg-gray-50/40' : ''}>
                        <td className={`${tdCls} font-mono text-xs font-semibold text-blue-700`}>{m.course_code}</td>
                        <td className={tdCls}>{m.course_name}</td>
                        <td className={`${tdCls} text-center text-gray-500`}>{m.credit_units}</td>
                        <td className={`${tdCls} text-center`}>{m.coursework_mark ?? '—'}</td>
                        <td className={`${tdCls} text-center`}>{m.exam_mark ?? '—'}</td>
                        <td className={`${tdCls} text-center font-semibold`}>{m.total_mark != null ? Number(m.total_mark).toFixed(1) : '—'}</td>
                        <td className={`${tdCls} text-center font-bold text-lg ${m.grade === 'F' ? 'text-red-600' : m.grade?.startsWith('A') ? 'text-green-600' : 'text-gray-800'}`}>{m.grade || '—'}</td>
                        <td className={`${tdCls} text-center text-gray-500`}>{m.grade_point ?? '—'}</td>
                        <td className={tdCls}><StatusBadge status={m.status} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </>
      )}
    </div>
  );
}
