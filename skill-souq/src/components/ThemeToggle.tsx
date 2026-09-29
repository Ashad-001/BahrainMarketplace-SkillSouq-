"use client";

import { useEffect, useState } from "react";

export default function ThemeToggle() {
  const [isDark, setIsDark] = useState<boolean | null>(null);

  useEffect(() => {
    const savedTheme = localStorage.getItem("skillsouq_theme");
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const dark = savedTheme ? savedTheme === "dark" : prefersDark;

    setIsDark(dark);
    document.documentElement.classList.toggle("dark", dark);
  }, []);

  const toggleTheme = () => {
    const nextDark = !isDark;
    setIsDark(nextDark);
    document.documentElement.classList.toggle("dark", nextDark);
    localStorage.setItem("skillsouq_theme", nextDark ? "dark" : "light");
  };

  // Prevent hydration mismatch by not rendering until client-side
  if (isDark === null) return <div className="w-10 h-10" />;

  return (
    <button
      onClick={toggleTheme}
      aria-label="Toggle theme"
      title={isDark ? "Switch to light mode" : "Switch to dark mode"}
      className="w-10 h-10 rounded-full flex items-center justify-center text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 dark:hover:text-white dark:hover:bg-zinc-800 transition-colors"
    >
      {isDark ? (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 3v1m0 16v1m8.66-9h-1M4.34 12h-1m15.02 6.36-.7-.7M6.02 6.02l-.7-.7m13.34 0-.7.7M6.02 17.98l-.7.7M12 8a4 4 0 100 8 4 4 0 000-8z" />
        </svg>
      ) : (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
        </svg>
      )}
    </button>
  );
}
