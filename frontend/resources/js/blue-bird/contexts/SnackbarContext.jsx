import React, { createContext, useState, useContext, useCallback } from 'react';

export const SnackbarContext = createContext();

export const SnackbarProvider = ({ children }) => {
    const [snackbars, setSnackbars] = useState([]);

    const showSnackbar = useCallback((message, type = 'info', duration = 3000) => {
        const id = Date.now();
        setSnackbars((prev) => [...prev, { id, message, type }]);
        setTimeout(() => {
            setSnackbars((prev) => prev.filter((s) => s.id !== id));
        }, duration);
    }, []);

    return (
        <SnackbarContext.Provider value={{ showSnackbar }}>
            {children}
            <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
                {snackbars.map((s) => (
                    <div
                        key={s.id}
                        className={`px-4 py-3 rounded shadow-lg text-white transition-all transform pointer-events-auto ${s.type === 'success' ? 'bg-green-600' :
                                s.type === 'error' ? 'bg-red-600' :
                                    s.type === 'warning' ? 'bg-yellow-600' :
                                        'bg-blue-600'
                            }`}
                        role="alert"
                    >
                        {s.message}
                    </div>
                ))}
            </div>
        </SnackbarContext.Provider>
    );
};

export const useSnackbar = () => useContext(SnackbarContext);
