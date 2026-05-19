export {};

declare global {
  namespace google.maps {
    function importLibrary(name: 'places' | string): Promise<unknown>;
  }

  namespace google.maps.places {
    type PlacesServiceStatus = string;

    interface AutocompletePredictionRequest {
      input: string;
      componentRestrictions?: { country: string | string[] };
    }

    interface AutocompletePrediction {
      description: string;
      place_id: string;
      structured_formatting?: {
        main_text: string;
        secondary_text?: string;
      };
    }

    interface PlaceDetailsRequest {
      placeId: string;
      fields?: string[];
    }

    class AutocompleteService {
      getPlacePredictions(
        request: AutocompletePredictionRequest,
        callback: (
          results: AutocompletePrediction[] | null,
          status: PlacesServiceStatus,
        ) => void,
      ): void;
    }

    class PlacesService {
      constructor(attrContainer: HTMLDivElement);
      getDetails(
        request: PlaceDetailsRequest,
        callback: (result: PlaceResult | null, status: PlacesServiceStatus) => void,
      ): void;
    }

    interface PlaceResult {
      formatted_address?: string;
      name?: string;
      address_components?: AddressComponent[];
      geometry?: {
        location?: { lat: () => number; lng: () => number };
      };
    }

    interface AddressComponent {
      long_name: string;
      short_name: string;
      types: string[];
    }
  }

  interface Window {
    google?: {
      maps?: {
        places?: typeof google.maps.places;
        importLibrary?: (name: string) => Promise<unknown>;
      };
    };
  }
}
