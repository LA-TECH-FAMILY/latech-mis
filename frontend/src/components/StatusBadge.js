import React from 'react';

const COLORS = {
  active: 'bg-green-100 text-green-700',
  published: 'bg-green-100 text-green-700',
  accepted: 'bg-green-100 text-green-700',
  full: 'bg-green-100 text-green-700',
  enrolled: 'bg-green-100 text-green-700',
  offered: 'bg-blue-100 text-blue-700',
  pending: 'bg-yellow-100 text-yellow-700',
  provisional: 'bg-yellow-100 text-yellow-700',
  submitted: 'bg-yellow-100 text-yellow-700',
  hod_approved: 'bg-indigo-100 text-indigo-700',
  registrar_approved: 'bg-purple-100 text-purple-700',
  shortlisted: 'bg-indigo-100 text-indigo-700',
  interviewed: 'bg-purple-100 text-purple-700',
  draft: 'bg-gray-100 text-gray-600',
  rejected: 'bg-red-100 text-red-700',
  withdrawn: 'bg-gray-100 text-gray-500',
  inactive: 'bg-gray-100 text-gray-500',
  open: 'bg-green-100 text-green-700',
  closed: 'bg-gray-100 text-gray-500',
};

export default function StatusBadge({ status }) {
  const cls = COLORS[status] || 'bg-gray-100 text-gray-600';
  return (
    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${cls}`}>
      {status?.replace(/_/g, ' ')}
    </span>
  );
}
