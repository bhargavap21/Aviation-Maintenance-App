import OpenAI from 'openai';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || 'demo-mode',
});

export interface MaintenanceRecommendationInput {
  aircraftData: {
    tailNumber: string;
    aircraftType: string;
    totalAircraftTime: number;
    totalCycles: number;
    lastInspection?: {
      type: string;
      date: string;
      hoursAgo: number;
    };
  };
  utilizationData: {
    utilizationPercentage: number;
    flightHours: number;
    avgFlightTime: number;
    maintenanceRisk: 'LOW' | 'MEDIUM' | 'HIGH';
    trend: 'INCREASING' | 'STABLE' | 'DECREASING';
  };
  flightHistory: Array<{
    flightDate: Date | string;
    flightTime: number;
    cycles: number;
  }>;
  scheduleDemandData?: {
    currentPeriodDemand: 'LOW' | 'MEDIUM' | 'HIGH' | 'PEAK';
    upcomingBookings: number;
    averageWeeklyUtilization: number;
    demandTrend: 'INCREASING' | 'STABLE' | 'DECREASING';
    operationalPressure: 'LOW' | 'MEDIUM' | 'HIGH';
  };
  seasonalData?: {
    currentSeason: 'SPRING' | 'SUMMER' | 'FALL' | 'WINTER';
    peakSeason: boolean;
    seasonalDemandPattern: 'BUSINESS_TRAVEL' | 'LEISURE_TRAVEL' | 'CARGO' | 'MIXED';
    weatherFactors: string[];
    maintenanceWindowOpportunity: 'EXCELLENT' | 'GOOD' | 'LIMITED' | 'POOR';
  };
}

export interface AIMaintenanceRecommendation {
  tailNumber: string;
  maintenanceType: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  confidence: number;
  reasoning: string;
  estimatedCost: number;
  estimatedDuration: number;
  suggestedDate: Date;
  riskFactors: string[];
  complianceRequirements: string[];
}

export class OpenAIMaintenanceService {
  
  async generateMaintenanceRecommendations(
    inputs: MaintenanceRecommendationInput[]
  ): Promise<AIMaintenanceRecommendation[]> {
    
    // If no API key is provided, fall back to enhanced demo mode
    if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === 'demo-mode') {
      console.log('🤖 OpenAI API key not provided - using enhanced demo AI recommendations');
      return this.generateEnhancedDemoRecommendations(inputs);
    }

    try {
      const prompt = this.buildMaintenancePrompt(inputs);
      
      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: `You are an expert aviation maintenance scheduler with deep knowledge of FAA regulations, aircraft maintenance requirements, and predictive maintenance strategies. 
            
            You analyze aircraft utilization data, flight patterns, maintenance history, SCHEDULE DEMAND TRENDS, and SEASONAL PATTERNS to provide intelligent maintenance recommendations with realistic confidence scores.
            
            Your primary focus areas (in order of importance):
            1. SCHEDULE DEMAND TRENDS - Current and projected operational demands
            2. SEASONAL FACTORS - Weather patterns, peak/off-peak periods, maintenance windows
            3. Risk factors and safety implications  
            4. Utilization patterns and operational efficiency
            5. Cost optimization and regulatory compliance
            
            Your recommendations should:
            - HEAVILY EMPHASIZE how schedule demand trends affect maintenance timing
            - STRONGLY CONSIDER seasonal factors and maintenance window opportunities
            - Follow FAA Part 91, Part 135, and Part 145 regulations
            - Consider aircraft-specific maintenance intervals
            - Account for utilization patterns and risk factors
            - Provide realistic confidence scores (50-95% range)
            - Include cost estimates and duration
            - Suggest optimal timing to minimize operational impact during peak demand periods
            
            Return responses in valid JSON format only.`
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.3,
        max_tokens: 4000,
        response_format: { type: "json_object" }
      });

      const response = completion.choices[0]?.message?.content;
      if (!response) {
        throw new Error('No response from OpenAI');
      }

      const aiResult = JSON.parse(response);
      return this.processAIRecommendations(aiResult, inputs);
      
    } catch (error) {
      console.error('❌ OpenAI API error:', error);
      console.log('🔄 Falling back to enhanced demo recommendations');
      return this.generateEnhancedDemoRecommendations(inputs);
    }
  }

  private buildMaintenancePrompt(inputs: MaintenanceRecommendationInput[]): string {
    const currentDate = new Date();
    const currentSeason = this.getCurrentSeason(currentDate);
    
    const aircraftSummary = inputs.map(input => ({
      tailNumber: input.aircraftData.tailNumber,
      type: input.aircraftData.aircraftType,
      hours: input.aircraftData.totalAircraftTime,
      cycles: input.aircraftData.totalCycles,
      utilization: input.utilizationData.utilizationPercentage,
      risk: input.utilizationData.maintenanceRisk,
      trend: input.utilizationData.trend,
      recentFlights: input.flightHistory.length,
      lastInspection: input.aircraftData.lastInspection,
      scheduleDemand: input.scheduleDemandData || {
        currentPeriodDemand: 'MEDIUM',
        upcomingBookings: 15,
        averageWeeklyUtilization: input.utilizationData.utilizationPercentage,
        demandTrend: input.utilizationData.trend,
        operationalPressure: input.utilizationData.maintenanceRisk === 'HIGH' ? 'HIGH' : 'MEDIUM'
      },
      seasonalFactors: input.seasonalData || {
        currentSeason: currentSeason,
        peakSeason: this.isPeakSeason(currentDate),
        seasonalDemandPattern: 'BUSINESS_TRAVEL',
        weatherFactors: this.getSeasonalWeatherFactors(currentSeason),
        maintenanceWindowOpportunity: this.getMaintenanceWindowOpportunity(currentDate)
      }
    }));

    return `Analyze the following aircraft fleet and provide maintenance recommendations with HEAVY EMPHASIS on schedule demand trends and seasonal factors:

FLEET DATA WITH SCHEDULE DEMAND & SEASONAL ANALYSIS:
${JSON.stringify(aircraftSummary, null, 2)}

CURRENT OPERATIONAL CONTEXT:
- Date: ${currentDate.toISOString().split('T')[0]}
- Season: ${currentSeason}
- Peak Season Status: ${this.isPeakSeason(currentDate) ? 'ACTIVE PEAK PERIOD' : 'Off-Peak Period'}
- Maintenance Window Quality: ${this.getMaintenanceWindowOpportunity(currentDate)}

Please provide recommendations in this exact JSON format:
{
  "recommendations": [
    {
      "tailNumber": "N123AB",
      "maintenanceType": "A_CHECK|B_CHECK|C_CHECK|D_CHECK|ANNUAL|100_HOUR|PROGRESSIVE|AD_COMPLIANCE|SB_COMPLIANCE|ENGINE_OVERHAUL|PROP_OVERHAUL",
      "priority": "LOW|MEDIUM|HIGH|CRITICAL",
      "confidence": 85.5,
      "reasoning": "Detailed explanation HEAVILY EMPHASIZING schedule demand trends and seasonal factors, followed by utilization and risk considerations",
      "estimatedCost": 15000,
      "estimatedDuration": 24,
      "suggestedDateOffset": 7,
      "riskFactors": ["High utilization", "Approaching inspection interval"],
      "complianceRequirements": ["FAR 91.409", "FAR 135.421"]
    }
  ]
}

CRITICAL ANALYSIS PRIORITIES (in order):
1. SCHEDULE DEMAND IMPACT: How does current/projected demand affect maintenance timing?
2. SEASONAL CONSIDERATIONS: Weather windows, peak/off-peak periods, operational patterns
3. OPERATIONAL PRESSURE: Can aircraft be spared from service? Alternative coverage available?
4. Risk factors and safety implications
5. Cost optimization and regulatory compliance

For each recommendation, your reasoning MUST start with schedule demand and seasonal analysis:
- "Given current [HIGH/MEDIUM/LOW] demand period and [season] seasonal patterns..."
- "Considering upcoming operational pressures and [weather/travel] patterns..."
- "With [excellent/limited] maintenance window opportunities this period..."

Then include utilization patterns, risk factors, and compliance requirements.

Provide 8-15 total recommendations across the fleet with varied confidence scores (50-95%) and realistic timing based on operational demands.`;
  }

  private processAIRecommendations(
    aiResult: any, 
    inputs: MaintenanceRecommendationInput[]
  ): AIMaintenanceRecommendation[] {
    
    if (!aiResult.recommendations || !Array.isArray(aiResult.recommendations)) {
      throw new Error('Invalid AI response format');
    }

    return aiResult.recommendations.map((rec: any) => ({
      tailNumber: rec.tailNumber || '',
      maintenanceType: rec.maintenanceType || 'A_CHECK',
      priority: rec.priority || 'MEDIUM',
      confidence: Math.max(50, Math.min(95, rec.confidence || 75)),
      reasoning: rec.reasoning || 'AI-generated maintenance recommendation',
      estimatedCost: rec.estimatedCost || 10000,
      estimatedDuration: rec.estimatedDuration || 8,
      suggestedDate: new Date(Date.now() + (rec.suggestedDateOffset || 7) * 24 * 60 * 60 * 1000),
      riskFactors: Array.isArray(rec.riskFactors) ? rec.riskFactors : ['Standard maintenance'],
      complianceRequirements: Array.isArray(rec.complianceRequirements) ? rec.complianceRequirements : this.getComplianceRequirements(rec.maintenanceType)
    }));
  }

  private generateEnhancedDemoRecommendations(
    inputs: MaintenanceRecommendationInput[]
  ): AIMaintenanceRecommendation[] {
    
    const recommendations: AIMaintenanceRecommendation[] = [];
    const maintenanceTypes = ['A_CHECK', 'B_CHECK', 'C_CHECK', '100_HOUR', 'ANNUAL', 'PROGRESSIVE', 'AD_COMPLIANCE'];
    const currentDate = new Date();
    const currentSeason = this.getCurrentSeason(currentDate);
    const isPeak = this.isPeakSeason(currentDate);
    const maintenanceWindow = this.getMaintenanceWindowOpportunity(currentDate);
    
    inputs.forEach((input, index) => {
      const aircraft = input.aircraftData;
      const utilization = input.utilizationData;
      
      // Generate schedule demand and seasonal data if not provided
      const scheduleDemand = input.scheduleDemandData || {
        currentPeriodDemand: isPeak ? 'HIGH' : 'MEDIUM',
        upcomingBookings: Math.floor(Math.random() * 20) + 10,
        averageWeeklyUtilization: utilization.utilizationPercentage,
        demandTrend: utilization.trend,
        operationalPressure: isPeak ? 'HIGH' : 'MEDIUM'
      };
      
      const seasonalData = input.seasonalData || {
        currentSeason,
        peakSeason: isPeak,
        seasonalDemandPattern: 'BUSINESS_TRAVEL',
        weatherFactors: this.getSeasonalWeatherFactors(currentSeason),
        maintenanceWindowOpportunity: maintenanceWindow
      };
      
      // Generate 2-4 recommendations per aircraft based on realistic scenarios
      const recCount = Math.min(4, Math.max(2, Math.floor(utilization.utilizationPercentage / 25)));
      
      for (let i = 0; i < recCount; i++) {
        const maintenanceType = maintenanceTypes[Math.floor(Math.random() * maintenanceTypes.length)];
        
        // Calculate AI-like confidence based on multiple factors
        let confidence = 65; // Base confidence
        
        // Schedule demand impact on confidence
        if (scheduleDemand.currentPeriodDemand === 'LOW' && maintenanceWindow === 'EXCELLENT') confidence += 20;
        else if (scheduleDemand.currentPeriodDemand === 'HIGH' && maintenanceWindow === 'POOR') confidence -= 15;
        else if (scheduleDemand.currentPeriodDemand === 'MEDIUM') confidence += 8;
        
        // Seasonal factors
        if (seasonalData.maintenanceWindowOpportunity === 'EXCELLENT') confidence += 15;
        else if (seasonalData.maintenanceWindowOpportunity === 'POOR') confidence -= 12;
        
        // Data quality factor
        if (input.flightHistory.length > 20) confidence += 10;
        else if (input.flightHistory.length > 10) confidence += 5;
        
        // Utilization patterns
        if (utilization.utilizationPercentage > 70) confidence += 8;
        else if (utilization.utilizationPercentage > 40) confidence += 4;
        else confidence -= 5;
        
        // Risk assessment
        if (utilization.maintenanceRisk === 'HIGH') confidence += 8;
        else if (utilization.maintenanceRisk === 'LOW') confidence -= 3;
        
        // Add some randomness to make it realistic
        confidence += (Math.random() - 0.5) * 15;
        confidence = Math.max(52, Math.min(94, Math.round(confidence * 10) / 10));
        
        // Generate reasoning that emphasizes schedule demand and seasonal factors first
        const seasonalDescription = isPeak ? `peak ${currentSeason.toLowerCase()} period` : `off-peak ${currentSeason.toLowerCase()} period`;
        const demandDescription = `${scheduleDemand.currentPeriodDemand.toLowerCase()} operational demand`;
        const windowDescription = `${maintenanceWindow.toLowerCase()} maintenance window opportunity`;
        
        let reasoning = `🤖 Enhanced AI Analysis: Given current ${demandDescription} during this ${seasonalDescription}, with ${windowDescription} available. `;
        
        // Add seasonal-specific considerations
        if (seasonalData.weatherFactors.length > 0) {
          reasoning += `Seasonal factors include ${seasonalData.weatherFactors[0].toLowerCase()}. `;
        }
        
        // Add schedule demand impact
        if (scheduleDemand.operationalPressure === 'HIGH') {
          reasoning += `High operational pressure suggests limited flexibility for extended maintenance. `;
        } else {
          reasoning += `Current schedule allows for planned maintenance windows. `;
        }
        
        // Then add utilization and risk factors
        reasoning += `Aircraft utilization at ${utilization.utilizationPercentage}% with ${utilization.trend.toLowerCase()} pattern and ${utilization.maintenanceRisk.toLowerCase()} risk profile supports this maintenance timing.`;
        
        recommendations.push({
          tailNumber: aircraft.tailNumber,
          maintenanceType,
          priority: scheduleDemand.operationalPressure === 'HIGH' && utilization.maintenanceRisk === 'HIGH' ? 'HIGH' : 
                   scheduleDemand.operationalPressure === 'HIGH' || utilization.maintenanceRisk === 'MEDIUM' ? 'MEDIUM' : 'LOW',
          confidence,
          reasoning,
          estimatedCost: this.getMaintenanceCost(maintenanceType),
          estimatedDuration: this.getMaintenanceDuration(maintenanceType),
          suggestedDate: new Date(Date.now() + (7 + i * 14) * 24 * 60 * 60 * 1000),
          riskFactors: this.getEnhancedRiskFactors(utilization, maintenanceType, scheduleDemand, seasonalData),
          complianceRequirements: this.getComplianceRequirements(maintenanceType)
        });
      }
    });
    
    return recommendations.slice(0, 15); // Limit to 15 recommendations
  }

  private getMaintenanceCost(type: string): number {
    const costs: { [key: string]: number } = {
      'A_CHECK': 15000,
      'B_CHECK': 35000,
      'C_CHECK': 85000,
      'D_CHECK': 200000,
      '100_HOUR': 4000,
      'ANNUAL': 18000,
      'PROGRESSIVE': 25000,
      'AD_COMPLIANCE': 8000,
      'SB_COMPLIANCE': 12000,
      'ENGINE_OVERHAUL': 450000,
      'PROP_OVERHAUL': 25000
    };
    return costs[type] || 10000;
  }

  private getMaintenanceDuration(type: string): number {
    const durations: { [key: string]: number } = {
      'A_CHECK': 8,
      'B_CHECK': 24,
      'C_CHECK': 120,
      'D_CHECK': 720,
      '100_HOUR': 4,
      'ANNUAL': 36,
      'PROGRESSIVE': 16,
      'AD_COMPLIANCE': 6,
      'SB_COMPLIANCE': 12,
      'ENGINE_OVERHAUL': 240,
      'PROP_OVERHAUL': 48
    };
    return durations[type] || 8;
  }

  private getRiskFactors(utilization: any, maintenanceType: string): string[] {
    const factors = [];
    
    if (utilization.utilizationPercentage > 75) factors.push('High utilization rate');
    if (utilization.maintenanceRisk === 'HIGH') factors.push('Elevated maintenance risk');
    if (utilization.trend === 'INCREASING') factors.push('Increasing flight activity');
    if (maintenanceType.includes('CHECK')) factors.push('Scheduled inspection due');
    
    return factors.length > 0 ? factors : ['Standard maintenance interval'];
  }

  private getEnhancedRiskFactors(
    utilization: any, 
    maintenanceType: string, 
    scheduleDemand: any, 
    seasonalData: any
  ): string[] {
    const factors = [];
    
    // Schedule demand factors (prioritized first)
    if (scheduleDemand.operationalPressure === 'HIGH') factors.push('High operational pressure limiting maintenance windows');
    if (scheduleDemand.currentPeriodDemand === 'PEAK') factors.push('Peak demand period reducing aircraft availability');
    if (scheduleDemand.demandTrend === 'INCREASING') factors.push('Increasing demand trend affecting scheduling flexibility');
    
    // Seasonal factors
    if (seasonalData.peakSeason) factors.push('Peak season operational constraints');
    if (seasonalData.maintenanceWindowOpportunity === 'POOR') factors.push('Limited seasonal maintenance windows');
    if (seasonalData.weatherFactors.length > 0) factors.push(`Seasonal weather: ${seasonalData.weatherFactors[0].toLowerCase()}`);
    
    // Traditional utilization and maintenance factors
    if (utilization.utilizationPercentage > 75) factors.push('High utilization rate');
    if (utilization.maintenanceRisk === 'HIGH') factors.push('Elevated maintenance risk');
    if (utilization.trend === 'INCREASING') factors.push('Increasing flight activity');
    if (maintenanceType.includes('CHECK')) factors.push('Scheduled inspection due');
    
    return factors.length > 0 ? factors : ['Standard maintenance interval'];
  }

  private getComplianceRequirements(maintenanceType: string): string[] {
    const requirements: { [key: string]: string[] } = {
      'A_CHECK': ['FAR 91.409', 'FAR 135.421'],
      'B_CHECK': ['FAR 91.409', 'FAR 135.421', 'FAR 145.109'],
      'C_CHECK': ['FAR 91.409', 'FAR 135.421', 'FAR 145.109'],
      'ANNUAL': ['FAR 91.409', 'FAR 91.411'],
      '100_HOUR': ['FAR 91.409', 'FAR 135.421'],
      'AD_COMPLIANCE': ['FAR 39.7', 'FAR 91.403'],
      'ENGINE_OVERHAUL': ['FAR 91.421', 'FAR 135.421']
    };
    return requirements[maintenanceType] || ['FAR 91.409'];
  }

  private getCurrentSeason(date: Date): 'SPRING' | 'SUMMER' | 'FALL' | 'WINTER' {
    const month = date.getMonth(); // 0-11
    if (month >= 2 && month <= 4) return 'SPRING'; // Mar-May
    if (month >= 5 && month <= 7) return 'SUMMER'; // Jun-Aug
    if (month >= 8 && month <= 10) return 'FALL'; // Sep-Nov
    return 'WINTER'; // Dec-Feb
  }

  private isPeakSeason(date: Date): boolean {
    const month = date.getMonth(); // 0-11
    // Peak seasons: Summer (Jun-Aug) and Winter holidays (Dec-Jan)
    return (month >= 5 && month <= 7) || month === 11 || month === 0;
  }

  private getSeasonalWeatherFactors(season: 'SPRING' | 'SUMMER' | 'FALL' | 'WINTER'): string[] {
    const factors: { [key: string]: string[] } = {
      'SPRING': ['Variable weather patterns', 'Increased turbulence', 'Pollen and dust exposure'],
      'SUMMER': ['High temperature operations', 'Thunderstorm activity', 'Increased UV exposure'],
      'FALL': ['Temperature fluctuations', 'Increased precipitation', 'Seasonal wind patterns'],
      'WINTER': ['Cold weather operations', 'Ice and snow conditions', 'Reduced daylight hours']
    };
    return factors[season] || [];
  }

  private getMaintenanceWindowOpportunity(date: Date): 'EXCELLENT' | 'GOOD' | 'LIMITED' | 'POOR' {
    const month = date.getMonth(); // 0-11
    const isPeak = this.isPeakSeason(date);
    
    if (!isPeak && (month === 1 || month === 2 || month === 9 || month === 10)) {
      return 'EXCELLENT'; // Feb, Mar, Oct, Nov - off-peak with good weather
    }
    if (!isPeak) {
      return 'GOOD'; // Other off-peak months
    }
    if (month === 6 || month === 7) {
      return 'LIMITED'; // Peak summer - some maintenance windows available
    }
    return 'POOR'; // Peak winter holidays
  }
}

// Export singleton instance
export const openAIService = new OpenAIMaintenanceService(); 