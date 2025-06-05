// Aircraft Types
export interface Aircraft {
  id: string;
  tailNumber: string;
  make: string;
  model: string;
  serialNumber: string;
  yearOfManufacture: number;
  totalAircraftTime: number; // in hours
  totalCycles: number;
  isActive: boolean;
  certificateOfAirworthiness?: string;
  lastInspectionDate: Date;
  nextInspectionDue: Date;
  createdAt: Date;
  updatedAt: Date;
  // Real-time tracking data
  currentPosition?: AircraftPosition;
  currentFlight?: FlightData;
  flightStatus: 'AVAILABLE' | 'IN_FLIGHT' | 'MAINTENANCE' | 'SCHEDULED';
  lastFlightTime?: Date;
  // Maintenance tracking integration
  hobbsTime?: number; // engine hours from Hobbs meter
  tachoTime?: number; // tachometer time
  engineTimeTracking: 'HOBBS' | 'TACH' | 'FLIGHT_TIME';
  // ADS-B/Tracking configuration
  icaoAddress?: string; // 24-bit ICAO aircraft address
  modeS?: string; // Mode S transponder code
  adsb?: {
    enabled: boolean;
    equipmentType: string;
    lastSeen?: Date;
  };
}

// Maintenance Interval Types
export interface MaintenanceInterval {
  id: string;
  aircraftId: string;
  intervalType: 'A_CHECK' | '2A_CHECK' | '3A_CHECK' | '4A_CHECK' | '5A_CHECK' | '10A_CHECK' | 
               'C_CHECK' | '2C_CHECK' | '3C_CHECK' | '4C_CHECK' | '5C_CHECK' | '6C_CHECK' | '8C_CHECK' |
               'ANNUAL' | 'PROGRESSIVE' | '100_HOUR' | 'DAILY';
  description: string;
  intervalHours?: number; // flight hours
  intervalCycles?: number;
  intervalCalendar?: number; // days
  lastCompletedAt?: Date;
  lastCompletedHours?: number;
  nextDueAt: Date;
  nextDueHours: number;
  isOverdue: boolean;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  estimatedDowntime: number; // hours
  estimatedCost: number;
}

// Work Order Types
export interface WorkOrder {
  id: string;
  aircraftId: string;
  workOrderNumber: string;
  title: string;
  description: string;
  status: 'OPEN' | 'IN_PROGRESS' | 'WAITING_PARTS' | 'COMPLETED' | 'CANCELLED';
  priority: 'ROUTINE' | 'URGENT' | 'AOG'; // Aircraft On Ground
  category: 'SCHEDULED' | 'UNSCHEDULED' | 'MODIFICATION' | 'REPAIR';
  mechanicAssigned?: string;
  inspectorAssigned?: string;
  estimatedHours: number;
  actualHours?: number;
  partsRequired: MaintenancePart[];
  createdAt: Date;
  scheduledStartDate: Date;
  actualStartDate?: Date;
  completedDate?: Date;
  signOffData?: MaintenanceSignOff;
}

// Parts Management
export interface MaintenancePart {
  id: string;
  partNumber: string;
  description: string;
  manufacturer: string;
  quantity: number;
  unitCost: number;
  inStock: number;
  minStockLevel: number;
  location: string;
  serialNumbers?: string[];
  expirationDate?: Date;
  category: 'CONSUMABLE' | 'ROTABLE' | 'EXPENDABLE' | 'LIFE_LIMITED';
}

// Compliance and Sign-offs
export interface MaintenanceSignOff {
  mechanicLicenseNumber: string;
  mechanicName: string;
  inspectorLicenseNumber?: string;
  inspectorName?: string;
  signOffDate: Date;
  notes?: string;
  returnToServiceAuthorization: boolean;
}

// Part 135 Compliance
export interface ComplianceItem {
  id: string;
  aircraftId: string;
  regulationType: 'PART_135' | 'PART_91' | 'PART_145';
  regulation: string; // e.g., "135.411", "135.419"
  description: string;
  dueDate: Date;
  completedDate?: Date;
  status: 'CURRENT' | 'DUE_SOON' | 'OVERDUE' | 'COMPLETED';
  recurrenceInterval?: number; // days
  responsible: string;
  notes?: string;
}

// AI Assistant Types
export interface MaintenanceAssistantMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  metadata?: {
    aircraftTailNumber?: string;
    workOrderId?: string;
    voiceInput?: boolean;
    confidence?: number;
  };
}

// Voice Recognition Types
export interface VoiceCommand {
  transcript: string;
  confidence: number;
  intent: 'CREATE_WORK_ORDER' | 'UPDATE_STATUS' | 'CHECK_SCHEDULE' | 'FIND_AIRCRAFT' | 'UNKNOWN';
  entities?: {
    aircraftTailNumber?: string;
    workOrderNumber?: string;
    maintenanceType?: string;
    priority?: string;
  };
}

// Dashboard Analytics
export interface MaintenanceMetrics {
  totalAircraft: number;
  activeWorkOrders: number;
  overdueItems: number;
  avgTurnaroundTime: number; // hours
  compliancePercentage: number;
  monthlyMaintenanceCost: number;
  aircraftAvailability: number; // percentage
  upcomingInspections: MaintenanceInterval[];
}

// User Management (for maintenance personnel)
export interface MaintenanceUser {
  id: string;
  email: string;
  name: string;
  role: 'MECHANIC' | 'INSPECTOR' | 'MANAGER' | 'PILOT';
  licenseNumber?: string;
  licenseExpiration?: Date;
  certifications: string[];
  isActive: boolean;
  permissions: string[];
}

// Pilot Reports (integration with flight operations)
export interface PilotReport {
  id: string;
  aircraftId: string;
  pilotName: string;
  flightDate: Date;
  flightHours: number;
  cycles: number;
  discrepancies?: string;
  oilAdded?: number;
  fuelAdded?: number;
  status: 'NORMAL' | 'DISCREPANCY' | 'AOG';
  createdAt: Date;
}

// Flight Tracking & Real-time Data Types
export interface FlightData {
  id: string;
  aircraftId: string;
  tailNumber: string;
  // ADS-B/FlightAware data
  callsign?: string;
  squawk?: string;
  latitude: number;
  longitude: number;
  altitude: number; // feet
  groundSpeed: number; // knots
  track: number; // degrees
  verticalRate: number; // feet per minute
  isOnGround: boolean;
  lastContact: Date;
  // Flight status
  flightStatus: 'SCHEDULED' | 'ACTIVE' | 'LANDED' | 'CANCELLED' | 'DELAYED';
  departureAirport?: string;
  arrivalAirport?: string;
  estimatedDeparture?: Date;
  actualDeparture?: Date;
  estimatedArrival?: Date;
  actualArrival?: Date;
  // Engine/maintenance relevant data
  engineRunTime?: number; // minutes for current flight
  blockTime?: number; // total block time in minutes
  flightTime?: number; // airborne time in minutes
  cycles?: number; // engine cycles (takeoffs)
  dataSource: 'ADS-B' | 'FLIGHTAWARE' | 'OPENSKY' | 'MANUAL' | 'MOCK';
  lastUpdated: Date;
}

export interface AircraftPosition {
  tailNumber: string;
  latitude: number;
  longitude: number;
  altitude: number;
  heading: number;
  groundSpeed: number;
  isOnGround: boolean;
  lastSeen: Date;
  airport?: string;
  flightPhase: 'PREFLIGHT' | 'TAXI' | 'TAKEOFF' | 'CLIMB' | 'CRUISE' | 'DESCENT' | 'APPROACH' | 'LANDING' | 'TAXI_IN' | 'PARKED';
}

export interface FlightHistory {
  id: string;
  aircraftId: string;
  flightDate: Date;
  departure: {
    airport: string;
    time: Date;
    hobbs?: number; // engine hours at departure
  };
  arrival: {
    airport: string;
    time: Date;
    hobbs?: number; // engine hours at arrival
  };
  blockTime: number; // minutes
  flightTime: number; // minutes
  cycles: number;
  maxAltitude: number;
  averageSpeed: number;
  fuelUsed?: number; // gallons
  distance: number; // nautical miles
  route?: string[];
  pilotInCommand: string;
  secondInCommand?: string;
  notes?: string;
}

// Flight Planning & Operations Integration
export interface FlightPlan {
  id: string;
  aircraftId: string;
  flightNumber?: string;
  departure: {
    airport: string;
    scheduledTime: Date;
    gate?: string;
  };
  arrival: {
    airport: string;
    scheduledTime: Date;
    gate?: string;
  };
  route: string;
  estimatedFlightTime: number; // minutes
  estimatedBlockTime: number; // minutes
  fuelRequired: number; // gallons
  passengers: number;
  crew: number;
  status: 'PLANNED' | 'FILED' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED';
  pilotInCommand: string;
  secondInCommand?: string;
  createdAt: Date;
}

// Real-time alerts based on flight data
export interface FlightBasedAlert {
  id: string;
  aircraftId: string;
  alertType: 'HARD_LANDING' | 'EXCESSIVE_G_FORCE' | 'ENGINE_PARAMETER' | 'MAINTENANCE_DUE' | 'FLIGHT_TIME_LIMIT';
  severity: 'INFO' | 'WARNING' | 'CAUTION' | 'ALERT';
  message: string;
  flightId?: string;
  triggerValue: number;
  thresholdValue: number;
  unit: string;
  timestamp: Date;
  acknowledged: boolean;
  acknowledgedBy?: string;
  acknowledgedAt?: Date;
  requiresAction: boolean;
  maintenanceRequired?: boolean;
} 