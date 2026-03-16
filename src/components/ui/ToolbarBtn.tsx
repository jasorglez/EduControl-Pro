import React from 'react';

type Color = 'indigo' | 'amber' | 'rose' | 'emerald';

const HOVER: Record<Color, string> = {
  indigo:  'hover:border-indigo-300 hover:text-indigo-600 hover:bg-indigo-50',
  amber:   'hover:border-amber-300  hover:text-amber-600  hover:bg-amber-50',
  rose:    'hover:border-rose-300   hover:text-rose-600   hover:bg-rose-50',
  emerald: 'hover:border-emerald-300 hover:text-emerald-600 hover:bg-emerald-50',
};

export default function ToolbarBtn({
  onClick, disabled = false, color = 'indigo', icon, label, title,
}: {
  onClick: () => void;
  disabled?: boolean;
  color?: Color;
  icon: React.ReactNode;
  label?: string;
  title?: string;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title ?? label}
      className={`flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 text-gray-600
        rounded-xl text-sm font-semibold transition-all
        ${HOVER[color]}
        disabled:opacity-30 disabled:cursor-not-allowed
        disabled:hover:bg-white disabled:hover:border-gray-200 disabled:hover:text-gray-600`}
    >
      {icon}
      {label && <span>{label}</span>}
    </button>
  );
}
