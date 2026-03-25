import React, { Suspense, lazy } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './hooks/useAuth'

// Layouts
import DashboardLayout from './layouts/DashboardLayout'
import AuthLayout from './layouts/AuthLayout'

// Lazy load pages for performance
const Login = lazy(() => import('./pages/Auth/Login'))
const Register = lazy(() => import('./pages/Auth/Register'))
const Dashboard = lazy(() => import('./pages/Dashboard/Dashboard'))
const Scans = lazy(() => import('./pages/Scans/Scans'))
const ScanDetail = lazy(() => import('./pages/Scans/ScanDetail'))
const NewScan = lazy(() => import('./pages/Scans/NewScan'))
const Targets = lazy(() => import('./pages/Targets/Targets'))
const TargetDetail = lazy(() => import('./pages/Targets/TargetDetail'))
const WordPress = lazy(() => import('./pages/WordPress/WordPress'))
const NetworkMap = lazy(() => import('./pages/Network/NetworkMap'))
const Reports = lazy(() => import('./pages/Reports/Reports'))
const Settings = lazy(() => import('./pages/Settings/Settings'))
const Profile = lazy(() => import('./pages/Profile/Profile'))
const Notifications = lazy(() => import('./pages/Notifications/Notifications'))

// Loading component
const PageLoader = () => (
  <div className="flex items-center justify-center h-screen">
    <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
  </div>
)

// Protected Route wrapper
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated } = useAuth()
  return isAuthenticated ? children : <Navigate to="/login" replace />
}

function App() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        {/* Public Routes */}
        <Route element={<AuthLayout />}>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
        </Route>

        {/* Protected Routes */}
        <Route element={
          <ProtectedRoute>
            <DashboardLayout />
          </ProtectedRoute>
        }>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/scans" element={<Scans />} />
          <Route path="/scans/new" element={<NewScan />} />
          <Route path="/scans/:id" element={<ScanDetail />} />
          <Route path="/targets" element={<Targets />} />
          <Route path="/targets/:id" element={<TargetDetail />} />
          <Route path="/wordpress" element={<WordPress />} />
          <Route path="/network" element={<NetworkMap />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/notifications" element={<Notifications />} />
        </Route>

        {/* Catch all */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  )
}

export default App
