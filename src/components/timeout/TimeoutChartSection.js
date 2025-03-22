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
import styles from '../../assets/css/timeout/TimeoutDashboard.module.css';

const { TabPane } = Tabs;

// 图表颜色配置
const COLORS = {
    PICKUP: '#1890ff',
    DELIVERY: '#ff4d4f',
    CONFIRMATION: '#52c41a',
    INTERVENTION: '#722ed1',
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
                                 loading = false
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
    const distributionData = statistics ?
        timeoutStatsFormatter.calculateTimeoutDistribution(statistics) : [];

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
                        name="取件超时"
                        stroke={COLORS.PICKUP}
                        activeDot={{ r: 8 }}
                    />
                    <Line
                        type="monotone"
                        dataKey="DELIVERY"
                        name="配送超时"
                        stroke={COLORS.DELIVERY}
                    />
                    <Line
                        type="monotone"
                        dataKey="CONFIRMATION"
                        name="确认超时"
                        stroke={COLORS.CONFIRMATION}
                    />
                    <Line
                        type="monotone"
                        dataKey="INTERVENTION"
                        name="介入处理"
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

    // 渲染分布图表 - 修改后的版本，增加数据验证
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
                        {validDistributionData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                        ))}
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
                <TabPane tab="类型分布" key="distribution">
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