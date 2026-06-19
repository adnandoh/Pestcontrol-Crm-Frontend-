import React, { useEffect, useRef } from 'react';
import { loadGoogleMapsForTracking } from '../../utils/staffTrackingMap';

export interface MapMarker {
  id: string | number;
  lat: number;
  lng: number;
  title: string;
  color?: string;
}

export interface MapPolyline {
  path: Array<{ lat: number; lng: number }>;
  color?: string;
}

interface StaffTrackingMapProps {
  markers?: MapMarker[];
  polylines?: MapPolyline[];
  height?: string;
  className?: string;
  onMarkerClick?: (marker: MapMarker) => void;
}

const DEFAULT_CENTER = { lat: 18.75, lng: 73.4 };

const StaffTrackingMap: React.FC<StaffTrackingMapProps> = ({
  markers = [],
  polylines = [],
  height = '480px',
  className = '',
  onMarkerClick,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const markerRefs = useRef<google.maps.Marker[]>([]);
  const polylineRefs = useRef<google.maps.Polyline[]>([]);

  useEffect(() => {
    let cancelled = false;

    const init = async () => {
      try {
        await loadGoogleMapsForTracking();
        if (cancelled || !containerRef.current) return;

        if (!mapRef.current) {
          mapRef.current = new google.maps.Map(containerRef.current, {
            center: DEFAULT_CENTER,
            zoom: 11,
            mapTypeControl: false,
            streetViewControl: false,
            fullscreenControl: true,
          });
        }

        markerRefs.current.forEach((m) => m.setMap(null));
        markerRefs.current = [];
        polylineRefs.current.forEach((p) => p.setMap(null));
        polylineRefs.current = [];

        const bounds = new google.maps.LatLngBounds();
        let hasPoints = false;

        markers.forEach((marker) => {
          const position = { lat: marker.lat, lng: marker.lng };
          const gMarker = new google.maps.Marker({
            position,
            map: mapRef.current!,
            title: marker.title,
            icon: {
              path: google.maps.SymbolPath.CIRCLE,
              scale: 10,
              fillColor: marker.color || '#2563eb',
              fillOpacity: 1,
              strokeColor: '#ffffff',
              strokeWeight: 2,
            },
          });
          if (onMarkerClick) {
            gMarker.addListener('click', () => onMarkerClick(marker));
          }
          markerRefs.current.push(gMarker);
          bounds.extend(position);
          hasPoints = true;
        });

        polylines.forEach((line) => {
          if (line.path.length < 2) return;
          const poly = new google.maps.Polyline({
            path: line.path,
            geodesic: true,
            strokeColor: line.color || '#2563eb',
            strokeOpacity: 0.9,
            strokeWeight: 4,
            map: mapRef.current!,
          });
          polylineRefs.current.push(poly);
          line.path.forEach((p) => {
            bounds.extend(p);
            hasPoints = true;
          });
        });

        if (hasPoints) {
          mapRef.current!.fitBounds(bounds, 48);
        } else {
          mapRef.current!.setCenter(DEFAULT_CENTER);
          mapRef.current!.setZoom(11);
        }
      } catch (error) {
        console.error('Staff tracking map error:', error);
      }
    };

    init();
    return () => {
      cancelled = true;
    };
  }, [markers, polylines, onMarkerClick]);

  return (
    <div
      ref={containerRef}
      className={`rounded-xl border border-gray-200 overflow-hidden bg-gray-100 ${className}`}
      style={{ height, minHeight: height }}
    />
  );
};

export default StaffTrackingMap;
