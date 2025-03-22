// NotificationContext.js
import React, { createContext, useContext, useEffect, useCallback, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { VALID_NOTIFICATION_TYPES, SYSTEM_MESSAGE_TYPES } from '../utils/map/notificationTypeMap';
import axios from 'axios';
import useConnectionStore from '../utils/stores/connections/ConnectionStore';

// 创建并导出通知上下文
const NotificationContext = createContext();

export const useNotification = () => {
    const context = useContext(NotificationContext);
    if (!context) {
        throw new Error('useNotification 必须在 NotificationProvider 内使用');
    }
    return context;
};

// 定义连接状态枚举，便于维护和使用
const CONNECTION_STATUS = {
    DISCONNECTED: 'disconnected',
    CONNECTING: 'connecting',
    CONNECTED: 'connected',
    AUTHENTICATED: 'authenticated',
    ERROR: 'error'
};

// 通知系统配置常量
const NOTIFICATION_CONFIG = {
    MAX_RECONNECT_ATTEMPTS: 5,      // 最大重连次数
    INITIAL_RECONNECT_DELAY: 5000,  // 初始重连延迟（毫秒）
    PING_INTERVAL: 15000,           // 心跳间隔（毫秒）
    PING_TIMEOUT: 5000,             // 心跳响应超时时间（毫秒）
    API_BASE_URL: 'http://127.0.0.1:8080'  // API基础地址
};

export const NotificationProvider = ({ children }) => {
    // 路由和认证
    const { isLoggedIn, userId, validateSession } = useAuth();
    const navigate = useNavigate();

    // WebSocket相关引用
    const webSocketRef = useRef(null);           // WebSocket实例引用
    const reconnectAttemptsRef = useRef(0);      // 重连尝试次数计数
    const pingIntervalRef = useRef(null);        // 心跳定时器引用
    const pingTimeoutRef = useRef(null);         // 心跳超时检测定时器引用
    const operationLockRef = useRef(false);      // 操作锁，防止并发操作

    // 全局连接状态管理
    const { setNotificationStatus, resetStatus } = useConnectionStore();

    // 状态管理
    const [notifications, setNotifications] = useState([]);       // 通知列表
    const [messages, setMessages] = useState([]);                 // 消息列表
    const [localConnectionStatus, setLocalConnectionStatus] = useState(CONNECTION_STATUS.DISCONNECTED);
    const [shouldStartNotification, setShouldStartNotification] = useState(false);

    // 统一更新连接状态
    const updateConnectionStatus = useCallback((status) => {
        console.log(`[通知] 连接状态更新: ${status}`);
        setLocalConnectionStatus(status);
        setNotificationStatus(status);
    }, [setNotificationStatus]);

    // 清理所有定时器和心跳检测
    const clearTimers = useCallback(() => {
        if (pingIntervalRef.current) {
            clearInterval(pingIntervalRef.current);
            pingIntervalRef.current = null;
        }
        if (pingTimeoutRef.current) {
            clearTimeout(pingTimeoutRef.current);
            pingTimeoutRef.current = null;
        }
    }, []);

    // 设置心跳检测机制
    const setupPingInterval = useCallback((ws) => {
        clearTimers();  // 清理现有定时器

        const handlePingTimeout = () => {
            console.error('[通知] 心跳超时，准备重连');
            if (ws.readyState === WebSocket.OPEN) {
                ws.close();
            }
        };

        // 建立新的心跳定时器
        pingIntervalRef.current = setInterval(() => {
            if (ws.readyState === WebSocket.OPEN) {
                try {
                    console.debug('[通知] 发送心跳');
                    ws.send(JSON.stringify({
                        type: 'PING',
                        timestamp: Date.now()
                    }));

                    // 设置心跳响应超时检测
                    pingTimeoutRef.current = setTimeout(
                        handlePingTimeout,
                        NOTIFICATION_CONFIG.PING_TIMEOUT
                    );
                } catch (error) {
                    console.error('[通知] 发送心跳失败:', error);
                    handlePingTimeout();
                }
            }
        }, NOTIFICATION_CONFIG.PING_INTERVAL);
    }, [clearTimers]);

    // 停止通知连接
    const stopNotification = useCallback(() => {
        if (operationLockRef.current) {
            console.log('[通知] 连接正在处理中，跳过停止');
            return;
        }

        operationLockRef.current = true;

        try {
            console.log('[通知] 停止连接');

            clearTimers();  // 清理定时器

            if (webSocketRef.current?.readyState === WebSocket.OPEN ||
                webSocketRef.current?.readyState === WebSocket.CONNECTING) {
                webSocketRef.current.close();
            }

            webSocketRef.current = null;
            updateConnectionStatus(CONNECTION_STATUS.DISCONNECTED);

            // 更新连接触发状态
            setShouldStartNotification(false);
        } catch (error) {
            console.error('[通知] 停止连接时出错:', error);
        } finally {
            operationLockRef.current = false;
        }
    }, [clearTimers, updateConnectionStatus]);

    // 获取未读消息
    const fetchUnreadMessages = useCallback(async () => {
        if (!isLoggedIn) return;

        try {
            console.log('[通知] 获取未读消息...');
            const response = await axios.get(
                `${NOTIFICATION_CONFIG.API_BASE_URL}/messages/unread`,
                { withCredentials: true }
            );

            if (response.status === 200) {
                setMessages(response.data);
                console.log('[通知] 未读消息更新成功');
            }
        } catch (error) {
            console.error('[通知] 获取未读消息失败:', error);

            // 尝试刷新会话
            if (error.response?.status === 401 || error.response?.status === 403) {
                const sessionValid = await validateSession();
                if (!sessionValid) {
                    console.error('[通知] 会话失效，重定向到登录页面');
                    navigate('/login');
                }
            }
        }
    }, [isLoggedIn, navigate, validateSession]);

    // 启动通知连接
    const startNotification = useCallback(() => {
        // 检查前置条件
        if (!isLoggedIn || !userId ||
            webSocketRef.current ||
            operationLockRef.current) {
            console.log(`[通知] 跳过连接:`, {
                isLoggedIn,
                hasWebSocket: !!webSocketRef.current,
                isLocked: operationLockRef.current
            });
            return;
        }

        operationLockRef.current = true;
        updateConnectionStatus(CONNECTION_STATUS.CONNECTING);

        try {
            console.log('[通知] 开始建立连接...');

            // 构建WebSocket URL (支持 ws 和 wss)
            const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
            const host = NOTIFICATION_CONFIG.API_BASE_URL.split('//')[1];
            const wsURL = `${protocol}//${host}/ws/notification`;
            console.log(`[通知] 连接到: ${wsURL}`);

            // 创建WebSocket实例
            const ws = new WebSocket(wsURL);
            webSocketRef.current = ws;

            // WebSocket事件处理
            ws.onopen = () => {
                console.log('[通知] WebSocket连接已打开');
                updateConnectionStatus(CONNECTION_STATUS.CONNECTED);
            };

            ws.onerror = (error) => {
                console.error('[通知] WebSocket错误:', error);
                updateConnectionStatus(CONNECTION_STATUS.ERROR);
                operationLockRef.current = false;
                stopNotification();
            };

            ws.onclose = (event) => {
                console.log('[通知] WebSocket连接已关闭:', event.code, '原因:', event.reason);

                // 清理资源
                webSocketRef.current = null;

                // 清理心跳
                clearTimers();

                updateConnectionStatus(CONNECTION_STATUS.DISCONNECTED);

                // 重连逻辑
                if (isLoggedIn && shouldStartNotification &&
                    reconnectAttemptsRef.current < NOTIFICATION_CONFIG.MAX_RECONNECT_ATTEMPTS) {

                    reconnectAttemptsRef.current++;

                    // 使用指数退避策略
                    const delay = NOTIFICATION_CONFIG.INITIAL_RECONNECT_DELAY *
                        Math.pow(2, reconnectAttemptsRef.current - 1);

                    console.log(`[通知] 将在 ${delay}ms 后重试连接...`);

                    setTimeout(async () => {
                        operationLockRef.current = false;

                        // 在重连前尝试刷新会话状态
                        if (reconnectAttemptsRef.current > 2) {
                            const sessionValid = await validateSession();
                            if (!sessionValid) {
                                console.error('[通知] 会话验证失败，需要重新登录');
                                navigate('/login');
                                return;
                            }
                        }

                        if (isLoggedIn && shouldStartNotification) {
                            startNotification();
                        }
                    }, delay);
                } else if (reconnectAttemptsRef.current >= NOTIFICATION_CONFIG.MAX_RECONNECT_ATTEMPTS) {
                    console.warn('[通知] 已达到最大重试次数');
                    operationLockRef.current = false;

                    // 尝试刷新会话
                    validateSession().then(valid => {
                        if (!valid) {
                            console.error('[通知] 会话验证失败，需要重新登录');
                            navigate('/login');
                        }
                    });
                } else {
                    operationLockRef.current = false;
                }
            };

            ws.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    console.debug('[通知] 收到消息:', data);

                    switch (data.type) {
                        case 'CONNECTION_ESTABLISHED':
                            console.log('[通知] 连接已认证');
                            reconnectAttemptsRef.current = 0;
                            updateConnectionStatus(CONNECTION_STATUS.AUTHENTICATED);
                            setupPingInterval(ws);
                            break;

                        case 'PONG':
                            // 清除心跳超时检测
                            if (pingTimeoutRef.current) {
                                clearTimeout(pingTimeoutRef.current);
                                pingTimeoutRef.current = null;
                            }
                            console.debug('[通知] 收到心跳响应');
                            break;

                        case 'ERROR':
                            console.error('[通知] 服务器错误:', data.message);
                            // 检查是否是认证错误
                            if (data.message?.includes('auth') || data.message?.includes('认证') ||
                                data.message?.includes('token')) {
                                validateSession();
                            }
                            break;

                        default:
                            // 处理业务消息
                            if (VALID_NOTIFICATION_TYPES.includes(data.type) && data.content) {
                                setNotifications(prev => [...prev, data]);
                                if (data.type === 'NEW_MESSAGE') {
                                    fetchUnreadMessages();
                                }
                            } else if (!SYSTEM_MESSAGE_TYPES.includes(data.type)) {
                                console.warn('[通知] 未知类型消息:', data.type);
                            }
                    }
                } catch (error) {
                    console.error('[通知] 消息处理错误:', error);
                }
            };
        } catch (error) {
            console.error('[通知] 创建连接错误:', error);
            operationLockRef.current = false;
            updateConnectionStatus(CONNECTION_STATUS.ERROR);
        } finally {
            operationLockRef.current = false;
        }
    }, [
        isLoggedIn,
        userId,
        shouldStartNotification,
        updateConnectionStatus,
        navigate,
        setupPingInterval,
        stopNotification,
        clearTimers,
        validateSession,
        fetchUnreadMessages
    ]);

    // 监听登录状态变化
    useEffect(() => {
        console.log('[通知] 登录状态变化:', isLoggedIn);
        if (isLoggedIn) {
            setShouldStartNotification(true);
            fetchUnreadMessages();
        } else {
            setShouldStartNotification(false);
            stopNotification();
            setNotifications([]);
            setMessages([]);
        }
    }, [isLoggedIn, stopNotification, fetchUnreadMessages]);

    // 根据shouldStartNotification触发连接
    useEffect(() => {
        if (shouldStartNotification &&
            localConnectionStatus === CONNECTION_STATUS.DISCONNECTED &&
            !operationLockRef.current) {
            // 添加短暂延迟，确保不与其他连接冲突
            setTimeout(startNotification, 1000);
        }
    }, [shouldStartNotification, localConnectionStatus, startNotification]);

    // 组件卸载时清理
    useEffect(() => {
        return () => {
            stopNotification();
            resetStatus();
        };
    }, [stopNotification, resetStatus]);

    // 工具方法
    const clearAllMessages = useCallback(() => {
        setMessages([]);
    }, []);

    const clearNotifications = useCallback(() => {
        setNotifications([]);
        clearAllMessages();
    }, [clearAllMessages]);

    const updateMessages = useCallback((newMessages) => {
        setMessages(newMessages);
    }, []);

    const refreshConnection = useCallback(async () => {
        console.log('[通知] 手动刷新连接');

        // 先验证会话
        const sessionValid = await validateSession();
        if (!sessionValid) {
            console.error('[通知] 会话验证失败，需要重新登录');
            navigate('/login');
            return false;
        }

        // 重置连接
        stopNotification();
        reconnectAttemptsRef.current = 0;

        // 短暂延迟后重新启动
        setTimeout(() => {
            if (isLoggedIn) {
                setShouldStartNotification(true);
            }
        }, 1000);

        return true;
    }, [validateSession, navigate, stopNotification, isLoggedIn]);

    // 构建上下文值
    const contextValue = {
        notifications,
        messages,
        unreadCount: notifications.length + messages.length,
        connectionStatus: localConnectionStatus,
        isConnected: localConnectionStatus === CONNECTION_STATUS.AUTHENTICATED ||
            localConnectionStatus === CONNECTION_STATUS.CONNECTED,
        clearNotifications,
        clearAllMessages,
        updateMessages,
        fetchUnreadMessages,
        refreshConnection
    };

    return (
        <NotificationContext.Provider value={contextValue}>
            {children}
        </NotificationContext.Provider>
    );
};