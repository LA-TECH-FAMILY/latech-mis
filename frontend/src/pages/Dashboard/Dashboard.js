import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../services/api';
import {
  GraduationCap, BookOpen, ClipboardList, PenLine, Building2, Users,
  ArrowRight, TrendingUp, DollarSign, UserCheck, FileText,
  CheckCircle, Clock, AlertCircle, School, CalendarDays, ChevronRight,
} from 'lucide-react';

const QUICK_LINKS = [
  { label: 'New Application', desc: 'Register a walk-in applicant', to: '/admissions/new', icon: GraduationCap, from: 'from-blue-500', to_: 'to-blue-600', roles: ['admin', 'registrar', 'admissions_officer'] },
  { label: 'Registration Clearance', desc: 'Process student clearance', to: '/registration/clearance', icon: ClipboardList, from: 'from-emerald-500', to_: 'to-emerald-600', roles: ['admin', 'registrar', 'finance_officer'] },
  { label: 'Enter Marks', desc: 'Submit course marks', to: '/marks/enter', icon: PenLine, from: 'from-amber-500', to_: 'to-amber-600', roles: ['admin', 'lecturer'] },
  { label: 'All Students', desc: 'Browse student records', to: '/students', icon: UserCheck, from: 'from-indigo-500', to_: 'to-indigo-600', roles: ['admin', 'registrar', 'finance_officer', 'hod', 'dean'] },
  { label: 'Invoices', desc: 'Finance & billing', to: '/finance/invoices', icon: DollarSign, from: 'from-violet-500', to_: 'to-violet-600', roles: ['admin', 'finance_officer'] },
  { label: 'Manage Programmes', desc: 'Academic programmes', to: '/academic/programmes', icon: Building2, from: 'from-rose-500', to_: 'to-rose-600', roles: ['admin', 'registrar'] },
];

const STATUS_COLORS = {
  pending:  'bg-amber-100 text-amber-700',
  admitted: 'bg-blue-100 text-blue-700',
  enrolled: 'bg-indigo-100 text-indigo-700',
  rejected: 'bg-red-100 text-red-600',
  waitlisted: 'bg-gray-100 text-gray-600',
};

function fmt(n) { return parseInt(n || 0).toLocaleString(); }
function pct(a, b) { return b > 0 ? Math.round((a / b) * 100) : 0; }
function fmtMoney(n) {
  const v = parseFloat(n || 0);
  if (v >= 1_000_000) return `${(v/1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `${(v/1_000).toFixed(0)}K`;
  return v.toFixed(0);
}

function BigStatCard({ label, value, sub, icon: Icon, gradient, link }) {
  const inner = (
    <div className={`bg-gradient-to-br ${gradient} rounded-2xl p-5 text-white shadow-md hover:shadow-lg transition-shadow h-full`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-3xl font-bold">{value}</p>
          <p className="text-sm font-semibold opacity-80 mt-0.5">{label}</p>
          {sub && <p className="text-xs opacity-60 mt-1">{sub}</p>}
        </div>
        <div className="bg-white/15 rounded-xl p-2.5">
          <Icon size={20} />
        </div>
      </div>
    </div>
  );
  return link ? <Link to={link} className="block h-full">{inner}</Link> : inner;
}

function MiniBar({ label, value, max, color }) {
  const w = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div className="space-y-1">
      <div className="flex justify-between items-center">
        <span className="text-xs text-gray-600 capitalize">{label}</span>
        <span className="text-xs font-bold text-gray-800">{fmt(value)}</span>
      </div>
      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full transition-all`} style={{ width: `${w}%` }} />
      </div>
    </div>
  );
}

const REG_STAGES = [
  { key: 'initiated',             label: 'Initiated',    color: 'bg-gray-400' },
  { key: 'accounts_cleared',      label: 'Accounts',     color: 'bg-amber-400' },
  { key: 'academics_cleared',     label: 'Academics',    color: 'bg-blue-400' },
  { key: 'accommodation_cleared', label: 'Accommodation',color: 'bg-indigo-400' },
  { key: 'fully_registered',      label: 'Registered',   color: 'bg-emerald-500' },
];

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

function formatDate(d) {
  return new Date(d).toLocaleDateString('en-UG', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}

export default function Dashboard() {
  const { user, hasRole } = useAuth();
  const [stats, setStats]   = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/dashboard/stats').then(r => {
      setStats(r.data);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const visibleLinks = QUICK_LINKS.filter(l => hasRole(...l.roles));
  const s = stats;
  const reg = s?.registration || {};
  const regTotal = parseInt(reg.total || 0);
  const fin = s?.finance || {};
  const st  = s?.students || {};
  const ap  = s?.applicants || {};
  const str = s?.structure || {};
  const staff = s?.staff || {};

  const clearancePct = parseFloat(fin.avg_clearance || 0);
  const semDay = s?.semesterDay || 0;
  const semTotal = s?.semesterTotal || 1;
  const semPct = pct(semDay, semTotal);

  const today = new Date().toLocaleDateString('en-UG', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <div className="space-y-5">
      {/* ===== HERO GREETING ===== */}
      <div className="bg-gradient-to-br from-slate-900 via-blue-950 to-slate-800 rounded-2xl shadow-xl p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-blue-500/20 border border-blue-400/30 flex items-center justify-center flex-shrink-0">
              <span className="text-xl font-bold text-blue-300">{user?.first_name?.[0]}{user?.last_name?.[0]}</span>
            </div>
            <div>
              <p className="text-blue-300/70 text-sm">{getGreeting()},</p>
              <h1 className="text-2xl font-bold text-white">{user?.first_name} {user?.last_name}</h1>
              <p className="text-blue-300/60 text-xs mt-0.5 capitalize">{user?.roles?.join(' · ') || 'Staff'} · {today}</p>
            </div>
          </div>

          {/* Semester progress */}
          {s?.currentYear && (
            <div className="sm:w-72 bg-white/8 border border-white/10 rounded-2xl p-4">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <p className="text-xs text-slate-400 font-medium">Current Academic Year</p>
                  <p className="text-sm font-bold text-white mt-0.5">{s.currentYear.label}</p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-blue-300">{semDay}</p>
                  <p className="text-[10px] text-slate-400 uppercase tracking-wide">of {semTotal} days</p>
                </div>
              </div>
              <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-blue-400 to-emerald-400 rounded-full transition-all"
                  style={{ width: `${semPct}%` }}
                />
              </div>
              <p className="text-[10px] text-slate-400 mt-1.5 text-right">{semPct}% of year complete</p>
            </div>
          )}
        </div>
      </div>

      {/* ===== TOP STATS ===== */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <BigStatCard
          label="Active Students" value={fmt(st.active)}
          sub={`${fmt(st.total)} total enrolled`}
          icon={Users} gradient="from-indigo-600 to-indigo-700" link="/students"
        />
        <BigStatCard
          label="Pending Applications" value={fmt(ap.pending)}
          sub={`${fmt(ap.this_week)} this week`}
          icon={FileText} gradient="from-blue-600 to-blue-700" link="/admissions"
        />
        <BigStatCard
          label="Total Billed" value={`UGX ${fmtMoney(fin.total_billed)}`}
          sub={`${fmt(fin.paid_invoices)} invoices paid`}
          icon={DollarSign} gradient="from-emerald-600 to-emerald-700" link="/finance/invoices"
        />
        <BigStatCard
          label="Avg. Fee Clearance" value={`${clearancePct}%`}
          sub={`${fmt(fin.invoice_count)} invoices total`}
          icon={TrendingUp} gradient={clearancePct >= 70 ? 'from-green-600 to-green-700' : clearancePct >= 40 ? 'from-amber-600 to-amber-700' : 'from-red-600 to-red-700'}
        />
      </div>

      {/* ===== SECOND ROW ===== */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* Registration Funnel */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-gray-800">Registration Pipeline</h3>
              <p className="text-xs text-gray-400 mt-0.5">Current academic year · {fmt(regTotal)} total</p>
            </div>
            <Link to="/registration/clearance" className="text-xs text-blue-600 hover:text-blue-700 font-semibold flex items-center gap-1">
              Manage <ChevronRight size={12} />
            </Link>
          </div>

          {loading ? (
            <div className="h-32 animate-pulse bg-gray-50 rounded-xl" />
          ) : (
            <>
              {/* Funnel bars */}
              <div className="space-y-3">
                {REG_STAGES.map(stage => {
                  const count = parseInt(reg[stage.key] || 0);
                  const w = regTotal > 0 ? Math.round((count / regTotal) * 100) : 0;
                  return (
                    <div key={stage.key}>
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-xs text-gray-600">{stage.label}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-gray-800">{fmt(count)}</span>
                          <span className="text-[10px] text-gray-400 w-8 text-right">{w}%</span>
                        </div>
                      </div>
                      <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
                        <div className={`h-full ${stage.color} rounded-full transition-all`} style={{ width: `${w}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Funnel summary pills */}
              <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-gray-50">
                {REG_STAGES.map(stage => (
                  <div key={stage.key} className="flex items-center gap-1.5 text-xs">
                    <span className={`w-2 h-2 rounded-full ${stage.color}`} />
                    <span className="text-gray-500">{stage.label}:</span>
                    <span className="font-bold text-gray-700">{fmt(reg[stage.key])}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Academic Structure snapshot */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
          <h3 className="text-sm font-bold text-gray-800">Academic Overview</h3>

          {loading ? (
            <div className="space-y-3">{[...Array(4)].map((_, i) => <div key={i} className="h-8 animate-pulse bg-gray-50 rounded-lg" />)}</div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: 'Faculties',   val: str.faculties,   color: 'bg-blue-50 text-blue-700',   icon: Building2 },
                  { label: 'Departments', val: str.departments, color: 'bg-indigo-50 text-indigo-700', icon: School },
                  { label: 'Programmes',  val: str.programmes,  color: 'bg-violet-50 text-violet-700', icon: GraduationCap },
                  { label: 'Courses',     val: str.courses,     color: 'bg-emerald-50 text-emerald-700', icon: BookOpen },
                ].map(({ label, val, color, icon: Icon }) => (
                  <div key={label} className={`${color} rounded-xl p-3 flex items-center gap-2`}>
                    <Icon size={14} />
                    <div>
                      <p className="text-lg font-bold">{fmt(val)}</p>
                      <p className="text-[10px] font-medium opacity-70">{label}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="border-t border-gray-50 pt-3 space-y-2">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">Students by Status</p>
                {[
                  { k: 'active',        label: 'Active',        color: 'bg-emerald-500' },
                  { k: 'admitted',      label: 'Admitted',      color: 'bg-blue-400' },
                  { k: 'graduated',     label: 'Graduated',     color: 'bg-indigo-400' },
                  { k: 'deferred',      label: 'Deferred',      color: 'bg-amber-400' },
                  { k: 'discontinued',  label: 'Discontinued',  color: 'bg-red-400' },
                ].map(({ k, label, color }) => (
                  <MiniBar key={k} label={label} value={st[k] || 0} max={parseInt(st.total || 1)} color={color} />
                ))}
              </div>

              <div className="border-t border-gray-50 pt-3 flex items-center justify-between">
                <div className="text-xs text-gray-500">Staff</div>
                <div className="text-right">
                  <span className="text-lg font-bold text-gray-800">{fmt(staff.total)}</span>
                  <span className="text-xs text-gray-400 ml-1">({fmt(staff.lecturers)} lecturers)</span>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* ===== THIRD ROW ===== */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* Finance breakdown */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-gray-800">Finance Summary</h3>
            <Link to="/finance/invoices" className="text-xs text-blue-600 hover:text-blue-700 font-semibold flex items-center gap-1">View all <ChevronRight size={12}/></Link>
          </div>
          {loading ? <div className="h-32 animate-pulse bg-gray-50 rounded-xl" /> : (
            <div className="space-y-3">
              {[
                { label: 'Total Billed',    val: `UGX ${fmtMoney(fin.total_billed)}`,   color: 'text-gray-800' },
                { label: 'Total Collected', val: `UGX ${fmtMoney(fin.total_paid)}`,     color: 'text-emerald-700' },
                { label: 'Outstanding',     val: `UGX ${fmtMoney(fin.total_balance)}`,  color: 'text-red-600' },
              ].map(({ label, val, color }) => (
                <div key={label} className="flex justify-between items-center py-2 border-b border-gray-50 last:border-0">
                  <span className="text-xs text-gray-500">{label}</span>
                  <span className={`text-sm font-bold ${color}`}>{val}</span>
                </div>
              ))}
              <div className="pt-2">
                <div className="flex justify-between items-center mb-1.5">
                  <span className="text-xs text-gray-500">Collection Rate</span>
                  <span className="text-xs font-bold text-gray-700">{pct(parseFloat(fin.total_paid), parseFloat(fin.total_billed))}%</span>
                </div>
                <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-emerald-400 to-emerald-500 rounded-full"
                    style={{ width: `${pct(parseFloat(fin.total_paid), parseFloat(fin.total_billed))}%` }} />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2 pt-2">
                {[
                  { label: 'Paid',    val: fin.paid_invoices,    cls: 'bg-emerald-50 text-emerald-700' },
                  { label: 'Partial', val: fin.partial_invoices, cls: 'bg-amber-50 text-amber-700' },
                  { label: 'Unpaid',  val: fin.unpaid_invoices,  cls: 'bg-red-50 text-red-600' },
                ].map(({ label, val, cls }) => (
                  <div key={label} className={`${cls} rounded-xl p-2.5 text-center`}>
                    <p className="text-base font-bold">{fmt(val)}</p>
                    <p className="text-[10px] font-medium opacity-70">{label}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Recent Applications */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-gray-800">Recent Applications</h3>
            <Link to="/admissions" className="text-xs text-blue-600 hover:text-blue-700 font-semibold flex items-center gap-1">View all <ChevronRight size={12}/></Link>
          </div>
          {loading ? (
            <div className="space-y-3">{[...Array(5)].map((_, i) => <div key={i} className="h-12 animate-pulse bg-gray-50 rounded-xl" />)}</div>
          ) : s?.recentApplications?.length === 0 ? (
            <p className="text-xs text-gray-400 text-center py-8">No applications yet</p>
          ) : (
            <div className="space-y-2">
              {s?.recentApplications?.map(app => {
                const initials = `${app.first_name?.[0] || ''}${app.last_name?.[0] || ''}`;
                const code = (app.first_name?.charCodeAt(0) || 65) % 6;
                const avatarColors = [
                  'bg-blue-100 text-blue-700','bg-indigo-100 text-indigo-700','bg-emerald-100 text-emerald-700',
                  'bg-amber-100 text-amber-700','bg-rose-100 text-rose-700','bg-violet-100 text-violet-700',
                ];
                return (
                  <Link key={app.id} to={`/admissions/${app.id}`} className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-gray-50 transition-colors group">
                    <div className={`w-8 h-8 rounded-full ${avatarColors[code]} flex items-center justify-center text-xs font-bold flex-shrink-0`}>
                      {initials}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-gray-800 truncate">{app.first_name} {app.last_name}</p>
                      <p className="text-[10px] text-gray-400 truncate">{app.programme_name || 'No programme'}</p>
                    </div>
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full capitalize flex-shrink-0 ${STATUS_COLORS[app.status] || 'bg-gray-100 text-gray-500'}`}>
                      {app.status}
                    </span>
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h3 className="text-sm font-bold text-gray-800 mb-4">Quick Actions</h3>
          <div className="space-y-2">
            {visibleLinks.map(link => (
              <Link
                key={link.to}
                to={link.to}
                className="flex items-center gap-3 p-3 rounded-xl border border-gray-100 hover:border-gray-200 hover:bg-gray-50 transition-all group"
              >
                <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${link.from} ${link.to_} flex items-center justify-center flex-shrink-0 shadow-sm`}>
                  <link.icon size={14} className="text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-gray-800">{link.label}</p>
                  <p className="text-[10px] text-gray-400 truncate">{link.desc}</p>
                </div>
                <ArrowRight size={12} className="text-gray-300 group-hover:text-gray-500 transition-colors flex-shrink-0" />
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
