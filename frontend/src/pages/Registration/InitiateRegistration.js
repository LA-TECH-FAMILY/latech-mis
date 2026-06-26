import React, { useEffect, useState } from 'react';
import { useParams, useHistory } from 'react-router-dom';
import {
  ArrowLeft, GraduationCap, CheckCircle2, AlertCircle,
  User, Mail, Phone, Globe, BookOpen, Calendar, Home, CreditCard
} from 'lucide-react';
import api from '../../services/api';
import Spinner from '../../components/Spinner';

const inputCls = 'w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-300';
const labelCls = 'block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5';

function InfoRow({ label, value, highlight }) {
  return (
    <div>
      <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">{label}</p>
      <p className={`text-sm font-semibold mt-0.5 ${highlight ? 'text-green-600' : 'text-gray-800'}`}>{value || '—'}</p>
    </div>
  );
}

function fmt(n) { return Number(n || 0).toLocaleString('en-UG', { minimumFractionDigits: 0 }); }

const RESIDENCE_OPTIONS = [
  { value: 'day',        label: 'Day Student' },
  { value: 'residence',  label: 'Residential' },
];

export default function InitiateRegistration() {
  const { student_id } = useParams();
  const history = useHistory();

  const [student, setStudent]   = useState(null);
  const [years, setYears]       = useState([]);
  const [invoice, setInvoice]   = useState(null);
  const [existing, setExisting] = useState(null); // existing reg for this period
  const [loading, setLoading]   = useState(true);
  const [saving, setSaving]     = useState(false);
  const [done, setDone]         = useState(null);

  const [form, setForm] = useState({
    academic_year_id: '',
    semester: '1',
    residence_status: 'day',
    notes: '',
  });

  // Load student + years
  useEffect(() => {
    Promise.all([
      api.get(`/users/students?search=`),
      api.get('/academic/years'),
    ]).then(([, y]) => {
      setYears(y.data);
      const cur = y.data.find(yr => yr.is_current);
      if (cur) setForm(f => ({ ...f, academic_year_id: cur.id }));
    });

    // Load student by id via search (reuse existing endpoint)
    api.get(`/users/students?limit=200`).then(r => {
      const s = r.data.data.find(x => x.student_id === student_id);
      setStudent(s || null);
      setLoading(false);
    });
  }, [student_id]);

  // When year/semester changes, check for existing invoice + registration
  useEffect(() => {
    if (!form.academic_year_id || !student_id) return;

    Promise.all([
      api.get(`/finance/invoices?student_id=${student_id}&academic_year_id=${form.academic_year_id}&semester=${form.semester}`),
      api.get(`/registration?student_id=${student_id}&academic_year_id=${form.academic_year_id}&semester=${form.semester}&limit=1`),
    ]).then(([inv, reg]) => {
      setInvoice(inv.data.data?.[0] || null);
      setExisting(reg.data.data?.[0] || null);
    }).catch(() => {});
  }, [form.academic_year_id, form.semester, student_id]);

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    try {
      const r = await api.post('/registration/initiate', {
        student_id,
        academic_year_id: form.academic_year_id,
        semester: parseInt(form.semester),
      });
      setDone(r.data);
    } catch (err) {
      alert(err.response?.data?.error || 'Registration failed');
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <Spinner />;
  if (!student) return (
    <div className="text-center py-20 text-gray-400">Student not found.</div>
  );

  const yearLabel = years.find(y => y.id === form.academic_year_id)?.label || '';
  const clearPct  = parseFloat(invoice?.clearance_percent || 0);
  const canRegister = clearPct >= 60 || existing?.financial_waiver;

  // ── Success screen ────────────────────────────────────────────────────────
  if (done) {
    return (
      <div className="max-w-2xl mx-auto py-16 text-center">
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircle2 size={40} className="text-green-600" />
        </div>
        <h2 className="text-xl font-bold text-gray-800 mb-1">Registration Initiated</h2>
        <p className="text-sm text-gray-500 mb-6">
          {student.first_name} {student.last_name} has been placed in the clearance queue for <strong>{yearLabel} — Semester {form.semester}</strong>.
        </p>
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 text-left mb-6">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Next Steps</p>
          <div className="space-y-2">
            {[
              { label: 'Accounts Clearance', done: false, note: `Fee payment at ${clearPct}%` },
              { label: 'Academics Clearance', done: false, note: 'Academic office review' },
              { label: 'Accommodation Clearance', done: false, note: 'Hostel / residence confirmation' },
              { label: 'Fully Registered', done: false, note: 'All stages complete' },
            ].map((step, i) => (
              <div key={i} className="flex items-center gap-3 p-2.5 rounded-xl bg-gray-50">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${step.done ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-500'}`}>{i + 1}</div>
                <div>
                  <p className="text-sm font-semibold text-gray-700">{step.label}</p>
                  <p className="text-xs text-gray-400">{step.note}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="flex justify-center gap-3">
          <button onClick={() => history.push('/registration/clearance')}
            className="px-5 py-2.5 text-sm font-semibold bg-slate-800 hover:bg-slate-700 text-white rounded-xl">
            Go to Clearance Queue
          </button>
          <button onClick={() => { setDone(null); setExisting(done); }}
            className="px-5 py-2.5 text-sm text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50">
            Register Another Period
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl">
      {/* Dark gradient header */}
      <div className="bg-gradient-to-br from-slate-900 via-blue-950 to-slate-800 rounded-2xl shadow-xl mb-6 px-6 py-5">
        <button onClick={() => history.goBack()}
          className="flex items-center gap-1.5 text-blue-300/70 hover:text-white text-xs mb-3 transition-colors">
          <ArrowLeft size={13} /> Back to Students
        </button>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold text-sm shrink-0">
            {student.first_name[0]}{student.last_name[0]}
          </div>
          <div>
            <p className="text-[10px] font-semibold text-blue-300/60 uppercase tracking-widest">Current Semester Registration</p>
            <h1 className="text-lg font-bold text-white">{student.first_name} {student.last_name}</h1>
          </div>
          <div className="ml-auto text-right">
            <p className="text-[10px] text-blue-300/50 uppercase tracking-wide">Semester Registration</p>
            <p className="text-sm font-bold text-blue-200">{yearLabel || 'Select a year'}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-5">
        {/* Left — main content */}
        <div className="col-span-2 space-y-5">

          {/* Student summary */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-5 py-3 bg-slate-50 border-b border-gray-100 flex items-center gap-2">
              <User size={14} className="text-slate-500" />
              <h3 className="text-sm font-bold text-gray-700">A summary of student's information</h3>
            </div>
            <div className="p-5 grid grid-cols-3 gap-x-6 gap-y-4">
              <InfoRow label="Access No."   value={student.student_no} />
              <InfoRow label="Programme"    value={student.programme_code} />
              <InfoRow label="Status"       value={student.student_status === 'active' ? 'ONGOING' : student.student_status?.toUpperCase()} highlight />
              <InfoRow label="Name"         value={`${student.first_name} ${student.last_name}`} />
              <InfoRow label="Email"        value={student.email} />
              <InfoRow label="Semester Phase" value="ON-SEMESTER" highlight />
              <InfoRow label="Year of Study" value={`Year ${student.year_of_study}`} />
              <InfoRow label="Programme"    value={student.programme_name} />
              <InfoRow label="Type"         value={(student.student_type || '').replace('_', ' ').toUpperCase()} />
            </div>
          </div>

          {/* Billing summary */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-5 py-3 bg-slate-50 border-b border-gray-100 flex items-center gap-2">
              <CreditCard size={14} className="text-slate-500" />
              <h3 className="text-sm font-bold text-gray-700">Billing & semester registration status</h3>
            </div>
            <div className="p-5">
              {invoice ? (
                <>
                  <div className={`flex items-start gap-3 p-3 rounded-xl mb-4 text-sm ${canRegister ? 'bg-green-50 border border-green-200' : 'bg-amber-50 border border-amber-200'}`}>
                    {canRegister
                      ? <CheckCircle2 size={16} className="text-green-600 shrink-0 mt-0.5" />
                      : <AlertCircle size={16} className="text-amber-600 shrink-0 mt-0.5" />
                    }
                    <div>
                      <p className={`font-semibold ${canRegister ? 'text-green-800' : 'text-amber-800'}`}>
                        {canRegister ? 'Student meets minimum clearance threshold.' : 'Clearance below minimum (60%). A waiver will be needed.'}
                      </p>
                      <p className={`text-xs mt-0.5 ${canRegister ? 'text-green-600' : 'text-amber-600'}`}>
                        Invoice {invoice.invoice_no} · UGX {fmt(invoice.amount_paid)} paid of UGX {fmt(invoice.total_amount)}
                      </p>
                    </div>
                  </div>

                  {/* Clearance bar */}
                  <div className="mb-4">
                    <div className="flex justify-between text-xs text-gray-500 mb-1">
                      <span>Fee Clearance</span>
                      <span className={`font-bold ${clearPct >= 100 ? 'text-green-600' : clearPct >= 60 ? 'text-amber-600' : 'text-red-600'}`}>{clearPct}%</span>
                    </div>
                    <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full transition-all ${clearPct >= 100 ? 'bg-green-500' : clearPct >= 60 ? 'bg-amber-400' : 'bg-red-400'}`}
                        style={{ width: `${Math.min(clearPct, 100)}%` }} />
                    </div>
                    <div className="flex justify-between text-[10px] text-gray-400 mt-1">
                      <span>0%</span><span className="text-amber-500">60% min</span><span>100%</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3 text-center">
                    <div className="p-3 bg-gray-50 rounded-xl">
                      <p className="text-xs text-gray-400">Total Billed</p>
                      <p className="text-sm font-bold text-gray-800 font-mono">UGX {fmt(invoice.total_amount)}</p>
                    </div>
                    <div className="p-3 bg-green-50 rounded-xl">
                      <p className="text-xs text-gray-400">Amount Paid</p>
                      <p className="text-sm font-bold text-green-700 font-mono">UGX {fmt(invoice.amount_paid)}</p>
                    </div>
                    <div className="p-3 bg-red-50 rounded-xl">
                      <p className="text-xs text-gray-400">Balance</p>
                      <p className="text-sm font-bold text-red-600 font-mono">UGX {fmt(invoice.balance)}</p>
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex items-start gap-3 p-4 bg-blue-50 border border-blue-200 rounded-xl text-sm">
                  <AlertCircle size={16} className="text-blue-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-blue-800">No invoice found for this period.</p>
                    <p className="text-xs text-blue-600 mt-0.5">You can still initiate registration — clearance will be 0% and a waiver will be required at accounts stage.</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Registration form */}
          <form onSubmit={handleSubmit}>
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-5 py-3 bg-slate-50 border-b border-gray-100 flex items-center gap-2">
                <BookOpen size={14} className="text-slate-500" />
                <h3 className="text-sm font-bold text-gray-700">Registration details</h3>
              </div>
              <div className="p-5">
                {existing && (
                  <div className="flex items-start gap-3 p-3 bg-yellow-50 border border-yellow-200 rounded-xl text-sm mb-4">
                    <AlertCircle size={15} className="text-yellow-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold text-yellow-800">Already initiated for this period.</p>
                      <p className="text-xs text-yellow-600">Current status: <strong className="capitalize">{existing.status?.replace(/_/g,' ')}</strong>. Submitting again will refresh the clearance %.</p>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className={labelCls}>Academic Year</label>
                    <select className={inputCls} value={form.academic_year_id} onChange={e => setForm(f => ({ ...f, academic_year_id: e.target.value }))} required>
                      <option value="">Select year</option>
                      {years.map(y => <option key={y.id} value={y.id}>{y.label}{y.is_current ? ' ✓' : ''}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className={labelCls}>Semester</label>
                    <select className={inputCls} value={form.semester} onChange={e => setForm(f => ({ ...f, semester: e.target.value }))}>
                      <option value="1">Semester 1</option>
                      <option value="2">Semester 2</option>
                      <option value="3">Semester 3</option>
                    </select>
                  </div>
                  <div>
                    <label className={labelCls}>Residence Status</label>
                    <select className={inputCls} value={form.residence_status} onChange={e => setForm(f => ({ ...f, residence_status: e.target.value }))}>
                      {RESIDENCE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                  </div>
                </div>

                {form.residence_status === 'residence' && (
                  <div className="mt-3 p-3 bg-blue-50 border border-blue-100 rounded-xl text-xs text-blue-700 flex items-center gap-2">
                    <Home size={13} /> Hostel allocation will be confirmed at the Accommodation clearance stage.
                  </div>
                )}

                <div className="mt-3">
                  <label className={labelCls}>Notes (optional)</label>
                  <textarea className={inputCls + ' resize-none'} rows={2}
                    placeholder="Any special notes for this registration…"
                    value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
                </div>
              </div>
            </div>

            <div className="mt-4 flex justify-end gap-3">
              <button type="button" onClick={() => history.goBack()}
                className="px-5 py-2.5 text-sm text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50">
                Cancel
              </button>
              <button type="submit" disabled={saving || !form.academic_year_id}
                className="inline-flex items-center gap-2 px-6 py-2.5 text-sm font-semibold bg-slate-800 hover:bg-slate-700 text-white rounded-xl disabled:opacity-60 transition-colors">
                {saving ? 'Initiating…' : existing ? 'Re-initiate Registration →' : 'Next Step →'}
              </button>
            </div>
          </form>
        </div>

        {/* Right — checklist + quick info */}
        <div className="space-y-4">
          {/* Clearance pipeline checklist */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">Clearance Pipeline</h3>
            <div className="space-y-2">
              {[
                { icon: CheckCircle2, label: 'Initiation',      sub: 'You are here', active: true,  done: !!existing },
                { icon: CreditCard,   label: 'Accounts',        sub: 'Fees clearance ≥ 60%',  active: false, done: !!existing?.accounts_cleared_at },
                { icon: BookOpen,     label: 'Academics',       sub: 'Academic office review', active: false, done: !!existing?.academics_cleared_at },
                { icon: Home,         label: 'Accommodation',   sub: 'Residence confirmation', active: false, done: !!existing?.accommodation_cleared_at },
                { icon: GraduationCap,label: 'Fully Registered',sub: 'Registration complete',  active: false, done: existing?.status === 'fully_registered' },
              ].map((step, i) => (
                <div key={i} className={`flex items-center gap-3 p-2.5 rounded-xl ${step.done ? 'bg-green-50' : step.active ? 'bg-blue-50 border border-blue-200' : 'bg-gray-50'}`}>
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0
                    ${step.done ? 'bg-green-500' : step.active ? 'bg-blue-600' : 'bg-gray-200'}`}>
                    <step.icon size={13} className="text-white" />
                  </div>
                  <div>
                    <p className={`text-xs font-bold ${step.done ? 'text-green-700' : step.active ? 'text-blue-700' : 'text-gray-500'}`}>{step.label}</p>
                    <p className="text-[10px] text-gray-400">{step.sub}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Quick info */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-3">
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wide">Student</h3>
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Mail size={13} className="text-gray-400 shrink-0" />{student.email}
            </div>
            {student.phone && (
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Phone size={13} className="text-gray-400 shrink-0" />{student.phone}
              </div>
            )}
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Globe size={13} className="text-gray-400 shrink-0" />{student.nationality || 'Not specified'}
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Calendar size={13} className="text-gray-400 shrink-0" />
              Enrolled {student.enrollment_date ? new Date(student.enrollment_date).toLocaleDateString() : '—'}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
