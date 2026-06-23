import React, { useEffect, useState } from 'react';
import { useParams, useHistory } from 'react-router-dom';
import { GraduationCap, ArrowLeft, Send, CheckCircle, XCircle } from 'lucide-react';
import api from '../../services/api';
import Spinner from '../../components/Spinner';
import StatusBadge from '../../components/StatusBadge';
import Modal from '../../components/Modal';

const labelCls = 'text-xs font-medium text-gray-400 uppercase tracking-wide';
const valueCls = 'text-sm font-medium text-gray-800 mt-0.5';
const inputCls = 'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-300';

function Field({ label, value }) {
  return (
    <div>
      <p className={labelCls}>{label}</p>
      <p className={valueCls}>{value || <span className="text-gray-400 italic font-normal">—</span>}</p>
    </div>
  );
}

const STATUS_FLOW = ['submitted', 'shortlisted', 'interviewed', 'offered', 'accepted', 'enrolled'];

export default function ApplicantDetail() {
  const { id } = useParams();
  const history = useHistory();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [intakes, setIntakes] = useState([]);
  const [offerModal, setOfferModal] = useState(false);
  const [offerForm, setOfferForm] = useState({ intake_id: '', expires_at: '' });
  const [saving, setSaving] = useState(false);
  const [enrolResult, setEnrolResult] = useState(null);

  async function load() {
    const [a, i] = await Promise.all([
      api.get(`/admissions/${id}`),
      api.get('/academic/intakes'),
    ]);
    setData(a.data);
    setIntakes(i.data);
    setLoading(false);
  }

  useEffect(() => { load(); }, [id]);

  async function updateStatus(status) {
    if (!window.confirm(`Move applicant to "${status}"?`)) return;
    await api.put(`/admissions/${id}/status`, { status });
    load();
  }

  async function enrolStudent() {
    if (!window.confirm('Enrol this student? A student ID and login account will be created.')) return;
    setSaving(true);
    try {
      const r = await api.post(`/admissions/${id}/enrol`);
      setEnrolResult(r.data);
      load();
    } catch (err) {
      alert(err.response?.data?.error || 'Enrolment failed');
    } finally {
      setSaving(false);
    }
  }

  async function makeOffer(e) {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post('/admissions/offers', { applicant_id: id, ...offerForm });
      setOfferModal(false);
      load();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to make offer');
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <Spinner />;
  if (!data) return <div className="text-center py-16 text-gray-400">Applicant not found</div>;

  const currentStep = STATUS_FLOW.indexOf(data.status);

  return (
    <div className="max-w-4xl">
      {/* Header */}
      <div className="bg-gradient-to-br from-slate-900 via-blue-950 to-slate-800 rounded-2xl shadow-xl mb-6 px-6 py-5">
        <button onClick={() => history.goBack()} className="flex items-center gap-1.5 text-blue-300/70 hover:text-white text-xs mb-3 transition-colors">
          <ArrowLeft size={13} /> Back to applicants
        </button>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <GraduationCap size={18} className="text-blue-300" />
            <div>
              <h1 className="text-lg font-bold text-white">{data.first_name} {data.other_names} {data.last_name}</h1>
              <p className="text-xs text-blue-300/70 mt-0.5">Ref: {data.reference_no} · Applied {new Date(data.created_at).toLocaleDateString()}</p>
            </div>
          </div>
          <div className="flex gap-2 flex-wrap">
            {data.status === 'shortlisted' && (
              <button onClick={() => updateStatus('interviewed')} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-purple-500 hover:bg-purple-400 text-white text-xs font-semibold rounded-lg transition-colors">
                Mark Interviewed
              </button>
            )}
            {data.status === 'submitted' && (
              <button onClick={() => updateStatus('shortlisted')} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-500 hover:bg-indigo-400 text-white text-xs font-semibold rounded-lg transition-colors">
                Shortlist
              </button>
            )}
            {(data.status === 'interviewed' || data.status === 'shortlisted') && (
              <button onClick={() => setOfferModal(true)} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-500 hover:bg-blue-400 text-white text-xs font-semibold rounded-lg transition-colors">
                <Send size={12} /> Make Offer
              </button>
            )}
            {data.status === 'offered' && (
              <button onClick={() => updateStatus('accepted')} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-green-500 hover:bg-green-400 text-white text-xs font-semibold rounded-lg transition-colors">
                <CheckCircle size={12} /> Mark Accepted
              </button>
            )}
            {data.status === 'accepted' && (
              <button onClick={enrolStudent} disabled={saving} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-lg disabled:opacity-60 transition-colors">
                <CheckCircle size={12} /> {saving ? 'Enrolling…' : 'Enrol Student'}
              </button>
            )}
            {!['rejected', 'withdrawn', 'enrolled'].includes(data.status) && (
              <button onClick={() => updateStatus('rejected')} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white/10 hover:bg-red-500/30 text-white text-xs font-semibold rounded-lg transition-colors">
                <XCircle size={12} /> Reject
              </button>
            )}
          </div>
        </div>

        {/* Progress bar */}
        <div className="mt-4 flex items-center gap-1">
          {STATUS_FLOW.map((s, i) => (
            <React.Fragment key={s}>
              <div className={`flex-1 h-1 rounded-full transition-all ${i <= currentStep ? 'bg-blue-400' : 'bg-white/10'}`} />
            </React.Fragment>
          ))}
        </div>
        <div className="flex justify-between mt-1">
          {STATUS_FLOW.map((s, i) => (
            <span key={s} className={`text-[9px] font-medium capitalize ${i <= currentStep ? 'text-blue-300' : 'text-white/20'}`}>{s}</span>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-5">
        {/* Personal Info */}
        <div className="col-span-2 space-y-5">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <h3 className="text-sm font-bold text-gray-700 mb-4">Personal Details</h3>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Full Name" value={`${data.first_name} ${data.other_names || ''} ${data.last_name}`} />
              <Field label="Gender" value={data.gender} />
              <Field label="Email" value={data.email} />
              <Field label="Phone" value={data.phone} />
              <Field label="Date of Birth" value={data.date_of_birth ? new Date(data.date_of_birth).toLocaleDateString() : null} />
              <Field label="Nationality" value={data.nationality} />
              <Field label="District" value={data.district_of_origin} />
              <Field label="Application Type" value={data.application_type} />
            </div>
          </div>

          {/* Qualifications */}
          {data.qualifications?.filter(q => q.id).length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <h3 className="text-sm font-bold text-gray-700 mb-4">Academic Qualifications</h3>
              <div className="space-y-3">
                {data.qualifications.filter(q => q.id).map(q => (
                  <div key={q.id} className="flex items-start gap-3 p-3 bg-gray-50 rounded-xl">
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-gray-800">{q.qualification_type}</p>
                      <p className="text-xs text-gray-500">{q.institution_name} · {q.year_obtained}</p>
                    </div>
                    <span className="text-sm font-bold text-blue-700">{q.grade_or_gpa}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">Status</h3>
            <StatusBadge status={data.status} />
          </div>

          {data.programme_choices?.filter(c => c.intake_id).length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
              <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">Programme Choices</h3>
              <div className="space-y-2">
                {data.programme_choices.filter(c => c.intake_id).sort((a, b) => a.preference_order - b.preference_order).map((c, i) => (
                  <div key={c.intake_id} className="flex items-center gap-2">
                    <span className="w-5 h-5 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center text-xs font-bold shrink-0">{c.preference_order}</span>
                    <span className="text-xs text-gray-600">
                      {intakes.find(it => it.id === c.intake_id)?.programme_name || 'Unknown'}
                    </span>
                    <StatusBadge status={c.status} />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Enrolment success banner */}
      {enrolResult && (
        <div className="mt-5 bg-emerald-50 border border-emerald-200 rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <CheckCircle size={16} className="text-emerald-600" />
            <p className="text-sm font-bold text-emerald-800">Student Enrolled Successfully</p>
          </div>
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div>
              <p className="text-xs text-emerald-600 font-medium uppercase tracking-wide">Student ID</p>
              <p className="text-lg font-bold text-emerald-900 font-mono">{enrolResult.student_no}</p>
            </div>
            <div>
              <p className="text-xs text-emerald-600 font-medium uppercase tracking-wide">Login Email</p>
              <p className="font-medium text-emerald-800">{enrolResult.login_email}</p>
            </div>
            <div>
              <p className="text-xs text-emerald-600 font-medium uppercase tracking-wide">Temp Password</p>
              <p className="font-mono font-medium text-emerald-800">{enrolResult.temp_password}</p>
            </div>
          </div>
          <p className="mt-2 text-xs text-emerald-600">Share login credentials with the student. They should change their password on first login.</p>
        </div>
      )}

      {/* Offer Modal */}
      {offerModal && (
        <Modal title="Make Admission Offer" onClose={() => setOfferModal(false)}>
          <form onSubmit={makeOffer} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Offered Intake</label>
              <select className={inputCls} value={offerForm.intake_id} onChange={e => setOfferForm(f => ({ ...f, intake_id: e.target.value }))} required>
                <option value="">Select intake</option>
                {intakes.map(it => <option key={it.id} value={it.id}>{it.programme_name} — {it.intake_label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Offer Expires (optional)</label>
              <input type="date" className={inputCls} value={offerForm.expires_at} onChange={e => setOfferForm(f => ({ ...f, expires_at: e.target.value }))} />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setOfferModal(false)} className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50">Cancel</button>
              <button type="submit" disabled={saving} className="px-4 py-2 text-sm font-semibold bg-slate-800 hover:bg-slate-700 text-white rounded-xl disabled:opacity-60">
                {saving ? 'Sending…' : 'Send Offer'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
