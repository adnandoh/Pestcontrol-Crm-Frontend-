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

  const fetchInquiryCounts = async () => {
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

  // Fetch counts on mount and every 30 seconds for testing (30000 ms)
  useEffect(() => {
    fetchInquiryCounts(); // Initial fetch
    
    const interval = setInterval(fetchInquiryCounts, 30000); // 30 seconds for testing
    
    return () => clearInterval(interval);
  }, []);

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
