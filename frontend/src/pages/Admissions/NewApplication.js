import React, { useEffect, useState } from 'react';
import { useHistory } from 'react-router-dom';
import { GraduationCap, Plus, Trash2 } from 'lucide-react';
import api from '../../services/api';
import PageHeader from '../../components/PageHeader';

const inputCls = 'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-300';
const labelCls = 'block text-xs font-medium text-gray-600 mb-1';

const EMPTY_QUAL = { qualification_type: 'A-Level', institution_name: '', year_obtained: '', grade_or_gpa: '' };

export default function NewApplication() {
  const history = useHistory();
  const [intakes, setIntakes] = useState([]);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    first_name: '', last_name: '', other_names: '', email: '', phone: '',
    gender: '', date_of_birth: '', nationality: 'Ugandan', district_of_origin: '',
    disability_status: '', application_type: 'walk_in',
  });
  const [choices, setChoices] = useState([{ intake_id: '', preference_order: 1 }]);
  const [quals, setQuals] = useState([{ ...EMPTY_QUAL }]);

  useEffect(() => {
    api.get('/academic/intakes').then(r => setIntakes(r.data));
  }, []);

  function setField(key, val) { setForm(f => ({ ...f, [key]: val })); }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    try {
      const r = await api.post('/admissions', {
        ...form,
        programme_choices: choices.filter(c => c.intake_id),
        qualifications: quals.filter(q => q.institution_name),
      });
      history.push(`/admissions/${r.data.id}`);
    } catch (err) {
      alert(err.response?.data?.error || 'Submission failed');
      setSaving(false);
    }
  }

  return (
    <div>
      <PageHeader icon={GraduationCap} title="New Application" subtitle="Walk-in or manual registration" />

      <form onSubmit={handleSubmit} className="space-y-5 max-w-3xl">
        {/* Personal Details */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h3 className="text-sm font-bold text-gray-800 mb-4">Personal Details</h3>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>First Name *</label>
              <input className={inputCls} value={form.first_name} onChange={e => setField('first_name', e.target.value)} required />
            </div>
            <div>
              <label className={labelCls}>Last Name *</label>
              <input className={inputCls} value={form.last_name} onChange={e => setField('last_name', e.target.value)} required />
            </div>
            <div>
              <label className={labelCls}>Other Names</label>
              <input className={inputCls} value={form.other_names} onChange={e => setField('other_names', e.target.value)} />
            </div>
            <div>
              <label className={labelCls}>Gender</label>
              <select className={inputCls} value={form.gender} onChange={e => setField('gender', e.target.value)}>
                <option value="">Select</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <label className={labelCls}>Email</label>
              <input type="email" className={inputCls} value={form.email} onChange={e => setField('email', e.target.value)} />
            </div>
            <div>
              <label className={labelCls}>Phone</label>
              <input className={inputCls} value={form.phone} onChange={e => setField('phone', e.target.value)} placeholder="+256 700 000000" />
            </div>
            <div>
              <label className={labelCls}>Date of Birth</label>
              <input type="date" className={inputCls} value={form.date_of_birth} onChange={e => setField('date_of_birth', e.target.value)} />
            </div>
            <div>
              <label className={labelCls}>Nationality</label>
              <input className={inputCls} value={form.nationality} onChange={e => setField('nationality', e.target.value)} />
            </div>
            <div>
              <label className={labelCls}>District of Origin</label>
              <input className={inputCls} value={form.district_of_origin} onChange={e => setField('district_of_origin', e.target.value)} />
            </div>
            <div>
              <label className={labelCls}>Application Type</label>
              <select className={inputCls} value={form.application_type} onChange={e => setField('application_type', e.target.value)}>
                <option value="walk_in">Walk-in</option>
                <option value="online">Online</option>
              </select>
            </div>
          </div>
        </div>

        {/* Programme Choices */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-gray-800">Programme Choices</h3>
            <button type="button" onClick={() => setChoices(c => [...c, { intake_id: '', preference_order: c.length + 1 }])}
              className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-medium">
              <Plus size={12} /> Add Choice
            </button>
          </div>
          <div className="space-y-2">
            {choices.map((ch, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="w-6 h-6 bg-slate-100 rounded-full flex items-center justify-center text-xs font-bold text-slate-600 shrink-0">{i + 1}</span>
                <select className={`${inputCls} flex-1`} value={ch.intake_id} onChange={e => setChoices(c => c.map((x, j) => j === i ? { ...x, intake_id: e.target.value } : x))}>
                  <option value="">Select intake</option>
                  {intakes.map(it => <option key={it.id} value={it.id}>{it.programme_name} — {it.intake_label}</option>)}
                </select>
                {choices.length > 1 && (
                  <button type="button" onClick={() => setChoices(c => c.filter((_, j) => j !== i))} className="text-gray-400 hover:text-red-500 transition-colors">
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Qualifications */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-gray-800">Academic Qualifications</h3>
            <button type="button" onClick={() => setQuals(q => [...q, { ...EMPTY_QUAL }])}
              className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-medium">
              <Plus size={12} /> Add Qualification
            </button>
          </div>
          <div className="space-y-3">
            {quals.map((q, i) => (
              <div key={i} className="grid grid-cols-4 gap-2 items-end">
                <div>
                  <label className={labelCls}>Type</label>
                  <select className={inputCls} value={q.qualification_type} onChange={e => setQuals(arr => arr.map((x, j) => j === i ? { ...x, qualification_type: e.target.value } : x))}>
                    {['O-Level', 'A-Level', 'Diploma', 'Degree', 'Other'].map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Institution</label>
                  <input className={inputCls} value={q.institution_name} onChange={e => setQuals(arr => arr.map((x, j) => j === i ? { ...x, institution_name: e.target.value } : x))} placeholder="School/University name" />
                </div>
                <div>
                  <label className={labelCls}>Year</label>
                  <input type="number" className={inputCls} value={q.year_obtained} onChange={e => setQuals(arr => arr.map((x, j) => j === i ? { ...x, year_obtained: e.target.value } : x))} placeholder="2023" />
                </div>
                <div className="flex gap-2">
                  <div className="flex-1">
                    <label className={labelCls}>Grade/GPA</label>
                    <input className={inputCls} value={q.grade_or_gpa} onChange={e => setQuals(arr => arr.map((x, j) => j === i ? { ...x, grade_or_gpa: e.target.value } : x))} placeholder="B+" />
                  </div>
                  {quals.length > 1 && (
                    <button type="button" onClick={() => setQuals(arr => arr.filter((_, j) => j !== i))} className="text-gray-400 hover:text-red-500 mt-5 transition-colors">
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <button type="button" onClick={() => history.goBack()} className="px-5 py-2.5 text-sm text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50">Cancel</button>
          <button type="submit" disabled={saving} className="px-5 py-2.5 text-sm font-semibold bg-slate-800 hover:bg-slate-700 text-white rounded-xl disabled:opacity-60">
            {saving ? 'Submitting…' : 'Submit Application'}
          </button>
        </div>
      </form>
    </div>
  );
}
