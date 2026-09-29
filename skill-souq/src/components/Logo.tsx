import React from 'react';

export default function Logo() {
  return (
    <div className="flex items-center gap-2.5 cursor-pointer group">
      
      {/* THE "APEX BIRD" ICON BLOCK */}
      <div className="w-10 h-10 flex items-center justify-center text-blue-600 dark:text-blue-500 group-hover:-translate-y-1 transition-transform duration-300">
        <svg 
          className="w-8 h-8 drop-shadow-md" 
          viewBox="0 0 24 24" 
          fill="currentColor" 
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* A sharp, geometric bird diving/flying - looks like a tech arrowhead */}
          <path d="M12 2L2 22l10-5 10 5L12 2z" />
        </svg>
      </div>
      
      {/* THE WORDMARK */}
      <div className="flex flex-col justify-center">
        <span className="text-2xl font-black tracking-tighter text-zinc-900 dark:text-white leading-none">
          SkillSouq
        </span>
        {/* Optional tiny tagline to lock in the industrial feel */}
        <span className="text-[10px] font-bold tracking-[0.2em] text-zinc-400 dark:text-zinc-500 uppercase mt-0.5">
          Elite Talent
        </span>
      </div>
      
    </div>
  );
}