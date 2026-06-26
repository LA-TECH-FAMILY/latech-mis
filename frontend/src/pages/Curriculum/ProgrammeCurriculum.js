import React, { useEffect, useState } from 'react';
import { useHistory } from 'react-router-dom';
import { BookOpen, Plus, Pencil, Copy, ChevronRight, Users, CheckCircle, Clock, BookMarked } from 'lucide-react';
import api from '../../services/api';
import PageHeader from '../../components/PageHeader';
import Spinner from '../../components/Spinner';
import Modal from '../../components/Modal';

const inputCls = 'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-300';
const labelCls = 'block text-xs font-medium text-gray-600 mb-1';

const STAGE_BADGE = {
  draft:    'bg-gray-100 text-gray-600',
  approved: 'bg-green-100 text-green-700',
  archived: 'bg-red-100 text-red-600',
};
const STATUS_BADGE = {
  active:   'bg-blue-100 text-blue-700',
  outgoing: 'bg-amber-100 text-amber-700',
  incoming: 'bg-violet-100 text-violet-700',
};
const EMPTY_FORM = {
  name: '', code: '', stage: 'draft', status: 'active',
  electives_waiver: 'consider', use_course_tracks: false, review_date: '',
};

export default function ProgrammeCurriculum() {
  const history = useHistory();
  const [programmes, setProgs]     = useState([]);
  const [selectedProg, setSelected] = useState(null);
  const [curricula, setCurricula]  = useState([]);
  const [loading, setLoading]      = useState(false);
  const [modal, setModal]          = useState(null); // {mode:'add'|'edit'|'replicate', item?}
  const [form, setForm]            = useState(EMPTY_FORM);
  const [repName, setRepName]      = useState('');
  const [saving, setSaving]        = useState(false);

  useEffect(() => {
    api.get('/academic/programmes').then(r => setProgs(r.data));
  }, []);

  async function loadCurricula(prog) {
    setSelected(prog);
    setLoading(true);
    const { data } = await api.get(`/curriculum/programmes/${prog.id}/curricula`);
    setCurricula(data);
    setLoading(false);
  }

  function setField(k, v) { setForm(f => ({ ...f, [k]: v })); }

  function openAdd() { setForm(EMPTY_FORM); setModal({ mode: 'add' }); }
  function openEdit(c) {
    setForm({
      name: c.name, code: c.code || '', stage: c.stage, status: c.status,
      electives_waiver: c.electives_waiver || 'consider',
      use_course_tracks: c.use_course_tracks || false,
      review_date: c.review_date ? c.review_date.split('T')[0] : '',
    });
    setModal({ mode: 'edit', item: c });
  }
  function openReplicate(c) { setRepName(`${c.name} (Copy)`); setModal({ mode: 'replicate', item: c }); }

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    try {
      if (modal.mode === 'add') {
        await api.post(`/curriculum/programmes/${selectedProg.id}/curricula`, form);
      } else if (modal.mode === 'edit') {
        await api.put(`/curriculum/curricula/${modal.item.id}`, form);
      } else {
        await api.post(`/curriculum/curricula/${modal.item.id}/replicate`, { name: repName });
      }
      setModal(null);
      loadCurricula(selectedProg);
    } catch (err) {
      alert(err.response?.data?.error || 'Save failed');
    } finally { setSaving(false); }
  }

  // Group programmes by faculty
  const byFaculty = programmes.reduce((acc, p) => {
    const f = p.faculty_name || 'Other';
    if (!acc[f]) acc[f] = [];
    acc[f].push(p);
    return acc;
  }, {});

  return (
    <div className="flex gap-5 h-full min-h-[calc(100vh-120px)]">
      {/* Left — programme picker */}
      <div className="w-72 flex-shrink-0 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden self-start sticky top-4">
        <div className="bg-gradient-to-r from-slate-800 to-slate-700 px-4 py-3">
          <p className="text-white text-xs font-bold uppercase tracking-wide">Select Programme</p>
        </div>
        <div className="overflow-y-auto max-h-[calc(100vh-220px)]">
          {Object.entries(byFaculty).map(([fac, progs]) => (
            <div key={fac}>
              <div className="px-3 py-1.5 bg-gray-50 border-b border-gray-100">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider truncate">{fac}</p>
              </div>
              {progs.map(p => (
                <button
                  key={p.id}
                  onClick={() => loadCurricula(p)}
                  className={`w-full text-left px-3 py-2.5 border-b border-gray-50 flex items-center justify-between group transition-colors ${selectedProg?.id === p.id ? 'bg-blue-50 border-l-2 border-l-blue-500' : 'hover:bg-gray-50'}`}
                >
                  <div className="min-w-0">
                    <p className={`text-xs font-semibold truncate ${selectedProg?.id === p.id ? 'text-blue-700' : 'text-gray-700'}`}>{p.name}</p>
                    <p className="text-[10px] text-gray-400 font-mono">{p.code}</p>
                  </div>
                  <ChevronRight size={12} className={`flex-shrink-0 ml-2 ${selectedProg?.id === p.id ? 'text-blue-500' : 'text-gray-300 group-hover:text-gray-400'}`} />
                </button>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* Right — curricula */}
      <div className="flex-1 min-w-0 space-y-4">
        <PageHeader
          icon={BookOpen}
          title={selectedProg ? `${selectedProg.name} — Curricula` : 'Programme Curricula'}
          subtitle={selectedProg ? `${selectedProg.code} · ${curricula.length} curriculum version${curricula.length !== 1 ? 's' : ''}` : 'Select a programme on the left'}
          actions={selectedProg && (
            <button onClick={openAdd} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white text-xs font-semibold rounded-lg transition-colors">
              <Plus size={13} /> Add Curriculum
            </button>
          )}
        />

        {!selectedProg ? (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm py-20 text-center">
            <BookMarked size={36} className="mx-auto text-gray-200 mb-3" />
            <p className="text-sm text-gray-400">Choose a programme on the left to view its curricula</p>
          </div>
        ) : loading ? (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm py-16 flex justify-center"><Spinner /></div>
        ) : (
          <div className="space-y-3">
            {curricula.length === 0 && (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm py-16 text-center">
                <p className="text-sm text-gray-400">No curricula yet for this programme</p>
                <button onClick={openAdd} className="mt-3 inline-flex items-center gap-1.5 px-4 py-2 bg-slate-800 text-white text-xs font-semibold rounded-xl hover:bg-slate-700">
                  <Plus size={12} /> Create First Curriculum
                </button>
              </div>
            )}

            {curricula.map(curr => (
              <div key={curr.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between p-5">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-2">
                      <h3 className="text-base font-bold text-gray-800">{curr.name}</h3>
                      {curr.code && <span className="text-xs font-mono text-gray-400">{curr.code}</span>}
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full capitalize ${STAGE_BADGE[curr.stage] || 'bg-gray-100 text-gray-600'}`}>
                        {curr.stage}
                      </span>
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full capitalize ${STATUS_BADGE[curr.status] || 'bg-gray-100 text-gray-600'}`}>
                        {curr.status}
                      </span>
                    </div>

                    {/* Stats row */}
                    <div className="flex items-center gap-4 text-xs text-gray-500 mb-3">
                      <span className="font-semibold text-indigo-600">{curr.core_count} Core</span>
                      <span className="text-gray-300">·</span>
                      <span className="font-semibold text-amber-600">{curr.elective_count} Elective</span>
                      <span className="text-gray-300">·</span>
                      <span className="font-semibold text-emerald-600">{curr.foundation_count} Foundation</span>
                      <span className="text-gray-300">·</span>
                      <span className="font-bold text-gray-700">{curr.unit_count} Total Units</span>
                    </div>

                    <div className="flex items-center gap-5 text-xs text-gray-500">
                      <span className="flex items-center gap-1"><Users size={11} /> <span>{curr.ongoing_count} Ongoing</span></span>
                      <span className="flex items-center gap-1"><CheckCircle size={11} className="text-green-500" /> <span>{curr.completed_count} Completed</span></span>
                      {curr.electives_waiver && (
                        <span className="flex items-center gap-1"><Clock size={11} /> <span className="capitalize">{curr.electives_waiver} electives</span></span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 ml-4">
                    <button
                      onClick={() => history.push(`/curriculum/curricula/${curr.id}`)}
                      className="px-3 py-1.5 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
                    >
                      Course Units
                    </button>
                    <button onClick={() => openEdit(curr)} className="p-2 text-gray-400 hover:text-slate-700 hover:bg-gray-100 rounded-lg transition-colors" title="Edit">
                      <Pencil size={13} />
                    </button>
                    <button onClick={() => openReplicate(curr)} className="p-2 text-gray-400 hover:text-violet-600 hover:bg-violet-50 rounded-lg transition-colors" title="Replicate">
                      <Copy size={13} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      {modal && modal.mode !== 'replicate' && (
        <Modal title={modal.mode === 'add' ? 'Add Curriculum' : 'Edit Curriculum'} onClose={() => setModal(null)}>
          <form onSubmit={handleSave} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className={labelCls}>Curriculum Name *</label>
                <input className={inputCls} value={form.name} onChange={e => setField('name', e.target.value)} placeholder="e.g. BBA 2024 Curriculum" required />
              </div>
              <div>
                <label className={labelCls}>Code</label>
                <input className={inputCls} value={form.code} onChange={e => setField('code', e.target.value)} placeholder="BBA-2024" />
              </div>
              <div>
                <label className={labelCls}>Stage</label>
                <select className={inputCls} value={form.stage} onChange={e => setField('stage', e.target.value)}>
                  <option value="draft">Draft</option>
                  <option value="approved">Approved</option>
                  <option value="archived">Archived</option>
                </select>
              </div>
              <div>
                <label className={labelCls}>Status</label>
                <select className={inputCls} value={form.status} onChange={e => setField('status', e.target.value)}>
                  <option value="active">Active</option>
                  <option value="incoming">Incoming</option>
                  <option value="outgoing">Outgoing</option>
                </select>
              </div>
              <div>
                <label className={labelCls}>Electives Waiver</label>
                <select className={inputCls} value={form.electives_waiver} onChange={e => setField('electives_waiver', e.target.value)}>
                  <option value="consider">Consider</option>
                  <option value="strict">Strict</option>
                  <option value="none">None</option>
                </select>
              </div>
              <div className="col-span-2">
                <label className={labelCls}>Proposed Review Date</label>
                <input type="date" className={inputCls} value={form.review_date} onChange={e => setField('review_date', e.target.value)} />
              </div>
            </div>
            <label className="flex items-center gap-2.5 p-3 rounded-xl bg-gray-50 border border-gray-100 cursor-pointer hover:bg-gray-100 transition-colors">
              <input type="checkbox" checked={form.use_course_tracks} onChange={e => setField('use_course_tracks', e.target.checked)} className="rounded" />
              <div>
                <p className="text-xs font-semibold text-gray-700">Use course tracks in graduation analysis</p>
                <p className="text-[10px] text-gray-400 mt-0.5">Graduation analysis will use track-based year/semester configurations</p>
              </div>
            </label>
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setModal(null)} className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50">Cancel</button>
              <button type="submit" disabled={saving} className="px-4 py-2 text-sm font-semibold bg-slate-800 hover:bg-slate-700 text-white rounded-xl disabled:opacity-60">
                {saving ? 'Saving…' : modal.mode === 'add' ? 'Create Curriculum' : 'Save Changes'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Replicate Modal */}
      {modal?.mode === 'replicate' && (
        <Modal title="Replicate Curriculum" onClose={() => setModal(null)}>
          <form onSubmit={handleSave} className="space-y-3">
            <p className="text-xs text-gray-500">A copy of <strong>{modal.item.name}</strong> will be created with all its course units. You can then modify it independently.</p>
            <div>
              <label className={labelCls}>New Curriculum Name *</label>
              <input className={inputCls} value={repName} onChange={e => setRepName(e.target.value)} required />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setModal(null)} className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50">Cancel</button>
              <button type="submit" disabled={saving} className="px-4 py-2 text-sm font-semibold bg-violet-700 hover:bg-violet-600 text-white rounded-xl disabled:opacity-60">
                {saving ? 'Replicating…' : 'Replicate'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
