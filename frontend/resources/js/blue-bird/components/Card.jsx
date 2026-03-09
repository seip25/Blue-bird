import React from 'react';

export default function Card({ children, className = '', title }) {
    return (
        <div className={`bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden ${className}`}>
            {title && (
                <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
                    <h3 className="text-lg font-semibold text-gray-800">{title}</h3>
                </div>
            )}
            <div className="p-6">
                {children}
            </div>
        </div>
    );
}
