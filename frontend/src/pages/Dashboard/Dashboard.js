import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../services/api';
import {
  GraduationCap, BookOpen, ClipboardList, PenLine,
  Building2, Users, ArrowRight, School
} from 'lucide-react';

const QUICK_LINKS = [
  { label: 'New Application', desc: 'Register a walk-in applicant', to: '/admissions/new', icon: GraduationCap, color: 'bg-blue-50 border-blue-200 text-blue-700', roles: ['admin', 'registrar', 'admissions_officer'] },
  { label: 'Manage Courses', desc: 'Add or update courses', to: '/curriculum/courses', icon: BookOpen, color: 'bg-indigo-50 border-indigo-200 text-indigo-700', roles: ['admin', 'registrar', 'hod'] },
  { label: 'Registration Windows', desc: 'Open/close registration', to: '/registration/windows', icon: ClipboardList, color: 'bg-emerald-50 border-emerald-200 text-emerald-700', roles: ['admin', 'registrar'] },
  { label: 'Enter Marks', desc: 'Submit course marks', to: '/marks/enter', icon: PenLine, color: 'bg-amber-50 border-amber-200 text-amber-700', roles: ['admin', 'lecturer'] },
  { label: 'Academic Structure', desc: 'Faculties & programmes', to: '/academic/faculties', icon: Building2, color: 'bg-purple-50 border-purple-200 text-purple-700', roles: ['admin', 'registrar'] },
  { label: 'Manage Users', desc: 'Add staff & students', to: '/users', icon: Users, color: 'bg-slate-50 border-slate-200 text-slate-700', roles: ['admin'] },
];

function StatCard({ label, value, color }) {
  return (
    <div className={`bg-white rounded-xl border-l-4 ${color} shadow-sm px-5 py-4`}>
      <p className="text-2xl font-bold text-gray-800">{value ?? '—'}</p>
      <p className="text-xs text-gray-500 mt-0.5">{label}</p>
    </div>
  );
}

export default function Dashboard() {
  const { user, hasRole } = useAuth();
  const [stats, setStats] = useState({});

  useEffect(() => {
    const loads = [];
    if (hasRole('admin', 'registrar', 'admissions_officer')) {
      loads.push(
        api.get('/admissions?limit=1').then(r => setStats(s => ({ ...s, applicants: r.data.total }))).catch(() => {})
      );
    }
    if (hasRole('admin', 'registrar', 'hod', 'dean')) {
      loads.push(
        api.get('/curriculum/courses').then(r => setStats(s => ({ ...s, courses: r.data.length }))).catch(() => {})
      );
    }
    if (hasRole('admin', 'registrar')) {
      loads.push(
        api.get('/academic/programmes').then(r => setStats(s => ({ ...s, programmes: r.data.length }))).catch(() => {}),
        api.get('/academic/faculties').then(r => setStats(s => ({ ...s, faculties: r.data.length }))).catch(() => {})
      );
    }
    Promise.all(loads);
  }, []);

  const visibleLinks = QUICK_LINKS.filter(l => !l.roles.length || hasRole(...l.roles));

  return (
    <div>
      {/* Header */}
      <div className="bg-gradient-to-br from-slate-900 via-blue-950 to-slate-800 rounded-2xl shadow-xl mb-6 px-6 py-6">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-blue-500/20 border border-blue-400/30 rounded-xl flex items-center justify-center">
            <School size={22} className="text-blue-300" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">
              Welcome back, {user?.first_name}
            </h1>
            <p className="text-sm text-blue-300/70 mt-0.5 capitalize">
              {user?.roles?.join(' · ') || 'Staff'}
            </p>
          </div>
        </div>
      </div>

      {/* Stats */}
      {(stats.applicants !== undefined || stats.programmes !== undefined) && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {stats.applicants !== undefined && <StatCard label="Total Applicants" value={stats.applicants} color="border-blue-400" />}
          {stats.programmes !== undefined && <StatCard label="Programmes" value={stats.programmes} color="border-indigo-400" />}
          {stats.courses !== undefined && <StatCard label="Courses" value={stats.courses} color="border-emerald-400" />}
          {stats.faculties !== undefined && <StatCard label="Faculties" value={stats.faculties} color="border-amber-400" />}
        </div>
      )}

      {/* Quick links */}
      {visibleLinks.length > 0 && (
        <div>
          <h2 className="text-sm font-bold text-gray-700 mb-3">Quick access</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {visibleLinks.map(link => (
              <Link
                key={link.to}
                to={link.to}
                className={`flex items-center gap-3 p-4 rounded-xl border bg-white hover:shadow-md transition-shadow group`}
              >
                <div className={`w-9 h-9 rounded-lg border flex items-center justify-center shrink-0 ${link.color}`}>
                  <link.icon size={16} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-800">{link.label}</p>
                  <p className="text-xs text-gray-500 truncate">{link.desc}</p>
                </div>
                <ArrowRight size={14} className="text-gray-300 group-hover:text-gray-500 transition-colors shrink-0" />
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
