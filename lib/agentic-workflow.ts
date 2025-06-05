/**
 * Agentic Maintenance Workflow System
 * Automated end-to-end maintenance scheduling and execution
 */

import { maintenanceChecklists, getRequiredPersonnel, MaintenanceTask } from './maintenance-tasks';
import { MaintenanceScheduleItem } from './maintenance-scheduler';

// Workflow Types
export interface MaintenanceRecommendation {
  id: string;
  aircraftId: string;
  tailNumber: string;
  maintenanceType: string;
  recommendedDate: Date;
  aiConfidence: number;
  reasoning: string[];
  estimatedCost: number;
  estimatedDowntime: number;
  urgency: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  affectedAssets: string[];
  requiredPersonnel: string[];
  timeWindow: {
    earliest: Date;
    latest: Date;
    optimal: Date;
  };
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED';
  createdAt: Date;
  approvedBy?: string;
  approvedAt?: Date;
}

export interface TaskAssignment {
  id: string;
  recommendationId: string;
  assigneeType: 'MECHANIC' | 'INSPECTOR' | 'SUPERVISOR' | 'PARTS_MANAGER' | 'PILOT' | 'CLEANING_CREW';
  assigneeName: string;
  assigneeEmail: string;
  assigneePhone?: string;
  taskDescription: string;
  scheduledStart: Date;
  estimatedDuration: number;
  location: string;
  specialInstructions?: string;
  requiredTools: string[];
  requiredParts?: string[];
  status: 'ASSIGNED' | 'ACKNOWLEDGED' | 'IN_PROGRESS' | 'COMPLETED' | 'DELAYED';
  notificationsSent: NotificationRecord[];
  digitalChecklistUrl?: string;
  signOffRequired: boolean;
}

export interface NotificationRecord {
  id: string;
  type: 'EMAIL' | 'SMS' | 'PUSH';
  recipient: string;
  subject: string;
  content: string;
  sentAt: Date;
  status: 'SENT' | 'DELIVERED' | 'READ' | 'FAILED';
  retryCount: number;
}

export interface WorkOrderCreation {
  id: string;
  recommendationId: string;
  workOrderNumber: string;
  title: string;
  description: string;
  aircraftId: string;
  maintenanceType: string;
  tasks: MaintenanceTask[];
  assignedMechanic: string;
  assignedInspector?: string;
  scheduledStart: Date;
  estimatedCompletion: Date;
  status: 'CREATED' | 'ASSIGNED' | 'IN_PROGRESS' | 'INSPECTION' | 'COMPLETED' | 'DEFERRED';
  complianceReferences: string[];
  auditTrail: AuditTrailEntry[];
}

export interface CalendarEvent {
  id: string;
  title: string;
  description: string;
  start: Date;
  end: Date;
  location: string;
  attendees: string[];
  resources: string[];
  calendarSystem: 'GOOGLE' | 'OUTLOOK' | 'INTERNAL';
  eventId: string;
  remindersSent: boolean;
}

export interface ResourceBooking {
  id: string;
  resourceType: 'HANGAR' | 'TOOLS' | 'GSE' | 'LIFT';
  resourceName: string;
  bookedFrom: Date;
  bookedUntil: Date;
  bookedBy: string;
  recommendationId: string;
  status: 'RESERVED' | 'CONFIRMED' | 'IN_USE' | 'COMPLETED' | 'CANCELLED';
}

export interface ComplianceLog {
  id: string;
  recommendationId: string;
  regulationType: 'FAR_135' | 'FAR_91' | 'FAR_43' | 'AD' | 'SB';
  regulation: string;
  description: string;
  complianceAction: string;
  loggedAt: Date;
  loggedBy: string;
  documentationLinks: string[];
  auditReady: boolean;
}

export interface AuditTrailEntry {
  id: string;
  timestamp: Date;
  action: string;
  actor: string;
  actorType: 'USER' | 'SYSTEM' | 'AI';
  details: string;
  dataChanges?: { [key: string]: { before: any; after: any } };
  ipAddress?: string;
  sessionId?: string;
  complianceRelevant: boolean;
}

// Main Agentic Workflow Class
export class AgenticMaintenanceWorkflow {
  private auditTrail: AuditTrailEntry[] = [];

  constructor() {
    this.logAuditEntry('SYSTEM_INIT', 'SYSTEM', 'Agentic Maintenance Workflow initialized', {}, true);
  }

  // Step 1: AI-Generated Recommendation
  async generateAIRecommendation(
    scheduleItem: MaintenanceScheduleItem,
    utilizationData: any,
    operationalConstraints: any
  ): Promise<MaintenanceRecommendation> {
    
    const recommendation: MaintenanceRecommendation = {
      id: `rec-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      aircraftId: scheduleItem.aircraftId,
      tailNumber: scheduleItem.tailNumber,
      maintenanceType: scheduleItem.maintenanceType,
      recommendedDate: scheduleItem.scheduledDate,
      aiConfidence: scheduleItem.confidenceScore,
      reasoning: [
        ...scheduleItem.reasoning,
        `AI optimization score: ${(scheduleItem.confidenceScore * 100).toFixed(1)}%`,
        `Estimated operational impact: ${scheduleItem.impactOnOperations}`,
        `Cost-efficiency rating: ${this.calculateCostEfficiency(scheduleItem)}`
      ],
      estimatedCost: scheduleItem.estimatedCost,
      estimatedDowntime: scheduleItem.estimatedDuration,
      urgency: this.calculateUrgency(scheduleItem),
      affectedAssets: [scheduleItem.tailNumber],
      requiredPersonnel: getRequiredPersonnel(scheduleItem.maintenanceType),
      timeWindow: {
        earliest: new Date(scheduleItem.scheduledDate.getTime() - 7 * 24 * 60 * 60 * 1000), // 1 week before
        latest: new Date(scheduleItem.scheduledDate.getTime() + 7 * 24 * 60 * 60 * 1000),   // 1 week after
        optimal: scheduleItem.scheduledDate
      },
      status: 'PENDING',
      createdAt: new Date()
    };

    this.logAuditEntry(
      'AI_RECOMMENDATION_GENERATED',
      'AI_SYSTEM',
      `Generated maintenance recommendation for ${scheduleItem.tailNumber}`,
      { recommendationId: recommendation.id, maintenanceType: scheduleItem.maintenanceType },
      true
    );

    return recommendation;
  }

  // Step 2: One-Click Approval Handler
  async approveRecommendation(
    recommendationId: string,
    approvedBy: string,
    approvalNotes?: string
  ): Promise<{
    success: boolean;
    workflowId: string;
    message: string;
    estimatedCompletion: Date;
  }> {
    
    this.logAuditEntry(
      'RECOMMENDATION_APPROVED',
      approvedBy,
      `Approved recommendation ${recommendationId}`,
      { recommendationId, approvalNotes },
      true
    );

    try {
      // Trigger the automated action sequence
      const workflowResult = await this.executeAutomatedSequence(recommendationId, approvedBy);
      
      return {
        success: true,
        workflowId: workflowResult.workflowId,
        message: `Maintenance workflow initiated successfully. ${workflowResult.actionsCompleted} automated actions completed.`,
        estimatedCompletion: workflowResult.estimatedCompletion
      };
    } catch (error) {
      this.logAuditEntry(
        'APPROVAL_FAILED',
        'SYSTEM',
        `Failed to process approval for ${recommendationId}`,
        { error: error.message },
        true
      );
      
      return {
        success: false,
        workflowId: '',
        message: `Failed to initiate workflow: ${error.message}`,
        estimatedCompletion: new Date()
      };
    }
  }

  // Step 3: Automated Action Sequence
  private async executeAutomatedSequence(
    recommendationId: string,
    approvedBy: string
  ): Promise<{ workflowId: string; actionsCompleted: number; estimatedCompletion: Date }> {
    
    const workflowId = `workflow-${Date.now()}`;
    let actionsCompleted = 0;

    try {
      // 3a. Task Assignment & Notifications
      const assignments = await this.createTaskAssignments(recommendationId);
      await this.sendNotifications(assignments);
      actionsCompleted++;

      // 3b. Calendar & Resource Booking
      const calendarEvent = await this.createCalendarEvent(recommendationId);
      const resourceBookings = await this.bookResources(recommendationId);
      actionsCompleted++;

      // 3c. Work Order Creation
      const workOrder = await this.createWorkOrder(recommendationId, approvedBy);
      actionsCompleted++;

      // 3d. Compliance Logging
      await this.createComplianceLogs(recommendationId);
      actionsCompleted++;

      // 3e. Pre-Inspection Reminders Setup
      await this.scheduleReminders(recommendationId);
      actionsCompleted++;

      const estimatedCompletion = new Date(Date.now() + 48 * 60 * 60 * 1000); // 48 hours from now

      this.logAuditEntry(
        'AUTOMATED_SEQUENCE_COMPLETED',
        'SYSTEM',
        `Completed automated sequence for workflow ${workflowId}`,
        { 
          workflowId, 
          recommendationId, 
          actionsCompleted,
          workOrderId: workOrder.id,
          calendarEventId: calendarEvent.id
        },
        true
      );

      return { workflowId, actionsCompleted, estimatedCompletion };

    } catch (error) {
      this.logAuditEntry(
        'AUTOMATED_SEQUENCE_FAILED',
        'SYSTEM',
        `Automated sequence failed for recommendation ${recommendationId}`,
        { error: error.message, actionsCompleted },
        true
      );
      throw error;
    }
  }

  // 3a. Task Assignment & Notification
  private async createTaskAssignments(recommendationId: string): Promise<TaskAssignment[]> {
    // Mock implementation - in reality would integrate with HR/scheduling systems
    const assignments: TaskAssignment[] = [
      {
        id: `assign-${Date.now()}-1`,
        recommendationId,
        assigneeType: 'MECHANIC',
        assigneeName: 'John Smith',
        assigneeEmail: 'john.smith@example.com',
        assigneePhone: '+1-555-0123',
        taskDescription: 'Lead maintenance inspection',
        scheduledStart: new Date(Date.now() + 24 * 60 * 60 * 1000),
        estimatedDuration: 8,
        location: 'Hangar A, Bay 2',
        specialInstructions: 'Review AD compliance checklist before starting',
        requiredTools: ['Inspection Tools', 'Torque Wrench', 'Multimeter'],
        status: 'ASSIGNED',
        notificationsSent: [],
        signOffRequired: true
      },
      {
        id: `assign-${Date.now()}-2`,
        recommendationId,
        assigneeType: 'PARTS_MANAGER',
        assigneeName: 'Sarah Johnson',
        assigneeEmail: 'sarah.johnson@example.com',
        taskDescription: 'Prepare required parts and consumables',
        scheduledStart: new Date(Date.now() + 2 * 60 * 60 * 1000),
        estimatedDuration: 2,
        location: 'Parts Department',
        requiredTools: ['Parts Catalog'],
        requiredParts: ['Oil Filters', 'Spark Plugs', 'Aviation Oil'],
        status: 'ASSIGNED',
        notificationsSent: [],
        signOffRequired: false
      }
    ];

    return assignments;
  }

  private async sendNotifications(assignments: TaskAssignment[]): Promise<void> {
    for (const assignment of assignments) {
      const notifications: NotificationRecord[] = [
        {
          id: `notif-${Date.now()}-${assignment.id}`,
          type: 'EMAIL',
          recipient: assignment.assigneeEmail,
          subject: `Maintenance Task Assignment - ${assignment.taskDescription}`,
          content: this.generateNotificationContent(assignment),
          sentAt: new Date(),
          status: 'SENT',
          retryCount: 0
        }
      ];

      if (assignment.assigneePhone) {
        notifications.push({
          id: `notif-sms-${Date.now()}-${assignment.id}`,
          type: 'SMS',
          recipient: assignment.assigneePhone,
          subject: 'Maintenance Task',
          content: `Task assigned: ${assignment.taskDescription}. Start: ${assignment.scheduledStart.toLocaleDateString()}`,
          sentAt: new Date(),
          status: 'SENT',
          retryCount: 0
        });
      }

      assignment.notificationsSent = notifications;
    }
  }

  // 3b. Calendar & Resource Booking
  private async createCalendarEvent(recommendationId: string): Promise<CalendarEvent> {
    const event: CalendarEvent = {
      id: `cal-${Date.now()}`,
      title: 'Aircraft Maintenance - A-Check',
      description: 'Scheduled maintenance inspection',
      start: new Date(Date.now() + 24 * 60 * 60 * 1000),
      end: new Date(Date.now() + 32 * 60 * 60 * 1000), // 8 hours later
      location: 'Hangar A, Bay 2',
      attendees: ['john.smith@example.com', 'sarah.johnson@example.com'],
      resources: ['Hangar A', 'Maintenance Tools', 'Ground Power Unit'],
      calendarSystem: 'INTERNAL',
      eventId: `maint-${recommendationId}`,
      remindersSent: false
    };

    return event;
  }

  private async bookResources(recommendationId: string): Promise<ResourceBooking[]> {
    const bookings: ResourceBooking[] = [
      {
        id: `book-${Date.now()}-1`,
        resourceType: 'HANGAR',
        resourceName: 'Hangar A - Bay 2',
        bookedFrom: new Date(Date.now() + 24 * 60 * 60 * 1000),
        bookedUntil: new Date(Date.now() + 32 * 60 * 60 * 1000),
        bookedBy: 'Maintenance Scheduler',
        recommendationId,
        status: 'RESERVED'
      },
      {
        id: `book-${Date.now()}-2`,
        resourceType: 'GSE',
        resourceName: 'Ground Power Unit #3',
        bookedFrom: new Date(Date.now() + 24 * 60 * 60 * 1000),
        bookedUntil: new Date(Date.now() + 32 * 60 * 60 * 1000),
        bookedBy: 'Maintenance Scheduler',
        recommendationId,
        status: 'RESERVED'
      }
    ];

    return bookings;
  }

  // 3c. Work Order Creation
  private async createWorkOrder(recommendationId: string, approvedBy: string): Promise<WorkOrderCreation> {
    const workOrder: WorkOrderCreation = {
      id: `wo-${Date.now()}`,
      recommendationId,
      workOrderNumber: `WO-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`,
      title: 'A-Check Inspection - Scheduled Maintenance',
      description: 'Comprehensive A-Check inspection per FAA requirements',
      aircraftId: 'n123ab',
      maintenanceType: 'A_CHECK',
      tasks: maintenanceChecklists['A_CHECK']?.tasks || [],
      assignedMechanic: 'John Smith',
      assignedInspector: 'Mike Wilson',
      scheduledStart: new Date(Date.now() + 24 * 60 * 60 * 1000),
      estimatedCompletion: new Date(Date.now() + 32 * 60 * 60 * 1000),
      status: 'CREATED',
      complianceReferences: ['FAR 91.409', 'FAR 43.13'],
      auditTrail: []
    };

    workOrder.auditTrail.push({
      id: `audit-${Date.now()}`,
      timestamp: new Date(),
      action: 'WORK_ORDER_CREATED',
      actor: approvedBy,
      actorType: 'USER',
      details: `Work order created from approved recommendation ${recommendationId}`,
      complianceRelevant: true
    });

    return workOrder;
  }

  // 3d. Compliance Logging
  private async createComplianceLogs(recommendationId: string): Promise<ComplianceLog[]> {
    const logs: ComplianceLog[] = [
      {
        id: `comp-${Date.now()}-1`,
        recommendationId,
        regulationType: 'FAR_135',
        regulation: 'FAR 135.411',
        description: 'Part 135 maintenance schedule compliance',
        complianceAction: 'Scheduled A-Check inspection per approved maintenance program',
        loggedAt: new Date(),
        loggedBy: 'Agentic Workflow System',
        documentationLinks: [],
        auditReady: true
      },
      {
        id: `comp-${Date.now()}-2`,
        recommendationId,
        regulationType: 'FAR_43',
        regulation: 'FAR 43.13',
        description: 'Maintenance performance standards',
        complianceAction: 'Work order created with qualified personnel assignments',
        loggedAt: new Date(),
        loggedBy: 'Agentic Workflow System',
        documentationLinks: [],
        auditReady: true
      }
    ];

    return logs;
  }

  // 3e. Pre-Inspection Reminders
  private async scheduleReminders(recommendationId: string): Promise<void> {
    // Schedule 24-hour reminder
    setTimeout(async () => {
      await this.sendReminder(recommendationId, '24-hour reminder: Maintenance scheduled for tomorrow');
    }, 1000); // In reality, this would use a proper job scheduler

    // Schedule 2-hour reminder
    setTimeout(async () => {
      await this.sendReminder(recommendationId, '2-hour reminder: Maintenance starting soon');
    }, 2000);
  }

  private async sendReminder(recommendationId: string, message: string): Promise<void> {
    this.logAuditEntry(
      'REMINDER_SENT',
      'SYSTEM',
      `Sent reminder for recommendation ${recommendationId}`,
      { message },
      false
    );
  }

  // Utility Methods
  private calculateCostEfficiency(scheduleItem: MaintenanceScheduleItem): string {
    const efficiencyScore = (scheduleItem.confidenceScore * 0.6) + 
                           (scheduleItem.impactOnOperations === 'LOW' ? 0.4 : 
                            scheduleItem.impactOnOperations === 'MEDIUM' ? 0.2 : 0.0);
    
    if (efficiencyScore >= 0.8) return 'EXCELLENT';
    if (efficiencyScore >= 0.6) return 'GOOD';
    if (efficiencyScore >= 0.4) return 'FAIR';
    return 'POOR';
  }

  private calculateUrgency(scheduleItem: MaintenanceScheduleItem): 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' {
    if (scheduleItem.priority === 'CRITICAL') return 'CRITICAL';
    if (scheduleItem.priority === 'HIGH') return 'HIGH';
    if (scheduleItem.priority === 'MEDIUM') return 'MEDIUM';
    return 'LOW';
  }

  private generateNotificationContent(assignment: TaskAssignment): string {
    return `
Dear ${assignment.assigneeName},

You have been assigned a maintenance task:

Task: ${assignment.taskDescription}
Scheduled Start: ${assignment.scheduledStart.toLocaleString()}
Duration: ${assignment.estimatedDuration} hours
Location: ${assignment.location}

Required Tools: ${assignment.requiredTools.join(', ')}
${assignment.requiredParts ? `Required Parts: ${assignment.requiredParts.join(', ')}` : ''}
${assignment.specialInstructions ? `Special Instructions: ${assignment.specialInstructions}` : ''}

Please confirm receipt of this assignment.

${assignment.digitalChecklistUrl ? `Digital Checklist: ${assignment.digitalChecklistUrl}` : ''}

Best regards,
Gander Maintenance System
    `.trim();
  }

  private logAuditEntry(
    action: string,
    actor: string,
    details: string,
    dataChanges: any = {},
    complianceRelevant: boolean = false
  ): void {
    const entry: AuditTrailEntry = {
      id: `audit-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      action,
      actor,
      actorType: actor === 'SYSTEM' || actor === 'AI_SYSTEM' ? 'SYSTEM' : 'USER',
      details,
      dataChanges: Object.keys(dataChanges).length > 0 ? dataChanges : undefined,
      complianceRelevant
    };

    this.auditTrail.push(entry);
  }

  // Public methods for accessing audit trail and status
  public getAuditTrail(filterCompliance: boolean = false): AuditTrailEntry[] {
    return filterCompliance 
      ? this.auditTrail.filter(entry => entry.complianceRelevant)
      : this.auditTrail;
  }

  public getWorkflowStatus(recommendationId: string): {
    status: string;
    completedActions: number;
    totalActions: number;
    nextAction: string;
  } {
    // Mock implementation - would track actual workflow progress
    return {
      status: 'IN_PROGRESS',
      completedActions: 3,
      totalActions: 5,
      nextAction: 'Awaiting mechanic confirmation'
    };
  }
} 