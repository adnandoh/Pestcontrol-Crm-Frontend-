import React from 'react';
import { Calendar } from 'lucide-react';
import {
  DATE_PRESET_OPTIONS,
  type DatePreset,
  type InquiryDateFilterState,
} from '../../utils/inquiryDateFilters';

interface InquiryDateFilterBarProps {
  value: InquiryDateFilterState;
  onChange: (next: InquiryDateFilterState) => void;
  onApply: () => void;
  onClear: () => void;
  loading?: boolean;
}

const InquiryDateFilterBar: React.FC<InquiryDateFilterBarProps> = ({
  value,
  onChange,
  onApply,
  onClear,
  loading = false,
}) => {
  const handlePresetChange = (preset: DatePreset) => {
    if (preset === 'custom') {
      onChange({ ...value, preset });
      return;
    }
    if (!preset) {
      onChange({ preset: '', from: '', to: '' });
      return;
    }
    onChange({ preset, from: '', to: '' });
  };

  return (
    <>
      <div className="w-full sm:w-44">
        <label className="text-[10px] font-extrabold text-gray-500 mb-1 block uppercase tracking-tight">
          Quick Filter
        </label>
        <select
          value={value.preset}
          onChange={(e) => handlePresetChange(e.target.value as DatePreset)}
          className="w-full px-2 py-1 text-xs border border-gray-300 rounded h-8 outline-none bg-white cursor-pointer font-bold text-gray-700"
        >
          {DATE_PRESET_OPTIONS.map((opt) => (
            <option key={opt.value || 'all'} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {(value.preset === 'custom' || value.preset === '') && (
        <>
          <div className="w-full sm:w-36">
            <label className="text-[10px] font-extrabold text-gray-500 mb-1 block uppercase tracking-tight">
              Start Date
            </label>
            <div className="relative">
              <Calendar className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-gray-400 pointer-events-none" />
              <input
                type="date"
                value={value.from}
                onChange={(e) => onChange({ ...value, preset: 'custom', from: e.target.value })}
                className="w-full pl-7 pr-2 py-1 text-xs border border-gray-300 rounded h-8 outline-none bg-white font-bold text-gray-700"
              />
            </div>
          </div>
          <div className="w-full sm:w-36">
            <label className="text-[10px] font-extrabold text-gray-500 mb-1 block uppercase tracking-tight">
              End Date
            </label>
            <div className="relative">
              <Calendar className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-gray-400 pointer-events-none" />
              <input
                type="date"
                value={value.to}
                min={value.from || undefined}
                onChange={(e) => onChange({ ...value, preset: 'custom', to: e.target.value })}
                className="w-full pl-7 pr-2 py-1 text-xs border border-gray-300 rounded h-8 outline-none bg-white font-bold text-gray-700"
              />
            </div>
          </div>
        </>
      )}

      <div className="flex gap-1 h-8 w-full sm:w-auto">
        <button
          type="button"
          onClick={onClear}
          disabled={loading}
          className="flex-1 sm:flex-none px-3 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-[11px] font-bold rounded transition-colors uppercase"
        >
          Clear
        </button>
        <button
          type="button"
          onClick={onApply}
          disabled={loading}
          className="flex-1 sm:flex-none px-3 bg-blue-800 hover:bg-blue-900 disabled:opacity-50 text-white text-[11px] font-bold rounded transition-colors uppercase"
        >
          {loading ? 'Loading…' : 'Apply'}
        </button>
      </div>
    </>
  );
};

export default InquiryDateFilterBar;
