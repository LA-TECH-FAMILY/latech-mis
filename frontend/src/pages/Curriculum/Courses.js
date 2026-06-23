import React, { useEffect, useState } from 'react';
import { BookOpen, Plus, Pencil } from 'lucide-react';
import api from '../../services/api';
import PageHeader from '../../components/PageHeader';
import DarkTH from '../../components/DarkTH';
import Spinner from '../../components/Spinner';
import Modal from '../../components/Modal';

const inputCls = 'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-300';
const labelCls = 'block text-xs font-medium text-gray-600 mb-1';
const tdCls = 'px-4 py-2.5 text-sm text-gray-700';
const LEVELS = ['100', '200', '300', '400', '500', '600', '700'];

const EMPTY = { department_id: '', code: '', name: '', credit_units: 3, level: '100' };

export default function Courses() {
  const [data, setData] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [filterDept, setFilterDept] = useState('');
  const [filterLevel, setFilterLevel] = useState('');

  async function load() {
    setLoading(true);
    const params = new URLSearchParams();
    if (filterDept) params.set('department_id', filterDept);
    if (filterLevel) params.set('level', filterLevel);
    const [courses, depts] = await Promise.all([
      api.get(`/curriculum/courses?${params}`),
      api.get('/academic/departments'),
    ]);
    setData(courses.data);
    setDepartments(depts.data);
    setLoading(false);
  }

  useEffect(() => { load(); }, [filterDept, filterLevel]);

  function openAdd() { setForm(EMPTY); setModal({ mode: 'add' }); }
  function openEdit(item) {
    setForm({ department_id: item.department_id, code: item.code, name: item.name, credit_units: item.credit_units, level: item.level });
    setModal({ mode: 'edit', item });
  }

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    try {
      if (modal.mode === 'add') await api.post('/curriculum/courses', form);
      else await api.put(`/curriculum/courses/${modal.item.id}`, form);
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
        icon={BookOpen}
        title="Courses"
        subtitle={`${data.length} courses`}
        actions={
          <button onClick={openAdd} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white text-xs font-semibold rounded-lg transition-colors">
            <Plus size={13} /> Add Course
          </button>
        }
      />

      <div className="flex gap-2 mb-4 flex-wrap">
        <select className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-300" value={filterDept} onChange={e => setFilterDept(e.target.value)}>
          <option value="">All Departments</option>
          {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
        </select>
        <select className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-300" value={filterLevel} onChange={e => setFilterLevel(e.target.value)}>
          <option value="">All Levels</option>
          {LEVELS.map(l => <option key={l} value={l}>Year {l[0]}</option>)}
        </select>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {loading ? <Spinner /> : (
          <table className="w-full">
            <thead>
              <DarkTH cols={[
                { label: 'Code', cls: 'w-28' },
                { label: 'Course Name' },
                { label: 'Department' },
                { label: 'Level', cls: 'w-20 text-center' },
                { label: 'CU', cls: 'w-16 text-center' },
                { label: '', cls: 'w-16' },
              ]} />
            </thead>
            <tbody className="divide-y divide-gray-50">
              {data.map((c, i) => (
                <tr key={c.id} className={i % 2 === 1 ? 'bg-gray-50/40' : ''}>
                  <td className={`${tdCls} font-mono text-xs font-semibold text-blue-700`}>{c.code}</td>
                  <td className={tdCls}>{c.name}</td>
                  <td className={`${tdCls} text-gray-500 text-xs`}>{c.department_name}</td>
                  <td className={`${tdCls} text-center`}>
                    <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700">Yr {c.level[0]}</span>
                  </td>
                  <td className={`${tdCls} text-center font-semibold`}>{c.credit_units}</td>
                  <td className={tdCls}>
                    <button onClick={() => openEdit(c)} className="text-gray-400 hover:text-slate-700 transition-colors"><Pencil size={14} /></button>
                  </td>
                </tr>
              ))}
              {data.length === 0 && (
                <tr><td colSpan={6} className="px-4 py-10 text-center text-sm text-gray-400">No courses found</td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {modal && (
        <Modal title={modal.mode === 'add' ? 'Add Course' : 'Edit Course'} onClose={() => setModal(null)}>
          <form onSubmit={handleSave} className="space-y-4">
            <div>
              <label className={labelCls}>Department</label>
              <select className={inputCls} value={form.department_id} onChange={e => setForm(f => ({ ...f, department_id: e.target.value }))} required>
                <option value="">Select department</option>
                {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Course Code</label>
                <input className={inputCls} value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value }))} placeholder="e.g. CSC1101" required disabled={modal.mode === 'edit'} />
              </div>
              <div>
                <label className={labelCls}>Level</label>
                <select className={inputCls} value={form.level} onChange={e => setForm(f => ({ ...f, level: e.target.value }))} required>
                  {LEVELS.map(l => <option key={l} value={l}>Year {l[0]} (Level {l})</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className={labelCls}>Course Name</label>
              <input className={inputCls} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Introduction to Computer Science" required />
            </div>
            <div>
              <label className={labelCls}>Credit Units</label>
              <input type="number" min="1" max="12" step="0.5" className={inputCls} value={form.credit_units} onChange={e => setForm(f => ({ ...f, credit_units: e.target.value }))} required />
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
