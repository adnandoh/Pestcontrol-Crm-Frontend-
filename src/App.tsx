import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from './hooks/useAuth';
import { useEffect } from 'react';
import { enhancedApiService } from './services/api.enhanced';
import { Layout } from './components/layout';
import { FullScreenLoading } from './components/ui';
import BlogCMSLayout from './components/layout/BlogCMSLayout';
import { ProtectedRoute, SuperAdminRoute, AdminRoute } from './components/auth';
import StaffFormPage from './pages/StaffFormPage';
import { isBlogUser, blogUserDefaultPath } from './utils/roles';
import Login from './pages/Login';
import Forbidden from './pages/Forbidden';
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
import PartnerReferrals from './pages/PartnerReferrals';
import Feedbacks from './pages/Feedbacks';
import Quotations from './pages/Quotations';
import Invoices from './pages/Invoices';
import PendingAmounts from './pages/PendingAmounts';
import CreateQuotation from './pages/CreateQuotation';
import QuotationPreview from './pages/QuotationPreview';
import TechnicianReports from './pages/TechnicianReports';
import StaffPerformance from './pages/StaffPerformance';
import TechnicianSelfies from './pages/TechnicianSelfies';
import PublicFeedback from './pages/PublicFeedback';
import StaffManagement from './pages/StaffManagement';
import ActivityLogs from './pages/ActivityLogs';
import PartnerAppVersion from './pages/PartnerAppVersion';
import MasterCountries from './pages/MasterCountries';
import MasterCities from './pages/MasterCities';
import MasterStates from './pages/MasterStates';
import MasterLocations from './pages/MasterLocations';
import PricingMaster from './pages/PricingMaster';
import BlogDashboard from './pages/blog/BlogDashboard';
import BlogList from './pages/blog/BlogList';
import BlogEditor from './pages/blog/BlogEditor';
import BlogCategories from './pages/blog/BlogCategories';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

const BlogCMSRoutes: React.FC = () => (
  <Routes>
    <Route path="/blog" element={<BlogDashboard />} />
    <Route path="/blog/list" element={<BlogList />} />
    <Route path="/blog/create" element={<BlogEditor />} />
    <Route path="/blog/edit/:id" element={<BlogEditor />} />
    <Route path="/blog/categories" element={<BlogCategories />} />
    <Route path="/403" element={<Forbidden />} />
    <Route path="*" element={<Navigate to={blogUserDefaultPath()} replace />} />
  </Routes>
);

const AppContent: React.FC = () => {
  const { user, logout, isLoading } = useAuth();
  const blogOnly = isBlogUser(user);

  useEffect(() => {
    const pingBackend = async () => {
      if (document.visibilityState !== 'visible') return;
      try {
        await enhancedApiService.healthCheck();
      } catch {
        /* ignore */
      }
    };
    pingBackend();
    const interval = setInterval(pingBackend, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  if (isLoading) {
    return <FullScreenLoading text="Loading session…" />;
  }

  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/feedback/:id/:token" element={<PublicFeedback />} />

        {blogOnly ? (
          <Route
            path="/*"
            element={
              <ProtectedRoute>
                <BlogCMSLayout user={user} onLogout={logout}>
                  <BlogCMSRoutes />
                </BlogCMSLayout>
              </ProtectedRoute>
            }
          />
        ) : (
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
                    <Route path="/partner-referrals" element={<PartnerReferrals />} />
                    <Route path="/quotations" element={<Quotations />} />
                    <Route path="/invoices" element={<Invoices />} />
                    <Route path="/pending-amounts" element={<PendingAmounts />} />
                    <Route path="/quotations/create" element={<CreateQuotation />} />
                    <Route path="/quotations/edit/:id" element={<CreateQuotation />} />
                    <Route path="/quotations/preview/:id" element={<QuotationPreview />} />
                    <Route path="/feedbacks" element={<Feedbacks />} />
                    <Route path="/technician-reports" element={<TechnicianReports />} />
                    <Route path="/technician-selfies" element={<TechnicianSelfies />} />
                    <Route path="/staff-performance" element={<StaffPerformance />} />
                    <Route
                      path="/staff"
                      element={
                        <SuperAdminRoute>
                          <StaffManagement />
                        </SuperAdminRoute>
                      }
                    />
                    <Route
                      path="/staff/add"
                      element={
                        <SuperAdminRoute>
                          <StaffFormPage />
                        </SuperAdminRoute>
                      }
                    />
                    <Route
                      path="/staff/edit/:id"
                      element={
                        <SuperAdminRoute>
                          <StaffFormPage />
                        </SuperAdminRoute>
                      }
                    />
                    <Route
                      path="/activity-logs"
                      element={
                        <SuperAdminRoute>
                          <ActivityLogs />
                        </SuperAdminRoute>
                      }
                    />
                    <Route
                      path="/partner-app-version"
                      element={
                        <SuperAdminRoute>
                          <PartnerAppVersion />
                        </SuperAdminRoute>
                      }
                    />
                    <Route path="/master/countries" element={<MasterCountries />} />
                    <Route path="/master/states" element={<MasterStates />} />
                    <Route path="/master/cities" element={<MasterCities />} />
                    <Route path="/master/locations" element={<MasterLocations />} />
                    <Route
                      path="/pricing-master"
                      element={
                        <AdminRoute>
                          <PricingMaster />
                        </AdminRoute>
                      }
                    />
                    <Route path="/blog" element={<BlogDashboard />} />
                    <Route path="/blog/list" element={<BlogList />} />
                    <Route path="/blog/create" element={<BlogEditor />} />
                    <Route path="/blog/edit/:id" element={<BlogEditor />} />
                    <Route path="/blog/categories" element={<BlogCategories />} />
                    <Route path="/403" element={<Forbidden />} />
                  </Routes>
                </Layout>
              </ProtectedRoute>
            }
          />
        )}
      </Routes>
    </Router>
  );
};

const App: React.FC = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
