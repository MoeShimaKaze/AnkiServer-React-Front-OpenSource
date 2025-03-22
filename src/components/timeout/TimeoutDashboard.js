// src/components/timeout/TimeoutDashboard.js
import React, { useEffect, useState } from 'react';
import {
    Layout,
    Typography,
    Spin,
    Result,
    Button,
    Menu,
    ConfigProvider
} from 'antd';
import {
    DashboardOutlined,
    BarChartOutlined,
    TeamOutlined,
    UserOutlined,
    WarningOutlined,
    EnvironmentOutlined,
    ClockCircleOutlined,
    AlertOutlined,
    DollarOutlined,
    SafetyOutlined, BulbOutlined, FileTextOutlined
} from '@ant-design/icons';
import { useAuth } from '../context/AuthContext';
import { TimeoutWebSocketProvider } from '../context/TimeoutWebSocketContext';
import UserStatsView from './UserStatsView';
import AdminStatsView from './AdminStatsView';
import Navbar from '../base/Navbar'; // 引入导航栏组件
import timeoutStatisticsApi from '../utils/api/timeoutStatisticsApi';
import styles from '../../assets/css/timeout/TimeoutDashboard.module.css';

const {Content, Sider } = Layout;
const { Title } = Typography;

/**
 * 超时统计仪表盘主组件
 * 根据用户身份显示不同的统计视图
 * 增强版 - 支持更多高级分析功能
 */
const TimeoutDashboard = () => {
    const { isLoggedIn, isAdmin, isLoading: authLoading } = useAuth();
    const [activeModule, setActiveModule] = useState('overview');
    const [initialData, setInitialData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // 获取背景样式
    const getBackgroundClass = () => {
        if (isAdmin) {
            return styles.adminBackground;
        }
        return styles.userBackground;
    };

    // 加载初始数据
    useEffect(() => {
        const loadInitialData = async () => {
            if (!isLoggedIn || authLoading) return;

            setLoading(true);
            try {
                const dashboardData = await timeoutStatisticsApi.getDashboardStatistics();
                setInitialData(dashboardData);
                setError(null);
            } catch (error) {
                console.error('加载仪表盘数据失败:', error);
                setError('加载超时统计数据失败，请刷新页面重试');
            } finally {
                setLoading(false);
            }
        };

        loadInitialData();
    }, [isLoggedIn, authLoading]);

    // 定义导航项
    const getNavigationItems = () => {
        // 管理员导航菜单
        // 管理员导航菜单
        if (isAdmin) {
            return [
                {
                    key: 'overview',
                    icon: <DashboardOutlined />,
                    label: '统计概览',
                },
                {
                    key: 'systemStats',
                    icon: <BarChartOutlined />,
                    label: '系统统计',
                },
                {
                    key: 'userRanking',
                    icon: <TeamOutlined />,
                    label: '用户排行',
                },
                // 新增 - 风险分析菜单
                {
                    key: 'riskAnalysis',
                    icon: <WarningOutlined />,
                    label: '风险分析',
                },
                // 新增 - 区域分析菜单
                {
                    key: 'regionAnalysis',
                    icon: <EnvironmentOutlined />,
                    label: '区域分析',
                },
                // 新增 - 时间分析菜单
                {
                    key: 'timeAnalysis',
                    icon: <ClockCircleOutlined />,
                    label: '时间分析',
                },
                // 新增 - 趋势预警菜单
                {
                    key: 'trendAlerts',
                    icon: <AlertOutlined />,
                    label: '趋势预警',
                },
                // 新增 - 成本分析菜单
                {
                    key: 'costAnalysis',
                    icon: <DollarOutlined />,
                    label: '成本分析',
                },
                // 新增 - 高风险用户菜单
                {
                    key: 'highRiskUsers',
                    icon: <UserOutlined />,
                    label: '高风险用户',
                },
                // 新增 - 超时报告菜单
                {
                    key: 'timeoutReport',
                    icon: <FileTextOutlined />,
                    label: '超时报告',
                },
                // 新增 - 优化建议菜单
                {
                    key: 'recommendations',
                    icon: <BulbOutlined />,
                    label: '优化建议',
                }
            ];
        }

        // 普通用户导航菜单
        return [
            {
                key: 'overview',
                icon: <DashboardOutlined />,
                label: '统计概览',
            },
            {
                key: 'personalStats',
                icon: <UserOutlined />,
                label: '个人统计',
            },
            // 新增 - 风险评估菜单
            {
                key: 'riskAssessment',
                icon: <SafetyOutlined />,
                label: '风险评估',
            }
        ];
    };

    // 处理菜单选择
    const handleMenuSelect = ({ key }) => {
        setActiveModule(key);
    };

    // 显示错误结果
    if (error) {
        return (
            <div className={`${styles.pageContainer} ${getBackgroundClass()}`}>
                <Navbar />
                <div className={styles.contentWrapper}>
                    <Result
                        status="error"
                        title="加载失败"
                        subTitle={error}
                        extra={[
                            <Button
                                type="primary"
                                key="refresh"
                                onClick={() => window.location.reload()}
                            >
                                刷新页面
                            </Button>,
                        ]}
                    />
                </div>
            </div>
        );
    }

    // 显示加载状态
    if (loading || authLoading) {
        return (
            <div className={`${styles.pageContainer} ${getBackgroundClass()}`}>
                <Navbar />
                <div className={styles.contentWrapper}>
                    <div className={styles.loadingContainer}>
                        <Spin size="large" tip="加载中..." />
                    </div>
                </div>
            </div>
        );
    }

    // 未登录状态
    if (!isLoggedIn) {
        return (
            <div className={`${styles.pageContainer} ${getBackgroundClass()}`}>
                <Navbar />
                <div className={styles.contentWrapper}>
                    <Result
                        status="403"
                        title="未登录"
                        subTitle="请先登录后查看超时统计数据"
                        extra={[
                            <Button
                                type="primary"
                                key="login"
                                onClick={() => window.location.href = '/login'}
                            >
                                前往登录
                            </Button>,
                        ]}
                    />
                </div>
            </div>
        );
    }

    return (
        <ConfigProvider
            theme={{
                token: {
                    borderRadius: 6,
                    colorPrimary: '#007bff',
                },
                components: {
                    Menu: {
                        itemHoverColor: '#ffffff',
                        itemSelectedColor: '#ffffff',
                        itemHoverBg: '#0056b3',
                        itemSelectedBg: '#007bff',
                        itemHeight: 50,
                    }
                }
            }}
        >
            <div className={`${styles.pageContainer} ${getBackgroundClass()}`}>
                <Navbar />
                <div className={styles.contentWrapper}>
                    <Layout className={styles.contentContainer}>
                        <Sider
                            width={200}
                            className={styles.sidebar}
                            theme="light"
                        >
                            <Title level={4} className={styles.sidebarTitle}>
                                超时统计系统
                            </Title>
                            <Menu
                                mode="vertical"
                                selectedKeys={[activeModule]}
                                className={styles.menuList}
                                items={getNavigationItems()}
                                onSelect={handleMenuSelect}
                            />
                        </Sider>
                        <Content className={styles.mainContent}>
                            <TimeoutWebSocketProvider>
                                {isAdmin ? (
                                    <AdminStatsView
                                        initialData={initialData}
                                        activeModule={activeModule}
                                    />
                                ) : (
                                    <UserStatsView
                                        initialData={initialData}
                                        activeModule={activeModule}
                                    />
                                )}
                            </TimeoutWebSocketProvider>
                        </Content>
                    </Layout>
                </div>
            </div>
        </ConfigProvider>
    );
};

export default TimeoutDashboard;