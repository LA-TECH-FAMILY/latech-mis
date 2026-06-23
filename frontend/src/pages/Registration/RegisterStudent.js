import React, { useEffect, useState, useRef } from 'react';
import { ClipboardList, Search, CheckCircle, User } from 'lucide-react';
import api from '../../services/api';
import PageHeader from '../../components/PageHeader';
import Spinner from '../../components/Spinner';
import StatusBadge from '../../components/StatusBadge';

const inputCls = 'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-300';
const labelCls = 'block text-xs font-medium text-gray-600 mb-1';

export default function RegisterStudent() {
  const [years, setYears] = useState([]);
  const [filter, setFilter] = useState({ academic_year_id: '', semester: '1' });
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [student, setStudent] = useState(null);
  const [curriculum, setCurriculum] = useState([]);
  const [selected, setSelected] = useState([]);
  const [clearancePct, setClearancePct] = useState(60);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState(null);
  const debounce = useRef(null);

  useEffect(() => {
    api.get('/academic/years').then(r => {
      setYears(r.data);
      const current = r.data.find(y => y.is_current);
      if (current) setFilter(f => ({ ...f, academic_year_id: current.id }));
    });
  }, []);

  function handleQueryChange(e) {
    const val = e.target.value;
    setQuery(val);
    setStudent(null);
    setResult(null);
    clearTimeout(debounce.current);
    if (val.length < 2) { setSuggestions([]); return; }
    debounce.current = setTimeout(async () => {
      const r = await api.get(`/users/search/students?q=${encodeURIComponent(val)}`);
      setSuggestions(r.data);
    }, 300);
  }

  function selectStudent(s) {
    setStudent(s);
    setQuery(`${s.student_no} — ${s.first_name} ${s.last_name}`);
    setSuggestions([]);
    setResult(null);
  }

  useEffect(() => {
    if (!student || !filter.academic_year_id) return;
    setLoading(true);
    api.get('/curriculum/courses').then(r => {
      setCurriculum(r.data);
      setSelected([]);
    }).finally(() => setLoading(false));
  }, [student, filter.academic_year_id]);

  function toggleCourse(id) {
    setSelected(s => s.includes(id) ? s.filter(x => x !== id) : [...s, id]);
  }

  async function handleRegister() {
    if (!student || !filter.academic_year_id || !filter.semester) return;
    setSaving(true);
    setResult(null);
    try {
      const r = await api.post('/registration/register', {
        student_id: student.student_id,
        academic_year_id: filter.academic_year_id,
        semester: parseInt(filter.semester),
        course_ids: selected,
        clearance_percent: parseFloat(clearancePct),
      });
      setResult(r.data);
    } catch (err) {
      alert(err.response?.data?.error || 'Registration failed');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <PageHeader icon={ClipboardList} title="Register Student" subtitle="Enrol a student for a semester" />

      <div className="max-w-2xl space-y-5">
        {/* Step 1 — Find student */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h3 className="text-sm font-bold text-gray-700 mb-3">Step 1 — Find Student</h3>
          <div className="relative">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                <input
                  className="w-full border border-gray-200 rounded-xl pl-8 pr-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-300"
                  placeholder="Search by student number, name or email…"
                  value={query}
                  onChange={handleQueryChange}
                  autoComplete="off"
                />
              </div>
            </div>

            {/* Dropdown suggestions */}
            {suggestions.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-20 overflow-hidden">
                {suggestions.map(s => (
                  <button
                    key={s.student_id}
                    type="button"
                    onClick={() => selectStudent(s)}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-blue-50 transition-colors text-left border-b border-gray-50 last:border-0"
                  >
                    <div className="w-8 h-8 bg-slate-100 rounded-full flex items-center justify-center shrink-0">
                      <User size={14} className="text-slate-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-800">{s.first_name} {s.last_name}</p>
                      <p className="text-xs text-gray-400">{s.student_no} · {s.programme_code} · Year {s.year_of_study}</p>
                    </div>
                    <StatusBadge status={s.student_status} />
                  </button>
                ))}
              </div>
            )}

            {suggestions.length === 0 && query.length >= 2 && !student && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-20 px-4 py-3 text-sm text-gray-400">
                No students found for "{query}"
              </div>
            )}
          </div>

          {student && (
            <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-xl flex items-center gap-3">
              <CheckCircle size={15} className="text-green-600 shrink-0" />
              <div>
                <p className="text-sm font-semibold text-green-800">{student.first_name} {student.last_name}</p>
                <p className="text-xs text-green-600">{student.student_no} · {student.programme_name} · Year {student.year_of_study}</p>
              </div>
            </div>
          )}
        </div>

        {/* Step 2 — Semester & Clearance */}
        {student && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <h3 className="text-sm font-bold text-gray-700 mb-3">Step 2 — Semester & Clearance</h3>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className={labelCls}>Academic Year</label>
                <select className={inputCls} value={filter.academic_year_id} onChange={e => setFilter(f => ({ ...f, academic_year_id: e.target.value }))}>
                  <option value="">Select year</option>
                  {years.map(y => <option key={y.id} value={y.id}>{y.label}{y.is_current ? ' ✓' : ''}</option>)}
                </select>
              </div>
              <div>
                <label className={labelCls}>Semester</label>
                <select className={inputCls} value={filter.semester} onChange={e => setFilter(f => ({ ...f, semester: e.target.value }))}>
                  <option value="1">Semester 1</option>
                  <option value="2">Semester 2</option>
                  <option value="3">Semester 3</option>
                </select>
              </div>
              <div>
                <label className={labelCls}>Clearance %</label>
                <input
                  type="number" min="0" max="100" step="5"
                  className={inputCls}
                  value={clearancePct}
                  onChange={e => setClearancePct(e.target.value)}
                />
              </div>
            </div>
            <p className="mt-2 text-xs text-gray-400">Min 60% for provisional · 100% for full registration</p>
          </div>
        )}

        {/* Step 3 — Course Selection */}
        {student && filter.academic_year_id && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <h3 className="text-sm font-bold text-gray-700 mb-3">Step 3 — Select Courses</h3>
            {loading ? <Spinner className="py-6" /> : (
              <div className="space-y-1.5 max-h-72 overflow-y-auto">
                {curriculum.map(c => (
                  <label key={c.id} className={`flex items-center gap-3 p-2.5 rounded-xl cursor-pointer transition-colors ${selected.includes(c.id) ? 'bg-blue-50 border border-blue-200' : 'hover:bg-gray-50 border border-transparent'}`}>
                    <input type="checkbox" checked={selected.includes(c.id)} onChange={() => toggleCourse(c.id)} className="rounded" />
                    <span className="font-mono text-xs font-semibold text-blue-700 w-24 shrink-0">{c.code}</span>
                    <span className="text-sm text-gray-700 flex-1">{c.name}</span>
                    <span className="text-xs text-gray-400 shrink-0">{c.credit_units} CU</span>
                  </label>
                ))}
                {curriculum.length === 0 && <p className="text-sm text-gray-400 text-center py-4">No courses available</p>}
              </div>
            )}
            {selected.length > 0 && (
              <p className="mt-2 text-xs text-gray-500">{selected.length} courses · {curriculum.filter(c => selected.includes(c.id)).reduce((s, c) => s + Number(c.credit_units), 0)} total CU</p>
            )}
          </div>
        )}

        {student && filter.academic_year_id && (
          <div className="flex justify-end">
            <button onClick={handleRegister} disabled={saving || selected.length === 0} className="px-6 py-2.5 bg-slate-800 hover:bg-slate-700 text-white text-sm font-semibold rounded-xl disabled:opacity-60 transition-colors">
              {saving ? 'Registering…' : 'Register Student'}
            </button>
          </div>
        )}

        {result && (
          <div className="bg-green-50 border border-green-200 rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle size={16} className="text-green-600" />
              <p className="text-sm font-bold text-green-800">Registration Successful</p>
            </div>
            <div className="flex gap-4 text-sm text-green-700 flex-wrap">
              <span>Status: <StatusBadge status={result.registration.status} /></span>
              <span>Courses: <strong>{result.courses_registered}</strong></span>
              <span>Clearance: <strong>{result.registration.clearance_percent}%</strong></span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
