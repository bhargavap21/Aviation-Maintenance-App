import { Aircraft, MaintenanceInterval, WorkOrder } from '@/types';

// G550-specific maintenance intervals (in flight hours)
export const G550_MAINTENANCE_INTERVALS = {
  DAILY: { hours: 0, calendar: 1, description: 'Daily Inspection' },
  '100_HOUR': { hours: 100, calendar: 0, description: '100-Hour Inspection' },
  A_CHECK: { hours: 500, calendar: 0, description: 'A-Check Inspection' },
  C_CHECK: { hours: 2400, calendar: 0, description: 'C-Check Inspection' },
  ANNUAL: { hours: 0, calendar: 365, description: 'Annual Inspection' },
  PROGRESSIVE: { hours: 0, calendar: 90, description: 'Progressive Inspection' }
} as const;

// Calculate next due date based on hours and calendar
export function calculateNextDueDate(
  lastCompletedDate: Date,
  lastCompletedHours: number,
  currentHours: number,
  intervalHours?: number,
  intervalCalendar?: number
): Date {
  const nextDueDate = new Date(lastCompletedDate);
  
  if (intervalCalendar) {
    nextDueDate.setDate(nextDueDate.getDate() + intervalCalendar);
  }
  
  // For hour-based intervals, estimate based on average utilization
  if (intervalHours) {
    const hoursRemaining = intervalHours - (currentHours - lastCompletedHours);
    const averageHoursPerDay = 4; // Typical G550 utilization
    const daysRemaining = Math.max(0, hoursRemaining / averageHoursPerDay);
    
    const hourBasedDate = new Date();
    hourBasedDate.setDate(hourBasedDate.getDate() + daysRemaining);
    
    // Use the earlier of calendar or hour-based due date
    if (!intervalCalendar || hourBasedDate < nextDueDate) {
      return hourBasedDate;
    }
  }
  
  return nextDueDate;
}

// Calculate next due hours for maintenance interval
export function calculateNextDueHours(
  lastCompletedHours: number,
  intervalHours?: number
): number {
  if (!intervalHours) return 0;
  return lastCompletedHours + intervalHours;
}

// Check if maintenance interval is overdue
export function isMaintenanceOverdue(
  nextDueDate: Date,
  nextDueHours: number,
  currentHours: number
): boolean {
  const now = new Date();
  const calendarOverdue = nextDueDate < now;
  const hoursOverdue = nextDueHours > 0 && currentHours >= nextDueHours;
  
  return calendarOverdue || hoursOverdue;
}

// Calculate maintenance priority based on how close to due date
export function calculateMaintenancePriority(
  nextDueDate: Date,
  nextDueHours: number,
  currentHours: number
): 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' {
  const now = new Date();
  const daysUntilDue = Math.ceil((nextDueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  const hoursUntilDue = nextDueHours - currentHours;
  
  // If overdue, it's critical
  if (isMaintenanceOverdue(nextDueDate, nextDueHours, currentHours)) {
    return 'CRITICAL';
  }
  
  // High priority if due within 7 days or 25 flight hours
  if (daysUntilDue <= 7 || (hoursUntilDue > 0 && hoursUntilDue <= 25)) {
    return 'HIGH';
  }
  
  // Medium priority if due within 30 days or 100 flight hours
  if (daysUntilDue <= 30 || (hoursUntilDue > 0 && hoursUntilDue <= 100)) {
    return 'MEDIUM';
  }
  
  return 'LOW';
}

// Generate work order number (format: WO-YYYYMMDD-XXX)
export function generateWorkOrderNumber(): string {
  const now = new Date();
  const dateString = now.toISOString().slice(0, 10).replace(/-/g, '');
  const randomSuffix = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `WO-${dateString}-${randomSuffix}`;
}

// Calculate aircraft availability percentage
export function calculateAircraftAvailability(
  totalAircraft: number,
  aircraftInMaintenance: number
): number {
  if (totalAircraft === 0) return 0;
  return Math.round(((totalAircraft - aircraftInMaintenance) / totalAircraft) * 100);
}

// Estimate maintenance downtime based on work type
export function estimateMaintenanceDowntime(intervalType: string): number {
  const downtimeHours = {
    DAILY: 0.5,
    '100_HOUR': 8,
    A_CHECK: 24,
    C_CHECK: 120,
    ANNUAL: 48,
    PROGRESSIVE: 16
  };
  
  return downtimeHours[intervalType as keyof typeof downtimeHours] || 8;
}

// Estimate maintenance cost based on work type
export function estimateMaintenanceCost(intervalType: string): number {
  const baseCosts = {
    DAILY: 500,
    '100_HOUR': 3000,
    A_CHECK: 15000,
    C_CHECK: 150000,
    ANNUAL: 25000,
    PROGRESSIVE: 8000
  };
  
  return baseCosts[intervalType as keyof typeof baseCosts] || 5000;
}

// Validate aircraft tail number format
export function validateTailNumber(tailNumber: string): boolean {
  // US registration format: N + 1-5 alphanumeric characters
  const usPattern = /^N[0-9A-Z]{1,5}$/;
  return usPattern.test(tailNumber.toUpperCase());
}

// Format flight hours for display
export function formatFlightHours(hours: number): string {
  const wholeHours = Math.floor(hours);
  const minutes = Math.round((hours - wholeHours) * 60);
  return `${wholeHours}:${minutes.toString().padStart(2, '0')}`;
}

// Calculate days until due
export function getDaysUntilDue(dueDate: Date): number {
  const now = new Date();
  const diffTime = dueDate.getTime() - now.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

// Get maintenance status color for UI
export function getMaintenanceStatusColor(priority: string, isOverdue: boolean): string {
  if (isOverdue) return 'text-red-600 bg-red-50';
  
  switch (priority) {
    case 'CRITICAL': return 'text-red-600 bg-red-50';
    case 'HIGH': return 'text-orange-600 bg-orange-50';
    case 'MEDIUM': return 'text-yellow-600 bg-yellow-50';
    case 'LOW': return 'text-green-600 bg-green-50';
    default: return 'text-gray-600 bg-gray-50';
  }
}

// Get work order status color for UI
export function getWorkOrderStatusColor(status: string): string {
  switch (status) {
    case 'COMPLETED': return 'text-green-600 bg-green-50';
    case 'IN_PROGRESS': return 'text-blue-600 bg-blue-50';
    case 'WAITING_PARTS': return 'text-yellow-600 bg-yellow-50';
    case 'OPEN': return 'text-gray-600 bg-gray-50';
    case 'CANCELLED': return 'text-red-600 bg-red-50';
    default: return 'text-gray-600 bg-gray-50';
  }
}

// Part 135 specific compliance checks
export function checkPart135Compliance(aircraft: Aircraft): {
  compliant: boolean;
  issues: string[];
} {
  const issues: string[] = [];
  const now = new Date();
  
  // Check if annual inspection is current (within 12 months)
  const annualDue = new Date(aircraft.lastInspectionDate);
  annualDue.setFullYear(annualDue.getFullYear() + 1);
  
  if (annualDue < now) {
    issues.push('Annual inspection overdue per FAR 135.419');
  }
  
  // Check 100-hour inspection compliance
  const hoursSinceLastInspection = aircraft.totalAircraftTime - 
    (aircraft.lastInspectionDate ? 0 : aircraft.totalAircraftTime);
  
  if (hoursSinceLastInspection >= 100) {
    issues.push('100-hour inspection due per FAR 135.411');
  }
  
  // Check certificate of airworthiness
  if (!aircraft.certificateOfAirworthiness) {
    issues.push('Missing Certificate of Airworthiness');
  }
  
  return {
    compliant: issues.length === 0,
    issues
  };
}

// Create default maintenance intervals for G550
export function createDefaultG550Intervals(aircraftId: string): Partial<MaintenanceInterval>[] {
  return Object.entries(G550_MAINTENANCE_INTERVALS).map(([type, config]) => ({
    aircraftId,
    intervalType: type as MaintenanceInterval['intervalType'],
    description: config.description,
    intervalHours: config.hours || undefined,
    intervalCalendar: config.calendar || undefined,
    nextDueAt: new Date(),
    nextDueHours: config.hours || 0,
    isOverdue: false,
    priority: 'MEDIUM' as const,
    estimatedDowntime: estimateMaintenanceDowntime(type),
    estimatedCost: estimateMaintenanceCost(type)
  }));
} 