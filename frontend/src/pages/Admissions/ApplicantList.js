import React, { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { GraduationCap, Plus, Search, Eye } from 'lucide-react';
import api from '../../services/api';
import PageHeader from '../../components/PageHeader';
import DarkTH from '../../components/DarkTH';
import Spinner from '../../components/Spinner';
import StatusBadge from '../../components/StatusBadge';

const tdCls = 'px-4 py-2.5 text-sm text-gray-700';

const STATUSES = ['', 'submitted', 'shortlisted', 'interviewed', 'offered', 'accepted', 'rejected', 'enrolled'];

export default function ApplicantList() {
  const [data, setData] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const LIMIT = 20;

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ page, limit: LIMIT });
    if (search) params.set('search', search);
    if (status) params.set('status', status);
    const r = await api.get(`/admissions?${params}`);
    setData(r.data.data);
    setTotal(r.data.total);
    setLoading(false);
  }, [search, status, page]);

  useEffect(() => { load(); }, [load]);

  const pages = Math.ceil(total / LIMIT);

  return (
    <div>
      <PageHeader
        icon={GraduationCap}
        title="Applicants"
        subtitle={`${total} total applicants`}
        actions={
          <Link to="/admissions/new" className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white text-xs font-semibold rounded-lg transition-colors">
            <Plus size={13} /> New Application
          </Link>
        }
      />

      {/* Filters */}
      <div className="flex gap-2 mb-4 flex-wrap">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            className="border border-gray-200 rounded-lg pl-8 pr-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-300 w-56"
            placeholder="Search name or ref no…"
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
          />
        </div>
        <select
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-300"
          value={status}
          onChange={e => { setStatus(e.target.value); setPage(1); }}
        >
          {STATUSES.map(s => <option key={s} value={s}>{s || 'All Statuses'}</option>)}
        </select>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {loading ? <Spinner /> : (
          <>
            <table className="w-full">
              <thead>
                <DarkTH cols={[
                  { label: 'Ref No', cls: 'w-36' },
                  { label: 'Applicant' },
                  { label: 'Phone' },
                  { label: 'Type', cls: 'w-24' },
                  { label: 'Status', cls: 'w-32' },
                  { label: 'Applied', cls: 'w-28' },
                  { label: '', cls: 'w-16' },
                ]} />
              </thead>
              <tbody className="divide-y divide-gray-50">
                {data.map((a, i) => (
                  <tr key={a.id} className={i % 2 === 1 ? 'bg-gray-50/40' : ''}>
                    <td className={`${tdCls} font-mono text-xs text-blue-700 font-semibold`}>{a.reference_no}</td>
                    <td className={tdCls}>
                      <span className="font-medium text-gray-800">{a.first_name} {a.last_name}</span>
                      {a.email && <p className="text-xs text-gray-400">{a.email}</p>}
                    </td>
                    <td className={`${tdCls} text-gray-500`}>{a.phone || '—'}</td>
                    <td className={tdCls}>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${a.application_type === 'online' ? 'bg-blue-50 text-blue-700' : 'bg-amber-50 text-amber-700'}`}>
                        {a.application_type}
                      </span>
                    </td>
                    <td className={tdCls}><StatusBadge status={a.status} /></td>
                    <td className={`${tdCls} text-xs text-gray-400`}>{new Date(a.created_at).toLocaleDateString()}</td>
                    <td className={tdCls}>
                      <Link to={`/admissions/${a.id}`} className="text-gray-400 hover:text-blue-600 transition-colors">
                        <Eye size={14} />
                      </Link>
                    </td>
                  </tr>
                ))}
                {data.length === 0 && (
                  <tr><td colSpan={7} className="px-4 py-10 text-center text-sm text-gray-400">No applicants found</td></tr>
                )}
              </tbody>
            </table>

            {pages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-gray-50 text-xs text-gray-500">
                <span>Showing {(page - 1) * LIMIT + 1}–{Math.min(page * LIMIT, total)} of {total}</span>
                <div className="flex gap-1">
                  {Array.from({ length: pages }, (_, i) => (
                    <button key={i} onClick={() => setPage(i + 1)}
                      className={`w-7 h-7 rounded-lg text-xs font-medium transition-colors ${page === i + 1 ? 'bg-slate-800 text-white' : 'hover:bg-gray-100 text-gray-600'}`}>
                      {i + 1}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
