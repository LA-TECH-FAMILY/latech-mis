import React, { useEffect, useState } from 'react';
import { ClipboardList, Plus } from 'lucide-react';
import api from '../../services/api';
import PageHeader from '../../components/PageHeader';
import DarkTH from '../../components/DarkTH';
import Spinner from '../../components/Spinner';
import Modal from '../../components/Modal';
import StatusBadge from '../../components/StatusBadge';

const inputCls = 'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-300';
const labelCls = 'block text-xs font-medium text-gray-600 mb-1';
const tdCls = 'px-4 py-2.5 text-sm text-gray-700';

export default function RegistrationWindows() {
  const [data, setData] = useState([]);
  const [years, setYears] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({ academic_year_id: '', semester: '1', open_date: '', close_date: '', min_clearance_percent: 60 });
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    const [w, y] = await Promise.all([api.get('/registration/windows'), api.get('/academic/years')]);
    setData(w.data);
    setYears(y.data);
    const current = y.data.find(yr => yr.is_current);
    if (current) setForm(f => ({ ...f, academic_year_id: current.id }));
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post('/registration/windows', form);
      setModal(false);
      load();
    } catch (err) {
      alert(err.response?.data?.error || 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  function windowStatus(w) {
    const now = new Date();
    if (new Date(w.open_date) > now) return 'pending';
    if (new Date(w.close_date) < now) return 'closed';
    return 'open';
  }

  return (
    <div>
      <PageHeader
        icon={ClipboardList}
        title="Registration Windows"
        subtitle="Manage when students can register"
        actions={
          <button onClick={() => setModal(true)} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white text-xs font-semibold rounded-lg transition-colors">
            <Plus size={13} /> Add Window
          </button>
        }
      />

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {loading ? <Spinner /> : (
          <table className="w-full">
            <thead>
              <DarkTH cols={[
                { label: 'Academic Year' },
                { label: 'Semester', cls: 'w-24' },
                { label: 'Opens' },
                { label: 'Closes' },
                { label: 'Min Clearance', cls: 'w-32 text-center' },
                { label: 'Status', cls: 'w-24' },
              ]} />
            </thead>
            <tbody className="divide-y divide-gray-50">
              {data.map((w, i) => (
                <tr key={w.id} className={i % 2 === 1 ? 'bg-gray-50/40' : ''}>
                  <td className={`${tdCls} font-semibold`}>{w.academic_year_label}</td>
                  <td className={`${tdCls} text-center`}>Sem {w.semester}</td>
                  <td className={tdCls}>{new Date(w.open_date).toLocaleString()}</td>
                  <td className={tdCls}>{new Date(w.close_date).toLocaleString()}</td>
                  <td className={`${tdCls} text-center`}>{w.min_clearance_percent}%</td>
                  <td className={tdCls}><StatusBadge status={windowStatus(w)} /></td>
                </tr>
              ))}
              {data.length === 0 && (
                <tr><td colSpan={6} className="px-4 py-10 text-center text-sm text-gray-400">No registration windows</td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {modal && (
        <Modal title="Add Registration Window" onClose={() => setModal(false)}>
          <form onSubmit={handleSave} className="space-y-4">
            <div>
              <label className={labelCls}>Academic Year</label>
              <select className={inputCls} value={form.academic_year_id} onChange={e => setForm(f => ({ ...f, academic_year_id: e.target.value }))} required>
                <option value="">Select year</option>
                {years.map(y => <option key={y.id} value={y.id}>{y.label}{y.is_current ? ' (current)' : ''}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>Semester</label>
              <select className={inputCls} value={form.semester} onChange={e => setForm(f => ({ ...f, semester: e.target.value }))}>
                <option value="1">Semester 1</option>
                <option value="2">Semester 2</option>
                <option value="3">Semester 3</option>
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Open Date</label>
                <input type="datetime-local" className={inputCls} value={form.open_date} onChange={e => setForm(f => ({ ...f, open_date: e.target.value }))} required />
              </div>
              <div>
                <label className={labelCls}>Close Date</label>
                <input type="datetime-local" className={inputCls} value={form.close_date} onChange={e => setForm(f => ({ ...f, close_date: e.target.value }))} required />
              </div>
            </div>
            <div>
              <label className={labelCls}>Minimum Clearance % (default 60)</label>
              <input type="number" min="0" max="100" className={inputCls} value={form.min_clearance_percent} onChange={e => setForm(f => ({ ...f, min_clearance_percent: e.target.value }))} />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setModal(false)} className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50">Cancel</button>
              <button type="submit" disabled={saving} className="px-4 py-2 text-sm font-semibold bg-slate-800 hover:bg-slate-700 text-white rounded-xl disabled:opacity-60">
                {saving ? 'Saving…' : 'Save'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
