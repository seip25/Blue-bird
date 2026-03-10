import React from 'react';
import Label from './Label.jsx';

export default function Input({ label, error, variant = "default", className = '', ...props }) {
    const variants = {
        default: "flex h-10 w-full rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 px-3 py-2 text-sm ring-offset-white dark:ring-offset-slate-950 file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-slate-500 dark:placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950 dark:focus-visible:ring-slate-300 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
        error: "flex h-10 w-full rounded-md border border-red-500 dark:border-red-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 px-3 py-2 text-sm ring-offset-white dark:ring-offset-slate-950 file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-slate-500 dark:placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
        fill: "flex h-10 w-full rounded-md border border-gray-100 dark:border-slate-800 bg-gray-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 px-3 py-2 text-sm ring-offset-white dark:ring-offset-slate-950 file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-slate-500 dark:placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950 dark:focus-visible:ring-slate-300 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 w-full"
    }
    const style = variants[variant] || variants.default;
    return (
        <div className={`flex flex-col gap-1.5 ${className}`}>
            {label && <Label>{label}</Label>}
            <input
                className={`${style} ${error ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
                {...props}
            />
            {error && <span className="text-xs font-medium text-red-500">{error}</span>}
        </div>
    );
}
