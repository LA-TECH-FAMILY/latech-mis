import React, { useEffect, useState, useRef } from 'react';
import {
  ClipboardCheck, Search, AlertCircle, CheckCircle2, User,
  DollarSign, GraduationCap, Home, ShieldCheck, ChevronRight,
  X, TrendingUp, FileText, BadgeCheck, BookOpen, Layers, Hash,
} from 'lucide-react';
import api from '../../services/api';
import PageHeader from '../../components/PageHeader';
import Spinner from '../../components/Spinner';
import Modal from '../../components/Modal';

const inputCls = 'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-300';
const labelCls = 'block text-xs font-medium text-gray-600 mb-1';

function fmt(n) { return Number(n || 0).toLocaleString('en-UG', { minimumFractionDigits: 0 }); }

const STAGES = [
  { key: 'initiated',             label: 'INITIATED',      color: 'bg-gray-400',   dot: 'bg-gray-400' },
  { key: 'accounts_cleared',      label: 'ACCOUNTS',       color: 'bg-amber-500',  dot: 'bg-amber-500' },
  { key: 'academics_cleared',     label: 'ACADEMICS',      color: 'bg-blue-500',   dot: 'bg-blue-500' },
  { key: 'accommodation_cleared', label: 'ACCOMMODATION',  color: 'bg-purple-500', dot: 'bg-purple-500' },
  { key: 'fully_registered',      label: 'REGISTERED',     color: 'bg-emerald-500',dot: 'bg-emerald-500' },
];

function StageProgress({ status }) {
  const idx = STAGES.findIndex(s => s.key === status);
  return (
    <div className="flex items-center gap-0.5">
      {STAGES.map((s, i) => (
        <div key={s.key} title={s.label}
          className={`h-2 flex-1 rounded-sm ${i <= idx ? s.color : 'bg-gray-200'}`} />
      ))}
    </div>
  );
}

function ClearanceMeter({ pct, hasWaiver }) {
  const p = parseFloat(pct || 0);
  const color = p >= 80 ? 'from-emerald-400 to-emerald-500'
    : p >= 60 ? 'from-amber-400 to-amber-500'
    : 'from-red-400 to-red-500';
  const textColor = p >= 80 ? 'text-emerald-600' : p >= 60 ? 'text-amber-600' : 'text-red-600';
  return (
    <div>
      <div className="flex justify-between items-center mb-2">
        <span className="text-xs text-gray-500 font-medium">Fee Payment Progress</span>
        <div className="flex items-center gap-2">
          {hasWaiver && (
            <span className="text-[10px] font-bold px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full">WAIVER</span>
          )}
          <span className={`text-lg font-bold ${textColor}`}>{p}%</span>
        </div>
      </div>
      <div className="h-4 bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-full bg-gradient-to-r ${color} rounded-full transition-all`}
          style={{ width: `${Math.min(p, 100)}%` }} />
      </div>
      <div className="flex justify-between text-[10px] text-gray-400 mt-1">
        <span>0%</span>
        <span className="text-amber-500 font-semibold">60% min</span>
        <span>100%</span>
      </div>
    </div>
  );
}

// ── Stage modal configs ──────────────────────────────────────────────────────
const STAGE_CONFIG = {
  accounts: {
    label: 'Accounts Clearance',
    icon: DollarSign,
    gradient: 'from-amber-600 to-amber-700',
    btnColor: 'bg-amber-600 hover:bg-amber-500',
    description: 'Verify fee payment and clear the student for academic registration.',
  },
  academics: {
    label: 'Academics Clearance',
    icon: GraduationCap,
    gradient: 'from-blue-600 to-blue-700',
    btnColor: 'bg-blue-600 hover:bg-blue-500',
    description: 'Confirm course enrolment and clear the student for accommodation.',
  },
  accommodation: {
    label: 'Accommodation Clearance',
    icon: Home,
    gradient: 'from-purple-600 to-purple-700',
    btnColor: 'bg-purple-600 hover:bg-purple-500',
    description: 'Confirm residence status and fully register the student.',
  },
};

const UNIT_TYPE_CONFIG = {
  core:        { label: 'Core',        color: 'bg-blue-100 text-blue-700' },
  elective:    { label: 'Elective',    color: 'bg-amber-100 text-amber-700' },
  foundation:  { label: 'Foundation',  color: 'bg-emerald-100 text-emerald-700' },
  recess:      { label: 'Recess',      color: 'bg-purple-100 text-purple-700' },
};

// ── Clearance Modal ──────────────────────────────────────────────────────────
function ClearanceModal({ action, onClose, onSave, saving }) {
  const { reg, type } = action;
  const cfg = STAGE_CONFIG[type];
  const Icon = cfg.icon;
  const pct = parseFloat(reg.live_clearance_pct || 0);
  const needsWaiver = type === 'accounts' && pct < 60 && !reg.financial_waiver;
  const initials = `${reg.first_name?.[0] || ''}${reg.last_name?.[0] || ''}`;

  const [form, setForm] = useState({
    residence_status: reg.residence_status || 'non_resident',
    registration_type: reg.registration_type || 'normal',
    anomaly_comment: reg.anomaly_comment || '',
    waiver_reason: reg.waiver_reason || '',
    grant_waiver: false,
  });
  function setField(k, v) { setForm(f => ({ ...f, [k]: v })); }

  const [passbook, setPassbook] = useState(null);
  const [passbookLoading, setPassbookLoading] = useState(false);

  useEffect(() => {
    if (type !== 'academics') return;
    setPassbookLoading(true);
    api.get(`/registration/${reg.id}/passbook`)
      .then(r => setPassbook(r.data))
      .catch(() => setPassbook(null))
      .finally(() => setPassbookLoading(false));
  }, [reg.id, type]);

  function handleSubmit(e) {
    e.preventDefault();
    if (needsWaiver && !form.grant_waiver) {
      alert('Student clearance is below 60%. You must grant a waiver or wait for payment.');
      return;
    }
    if (form.grant_waiver && !form.waiver_reason.trim()) {
      alert('Please provide a reason for the waiver.');
      return;
    }
    onSave(form);
  }

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className={`bg-white rounded-2xl shadow-2xl w-full ${type === 'academics' ? 'max-w-3xl' : 'max-w-2xl'} max-h-[92vh] overflow-y-auto`}>
        {/* Modal Header */}
        <div className={`bg-gradient-to-r ${cfg.gradient} p-5 rounded-t-2xl`}>
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-white/20 rounded-xl p-2.5">
                <Icon size={20} className="text-white" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">{cfg.label}</h2>
                <p className="text-xs text-white/70 mt-0.5">{cfg.description}</p>
              </div>
            </div>
            <button onClick={onClose} className="text-white/70 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors">
              <X size={18} />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-5">
          {/* Student Identity Card */}
          <div className="flex items-start gap-4 p-4 bg-gray-50 rounded-2xl border border-gray-100">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-slate-700 to-slate-800 flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-base font-bold text-gray-900">{reg.first_name} {reg.last_name}</h3>
              <p className="text-sm text-gray-500 mt-0.5">{reg.programme_name || reg.programme_code}</p>
              <div className="flex flex-wrap gap-3 mt-2">
                {[
                  { label: 'Student No', value: reg.student_no },
                  { label: 'Year', value: `Year ${reg.year_of_study}` },
                  { label: 'Semester', value: `Sem ${reg.semester}` },
                  { label: 'Year', value: reg.academic_year_label },
                  reg.nationality && { label: 'Nationality', value: reg.nationality },
                  reg.student_type && { label: 'Type', value: reg.student_type },
                ].filter(Boolean).map(({ label, value }) => (
                  <div key={label} className="text-xs">
                    <span className="text-gray-400">{label}: </span>
                    <span className="font-semibold text-gray-700 capitalize">{value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Finance section (for all stages — context) */}
          <div className="border border-gray-100 rounded-2xl p-4 space-y-4">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp size={14} className="text-gray-500" />
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">Financial Status</p>
              {reg.invoice_number && (
                <span className="ml-auto text-[10px] text-gray-400 font-mono">{reg.invoice_number}</span>
              )}
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="bg-gray-50 rounded-xl p-3 text-center">
                <p className="text-xs text-gray-400 mb-1">Total Billed</p>
                <p className="text-sm font-bold text-gray-800">UGX {fmt(reg.total_fees)}</p>
              </div>
              <div className="bg-emerald-50 rounded-xl p-3 text-center">
                <p className="text-xs text-gray-400 mb-1">Amount Paid</p>
                <p className="text-sm font-bold text-emerald-700">UGX {fmt(reg.fees_paid)}</p>
              </div>
              <div className={`${parseFloat(reg.outstanding_balance) > 0 ? 'bg-red-50' : 'bg-gray-50'} rounded-xl p-3 text-center`}>
                <p className="text-xs text-gray-400 mb-1">Outstanding</p>
                <p className={`text-sm font-bold ${parseFloat(reg.outstanding_balance) > 0 ? 'text-red-600' : 'text-gray-600'}`}>
                  UGX {fmt(reg.outstanding_balance)}
                </p>
              </div>
            </div>

            <ClearanceMeter pct={reg.live_clearance_pct} hasWaiver={reg.financial_waiver} />
          </div>

          {/* Stage-specific fields */}
          {type === 'accounts' && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Residence Plan</label>
                  <select className={inputCls} value={form.residence_status} onChange={e => setField('residence_status', e.target.value)}>
                    <option value="non_resident">Non-Resident (Day)</option>
                    <option value="resident">Resident (Hall)</option>
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Registration Type</label>
                  <select className={inputCls} value={form.registration_type} onChange={e => setField('registration_type', e.target.value)}>
                    <option value="normal">Normal Registration</option>
                    <option value="late">Late Registration</option>
                    <option value="retake">Retake / Repeat</option>
                    <option value="transfer">Transfer Student</option>
                  </select>
                </div>
              </div>

              {/* Waiver section — shown if needed */}
              {needsWaiver && (
                <div className="border border-red-200 rounded-2xl p-4 bg-red-50 space-y-3">
                  <div className="flex items-start gap-2">
                    <AlertCircle size={16} className="text-red-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-bold text-red-700">Payment Below Threshold</p>
                      <p className="text-xs text-red-600 mt-0.5">
                        Student has paid <strong>{pct}%</strong> but minimum is <strong>60%</strong>.
                        Grant a financial waiver to proceed with accounts clearance.
                      </p>
                    </div>
                  </div>
                  <label className="flex items-center gap-2.5 cursor-pointer">
                    <input type="checkbox" checked={form.grant_waiver} onChange={e => setField('grant_waiver', e.target.checked)} className="w-4 h-4 rounded" />
                    <span className="text-sm font-semibold text-red-700">Grant Financial Waiver</span>
                  </label>
                  {form.grant_waiver && (
                    <div>
                      <label className={labelCls}>Waiver Reason *</label>
                      <textarea className={`${inputCls} resize-none`} rows={2}
                        value={form.waiver_reason}
                        onChange={e => setField('waiver_reason', e.target.value)}
                        placeholder="e.g. Scholarship student, payment plan approved by finance office…" />
                    </div>
                  )}
                </div>
              )}

              {/* Existing waiver notice */}
              {reg.financial_waiver && (
                <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800">
                  <ShieldCheck size={14} className="flex-shrink-0 mt-0.5 text-amber-600" />
                  <span>Financial waiver already active: <em>{reg.waiver_reason || 'No reason recorded'}</em></span>
                </div>
              )}

              <div>
                <label className={labelCls}>Bill Anomaly Comment</label>
                <textarea className={`${inputCls} resize-none`} rows={2}
                  value={form.anomaly_comment}
                  onChange={e => setField('anomaly_comment', e.target.value)}
                  placeholder="Any billing discrepancies or special notes…" />
              </div>
            </>
          )}

          {type === 'academics' && (
            <div className="space-y-4">
              {/* Registration Type */}
              <div>
                <label className={labelCls}>Registration Type</label>
                <select className={inputCls} value={form.registration_type} onChange={e => setField('registration_type', e.target.value)}>
                  <option value="normal">Normal Registration</option>
                  <option value="late">Late Registration</option>
                  <option value="retake">Retake / Repeat</option>
                  <option value="transfer">Transfer Student</option>
                </select>
              </div>

              {/* Passbook Preview */}
              <div className="border border-blue-200 rounded-2xl overflow-hidden">
                {/* Passbook header */}
                <div className="bg-gradient-to-r from-blue-700 to-blue-800 px-4 py-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <BookOpen size={16} className="text-white" />
                    <span className="text-sm font-bold text-white">Student Passbook Preview</span>
                  </div>
                  {passbook?.curriculum && (
                    <span className="text-[10px] font-semibold text-blue-200 bg-white/10 px-2 py-0.5 rounded-full">
                      {passbook.curriculum.code}
                    </span>
                  )}
                </div>

                {passbookLoading ? (
                  <div className="p-6 flex justify-center items-center gap-2 text-sm text-gray-400">
                    <div className="w-4 h-4 border-2 border-blue-300 border-t-blue-600 rounded-full animate-spin" />
                    Loading passbook…
                  </div>
                ) : !passbook ? (
                  <div className="p-5 flex items-start gap-2 text-sm text-gray-500">
                    <AlertCircle size={15} className="text-amber-500 flex-shrink-0 mt-0.5" />
                    Could not load passbook. Verify manually before clearing.
                  </div>
                ) : (
                  <div className="p-4 space-y-4 bg-blue-50/30">
                    {/* Certification statement */}
                    <div className="bg-white border border-blue-100 rounded-xl p-4">
                      <div className="flex items-start gap-2 mb-2">
                        <BadgeCheck size={15} className="text-blue-600 flex-shrink-0 mt-0.5" />
                        <p className="text-xs font-bold text-blue-800 uppercase tracking-wide">Registration Certificate</p>
                      </div>
                      <p className="text-sm text-gray-700 leading-relaxed">
                        This certifies that <strong>{reg.first_name} {reg.last_name}</strong> is registered for{' '}
                        <strong>Year {reg.year_of_study}, Semester {reg.semester}</strong> —{' '}
                        <strong>{reg.academic_year_label}</strong>.
                      </p>
                      <div className="flex flex-wrap gap-4 mt-3 pt-3 border-t border-blue-50">
                        {[
                          { label: 'Reg No', value: reg.student_no },
                          { label: 'Programme', value: reg.programme_code },
                          { label: 'Curriculum', value: passbook.curriculum?.name || '—' },
                          { label: 'Status', value: reg.status?.replace(/_/g,' ') },
                        ].map(({ label, value }) => (
                          <div key={label} className="text-xs">
                            <span className="text-gray-400">{label}: </span>
                            <span className="font-semibold text-gray-700 capitalize">{value}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Curriculum units table */}
                    {passbook.curriculumUnits?.length > 0 ? (
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-1.5">
                            <Layers size={13} className="text-blue-600" />
                            <p className="text-xs font-bold text-blue-800 uppercase tracking-wide">Enrolled Course Units</p>
                          </div>
                          <div className="flex gap-3 text-[10px] text-gray-500">
                            <span><span className="font-bold text-gray-800">{passbook.curriculumUnits.length}</span> units</span>
                            <span><span className="font-bold text-gray-800">
                              {passbook.curriculumUnits.reduce((s, u) => s + parseFloat(u.credit_units || 0), 0)}
                            </span> CU</span>
                          </div>
                        </div>
                        <div className="rounded-xl overflow-hidden border border-blue-100">
                          <table className="w-full text-xs">
                            <thead>
                              <tr className="bg-blue-800 text-white">
                                <th className="text-left px-3 py-2 font-semibold w-20">Code</th>
                                <th className="text-left px-3 py-2 font-semibold">Unit Name</th>
                                <th className="text-center px-3 py-2 font-semibold w-20">Type</th>
                                <th className="text-center px-3 py-2 font-semibold w-10">CU</th>
                              </tr>
                            </thead>
                            <tbody>
                              {passbook.curriculumUnits.map((u, i) => {
                                const tc = UNIT_TYPE_CONFIG[u.unit_type] || { label: u.unit_type, color: 'bg-gray-100 text-gray-600' };
                                return (
                                  <tr key={u.id} className={`border-t border-blue-50 ${i % 2 === 0 ? 'bg-white' : 'bg-blue-50/40'}`}>
                                    <td className="px-3 py-2 font-mono font-semibold text-gray-700">{u.code}</td>
                                    <td className="px-3 py-2 text-gray-700">{u.name}</td>
                                    <td className="px-3 py-2 text-center">
                                      <span className={`inline-block px-2 py-0.5 rounded-full text-[9px] font-bold ${tc.color}`}>{tc.label}</span>
                                    </td>
                                    <td className="px-3 py-2 text-center font-bold text-gray-700">{u.credit_units}</td>
                                  </tr>
                                );
                              })}
                              <tr className="bg-blue-800 text-white border-t border-blue-700">
                                <td colSpan={3} className="px-3 py-2 text-right text-[10px] font-bold uppercase tracking-wide">Total Credit Units</td>
                                <td className="px-3 py-2 text-center font-bold">
                                  {passbook.curriculumUnits.reduce((s, u) => s + parseFloat(u.credit_units || 0), 0)}
                                </td>
                              </tr>
                            </tbody>
                          </table>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800">
                        <AlertCircle size={14} className="flex-shrink-0 mt-0.5 text-amber-500" />
                        <span>No curriculum units found for Year {reg.year_of_study}, Semester {reg.semester}.{' '}
                          {!passbook.curriculum && 'No active curriculum is configured for this programme. '}
                          Verify manually before clearing.
                        </span>
                      </div>
                    )}

                    {/* Previously registered courses, if any */}
                    {passbook.registeredCourses?.length > 0 && (
                      <div>
                        <div className="flex items-center gap-1.5 mb-2">
                          <Hash size={13} className="text-emerald-600" />
                          <p className="text-xs font-bold text-emerald-800 uppercase tracking-wide">
                            Previously Registered Courses ({passbook.registeredCourses.length})
                          </p>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {passbook.registeredCourses.map(c => (
                            <span key={c.course_id} className="text-[10px] font-semibold bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-mono">
                              {c.code}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Special comments */}
              <div>
                <label className={labelCls}>Special Comments</label>
                <textarea className={`${inputCls} resize-none`} rows={2}
                  value={form.anomaly_comment}
                  onChange={e => setField('anomaly_comment', e.target.value)}
                  placeholder="Academic exceptions, supplementary registrations, deferred units…" />
              </div>
            </div>
          )}

          {type === 'accommodation' && (
            <div className="space-y-3">
              <div>
                <label className={labelCls}>Confirmed Residence Plan</label>
                <select className={inputCls} value={form.residence_status} onChange={e => setField('residence_status', e.target.value)}>
                  <option value="non_resident">Non-Resident (Day Student)</option>
                  <option value="resident">Resident (Hall Student)</option>
                </select>
              </div>
              <div className="flex items-start gap-2 p-3 bg-purple-50 border border-purple-200 rounded-xl text-xs text-purple-800">
                <Home size={14} className="flex-shrink-0 mt-0.5 text-purple-600" />
                <span>Clearing accommodation will mark the student as <strong>Fully Registered</strong>. Confirm residence status before proceeding.</span>
              </div>
              <div>
                <label className={labelCls}>Notes</label>
                <textarea className={`${inputCls} resize-none`} rows={2}
                  value={form.anomaly_comment}
                  onChange={e => setField('anomaly_comment', e.target.value)}
                  placeholder="Hall block, room, or any accommodation notes…" />
              </div>
            </div>
          )}

          {/* Stage progress preview */}
          <div className="border border-gray-100 rounded-2xl p-4">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-3">Clearance Progress</p>
            <StageProgress status={reg.status} />
            <div className="flex justify-between mt-2">
              {STAGES.map(s => (
                <span key={s.key} className={`text-[9px] font-semibold uppercase tracking-wide ${s.key === reg.status ? 'text-blue-600' : 'text-gray-300'}`}>
                  {s.label.split('').slice(0, 4).join('')}.
                </span>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-1 border-t border-gray-100">
            <button type="button" onClick={onClose}
              className="px-5 py-2.5 text-sm text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50 font-medium">
              Cancel
            </button>
            <button type="submit" disabled={saving || (needsWaiver && !form.grant_waiver)}
              className={`inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white rounded-xl disabled:opacity-50 transition-colors ${cfg.btnColor}`}>
              <BadgeCheck size={15} />
              {saving ? 'Clearing…' : `Clear ${STAGE_CONFIG[type].label.split(' ')[0]}`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Main Component ───────────────────────────────────────────────────────────
export default function RegistrationClearance() {
  const [years, setYears]     = useState([]);
  const [filter, setFilter]   = useState({ academic_year_id: '', semester: '1', status: '', search: '' });
  const [stats, setStats]     = useState(null);
  const [registrations, setRegistrations] = useState([]);
  const [total, setTotal]     = useState(0);
  const [loading, setLoading] = useState(false);

  // Initiate modal
  const [initModal, setInitModal]         = useState(false);
  const [query, setQuery]                 = useState('');
  const [suggestions, setSuggestions]     = useState([]);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [saving, setSaving]               = useState(false);
  const debounce                          = useRef(null);

  // Stage clear modal
  const [actionModal, setActionModal] = useState(null); // { reg, type }

  useEffect(() => {
    api.get('/academic/years').then(r => {
      setYears(r.data);
      const cur = r.data.find(y => y.is_current);
      if (cur) setFilter(f => ({ ...f, academic_year_id: cur.id }));
    });
  }, []);

  useEffect(() => { if (filter.academic_year_id) { loadStats(); loadList(); } }, [filter]);

  async function loadStats() {
    const r = await api.get(`/registration/stats?academic_year_id=${filter.academic_year_id}&semester=${filter.semester}`);
    setStats(r.data);
  }

  async function loadList() {
    setLoading(true);
    const params = new URLSearchParams({ academic_year_id: filter.academic_year_id, semester: filter.semester, limit: 50 });
    if (filter.status) params.set('status', filter.status);
    if (filter.search) params.set('search', filter.search);
    const r = await api.get(`/registration?${params}`);
    setRegistrations(r.data.data);
    setTotal(r.data.total);
    setLoading(false);
  }

  function handleQuery(e) {
    const val = e.target.value;
    setQuery(val);
    setSelectedStudent(null);
    clearTimeout(debounce.current);
    if (val.length < 2) { setSuggestions([]); return; }
    debounce.current = setTimeout(async () => {
      const r = await api.get(`/users/search/students?q=${encodeURIComponent(val)}`);
      setSuggestions(r.data);
    }, 300);
  }

  async function initiateReg() {
    if (!selectedStudent || !filter.academic_year_id) return;
    setSaving(true);
    try {
      await api.post('/registration/initiate', {
        student_id: selectedStudent.student_id,
        academic_year_id: filter.academic_year_id,
        semester: parseInt(filter.semester),
      });
      setInitModal(false); setQuery(''); setSelectedStudent(null); setSuggestions([]);
      loadStats(); loadList();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to initiate registration');
    } finally { setSaving(false); }
  }

  async function doStageAction(formData) {
    if (!actionModal) return;
    setSaving(true);
    try {
      // If waiver is being granted inline, do that first
      if (formData.grant_waiver && formData.waiver_reason) {
        await api.post(`/registration/${actionModal.reg.id}/waiver`, { reason: formData.waiver_reason });
      }
      await api.post(`/registration/${actionModal.reg.id}/clear-stage`, {
        stage: actionModal.type,
        residence_status: formData.residence_status,
        registration_type: formData.registration_type,
        anomaly_comment: formData.anomaly_comment || null,
      });
      setActionModal(null);
      loadStats(); loadList();
    } catch (err) {
      alert(err.response?.data?.error || 'Action failed');
    } finally { setSaving(false); }
  }

  function nextAction(reg) {
    const map = {
      initiated: 'accounts',
      accounts_cleared: 'academics',
      academics_cleared: 'accommodation',
    };
    return map[reg.status] || null;
  }

  const yearLabel = years.find(y => y.id === filter.academic_year_id)?.label || '';

  const STAT_CARDS = [
    { label: 'Initiated',      key: 'initiated',             gradient: 'from-gray-600 to-gray-700' },
    { label: 'Accounts',       key: 'accounts_cleared',      gradient: 'from-amber-500 to-amber-600' },
    { label: 'Academics',      key: 'academics_cleared',     gradient: 'from-blue-600 to-blue-700' },
    { label: 'Accommodation',  key: 'accommodation_cleared', gradient: 'from-purple-600 to-purple-700' },
    { label: 'Fully Reg.',     key: 'fully_registered',      gradient: 'from-emerald-600 to-emerald-700' },
  ];

  return (
    <div className="space-y-5">
      <PageHeader
        icon={ClipboardCheck}
        title="Registration Clearance"
        subtitle={`${yearLabel} · Semester ${filter.semester}`}
        actions={
          <button onClick={() => setInitModal(true)} disabled={!filter.academic_year_id}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white text-xs font-semibold rounded-lg disabled:opacity-50 transition-colors">
            + Initiate Registration
          </button>
        }
      />

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <select className="border border-gray-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-300"
          value={filter.academic_year_id} onChange={e => setFilter(f => ({ ...f, academic_year_id: e.target.value }))}>
          <option value="">Select Year</option>
          {years.map(y => <option key={y.id} value={y.id}>{y.label}{y.is_current ? ' ✓' : ''}</option>)}
        </select>
        <select className="border border-gray-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-300"
          value={filter.semester} onChange={e => setFilter(f => ({ ...f, semester: e.target.value }))}>
          <option value="1">Semester 1</option>
          <option value="2">Semester 2</option>
          <option value="3">Semester 3</option>
        </select>
        <select className="border border-gray-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-300"
          value={filter.status} onChange={e => setFilter(f => ({ ...f, status: e.target.value }))}>
          <option value="">All Stages</option>
          {STAGES.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
        </select>
        <div className="flex-1 relative min-w-48">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          <input className="w-full border border-gray-200 rounded-xl pl-8 pr-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-300"
            placeholder="Search name or student no…"
            value={filter.search}
            onChange={e => setFilter(f => ({ ...f, search: e.target.value }))} />
        </div>
      </div>

      {/* Stats bar */}
      {stats && (
        <div className="bg-gradient-to-br from-slate-900 via-blue-950 to-slate-800 rounded-2xl shadow-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-xs font-semibold text-blue-300/70 uppercase tracking-widest">Clearance Pipeline</p>
              <p className="text-sm font-bold text-white mt-0.5">{yearLabel} · Semester {filter.semester}</p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-white">{stats.total || 0}</p>
              <p className="text-xs text-blue-300/60">Total</p>
            </div>
          </div>
          <div className="grid grid-cols-5 gap-3">
            {STAT_CARDS.map(sc => (
              <div key={sc.key} className={`bg-gradient-to-br ${sc.gradient} rounded-xl p-3 text-white`}>
                <p className="text-2xl font-bold">{String(stats[sc.key] || 0).padStart(2, '0')}</p>
                <p className="text-[10px] font-semibold opacity-70 uppercase tracking-wide mt-0.5">{sc.label}</p>
              </div>
            ))}
          </div>
          {/* Progress bar */}
          {(stats.total || 0) > 0 && (
            <div className="mt-4 flex h-2 rounded-full overflow-hidden gap-0.5">
              {STAT_CARDS.map((sc, i) => {
                const colors = ['bg-gray-500','bg-amber-500','bg-blue-500','bg-purple-500','bg-emerald-500'];
                const w = Math.round(((stats[sc.key] || 0) / stats.total) * 100);
                return w > 0 ? <div key={sc.key} className={`${colors[i]} transition-all`} style={{ width: `${w}%` }} /> : null;
              })}
            </div>
          )}
        </div>
      )}

      {/* Table */}
      {loading ? <div className="py-16 flex justify-center"><Spinner /></div> : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gradient-to-r from-slate-800 to-slate-700 text-white">
                <th className="text-left px-4 py-3 text-xs font-semibold">Student</th>
                <th className="px-4 py-3 text-xs font-semibold w-44">Progress</th>
                <th className="text-left px-4 py-3 text-xs font-semibold hidden lg:table-cell">Programme</th>
                <th className="text-right px-4 py-3 text-xs font-semibold">Billed</th>
                <th className="text-right px-4 py-3 text-xs font-semibold">Paid</th>
                <th className="text-center px-4 py-3 text-xs font-semibold w-20">Clear %</th>
                <th className="text-center px-4 py-3 text-xs font-semibold w-28">Action</th>
              </tr>
            </thead>
            <tbody>
              {registrations.length === 0 && (
                <tr>
                  <td colSpan={7} className="text-center py-16 text-gray-400 text-sm">
                    No registrations found. Click "+ Initiate Registration" to add students.
                  </td>
                </tr>
              )}
              {registrations.map((reg, i) => {
                const action = nextAction(reg);
                const pct = parseFloat(reg.live_clearance_pct || 0);
                const isFullyReg = reg.status === 'fully_registered';
                const initials = `${reg.first_name?.[0] || ''}${reg.last_name?.[0] || ''}`;
                const code = (reg.first_name?.charCodeAt(0) || 65) % 5;
                const avatarColors = ['bg-blue-100 text-blue-700','bg-indigo-100 text-indigo-700','bg-amber-100 text-amber-700','bg-emerald-100 text-emerald-700','bg-rose-100 text-rose-700'];
                return (
                  <tr key={reg.id} className={`border-t border-gray-50 hover:bg-blue-50/20 transition-colors ${i%2===1?'bg-gray-50/30':''}`}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className={`w-8 h-8 rounded-full ${avatarColors[code]} flex items-center justify-center text-xs font-bold flex-shrink-0`}>
                          {initials}
                        </div>
                        <div>
                          <p className="font-semibold text-gray-800 text-sm">{reg.first_name} {reg.last_name}</p>
                          <p className="text-[10px] text-gray-400 font-mono">{reg.student_no} · Yr {reg.year_of_study}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <StageProgress status={reg.status} />
                      <p className="text-[10px] text-gray-400 mt-1 text-center capitalize">{(reg.status||'').replace(/_/g,' ')}</p>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500 hidden lg:table-cell">
                      <span className="font-mono font-semibold text-gray-700">{reg.programme_code}</span>
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-xs text-gray-600">{fmt(reg.total_fees)}</td>
                    <td className="px-4 py-3 text-right font-mono text-xs text-emerald-700 font-semibold">{fmt(reg.fees_paid)}</td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex flex-col items-center gap-1">
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${pct >= 100 ? 'bg-emerald-100 text-emerald-700' : pct >= 60 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-600'}`}>
                          {pct}%
                        </span>
                        {reg.financial_waiver && (
                          <span className="text-[9px] font-bold text-amber-600 bg-amber-50 px-1.5 rounded-full">WAIVER</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      {action ? (
                        <button
                          onClick={() => setActionModal({ reg, type: action })}
                          className={`inline-flex items-center gap-1 px-3 py-1.5 text-white text-xs font-semibold rounded-lg transition-colors ${STAGE_CONFIG[action].btnColor}`}
                        >
                          {action === 'accounts' && <DollarSign size={11} />}
                          {action === 'academics' && <GraduationCap size={11} />}
                          {action === 'accommodation' && <Home size={11} />}
                          Clear
                        </button>
                      ) : isFullyReg ? (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600">
                          <CheckCircle2 size={13} /> Done
                        </span>
                      ) : null}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {total > 0 && (
            <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between text-xs text-gray-400">
              <span>Showing {registrations.length} of {total} registrations</span>
              {total > 50 && <span className="text-blue-500 font-medium">Use search to filter</span>}
            </div>
          )}
        </div>
      )}

      {/* Initiate Registration Modal */}
      {initModal && (
        <Modal title="Initiate Registration" onClose={() => { setInitModal(false); setQuery(''); setSelectedStudent(null); setSuggestions([]); }}>
          <div className="space-y-4">
            <div className="relative">
              <label className={labelCls}>Search Student</label>
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                <input
                  className="w-full border border-gray-200 rounded-xl pl-8 pr-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-300"
                  placeholder="Search by name or student number…"
                  value={query} onChange={handleQuery} autoComplete="off" />
              </div>
              {suggestions.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-20 overflow-hidden">
                  {suggestions.map(s => (
                    <button key={s.student_id} type="button"
                      onClick={() => { setSelectedStudent(s); setQuery(`${s.student_no} — ${s.first_name} ${s.last_name}`); setSuggestions([]); }}
                      className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-blue-50 text-left border-b border-gray-50 last:border-0">
                      <User size={13} className="text-gray-400 shrink-0" />
                      <div>
                        <p className="text-sm font-semibold text-gray-800">{s.first_name} {s.last_name}</p>
                        <p className="text-xs text-gray-400">{s.student_no} · {s.programme_code} · Year {s.year_of_study}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {selectedStudent && (
              <div className="p-3 bg-blue-50 rounded-xl border border-blue-100">
                <p className="text-sm font-semibold text-blue-800">{selectedStudent.first_name} {selectedStudent.last_name}</p>
                <p className="text-xs text-blue-600 mt-0.5">{selectedStudent.student_no} · {selectedStudent.programme_code} · Year {selectedStudent.year_of_study}</p>
                <p className="text-xs text-blue-400 mt-1">Will initiate for {yearLabel}, Semester {filter.semester}</p>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => { setInitModal(false); setQuery(''); setSelectedStudent(null); }}
                className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50">Cancel</button>
              <button onClick={initiateReg} disabled={saving || !selectedStudent}
                className="px-4 py-2 text-sm font-semibold bg-slate-800 hover:bg-slate-700 text-white rounded-xl disabled:opacity-60">
                {saving ? 'Initiating…' : 'Initiate Registration'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Stage Clearance Modal */}
      {actionModal && (
        <ClearanceModal
          action={actionModal}
          onClose={() => setActionModal(null)}
          onSave={doStageAction}
          saving={saving}
        />
      )}
    </div>
  );
}
