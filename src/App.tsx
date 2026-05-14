  import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from './hooks/useAuth';
import { useEffect } from 'react';
import { enhancedApiService } from './services/api.enhanced';
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
import Quotations from './pages/Quotations';
import CreateQuotation from './pages/CreateQuotation';
import QuotationPreview from './pages/QuotationPreview';
import TechnicianReports from './pages/TechnicianReports';
import StaffPerformance from './pages/StaffPerformance';
import PublicFeedback from './pages/PublicFeedback';
import StaffManagement from './pages/StaffManagement';
import ActivityLogs from './pages/ActivityLogs';
import MasterCities from './pages/MasterCities';
import MasterStates from './pages/MasterStates';
import MasterLocations from './pages/MasterLocations';

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



  useEffect(() => {
    const pingBackend = async () => {
      // Only ping if the tab is visible to save resources
      if (document.visibilityState !== 'visible') return;
      
      try {
        await enhancedApiService.healthCheck();
        console.log('💓 Backend keep-alive ping successful');
      } catch (error) {
        console.warn('⚠️ Backend keep-alive ping failed');
      }
    };

    // Ping once on mount
    pingBackend();

    // Then ping every 5 minutes (Railway sleeps after ~30 mins, but keeping it active)
    const interval = setInterval(pingBackend, 5 * 60 * 1000);
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
                  <Route path="/quotations" element={<Quotations />} />
                  <Route path="/quotations/create" element={<CreateQuotation />} />
                  <Route path="/quotations/edit/:id" element={<CreateQuotation />} />
                  <Route path="/quotations/preview/:id" element={<QuotationPreview />} />
                  <Route path="/feedbacks" element={<Feedbacks />} />
                  <Route path="/technician-reports" element={<TechnicianReports />} />
                  <Route path="/staff-performance" element={<StaffPerformance />} />
                  <Route path="/staff" element={<StaffManagement />} />
                  <Route path="/activity-logs" element={<ActivityLogs />} />
                  <Route path="/master/states" element={<MasterStates />} />
                  <Route path="/master/cities" element={<MasterCities />} />
                  <Route path="/master/locations" element={<MasterLocations />} />
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