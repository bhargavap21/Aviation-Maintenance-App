# Real-World Flight Tracking Integration

## Overview

This implementation integrates real-world flight data pipelines into the Gander Maintenance App, providing live aircraft tracking, flight data analysis, and maintenance correlation. The system supports multiple data sources and provides a comprehensive view of fleet operations.

## Architecture

### Data Sources

1. **OpenSky Network API** (Free Tier)
   - 4,000 requests/day limit
   - Global ADS-B/Mode S/FLARM data
   - Real-time aircraft positions
   - No API key required (basic), authentication available for higher limits

2. **FlightAware AeroAPI** (Commercial)
   - Premium flight tracking data
   - Historical flight data
   - Enhanced metadata (airports, routes, times)
   - Requires API key ($0.0025-$0.015 per query)

3. **Mock Data Provider** (Development)
   - Simulated flight data for testing
   - No external API dependencies
   - Realistic G550 operational scenarios

### Core Components

```
├── lib/flight-tracking.ts          # Main flight tracking service
├── components/FlightMap.tsx        # Interactive map component
├── app/api/flight-data/route.ts    # API endpoints
├── types/index.ts                  # TypeScript interfaces
└── docs/                          # Documentation
```

## Features

### Real-Time Aircraft Tracking
- Live position updates every 30 seconds
- Aircraft altitude, speed, heading, and flight phase
- Ground/airborne status detection
- Airport identification for ground aircraft

### Interactive Map Display
- Visual aircraft positions with directional indicators
- Color-coded flight status (parked, taxi, in-flight, etc.)
- Click-to-select aircraft details
- Real-time position updates

### Maintenance Integration
- Engine runtime calculation from flight data
- Automatic flight hour tracking
- Cycle counting (takeoffs/landings)
- Maintenance alerts based on flight operations

### Flight History Analysis
- Flight time and block time tracking
- Route analysis and performance metrics
- Fuel consumption correlation
- Utilization rate calculations

## Setup Instructions

### 1. Environment Configuration

Add to your `.env.local`:

```env
# Flight Tracking Provider (MOCK, OPENSKY, FLIGHTAWARE)
FLIGHT_TRACKING_PROVIDER=MOCK

# Update interval in seconds
FLIGHT_TRACKING_UPDATE_INTERVAL=30

# OpenSky Network (optional, for higher rate limits)
OPENSKY_API_USERNAME=your_username
OPENSKY_API_PASSWORD=your_password

# FlightAware AeroAPI (commercial)
FLIGHTAWARE_API_KEY=your_api_key

# Features to enable
FLIGHT_TRACKING_FEATURES=realTimeTracking,flightHistory,alertGeneration
```

### 2. Aircraft Configuration

Each aircraft needs ADS-B identification:

```typescript
const aircraftConfig = [
  {
    tailNumber: 'N123AB',
    icaoAddress: 'A12345',  // 24-bit ICAO aircraft address
    modeS: 'A12345',        // Mode S transponder code
    make: 'Gulfstream',
    model: 'G550'
  }
];
```

### 3. API Endpoints

The system provides RESTful endpoints:

#### GET `/api/flight-data`

**Fleet Positions:**
```
GET /api/flight-data?action=fleet-positions&tailNumbers=N123AB,N456CD,N789XY
```

**Individual Aircraft:**
```
GET /api/flight-data?action=aircraft-data&tailNumber=N123AB
```

**Flight History:**
```
GET /api/flight-data?action=flight-history&tailNumber=N123AB&days=30
```

#### POST `/api/flight-data`

**Start Tracking:**
```json
{
  "action": "start-tracking",
  "aircraft": [
    {"tailNumber": "N123AB", "icaoAddress": "A12345"}
  ]
}
```

**Manual Update:**
```json
{
  "action": "manual-update",
  "tailNumber": "N123AB"
}
```

## Implementation Details

### FlightTrackingService Class

```typescript
import { FlightTrackingService, defaultFlightTrackingConfig } from '@/lib/flight-tracking';

const flightService = new FlightTrackingService({
  provider: 'OPENSKY', // or 'FLIGHTAWARE', 'MOCK'
  apiKey: process.env.FLIGHTAWARE_API_KEY,
  updateInterval: 30,
  enabledFeatures: {
    realTimeTracking: true,
    flightHistory: true,
    alertGeneration: true
  }
});

// Get current positions
const positions = await flightService.getFleetPositions(['N123AB', 'N456CD']);

// Start real-time tracking
flightService.startFleetTracking([
  { tailNumber: 'N123AB', icaoAddress: 'A12345' }
]);
```

### React Integration

```typescript
import FlightMap from '@/components/FlightMap';
import { useState, useEffect } from 'react';

function Dashboard() {
  const [fleetPositions, setFleetPositions] = useState([]);
  
  useEffect(() => {
    const fetchPositions = async () => {
      const response = await fetch('/api/flight-data?action=fleet-positions');
      const data = await response.json();
      setFleetPositions(data.data);
    };
    
    fetchPositions();
    const interval = setInterval(fetchPositions, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <FlightMap
      aircraftPositions={fleetPositions}
      onAircraftSelect={(tail) => console.log(`Selected ${tail}`)}
      height="400px"
    />
  );
}
```

## API Provider Setup

### OpenSky Network (Free)

1. Register at https://opensky-network.org/
2. No API key required for basic usage
3. Optional: Create account for authentication (higher rate limits)
4. Rate limits: 4,000 requests/day, 100 requests/hour

### FlightAware AeroAPI (Commercial)

1. Register at https://flightaware.com/commercial/aeroapi/
2. Obtain API key from dashboard
3. Pricing: $0.0025-$0.015 per query
4. Features: Historical data, enhanced metadata, higher reliability

### ADS-B Exchange (Free Alternative)

1. API available at https://www.adsbexchange.com/data/
2. Rate-limited but free
3. Good alternative to OpenSky

## Maintenance Correlation

### Flight Time Integration

The system automatically correlates flight data with maintenance requirements:

```typescript
// Engine hours calculation
const flightData = await flightService.getAircraftFlightData('N123AB');
const engineHours = flightData.engineRunTime / 60; // Convert minutes to hours

// Update maintenance intervals
await updateMaintenanceHours(aircraftId, engineHours);
```

### Automated Alerts

```typescript
// Check for maintenance due based on flight hours
if (currentFlightHours >= nextMaintenanceDue) {
  await createMaintenanceAlert({
    aircraftId,
    type: 'MAINTENANCE_DUE',
    message: `A-Check due: ${currentFlightHours - nextMaintenanceDue} hours overdue`,
    priority: 'HIGH'
  });
}
```

## Data Flow

1. **Real-time Updates:** Every 30 seconds, fetch latest positions
2. **Position Processing:** Convert lat/lng to map coordinates
3. **Flight Phase Detection:** Determine taxi, takeoff, cruise, landing
4. **Maintenance Correlation:** Update engine hours and cycles
5. **Alert Generation:** Check for maintenance due conditions
6. **UI Updates:** Refresh map and status displays

## Map Component Features

### Aircraft Visualization
- Aircraft icons rotate to show heading
- Color coding by flight phase:
  - Gray: Parked/Preflight
  - Amber: Taxi
  - Green: Takeoff
  - Blue: Climb/Cruise
  - Red: Descent
  - Orange: Approach/Landing

### Interactive Features
- Click aircraft for detailed information
- Real-time position updates
- Flight status tooltips
- Airport identification

## Performance Considerations

### Rate Limiting
- OpenSky: 4,000 requests/day limit
- Implement request queuing for multiple aircraft
- Cache responses for 30-60 seconds

### Data Efficiency
- Only fetch data for active aircraft
- Use batch requests when possible
- Implement fallback to cached data

### Real-time Updates
- WebSocket connection for live updates (future enhancement)
- Server-sent events for position streams
- Configurable update intervals

## Testing

### Mock Data Provider
For development and testing, use the mock provider:

```typescript
const mockConfig = {
  provider: 'MOCK',
  updateInterval: 5, // Faster updates for testing
  enabledFeatures: {
    realTimeTracking: true,
    flightHistory: true,
    alertGeneration: true
  }
};
```

### Sample Test Scenarios
- Aircraft in flight (N789XY: LAX to JFK)
- Aircraft on ground (N123AB: JFK, scheduled departure)
- Aircraft in maintenance (N456CD: ORD, post-flight)

## Future Enhancements

### Phase 2: Advanced Features
- Flight path history overlay
- Weather integration (turbulence, delays)
- Automatic maintenance scheduling based on flight plans
- Integration with flight planning systems

### Phase 3: Real-time Alerts
- Hard landing detection
- Excessive G-force alerts
- Engine parameter monitoring
- Fuel efficiency tracking

### Phase 4: Operational Integration
- ForeFlight integration
- Maintenance management system sync
- Parts ordering based on flight patterns
- Predictive maintenance algorithms

## Troubleshooting

### Common Issues

**No flight data returned:**
- Check ICAO address format (6-character hex)
- Verify aircraft is equipped with ADS-B transponder
- Ensure aircraft is airborne or at major airport

**Rate limit exceeded:**
- Reduce update frequency
- Implement request queuing
- Consider upgrading to premium API

**Map not displaying:**
- Check browser console for JavaScript errors
- Verify Leaflet CSS is loaded
- Ensure latitude/longitude values are valid

### Debug Mode

Enable debug logging:

```env
NODE_ENV=development
DEBUG_FLIGHT_TRACKING=true
```

This will log all API requests and responses to the console.

## Conclusion

This flight tracking integration transforms the maintenance app from a static dashboard into a dynamic, real-world operational tool. By connecting live flight data with maintenance schedules, operators can make informed decisions about aircraft availability, maintenance timing, and operational efficiency.

The modular architecture allows for easy expansion to additional data sources and features, making it a robust foundation for comprehensive fleet management. 