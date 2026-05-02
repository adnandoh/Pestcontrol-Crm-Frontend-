  import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from './hooks/useAuth';
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

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

import { useEffect } from 'react';
import axios from 'axios';
import { apiConfig, API_ENDPOINTS } from './config/api.config';

const AppContent: React.FC = () => {
  const { user, logout } = useAuth();

  // Background ping to prevent Railway from sleeping (ISP/DNS issue mitigation)
  useEffect(() => {
    const pingBackend = async () => {
      try {
        await axios.get(`${apiConfig.baseUrl}${API_ENDPOINTS.HEALTH}`);
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