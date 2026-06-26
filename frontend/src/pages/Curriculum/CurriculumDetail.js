import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useHistory } from 'react-router-dom';
import { ArrowLeft, Plus, Pencil, Trash2, ChevronRight, ChevronDown, BookOpen, GraduationCap, Layers } from 'lucide-react';
import api from '../../services/api';
import Spinner from '../../components/Spinner';
import Modal from '../../components/Modal';

const inputCls = 'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-300';
const labelCls = 'block text-xs font-medium text-gray-600 mb-1';

const UNIT_TYPES = ['core', 'elective', 'foundation', 'recess'];
const TYPE_BADGE = {
  core:       'bg-indigo-100 text-indigo-700',
  elective:   'bg-amber-100 text-amber-700',
  foundation: 'bg-emerald-100 text-emerald-700',
  recess:     'bg-gray-100 text-gray-500',
};
const TYPE_DOT = {
  core:       'bg-indigo-500',
  elective:   'bg-amber-500',
  foundation: 'bg-emerald-500',
  recess:     'bg-gray-400',
};

const EMPTY_UNIT = {
  code: '', name: '', abbreviation: '', unit_type: 'core',
  credit_units: 3, year_of_study: 1, semester: 1,
  exam_max: 70, exam_pass: 35, coursework_max: 30, coursework_pass: 15,
};

export default function CurriculumDetail() {
  const { id } = useParams();
  const history = useHistory();

  const [curriculum, setCurriculum] = useState(null);
  const [units, setUnits]           = useState([]);
  const [loading, setLoading]       = useState(true);
  const [modal, setModal]           = useState(null); // {mode:'add'|'edit', item?}
  const [form, setForm]             = useState(EMPTY_UNIT);
  const [saving, setSaving]         = useState(false);
  const [collapsed, setCollapsed]   = useState({});
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [filterYear, setFilterYear] = useState('');
  const [filterSem, setFilterSem]   = useState('');

  const load = useCallback(async () => {
    const [curr, uns] = await Promise.all([
      api.get(`/curriculum/curricula/${id}`),
      api.get(`/curriculum/curricula/${id}/units`),
    ]);
    setCurriculum(curr.data);
    setUnits(uns.data);
    setLoading(false);
  }, [id]);

  useEffect(() => { load(); }, [load]);

  function setField(k, v) { setForm(f => ({ ...f, [k]: v })); }
  function toggleYear(key) { setCollapsed(c => ({ ...c, [key]: !c[key] })); }

  function openAdd() {
    setForm({ ...EMPTY_UNIT, year_of_study: filterYear || 1, semester: filterSem || 1 });
    setModal({ mode: 'add' });
  }
  function openEdit(u) {
    setForm({
      code: u.code, name: u.name, abbreviation: u.abbreviation || '',
      unit_type: u.unit_type, credit_units: u.credit_units,
      year_of_study: u.year_of_study, semester: u.semester,
      exam_max: u.exam_max, exam_pass: u.exam_pass,
      coursework_max: u.coursework_max, coursework_pass: u.coursework_pass,
    });
    setModal({ mode: 'edit', item: u });
  }

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    try {
      if (modal.mode === 'add') {
        await api.post(`/curriculum/curricula/${id}/units`, form);
      } else {
        await api.put(`/curriculum/curricula/${id}/units/${modal.item.id}`, form);
      }
      setModal(null);
      load();
    } catch (err) {
      alert(err.response?.data?.error || 'Save failed');
    } finally { setSaving(false); }
  }

  async function handleDelete(unitId) {
    await api.delete(`/curriculum/curricula/${id}/units/${unitId}`);
    setConfirmDelete(null);
    load();
  }

  // Filter + group
  const filtered = units.filter(u =>
    (!filterYear || String(u.year_of_study) === String(filterYear)) &&
    (!filterSem  || String(u.semester) === String(filterSem))
  );

  const grouped = filtered.reduce((acc, u) => {
    const y = u.year_of_study;
    const s = u.semester;
    if (!acc[y]) acc[y] = {};
    if (!acc[y][s]) acc[y][s] = [];
    acc[y][s].push(u);
    return acc;
  }, {});

  // Stats
  const stats = {
    core:       units.filter(u => u.unit_type === 'core').length,
    elective:   units.filter(u => u.unit_type === 'elective').length,
    foundation: units.filter(u => u.unit_type === 'foundation').length,
    recess:     units.filter(u => u.unit_type === 'recess').length,
    total:      units.length,
    totalCU:    units.reduce((s, u) => s + (u.credit_units || 0), 0),
  };

  const years = [...new Set(units.map(u => u.year_of_study))].sort((a, b) => a - b);

  if (loading) return <div className="py-24 flex justify-center"><Spinner /></div>;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-gradient-to-br from-slate-900 via-blue-950 to-slate-800 rounded-2xl shadow-xl p-5">
        <button onClick={() => history.push('/curriculum/programmes')} className="inline-flex items-center gap-1.5 text-xs text-slate-300 hover:text-white mb-3 transition-colors">
          <ArrowLeft size={13} /> Back to Curricula
        </button>
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <BookOpen size={16} className="text-blue-300" />
              <span className="text-xs text-slate-400 font-medium">{curriculum?.programme_name} · {curriculum?.programme_code}</span>
            </div>
            <h1 className="text-xl font-bold text-white">{curriculum?.name}</h1>
            {curriculum?.code && <p className="text-xs text-slate-400 font-mono mt-0.5">{curriculum.code}</p>}
          </div>
          <div className="flex items-center gap-2">
            <button onClick={openAdd} className="inline-flex items-center gap-1.5 px-3 py-2 bg-white/10 hover:bg-white/20 text-white text-xs font-semibold rounded-xl transition-colors">
              <Plus size={13} /> Add Course Unit
            </button>
          </div>
        </div>

        {/* Stats bar */}
        <div className="mt-4 flex flex-wrap gap-4 pt-4 border-t border-white/10">
          {[
            { label: 'Cores',       val: stats.core,       color: 'text-indigo-300' },
            { label: 'Electives',   val: stats.elective,   color: 'text-amber-300' },
            { label: 'Foundations', val: stats.foundation, color: 'text-emerald-300' },
            { label: 'Recess',      val: stats.recess,     color: 'text-gray-400' },
            { label: 'Total',       val: stats.total,      color: 'text-white' },
            { label: 'Total CU',    val: stats.totalCU,    color: 'text-blue-300' },
          ].map(({ label, val, color }) => (
            <div key={label}>
              <span className={`text-lg font-bold ${color}`}>{val}</span>
              <span className="text-xs text-slate-400 ml-1">{label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-gray-500 font-medium">Year:</span>
          <div className="flex gap-1">
            <button onClick={() => setFilterYear('')} className={`px-2.5 py-1 text-xs rounded-lg font-medium transition-colors ${!filterYear ? 'bg-slate-800 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>All</button>
            {years.map(y => (
              <button key={y} onClick={() => setFilterYear(String(y))} className={`px-2.5 py-1 text-xs rounded-lg font-medium transition-colors ${filterYear === String(y) ? 'bg-slate-800 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                {y}
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-gray-500 font-medium">Semester:</span>
          <div className="flex gap-1">
            <button onClick={() => setFilterSem('')} className={`px-2.5 py-1 text-xs rounded-lg font-medium transition-colors ${!filterSem ? 'bg-slate-800 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>All</button>
            {[1, 2, 3].map(s => (
              <button key={s} onClick={() => setFilterSem(String(s))} className={`px-2.5 py-1 text-xs rounded-lg font-medium transition-colors ${filterSem === String(s) ? 'bg-slate-800 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                {s}
              </button>
            ))}
          </div>
        </div>
        <div className="ml-auto text-xs text-gray-400">{filtered.length} unit{filtered.length !== 1 ? 's' : ''} shown</div>
      </div>

      {/* Hierarchical table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {filtered.length === 0 ? (
          <div className="py-16 text-center">
            <Layers size={32} className="mx-auto text-gray-200 mb-3" />
            <p className="text-sm text-gray-400">No course units yet</p>
            <button onClick={openAdd} className="mt-3 inline-flex items-center gap-1.5 px-4 py-2 bg-slate-800 text-white text-xs font-semibold rounded-xl hover:bg-slate-700">
              <Plus size={12} /> Add First Unit
            </button>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="bg-gradient-to-r from-slate-800 to-slate-700 text-white text-xs font-semibold">
                <th className="px-4 py-3 text-left w-32">Code</th>
                <th className="px-4 py-3 text-left">Name</th>
                <th className="px-4 py-3 text-left w-24">Abbrev.</th>
                <th className="px-4 py-3 text-left w-28">Type</th>
                <th className="px-4 py-3 text-center w-16">CU</th>
                <th className="px-4 py-3 text-center w-20">Exam</th>
                <th className="px-4 py-3 text-center w-24">Course Work</th>
                <th className="px-4 py-3 w-20"></th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(grouped).sort(([a], [b]) => a - b).map(([year, sems]) => {
                const yearKey = `y${year}`;
                const yearUnits = Object.values(sems).flat();
                const isCollapsed = collapsed[yearKey];
                return (
                  <React.Fragment key={year}>
                    {/* Year row */}
                    <tr
                      className="bg-slate-50 cursor-pointer hover:bg-slate-100 transition-colors"
                      onClick={() => toggleYear(yearKey)}
                    >
                      <td colSpan={8} className="px-4 py-2.5">
                        <div className="flex items-center gap-2">
                          {isCollapsed ? <ChevronRight size={15} className="text-slate-500" /> : <ChevronDown size={15} className="text-slate-500" />}
                          <span className="text-sm font-bold text-slate-700">Year {year}</span>
                          <span className="text-xs text-slate-400">· {yearUnits.length} unit{yearUnits.length !== 1 ? 's' : ''}</span>
                          <span className="text-xs text-slate-400">· {yearUnits.reduce((s, u) => s + u.credit_units, 0)} CU</span>
                        </div>
                      </td>
                    </tr>

                    {!isCollapsed && Object.entries(sems).sort(([a], [b]) => a - b).map(([sem, semUnits]) => (
                      <React.Fragment key={sem}>
                        {/* Semester row */}
                        <tr className="bg-blue-50/40">
                          <td colSpan={8} className="px-4 py-1.5 pl-10">
                            <div className="flex items-center gap-1.5">
                              <GraduationCap size={11} className="text-blue-400" />
                              <span className="text-xs font-semibold text-blue-600">Semester {sem}</span>
                              <span className="text-xs text-gray-400">({semUnits.length} units · {semUnits.reduce((s, u) => s + u.credit_units, 0)} CU)</span>
                            </div>
                          </td>
                        </tr>

                        {/* Unit rows */}
                        {semUnits.map((u, i) => (
                          <tr key={u.id} className={`border-t border-gray-50 hover:bg-blue-50/20 transition-colors ${i % 2 === 1 ? 'bg-gray-50/30' : ''}`}>
                            <td className="px-4 py-2.5 pl-12">
                              <span className="font-mono text-xs font-bold text-slate-700">{u.code}</span>
                            </td>
                            <td className="px-4 py-2.5 text-sm text-gray-800">{u.name}</td>
                            <td className="px-4 py-2.5 text-xs text-gray-500 font-medium">{u.abbreviation || '—'}</td>
                            <td className="px-4 py-2.5">
                              <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full capitalize ${TYPE_BADGE[u.unit_type] || 'bg-gray-100 text-gray-600'}`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${TYPE_DOT[u.unit_type] || 'bg-gray-400'}`} />
                                {u.unit_type}
                              </span>
                            </td>
                            <td className="px-4 py-2.5 text-center text-sm font-bold text-gray-700">{u.credit_units}</td>
                            <td className="px-4 py-2.5 text-center text-xs text-gray-500">
                              {u.exam_max}/{u.exam_pass}
                            </td>
                            <td className="px-4 py-2.5 text-center text-xs text-gray-500">
                              {u.coursework_max}/{u.coursework_pass}
                            </td>
                            <td className="px-4 py-2.5">
                              <div className="flex items-center justify-end gap-1">
                                <button onClick={() => openEdit(u)} className="p-1.5 text-gray-400 hover:text-slate-700 hover:bg-gray-100 rounded-lg transition-colors">
                                  <Pencil size={12} />
                                </button>
                                <button onClick={() => setConfirmDelete(u)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                                  <Trash2 size={12} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}

                        {/* Semester subtotal */}
                        <tr className="border-t border-gray-100 bg-gray-50/50">
                          <td colSpan={4} className="px-4 py-1.5 pl-12 text-xs text-gray-400">Semester {sem} total</td>
                          <td className="px-4 py-1.5 text-center text-xs font-bold text-gray-600">
                            {semUnits.reduce((s, u) => s + u.credit_units, 0)}
                          </td>
                          <td colSpan={3} />
                        </tr>
                      </React.Fragment>
                    ))}
                  </React.Fragment>
                );
              })}

              {/* Grand total */}
              <tr className="bg-slate-800 text-white">
                <td colSpan={4} className="px-4 py-2.5 text-xs font-bold uppercase tracking-wide">Total</td>
                <td className="px-4 py-2.5 text-center text-sm font-bold">{filtered.reduce((s, u) => s + u.credit_units, 0)}</td>
                <td colSpan={3} />
              </tr>
            </tbody>
          </table>
        )}
      </div>

      {/* Add/Edit Unit Modal */}
      {modal && (
        <Modal title={modal.mode === 'add' ? 'Add Course Unit' : 'Edit Course Unit'} onClose={() => setModal(null)}>
          <form onSubmit={handleSave} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Course Code *</label>
                <input className={inputCls} value={form.code} onChange={e => setField('code', e.target.value)} placeholder="BBAD 1101" required />
              </div>
              <div>
                <label className={labelCls}>Abbreviation</label>
                <input className={inputCls} value={form.abbreviation} onChange={e => setField('abbreviation', e.target.value)} placeholder="FA" />
              </div>
            </div>
            <div>
              <label className={labelCls}>Course Name *</label>
              <input className={inputCls} value={form.name} onChange={e => setField('name', e.target.value)} placeholder="Fundamentals of Accounting" required />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className={labelCls}>Type *</label>
                <select className={inputCls} value={form.unit_type} onChange={e => setField('unit_type', e.target.value)}>
                  {UNIT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className={labelCls}>Year *</label>
                <select className={inputCls} value={form.year_of_study} onChange={e => setField('year_of_study', Number(e.target.value))}>
                  {[1,2,3,4,5,6].map(y => <option key={y} value={y}>Year {y}</option>)}
                </select>
              </div>
              <div>
                <label className={labelCls}>Semester *</label>
                <select className={inputCls} value={form.semester} onChange={e => setField('semester', Number(e.target.value))}>
                  {[1,2,3].map(s => <option key={s} value={s}>Sem {s}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className={labelCls}>Credit Units *</label>
              <input type="number" min={1} max={10} className={inputCls} value={form.credit_units} onChange={e => setField('credit_units', Number(e.target.value))} required />
            </div>
            <div className="border border-gray-100 rounded-xl p-3 space-y-3">
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">Assessment Marks</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Exam Max</label>
                  <input type="number" className={inputCls} value={form.exam_max} onChange={e => setField('exam_max', Number(e.target.value))} />
                </div>
                <div>
                  <label className={labelCls}>Exam Pass</label>
                  <input type="number" className={inputCls} value={form.exam_pass} onChange={e => setField('exam_pass', Number(e.target.value))} />
                </div>
                <div>
                  <label className={labelCls}>Course Work Max</label>
                  <input type="number" className={inputCls} value={form.coursework_max} onChange={e => setField('coursework_max', Number(e.target.value))} />
                </div>
                <div>
                  <label className={labelCls}>Course Work Pass</label>
                  <input type="number" className={inputCls} value={form.coursework_pass} onChange={e => setField('coursework_pass', Number(e.target.value))} />
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <button type="button" onClick={() => setModal(null)} className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50">Cancel</button>
              <button type="submit" disabled={saving} className="px-4 py-2 text-sm font-semibold bg-slate-800 hover:bg-slate-700 text-white rounded-xl disabled:opacity-60">
                {saving ? 'Saving…' : modal.mode === 'add' ? 'Add Unit' : 'Save Changes'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Delete confirm */}
      {confirmDelete && (
        <Modal title="Remove Course Unit" onClose={() => setConfirmDelete(null)}>
          <p className="text-sm text-gray-600 mb-4">Remove <strong>{confirmDelete.code} — {confirmDelete.name}</strong> from this curriculum?</p>
          <div className="flex justify-end gap-2">
            <button onClick={() => setConfirmDelete(null)} className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50">Cancel</button>
            <button onClick={() => handleDelete(confirmDelete.id)} className="px-4 py-2 text-sm font-semibold bg-red-600 hover:bg-red-500 text-white rounded-xl">Remove</button>
          </div>
        </Modal>
      )}
    </div>
  );
}
