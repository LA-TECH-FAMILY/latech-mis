import React, { useEffect, useState, useCallback } from 'react';
import {
  DollarSign, Plus, Trash2, CheckCircle2, Clock, TrendingDown,
  Eye, Edit2, ChevronDown, ChevronRight, X, BadgeCheck,
  AlertCircle, Calendar, Layers, GraduationCap, Globe,
} from 'lucide-react';
import api from '../../services/api';
import PageHeader from '../../components/PageHeader';
import Spinner from '../../components/Spinner';
import Modal from '../../components/Modal';

const inputCls = 'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-300';
const labelCls = 'block text-xs font-medium text-gray-600 mb-1';
function fmt(n) { return Number(n || 0).toLocaleString('en-UG', { minimumFractionDigits: 0 }); }

const STATUS_CFG = {
  draft:    { label: 'Draft',    color: 'bg-gray-100 text-gray-600',    dot: 'bg-gray-400',    icon: Clock },
  approved: { label: 'Approved', color: 'bg-emerald-100 text-emerald-700', dot: 'bg-emerald-500', icon: CheckCircle2 },
  outgoing: { label: 'Outgoing', color: 'bg-amber-100 text-amber-700',  dot: 'bg-amber-500',   icon: TrendingDown },
};

const CATEGORY_CFG = {
  tuition:      { label: 'Tuition',      color: 'bg-blue-100 text-blue-700' },
  medical:      { label: 'Medical',      color: 'bg-rose-100 text-rose-700' },
  registration: { label: 'Registration', color: 'bg-purple-100 text-purple-700' },
  examination:  { label: 'Examination',  color: 'bg-amber-100 text-amber-700' },
  development:  { label: 'Development',  color: 'bg-teal-100 text-teal-700' },
  library:      { label: 'Library',      color: 'bg-indigo-100 text-indigo-700' },
  computing:    { label: 'Computing',    color: 'bg-cyan-100 text-cyan-700' },
  caution:      { label: 'Caution',      color: 'bg-orange-100 text-orange-700' },
  other:        { label: 'Other',        color: 'bg-gray-100 text-gray-600' },
};

const BILLING_PERIOD = {
  per_semester: 'Per Semester',
  per_year:     'Per Year',
  once_off:     'Once Off',
};

const STUDENT_TYPE = {
  all:           'All Students',
  government:    'Government Sponsored',
  private:       'Private',
  international: 'International',
};

function StatusBadge({ status }) {
  const cfg = STATUS_CFG[status] || STATUS_CFG.draft;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${cfg.color}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  );
}

function CategoryBadge({ category }) {
  const cfg = CATEGORY_CFG[category] || CATEGORY_CFG.other;
  return (
    <span className={`inline-block px-2 py-0.5 rounded-full text-[9px] font-bold ${cfg.color}`}>
      {cfg.label}
    </span>
  );
}

// ── Add / Edit Fee Modal ───────────────────────────────────────────────────────
function FeeModal({ initial, feeItems, programmes, academicYearId, onClose, onSaved }) {
  const isEdit = !!initial?.id;
  const [form, setForm] = useState({
    fee_item_id:    initial?.fee_item_id    || '',
    programme_id:   initial?.programme_id   || '',
    year_of_study:  initial?.year_of_study  || '',
    semester:       initial?.semester       || '',
    amount:         initial?.amount         || '',
    student_type:   initial?.student_type   || 'all',
    billing_period: initial?.billing_period || 'per_semester',
    status:         initial?.status         || 'draft',
    notes:          initial?.notes          || '',
  });
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const selectedItem = feeItems.find(fi => fi.id === form.fee_item_id);

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = { ...form, academic_year_id: academicYearId };
      if (isEdit) await api.put(`/finance/fee-structures/${initial.id}`, payload);
      else await api.post('/finance/fee-structures', payload);
      onSaved();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to save');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/55 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-800 to-slate-700 p-5 rounded-t-2xl flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-white/15 rounded-xl p-2">
              <DollarSign size={18} className="text-white" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">{isEdit ? 'Edit Fee Line' : 'Add Fee Line'}</h2>
              <p className="text-xs text-white/60 mt-0.5">Define a fee line for this academic year</p>
            </div>
          </div>
          <button onClick={onClose} className="text-white/60 hover:text-white p-1 rounded-lg hover:bg-white/10">
            <X size={17} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Fee Item */}
          <div>
            <label className={labelCls}>Fee Item *</label>
            <select className={inputCls} value={form.fee_item_id} onChange={e => set('fee_item_id', e.target.value)} required>
              <option value="">— Select a fee item —</option>
              {Object.keys(CATEGORY_CFG).map(cat => {
                const items = feeItems.filter(fi => fi.is_active && fi.category === cat);
                if (!items.length) return null;
                return (
                  <optgroup key={cat} label={CATEGORY_CFG[cat]?.label || cat}>
                    {items.map(fi => <option key={fi.id} value={fi.id}>{fi.name}</option>)}
                  </optgroup>
                );
              })}
            </select>
            {selectedItem && (
              <p className="text-[10px] text-gray-400 mt-1">
                <CategoryBadge category={selectedItem.category} /> · Default: {BILLING_PERIOD[selectedItem.billing_period] || selectedItem.billing_period}
              </p>
            )}
          </div>

          {/* Scope */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className={labelCls}>Programme</label>
              <select className={inputCls} value={form.programme_id} onChange={e => set('programme_id', e.target.value)}>
                <option value="">All Programmes</option>
                {programmes.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>Year of Study</label>
              <select className={inputCls} value={form.year_of_study} onChange={e => set('year_of_study', e.target.value)}>
                <option value="">All Years</option>
                {[1,2,3,4,5,6].map(n => <option key={n} value={n}>Year {n}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>Semester</label>
              <select className={inputCls} value={form.semester} onChange={e => set('semester', e.target.value)}>
                <option value="">All Semesters</option>
                <option value="1">Semester 1</option>
                <option value="2">Semester 2</option>
                <option value="3">Semester 3</option>
              </select>
            </div>
          </div>

          {/* Amount + Student Type */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Amount (UGX) *</label>
              <input type="number" min="0" step="1000" className={inputCls}
                value={form.amount} onChange={e => set('amount', e.target.value)} required
                placeholder="e.g. 80000" />
            </div>
            <div>
              <label className={labelCls}>Student Type</label>
              <select className={inputCls} value={form.student_type} onChange={e => set('student_type', e.target.value)}>
                {Object.entries(STUDENT_TYPE).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </div>
          </div>

          {/* Billing Period + Status */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Billing Period</label>
              <select className={inputCls} value={form.billing_period} onChange={e => set('billing_period', e.target.value)}>
                {Object.entries(BILLING_PERIOD).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>Status</label>
              <select className={inputCls} value={form.status} onChange={e => set('status', e.target.value)}>
                <option value="draft">Draft</option>
                {isEdit && <option value="outgoing">Outgoing</option>}
              </select>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className={labelCls}>Notes</label>
            <textarea className={`${inputCls} resize-none`} rows={2}
              value={form.notes} onChange={e => set('notes', e.target.value)}
              placeholder="Any special conditions or notes for this fee line…" />
          </div>

          <div className="flex justify-end gap-2 pt-1 border-t border-gray-100">
            <button type="button" onClick={onClose}
              className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50">Cancel</button>
            <button type="submit" disabled={saving}
              className="px-5 py-2 text-sm font-semibold bg-slate-800 hover:bg-slate-700 text-white rounded-xl disabled:opacity-60">
              {saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Add Fee Line'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── New Fee Item Modal ─────────────────────────────────────────────────────────
function FeeItemModal({ onClose, onSaved }) {
  const [form, setForm] = useState({ name: '', description: '', category: 'other', billing_period: 'per_semester' });
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post('/finance/fee-items', form);
      onSaved();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed');
    } finally { setSaving(false); }
  }

  return (
    <Modal title="New Fee Item" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label className={labelCls}>Name *</label>
          <input className={inputCls} value={form.name} onChange={e => set('name', e.target.value)} required placeholder="e.g. Medical Fee" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>Category</label>
            <select className={inputCls} value={form.category} onChange={e => set('category', e.target.value)}>
              {Object.entries(CATEGORY_CFG).map(([v, c]) => <option key={v} value={v}>{c.label}</option>)}
            </select>
          </div>
          <div>
            <label className={labelCls}>Default Billing</label>
            <select className={inputCls} value={form.billing_period} onChange={e => set('billing_period', e.target.value)}>
              {Object.entries(BILLING_PERIOD).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </div>
        </div>
        <div>
          <label className={labelCls}>Description</label>
          <input className={inputCls} value={form.description} onChange={e => set('description', e.target.value)} placeholder="Optional" />
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50">Cancel</button>
          <button type="submit" disabled={saving} className="px-4 py-2 text-sm font-semibold bg-slate-800 hover:bg-slate-700 text-white rounded-xl disabled:opacity-60">
            {saving ? 'Creating…' : 'Create Item'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

// ── Detail Drawer ──────────────────────────────────────────────────────────────
function DetailDrawer({ row, onClose, onApprove, onDecline, onEdit, onDelete }) {
  const cfg = STATUS_CFG[row.status] || STATUS_CFG.draft;
  const Icon = cfg.icon;
  const catCfg = CATEGORY_CFG[row.category] || CATEGORY_CFG.other;

  return (
    <div className="fixed inset-0 bg-black/55 backdrop-blur-md z-50 flex items-end sm:items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-800 to-slate-700 p-5 rounded-t-2xl">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <CategoryBadge category={row.category} />
                <StatusBadge status={row.status} />
              </div>
              <h2 className="text-lg font-bold text-white">{row.fee_item_name}</h2>
              {row.fee_item_description && (
                <p className="text-xs text-white/50 mt-0.5">{row.fee_item_description}</p>
              )}
            </div>
            <button onClick={onClose} className="text-white/60 hover:text-white p-1 rounded-lg hover:bg-white/10">
              <X size={17} />
            </button>
          </div>
        </div>

        <div className="p-5 space-y-4">
          {/* Amount highlight */}
          <div className="bg-gradient-to-br from-slate-900 via-blue-950 to-slate-800 rounded-2xl p-4 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold text-blue-300/70 uppercase tracking-widest">Fee Amount</p>
              <p className="text-3xl font-black text-white mt-1">UGX {fmt(row.amount)}</p>
              <p className="text-xs text-blue-300/60 mt-1">{BILLING_PERIOD[row.billing_period] || row.billing_period}</p>
            </div>
            <div className={`p-3 rounded-2xl ${catCfg.color}`}>
              <Icon size={24} />
            </div>
          </div>

          {/* Details grid */}
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'Programme Scope', value: row.programme_name || 'All Programmes' },
              { label: 'Student Type',    value: STUDENT_TYPE[row.student_type] || row.student_type },
              { label: 'Year of Study',   value: row.year_of_study ? `Year ${row.year_of_study}` : 'All Years' },
              { label: 'Semester',        value: row.semester ? `Semester ${row.semester}` : 'All Semesters' },
              { label: 'Academic Year',   value: row.academic_year_label },
              { label: 'Created By',      value: row.created_by_name || '—' },
              row.approved_by_name && { label: 'Approved By', value: row.approved_by_name },
              row.approved_at && { label: 'Approved At', value: new Date(row.approved_at).toLocaleDateString() },
            ].filter(Boolean).map(({ label, value }) => (
              <div key={label} className="bg-gray-50 rounded-xl p-3">
                <p className="text-[10px] text-gray-400 uppercase tracking-wide">{label}</p>
                <p className="text-sm font-semibold text-gray-800 mt-0.5">{value}</p>
              </div>
            ))}
          </div>

          {row.notes && (
            <div className="flex items-start gap-2 p-3 bg-blue-50 border border-blue-100 rounded-xl text-xs text-blue-800">
              <AlertCircle size={13} className="flex-shrink-0 mt-0.5 text-blue-500" />
              <span>{row.notes}</span>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex flex-wrap gap-2 pt-1 border-t border-gray-100">
            {row.status === 'draft' && (
              <button onClick={() => onApprove(row)}
                className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2 text-sm font-semibold bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl">
                <BadgeCheck size={15} /> Approve
              </button>
            )}
            {row.status === 'approved' && (
              <button onClick={() => onDecline(row)}
                className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2 text-sm font-semibold bg-amber-500 hover:bg-amber-400 text-white rounded-xl">
                <TrendingDown size={15} /> Set Outgoing
              </button>
            )}
            {row.status !== 'approved' && (
              <button onClick={() => { onClose(); onEdit(row); }}
                className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold border border-gray-200 rounded-xl hover:bg-gray-50 text-gray-700">
                <Edit2 size={14} /> Edit
              </button>
            )}
            {row.status !== 'approved' && (
              <button onClick={() => onDelete(row)}
                className="flex items-center gap-1.5 px-3 py-2 text-sm text-red-500 border border-red-200 rounded-xl hover:bg-red-50">
                <Trash2 size={14} /> Delete
              </button>
            )}
            <button onClick={onClose} className="px-4 py-2 text-sm text-gray-500 border border-gray-200 rounded-xl hover:bg-gray-50">
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

const TUITION_STATUS_CFG = {
  current:  { label: 'Current',  color: 'bg-emerald-100 text-emerald-700', dot: 'bg-emerald-500' },
  outgoing: { label: 'Outgoing', color: 'bg-amber-100 text-amber-700',    dot: 'bg-amber-500' },
  deactive: { label: 'Deactive', color: 'bg-red-100 text-red-600',        dot: 'bg-red-400' },
};

const STUDY_TIME_LABELS = { day: 'Day', evening: 'Evening', modular: 'Modular', weekend: 'Weekend', distance: 'Distance Learning' };

function TuitionStatusBadge({ status }) {
  const cfg = TUITION_STATUS_CFG[status] || TUITION_STATUS_CFG.current;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${cfg.color}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  );
}

// ── Tuition Modal ──────────────────────────────────────────────────────────────
function TuitionModal({ initial, programmes, academicYearId, onClose, onSaved }) {
  const isEdit = !!initial?.id;
  const [form, setForm] = useState({
    programme_id:         initial?.programme_id         || '',
    national_amount:      initial?.national_amount      || '',
    international_amount: initial?.international_amount || '',
    study_time:           initial?.study_time           || 'day',
    status:               initial?.status               || 'current',
    notes:                initial?.notes                || '',
  });
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const selectedProg = programmes.find(p => p.id === form.programme_id);

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = { ...form, academic_year_id: academicYearId };
      if (isEdit) await api.put(`/finance/tuition-fees/${initial.id}`, payload);
      else await api.post('/finance/tuition-fees', payload);
      onSaved();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to save');
    } finally { setSaving(false); }
  }

  return (
    <div className="fixed inset-0 bg-black/55 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto">
        <div className="bg-gradient-to-r from-blue-800 to-blue-700 p-5 rounded-t-2xl flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-white/15 rounded-xl p-2">
              <GraduationCap size={18} className="text-white" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">{isEdit ? 'Edit Tuition Fee' : 'Set Tuition Fee'}</h2>
              <p className="text-xs text-white/60 mt-0.5">Programme tuition — national & international rates</p>
            </div>
          </div>
          <button onClick={onClose} className="text-white/60 hover:text-white p-1 rounded-lg hover:bg-white/10">
            <X size={17} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Programme */}
          <div>
            <label className={labelCls}>Programme *</label>
            <select className={inputCls} value={form.programme_id} onChange={e => set('programme_id', e.target.value)} required disabled={isEdit}>
              <option value="">— Select Programme —</option>
              {programmes.map(p => <option key={p.id} value={p.id}>{p.name} ({p.code})</option>)}
            </select>
            {selectedProg && (
              <p className="text-[10px] text-gray-400 mt-1 capitalize">
                {selectedProg.level} · {selectedProg.duration_years} yr(s) · {selectedProg.study_mode || 'Day'}
              </p>
            )}
          </div>

          {/* Study Time */}
          <div>
            <label className={labelCls}>Study Time</label>
            <div className="grid grid-cols-3 gap-2">
              {Object.entries(STUDY_TIME_LABELS).map(([v, l]) => (
                <button key={v} type="button"
                  onClick={() => set('study_time', v)}
                  className={`py-2 rounded-xl text-xs font-semibold border-2 transition-all ${
                    form.study_time === v ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 text-gray-500 hover:border-blue-200'
                  }`}>
                  {l}
                </button>
              ))}
            </div>
          </div>

          {/* Amounts */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>National Fees (UGX) *</label>
              <input type="number" min="0" step="1000" className={inputCls}
                value={form.national_amount} onChange={e => set('national_amount', e.target.value)} required
                placeholder="e.g. 1500000" />
            </div>
            <div>
              <label className={labelCls}>International Fees (UGX) *</label>
              <div className="relative">
                <Globe size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                <input type="number" min="0" step="1000" className={`${inputCls} pl-8`}
                  value={form.international_amount} onChange={e => set('international_amount', e.target.value)} required
                  placeholder="e.g. 2500000" />
              </div>
            </div>
          </div>

          {/* Preview */}
          {(form.national_amount || form.international_amount) && (
            <div className="bg-gradient-to-br from-slate-900 via-blue-950 to-slate-800 rounded-xl p-4">
              <p className="text-[10px] font-bold text-blue-300/70 uppercase tracking-widest mb-3">Fee Preview</p>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-[10px] text-blue-300/60">National (UGX)</p>
                  <p className="text-xl font-black text-white">{fmt(form.national_amount)}</p>
                </div>
                <div>
                  <p className="text-[10px] text-blue-300/60">International (UGX)</p>
                  <p className="text-xl font-black text-white">{fmt(form.international_amount)}</p>
                </div>
              </div>
            </div>
          )}

          {/* Status + Notes */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Status</label>
              <select className={inputCls} value={form.status} onChange={e => set('status', e.target.value)}>
                <option value="current">Current</option>
                <option value="outgoing">Outgoing</option>
                <option value="deactive">Deactive</option>
              </select>
            </div>
            <div>
              <label className={labelCls}>Notes</label>
              <input className={inputCls} value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="Optional" />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-1 border-t border-gray-100">
            <button type="button" onClick={onClose}
              className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50">Cancel</button>
            <button type="submit" disabled={saving}
              className="px-5 py-2 text-sm font-semibold bg-blue-700 hover:bg-blue-600 text-white rounded-xl disabled:opacity-60">
              {saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Set Tuition'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Tuition Fees Tab ───────────────────────────────────────────────────────────
function TuitionFeesTab({ academicYearId, programmes }) {
  const [tuitions, setTuitions] = useState([]);
  const [loading, setLoading]   = useState(false);
  const [statusFilter, setStatusFilter] = useState('');
  const [addModal, setAddModal] = useState(false);
  const [editRow, setEditRow]   = useState(null);
  const [collapsed, setCollapsed] = useState({});

  const load = useCallback(async () => {
    if (!academicYearId) return;
    setLoading(true);
    const params = new URLSearchParams({ academic_year_id: academicYearId });
    if (statusFilter) params.set('status', statusFilter);
    const r = await api.get(`/finance/tuition-fees?${params}`);
    setTuitions(r.data);
    setLoading(false);
  }, [academicYearId, statusFilter]);

  useEffect(() => { load(); }, [load]);

  async function doDelete(row) {
    if (!window.confirm(`Remove tuition for "${row.programme_name}"?`)) return;
    await api.delete(`/finance/tuition-fees/${row.id}`);
    load();
  }

  function toggleCollapse(key) { setCollapsed(c => ({ ...c, [key]: !c[key] })); }

  // Group by faculty → department
  const grouped = tuitions.reduce((acc, t) => {
    const facKey = t.faculty_name || 'Unassigned Faculty';
    const deptKey = t.department_name || 'Unassigned Department';
    if (!acc[facKey]) acc[facKey] = {};
    if (!acc[facKey][deptKey]) acc[facKey][deptKey] = [];
    acc[facKey][deptKey].push(t);
    return acc;
  }, {});

  const totalConfigured = tuitions.length;
  const totalProgrammes = programmes.length;
  const currentCount = tuitions.filter(t => t.status === 'current').length;

  return (
    <div className="space-y-4">
      {/* Mini stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Configured',    val: totalConfigured, sub: `of ${totalProgrammes} programmes`, color: 'from-blue-700 to-blue-800' },
          { label: 'Current',       val: currentCount,    sub: 'active tuition rates',             color: 'from-emerald-600 to-emerald-700' },
          { label: 'Not Set',       val: Math.max(0, totalProgrammes - totalConfigured), sub: 'programmes missing tuition', color: 'from-amber-600 to-amber-700' },
        ].map(s => (
          <div key={s.label} className={`bg-gradient-to-br ${s.color} rounded-2xl p-4 text-white`}>
            <p className="text-2xl font-black">{s.val}</p>
            <p className="text-xs font-bold opacity-80 mt-0.5">{s.label}</p>
            <p className="text-[10px] opacity-50 mt-0.5">{s.sub}</p>
          </div>
        ))}
      </div>

      {/* Controls */}
      <div className="flex items-center gap-3">
        <select className="border border-gray-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-300"
          value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
          <option value="">All Statuses</option>
          <option value="current">Current</option>
          <option value="outgoing">Outgoing</option>
          <option value="deactive">Deactive</option>
        </select>
        <button onClick={() => setAddModal(true)} disabled={!academicYearId}
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-700 hover:bg-blue-600 text-white text-sm font-semibold rounded-xl disabled:opacity-50 transition-colors">
          <Plus size={14} /> Set Tuition Fee
        </button>
      </div>

      {loading ? <div className="py-16 flex justify-center"><Spinner /></div> : (
        <div className="space-y-4">
          {Object.keys(grouped).length === 0 && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-14 text-center">
              <GraduationCap size={32} className="text-gray-300 mx-auto mb-3" />
              <p className="text-sm font-semibold text-gray-500">No tuition fees configured yet</p>
              <p className="text-xs text-gray-400 mt-1">Click "Set Tuition Fee" to add per-programme tuition rates.</p>
            </div>
          )}

          {Object.entries(grouped).map(([facKey, depts]) => {
            // Count unique programmes across all depts
            const facProgCount = Object.values(depts).reduce((s, rows) => {
              const uniq = new Set(rows.map(r => r.programme_id));
              return s + uniq.size;
            }, 0);
            return (
              <div key={facKey} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                {/* Faculty header */}
                <button onClick={() => toggleCollapse(facKey)}
                  className="w-full flex items-center justify-between px-5 py-3.5 bg-gradient-to-r from-blue-900 to-blue-800 hover:from-blue-800 hover:to-blue-700 transition-colors">
                  <div className="flex items-center gap-2">
                    <GraduationCap size={14} className="text-blue-300" />
                    <span className="text-sm font-bold text-white">{facKey}</span>
                    <span className="text-[10px] font-semibold text-blue-300/60 bg-white/10 px-2 py-0.5 rounded-full">{facProgCount} programmes</span>
                  </div>
                  {collapsed[facKey] ? <ChevronRight size={15} className="text-white/50" /> : <ChevronDown size={15} className="text-white/50" />}
                </button>

                {!collapsed[facKey] && Object.entries(depts).map(([deptKey, rows]) => {
                  // Group by programme — one table row per programme
                  const byProgramme = rows.reduce((acc, row) => {
                    if (!acc[row.programme_id]) acc[row.programme_id] = [];
                    acc[row.programme_id].push(row);
                    return acc;
                  }, {});
                  const progCount = Object.keys(byProgramme).length;

                  return (
                    <div key={deptKey}>
                      {/* Department sub-header */}
                      <button onClick={() => toggleCollapse(`${facKey}__${deptKey}`)}
                        className="w-full flex items-center justify-between px-5 py-2.5 bg-blue-50/60 border-b border-blue-100 hover:bg-blue-100/40 transition-colors">
                        <div className="flex items-center gap-2">
                          {collapsed[`${facKey}__${deptKey}`]
                            ? <ChevronRight size={13} className="text-blue-400" />
                            : <ChevronDown size={13} className="text-blue-400" />}
                          <span className="text-xs font-semibold text-blue-700">{deptKey}</span>
                          <span className="text-[10px] text-blue-500">{progCount} {progCount === 1 ? 'programme' : 'programmes'}</span>
                        </div>
                      </button>

                      {!collapsed[`${facKey}__${deptKey}`] && (
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="bg-gray-50/80 border-b border-gray-100">
                              <th className="text-left px-5 py-2 text-[10px] font-semibold text-gray-500 uppercase tracking-wide">Programme</th>
                              <th className="text-left px-3 py-2 text-[10px] font-semibold text-gray-500 uppercase tracking-wide hidden md:table-cell">Level</th>
                              <th className="text-right px-3 py-2 text-[10px] font-semibold text-gray-500 uppercase tracking-wide">National (UGX)</th>
                              <th className="text-right px-3 py-2 text-[10px] font-semibold text-gray-500 uppercase tracking-wide">International (UGX)</th>
                              <th className="text-center px-3 py-2 text-[10px] font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                              <th className="px-4 py-2 w-20" />
                            </tr>
                          </thead>
                          <tbody>
                            {Object.entries(byProgramme).map(([progId, progRows], i) => {
                              const first = progRows[0];
                              const multiMode = progRows.length > 1;
                              return (
                                <tr key={progId}
                                  className={`border-b border-gray-50 hover:bg-blue-50/20 transition-colors ${i % 2 === 1 ? 'bg-gray-50/30' : ''}`}>
                                  {/* Programme — shown once */}
                                  <td className="px-5 py-3">
                                    <p className="font-semibold text-gray-800">{first.programme_name}</p>
                                    <p className="text-[10px] text-gray-400 font-mono">{first.programme_code}</p>
                                  </td>
                                  {/* Level — shown once */}
                                  <td className="px-3 py-3 hidden md:table-cell">
                                    <span className="text-xs text-gray-600 capitalize font-medium">{first.programme_level}</span>
                                    {first.duration_years && <span className="text-[10px] text-gray-400 block">{first.duration_years} yr(s)</span>}
                                  </td>
                                  {/* National — stacked per study time */}
                                  <td className="px-3 py-3 text-right align-top">
                                    {progRows.map(row => (
                                      <div key={row.id} className={`flex items-center justify-end gap-1.5 ${multiMode ? 'mb-1' : ''}`}>
                                        {multiMode && (
                                          <span className="text-[9px] text-gray-400 capitalize bg-gray-100 px-1.5 py-0.5 rounded-full">
                                            {STUDY_TIME_LABELS[row.study_time] || row.study_time}
                                          </span>
                                        )}
                                        <span className="font-mono font-bold text-gray-800 text-sm">{fmt(row.national_amount)}</span>
                                      </div>
                                    ))}
                                  </td>
                                  {/* International — stacked per study time */}
                                  <td className="px-3 py-3 text-right align-top">
                                    {progRows.map(row => (
                                      <div key={row.id} className={`flex items-center justify-end gap-1 ${multiMode ? 'mb-1' : ''}`}>
                                        {multiMode && (
                                          <span className="text-[9px] text-gray-400 capitalize bg-blue-50 px-1.5 py-0.5 rounded-full">
                                            {STUDY_TIME_LABELS[row.study_time] || row.study_time}
                                          </span>
                                        )}
                                        <Globe size={10} className="text-blue-400 flex-shrink-0" />
                                        <span className="font-mono font-bold text-blue-700 text-sm">{fmt(row.international_amount)}</span>
                                      </div>
                                    ))}
                                  </td>
                                  {/* Status — stacked */}
                                  <td className="px-3 py-3 text-center align-top">
                                    {progRows.map(row => (
                                      <div key={row.id} className={multiMode ? 'mb-1' : ''}>
                                        <TuitionStatusBadge status={row.status} />
                                      </div>
                                    ))}
                                  </td>
                                  {/* Actions — stacked */}
                                  <td className="px-4 py-3 align-top">
                                    {progRows.map(row => (
                                      <div key={row.id} className={`flex items-center gap-1 ${multiMode ? 'mb-1' : ''}`}>
                                        <button onClick={() => setEditRow(row)}
                                          className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors" title={`Edit ${STUDY_TIME_LABELS[row.study_time] || row.study_time}`}>
                                          <Edit2 size={12} />
                                        </button>
                                        <button onClick={() => doDelete(row)}
                                          className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors" title="Delete">
                                          <Trash2 size={12} />
                                        </button>
                                      </div>
                                    ))}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      )}

      {addModal && (
        <TuitionModal programmes={programmes} academicYearId={academicYearId}
          onClose={() => setAddModal(false)}
          onSaved={() => { setAddModal(false); load(); }} />
      )}
      {editRow && (
        <TuitionModal initial={editRow} programmes={programmes} academicYearId={academicYearId}
          onClose={() => setEditRow(null)}
          onSaved={() => { setEditRow(null); load(); }} />
      )}
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────────
export default function FeeStructure() {
  const [tab, setTab]             = useState('other'); // 'other' | 'tuition'
  const [years, setYears]         = useState([]);
  const [programmes, setProgrammes] = useState([]);
  const [feeItems, setFeeItems]   = useState([]);
  const [structures, setStructures] = useState([]);
  const [stats, setStats]         = useState(null);
  const [filter, setFilter]       = useState({ academic_year_id: '', semester: '', status: '' });
  const [loading, setLoading]     = useState(false);
  const [collapsed, setCollapsed] = useState({});

  // Modals
  const [addModal, setAddModal]       = useState(false);
  const [editRow, setEditRow]         = useState(null);
  const [itemModal, setItemModal]     = useState(false);
  const [detailRow, setDetailRow]     = useState(null);

  useEffect(() => {
    Promise.all([
      api.get('/academic/years'),
      api.get('/academic/programmes'),
      api.get('/finance/fee-items'),
    ]).then(([y, p, fi]) => {
      setYears(y.data);
      setProgrammes(p.data);
      setFeeItems(fi.data);
      const cur = y.data.find(yr => yr.is_current);
      if (cur) setFilter(f => ({ ...f, academic_year_id: cur.id }));
    });
  }, []);

  const loadData = useCallback(async () => {
    if (!filter.academic_year_id) return;
    setLoading(true);
    const params = new URLSearchParams({ academic_year_id: filter.academic_year_id });
    if (filter.semester) params.set('semester', filter.semester);
    if (filter.status) params.set('status', filter.status);
    const [structs, statsRes] = await Promise.all([
      api.get(`/finance/fee-structures?${params}`),
      api.get(`/finance/fee-structures/stats?academic_year_id=${filter.academic_year_id}`),
    ]);
    setStructures(structs.data);
    setStats(statsRes.data);
    setLoading(false);
  }, [filter]);

  useEffect(() => { loadData(); }, [loadData]);

  async function doApprove(row) {
    await api.post(`/finance/fee-structures/${row.id}/approve`, { action: 'approve' });
    setDetailRow(null); loadData();
  }
  async function doDecline(row) {
    await api.post(`/finance/fee-structures/${row.id}/approve`, { action: 'outgoing' });
    setDetailRow(null); loadData();
  }
  async function doDelete(row) {
    if (!window.confirm(`Delete "${row.fee_item_name}"? This cannot be undone.`)) return;
    try {
      await api.delete(`/finance/fee-structures/${row.id}`);
      setDetailRow(null); loadData();
    } catch (err) { alert(err.response?.data?.error || 'Failed to delete'); }
  }

  function toggleCollapse(key) {
    setCollapsed(c => ({ ...c, [key]: !c[key] }));
  }

  // Group: semester → category → rows
  const grouped = structures.reduce((acc, s) => {
    const semKey = s.semester ? `Semester ${s.semester}` : 'All Semesters';
    const catKey = s.category || 'other';
    if (!acc[semKey]) acc[semKey] = {};
    if (!acc[semKey][catKey]) acc[semKey][catKey] = [];
    acc[semKey][catKey].push(s);
    return acc;
  }, {});

  const yearLabel = years.find(y => y.id === filter.academic_year_id)?.label || '';

  const STAT_CARDS = [
    { label: 'Total Lines',  key: 'total',    gradient: 'from-slate-700 to-slate-800', icon: Layers },
    { label: 'Approved',     key: 'approved', gradient: 'from-emerald-600 to-emerald-700', icon: CheckCircle2 },
    { label: 'Draft',        key: 'draft',    gradient: 'from-gray-600 to-gray-700', icon: Clock },
    { label: 'Outgoing',     key: 'outgoing', gradient: 'from-amber-500 to-amber-600', icon: TrendingDown },
  ];

  return (
    <div className="space-y-5">
      <PageHeader
        icon={DollarSign}
        title="Fee Structure"
        subtitle={yearLabel ? `${yearLabel} · Fees & Charges` : 'Fees & Charges'}
        actions={
          tab === 'other' ? (
            <div className="flex gap-2">
              <button onClick={() => setItemModal(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white text-xs font-semibold rounded-lg transition-colors">
                <Plus size={12} /> Fee Item
              </button>
              <button onClick={() => setAddModal(true)} disabled={!filter.academic_year_id}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-500 hover:bg-blue-400 text-white text-xs font-semibold rounded-lg disabled:opacity-50 transition-colors">
                <Plus size={12} /> Add Fee Line
              </button>
            </div>
          ) : null
        }
      />

      {/* Tab switcher */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
        {[
          { key: 'other',   label: 'Other Fees',    icon: Layers },
          { key: 'tuition', label: 'Tuition Fees',  icon: GraduationCap },
        ].map(({ key, label, icon: Icon }) => (
          <button key={key} onClick={() => setTab(key)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
              tab === key
                ? 'bg-white text-slate-800 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}>
            <Icon size={14} />
            {label}
          </button>
        ))}
      </div>

      {/* Academic year filter (shared) */}
      <div className="flex flex-wrap gap-3">
        <select className="border border-gray-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-300"
          value={filter.academic_year_id} onChange={e => setFilter(f => ({ ...f, academic_year_id: e.target.value }))}>
          <option value="">Select Academic Year</option>
          {years.map(y => <option key={y.id} value={y.id}>{y.label}{y.is_current ? ' ✓' : ''}</option>)}
        </select>
        {tab === 'other' && <>
          <select className="border border-gray-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-300"
            value={filter.semester} onChange={e => setFilter(f => ({ ...f, semester: e.target.value }))}>
            <option value="">All Semesters</option>
            <option value="1">Semester 1</option>
            <option value="2">Semester 2</option>
            <option value="3">Semester 3</option>
          </select>
          <select className="border border-gray-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-300"
            value={filter.status} onChange={e => setFilter(f => ({ ...f, status: e.target.value }))}>
            <option value="">All Statuses</option>
            <option value="draft">Draft</option>
            <option value="approved">Approved</option>
            <option value="outgoing">Outgoing</option>
          </select>
        </>}
      </div>

      {/* Tuition tab */}
      {tab === 'tuition' && (
        <TuitionFeesTab academicYearId={filter.academic_year_id} programmes={programmes} />
      )}

      {/* Stats bar (other fees only) */}
      {tab === 'other' && <>
      {stats && (
        <div className="bg-gradient-to-br from-slate-900 via-blue-950 to-slate-800 rounded-2xl shadow-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-xs font-semibold text-blue-300/70 uppercase tracking-widest">Fee Structure Overview</p>
              <p className="text-sm font-bold text-white mt-0.5">{yearLabel}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-blue-300/60">Categories</p>
              <p className="text-2xl font-bold text-white">{stats.categories || 0}</p>
            </div>
          </div>
          <div className="grid grid-cols-4 gap-3">
            {STAT_CARDS.map(sc => {
              const Icon = sc.icon;
              return (
                <div key={sc.key} className={`bg-gradient-to-br ${sc.gradient} rounded-xl p-3 text-white`}>
                  <div className="flex items-center justify-between mb-1">
                    <Icon size={14} className="opacity-70" />
                    <span className="text-2xl font-bold">{stats[sc.key] || 0}</span>
                  </div>
                  <p className="text-[10px] font-semibold opacity-70 uppercase tracking-wide">{sc.label}</p>
                </div>
              );
            })}
          </div>
          {(parseInt(stats.sem1_total) > 0 || parseInt(stats.sem2_total) > 0) && (
            <div className="mt-4 grid grid-cols-2 gap-3">
              {[
                { label: 'Sem 1 Approved Total (All Programmes)', val: stats.sem1_total },
                { label: 'Sem 2 Approved Total (All Programmes)', val: stats.sem2_total },
              ].map(s => (
                <div key={s.label} className="bg-white/5 rounded-xl px-4 py-2.5">
                  <p className="text-[10px] text-blue-300/60">{s.label}</p>
                  <p className="text-sm font-bold text-white mt-0.5">UGX {fmt(s.val)}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Fee Lines */}
      {loading ? <div className="py-16 flex justify-center"><Spinner /></div> : (
        <div className="space-y-4">
          {Object.keys(grouped).length === 0 && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-14 text-center">
              <DollarSign size={32} className="text-gray-300 mx-auto mb-3" />
              <p className="text-sm font-semibold text-gray-500">No fee lines for this selection</p>
              <p className="text-xs text-gray-400 mt-1">Click "+ Add Fee Line" to create your first fee entry.</p>
            </div>
          )}

          {Object.entries(grouped).map(([semKey, categories]) => (
            <div key={semKey} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              {/* Semester header */}
              <button
                onClick={() => toggleCollapse(semKey)}
                className="w-full flex items-center justify-between px-5 py-3.5 bg-gradient-to-r from-slate-800 to-slate-700 hover:from-slate-700 hover:to-slate-600 transition-colors">
                <div className="flex items-center gap-2">
                  <Calendar size={14} className="text-blue-300" />
                  <span className="text-sm font-bold text-white">{semKey}</span>
                  <span className="text-[10px] font-semibold text-blue-300/60 bg-white/10 px-2 py-0.5 rounded-full">
                    {Object.values(categories).flat().length} lines
                  </span>
                </div>
                {collapsed[semKey]
                  ? <ChevronRight size={15} className="text-white/50" />
                  : <ChevronDown size={15} className="text-white/50" />
                }
              </button>

              {!collapsed[semKey] && Object.entries(categories).map(([catKey, rows]) => {
                const catCfg = CATEGORY_CFG[catKey] || CATEGORY_CFG.other;
                const groupKey = `${semKey}__${catKey}`;
                const catTotal = rows.reduce((s, r) => s + parseFloat(r.amount || 0), 0);
                return (
                  <div key={groupKey}>
                    {/* Category sub-header */}
                    <button
                      onClick={() => toggleCollapse(groupKey)}
                      className="w-full flex items-center justify-between px-5 py-2.5 bg-gray-50 border-b border-gray-100 hover:bg-blue-50/40 transition-colors">
                      <div className="flex items-center gap-2">
                        {collapsed[groupKey]
                          ? <ChevronRight size={13} className="text-gray-400" />
                          : <ChevronDown size={13} className="text-gray-400" />
                        }
                        <span className={`inline-block px-2 py-0.5 rounded-full text-[9px] font-bold ${catCfg.color}`}>{catCfg.label}</span>
                        <span className="text-xs text-gray-500">{rows.length} {rows.length === 1 ? 'line' : 'lines'}</span>
                      </div>
                      <span className="text-xs font-mono font-semibold text-gray-600">UGX {fmt(catTotal)}</span>
                    </button>

                    {!collapsed[groupKey] && (
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="bg-gray-50/70 border-b border-gray-100">
                            <th className="text-left px-5 py-2 text-[10px] font-semibold text-gray-500 uppercase tracking-wide">Fee Name</th>
                            <th className="text-left px-3 py-2 text-[10px] font-semibold text-gray-500 uppercase tracking-wide hidden md:table-cell">Scope</th>
                            <th className="text-left px-3 py-2 text-[10px] font-semibold text-gray-500 uppercase tracking-wide hidden lg:table-cell">Student Type</th>
                            <th className="text-left px-3 py-2 text-[10px] font-semibold text-gray-500 uppercase tracking-wide hidden lg:table-cell">Billing</th>
                            <th className="text-right px-3 py-2 text-[10px] font-semibold text-gray-500 uppercase tracking-wide">Amount</th>
                            <th className="text-center px-3 py-2 text-[10px] font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                            <th className="px-4 py-2 w-20" />
                          </tr>
                        </thead>
                        <tbody>
                          {rows.map((row, i) => (
                            <tr key={row.id}
                              className={`border-b border-gray-50 hover:bg-blue-50/20 transition-colors cursor-pointer ${i % 2 === 1 ? 'bg-gray-50/30' : ''}`}
                              onClick={() => setDetailRow(row)}>
                              <td className="px-5 py-3">
                                <p className="font-semibold text-gray-800 text-sm">{row.fee_item_name}</p>
                                {row.notes && <p className="text-[10px] text-gray-400 truncate max-w-xs">{row.notes}</p>}
                              </td>
                              <td className="px-3 py-3 text-xs text-gray-500 hidden md:table-cell">
                                <div>
                                  <p>{row.programme_name || 'All Programmes'}</p>
                                  <p className="text-gray-400">{row.year_of_study ? `Yr ${row.year_of_study}` : 'All Yrs'}</p>
                                </div>
                              </td>
                              <td className="px-3 py-3 hidden lg:table-cell">
                                <span className="text-[10px] text-gray-500">{STUDENT_TYPE[row.student_type] || row.student_type}</span>
                              </td>
                              <td className="px-3 py-3 hidden lg:table-cell">
                                <span className="text-[10px] text-gray-500">{BILLING_PERIOD[row.billing_period] || row.billing_period}</span>
                              </td>
                              <td className="px-3 py-3 text-right">
                                <span className="font-mono font-bold text-gray-800 text-sm">UGX {fmt(row.amount)}</span>
                              </td>
                              <td className="px-3 py-3 text-center">
                                <StatusBadge status={row.status} />
                              </td>
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-1.5">
                                  <button onClick={e => { e.stopPropagation(); setDetailRow(row); }}
                                    className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors" title="View details">
                                    <Eye size={13} />
                                  </button>
                                  {row.status !== 'approved' && (
                                    <button onClick={e => { e.stopPropagation(); setEditRow(row); }}
                                      className="p-1.5 rounded-lg text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors" title="Edit">
                                      <Edit2 size={13} />
                                    </button>
                                  )}
                                  {row.status === 'draft' && (
                                    <button onClick={e => { e.stopPropagation(); doDelete(row); }}
                                      className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors" title="Delete">
                                      <Trash2 size={13} />
                                    </button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          ))}
                          {/* Category total row */}
                          <tr className="bg-slate-800 text-white">
                            <td colSpan={4} className="px-5 py-2 text-[10px] font-bold uppercase tracking-wide text-slate-300">
                              {catCfg.label} Subtotal
                            </td>
                            <td className="px-3 py-2 text-right font-mono font-bold text-sm">UGX {fmt(catTotal)}</td>
                            <td colSpan={2} />
                          </tr>
                        </tbody>
                      </table>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      )}

      {/* Add modal */}
      {addModal && (
        <FeeModal
          feeItems={feeItems} programmes={programmes} academicYearId={filter.academic_year_id}
          onClose={() => setAddModal(false)}
          onSaved={() => { setAddModal(false); loadData(); }}
        />
      )}

      {/* Edit modal */}
      {editRow && (
        <FeeModal
          initial={editRow} feeItems={feeItems} programmes={programmes} academicYearId={filter.academic_year_id}
          onClose={() => setEditRow(null)}
          onSaved={() => { setEditRow(null); loadData(); }}
        />
      )}

      {/* New fee item modal */}
      {itemModal && (
        <FeeItemModal
          onClose={() => setItemModal(false)}
          onSaved={() => {
            setItemModal(false);
            api.get('/finance/fee-items').then(r => setFeeItems(r.data));
          }}
        />
      )}

      {/* Detail drawer */}
      {detailRow && (
        <DetailDrawer
          row={detailRow}
          onClose={() => setDetailRow(null)}
          onApprove={doApprove}
          onDecline={doDecline}
          onEdit={row => { setDetailRow(null); setEditRow(row); }}
          onDelete={doDelete}
        />
      )}
      </>}
    </div>
  );
}
