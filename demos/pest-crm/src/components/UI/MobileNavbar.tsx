import React from 'react';

interface Props {
  onCreateClick: () => void;
  onSearchClick: () => void;
  onTasksClick: () => void;
  onStatsClick: () => void;
  onDistributionClick: () => void;
  compact?: boolean;
}

export default function MobileNavbar({
  onCreateClick,
  onSearchClick,
  onTasksClick,
  onStatsClick,
  onDistributionClick,
  compact = false,
}: Props) {
  return (
    <nav className="sm:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-40">
      <div className="flex items-center justify-around px-2 py-1 safe-bottom">
        <button onClick={onSearchClick} className="flex flex-col items-center justify-center gap-0.5 py-2 px-3 rounded-xl text-gray-500 active:bg-gray-100 min-w-[56px]">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
          <span className="text-[10px] font-medium">Поиск</span>
        </button>

        {!compact && (
          <button onClick={onTasksClick} className="flex flex-col items-center justify-center gap-0.5 py-2 px-3 rounded-xl text-gray-500 active:bg-gray-100 min-w-[56px]">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 6h11M9 12h11M9 18h11M5 6h.01M5 12h.01M5 18h.01" /></svg>
            <span className="text-[10px] font-medium">Задачи</span>
          </button>
        )}

        <button onClick={onCreateClick} className="relative -top-3 w-14 h-14 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full flex items-center justify-center shadow-lg shadow-green-500/30 active:scale-95 transition-all">
          <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" /></svg>
        </button>

        <button onClick={onDistributionClick} className="flex flex-col items-center justify-center gap-0.5 py-2 px-3 rounded-xl text-gray-500 active:bg-gray-100 min-w-[56px]">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
          <span className="text-[10px] font-medium">Расп.</span>
        </button>

        <button onClick={onStatsClick} className="flex flex-col items-center justify-center gap-0.5 py-2 px-3 rounded-xl text-gray-500 active:bg-gray-100 min-w-[56px]">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
          <span className="text-[10px] font-medium">Стат.</span>
        </button>
      </div>
    </nav>
  );
}
