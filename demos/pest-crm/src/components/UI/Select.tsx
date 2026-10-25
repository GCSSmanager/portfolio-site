import React from 'react';

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  options: { value: string; label: string }[];
  error?: string;
}

export default function Select({ 
  label, 
  options, 
  error,
  className = '', 
  ...props 
}: SelectProps) {
  return (
    <div className="space-y-1.5">
      {label && (
        <label className={`block text-sm font-medium ${error ? 'text-red-600' : 'text-gray-700'}`}>
          {label}
        </label>
      )}
      <div className="relative">
        <select
          className={`
            w-full px-4 py-3 sm:py-2.5 bg-white border rounded-xl
            text-gray-900 appearance-none cursor-pointer
            text-base sm:text-sm
            transition-all duration-200
            focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500
            disabled:bg-gray-50 disabled:text-gray-500
            ${error ? 'border-red-300' : 'border-gray-200'}
            ${className}
          `}
          {...props}
        >
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>
      {error && (
        <p className="text-sm text-red-600">{error}</p>
      )}
    </div>
  );
}