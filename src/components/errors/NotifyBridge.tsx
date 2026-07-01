import React from 'react';
import { useToast } from '../../hooks/useToast';
import { registerNotifyHandlers } from '../../utils/notify';

/** Bridges the imperative notify() utility to the React toast context. */
export const NotifyBridge: React.FC = () => {
  const toast = useToast();

  React.useEffect(() => {
    registerNotifyHandlers({
      success: toast.success,
      error: toast.error,
      warning: toast.warning,
      info: toast.info,
    });
    return () => registerNotifyHandlers(null);
  }, [toast]);

  return null;
};
