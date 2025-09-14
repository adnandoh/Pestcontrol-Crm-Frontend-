import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

// Simplified interface for inquiry counts
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
  // Use static values for inquiry counts instead of fetching from API
  const [inquiryCounts] = useState<InquiryCounts>({
    new: 0,
    contacted: 0,
    total_new: 0,
    unread_new: 0, // This is used for the notification badge
    unread_contacted: 0,
    unread_total: 0,
    converted: 0,
    closed: 0,
    total: 0
  });

  // Simplified markInquiryAsRead function that only makes the API call
  // without refreshing counts (since we're not using the counts API anymore)
  const markInquiryAsRead = useCallback(async (inquiryId: number) => {
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
      
      console.log('✅ Inquiry marked as read:', inquiryId);
    } catch (error) {
      console.error('Error marking inquiry as read:', error);
    }
  }, []);

  return (
    <NotificationContext.Provider value={{
      inquiryCounts,
      markInquiryAsRead
    }}>
      {children}
    </NotificationContext.Provider>
  );
};
