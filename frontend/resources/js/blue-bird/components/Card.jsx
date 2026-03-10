import React from 'react';

export default function Card({ children, className = '', title, description }) {
    return (
        <div className={`rounded-lg border bg-card text-card-foreground shadow-sm bg-white ${className}`}>
            {(title || description) && (
                <div className="flex flex-col space-y-1.5 p-6">
                    {title && <h3 className="font-semibold leading-none tracking-tight">{title}</h3>}
                    {description && <p className="text-sm text-slate-500">{description}</p>}
                </div>
            )}
            <div className={`p-6 ${title || description ? 'pt-0' : ''}`}>
                {children}
            </div>
        </div>
    );
}
