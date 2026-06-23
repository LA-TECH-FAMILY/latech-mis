import React, { useEffect, useState } from 'react';
import { useHistory } from 'react-router-dom';
import { Users } from 'lucide-react';
import api from '../../services/api';
import PageHeader from '../../components/PageHeader';

const inputCls = 'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-300';
const labelCls = 'block text-xs font-medium text-gray-600 mb-1';

export default function NewUser() {
  const history = useHistory();
  const [roles, setRoles] = useState([]);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    first_name: '', last_name: '', other_names: '', email: '',
    password: '', phone: '', gender: '', date_of_birth: '',
  });
  const [selectedRoles, setSelectedRoles] = useState([]);

  useEffect(() => {
    api.get('/users/roles').then(r => setRoles(r.data));
  }, []);

  function setField(k, v) { setForm(f => ({ ...f, [k]: v })); }
  function toggleRole(name) { setSelectedRoles(r => r.includes(name) ? r.filter(x => x !== name) : [...r, name]); }

  async function handleSubmit(e) {
    e.preventDefault();
    if (form.password.length < 8) return alert('Password must be at least 8 characters');
    setSaving(true);
    try {
      await api.post('/users', { ...form, roles: selectedRoles });
      history.push('/users');
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to create user');
      setSaving(false);
    }
  }

  return (
    <div>
      <PageHeader icon={Users} title="Add User" subtitle="Create a new staff or student account" />

      <form onSubmit={handleSubmit} className="max-w-2xl space-y-5">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h3 className="text-sm font-bold text-gray-700 mb-4">Account Details</h3>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>First Name *</label>
              <input className={inputCls} value={form.first_name} onChange={e => setField('first_name', e.target.value)} required />
            </div>
            <div>
              <label className={labelCls}>Last Name *</label>
              <input className={inputCls} value={form.last_name} onChange={e => setField('last_name', e.target.value)} required />
            </div>
            <div>
              <label className={labelCls}>Other Names</label>
              <input className={inputCls} value={form.other_names} onChange={e => setField('other_names', e.target.value)} />
            </div>
            <div>
              <label className={labelCls}>Gender</label>
              <select className={inputCls} value={form.gender} onChange={e => setField('gender', e.target.value)}>
                <option value="">Select</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <label className={labelCls}>Email Address *</label>
              <input type="email" className={inputCls} value={form.email} onChange={e => setField('email', e.target.value)} required />
            </div>
            <div>
              <label className={labelCls}>Phone</label>
              <input className={inputCls} value={form.phone} onChange={e => setField('phone', e.target.value)} placeholder="+256 700 000000" />
            </div>
            <div>
              <label className={labelCls}>Password * (min 8 chars)</label>
              <input type="password" className={inputCls} value={form.password} onChange={e => setField('password', e.target.value)} required minLength={8} />
            </div>
            <div>
              <label className={labelCls}>Date of Birth</label>
              <input type="date" className={inputCls} value={form.date_of_birth} onChange={e => setField('date_of_birth', e.target.value)} />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h3 className="text-sm font-bold text-gray-700 mb-3">Assign Roles</h3>
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
        </div>

        <div className="flex justify-end gap-3">
          <button type="button" onClick={() => history.goBack()} className="px-5 py-2.5 text-sm text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50">Cancel</button>
          <button type="submit" disabled={saving} className="px-5 py-2.5 text-sm font-semibold bg-slate-800 hover:bg-slate-700 text-white rounded-xl disabled:opacity-60">
            {saving ? 'Creating…' : 'Create User'}
          </button>
        </div>
      </form>
    </div>
  );
}
