import React, { useEffect, useState } from 'react';
import { Building2, Plus, Pencil } from 'lucide-react';
import api from '../../services/api';
import PageHeader from '../../components/PageHeader';
import DarkTH from '../../components/DarkTH';
import Spinner from '../../components/Spinner';
import Modal from '../../components/Modal';

const inputCls = 'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-300';
const labelCls = 'block text-xs font-medium text-gray-600 mb-1';
const tdCls = 'px-4 py-2.5 text-sm text-gray-700';

const EMPTY = { code: '', name: '', dean_id: '' };

export default function Faculties() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null); // null | {mode:'add'|'edit', item?}
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    const r = await api.get('/academic/faculties');
    setData(r.data);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  function openAdd() { setForm(EMPTY); setModal({ mode: 'add' }); }
  function openEdit(item) { setForm({ code: item.code, name: item.name, dean_id: item.dean_id || '' }); setModal({ mode: 'edit', item }); }

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    try {
      if (modal.mode === 'add') {
        await api.post('/academic/faculties', form);
      } else {
        await api.put(`/academic/faculties/${modal.item.id}`, form);
      }
      setModal(null);
      load();
    } catch (err) {
      alert(err.response?.data?.error || 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <PageHeader
        icon={Building2}
        title="Faculties"
        subtitle={`${data.length} faculties`}
        actions={
          <button
            onClick={openAdd}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white text-xs font-semibold rounded-lg transition-colors"
          >
            <Plus size={13} /> Add Faculty
          </button>
        }
      />

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {loading ? <Spinner /> : (
          <table className="w-full">
            <thead>
              <DarkTH cols={[
                { label: 'Code', cls: 'w-24' },
                { label: 'Faculty Name' },
                { label: 'Dean' },
                { label: 'Actions', cls: 'w-20 text-right' },
              ]} />
            </thead>
            <tbody className="divide-y divide-gray-50">
              {data.map((f, i) => (
                <tr key={f.id} className={i % 2 === 1 ? 'bg-gray-50/40' : ''}>
                  <td className={`${tdCls} font-mono text-xs font-semibold text-blue-700`}>{f.code}</td>
                  <td className={tdCls}>{f.name}</td>
                  <td className={tdCls}>{f.dean_name || <span className="text-gray-400 italic">Unassigned</span>}</td>
                  <td className={`${tdCls} text-right`}>
                    <button onClick={() => openEdit(f)} className="text-gray-400 hover:text-slate-700 transition-colors">
                      <Pencil size={14} />
                    </button>
                  </td>
                </tr>
              ))}
              {data.length === 0 && (
                <tr><td colSpan={4} className="px-4 py-10 text-center text-sm text-gray-400">No faculties yet</td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {modal && (
        <Modal title={modal.mode === 'add' ? 'Add Faculty' : 'Edit Faculty'} onClose={() => setModal(null)}>
          <form onSubmit={handleSave} className="space-y-4">
            <div>
              <label className={labelCls}>Faculty Code</label>
              <input className={inputCls} value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value }))} placeholder="e.g. FST" required disabled={modal.mode === 'edit'} />
            </div>
            <div>
              <label className={labelCls}>Faculty Name</label>
              <input className={inputCls} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Faculty of Science and Technology" required />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setModal(null)} className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50">Cancel</button>
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
