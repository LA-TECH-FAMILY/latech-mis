import React, { useEffect, useState } from 'react';
import { CalendarDays, Plus, CheckCircle } from 'lucide-react';
import api from '../../services/api';
import PageHeader from '../../components/PageHeader';
import DarkTH from '../../components/DarkTH';
import Spinner from '../../components/Spinner';
import Modal from '../../components/Modal';

const inputCls = 'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-300';
const labelCls = 'block text-xs font-medium text-gray-600 mb-1';
const tdCls = 'px-4 py-2.5 text-sm text-gray-700';

export default function AcademicYears() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({ label: '', start_date: '', end_date: '', is_current: false });
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    const r = await api.get('/academic/years');
    setData(r.data);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post('/academic/years', form);
      setModal(false);
      load();
    } catch (err) {
      alert(err.response?.data?.error || 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  async function setCurrent(id) {
    await api.put(`/academic/years/${id}/set-current`);
    load();
  }

  return (
    <div>
      <PageHeader
        icon={CalendarDays}
        title="Academic Years"
        subtitle="Manage academic year periods"
        actions={
          <button onClick={() => setModal(true)} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white text-xs font-semibold rounded-lg transition-colors">
            <Plus size={13} /> Add Year
          </button>
        }
      />

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {loading ? <Spinner /> : (
          <table className="w-full">
            <thead>
              <DarkTH cols={[
                { label: 'Year' },
                { label: 'Start Date' },
                { label: 'End Date' },
                { label: 'Status', cls: 'w-32' },
                { label: '', cls: 'w-28' },
              ]} />
            </thead>
            <tbody className="divide-y divide-gray-50">
              {data.map((y, i) => (
                <tr key={y.id} className={i % 2 === 1 ? 'bg-gray-50/40' : ''}>
                  <td className={`${tdCls} font-semibold text-gray-800`}>{y.label}</td>
                  <td className={tdCls}>{new Date(y.start_date).toLocaleDateString()}</td>
                  <td className={tdCls}>{new Date(y.end_date).toLocaleDateString()}</td>
                  <td className={tdCls}>
                    {y.is_current
                      ? <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-100 text-green-700 text-xs font-semibold"><span className="w-1.5 h-1.5 bg-green-500 rounded-full" />Current</span>
                      : <span className="text-gray-400 text-xs">—</span>}
                  </td>
                  <td className={tdCls}>
                    {!y.is_current && (
                      <button onClick={() => setCurrent(y.id)} className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-medium">
                        <CheckCircle size={13} /> Set Current
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {modal && (
        <Modal title="Add Academic Year" onClose={() => setModal(false)}>
          <form onSubmit={handleSave} className="space-y-4">
            <div>
              <label className={labelCls}>Year Label</label>
              <input className={inputCls} value={form.label} onChange={e => setForm(f => ({ ...f, label: e.target.value }))} placeholder="e.g. 2025/2026" required />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Start Date</label>
                <input type="date" className={inputCls} value={form.start_date} onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))} required />
              </div>
              <div>
                <label className={labelCls}>End Date</label>
                <input type="date" className={inputCls} value={form.end_date} onChange={e => setForm(f => ({ ...f, end_date: e.target.value }))} required />
              </div>
            </div>
            <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
              <input type="checkbox" checked={form.is_current} onChange={e => setForm(f => ({ ...f, is_current: e.target.checked }))} className="rounded" />
              Set as current year
            </label>
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
