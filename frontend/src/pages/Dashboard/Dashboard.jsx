import React, { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { 
  ShieldCheckIcon, 
  ExclamationTriangleIcon, 
  GlobeAltIcon,
  ServerIcon,
  ClockIcon,
  ArrowTrendingUpIcon
} from '@heroicons/react/24/outline'
import { Line, Doughnut, Bar } from 'react-chartjs-2'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js'
import { format, subDays } from 'date-fns'
import { dashboardApi } from '../../services/api'
import StatCard from '../../components/Dashboard/StatCard'
import RecentScans from '../../components/Dashboard/RecentScans'
import ThreatMap from '../../components/Dashboard/ThreatMap'
import VulnerabilityChart from '../../components/Dashboard/VulnerabilityChart'

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
)

const Dashboard = () => {
  const [timeRange, setTimeRange] = useState('7d')
  
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['dashboard-stats', timeRange],
    queryFn: () => dashboardApi.getStats(timeRange),
  })

  const { data: recentScans } = useQuery({
    queryKey: ['recent-scans'],
    queryFn: () => dashboardApi.getRecentScans(10),
    refetchInterval: 30000, // Refresh every 30 seconds
  })

  const { data: threats } = useQuery({
    queryKey: ['threats'],
    queryFn: dashboardApi.getThreats,
  })

  // Chart data preparation
  const scanTrendData = {
    labels: stats?.trend?.map(t => format(new Date(t.date), 'MMM dd')) || [],
    datasets: [
      {
        label: 'Scans Completed',
        data: stats?.trend?.map(t => t.completed) || [],
        borderColor: 'rgb(59, 130, 246)',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        fill: true,
        tension: 0.4,
      },
      {
        label: 'Threats Detected',
        data: stats?.trend?.map(t => t.threats) || [],
        borderColor: 'rgb(239, 68, 68)',
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
        fill: true,
        tension: 0.4,
      }
    ]
  }

  const severityData = {
    labels: ['Critical', 'High', 'Medium', 'Low', 'Info'],
    datasets: [{
      data: [
        stats?.severity?.critical || 0,
        stats?.severity?.high || 0,
        stats?.severity?.medium || 0,
        stats?.severity?.low || 0,
        stats?.severity?.info || 0,
      ],
      backgroundColor: [
        'rgb(239, 68, 68)',   // Critical - Red
        'rgb(249, 115, 22)',  // High - Orange
        'rgb(234, 179, 8)',   // Medium - Yellow
        'rgb(59, 130, 246)',  // Low - Blue
        'rgb(107, 114, 128)', // Info - Gray
      ],
      borderWidth: 0,
    }]
  }

  const moduleUsageData = {
    labels: stats?.modules?.map(m => m.name) || [],
    datasets: [{
      label: 'Executions',
      data: stats?.modules?.map(m => m.count) || [],
      backgroundColor: 'rgba(59, 130, 246, 0.8)',
      borderRadius: 6,
    }]
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Security Dashboard
          </h1>
          <p className="text-gray-500 dark:text-gray-400">
            Real-time overview of your external attack surface
          </p>
        </div>
        
        <div className="flex items-center space-x-4">
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className="bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-blue-500"
          >
            <option value="24h">Last 24 Hours</option>
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
            <option value="90d">Last 90 Days</option>
          </select>
          
          <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
            Export Report
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Targets"
          value={stats?.totalTargets || 0}
          change={stats?.targetChange || 0}
          icon={GlobeAltIcon}
          color="blue"
          loading={statsLoading}
        />
        <StatCard
          title="Active Scans"
          value={stats?.activeScans || 0}
          change={stats?.scanChange || 0}
          icon={ServerIcon}
          color="green"
          loading={statsLoading}
        />
        <StatCard
          title="Critical Findings"
          value={stats?.criticalFindings || 0}
          change={stats?.criticalChange || 0}
          icon={ExclamationTriangleIcon}
          color="red"
          loading={statsLoading}
        />
        <StatCard
          title="Security Score"
          value={`${stats?.securityScore || 0}/100`}
          change={stats?.scoreChange || 0}
          icon={ShieldCheckIcon}
          color="purple"
          loading={statsLoading}
        />
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Scan Trends */}
        <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Scan Activity Trends
          </h3>
          <div className="h-80">
            <Line 
              data={scanTrendData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                interaction: {
                  mode: 'index',
                  intersect: false,
                },
                plugins: {
                  legend: {
                    position: 'top',
                  },
                },
                scales: {
                  y: {
                    beginAtZero: true,
                    grid: {
                      color: 'rgba(0, 0, 0, 0.05)',
                    },
                  },
                  x: {
                    grid: {
                      display: false,
                    },
                  },
                },
              }}
            />
          </div>
        </div>

        {/* Severity Distribution */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Findings by Severity
          </h3>
          <div className="h-64">
            <Doughnut
              data={severityData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: {
                    position: 'bottom',
                  },
                },
              }}
            />
          </div>
        </div>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Module Usage */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Module Usage
          </h3>
          <div className="h-64">
            <Bar
              data={moduleUsageData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: {
                    display: false,
                  },
                },
                scales: {
                  y: {
                    beginAtZero: true,
                  },
                },
              }}
            />
          </div>
        </div>

        {/* Geographic Threat Map */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Geographic Threat Distribution
          </h3>
          <ThreatMap data={threats?.geographic || []} />
        </div>
      </div>

      {/* Recent Scans & Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <RecentScans scans={recentScans || []} />
        </div>
        
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Quick Actions
          </h3>
          <div className="space-y-3">
            <QuickActionButton
              to="/scans/new"
              icon={ServerIcon}
              title="New Scan"
              description="Start a new OSINT scan"
              color="blue"
            />
            <QuickActionButton
              to="/targets/new"
              icon={GlobeAltIcon}
              title="Add Target"
              description="Add target for monitoring"
              color="green"
            />
            <QuickActionButton
              to="/wordpress"
              icon={ShieldCheckIcon}
              title="WordPress Scan"
              description="Specialized WP assessment"
              color="purple"
            />
            <QuickActionButton
              to="/reports"
              icon={ArrowTrendingUpIcon}
              title="Generate Report"
              description="Create compliance report"
              color="orange"
            />
          </div>
        </div>
      </div>
    </div>
  )
}

// Quick Action Button Component
const QuickActionButton = ({ to, icon: Icon, title, description, color }) => {
  const colors = {
    blue: 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400',
    green: 'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400',
    purple: 'bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400',
    orange: 'bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400',
  }

  return (
    <a
      href={to}
      className="flex items-center p-4 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-blue-500 dark:hover:border-blue-400 transition-colors group"
    >
      <div className={`p-3 rounded-lg ${colors[color]}`}>
        <Icon className="w-6 h-6" />
      </div>
      <div className="ml-4 flex-1">
        <h4 className="text-sm font-medium text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400">
          {title}
        </h4>
        <p className="text-xs text-gray-500 dark:text-gray-400">{description}</p>
      </div>
    </a>
  )
}

export default Dashboard
