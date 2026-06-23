import React, { useEffect, useState } from 'react';
import { CalendarCheck, Plus, ToggleLeft, ToggleRight } from 'lucide-react';
import api from '../../services/api';
import PageHeader from '../../components/PageHeader';
import DarkTH from '../../components/DarkTH';
import Spinner from '../../components/Spinner';
import Modal from '../../components/Modal';

const inputCls = 'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-300';
const labelCls = 'block text-xs font-medium text-gray-600 mb-1';
const tdCls = 'px-4 py-2.5 text-sm text-gray-700';

const MONTHS = ['january', 'may', 'august'];

export default function Intakes() {
  const [data, setData] = useState([]);
  const [programmes, setProgrammes] = useState([]);
  const [years, setYears] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({ academic_year_id: '', programme_id: '', intake_label: '', intake_month: 'august', capacity: '' });
  const [saving, setSaving] = useState(false);
  const [filterYear, setFilterYear] = useState('');

  async function load() {
    setLoading(true);
    const [intakes, progs, yrs] = await Promise.all([
      api.get('/academic/intakes' + (filterYear ? `?academic_year_id=${filterYear}` : '')),
      api.get('/academic/programmes'),
      api.get('/academic/years'),
    ]);
    setData(intakes.data);
    setProgrammes(progs.data);
    setYears(yrs.data);
    const current = yrs.data.find(y => y.is_current);
    if (current && !filterYear) setFilterYear(current.id);
    setLoading(false);
  }

  useEffect(() => { load(); }, [filterYear]);

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post('/academic/intakes', { ...form, capacity: form.capacity || null });
      setModal(false);
      load();
    } catch (err) {
      alert(err.response?.data?.error || 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  function openAdd() {
    const current = years.find(y => y.is_current);
    setForm({ academic_year_id: current?.id || '', programme_id: '', intake_label: '', intake_month: 'august', capacity: '' });
    setModal(true);
  }

  return (
    <div>
      <PageHeader
        icon={CalendarCheck}
        title="Intakes"
        subtitle={`${data.length} intakes`}
        actions={
          <button onClick={openAdd} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white text-xs font-semibold rounded-lg transition-colors">
            <Plus size={13} /> Add Intake
          </button>
        }
      />

      <div className="mb-4">
        <select
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-300"
          value={filterYear}
          onChange={e => setFilterYear(e.target.value)}
        >
          <option value="">All Years</option>
          {years.map(y => <option key={y.id} value={y.id}>{y.label}{y.is_current ? ' (current)' : ''}</option>)}
        </select>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {loading ? <Spinner /> : (
          <table className="w-full">
            <thead>
              <DarkTH cols={[
                { label: 'Programme' },
                { label: 'Intake' },
                { label: 'Month', cls: 'w-24' },
                { label: 'Year' },
                { label: 'Capacity', cls: 'w-24 text-center' },
                { label: 'Status', cls: 'w-24 text-center' },
              ]} />
            </thead>
            <tbody className="divide-y divide-gray-50">
              {data.map((item, i) => (
                <tr key={item.id} className={i % 2 === 1 ? 'bg-gray-50/40' : ''}>
                  <td className={tdCls}>
                    <p className="font-medium text-gray-800">{item.programme_name}</p>
                  </td>
                  <td className={tdCls}>{item.intake_label}</td>
                  <td className={`${tdCls} capitalize`}>{item.intake_month}</td>
                  <td className={`${tdCls} text-gray-500`}>{item.academic_year}</td>
                  <td className={`${tdCls} text-center`}>{item.capacity || '—'}</td>
                  <td className={`${tdCls} text-center`}>
                    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${item.is_open ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                      {item.is_open ? 'Open' : 'Closed'}
                    </span>
                  </td>
                </tr>
              ))}
              {data.length === 0 && (
                <tr><td colSpan={6} className="px-4 py-10 text-center text-sm text-gray-400">No intakes for this year</td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {modal && (
        <Modal title="Add Intake" onClose={() => setModal(false)}>
          <form onSubmit={handleSave} className="space-y-4">
            <div>
              <label className={labelCls}>Academic Year</label>
              <select className={inputCls} value={form.academic_year_id} onChange={e => setForm(f => ({ ...f, academic_year_id: e.target.value }))} required>
                <option value="">Select year</option>
                {years.map(y => <option key={y.id} value={y.id}>{y.label}{y.is_current ? ' (current)' : ''}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>Programme</label>
              <select className={inputCls} value={form.programme_id} onChange={e => setForm(f => ({ ...f, programme_id: e.target.value }))} required>
                <option value="">Select programme</option>
                {programmes.map(p => <option key={p.id} value={p.id}>{p.name} ({p.code})</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Intake Month</label>
                <select className={inputCls} value={form.intake_month} onChange={e => setForm(f => ({ ...f, intake_month: e.target.value }))} required>
                  {MONTHS.map(m => <option key={m} value={m} className="capitalize">{m.charAt(0).toUpperCase() + m.slice(1)}</option>)}
                </select>
              </div>
              <div>
                <label className={labelCls}>Capacity (optional)</label>
                <input type="number" min="1" className={inputCls} value={form.capacity} onChange={e => setForm(f => ({ ...f, capacity: e.target.value }))} placeholder="e.g. 60" />
              </div>
            </div>
            <div>
              <label className={labelCls}>Intake Label</label>
              <input className={inputCls} value={form.intake_label} onChange={e => setForm(f => ({ ...f, intake_label: e.target.value }))} placeholder="e.g. August 2025" required />
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
