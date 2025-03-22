// AuthContext.js
import React, { createContext, useContext, useEffect, useCallback } from 'react';
import axios from 'axios';
import useAuthStore from '../utils/stores/auth/AuthStore';

const AuthContext = createContext(null);

// 定义配置常量
const AUTH_CONFIG = {
  VALIDATE_INTERVAL: 5 * 60 * 1000, // 5分钟验证一次会话
  API_BASE_URL: 'http://127.0.0.1:8080',
};

export const AuthProvider = ({ children }) => {
  const {
    isLoggedIn,
    isLoading,
    username,
    userId,
    userGroup,
    isAdmin,
    isMessenger,
    setUserInfo,
    setIsLoading,
    resetAuth
  } = useAuthStore();

  // 验证会话状态
  const validateSession = useCallback(async () => {
    // 检查是否在支付宝回调页面
    const isAlipayCallback = window.location.pathname.includes('/alipay/callback');
    console.log('当前页面状态:', { isAlipayCallback, pathname: window.location.pathname });

    if (isAlipayCallback) {
      return true;
    }

    try {
      console.log('开始验证会话状态');
      const response = await axios.get(`${AUTH_CONFIG.API_BASE_URL}/validateToken`, {
        withCredentials: true
      });

      console.log('验证响应:', response.data);

      if (response.status === 200 && response.data) {
        setUserInfo({
          isLoggedIn: true,
          username: response.data.username,
          userId: response.data.userId,
          userGroup: response.data.userGroup,
          isAdmin: response.data.userGroup === 'admin',
          isMessenger: response.data.userGroup === 'messenger'
        });
        return true;
      }

      console.log('验证失败，重置认证状态');
      resetAuth();
      return false;
    } catch (error) {
      console.error('会话验证失败:', error);
      resetAuth();
      return false;
    }
  }, [setUserInfo, resetAuth]);

  // 登录方法
  const login = async (credentials) => {
    try {
      setIsLoading(true);
      const response = await axios.post(`${AUTH_CONFIG.API_BASE_URL}/login`, credentials, {
        withCredentials: true
      });

      if (response.status === 200) {
        setUserInfo({
          isLoggedIn: true,
          username: response.data.username,
          userId: response.data.userId,
          userGroup: response.data.userGroup,
          isAdmin: response.data.userGroup === 'admin',
          isMessenger: response.data.userGroup === 'messenger'
        });
        return { success: true };
      }
      return { success: false, error: '登录失败' };
    } catch (error) {
      console.error('登录失败:', error);
      return {
        success: false,
        error: error.response?.data || '登录失败，请稍后重试'
      };
    } finally {
      setIsLoading(false);
    }
  };

// 登出方法修改
  const logout = async () => {
    try {
      // 首先关闭所有WebSocket连接
      window.dispatchEvent(new Event('user-logout'));

      // 清理客户端状态
      cleanupClientAuth();

      // 发送登出请求到服务器
      const response = await axios.post(
          `${AUTH_CONFIG.API_BASE_URL}/logout`,
          {},
          {
            withCredentials: true,
            headers: {
              'Content-Type': 'application/json',
            },
            timeout: 5000,
          }
      );

      if (response.status === 200) {
        // 登出成功后重定向到登录页面
        window.location.href = '/login?logout=true';
        return { success: true };
      }

      return {
        success: false,
        error: response.data || '登出过程发生异常，请刷新页面'
      };
    } catch (error) {
      console.error('登出过程发生错误:', error);
      // 即使请求失败也清理客户端状态并重定向
      cleanupClientAuth();
      window.location.href = '/login?logout=true';
      return {
        success: false,
        error: error.response?.data || '登出失败，请重试'
      };
    }
  };

// 改进Cookie清理方法
  const cleanupClientAuth = () => {
    // 重置认证状态
    resetAuth();

    // 更全面地清理Cookie
    const domains = ['', '.localhost', window.location.hostname, `.${window.location.hostname}`];
    const paths = ['/', '/api', ''];

    const cookiesToClear = [
      'access_token',
      'refresh_token',
      'alipay_auth_state',
      'alipay_auth_token',
      'JSESSIONID'
    ];

    // 针对不同的域名和路径清理Cookie
    domains.forEach(domain => {
      paths.forEach(path => {
        cookiesToClear.forEach(name => {
          document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=${path}${domain ? `; domain=${domain}` : ''}`;
        });
      });
    });

    // 清理相关的会话存储
    sessionStorage.removeItem('alipayAuthState');
    sessionStorage.removeItem('alipayAuthTimestamp');
    localStorage.removeItem('currentOrderNumber');

    // 清理任何其他可能的认证状态
    try {
      localStorage.removeItem('auth_redirect');
      localStorage.removeItem('auth_state');
    } catch (e) {
      console.error('清理本地存储时出错:', e);
    }
  };

  // 初始验证
  useEffect(() => {
    const checkExistingSession = async () => {
      const isAlipayCallback = window.location.pathname.includes('/alipay/callback');

      if (!isAlipayCallback) {
        setIsLoading(true);
        try {
          await validateSession();
        } finally {
          setIsLoading(false);
        }
      }
    };

    checkExistingSession();
  }, [validateSession, setIsLoading]);

  // 定期验证会话状态
  useEffect(() => {
    if (!isLoggedIn) return;

    const sessionInterval = setInterval(validateSession, AUTH_CONFIG.VALIDATE_INTERVAL);

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        validateSession();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearInterval(sessionInterval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isLoggedIn, validateSession]);

  const contextValue = {
    isLoggedIn,
    isLoading,
    username,
    userId,
    userGroup,
    isAdmin,
    isMessenger,
    login,
    logout,
    setUserInfo,
    validateSession  // 添加验证方法到上下文
  };

  return (
      <AuthContext.Provider value={contextValue}>
        {children}
      </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth 必须在 AuthProvider 内部使用');
  }
  return context;
};