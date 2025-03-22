// src/components/timeout/AdminStatsView.js
import React, { useState, useEffect, useCallback } from 'react';
import { Row, Col, Alert, Skeleton, Card, Table, Input, Button, Empty, Spin, Tabs, Tag, Statistic, Badge, Tooltip, Progress, Typography, Divider, List } from 'antd';
import {
    SearchOutlined,
    TeamOutlined,
    SyncOutlined,
    ReloadOutlined,
    WarningOutlined,
    AlertOutlined,
    AreaChartOutlined,
    HeatMapOutlined,
    DashboardOutlined,
    DollarOutlined,
    RiseOutlined,
    FallOutlined,
    ClockCircleOutlined,
    EnvironmentOutlined,
    UserOutlined,
    FileTextOutlined,
    BulbOutlined
} from '@ant-design/icons';
import PeriodSelector from './PeriodSelector';
import TimeoutStatisticsCard from './TimeoutStatisticsCard';
import TimeoutChartSection from './TimeoutChartSection';
import { useTimeoutStatistics } from '../context/TimeoutWebSocketContext';
import timeoutStatsFormatter from '../utils/timeoutStatsFormatter';
import timeoutStatisticsApi from '../utils/api/timeoutStatisticsApi';
import styles from '../../assets/css/timeout/TimeoutDashboard.module.css';

const { TabPane } = Tabs;
const { Title, Paragraph} = Typography;

/**
 * 管理员超时统计视图组件
 * 增强版本 - 添加风险分析、区域分析、时间分析等高级功能
 */
const AdminStatsView = ({ initialData, activeModule }) => {
    const {
        systemStatistics,
        globalStatistics,
        connectionStatus,
        requestStatistics,
        isLoading,
        safeAccess
    } = useTimeoutStatistics();

    // 当前选中的统计类型 (system/global)
    const [activeStatType, setActiveStatType] = useState('system');

    // 记录上一次选择的时间范围对应的统计数据
    const [previousSystemStats, setPreviousSystemStats] = useState(null);
    const [previousGlobalStats, setPreviousGlobalStats] = useState(null);

    // 用户排行数据
    const [userRankings, setUserRankings] = useState([]);
    const [userRankingsLoading, setUserRankingsLoading] = useState(false);
    const [rankingPagination, setRankingPagination] = useState({
        current: 1,
        pageSize: 10,
        total: 0
    });

    // 当前时间范围
    const [currentTimeRange, setCurrentTimeRange] = useState({
        startTime: null,
        endTime: null
    });

    // 用户搜索
    const [searchText, setSearchText] = useState('');
    const [searchedUserId, setSearchedUserId] = useState(null);
    const [userStats, setUserStats] = useState(null);
    const [userStatsLoading, setUserStatsLoading] = useState(false);

    // 超时报告数据
    const [reportData, setReportData] = useState(null);
    const [reportLoading, setReportLoading] = useState(false);

    // 超时建议数据
    const [recommendationsData, setRecommendationsData] = useState(null);
    const [recommendationsLoading, setRecommendationsLoading] = useState(false);

    // 数据加载和刷新状态
    const [refreshing, setRefreshing] = useState(false);
    const [dataError, setDataError] = useState(false);

    // 新增 - 风险分析数据
    const [riskAnalysisData, setRiskAnalysisData] = useState(null);
    const [riskAnalysisLoading, setRiskAnalysisLoading] = useState(false);

    // 新增 - 区域分析数据
    const [regionAnalysisData, setRegionAnalysisData] = useState(null);
    const [regionAnalysisLoading, setRegionAnalysisLoading] = useState(false);

    // 新增 - 时间分析数据
    const [timeAnalysisData, setTimeAnalysisData] = useState(null);
    const [timeAnalysisLoading, setTimeAnalysisLoading] = useState(false);

    // 新增 - 趋势预警数据
    const [trendAlertsData, setTrendAlertsData] = useState(null);
    const [trendAlertsLoading, setTrendAlertsLoading] = useState(false);

    // 新增 - 服务风险分析数据
    const [serviceRiskData, setServiceRiskData] = useState(null);
    const [serviceRiskLoading, setServiceRiskLoading] = useState(false);

    // 新增 - 成本分析数据
    const [costAnalysisData, setCostAnalysisData] = useState(null);
    const [costAnalysisLoading, setCostAnalysisLoading] = useState(false);

    // 新增 - 高风险用户数据
    const [highRiskUsersData, setHighRiskUsersData] = useState(null);
    const [highRiskUsersLoading, setHighRiskUsersLoading] = useState(false);

    // 新增 - 当前活跃页签
    const [activeTab, setActiveTab] = useState('overview');

    // 获取当前选择的统计数据
    const currentStats = activeStatType === 'system' ? systemStatistics : globalStatistics;
    const previousStats = activeStatType === 'system' ? previousSystemStats : previousGlobalStats;

    // 全局错误处理
    useEffect(() => {
        const handleError = (event) => {
            console.error('全局错误捕获:', event.error || event.message);
            // 避免设置太多错误状态
            if (!dataError) {
                setDataError(true);
            }
        };

        window.addEventListener('error', handleError);

        return () => {
            window.removeEventListener('error', handleError);
        };
    }, [dataError]);

    // 加载用户排行榜数据
    const loadUserRankings = useCallback(async (page = 0, size = 10, sortBy = 'timeoutRate', direction = 'desc') => {
        setUserRankingsLoading(true);
        try {
            // 调用后端API获取用户排行数据
            const { startTime, endTime } = currentTimeRange;
            const data = await timeoutStatisticsApi.getUserRankings(
                startTime,
                endTime,
                page,
                size,
                sortBy,
                direction
            );

            if (data && data.content) {
                setUserRankings(data.content);
                setRankingPagination({
                    current: data.page + 1,
                    pageSize: data.size,
                    total: data.totalItems
                });
            } else {
                setUserRankings([]);
                console.warn('获取到的排行榜数据格式不正确:', data);
            }
        } catch (error) {
            console.error('加载用户排行榜失败:', error);
            setDataError(true);
            setUserRankings([]);
        } finally {
            setUserRankingsLoading(false);
        }
    }, [currentTimeRange]);

    // 加载超时报告数据
    const loadReportData = useCallback(async () => {
        setReportLoading(true);
        try {
            const data = await timeoutStatisticsApi.getLatestReport();
            setReportData(data);
        } catch (error) {
            console.error('加载超时报告数据失败:', error);
            setDataError(true);
        } finally {
            setReportLoading(false);
        }
    }, []);

    // 加载超时建议数据
    const loadRecommendationsData = useCallback(async () => {
        setRecommendationsLoading(true);
        try {
            const { startTime, endTime } = currentTimeRange;
            const data = await timeoutStatisticsApi.getRecommendations(startTime, endTime);
            setRecommendationsData(data);
        } catch (error) {
            console.error('加载超时建议数据失败:', error);
            setDataError(true);
        } finally {
            setRecommendationsLoading(false);
        }
    }, [currentTimeRange]);

    // 新增 - 加载风险分析数据
    const loadRiskAnalysisData = useCallback(async () => {
        setRiskAnalysisLoading(true);
        try {
            const { startTime, endTime } = currentTimeRange;
            const data = await timeoutStatisticsApi.getServiceRiskAnalysis(startTime, endTime);
            setRiskAnalysisData(data);
        } catch (error) {
            console.error('加载风险分析数据失败:', error);
            setDataError(true);
        } finally {
            setRiskAnalysisLoading(false);
        }
    }, [currentTimeRange]);

    // 新增 - 加载区域分析数据
    const loadRegionAnalysisData = useCallback(async () => {
        setRegionAnalysisLoading(true);
        try {
            const { startTime, endTime } = currentTimeRange;
            const data = await timeoutStatisticsApi.getRegionAnalysis(startTime, endTime);
            setRegionAnalysisData(data);
        } catch (error) {
            console.error('加载区域分析数据失败:', error);
            setDataError(true);
        } finally {
            setRegionAnalysisLoading(false);
        }
    }, [currentTimeRange]);

    // 新增 - 加载时间分析数据
    const loadTimeAnalysisData = useCallback(async () => {
        setTimeAnalysisLoading(true);
        try {
            const { startTime, endTime } = currentTimeRange;
            const data = await timeoutStatisticsApi.getTimeAnalysis(startTime, endTime);
            setTimeAnalysisData(data);
        } catch (error) {
            console.error('加载时间分析数据失败:', error);
            setDataError(true);
        } finally {
            setTimeAnalysisLoading(false);
        }
    }, [currentTimeRange]);

    // 新增 - 加载趋势预警数据
    const loadTrendAlertsData = useCallback(async () => {
        setTrendAlertsLoading(true);
        try {
            const { startTime, endTime } = currentTimeRange;
            const data = await timeoutStatisticsApi.getTrendAlerts(startTime, endTime, 0.2);
            setTrendAlertsData(data);
        } catch (error) {
            console.error('加载趋势预警数据失败:', error);
            setDataError(true);
        } finally {
            setTrendAlertsLoading(false);
        }
    }, [currentTimeRange]);

    // 新增 - 加载服务风险分析数据
    const loadServiceRiskData = useCallback(async () => {
        setServiceRiskLoading(true);
        try {
            const { startTime, endTime } = currentTimeRange;
            const data = await timeoutStatisticsApi.getServiceRiskAnalysis(startTime, endTime);
            setServiceRiskData(data);
        } catch (error) {
            console.error('加载服务风险分析数据失败:', error);
            setDataError(true);
        } finally {
            setServiceRiskLoading(false);
        }
    }, [currentTimeRange]);

    // 新增 - 加载成本分析数据
    const loadCostAnalysisData = useCallback(async () => {
        setCostAnalysisLoading(true);
        try {
            const { startTime, endTime } = currentTimeRange;
            const data = await timeoutStatisticsApi.getCostAnalysis(startTime, endTime);
            setCostAnalysisData(data);
        } catch (error) {
            console.error('加载成本分析数据失败:', error);
            setDataError(true);
        } finally {
            setCostAnalysisLoading(false);
        }
    }, [currentTimeRange]);

    // 新增 - 加载高风险用户数据
    const loadHighRiskUsersData = useCallback(async () => {
        setHighRiskUsersLoading(true);
        try {
            const { startTime, endTime } = currentTimeRange;
            const data = await timeoutStatisticsApi.getHighRiskUsers(startTime, endTime);
            setHighRiskUsersData(data);
        } catch (error) {
            console.error('加载高风险用户数据失败:', error);
            setDataError(true);
        } finally {
            setHighRiskUsersLoading(false);
        }
    }, [currentTimeRange]);

    // 主动刷新数据
    const refreshData = useCallback(() => {
        setRefreshing(true);
        try {
            // 清除旧数据
            setPreviousSystemStats(systemStatistics);
            setPreviousGlobalStats(globalStatistics);

            // 请求新数据
            requestStatistics(activeStatType, null, null);

            // 根据当前选中的标签页刷新相应数据
            if (activeTab === 'riskAnalysis') {
                loadRiskAnalysisData();
            } else if (activeTab === 'regionAnalysis') {
                loadRegionAnalysisData();
            } else if (activeTab === 'timeAnalysis') {
                loadTimeAnalysisData();
            } else if (activeTab === 'trendAlerts') {
                loadTrendAlertsData();
            } else if (activeTab === 'serviceRisk') {
                loadServiceRiskData();
            } else if (activeTab === 'costAnalysis') {
                loadCostAnalysisData();
            } else if (activeTab === 'highRiskUsers') {
                loadHighRiskUsersData();
            } else if (activeTab === 'userRanking') {
                loadUserRankings();
            }
            // 根据当前选中的标签页刷新相应数据
            if (activeTab === 'timeoutReport') {
                loadReportData();
            } else if (activeTab === 'recommendations') {
                loadRecommendationsData();
            }

            // 3秒后取消刷新状态
            setTimeout(() => {
                setRefreshing(false);
            }, 3000);
        } catch (error) {
            console.error('刷新数据失败:', error);
            setRefreshing(false);
            setDataError(true);
        }
    }, [
        systemStatistics,
        globalStatistics,
        activeStatType,
        requestStatistics,
        activeTab,
        loadRiskAnalysisData,
        loadRegionAnalysisData,
        loadTimeAnalysisData,
        loadTrendAlertsData,
        loadServiceRiskData,
        loadCostAnalysisData,
        loadHighRiskUsersData,
        loadUserRankings,
        loadReportData,
        loadRecommendationsData
    ]);

    // 同步外部传入的activeModule，自动切换视图
    useEffect(() => {
        if (activeModule === 'systemStats') {
            setActiveStatType('system');
            setActiveTab('overview');
        } else if (activeModule === 'userRanking') {
            setActiveTab('userRanking');
            // 加载用户排行榜数据
            loadUserRankings();
        } else if (activeModule === 'riskAnalysis') {
            setActiveTab('riskAnalysis');
            loadRiskAnalysisData();
        } else if (activeModule === 'regionAnalysis') {
            setActiveTab('regionAnalysis');
            loadRegionAnalysisData();
        } else if (activeModule === 'timeAnalysis') {
            setActiveTab('timeAnalysis');
            loadTimeAnalysisData();
        } else if (activeModule === 'trendAlerts') {
            setActiveTab('trendAlerts');
            loadTrendAlertsData();
        } else if (activeModule === 'serviceRisk') {
            setActiveTab('serviceRisk');
            loadServiceRiskData();
        } else if (activeModule === 'costAnalysis') {
            setActiveTab('costAnalysis');
            loadCostAnalysisData();
        } else if (activeModule === 'highRiskUsers') {
            setActiveTab('highRiskUsers');
            loadHighRiskUsersData();
        } else if (activeModule === 'timeoutReport') {
            setActiveTab('timeoutReport');
            loadReportData();
        } else if (activeModule === 'recommendations') {
            setActiveTab('recommendations');
            loadRecommendationsData();
        }
    }, [
        loadUserRankings,
        loadRiskAnalysisData,
        loadRegionAnalysisData,
        loadTimeAnalysisData,
        loadTrendAlertsData,
        loadServiceRiskData,
        loadCostAnalysisData,
        loadHighRiskUsersData,
        loadReportData,
        loadRecommendationsData,
        activeModule
    ]);

    // 处理排行榜分页和排序变化
    const handleTableChange = useCallback((pagination, filters, sorter) => {
        const { current, pageSize } = pagination;
        const page = current - 1;

        // 处理排序
        let sortBy = 'timeoutRate';
        let direction = 'desc';

        if (sorter.field) {
            sortBy = sorter.field;
            direction = sorter.order === 'ascend' ? 'asc' : 'desc';
        }

        loadUserRankings(page, pageSize, sortBy, direction);
    }, [loadUserRankings]);

    // 搜索用户统计数据
    const searchUserStats = useCallback(async () => {
        if (!searchText) {
            return;
        }

        setUserStatsLoading(true);
        setSearchedUserId(searchText);

        try {
            // 调用API获取指定用户的统计数据
            const { startTime, endTime } = currentTimeRange;
            const data = await timeoutStatisticsApi.getUserStatisticsById(
                searchText,
                startTime,
                endTime
            );
            setUserStats(data);
        } catch (error) {
            console.error('搜索用户统计数据失败:', error);
            setUserStats(null);
        } finally {
            setUserStatsLoading(false);
        }
    }, [searchText, currentTimeRange]);

    // 添加渲染超时报告的函数
    const renderReportData = useCallback(() => {
        if (reportLoading) {
            return <Skeleton active paragraph={{ rows: 6 }} />;
        }

        if (!reportData) {
            return (
                <Empty
                    description="暂无超时报告数据"
                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                />
            );
        }

        return (
            <div className={styles.reportContainer}>
                <Card
                    title={
                        <span>
                        <FileTextOutlined style={{ color: '#722ed1', marginRight: 8 }} />
                        超时报告概览
                    </span>
                    }
                    extra={`生成时间: ${new Date(reportData.generatedTime).toLocaleString()}`}
                >
                    <div className={styles.reportPeriod}>
                        <p>报告周期: {new Date(reportData.startTime).toLocaleDateString()} 至 {new Date(reportData.endTime).toLocaleDateString()}</p>
                    </div>

                    <Row gutter={[16, 16]}>
                        <Col xs={24} md={12}>
                            <Card title="系统统计" size="small">
                                {reportData.systemStats ? (
                                    <>
                                        <Statistic
                                            title="总超时费用"
                                            value={reportData.systemStats.totalTimeoutFees}
                                            precision={2}
                                            prefix="¥"
                                            valueStyle={{ color: '#722ed1' }}
                                        />
                                        <Divider />
                                        <p>高风险区域: {reportData.systemStats.highRiskRegion || "无"}</p>
                                        <p>高风险时段: {reportData.systemStats.highRiskHour ? `${reportData.systemStats.highRiskHour}:00` : "无"}</p>
                                    </>
                                ) : (
                                    <Empty description="暂无系统统计数据" />
                                )}
                            </Card>
                        </Col>

                        <Col xs={24} md={12}>
                            <Card title="高风险用户" size="small">
                                {reportData.topTimeoutUsers && reportData.topTimeoutUsers.length > 0 ? (
                                    <List
                                        dataSource={reportData.topTimeoutUsers.slice(0, 5)}
                                        renderItem={user => (
                                            <List.Item>
                                                <List.Item.Meta
                                                    title={`用户ID: ${user.userId}`}
                                                    description={`超时率: ${(user.overallTimeoutRate * 100).toFixed(2)}%`}
                                                />
                                                <div>
                                                    超时次数: {user.timeoutCount}
                                                </div>
                                            </List.Item>
                                        )}
                                    />
                                ) : (
                                    <Empty description="暂无高风险用户数据" />
                                )}
                            </Card>
                        </Col>
                    </Row>

                    <Card title="系统建议" size="small" style={{ marginTop: 16 }}>
                        {reportData.recommendations && reportData.recommendations.length > 0 ? (
                            <List
                                dataSource={reportData.recommendations}
                                renderItem={recommendation => (
                                    <List.Item>
                                        <Typography.Text>{recommendation}</Typography.Text>
                                    </List.Item>
                                )}
                            />
                        ) : (
                            <Empty description="暂无系统建议数据" />
                        )}
                    </Card>
                </Card>
            </div>
        );
    }, [reportData, reportLoading]);

    // 添加渲染超时建议的函数
    const renderRecommendationsData = useCallback(() => {
        if (recommendationsLoading) {
            return <Skeleton active paragraph={{ rows: 6 }} />;
        }

        if (!recommendationsData || !recommendationsData.recommendations) {
            return (
                <Empty
                    description="暂无超时建议数据"
                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                />
            );
        }

        return (
            <div className={styles.recommendationsContainer}>
                <Card
                    title={
                        <span>
                        <BulbOutlined style={{ color: '#faad14', marginRight: 8 }} />
                        系统优化建议
                    </span>
                    }
                    extra={`生成时间: ${new Date().toLocaleString()}`}
                >
                    <div className={styles.recommendationsPeriod}>
                        <p>建议周期: {new Date(recommendationsData.period.startTime).toLocaleDateString()} 至 {new Date(recommendationsData.period.endTime).toLocaleDateString()}</p>
                    </div>

                    <Alert
                        message="系统优化建议"
                        description="以下是基于系统数据分析得出的优化建议，可以帮助提高整体配送效率，减少超时率。"
                        type="info"
                        showIcon
                        style={{ marginBottom: 16 }}
                    />

                    <List
                        dataSource={recommendationsData.recommendations}
                        renderItem={(recommendation, index) => {
                            // 提取建议中的风险级别标签（如果有）
                            const match = recommendation.match(/【(.+?)】/);
                            const tag = match ? match[1] : null;

                            // 根据标签设置不同的颜色
                            let tagColor = 'blue';
                            if (tag) {
                                if (tag.includes('高风险') || tag.includes('极高风险') || tag.includes('严重')) {
                                    tagColor = 'red';
                                } else if (tag.includes('中等') || tag.includes('警告')) {
                                    tagColor = 'orange';
                                } else if (tag.includes('低风险') || tag.includes('提醒')) {
                                    tagColor = 'green';
                                }
                            }

                            return (
                                <List.Item>
                                    <List.Item.Meta
                                        title={
                                            <div>
                                                {tag && <Tag color={tagColor}>{tag}</Tag>}
                                                <Typography.Text strong>建议 {index + 1}</Typography.Text>
                                            </div>
                                        }
                                        description={recommendation.replace(/【.+?】/, '')}
                                    />
                                </List.Item>
                            );
                        }}
                    />
                </Card>
            </div>
        );
    }, [recommendationsData, recommendationsLoading]);

    // 初始加载高级分析数据
    useEffect(() => {
        // 只有管理员视图才需要加载这些高级数据
        if (activeTab === 'riskAnalysis' && !riskAnalysisData && !riskAnalysisLoading) {
            loadRiskAnalysisData();
        } else if (activeTab === 'regionAnalysis' && !regionAnalysisData && !regionAnalysisLoading) {
            loadRegionAnalysisData();
        } else if (activeTab === 'timeAnalysis' && !timeAnalysisData && !timeAnalysisLoading) {
            loadTimeAnalysisData();
        } else if (activeTab === 'trendAlerts' && !trendAlertsData && !trendAlertsLoading) {
            loadTrendAlertsData();
        } else if (activeTab === 'serviceRisk' && !serviceRiskData && !serviceRiskLoading) {
            loadServiceRiskData();
        } else if (activeTab === 'costAnalysis' && !costAnalysisData && !costAnalysisLoading) {
            loadCostAnalysisData();
        } else if (activeTab === 'highRiskUsers' && !highRiskUsersData && !highRiskUsersLoading) {
            loadHighRiskUsersData();
        } else if (activeTab === 'userRanking' && userRankings.length === 0 && !userRankingsLoading) {
            loadUserRankings();
        } else if (activeTab === 'timeoutReport' && !reportData && !reportLoading) {
            loadReportData();
        } else if (activeTab === 'recommendations' && !recommendationsData && !recommendationsLoading) {
            loadRecommendationsData();
        }
    }, [
        activeTab,
        riskAnalysisData, riskAnalysisLoading, loadRiskAnalysisData,
        regionAnalysisData, regionAnalysisLoading, loadRegionAnalysisData,
        timeAnalysisData, timeAnalysisLoading, loadTimeAnalysisData,
        trendAlertsData, trendAlertsLoading, loadTrendAlertsData,
        serviceRiskData, serviceRiskLoading, loadServiceRiskData,
        costAnalysisData, costAnalysisLoading, loadCostAnalysisData,
        highRiskUsersData, highRiskUsersLoading, loadHighRiskUsersData,
        userRankings, userRankingsLoading, loadUserRankings,
        reportData, reportLoading, loadReportData,
        recommendationsData, recommendationsLoading, loadRecommendationsData
    ]);

    // 数据错误重置定时器
    useEffect(() => {
        let timer;
        if (dataError) {
            timer = setTimeout(() => {
                setDataError(false);
            }, 5000);
        }
        return () => {
            if (timer) clearTimeout(timer);
        };
    }, [dataError]);

    // 时间段选择回调
    const handlePeriodChange = useCallback((startTime, endTime) => {
        // 更新当前时间范围
        setCurrentTimeRange({ startTime, endTime });

        // 保存当前数据为上一时段数据
        if (systemStatistics) {
            setPreviousSystemStats(systemStatistics);
        }

        if (globalStatistics) {
            setPreviousGlobalStats(globalStatistics);
        }

        // 请求新时段的数据
        requestStatistics('system', startTime, endTime);
        requestStatistics('global', startTime, endTime);

        // 根据当前选中的标签页刷新相应数据
        if (activeTab === 'riskAnalysis') {
            loadRiskAnalysisData();
        } else if (activeTab === 'regionAnalysis') {
            loadRegionAnalysisData();
        } else if (activeTab === 'timeAnalysis') {
            loadTimeAnalysisData();
        } else if (activeTab === 'trendAlerts') {
            loadTrendAlertsData();
        } else if (activeTab === 'serviceRisk') {
            loadServiceRiskData();
        } else if (activeTab === 'costAnalysis') {
            loadCostAnalysisData();
        } else if (activeTab === 'highRiskUsers') {
            loadHighRiskUsersData();
        } else if (activeTab === 'userRanking') {
            loadUserRankings(0, rankingPagination.pageSize);
        } else if (activeTab === 'timeoutReport') {
            loadReportData();
        } else if (activeTab === 'recommendations') {
            loadRecommendationsData();
        }
    }, [
        systemStatistics, globalStatistics, requestStatistics,
        activeTab, loadRiskAnalysisData, loadRegionAnalysisData,
        loadTimeAnalysisData, loadTrendAlertsData,
        loadServiceRiskData, loadCostAnalysisData,
        loadHighRiskUsersData, loadUserRankings,
        rankingPagination.pageSize,
        loadReportData,
        loadRecommendationsData
    ]);

    // 获取统计摘要
    const summary = currentStats ?
        timeoutStatsFormatter.formatStatisticsSummary(currentStats, previousStats) : null;

    // 连接状态警告
    const renderConnectionStatus = useCallback(() => {
        const current = connectionStatus[activeStatType];
        const hasCurrentTypeData = activeStatType === 'system' ?
            (systemStatistics && Object.keys(systemStatistics).length > 0) :
            (globalStatistics && Object.keys(globalStatistics).length > 0);

        if ((current === 'connected' || current === 'authenticated') && hasCurrentTypeData) {
            return null;
        }

        if ((current === 'connected' || current === 'authenticated') && !hasCurrentTypeData) {
            return (
                <Alert
                    message={`正在加载${activeStatType === 'system' ? '系统' : '全局'}超时统计数据...`}
                    type="info"
                    showIcon
                    className={styles.statusAlert}
                    action={
                        <Button size="small" type="primary" onClick={refreshData}>
                            <ReloadOutlined />刷新
                        </Button>
                    }
                />
            );
        }

        if (current === 'connecting') {
            return (
                <Alert
                    message={`正在连接${activeStatType === 'system' ? '系统' : '全局'}超时统计服务...`}
                    type="info"
                    showIcon
                    className={styles.statusAlert}
                />
            );
        }

        if (current === 'error' || dataError) {
            return (
                <Alert
                    message={`连接${activeStatType === 'system' ? '系统' : '全局'}超时统计服务失败，请刷新页面重试`}
                    type="error"
                    showIcon
                    className={styles.statusAlert}
                    action={
                        <Button size="small" danger onClick={() => window.location.reload()}>
                            刷新页面
                        </Button>
                    }
                />
            );
        }

        return (
            <Alert
                message={`${activeStatType === 'system' ? '系统' : '全局'}超时统计服务未连接`}
                type="warning"
                showIcon
                className={styles.statusAlert}
                action={
                    <Button size="small" onClick={refreshData}>
                        <SyncOutlined />重试连接
                    </Button>
                }
            />
        );
    }, [activeStatType, connectionStatus, systemStatistics, globalStatistics, dataError, refreshData]);

    // 渲染统计卡片
    const renderStatisticsCards = useCallback(() => {
        const isDataLoading = isLoading || refreshing ||
            (connectionStatus[activeStatType] === 'connected' && !summary);

        if (!summary || isDataLoading) {
            return (
                <div className={styles.cardsContainer}>
                    {[1, 2, 3, 4].map(i => (
                        <div className={styles.timeoutCard} key={i}>
                            <Skeleton active paragraph={{ rows: 2 }} />
                        </div>
                    ))}
                </div>
            );
        }

        return (
            <div className={styles.cardsContainer}>
                <TimeoutStatisticsCard
                    title="总超时次数"
                    value={summary.totalTimeouts}
                    previousValue={previousStats ?
                        timeoutStatsFormatter.calculateTotalTimeouts(previousStats) : null}
                    icon="warning"
                    color="#faad14"
                    loading={isLoading || refreshing}
                    tooltip={`所有${activeStatType === 'system' ? '系统内' : '全平台'}超时的总次数`}
                />

                <TimeoutStatisticsCard
                    title="取件超时"
                    value={summary.pickupTimeouts}
                    previousValue={safeAccess(previousStats, 'timeoutCounts.PICKUP')}
                    icon="pickup"
                    color="#1890ff"
                    loading={isLoading || refreshing}
                    tooltip="未在规定时间内取件的次数"
                />

                <TimeoutStatisticsCard
                    title="配送超时"
                    value={summary.deliveryTimeouts}
                    previousValue={safeAccess(previousStats, 'timeoutCounts.DELIVERY')}
                    icon="delivery"
                    color="#ff4d4f"
                    loading={isLoading || refreshing}
                    tooltip="未在规定时间内送达的次数"
                />

                <TimeoutStatisticsCard
                    title="平均超时率"
                    value={summary.averageTimeoutRate}
                    previousValue={safeAccess(previousStats, 'averageTimeoutRate')}
                    icon="confirmation"
                    color="#52c41a"
                    loading={isLoading || refreshing}
                    tooltip="超时订单占总订单的比例"
                />
            </div>
        );
    }, [summary, previousStats, isLoading, refreshing, connectionStatus, activeStatType, safeAccess]);

    // 用户排行榜表格列配置
    const userRankingsColumns = [
        {
            title: '排名',
            dataIndex: 'rank',
            key: 'rank',
            render: (_, __, index) => index + 1 + ((rankingPagination.current - 1) * rankingPagination.pageSize)
        },
        {
            title: '用户ID',
            dataIndex: 'userId',
            key: 'userId'
        },
        {
            title: '用户名',
            dataIndex: 'username',
            key: 'username'
        },
        {
            title: '取件超时',
            dataIndex: 'pickupTimeouts',
            key: 'pickupTimeouts',
            sorter: true
        },
        {
            title: '配送超时',
            dataIndex: 'deliveryTimeouts',
            key: 'deliveryTimeouts',
            sorter: true
        },
        {
            title: '总超时次数',
            dataIndex: 'totalTimeouts',
            key: 'totalTimeouts',
            defaultSortOrder: 'descend',
            sorter: true
        },
        {
            title: '超时率',
            dataIndex: 'timeoutRate',
            key: 'timeoutRate',
            render: (rate) => `${(rate * 100).toFixed(2)}%`,
            sorter: true
        },
        {
            title: '风险等级',
            key: 'riskLevel',
            render: (_, record) => {
                // 基于超时率确定风险等级
                const rate = record.timeoutRate * 100;
                let color = 'green';
                let text = '低';

                if (rate > 20) {
                    color = 'red';
                    text = '高';
                } else if (rate > 10) {
                    color = 'orange';
                    text = '中';
                }

                return <Tag color={color}>{text}</Tag>;
            }
        }
    ];

    // 渲染用户统计搜索结果
    const renderUserStatsResult = useCallback(() => {
        if (!searchedUserId) {
            return null;
        }

        if (userStatsLoading) {
            return <Skeleton active paragraph={{ rows: 4 }} />;
        }

        if (!userStats) {
            return (
                <Alert
                    message={`未找到用户ID: ${searchedUserId}的统计数据`}
                    type="warning"
                    showIcon
                />
            );
        }

        const userSummary = timeoutStatsFormatter.formatStatisticsSummary(userStats);

        return (
            <div className={styles.userStatsResult}>
                <h3>用户 {searchedUserId} 的超时统计</h3>

                <Row gutter={[16, 16]}>
                    <Col xs={24} sm={12} md={6}>
                        <TimeoutStatisticsCard
                            title="总超时次数"
                            value={userSummary.totalTimeouts}
                            icon="warning"
                            color="#faad14"
                        />
                    </Col>

                    <Col xs={24} sm={12} md={6}>
                        <TimeoutStatisticsCard
                            title="取件超时"
                            value={userSummary.pickupTimeouts}
                            icon="pickup"
                            color="#1890ff"
                        />
                    </Col>

                    <Col xs={24} sm={12} md={6}>
                        <TimeoutStatisticsCard
                            title="配送超时"
                            value={userSummary.deliveryTimeouts}
                            icon="delivery"
                            color="#ff4d4f"
                        />
                    </Col>

                    <Col xs={24} sm={12} md={6}>
                        <TimeoutStatisticsCard
                            title="平均超时率"
                            value={userSummary.averageTimeoutRate}
                            icon="confirmation"
                            color="#52c41a"
                        />
                    </Col>
                </Row>

                <TimeoutChartSection
                    statistics={userStats}
                    title={`用户 ${searchedUserId} 的超时趋势`}
                />
            </div>
        );
    }, [searchedUserId, userStats, userStatsLoading]);

    // 渲染时间分析数据 - 修改后的安全版本
    const renderTimeAnalysisData = useCallback(() => {
        if (timeAnalysisLoading) {
            return <Skeleton active paragraph={{ rows: 6 }} />;
        }

        if (!timeAnalysisData) {
            return (
                <Empty
                    description="暂无时间分析数据"
                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                />
            );
        }

        // 提取时间分布数据，添加防御性编程，确保数据存在
        const hourlyDistribution = timeAnalysisData.hourlyDistribution || {};
        const weekdayDistribution = timeAnalysisData.weekdayDistribution || {};
        const peakHours = Array.isArray(timeAnalysisData.peakHours) ? timeAnalysisData.peakHours : [];
        const highRiskHour = timeAnalysisData.highRiskHour;

        // 检查是否有实际的时间分布数据
        const hasTimeData = Object.keys(hourlyDistribution).length > 0 &&
            Object.values(hourlyDistribution).some(count => count > 0);

        // 处理小时分布数据
        const hourlyData = Object.entries(hourlyDistribution).map(([hour, count]) => ({
            hour: `${hour}:00`,
            count: count || 0,
            isPeak: peakHours.includes(parseInt(hour, 10)),
            isHighRisk: parseInt(hour, 10) === parseInt(highRiskHour, 10)
        })).sort((a, b) => parseInt(a.hour, 10) - parseInt(b.hour, 10));

        // 处理星期分布数据
        const weekdayData = Object.entries(weekdayDistribution).map(([day, count]) => ({
            day,
            count: count || 0
        }));

        return (
            <div className={styles.timeAnalysisContainer}>
                <Row gutter={[16, 16]}>
                    <Col xs={24} md={12}>
                        <Card
                            title={
                                <span>
                                    <ClockCircleOutlined style={{ color: '#1890ff', marginRight: 8 }} />
                                    时段超时分布
                                </span>
                            }
                            className={styles.hourlyDistributionCard}
                        >
                            {hasTimeData ? (
                                <>
                                    <Statistic
                                        title="高峰时段"
                                        value={peakHours.length > 0
                                            ? peakHours.map(hour => `${hour}:00-${hour+1}:00`).join(', ')
                                            : "暂无高峰时段"}
                                        valueStyle={{ color: '#1890ff', fontSize: 18 }}
                                    />

                                    {/* 高风险时段提示 - 修复后的代码 */}
                                    {(() => {
                                        // 转换为数字并验证
                                        const hourValue = Number(highRiskHour);

                                        // 检查是否为有效的小时值（0-23之间的整数）
                                        const isValidHour = !isNaN(hourValue) &&
                                            Number.isInteger(hourValue) &&
                                            hourValue >= 0 &&
                                            hourValue < 24;

                                        if (isValidHour) {
                                            return (
                                                <Alert
                                                    message={`高风险时段: ${hourValue}:00-${hourValue+1}:00`}
                                                    description="该时段超时率显著高于其他时段，建议增加该时段的配送员调度"
                                                    type="error"
                                                    showIcon
                                                    style={{ margin: '16px 0' }}
                                                />
                                            );
                                        } else {
                                            return (
                                                <Alert
                                                    message="未检测到明显的高风险时段"
                                                    description="各时段超时率分布相对均匀，建议保持当前配送资源配置"
                                                    type="info"
                                                    showIcon
                                                    style={{ margin: '16px 0' }}
                                                />
                                            );
                                        }
                                    })()}

                                    <Table
                                        dataSource={hourlyData}
                                        columns={[
                                            {
                                                title: '时段',
                                                dataIndex: 'hour',
                                                key: 'hour',
                                                render: (hour, record) => (
                                                    <span>
                                                        {hour}-{parseInt(hour, 10) + 1}:00
                                                        {record.isPeak &&
                                                            <Tag color="blue" style={{ marginLeft: 8 }}>高峰</Tag>
                                                        }
                                                        {record.isHighRisk &&
                                                            <Tag color="red" style={{ marginLeft: 8 }}>高风险</Tag>
                                                        }
                                                    </span>
                                                )
                                            },
                                            {
                                                title: '超时次数',
                                                dataIndex: 'count',
                                                key: 'count',
                                                sorter: (a, b) => a.count - b.count,
                                                defaultSortOrder: 'descend'
                                            }
                                        ]}
                                        size="small"
                                        pagination={false}
                                        scroll={{ y: 300 }}
                                    />
                                </>
                            ) : (
                                <Empty
                                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                                    description="暂无时间分布数据"
                                />
                            )}
                        </Card>
                    </Col>

                    <Col xs={24} md={12}>
                        <Card
                            title={
                                <span>
                                    <AreaChartOutlined style={{ color: '#722ed1', marginRight: 8 }} />
                                    星期超时分布
                                </span>
                            }
                            className={styles.weekdayDistributionCard}
                        >
                            {hasTimeData && weekdayData.length > 0 ? (
                                <>
                                    <Table
                                        dataSource={weekdayData}
                                        columns={[
                                            {
                                                title: '星期',
                                                dataIndex: 'day',
                                                key: 'day',
                                                render: (day) => {
                                                    // 转换英文星期为中文
                                                    const dayMap = {
                                                        'MONDAY': '星期一',
                                                        'TUESDAY': '星期二',
                                                        'WEDNESDAY': '星期三',
                                                        'THURSDAY': '星期四',
                                                        'FRIDAY': '星期五',
                                                        'SATURDAY': '星期六',
                                                        'SUNDAY': '星期日'
                                                    };
                                                    return dayMap[day] || day;
                                                }
                                            },
                                            {
                                                title: '超时次数',
                                                dataIndex: 'count',
                                                key: 'count',
                                                sorter: (a, b) => a.count - b.count,
                                                defaultSortOrder: 'descend'
                                            }
                                        ]}
                                        size="small"
                                        pagination={false}
                                    />

                                    <div style={{ marginTop: 16 }}>
                                        <Paragraph>
                                            <Title level={5}>时间分析总结</Title>
                                            <ul>
                                                {peakHours && peakHours.length > 0 && (
                                                    <li>超时高峰时段主要集中在 {peakHours.map(hour => `${hour}:00-${hour+1}:00`).join(', ')}，建议这些时段增加配送资源。</li>
                                                )}
                                                {(() => {
                                                    const hourValue = Number(highRiskHour);
                                                    const isValidHour = !isNaN(hourValue) &&
                                                        Number.isInteger(hourValue) &&
                                                        hourValue >= 0 &&
                                                        hourValue < 24;

                                                    if (isValidHour) {
                                                        return (
                                                            <li>特别注意 {hourValue}:00-{hourValue+1}:00 时段，超时风险显著高于其他时段。</li>
                                                        );
                                                    }
                                                    return null;
                                                })()}
                                                <li>建议根据时段分布合理安排配送员班次和数量。</li>
                                            </ul>
                                        </Paragraph>
                                    </div>
                                </>
                            ) : (
                                <Empty
                                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                                    description="暂无星期分布数据"
                                />
                            )}
                        </Card>
                    </Col>
                </Row>

                <Card title="时间分析总结" style={{ marginTop: 16 }}>
                    {hasTimeData ? (
                        <ul>
                            {(() => {
                                const hourValue = Number(highRiskHour);
                                const isValidHour = !isNaN(hourValue) &&
                                    Number.isInteger(hourValue) &&
                                    hourValue >= 0 &&
                                    hourValue < 24;

                                if (isValidHour) {
                                    return (
                                        <li>特别注意 {hourValue}:00-{hourValue+1}:00 时段，超时风险显著高于其他时段。</li>
                                    );
                                }
                                return <li>未检测到明显的高风险时段，各时段超时率分布相对均匀。</li>;
                            })()}
                            <li>建议根据时段分布合理安排配送员班次和数量。</li>
                        </ul>
                    ) : (
                        <Empty
                            image={Empty.PRESENTED_IMAGE_SIMPLE}
                            description="暂无足够数据进行时间分析"
                        />
                    )}
                </Card>
            </div>
        );
    }, [timeAnalysisData, timeAnalysisLoading]);

    // 渲染风险分析数据
    const renderRiskAnalysisData = useCallback(() => {
        if (riskAnalysisLoading) {
            return <Skeleton active paragraph={{ rows: 6 }} />;
        }

        if (!riskAnalysisData) {
            return (
                <Empty
                    description="暂无风险分析数据"
                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                />
            );
        }

        // 提取高风险模式数据，防御性编程避免空值错误
        const highRiskPatterns = Array.isArray(safeAccess(riskAnalysisData, 'highRiskPatterns')) ?
            safeAccess(riskAnalysisData, 'highRiskPatterns', []) : [];
        const isHighRiskState = safeAccess(riskAnalysisData, 'isHighRiskState', false);
        const highRiskRegion = safeAccess(riskAnalysisData, 'highRiskRegion', '未知');
        const highRiskHour = safeAccess(riskAnalysisData, 'highRiskHour');
        const serviceRiskAnalysis = safeAccess(riskAnalysisData, 'serviceRiskAnalysis', {});

        return (
            <div className={styles.riskAnalysisContainer}>
                <Row gutter={[16, 16]}>
                    <Col xs={24} md={12}>
                        <Card
                            title={
                                <span>
                                    <WarningOutlined style={{ color: '#ff4d4f', marginRight: 8 }} />
                                    系统风险状态
                                </span>
                            }
                            className={styles.riskCard}
                        >
                            <Statistic
                                title="系统风险级别"
                                value={isHighRiskState ? "高风险" : "正常"}
                                valueStyle={{
                                    color: isHighRiskState ? '#ff4d4f' : '#52c41a',
                                    fontSize: 24
                                }}
                                prefix={isHighRiskState ? <AlertOutlined /> : null}
                            />

                            {isHighRiskState && (
                                <Alert
                                    message="系统当前处于高风险状态，建议及时介入处理"
                                    type="error"
                                    showIcon
                                    style={{ marginTop: 16 }}
                                />
                            )}

                            <Divider />

                            <div className={styles.riskDetails}>
                                <p><strong>高风险区域:</strong> {highRiskRegion || "无"}</p>
                                <p><strong>高风险时段:</strong> {
                                    (() => {
                                        const hourValue = Number(highRiskHour);
                                        const isValidHour = !isNaN(hourValue) &&
                                            Number.isInteger(hourValue) &&
                                            hourValue >= 0 &&
                                            hourValue < 24;

                                        return isValidHour ?
                                            `${hourValue}:00-${hourValue+1}:00` :
                                            "无";
                                    })()
                                }</p>
                            </div>
                        </Card>
                    </Col>

                    <Col xs={24} md={12}>
                        <Card
                            title={
                                <span>
                                    <AlertOutlined style={{ color: '#faad14', marginRight: 8 }} />
                                    风险模式识别
                                </span>
                            }
                            className={styles.riskPatternsCard}
                        >
                            {highRiskPatterns.length > 0 ? (
                                <List
                                    dataSource={highRiskPatterns}
                                    renderItem={pattern => (
                                        <List.Item>
                                            <List.Item.Meta
                                                title={
                                                    <div>
                                                        <Badge
                                                            status={safeAccess(pattern, 'isUrgent', false) ? "error" : "warning"}
                                                        />
                                                        <span style={{ marginLeft: 8 }}>{safeAccess(pattern, 'pattern', '未知模式')}</span>
                                                        <Tag
                                                            color={
                                                                safeAccess(pattern, 'riskLevel', 0) > 0.8 ? "red" :
                                                                    safeAccess(pattern, 'riskLevel', 0) > 0.5 ? "orange" : "blue"
                                                            }
                                                            style={{ marginLeft: 8 }}
                                                        >
                                                            {safeAccess(pattern, 'riskLevelDescription', '未知风险')}
                                                        </Tag>
                                                    </div>
                                                }
                                                description={safeAccess(pattern, 'description', '')}
                                            />
                                            <div>
                                                发生次数: {safeAccess(pattern, 'occurrence', 0)}
                                            </div>
                                        </List.Item>
                                    )}
                                />
                            ) : (
                                <Empty description="未检测到明显风险模式" />
                            )}
                        </Card>
                    </Col>
                </Row>

                <Card
                    title="服务风险分析"
                    className={styles.serviceRiskCard}
                    style={{ marginTop: 16 }}
                >
                    <Row gutter={[16, 16]}>
                        {Object.entries(serviceRiskAnalysis).map(([serviceType, riskInfo]) => (
                            <Col xs={24} sm={12} md={8} key={serviceType}>
                                <Card
                                    title={serviceType}
                                    size="small"
                                    className={styles.serviceTypeCard}
                                >
                                    <p>
                                        <strong>超时率:</strong> {((safeAccess(riskInfo, 'timeoutRate', 0) * 100).toFixed(2))}%
                                        {safeAccess(riskInfo, 'hasHighTimeoutRate', false) &&
                                            <Tag color="red" style={{ marginLeft: 8 }}>偏高</Tag>
                                        }
                                    </p>
                                    <p><strong>平均超时费用:</strong> ¥{safeAccess(riskInfo, 'averageTimeoutFee', 0).toFixed(2)}</p>
                                    <p><strong>订单数:</strong> {safeAccess(riskInfo, 'orderCount', 0)}</p>
                                    <p><strong>超时数:</strong> {safeAccess(riskInfo, 'timeoutCount', 0)}</p>
                                    <Progress
                                        percent={(safeAccess(riskInfo, 'timeoutRate', 0) * 100).toFixed(1)}
                                        size="small"
                                        status={safeAccess(riskInfo, 'hasHighTimeoutRate', false) ? "exception" : "active"}
                                    />
                                </Card>
                            </Col>
                        ))}
                    </Row>
                </Card>
            </div>
        );
    }, [riskAnalysisData, riskAnalysisLoading, safeAccess]);

    // 渲染区域分析数据
    const renderRegionAnalysisData = useCallback(() => {
        if (regionAnalysisLoading) {
            return <Skeleton active paragraph={{ rows: 6 }} />;
        }

        if (!regionAnalysisData) {
            return (
                <Empty
                    description="暂无区域分析数据"
                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                />
            );
        }

        // 提取区域数据，增加防御性编程
        const timeoutCounts = safeAccess(regionAnalysisData, 'timeoutCounts', {});
        const timeoutRates = safeAccess(regionAnalysisData, 'timeoutRates', {});
        const highRiskRegions = safeAccess(regionAnalysisData, 'highRiskRegions', []);
        const mostTimeoutRegion = safeAccess(regionAnalysisData, 'mostTimeoutRegion', '未知');

        return (
            <div className={styles.regionAnalysisContainer}>
                <Row gutter={[16, 16]}>
                    <Col xs={24} md={12}>
                        <Card
                            title={
                                <span>
                                    <EnvironmentOutlined style={{ color: '#ff4d4f', marginRight: 8 }} />
                                    区域超时分布
                                </span>
                            }
                            className={styles.regionDistributionCard}
                        >
                            <Statistic
                                title="最高超时区域"
                                value={mostTimeoutRegion || "暂无数据"}
                                valueStyle={{ color: '#ff4d4f', fontSize: 24 }}
                            />

                            <Divider />

                            <div className={styles.regionCountsTable}>
                                <h4>区域超时次数</h4>
                                <Table
                                    dataSource={Object.entries(timeoutCounts).map(([region, count]) => ({
                                        region,
                                        count,
                                        isHighRisk: highRiskRegions.includes(region)
                                    }))}
                                    columns={[
                                        {
                                            title: '区域',
                                            dataIndex: 'region',
                                            key: 'region',
                                            render: (text, record) => (
                                                <span>
                                                    {text}
                                                    {record.isHighRisk &&
                                                        <Tag color="red" style={{ marginLeft: 8 }}>高风险</Tag>
                                                    }
                                                </span>
                                            )
                                        },
                                        {
                                            title: '超时次数',
                                            dataIndex: 'count',
                                            key: 'count',
                                            sorter: (a, b) => a.count - b.count,
                                            defaultSortOrder: 'descend'
                                        }
                                    ]}
                                    size="small"
                                    pagination={false}
                                />
                            </div>
                        </Card>
                    </Col>

                    <Col xs={24} md={12}>
                        <Card
                            title={
                                <span>
                                    <HeatMapOutlined style={{ color: '#faad14', marginRight: 8 }} />
                                    区域超时率分析
                                </span>
                            }
                            className={styles.regionRatesCard}
                        >
                            {highRiskRegions && highRiskRegions.length > 0 ? (
                                <div>
                                    <Alert
                                        message={`检测到 ${highRiskRegions.length} 个高风险区域`}
                                        description={`${highRiskRegions.join('、')} 区域超时率较高，建议加强管理`}
                                        type="warning"
                                        showIcon
                                        style={{ marginBottom: 16 }}
                                    />

                                    <Table
                                        dataSource={Object.entries(timeoutRates).map(([region, rate]) => ({
                                            region,
                                            rate,
                                            isHighRisk: highRiskRegions.includes(region)
                                        }))}
                                        columns={[
                                            {
                                                title: '区域',
                                                dataIndex: 'region',
                                                key: 'region'
                                            },
                                            {
                                                title: '超时率',
                                                dataIndex: 'rate',
                                                key: 'rate',
                                                render: (rate) => `${(rate * 100).toFixed(2)}%`,
                                                sorter: (a, b) => a.rate - b.rate,
                                                defaultSortOrder: 'descend'
                                            },
                                            {
                                                title: '风险级别',
                                                key: 'riskLevel',
                                                render: (_, record) => (
                                                    <Tag color={record.isHighRisk ? 'red' : 'green'}>
                                                        {record.isHighRisk ? '高风险' : '正常'}
                                                    </Tag>
                                                )
                                            }
                                        ]}
                                        size="small"
                                        pagination={false}
                                    />
                                </div>
                            ) : (
                                <Empty description="未检测到高风险区域" />
                            )}
                        </Card>
                    </Col>
                </Row>
            </div>
        );
    }, [regionAnalysisData, regionAnalysisLoading, safeAccess]);

    // 渲染趋势预警数据
    const renderTrendAlertsData = useCallback(() => {
        if (trendAlertsLoading) {
            return <Skeleton active paragraph={{ rows: 6 }} />;
        }

        if (!trendAlertsData) {
            return (
                <Empty
                    description="暂无趋势预警数据"
                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                />
            );
        }

        // 提取趋势数据
        const significantTrends = safeAccess(trendAlertsData, 'significantTrends', []);
        const increasingTrends = safeAccess(trendAlertsData, 'increasingTrends', []);
        const trendDescriptions = safeAccess(trendAlertsData, 'trendDescriptions', {});

        return (
            <div className={styles.trendAlertsContainer}>
                <Row gutter={[16, 16]}>
                    <Col xs={24}>
                        <Card
                            title={
                                <span>
                                    <AlertOutlined style={{ color: '#faad14', marginRight: 8 }} />
                                    超时趋势预警
                                </span>
                            }
                            className={styles.trendAlertsCard}
                        >
                            {significantTrends && significantTrends.length > 0 ? (
                                <>
                                    {increasingTrends && increasingTrends.length > 0 && (
                                        <Alert
                                            message={`检测到 ${increasingTrends.length} 个上升趋势`}
                                            description="系统检测到超时率显著上升的趋势，建议密切关注"
                                            type="error"
                                            showIcon
                                            style={{ marginBottom: 16 }}
                                        />
                                    )}

                                    <Table
                                        dataSource={significantTrends}
                                        columns={[
                                            {
                                                title: '时间段',
                                                dataIndex: 'timeFrame',
                                                key: 'timeFrame'
                                            },
                                            {
                                                title: '超时率',
                                                dataIndex: 'timeoutRate',
                                                key: 'timeoutRate',
                                                render: (rate) => `${(rate * 100).toFixed(2)}%`
                                            },
                                            {
                                                title: '变化率',
                                                dataIndex: 'changeRate',
                                                key: 'changeRate',
                                                render: (rate) => (
                                                    <span>
                                                        {rate > 0 ?
                                                            <RiseOutlined style={{ color: '#ff4d4f' }} /> :
                                                            <FallOutlined style={{ color: '#52c41a' }} />
                                                        }
                                                        <span style={{ marginLeft: 8 }}>
                                                            {Math.abs((rate * 100).toFixed(2))}%
                                                        </span>
                                                    </span>
                                                ),
                                                sorter: (a, b) => a.changeRate - b.changeRate,
                                                defaultSortOrder: 'descend'
                                            },
                                            {
                                                title: '趋势描述',
                                                key: 'description',
                                                render: (_, record) => {
                                                    const description = trendDescriptions?.[record.timeFrame] ||
                                                        (record.isIncreasing ? "上升趋势" : "下降趋势");

                                                    const color = record.isIncreasing ? "red" : "green";

                                                    return (
                                                        <Tag color={color}>
                                                            {description}
                                                        </Tag>
                                                    );
                                                }
                                            },
                                            {
                                                title: '平均费用',
                                                dataIndex: 'averageFee',
                                                key: 'averageFee',
                                                render: (fee) => `¥${parseFloat(fee || 0).toFixed(2)}`
                                            }
                                        ]}
                                        size="small"
                                        pagination={false}
                                    />
                                </>
                            ) : (
                                <Empty description="未检测到显著趋势变化" />
                            )}
                        </Card>
                    </Col>
                </Row>

                <Card
                    title="趋势分析建议"
                    className={styles.trendRecommendationsCard}
                    style={{ marginTop: 16 }}
                >
                    <div className={styles.recommendationsContent}>
                        <Paragraph>
                            <Title level={5}>系统建议</Title>
                            <ul>
                                {increasingTrends && increasingTrends.length > 0 ? (
                                    <>
                                        <li>系统检测到超时率呈上升趋势，建议及时采取干预措施。</li>
                                        <li>重点关注 {increasingTrends.map(t => t.timeFrame).join('、')} 时间段的超时情况。</li>
                                        <li>可能需要增加人员配置或优化配送路线。</li>
                                    </>
                                ) : significantTrends && significantTrends.length > 0 ? (
                                    <>
                                        <li>系统检测到超时率有显著变化，但总体趋势可控。</li>
                                        <li>建议继续监控 {significantTrends.map(t => t.timeFrame).join('、')} 时间段的超时情况。</li>
                                    </>
                                ) : (
                                    <li>当前超时率保持稳定，未检测到明显变化趋势。</li>
                                )}
                                <li>建议定期分析超时数据，调整资源配置策略。</li>
                            </ul>
                        </Paragraph>
                    </div>
                </Card>
            </div>
        );
    }, [trendAlertsData, trendAlertsLoading, safeAccess]);

    // 渲染服务风险分析数据
    const renderServiceRiskData = useCallback(() => {
        if (serviceRiskLoading) {
            return <Skeleton active paragraph={{ rows: 6 }} />;
        }

        if (!serviceRiskData) {
            return (
                <Empty
                    description="暂无服务风险分析数据"
                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                />
            );
        }

        // 提取服务风险数据
        const serviceRiskAnalysis = safeAccess(serviceRiskData, 'serviceRiskAnalysis', {});
        const isHighRiskState = safeAccess(serviceRiskData, 'isHighRiskState', false);
        const highRiskPatterns = safeAccess(serviceRiskData, 'highRiskPatterns', []);

        return (
            <div className={styles.serviceRiskContainer}>
                <Row gutter={[16, 16]}>
                    <Col xs={24}>
                        <Card
                            title={
                                <span>
                                    <WarningOutlined style={{ color: '#ff4d4f', marginRight: 8 }} />
                                    服务类型风险分析
                                </span>
                            }
                            className={styles.serviceRiskAnalysisCard}
                        >
                            {isHighRiskState && (
                                <Alert
                                    message="系统高风险警告"
                                    description="当前系统处于高风险状态，多个服务类型存在较高超时风险"
                                    type="error"
                                    showIcon
                                    style={{ marginBottom: 16 }}
                                />
                            )}

                            <Row gutter={[16, 16]}>
                                {Object.entries(serviceRiskAnalysis).map(([serviceType, riskInfo]) => (
                                    <Col xs={24} sm={12} md={8} lg={6} key={serviceType}>
                                        <Card
                                            title={
                                                <span>
                                                    {serviceType}
                                                    {safeAccess(riskInfo, 'hasHighTimeoutRate', false) &&
                                                        <Tag color="red" style={{ marginLeft: 8 }}>高风险</Tag>
                                                    }
                                                </span>
                                            }
                                            size="small"
                                            className={styles.serviceTypeRiskCard}
                                        >
                                            <Statistic
                                                title="超时率"
                                                value={`${(safeAccess(riskInfo, 'timeoutRate', 0) * 100).toFixed(2)}%`}
                                                valueStyle={{
                                                    color: safeAccess(riskInfo, 'hasHighTimeoutRate', false) ? '#ff4d4f' : '#1890ff',
                                                    fontSize: 18
                                                }}
                                            />

                                            <Row style={{ marginTop: 16 }}>
                                                <Col span={12}>
                                                    <Statistic
                                                        title="订单数"
                                                        value={safeAccess(riskInfo, 'orderCount', 0)}
                                                        valueStyle={{ fontSize: 16 }}
                                                    />
                                                </Col>
                                                <Col span={12}>
                                                    <Statistic
                                                        title="超时数"
                                                        value={safeAccess(riskInfo, 'timeoutCount', 0)}
                                                        valueStyle={{ fontSize: 16 }}
                                                    />
                                                </Col>
                                            </Row>

                                            <div style={{ marginTop: 16 }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                    <span>平均超时费用:</span>
                                                    <span>¥{parseFloat(safeAccess(riskInfo, 'averageTimeoutFee', 0)).toFixed(2)}</span>
                                                </div>
                                            </div>

                                            <Progress
                                                percent={(safeAccess(riskInfo, 'timeoutRate', 0) * 100).toFixed(1)}
                                                size="small"
                                                status={safeAccess(riskInfo, 'hasHighTimeoutRate', false) ? "exception" : "active"}
                                                style={{ marginTop: 16 }}
                                            />
                                        </Card>
                                    </Col>
                                ))}
                            </Row>
                        </Card>
                    </Col>
                </Row>

                <Card
                    title="风险模式识别"
                    className={styles.riskPatternsCard}
                    style={{ marginTop: 16 }}
                >
                    {highRiskPatterns && highRiskPatterns.length > 0 ? (
                        <List
                            dataSource={highRiskPatterns}
                            renderItem={pattern => (
                                <List.Item>
                                    <List.Item.Meta
                                        title={
                                            <div>
                                                <Badge
                                                    status={safeAccess(pattern, 'isUrgent', false) ? "error" : "warning"}
                                                />
                                                <span style={{ marginLeft: 8 }}>{safeAccess(pattern, 'pattern', '未知模式')}</span>
                                                <Tag
                                                    color={
                                                        safeAccess(pattern, 'riskLevel', 0) > 0.8 ? "red" :
                                                            safeAccess(pattern, 'riskLevel', 0) > 0.5 ? "orange" : "blue"
                                                    }
                                                    style={{ marginLeft: 8 }}
                                                >
                                                    {safeAccess(pattern, 'riskLevelDescription', '未知风险')}
                                                </Tag>
                                            </div>
                                        }
                                        description={safeAccess(pattern, 'description', '')}
                                    />
                                    <div>
                                        <Tooltip title="风险等级">
                                            <Progress
                                                percent={(safeAccess(pattern, 'riskLevel', 0) * 100).toFixed(1)}
                                                size="small"
                                                strokeColor={
                                                    safeAccess(pattern, 'riskLevel', 0) > 0.8 ? "#f5222d" :
                                                        safeAccess(pattern, 'riskLevel', 0) > 0.5 ? "#fa8c16" : "#1890ff"
                                                }
                                                style={{ width: 120 }}
                                            />
                                        </Tooltip>
                                    </div>
                                </List.Item>
                            )}
                        />
                    ) : (
                        <Empty description="未检测到明显风险模式" />
                    )}
                </Card>
            </div>
        );
    }, [serviceRiskData, serviceRiskLoading, safeAccess]);

    // 渲染成本分析数据
    const renderCostAnalysisData = useCallback(() => {
        if (costAnalysisLoading) {
            return <Skeleton active paragraph={{ rows: 6 }} />;
        }

        if (!costAnalysisData) {
            return (
                <Empty
                    description="暂无成本分析数据"
                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                />
            );
        }

        // 提取成本数据
        const totalTimeoutFees = safeAccess(costAnalysisData, 'totalTimeoutFees', 0);
        const averageTimeoutFees = safeAccess(costAnalysisData, 'averageTimeoutFees', {});
        const serviceBreakdown = safeAccess(costAnalysisData, 'serviceBreakdown', {});

        return (
            <div className={styles.costAnalysisContainer}>
                <Row gutter={[16, 16]}>
                    <Col xs={24} md={12}>
                        <Card
                            title={
                                <span>
                                    <DollarOutlined style={{ color: '#722ed1', marginRight: 8 }} />
                                    超时成本总览
                                </span>
                            }
                            className={styles.costOverviewCard}
                        >
                            <Statistic
                                title="总超时费用"
                                value={totalTimeoutFees}
                                precision={2}
                                valueStyle={{ color: '#722ed1', fontSize: 24 }}
                                prefix="¥"
                            />

                            <div style={{ marginTop: 24 }}>
                                <h4>平均超时费用</h4>
                                <Row gutter={[16, 16]}>
                                    {Object.entries(averageTimeoutFees).map(([serviceType, avgFee]) => (
                                        <Col xs={24} sm={12} key={serviceType}>
                                            <Card size="small">
                                                <Statistic
                                                    title={serviceType}
                                                    value={avgFee}
                                                    precision={2}
                                                    valueStyle={{ fontSize: 16 }}
                                                    prefix="¥"
                                                />
                                            </Card>
                                        </Col>
                                    ))}
                                </Row>
                            </div>
                        </Card>
                    </Col>

                    <Col xs={24} md={12}>
                        <Card
                            title={
                                <span>
                                    <AreaChartOutlined style={{ color: '#1890ff', marginRight: 8 }} />
                                    服务类型成本分析
                                </span>
                            }
                            className={styles.serviceBreakdownCard}
                        >
                            <Table
                                dataSource={Object.entries(serviceBreakdown).map(([type, data]) => ({
                                    type,
                                    timeoutCount: safeAccess(data, 'timeoutCount', 0),
                                    timeoutFees: safeAccess(data, 'timeoutFees', 0),
                                    averageFee: safeAccess(data, 'averageFee', 0)
                                }))}
                                columns={[
                                    {
                                        title: '服务类型',
                                        dataIndex: 'type',
                                        key: 'type'
                                    },
                                    {
                                        title: '超时次数',
                                        dataIndex: 'timeoutCount',
                                        key: 'timeoutCount',
                                        sorter: (a, b) => a.timeoutCount - b.timeoutCount
                                    },
                                    {
                                        title: '总费用',
                                        dataIndex: 'timeoutFees',
                                        key: 'timeoutFees',
                                        render: (fees) => `¥${parseFloat(fees).toFixed(2)}`,
                                        sorter: (a, b) => a.timeoutFees - b.timeoutFees,
                                        defaultSortOrder: 'descend'
                                    },
                                    {
                                        title: '平均费用',
                                        dataIndex: 'averageFee',
                                        key: 'averageFee',
                                        render: (fee) => `¥${parseFloat(fee).toFixed(2)}`
                                    }
                                ]}
                                size="small"
                                pagination={false}
                            />
                        </Card>
                    </Col>
                </Row>

                <Card
                    title="成本分析建议"
                    className={styles.costRecommendationsCard}
                    style={{ marginTop: 16 }}
                >
                    <div className={styles.recommendationsContent}>
                        <Paragraph>
                            <Title level={5}>成本优化建议</Title>
                            <ul>
                                {serviceBreakdown && Object.entries(serviceBreakdown).length > 0 ? (
                                    <>
                                        <li>
                                            最高成本服务类型为 {
                                            (() => {
                                                const sortedServices = Object.entries(serviceBreakdown)
                                                    .sort((a, b) => safeAccess(b[1], 'timeoutFees', 0) - safeAccess(a[1], 'timeoutFees', 0));
                                                return sortedServices.length > 0 ? sortedServices[0][0] : '未知';
                                            })()
                                        }，建议重点优化该类服务的配送效率。
                                        </li>
                                        <li>
                                            平均费用最高的服务类型为 {
                                            (() => {
                                                const sortedServices = Object.entries(serviceBreakdown)
                                                    .sort((a, b) => safeAccess(b[1], 'averageFee', 0) - safeAccess(a[1], 'averageFee', 0));
                                                return sortedServices.length > 0 ? sortedServices[0][0] : '未知';
                                            })()
                                        }，建议分析该类服务的超时原因。
                                        </li>
                                    </>
                                ) : (
                                    <li>暂无足够的成本数据进行分析。</li>
                                )}
                                <li>建议增加配送员的培训，提高服务效率，降低超时率。</li>
                                <li>优化订单分配算法，根据历史数据更合理地安排配送路线。</li>
                                <li>考虑在高峰时段适当增加配送价格，平衡供需关系。</li>
                            </ul>
                        </Paragraph>
                    </div>
                </Card>
            </div>
        );
    }, [costAnalysisData, costAnalysisLoading, safeAccess]);

    // 渲染高风险用户数据
    const renderHighRiskUsersData = useCallback(() => {
        if (highRiskUsersLoading) {
            return <Skeleton active paragraph={{ rows: 6 }} />;
        }

        if (!highRiskUsersData || !safeAccess(highRiskUsersData, 'users') ||
            !Array.isArray(safeAccess(highRiskUsersData, 'users')) ||
            safeAccess(highRiskUsersData, 'users', []).length === 0) {
            return (
                <Empty
                    description="暂无高风险用户数据"
                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                />
            );
        }

        // 提取高风险用户数据
        const users = safeAccess(highRiskUsersData, 'users', []);
        const totalCount = safeAccess(highRiskUsersData, 'totalCount', 0);
        const period = safeAccess(highRiskUsersData, 'period', {
            startTime: new Date().toISOString(),
            endTime: new Date().toISOString()
        });

        return (
            <div className={styles.highRiskUsersContainer}>
                <Row gutter={[16, 16]}>
                    <Col xs={24}>
                        <Card
                            title={
                                <span>
                                    <UserOutlined style={{ color: '#ff4d4f', marginRight: 8 }} />
                                    高风险用户列表
                                </span>
                            }
                            className={styles.highRiskUsersCard}
                            extra={`共 ${totalCount} 名高风险用户`}
                        >
                            <Alert
                                message="系统检测到高风险用户"
                                description={`在 ${new Date(period.startTime).toLocaleDateString()} 至 ${new Date(period.endTime).toLocaleDateString()} 期间，共有 ${totalCount} 名用户被判定为高风险用户，建议重点关注。`}
                                type="warning"
                                showIcon
                                style={{ marginBottom: 16 }}
                            />

                            <Table
                                dataSource={users.map(user => ({
                                    userId: safeAccess(user, 'userId'),
                                    totalTimeoutFees: safeAccess(user, 'totalTimeoutFees', 0),
                                    totalOrders: safeAccess(user, 'totalOrders', 0),
                                    timeoutRate: safeAccess(user, 'getOverallTimeoutRate', 0),
                                    timeoutCount: safeAccess(user, 'getTimeoutCount', 0)
                                }))}
                                columns={[
                                    {
                                        title: '用户ID',
                                        dataIndex: 'userId',
                                        key: 'userId'
                                    },
                                    {
                                        title: '总订单数',
                                        dataIndex: 'totalOrders',
                                        key: 'totalOrders'
                                    },
                                    {
                                        title: '超时次数',
                                        dataIndex: 'timeoutCount',
                                        key: 'timeoutCount',
                                        sorter: (a, b) => a.timeoutCount - b.timeoutCount,
                                        defaultSortOrder: 'descend'
                                    },
                                    {
                                        title: '超时率',
                                        dataIndex: 'timeoutRate',
                                        key: 'timeoutRate',
                                        render: (rate) => `${(rate * 100).toFixed(2)}%`,
                                        sorter: (a, b) => a.timeoutRate - b.timeoutRate
                                    },
                                    {
                                        title: '超时费用',
                                        dataIndex: 'totalTimeoutFees',
                                        key: 'totalTimeoutFees',
                                        render: (fees) => `¥${parseFloat(fees).toFixed(2)}`
                                    },
                                    {
                                        title: '操作',
                                        key: 'action',
                                        render: (_, record) => (
                                            <Button
                                                type="primary"
                                                size="small"
                                                onClick={() => {
                                                    setSearchText(record.userId.toString());
                                                    searchUserStats();
                                                    setActiveTab('userQuery');
                                                }}
                                            >
                                                查看详情
                                            </Button>
                                        )
                                    }
                                ]}
                                size="small"
                                pagination={{ pageSize: 10 }}
                            />
                        </Card>
                    </Col>
                </Row>

                <Card
                    title="风险管理建议"
                    className={styles.riskManagementCard}
                    style={{ marginTop: 16 }}
                >
                    <div className={styles.recommendationsContent}>
                        <Paragraph>
                            <Title level={5}>高风险用户管理建议</Title>
                            <ul>
                                <li>针对超时率超过20%的用户，建议进行电话回访，了解超时原因。</li>
                                <li>对于超时费用较高的用户，考虑调整服务策略和资源分配。</li>
                                <li>对高风险用户的订单优先安排经验丰富的配送员处理。</li>
                                <li>分析高风险用户的订单区域和时段特点，针对性地制定预防措施。</li>
                                <li>考虑对持续高风险的用户实施接单限制或调整服务费策略。</li>
                            </ul>
                        </Paragraph>
                    </div>
                </Card>
            </div>
        );
    }, [highRiskUsersData, highRiskUsersLoading, searchUserStats, safeAccess]);

    // 处理标签页切换
    const handleTabChange = useCallback((key) => {
        setActiveTab(key);

        // 根据选择的标签页加载对应数据
        if (key === 'riskAnalysis' && !riskAnalysisData && !riskAnalysisLoading) {
            loadRiskAnalysisData();
        } else if (key === 'regionAnalysis' && !regionAnalysisData && !regionAnalysisLoading) {
            loadRegionAnalysisData();
        } else if (key === 'timeAnalysis' && !timeAnalysisData && !timeAnalysisLoading) {
            loadTimeAnalysisData();
        } else if (key === 'trendAlerts' && !trendAlertsData && !trendAlertsLoading) {
            loadTrendAlertsData();
        } else if (key === 'serviceRisk' && !serviceRiskData && !serviceRiskLoading) {
            loadServiceRiskData();
        } else if (key === 'costAnalysis' && !costAnalysisData && !costAnalysisLoading) {
            loadCostAnalysisData();
        } else if (key === 'highRiskUsers' && !highRiskUsersData && !highRiskUsersLoading) {
            loadHighRiskUsersData();
        } else if (key === 'userRanking' && userRankings.length === 0 && !userRankingsLoading) {
            loadUserRankings();
        }
        // 新增的标签页逻辑
        // 新增的标签页逻辑
        if (key === 'timeoutReport' && !reportData && !reportLoading) {
            loadReportData();
        } else if (key === 'recommendations' && !recommendationsData && !recommendationsLoading) {
            loadRecommendationsData();
        }
    }, [
        riskAnalysisData, riskAnalysisLoading, loadRiskAnalysisData,
        regionAnalysisData, regionAnalysisLoading, loadRegionAnalysisData,
        timeAnalysisData, timeAnalysisLoading, loadTimeAnalysisData,
        trendAlertsData, trendAlertsLoading, loadTrendAlertsData,
        serviceRiskData, serviceRiskLoading, loadServiceRiskData,
        costAnalysisData, costAnalysisLoading, loadCostAnalysisData,
        highRiskUsersData, highRiskUsersLoading, loadHighRiskUsersData,
        userRankings, userRankingsLoading, loadUserRankings,
        reportData, reportLoading, loadReportData,
        recommendationsData, recommendationsLoading, loadRecommendationsData
    ]);

    return (
        <div className={styles.adminStatsContainer}>
            {renderConnectionStatus()}

            <div className={styles.periodSelectorContainer}>
                <div className={styles.periodHeader}>
                    <PeriodSelector onChange={handlePeriodChange} />

                    <Button
                        type="primary"
                        icon={<ReloadOutlined />}
                        onClick={refreshData}
                        loading={refreshing}
                        className={styles.refreshButton}
                    >
                        刷新数据
                    </Button>
                </div>
            </div>

            <Tabs activeKey={activeTab} onChange={handleTabChange}>
                <TabPane
                    tab={
                        <span>
                            <DashboardOutlined />
                            总览
                        </span>
                    }
                    key="overview"
                >
                    {renderStatisticsCards()}

                    <div className={styles.chartContainer}>
                        <TimeoutChartSection
                            statistics={systemStatistics}
                            title="系统超时趋势分析"
                            loading={isLoading || refreshing}
                        />
                    </div>

                    {/* 添加全局与系统切换按钮 */}
                    <div style={{ marginTop: '20px', textAlign: 'center' }}>
                        <Button.Group>
                            <Button
                                type={activeStatType === 'system' ? 'primary' : 'default'}
                                onClick={() => setActiveStatType('system')}
                            >
                                系统统计
                            </Button>
                            <Button
                                type={activeStatType === 'global' ? 'primary' : 'default'}
                                onClick={() => setActiveStatType('global')}
                            >
                                全局统计
                            </Button>
                        </Button.Group>
                    </div>
                </TabPane>

                <TabPane
                    tab={
                        <span>
                            <TeamOutlined />
                            用户排行
                        </span>
                    }
                    key="userRanking"
                >
                    <div className={styles.userRankingHeader}>
                        <h3>用户超时排行</h3>
                        <Button
                            icon={<SyncOutlined />}
                            onClick={() => loadUserRankings(
                                rankingPagination.current - 1,
                                rankingPagination.pageSize
                            )}
                            loading={userRankingsLoading}
                        >
                            刷新数据
                        </Button>
                    </div>

                    {userRankings.length > 0 ? (
                        <Table
                            columns={userRankingsColumns}
                            dataSource={userRankings}
                            rowKey="userId"
                            loading={userRankingsLoading}
                            pagination={rankingPagination}
                            onChange={handleTableChange}
                        />
                    ) : (
                        <Empty
                            description="暂无排行数据"
                            image={Empty.PRESENTED_IMAGE_SIMPLE}
                        />
                    )}
                </TabPane>

                <TabPane
                    tab={
                        <span>
                            <SearchOutlined />
                            用户查询
                        </span>
                    }
                    key="userQuery"
                >
                    <Card title="查询用户超时统计" className={styles.userQueryCard}>
                        <div className={styles.userQueryForm}>
                            <Input
                                placeholder="输入用户ID"
                                value={searchText}
                                onChange={(e) => setSearchText(e.target.value)}
                                onPressEnter={searchUserStats}
                                style={{ width: 200 }}
                            />
                            <Button
                                type="primary"
                                icon={<SearchOutlined />}
                                onClick={searchUserStats}
                                loading={userStatsLoading}
                            >
                                查询
                            </Button>
                        </div>

                        {renderUserStatsResult()}
                    </Card>
                </TabPane>

                {/* 风险分析标签页 */}
                <TabPane
                    tab={
                        <span>
                            <WarningOutlined />
                            风险分析
                        </span>
                    }
                    key="riskAnalysis"
                >
                    {renderRiskAnalysisData()}
                </TabPane>

                {/* 区域分析标签页 */}
                <TabPane
                    tab={
                        <span>
                            <EnvironmentOutlined />
                            区域分析
                        </span>
                    }
                    key="regionAnalysis"
                >
                    {renderRegionAnalysisData()}
                </TabPane>

                {/* 时间分析标签页 */}
                <TabPane
                    tab={
                        <span>
                            <ClockCircleOutlined />
                            时间分析
                        </span>
                    }
                    key="timeAnalysis"
                >
                    {renderTimeAnalysisData()}
                </TabPane>

                {/* 趋势预警标签页 */}
                <TabPane
                    tab={
                        <span>
                            <AlertOutlined />
                            趋势预警
                        </span>
                    }
                    key="trendAlerts"
                >
                    {renderTrendAlertsData()}
                </TabPane>

                {/* 服务风险标签页 */}
                <TabPane
                    tab={
                        <span>
                            <AreaChartOutlined />
                            服务风险
                        </span>
                    }
                    key="serviceRisk"
                >
                    {renderServiceRiskData()}
                </TabPane>

                {/* 成本分析标签页 */}
                <TabPane
                    tab={
                        <span>
                            <DollarOutlined />
                            成本分析
                        </span>
                    }
                    key="costAnalysis"
                >
                    {renderCostAnalysisData()}
                </TabPane>

                {/* 高风险用户标签页 */}
                <TabPane
                    tab={
                        <span>
                            <UserOutlined />
                            高风险用户
                        </span>
                    }
                    key="highRiskUsers"
                >
                    {renderHighRiskUsersData()}
                </TabPane>

                <TabPane
                    tab={
                        <span>
                            <FileTextOutlined />
                            超时报告
                        </span>
                    }
                    key="timeoutReport"
                >
                    {renderReportData()}
                </TabPane>

                <TabPane
                    tab={
                        <span>
                            <BulbOutlined />
                            优化建议
                        </span>
                    }
                    key="recommendations"
                >
                    {renderRecommendationsData()}
                </TabPane>
            </Tabs>

            {/* 全局加载指示器 */}
            {refreshing && (
                <div className={styles.globalRefreshing}>
                    <Spin tip="刷新中..." />
                </div>
            )}
        </div>
    );
};

export default AdminStatsView;