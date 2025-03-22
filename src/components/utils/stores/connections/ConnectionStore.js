// src/utils/ConnectionStore.js
import { create } from 'zustand';

const useConnectionStore = create((set, get) => ({
    // 心跳连接状态
    heartbeatStatus: 'disconnected',
    // 通知连接状态
    notificationStatus: 'disconnected',
    // 最后一次更新时间戳
    lastUpdate: Date.now(),

    // 更新心跳状态
    setHeartbeatStatus: (status) => {
        // 只有当状态真的改变时才更新
        if (get().heartbeatStatus !== status) {
            set({
                heartbeatStatus: status,
                lastUpdate: Date.now()
            });
        }
    },

    // 更新通知状态
    setNotificationStatus: (status) => {
        // 只有当状态真的改变时才更新
        if (get().notificationStatus !== status) {
            set({
                notificationStatus: status,
                lastUpdate: Date.now()
            });
        }
    },

    // 重置所有状态
    resetStatus: () => set({
        heartbeatStatus: 'disconnected',
        notificationStatus: 'disconnected',
        lastUpdate: Date.now()
    })
}));

export default useConnectionStore;