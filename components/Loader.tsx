

import React from 'react';

export const Loader: React.FC = () => {
  return (
    <div className="flex flex-col items-center justify-center p-16 bg-white dark:bg-slate-800 rounded-xl shadow-md border border-slate-200 dark:border-slate-700">
      <div className="w-12 h-12 border-4 border-primary-600 border-t-transparent rounded-full animate-spin"></div>
      <p className="mt-4 text-slate-600 dark:text-slate-300 font-semibold">Generating AI Analysis...</p>
      <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">This may take a few moments. Please wait.</p>
    </div>
  );
};