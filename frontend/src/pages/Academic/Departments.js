import React, { useEffect, useState } from 'react';
import { Layers, Plus, Pencil } from 'lucide-react';
import api from '../../services/api';
import PageHeader from '../../components/PageHeader';
import DarkTH from '../../components/DarkTH';
import Spinner from '../../components/Spinner';
import Modal from '../../components/Modal';

const inputCls = 'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-300';
const labelCls = 'block text-xs font-medium text-gray-600 mb-1';
const tdCls = 'px-4 py-2.5 text-sm text-gray-700';

export default function Departments() {
  const [data, setData] = useState([]);
  const [faculties, setFaculties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({ faculty_id: '', code: '', name: '' });
  const [saving, setSaving] = useState(false);
  const [filterFaculty, setFilterFaculty] = useState('');

  async function load() {
    setLoading(true);
    const [depts, facs] = await Promise.all([
      api.get('/academic/departments' + (filterFaculty ? `?faculty_id=${filterFaculty}` : '')),
      api.get('/academic/faculties'),
    ]);
    setData(depts.data);
    setFaculties(facs.data);
    setLoading(false);
  }

  useEffect(() => { load(); }, [filterFaculty]);

  function openAdd() { setForm({ faculty_id: filterFaculty || '', code: '', name: '' }); setModal({ mode: 'add' }); }
  function openEdit(item) { setForm({ faculty_id: item.faculty_id, code: item.code, name: item.name }); setModal({ mode: 'edit', item }); }

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    try {
      if (modal.mode === 'add') await api.post('/academic/departments', form);
      else await api.put(`/academic/departments/${modal.item.id}`, form);
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
        icon={Layers}
        title="Departments"
        subtitle={`${data.length} departments`}
        actions={
          <button onClick={openAdd} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white text-xs font-semibold rounded-lg transition-colors">
            <Plus size={13} /> Add Department
          </button>
        }
      />

      <div className="mb-4 flex gap-2">
        <select
          value={filterFaculty}
          onChange={e => setFilterFaculty(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-300"
        >
          <option value="">All Faculties</option>
          {faculties.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
        </select>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {loading ? <Spinner /> : (
          <table className="w-full">
            <thead>
              <DarkTH cols={[
                { label: 'Code', cls: 'w-24' },
                { label: 'Department' },
                { label: 'Faculty' },
                { label: 'HoD' },
                { label: '', cls: 'w-16' },
              ]} />
            </thead>
            <tbody className="divide-y divide-gray-50">
              {data.map((d, i) => (
                <tr key={d.id} className={i % 2 === 1 ? 'bg-gray-50/40' : ''}>
                  <td className={`${tdCls} font-mono text-xs font-semibold text-blue-700`}>{d.code}</td>
                  <td className={tdCls}>{d.name}</td>
                  <td className={`${tdCls} text-gray-500`}>{d.faculty_name}</td>
                  <td className={tdCls}>{d.hod_name || <span className="text-gray-400 italic">Unassigned</span>}</td>
                  <td className={`${tdCls} text-right`}>
                    <button onClick={() => openEdit(d)} className="text-gray-400 hover:text-slate-700 transition-colors">
                      <Pencil size={14} />
                    </button>
                  </td>
                </tr>
              ))}
              {data.length === 0 && (
                <tr><td colSpan={5} className="px-4 py-10 text-center text-sm text-gray-400">No departments found</td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {modal && (
        <Modal title={modal.mode === 'add' ? 'Add Department' : 'Edit Department'} onClose={() => setModal(null)}>
          <form onSubmit={handleSave} className="space-y-4">
            <div>
              <label className={labelCls}>Faculty</label>
              <select className={inputCls} value={form.faculty_id} onChange={e => setForm(f => ({ ...f, faculty_id: e.target.value }))} required>
                <option value="">Select faculty</option>
                {faculties.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>Department Code</label>
              <input className={inputCls} value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value }))} placeholder="e.g. CS" required disabled={modal.mode === 'edit'} />
            </div>
            <div>
              <label className={labelCls}>Department Name</label>
              <input className={inputCls} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Department of Computer Science" required />
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
