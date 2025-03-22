// src/components/timeout/TimeoutChartSection.js
import React, { useState } from 'react';
import { Card, Tabs, Empty, Spin } from 'antd';
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
    PieChart,
    Pie,
    Cell
} from 'recharts';
import timeoutStatsFormatter from '../utils/timeoutStatsFormatter';
import timeoutTypeMapping from '../utils/map/timeoutTypeMapping';
import styles from '../../assets/css/timeout/TimeoutDashboard.module.css';
import '../../assets/css/timeout/timeoutTypeStyles.css';

const { TabPane } = Tabs;

// 图表颜色配置 - 使用超时类型对应的颜色
const COLORS = {
    PICKUP: '#1890ff',
    DELIVERY: '#ff4d4f',
    CONFIRMATION: '#52c41a',
    INTERVENTION: '#722ed1',
    MAIL_ORDER: '#1890ff',
    SHOPPING_ORDER: '#faad14',
    PURCHASE_REQUEST: '#52c41a',
    total: '#faad14'
};

// 饼图颜色数组
const PIE_COLORS = ['#1890ff', '#ff4d4f', '#52c41a', '#722ed1', '#faad14', '#13c2c2'];

/**
 * 超时图表区域组件
 * 展示不同类型的超时统计图表
 */
const TimeoutChartSection = ({
                                 statistics,
                                 title = '超时趋势分析',
                                 loading = false,
                                 useOrderTypes = false // 新增参数，决定是否使用订单类型而非超时类型
                             }) => {
    // 选中的图表类型
    const [activeTab, setActiveTab] = useState('trend');

    // 处理图表类型切换
    const handleTabChange = (key) => {
        setActiveTab(key);
    };

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
            console.warn(`访问属性路径 ${path} 失败:`, error);
            return defaultValue;
        }
    };

    // 格式化趋势数据
    const trendData = statistics ? timeoutStatsFormatter.formatTimeoutTrends(statistics) : [];

    // 格式化分布数据
    let distributionData = statistics ?
        timeoutStatsFormatter.calculateTimeoutDistribution(statistics) : [];

    // 如果需要使用订单类型显示
    if (useOrderTypes && statistics && statistics.serviceStatistics) {
        distributionData = Object.entries(statistics.serviceStatistics).map(([type, stats]) => {
            const count = stats && typeof stats === 'object' ? (stats.timeoutCount || 0) : 0;
            const total = Object.values(statistics.serviceStatistics).reduce((sum, s) =>
                sum + (s && typeof s === 'object' ? (s.timeoutCount || 0) : 0), 0);
            const percentage = total > 0 ? Math.round((count / total) * 100) : 0;

            return {
                type,
                typeName: timeoutTypeMapping.getOrderTypeDisplay(type),
                count,
                percentage
            };
        }).filter(item => item.count > 0);
    }

    // 渲染趋势图表 - 修改后的版本，增加数据验证
    const renderTrendChart = () => {
        if (!trendData || trendData.length === 0) {
            return <Empty description="暂无趋势数据" />;
        }

        // 确保数据完整性
        const validTrendData = trendData.filter(item =>
            item && typeof item === 'object' && item.date
        );

        if (validTrendData.length === 0) {
            return <Empty description="暂无有效趋势数据" />;
        }

        return (
            <ResponsiveContainer width="100%" height={300}>
                <LineChart
                    data={validTrendData}
                    margin={{
                        top: 5,
                        right: 30,
                        left: 20,
                        bottom: 5,
                    }}
                >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line
                        type="monotone"
                        dataKey="PICKUP"
                        name={timeoutTypeMapping.getTimeoutTypeDisplay("PICKUP")}
                        stroke={COLORS.PICKUP}
                        activeDot={{ r: 8 }}
                    />
                    <Line
                        type="monotone"
                        dataKey="DELIVERY"
                        name={timeoutTypeMapping.getTimeoutTypeDisplay("DELIVERY")}
                        stroke={COLORS.DELIVERY}
                    />
                    <Line
                        type="monotone"
                        dataKey="CONFIRMATION"
                        name={timeoutTypeMapping.getTimeoutTypeDisplay("CONFIRMATION")}
                        stroke={COLORS.CONFIRMATION}
                    />
                    <Line
                        type="monotone"
                        dataKey="INTERVENTION"
                        name={timeoutTypeMapping.getTimeoutTypeDisplay("INTERVENTION")}
                        stroke={COLORS.INTERVENTION}
                    />
                    <Line
                        type="monotone"
                        dataKey="total"
                        name="总计"
                        stroke={COLORS.total}
                        strokeWidth={2}
                    />
                </LineChart>
            </ResponsiveContainer>
        );
    };

    // 渲染分布图表 - 修改后的版本，增加数据验证和类型映射
    const renderDistributionChart = () => {
        if (!distributionData || distributionData.length === 0) {
            return <Empty description="暂无分布数据" />;
        }

        // 确保数据完整性
        const validDistributionData = distributionData.filter(item =>
            item && typeof item === 'object' &&
            typeof item.count === 'number' &&
            item.typeName
        );

        if (validDistributionData.length === 0) {
            return <Empty description="暂无有效分布数据" />;
        }

        return (
            <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                    <Pie
                        data={validDistributionData}
                        cx="50%"
                        cy="50%"
                        labelLine={true}
                        outerRadius={100}
                        fill="#8884d8"
                        dataKey="count"
                        nameKey="typeName"
                        label={({ typeName, percentage }) => `${typeName}: ${percentage}%`}
                    >
                        {validDistributionData.map((entry, index) => {
                            // 尝试使用类型特定的颜色
                            const color = COLORS[entry.type] || PIE_COLORS[index % PIE_COLORS.length];
                            return <Cell key={`cell-${index}`} fill={color} />;
                        })}
                    </Pie>
                    <Tooltip
                        formatter={(value, name, props) => {
                            if (!props || !props.payload) return [value, name];
                            return [
                                `${value} (${props.payload.percentage || 0}%)`,
                                name
                            ];
                        }}
                    />
                    <Legend />
                </PieChart>
            </ResponsiveContainer>
        );
    };

    // 决定使用的分布标题
    const distributionTitle = useOrderTypes ? "订单类型分布" : "超时类型分布";

    return (
        <Card
            title={title}
            className={styles.chartCard}
        >
            <Tabs activeKey={activeTab} onChange={handleTabChange}>
                <TabPane tab="趋势分析" key="trend">
                    {loading ? (
                        <div className={styles.loadingContainer}>
                            <Spin size="large" tip="加载中..." />
                        </div>
                    ) : (
                        renderTrendChart()
                    )}
                </TabPane>
                <TabPane tab={distributionTitle} key="distribution">
                    {loading ? (
                        <div className={styles.loadingContainer}>
                            <Spin size="large" tip="加载中..." />
                        </div>
                    ) : (
                        renderDistributionChart()
                    )}
                </TabPane>
            </Tabs>
        </Card>
    );
};

export default TimeoutChartSection;