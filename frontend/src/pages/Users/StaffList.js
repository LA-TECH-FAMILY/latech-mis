import React, { useEffect, useState, useCallback, useRef } from 'react';
import { Briefcase, Search, SlidersHorizontal, X, Shield, Mail, ChevronLeft, ChevronRight } from 'lucide-react';
import api from '../../services/api';
import PageHeader from '../../components/PageHeader';
import Spinner from '../../components/Spinner';
import Modal from '../../components/Modal';

const STAFF_ROLES = [
  'lecturer','hod','dean','registrar','finance_officer',
  'admissions_officer','hr_officer','librarian','it_officer','admin',
];

const ROLE_COLOR = {
  admin:              'bg-red-100 text-red-700',
  registrar:          'bg-blue-100 text-blue-700',
  hod:                'bg-indigo-100 text-indigo-700',
  dean:               'bg-violet-100 text-violet-700',
  lecturer:           'bg-cyan-100 text-cyan-700',
  finance_officer:    'bg-amber-100 text-amber-700',
  admissions_officer: 'bg-green-100 text-green-700',
  hr_officer:         'bg-pink-100 text-pink-700',
  librarian:          'bg-teal-100 text-teal-700',
  it_officer:         'bg-orange-100 text-orange-700',
};

function Avatar({ first, last }) {
  const initials = `${(first || '?')[0]}${(last || '?')[0]}`.toUpperCase();
  const colors = ['bg-indigo-500','bg-emerald-500','bg-rose-500','bg-amber-500','bg-cyan-500','bg-violet-500'];
  const color = colors[(first?.charCodeAt(0) || 0) % colors.length];
  return (
    <div className={`w-9 h-9 rounded-full ${color} flex items-center justify-center text-white text-xs font-bold shrink-0`}>
      {initials}
    </div>
  );
}

const inputCls = 'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-300';
const labelCls = 'block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5';

export default function StaffList() {
  const [users, setUsers]       = useState([]);
  const [total, setTotal]       = useState(0);
  const [page, setPage]         = useState(1);
  const [loading, setLoading]   = useState(false);
  const [showFilter, setShowFilter] = useState(false);
  const [roleModal, setRoleModal]   = useState(null); // user to edit roles
  const [allRoles, setAllRoles]     = useState([]);
  const [selectedRoles, setSelectedRoles] = useState([]);
  const [saving, setSaving]     = useState(false);
  const LIMIT = 50;

  const [filter, setFilter] = useState({ search: '', role: '', status: '' });
  const [applied, setApplied]   = useState({ ...filter });
  const searchTimer = useRef(null);

  useEffect(() => {
    api.get('/users/roles').then(r => setAllRoles(r.data));
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ page, limit: LIMIT });
    if (applied.search) params.set('search', applied.search);
    if (applied.role)   params.set('role',   applied.role);
    const r = await api.get(`/users?${params}`);
    // Filter out pure-student accounts client-side
    const staff = r.data.data.filter(u => {
      const roles = u.roles || [];
      return roles.length > 0 && !roles.every(r => r === 'student');
    });
    setUsers(staff);
    setTotal(r.data.total);
    setLoading(false);
  }, [applied, page]);

  useEffect(() => { load(); }, [load]);

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
    const blank = { search: '', role: '', status: '' };
    setFilter(blank); setApplied(blank); setPage(1);
  }

  function openRoleModal(user) {
    setRoleModal(user);
    setSelectedRoles(user.roles || []);
  }

  async function saveRoles() {
    setSaving(true);
    try {
      await api.put(`/users/${roleModal.id}/roles`, { roles: selectedRoles });
      setRoleModal(null);
      load();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to update roles');
    } finally {
      setSaving(false);
    }
  }

  function toggleRole(name) {
    setSelectedRoles(r => r.includes(name) ? r.filter(x => x !== name) : [...r, name]);
  }

  const activeFilterCount = [applied.role, applied.status].filter(Boolean).length;
  const pages = Math.ceil(total / LIMIT);

  return (
    <div>
      <PageHeader
        icon={Briefcase}
        title="Staff Accounts"
        subtitle={`${total} staff users`}
      />

      {/* Search + filter bar */}
      <div className="flex gap-3 mb-5">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          <input
            className="w-full border border-gray-200 rounded-xl pl-8 pr-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-300"
            placeholder="Search by name or email…"
            value={filter.search}
            onChange={e => handleSearch(e.target.value)}
          />
        </div>
        <button
          onClick={() => setShowFilter(v => !v)}
          className={`inline-flex items-center gap-2 px-4 py-2.5 border rounded-xl text-sm font-medium transition-colors
            ${showFilter || activeFilterCount > 0 ? 'bg-slate-800 text-white border-slate-800' : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'}`}
        >
          <SlidersHorizontal size={14} />
          Filter Data
          {activeFilterCount > 0 && (
            <span className="w-5 h-5 rounded-full bg-blue-500 text-white text-[10px] font-bold flex items-center justify-center">{activeFilterCount}</span>
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
            <h3 className="text-sm font-bold text-gray-700 flex items-center gap-2"><SlidersHorizontal size={14} /> Filter Staff</h3>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className={labelCls}>Role</label>
              <select className={inputCls} value={filter.role} onChange={e => setFilter(f => ({ ...f, role: e.target.value }))}>
                <option value="">All Roles</option>
                {STAFF_ROLES.map(r => <option key={r} value={r}>{r.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase())}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>Account Status</label>
              <select className={inputCls} value={filter.status} onChange={e => setFilter(f => ({ ...f, status: e.target.value }))}>
                <option value="">All</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>
          <div className="flex justify-end gap-3 mt-4 pt-4 border-t border-gray-100">
            <button onClick={() => setShowFilter(false)} className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50">Cancel</button>
            <button onClick={applyFilters} className="px-5 py-2 text-sm font-semibold bg-slate-800 hover:bg-slate-700 text-white rounded-xl">Apply Filters</button>
          </div>
        </div>
      )}

      {/* Table */}
      {loading ? <Spinner className="py-10" /> : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-3 bg-slate-50 border-b border-gray-100 flex items-center justify-between">
            <h3 className="text-sm font-bold text-gray-700">Staff Users</h3>
            <span className="text-xs text-gray-400">{users.length} showing</span>
          </div>

          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-800 text-white">
                <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide w-10">#</th>
                <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide">Name</th>
                <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide">Email</th>
                <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide">Roles</th>
                <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide">Phone</th>
                <th className="text-center px-4 py-3 text-xs font-semibold uppercase tracking-wide">Status</th>
                <th className="text-center px-4 py-3 text-xs font-semibold uppercase tracking-wide">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.length === 0 && (
                <tr>
                  <td colSpan={7} className="text-center py-16 text-gray-400 text-sm">
                    No staff accounts found.
                  </td>
                </tr>
              )}
              {users.map((u, i) => (
                <tr key={u.id} className={i % 2 === 0 ? 'bg-white hover:bg-blue-50/30 transition-colors' : 'bg-slate-50/40 hover:bg-blue-50/30 transition-colors'}>
                  <td className="px-4 py-3 text-xs text-gray-400">{(page - 1) * LIMIT + i + 1}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <Avatar first={u.first_name} last={u.last_name} />
                      <div>
                        <p className="font-semibold text-gray-800">{u.first_name} {u.last_name}</p>
                        <p className="text-xs text-gray-400">{u.last_login ? `Last login ${new Date(u.last_login).toLocaleDateString()}` : 'Never logged in'}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-600">{u.email}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {(u.roles || []).filter(r => r !== 'student').map(r => (
                        <span key={r} className={`text-[10px] font-semibold px-2 py-0.5 rounded-full capitalize ${ROLE_COLOR[r] || 'bg-gray-100 text-gray-600'}`}>
                          {r.replace('_', ' ')}
                        </span>
                      ))}
                      {(!u.roles || u.roles.filter(r => r !== 'student').length === 0) && (
                        <span className="text-xs text-gray-400 italic">No role</span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500">{u.phone || '—'}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${u.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                      {u.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-center gap-1.5">
                      <button onClick={() => openRoleModal(u)} title="Manage roles"
                        className="p-1.5 bg-slate-100 hover:bg-slate-800 hover:text-white text-slate-600 rounded-lg transition-colors">
                        <Shield size={13} />
                      </button>
                      <button onClick={() => window.open(`mailto:${u.email}`)} title="Send email"
                        className="p-1.5 bg-slate-100 hover:bg-blue-600 hover:text-white text-slate-600 rounded-lg transition-colors">
                        <Mail size={13} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {pages > 1 && (
            <div className="px-5 py-3 border-t border-gray-100 flex items-center justify-between">
              <span className="text-xs text-gray-400">Showing {(page-1)*LIMIT+1}–{Math.min(page*LIMIT, total)} of {total}</span>
              <div className="flex items-center gap-1">
                <button onClick={() => setPage(p => Math.max(1, p-1))} disabled={page===1}
                  className="p-1.5 rounded-lg border border-gray-200 hover:bg-gray-100 disabled:opacity-40"><ChevronLeft size={14}/></button>
                {Array.from({length: Math.min(pages,7)}, (_,i) => i+1).map(p => (
                  <button key={p} onClick={() => setPage(p)}
                    className={`w-8 h-8 rounded-lg text-xs font-semibold ${p===page ? 'bg-slate-800 text-white' : 'border border-gray-200 hover:bg-gray-100 text-gray-600'}`}>{p}</button>
                ))}
                <button onClick={() => setPage(p => Math.min(pages, p+1))} disabled={page===pages}
                  className="p-1.5 rounded-lg border border-gray-200 hover:bg-gray-100 disabled:opacity-40"><ChevronRight size={14}/></button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Role edit modal */}
      {roleModal && (
        <Modal title={`Roles — ${roleModal.first_name} ${roleModal.last_name}`} onClose={() => setRoleModal(null)}>
          <div className="space-y-4">
            <p className="text-xs text-gray-400">{roleModal.email}</p>
            <div className="grid grid-cols-2 gap-2">
              {allRoles.map(r => (
                <label key={r.id} className={`flex items-center gap-2.5 p-2.5 rounded-xl cursor-pointer border transition-colors ${selectedRoles.includes(r.name) ? 'bg-blue-50 border-blue-300' : 'border-gray-200 hover:bg-gray-50'}`}>
                  <input type="checkbox" checked={selectedRoles.includes(r.name)} onChange={() => toggleRole(r.name)} className="rounded" />
                  <span className="text-sm capitalize font-medium text-gray-700">{r.name.replace('_', ' ')}</span>
                </label>
              ))}
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setRoleModal(null)} className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50">Cancel</button>
              <button onClick={saveRoles} disabled={saving} className="px-4 py-2 text-sm font-semibold bg-slate-800 hover:bg-slate-700 text-white rounded-xl disabled:opacity-60">
                {saving ? 'Saving…' : 'Save Roles'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
