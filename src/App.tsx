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
import SocietyJobCards from './pages/SocietyJobCards';
import Renewals from './pages/Renewals';
import References from './pages/References';

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
                  <Route path="/society-jobcards" element={<SocietyJobCards />} />
                  <Route path="/renewals" element={<Renewals />} />
                  <Route path="/references" element={<References />} />
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