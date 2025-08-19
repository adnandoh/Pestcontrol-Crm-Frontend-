import React, { useEffect, useState } from 'react';
import {
  Typography,
  Box,
  CircularProgress,
  Card,
  CardContent,
  Avatar,
  useTheme,
  alpha,
} from '@mui/material';
import {
  Assignment as JobCardIcon,
  Refresh as RenewalIcon,
  ContactMail as InquiryIcon,
  People as ClientIcon,
  TrendingUp as TrendingIcon,
  Schedule as ScheduleIcon,
  CheckCircle as CompletedIcon,
  Warning as WarningIcon,
} from '@mui/icons-material';
import { jobCardService, renewalService, inquiryService } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

const Dashboard: React.FC = () => {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState({
    totalJobCards: 0,
    pendingRenewals: 0,
    newInquiries: 0,
    totalClients: 0,
    completedJobs: 0,
    totalRevenue: 0,
  });
  const theme = useTheme();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDashboardData = async () => {
      // Don't fetch if not authenticated
      if (!isAuthenticated) {
        return;
      }

      try {
        setIsLoading(true);
        setError(null);
        const [jobCardsResponse, renewalsResponse, inquiriesResponse] = await Promise.all([
          jobCardService.getJobCards(),
          renewalService.getRenewals({ upcoming: true }),
          inquiryService.getInquiries({ status: 'New' }),
        ]);

        setStats({
          totalJobCards: jobCardsResponse.count,
          pendingRenewals: renewalsResponse.count,
          newInquiries: inquiriesResponse.count,
          totalClients: 0, // You can add client service call here
          completedJobs: jobCardsResponse.results.filter(job => job.status === 'Done').length,
          totalRevenue: jobCardsResponse.results
            .filter(job => job.payment_status === 'Paid')
            .reduce((sum, job) => sum + Number(job.grand_total), 0),
        });
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
        setError('Failed to load dashboard data. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };

    // Only fetch dashboard data when authenticated
    if (isAuthenticated && !authLoading) {
      fetchDashboardData();
    }
  }, [isAuthenticated, authLoading]);

  // Show loading state while authentication is being checked
  if (authLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  // Don't render the component if not authenticated
  if (!isAuthenticated) {
    return null;
  }

  const StatCard = ({ 
    title, 
    value, 
    icon, 
    color, 
    subtitle,
    trend,
    trendValue 
  }: { 
    title: string; 
    value: number | string; 
    icon: React.ReactNode; 
    color: string;
    subtitle?: string;
    trend?: 'up' | 'down' | 'neutral';
    trendValue?: string;
  }) => (
    <Card
      elevation={0}
      sx={{
        height: '100%',
        borderRadius: 0,
        border: '1px solid #e0e0e0',
        background: '#ffffff',
        transition: 'all 0.2s ease',
        '&:hover': {
          boxShadow: '0 2px 6px rgba(0,0,0,0.06)',
        },
      }}
    >
      <CardContent sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
          <Box sx={{ flex: 1 }}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1, fontSize: '0.875rem' }}>
              {title}
            </Typography>
            <Typography variant="h3" component="div" sx={{ fontWeight: 700, color: '#333', fontSize: '2.5rem', mb: 1 }}>
              {value}
            </Typography>
            {subtitle && (
              <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.8rem' }}>
                {subtitle}
              </Typography>
            )}
          </Box>
          <Box sx={{ 
            width: 48, 
            height: 48, 
            borderRadius: 0,
            bgcolor: color,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white'
          }}>
            {icon}
          </Box>
        </Box>
        
        {trend && (
          <Box sx={{ display: 'flex', alignItems: 'center', mt: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              {trend === 'up' ? <TrendingIcon sx={{ fontSize: '1rem', color: '#4caf50' }} /> : 
               trend === 'down' ? <WarningIcon sx={{ fontSize: '1rem', color: '#f44336' }} /> : 
               <ScheduleIcon sx={{ fontSize: '1rem', color: '#2196f3' }} />}
              <Typography variant="body2" sx={{ 
                color: trend === 'up' ? '#4caf50' : trend === 'down' ? '#f44336' : '#2196f3',
                fontWeight: 500,
                fontSize: '0.8rem'
              }}>
                {trendValue || 'This month'}
              </Typography>
            </Box>
          </Box>
        )}
      </CardContent>
    </Card>
  );

  const QuickActionCard = ({ 
    title, 
    description, 
    icon, 
    color, 
    onClick 
  }: { 
    title: string; 
    description: string; 
    icon: React.ReactNode; 
    color: string;
    onClick: () => void;
  }) => (
    <Card
      elevation={0}
      onClick={onClick}
      sx={{
        height: '100%',
        borderRadius: 3,
        border: `1px solid ${alpha(color, 0.1)}`,
        background: `linear-gradient(135deg, ${alpha(color, 0.05)} 0%, ${alpha(color, 0.02)} 100%)`,
        cursor: 'pointer',
        transition: 'all 0.3s ease',
        '&:hover': {
          transform: 'translateY(-4px)',
          boxShadow: `0 6px 12px ${alpha(color, 0.08)}`,
          border: `1px solid ${alpha(color, 0.2)}`,
        },
      }}
    >
      <CardContent sx={{ p: 3, textAlign: 'center' }}>
        <Avatar
          sx={{
            width: 64,
            height: 64,
            bgcolor: alpha(color, 0.1),
            color: color,
            mx: 'auto',
            mb: 2,
            '& .MuiSvgIcon-root': {
              fontSize: '2rem',
            },
          }}
        >
          {icon}
        </Avatar>
        <Typography variant="h6" component="div" sx={{ fontWeight: 600, mb: 1 }}>
          {title}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {description}
        </Typography>
      </CardContent>
    </Card>
  );

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
        <CircularProgress size={60} />
      </Box>
    );
  }

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, maxWidth: '1400px', mx: 'auto' }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" component="h1" sx={{ fontWeight: 600, mb: 1, color: '#333' }}>
          Dashboard
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ fontSize: '1rem' }}>
          Welcome back! Here's what's happening with your pest control business today.
        </Typography>
      </Box>

      {/* Statistics Cards */}
      <Box sx={{ 
        display: 'grid', 
        gridTemplateColumns: { 
          xs: '1fr', 
          sm: '1fr 1fr', 
          md: '1fr 1fr 1fr', 
          lg: '1fr 1fr 1fr 1fr' 
        }, 
        gap: 3, 
        mb: 4 
      }}>
        <StatCard
          title="Total Job Cards"
          value={stats.totalJobCards}
          icon={<JobCardIcon />}
          color="#2196f3"
          subtitle="Active jobs"
          trend="up"
          trendValue="+12% this month"
        />
        <StatCard
          title="Completed Jobs"
          value={stats.completedJobs}
          icon={<CompletedIcon />}
          color="#4caf50"
          subtitle="Successfully delivered"
          trend="up"
          trendValue="+8% this month"
        />
        <StatCard
          title="Pending Renewals"
          value={stats.pendingRenewals}
          icon={<RenewalIcon />}
          color="#ff9800"
          subtitle="Due soon"
          trend="neutral"
          trendValue="On track"
        />
        <StatCard
          title="New Inquiries"
          value={stats.newInquiries}
          icon={<InquiryIcon />}
          color="#2196f3"
          subtitle="Potential clients"
          trend="up"
          trendValue="+15% this month"
        />
      </Box>

      {/* Revenue and Performance */}
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3, mb: 4 }}>
        <Box sx={{ flex: '1 1 400px', minWidth: '400px' }}>
          <Card
            elevation={0}
            sx={{
              height: '100%',
              borderRadius: 3,
              border: `1px solid ${alpha(theme.palette.secondary.main, 0.1)}`,
              background: `linear-gradient(135deg, ${alpha(theme.palette.secondary.main, 0.05)} 0%, ${alpha(theme.palette.secondary.main, 0.02)} 100%)`,
            }}
          >
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  Total Revenue
                </Typography>
                <Avatar
                  sx={{
                    width: 48,
                    height: 48,
                    bgcolor: alpha(theme.palette.secondary.main, 0.1),
                    color: theme.palette.secondary.main,
                  }}
                >
                  <TrendingIcon />
                </Avatar>
              </Box>
              <Typography variant="h3" sx={{ fontWeight: 700, color: theme.palette.secondary.main, mb: 1 }}>
                ₹{stats.totalRevenue.toLocaleString()}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                From completed and paid jobs
              </Typography>
            </CardContent>
          </Card>
        </Box>
        <Box sx={{ flex: '1 1 400px', minWidth: '400px' }}>
          <Card
            elevation={0}
            sx={{
              height: '100%',
              borderRadius: 3,
              border: `1px solid ${alpha(theme.palette.info.main, 0.1)}`,
              background: `linear-gradient(135deg, ${alpha(theme.palette.info.main, 0.05)} 0%, ${alpha(theme.palette.info.main, 0.02)} 100%)`,
            }}
          >
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  Completion Rate
                </Typography>
                <Avatar
                  sx={{
                    width: 48,
                    height: 48,
                    bgcolor: alpha(theme.palette.info.main, 0.1),
                    color: theme.palette.info.main,
                  }}
                >
                  <CompletedIcon />
                </Avatar>
              </Box>
              <Typography variant="h3" sx={{ fontWeight: 700, color: theme.palette.info.main, mb: 1 }}>
                {stats.totalJobCards > 0 ? Math.round((stats.completedJobs / stats.totalJobCards) * 100) : 0}%
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Jobs completed successfully
              </Typography>
            </CardContent>
          </Card>
        </Box>
      </Box>

      {/* Quick Actions */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h5" sx={{ fontWeight: 600, mb: 3 }}>
          Quick Actions
        </Typography>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
          <Box sx={{ flex: '1 1 250px', minWidth: '250px' }}>
            <QuickActionCard
              title="Create Job Card"
              description="Start a new service job"
              icon={<JobCardIcon />}
              color={theme.palette.primary.main}
              onClick={() => {/* Navigate to create job card */}}
            />
          </Box>
          <Box sx={{ flex: '1 1 250px', minWidth: '250px' }}>
            <QuickActionCard
              title="Add Client"
              description="Register new customer"
              icon={<ClientIcon />}
              color={theme.palette.secondary.main}
              onClick={() => {/* Navigate to add client */}}
            />
          </Box>
          <Box sx={{ flex: '1 1 250px', minWidth: '250px' }}>
            <QuickActionCard
              title="View Renewals"
              description="Check upcoming renewals"
              icon={<RenewalIcon />}
              color={theme.palette.warning.main}
              onClick={() => {/* Navigate to renewals */}}
            />
          </Box>
        </Box>
      </Box>

      {/* Recent Activity or Summary */}
      <Card
        elevation={0}
        sx={{
          borderRadius: 3,
          border: `1px solid ${alpha(theme.palette.grey[300], 0.5)}`,
        }}
      >
        <CardContent sx={{ p: 3 }}>
          <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
            Business Overview
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
            <Box sx={{ flex: '1 1 200px', minWidth: '200px', textAlign: 'center', p: 2 }}>
              <Typography variant="h4" sx={{ fontWeight: 700, color: theme.palette.primary.main }}>
                {stats.totalJobCards}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Total Jobs
              </Typography>
            </Box>
            <Box sx={{ flex: '1 1 200px', minWidth: '200px', textAlign: 'center', p: 2 }}>
              <Typography variant="h4" sx={{ fontWeight: 700, color: theme.palette.success.main }}>
                {stats.completedJobs}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Completed
              </Typography>
            </Box>
            <Box sx={{ flex: '1 1 200px', minWidth: '200px', textAlign: 'center', p: 2 }}>
              <Typography variant="h4" sx={{ fontWeight: 700, color: theme.palette.warning.main }}>
                {stats.pendingRenewals}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Renewals Due
              </Typography>
            </Box>
            <Box sx={{ flex: '1 1 200px', minWidth: '200px', textAlign: 'center', p: 2 }}>
              <Typography variant="h4" sx={{ fontWeight: 700, color: theme.palette.info.main }}>
                {stats.newInquiries}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                New Inquiries
              </Typography>
            </Box>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
};

export default Dashboard;