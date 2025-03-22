// HeartbeatContext.js
import React, { createContext, useContext, useEffect, useCallback, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from './AuthContext';
import useConnectionStore from '../utils/stores/connections/ConnectionStore';

// 定义心跳连接的关键常量
const HEARTBEAT_INTERVAL = 30000; // 30秒 - 与后端超时时间匹配
const MAX_RECONNECT_ATTEMPTS = 5; // 最大重连次数
const INITIAL_RECONNECT_DELAY = 5000; // 初始重连延迟（5秒）

// 创建心跳上下文
const HeartbeatContext = createContext();

// 导出心跳检测钩子
export const useHeartbeat = () => {
  const context = useContext(HeartbeatContext);
  if (!context) {
    throw new Error('useHeartbeat 必须在 HeartbeatProvider 内使用');
  }
  return context;
};

export const HeartbeatProvider = ({ children }) => {
  // 基础状态和引用
  const webSocketRef = useRef(null);
  const reconnectAttemptsRef = useRef(0);
  const pingIntervalRef = useRef(null);
  const navigate = useNavigate();
  const { isLoggedIn } = useAuth();

  // 组件内部状态管理
  const [shouldStartHeartbeat, setShouldStartHeartbeat] = useState(false);
  const [localConnectionStatus, setLocalConnectionStatus] = useState('disconnected');

  // 全局连接状态管理
  const { setHeartbeatStatus, resetStatus } = useConnectionStore();

  // 更新连接状态的统一处理函数
  const updateConnectionStatus = useCallback((status) => {
    setLocalConnectionStatus(status);
    setHeartbeatStatus(status);
    console.log('心跳状态更新:', status);
  }, [setHeartbeatStatus]);

  // 设置心跳检测
  const setupPingInterval = useCallback((ws) => {
    if (pingIntervalRef.current) {
      clearInterval(pingIntervalRef.current);
    }

    pingIntervalRef.current = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) {
        const pingMessage = {
          type: 'PING',
          timestamp: Date.now()
        };
        ws.send(JSON.stringify(pingMessage));
        console.debug('发送心跳信号 PING');
      }
    }, HEARTBEAT_INTERVAL);
  }, []);

  // 处理系统消息
  const handleSystemMessage = useCallback((data) => {
    switch (data.type) {
      case 'CONNECTION_ESTABLISHED':
        console.log('连接已建立并完成认证');
        updateConnectionStatus('authenticated');
        reconnectAttemptsRef.current = 0;
        // 认证成功后立即开始发送心跳
        if (webSocketRef.current) {
          setupPingInterval(webSocketRef.current);
        }
        break;

      case 'PONG':
        console.debug('收到服务器心跳响应');
        break;

      case 'ERROR':
        console.error('服务器错误:', data.message);
        updateConnectionStatus('error');
        break;

      default:
        console.warn('未处理的消息类型:', data.type);
    }
  }, [updateConnectionStatus, setupPingInterval]);

  // 停止心跳连接
  const stopHeartbeat = useCallback(() => {
    if (webSocketRef.current?.readyState === WebSocket.OPEN) {
      webSocketRef.current.close();
    }

    if (pingIntervalRef.current) {
      clearInterval(pingIntervalRef.current);
      pingIntervalRef.current = null;
    }

    webSocketRef.current = null;
    updateConnectionStatus('disconnected');
    resetStatus();
  }, [updateConnectionStatus, resetStatus]);

  // 启动心跳连接
  const startHeartbeat = useCallback(() => {
    console.log('尝试启动心跳连接:', { isLoggedIn });

    if (!isLoggedIn || webSocketRef.current) {
      console.log('心跳连接条件不满足');
      return;
    }

    try {
      console.log('开始建立WebSocket连接...');
      const ws = new WebSocket('ws://127.0.0.1:8080/ws/heartbeat');
      updateConnectionStatus('connecting');

      ws.onopen = () => {
        console.log('WebSocket连接已建立');
        webSocketRef.current = ws;
        // 不需要发送AUTHENTICATE消息 - 后端通过cookie处理认证
      };

      ws.onerror = (error) => {
        console.error('WebSocket错误:', error);
        updateConnectionStatus('error');
      };

      ws.onclose = (event) => {
        console.log('WebSocket连接已关闭:', event.code, '原因:', event.reason);
        webSocketRef.current = null;
        updateConnectionStatus('disconnected');

        // 清理心跳定时器
        if (pingIntervalRef.current) {
          clearInterval(pingIntervalRef.current);
          pingIntervalRef.current = null;
        }

        // 实现重连逻辑
        if (isLoggedIn && reconnectAttemptsRef.current < MAX_RECONNECT_ATTEMPTS) {
          reconnectAttemptsRef.current += 1;
          console.log(`重连尝试 ${reconnectAttemptsRef.current}/${MAX_RECONNECT_ATTEMPTS}`);

          // 使用指数退避策略
          const delay = INITIAL_RECONNECT_DELAY * Math.pow(2, reconnectAttemptsRef.current - 1);
          setTimeout(() => {
            console.log('正在尝试重新连接...');
            startHeartbeat();
          }, delay);
        } else if (reconnectAttemptsRef.current >= MAX_RECONNECT_ATTEMPTS) {
          console.error('达到最大重连次数，需要重新登录');
          navigate('/login');
        }
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.debug('收到服务器消息:', data);
          handleSystemMessage(data);
        } catch (error) {
          console.error('解析服务器消息时出错:', error);
        }
      };

    } catch (error) {
      console.error('设置WebSocket连接时出错:', error);
      updateConnectionStatus('error');
    }
  }, [isLoggedIn, navigate, handleSystemMessage, updateConnectionStatus]);

  // 监听登录状态变化
  useEffect(() => {
    if (isLoggedIn) {
      setShouldStartHeartbeat(true);
    } else {
      setShouldStartHeartbeat(false);
      stopHeartbeat();
    }
  }, [isLoggedIn, stopHeartbeat]);

  // 根据shouldStartHeartbeat状态启动或停止心跳
  useEffect(() => {
    if (shouldStartHeartbeat) {
      startHeartbeat();
    }
    return () => {
      if (shouldStartHeartbeat) {
        stopHeartbeat();
      }
    };
  }, [shouldStartHeartbeat, startHeartbeat, stopHeartbeat]);

  // 组件卸载时清理
  useEffect(() => {
    return () => {
      if (webSocketRef.current) {
        webSocketRef.current.close();
        webSocketRef.current = null;
      }
      if (pingIntervalRef.current) {
        clearInterval(pingIntervalRef.current);
        pingIntervalRef.current = null;
      }
      // 重置所有状态
      updateConnectionStatus('disconnected');
      resetStatus();
    };
  }, [updateConnectionStatus, resetStatus]);

  const contextValue = {
    startHeartbeat,
    stopHeartbeat,
    connectionStatus: localConnectionStatus
  };

  return (
      <HeartbeatContext.Provider value={contextValue}>
        {children}
      </HeartbeatContext.Provider>
  );
};