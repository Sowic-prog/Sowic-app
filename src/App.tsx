import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
const Dashboard = React.lazy(() => import('./pages/Dashboard'));
const Assets = React.lazy(() => import('./pages/Assets'));
const Infrastructure = React.lazy(() => import('./pages/Infrastructure'));
const Maintenance = React.lazy(() => import('./pages/Maintenance'));
const MaintenancePlans = React.lazy(() => import('./pages/MaintenancePlans'));
const WorkOrderDetail = React.lazy(() => import('./pages/WorkOrderDetail'));
const ChecklistDetail = React.lazy(() => import('./pages/ChecklistDetail'));
const Projects = React.lazy(() => import('./pages/Projects'));
const Personnel = React.lazy(() => import('./pages/Personnel'));
const Inventory = React.lazy(() => import('./pages/Inventory'));
const Providers = React.lazy(() => import('./pages/Providers'));
const Logistics = React.lazy(() => import('./pages/Logistics'));
const Services = React.lazy(() => import('./pages/Services'));
const CalendarPage = React.lazy(() => import('./pages/Calendar'));
const Reports = React.lazy(() => import('./pages/Reports'));
const Login = React.lazy(() => import('./pages/Login'));

// Simple Loading Component for Suspense
const LoadingFallback = () => (
  <div className="flex items-center justify-center min-h-screen bg-slate-50">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
  </div>
);

const App: React.FC = () => {
  console.log("App Component Rendering...");
  return (
    <BrowserRouter>
      <AuthProvider>
        <React.Suspense fallback={<LoadingFallback />}>
          <Routes>
            {/* Public Routes */}
            <Route path="/login" element={<Login />} />

            {/* Private Routes (All Protected) */}
            <Route element={<ProtectedRoute />}>
              {/* Dashboard */}
              <Route path="/" element={
                <Layout>
                  <Dashboard />
                </Layout>
              } />

              {/* Modules */}
              <Route path="/assets" element={
                <Layout>
                  <Assets />
                </Layout>
              } />
              <Route path="/infrastructure" element={
                <Layout>
                  <Infrastructure />
                </Layout>
              } />
              <Route path="/maintenance" element={
                <Layout>
                  <Maintenance />
                </Layout>
              } />

              <Route path="/maintenance/plans" element={
                <Layout>
                  <MaintenancePlans />
                </Layout>
              } />
              <Route path="/maintenance/ot/:id" element={
                <Layout>
                  <WorkOrderDetail />
                </Layout>
              } />
              <Route path="/maintenance/checklist/:id" element={
                <Layout>
                  <ChecklistDetail />
                </Layout>
              } />
              <Route path="/reports" element={
                <Layout>
                  <Reports />
                </Layout>
              } />
              <Route path="/projects" element={
                <Layout>
                  <Projects />
                </Layout>
              } />
              <Route path="/personnel" element={
                <Layout>
                  <Personnel />
                </Layout>
              } />
              <Route path="/inventory" element={
                <Layout>
                  <Inventory />
                </Layout>
              } />
              <Route path="/providers" element={
                <Layout>
                  <Providers />
                </Layout>
              } />
              <Route path="/logistics" element={
                <Layout>
                  <Logistics />
                </Layout>
              } />
              <Route path="/services" element={
                <Layout>
                  <Services />
                </Layout>
              } />
              <Route path="/calendar" element={
                <Layout>
                  <CalendarPage />
                </Layout>
              } />
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </React.Suspense>
      </AuthProvider>
    </BrowserRouter>
  );
};

export default App;
