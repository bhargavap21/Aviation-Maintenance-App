import { FlightData, AircraftPosition, FlightHistory } from '@/types';

// OpenSky Network API integration (free tier)
const OPENSKY_BASE_URL = 'https://opensky-network.org/api';

// FlightAware API integration (commercial - requires API key)
const FLIGHTAWARE_BASE_URL = 'https://aeroapi.flightaware.com/aeroapi';

export interface FlightTrackingConfig {
  provider: 'OPENSKY' | 'FLIGHTAWARE' | 'MOCK';
  apiKey?: string;
  updateInterval: number; // seconds
  enabledFeatures: {
    realTimeTracking: boolean;
    flightHistory: boolean;
    alertGeneration: boolean;
  };
}

// Mock data for demonstration
const MOCK_FLIGHT_DATA: FlightData[] = [
  {
    id: '1',
    aircraftId: 'n123ab',
    tailNumber: 'N123AB',
    callsign: 'GAC123',
    squawk: '1200',
    latitude: 40.7580,
    longitude: -73.8004, // KJFK area - Available for dispatch
    altitude: 0,
    groundSpeed: 0,
    track: 270,
    verticalRate: 0,
    isOnGround: true,
    lastContact: new Date(),
    flightStatus: 'AVAILABLE',
    departureAirport: 'KJFK',
    arrivalAirport: null,
    estimatedDeparture: null,
    engineRunTime: 0,
    blockTime: 0,
    flightTime: 0,
    cycles: 0,
    dataSource: 'MOCK',
    lastUpdated: new Date()
  },
  {
    id: '2',
    aircraftId: 'n456cd',
    tailNumber: 'N456CD',
    callsign: 'MAINT',
    squawk: '1200',
    latitude: 41.9742,
    longitude: -87.9073, // KORD area - In maintenance hangar
    altitude: 0,
    groundSpeed: 0,
    track: 0,
    verticalRate: 0,
    isOnGround: true,
    lastContact: new Date(),
    flightStatus: 'MAINTENANCE',
    arrivalAirport: 'KORD',
    actualArrival: new Date('2024-01-25T08:00:00Z'),
    engineRunTime: 0,
    blockTime: 0,
    flightTime: 0,
    cycles: 0,
    dataSource: 'MOCK',
    lastUpdated: new Date()
  },
  {
    id: '3',
    aircraftId: 'n789xy',
    tailNumber: 'N789XY',
    callsign: 'GAC789',
    squawk: '1200',
    latitude: 34.0522,
    longitude: -118.2437, // Near KLAX - In flight
    altitude: 37000,
    groundSpeed: 485,
    track: 90, // Eastbound
    verticalRate: 0,
    isOnGround: false,
    lastContact: new Date(),
    flightStatus: 'ACTIVE',
    departureAirport: 'KLAX',
    arrivalAirport: 'KJFK',
    actualDeparture: new Date(Date.now() - 2.5 * 60 * 60 * 1000), // 2.5 hours ago
    estimatedArrival: new Date(Date.now() + 3 * 60 * 60 * 1000), // 3 hours from now
    engineRunTime: 150, // 2.5 hours
    blockTime: 150,
    flightTime: 145,
    cycles: 1,
    dataSource: 'MOCK',
    lastUpdated: new Date()
  }
];

// OpenSky Network API functions
export class FlightTrackingService {
  private config: FlightTrackingConfig;
  private updateTimers: Map<string, NodeJS.Timeout> = new Map();

  constructor(config: FlightTrackingConfig) {
    this.config = config;
  }

  // Get real-time flight data for a specific aircraft
  async getAircraftFlightData(icaoAddress: string): Promise<FlightData | null> {
    if (this.config.provider === 'MOCK') {
      // Return mock data for demonstration
      return MOCK_FLIGHT_DATA.find(flight => 
        flight.tailNumber.toLowerCase().includes(icaoAddress.toLowerCase())
      ) || null;
    }

    try {
      if (this.config.provider === 'OPENSKY') {
        return await this.getOpenSkyFlightData(icaoAddress);
      } else if (this.config.provider === 'FLIGHTAWARE') {
        return await this.getFlightAwareData(icaoAddress);
      }
    } catch (error) {
      console.error('Error fetching flight data:', error);
      return null;
    }

    return null;
  }

  // Get all aircraft positions for fleet
  async getFleetPositions(tailNumbers: string[]): Promise<AircraftPosition[]> {
    if (this.config.provider === 'MOCK') {
      return MOCK_FLIGHT_DATA.map(flight => ({
        tailNumber: flight.tailNumber,
        latitude: flight.latitude,
        longitude: flight.longitude,
        altitude: flight.altitude,
        heading: flight.track,
        groundSpeed: flight.groundSpeed,
        isOnGround: flight.isOnGround,
        lastSeen: flight.lastContact,
        airport: flight.isOnGround ? (flight.arrivalAirport || flight.departureAirport) : undefined,
        flightPhase: this.determineFlightPhase(flight)
      }));
    }

    const positions: AircraftPosition[] = [];
    
    for (const tailNumber of tailNumbers) {
      try {
        const flightData = await this.getAircraftFlightData(tailNumber);
        if (flightData) {
          positions.push({
            tailNumber: flightData.tailNumber,
            latitude: flightData.latitude,
            longitude: flightData.longitude,
            altitude: flightData.altitude,
            heading: flightData.track,
            groundSpeed: flightData.groundSpeed,
            isOnGround: flightData.isOnGround,
            lastSeen: flightData.lastContact,
            airport: flightData.isOnGround ? (flightData.arrivalAirport || flightData.departureAirport) : undefined,
            flightPhase: this.determineFlightPhase(flightData)
          });
        }
      } catch (error) {
        console.error(`Error fetching position for ${tailNumber}:`, error);
      }
    }

    return positions;
  }

  // OpenSky Network API implementation
  private async getOpenSkyFlightData(icaoAddress: string): Promise<FlightData | null> {
    const url = `${OPENSKY_BASE_URL}/states/all?icao24=${icaoAddress.toLowerCase()}`;
    
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`OpenSky API error: ${response.status}`);
    }

    const data = await response.json();
    if (!data.states || data.states.length === 0) {
      return null;
    }

    const state = data.states[0];
    
    return {
      id: `opensky-${icaoAddress}-${Date.now()}`,
      aircraftId: icaoAddress,
      tailNumber: state[1] || icaoAddress, // callsign or icao if no callsign
      callsign: state[1],
      squawk: state[14],
      latitude: state[6] || 0,
      longitude: state[5] || 0,
      altitude: state[7] ? Math.round(state[7] * 3.28084) : 0, // convert meters to feet
      groundSpeed: state[9] ? Math.round(state[9] * 1.94384) : 0, // convert m/s to knots
      track: state[10] || 0,
      verticalRate: state[11] ? Math.round(state[11] * 196.85) : 0, // convert m/s to ft/min
      isOnGround: state[8] || false,
      lastContact: new Date(state[3] * 1000), // convert unix timestamp
      flightStatus: state[8] ? 'LANDED' : 'ACTIVE',
      dataSource: 'OPENSKY',
      lastUpdated: new Date()
    };
  }

  // FlightAware API implementation (requires API key)
  private async getFlightAwareData(tailNumber: string): Promise<FlightData | null> {
    if (!this.config.apiKey) {
      throw new Error('FlightAware API key required');
    }

    const url = `${FLIGHTAWARE_BASE_URL}/flights/${tailNumber}`;
    
    const response = await fetch(url, {
      headers: {
        'x-apikey': this.config.apiKey
      }
    });

    if (!response.ok) {
      throw new Error(`FlightAware API error: ${response.status}`);
    }

    const data = await response.json();
    // Implementation would depend on FlightAware's response format
    // This is a simplified example
    
    return {
      id: `flightaware-${tailNumber}-${Date.now()}`,
      aircraftId: tailNumber,
      tailNumber: tailNumber,
      latitude: data.latitude || 0,
      longitude: data.longitude || 0,
      altitude: data.altitude || 0,
      groundSpeed: data.groundspeed || 0,
      track: data.heading || 0,
      verticalRate: data.vertical_rate || 0,
      isOnGround: data.on_ground || false,
      lastContact: new Date(data.last_position),
      flightStatus: data.status || 'ACTIVE',
      dataSource: 'FLIGHTAWARE',
      lastUpdated: new Date()
    };
  }

  // Determine flight phase based on flight data
  private determineFlightPhase(flight: FlightData): AircraftPosition['flightPhase'] {
    if (flight.isOnGround) {
      if (flight.groundSpeed > 10) {
        return 'TAXI';
      }
      return 'PARKED';
    }

    if (flight.altitude < 1000) {
      if (flight.verticalRate > 500) {
        return 'TAKEOFF';
      } else if (flight.verticalRate < -500) {
        return 'LANDING';
      }
      return 'APPROACH';
    }

    if (flight.verticalRate > 1000) {
      return 'CLIMB';
    } else if (flight.verticalRate < -1000) {
      return 'DESCENT';
    }

    return 'CRUISE';
  }

  // Start real-time tracking for fleet
  startFleetTracking(aircraftList: Array<{ tailNumber: string; icaoAddress?: string }>) {
    aircraftList.forEach(aircraft => {
      if (this.updateTimers.has(aircraft.tailNumber)) {
        return; // Already tracking
      }

      const timer = setInterval(async () => {
        try {
          const flightData = await this.getAircraftFlightData(aircraft.icaoAddress || aircraft.tailNumber);
          if (flightData) {
            // Emit event or call callback with updated data
            this.onFlightDataUpdate(flightData);
          }
        } catch (error) {
          console.error(`Error updating flight data for ${aircraft.tailNumber}:`, error);
        }
      }, this.config.updateInterval * 1000);

      this.updateTimers.set(aircraft.tailNumber, timer);
    });
  }

  // Stop tracking for a specific aircraft
  stopAircraftTracking(tailNumber: string) {
    const timer = this.updateTimers.get(tailNumber);
    if (timer) {
      clearInterval(timer);
      this.updateTimers.delete(tailNumber);
    }
  }

  // Stop all tracking
  stopAllTracking() {
    this.updateTimers.forEach(timer => clearInterval(timer));
    this.updateTimers.clear();
  }

  // Callback for when flight data is updated
  private onFlightDataUpdate(flightData: FlightData) {
    // This would typically emit an event or call a callback
    // For now, we'll just log it
    console.log(`Flight data updated for ${flightData.tailNumber}:`, {
      position: `${flightData.latitude}, ${flightData.longitude}`,
      altitude: flightData.altitude,
      status: flightData.flightStatus
    });
  }

  // Calculate maintenance-relevant metrics from flight data
  calculateMaintenanceMetrics(flightHistory: FlightHistory[]): {
    totalFlightTime: number;
    totalCycles: number;
    averageFlightTime: number;
    utilizationRate: number; // hours per day
  } {
    const totalFlightTime = flightHistory.reduce((sum, flight) => sum + flight.flightTime, 0) / 60; // convert to hours
    const totalCycles = flightHistory.reduce((sum, flight) => sum + flight.cycles, 0);
    const averageFlightTime = flightHistory.length > 0 ? totalFlightTime / flightHistory.length : 0;
    
    // Calculate utilization rate (flight hours per day) over last 30 days
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const recentFlights = flightHistory.filter(flight => flight.flightDate >= thirtyDaysAgo);
    const recentFlightTime = recentFlights.reduce((sum, flight) => sum + flight.flightTime, 0) / 60;
    const utilizationRate = recentFlightTime / 30;

    return {
      totalFlightTime,
      totalCycles,
      averageFlightTime,
      utilizationRate
    };
  }
}

// Utility functions for flight data processing
export function convertKnotsToMph(knots: number): number {
  return knots * 1.15078;
}

export function convertFeetToMeters(feet: number): number {
  return feet * 0.3048;
}

export function formatPosition(lat: number, lon: number): string {
  const latDir = lat >= 0 ? 'N' : 'S';
  const lonDir = lon >= 0 ? 'E' : 'W';
  return `${Math.abs(lat).toFixed(4)}°${latDir}, ${Math.abs(lon).toFixed(4)}°${lonDir}`;
}

export function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 3440.065; // Nautical miles (Earth's radius)
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c; // Distance in nautical miles
}

// Export default configuration
export const defaultFlightTrackingConfig: FlightTrackingConfig = {
  provider: 'MOCK', // Start with mock data for development
  updateInterval: 30, // 30 seconds
  enabledFeatures: {
    realTimeTracking: true,
    flightHistory: true,
    alertGeneration: true
  }
}; 