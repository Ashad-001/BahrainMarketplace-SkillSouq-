'use client';

import dynamic from 'next/dynamic';

const LanguageSwitcher = dynamic(() => import('./LanguageSwitcher'), { ssr: false });

export default LanguageSwitcher;
