import React, { useEffect, useState } from 'react';
import { DollarSign, Plus, Trash2 } from 'lucide-react';
import api from '../../services/api';
import PageHeader from '../../components/PageHeader';
import Spinner from '../../components/Spinner';
import Modal from '../../components/Modal';

const inputCls = 'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-300';
const labelCls = 'block text-xs font-medium text-gray-600 mb-1';

function fmt(n) { return Number(n).toLocaleString('en-UG', { minimumFractionDigits: 0 }); }

export default function FeeStructure() {
  const [years, setYears] = useState([]);
  const [programmes, setProgrammes] = useState([]);
  const [feeItems, setFeeItems] = useState([]);
  const [structures, setStructures] = useState([]);
  const [filter, setFilter] = useState({ academic_year_id: '' });
  const [loading, setLoading] = useState(false);
  const [modal, setModal] = useState(false);
  const [itemModal, setItemModal] = useState(false);
  const [form, setForm] = useState({ programme_id: '', year_of_study: '', semester: '', fee_item_id: '', amount: '' });
  const [itemForm, setItemForm] = useState({ name: '', description: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    Promise.all([
      api.get('/academic/years'),
      api.get('/academic/programmes'),
      api.get('/finance/fee-items'),
    ]).then(([y, p, fi]) => {
      setYears(y.data);
      setProgrammes(p.data);
      setFeeItems(fi.data);
      const current = y.data.find(yr => yr.is_current);
      if (current) setFilter(f => ({ ...f, academic_year_id: current.id }));
    });
  }, []);

  useEffect(() => {
    if (!filter.academic_year_id) return;
    setLoading(true);
    api.get(`/finance/fee-structures?academic_year_id=${filter.academic_year_id}`)
      .then(r => setStructures(r.data))
      .finally(() => setLoading(false));
  }, [filter.academic_year_id]);

  async function addStructure(e) {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post('/finance/fee-structures', { ...form, academic_year_id: filter.academic_year_id });
      setModal(false);
      setForm({ programme_id: '', year_of_study: '', semester: '', fee_item_id: '', amount: '' });
      const r = await api.get(`/finance/fee-structures?academic_year_id=${filter.academic_year_id}`);
      setStructures(r.data);
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to save');
    } finally {
      setSaving(false);
    }
  }

  async function addFeeItem(e) {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post('/finance/fee-items', itemForm);
      const r = await api.get('/finance/fee-items');
      setFeeItems(r.data);
      setItemModal(false);
      setItemForm({ name: '', description: '' });
    } catch (err) {
      alert(err.response?.data?.error || 'Failed');
    } finally {
      setSaving(false);
    }
  }

  async function deleteStructure(id) {
    if (!window.confirm('Remove this fee line?')) return;
    await api.delete(`/finance/fee-structures/${id}`);
    setStructures(s => s.filter(x => x.id !== id));
  }

  const grouped = structures.reduce((acc, s) => {
    const key = s.programme_name || 'All Programmes';
    if (!acc[key]) acc[key] = [];
    acc[key].push(s);
    return acc;
  }, {});

  return (
    <div>
      <PageHeader
        icon={DollarSign}
        title="Fee Structure"
        subtitle="Define tuition and other fees per programme, year, and semester"
        actions={
          <div className="flex gap-2">
            <button onClick={() => setItemModal(true)} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white text-xs font-semibold rounded-lg transition-colors">
              + Fee Item
            </button>
            <button onClick={() => setModal(true)} disabled={!filter.academic_year_id} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-500 hover:bg-blue-400 text-white text-xs font-semibold rounded-lg disabled:opacity-50 transition-colors">
              <Plus size={13} /> Add Fee Line
            </button>
          </div>
        }
      />

      <div className="mb-4 flex items-center gap-3">
        <select className="border border-gray-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-300" value={filter.academic_year_id} onChange={e => setFilter(f => ({ ...f, academic_year_id: e.target.value }))}>
          <option value="">Select Academic Year</option>
          {years.map(y => <option key={y.id} value={y.id}>{y.label}{y.is_current ? ' ✓' : ''}</option>)}
        </select>
      </div>

      {loading ? <Spinner className="py-10" /> : (
        <div className="space-y-5">
          {Object.keys(grouped).length === 0 && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-10 text-center text-sm text-gray-400">
              No fee lines defined for this academic year.
            </div>
          )}
          {Object.entries(grouped).map(([group, rows]) => (
            <div key={group} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-5 py-3 bg-slate-50 border-b border-gray-100">
                <h3 className="text-sm font-bold text-gray-700">{group}</h3>
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-800 text-white">
                    <th className="text-left px-4 py-2.5 text-xs font-semibold uppercase tracking-wide">Fee Item</th>
                    <th className="text-left px-4 py-2.5 text-xs font-semibold uppercase tracking-wide">Year</th>
                    <th className="text-left px-4 py-2.5 text-xs font-semibold uppercase tracking-wide">Semester</th>
                    <th className="text-right px-4 py-2.5 text-xs font-semibold uppercase tracking-wide">Amount (UGX)</th>
                    <th className="px-4 py-2.5" />
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r, i) => (
                    <tr key={r.id} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}>
                      <td className="px-4 py-2.5 font-medium text-gray-800">{r.fee_item_name}</td>
                      <td className="px-4 py-2.5 text-gray-500">{r.year_of_study ? `Year ${r.year_of_study}` : 'All Years'}</td>
                      <td className="px-4 py-2.5 text-gray-500">{r.semester ? `Sem ${r.semester}` : 'All Semesters'}</td>
                      <td className="px-4 py-2.5 text-right font-mono font-semibold text-gray-800">{fmt(r.amount)}</td>
                      <td className="px-4 py-2.5 text-right">
                        <button onClick={() => deleteStructure(r.id)} className="text-red-400 hover:text-red-600 transition-colors">
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </div>
      )}

      {modal && (
        <Modal title="Add Fee Line" onClose={() => setModal(false)}>
          <form onSubmit={addStructure} className="space-y-3">
            <div>
              <label className={labelCls}>Programme (leave blank for all)</label>
              <select className={inputCls} value={form.programme_id} onChange={e => setForm(f => ({ ...f, programme_id: e.target.value }))}>
                <option value="">All Programmes</option>
                {programmes.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Year of Study (blank = all)</label>
                <select className={inputCls} value={form.year_of_study} onChange={e => setForm(f => ({ ...f, year_of_study: e.target.value }))}>
                  <option value="">All Years</option>
                  {[1,2,3,4,5,6].map(n => <option key={n} value={n}>Year {n}</option>)}
                </select>
              </div>
              <div>
                <label className={labelCls}>Semester (blank = all)</label>
                <select className={inputCls} value={form.semester} onChange={e => setForm(f => ({ ...f, semester: e.target.value }))}>
                  <option value="">All Semesters</option>
                  <option value="1">Semester 1</option>
                  <option value="2">Semester 2</option>
                  <option value="3">Semester 3</option>
                </select>
              </div>
            </div>
            <div>
              <label className={labelCls}>Fee Item</label>
              <select className={inputCls} value={form.fee_item_id} onChange={e => setForm(f => ({ ...f, fee_item_id: e.target.value }))} required>
                <option value="">Select fee item</option>
                {feeItems.filter(fi => fi.is_active).map(fi => <option key={fi.id} value={fi.id}>{fi.name}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>Amount (UGX)</label>
              <input type="number" min="0" step="1000" className={inputCls} value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} required placeholder="e.g. 800000" />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setModal(false)} className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50">Cancel</button>
              <button type="submit" disabled={saving} className="px-4 py-2 text-sm font-semibold bg-slate-800 hover:bg-slate-700 text-white rounded-xl disabled:opacity-60">
                {saving ? 'Saving…' : 'Add Fee Line'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {itemModal && (
        <Modal title="New Fee Item" onClose={() => setItemModal(false)}>
          <form onSubmit={addFeeItem} className="space-y-3">
            <div>
              <label className={labelCls}>Name</label>
              <input className={inputCls} value={itemForm.name} onChange={e => setItemForm(f => ({ ...f, name: e.target.value }))} required placeholder="e.g. Library Fee" />
            </div>
            <div>
              <label className={labelCls}>Description</label>
              <input className={inputCls} value={itemForm.description} onChange={e => setItemForm(f => ({ ...f, description: e.target.value }))} placeholder="Optional" />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setItemModal(false)} className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50">Cancel</button>
              <button type="submit" disabled={saving} className="px-4 py-2 text-sm font-semibold bg-slate-800 hover:bg-slate-700 text-white rounded-xl disabled:opacity-60">
                {saving ? 'Saving…' : 'Create'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
