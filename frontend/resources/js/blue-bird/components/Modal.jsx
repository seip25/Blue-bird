import React, { useEffect } from 'react';

export default function Modal({ isOpen, onClose, title, children }) {
    useEffect(() => {
        if (isOpen) document.body.style.overflow = 'hidden';
        else document.body.style.overflow = 'unset';
        return () => { document.body.style.overflow = 'unset'; };
    }, [isOpen]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 transition-opacity">
            <div className="bg-white dark:bg-slate-900 rounded-lg shadow-xl w-full max-w-lg mx-4 overflow-hidden transform transition-all border dark:border-slate-800">
                <div className="flex justify-between items-center p-4 border-b dark:border-slate-800">
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">{title}</h3>
                    <button onClick={onClose} className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 text-2xl leading-none">
                        &times;
                    </button>
                </div>
                <div className="p-4 text-slate-900 dark:text-slate-100">
                    {children}
                </div>
            </div>
        </div>
    );
}
