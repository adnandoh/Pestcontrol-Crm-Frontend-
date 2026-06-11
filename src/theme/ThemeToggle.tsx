import React from 'react';
import { useTheme } from './useTheme';
import './ThemeToggle.css';

const ThemeToggle: React.FC = () => {
  const { isDark, setTheme, isSyncing } = useTheme();

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setTheme(event.target.checked ? 'DARK' : 'LIGHT');
  };

  return (
    <div className="theme-toggle-wrap" title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}>
      <label className="theme-toggle-switch">
        <input
          type="checkbox"
          className="theme-toggle-input"
          checked={isDark}
          onChange={handleChange}
          disabled={isSyncing}
          aria-label={isDark ? 'Dark mode enabled. Switch to light mode' : 'Light mode enabled. Switch to dark mode'}
        />
        <span className="theme-toggle-slider" />
      </label>
    </div>
  );
};

export default ThemeToggle;
