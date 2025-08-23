import React, { createContext, useContext, useState, useEffect } from 'react';

interface InquiryCounts {
  new: number;
  contacted: number;
  total_new: number;
  unread_new: number;
  unread_contacted: number;
  unread_total: number;
  converted: number;
  closed: number;
  total: number;
}

interface NotificationContextType {
  inquiryCounts: InquiryCounts;
  loading: boolean;
  lastUpdated: Date | null;
  refreshCounts: () => void;
  markInquiryAsRead: (inquiryId: number) => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within NotificationProvider');
  }
  return context;
};

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [inquiryCounts, setInquiryCounts] = useState<InquiryCounts>({
    new: 0,
    contacted: 0,
    total_new: 0,
    unread_new: 0,
    unread_contacted: 0,
    unread_total: 0,
    converted: 0,
    closed: 0,
    total: 0
  });
  const [loading, setLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [isUserActive, setIsUserActive] = useState(true);
  const [isPageVisible, setIsPageVisible] = useState(true);

  const fetchInquiryCounts = async () => {
    // Only fetch if user is active and page is visible
    if (!isUserActive || !isPageVisible) {
      console.log('🔍 NotificationContext: Skipping fetch - user inactive or page hidden');
      return;
    }

    try {
      setLoading(true);
      
      // Get token from localStorage
      const token = localStorage.getItem('access_token');
      
      console.log('🔍 NotificationContext: Checking for token...', token ? 'Token found' : 'No token');
      
      if (!token) {
        console.log('❌ No auth token found, skipping inquiry count fetch');
        return;
      }

      const apiUrl = process.env.REACT_APP_API_BASE_URL || 'http://localhost:8000/api';
      const fullUrl = `${apiUrl}/v1/inquiries/counts/`;
      
      console.log('🔍 NotificationContext: Fetching from URL:', fullUrl);
      
      const response = await fetch(fullUrl, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      
      console.log('🔍 NotificationContext: Response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        setInquiryCounts(data);
        setLastUpdated(new Date());
        console.log('✅ Inquiry counts updated:', data);
        console.log('🔍 Badge should show unread_new:', data.unread_new);
      } else {
        const errorText = await response.text();
        console.error('❌ Failed to fetch inquiry counts:', response.status, errorText);
      }
    } catch (error) {
      console.error('❌ Error fetching inquiry counts:', error);
    } finally {
      setLoading(false);
    }
  };

  // User activity detection
  useEffect(() => {
    let activityTimeout: NodeJS.Timeout;

    const resetActivityTimer = () => {
      setIsUserActive(true);
      clearTimeout(activityTimeout);
      
      // Set user as inactive after 5 minutes of no activity
      activityTimeout = setTimeout(() => {
        setIsUserActive(false);
        console.log('🔍 NotificationContext: User marked as inactive');
      }, 5 * 60 * 1000); // 5 minutes
    };

    // Page visibility detection
    const handleVisibilityChange = () => {
      setIsPageVisible(!document.hidden);
      console.log('🔍 NotificationContext: Page visibility changed:', !document.hidden);
      
      if (!document.hidden) {
        // Page became visible, fetch counts immediately
        fetchInquiryCounts();
      }
    };

    // Activity events
    const activityEvents = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
    
    activityEvents.forEach(event => {
      document.addEventListener(event, resetActivityTimer, true);
    });

    // Page visibility events
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Initial activity setup
    resetActivityTimer();

    // Cleanup
    return () => {
      activityEvents.forEach(event => {
        document.removeEventListener(event, resetActivityTimer, true);
      });
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      clearTimeout(activityTimeout);
    };
  }, []);

  // Fetch counts on mount and every 30 minutes when user is active
  useEffect(() => {
    fetchInquiryCounts(); // Initial fetch
    
    const interval = setInterval(() => {
      if (isUserActive && isPageVisible) {
        console.log('🔍 NotificationContext: 30-minute interval - fetching counts');
        fetchInquiryCounts();
      } else {
        console.log('🔍 NotificationContext: 30-minute interval - skipping fetch (user inactive or page hidden)');
      }
    }, 30 * 60 * 1000); // 30 minutes
    
    return () => clearInterval(interval);
  }, [isUserActive, isPageVisible]);

  const refreshCounts = () => {
    fetchInquiryCounts();
  };

  const markInquiryAsRead = async (inquiryId: number) => {
    try {
      const token = localStorage.getItem('access_token');
      if (!token) return;

      const apiUrl = process.env.REACT_APP_API_BASE_URL || 'http://localhost:8000/api';
      await fetch(`${apiUrl}/v1/inquiries/${inquiryId}/mark_as_read/`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      
      // Refresh counts after marking as read
      fetchInquiryCounts();
    } catch (error) {
      console.error('Error marking inquiry as read:', error);
    }
  };

  return (
    <NotificationContext.Provider value={{
      inquiryCounts,
      loading,
      lastUpdated,
      refreshCounts,
      markInquiryAsRead
    }}>
      {children}
    </NotificationContext.Provider>
  );
};
