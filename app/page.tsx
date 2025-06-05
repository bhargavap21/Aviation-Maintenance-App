'use client';

import React, { Suspense, useState, useEffect } from 'react';
import { 
  Plane, 
  Wrench, 
  AlertTriangle, 
  Calendar, 
  TrendingUp,
  Clock,
  DollarSign,
  CheckCircle,
  Map,
  Mic,
  Radio,
  Brain
} from 'lucide-react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import VoiceAssistant from '@/components/VoiceAssistant';
import { AircraftPosition, FlightData } from '@/types';

// Dynamic import for FlightMap to fix SSR issues with Leaflet
const FlightMap = dynamic(() => import('@/components/FlightMap'), { 
  ssr: false,
  loading: () => <div className="h-96 bg-gray-100 rounded-lg flex items-center justify-center">Loading map...</div>
});

// Mock data for demonstration
const mockMetrics = {
  totalAircraft: 3,
  activeWorkOrders: 2,
  overdueItems: 1,
  avgTurnaroundTime: 18.5,
  compliancePercentage: 95,
  monthlyMaintenanceCost: 125000,
  aircraftAvailability: 67,
  upcomingInspections: [
    {
      id: '1',
      aircraftId: 'n123ab',
      description: 'A-Check (1A) - Basic airframe and systems',
      nextDueAt: new Date('2024-02-15'),
      priority: 'HIGH'
    },
    {
      id: '2', 
      aircraftId: 'n789xy',
      description: '100-Hour Inspection - Part 135 compliance',
      nextDueAt: new Date('2024-02-20'),
      priority: 'MEDIUM'
    },
    {
      id: '3',
      aircraftId: 'n123ab',
      description: '2A Check - Progressive detailed (1000 hrs)',
      nextDueAt: new Date('2024-04-01'),
      priority: 'HIGH'
    },
    {
      id: '4',
      aircraftId: 'n456cd',
      description: 'C-Check (1C) - Comprehensive inspection',
      nextDueAt: new Date('2024-02-01'),
      priority: 'HIGH'
    },
    {
      id: '5',
      aircraftId: 'n123ab',
      description: 'Annual Inspection - FAA mandated',
      nextDueAt: new Date('2024-03-01'),
      priority: 'HIGH'
    }
  ]
};

const mockAlerts = [
  {
    id: '1',
    type: 'overdue',
    message: 'N456CD - 100-Hour inspection overdue by 25 hours - AOG',
    priority: 'critical',
    timestamp: new Date('2024-01-25T10:30:00')
  },
  {
    id: '2',
    type: 'due_soon',
    message: 'N123AB - A-Check (1A) due in 50 flight hours',
    priority: 'high',
    timestamp: new Date('2024-01-28T09:15:00')
  },
  {
    id: '3',
    type: 'due_soon',
    message: 'N789XY - 100-Hour inspection due in 25 flight hours',
    priority: 'medium',
    timestamp: new Date('2024-01-28T08:45:00')
  },
  {
    id: '4',
    type: 'parts_needed',
    message: 'WO-20240125-001 - Waiting for brake pads (ETA: 2 days)',
    priority: 'medium',
    timestamp: new Date('2024-01-27T14:20:00')
  },
  {
    id: '5',
    type: 'bundling_opportunity',
    message: 'N123AB - Bundle A-Check (1A), 2A-Check, and 100-Hour for efficiency',
    priority: 'medium',
    timestamp: new Date('2024-01-28T11:00:00')
  },
  {
    id: '6',
    type: 'due_soon',
    message: 'N456CD - C-Check (1C) due in 2 days (Feb 1, 2024)',
    priority: 'high',
    timestamp: new Date('2024-01-30T08:00:00')
  },
  {
    id: '7',
    type: 'progressive_due',
    message: 'N789XY - Progressive inspection due in 60 days',
    priority: 'low',
    timestamp: new Date('2024-01-28T14:30:00')
  }
];

function MetricCard({ 
  title, 
  value, 
  icon: Icon, 
  trend, 
  color = 'blue' 
}: {
  title: string;
  value: string | number;
  icon: any;
  trend?: string;
  color?: 'blue' | 'green' | 'yellow' | 'red';
}) {
  const colorClasses = {
    blue: 'bg-blue-50 text-blue-700',
    green: 'bg-green-50 text-green-700',
    yellow: 'bg-yellow-50 text-yellow-700',
    red: 'bg-red-50 text-red-700'
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
          {trend && (
            <p className="text-sm text-gray-500 mt-1">{trend}</p>
          )}
        </div>
        <div className={`p-3 rounded-full ${colorClasses[color]}`}>
          <Icon className="h-6 w-6" />
        </div>
      </div>
    </div>
  );
}

function AlertCard({ alert }: { alert: any }) {
  const priorityColors = {
    critical: 'border-red-200 bg-red-50',
    high: 'border-orange-200 bg-orange-50',
    medium: 'border-yellow-200 bg-yellow-50',
    low: 'border-blue-200 bg-blue-50'
  };

  const priorityTextColors = {
    critical: 'text-red-800',
    high: 'text-orange-800',
    medium: 'text-yellow-800',
    low: 'text-blue-800'
  };

  return (
    <div className={`border-l-4 p-4 ${priorityColors[alert.priority as keyof typeof priorityColors]}`}>
      <div className="flex items-start">
        <AlertTriangle className={`h-5 w-5 mt-0.5 mr-3 ${priorityTextColors[alert.priority as keyof typeof priorityTextColors]}`} />
        <div className="flex-1">
          <p className={`text-sm font-medium ${priorityTextColors[alert.priority as keyof typeof priorityTextColors]}`}>
            {alert.message}
          </p>
          <p className="text-xs text-gray-500 mt-1">
            {alert.timestamp.toLocaleString()}
          </p>
        </div>
      </div>
    </div>
  );
}

function QuickActionButton({ 
  href, 
  icon: Icon, 
  title, 
  description 
}: {
  href: string;
  icon: any;
  title: string;
  description: string;
}) {
  return (
    <Link href={href} className="group">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
        <div className="flex items-center space-x-4">
          <div className="p-3 bg-blue-50 rounded-lg group-hover:bg-blue-100 transition-colors">
            <Icon className="h-6 w-6 text-blue-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
            <p className="text-sm text-gray-600">{description}</p>
          </div>
        </div>
      </div>
    </Link>
  );
}

export default function Dashboard() {
  const [isVoiceAssistantOpen, setIsVoiceAssistantOpen] = useState(false);
  const [fleetPositions, setFleetPositions] = useState<AircraftPosition[]>([]);
  const [selectedAircraft, setSelectedAircraft] = useState<string>('');
  const [flightDataLoading, setFlightDataLoading] = useState(true);
  const [lastUpdateTime, setLastUpdateTime] = useState<Date>(new Date());

  // Fetch fleet positions on component mount and set up polling
  useEffect(() => {
    const fetchFleetPositions = async () => {
      try {
        setFlightDataLoading(true);
        const response = await fetch('/api/flight-data?action=fleet-positions&tailNumbers=N123AB,N456CD,N789XY');
        const data = await response.json();
        
        if (data.success) {
          setFleetPositions(data.data);
          setLastUpdateTime(new Date());
        }
      } catch (error) {
        console.error('Failed to fetch fleet positions:', error);
      } finally {
        setFlightDataLoading(false);
      }
    };

    // Initial fetch
    fetchFleetPositions();

    // Set up polling every 30 seconds
    const interval = setInterval(fetchFleetPositions, 30000);

    return () => clearInterval(interval);
  }, []);

  // Calculate real-time availability based on flight positions
  const calculateRealTimeAvailability = () => {
    const availableAircraft = fleetPositions.filter(pos => 
      pos.isOnGround && (pos.flightPhase === 'PARKED' || pos.flightPhase === 'PREFLIGHT')
    ).length;
    
    return {
      available: availableAircraft,
      total: fleetPositions.length || mockMetrics.totalAircraft,
      percentage: fleetPositions.length > 0 ? Math.round((availableAircraft / fleetPositions.length) * 100) : mockMetrics.aircraftAvailability
    };
  };

  const availability = calculateRealTimeAvailability();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Maintenance Dashboard</h1>
              <p className="text-sm text-gray-500">Part 135 Operations • Gulfstream G550 Fleet</p>
            </div>
            
            <div className="flex items-center gap-4">
              {/* Primary Navigation */}
              <nav className="hidden md:flex items-center gap-2">
                <Link 
                  href="/" 
                  className="px-4 py-2 text-blue-600 bg-blue-50 rounded-lg font-medium border border-blue-200"
                >
                  Dashboard
                </Link>
                <Link 
                  href="/schedule" 
                  className="px-4 py-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg font-medium transition-colors"
                >
                  AI Schedule
                </Link>
              </nav>
              
              {/* Flight Data Status */}
              <div className="flex items-center gap-2 text-sm">
                <div className={`w-2 h-2 rounded-full ${flightDataLoading ? 'bg-yellow-400' : 'bg-green-400'}`}></div>
                <span className="text-gray-600">
                  Flight Data {flightDataLoading ? 'Updating...' : `Updated ${lastUpdateTime.toLocaleTimeString()}`}
                </span>
              </div>
              
              {/* Voice Assistant Button */}
              <button
                onClick={() => setIsVoiceAssistantOpen(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
              >
                <Mic size={20} />
                Voice Assistant
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Welcome Back</h2>
          <p className="text-gray-600">
            Here&apos;s your fleet status and maintenance overview for today.
          </p>
        </div>

        {/* Real-time Fleet Map */}
        <div className="mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Map className="text-blue-600" size={24} />
                <h3 className="text-lg font-semibold">Real-time Fleet Positions</h3>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <Radio size={16} />
                <span>Live ADS-B Data</span>
              </div>
            </div>
            
            <FlightMap
              aircraftPositions={fleetPositions}
              selectedAircraft={selectedAircraft}
              onAircraftSelect={setSelectedAircraft}
              height="400px"
            />
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <MetricCard
            title="Aircraft Available"
            value={`${availability.available}/${availability.total}`}
            icon={Plane}
            trend={`${availability.percentage}% availability`}
            color="green"
          />
          <MetricCard
            title="Active Work Orders"
            value={mockMetrics.activeWorkOrders}
            icon={Wrench}
            trend="2 due today"
            color="blue"
          />
          <MetricCard
            title="Critical Items"
            value={mockMetrics.overdueItems}
            icon={AlertTriangle}
            trend="Immediate attention required"
            color="red"
          />
          <MetricCard
            title="Compliance Rate"
            value={`${mockMetrics.compliancePercentage}%`}
            icon={CheckCircle}
            trend="Within Part 135 requirements"
            color="green"
          />
        </div>

        {/* Flight Status Summary */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Live Flight Status */}
          <div className="bg-white rounded-lg shadow">
            <div className="p-6 border-b">
              <h3 className="text-lg font-semibold text-gray-900">Live Flight Status</h3>
            </div>
            <div className="p-6">
              {fleetPositions.length > 0 ? (
                <div className="space-y-4">
                  {fleetPositions.map((position) => (
                    <div 
                      key={position.tailNumber}
                      className={`p-4 rounded-lg border cursor-pointer transition-colors ${
                        selectedAircraft === position.tailNumber ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
                      }`}
                      onClick={() => setSelectedAircraft(position.tailNumber)}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="font-semibold">{position.tailNumber}</div>
                        <div className={`px-2 py-1 rounded text-xs font-medium ${
                          position.isOnGround ? 'bg-gray-100 text-gray-700' : 'bg-blue-100 text-blue-700'
                        }`}>
                          {position.flightPhase.replace('_', ' ')}
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4 text-sm text-gray-600">
                        <div>
                          <span className="text-gray-500">Position:</span> {position.latitude.toFixed(2)}°, {position.longitude.toFixed(2)}°
                        </div>
                        <div>
                          <span className="text-gray-500">Altitude:</span> {position.altitude === 0 ? 'Ground' : `${Math.round(position.altitude/1000)}k ft`}
                        </div>
                        <div>
                          <span className="text-gray-500">Speed:</span> {position.groundSpeed} kts
                        </div>
                        <div>
                          <span className="text-gray-500">Updated:</span> {new Date(position.lastSeen).toLocaleTimeString()}
                        </div>
                      </div>
                      
                      {position.airport && (
                        <div className="mt-2 text-sm">
                          <span className="text-gray-500">Airport:</span> <span className="font-medium">{position.airport}</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  {flightDataLoading ? 'Loading flight data...' : 'No flight data available'}
                </div>
              )}
            </div>
          </div>

          {/* Priority Alerts */}
          <div className="bg-white rounded-lg shadow">
            <div className="p-6 border-b">
              <h3 className="text-lg font-semibold text-gray-900">Priority Alerts</h3>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                {mockAlerts.map((alert) => (
                  <div
                    key={alert.id}
                    className={`p-4 rounded-lg border-l-4 ${
                      alert.priority === 'critical'
                        ? 'border-red-500 bg-red-50'
                        : alert.priority === 'high'
                        ? 'border-orange-500 bg-orange-50'
                        : 'border-yellow-500 bg-yellow-50'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-medium text-gray-900">{alert.message}</p>
                        <p className="text-sm text-gray-500 mt-1">
                          {alert.timestamp.toLocaleString()}
                        </p>
                      </div>
                      <span
                        className={`px-2 py-1 rounded text-xs font-medium ${
                          alert.priority === 'critical'
                            ? 'bg-red-100 text-red-800'
                            : alert.priority === 'high'
                            ? 'bg-orange-100 text-orange-800'
                            : 'bg-yellow-100 text-yellow-800'
                        }`}
                      >
                        {alert.priority.toUpperCase()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions & Additional Metrics */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Quick Actions */}
          <div className="bg-white rounded-lg shadow">
            <div className="p-6 border-b">
              <h3 className="text-lg font-semibold text-gray-900">Quick Actions</h3>
              <p className="text-sm text-gray-500 mt-1">Navigate to key system functions</p>
            </div>

            <div className="p-6 space-y-4">
              {/* Featured AI-Powered Maintenance Schedule Button */}
              <Link href="/schedule" className="group block">
                <div className="bg-gradient-to-r from-blue-50 to-purple-50 border-2 border-blue-200 rounded-lg p-6 hover:from-blue-100 hover:to-purple-100 hover:border-blue-300 transition-all duration-200 shadow-sm">
                  <div className="flex items-center space-x-4">
                    <div className="p-3 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg group-hover:from-blue-700 group-hover:to-purple-700 transition-colors">
                      <Brain className="h-6 w-6 text-white" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-lg font-semibold text-gray-900">AI-Powered Maintenance Schedule</h3>
                        <span className="bg-blue-100 text-blue-700 text-xs px-2 py-1 rounded-full font-medium">Featured</span>
                      </div>
                      <p className="text-sm text-gray-600">Smart scheduling with automated workflows and recommendations</p>
                      <div className="flex items-center gap-4 mt-2 text-xs text-blue-600">
                        <span>• AI Recommendations</span>
                        <span>• Automated Workflows</span>
                        <span>• Email Notifications</span>
                      </div>
                    </div>
                  </div>
                </div>
              </Link>
              
              {/* Note: Additional features available in full system */}
              <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-600 text-center">
                  <strong>Demo System:</strong> This prototype showcases the core AI-powered maintenance scheduling system.
                  <br />Additional modules (Aircraft Management, Work Orders, Compliance) available in full implementation.
                </p>
              </div>
            </div>
          </div>

          {/* Additional Metrics */}
          <div className="space-y-6">
            <MetricCard
              title="Avg Turnaround Time"
              value={`${mockMetrics.avgTurnaroundTime}h`}
              icon={Clock}
              trend="2.5h faster than last month"
              color="green"
            />
            <MetricCard
              title="Monthly Maintenance Cost"
              value={`$${(mockMetrics.monthlyMaintenanceCost / 1000).toFixed(0)}K`}
              icon={DollarSign}
              trend="12% under budget"
              color="green"
            />
            <MetricCard
              title="Fleet Utilization"
              value="3.8h/day"
              icon={TrendingUp}
              trend="Optimal for Part 135"
              color="blue"
            />
          </div>
        </div>
      </main>

      {/* Voice Assistant Modal */}
      <VoiceAssistant 
        isOpen={isVoiceAssistantOpen}
        onClose={() => setIsVoiceAssistantOpen(false)}
      />
    </div>
  );
} 