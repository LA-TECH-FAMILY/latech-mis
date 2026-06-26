import React, { useEffect, useState, useRef } from 'react';
import { ClipboardCheck, Search, ChevronRight, AlertCircle, CheckCircle2, User } from 'lucide-react';
import api from '../../services/api';
import PageHeader from '../../components/PageHeader';
import Spinner from '../../components/Spinner';
import Modal from '../../components/Modal';

const inputCls = 'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-300';
const labelCls = 'block text-xs font-medium text-gray-600 mb-1';
function fmt(n) { return Number(n || 0).toLocaleString('en-UG', { minimumFractionDigits: 0 }); }

const STAGES = [
  { key: 'initiated',             label: 'INITIATED',    color: 'bg-gray-400' },
  { key: 'accounts_cleared',      label: 'ACCOUNTS',     color: 'bg-amber-500' },
  { key: 'academics_cleared',     label: 'ACADEMICS',    color: 'bg-blue-500' },
  { key: 'accommodation_cleared', label: 'ACCOMMODATION',color: 'bg-purple-500' },
  { key: 'fully_registered',      label: 'REGISTERED',   color: 'bg-green-500' },
];

function StageProgress({ status }) {
  const idx = STAGES.findIndex(s => s.key === status);
  return (
    <div className="flex items-center gap-0.5">
      {STAGES.map((s, i) => (
        <div key={s.key} title={s.label}
          className={`h-2 flex-1 rounded-sm ${i <= idx ? s.color : 'bg-gray-200'}`}
        />
      ))}
    </div>
  );
}

function StatCard({ label, value, color }) {
  return (
    <div className={`rounded-xl p-3 text-white ${color}`}>
      <p className="text-2xl font-bold">{String(value).padStart(2, '0')}</p>
      <p className="text-xs font-semibold opacity-80 uppercase tracking-wide mt-0.5">{label}</p>
    </div>
  );
}

export default function RegistrationClearance() {
  const [years, setYears] = useState([]);
  const [filter, setFilter] = useState({ academic_year_id: '', semester: '1', status: '', search: '' });
  const [stats, setStats] = useState(null);
  const [registrations, setRegistrations] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);

  // Initiate modal
  const [initModal, setInitModal] = useState(false);
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [saving, setSaving] = useState(false);
  const debounce = useRef(null);

  // Clear-stage / waiver modal
  const [actionModal, setActionModal] = useState(null); // { reg, type: 'accounts'|'academics'|'accommodation'|'waiver' }
  const [waiverReason, setWaiverReason] = useState('');

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
      setInitModal(false);
      setQuery(''); setSelectedStudent(null); setSuggestions([]);
      loadStats(); loadList();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to initiate registration');
    } finally {
      setSaving(false);
    }
  }

  async function doStageAction() {
    if (!actionModal) return;
    setSaving(true);
    try {
      if (actionModal.type === 'waiver') {
        if (!waiverReason.trim()) { alert('Reason is required'); setSaving(false); return; }
        await api.post(`/registration/${actionModal.reg.id}/waiver`, { reason: waiverReason });
      } else {
        await api.post(`/registration/${actionModal.reg.id}/clear-stage`, { stage: actionModal.type });
      }
      setActionModal(null);
      setWaiverReason('');
      loadStats(); loadList();
    } catch (err) {
      alert(err.response?.data?.error || 'Action failed');
    } finally {
      setSaving(false);
    }
  }

  function nextAction(reg) {
    const map = {
      initiated: 'accounts',
      accounts_cleared: 'academics',
      academics_cleared: 'accommodation',
      accommodation_cleared: null,
      fully_registered: null,
    };
    return map[reg.status] || null;
  }

  const yearLabel = years.find(y => y.id === filter.academic_year_id)?.label || '';

  return (
    <div>
      <PageHeader
        icon={ClipboardCheck}
        title="Registration Clearance"
        subtitle="CURRENT SEMESTER REGISTRATION"
        actions={
          <button onClick={() => setInitModal(true)} disabled={!filter.academic_year_id}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-500 hover:bg-blue-400 text-white text-xs font-semibold rounded-lg disabled:opacity-50 transition-colors">
            + Initiate Registration
          </button>
        }
      />

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-5">
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
            onChange={e => setFilter(f => ({ ...f, search: e.target.value }))}
          />
        </div>
      </div>

      {/* Stats header — mimics Alpha MIS panel */}
      {stats && (
        <div className="bg-gradient-to-br from-slate-900 via-blue-950 to-slate-800 rounded-2xl shadow-xl mb-5 p-5">
          <p className="text-xs font-semibold text-blue-300/70 uppercase tracking-widest mb-1">Main Campus Registration</p>
          <p className="text-sm font-bold text-white mb-4">{yearLabel} · Semester {filter.semester} · {stats.total} students</p>
          <div className="grid grid-cols-5 gap-3">
            <StatCard label="Initiated"      value={stats.initiated}             color="bg-gray-600/60" />
            <StatCard label="Accounts"       value={stats.accounts_cleared}      color="bg-amber-600/70" />
            <StatCard label="Academics"      value={stats.academics_cleared}     color="bg-blue-600/70" />
            <StatCard label="Accommodation"  value={stats.accommodation_cleared} color="bg-purple-600/70" />
            <StatCard label="Fully Reg."     value={stats.fully_registered}      color="bg-green-600/70" />
          </div>
        </div>
      )}

      {/* Clearance table */}
      {loading ? <Spinner className="py-10" /> : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-800 text-white">
                <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide">Acc. No</th>
                <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide">Name</th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide">Progress</th>
                <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide">Programme</th>
                <th className="text-right px-4 py-3 text-xs font-semibold uppercase tracking-wide">Fees (UGX)</th>
                <th className="text-center px-4 py-3 text-xs font-semibold uppercase tracking-wide">Paid %</th>
                <th className="text-center px-4 py-3 text-xs font-semibold uppercase tracking-wide">Waiver</th>
                <th className="text-center px-4 py-3 text-xs font-semibold uppercase tracking-wide">Actions</th>
              </tr>
            </thead>
            <tbody>
              {registrations.length === 0 && (
                <tr><td colSpan={8} className="text-center py-12 text-gray-400 text-sm">No registrations found. Click "Initiate Registration" to add students.</td></tr>
              )}
              {registrations.map((reg, i) => {
                const action = nextAction(reg);
                const pct = parseFloat(reg.live_clearance_pct || 0);
                return (
                  <tr key={reg.id} className={i % 2 === 0 ? 'bg-white hover:bg-blue-50/20' : 'bg-gray-50/50 hover:bg-blue-50/20'}>
                    <td className="px-4 py-3 font-mono text-xs font-semibold text-blue-700">{reg.student_no}</td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-800">{reg.first_name} {reg.last_name}</p>
                      <p className="text-xs text-gray-400">Year {reg.year_of_study}</p>
                    </td>
                    <td className="px-4 py-3 w-36">
                      <StageProgress status={reg.status} />
                      <p className="text-[10px] text-gray-400 mt-1 capitalize text-center">{reg.status.replace(/_/g, ' ')}</p>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-600">{reg.programme_code}</td>
                    <td className="px-4 py-3 text-right font-mono text-xs text-gray-700">{fmt(reg.total_fees)}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${pct >= 100 ? 'bg-green-100 text-green-700' : pct >= 60 ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-600'}`}>
                        {pct}%
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      {reg.financial_waiver
                        ? <CheckCircle2 size={14} className="text-green-500 mx-auto" />
                        : pct < 60
                          ? <button onClick={() => setActionModal({ reg, type: 'waiver' })} className="text-xs text-amber-600 hover:text-amber-800 font-semibold underline">Grant</button>
                          : <span className="text-gray-300 text-xs">—</span>
                      }
                    </td>
                    <td className="px-4 py-3 text-center">
                      {action && reg.status !== 'fully_registered' && (
                        <button
                          onClick={() => setActionModal({ reg, type: action })}
                          className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-800 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg transition-colors"
                        >
                          Clear <span className="capitalize">{action}</span> <ChevronRight size={11} />
                        </button>
                      )}
                      {reg.status === 'fully_registered' && (
                        <span className="text-xs font-semibold text-green-600">✓ Complete</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {total > 0 && (
            <div className="px-4 py-3 border-t border-gray-100 text-xs text-gray-400">
              Showing {registrations.length} of {total} registrations
            </div>
          )}
        </div>
      )}

      {/* Initiate Registration Modal */}
      {initModal && (
        <Modal title="Initiate Registration" onClose={() => { setInitModal(false); setQuery(''); setSelectedStudent(null); setSuggestions([]); }}>
          <div className="space-y-4">
            <div className="relative">
              <label className={labelCls}>Student</label>
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                <input
                  className="w-full border border-gray-200 rounded-xl pl-8 pr-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-300"
                  placeholder="Search by name or student number…"
                  value={query} onChange={handleQuery} autoComplete="off"
                />
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
              <div className="p-3 bg-blue-50 rounded-xl text-sm text-blue-800">
                <p className="font-semibold">{selectedStudent.first_name} {selectedStudent.last_name}</p>
                <p className="text-xs text-blue-600">{selectedStudent.student_no} · {selectedStudent.programme_code}</p>
                <p className="text-xs text-blue-500 mt-1">Clearance % will be auto-fetched from invoice for {yearLabel} Sem {filter.semester}</p>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => { setInitModal(false); setQuery(''); setSelectedStudent(null); }}
                className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50">Cancel</button>
              <button onClick={initiateReg} disabled={saving || !selectedStudent}
                className="px-4 py-2 text-sm font-semibold bg-slate-800 hover:bg-slate-700 text-white rounded-xl disabled:opacity-60">
                {saving ? 'Initiating…' : 'Initiate'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Stage clear / waiver modal */}
      {actionModal && (
        <Modal
          title={actionModal.type === 'waiver' ? 'Grant Financial Waiver' : `Clear ${actionModal.type.charAt(0).toUpperCase() + actionModal.type.slice(1)} Stage`}
          onClose={() => { setActionModal(null); setWaiverReason(''); }}
        >
          <div className="space-y-4">
            <div className="p-3 bg-gray-50 rounded-xl text-sm">
              <p className="font-semibold text-gray-800">{actionModal.reg.first_name} {actionModal.reg.last_name}</p>
              <p className="text-xs text-gray-500">{actionModal.reg.student_no} · {actionModal.reg.programme_code}</p>
              {actionModal.type !== 'waiver' && (
                <div className="mt-2 flex gap-4 text-xs">
                  <span>Fees: <strong>UGX {fmt(actionModal.reg.total_fees)}</strong></span>
                  <span>Paid: <strong className={parseFloat(actionModal.reg.live_clearance_pct) >= 60 ? 'text-green-700' : 'text-red-600'}>{actionModal.reg.live_clearance_pct}%</strong></span>
                  {actionModal.reg.financial_waiver && <span className="text-amber-700 font-semibold">⚠ Waiver active</span>}
                </div>
              )}
            </div>

            {actionModal.type === 'waiver' && (
              <>
                <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800">
                  <AlertCircle size={14} className="shrink-0 mt-0.5" />
                  <span>A financial waiver allows this student to proceed through accounts clearance even if their fee payment is below the minimum threshold.</span>
                </div>
                <div>
                  <label className={labelCls}>Reason for Waiver</label>
                  <textarea className={inputCls + ' resize-none'} rows={3} value={waiverReason} onChange={e => setWaiverReason(e.target.value)} placeholder="e.g. Scholarship student, payment plan approved, etc." />
                </div>
              </>
            )}

            {actionModal.type !== 'waiver' && actionModal.type === 'accounts' && !actionModal.reg.financial_waiver && parseFloat(actionModal.reg.live_clearance_pct) < 60 && (
              <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700">
                <AlertCircle size={14} className="shrink-0 mt-0.5" />
                <span>Student has only paid <strong>{actionModal.reg.live_clearance_pct}%</strong>. Minimum is 60%. Grant a waiver first or wait for payment.</span>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => { setActionModal(null); setWaiverReason(''); }}
                className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50">Cancel</button>
              <button onClick={doStageAction} disabled={saving}
                className={`px-4 py-2 text-sm font-semibold text-white rounded-xl disabled:opacity-60 ${actionModal.type === 'waiver' ? 'bg-amber-600 hover:bg-amber-500' : 'bg-green-600 hover:bg-green-500'}`}>
                {saving ? 'Saving…' : actionModal.type === 'waiver' ? 'Grant Waiver' : 'Confirm Clearance'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
