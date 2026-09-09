/**
 * Styling for the multi-select service picker on the booking create/edit forms.
 *
 * Shared because both pages render the same grid, and they had drifted: the
 * tiles used a near-invisible `border-gray-100` and an 8px gap while every
 * other control on those forms uses `border-gray-300` and a 16px gap, so the
 * picker read as a cramped list of borderless labels rather than a field.
 *
 * Tiles are 40px tall to match the inputs and selects around them, but grow
 * rather than clip when a long service name wraps on a narrow screen.
 */

/**
 * `divide-y` draws the rule between families only, so the group padding below
 * can stay symmetrical without doubling up against a container gap.
 */
export const SERVICE_PICKER_CARD =
  'rounded-lg border border-gray-200 bg-white p-4 sm:p-5 flex flex-col divide-y divide-gray-100';

export const SERVICE_GROUP = 'py-5 first:pt-0 last:pb-0';

export const SERVICE_GROUP_LABEL =
  'mb-2.5 text-[11px] font-bold uppercase tracking-wide text-gray-500';

/** Column gap matches FIELD_GRID; rows sit tighter since tiles are one line. */
export const SERVICE_TILE_GRID =
  'grid grid-cols-1 sm:grid-cols-2 gap-x-4 lg:gap-x-5 gap-y-3';

export const SERVICE_TILE_CHECKBOX =
  'h-4 w-4 shrink-0 rounded border-gray-300 text-blue-600 focus:ring-blue-500';

export function serviceTileClass(checked: boolean): string {
  return [
    'flex min-h-10 items-center gap-2.5 rounded-lg border px-3 py-2 cursor-pointer transition-colors',
    checked
      ? 'border-blue-500 bg-blue-50/80 ring-1 ring-blue-200'
      : 'border-gray-300 bg-white hover:border-gray-400 hover:bg-gray-50',
  ].join(' ');
}
