import React, { createContext, useState, useEffect, useContext } from 'react';
import en from '../locales/en.json';
import es from '../locales/es.json';

const translations = { en, es };
export const LanguageContext = createContext();

export const LanguageProvider = ({ children, initialLang }) => {

    const [lang, setLang] = useState(() => localStorage.getItem('blue_bird_lang') || initialLang || 'en');

    useEffect(() => {
        localStorage.setItem('blue_bird_lang', lang);
    }, [lang]);

    /**
     * Translate key into configured language text
     * @param {string} key - the string config key
     * @returns {string} The translated text
     */
    const t = (key) => {
        const keys = key.split('.');
        let value = translations[lang];
        for (const k of keys) {
            if (value && typeof value === 'object' && value !== null && k in value) {
                value = value[k];
            } else {
                return key;
            }
        }
        return value !== undefined ? value : key;
    };

    return (
        <LanguageContext.Provider value={{ lang, setLang, t }}>
            {children}
        </LanguageContext.Provider>
    );
};

export const useLanguage = () => useContext(LanguageContext);
