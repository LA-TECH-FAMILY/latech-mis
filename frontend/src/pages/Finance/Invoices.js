import React, { useEffect, useState, useRef } from 'react';
import { FileText, Plus, Eye, User, Search } from 'lucide-react';
import { useHistory } from 'react-router-dom';
import api from '../../services/api';
import PageHeader from '../../components/PageHeader';
import Spinner from '../../components/Spinner';
import StatusBadge from '../../components/StatusBadge';
import Modal from '../../components/Modal';

const inputCls = 'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-300';
const labelCls = 'block text-xs font-medium text-gray-600 mb-1';
function fmt(n) { return Number(n).toLocaleString('en-UG', { minimumFractionDigits: 0 }); }

export default function Invoices() {
  const history = useHistory();
  const [invoices, setInvoices] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [years, setYears] = useState([]);
  const [filter, setFilter] = useState({ academic_year_id: '', semester: '', status: '' });
  const [loading, setLoading] = useState(false);
  const [modal, setModal] = useState(false);

  // Student search for new invoice
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [form, setForm] = useState({ academic_year_id: '', semester: '' });
  const [saving, setSaving] = useState(false);
  const debounce = useRef(null);

  useEffect(() => {
    api.get('/academic/years').then(r => {
      setYears(r.data);
      const cur = r.data.find(y => y.is_current);
      if (cur) setFilter(f => ({ ...f, academic_year_id: cur.id }));
    });
  }, []);

  useEffect(() => { load(); }, [filter, page]);

  async function load() {
    setLoading(true);
    const params = new URLSearchParams({ page, limit: 20 });
    if (filter.academic_year_id) params.set('academic_year_id', filter.academic_year_id);
    if (filter.semester) params.set('semester', filter.semester);
    if (filter.status) params.set('status', filter.status);
    const r = await api.get(`/finance/invoices?${params}`);
    setInvoices(r.data.data);
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

  async function createInvoice(e) {
    e.preventDefault();
    if (!selectedStudent) return;
    setSaving(true);
    try {
      const r = await api.post('/finance/invoices', {
        student_id: selectedStudent.student_id,
        academic_year_id: form.academic_year_id,
        semester: parseInt(form.semester),
      });
      setModal(false);
      history.push(`/finance/invoices/${r.data.id}`);
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to create invoice');
    } finally {
      setSaving(false);
    }
  }

  const pages = Math.ceil(total / 20);
  const statusColors = { unpaid: 'bg-red-100 text-red-700', partial: 'bg-yellow-100 text-yellow-700', paid: 'bg-green-100 text-green-700', waived: 'bg-blue-100 text-blue-700', cancelled: 'bg-gray-100 text-gray-500' };

  return (
    <div>
      <PageHeader
        icon={FileText}
        title="Invoices"
        subtitle={`${total} invoices`}
        actions={
          <button onClick={() => setModal(true)} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-500 hover:bg-blue-400 text-white text-xs font-semibold rounded-lg transition-colors">
            <Plus size={13} /> New Invoice
          </button>
        }
      />

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-5">
        <select className="border border-gray-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-300" value={filter.academic_year_id} onChange={e => { setFilter(f => ({ ...f, academic_year_id: e.target.value })); setPage(1); }}>
          <option value="">All Years</option>
          {years.map(y => <option key={y.id} value={y.id}>{y.label}{y.is_current ? ' ✓' : ''}</option>)}
        </select>
        <select className="border border-gray-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-300" value={filter.semester} onChange={e => { setFilter(f => ({ ...f, semester: e.target.value })); setPage(1); }}>
          <option value="">All Semesters</option>
          <option value="1">Semester 1</option>
          <option value="2">Semester 2</option>
          <option value="3">Semester 3</option>
        </select>
        <select className="border border-gray-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-300" value={filter.status} onChange={e => { setFilter(f => ({ ...f, status: e.target.value })); setPage(1); }}>
          <option value="">All Statuses</option>
          <option value="unpaid">Unpaid</option>
          <option value="partial">Partial</option>
          <option value="paid">Paid</option>
          <option value="waived">Waived</option>
        </select>
      </div>

      {loading ? <Spinner className="py-10" /> : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-800 text-white">
                <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide">Invoice No</th>
                <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide">Student</th>
                <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide">Period</th>
                <th className="text-right px-4 py-3 text-xs font-semibold uppercase tracking-wide">Total</th>
                <th className="text-right px-4 py-3 text-xs font-semibold uppercase tracking-wide">Paid</th>
                <th className="text-right px-4 py-3 text-xs font-semibold uppercase tracking-wide">Balance</th>
                <th className="text-center px-4 py-3 text-xs font-semibold uppercase tracking-wide">Clearance</th>
                <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {invoices.length === 0 && (
                <tr><td colSpan={9} className="text-center py-10 text-gray-400 text-sm">No invoices found</td></tr>
              )}
              {invoices.map((inv, i) => (
                <tr key={inv.id} className={i % 2 === 0 ? 'bg-white hover:bg-blue-50/30' : 'bg-gray-50/50 hover:bg-blue-50/30'}>
                  <td className="px-4 py-3 font-mono text-xs font-semibold text-blue-700">{inv.invoice_no}</td>
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-800">{inv.first_name} {inv.last_name}</p>
                    <p className="text-xs text-gray-400">{inv.student_no}</p>
                  </td>
                  <td className="px-4 py-3 text-gray-600 text-xs">{inv.academic_year_label} · Sem {inv.semester}</td>
                  <td className="px-4 py-3 text-right font-mono font-semibold text-gray-800">{fmt(inv.total_amount)}</td>
                  <td className="px-4 py-3 text-right font-mono text-green-700">{fmt(inv.amount_paid)}</td>
                  <td className="px-4 py-3 text-right font-mono text-red-600">{fmt(inv.balance)}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${parseFloat(inv.clearance_percent) >= 60 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                      {inv.clearance_percent}%
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full capitalize ${statusColors[inv.status] || 'bg-gray-100 text-gray-500'}`}>{inv.status}</span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => history.push(`/finance/invoices/${inv.id}`)} className="text-blue-500 hover:text-blue-700 transition-colors"><Eye size={15} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {pages > 1 && (
            <div className="px-4 py-3 border-t border-gray-100 flex justify-between items-center text-xs text-gray-500">
              <span>Showing {invoices.length} of {total}</span>
              <div className="flex gap-1">
                {Array.from({ length: pages }, (_, i) => i + 1).map(p => (
                  <button key={p} onClick={() => setPage(p)} className={`w-7 h-7 rounded-lg text-xs font-semibold ${p === page ? 'bg-slate-800 text-white' : 'hover:bg-gray-100 text-gray-600'}`}>{p}</button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {modal && (
        <Modal title="New Invoice" onClose={() => { setModal(false); setQuery(''); setSelectedStudent(null); setSuggestions([]); }}>
          <form onSubmit={createInvoice} className="space-y-4">
            <div className="relative">
              <label className={labelCls}>Student</label>
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                <input
                  className="w-full border border-gray-200 rounded-xl pl-8 pr-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-300"
                  placeholder="Search by student number or name…"
                  value={query}
                  onChange={handleQuery}
                  autoComplete="off"
                />
              </div>
              {suggestions.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-20 overflow-hidden">
                  {suggestions.map(s => (
                    <button key={s.student_id} type="button" onClick={() => { setSelectedStudent(s); setQuery(`${s.student_no} — ${s.first_name} ${s.last_name}`); setSuggestions([]); }}
                      className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-blue-50 text-left border-b border-gray-50 last:border-0">
                      <User size={13} className="text-gray-400 shrink-0" />
                      <div>
                        <p className="text-sm font-semibold text-gray-800">{s.first_name} {s.last_name}</p>
                        <p className="text-xs text-gray-400">{s.student_no} · {s.programme_code}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Academic Year</label>
                <select className={inputCls} value={form.academic_year_id} onChange={e => setForm(f => ({ ...f, academic_year_id: e.target.value }))} required>
                  <option value="">Select year</option>
                  {years.map(y => <option key={y.id} value={y.id}>{y.label}{y.is_current ? ' ✓' : ''}</option>)}
                </select>
              </div>
              <div>
                <label className={labelCls}>Semester</label>
                <select className={inputCls} value={form.semester} onChange={e => setForm(f => ({ ...f, semester: e.target.value }))} required>
                  <option value="">Select semester</option>
                  <option value="1">Semester 1</option>
                  <option value="2">Semester 2</option>
                  <option value="3">Semester 3</option>
                </select>
              </div>
            </div>
            <p className="text-xs text-gray-400">Fee lines will be pulled automatically from the fee structure for this student's programme and year.</p>
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => { setModal(false); setQuery(''); setSelectedStudent(null); }} className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50">Cancel</button>
              <button type="submit" disabled={saving || !selectedStudent || !form.academic_year_id || !form.semester} className="px-4 py-2 text-sm font-semibold bg-slate-800 hover:bg-slate-700 text-white rounded-xl disabled:opacity-60">
                {saving ? 'Creating…' : 'Create Invoice'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
