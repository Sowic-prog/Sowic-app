import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Assets from './pages/Assets';
import Infrastructure from './pages/Infrastructure';
import Maintenance from './pages/Maintenance';

import MaintenancePlans from './pages/MaintenancePlans';
import WorkOrderDetail from './pages/WorkOrderDetail';
import ChecklistDetail from './pages/ChecklistDetail';
import Projects from './pages/Projects';
import Personnel from './pages/Personnel';
import Inventory from './pages/Inventory';
import Providers from './pages/Providers';
import Logistics from './pages/Logistics';
import Services from './pages/Services';
import CalendarPage from './pages/Calendar';
import Reports from './pages/Reports';
import { AuthProvider } from './src/context/AuthContext';
import ProtectedRoute from './src/components/ProtectedRoute';
import Login from './src/pages/Login';

const App: React.FC = () => {
  console.log("App Component Rendering...");
  return (
    <BrowserRouter>
      <AuthProvider>
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
      </AuthProvider>
    </BrowserRouter>
  );
};

export default App;
