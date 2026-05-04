import React from 'react';

export default function Typography({ variant = 'p', children, className = '', gradient = false, ...props }) {
    const variants = {
        h1: "scroll-m-20  font-extrabold tracking-tight",
        h2: "scroll-m-20 border-b pb-2  font-semibold tracking-tight first:mt-0",
        h3: "scroll-m-20  font-semibold tracking-tight",
        h4: "scroll-m-20  font-semibold tracking-tight",
        p: "leading-7 [&:not(:first-child)]:mt-6",
        blockquote: "mt-6 border-l-2 pl-6 italic",
        lead: "text-xl text-slate-700 dark:text-slate-300",
        large: "text-lg font-semibold",
        small: "text-sm font-medium leading-none",
        muted: "text-sm text-slate-500 dark:text-slate-400",
    };

    const fromColors = {
        blue: 'from-blue-500',
        sky: 'from-sky-500',
        indigo: 'from-indigo-500',
        violet: 'from-violet-500',
        purple: 'from-purple-500',
        fuchsia: 'from-fuchsia-500',
        pink: 'from-pink-500',
        rose: 'from-rose-500',
        red: 'from-red-500',
        orange: 'from-orange-500',
        amber: 'from-amber-500',
        yellow: 'from-yellow-500',
        lime: 'from-lime-500',
        green: 'from-green-500',
        emerald: 'from-emerald-500',
        teal: 'from-teal-500',
        cyan: 'from-cyan-500',
    };

    const toColors = {
        blue: 'to-blue-600',
        sky: 'to-sky-600',
        indigo: 'to-indigo-600',
        violet: 'to-violet-600',
        purple: 'to-purple-600',
        fuchsia: 'to-fuchsia-600',
        pink: 'to-pink-600',
        rose: 'to-rose-600',
        red: 'to-red-600',
        orange: 'to-orange-600',
        amber: 'to-amber-600',
        yellow: 'to-yellow-600',
        lime: 'to-lime-600',
        green: 'to-green-600',
        emerald: 'to-emerald-600',
        teal: 'to-teal-600',
        cyan: 'to-cyan-600',
    };

    const fromClass = gradient ? (fromColors[gradient.from] || `from-${gradient.from}-400`) : '';
    const toClass = gradient ? (toColors[gradient.to] || `to-${gradient.to}-600`) : '';
    const gradientText = gradient ? `bg-gradient-to-r ${fromClass} ${toClass} bg-clip-text text-transparent` : '';

    const Component = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'blockquote', 'p'].includes(variant) ? variant : 'p';
    const style = `${variants[variant]} ${className} ${gradientText}`;

    return (
        <Component className={style} {...props}>
            {children}
        </Component>
    );
}
