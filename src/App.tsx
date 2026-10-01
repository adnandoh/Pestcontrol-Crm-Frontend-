import React, { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider, QueryCache, MutationCache } from '@tanstack/react-query';
import { AuthProvider, useAuth } from './hooks/useAuth';
import { useEffect } from 'react';
import { enhancedApiService } from './services/api.enhanced';
import { Layout } from './components/layout';
import { FullScreenLoading, PageLoading } from './components/ui';
import { ToastProvider } from './components/ui/toast/ToastProvider';
import { ErrorBoundary, NotifyBridge } from './components/errors';
import { notify } from './utils/notify';
import { logErrorForDev } from './utils/errors';
import BlogCMSLayout from './components/layout/BlogCMSLayout';
import { ProtectedRoute, SuperAdminRoute, AdminRoute } from './components/auth';
import { isBlogUser, blogUserDefaultPath } from './utils/roles';
import Login from './pages/Login';
import Forbidden from './pages/Forbidden';
import Dashboard from './pages/Dashboard';
import PublicFeedback from './pages/PublicFeedback';

const StaffFormPage = lazy(() => import('./pages/StaffFormPage'));
const Clients = lazy(() => import('./pages/Clients'));
const ClientDetail = lazy(() => import('./pages/ClientDetail'));
const Inquiries = lazy(() => import('./pages/Inquiries'));
const JobCards = lazy(() => import('./pages/JobCards'));
const CreateJobCard = lazy(() => import('./pages/CreateJobCard'));
const EditJobCard = lazy(() => import('./pages/EditJobCard'));
const Renewals = lazy(() => import('./pages/Renewals'));
const References = lazy(() => import('./pages/References'));
const Technicians = lazy(() => import('./pages/Technicians'));
const TechnicianFormPage = lazy(() => import('./pages/TechnicianFormPage'));
const Settlements = lazy(() => import('./pages/Settlements'));
const CRMInquiries = lazy(() => import('./pages/CRMInquiries'));
const WhatsAppInbox = lazy(() => import('./pages/WhatsAppInbox'));
const Feedbacks = lazy(() => import('./pages/Feedbacks'));
const ECardTracking = lazy(() => import('./pages/ECardTracking'));
const Quotations = lazy(() => import('./pages/Quotations'));
const Invoices = lazy(() => import('./pages/Invoices'));
const PurchaseBills = lazy(() => import('./pages/PurchaseBills'));
const GstCaReport = lazy(() => import('./pages/GstCaReport'));
const PendingAmounts = lazy(() => import('./pages/PendingAmounts'));
const CreateQuotation = lazy(() => import('./pages/CreateQuotation'));
const QuotationPreview = lazy(() => import('./pages/QuotationPreview'));
const TechnicianReports = lazy(() => import('./pages/TechnicianReports'));
const TechnicianLedgerReport = lazy(() => import('./pages/TechnicianLedgerReport'));
const StaffPerformance = lazy(() => import('./pages/StaffPerformance'));
const TechnicianSelfies = lazy(() => import('./pages/TechnicianSelfies'));
const StaffManagement = lazy(() => import('./pages/StaffManagement'));
const ActivityLogs = lazy(() => import('./pages/ActivityLogs'));
const MasterCountries = lazy(() => import('./pages/MasterCountries'));
const MasterCities = lazy(() => import('./pages/MasterCities'));
const MasterStates = lazy(() => import('./pages/MasterStates'));
const MasterLocations = lazy(() => import('./pages/MasterLocations'));
const PricingMaster = lazy(() => import('./pages/PricingMaster'));
const AccountsDashboard = lazy(() => import('./pages/accounts/AccountsDashboard'));
const AccountsInventory = lazy(() => import('./pages/accounts/AccountsInventory'));
const AccountsExpenses = lazy(() => import('./pages/accounts/AccountsExpenses'));
const AccountsBookingProfit = lazy(() => import('./pages/accounts/AccountsBookingProfit'));
const AccountsAlerts = lazy(() => import('./pages/accounts/AccountsAlerts'));
const AccountsReports = lazy(() => import('./pages/accounts/AccountsReports'));
const BlogDashboard = lazy(() => import('./pages/blog/BlogDashboard'));
const BlogList = lazy(() => import('./pages/blog/BlogList'));
const BlogEditor = lazy(() => import('./pages/blog/BlogEditor'));
const BlogCategories = lazy(() => import('./pages/blog/BlogCategories'));

const queryClient = new QueryClient({
  queryCache: new QueryCache({
    onError: (error, query) => {
      logErrorForDev(`Query:${query.queryHash}`, error);
      if (query.meta?.silentError) return;
      notify.apiError(error, `Query:${String(query.queryKey[0] ?? 'unknown')}`);
    },
  }),
  mutationCache: new MutationCache({
    onError: (error, _vars, _ctx, mutation) => {
      logErrorForDev('Mutation', error);
      if (mutation.meta?.silentError) return;
      notify.apiError(error, 'Mutation');
    },
  }),
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
    mutations: {
      onError: (error) => {
        logErrorForDev('MutationDefault', error);
      },
    },
  },
});

const BlogCMSRoutes: React.FC = () => (
  <Suspense fallback={<PageLoading text="Loading..." />}>
  <Routes>
    <Route path="/blog" element={<BlogDashboard />} />
    <Route path="/blog/list" element={<BlogList />} />
    <Route path="/blog/create" element={<BlogEditor />} />
    <Route path="/blog/edit/:id" element={<BlogEditor />} />
    <Route path="/blog/categories" element={<BlogCategories />} />
    <Route path="/403" element={<Forbidden />} />
    <Route path="*" element={<Navigate to={blogUserDefaultPath()} replace />} />
  </Routes>
  </Suspense>
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
                  <Suspense fallback={<PageLoading text="Loading..." />}>
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
                    <Route path="/technicians/create" element={<TechnicianFormPage />} />
                    <Route path="/technicians/edit/:id" element={<TechnicianFormPage />} />
                    <Route path="/settlements" element={<Settlements />} />
                    <Route path="/accounts" element={<AccountsDashboard />} />
                    <Route path="/accounts/inventory" element={<AccountsInventory />} />
                    <Route path="/accounts/expenses" element={<AccountsExpenses />} />
                    <Route path="/accounts/booking-profit" element={<AccountsBookingProfit />} />
                    <Route path="/accounts/alerts" element={<AccountsAlerts />} />
                    <Route path="/accounts/reports" element={<AccountsReports />} />
                    <Route path="/crm-inquiries" element={<CRMInquiries />} />
                    <Route path="/whatsapp/inbox" element={<WhatsAppInbox />} />
                    <Route path="/quotations" element={<Quotations />} />
                    <Route path="/invoices" element={<Invoices />} />
                    <Route path="/purchase-bills" element={<PurchaseBills />} />
                    <Route path="/gst-ca-report" element={<GstCaReport />} />
                    <Route path="/pending-amounts" element={<PendingAmounts />} />
                    <Route path="/quotations/create" element={<CreateQuotation />} />
                    <Route path="/quotations/edit/:id" element={<CreateQuotation />} />
                    <Route path="/quotations/preview/:id" element={<QuotationPreview />} />
                    <Route path="/feedbacks" element={<Feedbacks />} />
                    <Route path="/e-card/tracking" element={<ECardTracking />} />
                    <Route path="/technician-reports" element={<TechnicianReports />} />
                    <Route path="/technician-daily-reports" element={<Navigate to="/technician-reports" replace />} />
                    <Route path="/technician-ledger" element={<TechnicianLedgerReport />} />
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
                  </Suspense>
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
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <NotifyBridge />
        <AuthProvider>
          <AppContent />
        </AuthProvider>
      </ToastProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
