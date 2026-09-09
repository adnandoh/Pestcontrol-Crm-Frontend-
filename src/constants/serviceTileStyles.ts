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
 * One row per family: its name on the left, its services to the right.
 *
 * The label sat above its tiles before, which cost a line per family, and the
 * families were paired two across so the tiles started at four different
 * horizontal positions depending on how wide the name beside them happened to
 * be. Putting the name in a fixed-width rail leaves the tiles a single
 * consistent area to line up in.
 */
export const SERVICE_PICKER_CARD =
  'rounded-lg border border-gray-200 bg-white p-3.5 sm:p-4 flex flex-col gap-3';

/** One family band. Stacks to label-above-tiles on a narrow screen. */
export const SERVICE_GROUP =
  'flex flex-col sm:flex-row sm:items-start gap-1 sm:gap-3';

export const SERVICE_GROUP_LABEL =
  'w-full shrink-0 text-[11px] font-bold uppercase tracking-wide text-gray-500 sm:w-32 sm:pt-2';

/**
 * Two columns, each capped rather than sharing the row.
 *
 * Free-wrapping tiles gave every row its own edges — the second tile of one
 * family began 7px off the second tile of the next, close enough to aligned to
 * look like a mistake. A grid gives them two positions to sit at.
 *
 * The cap is what keeps the middle tight. Plain `grid-cols-2` is two `1fr`
 * tracks, so the columns absorb the whole row: on a 1600px window that pushed
 * the second column 406px clear of the first. 15rem holds the longest service
 * name ("Mosquito Thermal Fogging", 215px) with room to spare and does not
 * grow with the viewport.
 *
 * `justify-items-start` stops a tile stretching to its track, which is how
 * "Bed Bugs" came out as wide as the longest name. Aligned edges and
 * label-width tiles are not in conflict; they just both have to be asked for.
 *
 * Some gap after a short tile is unavoidable — the track has to fit the
 * longest name in it — but it is now a margin rather than a void.
 */
export const SERVICE_TILE_ROW =
  'grid flex-1 min-w-0 grid-cols-1 sm:grid-cols-[repeat(2,minmax(0,15rem))] justify-items-start gap-x-3 gap-y-2';

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
