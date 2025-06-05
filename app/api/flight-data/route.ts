import { NextRequest, NextResponse } from 'next/server';
import { FlightTrackingService, defaultFlightTrackingConfig } from '@/lib/flight-tracking';

// Initialize flight tracking service
const flightService = new FlightTrackingService(defaultFlightTrackingConfig);

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action');
  
  try {
    switch (action) {
      case 'fleet-positions':
        return await getFleetPositions(searchParams);
      
      case 'aircraft-data':
        return await getAircraftData(searchParams);
      
      case 'flight-history':
        return await getFlightHistory(searchParams);
      
      default:
        return NextResponse.json(
          { error: 'Invalid action. Use: fleet-positions, aircraft-data, or flight-history' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Flight data API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch flight data' },
      { status: 500 }
    );
  }
}

async function getFleetPositions(searchParams: URLSearchParams) {
  // Get tail numbers from query params (comma-separated)
  const tailNumbers = searchParams.get('tailNumbers')?.split(',') || ['N123AB', 'N456CD', 'N789XY'];
  
  const positions = await flightService.getFleetPositions(tailNumbers);
  
  return NextResponse.json({
    success: true,
    data: positions,
    timestamp: new Date().toISOString(),
    provider: defaultFlightTrackingConfig.provider
  });
}

async function getAircraftData(searchParams: URLSearchParams) {
  const tailNumber = searchParams.get('tailNumber');
  
  if (!tailNumber) {
    return NextResponse.json(
      { error: 'tailNumber parameter is required' },
      { status: 400 }
    );
  }
  
  const flightData = await flightService.getAircraftFlightData(tailNumber);
  
  if (!flightData) {
    return NextResponse.json(
      { error: 'Aircraft not found or no current flight data' },
      { status: 404 }
    );
  }
  
  return NextResponse.json({
    success: true,
    data: flightData,
    timestamp: new Date().toISOString()
  });
}

async function getFlightHistory(searchParams: URLSearchParams) {
  const tailNumber = searchParams.get('tailNumber');
  const days = parseInt(searchParams.get('days') || '30');
  
  if (!tailNumber) {
    return NextResponse.json(
      { error: 'tailNumber parameter is required' },
      { status: 400 }
    );
  }
  
  // Mock flight history data - in real implementation, this would come from database
  const mockFlightHistory = [
    {
      id: '1',
      aircraftId: tailNumber.toLowerCase(),
      flightDate: new Date(Date.now() - 24 * 60 * 60 * 1000), // Yesterday
      departure: {
        airport: 'KJFK',
        time: new Date(Date.now() - 25 * 60 * 60 * 1000),
        hobbs: 1245.2
      },
      arrival: {
        airport: 'KORD',
        time: new Date(Date.now() - 22 * 60 * 60 * 1000),
        hobbs: 1248.1
      },
      blockTime: 185, // 3h 5min
      flightTime: 165, // 2h 45min
      cycles: 1,
      maxAltitude: 41000,
      averageSpeed: 485,
      fuelUsed: 2850,
      distance: 740,
      route: ['KJFK', 'MERIT', 'PHLBO', 'KORD'],
      pilotInCommand: 'John Smith',
      secondInCommand: 'Sarah Johnson',
      notes: 'Normal flight, smooth conditions'
    },
    {
      id: '2',
      aircraftId: tailNumber.toLowerCase(),
      flightDate: new Date(Date.now() - 72 * 60 * 60 * 1000), // 3 days ago
      departure: {
        airport: 'KORD',
        time: new Date(Date.now() - 74 * 60 * 60 * 1000),
        hobbs: 1242.8
      },
      arrival: {
        airport: 'KJFK',
        time: new Date(Date.now() - 71 * 60 * 60 * 1000),
        hobbs: 1245.2
      },
      blockTime: 175,
      flightTime: 155,
      cycles: 1,
      maxAltitude: 39000,
      averageSpeed: 475,
      fuelUsed: 2650,
      distance: 740,
      route: ['KORD', 'DAVYY', 'COATE', 'KJFK'],
      pilotInCommand: 'Mike Wilson',
      secondInCommand: 'John Smith'
    }
  ];
  
  // Calculate maintenance metrics
  const metrics = flightService.calculateMaintenanceMetrics(mockFlightHistory);
  
  return NextResponse.json({
    success: true,
    data: {
      flights: mockFlightHistory,
      metrics,
      summary: {
        totalFlights: mockFlightHistory.length,
        totalBlockTime: mockFlightHistory.reduce((sum, flight) => sum + flight.blockTime, 0),
        totalFlightTime: mockFlightHistory.reduce((sum, flight) => sum + flight.flightTime, 0),
        totalCycles: mockFlightHistory.reduce((sum, flight) => sum + flight.cycles, 0),
        averageFlightLength: mockFlightHistory.reduce((sum, flight) => sum + flight.flightTime, 0) / mockFlightHistory.length
      }
    },
    period: `${days} days`,
    timestamp: new Date().toISOString()
  });
}

// POST endpoint for updating flight data or triggering manual updates
export async function POST(request: NextRequest) {
  const body = await request.json();
  const action = body.action;
  
  try {
    switch (action) {
      case 'start-tracking':
        // Start real-time tracking for fleet
        const aircraftList = body.aircraft || [
          { tailNumber: 'N123AB', icaoAddress: 'a1234b' },
          { tailNumber: 'N456CD', icaoAddress: 'c5678d' },
          { tailNumber: 'N789XY', icaoAddress: 'e9012f' }
        ];
        
        flightService.startFleetTracking(aircraftList);
        
        return NextResponse.json({
          success: true,
          message: `Started tracking ${aircraftList.length} aircraft`,
          timestamp: new Date().toISOString()
        });
      
      case 'stop-tracking':
        const tailNumber = body.tailNumber;
        
        if (tailNumber) {
          flightService.stopAircraftTracking(tailNumber);
          return NextResponse.json({
            success: true,
            message: `Stopped tracking ${tailNumber}`,
            timestamp: new Date().toISOString()
          });
        } else {
          flightService.stopAllTracking();
          return NextResponse.json({
            success: true,
            message: 'Stopped all flight tracking',
            timestamp: new Date().toISOString()
          });
        }
      
      case 'manual-update':
        // Manually trigger an update for specific aircraft
        const targetTailNumber = body.tailNumber;
        
        if (!targetTailNumber) {
          return NextResponse.json(
            { error: 'tailNumber is required for manual update' },
            { status: 400 }
          );
        }
        
        const flightData = await flightService.getAircraftFlightData(targetTailNumber);
        
        return NextResponse.json({
          success: true,
          data: flightData,
          message: `Updated flight data for ${targetTailNumber}`,
          timestamp: new Date().toISOString()
        });
      
      default:
        return NextResponse.json(
          { error: 'Invalid action. Use: start-tracking, stop-tracking, or manual-update' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Flight data POST error:', error);
    return NextResponse.json(
      { error: 'Failed to process flight data request' },
      { status: 500 }
    );
  }
} 