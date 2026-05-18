export {};

declare global {
  namespace google.maps.places {
    interface AutocompleteOptions {
      componentRestrictions?: { country: string | string[] };
      fields?: string[];
      types?: string[];
    }

    class Autocomplete {
      constructor(input: HTMLInputElement, opts?: AutocompleteOptions);
      addListener(event: string, handler: () => void): void;
      getPlace(): PlaceResult;
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

  namespace google.maps {
    // eslint-disable-next-line @typescript-eslint/no-namespace
    namespace places {}
  }

  interface Window {
    google?: {
      maps?: {
        places?: typeof google.maps.places;
      };
    };
  }
}
