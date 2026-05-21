/** CRM color tokens — use via CSS variables, not hardcoded #fff / #000 in components. */

export const lightColors = {
  background: '#F8FAFC',
  surface: '#FFFFFF',
  surface2: '#F1F5F9',
  text: '#111827',
  textMuted: '#6B7280',
  border: '#E5E7EB',
  input: '#FFFFFF',
  inputBorder: '#D1D5DB',
  hover: '#F1F5F9',
  overlay: 'rgba(15, 23, 42, 0.4)',
  chartGrid: '#E5E7EB',
  chartText: '#6B7280',
} as const;

export const darkColors = {
  background: '#0B1220',
  surface: '#111827',
  surface2: '#1F2937',
  text: '#F9FAFB',
  textMuted: '#9CA3AF',
  border: '#374151',
  input: '#1F2937',
  inputBorder: '#4B5563',
  hover: '#1F2937',
  overlay: 'rgba(0, 0, 0, 0.6)',
  chartGrid: '#374151',
  chartText: '#9CA3AF',
} as const;

/** Status badge colors — same in light and dark (do not invert). */
export const statusColors = {
  pending: '#F59E0B',
  onProcess: '#3B82F6',
  done: '#10B981',
  cancelled: '#EF4444',
  reminder: '#F97316',
} as const;

export type ThemeColorSet = {
  background: string;
  surface: string;
  surface2: string;
  text: string;
  textMuted: string;
  border: string;
  input: string;
  inputBorder: string;
  hover: string;
  overlay: string;
  chartGrid: string;
  chartText: string;
};
