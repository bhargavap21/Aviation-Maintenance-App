'use client';

import React from 'react';
import { AircraftPosition } from '@/types';
import { Plane, MapPin, Navigation } from 'lucide-react';

interface StaticFlightMapProps {
  aircraftPositions: AircraftPosition[];
  selectedAircraft?: string;
  onAircraftSelect?: (tailNumber: string) => void;
  height?: string;
  showFlightPaths?: boolean;
}

const StaticFlightMap: React.FC<StaticFlightMapProps> = ({ 
  aircraftPositions, 
  selectedAircraft, 
  onAircraftSelect,
  height = '400px',
  showFlightPaths = false 
}) => {
  const getStatusColor = (phase: string) => {
    const colors = {
      'PARKED': 'bg-gray-500',
      'TAXI': 'bg-yellow-500',
      'TAKEOFF': 'bg-green-500',
      'CLIMB': 'bg-blue-500',
      'CRUISE': 'bg-purple-500',
      'DESCENT': 'bg-red-500',
      'APPROACH': 'bg-orange-500',
      'LANDING': 'bg-pink-500',
      'TAXI_IN': 'bg-yellow-500',
      'PREFLIGHT': 'bg-gray-500'
    };
    return colors[phase] || 'bg-gray-500';
  };

  const formatAltitude = (altitude: number) => {
    if (altitude === 0) return 'Ground';
    return `${(altitude / 1000).toFixed(1)}k ft`;
  };

  // Calculate relative positions for aircraft on a grid
  const getGridPosition = (index: number, total: number) => {
    const cols = Math.ceil(Math.sqrt(total));
    const row = Math.floor(index / cols);
    const col = index % cols;
    
    const cellWidth = 100 / cols;
    const cellHeight = 100 / Math.ceil(total / cols);
    
    return {
      left: `${col * cellWidth + cellWidth / 2}%`,
      top: `${row * cellHeight + cellHeight / 2}%`
    };
  };

  return (
    <div style={{ height }} className="relative bg-gradient-to-br from-blue-50 to-green-50 overflow-hidden">
      {/* Background pattern */}
      <div className="absolute inset-0 opacity-10">
        <svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none">
          <defs>
            <pattern id="grid" width="10" height="10" patternUnits="userSpaceOnUse">
              <path d="M 10 0 L 0 0 0 10" fill="none" stroke="#3B82F6" strokeWidth="0.5"/>
            </pattern>
          </defs>
          <rect width="100" height="100" fill="url(#grid)" />
        </svg>
      </div>

      {/* Map Title */}
      <div className="absolute top-4 left-4 bg-white bg-opacity-90 backdrop-blur-sm rounded-lg p-2 shadow-md">
        <div className="flex items-center gap-2">
          <MapPin className="text-blue-600" size={16} />
          <span className="font-semibold text-sm">Fleet Overview</span>
        </div>
      </div>

      {/* Aircraft positions */}
      {aircraftPositions.map((position, index) => {
        const gridPos = getGridPosition(index, aircraftPositions.length);
        const isSelected = selectedAircraft === position.tailNumber;
        
        return (
          <div
            key={position.tailNumber}
            className="absolute transform -translate-x-1/2 -translate-y-1/2 cursor-pointer transition-all duration-200 hover:scale-110"
            style={gridPos}
            onClick={() => onAircraftSelect?.(position.tailNumber)}
          >
            {/* Aircraft Icon */}
            <div 
              className={`relative w-8 h-8 rounded-full flex items-center justify-center shadow-lg border-2 transition-all duration-200 ${
                getStatusColor(position.flightPhase)
              } ${
                isSelected ? 'border-blue-500 scale-125' : 'border-white'
              }`}
              style={{ transform: `rotate(${position.heading}deg)` }}
            >
              <Plane 
                className="text-white" 
                size={16} 
                style={{ transform: `rotate(-${position.heading}deg)` }}
              />
            </div>

            {/* Aircraft Label */}
            <div className={`absolute top-10 left-1/2 transform -translate-x-1/2 bg-white rounded px-2 py-1 shadow-md transition-all duration-200 ${
              isSelected ? 'opacity-100 scale-100' : 'opacity-0 scale-75 group-hover:opacity-100 group-hover:scale-100'
            }`}>
              <div className="text-xs font-semibold text-center">{position.tailNumber}</div>
              <div className="text-xs text-gray-600 text-center">
                {position.flightPhase.replace('_', ' ')}
              </div>
            </div>

            {/* Selection indicator */}
            {isSelected && (
              <div className="absolute -inset-4 border-2 border-blue-500 rounded-full animate-pulse opacity-50"></div>
            )}
          </div>
        );
      })}

      {/* Aircraft Details Panel */}
      {selectedAircraft && (
        <div className="absolute bottom-4 left-4 right-4 bg-white bg-opacity-95 backdrop-blur-sm rounded-lg p-4 shadow-lg">
          {(() => {
            const aircraft = aircraftPositions.find(p => p.tailNumber === selectedAircraft);
            if (!aircraft) return null;

            return (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-lg font-semibold">{aircraft.tailNumber}</h3>
                  <span className={`px-2 py-1 rounded text-xs font-medium text-white ${getStatusColor(aircraft.flightPhase)}`}>
                    {aircraft.flightPhase.replace('_', ' ')}
                  </span>
                </div>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <div className="text-gray-500">Position</div>
                    <div className="font-medium">
                      {aircraft.latitude.toFixed(4)}°, {aircraft.longitude.toFixed(4)}°
                    </div>
                  </div>
                  
                  <div>
                    <div className="text-gray-500">Altitude</div>
                    <div className="font-medium">{formatAltitude(aircraft.altitude)}</div>
                  </div>
                  
                  <div>
                    <div className="text-gray-500">Ground Speed</div>
                    <div className="font-medium">{aircraft.groundSpeed} kts</div>
                  </div>
                  
                  <div>
                    <div className="text-gray-500">Heading</div>
                    <div className="font-medium flex items-center gap-1">
                      <Navigation size={12} style={{ transform: `rotate(${aircraft.heading}deg)` }} />
                      {aircraft.heading}°
                    </div>
                  </div>
                  
                  {aircraft.airport && (
                    <div>
                      <div className="text-gray-500">Airport</div>
                      <div className="font-medium">{aircraft.airport}</div>
                    </div>
                  )}
                  
                  <div>
                    <div className="text-gray-500">Last Seen</div>
                    <div className="font-medium">
                      {new Date(aircraft.lastSeen).toLocaleTimeString()}
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* Empty state */}
      {aircraftPositions.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center text-gray-500">
            <MapPin size={48} className="mx-auto mb-4 opacity-50" />
            <p className="text-lg font-medium">No Aircraft Positions</p>
            <p className="text-sm">Aircraft tracking data will appear here</p>
          </div>
        </div>
      )}

      {/* Compass */}
      <div className="absolute top-4 right-4 w-16 h-16 bg-white bg-opacity-90 backdrop-blur-sm rounded-full shadow-md flex items-center justify-center">
        <div className="relative">
          <Navigation className="text-gray-600" size={24} />
          <div className="absolute -top-2 left-1/2 transform -translate-x-1/2 text-xs font-bold text-red-600">N</div>
        </div>
      </div>
    </div>
  );
};

export default StaticFlightMap; 