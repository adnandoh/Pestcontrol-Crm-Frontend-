import { DEEP_CLEANING_CITIES } from '../constants/deepCleaning';
import { enhancedApiService } from '../services/api.enhanced';

/** Master localities grouped under each Deep Cleaning city. */
export async function loadDeepCleaningLocalities(): Promise<Record<string, string[]>> {
  const grouped: Record<string, string[]> = {};
  for (const city of DEEP_CLEANING_CITIES) grouped[city] = [];

  const page = await enhancedApiService.getCities({ page_size: 500, is_active: true });
  const cities = page.results || [];
  await Promise.all(DEEP_CLEANING_CITIES.map(async (label) => {
    const match = cities.find((city) => city.name.trim().toLowerCase() === label.toLowerCase());
    if (!match) return;
    const locations = await enhancedApiService.getMasterLocations({
      city: match.id,
      is_active: true,
      page_size: 2000,
    });
    grouped[label] = (locations.results || [])
      .map((row) => row.name.trim())
      .filter(Boolean)
      .sort((a, b) => a.localeCompare(b));
  }));
  return grouped;
}
