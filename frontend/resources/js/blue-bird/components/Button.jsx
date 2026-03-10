import React from 'react';

export default function Button({ children, variant = 'default', size = 'default', className = '', ...props }) {
    const baseStyle = "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50";

    const variants = {
        default: "bg-slate-900 text-slate-50 hover:bg-slate-900/90",
        destructive: "bg-red-500 text-slate-50 hover:bg-red-500/90",
        outline: "border border-slate-200 bg-white hover:bg-slate-100 hover:text-slate-900",
        secondary: "bg-slate-100 text-slate-900 hover:bg-slate-100/80",
        ghost: "hover:bg-slate-100 hover:text-slate-900",
        link: "text-slate-900 underline-offset-4 hover:underline",
        fill: "bg-gray-100 text-gray-900 hover:bg-gray-100/80 w-full",
        blue: "bg-blue-500 text-white hover:bg-blue-500/90 w-full",
        blue_light: "bg-blue-100 text-blue-500 hover:bg-blue-100/80 w-full font-semibold",
        green: "bg-green-500 text-white hover:bg-green-500/90 w-full",
        green_light: "bg-green-100 text-green-500 hover:bg-green-100/80 w-full font-semibold",
        red: "bg-red-500 text-white hover:bg-red-500/90 w-full",
        red_light: "bg-red-100 text-red-500 hover:bg-red-100/80 w-full font-semibold",
        yellow: "bg-yellow-500 text-white hover:bg-yellow-500/90 w-full",
        yellow_light: "bg-yellow-100 text-yellow-500 hover:bg-yellow-100/80 w-full font-semibold",
        purple: "bg-purple-500 text-white hover:bg-purple-500/90 w-full",
        purple_light: "bg-purple-100 text-purple-500 hover:bg-purple-100/80 w-full font-semibold",
        pink: "bg-pink-500 text-white hover:bg-pink-500/90 w-full",
        pink_light: "bg-pink-100 text-pink-500 hover:bg-pink-100/80 w-full font-semibold",
        orange: "bg-orange-500 text-white hover:bg-orange-500/90 w-full",
        orange_light: "bg-orange-100 text-orange-500 hover:bg-orange-100/80 w-full font-semibold",
        cyan: "bg-cyan-500 text-white hover:bg-cyan-500/90 w-full",
        cyan_light: "bg-cyan-100 text-cyan-500 hover:bg-cyan-100/80 w-full font-semibold",
        teal: "bg-teal-500 text-white hover:bg-teal-500/90 w-full",
        teal_light: "bg-teal-100 text-teal-500 hover:bg-teal-100/80 w-full font-semibold",
        lime: "bg-lime-500 text-white hover:bg-lime-500/90 w-full",
        lime_light: "bg-lime-100 text-lime-500 hover:bg-lime-100/80 w-full font-semibold",
        indigo: "bg-indigo-500 text-white hover:bg-indigo-500/90 w-full",
        indigo_light: "bg-indigo-100 text-indigo-500 hover:bg-indigo-100/80 w-full font-semibold",
        violet: "bg-violet-500 text-white hover:bg-violet-500/90 w-full",
        violet_light: "bg-violet-100 text-violet-500 hover:bg-violet-100/80 w-full font-semibold",
        fuchsia: "bg-fuchsia-500 text-white hover:bg-fuchsia-500/90 w-full",
        fuchsia_light: "bg-fuchsia-100 text-fuchsia-500 hover:bg-fuchsia-100/80 w-full font-semibold",
        rose: "bg-rose-500 text-white hover:bg-rose-500/90 w-full",
        rose_light: "bg-rose-100 text-rose-500 hover:bg-rose-100/80 w-full font-semibold",
        emerald: "bg-emerald-500 text-white hover:bg-emerald-500/90 w-full",
        emerald_light: "bg-emerald-100 text-emerald-500 hover:bg-emerald-100/80 w-full font-semibold",
        sky: "bg-sky-500 text-white hover:bg-sky-500/90 w-full",
        sky_light: "bg-sky-100 text-sky-500 hover:bg-sky-100/80 w-full font-semibold",
        slate: "bg-slate-500 text-white hover:bg-slate-500/90 w-full",
        gray: "bg-gray-500 text-white hover:bg-gray-500/90 w-full",
        zinc: "bg-zinc-500 text-white hover:bg-zinc-500/90 w-full",
        neutral: "bg-neutral-500 text-white hover:bg-neutral-500/90 w-full",
        stone: "bg-stone-500 text-white hover:bg-stone-500/90 w-full",
    };

    const sizes = {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-11 rounded-md px-8",
        icon: "h-10 w-10"
    };

    const style = `${baseStyle} ${variants[variant] || variants.default} ${sizes[size] || sizes.default} ${className}`;

    return (
        <button className={style} {...props}>
            {children}
        </button>
    );
}
