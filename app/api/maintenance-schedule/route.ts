import { NextRequest, NextResponse } from 'next/server';
import { MaintenanceScheduler, defaultSchedulingConfig } from '@/lib/maintenance-scheduler';
import { FlightTrackingService, defaultFlightTrackingConfig } from '@/lib/flight-tracking';
import { AgenticMaintenanceWorkflow, MaintenanceRecommendation } from '@/lib/agentic-workflow';
import { maintenanceChecklists, getRequiredPersonnel } from '@/lib/maintenance-tasks';
import { MaintenanceEmailService, EmailRecipient, MaintenanceEmailData } from '@/lib/email-service';
import { getEmailConfig } from '@/lib/email-config';
import { openAIService, MaintenanceRecommendationInput } from '@/lib/openai-service';

// Mock data for demonstration - in production this would come from database
const mockAircraft = [
  {
    id: 'n123ab',
    tailNumber: 'N123AB',
    make: 'Gulfstream',
    model: 'G550',
    serialNumber: 'G550-001',
    yearOfManufacture: 2018,
    totalAircraftTime: 2450, // hours
    totalCycles: 1850,
    isActive: true,
    lastInspectionDate: new Date('2024-01-15'),
    nextInspectionDue: new Date('2024-02-15'),
    createdAt: new Date('2018-01-01'),
    updatedAt: new Date(),
    flightStatus: 'AVAILABLE' as const,
    engineTimeTracking: 'HOBBS' as const,
    icaoAddress: 'a1234b',
    adsb: {
      enabled: true,
      equipmentType: 'Class A1S',
      lastSeen: new Date()
    }
  },
  {
    id: 'n456cd',
    tailNumber: 'N456CD',
    make: 'Gulfstream',
    model: 'G550',
    serialNumber: 'G550-002',
    yearOfManufacture: 2019,
    totalAircraftTime: 2125, // hours - approaching 100-hour inspection
    totalCycles: 1620,
    isActive: true,
    lastInspectionDate: new Date('2024-01-10'),
    nextInspectionDue: new Date('2024-02-08'),
    createdAt: new Date('2019-01-01'),
    updatedAt: new Date(),
    flightStatus: 'MAINTENANCE' as const,
    engineTimeTracking: 'HOBBS' as const,
    icaoAddress: 'c5678d',
    adsb: {
      enabled: true,
      equipmentType: 'Class A1S',
      lastSeen: new Date()
    }
  },
  {
    id: 'n789xy',
    tailNumber: 'N789XY',
    make: 'Gulfstream',
    model: 'G550',
    serialNumber: 'G550-003',
    yearOfManufacture: 2020,
    totalAircraftTime: 1875, // hours
    totalCycles: 1425,
    isActive: true,
    lastInspectionDate: new Date('2024-01-20'),
    nextInspectionDue: new Date('2024-03-01'),
    createdAt: new Date('2020-01-01'),
    updatedAt: new Date(),
    flightStatus: 'IN_FLIGHT' as const,
    engineTimeTracking: 'HOBBS' as const,
    icaoAddress: 'e9012f',
    adsb: {
      enabled: true,
      equipmentType: 'Class A1S',
      lastSeen: new Date()
    }
  }
];

const mockMaintenanceIntervals = [
  // N123AB intervals - Comprehensive FAA Schedule
  {
    id: 'int-1a',
    aircraftId: 'n123ab',
    intervalType: 'A_CHECK' as const,
    description: 'A-Check (1A) - Basic airframe and systems inspection',
    intervalHours: 500,
    intervalCalendar: 365, // 12 months
    lastCompletedAt: new Date('2024-01-15'),
    lastCompletedHours: 2000,
    nextDueAt: new Date('2024-02-15'),
    nextDueHours: 2500, // Due in 50 hours (2450 current + 50 = 2500)
    isOverdue: false,
    priority: 'HIGH' as const,
    estimatedDowntime: 36, // 1-2 days average
    estimatedCost: 15000
  },
  {
    id: 'int-2a',
    aircraftId: 'n123ab',
    intervalType: '2A_CHECK' as const,
    description: '2A Check - Progressive detailed check (1000 hours)',
    intervalHours: 1000,
    intervalCalendar: undefined,
    lastCompletedAt: new Date('2023-08-15'),
    lastCompletedHours: 1500,
    nextDueAt: new Date('2024-04-01'),
    nextDueHours: 2500, // Same as 1A due to bundling
    isOverdue: false,
    priority: 'HIGH' as const,
    estimatedDowntime: 48, // 1-3 days average
    estimatedCost: 25000
  },
  {
    id: 'int-100hr-1',
    aircraftId: 'n123ab',
    intervalType: '100_HOUR' as const,
    description: '100-Hour Inspection - Part 135 regulatory compliance',
    intervalHours: 100,
    intervalCalendar: undefined,
    lastCompletedAt: new Date('2024-01-25'),
    lastCompletedHours: 2400,
    nextDueAt: new Date('2024-02-10'),
    nextDueHours: 2500, // Due at same time as A-Check
    isOverdue: false,
    priority: 'MEDIUM' as const,
    estimatedDowntime: 8, // 1 day
    estimatedCost: 3500
  },
  
  // N456CD intervals (Aircraft with overdue maintenance)
  {
    id: 'int-100hr-2',
    aircraftId: 'n456cd',
    intervalType: '100_HOUR' as const,
    description: '100-Hour Inspection - OVERDUE (Part 135 Critical)',
    intervalHours: 100,
    intervalCalendar: undefined,
    lastCompletedAt: new Date('2024-01-01'),
    lastCompletedHours: 2000,
    nextDueAt: new Date('2024-01-20'),
    nextDueHours: 2100, // Was due at 2100 hours, now at 2125 = 25 hours overdue
    isOverdue: true,
    priority: 'CRITICAL' as const,
    estimatedDowntime: 8, // 1 day
    estimatedCost: 4000
  },
  {
    id: 'int-3a',
    aircraftId: 'n456cd',
    intervalType: '3A_CHECK' as const,
    description: '3A Check - Progressive detailed check (1500 hours)',
    intervalHours: 1500,
    intervalCalendar: undefined,
    lastCompletedAt: new Date('2023-10-01'),
    lastCompletedHours: 1600,
    nextDueAt: new Date('2024-03-15'),
    nextDueHours: 3100, // Due after current maintenance
    isOverdue: false,
    priority: 'MEDIUM' as const,
    estimatedDowntime: 48, // 1-3 days average
    estimatedCost: 35000
  },
  {
    id: 'int-1c',
    aircraftId: 'n456cd',
    intervalType: 'C_CHECK' as const,
    description: 'C-Check (1C) - Comprehensive inspection of airframe and systems',
    intervalHours: undefined,
    intervalCalendar: 365, // 12 months
    lastCompletedAt: new Date('2023-02-01'),
    lastCompletedHours: 1800,
    nextDueAt: new Date('2024-02-01'),
    nextDueHours: 0,
    isOverdue: false,
    priority: 'HIGH' as const,
    estimatedDowntime: 144, // 5-7 days average (6 days)
    estimatedCost: 85000
  },
  
  // N789XY intervals
  {
    id: 'int-1a-3',
    aircraftId: 'n789xy',
    intervalType: 'A_CHECK' as const,
    description: 'A-Check (1A) - Basic airframe and systems inspection',
    intervalHours: 500,
    intervalCalendar: 365,
    lastCompletedAt: new Date('2024-01-01'),
    lastCompletedHours: 1500,
    nextDueAt: new Date('2024-03-01'),
    nextDueHours: 2000, // Due in 125 hours (1875 current + 125 = 2000)
    isOverdue: false,
    priority: 'LOW' as const,
    estimatedDowntime: 36, // 1-2 days average
    estimatedCost: 15000
  },
  {
    id: 'int-100hr-3',
    aircraftId: 'n789xy',
    intervalType: '100_HOUR' as const,
    description: '100-Hour Inspection - Part 135 regulatory compliance',
    intervalHours: 100,
    intervalCalendar: undefined,
    lastCompletedAt: new Date('2024-01-15'),
    lastCompletedHours: 1800,
    nextDueAt: new Date('2024-02-20'),
    nextDueHours: 1900, // Due in 25 hours (1875 current + 25 = 1900)
    isOverdue: false,
    priority: 'MEDIUM' as const,
    estimatedDowntime: 8, // 1 day
    estimatedCost: 3500
  },
  {
    id: 'int-progressive-1',
    aircraftId: 'n789xy',
    intervalType: 'PROGRESSIVE' as const,
    description: 'Progressive Inspection - Rolling schedule maintenance',
    intervalHours: undefined,
    intervalCalendar: 90, // Every 90 days
    lastCompletedAt: new Date('2024-01-01'),
    lastCompletedHours: 1500,
    nextDueAt: new Date('2024-04-01'),
    nextDueHours: 0,
    isOverdue: false,
    priority: 'LOW' as const,
    estimatedDowntime: 36, // 1-2 days average
    estimatedCost: 12000
  },

  // Additional comprehensive intervals for fleet-wide planning
  {
    id: 'int-4a',
    aircraftId: 'n123ab',
    intervalType: '4A_CHECK' as const,
    description: '4A Check - Progressive detailed check (2000 hours)',
    intervalHours: 2000,
    intervalCalendar: undefined,
    lastCompletedAt: new Date('2023-06-01'),
    lastCompletedHours: 500,
    nextDueAt: new Date('2024-06-01'),
    nextDueHours: 2500, // Due soon, can be bundled with 1A/2A
    isOverdue: false,
    priority: 'MEDIUM' as const,
    estimatedDowntime: 48, // 1-3 days average
    estimatedCost: 45000
  },
  {
    id: 'int-annual-1',
    aircraftId: 'n123ab',
    intervalType: 'ANNUAL' as const,
    description: 'Annual Inspection - FAA-mandated comprehensive check',
    intervalHours: undefined,
    intervalCalendar: 365, // Every 12 months
    lastCompletedAt: new Date('2023-03-01'),
    lastCompletedHours: 1200,
    nextDueAt: new Date('2024-03-01'),
    nextDueHours: 0,
    isOverdue: false,
    priority: 'HIGH' as const,
    estimatedDowntime: 36, // 1-2 days average
    estimatedCost: 18000
  },
  {
    id: 'int-10a',
    aircraftId: 'n456cd',
    intervalType: '10A_CHECK' as const,
    description: '10A Check - Major systems and airframe checks (5000 hours)',
    intervalHours: 5000,
    intervalCalendar: undefined,
    lastCompletedAt: new Date('2022-01-01'),
    lastCompletedHours: 0,
    nextDueAt: new Date('2025-01-01'),
    nextDueHours: 5000,
    isOverdue: false,
    priority: 'LOW' as const,
    estimatedDowntime: 72, // 2-4 days average (3 days)
    estimatedCost: 125000
  },
  {
    id: 'int-2c',
    aircraftId: 'n789xy',
    intervalType: '2C_CHECK' as const,
    description: '2C Check - Deep structural and systems check (24 months)',
    intervalHours: undefined,
    intervalCalendar: 730, // 24 months
    lastCompletedAt: new Date('2022-01-01'),
    lastCompletedHours: 0,
    nextDueAt: new Date('2024-01-01'),
    nextDueHours: 0,
    isOverdue: false,
    priority: 'MEDIUM' as const,
    estimatedDowntime: 264, // 7-14 days average (11 days)
    estimatedCost: 185000
  }
];

const mockCurrentWorkOrders = [
  {
    id: 'wo-1',
    aircraftId: 'n456cd',
    workOrderNumber: 'WO-20240125-001',
    title: '100-Hour Inspection - OVERDUE (AOG)',
    description: 'Overdue 100-hour inspection - Aircraft on Ground. 25 hours overdue.',
    status: 'IN_PROGRESS' as const,
    priority: 'AOG' as const, // Aircraft On Ground
    category: 'SCHEDULED' as const,
    mechanicAssigned: 'John Smith',
    inspectorAssigned: 'Sarah Wilson',
    estimatedHours: 12,
    actualHours: 8,
    partsRequired: [],
    createdAt: new Date('2024-01-25'),
    scheduledStartDate: new Date('2024-01-25'),
    actualStartDate: new Date('2024-01-25'),
    signOffData: undefined
  },
  {
    id: 'wo-2',
    aircraftId: 'n123ab',
    workOrderNumber: 'WO-20240128-002',
    title: 'Brake System Inspection',
    description: 'Routine brake system inspection and maintenance',
    status: 'OPEN' as const,
    priority: 'ROUTINE' as const,
    category: 'SCHEDULED' as const,
    mechanicAssigned: 'Mike Wilson',
    inspectorAssigned: undefined,
    estimatedHours: 4,
    actualHours: 0,
    partsRequired: [],
    createdAt: new Date('2024-01-28'),
    scheduledStartDate: new Date('2024-02-01'),
    actualStartDate: undefined,
    signOffData: undefined
  }
];

// Initialize services
const scheduler = new MaintenanceScheduler(defaultSchedulingConfig);
const flightService = new FlightTrackingService(defaultFlightTrackingConfig);
const agenticWorkflow = new AgenticMaintenanceWorkflow();

// Mock storage for recommendations (in production, this would be a database)
const mockRecommendations: MaintenanceRecommendation[] = [];

// Mock storage for active workflows (in production, this would be a database)
const mockActiveWorkflows: { [key: string]: any } = {};

// Enhanced workflow tracking
interface ActiveWorkflow {
  id: string;
  recommendationId: string;
  aircraftId: string;
  tailNumber: string;
  maintenanceType: string;
  status: 'INITIATED' | 'IN_PROGRESS' | 'AWAITING_PARTS' | 'INSPECTION' | 'COMPLETED' | 'DELAYED';
  progress: {
    tasksCompleted: number;
    totalTasks: number;
    currentTask: string;
    nextMilestone: string;
    estimatedCompletion: string;
  };
  assignments: {
    mechanic: string;
    inspector?: string;
    supervisor: string;
  };
  resources: {
    hangar: string;
    equipment: string[];
    parts: string[];
  };
  timeline: {
    started: string;
    estimatedCompletion: string;
    actualCompletion?: string;
  };
  notifications: {
    lastSent: string;
    nextReminder: string;
    escalationLevel: number;
  };
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action');
  
  try {
    switch (action) {
      case 'optimize':
        return await optimizeSchedule(searchParams);
      
      case 'utilization-analysis':
        return await getUtilizationAnalysis(searchParams);
      
      case 'schedule-preview':
        return await getSchedulePreview(searchParams);
      
      case 'ai-recommendations':
        return await getAIRecommendations(searchParams);
      
      case 'workflow-status':
        return await getWorkflowStatus(searchParams);
      
      case 'active-workflows':
        return await getActiveWorkflows(searchParams);
      
      case 'audit-trail':
        return await getAuditTrail(searchParams);
      
      case 'task-checklist':
        return await getTaskChecklist(searchParams);
      
      default:
        return NextResponse.json(
          { error: 'Invalid action. Use: optimize, utilization-analysis, schedule-preview, ai-recommendations, workflow-status, active-workflows, audit-trail, or task-checklist' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Maintenance schedule API error:', error);
    return NextResponse.json(
      { error: 'Failed to process scheduling request' },
      { status: 500 }
    );
  }
}

// Enhanced optimization with AI recommendations using OpenAI
async function optimizeSchedule(searchParams: URLSearchParams) {
  try {
    console.log('🤖 Starting AI-powered optimization...');
    
    // Get real utilization data first
    const utilizationResponse = await getUtilizationAnalysis(new URLSearchParams());
    const utilizationData = await utilizationResponse.json();
    
    // Get flight history for utilization analysis
    const flightHistory = await generateMockFlightHistory();
    
    // Get upcoming flights (mock data)
    const upcomingFlights = await generateMockUpcomingFlights();
    
    // Prepare data for OpenAI analysis
    const aiInputs: MaintenanceRecommendationInput[] = [];
    
    if (utilizationData.success && utilizationData.data) {
      for (const aircraft of mockAircraft) {
        const utilData = utilizationData.data.find((u: any) => u.aircraftId === aircraft.id);
        const aircraftFlights = flightHistory.filter((f: any) => f.aircraftId === aircraft.id);
        
        if (utilData) {
          aiInputs.push({
            aircraftData: {
              tailNumber: aircraft.tailNumber,
              aircraftType: `${aircraft.make} ${aircraft.model}`,
              totalAircraftTime: aircraft.totalAircraftTime,
              totalCycles: aircraft.totalCycles,
              lastInspection: {
                type: 'A_CHECK',
                date: aircraft.lastInspectionDate.toISOString(),
                hoursAgo: aircraft.totalAircraftTime - (aircraft.totalAircraftTime - 100)
              }
            },
            utilizationData: {
              utilizationPercentage: utilData.averageUtilization || 0,
              flightHours: utilData.totalFlightHours || 0,
              avgFlightTime: utilData.averageFlightDuration || 0,
              maintenanceRisk: utilData.maintenanceImpact?.risk || 'MEDIUM',
              trend: utilData.utilizationTrend || 'STABLE'
            },
            flightHistory: aircraftFlights.map((f: any) => ({
              flightDate: f.flightDate,
              flightTime: f.flightTime,
              cycles: f.cycles
            }))
          });
        }
      }
    }
    
    // Generate AI recommendations using OpenAI or fallback
    let aiRecommendations: any[] = [];
    
    if (aiInputs.length > 0) {
      try {
        console.log(`🤖 Sending ${aiInputs.length} aircraft to OpenAI for analysis...`);
        const openAIRecommendations = await openAIService.generateMaintenanceRecommendations(aiInputs);
        
        // Convert OpenAI recommendations to our format
        aiRecommendations = openAIRecommendations.map(rec => ({
          id: `rec-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          aircraftId: aiInputs.find(input => input.aircraftData.tailNumber === rec.tailNumber)?.aircraftData.tailNumber?.toLowerCase().replace(/[^a-z0-9]/g, '') || 'unknown',
          tailNumber: rec.tailNumber || 'Unknown',
          maintenanceType: rec.maintenanceType,
          urgency: rec.priority || 'MEDIUM', // Fix: ensure priority is mapped correctly
          scheduledDate: rec.suggestedDate,
          estimatedCost: rec.estimatedCost,
          estimatedDuration: rec.estimatedDuration,
          description: `${rec.maintenanceType} - ${rec.reasoning}`,
          aiConfidence: rec.confidence / 100,
          reasoning: Array.isArray(rec.reasoning) ? rec.reasoning : [rec.reasoning], // Fix: ensure reasoning is an array
          status: 'PENDING',
          workflowId: null,
          complianceRequirements: rec.complianceRequirements,
          riskFactors: rec.riskFactors || ["Standard maintenance"], affectedAssets: [rec.tailNumber || "Unknown"], requiredPersonnel: getRequiredPersonnel(rec.maintenanceType) || ["A&P Mechanic"], recommendedDate: rec.suggestedDate ? new Date(rec.suggestedDate).toISOString() : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), estimatedDowntime: rec.estimatedDuration || 8, timeWindow: { earliest: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), latest: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000).toISOString(), optimal: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString() }, createdAt: new Date().toISOString() }));
        
        console.log(`✅ Generated ${aiRecommendations.length} AI recommendations`);
        
      } catch (openAIError) {
        console.error('❌ OpenAI service error:', openAIError);
        console.log('🔄 Falling back to enhanced demo recommendations...');
      }
    }
    
    // Run the standard optimization as well
    const result = await scheduler.optimizeMaintenanceSchedule(
      mockAircraft,
      mockMaintenanceIntervals,
      flightHistory,
      upcomingFlights,
      mockCurrentWorkOrders
    );
    
    // If we have AI recommendations, use them, otherwise use the standard ones
    const finalRecommendations = aiRecommendations.length > 0 ? aiRecommendations : result.recommendations || [];
    
    // Update global recommendations store
    mockRecommendations.length = 0;
    mockRecommendations.push(...finalRecommendations);
    
    return NextResponse.json({
      success: true,
      data: {
        ...result,
        recommendations: finalRecommendations,
        aiRecommendations: finalRecommendations,
        utilizationSummary: utilizationData.success ? utilizationData.summary : null,
        optimizationInsights: generateOptimizationInsights(finalRecommendations, utilizationData.success ? utilizationData.data : []),
        aiPowered: aiRecommendations.length > 0
      },
      timestamp: new Date().toISOString(),
      optimizationConfig: defaultSchedulingConfig
    });
    
  } catch (error) {
    console.error('Error in optimizeSchedule:', error);
    
    // Fallback to basic optimization without utilization data
    const result = await scheduler.optimizeMaintenanceSchedule(
      mockAircraft,
      mockMaintenanceIntervals,
      await generateMockFlightHistory(),
      await generateMockUpcomingFlights(),
      mockCurrentWorkOrders
    );
    
    return NextResponse.json({
      success: true,
      data: result,
      warning: 'Basic optimization used - AI analysis unavailable',
      timestamp: new Date().toISOString(),
      optimizationConfig: defaultSchedulingConfig
    });
  }
}

// Legacy function - keeping for compatibility but not using complex fake calculations
async function generateUtilizationAwareRecommendation(
  scheduleItem: any,
  utilizationData: any,
  fleetSummary: any
): Promise<MaintenanceRecommendation> {
  const baseId = `rec-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const aircraft = mockAircraft.find(a => a.id === scheduleItem.aircraftId);
  
  if (!aircraft) {
    throw new Error(`Aircraft not found: ${scheduleItem.aircraftId}`);
  }
  
  // Simple recommendation without fake AI calculations
  return {
    id: baseId,
    aircraftId: scheduleItem.aircraftId,
    tailNumber: aircraft.tailNumber,
    maintenanceType: scheduleItem.maintenanceType,
    urgency: 'MEDIUM',
    scheduledDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    estimatedCost: scheduleItem.estimatedCost || 15000,
    estimatedDuration: scheduleItem.estimatedDuration || 8,
    description: `${scheduleItem.maintenanceType} maintenance for ${aircraft.tailNumber}`,
    aiConfidence: 0.75,
    reasoning: 'Generated using standard maintenance intervals',
    status: 'PENDING',
    workflowId: null,
    complianceRequirements: ['FAR 91.409'],
    riskFactors: ['Standard maintenance']
  };
}

async function getUtilizationAnalysis(searchParams: URLSearchParams) {
  const tailNumber = searchParams.get('tailNumber');
  
  try {
    // For demo purposes, always use enhanced mock data with varied utilization
    console.log('Using enhanced mock utilization data for demo...');
    const enhancedData = await generateFallbackUtilizationData(tailNumber);
    
    return NextResponse.json({
      success: true,
      data: enhancedData,
      summary: {
        totalAircraft: enhancedData.length,
        averageFleetUtilization: Math.round(enhancedData.reduce((sum, data) => sum + data.averageUtilization, 0) / enhancedData.length),
        totalFlightHours: enhancedData.reduce((sum, data) => sum + data.currentFlightHours, 0),
        highUtilizationAircraft: enhancedData.filter(data => data.averageUtilization > 80).length,
        lowUtilizationAircraft: enhancedData.filter(data => data.averageUtilization < 60).length,
        maintenanceAlertsCount: enhancedData.filter(data => data.maintenanceImpact.risk === 'HIGH').length
      },
      note: 'Using enhanced simulation data for varied utilization patterns',
      timestamp: new Date().toISOString()
    });
    
    /* 
    // Real flight data integration (commented for demo)
    // Get real flight data from flight tracking API
    const flightDataPromises = mockAircraft.map(async (aircraft) => {
      try {
        // Get flight history for the aircraft
        const historyResponse = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/flight-data?action=flight-history&tailNumber=${aircraft.tailNumber}&days=30`);
        const historyData = await historyResponse.json();
        
        // Get current position and status
        const positionResponse = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/flight-data?action=fleet-positions&tailNumbers=${aircraft.tailNumber}`);
        const positionData = await positionResponse.json();
        
        return {
          aircraft,
          flightHistory: historyData.success ? historyData.data : null,
          currentPosition: positionData.success ? positionData.data[0] : null
        };
      } catch (error) {
        console.error(`Error fetching flight data for ${aircraft.tailNumber}:`, error);
        return {
          aircraft,
          flightHistory: null,
          currentPosition: null
        };
      }
    });
    
    const flightDataResults = await Promise.all(flightDataPromises);
    
    // Filter for specific aircraft if requested
    const filteredResults = tailNumber 
      ? flightDataResults.filter(result => result.aircraft.tailNumber === tailNumber)
      : flightDataResults;
    
    // Calculate comprehensive utilization patterns
    const utilizationPatterns = filteredResults.map(({ aircraft, flightHistory, currentPosition }) => {
      const flights = flightHistory?.flights || [];
      const metrics = flightHistory?.metrics || { totalFlightTime: 0, totalCycles: 0, averageFlightTime: 0, utilizationRate: 0 };
      const summary = flightHistory?.summary || { totalFlights: 0, totalBlockTime: 0, totalFlightTime: 0, totalCycles: 0, averageFlightLength: 0 };
      
      // Calculate current month utilization (past 30 days)
      const currentDate = new Date();
      const thirtyDaysAgo = new Date(currentDate.getTime() - 30 * 24 * 60 * 60 * 1000);
      
      const recentFlights = flights.filter(flight => {
        const flightDate = new Date(flight.flightDate);
        return flightDate >= thirtyDaysAgo && flightDate <= currentDate;
      });
      
      const totalFlightHours = recentFlights.reduce((sum, flight) => sum + (flight.flightTime / 60), 0);
      const totalCycles = recentFlights.reduce((sum, flight) => sum + flight.cycles, 0);
      
      // Calculate utilization percentage (based on target of 8 hours/day)
      const targetHoursPerMonth = 8 * 30; // 240 hours per month at 8 hours/day
      const averageUtilization = Math.min(Math.round((totalFlightHours / targetHoursPerMonth) * 100), 100);
      
      // Identify peak and low utilization periods
      const dailyUtilization = calculateDailyUtilization(recentFlights);
      const peakPeriods = identifyPeakPeriods(dailyUtilization);
      const lowPeriods = identifyLowPeriods(dailyUtilization);
      
      // Predict future utilization based on trends
      const predictedUtilization = generateUtilizationPrediction(dailyUtilization);
      
      // Calculate maintenance windows based on utilization
      const maintenanceWindows = identifyOptimalMaintenanceWindows(dailyUtilization, lowPeriods);
      
      return {
        aircraftId: aircraft.id,
        tailNumber: aircraft.tailNumber,
        aircraftType: aircraft.aircraftType,
        currentFlightHours: Math.round(totalFlightHours),
        totalFlightHours: aircraft.totalAircraftTime,
        averageUtilization,
        utilizationTrend: calculateUtilizationTrend(dailyUtilization),
        currentStatus: determineCurrentStatus(currentPosition, aircraft),
        lastFlightDate: recentFlights.length > 0 ? recentFlights[0].flightDate : null,
        
        // Flight patterns
        flightFrequency: recentFlights.length,
        averageFlightDuration: recentFlights.length > 0 ? Math.round(recentFlights.reduce((sum, flight) => sum + flight.flightTime, 0) / recentFlights.length) : 0,
        totalCycles: totalCycles,
        cycleRate: totalCycles / 30, // cycles per day
        
        // Peak and low periods
        peakPeriods,
        lowPeriods,
        predictedUtilization,
        maintenanceWindows,
        
        // Maintenance impact assessment
        maintenanceImpact: calculateMaintenanceImpact(aircraft, averageUtilization, recentFlights),
        
        // Efficiency metrics
        fuelEfficiency: calculateFuelEfficiency(recentFlights),
        routeEfficiency: calculateRouteEfficiency(recentFlights),
        
        // Real-time data
        lastUpdated: new Date().toISOString(),
        dataSource: 'LIVE_FLIGHT_DATA'
      };
    });
    
    return NextResponse.json({
      success: true,
      data: utilizationPatterns,
      summary: {
        totalAircraft: utilizationPatterns.length,
        averageFleetUtilization: Math.round(utilizationPatterns.reduce((sum, data) => sum + data.averageUtilization, 0) / utilizationPatterns.length),
        totalFlightHours: utilizationPatterns.reduce((sum, data) => sum + data.currentFlightHours, 0),
        highUtilizationAircraft: utilizationPatterns.filter(data => data.averageUtilization > 80).length,
        lowUtilizationAircraft: utilizationPatterns.filter(data => data.averageUtilization < 60).length,
        maintenanceAlertsCount: utilizationPatterns.filter(data => data.maintenanceImpact.risk === 'HIGH').length
      },
      timestamp: new Date().toISOString()
    });
    */
    
  } catch (error) {
    console.error('Error in utilization analysis:', error);
    
    // Fallback to enhanced mock data
    const fallbackData = await generateFallbackUtilizationData(tailNumber);
    
    return NextResponse.json({
      success: true,
      data: fallbackData,
      warning: 'Using enhanced simulation data - flight tracking service unavailable',
      timestamp: new Date().toISOString()
    });
  }
}

// Helper functions for utilization analysis

function calculateDailyUtilization(flights: any[]) {
  const dailyData = new Map();
  
  flights.forEach(flight => {
    const date = new Date(flight.flightDate).toDateString();
    const existing = dailyData.get(date) || { date, flightTime: 0, cycles: 0, flights: 0 };
    
    existing.flightTime += flight.flightTime / 60; // convert to hours
    existing.cycles += flight.cycles;
    existing.flights += 1;
    
    dailyData.set(date, existing);
  });
  
  return Array.from(dailyData.values()).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
}

function identifyPeakPeriods(dailyData: any[]) {
  return dailyData
    .filter(day => day.flightTime > 6) // More than 6 hours per day
    .map(day => ({
      start: new Date(day.date),
      end: new Date(day.date),
      averageDaily: Math.round(day.flightTime * 10) / 10,
      peakHours: day.flightTime
    }))
    .slice(0, 5); // Top 5 peak periods
}

function identifyLowPeriods(dailyData: any[]) {
  // Find consecutive days with low utilization
  const lowThreshold = 2; // Less than 2 hours per day
  const periods = [];
  let currentPeriod = null;
  
  for (const day of dailyData) {
    if (day.flightTime < lowThreshold) {
      if (!currentPeriod) {
        currentPeriod = {
          start: new Date(day.date),
          end: new Date(day.date),
          averageDaily: day.flightTime
        };
      } else {
        currentPeriod.end = new Date(day.date);
        currentPeriod.averageDaily = (currentPeriod.averageDaily + day.flightTime) / 2;
      }
    } else {
      if (currentPeriod) {
        periods.push(currentPeriod);
        currentPeriod = null;
      }
    }
  }
  
  if (currentPeriod) {
    periods.push(currentPeriod);
  }
  
  return periods.slice(0, 3); // Top 3 low periods
}

function generateUtilizationPrediction(dailyData: any[]) {
  const predictions = [];
  const recentTrend = dailyData.slice(-7); // Last 7 days
  const avgRecent = recentTrend.reduce((sum, day) => sum + day.flightTime, 0) / recentTrend.length;
  
  // Simple prediction for next 14 days
  for (let i = 1; i <= 14; i++) {
    const date = new Date();
    date.setDate(date.getDate() + i);
    
    // Add some variation to the prediction
    const variation = (Math.random() - 0.5) * 2; // +/- 1 hour variation
    const predicted = Math.max(0, avgRecent + variation);
    
    predictions.push({
      date,
      predictedHours: Math.round(predicted * 10) / 10,
      confidence: Math.max(0.3, 0.9 - (i * 0.05)) // Decreasing confidence over time
    });
  }
  
  return predictions;
}

function identifyOptimalMaintenanceWindows(dailyData: any[], lowPeriods: any[]) {
  const windows = [];
  
  // Use low periods as maintenance windows
  lowPeriods.forEach(period => {
    const duration = Math.ceil((period.end.getTime() - period.start.getTime()) / (24 * 60 * 60 * 1000));
    if (duration >= 2) { // At least 2 days
      windows.push({
        start: period.start,
        end: period.end,
        duration,
        suitability: duration >= 5 ? 'EXCELLENT' : duration >= 3 ? 'GOOD' : 'FAIR',
        maintenanceTypes: duration >= 5 ? ['ANNUAL', 'C_CHECK'] : duration >= 3 ? ['100_HOUR', 'A_CHECK'] : ['A_CHECK']
      });
    }
  });
  
  return windows;
}

function calculateUtilizationTrend(dailyData: any[]) {
  if (dailyData.length < 7) return 'STABLE';
  
  const recent = dailyData.slice(-7);
  const earlier = dailyData.slice(-14, -7);
  
  const recentAvg = recent.reduce((sum, day) => sum + day.flightTime, 0) / recent.length;
  const earlierAvg = earlier.reduce((sum, day) => sum + day.flightTime, 0) / earlier.length;
  
  const change = (recentAvg - earlierAvg) / earlierAvg;
  
  if (change > 0.15) return 'INCREASING';
  if (change < -0.15) return 'DECREASING';
  return 'STABLE';
}

function determineCurrentStatus(currentPosition: any, aircraft: any) {
  if (!currentPosition) return 'UNKNOWN';
  
  if (currentPosition.isOnGround) {
    if (currentPosition.airport) {
      return `ON_GROUND_${currentPosition.airport}`;
    }
    return 'ON_GROUND';
  }
  
  return `IN_FLIGHT_${currentPosition.flightPhase || 'CRUISE'}`;
}

function calculateMaintenanceImpact(aircraft: any, utilization: number, recentFlights: any[]) {
  let risk = 'LOW';
  let urgency = 'NORMAL';
  const factors = [];
  
  // High utilization increases maintenance urgency
  if (utilization > 85) {
    risk = 'HIGH';
    urgency = 'HIGH';
    factors.push('High utilization rate detected');
  }
  
  // Check cycle frequency
  const cycleRate = recentFlights.reduce((sum, flight) => sum + flight.cycles, 0) / 30;
  if (cycleRate > 0.8) { // More than 0.8 cycles per day
    risk = risk === 'LOW' ? 'MEDIUM' : 'HIGH';
    factors.push('High cycle frequency');
  }
  
  // Check for long flights (wear patterns)
  const longFlights = recentFlights.filter(flight => flight.flightTime > 240); // > 4 hours
  if (longFlights.length > recentFlights.length * 0.5) {
    factors.push('Frequent long-haul operations');
  }
  
  return {
    risk,
    urgency,
    factors,
    recommendedAction: risk === 'HIGH' ? 'Schedule maintenance within 7 days' : 
                      risk === 'MEDIUM' ? 'Monitor closely, schedule within 30 days' : 
                      'Normal maintenance schedule'
  };
}

function calculateFuelEfficiency(flights: any[]) {
  if (flights.length === 0) return null;
  
  const totalFuel = flights.reduce((sum, flight) => sum + (flight.fuelUsed || 0), 0);
  const totalDistance = flights.reduce((sum, flight) => sum + (flight.distance || 0), 0);
  
  return {
    fuelPerNauticalMile: totalDistance > 0 ? Math.round((totalFuel / totalDistance) * 100) / 100 : 0,
    averageFuelBurn: Math.round(totalFuel / flights.length),
    efficiency: totalFuel < (flights.length * 300 * 3) ? 'GOOD' : 'AVERAGE' // Rough baseline
  };
}

function calculateRouteEfficiency(flights: any[]) {
  if (flights.length === 0) return null;
  
  const avgSpeed = flights.reduce((sum, flight) => sum + (flight.averageSpeed || 0), 0) / flights.length;
  const avgFlightTime = flights.reduce((sum, flight) => sum + flight.flightTime, 0) / flights.length;
  
  return {
    averageSpeed: Math.round(avgSpeed),
    averageFlightTime: Math.round(avgFlightTime),
    efficiency: avgSpeed > 450 ? 'EXCELLENT' : avgSpeed > 400 ? 'GOOD' : 'AVERAGE'
  };
}

async function generateFallbackUtilizationData(tailNumber?: string | null) {
  // Enhanced fallback to mock data with realistic utilization profiles
  const filteredAircraft = tailNumber 
    ? mockAircraft.filter(a => a.tailNumber === tailNumber)
    : mockAircraft;
  
  // Create realistic utilization profiles matching our flight data patterns
  const utilizationProfiles = {
    'N123AB': { // High utilization aircraft (business jet)
      baseUtilization: 75,
      variation: 15,
      flightHours: 180,
      trend: 'INCREASING',
      efficiency: 'GOOD',
      risk: 'MEDIUM'
    },
    'N456CD': { // Medium utilization aircraft (currently in maintenance)
      baseUtilization: 45,
      variation: 10,
      flightHours: 95,
      trend: 'STABLE',
      efficiency: 'AVERAGE',
      risk: 'HIGH'
    },
    'N789XY': { // Lower utilization aircraft (newer/specialty use)
      baseUtilization: 28,
      variation: 8,
      flightHours: 65,
      trend: 'DECREASING',
      efficiency: 'EXCELLENT',
      risk: 'LOW'
    }
  };
  
  return filteredAircraft.map(aircraft => {
    const profile = utilizationProfiles[aircraft.tailNumber] || utilizationProfiles['N456CD'];
    
    // Add realistic variation to utilization
    const utilizationVariation = (Math.random() - 0.5) * profile.variation;
    const averageUtilization = Math.max(5, Math.min(95, profile.baseUtilization + utilizationVariation));
    
    // Calculate flight hours with some realistic variation
    const flightHoursVariation = (Math.random() - 0.5) * 30;
    const currentFlightHours = Math.max(10, profile.flightHours + flightHoursVariation);
    
    // Generate cycle rate based on utilization type
    const cycleRate = aircraft.tailNumber === 'N123AB' ? 1.2 + Math.random() * 0.3 : // High util = more cycles
                     aircraft.tailNumber === 'N456CD' ? 0.8 + Math.random() * 0.4 :   // Medium util
                     0.3 + Math.random() * 0.4; // Low util
    
    // Generate maintenance windows based on utilization
    const maintenanceWindows = averageUtilization < 50 ? [
      {
        start: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        end: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
        duration: 7,
        suitability: 'EXCELLENT',
        maintenanceTypes: ['A_CHECK', '100_HOUR', 'C_CHECK']
      }
    ] : averageUtilization < 70 ? [
      {
        start: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
        end: new Date(Date.now() + 18 * 24 * 60 * 60 * 1000).toISOString(),
        duration: 4,
        suitability: 'GOOD',
        maintenanceTypes: ['A_CHECK', '100_HOUR']
      }
    ] : [
      {
        start: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000).toISOString(),
        end: new Date(Date.now() + 23 * 24 * 60 * 60 * 1000).toISOString(),
        duration: 2,
        suitability: 'FAIR',
        maintenanceTypes: ['100_HOUR']
      }
    ];
    
    // Generate peak and low periods
    const peakPeriods = averageUtilization > 60 ? [
      {
        start: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
        end: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
        averageDaily: 8.5 + Math.random() * 2,
        peakHours: 10.2
      }
    ] : [];
    
    const lowPeriods = averageUtilization < 80 ? [
      {
        start: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
        end: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000),
        averageDaily: 1.5 + Math.random()
      }
    ] : [];
    
    return {
      aircraftId: aircraft.id,
      tailNumber: aircraft.tailNumber,
      aircraftType: `${aircraft.make} ${aircraft.model}`,
      currentFlightHours: Math.round(currentFlightHours),
      totalFlightHours: aircraft.totalAircraftTime,
      averageUtilization: Math.round(averageUtilization),
      utilizationTrend: profile.trend,
      currentStatus: aircraft.flightStatus === 'MAINTENANCE' ? 'ON_GROUND_MAINTENANCE' : 
                    aircraft.flightStatus === 'IN_FLIGHT' ? 'IN_FLIGHT_CRUISE' : 'ON_GROUND_KORD',
      lastFlightDate: new Date(Date.now() - Math.random() * 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      
      // Flight patterns based on profile
      flightFrequency: Math.round(averageUtilization / 4), // Rough correlation
      averageFlightDuration: aircraft.tailNumber === 'N123AB' ? 180 + Math.random() * 60 : // Long flights
                            aircraft.tailNumber === 'N456CD' ? 150 + Math.random() * 40 :   // Medium flights
                            120 + Math.random() * 30, // Shorter flights
      totalCycles: Math.round(cycleRate * 30),
      cycleRate: Math.round(cycleRate * 100) / 100,
      
      // Periods
      peakPeriods,
      lowPeriods,
      predictedUtilization: [], // Could generate future predictions
      maintenanceWindows,
      
      // Risk assessment
      maintenanceImpact: {
        risk: profile.risk,
        urgency: profile.risk === 'HIGH' ? 'HIGH' : profile.risk === 'MEDIUM' ? 'NORMAL' : 'LOW',
        factors: profile.risk === 'HIGH' ? ['Overdue maintenance items', 'High wear indicators'] :
                profile.risk === 'MEDIUM' ? ['Moderate utilization stress', 'Routine monitoring required'] :
                ['Low operational stress', 'Excellent maintenance history'],
        recommendedAction: profile.risk === 'HIGH' ? 'Schedule maintenance within 7 days' :
                          profile.risk === 'MEDIUM' ? 'Monitor closely, schedule within 30 days' :
                          'Normal maintenance schedule'
      },
      
      // Efficiency metrics
      fuelEfficiency: {
        fuelPerNauticalMile: profile.efficiency === 'EXCELLENT' ? 2.1 + Math.random() * 0.2 :
                           profile.efficiency === 'GOOD' ? 2.4 + Math.random() * 0.3 :
                           2.8 + Math.random() * 0.4,
        averageFuelBurn: Math.round(300 + Math.random() * 100),
        efficiency: profile.efficiency
      },
      
      routeEfficiency: {
        averageSpeed: 420 + Math.random() * 80,
        averageFlightTime: Math.round(120 + Math.random() * 120),
        efficiency: profile.efficiency
      },
      
      lastUpdated: new Date().toISOString(),
      dataSource: 'ENHANCED_MOCK_DATA'
    };
  });
}

async function getSchedulePreview(searchParams: URLSearchParams) {
  const days = parseInt(searchParams.get('days') || '30');
  
  // Generate a quick preview without full optimization
  const preview = mockMaintenanceIntervals.map(interval => {
    const aircraft = mockAircraft.find(a => a.id === interval.aircraftId);
    if (!aircraft) return null;
    
    return {
      id: `preview-${interval.id}`,
      aircraftId: aircraft.id,
      tailNumber: aircraft.tailNumber,
      maintenanceType: interval.intervalType,
      scheduledDate: interval.nextDueAt,
      estimatedDuration: interval.estimatedDowntime,
      priority: interval.priority,
      confidenceScore: 0.8,
      reasoning: [`Due based on ${interval.intervalHours}-hour interval`],
      conflictsWith: [],
      alternativeDates: [],
      estimatedCost: interval.estimatedCost,
      impactOnOperations: interval.priority === 'CRITICAL' ? 'HIGH' : 'MEDIUM',
      requiredParts: [],
      mechanicRequirements: ['A&P Mechanic']
    };
  }).filter(Boolean);
  
  return NextResponse.json({
    success: true,
    data: {
      schedule: preview,
      totalCost: preview.reduce((sum, item) => sum + (item?.estimatedCost || 0), 0),
      totalItems: preview.length,
      criticalItems: preview.filter(item => item?.priority === 'CRITICAL').length
    },
    period: `${days} days`,
    timestamp: new Date().toISOString()
  });
}

// New endpoint: Get AI Recommendations
async function getAIRecommendations(searchParams: URLSearchParams) {
  const tailNumber = searchParams.get('tailNumber');
  const status = searchParams.get('status');
  
  let filteredRecommendations = [...mockRecommendations];
  
  // If no recommendations exist, generate baseline maintenance from task list
  if (filteredRecommendations.length === 0) {
    console.log('⚠️ No AI recommendations found, generating baseline maintenance tasks...');
    
    // Generate basic recurring maintenance for each aircraft
    const baselineRecommendations = mockAircraft.flatMap(aircraft => {
      const today = new Date();
      return [
        {
          id: `baseline-${aircraft.id}-100hour`,
          aircraftId: aircraft.id,
          tailNumber: aircraft.tailNumber,
          maintenanceType: '100_HOUR',
          urgency: 'MEDIUM',
          scheduledDate: today,
          recommendedDate: today.toISOString(),
          estimatedCost: 4000,
          estimatedDuration: 8,
          estimatedDowntime: 8,
          description: `100-hour inspection for ${aircraft.tailNumber}`,
          aiConfidence: 0.8,
          reasoning: ['Recurring 100-hour maintenance interval due based on flight hours'],
          status: 'PENDING',
          workflowId: null,
          complianceRequirements: ['FAR 91.409'],
          riskFactors: ['Routine maintenance'],
          affectedAssets: [aircraft.tailNumber],
          requiredPersonnel: ['Certified Mechanic', 'Inspector'],
          timeWindow: {
            earliest: today.toISOString(),
            latest: new Date(today.getTime() + 14 * 24 * 60 * 60 * 1000).toISOString(),
            optimal: new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString()
          },
          createdAt: today.toISOString()
        },
        {
          id: `baseline-${aircraft.id}-annual`,
          aircraftId: aircraft.id,
          tailNumber: aircraft.tailNumber,
          maintenanceType: 'ANNUAL',
          urgency: 'HIGH',
          scheduledDate: new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000),
          recommendedDate: new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          estimatedCost: 18000,
          estimatedDuration: 36,
          estimatedDowntime: 36,
          description: `Annual inspection for ${aircraft.tailNumber}`,
          aiConfidence: 0.95,
          reasoning: ['Annual inspection required by FAR regulations'],
          status: 'PENDING',
          workflowId: null,
          complianceRequirements: ['FAR 91.409', 'FAR 43.9'],
          riskFactors: ['Critical maintenance'],
          affectedAssets: [aircraft.tailNumber],
          requiredPersonnel: ['Certified Mechanic', 'Inspector', 'Supervisor'],
          timeWindow: {
            earliest: new Date(today.getTime() + 21 * 24 * 60 * 60 * 1000).toISOString(),
            latest: new Date(today.getTime() + 45 * 24 * 60 * 60 * 1000).toISOString(),
            optimal: new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString()
          },
          createdAt: today.toISOString()
        }
      ];
    });
    
    // Update the global recommendations
    mockRecommendations.push(...baselineRecommendations);
    filteredRecommendations = [...baselineRecommendations];
  }
  
  if (tailNumber) {
    filteredRecommendations = filteredRecommendations.filter(r => r.tailNumber === tailNumber);
  }
  
  if (status) {
    filteredRecommendations = filteredRecommendations.filter(r => r.status === status);
  }
  
  return NextResponse.json({
    success: true,
    data: {
      recommendations: filteredRecommendations,
      totalCount: filteredRecommendations.length,
      pendingApprovals: filteredRecommendations.filter(r => r.status === 'PENDING').length,
      activeWorkflows: filteredRecommendations.filter(r => ['APPROVED', 'SCHEDULED', 'IN_PROGRESS'].includes(r.status)).length
    },
    timestamp: new Date().toISOString()
  });
}

// New endpoint: Get Workflow Status
async function getWorkflowStatus(searchParams: URLSearchParams) {
  const recommendationId = searchParams.get('recommendationId');
  
  if (!recommendationId) {
    return NextResponse.json(
      { error: 'recommendationId parameter is required' },
      { status: 400 }
    );
  }
  
  const status = agenticWorkflow.getWorkflowStatus(recommendationId);
  
  return NextResponse.json({
    success: true,
    data: status,
    timestamp: new Date().toISOString()
  });
}

// New endpoint: Get Audit Trail
async function getAuditTrail(searchParams: URLSearchParams) {
  const complianceOnly = searchParams.get('complianceOnly') === 'true';
  
  const auditTrail = agenticWorkflow.getAuditTrail(complianceOnly);
  
  return NextResponse.json({
    success: true,
    data: {
      auditTrail: auditTrail.slice(-50), // Latest 50 entries
      totalEntries: auditTrail.length,
      complianceEntries: auditTrail.filter(entry => entry.complianceRelevant).length
    },
    timestamp: new Date().toISOString()
  });
}

// New endpoint: Get Task Checklist
async function getTaskChecklist(searchParams: URLSearchParams) {
  const maintenanceType = searchParams.get('maintenanceType');
  
  if (!maintenanceType || !maintenanceChecklists[maintenanceType]) {
    return NextResponse.json(
      { error: 'Invalid or missing maintenanceType parameter' },
      { status: 400 }
    );
  }
  
  const checklist = maintenanceChecklists[maintenanceType];
  
  return NextResponse.json({
    success: true,
    data: {
      checklist,
      tasksByCategory: {
        VISUAL: checklist.tasks.filter(t => t.category === 'VISUAL'),
        OPERATIONAL: checklist.tasks.filter(t => t.category === 'OPERATIONAL'),
        SYSTEMS: checklist.tasks.filter(t => t.category === 'SYSTEMS'),
        STRUCTURAL: checklist.tasks.filter(t => t.category === 'STRUCTURAL'),
        COMPLIANCE: checklist.tasks.filter(t => t.category === 'COMPLIANCE'),
        LUBRICATION: checklist.tasks.filter(t => t.category === 'LUBRICATION'),
        SERVICING: checklist.tasks.filter(t => t.category === 'SERVICING')
      },
      criticalSafetyTasks: checklist.tasks.filter(t => t.criticalSafety),
      iaRequiredTasks: checklist.tasks.filter(t => t.requiresIA)
    },
    timestamp: new Date().toISOString()
  });
}

// New endpoint: Get Active Workflows
async function getActiveWorkflows(searchParams: URLSearchParams) {
  const status = searchParams.get('status');
  const aircraftId = searchParams.get('aircraftId');
  
  // Generate mock active workflows based on approved recommendations
  const approvedRecommendations = mockRecommendations.filter(r => 
    ['APPROVED', 'SCHEDULED', 'IN_PROGRESS'].includes(r.status)
  );
  
  const activeWorkflows: ActiveWorkflow[] = approvedRecommendations.map((rec, index) => {
    const workflowId = `workflow-${rec.id}`;
    
    // Check if workflow already exists, otherwise create it
    if (!mockActiveWorkflows[workflowId]) {
      mockActiveWorkflows[workflowId] = createWorkflowFromRecommendation(rec, index);
    }
    
    return mockActiveWorkflows[workflowId];
  });
  
  // Filter by status if provided
  let filteredWorkflows = activeWorkflows;
  if (status) {
    filteredWorkflows = activeWorkflows.filter(w => w.status === status);
  }
  
  // Filter by aircraft if provided
  if (aircraftId) {
    filteredWorkflows = filteredWorkflows.filter(w => w.aircraftId === aircraftId);
  }
  
  return NextResponse.json({
    success: true,
    data: {
      workflows: filteredWorkflows,
      totalActive: activeWorkflows.length,
      byStatus: {
        INITIATED: activeWorkflows.filter(w => w.status === 'INITIATED').length,
        IN_PROGRESS: activeWorkflows.filter(w => w.status === 'IN_PROGRESS').length,
        AWAITING_PARTS: activeWorkflows.filter(w => w.status === 'AWAITING_PARTS').length,
        INSPECTION: activeWorkflows.filter(w => w.status === 'INSPECTION').length,
        DELAYED: activeWorkflows.filter(w => w.status === 'DELAYED').length
      },
      nextMilestones: activeWorkflows.map(w => ({
        workflowId: w.id,
        tailNumber: w.tailNumber,
        nextMilestone: w.progress.nextMilestone,
        estimatedCompletion: w.timeline.estimatedCompletion
      }))
    },
    timestamp: new Date().toISOString()
  });
}

// Helper function to create workflow from recommendation
function createWorkflowFromRecommendation(recommendation: any, index: number): ActiveWorkflow {
  const statuses = ['INITIATED', 'IN_PROGRESS', 'AWAITING_PARTS', 'INSPECTION', 'DELAYED'];
  const currentStatus = statuses[index % statuses.length];
  
  const tasksCompleted = Math.floor(Math.random() * 8) + 2; // 2-10 completed
  const totalTasks = tasksCompleted + Math.floor(Math.random() * 5) + 3; // 3-8 remaining
  
  const aircraft = mockAircraft.find(a => a.id === recommendation.aircraftId);
  
  return {
    id: `workflow-${recommendation.id}`,
    recommendationId: recommendation.id,
    aircraftId: recommendation.aircraftId,
    tailNumber: recommendation.tailNumber,
    maintenanceType: recommendation.maintenanceType,
    status: currentStatus as any,
    progress: {
      tasksCompleted,
      totalTasks,
      currentTask: getCurrentTask(currentStatus, recommendation.maintenanceType),
      nextMilestone: getNextMilestone(currentStatus),
      estimatedCompletion: new Date(Date.now() + Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString()
    },
    assignments: {
      mechanic: ['John Smith', 'Mike Wilson', 'Sarah Rodriguez'][index % 3],
      inspector: currentStatus === 'INSPECTION' ? 'David Chen' : undefined,
      supervisor: 'Tom Anderson'
    },
    resources: {
      hangar: `Hangar ${['A', 'B', 'C'][index % 3]} - Bay ${(index % 4) + 1}`,
      equipment: getRequiredEquipment(recommendation.maintenanceType),
      parts: ['Oil Filter', 'Spark Plugs', 'Brake Pads', 'Hydraulic Fluid'].slice(0, Math.floor(Math.random() * 3) + 1)
    },
    timeline: {
      started: new Date(Date.now() - Math.random() * 3 * 24 * 60 * 60 * 1000).toISOString(),
      estimatedCompletion: new Date(Date.now() + Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString()
    },
    notifications: {
      lastSent: new Date(Date.now() - Math.random() * 6 * 60 * 60 * 1000).toISOString(),
      nextReminder: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(),
      escalationLevel: Math.floor(Math.random() * 3)
    }
  };
}

function getCurrentTask(status: string, maintenanceType: string): string {
  const taskMap = {
    'INITIATED': 'Setting up work area and gathering tools',
    'IN_PROGRESS': `Performing ${maintenanceType} inspection procedures`,
    'AWAITING_PARTS': 'Waiting for parts delivery - Oil filter and spark plugs',
    'INSPECTION': 'Final quality inspection and documentation',
    'DELAYED': 'Resolving technical issue - Awaiting manufacturer guidance'
  };
  return taskMap[status] || 'Unknown task';
}

function getNextMilestone(status: string): string {
  const milestoneMap = {
    'INITIATED': 'Begin primary inspection procedures',
    'IN_PROGRESS': 'Complete systems testing',
    'AWAITING_PARTS': 'Resume work upon parts arrival',
    'INSPECTION': 'Final sign-off and aircraft release',
    'DELAYED': 'Technical issue resolution'
  };
  return milestoneMap[status] || 'Continue work';
}

function getRequiredEquipment(maintenanceType: string): string[] {
  const equipmentMap = {
    'A_CHECK': ['Basic Tool Kit', 'Multimeter', 'Torque Wrench'],
    'C_CHECK': ['Comprehensive Tool Kit', 'Lift Equipment', 'Borescope', 'Pressure Test Kit'],
    '100_HOUR': ['Engine Tools', 'Oil Analysis Kit', 'Compression Tester'],
    'ANNUAL': ['Full Inspection Kit', 'NDT Equipment', 'Calibration Tools'],
    'PROGRESSIVE': ['Progressive Kit', 'Documentation System']
  };
  return equipmentMap[maintenanceType] || ['Standard Tool Kit'];
}

// POST endpoint enhanced with agentic workflow
export async function POST(request: NextRequest) {
  const body = await request.json();
  const action = body.action;
  
  try {
    switch (action) {
      case 'update-config':
        return await updateSchedulingConfig(body);
      
      case 'manual-schedule':
        return await createManualSchedule(body);
      
      case 'approve-schedule':
        return await approveSchedule(body);
      
      case 'approve-recommendation':
        return await approveRecommendation(body);
      
      case 'reject-recommendation':
        return await rejectRecommendation(body);
      
      case 'update-task-status':
        return await updateTaskStatus(body);
      
      case 'update-workflow-status':
        return await updateWorkflowStatus(body);
      
      default:
        return NextResponse.json(
          { error: 'Invalid action. Use: update-config, manual-schedule, approve-schedule, approve-recommendation, reject-recommendation, update-task-status, or update-workflow-status' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Maintenance schedule POST error:', error);
    return NextResponse.json(
      { error: 'Failed to process scheduling update' },
      { status: 500 }
    );
  }
}

async function updateSchedulingConfig(body: any) {
  // In production, this would update the database
  const newConfig = { ...defaultSchedulingConfig, ...body.config };
  
  return NextResponse.json({
    success: true,
    message: 'Scheduling configuration updated',
    config: newConfig,
    timestamp: new Date().toISOString()
  });
}

async function createManualSchedule(body: any) {
  const { aircraftId, maintenanceType, scheduledDate, notes } = body;
  
  // Create manual schedule item
  const manualItem = {
    id: `manual-${Date.now()}`,
    aircraftId,
    tailNumber: mockAircraft.find(a => a.id === aircraftId)?.tailNumber || 'Unknown',
    maintenanceType,
    scheduledDate: new Date(scheduledDate),
    estimatedDuration: 8, // Default
    priority: 'MEDIUM' as const,
    confidenceScore: 1.0,
    reasoning: ['Manually scheduled', notes].filter(Boolean),
    conflictsWith: [],
    alternativeDates: [],
    estimatedCost: 5000, // Default
    impactOnOperations: 'MEDIUM' as const,
    requiredParts: [],
    mechanicRequirements: ['A&P Mechanic']
  };
  
  return NextResponse.json({
    success: true,
    data: manualItem,
    message: 'Manual maintenance scheduled successfully',
    timestamp: new Date().toISOString()
  });
}

async function approveSchedule(body: any) {
  const { scheduleId, approvedBy } = body;
  
  return NextResponse.json({
    success: true,
    message: `Schedule ${scheduleId} approved by ${approvedBy}`,
    approvalDate: new Date().toISOString(),
    timestamp: new Date().toISOString()
  });
}

// Enhanced approval endpoint to create workflow and send email notifications
async function approveRecommendation(body: any) {
  const { recommendationId, approvedBy, approvalNotes } = body;
  
  if (!recommendationId || !approvedBy) {
    return NextResponse.json(
      { error: 'recommendationId and approvedBy are required' },
      { status: 400 }
    );
  }
  
  // Find the recommendation
  const recommendation = mockRecommendations.find(r => r.id === recommendationId);
  if (!recommendation) {
    return NextResponse.json(
      { error: 'Recommendation not found' },
      { status: 404 }
    );
  }
  
  // Find aircraft information
  const aircraft = mockAircraft.find(a => a.id === recommendation.aircraftId);
  if (!aircraft) {
    return NextResponse.json(
      { error: 'Aircraft not found' },
      { status: 404 }
    );
  }
  
  // Update recommendation status
  recommendation.status = 'APPROVED';
  recommendation.approvedBy = approvedBy;
  recommendation.approvedAt = new Date();
  
  // Create active workflow
  const workflowId = `workflow-${recommendationId}`;
  mockActiveWorkflows[workflowId] = createWorkflowFromRecommendation(recommendation, Object.keys(mockActiveWorkflows).length);
  const activeWorkflow = mockActiveWorkflows[workflowId];
  
  // Trigger agentic workflow
  const workflowResult = await agenticWorkflow.approveRecommendation(
    recommendationId,
    approvedBy,
    approvalNotes
  );
  
  // **NEW: Send email notifications to all relevant personnel**
  try {
    // Initialize email service with configuration
    const emailConfig = getEmailConfig();
    const emailService = new MaintenanceEmailService('http://localhost:3000', emailConfig);
    
    console.log(`🧪 Test email service initialized with provider: ${emailConfig.provider}`);
    
    // Get recipients based on maintenance type
    const recipients = MaintenanceEmailService.getDefaultRecipients(recommendation.maintenanceType);
    
    // Prepare email data
    const emailData: MaintenanceEmailData = {
      recommendationId: recommendation.id,
      workflowId: activeWorkflow.id,
      aircraftInfo: {
        tailNumber: aircraft.tailNumber,
        make: aircraft.make,
        model: aircraft.model,
        totalTime: aircraft.totalAircraftTime
      },
      maintenanceDetails: {
        type: recommendation.maintenanceType,
        scheduledDate: recommendation.recommendedDate,
        estimatedDuration: recommendation.estimatedDowntime,
        location: activeWorkflow.resources.hangar,
        estimatedCost: recommendation.estimatedCost
      },
      taskAssignments: {
        mechanic: activeWorkflow.assignments.mechanic,
        inspector: activeWorkflow.assignments.inspector,
        supervisor: activeWorkflow.assignments.supervisor
      },
      resources: {
        hangar: activeWorkflow.resources.hangar,
        equipment: activeWorkflow.resources.equipment,
        parts: activeWorkflow.resources.parts
      },
      complianceInfo: {
        regulations: [
          'FAR Part 135 - Operating Requirements',
          'FAR Part 43 - Maintenance Requirements',
          'FAR Part 91.409 - Inspection Requirements'
        ],
        requiredDocumentation: [
          'Maintenance Log Entry',
          'Work Order Completion',
          'Inspector Sign-off',
          'Return to Service Documentation'
        ]
      },
      approvalInfo: {
        approvedBy,
        approvedAt: new Date().toISOString(),
        notes: approvalNotes
      }
    };
    
    // Send emails to all recipients
    console.log(`🚀 INITIATING EMAIL NOTIFICATIONS FOR ${aircraft.tailNumber} MAINTENANCE`);
    const emailResults = await emailService.sendMaintenanceNotificationEmails(emailData, recipients);
    
    const automatedActions = [
      'Task assignments created and notifications sent',
      'Calendar events scheduled and resources booked',
      'Work order generated with detailed checklists',
      'Compliance logs created for audit trail',
      'Pre-maintenance reminders scheduled',
      'Active workflow tracking initiated',
      `📧 Email notifications sent to ${emailResults.sentEmails} personnel`,
      ...recipients.map(r => `   • ${r.name} (${r.role}) - ${r.email}`),
      ...(emailResults.failures.length > 0 ? [`⚠️  ${emailResults.failures.length} email failures`] : [])
    ];
    
    return NextResponse.json({
      success: workflowResult.success,
      data: {
        recommendation,
        workflow: workflowResult,
        activeWorkflow,
        emailNotifications: {
          sent: emailResults.sentEmails,
          recipients: recipients.map(r => ({ name: r.name, role: r.role, email: r.email })),
          failures: emailResults.failures,
          success: emailResults.success
        },
        automatedActions
      },
      message: emailResults.success 
        ? `${workflowResult.message} Email notifications sent to ${emailResults.sentEmails} personnel.`
        : `${workflowResult.message} Email notifications sent to ${emailResults.sentEmails} personnel with ${emailResults.failures.length} failures.`,
      timestamp: new Date().toISOString()
    });
    
  } catch (emailError) {
    console.error('Email notification error:', emailError);
    
    // Still return success for workflow creation, but note email failure
    return NextResponse.json({
      success: workflowResult.success,
      data: {
        recommendation,
        workflow: workflowResult,
        activeWorkflow,
        emailNotifications: {
          sent: 0,
          recipients: [],
          failures: [`Email service error: ${emailError.message}`],
          success: false
        },
        automatedActions: [
          'Task assignments created and notifications sent',
          'Calendar events scheduled and resources booked', 
          'Work order generated with detailed checklists',
          'Compliance logs created for audit trail',
          'Pre-maintenance reminders scheduled',
          'Active workflow tracking initiated',
          '❌ Email notifications failed - manual notification required'
        ]
      },
      message: `${workflowResult.message} Warning: Email notifications failed.`,
      timestamp: new Date().toISOString()
    });
  }
}

// New endpoint: Reject AI Recommendation
async function rejectRecommendation(body: any) {
  const { recommendationId, rejectedBy, rejectionReason } = body;
  
  if (!recommendationId || !rejectedBy) {
    return NextResponse.json(
      { error: 'recommendationId and rejectedBy are required' },
      { status: 400 }
    );
  }
  
  // Find and update the recommendation
  const recommendation = mockRecommendations.find(r => r.id === recommendationId);
  if (!recommendation) {
    return NextResponse.json(
      { error: 'Recommendation not found' },
      { status: 404 }
    );
  }
  
  recommendation.status = 'REJECTED';
  
  return NextResponse.json({
    success: true,
    data: {
      recommendation,
      rejectionReason
    },
    message: 'Recommendation rejected successfully',
    timestamp: new Date().toISOString()
  });
}

// New endpoint: Update Task Status
async function updateTaskStatus(body: any) {
  const { taskId, workOrderId, status, completedBy, notes } = body;
  
  return NextResponse.json({
    success: true,
    data: {
      taskId,
      workOrderId,
      status,
      completedBy,
      updatedAt: new Date(),
      notes
    },
    message: 'Task status updated successfully',
    timestamp: new Date().toISOString()
  });
}

// New endpoint: Update Workflow Status
async function updateWorkflowStatus(body: any) {
  const { workflowId, status, updatedBy, notes } = body;
  
  if (!workflowId || !status) {
    return NextResponse.json(
      { error: 'workflowId and status are required' },
      { status: 400 }
    );
  }
  
  // Update workflow status in mock storage
  if (mockActiveWorkflows[workflowId]) {
    const workflow = mockActiveWorkflows[workflowId];
    const oldStatus = workflow.status;
    
    workflow.status = status;
    workflow.notifications.lastSent = new Date().toISOString();
    workflow.notifications.nextReminder = new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString();
    
    // Update progress based on new status
    if (status === 'IN_PROGRESS') {
      workflow.progress.currentTask = `Performing ${workflow.maintenanceType} inspection procedures`;
      workflow.progress.nextMilestone = 'Complete systems testing';
    } else if (status === 'AWAITING_PARTS') {
      workflow.progress.currentTask = 'Waiting for parts delivery - Oil filter and spark plugs';
      workflow.progress.nextMilestone = 'Resume work upon parts arrival';
    } else if (status === 'INSPECTION') {
      workflow.progress.currentTask = 'Final quality inspection and documentation';
      workflow.progress.nextMilestone = 'Final sign-off and aircraft release';
      workflow.assignments.inspector = 'David Chen';
    } else if (status === 'DELAYED') {
      workflow.progress.currentTask = 'Resolving technical issue - Awaiting manufacturer guidance';
      workflow.progress.nextMilestone = 'Technical issue resolution';
      workflow.notifications.escalationLevel = 1;
    }
    
    return NextResponse.json({
      success: true,
      data: {
        workflowId,
        oldStatus,
        newStatus: status,
        workflow,
        message: `Workflow status updated from ${oldStatus} to ${status}`
      },
      timestamp: new Date().toISOString()
    });
  } else {
    return NextResponse.json(
      { error: 'Workflow not found' },
      { status: 404 }
    );
  }
}

// Helper functions to generate realistic mock data
async function generateMockFlightHistory() {
  const history = [];
  const now = new Date();
  
  // Create different utilization profiles for each aircraft
  const utilizationProfiles = {
    'n123ab': { // High utilization aircraft
      flightProbability: 0.85, // 85% chance of flight per day
      avgFlightTime: 180, // 3 hours average
      flightTimeVariation: 120, // +/- 2 hours
      cycles: 1.2 // Sometimes multiple legs per day
    },
    'n456cd': { // Medium utilization aircraft  
      flightProbability: 0.60, // 60% chance of flight per day
      avgFlightTime: 150, // 2.5 hours average
      flightTimeVariation: 90, // +/- 1.5 hours
      cycles: 1.0
    },
    'n789xy': { // Lower utilization aircraft
      flightProbability: 0.35, // 35% chance of flight per day
      avgFlightTime: 120, // 2 hours average
      flightTimeVariation: 60, // +/- 1 hour
      cycles: 0.8
    }
  };
  
  for (const aircraft of mockAircraft) {
    const profile = utilizationProfiles[aircraft.id] || utilizationProfiles['n456cd']; // Default to medium
    
    // Generate 30 days of flight history with realistic patterns
    for (let i = 0; i < 30; i++) {
      const flightDate = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const dayOfWeek = flightDate.getDay();
      
      // Adjust probability based on day of week (less flights on weekends for business aviation)
      let adjustedProbability = profile.flightProbability;
      if (dayOfWeek === 0 || dayOfWeek === 6) { // Sunday or Saturday
        adjustedProbability *= 0.4; // Reduce weekend flights
      } else if (dayOfWeek === 1 || dayOfWeek === 5) { // Monday or Friday
        adjustedProbability *= 1.2; // Increase Mon/Fri flights
      }
      
      // Determine if aircraft flies this day
      if (Math.random() < adjustedProbability) {
        const numberOfFlights = Math.random() < (profile.cycles - 1) ? 2 : 1; // Sometimes multiple flights
        
        for (let flightNum = 0; flightNum < numberOfFlights; flightNum++) {
          // Generate realistic flight time with variation
          const baseFlightTime = profile.avgFlightTime + (Math.random() - 0.5) * profile.flightTimeVariation;
          const flightTime = Math.max(30, Math.min(480, baseFlightTime)); // 30min to 8hrs
          const blockTime = flightTime + (15 + Math.random() * 15); // Add taxi time
          
          // Generate departure time based on flight number
          const baseHour = flightNum === 0 ? 8 + Math.random() * 4 : 14 + Math.random() * 4; // Morning or afternoon
          const departureTime = new Date(flightDate.getTime() + baseHour * 60 * 60 * 1000);
          const arrivalTime = new Date(departureTime.getTime() + flightTime * 60 * 1000);
          
          // Create realistic airport pairs
          const airportPairs = [
            ['KJFK', 'KORD'], ['KORD', 'KJFK'], // NYC to Chicago
            ['KLAX', 'KORD'], ['KORD', 'KLAX'], // LA to Chicago  
            ['KJFK', 'KLAX'], ['KLAX', 'KJFK'], // Coast to coast
            ['KBOS', 'KIAD'], ['KIAD', 'KBOS'], // Boston to DC
            ['KORD', 'KDEN'], ['KDEN', 'KORD'], // Chicago to Denver
            ['KJFK', 'KMIA'], ['KMIA', 'KJFK'], // NYC to Miami
            ['KLAX', 'KLAS'], ['KLAS', 'KLAX'], // LA to Vegas (short)
            ['KBOS', 'KJFK'], ['KJFK', 'KBOS']  // Boston to NYC (short)
          ];
          
          const [departure, arrival] = airportPairs[Math.floor(Math.random() * airportPairs.length)];
          
          // Calculate realistic metrics based on route
          const distance = calculateDistance(departure, arrival);
          const avgSpeed = 420 + Math.random() * 80; // 420-500 knots
          const fuelUsed = distance * (2.8 + Math.random() * 0.8); // 2.8-3.6 gallons per nm
          
          history.push({
            id: `flight-${aircraft.id}-${i}-${flightNum}`,
            aircraftId: aircraft.id,
            flightDate: flightDate, // Keep as Date object instead of string
            departure: {
              airport: departure,
              time: departureTime,
              hobbs: aircraft.totalAircraftTime - (flightTime / 60)
            },
            arrival: {
              airport: arrival,
              time: arrivalTime,
              hobbs: aircraft.totalAircraftTime
            },
            blockTime: Math.round(blockTime),
            flightTime: Math.round(flightTime),
            cycles: 1,
            maxAltitude: 35000 + Math.random() * 6000,
            averageSpeed: Math.round(avgSpeed),
            fuelUsed: Math.round(fuelUsed),
            distance: Math.round(distance),
            pilotInCommand: ['John Smith', 'Sarah Johnson', 'Mike Wilson', 'Lisa Chen', 'David Rodriguez'][Math.floor(Math.random() * 5)],
            notes: Math.random() > 0.9 ? generateFlightNote() : undefined
          });
        }
      }
    }
  }
  
  return history;
}

// Helper function to calculate realistic distances between airports
function calculateDistance(airport1: string, airport2: string): number {
  // Simplified distance calculator using rough airport coordinates
  const airportDistances = {
    'KJFK-KORD': 740, 'KORD-KJFK': 740,
    'KLAX-KORD': 1745, 'KORD-KLAX': 1745,
    'KJFK-KLAX': 2475, 'KLAX-KJFK': 2475,
    'KBOS-KIAD': 400, 'KIAD-KBOS': 400,
    'KORD-KDEN': 888, 'KDEN-KORD': 888,
    'KJFK-KMIA': 1095, 'KMIA-KJFK': 1095,
    'KLAX-KLAS': 236, 'KLAS-KLAX': 236,
    'KBOS-KJFK': 187, 'KJFK-KBOS': 187
  };
  
  const key = `${airport1}-${airport2}`;
  return airportDistances[key] || 500 + Math.random() * 1000; // Default range
}

// Generate interesting flight notes occasionally
function generateFlightNote(): string {
  const notes = [
    'Normal operations',
    'Minor weather delay on departure',
    'Fuel stop due to headwinds',
    'VIP passenger transport',
    'Training flight with instructor',
    'Repositioning flight',
    'Medical transport mission',
    'Charter flight to corporate meeting'
  ];
  return notes[Math.floor(Math.random() * notes.length)];
}

async function generateMockUpcomingFlights() {
  const upcomingFlights = [];
  const now = new Date();
  
  for (const aircraft of mockAircraft) {
    // Generate next 14 days of planned flights
    for (let i = 1; i <= 14; i++) {
      const flightDate = new Date(now.getTime() + i * 24 * 60 * 60 * 1000);
      
      // Simulate realistic scheduling (less frequent in future)
      if (Math.random() > 0.5) { // 50% chance of planned flight
        upcomingFlights.push({
          id: `planned-${aircraft.id}-${i}`,
          aircraftId: aircraft.id,
          flightNumber: `GAC${Math.floor(Math.random() * 1000)}`,
          departure: {
            airport: ['KJFK', 'KORD', 'KLAX'][Math.floor(Math.random() * 3)],
            scheduledTime: new Date(flightDate.getTime() + 10 * 60 * 60 * 1000), // 10 AM
          },
          arrival: {
            airport: ['KORD', 'KLAX', 'KJFK'][Math.floor(Math.random() * 3)],
            scheduledTime: new Date(flightDate.getTime() + 13 * 60 * 60 * 1000), // 1 PM
          },
          route: 'Direct',
          estimatedFlightTime: 180, // 3 hours
          estimatedBlockTime: 200,
          fuelRequired: 900,
          passengers: Math.floor(Math.random() * 8) + 2,
          crew: 2,
          status: 'PLANNED' as const,
          pilotInCommand: 'TBD',
          createdAt: new Date()
        });
      }
    }
  }
  
  return upcomingFlights;
}

// Add the missing generateOptimizationInsights function
function generateOptimizationInsights(recommendations: any[], utilizationData: any[]) {
  if (!recommendations || recommendations.length === 0) {
    return {
      costSavings: 0,
      timeOptimization: 0,
      riskReduction: 0,
      efficiency: 0,
      summary: 'No recommendations available for analysis'
    };
  }

  const totalCost = recommendations.reduce((sum, rec) => sum + (rec.estimatedCost || 0), 0);
  const avgConfidence = recommendations.reduce((sum, rec) => sum + (rec.aiConfidence || 0), 0) / recommendations.length;
  const highPriorityCount = recommendations.filter(rec => rec.urgency === 'HIGH' || rec.urgency === 'CRITICAL').length;
  const utilizationSum = utilizationData.reduce((sum, data) => sum + (data.averageUtilization || 0), 0);
  const avgUtilization = utilizationData.length > 0 ? utilizationSum / utilizationData.length : 0;

  return {
    costSavings: Math.round(totalCost * 0.15), // Estimated 15% cost savings from optimization
    timeOptimization: Math.round(recommendations.length * 2.5), // Hours saved per recommendation
    riskReduction: Math.round(avgConfidence * 100), // Risk reduction percentage
    efficiency: Math.round(avgUtilization + (avgConfidence * 20)), // Overall efficiency score
    summary: `Optimized ${recommendations.length} maintenance items with ${Math.round(avgConfidence * 100)}% average confidence. ${highPriorityCount} high-priority items identified.`,
    breakdown: {
      totalRecommendations: recommendations.length,
      highPriorityItems: highPriorityCount,
      averageConfidence: Math.round(avgConfidence * 100),
      averageUtilization: Math.round(avgUtilization),
      estimatedTotalCost: totalCost
    }
  };
}