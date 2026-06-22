import React, { useEffect, useState } from 'react';
import { GraduationCap, Plus, Pencil } from 'lucide-react';
import api from '../../services/api';
import PageHeader from '../../components/PageHeader';
import DarkTH from '../../components/DarkTH';
import Spinner from '../../components/Spinner';
import Modal from '../../components/Modal';

const inputCls = 'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-300';
const labelCls = 'block text-xs font-medium text-gray-600 mb-1';
const tdCls = 'px-4 py-2.5 text-sm text-gray-700';

const AWARD_TYPES = ['certificate', 'diploma', 'degree', 'postgrad_diploma', 'masters', 'phd'];
const STUDY_MODES = ['full_time', 'part_time', 'distance', 'weekend'];

const AWARD_BADGE = {
  certificate: 'bg-gray-100 text-gray-600',
  diploma: 'bg-blue-100 text-blue-700',
  degree: 'bg-indigo-100 text-indigo-700',
  postgrad_diploma: 'bg-purple-100 text-purple-700',
  masters: 'bg-violet-100 text-violet-700',
  phd: 'bg-rose-100 text-rose-700',
};

const EMPTY = { department_id: '', code: '', name: '', award_type: 'degree', duration_years: 3, study_mode: 'full_time' };

export default function Programmes() {
  const [data, setData] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    const [progs, depts] = await Promise.all([
      api.get('/academic/programmes'),
      api.get('/academic/departments'),
    ]);
    setData(progs.data);
    setDepartments(depts.data);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  function openAdd() { setForm(EMPTY); setModal({ mode: 'add' }); }
  function openEdit(item) {
    setForm({ department_id: item.department_id, code: item.code, name: item.name, award_type: item.award_type, duration_years: item.duration_years, study_mode: item.study_mode });
    setModal({ mode: 'edit', item });
  }

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    try {
      if (modal.mode === 'add') await api.post('/academic/programmes', form);
      else await api.put(`/academic/programmes/${modal.item.id}`, form);
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
        icon={GraduationCap}
        title="Programmes"
        subtitle={`${data.length} programmes`}
        actions={
          <button onClick={openAdd} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white text-xs font-semibold rounded-lg transition-colors">
            <Plus size={13} /> Add Programme
          </button>
        }
      />

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {loading ? <Spinner /> : (
          <table className="w-full">
            <thead>
              <DarkTH cols={[
                { label: 'Code', cls: 'w-28' },
                { label: 'Programme' },
                { label: 'Department' },
                { label: 'Award' },
                { label: 'Duration' },
                { label: 'Mode' },
                { label: '', cls: 'w-16' },
              ]} />
            </thead>
            <tbody className="divide-y divide-gray-50">
              {data.map((p, i) => (
                <tr key={p.id} className={i % 2 === 1 ? 'bg-gray-50/40' : ''}>
                  <td className={`${tdCls} font-mono text-xs font-semibold text-blue-700`}>{p.code}</td>
                  <td className={tdCls}>{p.name}</td>
                  <td className={`${tdCls} text-gray-500 text-xs`}>{p.department_name}</td>
                  <td className={tdCls}>
                    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${AWARD_BADGE[p.award_type] || 'bg-gray-100 text-gray-600'}`}>
                      {p.award_type.replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td className={`${tdCls} text-center`}>{p.duration_years}y</td>
                  <td className={`${tdCls} text-xs text-gray-500`}>{p.study_mode.replace(/_/g, ' ')}</td>
                  <td className={`${tdCls} text-right`}>
                    <button onClick={() => openEdit(p)} className="text-gray-400 hover:text-slate-700 transition-colors"><Pencil size={14} /></button>
                  </td>
                </tr>
              ))}
              {data.length === 0 && (
                <tr><td colSpan={7} className="px-4 py-10 text-center text-sm text-gray-400">No programmes yet</td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {modal && (
        <Modal title={modal.mode === 'add' ? 'Add Programme' : 'Edit Programme'} onClose={() => setModal(null)}>
          <form onSubmit={handleSave} className="space-y-3">
            <div>
              <label className={labelCls}>Department</label>
              <select className={inputCls} value={form.department_id} onChange={e => setForm(f => ({ ...f, department_id: e.target.value }))} required>
                <option value="">Select department</option>
                {departments.map(d => <option key={d.id} value={d.id}>{d.name} — {d.faculty_name}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Programme Code</label>
                <input className={inputCls} value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value }))} placeholder="e.g. BSC-CS" required disabled={modal.mode === 'edit'} />
              </div>
              <div>
                <label className={labelCls}>Duration (years)</label>
                <input type="number" step="0.5" min="0.5" max="8" className={inputCls} value={form.duration_years} onChange={e => setForm(f => ({ ...f, duration_years: e.target.value }))} required />
              </div>
            </div>
            <div>
              <label className={labelCls}>Programme Name</label>
              <input className={inputCls} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Bachelor of Science in Computer Science" required />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Award Type</label>
                <select className={inputCls} value={form.award_type} onChange={e => setForm(f => ({ ...f, award_type: e.target.value }))} required>
                  {AWARD_TYPES.map(t => <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>)}
                </select>
              </div>
              <div>
                <label className={labelCls}>Study Mode</label>
                <select className={inputCls} value={form.study_mode} onChange={e => setForm(f => ({ ...f, study_mode: e.target.value }))} required>
                  {STUDY_MODES.map(m => <option key={m} value={m}>{m.replace(/_/g, ' ')}</option>)}
                </select>
              </div>
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
