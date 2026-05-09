  import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from './hooks/useAuth';
import { useEffect } from 'react';
import axios from 'axios';
import { Layout } from './components/layout';
import { ProtectedRoute } from './components/auth';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Clients from './pages/Clients';
import ClientDetail from './pages/ClientDetail';
import Inquiries from './pages/Inquiries';
import JobCards from './pages/JobCards';
import CreateJobCard from './pages/CreateJobCard';
import EditJobCard from './pages/EditJobCard';
import Renewals from './pages/Renewals';
import References from './pages/References';
import Technicians from './pages/Technicians';
import CRMInquiries from './pages/CRMInquiries';
import Feedbacks from './pages/Feedbacks';
import TechnicianReports from './pages/TechnicianReports';
import PublicFeedback from './pages/PublicFeedback';
import StaffManagement from './pages/StaffManagement';
import ActivityLogs from './pages/ActivityLogs';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});


const AppContent: React.FC = () => {
  const { user, logout } = useAuth();

  // Background ping to prevent Railway from sleeping (ISP/DNS issue mitigation)
  const baseUrl = (import.meta.env.PROD || import.meta.env.VITE_IS_RAILWAY) 
    ? 'https://api.vacationbna.site/api'
    : import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';

  useEffect(() => {
    const pingBackend = async () => {
      try {
        await axios.get(`${baseUrl}/v1/health/`);
        console.log('💓 Backend keep-alive ping successful');
      } catch (error) {
        console.warn('⚠️ Backend keep-alive ping failed (may be sleeping or network issue)');
      }
    };

    // Ping once on mount
    pingBackend();

    // Then ping every 4 minutes (Railway sleeps after ~5-10 mins of inactivity)
    const interval = setInterval(pingBackend, 4 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/feedback/:id/:token" element={<PublicFeedback />} />
        <Route
          path="/*"
          element={
            <ProtectedRoute>
              <Layout user={user ?? null} onLogout={logout}>
                <Routes>
                  <Route path="/" element={<Dashboard />} />
                  <Route path="/clients" element={<Clients />} />
                  <Route path="/clients/:id" element={<ClientDetail />} />
                  <Route path="/inquiries" element={<Inquiries />} />
                  <Route path="/jobcards" element={<JobCards />} />
                  <Route path="/jobcards/create" element={<CreateJobCard />} />
                  <Route path="/jobcards/edit/:id" element={<EditJobCard />} />
                  <Route path="/renewals" element={<Renewals />} />
                  <Route path="/references" element={<References />} />
                  <Route path="/technicians" element={<Technicians />} />
                  <Route path="/crm-inquiries" element={<CRMInquiries />} />
                  <Route path="/feedbacks" element={<Feedbacks />} />
                  <Route path="/technician-reports" element={<TechnicianReports />} />
                  <Route path="/staff" element={<StaffManagement />} />
                  <Route path="/activity-logs" element={<ActivityLogs />} />
                </Routes>
              </Layout>
            </ProtectedRoute>
          }
        />
      </Routes>
    </Router>
  );
};

const App: React.FC = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </QueryClientProvider>
  );
};

export default App;