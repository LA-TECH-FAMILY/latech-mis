import React, { useEffect, useState, useCallback, useRef } from 'react';
import { Users, Search, SlidersHorizontal, X, ClipboardCheck, ChevronLeft, ChevronRight, Mail } from 'lucide-react';
import { useHistory } from 'react-router-dom';
import api from '../../services/api';
import PageHeader from '../../components/PageHeader';
import Spinner from '../../components/Spinner';

const STATUSES = [
  { value: 'admitted',            label: 'Admitted' },
  { value: 'active',              label: 'Ongoing' },
  { value: 'deferred',            label: 'Deferred' },
  { value: 'discontinued',        label: 'Discontinued' },
  { value: 'completed',           label: 'Completed' },
  { value: 'graduated',           label: 'Graduated' },
  { value: 'suspended',           label: 'Suspended' },
  { value: 'transfer',            label: 'Transfer' },
  { value: 'pending_transcript',  label: 'Pending Transcript' },
];

const STATUS_STYLE = {
  admitted:           'bg-blue-100 text-blue-700',
  active:             'bg-green-100 text-green-700',
  deferred:           'bg-yellow-100 text-yellow-700',
  discontinued:       'bg-red-100 text-red-600',
  completed:          'bg-teal-100 text-teal-700',
  graduated:          'bg-purple-100 text-purple-700',
  suspended:          'bg-orange-100 text-orange-700',
  transfer:           'bg-indigo-100 text-indigo-700',
  pending_transcript: 'bg-gray-100 text-gray-600',
};

function Avatar({ first, last }) {
  const initials = `${(first || '?')[0]}${(last || '?')[0]}`.toUpperCase();
  const colors = ['bg-blue-500','bg-emerald-500','bg-violet-500','bg-rose-500','bg-amber-500','bg-cyan-500'];
  const color = colors[(first?.charCodeAt(0) || 0) % colors.length];
  return (
    <div className={`w-9 h-9 rounded-full ${color} flex items-center justify-center text-white text-xs font-bold shrink-0`}>
      {initials}
    </div>
  );
}

const inputCls = 'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-300';
const labelCls = 'block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5';

export default function StudentList() {
  const history = useHistory();
  const [students, setStudents]   = useState([]);
  const [total, setTotal]         = useState(0);
  const [page, setPage]           = useState(1);
  const [loading, setLoading]     = useState(false);
  const [programmes, setProgrammes] = useState([]);
  const [faculties, setFaculties]   = useState([]);
  const [showFilter, setShowFilter] = useState(false);
  const LIMIT = 50;

  const [filter, setFilter] = useState({
    search: '', programme_id: '', faculty_id: '',
    year_of_study: '', status: '',
  });
  const [applied, setApplied] = useState({ ...filter });
  const searchTimer = useRef(null);

  useEffect(() => {
    Promise.all([
      api.get('/academic/programmes'),
      api.get('/academic/faculties'),
    ]).then(([p, f]) => { setProgrammes(p.data); setFaculties(f.data); });
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ page, limit: LIMIT });
    if (applied.search)        params.set('search',        applied.search);
    if (applied.programme_id)  params.set('programme_id',  applied.programme_id);
    if (applied.year_of_study) params.set('year_of_study', applied.year_of_study);
    if (applied.status)        params.set('status',        applied.status);
    const r = await api.get(`/users/students?${params}`);
    setStudents(r.data.data);
    setTotal(r.data.total);
    setLoading(false);
  }, [applied, page]);

  useEffect(() => { load(); }, [load]);

  // Live search with debounce
  function handleSearch(val) {
    setFilter(f => ({ ...f, search: val }));
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => {
      setApplied(f => ({ ...f, search: val }));
      setPage(1);
    }, 350);
  }

  function applyFilters() {
    setApplied({ ...filter });
    setPage(1);
    setShowFilter(false);
  }

  function clearFilters() {
    const blank = { search: '', programme_id: '', faculty_id: '', year_of_study: '', status: '' };
    setFilter(blank);
    setApplied(blank);
    setPage(1);
  }

  const activeFilterCount = [applied.programme_id, applied.year_of_study, applied.status, applied.faculty_id].filter(Boolean).length;
  const pages = Math.ceil(total / LIMIT);

  const filteredProgrammes = filter.faculty_id
    ? programmes.filter(p => p.faculty_id === filter.faculty_id)
    : programmes;

  return (
    <div>
      <PageHeader
        icon={Users}
        title="Student Accounts"
        subtitle={`${total} student${total !== 1 ? 's' : ''} found`}
      />

      {/* Search + filter bar */}
      <div className="flex gap-3 mb-5">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          <input
            className="w-full border border-gray-200 rounded-xl pl-8 pr-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-300"
            placeholder="Search by student no, name or email…"
            value={filter.search}
            onChange={e => handleSearch(e.target.value)}
          />
        </div>
        <button
          onClick={() => setShowFilter(v => !v)}
          className={`relative inline-flex items-center gap-2 px-4 py-2.5 border rounded-xl text-sm font-medium transition-colors
            ${showFilter || activeFilterCount > 0 ? 'bg-slate-800 text-white border-slate-800' : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'}`}
        >
          <SlidersHorizontal size={14} />
          Filter Data
          {activeFilterCount > 0 && (
            <span className="w-5 h-5 rounded-full bg-blue-500 text-white text-[10px] font-bold flex items-center justify-center">
              {activeFilterCount}
            </span>
          )}
        </button>
        {activeFilterCount > 0 && (
          <button onClick={clearFilters} className="inline-flex items-center gap-1 px-3 py-2.5 text-xs text-red-500 hover:text-red-700 border border-red-200 rounded-xl bg-white transition-colors">
            <X size={12} /> Clear
          </button>
        )}
      </div>

      {/* Filter panel */}
      {showFilter && (
        <div className="bg-white border border-gray-200 rounded-2xl shadow-lg p-5 mb-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-gray-700 flex items-center gap-2"><SlidersHorizontal size={14} /> Filter Data</h3>
            <p className="text-xs text-blue-600">Select options below. Data will update when you click Apply.</p>
          </div>
          <div className="grid grid-cols-4 gap-4">
            <div>
              <label className={labelCls}>Faculty</label>
              <select className={inputCls} value={filter.faculty_id} onChange={e => setFilter(f => ({ ...f, faculty_id: e.target.value, programme_id: '' }))}>
                <option value="">All Faculties</option>
                {faculties.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>Programme</label>
              <select className={inputCls} value={filter.programme_id} onChange={e => setFilter(f => ({ ...f, programme_id: e.target.value }))}>
                <option value="">All Programmes</option>
                {filteredProgrammes.map(p => <option key={p.id} value={p.id}>{p.code} — {p.name}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>Year of Study</label>
              <select className={inputCls} value={filter.year_of_study} onChange={e => setFilter(f => ({ ...f, year_of_study: e.target.value }))}>
                <option value="">All Years</option>
                {[1,2,3,4,5,6].map(n => <option key={n} value={n}>Year {n}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>Study Status</label>
              <select className={inputCls} value={filter.status} onChange={e => setFilter(f => ({ ...f, status: e.target.value }))}>
                <option value="">All Statuses</option>
                {STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>
          </div>
          <div className="flex justify-end gap-3 mt-4 pt-4 border-t border-gray-100">
            <button onClick={() => setShowFilter(false)} className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50">Cancel</button>
            <button onClick={applyFilters} className="px-5 py-2 text-sm font-semibold bg-slate-800 hover:bg-slate-700 text-white rounded-xl">Apply Filters</button>
          </div>
        </div>
      )}

      {/* Active filter chips */}
      {activeFilterCount > 0 && (
        <div className="flex flex-wrap gap-2 mb-4">
          {applied.status && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-semibold">
              {STATUSES.find(s => s.value === applied.status)?.label}
              <button onClick={() => { setApplied(f => ({ ...f, status: '' })); setFilter(f => ({ ...f, status: '' })); }}><X size={10} /></button>
            </span>
          )}
          {applied.year_of_study && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-semibold">
              Year {applied.year_of_study}
              <button onClick={() => { setApplied(f => ({ ...f, year_of_study: '' })); setFilter(f => ({ ...f, year_of_study: '' })); }}><X size={10} /></button>
            </span>
          )}
          {applied.programme_id && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-semibold">
              {programmes.find(p => p.id === applied.programme_id)?.code}
              <button onClick={() => { setApplied(f => ({ ...f, programme_id: '' })); setFilter(f => ({ ...f, programme_id: '' })); }}><X size={10} /></button>
            </span>
          )}
        </div>
      )}

      {/* Table */}
      {loading ? <Spinner className="py-10" /> : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          {/* Count header */}
          <div className="px-5 py-3 bg-slate-50 border-b border-gray-100 flex items-center justify-between">
            <h3 className="text-sm font-bold text-gray-700">Student Users</h3>
            <span className="text-xs text-gray-400">{total} record{total !== 1 ? 's' : ''}</span>
          </div>

          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-800 text-white">
                <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide w-10">#</th>
                <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide">Student No</th>
                <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide">Name</th>
                <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide">Programme</th>
                <th className="text-center px-4 py-3 text-xs font-semibold uppercase tracking-wide">Year</th>
                <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide">Intake</th>
                <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide">Type</th>
                <th className="text-center px-4 py-3 text-xs font-semibold uppercase tracking-wide">Status</th>
                <th className="text-center px-4 py-3 text-xs font-semibold uppercase tracking-wide">Actions</th>
              </tr>
            </thead>
            <tbody>
              {students.length === 0 && (
                <tr>
                  <td colSpan={9} className="text-center py-16 text-gray-400 text-sm">
                    No students found. Adjust filters or enrol an applicant from Admissions.
                  </td>
                </tr>
              )}
              {students.map((s, i) => (
                <tr key={s.student_id} className={i % 2 === 0 ? 'bg-white hover:bg-blue-50/30 transition-colors' : 'bg-slate-50/40 hover:bg-blue-50/30 transition-colors'}>
                  <td className="px-4 py-3 text-xs text-gray-400">{(page - 1) * LIMIT + i + 1}</td>

                  <td className="px-4 py-3">
                    <span className="font-mono font-bold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-lg text-xs tracking-wide">
                      {s.student_no}
                    </span>
                  </td>

                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <Avatar first={s.first_name} last={s.last_name} />
                      <div>
                        <p className="font-semibold text-gray-800">{s.first_name} {s.last_name}</p>
                        <p className="text-xs text-gray-400">{s.email}</p>
                      </div>
                    </div>
                  </td>

                  <td className="px-4 py-3">
                    <p className="font-semibold text-xs text-gray-700">{s.programme_code}</p>
                    <p className="text-xs text-gray-400 truncate max-w-36">{s.programme_name}</p>
                  </td>

                  <td className="px-4 py-3 text-center">
                    <span className="inline-flex w-7 h-7 items-center justify-center bg-slate-100 rounded-full text-xs font-bold text-slate-700">
                      {s.year_of_study}
                    </span>
                  </td>

                  <td className="px-4 py-3 text-xs text-gray-500">{s.intake_label || '—'}</td>

                  <td className="px-4 py-3">
                    <span className="text-xs text-gray-500 capitalize">{(s.student_type || '').replace('_', ' ')}</span>
                  </td>

                  <td className="px-4 py-3 text-center">
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full capitalize ${STATUS_STYLE[s.student_status] || 'bg-gray-100 text-gray-500'}`}>
                      {STATUSES.find(x => x.value === s.student_status)?.label || s.student_status}
                    </span>
                  </td>

                  <td className="px-4 py-3">
                    <div className="flex items-center justify-center gap-1.5">
                      <button
                        onClick={() => history.push('/registration/clearance')}
                        title="Registration Clearance"
                        className="p-1.5 bg-slate-100 hover:bg-slate-800 hover:text-white text-slate-600 rounded-lg transition-colors"
                      >
                        <ClipboardCheck size={13} />
                      </button>
                      <button
                        onClick={() => window.open(`mailto:${s.email}`)}
                        title="Send email"
                        className="p-1.5 bg-slate-100 hover:bg-blue-600 hover:text-white text-slate-600 rounded-lg transition-colors"
                      >
                        <Mail size={13} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Pagination */}
          {pages > 1 && (
            <div className="px-5 py-3 border-t border-gray-100 flex items-center justify-between">
              <span className="text-xs text-gray-400">
                Showing {(page - 1) * LIMIT + 1}–{Math.min(page * LIMIT, total)} of {total}
              </span>
              <div className="flex items-center gap-1">
                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                  className="p-1.5 rounded-lg border border-gray-200 hover:bg-gray-100 disabled:opacity-40 transition-colors">
                  <ChevronLeft size={14} />
                </button>
                {Array.from({ length: Math.min(pages, 7) }, (_, i) => i + 1).map(p => (
                  <button key={p} onClick={() => setPage(p)}
                    className={`w-8 h-8 rounded-lg text-xs font-semibold transition-colors ${p === page ? 'bg-slate-800 text-white' : 'border border-gray-200 hover:bg-gray-100 text-gray-600'}`}>
                    {p}
                  </button>
                ))}
                <button onClick={() => setPage(p => Math.min(pages, p + 1))} disabled={page === pages}
                  className="p-1.5 rounded-lg border border-gray-200 hover:bg-gray-100 disabled:opacity-40 transition-colors">
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
