import { useEffect, useCallback } from 'react';
import useConnectionStore from './ConnectionStore';

export const ConnectionMonitor = ({ onStatusChange, children }) => {
    const { heartbeatStatus, notificationStatus } = useConnectionStore();

    const handleStatusChange = useCallback(() => {
        onStatusChange?.({
            heartbeat: heartbeatStatus === 'connected',
            notification: notificationStatus === 'connected',
            timestamp: Date.now()
        });
    }, [heartbeatStatus, notificationStatus, onStatusChange]);

    useEffect(() => {
        handleStatusChange();
    }, [handleStatusChange]);

    return children;
};