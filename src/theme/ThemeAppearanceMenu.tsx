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
    <div className="px-2 py-2">
      <p className="px-2 pb-1.5 text-[10px] font-bold uppercase tracking-wider text-crm-muted">
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
                  ? 'bg-primary-600/10 text-primary-600 dark:bg-primary-500/20 dark:text-primary-400'
                  : 'text-crm-text hover:bg-crm-hover',
              )}
            >
              <span className={cn(active ? 'text-primary-600 dark:text-primary-400' : 'text-crm-muted')}>
                {icon}
              </span>
              <span className="font-medium">{label}</span>
              {active && (
                <span className="ml-auto text-[10px] font-bold uppercase text-primary-600 dark:text-primary-400">
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
