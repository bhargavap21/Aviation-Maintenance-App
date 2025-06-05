'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Calendar, 
  Clock, 
  AlertTriangle, 
  CheckCircle2, 
  XCircle,
  Wrench, 
  Brain,
  Loader2,
  Users,
  MapPin,
  FileText,
  Zap,
  Shield,
  TrendingUp,
  Settings,
  Play,
  Pause,
  MoreHorizontal,
  Eye,
  Check,
  X,
  Bell,
  Activity
} from 'lucide-react';
import { MaintenanceScheduleItem, ScheduleOptimizationResult, UtilizationPattern } from '@/lib/maintenance-scheduler';

// Enhanced interfaces for agentic workflow
interface AIRecommendation {
  id: string;
  aircraftId: string;
  tailNumber: string;
  maintenanceType: string;
  recommendedDate: string;
  aiConfidence: number;
  reasoning: string[];
  estimatedCost: number;
  estimatedDowntime: number;
  urgency: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  affectedAssets: string[];
  requiredPersonnel: string[];
  timeWindow: {
    earliest: string;
    latest: string;
    optimal: string;
  };
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED';
  createdAt: string;
  approvedBy?: string;
  approvedAt?: string;
}

interface WorkflowStatus {
  status: string;
  completedActions: number;
  totalActions: number;
  nextAction: string;
}

interface AuditEntry {
  id: string;
  timestamp: string;
  action: string;
  actor: string;
  actorType: 'USER' | 'SYSTEM' | 'AI';
  details: string;
  complianceRelevant: boolean;
}

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

interface SchedulePageProps {}

export default function SchedulePage(): React.ReactElement {
  const [activeView, setActiveView] = useState<'schedule' | 'utilization' | 'config' | 'recommendations' | 'workflow' | 'audit'>('recommendations');
  const [optimizedSchedule, setOptimizedSchedule] = useState<ScheduleOptimizationResult | null>(null);
  const [utilizationData, setUtilizationData] = useState<UtilizationPattern[]>([]);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [selectedAircraft, setSelectedAircraft] = useState<string>('');
  const [viewMode, setViewMode] = useState<'schedule' | 'utilization' | 'config'>('schedule');
  const [optimizationConfig, setOptimizationConfig] = useState({
    costWeight: 0.3,
    availabilityWeight: 0.4,
    utilizationWeight: 0.2,
    safetyWeight: 0.1
  });

  // New agentic workflow state
  const [aiRecommendations, setAIRecommendations] = useState<AIRecommendation[]>([]);
  const [workflowStatuses, setWorkflowStatuses] = useState<{ [key: string]: WorkflowStatus }>({});
  const [activeWorkflows, setActiveWorkflows] = useState<ActiveWorkflow[]>([]);
  const [auditTrail, setAuditTrail] = useState<AuditEntry[]>([]);
  const [selectedRecommendation, setSelectedRecommendation] = useState<string | null>(null);
  const [approvalInProgress, setApprovalInProgress] = useState<string | null>(null);

  useEffect(() => {
    // Load initial data
    loadScheduleData();
    loadUtilizationData();
    loadRecommendations();
    loadActiveWorkflows();
    loadAuditTrail();
  }, []);

  const loadScheduleData = async () => {
    try {
      setIsOptimizing(true);
      const response = await fetch('/api/maintenance-schedule?action=optimize');
      const data = await response.json();
      
      if (data.success) {
        // Convert date strings back to Date objects
        const processedData = {
          ...data.data,
          schedule: data.data.schedule.map((item: any) => ({
            ...item,
            scheduledDate: item.scheduledDate ? new Date(item.scheduledDate) : new Date(),
            alternativeDates: item.alternativeDates?.map((date: string) => new Date(date)) || []
          }))
        };
        setOptimizedSchedule(processedData);
        
        // Also load the new AI recommendations
        if (data.data.aiRecommendations) {
          setAIRecommendations(data.data.aiRecommendations);
        }
      }
    } catch (error) {
      console.error('Failed to load schedule data:', error);
    } finally {
      setIsOptimizing(false);
    }
  };

  const loadUtilizationData = async () => {
    try {
      const response = await fetch('/api/maintenance-schedule?action=utilization-analysis');
      const data = await response.json();
      
      if (data.success) {
        // Convert date strings back to Date objects in utilization data
        const processedData = data.data.map((pattern: any) => ({
          ...pattern,
          predictedUtilization: pattern.predictedUtilization?.map((pred: any) => ({
            ...pred,
            date: new Date(pred.date)
          })) || [],
          peakPeriods: pattern.peakPeriods?.map((period: any) => ({
            ...period,
            start: new Date(period.start),
            end: new Date(period.end)
          })) || [],
          lowPeriods: pattern.lowPeriods?.map((period: any) => ({
            ...period,
            start: new Date(period.start),
            end: new Date(period.end)
          })) || []
        }));
        setUtilizationData(processedData);
      }
    } catch (error) {
      console.error('Failed to load utilization data:', error);
    }
  };

  const loadRecommendations = async () => {
    try {
      const response = await fetch('/api/maintenance-schedule?action=ai-recommendations');
      const data = await response.json();
      
      if (data.success) {
        setAIRecommendations(data.data.recommendations.map((rec: any) => ({
          ...rec,
          recommendedDate: new Date(rec.recommendedDate).toISOString(),
          timeWindow: {
            earliest: new Date(rec.timeWindow.earliest).toISOString(),
            latest: new Date(rec.timeWindow.latest).toISOString(),
            optimal: new Date(rec.timeWindow.optimal).toISOString()
          },
          createdAt: new Date(rec.createdAt).toISOString(),
          approvedAt: rec.approvedAt ? new Date(rec.approvedAt).toISOString() : undefined
        })));
      }
    } catch (error) {
      console.error('Failed to load recommendations:', error);
    }
  };

  const loadAuditTrail = async () => {
    try {
      const response = await fetch('/api/maintenance-schedule?action=audit-trail');
      const data = await response.json();
      
      if (data.success) {
        setAuditTrail(data.data.auditTrail.map((entry: any) => ({
          ...entry,
          timestamp: new Date(entry.timestamp).toISOString()
        })));
      }
    } catch (error) {
      console.error('Failed to load audit trail:', error);
    }
  };

  const loadActiveWorkflows = async () => {
    try {
      const response = await fetch('/api/maintenance-schedule?action=active-workflows');
      const data = await response.json();
      
      if (data.success) {
        setActiveWorkflows(data.data.workflows);
      }
    } catch (error) {
      console.error('Failed to load active workflows:', error);
    }
  };

  const handleOptimizeSchedule = async () => {
    await loadScheduleData();
  };

  const handleConfigUpdate = async () => {
    try {
      const response = await fetch('/api/maintenance-schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update-config',
          config: optimizationConfig
        })
      });
      
      if (response.ok) {
        await loadScheduleData(); // Re-optimize with new config
      }
    } catch (error) {
      console.error('Failed to update config:', error);
    }
  };

  const getPriorityColor = (priority: string) => {
    const colors = {
      'CRITICAL': 'bg-red-100 text-red-800 border-red-200',
      'HIGH': 'bg-orange-100 text-orange-800 border-orange-200',
      'MEDIUM': 'bg-yellow-100 text-yellow-800 border-yellow-200',
      'LOW': 'bg-green-100 text-green-800 border-green-200'
    };
    return colors[priority as keyof typeof colors] || colors.MEDIUM;
  };

  const getMaintenanceTypeIcon = (type: string) => {
    const icons = {
      'A_CHECK': <Wrench className="h-4 w-4" />,
      'C_CHECK': <Settings className="h-4 w-4" />,
      '100_HOUR': <Clock className="h-4 w-4" />,
      'ANNUAL': <Calendar className="h-4 w-4" />
    };
    return icons[type as keyof typeof icons] || <Wrench className="h-4 w-4" />;
  };

  // New agentic workflow functions
  const approveRecommendation = async (recommendationId: string) => {
    try {
      setApprovalInProgress(recommendationId);
      
      const response = await fetch('/api/maintenance-schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'approve-recommendation',
          recommendationId,
          approvedBy: 'Maintenance Manager', // In reality, this would come from user session
          approvalNotes: 'Approved via agentic workflow system'
        })
      });
      
      const data = await response.json();
      
      if (data.success) {
        // Update the recommendation status
        setAIRecommendations(prev => 
          prev.map(rec => 
            rec.id === recommendationId 
              ? { ...rec, status: 'APPROVED', approvedBy: 'Maintenance Manager', approvedAt: new Date().toISOString() }
              : rec
          )
        );
        
        // Refresh audit trail and active workflows to show automated actions
        await loadAuditTrail();
        await loadActiveWorkflows();
        
        // Show detailed success message with email notifications
        const emailInfo = data.data.emailNotifications;
        const emailSummary = emailInfo ? 
          `\n\n📧 EMAIL NOTIFICATIONS:\n✅ Sent to ${emailInfo.sent} personnel:\n${emailInfo.recipients.map(r => `   • ${r.name} (${r.role})`).join('\n')}${emailInfo.failures.length > 0 ? `\n\n❌ Failed notifications:\n${emailInfo.failures.map(f => `   • ${f}`).join('\n')}` : ''}` : '';
        
        alert(`✅ Workflow initiated successfully!${emailSummary}\n\n🤖 AUTOMATED ACTIONS:\n${data.data.automatedActions.join('\n')}`);
      } else {
        alert(`❌ Failed to approve recommendation: ${data.message}`);
      }
    } catch (error) {
      console.error('Failed to approve recommendation:', error);
      alert('❌ Failed to approve recommendation');
    } finally {
      setApprovalInProgress(null);
    }
  };

  const rejectRecommendation = async (recommendationId: string) => {
    const reason = prompt('Please provide a reason for rejection:');
    if (!reason) return;

    try {
      const response = await fetch('/api/maintenance-schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'reject-recommendation',
          recommendationId,
          rejectedBy: 'Maintenance Manager',
          rejectionReason: reason
        })
      });
      
      const data = await response.json();
      
      if (data.success) {
        setAIRecommendations(prev => 
          prev.map(rec => 
            rec.id === recommendationId 
              ? { ...rec, status: 'REJECTED' }
              : rec
          )
        );
        
        await loadAuditTrail();
      }
    } catch (error) {
      console.error('Failed to reject recommendation:', error);
    }
  };

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'CRITICAL': return 'text-red-600 bg-red-50 border-red-200';
      case 'HIGH': return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'MEDIUM': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      default: return 'text-blue-600 bg-blue-50 border-blue-200';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING': return 'text-yellow-600 bg-yellow-50';
      case 'APPROVED': return 'text-green-600 bg-green-50';
      case 'REJECTED': return 'text-red-600 bg-red-50';
      case 'IN_PROGRESS': return 'text-blue-600 bg-blue-50';
      case 'COMPLETED': return 'text-gray-600 bg-gray-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const getWorkflowStatusColor = (status: string) => {
    switch (status) {
      case 'INITIATED': return 'text-blue-600 bg-blue-50 border-blue-200';
      case 'IN_PROGRESS': return 'text-green-600 bg-green-50 border-green-200';
      case 'AWAITING_PARTS': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'INSPECTION': return 'text-purple-600 bg-purple-50 border-purple-200';
      case 'DELAYED': return 'text-red-600 bg-red-50 border-red-200';
      case 'COMPLETED': return 'text-gray-600 bg-gray-50 border-gray-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const formatRelativeTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = date.getTime() - now.getTime();
    const diffHours = Math.round(diffMs / (1000 * 60 * 60));
    const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
    
    if (Math.abs(diffHours) < 24) {
      return diffHours > 0 ? `in ${diffHours}h` : `${Math.abs(diffHours)}h ago`;
    } else {
      return diffDays > 0 ? `in ${diffDays}d` : `${Math.abs(diffDays)}d ago`;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <Brain className="text-blue-600" size={28} />
                AI-Powered Maintenance Scheduler
              </h1>
              <p className="text-sm text-gray-500">Agentic workflow system with automated task management</p>
            </div>
            
            <div className="flex items-center gap-4">
              {/* Primary Navigation */}
              <nav className="hidden md:flex items-center gap-2">
                <Link 
                  href="/" 
                  className="px-4 py-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg font-medium transition-colors"
                >
                  Dashboard
                </Link>
                <Link 
                  href="/schedule" 
                  className="px-4 py-2 text-blue-600 bg-blue-50 rounded-lg font-medium border border-blue-200"
                >
                  AI Schedule
                </Link>
              </nav>
              
              {/* Status indicators */}
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Activity size={16} />
                <span>{aiRecommendations.filter(r => r.status === 'PENDING').length} pending approvals</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Play size={16} />
                <span>{activeWorkflows.length} active workflows</span>
              </div>
              <button
                onClick={loadScheduleData}
                disabled={isOptimizing}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 disabled:opacity-50 transition-colors"
              >
                {isOptimizing ? <Loader2 className="animate-spin" size={16} /> : <Zap size={16} />}
                {isOptimizing ? 'Optimizing...' : 'Generate New Recommendations'}
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Navigation Tabs */}
        <div className="mb-8">
          <nav className="flex space-x-8">
            {[
              { id: 'recommendations', label: 'AI Recommendations', icon: Brain },
              { id: 'schedule', label: 'Schedule View', icon: Calendar },
              { id: 'utilization', label: 'Utilization Analysis', icon: TrendingUp },
              { id: 'workflow', label: 'Active Workflows', icon: Activity },
              { id: 'audit', label: 'Audit Trail', icon: Shield },
              { id: 'config', label: 'Configuration', icon: Settings }
            ].map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setActiveView(id as any)}
                className={`flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                  activeView === id
                    ? 'text-blue-700 bg-blue-100'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <Icon size={16} />
                {label}
                {id === 'workflow' && activeWorkflows.length > 0 && (
                  <span className="ml-1 bg-blue-600 text-white text-xs px-2 py-0.5 rounded-full">
                    {activeWorkflows.length}
                  </span>
                )}
              </button>
            ))}
          </nav>
        </div>

        {/* Active Workflows View */}
        {activeView === 'workflow' && (
          <div className="space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <div className="bg-white rounded-lg shadow p-4">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                  <span className="text-sm font-medium text-gray-600">Initiated</span>
                </div>
                <p className="text-2xl font-bold text-blue-600">
                  {activeWorkflows.filter(w => w.status === 'INITIATED').length}
                </p>
              </div>
              <div className="bg-white rounded-lg shadow p-4">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                  <span className="text-sm font-medium text-gray-600">In Progress</span>
                </div>
                <p className="text-2xl font-bold text-green-600">
                  {activeWorkflows.filter(w => w.status === 'IN_PROGRESS').length}
                </p>
              </div>
              <div className="bg-white rounded-lg shadow p-4">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-yellow-400 rounded-full"></div>
                  <span className="text-sm font-medium text-gray-600">Awaiting Parts</span>
                </div>
                <p className="text-2xl font-bold text-yellow-600">
                  {activeWorkflows.filter(w => w.status === 'AWAITING_PARTS').length}
                </p>
              </div>
              <div className="bg-white rounded-lg shadow p-4">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-purple-400 rounded-full"></div>
                  <span className="text-sm font-medium text-gray-600">Inspection</span>
                </div>
                <p className="text-2xl font-bold text-purple-600">
                  {activeWorkflows.filter(w => w.status === 'INSPECTION').length}
                </p>
              </div>
              <div className="bg-white rounded-lg shadow p-4">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-red-400 rounded-full"></div>
                  <span className="text-sm font-medium text-gray-600">Delayed</span>
                </div>
                <p className="text-2xl font-bold text-red-600">
                  {activeWorkflows.filter(w => w.status === 'DELAYED').length}
                </p>
              </div>
            </div>

            {/* Active Workflows List */}
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <Activity className="text-blue-600" size={24} />
                  <h2 className="text-xl font-semibold">Active Maintenance Workflows</h2>
                </div>
                <div className="text-sm text-gray-600">
                  {activeWorkflows.length} workflows active
                </div>
              </div>

              <div className="space-y-6">
                {activeWorkflows.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    <Activity size={48} className="mx-auto mb-4 text-gray-300" />
                    <p>No active maintenance workflows.</p>
                    <p className="text-sm">Approve AI recommendations to create new workflows.</p>
                  </div>
                ) : (
                  activeWorkflows.map((workflow) => (
                    <div
                      key={workflow.id}
                      className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="text-lg font-semibold text-gray-900">
                              {workflow.tailNumber} - {workflow.maintenanceType}
                            </h3>
                            <span className={`px-3 py-1 rounded-full text-sm font-medium border ${getWorkflowStatusColor(workflow.status)}`}>
                              {workflow.status.replace('_', ' ')}
                            </span>
                          </div>
                          
                          {/* Progress Bar */}
                          <div className="mb-4">
                            <div className="flex items-center justify-between text-sm text-gray-600 mb-1">
                              <span>Progress</span>
                              <span>{workflow.progress.tasksCompleted}/{workflow.progress.totalTasks} tasks completed</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div 
                                className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
                                style={{ width: `${(workflow.progress.tasksCompleted / workflow.progress.totalTasks) * 100}%` }}
                              ></div>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
                            <div>
                              <p className="text-sm font-medium text-gray-600 mb-1">Current Task</p>
                              <p className="text-sm text-gray-900">{workflow.progress.currentTask}</p>
                            </div>
                            <div>
                              <p className="text-sm font-medium text-gray-600 mb-1">Next Milestone</p>
                              <p className="text-sm text-gray-900">{workflow.progress.nextMilestone}</p>
                            </div>
                            <div>
                              <p className="text-sm font-medium text-gray-600 mb-1">Estimated Completion</p>
                              <p className="text-sm text-gray-900">{formatRelativeTime(workflow.timeline.estimatedCompletion)}</p>
                            </div>
                          </div>

                          {/* Team Assignments */}
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                            <div className="flex items-center gap-2 text-sm">
                              <Users size={16} className="text-gray-400" />
                              <span className="text-gray-600">Mechanic:</span>
                              <span className="font-medium">{workflow.assignments.mechanic}</span>
                            </div>
                            {workflow.assignments.inspector && (
                              <div className="flex items-center gap-2 text-sm">
                                <Shield size={16} className="text-gray-400" />
                                <span className="text-gray-600">Inspector:</span>
                                <span className="font-medium">{workflow.assignments.inspector}</span>
                              </div>
                            )}
                            <div className="flex items-center gap-2 text-sm">
                              <Users size={16} className="text-gray-400" />
                              <span className="text-gray-600">Supervisor:</span>
                              <span className="font-medium">{workflow.assignments.supervisor}</span>
                            </div>
                          </div>

                          {/* Resources */}
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                              <p className="text-sm font-medium text-gray-600 mb-1">Location</p>
                              <div className="flex items-center gap-1 text-sm text-gray-900">
                                <MapPin size={14} />
                                {workflow.resources.hangar}
                              </div>
                            </div>
                            <div>
                              <p className="text-sm font-medium text-gray-600 mb-1">Equipment</p>
                              <p className="text-sm text-gray-900">{workflow.resources.equipment.join(', ')}</p>
                            </div>
                            <div>
                              <p className="text-sm font-medium text-gray-600 mb-1">Parts Required</p>
                              <p className="text-sm text-gray-900">{workflow.resources.parts.join(', ')}</p>
                            </div>
                          </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex flex-col gap-2 ml-4">
                          <button className="flex items-center gap-2 px-3 py-1 border border-gray-300 rounded text-sm hover:bg-gray-50">
                            <Eye size={14} />
                            View Details
                          </button>
                          {workflow.status === 'DELAYED' && (
                            <button className="flex items-center gap-2 px-3 py-1 bg-yellow-600 text-white rounded text-sm hover:bg-yellow-700">
                              <Bell size={14} />
                              Escalate
                            </button>
                          )}
                          {workflow.status === 'AWAITING_PARTS' && (
                            <button className="flex items-center gap-2 px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700">
                              <Play size={14} />
                              Resume
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Timeline */}
                      <div className="bg-gray-50 rounded-lg p-3">
                        <div className="flex items-center justify-between text-xs text-gray-600 mb-2">
                          <div>
                            <span className="font-medium">Started:</span> {formatRelativeTime(workflow.timeline.started)}
                          </div>
                          <div>
                            <span className="font-medium">Last update:</span> {formatRelativeTime(workflow.notifications.lastSent)}
                          </div>
                          <div>
                            <span className="font-medium">Next reminder:</span> {formatRelativeTime(workflow.notifications.nextReminder)}
                          </div>
                        </div>
                        
                        {/* Email Notification Status */}
                        <div className="flex items-center justify-between text-xs border-t border-gray-200 pt-2">
                          <div className="flex items-center gap-1">
                            <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                            <span className="text-green-600 font-medium">Email Notifications Sent</span>
                          </div>
                          <div className="text-gray-500">
                            All team members notified • {formatRelativeTime(workflow.notifications.lastSent)}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* AI Recommendations View */}
        {activeView === 'recommendations' && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <Brain className="text-blue-600" size={24} />
                  <h2 className="text-xl font-semibold">AI-Generated Maintenance Recommendations</h2>
                </div>
                <div className="flex items-center gap-4 text-sm text-gray-600">
                  <span className="flex items-center gap-1">
                    <div className="w-2 h-2 bg-yellow-400 rounded-full"></div>
                    {aiRecommendations.filter(r => r.status === 'PENDING').length} Pending
                  </span>
                  <span className="flex items-center gap-1">
                    <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                    {aiRecommendations.filter(r => r.status === 'APPROVED').length} Approved
                  </span>
                  <span className="flex items-center gap-1">
                    <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                    {aiRecommendations.filter(r => ['SCHEDULED', 'IN_PROGRESS'].includes(r.status)).length} Active
                  </span>
                </div>
              </div>

              <div className="space-y-4">
                {aiRecommendations.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    <Brain size={48} className="mx-auto mb-4 text-gray-300" />
                    <p>No AI recommendations available.</p>
                    <p className="text-sm">Click "Generate New Recommendations" to get started.</p>
                  </div>
                ) : (
                  aiRecommendations.map((recommendation) => (
                    <div
                      key={recommendation.id}
                      className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="text-lg font-semibold text-gray-900">
                              {recommendation.tailNumber} - {recommendation.maintenanceType}
                            </h3>
                            <span className={`px-2 py-1 rounded text-xs font-medium border ${getUrgencyColor(recommendation.urgency)}`}>
                              {recommendation.urgency}
                            </span>
                            <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(recommendation.status)}`}>
                              {recommendation.status}
                            </span>
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                            <div className="flex items-center gap-2 text-sm text-gray-600">
                              <Calendar size={16} />
                              <span>Recommended: {new Date(recommendation.recommendedDate).toLocaleDateString()}</span>
                            </div>
                            <div className="flex items-center gap-2 text-sm text-gray-600">
                              <Clock size={16} />
                              <span>Downtime: {recommendation.estimatedDowntime}h</span>
                            </div>
                            <div className="flex items-center gap-2 text-sm text-gray-600">
                              <span className="text-green-600">💰</span>
                              <span>Cost: ${recommendation.estimatedCost.toLocaleString()}</span>
                            </div>
                          </div>

                          <div className="mb-4">
                            <div className="flex items-center gap-2 mb-2">
                              <Brain size={16} className="text-blue-600" />
                              <span className="text-sm font-medium">AI Confidence: {(recommendation.aiConfidence * 100).toFixed(1)}%</span>
                              <div className="flex-1 bg-gray-200 rounded-full h-2">
                                <div 
                                  className="bg-blue-600 h-2 rounded-full" 
                                  style={{ width: `${recommendation.aiConfidence * 100}%` }}
                                ></div>
                              </div>
                            </div>
                            
                            <div className="text-sm text-gray-600 space-y-1">
                              <p className="font-medium">AI Reasoning:</p>
                              <ul className="list-disc list-inside space-y-1 text-xs">
                                {recommendation.reasoning.map((reason, index) => (
                                  <li key={index}>{reason}</li>
                                ))}
                              </ul>
                            </div>
                          </div>

                          <div className="flex items-center gap-4 text-sm text-gray-600 mb-4">
                            <div className="flex items-center gap-1">
                              <Users size={16} />
                              <span>Personnel: {recommendation.requiredPersonnel.join(', ')}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <MapPin size={16} />
                              <span>Assets: {recommendation.affectedAssets.join(', ')}</span>
                            </div>
                          </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex flex-col gap-2 ml-4">
                          {recommendation.status === 'PENDING' && (
                            <>
                              <button
                                onClick={() => approveRecommendation(recommendation.id)}
                                disabled={approvalInProgress === recommendation.id}
                                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors text-sm font-medium"
                              >
                                {approvalInProgress === recommendation.id ? (
                                  <Loader2 className="animate-spin" size={16} />
                                ) : (
                                  <Check size={16} />
                                )}
                                {approvalInProgress === recommendation.id ? 'Approving...' : 'Approve & Execute'}
                              </button>
                              <button
                                onClick={() => rejectRecommendation(recommendation.id)}
                                className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium"
                              >
                                <X size={16} />
                                Reject
                              </button>
                            </>
                          )}
                          
                          {recommendation.status === 'APPROVED' && (
                            <div className="flex flex-col gap-2">
                              <div className="flex items-center gap-2 text-green-600 text-sm font-medium">
                                <CheckCircle2 size={16} />
                                Workflow Active
                              </div>
                              <button
                                onClick={() => setSelectedRecommendation(recommendation.id)}
                                className="flex items-center gap-2 px-3 py-1 border border-gray-300 rounded text-sm hover:bg-gray-50"
                              >
                                <Eye size={14} />
                                View Progress
                              </button>
                            </div>
                          )}

                          {recommendation.status === 'REJECTED' && (
                            <div className="flex items-center gap-2 text-red-600 text-sm">
                              <XCircle size={16} />
                              Rejected
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Time Window Display */}
                      <div className="bg-gray-50 rounded-lg p-3">
                        <p className="text-sm font-medium text-gray-700 mb-2">Scheduling Window:</p>
                        <div className="grid grid-cols-3 gap-4 text-xs text-gray-600">
                          <div>
                            <span className="font-medium">Earliest:</span>
                            <br />
                            {new Date(recommendation.timeWindow.earliest).toLocaleDateString()}
                          </div>
                          <div>
                            <span className="font-medium">Optimal:</span>
                            <br />
                            <span className="font-semibold text-blue-600">
                              {new Date(recommendation.timeWindow.optimal).toLocaleDateString()}
                            </span>
                          </div>
                          <div>
                            <span className="font-medium">Latest:</span>
                            <br />
                            {new Date(recommendation.timeWindow.latest).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* Audit Trail View */}
        {activeView === 'audit' && (
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center gap-2 mb-6">
              <Shield className="text-blue-600" size={24} />
              <h2 className="text-xl font-semibold">Audit Trail & Compliance</h2>
            </div>

            <div className="space-y-3 max-h-96 overflow-y-auto">
              {auditTrail.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <FileText size={48} className="mx-auto mb-4 text-gray-300" />
                  <p>No audit entries available.</p>
                </div>
              ) : (
                auditTrail.map((entry) => (
                  <div
                    key={entry.id}
                    className={`border-l-4 pl-4 py-2 ${
                      entry.complianceRelevant ? 'border-blue-500 bg-blue-50' : 'border-gray-300 bg-gray-50'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`px-2 py-1 rounded text-xs font-medium ${
                            entry.actorType === 'AI' ? 'bg-purple-100 text-purple-800' :
                            entry.actorType === 'SYSTEM' ? 'bg-blue-100 text-blue-800' :
                            'bg-green-100 text-green-800'
                          }`}>
                            {entry.actorType}
                          </span>
                          <span className="text-sm font-medium text-gray-900">{entry.action}</span>
                          {entry.complianceRelevant && (
                            <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded text-xs font-medium">
                              Compliance
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-600">{entry.details}</p>
                        <p className="text-xs text-gray-500 mt-1">
                          {entry.actor} • {new Date(entry.timestamp).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Utilization Analysis View */}
        {activeView === 'utilization' && (
          <div className="space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-white rounded-lg shadow p-4">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="text-blue-600" size={20} />
                  <span className="text-sm font-medium text-gray-600">Fleet Utilization</span>
                </div>
                <p className="text-2xl font-bold text-blue-600">
                  {utilizationData.length > 0 ? 
                    Math.round(utilizationData.reduce((acc, data) => acc + (data.averageUtilization || 0), 0) / utilizationData.length) : 0}%
                </p>
                <p className="text-xs text-gray-500">Average across fleet</p>
              </div>
              
              <div className="bg-white rounded-lg shadow p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="text-green-600" size={20} />
                  <span className="text-sm font-medium text-gray-600">Flight Hours</span>
                </div>
                <p className="text-2xl font-bold text-green-600">
                  {utilizationData.reduce((acc, data) => acc + (data.currentFlightHours || 0), 0).toLocaleString()}
                </p>
                <p className="text-xs text-gray-500">Total this month</p>
              </div>
              
              <div className="bg-white rounded-lg shadow p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Activity className="text-orange-600" size={20} />
                  <span className="text-sm font-medium text-gray-600">Peak Efficiency</span>
                </div>
                <p className="text-2xl font-bold text-orange-600">
                  {utilizationData.length > 0 ? 
                    Math.max(...utilizationData.map(d => d.averageUtilization || 0)) : 0}%
                </p>
                <p className="text-xs text-gray-500">Highest aircraft</p>
              </div>
              
              <div className="bg-white rounded-lg shadow p-4">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="text-yellow-600" size={20} />
                  <span className="text-sm font-medium text-gray-600">Low Utilization</span>
                </div>
                <p className="text-2xl font-bold text-yellow-600">
                  {utilizationData.filter(d => (d.averageUtilization || 0) < 60).length}
                </p>
                <p className="text-xs text-gray-500">Aircraft below 60%</p>
              </div>
            </div>

            {/* Detailed Utilization Analysis */}
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center gap-2 mb-6">
                <TrendingUp className="text-blue-600" size={24} />
                <h2 className="text-xl font-semibold">Aircraft Utilization Analysis</h2>
              </div>

              <div className="space-y-6">
                {utilizationData.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    <TrendingUp size={48} className="mx-auto mb-4 text-gray-300" />
                    <p>Loading utilization data...</p>
                  </div>
                ) : (
                  utilizationData.map((aircraft) => (
                    <div key={aircraft.aircraftId} className="border border-gray-200 rounded-lg p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900 mb-1">
                            {aircraft.tailNumber || 'Unknown Aircraft'}
                          </h3>
                          <p className="text-sm text-gray-600">
                            {aircraft.aircraftType || 'Unknown Type'} • Total Hours: {(aircraft.totalFlightHours || 0).toLocaleString()}
                          </p>
                        </div>
                        
                        <div className="text-right">
                          <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                            (aircraft.averageUtilization || 0) >= 80 ? 'bg-green-100 text-green-800' :
                            (aircraft.averageUtilization || 0) >= 60 ? 'bg-yellow-100 text-yellow-800' :
                            'bg-red-100 text-red-800'
                          }`}>
                            {aircraft.averageUtilization || 0}% Utilization
                          </div>
                          <p className="text-xs text-gray-500 mt-1">
                            {aircraft.currentFlightHours || 0}h this month
                          </p>
                        </div>
                      </div>

                      {/* Utilization Progress Bar */}
                      <div className="mb-4">
                        <div className="flex items-center justify-between text-sm text-gray-600 mb-1">
                          <span>Monthly Utilization</span>
                          <span>{aircraft.averageUtilization || 0}% of target</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-3">
                          <div 
                            className={`h-3 rounded-full transition-all duration-300 ${
                              (aircraft.averageUtilization || 0) >= 80 ? 'bg-green-500' :
                              (aircraft.averageUtilization || 0) >= 60 ? 'bg-yellow-500' :
                              'bg-red-500'
                            }`}
                            style={{ width: `${Math.min(aircraft.averageUtilization || 0, 100)}%` }}
                          ></div>
                        </div>
                      </div>

                      {/* Key Metrics Grid */}
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                        <div className="bg-gray-50 rounded-lg p-3">
                          <p className="text-sm font-medium text-gray-600 mb-1">Average Daily</p>
                          <p className="text-lg font-bold text-gray-900">
                            {((aircraft.currentFlightHours || 0) / 30).toFixed(1)}h
                          </p>
                        </div>
                        
                        <div className="bg-gray-50 rounded-lg p-3">
                          <p className="text-sm font-medium text-gray-600 mb-1">Peak Period</p>
                          <p className="text-lg font-bold text-gray-900">
                            {aircraft.peakPeriods && aircraft.peakPeriods.length > 0 ? 
                              new Date(aircraft.peakPeriods[0].start).toLocaleDateString() : 'N/A'}
                          </p>
                        </div>
                        
                        <div className="bg-gray-50 rounded-lg p-3">
                          <p className="text-sm font-medium text-gray-600 mb-1">Efficiency Score</p>
                          <p className="text-lg font-bold text-gray-900">
                            {Math.round((aircraft.averageUtilization || 0) * 0.8 + ((aircraft.currentFlightHours || 0) / 100) * 0.2)}%
                          </p>
                        </div>
                        
                        <div className="bg-gray-50 rounded-lg p-3">
                          <p className="text-sm font-medium text-gray-600 mb-1">Projected Hours</p>
                          <p className="text-lg font-bold text-gray-900">
                            {Math.round((aircraft.currentFlightHours || 0) * 1.2).toLocaleString()}
                          </p>
                        </div>
                      </div>

                      {/* Peak and Low Periods */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <h4 className="text-sm font-medium text-gray-700 mb-2">Peak Utilization Periods</h4>
                          <div className="space-y-2">
                            {aircraft.peakPeriods && aircraft.peakPeriods.length > 0 ? (
                              aircraft.peakPeriods.slice(0, 2).map((period, index) => (
                                <div key={index} className="flex items-center justify-between bg-green-50 p-2 rounded">
                                  <span className="text-sm text-green-800">
                                    {new Date(period.start).toLocaleDateString()} - {new Date(period.end).toLocaleDateString()}
                                  </span>
                                  <span className="text-sm font-medium text-green-600">
                                    {period.averageDaily || 0}h/day
                                  </span>
                                </div>
                              ))
                            ) : (
                              <p className="text-sm text-gray-500">No peak periods identified</p>
                            )}
                          </div>
                        </div>
                        
                        <div>
                          <h4 className="text-sm font-medium text-gray-700 mb-2">Low Utilization Periods</h4>
                          <div className="space-y-2">
                            {aircraft.lowPeriods && aircraft.lowPeriods.length > 0 ? (
                              aircraft.lowPeriods.slice(0, 2).map((period, index) => (
                                <div key={index} className="flex items-center justify-between bg-yellow-50 p-2 rounded">
                                  <span className="text-sm text-yellow-800">
                                    {new Date(period.start).toLocaleDateString()} - {new Date(period.end).toLocaleDateString()}
                                  </span>
                                  <span className="text-sm font-medium text-yellow-600">
                                    {period.averageDaily || 0}h/day
                                  </span>
                                </div>
                              ))
                            ) : (
                              <p className="text-sm text-gray-500">No low utilization periods</p>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Recommendations */}
                      <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                        <h4 className="text-sm font-medium text-blue-800 mb-2">Optimization Recommendations</h4>
                        <ul className="text-sm text-blue-700 space-y-1">
                          {(aircraft.averageUtilization || 0) < 60 && (
                            <li>• Consider increasing flight frequency or route optimization</li>
                          )}
                          {(aircraft.averageUtilization || 0) > 90 && (
                            <li>• High utilization - monitor for maintenance scheduling conflicts</li>
                          )}
                          {aircraft.peakPeriods && aircraft.peakPeriods.length > 0 && (
                            <li>• Schedule maintenance during low utilization periods</li>
                          )}
                          <li>• Target utilization: 70-85% for optimal efficiency</li>
                        </ul>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* Existing views (schedule, config, etc.) */}
        {activeView === 'schedule' && optimizedSchedule && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Optimized Maintenance Schedule</h2>
            {/* Schedule table implementation */}
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Aircraft</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Maintenance Type</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Scheduled Date</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Duration</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cost</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Priority</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {optimizedSchedule.schedule.map((item: any) => (
                    <tr key={item.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {item.tailNumber}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {item.maintenanceType}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {item.scheduledDate.toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {item.estimatedDuration}h
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        ${item.estimatedCost.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          item.priority === 'CRITICAL' ? 'bg-red-100 text-red-800' :
                          item.priority === 'HIGH' ? 'bg-orange-100 text-orange-800' :
                          item.priority === 'MEDIUM' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-green-100 text-green-800'
                        }`}>
                          {item.priority}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Configuration View */}
        {activeView === 'config' && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">AI Optimization Configuration</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {Object.entries(optimizationConfig).map(([key, value]) => (
                <div key={key} className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700 capitalize">
                    {key.replace(/([A-Z])/g, ' $1').toLowerCase()}
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.1"
                    value={value}
                    onChange={(e) => setOptimizationConfig(prev => ({ ...prev, [key]: parseFloat(e.target.value) }))}
                    className="w-full"
                  />
                  <div className="flex justify-between text-sm text-gray-500">
                    <span>0%</span>
                    <span className="font-medium">{Math.round(value * 100)}%</span>
                    <span>100%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
} 