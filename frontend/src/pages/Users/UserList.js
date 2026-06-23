import React, { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Users, Plus, Search, Pencil, ShieldCheck } from 'lucide-react';
import api from '../../services/api';
import PageHeader from '../../components/PageHeader';
import DarkTH from '../../components/DarkTH';
import Spinner from '../../components/Spinner';
import Modal from '../../components/Modal';

const tdCls = 'px-4 py-2.5 text-sm text-gray-700';
const inputCls = 'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-300';
const labelCls = 'block text-xs font-medium text-gray-600 mb-1';

export default function UserList() {
  const [data, setData] = useState([]);
  const [total, setTotal] = useState(0);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [roleModal, setRoleModal] = useState(null); // {user}
  const [selectedRoles, setSelectedRoles] = useState([]);
  const [saving, setSaving] = useState(false);
  const LIMIT = 20;

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ page, limit: LIMIT });
    if (search) params.set('search', search);
    const [users, r] = await Promise.all([
      api.get(`/users?${params}`),
      api.get('/users/roles'),
    ]);
    setData(users.data.data);
    setTotal(users.data.total);
    setRoles(r.data);
    setLoading(false);
  }, [search, page]);

  useEffect(() => { load(); }, [load]);

  function openRoleModal(user) {
    setSelectedRoles(user.roles || []);
    setRoleModal(user);
  }

  async function saveRoles(e) {
    e.preventDefault();
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

  const pages = Math.ceil(total / LIMIT);

  return (
    <div>
      <PageHeader
        icon={Users}
        title="Users"
        subtitle={`${total} users`}
        actions={
          <Link to="/users/new" className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white text-xs font-semibold rounded-lg transition-colors">
            <Plus size={13} /> Add User
          </Link>
        }
      />

      <div className="flex gap-2 mb-4">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            className="border border-gray-200 rounded-lg pl-8 pr-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-300 w-64"
            placeholder="Search name or email…"
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
          />
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {loading ? <Spinner /> : (
          <>
            <table className="w-full">
              <thead>
                <DarkTH cols={[
                  { label: 'Name' },
                  { label: 'Email' },
                  { label: 'Roles' },
                  { label: 'Status', cls: 'w-24' },
                  { label: 'Last Login', cls: 'w-36' },
                  { label: '', cls: 'w-20' },
                ]} />
              </thead>
              <tbody className="divide-y divide-gray-50">
                {data.map((u, i) => (
                  <tr key={u.id} className={i % 2 === 1 ? 'bg-gray-50/40' : ''}>
                    <td className={tdCls}>
                      <p className="font-medium text-gray-800">{u.first_name} {u.last_name}</p>
                    </td>
                    <td className={`${tdCls} text-gray-500`}>{u.email}</td>
                    <td className={tdCls}>
                      <div className="flex flex-wrap gap-1">
                        {(u.roles || []).map(r => (
                          <span key={r} className="px-1.5 py-0.5 bg-slate-100 text-slate-600 text-xs rounded font-medium">{r}</span>
                        ))}
                        {(!u.roles || u.roles.length === 0) && <span className="text-gray-400 text-xs italic">No roles</span>}
                      </div>
                    </td>
                    <td className={tdCls}>
                      <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${u.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                        {u.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className={`${tdCls} text-xs text-gray-400`}>
                      {u.last_login ? new Date(u.last_login).toLocaleDateString() : 'Never'}
                    </td>
                    <td className={tdCls}>
                      <button onClick={() => openRoleModal(u)} className="text-gray-400 hover:text-slate-700 transition-colors" title="Manage roles">
                        <ShieldCheck size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
                {data.length === 0 && (
                  <tr><td colSpan={6} className="px-4 py-10 text-center text-sm text-gray-400">No users found</td></tr>
                )}
              </tbody>
            </table>

            {pages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-gray-50 text-xs text-gray-500">
                <span>Showing {(page - 1) * LIMIT + 1}–{Math.min(page * LIMIT, total)} of {total}</span>
                <div className="flex gap-1">
                  {Array.from({ length: Math.min(pages, 8) }, (_, i) => (
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

      {/* Role assignment modal */}
      {roleModal && (
        <Modal title={`Roles — ${roleModal.first_name} ${roleModal.last_name}`} onClose={() => setRoleModal(null)}>
          <form onSubmit={saveRoles} className="space-y-3">
            <p className="text-xs text-gray-500 mb-2">Select all roles that apply to this user.</p>
            <div className="grid grid-cols-2 gap-2">
              {roles.map(r => (
                <label key={r.id} className={`flex items-center gap-2 p-2.5 rounded-xl cursor-pointer border transition-colors ${selectedRoles.includes(r.name) ? 'bg-blue-50 border-blue-200' : 'border-gray-100 hover:bg-gray-50'}`}>
                  <input type="checkbox" checked={selectedRoles.includes(r.name)} onChange={() => toggleRole(r.name)} className="rounded" />
                  <div>
                    <p className="text-xs font-semibold text-gray-700">{r.name}</p>
                    <p className="text-[10px] text-gray-400 leading-tight">{r.description}</p>
                  </div>
                </label>
              ))}
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setRoleModal(null)} className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50">Cancel</button>
              <button type="submit" disabled={saving} className="px-4 py-2 text-sm font-semibold bg-slate-800 hover:bg-slate-700 text-white rounded-xl disabled:opacity-60">
                {saving ? 'Saving…' : 'Save Roles'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
