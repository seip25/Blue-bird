import React from 'react';
import { useLanguage } from '../contexts/LanguageContext.jsx';

/**
 * Renders translated text string given a key.
 * @param {Object} props
 * @param {string} props.k - The translation key.
 */
export default function Translate({ k }) {
    const { t } = useLanguage();
    return <>{t(k)}</>;
}
