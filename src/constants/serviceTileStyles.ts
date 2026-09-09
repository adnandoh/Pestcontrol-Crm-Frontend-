/**
 * Styling for the multi-select service picker on the booking create/edit forms.
 *
 * Shared because both pages render the same picker, and they had drifted: the
 * tiles used a near-invisible `border-gray-100` while every other control on
 * those forms uses `border-gray-300`, so the picker read as a loose list of
 * borderless labels rather than a field.
 *
 * A tile is a selectable option, not an input, so it is sized to its label
 * rather than to the surrounding form grid — deliberately shorter than the
 * 40px inputs beside it, and only as wide as the service name needs.
 */

/**
 * Families sit two to a row rather than stacked one per row.
 *
 * Stacked, every family owned the full width of the card but only Full
 * Coverage / IPM had enough services to use it — Bed Bugs is one tile against
 * roughly 850px of nothing. Pairing the families fills that width and roughly
 * halves the height, while keeping each family a labelled block of its own.
 *
 * Two columns and no more: at three, the wider families ("Mosquito Cold
 * Fogging" beside "Mosquito Thermal Fogging") no longer fit on one line and
 * wrap, which adds back the height this is meant to save.
 */
export const SERVICE_PICKER_CARD =
  'rounded-lg border border-gray-200 bg-white p-3.5 sm:p-4 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4';

/**
 * `min-w-0` lets the block shrink to its share of the row. Tailwind's
 * `grid-cols-2` already uses `minmax(0, 1fr)`, so this is only guarding the
 * block's own content from pushing past the column it was given.
 */
export const SERVICE_GROUP = 'min-w-0';

export const SERVICE_GROUP_LABEL =
  'mb-2 text-[11px] font-bold uppercase tracking-wide text-gray-500';

/**
 * Tiles wrap and take only the width of their own label.
 *
 * This was a two-column grid, which stretched every tile to the column width:
 * "Bed Bugs" came out as wide as "Mosquito Thermal Fogging", and a family with
 * one service ran the full row. Wrapping sizes each tile to its text and fits
 * as many per row as will go, so the picker is denser and the boxes read as
 * options rather than as empty input fields.
 */
export const SERVICE_TILE_ROW = 'flex flex-wrap gap-x-2.5 gap-y-2';

export const SERVICE_TILE_CHECKBOX =
  'h-4 w-4 shrink-0 rounded border-gray-300 text-blue-600 focus:ring-blue-500';

export function serviceTileClass(checked: boolean): string {
  return [
    // No `shrink`, so a tile keeps its label on one line and moves to the next
    // row instead of squeezing. Flex's default `min-width: auto` handles that.
    'inline-flex min-h-9 items-center gap-2 rounded-lg border px-2.5 py-1.5 cursor-pointer transition-colors',
    checked
      ? 'border-blue-500 bg-blue-50/80 ring-1 ring-blue-200'
      : 'border-gray-300 bg-white hover:border-gray-400 hover:bg-gray-50',
  ].join(' ');
}
