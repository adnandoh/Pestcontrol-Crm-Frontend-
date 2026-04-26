import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Clock } from 'lucide-react';

interface ClockTimePickerProps {
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  className?: string;
}

const HOURS = [12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
const MINS  = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];
const R  = 74;
const CX = 100;

function numCoords(idx: number, r: number) {
  const angle = ((idx / 12) * 360 - 90) * (Math.PI / 180);
  return { x: Math.cos(angle) * r, y: Math.sin(angle) * r };
}

function parseTime(val: string) {
  if (val) {
    const m = val.match(/(\d+):(\d+)\s*(AM|PM)/i);
    if (m) return { h: parseInt(m[1]), min: parseInt(m[2]), ampm: m[3].toUpperCase() as 'AM' | 'PM' };
  }
  return { h: 10, min: 0, ampm: 'AM' as 'AM' | 'PM' };
}

const ClockTimePicker: React.FC<ClockTimePickerProps> = ({
  value, onChange, placeholder = 'Select Time', className = '',
}) => {
  const [open, setOpen]   = useState(false);
  const [mode, setMode]   = useState<'hour' | 'minute'>('hour');
  const { h: ph, min: pm, ampm: pa } = parseTime(value);
  const [hour,   setHour]  = useState(ph);
  const [minute, setMin]   = useState(pm);
  const [ampm,   setAmpm]  = useState<'AM' | 'PM'>(pa);
  const [openUp, setOpenUp] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popupRef   = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        triggerRef.current && !triggerRef.current.contains(e.target as Node) &&
        popupRef.current   && !popupRef.current.contains(e.target as Node)
      ) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => {
    const { h, min, ampm } = parseTime(value);
    setHour(h); setMin(min); setAmpm(ampm);
  }, [value]);

  const openPicker = () => {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setOpenUp(window.innerHeight - rect.bottom < 440);
    }
    setMode('hour');
    setOpen(o => !o);
  };

  const confirm = useCallback(() => {
    onChange(`${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')} ${ampm}`);
    setOpen(false);
  }, [hour, minute, ampm, onChange]);

  const items   = mode === 'hour' ? HOURS : MINS;
  const selItem = mode === 'hour' ? hour  : minute;
  const selIdx  = items.indexOf(selItem);
  const { x: hx, y: hy } = selIdx >= 0 ? numCoords(selIdx, R) : { x: 0, y: 0 };

  return (
    <div className={`relative ${className}`}>
      {/* ── Trigger ── */}
      <button
        ref={triggerRef}
        type="button"
        onClick={openPicker}
        className="w-full h-10 px-3 flex items-center gap-2 text-xs font-bold border border-gray-200 rounded-lg outline-none bg-white shadow-sm hover:border-blue-400 transition-colors"
      >
        <Clock className="h-3.5 w-3.5 text-blue-500 flex-shrink-0" />
        <span className={value ? 'text-gray-800' : 'text-gray-400'}>{value || placeholder}</span>
      </button>

      {/* ── Popup ── */}
      {open && (
        <div
          ref={popupRef}
          className={`absolute z-[9999] bg-white rounded-2xl border border-gray-100 w-[280px] ${openUp ? 'bottom-12' : 'top-12'} left-0`}
          style={{ boxShadow: '0 12px 48px rgba(0,0,0,0.22)' }}
        >
          {/* ─── Header: time display ─── */}
          <div className="bg-blue-600 rounded-t-2xl px-4 py-3">
            {/* Row 1: HH : MM big display */}
            <div className="flex items-center justify-center gap-1 mb-3">
              <button
                type="button"
                onClick={() => setMode('hour')}
                className={`text-5xl font-black leading-none tracking-tight transition-opacity ${mode === 'hour' ? 'text-white' : 'text-blue-300 hover:text-blue-100'}`}
              >
                {String(hour).padStart(2, '0')}
              </button>
              <span className="text-4xl font-black text-blue-300 leading-none">:</span>
              <button
                type="button"
                onClick={() => setMode('minute')}
                className={`text-5xl font-black leading-none tracking-tight transition-opacity ${mode === 'minute' ? 'text-white' : 'text-blue-300 hover:text-blue-100'}`}
              >
                {String(minute).padStart(2, '0')}
              </button>
            </div>

            {/* Row 2: AM / PM toggle pills */}
            <div className="flex items-center justify-center gap-2">
              <button
                type="button"
                onClick={() => setAmpm('AM')}
                className={`px-5 py-1 rounded-full text-sm font-black tracking-widest uppercase transition-all border-2 ${
                  ampm === 'AM'
                    ? 'bg-white text-blue-600 border-white'
                    : 'bg-transparent text-blue-200 border-blue-400 hover:border-white hover:text-white'
                }`}
              >
                AM
              </button>
              <button
                type="button"
                onClick={() => setAmpm('PM')}
                className={`px-5 py-1 rounded-full text-sm font-black tracking-widest uppercase transition-all border-2 ${
                  ampm === 'PM'
                    ? 'bg-white text-blue-600 border-white'
                    : 'bg-transparent text-blue-200 border-blue-400 hover:border-white hover:text-white'
                }`}
              >
                PM
              </button>
            </div>
          </div>

          {/* ─── Clock Face ─── */}
          <div className="flex justify-center items-center py-3 bg-gray-50">
            <svg width={200} height={200} viewBox="0 0 200 200" className="select-none">
              <circle cx={CX} cy={CX} r={96} fill="#DBEAFE" />
              {selIdx >= 0 && (
                <>
                  <line x1={CX} y1={CX} x2={CX + hx} y2={CX + hy}
                    stroke="#1D4ED8" strokeWidth={2.5} strokeLinecap="round" />
                  <circle cx={CX} cy={CX} r={4} fill="#1D4ED8" />
                </>
              )}
              {items.map((num, idx) => {
                const { x, y } = numCoords(idx, R);
                const active = num === selItem;
                return (
                  <g
                    key={num}
                    className="cursor-pointer"
                    onClick={() => {
                      if (mode === 'hour') { setHour(num); setTimeout(() => setMode('minute'), 200); }
                      else { setMin(num); }
                    }}
                  >
                    <circle cx={CX + x} cy={CX + y} r={17} fill={active ? '#1D4ED8' : 'transparent'} />
                    <text
                      x={CX + x} y={CX + y}
                      textAnchor="middle" dominantBaseline="central"
                      fontSize={mode === 'minute' ? '11' : '13'}
                      fontWeight="800"
                      fill={active ? 'white' : '#1e3a5f'}
                    >
                      {mode === 'minute' ? String(num).padStart(2, '0') : num}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>

          {/* ─── Step hint ─── */}
          <p className="text-center text-[10px] font-bold text-gray-400 uppercase tracking-widest -mt-2 mb-2">
            {mode === 'hour' ? 'Tap to select hour' : 'Tap to select minute'}
          </p>

          {/* ─── Footer Buttons ─── */}
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 rounded-b-2xl bg-white">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="text-xs font-bold text-gray-400 hover:text-gray-600 uppercase tracking-wide px-3 py-1.5 rounded-lg hover:bg-gray-100 transition-colors"
            >
              Cancel
            </button>
            <div className="flex gap-2 items-center">
              {mode === 'minute' && (
                <button
                  type="button"
                  onClick={() => setMode('hour')}
                  className="text-xs font-bold text-blue-500 hover:text-blue-700 uppercase tracking-wide px-3 py-1.5 rounded-lg hover:bg-blue-50 transition-colors"
                >
                  ← Hour
                </button>
              )}
              <button
                type="button"
                onClick={confirm}
                className="text-xs font-black text-white bg-blue-600 hover:bg-blue-700 uppercase tracking-wide px-6 py-1.5 rounded-lg transition-colors shadow"
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClockTimePicker;
