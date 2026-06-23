import React, { useEffect, useState } from 'react';
import { BookOpen, Save, Plus, Trash2 } from 'lucide-react';
import api from '../../services/api';
import PageHeader from '../../components/PageHeader';
import Spinner from '../../components/Spinner';

const selectCls = 'border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-300';

const SEMESTERS = [1, 2, 3];
const YEARS = [1, 2, 3, 4, 5, 6];

export default function ProgrammeCurriculum() {
  const [programmes, setProgrammes] = useState([]);
  const [academicYears, setAcademicYears] = useState([]);
  const [allCourses, setAllCourses] = useState([]);
  const [filter, setFilter] = useState({ programme_id: '', academic_year_id: '' });
  const [curriculum, setCurriculum] = useState([]); // [{course_id, year_of_study, semester, is_core}]
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    Promise.all([
      api.get('/academic/programmes'),
      api.get('/academic/years'),
      api.get('/curriculum/courses'),
    ]).then(([p, y, c]) => {
      setProgrammes(p.data);
      setAcademicYears(y.data);
      setAllCourses(c.data);
      const current = y.data.find(yr => yr.is_current);
      if (current) setFilter(f => ({ ...f, academic_year_id: current.id }));
    });
  }, []);

  useEffect(() => {
    if (!filter.programme_id || !filter.academic_year_id) return;
    setLoading(true);
    api.get(`/curriculum/programmes/${filter.programme_id}/years/${filter.academic_year_id}`)
      .then(r => { setCurriculum(r.data.map(item => ({ course_id: item.course_id, year_of_study: item.year_of_study, semester: item.semester, is_core: item.is_core }))); })
      .catch(() => setCurriculum([]))
      .finally(() => setLoading(false));
  }, [filter]);

  function addRow() {
    setCurriculum(c => [...c, { course_id: '', year_of_study: 1, semester: 1, is_core: true }]);
  }

  function removeRow(i) {
    setCurriculum(c => c.filter((_, j) => j !== i));
  }

  function updateRow(i, key, val) {
    setCurriculum(c => c.map((item, j) => j === i ? { ...item, [key]: val } : item));
  }

  async function handleSave() {
    if (!filter.programme_id || !filter.academic_year_id) return;
    const invalid = curriculum.some(r => !r.course_id);
    if (invalid) return alert('All rows must have a course selected');
    setSaving(true);
    try {
      await api.put(`/curriculum/programmes/${filter.programme_id}/years/${filter.academic_year_id}`, { courses: curriculum });
      alert('Curriculum saved successfully');
    } catch (err) {
      alert(err.response?.data?.error || 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  // Group by year → semester for display
  const grouped = {};
  curriculum.forEach((item, idx) => {
    const key = `Y${item.year_of_study}_S${item.semester}`;
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push({ ...item, idx });
  });

  const selectedProg = programmes.find(p => p.id === filter.programme_id);

  return (
    <div>
      <PageHeader
        icon={BookOpen}
        title="Programme Curriculum"
        subtitle="Assign courses to a programme per academic year"
        actions={
          filter.programme_id && filter.academic_year_id ? (
            <div className="flex gap-2">
              <button onClick={addRow} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white text-xs font-semibold rounded-lg transition-colors">
                <Plus size={13} /> Add Course
              </button>
              <button onClick={handleSave} disabled={saving} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-500 hover:bg-blue-400 text-white text-xs font-semibold rounded-lg transition-colors disabled:opacity-60">
                <Save size={13} /> {saving ? 'Saving…' : 'Save Curriculum'}
              </button>
            </div>
          ) : null
        }
      />

      {/* Filters */}
      <div className="flex gap-2 mb-6 flex-wrap">
        <select className={selectCls} value={filter.programme_id} onChange={e => setFilter(f => ({ ...f, programme_id: e.target.value }))}>
          <option value="">Select Programme</option>
          {programmes.map(p => <option key={p.id} value={p.id}>{p.name} ({p.code})</option>)}
        </select>
        <select className={selectCls} value={filter.academic_year_id} onChange={e => setFilter(f => ({ ...f, academic_year_id: e.target.value }))}>
          <option value="">Select Academic Year</option>
          {academicYears.map(y => <option key={y.id} value={y.id}>{y.label}{y.is_current ? ' (current)' : ''}</option>)}
        </select>
      </div>

      {!filter.programme_id || !filter.academic_year_id ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-6 py-14 text-center text-sm text-gray-400">
          Select a programme and academic year to manage curriculum
        </div>
      ) : loading ? <Spinner /> : (
        <div className="space-y-4">
          {selectedProg && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-center gap-3">
              <div className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center">
                <BookOpen size={14} className="text-indigo-600" />
              </div>
              <div>
                <p className="text-sm font-bold text-gray-800">{selectedProg.name}</p>
                <p className="text-xs text-gray-400">{selectedProg.code} · {selectedProg.duration_years} years · {curriculum.length} courses assigned</p>
              </div>
            </div>
          )}

          {/* Curriculum rows — grouped by year/semester */}
          {curriculum.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-6 py-10 text-center">
              <p className="text-sm text-gray-400 mb-3">No courses assigned yet</p>
              <button onClick={addRow} className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white text-sm font-semibold rounded-xl">
                <Plus size={14} /> Add First Course
              </button>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="bg-slate-800 text-white">
                    <th className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-left w-16">Year</th>
                    <th className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-left w-24">Semester</th>
                    <th className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-left">Course</th>
                    <th className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-left w-16">CU</th>
                    <th className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-center w-20">Core?</th>
                    <th className="px-4 py-2.5 w-12"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {curriculum.map((row, i) => {
                    const course = allCourses.find(c => c.id === row.course_id);
                    return (
                      <tr key={i} className={i % 2 === 1 ? 'bg-gray-50/40' : ''}>
                        <td className="px-4 py-2">
                          <select
                            className="border border-gray-200 rounded-lg px-2 py-1 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-300 w-14"
                            value={row.year_of_study}
                            onChange={e => updateRow(i, 'year_of_study', parseInt(e.target.value))}
                          >
                            {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
                          </select>
                        </td>
                        <td className="px-4 py-2">
                          <select
                            className="border border-gray-200 rounded-lg px-2 py-1 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-300 w-14"
                            value={row.semester}
                            onChange={e => updateRow(i, 'semester', parseInt(e.target.value))}
                          >
                            {SEMESTERS.map(s => <option key={s} value={s}>{s}</option>)}
                          </select>
                        </td>
                        <td className="px-4 py-2">
                          <select
                            className="border border-gray-200 rounded-lg px-2 py-1 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-300 w-full"
                            value={row.course_id}
                            onChange={e => updateRow(i, 'course_id', e.target.value)}
                          >
                            <option value="">Select course</option>
                            {allCourses.map(c => <option key={c.id} value={c.id}>{c.code} — {c.name}</option>)}
                          </select>
                        </td>
                        <td className="px-4 py-2 text-sm text-gray-500">{course?.credit_units || '—'}</td>
                        <td className="px-4 py-2 text-center">
                          <input
                            type="checkbox"
                            checked={row.is_core}
                            onChange={e => updateRow(i, 'is_core', e.target.checked)}
                            className="rounded"
                          />
                        </td>
                        <td className="px-4 py-2">
                          <button onClick={() => removeRow(i)} className="text-gray-300 hover:text-red-500 transition-colors">
                            <Trash2 size={14} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              <div className="px-4 py-3 border-t border-gray-50 flex justify-between items-center">
                <button onClick={addRow} className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-medium">
                  <Plus size={12} /> Add row
                </button>
                <span className="text-xs text-gray-400">{curriculum.length} courses · {curriculum.reduce((s, r) => s + (allCourses.find(c => c.id === r.course_id)?.credit_units || 0), 0)} total credit units</span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
