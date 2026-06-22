import React, { useEffect, useState } from 'react';
import { PenLine, Send } from 'lucide-react';
import api from '../../services/api';
import PageHeader from '../../components/PageHeader';
import DarkTH from '../../components/DarkTH';
import Spinner from '../../components/Spinner';
import StatusBadge from '../../components/StatusBadge';

const inputCls = 'w-20 border border-gray-200 rounded-lg px-2 py-1.5 text-sm text-center bg-white focus:outline-none focus:ring-2 focus:ring-blue-300';
const selectCls = 'border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-300';
const tdCls = 'px-4 py-2.5 text-sm text-gray-700';

export default function MarkEntry() {
  const [years, setYears] = useState([]);
  const [courses, setCourses] = useState([]);
  const [filter, setFilter] = useState({ course_id: '', academic_year_id: '', semester: '1' });
  const [marks, setMarks] = useState([]);
  const [edits, setEdits] = useState({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);

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
    setEdits({});
    setLoading(false);
  }

  useEffect(() => { loadMarks(); }, [filter]);

  function setMark(studentId, field, val) {
    setEdits(e => ({ ...e, [studentId]: { ...e[studentId], [field]: val } }));
  }

  async function saveMark(student_id) {
    const edit = edits[student_id];
    if (!edit) return;
    await api.post('/marks/enter', {
      student_id,
      course_id: filter.course_id,
      academic_year_id: filter.academic_year_id,
      semester: parseInt(filter.semester),
      coursework_mark: parseFloat(edit.coursework_mark ?? (marks.find(m => m.student_id === student_id)?.coursework_mark || 0)),
      exam_mark: parseFloat(edit.exam_mark ?? (marks.find(m => m.student_id === student_id)?.exam_mark || 0)),
    });
    loadMarks();
  }

  async function handleSaveAll() {
    setSaving(true);
    for (const id of Object.keys(edits)) await saveMark(id);
    setSaving(false);
  }

  async function handleSubmit() {
    if (!window.confirm('Submit all marks to HoD for approval?')) return;
    setSubmitting(true);
    await api.post('/marks/submit', { course_id: filter.course_id, academic_year_id: filter.academic_year_id, semester: parseInt(filter.semester) });
    loadMarks();
    setSubmitting(false);
  }

  const canSubmit = marks.length > 0 && marks.every(m => m.status === 'draft');

  return (
    <div>
      <PageHeader
        icon={PenLine}
        title="Enter Marks"
        subtitle="Enter coursework and exam marks per course"
        actions={
          <div className="flex gap-2">
            {Object.keys(edits).length > 0 && (
              <button onClick={handleSaveAll} disabled={saving} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white text-xs font-semibold rounded-lg transition-colors disabled:opacity-60">
                {saving ? 'Saving…' : 'Save All'}
              </button>
            )}
            {canSubmit && (
              <button onClick={handleSubmit} disabled={submitting} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-500 hover:bg-blue-400 text-white text-xs font-semibold rounded-lg transition-colors disabled:opacity-60">
                <Send size={12} /> {submitting ? 'Submitting…' : 'Submit to HoD'}
              </button>
            )}
          </div>
        }
      />

      {/* Filters */}
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
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-6 py-12 text-center text-sm text-gray-400">Select a course to enter marks</div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          {loading ? <Spinner /> : (
            <table className="w-full">
              <thead>
                <DarkTH cols={[
                  { label: 'Student No', cls: 'w-32' },
                  { label: 'Name' },
                  { label: 'C/W (40%)', cls: 'w-28 text-center' },
                  { label: 'Exam (60%)', cls: 'w-28 text-center' },
                  { label: 'Total', cls: 'w-20 text-center' },
                  { label: 'Grade', cls: 'w-20 text-center' },
                  { label: 'Status', cls: 'w-32' },
                  { label: '', cls: 'w-20' },
                ]} />
              </thead>
              <tbody className="divide-y divide-gray-50">
                {marks.map((m, i) => {
                  const edit = edits[m.student_id] || {};
                  const cw = edit.coursework_mark ?? m.coursework_mark ?? '';
                  const ex = edit.exam_mark ?? m.exam_mark ?? '';
                  const isDirty = edits[m.student_id] !== undefined;
                  return (
                    <tr key={m.student_id} className={`${i % 2 === 1 ? 'bg-gray-50/40' : ''} ${isDirty ? 'ring-1 ring-inset ring-blue-200' : ''}`}>
                      <td className={`${tdCls} font-mono text-xs font-semibold text-blue-700`}>{m.student_no}</td>
                      <td className={tdCls}>{m.first_name} {m.last_name}</td>
                      <td className={`${tdCls} text-center`}>
                        <input
                          className={inputCls}
                          type="number" min="0" max="100" step="0.5"
                          value={cw}
                          onChange={e => setMark(m.student_id, 'coursework_mark', e.target.value)}
                          disabled={m.status !== 'draft'}
                        />
                      </td>
                      <td className={`${tdCls} text-center`}>
                        <input
                          className={inputCls}
                          type="number" min="0" max="100" step="0.5"
                          value={ex}
                          onChange={e => setMark(m.student_id, 'exam_mark', e.target.value)}
                          disabled={m.status !== 'draft'}
                        />
                      </td>
                      <td className={`${tdCls} text-center font-semibold text-gray-800`}>
                        {m.total_mark != null ? Number(m.total_mark).toFixed(1) : '—'}
                      </td>
                      <td className={`${tdCls} text-center`}>
                        <span className={`font-bold text-sm ${m.grade === 'F' ? 'text-red-600' : m.grade?.startsWith('A') ? 'text-green-600' : 'text-gray-700'}`}>
                          {m.grade || '—'}
                        </span>
                      </td>
                      <td className={tdCls}><StatusBadge status={m.status || 'draft'} /></td>
                      <td className={tdCls}>
                        {isDirty && m.status === 'draft' && (
                          <button onClick={() => saveMark(m.student_id)} className="text-xs text-blue-600 hover:text-blue-800 font-medium">Save</button>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {marks.length === 0 && (
                  <tr><td colSpan={8} className="px-4 py-10 text-center text-sm text-gray-400">No students found for this course</td></tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}
