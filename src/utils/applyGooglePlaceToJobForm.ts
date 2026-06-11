import type { City, JobCardFormData, State } from '../types';
import {
  type GooglePlaceSelection,
  matchMasterCity,
  matchMasterState,
} from './parseGooglePlace';

export async function applyGooglePlaceToJobForm(
  place: GooglePlaceSelection,
  masterStates: State[],
  fetchCitiesForState: (stateId: number) => Promise<City[]>,
): Promise<{ updates: Partial<JobCardFormData>; cities: City[] }> {
  const updates: Partial<JobCardFormData> = {
    client_address: place.client_address,
    full_address: place.full_address,
  };

  let cities: City[] = [];

  const matchedState = matchMasterState(masterStates, place.state);
  if (matchedState) {
    updates.master_state = matchedState.id;
    updates.state = matchedState.name;
    cities = await fetchCitiesForState(matchedState.id);
    const matchedCity = matchMasterCity(cities, place.city);
    if (matchedCity) {
      updates.master_city = matchedCity.id;
      updates.city = matchedCity.name;
    } else if (place.city) {
      updates.city = place.city;
    }
  } else {
    if (place.state) updates.state = place.state;
    if (place.city) updates.city = place.city;
  }

  return { updates, cities };
}
