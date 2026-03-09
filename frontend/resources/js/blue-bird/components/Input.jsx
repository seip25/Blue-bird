import React from 'react';

export default function Input({ label, error, className = '', ...props }) {
    return (
        <div className={`flex flex-col gap-1 ${className}`}>
            {label && <label className="text-sm font-medium text-gray-700">{label}</label>}
            <input
                className={`border rounded px-3 py-2 outline-none focus:ring-2 transition-all ${error ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:border-indigo-500 focus:ring-indigo-500'
                    }`}
                {...props}
            />
            {error && <span className="text-xs text-red-500 mt-1">{error}</span>}
        </div>
    );
}
