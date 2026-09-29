"use client";
import { useState, useRef, useEffect } from 'react';

type LanguageOption = {
  code: string;
  googleCode: string;
  label: string;
  dir: 'ltr' | 'rtl';
};

export default function LanguageSwitcher() {
  const [lang, setLang] = useState('EN');
  const [isOpen, setIsOpen] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const dropdownRef = useRef<HTMLDivElement | null>(null);

  const languages: LanguageOption[] = [
    { code: 'EN', googleCode: 'en', label: 'English', dir: 'ltr' },
    { code: 'AR', googleCode: 'ar', label: 'العربية', dir: 'rtl' },
    { code: 'HI', googleCode: 'hi', label: 'हिन्दी', dir: 'ltr' },
    { code: 'UR', googleCode: 'ur', label: 'اردو', dir: 'rtl' }
  ];

  useEffect(() => {
    setHydrated(true);
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) setIsOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLanguageChange = (l: LanguageOption) => {
    setLang(l.code);
    setIsOpen(false);

    // 1. Flip the layout direction
    document.documentElement.dir = l.dir;
    document.documentElement.lang = l.googleCode;

    // 2. THE MAGIC HACK: Secretly trigger the hidden Google Translate dropdown
    const select = document.querySelector('.goog-te-combo') as HTMLSelectElement | null;
    if (select) {
      select.value = l.googleCode;
      select.dispatchEvent(new Event('change')); // Forces Google to translate the whole page
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {hydrated && (
        <>
          <button 
            onClick={() => setIsOpen(!isOpen)}
            className="flex items-center gap-2 text-sm font-medium text-zinc-600 hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-white transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
            </svg>
            <span>{lang} / ع</span>
          </button>

          {isOpen && (
            <div className="absolute right-0 mt-2 w-32 bg-white border border-zinc-200 rounded-xl shadow-lg overflow-hidden z-[9999]">
              {languages.map((l) => (
                <button
                  key={l.code}
                  onClick={() => handleLanguageChange(l)}
                  className={`w-full text-left px-4 py-2 text-sm hover:bg-zinc-100 transition-colors ${
                    lang === l.code ? 'font-bold text-blue-600 bg-blue-50' : 'text-zinc-700'
                  }`}
                >
                  {l.label}
                </button>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
