import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import Navbar from './components/Navbar';
import ErrorBoundary from './components/ErrorBoundary';

// Pages
import PortalSelect from './pages/PortalSelect';
import CitizenLanding from './pages/CitizenLanding';
import ReportFlow from './pages/ReportFlow';
import CitizenEvidenceForm from './pages/CitizenEvidenceForm';
import MyReports from './pages/MyReports';
import TicketDetail from './pages/TicketDetail';
import Notifications from './pages/Notifications';
import Login from './pages/Login';

import OfficerDashboard from './pages/OfficerDashboard';
import OfficerComplaints from './pages/OfficerComplaints';
import OfficerComplaintDetail from './pages/OfficerComplaintDetail';
import OfficerReports from './pages/OfficerReports';
import OfficerWorkers from './pages/OfficerWorkers';
import OfficerSettings from './pages/OfficerSettings';
import OfficerTelemetry from './pages/OfficerTelemetry';

import WorkerDashboard from './pages/WorkerDashboard';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <div className="min-h-screen bg-[#070D18] flex flex-col font-sans selection:bg-sky-500 selection:text-white">
          <Navbar />
          <main className="flex-1">
            <ErrorBoundary>
              <Routes>
                {/* Root / First Screen: Dedicated Role Portal Selection (Section 2) */}
                <Route path="/" element={<PortalSelect />} />

                {/* Citizen Routes */}
                <Route path="/citizen" element={<CitizenLanding />} />
                <Route path="/citizen/report" element={<ReportFlow />} />
                <Route path="/citizen/submit-evidence" element={<CitizenEvidenceForm />} />
                <Route path="/citizen/my-reports" element={<MyReports />} />
                <Route path="/citizen/ticket/:id" element={<TicketDetail />} />
                <Route path="/citizen/notifications" element={<Notifications />} />
                <Route path="/citizen/login" element={<Login />} />

                {/* Officer / Admin Routes */}
                <Route path="/admin" element={<Navigate to="/admin/dashboard" replace />} />
                <Route path="/officer" element={<Navigate to="/admin/dashboard" replace />} />
                <Route path="/admin/login" element={<Login />} />
                <Route path="/officer/login" element={<Login />} />
                <Route path="/admin/dashboard" element={<OfficerDashboard />} />
                <Route path="/officer/dashboard" element={<OfficerDashboard />} />
                <Route path="/admin/complaints" element={<OfficerComplaints />} />
                <Route path="/officer/complaints" element={<OfficerComplaints />} />
                <Route path="/admin/complaint/:id" element={<OfficerComplaintDetail />} />
                <Route path="/officer/complaint/:id" element={<OfficerComplaintDetail />} />
                <Route path="/admin/reports" element={<OfficerReports />} />
                <Route path="/officer/reports" element={<OfficerReports />} />
                <Route path="/admin/workers" element={<OfficerWorkers />} />
                <Route path="/officer/workers" element={<OfficerWorkers />} />
                <Route path="/admin/settings" element={<OfficerSettings />} />
                <Route path="/officer/settings" element={<OfficerSettings />} />
                <Route path="/admin/telemetry" element={<OfficerTelemetry />} />
                <Route path="/officer/telemetry" element={<OfficerTelemetry />} />

                {/* Worker Routes */}
                <Route path="/worker" element={<Navigate to="/worker/dashboard" replace />} />
                <Route path="/worker/login" element={<Login />} />
                <Route path="/worker/dashboard" element={<WorkerDashboard />} />

                {/* Fallback */}
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </ErrorBoundary>
          </main>

          {/* Civic Operations Footer */}
          <footer className="border-t border-slate-800/80 bg-[#040810] py-6 px-4 text-center text-xs text-slate-500">
            <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
              <div className="flex items-center space-x-2">
                <span className="font-mono font-bold text-slate-400">URBANGRID</span>
                <span>&bull;</span>
                <span>Tamil Nadu Municipal Grievance Deduplication Engine</span>
              </div>
              <div className="flex items-center space-x-3 font-mono text-[11px] text-slate-400">
                <span>Active Radius: <strong className="text-sky-400">50m</strong></span>
                <span>&bull;</span>
                <span>PostGIS Geospatial Core</span>
                <span>&bull;</span>
                <span>Gemini Vision AI</span>
              </div>
            </div>
          </footer>
        </div>
      </AuthProvider>
    </BrowserRouter>
  );
}
