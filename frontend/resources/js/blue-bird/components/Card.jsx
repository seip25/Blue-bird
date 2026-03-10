import React from 'react';

export default function Card({ children, className = '', title, description, border = true, shadow = true }) {
    return (
        <div className={`rounded-lg ${border ? "border border-slate-200 dark:border-slate-800" : ""} ${shadow ? "shadow-sm" : ""} bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 ${className}`}>
            {(title || description) && (
                <div className="flex flex-col space-y-1.5 p-6">
                    {title && <h3 className="font-semibold leading-none tracking-tight">{title}</h3>}
                    {description && <p className="text-sm text-slate-500 dark:text-slate-400">{description}</p>}
                </div>
            )}
            <div className={`p-6 ${title || description ? 'pt-0' : ''}`}>
                {children}
            </div>
        </div>
    );
}
