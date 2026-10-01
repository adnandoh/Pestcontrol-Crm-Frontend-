import type { GstPricingMode } from '../../utils/jobCardPricing';

interface GstPricingModeFieldProps {
  mode: GstPricingMode;
  onChange: (mode: GstPricingMode) => void;
}

const OPTIONS: { id: GstPricingMode; label: string; hint: string }[] = [
  {
    id: 'GST_INCLUSIVE',
    label: 'GST Inclusive',
    hint: 'GST is already inside the service price. It is not added again.',
  },
  {
    id: 'GST_EXCLUSIVE',
    label: 'GST Exclusive',
    hint: 'GST is added on top of the service price.',
  },
];

export default function GstPricingModeField({ mode, onChange }: GstPricingModeFieldProps) {
  const selected = OPTIONS.find((option) => option.id === mode) || OPTIONS[0];
  return (
    <div>
      <p className="text-[13px] font-bold text-gray-700 mb-1.5">GST Pricing Mode *</p>
      <div className="flex flex-wrap gap-2">
        {OPTIONS.map((option) => {
          const active = option.id === mode;
          return (
            <button
              key={option.id}
              type="button"
              onClick={() => onChange(option.id)}
              className={`h-10 px-4 rounded-lg border text-sm font-bold shadow-sm ${
                active
                  ? 'bg-blue-600 border-blue-600 text-white'
                  : 'bg-white border-gray-300 text-gray-700'
              }`}
            >
              {option.label}
            </button>
          );
        })}
      </div>
      <p className="text-[10px] text-gray-500 mt-1.5">{selected.hint}</p>
    </div>
  );
}
