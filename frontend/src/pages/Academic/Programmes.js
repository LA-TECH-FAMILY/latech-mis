import React, { useEffect, useState, useCallback } from 'react';
import { GraduationCap, Plus, Pencil, Search, ChevronRight, ChevronDown, Users, BookOpen, X, Eye } from 'lucide-react';
import api from '../../services/api';
import PageHeader from '../../components/PageHeader';
import Spinner from '../../components/Spinner';
import Modal from '../../components/Modal';

const inputCls = 'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-300';
const labelCls = 'block text-xs font-medium text-gray-600 mb-1';

const LEVELS = ['certificate', 'diploma', 'bachelors', 'postgrad_diploma', 'masters', 'phd'];
const SESSIONS = ['day', 'evening', 'weekend', 'distance'];
const PROG_TYPES = ['taught', 'research', 'professional'];
const STUDY_MODES = ['full_time', 'part_time', 'distance', 'weekend'];

const LEVEL_BADGE = {
  certificate:      'bg-gray-100 text-gray-600',
  diploma:          'bg-blue-100 text-blue-700',
  bachelors:        'bg-indigo-100 text-indigo-700',
  postgrad_diploma: 'bg-purple-100 text-purple-700',
  masters:          'bg-violet-100 text-violet-700',
  phd:              'bg-rose-100 text-rose-700',
};

const LEVEL_STAT_COLOR = {
  phd:              'from-rose-500 to-rose-600',
  masters:          'from-violet-500 to-violet-600',
  postgrad_diploma: 'from-purple-500 to-purple-600',
  bachelors:        'from-indigo-500 to-indigo-600',
  diploma:          'from-blue-500 to-blue-600',
  certificate:      'from-gray-500 to-gray-600',
};

const LEVEL_LABEL = {
  phd: 'PhD', masters: 'Masters', postgrad_diploma: 'PG Diploma',
  bachelors: 'Bachelors', diploma: 'Diploma', certificate: 'Certificate',
};

const EMPTY_FORM = {
  department_id: '', code: '', name: '', abbreviation: '',
  level: 'bachelors', duration_years: 3, study_mode: 'full_time',
  session: 'day', programme_type: 'taught',
};

function StatCard({ level, count, color }) {
  return (
    <div className={`bg-gradient-to-br ${color} rounded-2xl p-4 text-white shadow-md`}>
      <div className="text-2xl font-bold">{count}</div>
      <div className="text-xs font-semibold opacity-80 mt-0.5">{LEVEL_LABEL[level] || level}</div>
    </div>
  );
}

export default function Programmes() {
  const [data, setData]           = useState([]);
  const [stats, setStats]         = useState([]);
  const [departments, setDepts]   = useState([]);
  const [faculties, setFaculties] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [modal, setModal]         = useState(null);   // {mode:'add'|'edit'|'detail', item?}
  const [form, setForm]           = useState(EMPTY_FORM);
  const [saving, setSaving]       = useState(false);
  const [detail, setDetail]       = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // filters
  const [search, setSearch]         = useState('');
  const [filterFaculty, setFilterFaculty] = useState('');
  const [filterLevel, setFilterLevel]     = useState('');
  const [filterSession, setFilterSession] = useState('');
  const [collapsed, setCollapsed]   = useState({});

  async function load() {
    setLoading(true);
    const params = {};
    if (filterFaculty) params.faculty_id = filterFaculty;
    if (filterLevel)   params.level = filterLevel;
    if (filterSession) params.session = filterSession;
    if (search)        params.search = search;

    const [pr, st, de, fa] = await Promise.all([
      api.get('/academic/programmes', { params }),
      api.get('/academic/programmes/stats'),
      api.get('/academic/departments'),
      api.get('/academic/faculties'),
    ]);
    setData(pr.data);
    setStats(st.data);
    setDepts(de.data);
    setFaculties(fa.data);
    setLoading(false);
  }

  useEffect(() => { load(); }, [filterFaculty, filterLevel, filterSession]); // eslint-disable-line

  // debounce search
  useEffect(() => {
    const t = setTimeout(() => load(), 300);
    return () => clearTimeout(t);
  }, [search]); // eslint-disable-line

  // Group: faculty_name → department_name → programmes[]
  const grouped = data.reduce((acc, p) => {
    const fac = p.faculty_name || 'Unknown Faculty';
    const dep = p.department_name || 'Unknown Department';
    if (!acc[fac]) acc[fac] = {};
    if (!acc[fac][dep]) acc[fac][dep] = [];
    acc[fac][dep].push(p);
    return acc;
  }, {});

  function toggleFaculty(fac) {
    setCollapsed(c => ({ ...c, [fac]: !c[fac] }));
  }

  function openAdd() { setForm(EMPTY_FORM); setModal({ mode: 'add' }); }
  function openEdit(p) {
    setForm({
      department_id: p.department_id, code: p.code, name: p.name,
      abbreviation: p.abbreviation || '', level: p.level || 'bachelors',
      duration_years: p.duration_years, study_mode: p.study_mode || 'full_time',
      session: p.session || 'day', programme_type: p.programme_type || 'taught',
    });
    setModal({ mode: 'edit', item: p });
  }

  async function openDetail(p) {
    setModal({ mode: 'detail', item: p });
    setDetailLoading(true);
    const { data: d } = await api.get(`/academic/programmes/${p.id}`);
    setDetail(d);
    setDetailLoading(false);
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
    } finally { setSaving(false); }
  }

  function setField(k, v) { setForm(f => ({ ...f, [k]: v })); }

  const activeFilters = [
    filterFaculty && { key: 'faculty', label: faculties.find(f => f.id === filterFaculty)?.name, clear: () => setFilterFaculty('') },
    filterLevel   && { key: 'level',   label: LEVEL_LABEL[filterLevel] || filterLevel,            clear: () => setFilterLevel('') },
    filterSession && { key: 'session', label: filterSession,                                       clear: () => setFilterSession('') },
  ].filter(Boolean);

  const totalStudents = data.reduce((s, p) => s + (parseInt(p.active_students) || 0), 0);

  return (
    <div className="space-y-5">
      <PageHeader
        icon={GraduationCap}
        title="Programmes"
        subtitle={`${data.length} programmes · ${totalStudents} active students`}
        actions={
          <button onClick={openAdd} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white text-xs font-semibold rounded-lg transition-colors">
            <Plus size={13} /> Add Programme
          </button>
        }
      />

      {/* Stats Bar */}
      {stats.length > 0 && (
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
          {LEVELS.map(lvl => {
            const s = stats.find(x => x.level === lvl);
            if (!s) return null;
            return <StatCard key={lvl} level={lvl} count={s.count} color={LEVEL_STAT_COLOR[lvl] || 'from-gray-500 to-gray-600'} />;
          })}
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
        <div className="flex flex-wrap gap-3 items-end">
          <div className="relative flex-1 min-w-48">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              className="w-full pl-8 pr-3 py-2 border border-gray-200 rounded-lg text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-300 focus:bg-white"
              placeholder="Search programmes…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <div className="min-w-40">
            <label className={labelCls}>Faculty</label>
            <select className={inputCls} value={filterFaculty} onChange={e => setFilterFaculty(e.target.value)}>
              <option value="">All Faculties</option>
              {faculties.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
            </select>
          </div>
          <div className="min-w-36">
            <label className={labelCls}>Level</label>
            <select className={inputCls} value={filterLevel} onChange={e => setFilterLevel(e.target.value)}>
              <option value="">All Levels</option>
              {LEVELS.map(l => <option key={l} value={l}>{LEVEL_LABEL[l] || l}</option>)}
            </select>
          </div>
          <div className="min-w-32">
            <label className={labelCls}>Session</label>
            <select className={inputCls} value={filterSession} onChange={e => setFilterSession(e.target.value)}>
              <option value="">All</option>
              {SESSIONS.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </div>

        {activeFilters.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-3">
            {activeFilters.map(f => (
              <span key={f.key} className="inline-flex items-center gap-1 text-xs bg-blue-50 text-blue-700 border border-blue-200 px-2.5 py-1 rounded-full font-medium">
                {f.label}
                <button onClick={f.clear}><X size={11} /></button>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Hierarchical Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-16 flex justify-center"><Spinner /></div>
        ) : Object.keys(grouped).length === 0 ? (
          <div className="py-16 text-center text-sm text-gray-400">No programmes match your filters</div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="bg-gradient-to-r from-slate-800 to-slate-700 text-white text-xs font-semibold">
                <th className="px-4 py-3 text-left w-32">Code</th>
                <th className="px-4 py-3 text-left w-24">Abbrev.</th>
                <th className="px-4 py-3 text-left">Programme Name</th>
                <th className="px-4 py-3 text-left w-28">Level</th>
                <th className="px-4 py-3 text-center w-20">Duration</th>
                <th className="px-4 py-3 text-center w-20">Session</th>
                <th className="px-4 py-3 text-center w-20">Students</th>
                <th className="px-4 py-3 w-20"></th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(grouped).map(([fac, depts]) => {
                const facStudents = Object.values(depts).flat().reduce((s, p) => s + (parseInt(p.active_students) || 0), 0);
                const facCount    = Object.values(depts).flat().length;
                const isCollapsed = collapsed[fac];
                return (
                  <React.Fragment key={fac}>
                    {/* Faculty Row */}
                    <tr
                      className="bg-slate-50 cursor-pointer hover:bg-slate-100 transition-colors"
                      onClick={() => toggleFaculty(fac)}
                    >
                      <td colSpan={8} className="px-4 py-2.5">
                        <div className="flex items-center gap-2">
                          {isCollapsed ? <ChevronRight size={15} className="text-slate-500" /> : <ChevronDown size={15} className="text-slate-500" />}
                          <span className="text-sm font-bold text-slate-700">{fac}</span>
                          <span className="text-xs text-slate-400 ml-1">· {facCount} programme{facCount !== 1 ? 's' : ''} · {facStudents} students</span>
                        </div>
                      </td>
                    </tr>

                    {!isCollapsed && Object.entries(depts).map(([dep, progs]) => (
                      <React.Fragment key={dep}>
                        {/* Department Row */}
                        <tr className="bg-gray-50/60">
                          <td colSpan={8} className="px-4 py-1.5 pl-10">
                            <div className="flex items-center gap-1.5">
                              <BookOpen size={12} className="text-blue-400" />
                              <span className="text-xs font-semibold text-blue-700 uppercase tracking-wide">{dep}</span>
                              <span className="text-xs text-gray-400">({progs.length})</span>
                            </div>
                          </td>
                        </tr>

                        {/* Programme Rows */}
                        {progs.map((p, i) => (
                          <tr key={p.id} className={`hover:bg-blue-50/30 transition-colors border-t border-gray-50 ${i % 2 === 1 ? 'bg-gray-50/20' : ''}`}>
                            <td className="px-4 py-2.5 pl-12 font-mono text-xs font-bold text-blue-700">{p.code}</td>
                            <td className="px-4 py-2.5 text-xs text-gray-500 font-medium">{p.abbreviation || '—'}</td>
                            <td className="px-4 py-2.5 text-sm text-gray-800 font-medium">{p.name}</td>
                            <td className="px-4 py-2.5">
                              <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${LEVEL_BADGE[p.level] || 'bg-gray-100 text-gray-600'}`}>
                                {LEVEL_LABEL[p.level] || p.level}
                              </span>
                            </td>
                            <td className="px-4 py-2.5 text-center text-xs text-gray-600">{p.duration_years}yr</td>
                            <td className="px-4 py-2.5 text-center text-xs text-gray-500 capitalize">{p.session || '—'}</td>
                            <td className="px-4 py-2.5 text-center">
                              <span className="inline-flex items-center gap-1 text-xs text-gray-600">
                                <Users size={11} className="text-gray-400" />
                                {p.active_students || 0}
                              </span>
                            </td>
                            <td className="px-4 py-2.5">
                              <div className="flex items-center justify-end gap-1.5">
                                <button onClick={() => openDetail(p)} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="View details">
                                  <Eye size={13} />
                                </button>
                                <button onClick={() => openEdit(p)} className="p-1.5 text-gray-400 hover:text-slate-700 hover:bg-gray-100 rounded-lg transition-colors" title="Edit">
                                  <Pencil size={13} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </React.Fragment>
                    ))}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Add / Edit Modal */}
      {modal && modal.mode !== 'detail' && (
        <Modal title={modal.mode === 'add' ? 'Add Programme' : 'Edit Programme'} onClose={() => setModal(null)}>
          <form onSubmit={handleSave} className="space-y-3">
            <div>
              <label className={labelCls}>Department *</label>
              <select className={inputCls} value={form.department_id} onChange={e => setField('department_id', e.target.value)} required>
                <option value="">Select department</option>
                {departments.map(d => <option key={d.id} value={d.id}>{d.name} — {d.faculty_name}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Programme Code *</label>
                <input className={inputCls} value={form.code} onChange={e => setField('code', e.target.value)} placeholder="BSC-CS" required disabled={modal.mode === 'edit'} />
              </div>
              <div>
                <label className={labelCls}>Abbreviation</label>
                <input className={inputCls} value={form.abbreviation} onChange={e => setField('abbreviation', e.target.value)} placeholder="B.Sc.CS" />
              </div>
            </div>
            <div>
              <label className={labelCls}>Full Programme Name *</label>
              <input className={inputCls} value={form.name} onChange={e => setField('name', e.target.value)} placeholder="Bachelor of Science in Computer Science" required />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Level *</label>
                <select className={inputCls} value={form.level} onChange={e => setField('level', e.target.value)} required>
                  {LEVELS.map(l => <option key={l} value={l}>{LEVEL_LABEL[l] || l}</option>)}
                </select>
              </div>
              <div>
                <label className={labelCls}>Duration (years) *</label>
                <input type="number" step="0.5" min="0.5" max="10" className={inputCls} value={form.duration_years} onChange={e => setField('duration_years', e.target.value)} required />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className={labelCls}>Session</label>
                <select className={inputCls} value={form.session} onChange={e => setField('session', e.target.value)}>
                  {SESSIONS.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className={labelCls}>Study Mode</label>
                <select className={inputCls} value={form.study_mode} onChange={e => setField('study_mode', e.target.value)}>
                  {STUDY_MODES.map(m => <option key={m} value={m}>{m.replace(/_/g, ' ')}</option>)}
                </select>
              </div>
              <div>
                <label className={labelCls}>Type</label>
                <select className={inputCls} value={form.programme_type} onChange={e => setField('programme_type', e.target.value)}>
                  {PROG_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setModal(null)} className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50">Cancel</button>
              <button type="submit" disabled={saving} className="px-4 py-2 text-sm font-semibold bg-slate-800 hover:bg-slate-700 text-white rounded-xl disabled:opacity-60">
                {saving ? 'Saving…' : modal.mode === 'add' ? 'Create Programme' : 'Save Changes'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Detail Modal */}
      {modal?.mode === 'detail' && (
        <Modal title="Programme Details" onClose={() => { setModal(null); setDetail(null); }}>
          {detailLoading || !detail ? (
            <div className="py-8 flex justify-center"><Spinner /></div>
          ) : (
            <div className="space-y-4">
              {/* Header */}
              <div className="bg-gradient-to-br from-slate-800 to-slate-700 rounded-xl p-4 text-white">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="text-xs font-mono text-slate-300 mb-1">{detail.code}</div>
                    <div className="text-base font-bold">{detail.name}</div>
                    {detail.abbreviation && <div className="text-xs text-slate-300 mt-0.5">{detail.abbreviation}</div>}
                  </div>
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${LEVEL_BADGE[detail.level] || 'bg-gray-100 text-gray-600'}`}>
                    {LEVEL_LABEL[detail.level] || detail.level}
                  </span>
                </div>
              </div>

              {/* Meta grid */}
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: 'Faculty',    value: detail.faculty_name },
                  { label: 'Department', value: detail.department_name },
                  { label: 'Duration',   value: `${detail.duration_years} year${detail.duration_years !== 1 ? 's' : ''}` },
                  { label: 'Session',    value: detail.session || '—' },
                  { label: 'Study Mode', value: (detail.study_mode || '').replace(/_/g, ' ') },
                  { label: 'Type',       value: detail.programme_type || '—' },
                ].map(({ label, value }) => (
                  <div key={label} className="bg-gray-50 rounded-xl p-3">
                    <div className="text-xs text-gray-400 mb-0.5">{label}</div>
                    <div className="text-sm font-semibold text-gray-700 capitalize">{value}</div>
                  </div>
                ))}
              </div>

              {/* Intakes */}
              {detail.intakes?.length > 0 && (
                <div>
                  <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Intakes ({detail.intakes.length})</h4>
                  <div className="overflow-hidden rounded-xl border border-gray-100">
                    <table className="w-full text-xs">
                      <thead className="bg-slate-700 text-white">
                        <tr>
                          <th className="px-3 py-2 text-left font-semibold">Label</th>
                          <th className="px-3 py-2 text-left font-semibold">Academic Year</th>
                          <th className="px-3 py-2 text-left font-semibold">Month</th>
                          <th className="px-3 py-2 text-right font-semibold">Capacity</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {detail.intakes.map(i => (
                          <tr key={i.id} className="hover:bg-gray-50">
                            <td className="px-3 py-2 font-semibold text-slate-700">{i.intake_label}</td>
                            <td className="px-3 py-2 text-gray-600">{i.academic_year_label}</td>
                            <td className="px-3 py-2 text-gray-500">{i.intake_month}</td>
                            <td className="px-3 py-2 text-right text-gray-500">{i.capacity ?? 'Unlimited'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-1">
                <button onClick={() => { openEdit(modal.item); }} className="px-4 py-2 text-sm font-semibold text-slate-700 border border-gray-200 rounded-xl hover:bg-gray-50">
                  Edit Programme
                </button>
                <button onClick={() => { setModal(null); setDetail(null); }} className="px-4 py-2 text-sm font-semibold bg-slate-800 text-white rounded-xl hover:bg-slate-700">
                  Close
                </button>
              </div>
            </div>
          )}
        </Modal>
      )}
    </div>
  );
}
