import React from 'react';

export default function Typography({ variant = 'p', children, className = '', ...props }) {
    const variants = {
        h1: "scroll-m-20 text-4xl font-extrabold tracking-tight lg:text-5xl",
        h2: "scroll-m-20 border-b pb-2 text-3xl font-semibold tracking-tight first:mt-0",
        h3: "scroll-m-20 text-2xl font-semibold tracking-tight",
        h4: "scroll-m-20 text-xl font-semibold tracking-tight",
        p: "leading-7 [&:not(:first-child)]:mt-6",
        blockquote: "mt-6 border-l-2 pl-6 italic",
        lead: "text-xl text-slate-700",
        large: "text-lg font-semibold",
        small: "text-sm font-medium leading-none",
        muted: "text-sm text-slate-500",
    };

    const Component = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'blockquote', 'p'].includes(variant) ? variant : 'p';
    const style = `${variants[variant]} ${className}`;

    return (
        <Component className={style} {...props}>
            {children}
        </Component>
    );
}
