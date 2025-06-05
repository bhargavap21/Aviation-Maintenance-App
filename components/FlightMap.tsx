'use client';

import React, { useEffect, useRef, useState } from 'react';
import { AircraftPosition, FlightData } from '@/types';
import { Plane, Navigation, MapPin, Loader2 } from 'lucide-react';
import dynamic from 'next/dynamic';

// Import Leaflet types for TypeScript
interface LeafletMap {
  center: [number, number];
  zoom: number;
  style: { height: string; width: string };
  className: string;
  children: React.ReactNode;
}

interface FlightMapProps {
  aircraftPositions: AircraftPosition[];
  selectedAircraft?: string;
  onAircraftSelect?: (tailNumber: string) => void;
  height?: string;
  showFlightPaths?: boolean;
}

// Client-side only map component
const ClientSideMap = dynamic(
  () => import('./LeafletMap').catch(() => import('./StaticFlightMap')), 
  { 
    ssr: false,
    loading: () => (
      <div className="w-full h-full bg-gray-100 flex items-center justify-center">
        <div className="flex flex-col items-center gap-2 text-gray-500">
          <Loader2 className="animate-spin" size={24} />
          <span>Loading map...</span>
        </div>
      </div>
    )
  }
);

const FlightMap: React.FC<FlightMapProps> = ({ 
  aircraftPositions, 
  selectedAircraft, 
  onAircraftSelect,
  height = '400px',
  showFlightPaths = false 
}) => {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  // Show static version during SSR
  if (!isClient) {
    return (
      <div className="relative">
        <div style={{ height }} className="rounded-lg overflow-hidden border border-gray-200 bg-gray-100">
          <div className="w-full h-full flex items-center justify-center">
            <div className="flex flex-col items-center gap-4 text-gray-500">
              <div className="relative">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
                  <MapPin className="text-blue-600" size={32} />
                </div>
                <div className="absolute -top-1 -right-1 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                  <Plane className="text-white" size={12} />
                </div>
              </div>
              <div className="text-center">
                <p className="font-medium">Fleet Map Loading</p>
                <p className="text-sm">{aircraftPositions.length} aircraft tracked</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative">
      <div style={{ height }} className="rounded-lg overflow-hidden border border-gray-200">
        <ClientSideMap
          aircraftPositions={aircraftPositions}
          selectedAircraft={selectedAircraft}
          onAircraftSelect={onAircraftSelect}
          height={height}
          showFlightPaths={showFlightPaths}
        />
      </div>
      
      {/* Aircraft Legend */}
      <div className="absolute top-2 right-2 bg-white bg-opacity-90 backdrop-blur-sm rounded-lg p-3 shadow-md">
        <h3 className="text-sm font-semibold mb-2">Aircraft Status</h3>
        <div className="space-y-1 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-gray-500 rounded-full"></div>
            <span>Parked</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
            <span>Active</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
            <span>In Flight</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-red-500 rounded-full"></div>
            <span>Maintenance</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FlightMap; 