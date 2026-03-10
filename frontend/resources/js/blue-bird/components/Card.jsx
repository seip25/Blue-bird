import React from 'react';

export default function Card({ children, className = '', title, description, border = true, shadow = true }) {
    return (
        <div className={`rounded-lg ${border ? "border" : ""} ${shadow ? "shadow-sm" : ""} bg-card text-card-foreground bg-white ${className}`}>
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
