'use client';

import React, { useEffect, useRef, useState } from 'react';
import { AircraftPosition } from '@/types';

interface LeafletMapProps {
  aircraftPositions: AircraftPosition[];
  selectedAircraft?: string;
  onAircraftSelect?: (tailNumber: string) => void;
  height?: string;
  showFlightPaths?: boolean;
}

const LeafletMap: React.FC<LeafletMapProps> = ({ 
  aircraftPositions, 
  selectedAircraft, 
  onAircraftSelect,
  height = '400px',
  showFlightPaths = false 
}) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  // Custom aircraft icon creation
  const createAircraftIcon = (position: AircraftPosition, isSelected: boolean = false) => {
    const L = (window as any).L;
    if (!L) return null;
    
    const statusColors = {
      'PARKED': '#6B7280',      // Gray
      'TAXI': '#F59E0B',        // Amber
      'TAKEOFF': '#10B981',     // Green
      'CLIMB': '#3B82F6',       // Blue
      'CRUISE': '#8B5CF6',      // Purple
      'DESCENT': '#EF4444',     // Red
      'APPROACH': '#F97316',    // Orange
      'LANDING': '#EC4899',     // Pink
      'TAXI_IN': '#F59E0B',     // Amber
      'PREFLIGHT': '#6B7280'    // Gray
    };

    const color = statusColors[position.flightPhase] || '#6B7280';
    const size = isSelected ? 32 : 24;
    const borderColor = isSelected ? '#3B82F6' : '#FFFFFF';

    return L.divIcon({
      html: `
        <div style="
          width: ${size}px; 
          height: ${size}px; 
          background: ${color}; 
          border: 2px solid ${borderColor};
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          transform: rotate(${position.heading}deg);
          box-shadow: 0 2px 8px rgba(0,0,0,0.3);
          position: relative;
        ">
          <svg width="${size * 0.6}" height="${size * 0.6}" viewBox="0 0 24 24" fill="white" style="transform: rotate(-${position.heading}deg);">
            <path d="M20.56 3.44L21 2l-1.44.44L12 7.89l-7.56-5.45L3 2l.44 1.44L10 12l-6.56 8.56L3 22l1.44-.44L12 16.11l7.56 5.45L21 22l-.44-1.44L14 12l6.56-8.56z"/>
          </svg>
        </div>
        <div style="
          position: absolute;
          top: 100%;
          left: 50%;
          transform: translateX(-50%);
          background: white;
          padding: 2px 6px;
          border-radius: 4px;
          font-size: 10px;
          font-weight: 600;
          white-space: nowrap;
          box-shadow: 0 1px 4px rgba(0,0,0,0.2);
          ${isSelected ? 'display: block;' : 'display: none;'}
        ">
          ${position.tailNumber}
        </div>
      `,
      className: 'aircraft-icon',
      iconSize: [size, size],
      iconAnchor: [size/2, size/2],
      popupAnchor: [0, -size/2]
    });
  };

  const formatAltitude = (altitude: number) => {
    if (altitude === 0) return 'Ground';
    return `${(altitude / 1000).toFixed(1)}k ft`;
  };

  // Calculate map center and zoom based on aircraft positions
  const getMapBounds = () => {
    if (aircraftPositions.length === 0) {
      return { center: [39.8283, -98.5795] as [number, number], zoom: 4 }; // Center of US
    }

    const lats = aircraftPositions.map(pos => pos.latitude);
    const lons = aircraftPositions.map(pos => pos.longitude);
    
    const centerLat = (Math.max(...lats) + Math.min(...lats)) / 2;
    const centerLon = (Math.max(...lons) + Math.min(...lons)) / 2;

    // Calculate zoom based on spread of positions
    const latSpread = Math.max(...lats) - Math.min(...lats);
    const lonSpread = Math.max(...lons) - Math.min(...lons);
    const maxSpread = Math.max(latSpread, lonSpread);
    
    let zoom = 4;
    if (maxSpread < 1) zoom = 10;
    else if (maxSpread < 5) zoom = 8;
    else if (maxSpread < 10) zoom = 6;
    else if (maxSpread < 20) zoom = 5;

    return { center: [centerLat, centerLon] as [number, number], zoom };
  };

  const initializeMap = async () => {
    if (!mapRef.current || mapInstanceRef.current) return;

    try {
      // Load Leaflet dynamically
      const L = await import('leaflet');
      
      // Store L globally for icon creation
      (window as any).L = L;

      // Load CSS
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      link.integrity = 'sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=';
      link.crossOrigin = '';
      document.head.appendChild(link);

      // Fix default icon issues
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
        iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
      });

      const bounds = getMapBounds();
      
      // Create map
      mapInstanceRef.current = L.map(mapRef.current).setView(bounds.center, bounds.zoom);

      // Add tile layer
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      }).addTo(mapInstanceRef.current);

      setIsLoaded(true);
    } catch (error) {
      console.error('Failed to initialize map:', error);
    }
  };

  const updateMarkers = () => {
    if (!mapInstanceRef.current || !isLoaded) return;
    
    const L = (window as any).L;
    if (!L) return;

    // Clear existing markers
    markersRef.current.forEach(marker => {
      mapInstanceRef.current.removeLayer(marker);
    });
    markersRef.current = [];

    // Add new markers
    aircraftPositions.forEach((position) => {
      const isSelected = selectedAircraft === position.tailNumber;
      const icon = createAircraftIcon(position, isSelected);
      
      if (!icon) return;
      
      const marker = L.marker([position.latitude, position.longitude], { icon })
        .addTo(mapInstanceRef.current)
        .on('click', () => {
          onAircraftSelect?.(position.tailNumber);
        })
        .bindPopup(`
          <div class="text-sm min-w-48">
            <div class="flex items-center justify-between mb-2">
              <div class="font-semibold text-lg">${position.tailNumber}</div>
              <span class="px-2 py-1 rounded text-xs font-medium ${
                position.isOnGround ? 'bg-gray-100 text-gray-700' : 'bg-blue-100 text-blue-700'
              }">
                ${position.flightPhase.replace('_', ' ')}
              </span>
            </div>
            
            <div class="grid grid-cols-2 gap-2 text-xs">
              <div>
                <div class="text-gray-500">Position</div>
                <div class="font-medium">
                  ${position.latitude.toFixed(4)}°, ${position.longitude.toFixed(4)}°
                </div>
              </div>
              
              <div>
                <div class="text-gray-500">Altitude</div>
                <div class="font-medium">${formatAltitude(position.altitude)}</div>
              </div>
              
              <div>
                <div class="text-gray-500">Speed</div>
                <div class="font-medium">${position.groundSpeed} kts</div>
              </div>
              
              <div>
                <div class="text-gray-500">Heading</div>
                <div class="font-medium">${position.heading}°</div>
              </div>
              
              ${position.airport ? `
                <div class="col-span-2">
                  <div class="text-gray-500">Airport</div>
                  <div class="font-medium">${position.airport}</div>
                </div>
              ` : ''}
              
              <div class="col-span-2">
                <div class="text-gray-500">Last Seen</div>
                <div class="font-medium">
                  ${new Date(position.lastSeen).toLocaleTimeString()}
                </div>
              </div>
            </div>
          </div>
        `);

      markersRef.current.push(marker);
    });
  };

  useEffect(() => {
    initializeMap();
    
    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (isLoaded) {
      updateMarkers();
    }
  }, [aircraftPositions, selectedAircraft, isLoaded]);

  return (
    <div 
      ref={mapRef} 
      style={{ height: '100%', width: '100%' }}
      className="z-0"
    />
  );
};

export default LeafletMap; 