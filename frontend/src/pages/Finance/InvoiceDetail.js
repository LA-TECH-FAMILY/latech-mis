import React, { useEffect, useState } from 'react';
import { useParams, useHistory } from 'react-router-dom';
import { FileText, ArrowLeft, CheckCircle, PlusCircle } from 'lucide-react';
import api from '../../services/api';
import Spinner from '../../components/Spinner';
import Modal from '../../components/Modal';

const inputCls = 'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-300';
const labelCls = 'block text-xs font-medium text-gray-600 mb-1';
function fmt(n) { return Number(n).toLocaleString('en-UG', { minimumFractionDigits: 0 }); }

const statusColor = { unpaid: 'bg-red-100 text-red-700', partial: 'bg-yellow-100 text-yellow-700', paid: 'bg-green-100 text-green-700', waived: 'bg-blue-100 text-blue-700', cancelled: 'bg-gray-100 text-gray-500' };

export default function InvoiceDetail() {
  const { id } = useParams();
  const history = useHistory();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [payModal, setPayModal] = useState(false);
  const [form, setForm] = useState({ amount: '', payment_method: 'bank', reference_no: '', payment_date: new Date().toISOString().split('T')[0], notes: '' });
  const [saving, setSaving] = useState(false);

  async function load() {
    const r = await api.get(`/finance/invoices/${id}`);
    setData(r.data);
    setLoading(false);
  }

  useEffect(() => { load(); }, [id]);

  async function recordPayment(e) {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post('/finance/payments', { invoice_id: id, ...form, amount: parseFloat(form.amount) });
      setPayModal(false);
      setForm({ amount: '', payment_method: 'bank', reference_no: '', payment_date: new Date().toISOString().split('T')[0], notes: '' });
      load();
    } catch (err) {
      alert(err.response?.data?.error || 'Payment failed');
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <Spinner />;
  if (!data) return <div className="text-center py-16 text-gray-400">Invoice not found</div>;

  const clearPct = parseFloat(data.clearance_percent);

  return (
    <div className="max-w-4xl">
      {/* Header */}
      <div className="bg-gradient-to-br from-slate-900 via-blue-950 to-slate-800 rounded-2xl shadow-xl mb-6 px-6 py-5">
        <button onClick={() => history.goBack()} className="flex items-center gap-1.5 text-blue-300/70 hover:text-white text-xs mb-3 transition-colors">
          <ArrowLeft size={13} /> Back to Invoices
        </button>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <FileText size={18} className="text-blue-300" />
            <div>
              <h1 className="text-lg font-bold text-white font-mono">{data.invoice_no}</h1>
              <p className="text-xs text-blue-300/70 mt-0.5">{data.first_name} {data.last_name} · {data.student_no} · {data.programme_name}</p>
              <p className="text-xs text-blue-300/50">{data.academic_year_label} · Semester {data.semester}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className={`text-xs font-bold px-3 py-1.5 rounded-full capitalize ${statusColor[data.status] || 'bg-gray-100 text-gray-500'}`}>{data.status}</span>
            {!['paid', 'waived', 'cancelled'].includes(data.status) && (
              <button onClick={() => setPayModal(true)} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-green-500 hover:bg-green-400 text-white text-xs font-semibold rounded-lg transition-colors">
                <PlusCircle size={13} /> Record Payment
              </button>
            )}
          </div>
        </div>

        {/* Clearance bar */}
        <div className="mt-4">
          <div className="flex justify-between text-xs text-blue-200/70 mb-1">
            <span>Clearance</span>
            <span className="font-bold text-white">{clearPct}%</span>
          </div>
          <div className="h-2 bg-white/10 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${clearPct >= 100 ? 'bg-green-400' : clearPct >= 60 ? 'bg-yellow-400' : 'bg-red-400'}`}
              style={{ width: `${Math.min(clearPct, 100)}%` }}
            />
          </div>
          <div className="flex justify-between text-[10px] text-blue-300/50 mt-1">
            <span>0%</span>
            <span className="text-yellow-300/70">60% (provisional)</span>
            <span>100% (full)</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-5">
        {/* Invoice lines */}
        <div className="col-span-2 space-y-5">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-5 py-3 border-b border-gray-100">
              <h3 className="text-sm font-bold text-gray-700">Invoice Lines</h3>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-800 text-white">
                  <th className="text-left px-4 py-2.5 text-xs font-semibold uppercase tracking-wide">Description</th>
                  <th className="text-right px-4 py-2.5 text-xs font-semibold uppercase tracking-wide">Amount (UGX)</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((item, i) => (
                  <tr key={item.id || i} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}>
                    <td className="px-4 py-2.5 text-gray-800">{item.description}</td>
                    <td className="px-4 py-2.5 text-right font-mono font-semibold text-gray-800">{fmt(item.amount)}</td>
                  </tr>
                ))}
                <tr className="bg-slate-50 border-t-2 border-gray-200">
                  <td className="px-4 py-3 font-bold text-gray-800">Total</td>
                  <td className="px-4 py-3 text-right font-mono font-bold text-gray-900 text-base">{fmt(data.total_amount)}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Payment history */}
          {data.payments.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-5 py-3 border-b border-gray-100">
                <h3 className="text-sm font-bold text-gray-700">Payment History</h3>
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-800 text-white">
                    <th className="text-left px-4 py-2.5 text-xs font-semibold uppercase tracking-wide">Receipt No</th>
                    <th className="text-left px-4 py-2.5 text-xs font-semibold uppercase tracking-wide">Date</th>
                    <th className="text-left px-4 py-2.5 text-xs font-semibold uppercase tracking-wide">Method</th>
                    <th className="text-left px-4 py-2.5 text-xs font-semibold uppercase tracking-wide">Reference</th>
                    <th className="text-right px-4 py-2.5 text-xs font-semibold uppercase tracking-wide">Amount (UGX)</th>
                  </tr>
                </thead>
                <tbody>
                  {data.payments.map((p, i) => (
                    <tr key={p.id} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}>
                      <td className="px-4 py-2.5 font-mono text-xs text-blue-700">{p.receipt_no}</td>
                      <td className="px-4 py-2.5 text-gray-600">{new Date(p.payment_date).toLocaleDateString()}</td>
                      <td className="px-4 py-2.5 capitalize text-gray-600">{p.payment_method.replace('_', ' ')}</td>
                      <td className="px-4 py-2.5 text-gray-500 text-xs">{p.reference_no || '—'}</td>
                      <td className="px-4 py-2.5 text-right font-mono font-semibold text-green-700">{fmt(p.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Summary sidebar */}
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-3">
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wide">Summary</h3>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Total Billed</span>
              <span className="font-mono font-semibold text-gray-800">{fmt(data.total_amount)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Amount Paid</span>
              <span className="font-mono font-semibold text-green-700">{fmt(data.amount_paid)}</span>
            </div>
            <div className="h-px bg-gray-100" />
            <div className="flex justify-between text-sm">
              <span className="font-semibold text-gray-700">Balance Due</span>
              <span className={`font-mono font-bold ${parseFloat(data.balance) > 0 ? 'text-red-600' : 'text-green-600'}`}>{fmt(data.balance)}</span>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">Student</h3>
            <p className="text-sm font-semibold text-gray-800">{data.first_name} {data.last_name}</p>
            <p className="text-xs text-gray-500">{data.student_no}</p>
            <p className="text-xs text-gray-500 mt-1">{data.email}</p>
          </div>
        </div>
      </div>

      {/* Record Payment Modal */}
      {payModal && (
        <Modal title="Record Payment" onClose={() => setPayModal(false)}>
          <form onSubmit={recordPayment} className="space-y-3">
            <div className="p-3 bg-blue-50 rounded-xl text-sm text-blue-700">
              Balance: <strong>UGX {fmt(data.balance)}</strong>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Amount (UGX)</label>
                <input type="number" min="1" step="1000" className={inputCls} value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} required placeholder={fmt(data.balance)} />
              </div>
              <div>
                <label className={labelCls}>Payment Date</label>
                <input type="date" className={inputCls} value={form.payment_date} onChange={e => setForm(f => ({ ...f, payment_date: e.target.value }))} required />
              </div>
            </div>
            <div>
              <label className={labelCls}>Payment Method</label>
              <select className={inputCls} value={form.payment_method} onChange={e => setForm(f => ({ ...f, payment_method: e.target.value }))}>
                <option value="bank">Bank Transfer</option>
                <option value="mobile_money">Mobile Money</option>
                <option value="cash">Cash</option>
                <option value="online">Online</option>
                <option value="waiver">Waiver</option>
              </select>
            </div>
            <div>
              <label className={labelCls}>Reference / Transaction No</label>
              <input className={inputCls} value={form.reference_no} onChange={e => setForm(f => ({ ...f, reference_no: e.target.value }))} placeholder="Bank ref, MTN transaction ID, etc." />
            </div>
            <div>
              <label className={labelCls}>Notes</label>
              <input className={inputCls} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Optional" />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setPayModal(false)} className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50">Cancel</button>
              <button type="submit" disabled={saving} className="px-4 py-2 text-sm font-semibold bg-green-600 hover:bg-green-500 text-white rounded-xl disabled:opacity-60">
                {saving ? 'Recording…' : 'Record Payment'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
