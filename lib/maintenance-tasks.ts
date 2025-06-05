/**
 * Comprehensive Maintenance Task Definitions
 * Based on FAA regulations and industry standards for Part 135 operations
 */

export interface MaintenanceTask {
  id: string;
  title: string;
  description: string;
  category: 'VISUAL' | 'OPERATIONAL' | 'LUBRICATION' | 'SERVICING' | 'STRUCTURAL' | 'SYSTEMS' | 'COMPLIANCE';
  estimatedMinutes: number;
  requiredTools: string[];
  requiredParts?: string[];
  skillLevel: 'BASIC' | 'INTERMEDIATE' | 'ADVANCED' | 'SPECIALIST';
  requiresIA?: boolean; // Inspection Authorization required
  complianceRef?: string; // FAR reference
  criticalSafety: boolean;
  dependencies?: string[]; // Task IDs that must be completed first
}

export interface MaintenanceChecklist {
  checkType: string;
  description: string;
  estimatedHours: number;
  requiredPersonnel: string[];
  tasks: MaintenanceTask[];
  documentation: string[];
  complianceRequirements: string[];
}

// A-Check (1A) Tasks
const aCheckTasks: MaintenanceTask[] = [
  {
    id: 'a-01',
    title: 'Visual Inspection of Airframe',
    description: 'Complete visual inspection of external airframe for damage, corrosion, or structural issues',
    category: 'VISUAL',
    estimatedMinutes: 45,
    requiredTools: ['Flashlight', 'Mirror', 'Magnifying Glass'],
    skillLevel: 'BASIC',
    complianceRef: 'FAR 91.409',
    criticalSafety: true
  },
  {
    id: 'a-02',
    title: 'Flight Controls Operational Check',
    description: 'Test all primary and secondary flight controls for proper operation and range of motion',
    category: 'OPERATIONAL',
    estimatedMinutes: 30,
    requiredTools: ['Control Surface Checker'],
    skillLevel: 'INTERMEDIATE',
    criticalSafety: true,
    dependencies: ['a-01']
  },
  {
    id: 'a-03',
    title: 'Lubrication of Moving Parts',
    description: 'Lubricate control hinges, landing gear pivots, and other moving components',
    category: 'LUBRICATION',
    estimatedMinutes: 60,
    requiredTools: ['Grease Gun', 'Oil Applicator'],
    requiredParts: ['Aviation Grease', 'Hydraulic Fluid'],
    skillLevel: 'BASIC',
    criticalSafety: false
  },
  {
    id: 'a-04',
    title: 'Avionics Systems Check',
    description: 'Test all avionics systems including navigation, communication, and transponder',
    category: 'SYSTEMS',
    estimatedMinutes: 40,
    requiredTools: ['Avionics Tester', 'Multimeter'],
    skillLevel: 'INTERMEDIATE',
    criticalSafety: true
  },
  {
    id: 'a-05',
    title: 'Fluid Level Check and Top-up',
    description: 'Check and top up engine oil, hydraulic fluid, and other system fluids',
    category: 'SERVICING',
    estimatedMinutes: 25,
    requiredTools: ['Dipstick', 'Funnel'],
    requiredParts: ['Engine Oil', 'Hydraulic Fluid'],
    skillLevel: 'BASIC',
    criticalSafety: false
  },
  {
    id: 'a-06',
    title: 'Landing Gear Inspection',
    description: 'Inspect landing gear, brakes, tires, and associated components',
    category: 'STRUCTURAL',
    estimatedMinutes: 35,
    requiredTools: ['Tire Pressure Gauge', 'Brake Disc Gauge'],
    skillLevel: 'INTERMEDIATE',
    criticalSafety: true
  },
  {
    id: 'a-07',
    title: 'Lighting Systems Test',
    description: 'Test all aircraft lighting including navigation, strobe, and landing lights',
    category: 'SYSTEMS',
    estimatedMinutes: 20,
    requiredTools: ['Light Tester'],
    skillLevel: 'BASIC',
    criticalSafety: true
  },
  {
    id: 'a-08',
    title: 'Safety Equipment Check',
    description: 'Inspect fire extinguishers, first aid kits, and emergency equipment',
    category: 'OPERATIONAL',
    estimatedMinutes: 15,
    requiredTools: ['Pressure Gauge'],
    skillLevel: 'BASIC',
    complianceRef: 'FAR 135.177',
    criticalSafety: true
  }
];

// 100-Hour Inspection Tasks
const hour100Tasks: MaintenanceTask[] = [
  {
    id: '100-01',
    title: 'Engine Comprehensive Inspection',
    description: 'Visual and operational inspection of engine, propeller, and accessories',
    category: 'SYSTEMS',
    estimatedMinutes: 120,
    requiredTools: ['Borescope', 'Compression Tester', 'Oil Analysis Kit'],
    skillLevel: 'INTERMEDIATE',
    requiresIA: true,
    complianceRef: 'FAR 91.409',
    criticalSafety: true
  },
  {
    id: '100-02',
    title: 'Airworthiness Directive Compliance',
    description: 'Review and ensure compliance with all applicable Airworthiness Directives',
    category: 'COMPLIANCE',
    estimatedMinutes: 45,
    requiredTools: ['AD Database Access'],
    skillLevel: 'ADVANCED',
    requiresIA: true,
    complianceRef: 'FAR 39.11',
    criticalSafety: true
  },
  {
    id: '100-03',
    title: 'Engine Run-up and Systems Test',
    description: 'Perform engine run-up and test all engine-related systems',
    category: 'OPERATIONAL',
    estimatedMinutes: 30,
    requiredTools: ['Tachometer', 'Engine Monitor'],
    skillLevel: 'INTERMEDIATE',
    requiresIA: false,
    criticalSafety: true,
    dependencies: ['100-01']
  },
  {
    id: '100-04',
    title: 'Control Systems Rigging Check',
    description: 'Verify proper rigging and operation of all flight control systems',
    category: 'OPERATIONAL',
    estimatedMinutes: 60,
    requiredTools: ['Rigging Board', 'Inclinometer'],
    skillLevel: 'ADVANCED',
    criticalSafety: true
  }
];

// C-Check (1C) Tasks
const cCheckTasks: MaintenanceTask[] = [
  {
    id: 'c-01',
    title: 'Panel and Access Cover Removal',
    description: 'Remove interior panels, floorboards, and access covers for detailed inspection',
    category: 'STRUCTURAL',
    estimatedMinutes: 180,
    requiredTools: ['Panel Removal Tools', 'Fastener Organizer'],
    skillLevel: 'INTERMEDIATE',
    criticalSafety: false
  },
  {
    id: 'c-02',
    title: 'Structural Corrosion Inspection',
    description: 'Detailed inspection for corrosion, cracks, and structural fatigue',
    category: 'STRUCTURAL',
    estimatedMinutes: 240,
    requiredTools: ['Eddy Current Tester', 'Dye Penetrant Kit'],
    skillLevel: 'ADVANCED',
    criticalSafety: true,
    dependencies: ['c-01']
  },
  {
    id: 'c-03',
    title: 'Time-Limited Component Review',
    description: 'Review and replace time-limited components as required',
    category: 'COMPLIANCE',
    estimatedMinutes: 120,
    requiredTools: ['Component Database Access'],
    requiredParts: ['Various TLC Components'],
    skillLevel: 'ADVANCED',
    requiresIA: true,
    complianceRef: 'FAR 43.16',
    criticalSafety: true
  },
  {
    id: 'c-04',
    title: 'Major Systems Functional Test',
    description: 'Comprehensive functional testing of all major aircraft systems',
    category: 'SYSTEMS',
    estimatedMinutes: 300,
    requiredTools: ['System Test Equipment'],
    skillLevel: 'SPECIALIST',
    criticalSafety: true,
    dependencies: ['c-02']
  },
  {
    id: 'c-05',
    title: 'Interior Component Inspection',
    description: 'Detailed inspection of cabin interior, seats, and safety equipment',
    category: 'STRUCTURAL',
    estimatedMinutes: 90,
    requiredTools: ['Torque Wrench', 'Thread Checker'],
    skillLevel: 'INTERMEDIATE',
    complianceRef: 'FAR 135.128',
    criticalSafety: true
  }
];

// Annual Inspection Tasks
const annualTasks: MaintenanceTask[] = [
  {
    id: 'annual-01',
    title: 'Maintenance Records Review',
    description: 'Comprehensive review of all maintenance records for compliance',
    category: 'COMPLIANCE',
    estimatedMinutes: 60,
    requiredTools: ['Records Database'],
    skillLevel: 'ADVANCED',
    requiresIA: true,
    complianceRef: 'FAR 91.417',
    criticalSafety: true
  },
  {
    id: 'annual-02',
    title: 'Regulatory Compliance Verification',
    description: 'Verify compliance with all FAA requirements and manufacturer specifications',
    category: 'COMPLIANCE',
    estimatedMinutes: 90,
    requiredTools: ['Regulation Database'],
    skillLevel: 'ADVANCED',
    requiresIA: true,
    complianceRef: 'FAR 91.409',
    criticalSafety: true
  },
  {
    id: 'annual-03',
    title: 'Annual Inspection Sign-off',
    description: 'Final inspection authorization and documentation',
    category: 'COMPLIANCE',
    estimatedMinutes: 30,
    requiredTools: ['Logbook'],
    skillLevel: 'ADVANCED',
    requiresIA: true,
    complianceRef: 'FAR 43.11',
    criticalSafety: true,
    dependencies: ['annual-01', 'annual-02']
  }
];

// Daily/Pre-flight Tasks
const dailyTasks: MaintenanceTask[] = [
  {
    id: 'daily-01',
    title: 'Exterior Walk-around Inspection',
    description: 'Visual inspection of aircraft exterior for damage or anomalies',
    category: 'VISUAL',
    estimatedMinutes: 15,
    requiredTools: ['Flashlight'],
    skillLevel: 'BASIC',
    criticalSafety: true
  },
  {
    id: 'daily-02',
    title: 'Fluid Level Verification',
    description: 'Check engine oil, hydraulic fluid, and fuel levels',
    category: 'SERVICING',
    estimatedMinutes: 10,
    requiredTools: ['Dipstick'],
    skillLevel: 'BASIC',
    criticalSafety: true
  },
  {
    id: 'daily-03',
    title: 'Avionics and Systems Test',
    description: 'Test lights, avionics, and safety equipment functionality',
    category: 'OPERATIONAL',
    estimatedMinutes: 20,
    requiredTools: ['Checklist'],
    skillLevel: 'BASIC',
    criticalSafety: true
  },
  {
    id: 'daily-04',
    title: 'Tire and Brake Inspection',
    description: 'Check tire pressure and brake condition',
    category: 'STRUCTURAL',
    estimatedMinutes: 10,
    requiredTools: ['Tire Pressure Gauge'],
    skillLevel: 'BASIC',
    criticalSafety: true
  }
];

// Progressive Inspection Tasks (sample segment)
const progressiveTasks: MaintenanceTask[] = [
  {
    id: 'prog-01',
    title: 'Segment A - Control Systems',
    description: 'Detailed inspection of primary flight control systems',
    category: 'SYSTEMS',
    estimatedMinutes: 180,
    requiredTools: ['Control System Tester'],
    skillLevel: 'INTERMEDIATE',
    criticalSafety: true
  },
  {
    id: 'prog-02',
    title: 'Segment B - Landing Gear',
    description: 'Comprehensive landing gear system inspection',
    category: 'STRUCTURAL',
    estimatedMinutes: 120,
    requiredTools: ['Gear Inspection Tools'],
    skillLevel: 'INTERMEDIATE',
    criticalSafety: true
  }
];

// Complete maintenance checklists
export const maintenanceChecklists: { [key: string]: MaintenanceChecklist } = {
  'A_CHECK': {
    checkType: 'A_CHECK',
    description: 'A-Check (1A) - Basic airframe and systems inspection',
    estimatedHours: 4.5,
    requiredPersonnel: ['Certified A&P Mechanic'],
    tasks: aCheckTasks,
    documentation: ['Logbook Entry', 'Inspection Checklist', 'Maintenance Tracking Update'],
    complianceRequirements: ['FAR 91.409', 'FAR 43.13']
  },
  '100_HOUR': {
    checkType: '100_HOUR',
    description: '100-Hour Inspection - Part 135 regulatory compliance',
    estimatedHours: 8,
    requiredPersonnel: ['Certified A&P Mechanic', 'IA Inspector'],
    tasks: [...aCheckTasks, ...hour100Tasks],
    documentation: ['Signed Inspection Checklist', 'Logbook Entry', 'AD Compliance Record'],
    complianceRequirements: ['FAR 91.409', 'FAR 43.15', 'FAR 135.411']
  },
  'C_CHECK': {
    checkType: 'C_CHECK',
    description: 'C-Check (1C) - Comprehensive inspection of airframe and systems',
    estimatedHours: 24,
    requiredPersonnel: ['Maintenance Team Lead', 'A&P Mechanics', 'Avionics Specialist', 'IA Inspector'],
    tasks: [...aCheckTasks, ...cCheckTasks],
    documentation: ['Extensive Inspection Report', 'Compliance Package', 'Work Order Completion'],
    complianceRequirements: ['FAR 43.13', 'FAR 145.109', 'Manufacturer Specifications']
  },
  'ANNUAL': {
    checkType: 'ANNUAL',
    description: 'Annual Inspection - FAA mandated comprehensive check',
    estimatedHours: 12,
    requiredPersonnel: ['IA Inspector', 'A&P Mechanic'],
    tasks: [...aCheckTasks, ...hour100Tasks, ...annualTasks],
    documentation: ['Annual Inspection Sign-off', 'Compliance Verification', 'Updated Maintenance Records'],
    complianceRequirements: ['FAR 91.409', 'FAR 43.11', 'FAR 91.417']
  },
  'DAILY': {
    checkType: 'DAILY',
    description: 'Daily/Pre-flight Inspection - Safety and readiness check',
    estimatedHours: 1,
    requiredPersonnel: ['Pilot or Certified Mechanic'],
    tasks: dailyTasks,
    documentation: ['Pre-flight Checklist Completion', 'Discrepancy Log (if applicable)'],
    complianceRequirements: ['FAR 91.7', 'FAR 135.71']
  },
  'PROGRESSIVE': {
    checkType: 'PROGRESSIVE',
    description: 'Progressive Inspection - Segmented maintenance program',
    estimatedHours: 6,
    requiredPersonnel: ['Maintenance Staff', 'A&P Mechanic'],
    tasks: progressiveTasks,
    documentation: ['Progressive Inspection Log', 'Segment Tracking', 'Work Completion Records'],
    complianceRequirements: ['FAR 91.409', 'FAR 43.15']
  }
};

// Task assignment logic
export function getRequiredPersonnel(checkType: string): string[] {
  return maintenanceChecklists[checkType]?.requiredPersonnel || ['A&P Mechanic'];
}

export function getEstimatedDuration(checkType: string): number {
  return maintenanceChecklists[checkType]?.estimatedHours || 4;
}

export function getTasksByCategory(checkType: string, category: MaintenanceTask['category']): MaintenanceTask[] {
  const checklist = maintenanceChecklists[checkType];
  return checklist?.tasks.filter(task => task.category === category) || [];
}

export function getCriticalSafetyTasks(checkType: string): MaintenanceTask[] {
  const checklist = maintenanceChecklists[checkType];
  return checklist?.tasks.filter(task => task.criticalSafety) || [];
}

export function getTaskDependencies(taskId: string, checkType: string): MaintenanceTask[] {
  const checklist = maintenanceChecklists[checkType];
  const task = checklist?.tasks.find(t => t.id === taskId);
  
  if (!task?.dependencies) return [];
  
  return checklist.tasks.filter(t => task.dependencies?.includes(t.id)) || [];
} 