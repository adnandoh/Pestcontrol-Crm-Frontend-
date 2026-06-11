import { MapPin } from 'lucide-react';
import { cn } from '../../utils/cn';

/** Build a multi-line tooltip from location-related fields (deduped). */
export function buildLocationTooltip(
  ...parts: (string | null | undefined)[]
): string {
  const seen = new Set<string>();
  const lines: string[] = [];
  for (const raw of parts) {
    const text = raw?.trim();
    if (!text || seen.has(text.toLowerCase())) continue;
    seen.add(text.toLowerCase());
    lines.push(text);
  }
  return lines.join('\n');
}

/** Pull property address from website quote message when present. */
export function propertyAddressFromMessage(message?: string | null): string | undefined {
  if (!message?.trim()) return undefined;
  const match = message.match(
    /Property address:\s*(.+?)(?:\s*\.{1,2}\s*Customer|\s*Customer requested)/i,
  );
  return match?.[1]?.trim();
}

type LocationCellProps = {
  primary: string;
  secondary?: string;
  tooltip: string;
  className?: string;
};

export function LocationCell({
  primary,
  secondary,
  tooltip,
  className,
}: LocationCellProps) {
  if (!primary && !secondary) {
    return <p className="text-xs text-slate-400">—</p>;
  }

  const fullTooltip = tooltip.trim() || primary || secondary || '';

  return (
    <div
      className={cn('flex gap-2 min-w-0 max-w-[220px] cursor-help', className)}
      title={fullTooltip || undefined}
    >
      <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0 mt-0.5" />
      <div className="min-w-0">
        {primary ? (
          <p className="text-xs text-slate-700 line-clamp-2 leading-snug">{primary}</p>
        ) : null}
        {secondary ? (
          <p className="text-[10px] text-slate-400 mt-0.5 truncate">{secondary}</p>
        ) : null}
      </div>
    </div>
  );
}
