/**
 * Gander Maintenance Scheduler - AI-Powered Predictive Maintenance
 * 
 * Comprehensive FAA Maintenance Schedule Integration:
 * - A-Check (1A): 500 flight hours / 12 months, 1-2 days downtime
 * - Progressive Checks (2A, 3A, 4A, 5A): 1000, 1500, 2000, 2500 hrs, 1-3 days
 * - Major Check (10A): 5000 flight hours, 2-4 days downtime
 * - C-Check (1C): 12 months, 5-7 days downtime
 * - Heavy Checks (2C, 3C, 4C, 5C): 24, 36, 48, 60 months, 7-14 days
 * - Extensive Checks (6C, 8C): 72, 96 months, 14-21 days
 * - 100-Hour: Every 100 flight hours, 1 day (Part 135 required)
 * - Annual: Every 12 months, 1-2 days (FAA-mandated)
 * - Daily/Pre-flight: Every 24 hours or prior to flight, <1 hour
 * - Progressive: Every 90 days, 1-2 days (rolling schedule)
 */

import { Aircraft, MaintenanceInterval, WorkOrder, FlightHistory, FlightPlan } from '@/types';

// Scheduling Configuration
export interface SchedulingConfig {
  // Optimization weights (0-1)
  costWeight: number;          // Priority for cost minimization
  availabilityWeight: number;  // Priority for aircraft availability
  utilizationWeight: number;   // Priority for utilization efficiency
  safetyWeight: number;        // Priority for safety margins
  
  // Constraints
  minSafetyMarginHours: number;    // Minimum hours before required maintenance
  maxDowntimeHours: number;        // Maximum acceptable downtime per maintenance
  preferredMaintenanceDays: number[]; // 0=Sunday, 1=Monday, etc.
  maintenanceCapacity: number;     // Max concurrent aircraft in maintenance
  
  // Prediction parameters
  predictionHorizonDays: number;   // How far ahead to predict
  utilizationLookbackDays: number; // Historical data to analyze
}

export const defaultSchedulingConfig: SchedulingConfig = {
  costWeight: 0.3,
  availabilityWeight: 0.4,
  utilizationWeight: 0.2,
  safetyWeight: 0.1,
  minSafetyMarginHours: 10,
  maxDowntimeHours: 48,
  preferredMaintenanceDays: [0, 6], // Weekends
  maintenanceCapacity: 2,
  predictionHorizonDays: 90,
  utilizationLookbackDays: 30
};

// Scheduling Result Types
export interface MaintenanceScheduleItem {
  id: string;
  aircraftId: string;
  tailNumber: string;
  maintenanceType: 'A_CHECK' | 'C_CHECK' | 'ANNUAL' | '100_HOUR' | 'DAILY' | 'UNSCHEDULED';
  scheduledDate: Date;
  estimatedDuration: number; // hours
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  confidenceScore: number; // 0-1
  reasoning: string[];
  conflictsWith: string[]; // IDs of conflicting items
  alternativeDates: Date[];
  estimatedCost: number;
  impactOnOperations: 'LOW' | 'MEDIUM' | 'HIGH';
  requiredParts: string[];
  mechanicRequirements: string[];
}

export interface ScheduleOptimizationResult {
  schedule: MaintenanceScheduleItem[];
  totalCost: number;
  totalDowntime: number;
  utilizationImpact: number;
  safetyScore: number;
  recommendations: string[];
  conflicts: ScheduleConflict[];
  alternativeSchedules: MaintenanceScheduleItem[][];
}

export interface ScheduleConflict {
  type: 'RESOURCE' | 'AIRCRAFT' | 'TIMING' | 'CAPACITY';
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  description: string;
  affectedItems: string[];
  suggestedResolution: string;
}

// Utilization Analysis
export interface UtilizationPattern {
  aircraftId: string;
  dailyAverageHours: number;
  weeklyPattern: number[]; // Hours per day of week
  monthlyPattern: number[]; // Hours per day of month
  seasonalTrends: { [month: number]: number };
  peakPeriods: { start: Date; end: Date; intensity: number }[];
  lowPeriods: { start: Date; end: Date; opportunity: number }[];
  predictedUtilization: { date: Date; hours: number }[];
}

export class MaintenanceScheduler {
  private config: SchedulingConfig;
  
  constructor(config: SchedulingConfig = defaultSchedulingConfig) {
    this.config = config;
  }

  // Main scheduling function
  async optimizeMaintenanceSchedule(
    aircraft: Aircraft[],
    maintenanceIntervals: MaintenanceInterval[],
    flightHistory: FlightHistory[],
    upcomingFlights: FlightPlan[],
    currentWorkOrders: WorkOrder[]
  ): Promise<ScheduleOptimizationResult> {
    
    // 1. Analyze utilization patterns
    const utilizationPatterns = await this.analyzeUtilizationPatterns(aircraft, flightHistory);
    
    // 2. Predict future maintenance needs
    const predictedMaintenance = await this.predictMaintenanceNeeds(
      aircraft, 
      maintenanceIntervals, 
      utilizationPatterns
    );
    
    // 3. Optimize scheduling with constraints
    const optimizedSchedule = await this.optimizeSchedule(
      predictedMaintenance,
      upcomingFlights,
      utilizationPatterns,
      currentWorkOrders
    );
    
    // 4. Validate and resolve conflicts
    const validatedSchedule = await this.validateAndResolveConflicts(optimizedSchedule);
    
    // 5. Calculate metrics and recommendations
    const result = await this.generateScheduleResult(validatedSchedule, utilizationPatterns);
    
    return result;
  }

  // Analyze historical flight patterns to predict utilization
  private async analyzeUtilizationPatterns(
    aircraft: Aircraft[],
    flightHistory: FlightHistory[]
  ): Promise<UtilizationPattern[]> {
    
    return aircraft.map(plane => {
      const planeHistory = flightHistory.filter(f => f.aircraftId === plane.id);
      
      if (planeHistory.length === 0) {
        return this.getDefaultUtilizationPattern(plane.id);
      }

      // Calculate daily average
      const totalDays = this.config.utilizationLookbackDays;
      const totalHours = planeHistory.reduce((sum, flight) => sum + (flight.flightTime / 60), 0);
      const dailyAverage = totalHours / totalDays;

      // Weekly pattern analysis
      const weeklyPattern = this.analyzeWeeklyPattern(planeHistory);
      
      // Monthly pattern analysis  
      const monthlyPattern = this.analyzeMonthlyPattern(planeHistory);
      
      // Seasonal trends
      const seasonalTrends = this.analyzeSeasonalTrends(planeHistory);
      
      // Peak and low periods
      const { peakPeriods, lowPeriods } = this.identifyUtilizationPeriods(planeHistory);
      
      // Predict future utilization
      const predictedUtilization = this.predictFutureUtilization(
        dailyAverage,
        weeklyPattern,
        monthlyPattern,
        seasonalTrends
      );

      return {
        aircraftId: plane.id,
        dailyAverageHours: dailyAverage,
        weeklyPattern,
        monthlyPattern,
        seasonalTrends,
        peakPeriods,
        lowPeriods,
        predictedUtilization
      };
    });
  }

  // Predict when maintenance will be needed based on usage patterns
  private async predictMaintenanceNeeds(
    aircraft: Aircraft[],
    intervals: MaintenanceInterval[],
    patterns: UtilizationPattern[]
  ): Promise<MaintenanceScheduleItem[]> {
    
    const predictions: MaintenanceScheduleItem[] = [];
    
    for (const plane of aircraft) {
      const planeIntervals = intervals.filter(i => i.aircraftId === plane.id);
      const pattern = patterns.find(p => p.aircraftId === plane.id);
      
      if (!pattern) continue;

      for (const interval of planeIntervals) {
        const prediction = await this.predictMaintenanceItem(plane, interval, pattern);
        if (prediction) {
          predictions.push(prediction);
        }
      }
    }

    return predictions.sort((a, b) => a.scheduledDate.getTime() - b.scheduledDate.getTime());
  }

  private async predictMaintenanceItem(
    aircraft: Aircraft,
    interval: MaintenanceInterval,
    pattern: UtilizationPattern
  ): Promise<MaintenanceScheduleItem | null> {
    
    // Calculate when maintenance will be due based on usage prediction
    const hoursRemaining = interval.nextDueHours - aircraft.totalAircraftTime;
    
    if (hoursRemaining <= 0) {
      // Overdue - schedule immediately
      return this.createImmediateMaintenanceItem(aircraft, interval, 'CRITICAL');
    }

    // Predict when hours will be reached based on utilization
    let accumulatedHours = 0;
    let predictedDate = new Date();
    
    for (const prediction of pattern.predictedUtilization) {
      accumulatedHours += prediction.hours;
      if (accumulatedHours >= hoursRemaining - this.config.minSafetyMarginHours) {
        predictedDate = prediction.date;
        break;
      }
    }

    // Optimize date based on utilization patterns and constraints
    const optimizedDate = this.optimizeMaintenanceDate(
      predictedDate,
      pattern,
      interval.estimatedDowntime
    );

    return {
      id: `pred-${aircraft.id}-${interval.id}`,
      aircraftId: aircraft.id,
      tailNumber: aircraft.tailNumber,
      maintenanceType: interval.intervalType,
      scheduledDate: optimizedDate,
      estimatedDuration: interval.estimatedDowntime,
      priority: this.calculatePriority(hoursRemaining, interval),
      confidenceScore: this.calculateConfidence(pattern, hoursRemaining),
      reasoning: this.generateReasoning(aircraft, interval, pattern, optimizedDate),
      conflictsWith: [],
      alternativeDates: this.generateAlternativeDates(optimizedDate, pattern),
      estimatedCost: interval.estimatedCost,
      impactOnOperations: this.assessOperationalImpact(optimizedDate, pattern),
      requiredParts: this.getRequiredParts(interval.intervalType),
      mechanicRequirements: this.getMechanicRequirements(interval.intervalType)
    };
  }

  // Optimize the overall schedule considering all constraints
  private async optimizeSchedule(
    predictedMaintenance: MaintenanceScheduleItem[],
    upcomingFlights: FlightPlan[],
    patterns: UtilizationPattern[],
    currentWorkOrders: WorkOrder[]
  ): Promise<MaintenanceScheduleItem[]> {
    
    // Use a genetic algorithm approach for schedule optimization
    let bestSchedule = [...predictedMaintenance];
    let bestScore = this.evaluateSchedule(bestSchedule, patterns, upcomingFlights);

    // Iterative improvement
    for (let iteration = 0; iteration < 100; iteration++) {
      const mutatedSchedule = this.mutateSchedule(bestSchedule, patterns);
      const score = this.evaluateSchedule(mutatedSchedule, patterns, upcomingFlights);
      
      if (score > bestScore) {
        bestSchedule = mutatedSchedule;
        bestScore = score;
      }
    }

    return bestSchedule;
  }

  // Score a schedule based on multiple criteria
  private evaluateSchedule(
    schedule: MaintenanceScheduleItem[],
    patterns: UtilizationPattern[],
    upcomingFlights: FlightPlan[]
  ): number {
    
    const costScore = this.calculateCostScore(schedule);
    const availabilityScore = this.calculateAvailabilityScore(schedule, patterns);
    const utilizationScore = this.calculateUtilizationScore(schedule, patterns);
    const safetyScore = this.calculateSafetyScore(schedule);

    return (
      costScore * this.config.costWeight +
      availabilityScore * this.config.availabilityWeight +
      utilizationScore * this.config.utilizationWeight +
      safetyScore * this.config.safetyWeight
    );
  }

  // Helper methods for pattern analysis
  private analyzeWeeklyPattern(history: FlightHistory[]): number[] {
    const weeklyHours = new Array(7).fill(0);
    const weeklyCounts = new Array(7).fill(0);

    history.forEach(flight => {
      // Handle both Date objects and date strings
      const flightDate = flight.flightDate instanceof Date 
        ? flight.flightDate 
        : new Date(flight.flightDate);
      
      const dayOfWeek = flightDate.getDay();
      weeklyHours[dayOfWeek] += flight.flightTime / 60;
      weeklyCounts[dayOfWeek]++;
    });

    return weeklyHours.map((hours, i) => 
      weeklyCounts[i] > 0 ? hours / weeklyCounts[i] : 0
    );
  }

  private analyzeMonthlyPattern(history: FlightHistory[]): number[] {
    const monthlyHours = new Array(31).fill(0);
    const monthlyCounts = new Array(31).fill(0);

    history.forEach(flight => {
      // Handle both Date objects and date strings
      const flightDate = flight.flightDate instanceof Date 
        ? flight.flightDate 
        : new Date(flight.flightDate);
      
      const dayOfMonth = flightDate.getDate() - 1; // 0-indexed
      if (dayOfMonth < 31) {
        monthlyHours[dayOfMonth] += flight.flightTime / 60;
        monthlyCounts[dayOfMonth]++;
      }
    });

    return monthlyHours.map((hours, i) => 
      monthlyCounts[i] > 0 ? hours / monthlyCounts[i] : 0
    );
  }

  private analyzeSeasonalTrends(history: FlightHistory[]): { [month: number]: number } {
    const seasonalData: { [month: number]: { hours: number; count: number } } = {};

    history.forEach(flight => {
      // Handle both Date objects and date strings
      const flightDate = flight.flightDate instanceof Date 
        ? flight.flightDate 
        : new Date(flight.flightDate);
      
      const month = flightDate.getMonth();
      if (!seasonalData[month]) {
        seasonalData[month] = { hours: 0, count: 0 };
      }
      seasonalData[month].hours += flight.flightTime / 60;
      seasonalData[month].count++;
    });

    const trends: { [month: number]: number } = {};
    Object.keys(seasonalData).forEach(month => {
      const monthNum = parseInt(month);
      const data = seasonalData[monthNum];
      trends[monthNum] = data.count > 0 ? data.hours / data.count : 0;
    });

    return trends;
  }

  private identifyUtilizationPeriods(history: FlightHistory[]) {
    // Simplified implementation - in reality would use more sophisticated analysis
    const peakPeriods = [
      {
        start: new Date(2024, 5, 1), // June
        end: new Date(2024, 7, 31),   // August
        intensity: 1.3
      },
      {
        start: new Date(2024, 10, 15), // Mid November
        end: new Date(2024, 11, 31),   // End December
        intensity: 1.4
      }
    ];

    const lowPeriods = [
      {
        start: new Date(2024, 0, 15),  // Mid January
        end: new Date(2024, 2, 15),    // Mid March
        opportunity: 0.7
      },
      {
        start: new Date(2024, 8, 1),   // September
        end: new Date(2024, 9, 31),    // October
        opportunity: 0.8
      }
    ];

    return { peakPeriods, lowPeriods };
  }

  private predictFutureUtilization(
    dailyAverage: number,
    weeklyPattern: number[],
    monthlyPattern: number[],
    seasonalTrends: { [month: number]: number }
  ): { date: Date; hours: number }[] {
    
    const predictions: { date: Date; hours: number }[] = [];
    const today = new Date();

    for (let i = 0; i < this.config.predictionHorizonDays; i++) {
      const date = new Date(today.getTime() + i * 24 * 60 * 60 * 1000);
      const dayOfWeek = date.getDay();
      const dayOfMonth = date.getDate() - 1;
      const month = date.getMonth();

      let hours = dailyAverage;
      
      // Apply weekly pattern
      if (weeklyPattern[dayOfWeek]) {
        hours = weeklyPattern[dayOfWeek];
      }
      
      // Apply seasonal trends
      if (seasonalTrends[month]) {
        hours *= (seasonalTrends[month] / dailyAverage);
      }

      predictions.push({ date, hours: Math.max(0, hours) });
    }

    return predictions;
  }

  // Utility methods
  private getDefaultUtilizationPattern(aircraftId: string): UtilizationPattern {
    return {
      aircraftId,
      dailyAverageHours: 3.5, // Typical Part 135 utilization
      weeklyPattern: [2, 4, 4, 4, 4, 4, 2], // Lower on weekends
      monthlyPattern: new Array(31).fill(3.5),
      seasonalTrends: {
        0: 3.0, 1: 3.2, 2: 3.5, 3: 3.8, 4: 4.0, 5: 4.5,
        6: 4.8, 7: 4.5, 8: 3.8, 9: 3.5, 10: 4.2, 11: 4.0
      },
      peakPeriods: [],
      lowPeriods: [],
      predictedUtilization: []
    };
  }

  private createImmediateMaintenanceItem(
    aircraft: Aircraft,
    interval: MaintenanceInterval,
    priority: MaintenanceScheduleItem['priority']
  ): MaintenanceScheduleItem {
    return {
      id: `immediate-${aircraft.id}-${interval.id}`,
      aircraftId: aircraft.id,
      tailNumber: aircraft.tailNumber,
      maintenanceType: interval.intervalType,
      scheduledDate: new Date(),
      estimatedDuration: interval.estimatedDowntime,
      priority,
      confidenceScore: 1.0,
      reasoning: ['Maintenance is overdue', 'Immediate scheduling required'],
      conflictsWith: [],
      alternativeDates: [],
      estimatedCost: interval.estimatedCost,
      impactOnOperations: 'HIGH',
      requiredParts: this.getRequiredParts(interval.intervalType),
      mechanicRequirements: this.getMechanicRequirements(interval.intervalType)
    };
  }

  private optimizeMaintenanceDate(
    predictedDate: Date,
    pattern: UtilizationPattern,
    estimatedDuration: number
  ): Date {
    // Find the best date within a window around the predicted date
    const windowDays = 14; // 2-week window
    const candidates: { date: Date; score: number }[] = [];

    for (let i = -windowDays; i <= windowDays; i++) {
      const candidateDate = new Date(predictedDate.getTime() + i * 24 * 60 * 60 * 1000);
      const score = this.scoreDateCandidate(candidateDate, pattern, estimatedDuration);
      candidates.push({ date: candidateDate, score });
    }

    // Return the date with the highest score
    candidates.sort((a, b) => b.score - a.score);
    return candidates[0].date;
  }

  private scoreDateCandidate(
    date: Date,
    pattern: UtilizationPattern,
    duration: number
  ): number {
    let score = 0;

    // Prefer weekend days
    const dayOfWeek = date.getDay();
    if (this.config.preferredMaintenanceDays.includes(dayOfWeek)) {
      score += 20;
    }

    // Prefer low utilization periods
    const utilizationPrediction = pattern.predictedUtilization.find(p => 
      Math.abs(p.date.getTime() - date.getTime()) < 24 * 60 * 60 * 1000
    );
    
    if (utilizationPrediction) {
      score += (10 - utilizationPrediction.hours); // Lower utilization = higher score
    }

    // Avoid peak periods
    const isInPeakPeriod = pattern.peakPeriods.some(peak => 
      date >= peak.start && date <= peak.end
    );
    if (isInPeakPeriod) {
      score -= 30;
    }

    // Prefer low periods
    const isInLowPeriod = pattern.lowPeriods.some(low => 
      date >= low.start && date <= low.end
    );
    if (isInLowPeriod) {
      score += 25;
    }

    return score;
  }

  // Additional helper methods would be implemented here...
  private calculatePriority(hoursRemaining: number, interval: MaintenanceInterval): MaintenanceScheduleItem['priority'] {
    if (hoursRemaining <= 0) return 'CRITICAL';
    if (hoursRemaining <= this.config.minSafetyMarginHours) return 'HIGH';
    if (hoursRemaining <= 50) return 'MEDIUM';
    return 'LOW';
  }

  private calculateConfidence(pattern: UtilizationPattern, hoursRemaining: number): number {
    // Higher confidence for shorter time horizons and stable patterns
    const timeHorizon = hoursRemaining / pattern.dailyAverageHours;
    return Math.max(0.3, Math.min(1.0, 1.0 - (timeHorizon / 90)));
  }

  private generateReasoning(
    aircraft: Aircraft,
    interval: MaintenanceInterval,
    pattern: UtilizationPattern,
    optimizedDate: Date
  ): string[] {
    const reasons = [];
    reasons.push(`Based on current utilization of ${pattern.dailyAverageHours.toFixed(1)} hours/day`);
    reasons.push(`Scheduled during low utilization period`);
    reasons.push(`Maintains ${this.config.minSafetyMarginHours}h safety margin`);
    return reasons;
  }

  private generateAlternativeDates(optimizedDate: Date, pattern: UtilizationPattern): Date[] {
    // Generate 3 alternative dates
    const alternatives = [];
    for (let i = 1; i <= 3; i++) {
      alternatives.push(new Date(optimizedDate.getTime() + i * 7 * 24 * 60 * 60 * 1000));
    }
    return alternatives;
  }

  private assessOperationalImpact(date: Date, pattern: UtilizationPattern): 'LOW' | 'MEDIUM' | 'HIGH' {
    const dayOfWeek = date.getDay();
    const weekendDays = [0, 6]; // Sunday, Saturday
    
    if (weekendDays.includes(dayOfWeek)) {
      return 'LOW';
    }
    
    const utilizationPrediction = pattern.predictedUtilization.find(p => 
      Math.abs(p.date.getTime() - date.getTime()) < 24 * 60 * 60 * 1000
    );
    
    if (utilizationPrediction && utilizationPrediction.hours > 6) {
      return 'HIGH';
    }
    
    return 'MEDIUM';
  }

  private getRequiredParts(maintenanceType: string): string[] {
    const partMappings = {
      'A_CHECK': ['Filters', 'Fluids', 'Basic consumables'],
      'C_CHECK': ['Major components', 'Avionics', 'Engine parts'],
      '100_HOUR': ['Oil filters', 'Spark plugs', 'Basic inspection items'],
      'ANNUAL': ['Comprehensive inspection items', 'Regulatory compliance parts']
    };
    return partMappings[maintenanceType as keyof typeof partMappings] || [];
  }

  private getMechanicRequirements(maintenanceType: string): string[] {
    const mechanicMappings = {
      'A_CHECK': ['A&P Mechanic'],
      'C_CHECK': ['A&P Mechanic', 'IA Inspector', 'Avionics Tech'],
      '100_HOUR': ['A&P Mechanic'],
      'ANNUAL': ['A&P Mechanic', 'IA Inspector']
    };
    return mechanicMappings[maintenanceType as keyof typeof mechanicMappings] || ['A&P Mechanic'];
  }

  // Placeholder methods for full implementation
  private mutateSchedule(schedule: MaintenanceScheduleItem[], patterns: UtilizationPattern[]): MaintenanceScheduleItem[] {
    // Implement genetic algorithm mutation
    return schedule;
  }

  private async validateAndResolveConflicts(schedule: MaintenanceScheduleItem[]): Promise<MaintenanceScheduleItem[]> {
    // Implement conflict detection and resolution
    return schedule;
  }

  private async generateScheduleResult(schedule: MaintenanceScheduleItem[], patterns: UtilizationPattern[]): Promise<ScheduleOptimizationResult> {
    // Generate final result with metrics
    return {
      schedule,
      totalCost: schedule.reduce((sum, item) => sum + item.estimatedCost, 0),
      totalDowntime: schedule.reduce((sum, item) => sum + item.estimatedDuration, 0),
      utilizationImpact: 0.1, // Placeholder
      safetyScore: 0.95, // Placeholder
      recommendations: ['Optimize weekend scheduling', 'Consider bulk part ordering'],
      conflicts: [],
      alternativeSchedules: []
    };
  }

  private calculateCostScore(schedule: MaintenanceScheduleItem[]): number { return 0.8; }
  private calculateAvailabilityScore(schedule: MaintenanceScheduleItem[], patterns: UtilizationPattern[]): number { return 0.9; }
  private calculateUtilizationScore(schedule: MaintenanceScheduleItem[], patterns: UtilizationPattern[]): number { return 0.85; }
  private calculateSafetyScore(schedule: MaintenanceScheduleItem[]): number { return 0.95; }
} 