import React from 'react';
import { useSPA } from '../contexts/SPAContext.jsx';
import Button from './Button.jsx';

/**
 * LanguageButton — A wrapper around the Button component that
 * automatically handles language switching via navigateToLang.
 *
 * @param {Object} props
 * @param {string} props.lang - The language code to switch to (e.g., "en", "es").
 * @param {React.ReactNode} props.children - Button content.
 */
function LanguageButton({ lang, children, ...props }) {
    const { navigateToLang } = useSPA();

    return (
        <Button onClick={() => navigateToLang(lang)} {...props}>
            {children}
        </Button>
    );
}

export default LanguageButton;
