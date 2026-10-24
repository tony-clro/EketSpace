import React, { useEffect, useState } from 'react';

export const QuotaBanner: React.FC = () => {
  const [quotaExceeded, setQuotaExceeded] = useState(false);

  useEffect(() => {
    const handleQuotaExceeded = () => {
      setQuotaExceeded(true);
    };

    window.addEventListener('gmp-quota-exceeded', handleQuotaExceeded);
    return () => {
      window.removeEventListener('gmp-quota-exceeded', handleQuotaExceeded);
    };
  }, []);

  if (!quotaExceeded) return null;

  return (
    <div className="bg-amber-50 dark:bg-amber-950/90 border-b border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200 px-4 py-2.5 text-xs md:text-sm text-center sticky top-0 z-50 shadow-sm flex items-center justify-between">
      <div className="flex-1">
        <span>
          Google Maps Platform quota reached. If you are the app owner, visit{' '}
          <a
            href="https://developers.google.com/maps/ai/ai-studio?utm_campaign=gmp_mcp_codeassist_v1_aistudio#quota_exceeded_errors"
            target="_blank"
            rel="noopener noreferrer"
            className="underline font-semibold text-amber-950 dark:text-amber-100 hover:text-amber-800 dark:hover:text-amber-300"
          >
            maps developer site
          </a>{' '}
          for instructions to update your account.
        </span>
      </div>
      <button
        onClick={() => setQuotaExceeded(false)}
        className="ml-3 text-amber-800 dark:text-amber-300 hover:text-amber-950 dark:hover:text-amber-100 text-xs px-2 py-0.5 rounded font-medium"
      >
        Dismiss
      </button>
    </div>
  );
};
