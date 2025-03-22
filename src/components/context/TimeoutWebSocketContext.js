// src/components/context/TimeoutWebSocketContext.js
import React, { createContext, useContext, useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from './AuthContext';
import timeoutTypeMapping from "../utils/map/timeoutTypeMapping";

// 创建超时统计WebSocket上下文
const TimeoutWebSocketContext = createContext(null);

// 定义连接状态枚举
const CONNECTION_STATUS = {
    DISCONNECTED: 'disconnected',
    CONNECTING: 'connecting',
    CONNECTED: 'connected',
    AUTHENTICATED: 'authenticated',
    ERROR: 'error'
};

// 配置常量
const CONFIG = {
    MAX_RECONNECT_ATTEMPTS: 5,
    INITIAL_RECONNECT_DELAY: 5000,
    PING_INTERVAL: 30000
};

/**
 * 超时统计WebSocket提供者组件
 * 负责建立和管理与后端的WebSocket连接
 */
export const TimeoutWebSocketProvider = ({ children }) => {
    const { isLoggedIn, userId, isAdmin } = useAuth();
    useNavigate();
    // 保存统计数据的状态
    const [userStatistics, setUserStatistics] = useState(null);
    const [systemStatistics, setSystemStatistics] = useState(null);
    const [globalStatistics, setGlobalStatistics] = useState(null);

    // 新增：保存超时报告和建议数据
    const [timeoutReport, setTimeoutReport] = useState(null);
    const [recommendations, setRecommendations] = useState(null);

    // 连接状态
    const [connectionStatus, setConnectionStatus] = useState({
        user: CONNECTION_STATUS.DISCONNECTED,
        system: CONNECTION_STATUS.DISCONNECTED,
        global: CONNECTION_STATUS.DISCONNECTED
    });

    // 触发连接的控制状态
    const [shouldConnect, setShouldConnect] = useState({
        user: false,
        system: false,
        global: false
    });

    // WebSocket引用
    const websocketsRef = useRef({
        user: null,
        system: null,
        global: null
    });

    // 重连尝试次数
    const reconnectAttemptsRef = useRef({
        user: 0,
        system: 0,
        global: 0
    });

    // 心跳interval引用
    const pingIntervalsRef = useRef({
        user: null,
        system: null,
        global: null
    });

    // 操作锁引用，防止并发操作
    const operationLocksRef = useRef({
        user: false,
        system: false,
        global: false
    });

    // 安全的数据访问函数
    const safeAccess = (obj, path, defaultValue = null) => {
        try {
            if (!obj) return defaultValue;
            const keys = path.split('.');
            let result = obj;
            for (const key of keys) {
                if (result === null || result === undefined) return defaultValue;
                result = result[key];
            }
            return result === undefined ? defaultValue : result;
        } catch (error) {
            console.warn(`[超时统计] 访问属性路径 ${path} 失败:`, error);
            return defaultValue;
        }
    };

    // 统一更新连接状态
    const updateConnectionStatus = useCallback((type, status) => {
        console.log(`[超时统计] ${type}连接状态更新:`, status);
        setConnectionStatus(prev => ({
            ...prev,
            [type]: status
        }));
    }, []);

    // 停止连接
    const stopConnection = useCallback((type) => {
        if (operationLocksRef.current[type]) {
            console.log(`[超时统计] ${type}连接正在处理中，跳过停止`);
            return;
        }

        operationLocksRef.current[type] = true;

        try {
            console.log(`[超时统计] 停止${type}连接`);

            // 清理心跳定时器
            if (pingIntervalsRef.current[type]) {
                clearInterval(pingIntervalsRef.current[type]);
                pingIntervalsRef.current[type] = null;
            }

            // 关闭WebSocket连接
            if (websocketsRef.current[type]?.readyState === WebSocket.OPEN ||
                websocketsRef.current[type]?.readyState === WebSocket.CONNECTING) {
                websocketsRef.current[type].close();
            }

            websocketsRef.current[type] = null;
            updateConnectionStatus(type, CONNECTION_STATUS.DISCONNECTED);

            // 更新连接触发状态
            setShouldConnect(prev => ({
                ...prev,
                [type]: false
            }));
        } catch (error) {
            console.error(`[超时统计] 停止${type}连接时出错:`, error);
        } finally {
            operationLocksRef.current[type] = false;
        }
    }, [updateConnectionStatus]);

    // 设置心跳检测
    const setupPingInterval = useCallback((type, ws) => {
        // 清理现有的定时器
        if (pingIntervalsRef.current[type]) {
            clearInterval(pingIntervalsRef.current[type]);
        }

        // 创建新的心跳间隔
        pingIntervalsRef.current[type] = setInterval(() => {
            if (ws && ws.readyState === WebSocket.OPEN) {
                try {
                    console.debug(`[超时统计] 发送${type}心跳`);
                    ws.send(JSON.stringify({
                        command: 'ping',
                        timestamp: Date.now()
                    }));
                } catch (error) {
                    console.error(`[超时统计] 发送${type}心跳失败:`, error);
                    stopConnection(type);
                }
            } else if (ws && ws.readyState !== WebSocket.CONNECTING) {
                // WebSocket不在开启状态且不在连接中，清理心跳
                clearInterval(pingIntervalsRef.current[type]);
                pingIntervalsRef.current[type] = null;
            }
        }, CONFIG.PING_INTERVAL);
    }, [stopConnection]);

    // 启动连接
    const startConnection = useCallback((type) => {
        // 检查前置条件
        if (!isLoggedIn || !userId) {
            console.log(`[超时统计] 用户未登录，跳过${type}连接`);
            return;
        }

        if (websocketsRef.current[type]) {
            console.log(`[超时统计] ${type}已有WebSocket连接，跳过创建`);
            return;
        }

        if (operationLocksRef.current[type]) {
            console.log(`[超时统计] ${type}连接操作锁定中，跳过创建`);
            return;
        }

        // 管理员权限检查
        if ((type === 'system' || type === 'global') && !isAdmin) {
            console.log(`[超时统计] 非管理员用户尝试连接${type}，已跳过`);
            return;
        }

        operationLocksRef.current[type] = true;
        updateConnectionStatus(type, CONNECTION_STATUS.CONNECTING);

        try {
            console.log(`[超时统计] 开始建立${type}连接...`);

            // 构建WebSocket URL
            const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
            const host = 'localhost:8080';
            const wsURL = `${protocol}//${host}/ws/timeout-statistics?type=${type}`;
            console.log(`[超时统计] 连接到: ${wsURL}`);

            // 创建WebSocket实例
            const ws = new WebSocket(wsURL);
            websocketsRef.current[type] = ws;

            // 设置事件处理器
            ws.onopen = () => {
                console.log(`[超时统计] ${type}连接已打开`);
                updateConnectionStatus(type, CONNECTION_STATUS.CONNECTED);
            };

            ws.onmessage = (event) => {
                try {
                    // 尝试解析消息数据
                    let data;
                    try {
                        data = JSON.parse(event.data);
                    } catch (jsonError) {
                        console.error(`[超时统计] ${type}消息JSON解析错误:`, jsonError, event.data);
                        return;
                    }

                    if (!data || typeof data !== 'object') {
                        console.warn(`[超时统计] 收到无效的${type}消息格式:`, event.data);
                        return;
                    }

                    switch (data.type) {
                        case 'CONNECTION_ESTABLISHED':
                            console.log(`[超时统计] ${type}连接已认证`);
                            reconnectAttemptsRef.current[type] = 0;
                            updateConnectionStatus(type, CONNECTION_STATUS.AUTHENTICATED);
                            setupPingInterval(type, ws);
                            break;

                        case 'INIT_TEST':
                            console.log(`[超时统计] 收到${type}测试消息:`, data.message);
                            break;

                        case 'ERROR':
                            console.error(`[超时统计] ${type}服务器错误:`, data.message);
                            break;

                        case 'user':
                            // 添加数据验证
                            if (data.data && typeof data.data === 'object') {
                                console.log(`[超时统计] 接收到用户统计数据，数据大小:`,
                                    JSON.stringify(data.data).length);

                                // 检查关键数据结构是否存在
                                if (safeAccess(data, 'data.timeoutCounts') === null) {
                                    console.warn(`[超时统计] 用户统计数据缺少timeoutCounts属性`);

                                    // 如果存在新格式数据，使用映射关系创建兼容的timeoutCounts
                                    if (safeAccess(data, 'data.serviceStatistics') &&
                                        typeof safeAccess(data, 'data.serviceStatistics') === 'object') {

                                        data.data.timeoutCounts = timeoutTypeMapping.extractTimeoutCounts(
                                            safeAccess(data, 'data.serviceStatistics')
                                        );
                                    } else {
                                        // 确保至少有一个空的timeoutCounts对象
                                        data.data.timeoutCounts = {};
                                    }
                                }

                                setUserStatistics(data.data);
                            } else {
                                console.warn(`[超时统计] 接收到无效的用户统计数据类型:`,
                                    data.data ? typeof data.data : 'null/undefined');
                            }
                            break;

                        case 'system':
                        case 'global':
                            // 添加数据验证
                            if (data.data && typeof data.data === 'object') {
                                console.log(`[超时统计] 接收到${type}统计数据，数据大小:`,
                                    JSON.stringify(data.data).length);

                                // 检查是否有新结构的serviceStatistics
                                if (data.data.serviceStatistics && typeof data.data.serviceStatistics === 'object') {
                                    // 新结构有效，继续处理

                                    // 为了兼容旧代码，创建合成的timeoutCounts
                                    if (!data.data.timeoutCounts) {
                                        // 使用映射关系提取超时统计数据
                                        data.data.timeoutCounts = timeoutTypeMapping.extractTimeoutCounts(
                                            data.data.serviceStatistics
                                        );
                                    }
                                }
                                // 旧结构检查
                                else if (!data.data.timeoutCounts) {
                                    console.warn(`[超时统计] ${type}统计数据缺少timeoutCounts属性`);
                                    // 确保至少有一个空的timeoutCounts对象
                                    data.data.timeoutCounts = data.data.timeoutCounts || {};
                                }

                                // 更新状态
                                if (type === 'system') {
                                    setSystemStatistics(data.data);
                                } else {
                                    setGlobalStatistics(data.data);
                                }
                            } else {
                                console.warn(`[超时统计] 接收到无效的${type}统计数据类型:`,
                                    data.data ? typeof data.data : 'null/undefined');
                            }
                            break;

                        // 新增：处理超时报告消息
                        case 'timeoutReport':
                            if (data.data && typeof data.data === 'object') {
                                console.log(`[超时统计] 接收到超时报告数据，数据大小:`,
                                    JSON.stringify(data.data).length);
                                setTimeoutReport(data.data);
                            } else {
                                console.warn(`[超时统计] 接收到无效的超时报告数据类型`);
                            }
                            break;

                        // 新增：处理超时报告列表消息
                        case 'timeoutReports':
                            if (data.data && Array.isArray(data.data)) {
                                console.log(`[超时统计] 接收到超时报告列表数据，共 ${data.data.length} 条`);
                                // 如果需要处理报告列表，可以在这里添加代码
                            } else {
                                console.warn(`[超时统计] 接收到无效的超时报告列表数据类型`);
                            }
                            break;

                        // 新增：处理建议消息
                        case 'recommendations':
                            if (data.recommendations && Array.isArray(data.recommendations)) {
                                console.log(`[超时统计] 接收到建议数据，共 ${data.recommendations.length} 条`);
                                setRecommendations({
                                    recommendations: data.recommendations,
                                    period: data.period || {}
                                });
                            } else {
                                console.warn(`[超时统计] 接收到无效的建议数据类型`);
                            }
                            break;

                        default:
                            console.log(`[超时统计] 收到未知类型消息:`, data.type);
                    }
                } catch (error) {
                    console.error(`[超时统计] ${type}消息处理错误:`, error, event.data);
                }
            };

            ws.onerror = (error) => {
                console.error(`[超时统计] ${type}WebSocket错误:`, error);
                updateConnectionStatus(type, CONNECTION_STATUS.ERROR);
                operationLocksRef.current[type] = false;
                stopConnection(type);
            };

            ws.onclose = (event) => {
                console.log(`[超时统计] ${type}WebSocket连接已关闭:`, event.code, event.reason);

                // 清理资源
                websocketsRef.current[type] = null;

                // 清理心跳
                if (pingIntervalsRef.current[type]) {
                    clearInterval(pingIntervalsRef.current[type]);
                    pingIntervalsRef.current[type] = null;
                }

                updateConnectionStatus(type, CONNECTION_STATUS.DISCONNECTED);

                // 重连逻辑
                if (isLoggedIn && shouldConnect[type] &&
                    reconnectAttemptsRef.current[type] < CONFIG.MAX_RECONNECT_ATTEMPTS) {

                    reconnectAttemptsRef.current[type]++;

                    // 使用指数退避策略
                    const delay = CONFIG.INITIAL_RECONNECT_DELAY *
                        Math.pow(2, reconnectAttemptsRef.current[type] - 1);

                    console.log(`[超时统计] ${type}将在 ${delay}ms 后重试连接，第${reconnectAttemptsRef.current[type]}次尝试...`);

                    setTimeout(() => {
                        operationLocksRef.current[type] = false;
                        if (isLoggedIn && shouldConnect[type]) {
                            startConnection(type);
                        }
                    }, delay);
                } else if (reconnectAttemptsRef.current[type] >= CONFIG.MAX_RECONNECT_ATTEMPTS) {
                    console.warn(`[超时统计] ${type}连接已达到最大重试次数`);
                    operationLocksRef.current[type] = false;

                    // 如果所有连接都失败，可能需要重新登录
                    const allFailed = Object.values(connectionStatus).every(
                        status => status === CONNECTION_STATUS.ERROR ||
                            status === CONNECTION_STATUS.DISCONNECTED
                    );

                    if (allFailed) {
                        console.error('所有连接均已失败，需要重新登录');
                        // 添加更多用户友好的提示
                        // 暂不立即导航到登录页，可以让用户自行决定
                    }
                } else {
                    operationLocksRef.current[type] = false;
                }
            };

        } catch (error) {
            console.error(`[超时统计] 创建${type}WebSocket连接错误:`, error);
            operationLocksRef.current[type] = false;
            updateConnectionStatus(type, CONNECTION_STATUS.ERROR);
        }
    }, [isLoggedIn, userId, isAdmin, shouldConnect, connectionStatus, updateConnectionStatus, setupPingInterval, stopConnection, safeAccess]);

    // 请求特定时间段的统计数据
    const requestStatistics = useCallback((type, startTime, endTime) => {
        const ws = websocketsRef.current[type];
        if (!ws || ws.readyState !== WebSocket.OPEN) {
            console.warn(`[超时统计] ${type}未连接，无法请求数据`);

            // 尝试重新连接
            if (shouldConnect[type] && connectionStatus[type] !== CONNECTION_STATUS.CONNECTING) {
                console.log(`[超时统计] 尝试重新建立${type}连接...`);
                stopConnection(type);
                setTimeout(() => {
                    startConnection(type);
                }, 1000);
            }
            return;
        }

        try {
            // 发送请求消息
            const requestMessage = {
                command: 'getStatistics',
                type: type,
                startTime: startTime ? startTime.toISOString() : null,
                endTime: endTime ? endTime.toISOString() : null
            };

            console.log(`[超时统计] 发送${type}统计请求:`, requestMessage);
            ws.send(JSON.stringify(requestMessage));
        } catch (error) {
            console.error(`[超时统计] 发送${type}请求失败:`, error);

            // 连接可能已断开，尝试重新连接
            if (shouldConnect[type]) {
                stopConnection(type);
                setTimeout(() => {
                    startConnection(type);
                }, 1000);
            }
        }
    }, [shouldConnect, connectionStatus, stopConnection, startConnection]);

    // 新增：请求超时报告
    const requestTimeoutReport = useCallback((getLatest = true, startTime = null, endTime = null) => {
        // 优先使用system连接
        const type = websocketsRef.current.system ? 'system' : 'global';
        const ws = websocketsRef.current[type];

        if (!ws || ws.readyState !== WebSocket.OPEN) {
            console.warn(`[超时统计] ${type}未连接，无法请求超时报告`);
            return;
        }

        try {
            // 发送请求消息
            const requestMessage = {
                command: 'getTimeoutReport',
                getLatest: getLatest,
                startTime: startTime ? startTime.toISOString() : null,
                endTime: endTime ? endTime.toISOString() : null
            };

            console.log(`[超时统计] 发送超时报告请求:`, requestMessage);
            ws.send(JSON.stringify(requestMessage));
        } catch (error) {
            console.error(`[超时统计] 发送超时报告请求失败:`, error);
        }
    }, []);

    // 新增：请求建议数据
    const requestRecommendations = useCallback((startTime = null, endTime = null) => {
        // 根据用户类型选择连接
        const type = isAdmin ? (websocketsRef.current.system ? 'system' : 'global') : 'user';
        const ws = websocketsRef.current[type];

        if (!ws || ws.readyState !== WebSocket.OPEN) {
            console.warn(`[超时统计] ${type}未连接，无法请求建议数据`);
            return;
        }

        try {
            // 发送请求消息
            const requestMessage = {
                command: 'getRecommendations',
                startTime: startTime ? startTime.toISOString() : null,
                endTime: endTime ? endTime.toISOString() : null
            };

            console.log(`[超时统计] 发送建议请求:`, requestMessage);
            ws.send(JSON.stringify(requestMessage));
        } catch (error) {
            console.error(`[超时统计] 发送建议请求失败:`, error);
        }
    }, [isAdmin]);

    // 监听登录状态变化
    useEffect(() => {
        console.log('[超时统计] 登录状态变化:', isLoggedIn);

        // 定义要连接的类型
        const types = ['user'];
        if (isAdmin) {
            types.push('system', 'global');
        }

        if (isLoggedIn && userId) {
            // 设置触发连接状态
            types.forEach(type => {
                setShouldConnect(prev => ({
                    ...prev,
                    [type]: true
                }));
            });
        } else {
            // 登出时停止所有连接
            ['user', 'system', 'global'].forEach(type => {
                stopConnection(type);
            });

            // 重置统计数据
            setUserStatistics(null);
            setSystemStatistics(null);
            setGlobalStatistics(null);
            setTimeoutReport(null);
            setRecommendations(null);
        }
    }, [isLoggedIn, userId, isAdmin, stopConnection]);

    // 根据shouldConnect触发连接
    useEffect(() => {
        const types = ['user'];
        if (isAdmin) {
            types.push('system', 'global');
        }

        // 依次启动连接，间隔1秒
        types.forEach((type, index) => {
            if (shouldConnect[type] &&
                connectionStatus[type] === CONNECTION_STATUS.DISCONNECTED &&
                !operationLocksRef.current[type]) {
                setTimeout(() => {
                    startConnection(type);
                }, index * 1000);
            }
        });
    }, [shouldConnect, connectionStatus, isAdmin, startConnection]);

    // 组件卸载时清理
    useEffect(() => {
        return () => {
            ['user', 'system', 'global'].forEach(type => {
                stopConnection(type);
            });
        };
    }, [stopConnection]);

    // 修复提供的上下文值部分
    const contextValue = {
        // 统计数据
        userStatistics,
        systemStatistics,
        globalStatistics,

        // 新增：超时报告和建议数据
        timeoutReport,
        recommendations,

        // 连接状态
        connectionStatus,

        // 功能方法
        requestStatistics,
        requestTimeoutReport,
        requestRecommendations,

        // 辅助状态
        isLoading: Object.values(connectionStatus).some(
            status => status === CONNECTION_STATUS.CONNECTING
        ),

        // 添加新的状态判断辅助函数
        isConnected: (type) => {
            return connectionStatus[type] === CONNECTION_STATUS.AUTHENTICATED ||
                connectionStatus[type] === CONNECTION_STATUS.CONNECTED;
        },

        // 添加判断数据是否存在的辅助函数
        hasData: (type) => {
            if (type === 'user') return userStatistics && Object.keys(userStatistics).length > 0;
            if (type === 'system') return systemStatistics && Object.keys(systemStatistics).length > 0;
            if (type === 'global') return globalStatistics && Object.keys(globalStatistics).length > 0;
            if (type === 'report') return timeoutReport && Object.keys(timeoutReport).length > 0;
            if (type === 'recommendations') return recommendations && recommendations.recommendations && recommendations.recommendations.length > 0;
            return false;
        },

        // 添加安全访问工具函数
        safeAccess
    };

    return (
        <TimeoutWebSocketContext.Provider value={contextValue}>
            {children}
        </TimeoutWebSocketContext.Provider>
    );
};

// 使用超时统计上下文的自定义Hook
export const useTimeoutStatistics = () => {
    const context = useContext(TimeoutWebSocketContext);
    if (!context) {
        throw new Error('useTimeoutStatistics必须在TimeoutWebSocketProvider内部使用');
    }
    return context;
};