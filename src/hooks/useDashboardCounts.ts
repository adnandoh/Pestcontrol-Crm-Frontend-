import { useState, useEffect, useCallback } from 'react';
import { enhancedApiService } from '../services/api.enhanced';
import type { DashboardCounts } from '../types';
import { useAuth } from './useAuth';
import { isBlogUser } from '../utils/roles';

export const useDashboardCounts = () => {
  const { user } = useAuth();
  const [counts, setCounts] = useState<DashboardCounts>({
    website_leads_unread: 0,
    crm_inquiries_unread: 0,
    complaint_calls: 0,
    reminders: 0,
    feedbacks: 0,
    pending_quotations: 0,
  });
  const [loading, setLoading] = useState(false);

  const fetchCounts = useCallback(async () => {
    if (isBlogUser(user)) return;
    try {
      setLoading(true);
      const data = await enhancedApiService.getDashboardCounts();
      setCounts(data);
    } catch (error) {
      console.error('Error fetching dashboard counts:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchCounts();
  }, [fetchCounts]);

  return { counts, loading, refreshCounts: fetchCounts };
};
