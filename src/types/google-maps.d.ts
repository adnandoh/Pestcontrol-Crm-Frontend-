export {};

declare global {
  namespace google.maps {
    function importLibrary(name: 'places' | string): Promise<unknown>;

    class Map {
      constructor(mapDiv: HTMLElement, opts?: MapOptions);
      fitBounds(bounds: LatLngBounds, padding?: number): void;
      setCenter(latLng: LatLngLiteral): void;
      setZoom(zoom: number): void;
    }

    class Marker {
      constructor(opts?: MarkerOptions);
      setMap(map: Map | null): void;
      addListener(eventName: string, handler: () => void): void;
    }

    class Polyline {
      constructor(opts?: PolylineOptions);
      setMap(map: Map | null): void;
    }

    class LatLngBounds {
      constructor();
      extend(latLng: LatLngLiteral): void;
    }

    enum SymbolPath {
      CIRCLE = 0,
    }

    interface MapOptions {
      center?: LatLngLiteral;
      zoom?: number;
      mapTypeControl?: boolean;
      streetViewControl?: boolean;
      fullscreenControl?: boolean;
    }

    interface MarkerOptions {
      position?: LatLngLiteral;
      map?: Map;
      title?: string;
      icon?: MarkerIcon;
    }

    interface MarkerIcon {
      path?: SymbolPath | string;
      scale?: number;
      fillColor?: string;
      fillOpacity?: number;
      strokeColor?: string;
      strokeWeight?: number;
    }

    interface PolylineOptions {
      path?: LatLngLiteral[];
      geodesic?: boolean;
      strokeColor?: string;
      strokeOpacity?: number;
      strokeWeight?: number;
      map?: Map;
    }

    interface LatLngLiteral {
      lat: number;
      lng: number;
    }
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
        Map?: typeof google.maps.Map;
        Marker?: typeof google.maps.Marker;
        Polyline?: typeof google.maps.Polyline;
        LatLngBounds?: typeof google.maps.LatLngBounds;
        SymbolPath?: typeof google.maps.SymbolPath;
        places?: typeof google.maps.places;
        importLibrary?: (name: string) => Promise<unknown>;
      };
    };
  }
}
