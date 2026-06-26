import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  LayoutDashboard, Users, GraduationCap, BookOpen, ClipboardList,
  FileText, PenLine, Building2, ChevronDown, ChevronRight,
  LogOut, Menu, X, School, DollarSign, UserCheck
} from 'lucide-react';

const NAV = [
  {
    label: 'Dashboard',
    icon: LayoutDashboard,
    path: '/',
    roles: [],
  },
  {
    label: 'Academic Structure',
    icon: Building2,
    roles: ['admin', 'registrar'],
    children: [
      { label: 'Faculties', path: '/academic/faculties' },
      { label: 'Departments', path: '/academic/departments' },
      { label: 'Programmes', path: '/academic/programmes' },
      { label: 'Academic Years', path: '/academic/years' },
      { label: 'Intakes', path: '/academic/intakes' },
    ],
  },
  {
    label: 'Admissions',
    icon: GraduationCap,
    roles: ['admin', 'registrar', 'admissions_officer'],
    children: [
      { label: 'Applicants', path: '/admissions' },
      { label: 'New Application', path: '/admissions/new' },
    ],
  },
  {
    label: 'Student Records',
    icon: UserCheck,
    roles: ['admin', 'registrar', 'finance_officer', 'hod', 'dean'],
    children: [
      { label: 'All Students', path: '/students' },
    ],
  },
  {
    label: 'Curriculum',
    icon: BookOpen,
    roles: ['admin', 'registrar', 'hod', 'dean'],
    children: [
      { label: 'Courses', path: '/curriculum/courses' },
      { label: 'Programme Curriculum', path: '/curriculum/programmes' },
    ],
  },
  {
    label: 'Registration',
    icon: ClipboardList,
    roles: ['admin', 'registrar', 'finance_officer'],
    children: [
      { label: 'Registration Clearance', path: '/registration/clearance' },
      { label: 'Financial Waiver', path: '/registration/waivers' },
      { label: 'Windows', path: '/registration/windows' },
    ],
  },
  {
    label: 'Marks & Results',
    icon: PenLine,
    roles: ['admin', 'registrar', 'hod', 'dean', 'lecturer', 'student'],
    children: [
      { label: 'Enter Marks', path: '/marks/enter' },
      { label: 'Approval Queue', path: '/marks/approval' },
      { label: 'View Results', path: '/marks/results' },
    ],
  },
  {
    label: 'Finance',
    icon: DollarSign,
    roles: ['admin', 'registrar', 'finance_officer'],
    children: [
      { label: 'Fee Structure', path: '/finance/fee-structure' },
      { label: 'Invoices', path: '/finance/invoices' },
    ],
  },
  {
    label: 'Users',
    icon: Users,
    roles: ['admin'],
    children: [
      { label: 'All Users', path: '/users' },
      { label: 'Add User', path: '/users/new' },
    ],
  },
];

function NavItem({ item, collapsed }) {
  const { hasRole } = useAuth();
  const { pathname } = useLocation();
  const [open, setOpen] = useState(() =>
    item.children?.some(c => pathname.startsWith(c.path))
  );

  if (item.roles?.length && !hasRole(...item.roles)) return null;

  if (!item.children) {
    const active = pathname === item.path;
    return (
      <Link
        to={item.path}
        className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
          active ? 'bg-white/15 text-white' : 'text-blue-200/70 hover:text-white hover:bg-white/10'
        }`}
      >
        <item.icon size={16} />
        {!collapsed && <span>{item.label}</span>}
      </Link>
    );
  }

  const anyActive = item.children.some(c => pathname.startsWith(c.path));

  return (
    <div>
      <button
        onClick={() => setOpen(o => !o)}
        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
          anyActive ? 'text-white' : 'text-blue-200/70 hover:text-white hover:bg-white/10'
        }`}
      >
        <item.icon size={16} />
        {!collapsed && (
          <>
            <span className="flex-1 text-left">{item.label}</span>
            {open ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
          </>
        )}
      </button>
      {open && !collapsed && (
        <div className="ml-7 mt-0.5 flex flex-col gap-0.5">
          {item.children.map(child => {
            const active = pathname.startsWith(child.path);
            return (
              <Link
                key={child.path}
                to={child.path}
                className={`px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                  active ? 'bg-white/15 text-white' : 'text-blue-200/60 hover:text-white hover:bg-white/10'
                }`}
              >
                {child.label}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function Layout({ children }) {
  const { user, logout } = useAuth();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      {/* Sidebar */}
      <aside className={`flex flex-col bg-gradient-to-b from-slate-900 via-blue-950 to-slate-900 transition-all duration-200 ${collapsed ? 'w-16' : 'w-60'} shrink-0`}>
        {/* Logo */}
        <div className="flex items-center gap-2.5 px-4 py-4 border-b border-white/10">
          <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center shrink-0">
            <School size={16} className="text-white" />
          </div>
          {!collapsed && (
            <div>
              <p className="text-white text-sm font-bold leading-tight">Latech MIS</p>
              <p className="text-blue-300/60 text-[10px]">Management System</p>
            </div>
          )}
          <button
            onClick={() => setCollapsed(c => !c)}
            className="ml-auto text-blue-300/60 hover:text-white transition-colors"
          >
            {collapsed ? <Menu size={15} /> : <X size={15} />}
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto px-2 py-3 flex flex-col gap-0.5">
          {NAV.map(item => (
            <NavItem key={item.label} item={item} collapsed={collapsed} />
          ))}
        </nav>

        {/* User footer */}
        <div className="border-t border-white/10 px-3 py-3">
          {!collapsed && (
            <div className="mb-2">
              <p className="text-white text-xs font-semibold truncate">{user?.first_name} {user?.last_name}</p>
              <p className="text-blue-300/50 text-[10px] truncate">{user?.email}</p>
            </div>
          )}
          <button
            onClick={logout}
            className="flex items-center gap-2 text-blue-300/60 hover:text-white text-xs transition-colors w-full"
          >
            <LogOut size={14} />
            {!collapsed && 'Sign out'}
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-y-auto">
        <div className="p-6 min-h-full">
          {children}
        </div>
      </main>
    </div>
  );
}
