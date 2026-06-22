import React, { useEffect, useState } from 'react';
import { CheckCircle, ShieldCheck } from 'lucide-react';
import api from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import PageHeader from '../../components/PageHeader';
import DarkTH from '../../components/DarkTH';
import Spinner from '../../components/Spinner';
import StatusBadge from '../../components/StatusBadge';

const tdCls = 'px-4 py-2.5 text-sm text-gray-700';
const selectCls = 'border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-300';

export default function MarkApproval() {
  const { hasRole } = useAuth();
  const [years, setYears] = useState([]);
  const [courses, setCourses] = useState([]);
  const [filter, setFilter] = useState({ course_id: '', academic_year_id: '', semester: '1' });
  const [marks, setMarks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [acting, setActing] = useState(false);

  const isHoD = hasRole('admin', 'hod');
  const isRegistrar = hasRole('admin', 'registrar');

  useEffect(() => {
    Promise.all([api.get('/academic/years'), api.get('/curriculum/courses')]).then(([y, c]) => {
      setYears(y.data);
      setCourses(c.data);
      const current = y.data.find(yr => yr.is_current);
      if (current) setFilter(f => ({ ...f, academic_year_id: current.id }));
    });
  }, []);

  async function loadMarks() {
    if (!filter.course_id || !filter.academic_year_id || !filter.semester) return;
    setLoading(true);
    const r = await api.get(`/marks/courses?course_id=${filter.course_id}&academic_year_id=${filter.academic_year_id}&semester=${filter.semester}`);
    setMarks(r.data);
    setLoading(false);
  }

  useEffect(() => { loadMarks(); }, [filter]);

  async function approve(action) {
    if (!window.confirm(`Confirm ${action === 'hod' ? 'HoD' : action === 'registrar' ? 'Registrar' : 'publish'} action on these marks?`)) return;
    setActing(true);
    const payload = { course_id: filter.course_id, academic_year_id: filter.academic_year_id, semester: parseInt(filter.semester) };
    const endpoints = { hod: '/marks/hod-approve', registrar: '/marks/registrar-approve', publish: '/marks/publish' };
    await api.post(endpoints[action], payload);
    loadMarks();
    setActing(false);
  }

  const allStatus = [...new Set(marks.map(m => m.status))];
  const canHoD = isHoD && allStatus.every(s => s === 'submitted');
  const canRegistrar = isRegistrar && allStatus.every(s => s === 'hod_approved');
  const canPublish = isRegistrar && allStatus.every(s => s === 'registrar_approved');

  return (
    <div>
      <PageHeader
        icon={ShieldCheck}
        title="Mark Approval Queue"
        subtitle="HoD and Registrar approval workflow"
        actions={
          <div className="flex gap-2">
            {canHoD && <button onClick={() => approve('hod')} disabled={acting} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-500 hover:bg-indigo-400 text-white text-xs font-semibold rounded-lg disabled:opacity-60"><CheckCircle size={12} /> Approve (HoD)</button>}
            {canRegistrar && <button onClick={() => approve('registrar')} disabled={acting} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-purple-500 hover:bg-purple-400 text-white text-xs font-semibold rounded-lg disabled:opacity-60"><CheckCircle size={12} /> Approve (Registrar)</button>}
            {canPublish && <button onClick={() => approve('publish')} disabled={acting} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-green-600 hover:bg-green-500 text-white text-xs font-semibold rounded-lg disabled:opacity-60"><CheckCircle size={12} /> Publish Results</button>}
          </div>
        }
      />

      <div className="flex gap-2 mb-4 flex-wrap">
        <select className={selectCls} value={filter.academic_year_id} onChange={e => setFilter(f => ({ ...f, academic_year_id: e.target.value }))}>
          <option value="">Academic Year</option>
          {years.map(y => <option key={y.id} value={y.id}>{y.label}{y.is_current ? ' (current)' : ''}</option>)}
        </select>
        <select className={selectCls} value={filter.semester} onChange={e => setFilter(f => ({ ...f, semester: e.target.value }))}>
          <option value="1">Semester 1</option>
          <option value="2">Semester 2</option>
          <option value="3">Semester 3</option>
        </select>
        <select className={selectCls} value={filter.course_id} onChange={e => setFilter(f => ({ ...f, course_id: e.target.value }))}>
          <option value="">Select Course</option>
          {courses.map(c => <option key={c.id} value={c.id}>{c.code} — {c.name}</option>)}
        </select>
      </div>

      {!filter.course_id ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-6 py-12 text-center text-sm text-gray-400">Select a course to view marks</div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          {loading ? <Spinner /> : (
            <table className="w-full">
              <thead>
                <DarkTH cols={[
                  { label: 'Student No', cls: 'w-32' },
                  { label: 'Name' },
                  { label: 'C/W', cls: 'w-20 text-center' },
                  { label: 'Exam', cls: 'w-20 text-center' },
                  { label: 'Total', cls: 'w-20 text-center' },
                  { label: 'Grade', cls: 'w-16 text-center' },
                  { label: 'Status' },
                ]} />
              </thead>
              <tbody className="divide-y divide-gray-50">
                {marks.map((m, i) => (
                  <tr key={m.student_id} className={i % 2 === 1 ? 'bg-gray-50/40' : ''}>
                    <td className={`${tdCls} font-mono text-xs font-semibold text-blue-700`}>{m.student_no}</td>
                    <td className={tdCls}>{m.first_name} {m.last_name}</td>
                    <td className={`${tdCls} text-center`}>{m.coursework_mark ?? '—'}</td>
                    <td className={`${tdCls} text-center`}>{m.exam_mark ?? '—'}</td>
                    <td className={`${tdCls} text-center font-semibold`}>{m.total_mark != null ? Number(m.total_mark).toFixed(1) : '—'}</td>
                    <td className={`${tdCls} text-center font-bold ${m.grade === 'F' ? 'text-red-600' : 'text-gray-800'}`}>{m.grade || '—'}</td>
                    <td className={tdCls}><StatusBadge status={m.status} /></td>
                  </tr>
                ))}
                {marks.length === 0 && (
                  <tr><td colSpan={7} className="px-4 py-10 text-center text-sm text-gray-400">No marks found</td></tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}
