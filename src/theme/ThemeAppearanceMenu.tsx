import React from 'react';
import { Monitor, Moon, Sun } from 'lucide-react';
import { cn } from '../utils/cn';
import type { ThemeMode } from './theme';
import { useTheme } from './useTheme';

const OPTIONS: { mode: ThemeMode; label: string; icon: React.ReactNode }[] = [
  { mode: 'LIGHT', label: 'Light', icon: <Sun className="h-4 w-4" /> },
  { mode: 'DARK', label: 'Dark', icon: <Moon className="h-4 w-4" /> },
  { mode: 'SYSTEM', label: 'System', icon: <Monitor className="h-4 w-4" /> },
];

const ThemeAppearanceMenu: React.FC = () => {
  const { theme, setTheme, isSyncing } = useTheme();

  return (
    <div className="px-2 py-2 bg-white dark:bg-[#111827]">
      <p className="px-2 pb-1.5 text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
        Appearance
      </p>
      <div className="space-y-0.5">
        {OPTIONS.map(({ mode, label, icon }) => {
          const active = theme === mode;
          return (
            <button
              key={mode}
              type="button"
              disabled={isSyncing}
              onClick={() => setTheme(mode)}
              className={cn(
                'flex w-full items-center gap-2 rounded-md px-2 py-2 text-sm transition-colors',
                active
                  ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/80 dark:text-blue-300'
                  : 'text-gray-800 hover:bg-gray-100 dark:text-gray-100 dark:hover:bg-gray-800',
              )}
            >
              <span className={cn(active ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400')}>
                {icon}
              </span>
              <span className="font-medium">{label}</span>
              {active && (
                <span className="ml-auto text-[10px] font-bold uppercase text-blue-600 dark:text-blue-400">
                  ✓
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default ThemeAppearanceMenu;
