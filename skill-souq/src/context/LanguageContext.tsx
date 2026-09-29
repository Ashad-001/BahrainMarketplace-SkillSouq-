"use client";
import React, { createContext, useContext, useState, useEffect } from 'react';
type LanguageContextValue = {
  lang: string;
  changeLanguage: (newLang: string) => void;
};

const LanguageContext = createContext<LanguageContextValue | null>(null);

export const LanguageProvider = ({ children }: { children: React.ReactNode }) => {
  const [lang, setLang] = useState('EN');

  useEffect(() => {
    const savedLang = localStorage.getItem('skillsouq_lang');
    if (savedLang) {
      setLang(savedLang);
    }
  }, []);

  const changeLanguage = (newLang: string) => {
    setLang(newLang);
    localStorage.setItem('skillsouq_lang', newLang);
  };

  return (
    <LanguageContext.Provider value={{ lang, changeLanguage }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useTranslation = () => useContext(LanguageContext);
