import React from 'react';

export default function DarkTH({ cols }) {
  return (
    <tr className="bg-slate-800 text-white">
      {cols.map(({ label, cls = '' }) => (
        <th key={label} className={`px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-left ${cls}`}>
          {label}
        </th>
      ))}
    </tr>
  );
}
