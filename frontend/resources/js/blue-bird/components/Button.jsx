import React from 'react';

export default function Button({ children, variant = 'primary', className = '', ...props }) {
    const baseStyle = "px-4 py-2 rounded font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors";

    const variants = {
        primary: "bg-indigo-600 text-white hover:bg-indigo-700 focus:ring-indigo-500",
        secondary: "bg-gray-200 text-gray-800 hover:bg-gray-300 focus:ring-gray-400",
        outline: "border border-indigo-600 text-indigo-600 hover:bg-indigo-50 focus:ring-indigo-500",
        danger: "bg-red-600 text-white hover:bg-red-700 focus:ring-red-500",
        ghost: "bg-transparent text-indigo-600 hover:bg-indigo-50 focus:ring-indigo-500"
    };

    const style = `${baseStyle} ${variants[variant]} ${className}`;

    return (
        <button className={style} {...props}>
            {children}
        </button>
    );
}
