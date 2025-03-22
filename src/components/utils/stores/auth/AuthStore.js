// AuthStore.js
import { create } from 'zustand';

const useAuthStore = create((set, get) => ({
    // 基础认证状态
    isLoggedIn: false,
    isLoading: true,
    isUserReady: false,

    // 用户基本信息
    username: '',
    userId: null,
    userGroup: '',
    isAdmin: false,
    isMessenger: false,

    // 获取用户ID的方法
    getUserId: () => get().userId,

    // 更新用户信息的方法
    setUserInfo: (userData) => {
        console.log('正在设置用户信息:', userData);

        set({
            isLoggedIn: true,
            isUserReady: true,
            username: userData.username,
            userId: userData.userId,
            userGroup: userData.userGroup,
            isAdmin: userData.userGroup === 'admin',
            isMessenger: userData.userGroup === 'messenger'
        });

        console.log('用户信息设置完成');
    },

    // 更新加载状态
    setIsLoading: (status) => set({
        isLoading: status
    }),

    // 重置所有认证状态
    resetAuth: () => set({
        isLoggedIn: false,
        isLoading: false,
        isUserReady: false,
        username: '',
        userId: null,
        userGroup: '',
        isAdmin: false,
        isMessenger: false
    })
}));

export default useAuthStore;