import React, { useEffect, useState, useCallback } from 'react';
import { Users, Search, ClipboardCheck, ChevronLeft, ChevronRight } from 'lucide-react';
import { useHistory } from 'react-router-dom';
import api from '../../services/api';
import PageHeader from '../../components/PageHeader';
import Spinner from '../../components/Spinner';
import StatusBadge from '../../components/StatusBadge';

const statusColor = {
  active:        'bg-green-100 text-green-700',
  deferred:      'bg-yellow-100 text-yellow-700',
  discontinued:  'bg-red-100 text-red-600',
  completed:     'bg-blue-100 text-blue-700',
  graduated:     'bg-purple-100 text-purple-700',
  suspended:     'bg-orange-100 text-orange-700',
};

export default function StudentList() {
  const history = useHistory();
  const [students, setStudents] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [programmes, setProgrammes] = useState([]);

  const [filter, setFilter] = useState({
    search: '',
    programme_id: '',
    year_of_study: '',
    status: 'active',
  });

  const LIMIT = 50;

  useEffect(() => {
    api.get('/academic/programmes').then(r => setProgrammes(r.data));
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ page, limit: LIMIT });
    if (filter.search)       params.set('search', filter.search);
    if (filter.programme_id) params.set('programme_id', filter.programme_id);
    if (filter.year_of_study) params.set('year_of_study', filter.year_of_study);
    if (filter.status)       params.set('status', filter.status);
    const r = await api.get(`/users/students?${params}`);
    setStudents(r.data.data);
    setTotal(r.data.total);
    setLoading(false);
  }, [filter, page]);

  useEffect(() => { load(); }, [load]);

  function handleFilter(key, val) {
    setFilter(f => ({ ...f, [key]: val }));
    setPage(1);
  }

  const pages = Math.ceil(total / LIMIT);

  return (
    <div>
      <PageHeader
        icon={Users}
        title="Student Records"
        subtitle={`${total} enrolled students`}
      />

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-5">
        <div className="relative flex-1 min-w-56">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          <input
            className="w-full border border-gray-200 rounded-xl pl-8 pr-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-300"
            placeholder="Search by student no, name or email…"
            value={filter.search}
            onChange={e => handleFilter('search', e.target.value)}
          />
        </div>

        <select className="border border-gray-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-300"
          value={filter.programme_id} onChange={e => handleFilter('programme_id', e.target.value)}>
          <option value="">All Programmes</option>
          {programmes.map(p => <option key={p.id} value={p.id}>{p.code} — {p.name}</option>)}
        </select>

        <select className="border border-gray-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-300"
          value={filter.year_of_study} onChange={e => handleFilter('year_of_study', e.target.value)}>
          <option value="">All Years</option>
          {[1,2,3,4,5,6].map(n => <option key={n} value={n}>Year {n}</option>)}
        </select>

        <select className="border border-gray-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-300"
          value={filter.status} onChange={e => handleFilter('status', e.target.value)}>
          <option value="">All Statuses</option>
          <option value="active">Active</option>
          <option value="deferred">Deferred</option>
          <option value="discontinued">Discontinued</option>
          <option value="completed">Completed</option>
          <option value="graduated">Graduated</option>
          <option value="suspended">Suspended</option>
        </select>
      </div>

      {/* Table */}
      {loading ? <Spinner className="py-10" /> : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-800 text-white">
                <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide">Student No</th>
                <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide">Name</th>
                <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide">Email</th>
                <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide">Programme</th>
                <th className="text-center px-4 py-3 text-xs font-semibold uppercase tracking-wide">Year</th>
                <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide">Intake</th>
                <th className="text-center px-4 py-3 text-xs font-semibold uppercase tracking-wide">Status</th>
                <th className="text-center px-4 py-3 text-xs font-semibold uppercase tracking-wide">Actions</th>
              </tr>
            </thead>
            <tbody>
              {students.length === 0 && (
                <tr>
                  <td colSpan={8} className="text-center py-14 text-gray-400 text-sm">
                    No students found. Enrol an applicant to create the first student record.
                  </td>
                </tr>
              )}
              {students.map((s, i) => (
                <tr key={s.student_id} className={i % 2 === 0 ? 'bg-white hover:bg-blue-50/20' : 'bg-gray-50/50 hover:bg-blue-50/20'}>

                  {/* Student No — the "Access Number" equivalent */}
                  <td className="px-4 py-3">
                    <span className="font-mono font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-lg text-xs">
                      {s.student_no}
                    </span>
                  </td>

                  <td className="px-4 py-3">
                    <p className="font-semibold text-gray-800">{s.first_name} {s.last_name}</p>
                    <p className="text-xs text-gray-400">{s.phone || '—'}</p>
                  </td>

                  <td className="px-4 py-3 text-xs text-gray-500">{s.email}</td>

                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-700">{s.programme_code}</p>
                    <p className="text-xs text-gray-400 truncate max-w-40">{s.programme_name}</p>
                  </td>

                  <td className="px-4 py-3 text-center text-gray-600 font-semibold">
                    {s.year_of_study}
                  </td>

                  <td className="px-4 py-3 text-xs text-gray-500">{s.intake_label || '—'}</td>

                  <td className="px-4 py-3 text-center">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full capitalize ${statusColor[s.student_status] || 'bg-gray-100 text-gray-500'}`}>
                      {s.student_status}
                    </span>
                  </td>

                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => history.push(`/registration/clearance?student=${s.student_no}`)}
                      title="Go to Registration Clearance"
                      className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-100 hover:bg-slate-800 hover:text-white text-slate-700 text-xs font-semibold rounded-lg transition-colors"
                    >
                      <ClipboardCheck size={12} /> Register
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Pagination */}
          {pages > 1 && (
            <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
              <span>Showing {(page - 1) * LIMIT + 1}–{Math.min(page * LIMIT, total)} of {total} students</span>
              <div className="flex items-center gap-1">
                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                  className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-40"><ChevronLeft size={14} /></button>
                {Array.from({ length: Math.min(pages, 8) }, (_, i) => i + 1).map(p => (
                  <button key={p} onClick={() => setPage(p)}
                    className={`w-7 h-7 rounded-lg text-xs font-semibold ${p === page ? 'bg-slate-800 text-white' : 'hover:bg-gray-100 text-gray-600'}`}>
                    {p}
                  </button>
                ))}
                <button onClick={() => setPage(p => Math.min(pages, p + 1))} disabled={page === pages}
                  className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-40"><ChevronRight size={14} /></button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
