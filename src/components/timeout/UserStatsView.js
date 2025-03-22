// src/components/timeout/UserStatsView.js
import React, { useState, useEffect, useCallback } from 'react';
import {
    Row,
    Col,
    Alert,
    Skeleton,
    Button,
    Tabs,
    Card,
    Spin,
    Progress,
    Tag,
    Typography,
    Divider,
    List,
    Tooltip,
    Badge,
    Statistic, Empty
} from 'antd';
import {
    ReloadOutlined,
    WarningOutlined,
    SafetyOutlined,
    ExclamationCircleOutlined,
    CheckCircleOutlined,
    InfoCircleOutlined,
    BulbOutlined, CheckOutlined
} from '@ant-design/icons';
import PeriodSelector from './PeriodSelector';
import TimeoutStatisticsCard from './TimeoutStatisticsCard';
import TimeoutChartSection from './TimeoutChartSection';
import { useTimeoutStatistics } from '../context/TimeoutWebSocketContext';
import timeoutStatsFormatter from '../utils/timeoutStatsFormatter';
import timeoutStatisticsApi from '../utils/api/timeoutStatisticsApi';
import timeoutTypeMapping from '../utils/map/timeoutTypeMapping';
import { OrderTypeTag, TimeoutTypeTags } from './TimeoutTypeTag';
import styles from '../../assets/css/timeout/TimeoutDashboard.module.css';
const { Title, Paragraph, Text } = Typography;

/**
 * 用户超时统计视图组件
 * 增强版本 - 添加风险评估和个人建议功能
 */
const UserStatsView = ({activeModule }) => {
    const {
        userStatistics,
        connectionStatus,
        requestStatistics,
        isLoading
    } = useTimeoutStatistics();

    // 记录上一次选择的时间范围对应的统计数据
    const [previousStats, setPreviousStats] = useState(null);

    // 当前活跃视图
    const [activeTab, setActiveTab] = useState('overview');

    // 当前时间范围
    const [currentTimeRange, setCurrentTimeRange] = useState({
        startTime: null,
        endTime: null
    });
// 在组件顶部状态定义中添加一个新的状态来跟踪上次选择的时间范围
    const [lastRequestedTimeRange, setLastRequestedTimeRange] = useState(null);
    // 历史统计数据
    const [historyStats, setHistoryStats] = useState(null);
    const [historyLoading, setHistoryLoading] = useState(false);

    // 用户建议数据
    const [userRecommendationsData, setUserRecommendationsData] = useState(null);
    const [userRecommendationsLoading, setUserRecommendationsLoading] = useState(false);

    // 订单类型详情
    const [orderTypeDetails, setOrderTypeDetails] = useState(null);
    const [orderTypeDetailsLoading, setOrderTypeDetailsLoading] = useState(false);
    const [selectedOrderType, setSelectedOrderType] = useState(null);

    // 数据加载和刷新状态
    const [refreshing, setRefreshing] = useState(false);
    const [dataError, setDataError] = useState(false);

    // 新增 - 用户风险评估数据
    const [riskAssessmentData, setRiskAssessmentData] = useState(null);
    const [riskAssessmentLoading, setRiskAssessmentLoading] = useState(false);

    // 加载历史数据
    const loadHistoryData = useCallback(async (startTime = null, endTime = null) => {
        setHistoryLoading(true);

        try {
            const data = await timeoutStatisticsApi.getUserTimeoutHistory(startTime, endTime);
            setHistoryStats(data);
        } catch (error) {
            console.error('加载历史数据失败:', error);
            setDataError(true);
        } finally {
            setHistoryLoading(false);
        }
    }, []);

    // 加载用户建议数据
    const loadUserRecommendationsData = useCallback(async () => {
        setUserRecommendationsLoading(true);
        try {
            const { startTime, endTime } = currentTimeRange;
            const data = await timeoutStatisticsApi.getRecommendations(startTime, endTime);
            setUserRecommendationsData(data);
        } catch (error) {
            console.error('加载用户建议数据失败:', error);
            setDataError(true);
        } finally {
            setUserRecommendationsLoading(false);
        }
    }, [currentTimeRange]);

// 添加渲染用户建议的函数
    const renderUserRecommendationsData = useCallback(() => {
        if (userRecommendationsLoading) {
            return <Skeleton active paragraph={{ rows: 6 }} />;
        }

        if (!userRecommendationsData || !userRecommendationsData.recommendations) {
            return (
                <Empty
                    description="暂无配送建议数据"
                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                />
            );
        }

        return (
            <div className={styles.userRecommendationsContainer}>
                <Card
                    title={
                        <span>
                        <BulbOutlined style={{ color: '#52c41a', marginRight: 8 }} />
                        个人配送建议
                    </span>
                    }
                >
                    <Alert
                        message="提高配送效率的个性化建议"
                        description="以下是基于您的配送数据分析得出的建议，遵循这些建议可以帮助您提高配送效率，减少超时率。"
                        type="info"
                        showIcon
                        style={{ marginBottom: 16 }}
                    />

                    <List
                        dataSource={userRecommendationsData.recommendations}
                        renderItem={(recommendation) => {
                            // 提取建议中的风险级别标签（如果有）
                            const match = recommendation.match(/【(.+?)】/);
                            const tag = match ? match[1] : null;

                            // 根据标签设置不同的颜色
                            let tagColor = 'blue';
                            if (tag) {
                                if (tag.includes('严重警告')) {
                                    tagColor = 'red';
                                } else if (tag.includes('警告')) {
                                    tagColor = 'orange';
                                } else if (tag.includes('提醒')) {
                                    tagColor = 'gold';
                                } else if (tag.includes('表扬')) {
                                    tagColor = 'green';
                                }
                            }

                            return (
                                <List.Item>
                                    <List.Item.Meta
                                        title={
                                            <div>
                                                {tag && <Tag color={tagColor}>{tag}</Tag>}
                                                <Typography.Text>{recommendation.replace(/【.+?】/, '')}</Typography.Text>
                                            </div>
                                        }
                                    />
                                </List.Item>
                            );
                        }}
                    />

                    <Divider />

                    <Typography.Paragraph>
                        <Typography.Title level={5}>一般配送建议</Typography.Title>
                        <ul>
                            <li>提前规划配送路线，避免走回头路。</li>
                            <li>关注高峰时段，避免在拥堵时间接单。</li>
                            <li>设置取件和送达提醒，避免遗忘订单。</li>
                            <li>合理评估订单距离和时间，不要过度承诺。</li>
                            <li>遇到特殊情况及时与客户沟通，减少误解。</li>
                        </ul>
                    </Typography.Paragraph>
                </Card>
            </div>
        );
    }, [userRecommendationsData, userRecommendationsLoading]);

    // 新增 - 加载用户风险评估数据
    const loadRiskAssessmentData = useCallback(async () => {
        setRiskAssessmentLoading(true);
        try {
            const data = await timeoutStatisticsApi.getUserRiskAssessment();
            setRiskAssessmentData(data);
        } catch (error) {
            console.error('加载用户风险评估数据失败:', error);
            setDataError(true);
        } finally {
            setRiskAssessmentLoading(false);
        }
    }, []);

    // 加载订单类型详情
    const loadOrderTypeDetails = useCallback(async (orderType, startTime = null, endTime = null) => {
        if (!orderType) return;

        setOrderTypeDetailsLoading(true);

        try {
            const data = await timeoutStatisticsApi.getTimeoutDetails(orderType, startTime, endTime);
            setOrderTypeDetails(data);
        } catch (error) {
            console.error(`加载${orderType}订单详情失败:`, error);
            setDataError(true);
        } finally {
            setOrderTypeDetailsLoading(false);
        }
    }, []);

    // 同步外部传入的activeModule，自动切换视图
    useEffect(() => {
        if (activeModule === 'personalStats') {
            setActiveTab('history');
            // 加载历史数据
            if (!historyStats) {
                loadHistoryData();
            }
        } else if (activeModule === 'riskAssessment') {
            setActiveTab('riskAssessment');
            // 加载风险评估数据
            if (!riskAssessmentData) {
                loadRiskAssessmentData();
            }
        } else {
            setActiveTab('overview');
        }
    }, [historyStats, loadHistoryData, riskAssessmentData, loadRiskAssessmentData, activeModule]);

    // 主动刷新数据
    const refreshData = useCallback(() => {
        setRefreshing(true);

        try {
            // 保存当前数据到上一时段
            if (userStatistics) {
                setPreviousStats(userStatistics);
            }

            // 请求新数据
            const { startTime, endTime } = currentTimeRange;
            console.log(`手动刷新数据，时间范围: ${startTime} - ${endTime}`);

            // 清除上次请求记录，确保数据一定会刷新
            setLastRequestedTimeRange(null);

            // 使用延时确保状态已更新
            setTimeout(() => {
                requestStatistics('user', startTime, endTime);

                // 根据当前激活的tab加载相应数据
                if (activeTab === 'history') {
                    loadHistoryData(startTime, endTime);
                } else if (activeTab === 'details' && selectedOrderType) {
                    loadOrderTypeDetails(selectedOrderType, startTime, endTime);
                } else if (activeTab === 'riskAssessment') {
                    loadRiskAssessmentData();
                }
            }, 50);

            // 3秒后取消刷新状态
            setTimeout(() => {
                setRefreshing(false);
            }, 3000);
        } catch (error) {
            console.error('刷新数据失败:', error);
            setRefreshing(false);
            setDataError(true);

            // 显示错误消息
            alert('刷新数据时出错，请稍后再试');
        }
    }, [
        userStatistics,
        requestStatistics,
        currentTimeRange,
        activeTab,
        selectedOrderType,
        loadHistoryData,
        loadOrderTypeDetails,
        loadRiskAssessmentData
    ]);

    // 修改组件初始化时的处理
    useEffect(() => {
        // 在组件首次渲染时初始化默认时间范围
        if (!currentTimeRange.startTime || !currentTimeRange.endTime) {
            const now = new Date();
            const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);

            setCurrentTimeRange({
                startTime: startOfToday,
                endTime: now
            });

            // 初始加载今天的数据
            requestStatistics('user', startOfToday, now);
        }
    }, [requestStatistics]);

    // 处理Tab切换
    const handleTabChange = useCallback((key) => {
        setActiveTab(key);

        const { startTime, endTime } = currentTimeRange;

        if (key === 'history' && !historyStats) {
            loadHistoryData(startTime, endTime);
        } else if (key === 'details' && selectedOrderType && !orderTypeDetails) {
            loadOrderTypeDetails(selectedOrderType, startTime, endTime);
        } else if (key === 'riskAssessment' && !riskAssessmentData) {
            loadRiskAssessmentData();
        }
        // 新增标签页逻辑
        if (key === 'recommendations' && !userRecommendationsData && !userRecommendationsLoading) {
            loadUserRecommendationsData();
        }
    }, [currentTimeRange, historyStats, orderTypeDetails, selectedOrderType, riskAssessmentData, loadHistoryData, loadOrderTypeDetails, loadRiskAssessmentData, userRecommendationsData, userRecommendationsLoading, loadUserRecommendationsData]);

    // 选择订单类型
    const handleOrderTypeSelect = useCallback((orderType) => {
        setSelectedOrderType(orderType);
        const { startTime, endTime } = currentTimeRange;
        loadOrderTypeDetails(orderType, startTime, endTime);
    }, [currentTimeRange, loadOrderTypeDetails]);

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

// 修改 handlePeriodChange 函数
    const handlePeriodChange = useCallback((startTime, endTime) => {
        console.log(`UserStatsView 接收到时间范围变更: ${startTime} - ${endTime}`);

        // 检查是否与上次请求的时间范围相同，避免重复请求
        if (lastRequestedTimeRange &&
            lastRequestedTimeRange.startTime &&
            lastRequestedTimeRange.endTime &&
            lastRequestedTimeRange.startTime.getTime() === startTime.getTime() &&
            lastRequestedTimeRange.endTime.getTime() === endTime.getTime()) {
            console.log('时间范围未变化，跳过数据请求');
            return;
        }

        // 更新当前时间范围
        setCurrentTimeRange({ startTime, endTime });

        // 更新上次请求的时间范围
        setLastRequestedTimeRange({ startTime, endTime });

        // 保存当前数据为上一时段数据
        if (userStatistics) {
            setPreviousStats(userStatistics);
        }

        // 使用setTimeout延迟请求数据，确保状态已更新
        setTimeout(() => {
            // 请求新时段的数据
            requestStatistics('user', startTime, endTime);

            // 根据当前激活的tab加载相应数据
            if (activeTab === 'history') {
                loadHistoryData(startTime, endTime);
            } else if (activeTab === 'details' && selectedOrderType) {
                loadOrderTypeDetails(selectedOrderType, startTime, endTime);
            } else if (activeTab === 'riskAssessment') {
                loadRiskAssessmentData();
            }
            if (activeTab === 'recommendations') {
                loadUserRecommendationsData();
            }

            // 显示加载状态，提高用户体验
            setRefreshing(true);

            // 3秒后取消刷新状态
            setTimeout(() => {
                setRefreshing(false);
            }, 3000);
        }, 50);
    }, [
        userStatistics,
        requestStatistics,
        activeTab,
        selectedOrderType,
        loadHistoryData,
        loadOrderTypeDetails,
        loadRiskAssessmentData,
        lastRequestedTimeRange,
        loadUserRecommendationsData
    ]);

    // 获取统计摘要
    const summary = userStatistics ?
        timeoutStatsFormatter.formatStatisticsSummary(userStatistics, previousStats) : null;

    // 连接状态警告
    const renderConnectionStatus = useCallback(() => {
        if (connectionStatus.user === 'authenticated') {
            return null;
        }

        if (connectionStatus.user === 'connecting') {
            return (
                <Alert
                    message="正在连接超时统计服务..."
                    type="info"
                    showIcon
                    className={styles.statusAlert}
                />
            );
        }

        if (connectionStatus.user === 'error') {
            return (
                <Alert
                    message="连接超时统计服务失败，请刷新页面重试"
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
                message="超时统计服务未连接"
                type="warning"
                showIcon
                className={styles.statusAlert}
                action={
                    <Button size="small" onClick={refreshData}>
                        <ReloadOutlined />重试连接
                    </Button>
                }
            />
        );
    }, [connectionStatus.user, refreshData]);

    // 渲染统计卡片
    // 渲染统计卡片的函数部分修改
    const renderStatisticsCards = useCallback(() => {
        if (!summary) {
            return (
                <Row gutter={[16, 16]} className={styles.cardsContainer}>
                    {[1, 2, 3, 4].map(i => (
                        <Col xs={24} sm={12} md={6} key={i}>
                            <Skeleton active paragraph={{ rows: 2 }} />
                        </Col>
                    ))}
                </Row>
            );
        }

        return (
            <Row gutter={[16, 16]} className={styles.cardsContainer}>
                <Col xs={24} sm={12} md={6}>
                    <TimeoutStatisticsCard
                        title="总超时次数"
                        value={summary.totalTimeouts}
                        previousValue={previousStats ?
                            timeoutStatsFormatter.calculateTotalTimeouts(previousStats) : null}
                        icon="warning"
                        color="#faad14"
                        loading={isLoading}
                        tooltip="所有类型超时的总次数"
                    />
                </Col>

                <Col xs={24} sm={12} md={6}>
                    <TimeoutStatisticsCard
                        title="取件超时"
                        value={summary.pickupTimeouts}
                        previousValue={previousStats?.timeoutCounts?.PICKUP}
                        icon="pickup"
                        color="#1890ff"
                        loading={isLoading}
                        tooltip="未在规定时间内取件的次数"
                        type="PICKUP" // 添加类型信息
                    />
                </Col>

                <Col xs={24} sm={12} md={6}>
                    <TimeoutStatisticsCard
                        title="配送超时"
                        value={summary.deliveryTimeouts}
                        previousValue={previousStats?.timeoutCounts?.DELIVERY}
                        icon="delivery"
                        color="#ff4d4f"
                        loading={isLoading}
                        tooltip="未在规定时间内送达的次数"
                        type="DELIVERY" // 添加类型信息
                    />
                </Col>

                <Col xs={24} sm={12} md={6}>
                    <TimeoutStatisticsCard
                        title="平均超时率"
                        value={summary.averageTimeoutRate}
                        previousValue={previousStats?.averageTimeoutRate}
                        icon="confirmation"
                        color="#52c41a"
                        loading={isLoading}
                        tooltip="超时订单占总订单的比例"
                        type="CONFIRMATION" // 添加类型信息
                    />
                </Col>
            </Row>
        );
    }, [summary, previousStats, isLoading]);

    // 渲染历史数据
    const renderHistoryData = useCallback(() => {
        if (historyLoading) {
            return <Skeleton active paragraph={{ rows: 6 }} />;
        }

        if (!historyStats) {
            return (
                <Alert
                    message="暂无历史数据"
                    type="info"
                    showIcon
                />
            );
        }

        return (
            <div className={styles.historyContainer}>
                <Card title="历史超时统计">
                    <p>用户ID: {historyStats.userId}</p>
                    <p>用户名: {historyStats.username}</p>
                    <p>统计周期: {new Date(historyStats.period.startTime).toLocaleDateString()} 至 {new Date(historyStats.period.endTime).toLocaleDateString()}</p>

                    <TimeoutChartSection
                        statistics={historyStats.statistics}
                        title="历史超时趋势"
                    />
                </Card>
            </div>
        );
    }, [historyStats, historyLoading]);

    // 渲染订单类型详情
    const renderOrderTypeDetails = useCallback(() => {
        if (!selectedOrderType) {
            return (
                <Alert
                    message="请选择订单类型"
                    type="info"
                    showIcon
                />
            );
        }

        if (orderTypeDetailsLoading) {
            return <Skeleton active paragraph={{ rows: 6 }} />;
        }

        if (!orderTypeDetails) {
            return (
                <Alert
                    message={`暂无${selectedOrderType}类型的超时统计数据`}
                    type="warning"
                    showIcon
                />
            );
        }

        return (
            <div className={styles.orderTypeDetailsContainer}>
                <Card title={`${selectedOrderType}订单超时详情`}>
                    <p>订单类型: {selectedOrderType}</p>
                    <p>统计周期: {new Date(orderTypeDetails.period.startTime).toLocaleDateString()} 至 {new Date(orderTypeDetails.period.endTime).toLocaleDateString()}</p>

                    {/* 这里根据实际数据结构渲染更详细的统计信息 */}
                    {orderTypeDetails.statistics && (
                        <div className={styles.detailsStatistics}>
                            <h4>基本统计</h4>
                            <p>总订单数: {orderTypeDetails.statistics.totalOrders || 0}</p>
                            <p>超时订单数: {orderTypeDetails.statistics.timeoutOrders || 0}</p>
                            <p>超时率: {orderTypeDetails.statistics.timeoutRate ? `${(orderTypeDetails.statistics.timeoutRate * 100).toFixed(2)}%` : '0%'}</p>
                        </div>
                    )}

                    {/* 如果有超时事件列表，可以渲染这些信息 */}
                    {orderTypeDetails.incidents && orderTypeDetails.incidents.length > 0 && (
                        <div className={styles.incidentsList}>
                            <h4>超时事件</h4>
                            <ul>
                                {orderTypeDetails.incidents.map((incident, index) => (
                                    <li key={index}>
                                        订单号: {incident.orderNumber},
                                        超时时间: {new Date(incident.timeoutTime).toLocaleString()},
                                        超时类型: {incident.timeoutType}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                </Card>
            </div>
        );
    }, [selectedOrderType, orderTypeDetails, orderTypeDetailsLoading]);

    // 渲染订单类型选择器函数修改
    const renderOrderTypeSelector = useCallback(() => {
        // 使用映射获取所有订单类型
        const orderTypes = timeoutTypeMapping.getAllOrderTypes().filter(type =>
            userStatistics && userStatistics.serviceStatistics &&
            userStatistics.serviceStatistics[type]
        );

        if (orderTypes.length === 0) {
            return (
                <Alert
                    message="暂无订单类型数据"
                    type="info"
                    showIcon
                />
            );
        }

        return (
            <div className={styles.orderTypeSelector}>
                <h4>选择订单类型</h4>
                <div className={styles.orderTypeButtons}>
                    {orderTypes.map(type => {
                        // 获取该订单类型的超时次数
                        const timeoutCount = userStatistics?.serviceStatistics?.[type]?.statistics?.timeoutCount || 0;

                        return (
                            <Button
                                key={type}
                                type={selectedOrderType === type ? 'primary' : 'default'}
                                onClick={() => handleOrderTypeSelect(type)}
                                style={{ margin: '0 8px 8px 0' }}
                                icon={selectedOrderType === type ? <CheckOutlined /> : null}
                                className={selectedOrderType === type ? timeoutTypeMapping.getOrderTypeStyleClass(type) : ''}
                            >
                                {timeoutTypeMapping.getOrderTypeDisplay(type)}
                                {timeoutCount > 0 && <Badge count={timeoutCount} style={{ marginLeft: 8 }} />}
                            </Button>
                        );
                    })}
                </div>
            </div>
        );
    }, [userStatistics, selectedOrderType, handleOrderTypeSelect]);

    // 新增 - 渲染风险评估数据
    // 在渲染风险评估数据的函数中使用类型标签
    const renderRiskAssessmentData = useCallback(() => {
        if (riskAssessmentLoading) {
            return <Skeleton active paragraph={{ rows: 6 }} />;
        }

        if (!riskAssessmentData) {
            return (
                <Alert
                    message="暂无风险评估数据"
                    type="info"
                    showIcon
                />
            );
        }

        const { isHighRisk, overallTimeoutRate, timeoutCount, serviceRisks } = riskAssessmentData;

        return (
            <div className={styles.riskAssessmentContainer}>
                <Row gutter={[16, 16]}>
                    <Col xs={24} md={12}>
                        <Card
                            title={
                                <span>
                                <SafetyOutlined style={{ color: isHighRisk ? '#ff4d4f' : '#52c41a', marginRight: 8 }} />
                                个人风险评估
                            </span>
                            }
                            className={styles.riskStatusCard}
                        >
                            <div className={styles.riskStatusContent}>
                                <Statistic
                                    title="风险状态"
                                    value={isHighRisk ? "高风险" : "正常"}
                                    valueStyle={{
                                        color: isHighRisk ? '#ff4d4f' : '#52c41a',
                                        fontSize: 24
                                    }}
                                />

                                <div className={styles.riskIndicators}>
                                    <div className={styles.riskIndicator}>
                                        <Tooltip title="超时率超过15%被视为高风险">
                                        <span className={styles.indicatorLabel}>
                                            <InfoCircleOutlined style={{ marginRight: 4 }} />
                                            超时率:
                                        </span>
                                            <Progress
                                                percent={overallTimeoutRate.toFixed(1)}
                                                size="small"
                                                status={overallTimeoutRate > 15 ? "exception" : "active"}
                                                style={{ width: 200 }}
                                            />
                                        </Tooltip>
                                    </div>

                                    <div className={styles.riskIndicator}>
                                        <span className={styles.indicatorLabel}>超时总次数:</span>
                                        <span className={styles.indicatorValue}>{timeoutCount}</span>
                                    </div>

                                    {/* 添加订单类型分布标签 */}
                                    {serviceRisks && Object.keys(serviceRisks).length > 0 && (
                                        <div className={styles.orderTypeDistribution} style={{ marginTop: 16 }}>
                                            <span className={styles.indicatorLabel}>订单类型分布:</span>
                                            <div style={{ marginTop: 8 }}>
                                                <TimeoutTypeTags
                                                    types={Object.keys(serviceRisks)}
                                                    isOrderTypes={true}
                                                    counts={Object.fromEntries(
                                                        Object.entries(serviceRisks).map(
                                                            ([type, data]) => [type, data.timeoutCount || 0]
                                                        )
                                                    )}
                                                    onTagClick={handleOrderTypeSelect}
                                                />
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {isHighRisk ? (
                                    <Alert
                                        message="风险提醒"
                                        description="您的超时率较高，可能影响后续接单权限，请注意按时配送。"
                                        type="error"
                                        showIcon
                                        style={{ marginTop: 16 }}
                                    />
                                ) : (
                                    <Alert
                                        message="正常状态"
                                        description="您的超时率处于正常范围，请继续保持良好的配送习惯。"
                                        type="success"
                                        showIcon
                                        style={{ marginTop: 16 }}
                                    />
                                )}
                            </div>
                        </Card>
                    </Col>

                    <Col xs={24} md={12}>
                        <Card
                            title={
                                <span>
                                <WarningOutlined style={{ color: '#faad14', marginRight: 8 }} />
                                服务类型风险
                            </span>
                            }
                            className={styles.serviceRiskCard}
                        >
                            <List
                                dataSource={Object.entries(serviceRisks || {})}
                                renderItem={([serviceType, riskInfo]) => (
                                    <List.Item>
                                        <List.Item.Meta
                                            title={
                                                <div>
                                                    <OrderTypeTag
                                                        type={serviceType}
                                                        showCount={true}
                                                        count={riskInfo.timeoutCount || 0}
                                                    />
                                                    <Tag
                                                        color={
                                                            riskInfo.riskLevel === 'CRITICAL' ? 'red' :
                                                                riskInfo.riskLevel === 'HIGH' ? 'orange' :
                                                                    riskInfo.riskLevel === 'MEDIUM' ? 'gold' : 'green'
                                                        }
                                                        style={{ marginLeft: 8 }}
                                                    >
                                                        {
                                                            riskInfo.riskLevel === 'CRITICAL' ? '极高风险' :
                                                                riskInfo.riskLevel === 'HIGH' ? '高风险' :
                                                                    riskInfo.riskLevel === 'MEDIUM' ? '中等风险' : '低风险'
                                                        }
                                                    </Tag>
                                                    {riskInfo.needsSpecialAttention && (
                                                        <Badge status="error" text="需要关注" style={{ marginLeft: 8 }} />
                                                    )}
                                                </div>
                                            }
                                            description={
                                                <>
                                                    <p>超时率: {((riskInfo.timeoutRate || 0) * 100).toFixed(1)}%</p>
                                                    <p>{riskInfo.needsIntervention ?
                                                        "该服务类型需要重点关注，建议及时改进" :
                                                        "该服务类型风险在可控范围内"}</p>
                                                </>
                                            }
                                        />
                                        <div>
                                            <Button
                                                type="link"
                                                size="small"
                                                onClick={() => {
                                                    setSelectedOrderType(serviceType);
                                                    setActiveTab('details');
                                                }}
                                            >
                                                查看详情
                                            </Button>
                                        </div>
                                    </List.Item>
                                )}
                                locale={{ emptyText: "暂无服务类型风险数据" }}
                            />
                        </Card>
                    </Col>
                </Row>

                <Card
                    title="改进建议"
                    className={styles.recommendationsCard}
                    style={{ marginTop: 16 }}
                >
                    <div className={styles.recommendationsContent}>
                        <Paragraph>
                            <Title level={5}>如何提高配送效率</Title>
                            <ul>
                                <li>提前规划配送路线，避免走回头路。</li>
                                <li>关注高峰时段，避免在拥堵时间接单。</li>
                                <li>设置取件和送达提醒，避免遗忘订单。</li>
                                <li>合理评估订单距离和时间，不要过度承诺。</li>
                                <li>遇到特殊情况及时与客户沟通，减少误解。</li>
                            </ul>
                        </Paragraph>

                        <Divider />

                        <Paragraph>
                            <Title level={5}>订单类型特别建议</Title>
                            {Object.entries(serviceRisks || {}).map(([serviceType, riskInfo]) => (
                                <div key={serviceType} style={{ marginBottom: 16 }}>
                                    <Text strong>{timeoutTypeMapping.getOrderTypeDisplay(serviceType)}: </Text>
                                    <Text>
                                        {riskInfo.recommendedAction ||
                                            (riskInfo.riskLevel === 'CRITICAL' || riskInfo.riskLevel === 'HIGH' ?
                                                "建议减少接单量，提高服务质量" :
                                                "继续保持当前服务水平")}
                                    </Text>
                                </div>
                            ))}
                        </Paragraph>
                    </div>
                </Card>
            </div>
        );
    }, [riskAssessmentData, riskAssessmentLoading, setSelectedOrderType, setActiveTab, handleOrderTypeSelect]);

    // Tab定义
    const tabItems = [
        {
            key: 'overview',
            label: (
                <span>
                    <CheckCircleOutlined />
                    总览
                </span>
            ),
            children: (
                <>
                    {renderStatisticsCards()}

                    <div className={styles.chartContainer}>
                        <TimeoutChartSection
                            statistics={userStatistics}
                            title="个人超时趋势分析"
                            loading={isLoading}
                        />
                    </div>
                </>
            )
        },
        {
            key: 'history',
            label: (
                <span>
                    <ExclamationCircleOutlined />
                    历史记录
                </span>
            ),
            children: renderHistoryData()
        },
        {
            key: 'details',
            label: (
                <span>
                    <InfoCircleOutlined />
                    详细数据
                </span>
            ),
            children: (
                <>
                    {renderOrderTypeSelector()}
                    {renderOrderTypeDetails()}
                </>
            )
        },
        {
            key: 'riskAssessment',
            label: (
                <span>
                    <WarningOutlined />
                    风险评估
                </span>
            ),
            children: renderRiskAssessmentData()
        },
        {
            key: 'recommendations',
            label: (
                <span>
                <BulbOutlined />
                配送建议
            </span>
            ),
            children: renderUserRecommendationsData()
        }
    ];

    return (
        <div className={styles.userStatsContainer}>
            {renderConnectionStatus()}

            <div className={styles.periodSelectorContainer}>
                <div className={styles.periodHeader}>
                    <PeriodSelector onChange={handlePeriodChange}
                                    defaultPeriod="today"
                    />

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

            <Tabs
                activeKey={activeTab}
                onChange={handleTabChange}
                className={styles.mainTabs}
                items={tabItems}
            />

            {/* 全局加载指示器 */}
            {refreshing && (
                <div className={styles.globalRefreshing}>
                    <Spin tip="刷新中..." />
                </div>
            )}
        </div>
    );
};

export default UserStatsView;