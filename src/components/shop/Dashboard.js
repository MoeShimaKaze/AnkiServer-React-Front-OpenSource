import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
    Card, Statistic, Row, Col, Table, Spin, Empty, Tabs, List,
    Typography, Divider, Space, Button, message, Badge, Alert
} from 'antd';
import {
    ShopOutlined, ShoppingCartOutlined, DollarOutlined,
    CalendarOutlined, LineChartOutlined, AppstoreOutlined,
    ExclamationCircleOutlined
} from '@ant-design/icons';
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid,
    Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import styles from '../../assets/css/shop/Dashboard.module.css';

const { Title, Text } = Typography;
const { TabPane } = Tabs;

const Dashboard = ({ selectedStore }) => {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [statsData, setStatsData] = useState(null);
    const [storeStats, setStoreStats] = useState(null);
    const [isAdmin, setIsAdmin] = useState(false);
    const [currentUser, setCurrentUser] = useState(null);

    // 获取当前用户信息
    const fetchUserInfo = async () => {
        try {
            const response = await axios.get('http://127.0.0.1:8080/api/users/profile', {
                withCredentials: true
            });
            setCurrentUser(response.data);
            setIsAdmin(response.data.userGroup === 'admin');
        } catch (error) {
            console.error('Error fetching user info:', error);
            message.error('获取用户信息失败');
        }
    };

    // 获取统计数据
    const fetchStats = async () => {
        try {
            setLoading(true);
            setError(null);
            const response = await axios.get('http://127.0.0.1:8080/api/dashboard/stats', {
                withCredentials: true
            });
            setStatsData(response.data);
            setLoading(false);
        } catch (error) {
            console.error('Error fetching dashboard stats:', error);
            setError('获取统计数据失败: ' + (error.response?.data || error.message));
            message.error('获取统计数据失败');
            setLoading(false);
        }
    };

    // 获取特定店铺的统计数据
    const fetchStoreStats = async (storeId) => {
        try {
            setLoading(true);
            setError(null);
            const response = await axios.get(`http://127.0.0.1:8080/api/dashboard/merchant/store/${storeId}/stats`, {
                withCredentials: true
            });
            setStoreStats(response.data);
            setLoading(false);
        } catch (error) {
            console.error('Error fetching store stats:', error);
            setError('获取店铺统计数据失败: ' + (error.response?.data || error.message));
            message.error('获取店铺统计数据失败');
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchUserInfo();
    }, []);

    useEffect(() => {
        if (currentUser) {
            fetchStats();
        }
    }, [currentUser]);

    useEffect(() => {
        if (selectedStore && selectedStore.storeId) {
            fetchStoreStats(selectedStore.storeId);
        } else {
            setStoreStats(null);
        }
    }, [selectedStore]);

    // 使用Recharts重构的周统计图表
    const renderWeeklyChart = (weeklyStats) => {
        if (!weeklyStats || !weeklyStats.dates || weeklyStats.dates.length === 0) {
            return <Empty description="暂无数据" />;
        }

        // 重新构建适用于Recharts的数据格式
        const chartData = weeklyStats.dates.map((date, index) => ({
            date: date,
            订单数: weeklyStats.orderCounts[index],
            销售额: parseFloat(weeklyStats.salesAmounts[index])
        }));

        return (
            <ResponsiveContainer width="100%" height={350}>
                <LineChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis yAxisId="left" />
                    <YAxis yAxisId="right" orientation="right" />
                    <Tooltip formatter={(value, name) => [
                        name === '订单数' ? value : `¥${value.toFixed(2)}`,
                        name
                    ]} />
                    <Legend />
                    <Line
                        yAxisId="left"
                        type="monotone"
                        dataKey="订单数"
                        stroke="#1890ff"
                        activeDot={{ r: 8 }}
                        strokeWidth={2}
                    />
                    <Line
                        yAxisId="right"
                        type="monotone"
                        dataKey="销售额"
                        stroke="#52c41a"
                        strokeWidth={2}
                    />
                </LineChart>
            </ResponsiveContainer>
        );
    };

    // 管理员统计视图
    const renderAdminStats = () => {
        if (!statsData) return null;

        return (
            <div className={styles.adminDashboard}>
                <div className={styles.dashboardHeader}>
                    <Title level={4}>平台概览</Title>
                    <Space>
                        <Button
                            type="primary"
                            icon={<LineChartOutlined />}
                            onClick={fetchStats}
                        >
                            刷新数据
                        </Button>
                    </Space>
                </div>

                <Row gutter={[16, 16]}>
                    <Col xs={24} sm={12} md={6}>
                        <Card className={styles.statCard}>
                            <Statistic
                                title="总订单数"
                                value={statsData.totalOrders}
                                prefix={<ShoppingCartOutlined />}
                                valueStyle={{ color: '#1890ff' }}
                            />
                        </Card>
                    </Col>
                    <Col xs={24} sm={12} md={6}>
                        <Card className={styles.statCard}>
                            <Statistic
                                title="总交易额"
                                value={statsData.totalSales}
                                precision={2}
                                prefix={<DollarOutlined />}
                                suffix="元"
                                valueStyle={{ color: '#3f8600' }}
                            />
                        </Card>
                    </Col>
                    <Col xs={24} sm={12} md={6}>
                        <Card className={styles.statCard}>
                            <Statistic
                                title="店铺数量"
                                value={statsData.totalStores}
                                prefix={<ShopOutlined />}
                                valueStyle={{ color: '#722ed1' }}
                            />
                        </Card>
                    </Col>
                    <Col xs={24} sm={12} md={6}>
                        <Card className={styles.statCard}>
                            <Statistic
                                title="商品数量"
                                value={statsData.totalProducts}
                                prefix={<AppstoreOutlined />}
                                valueStyle={{ color: '#fa8c16' }}
                            />
                        </Card>
                    </Col>
                </Row>

                <Divider orientation="left">今日统计</Divider>
                <Row gutter={[16, 16]}>
                    <Col xs={24} sm={12}>
                        <Card className={styles.statCard}>
                            <Statistic
                                title="今日订单数"
                                value={statsData.todayOrderCount}
                                prefix={<ShoppingCartOutlined />}
                                valueStyle={{ color: '#1890ff' }}
                            />
                        </Card>
                    </Col>
                    <Col xs={24} sm={12}>
                        <Card className={styles.statCard}>
                            <Statistic
                                title="今日销售额"
                                value={statsData.todaySales}
                                precision={2}
                                prefix={<DollarOutlined />}
                                suffix="元"
                                valueStyle={{ color: '#3f8600' }}
                            />
                        </Card>
                    </Col>
                </Row>

                <Divider orientation="left">近7天趋势</Divider>
                <Card title="近7天交易趋势" className={styles.chartCard}>
                    {renderWeeklyChart(statsData.weeklyStats)}
                </Card>

                <Divider orientation="left">热门店铺</Divider>
                <Card title="热门店铺排行" className={styles.tableCard}>
                    <Table
                        dataSource={statsData.topStores}
                        rowKey="storeId"
                        columns={[
                            {
                                title: '店铺名称',
                                dataIndex: 'storeName',
                                key: 'storeName',
                            },
                            {
                                title: '商家',
                                dataIndex: 'merchantName',
                                key: 'merchantName',
                            },
                            {
                                title: '订单数',
                                dataIndex: 'orderCount',
                                key: 'orderCount',
                                sorter: (a, b) => a.orderCount - b.orderCount,
                            },
                            {
                                title: '销售额',
                                dataIndex: 'salesAmount',
                                key: 'salesAmount',
                                render: (text) => `¥${parseFloat(text).toFixed(2)}`,
                                sorter: (a, b) => a.salesAmount - b.salesAmount,
                            },
                            {
                                title: '评分',
                                dataIndex: 'rating',
                                key: 'rating',
                                render: (text) => text.toFixed(1),
                                sorter: (a, b) => a.rating - b.rating,
                            },
                        ]}
                        pagination={false}
                    />
                </Card>

                <Divider orientation="left">热门商品</Divider>
                <Card title="热门商品排行" className={styles.tableCard}>
                    <Table
                        dataSource={statsData.topProducts}
                        rowKey="productId"
                        columns={[
                            {
                                title: '商品名称',
                                dataIndex: 'productName',
                                key: 'productName',
                            },
                            {
                                title: '店铺',
                                dataIndex: 'storeName',
                                key: 'storeName',
                            },
                            {
                                title: '单价',
                                dataIndex: 'price',
                                key: 'price',
                                render: (text) => `¥${parseFloat(text).toFixed(2)}`,
                            },
                            {
                                title: '订单数',
                                dataIndex: 'orderCount',
                                key: 'orderCount',
                                sorter: (a, b) => a.orderCount - b.orderCount,
                            },
                            {
                                title: '销售额',
                                dataIndex: 'salesAmount',
                                key: 'salesAmount',
                                render: (text) => `¥${parseFloat(text).toFixed(2)}`,
                                sorter: (a, b) => a.salesAmount - b.salesAmount,
                            },
                        ]}
                        pagination={false}
                    />
                </Card>
            </div>
        );
    };

    // 商家统计视图
    const renderMerchantStats = () => {
        if (!statsData) return null;

        // 如果商家没有店铺
        if (!statsData.hasStores) {
            return (
                <div className={styles.noStoresMessage}>
                    <Empty
                        description="您还没有创建店铺，请先创建一个店铺"
                        image={Empty.PRESENTED_IMAGE_SIMPLE}
                    />
                    <Button
                        type="primary"
                        onClick={() => window.location.href = '/shop/merchant/store/add'}
                    >
                        创建店铺
                    </Button>
                </div>
            );
        }

        return (
            <div className={styles.merchantDashboard}>
                <div className={styles.dashboardHeader}>
                    <Title level={4}>商家概览</Title>
                    <Space>
                        <Button
                            type="primary"
                            icon={<LineChartOutlined />}
                            onClick={fetchStats}
                        >
                            刷新数据
                        </Button>
                    </Space>
                </div>

                <Row gutter={[16, 16]}>
                    <Col xs={24} sm={12} md={6}>
                        <Card className={styles.statCard}>
                            <Statistic
                                title="总订单数"
                                value={statsData.totalOrders}
                                prefix={<ShoppingCartOutlined />}
                                valueStyle={{ color: '#1890ff' }}
                            />
                        </Card>
                    </Col>
                    <Col xs={24} sm={12} md={6}>
                        <Card className={styles.statCard}>
                            <Statistic
                                title="总交易额"
                                value={statsData.totalSales}
                                precision={2}
                                prefix={<DollarOutlined />}
                                suffix="元"
                                valueStyle={{ color: '#3f8600' }}
                            />
                        </Card>
                    </Col>
                    <Col xs={24} sm={12} md={6}>
                        <Card className={styles.statCard}>
                            <Statistic
                                title="待确认订单"
                                value={statsData.pendingOrders}
                                prefix={<ExclamationCircleOutlined />}
                                valueStyle={{ color: statsData.pendingOrders > 0 ? '#ff4d4f' : '#3f8600' }}
                            />
                            {statsData.pendingOrders > 0 && (
                                <div className={styles.pendingAction}>
                                    <Button
                                        type="link"
                                        size="small"
                                        onClick={() => window.location.href = '/shop/merchant/orders'}
                                    >
                                        立即处理
                                    </Button>
                                </div>
                            )}
                        </Card>
                    </Col>
                    <Col xs={24} sm={12} md={6}>
                        <Card className={styles.statCard}>
                            <Statistic
                                title="店铺数量"
                                value={statsData.storeCount}
                                prefix={<ShopOutlined />}
                                valueStyle={{ color: '#722ed1' }}
                            />
                        </Card>
                    </Col>
                </Row>

                <Divider orientation="left">今日统计</Divider>
                <Row gutter={[16, 16]}>
                    <Col xs={24} sm={12}>
                        <Card className={styles.statCard}>
                            <Statistic
                                title="今日订单数"
                                value={statsData.todayOrderCount}
                                prefix={<ShoppingCartOutlined />}
                                valueStyle={{ color: '#1890ff' }}
                            />
                        </Card>
                    </Col>
                    <Col xs={24} sm={12}>
                        <Card className={styles.statCard}>
                            <Statistic
                                title="今日销售额"
                                value={statsData.todaySales}
                                precision={2}
                                prefix={<DollarOutlined />}
                                suffix="元"
                                valueStyle={{ color: '#3f8600' }}
                            />
                        </Card>
                    </Col>
                </Row>

                <Divider orientation="left">店铺概况</Divider>
                <Card title="我的店铺" className={styles.storesCard}>
                    <List
                        dataSource={statsData.stores}
                        renderItem={(store) => (
                            <List.Item
                                key={store.storeId}
                                actions={[
                                    <Button
                                        type="link"
                                        onClick={() => fetchStoreStats(store.storeId)}
                                    >
                                        查看详情
                                    </Button>,
                                ]}
                            >
                                <List.Item.Meta
                                    title={
                                        <Space>
                                            {store.storeName}
                                            <Badge
                                                status={
                                                    store.status === 'ACTIVE' ? 'success' :
                                                        store.status === 'PENDING_REVIEW' ? 'processing' :
                                                            store.status === 'SUSPENDED' ? 'warning' :
                                                                'default'
                                                }
                                                text={
                                                    store.status === 'ACTIVE' ? '营业中' :
                                                        store.status === 'PENDING_REVIEW' ? '审核中' :
                                                            store.status === 'SUSPENDED' ? '已暂停' :
                                                                store.status === 'CLOSED' ? '已关闭' :
                                                                    store.status
                                                }
                                            />
                                        </Space>
                                    }
                                    description={`评分: ${store.rating.toFixed(1)}/5.0`}
                                />
                                <div>
                                    <Text>订单数: {store.totalOrders}</Text>
                                    <Divider type="vertical" />
                                    <Text>交易额: ¥{parseFloat(store.totalSales).toFixed(2)}</Text>
                                    <Divider type="vertical" />
                                    <Text>待处理: {store.pendingOrders}</Text>
                                </div>
                            </List.Item>
                        )}
                    />
                </Card>
            </div>
        );
    };

    // 店铺详情视图
    const renderStoreDetails = () => {
        if (!storeStats) return null;

        return (
            <div className={styles.storeDetails}>
                <div className={styles.dashboardHeader}>
                    <Title level={4}>{storeStats.storeName} 详细数据</Title>
                    <Space>
                        <Button
                            type="default"
                            onClick={() => setStoreStats(null)}
                        >
                            返回
                        </Button>
                        <Button
                            type="primary"
                            icon={<LineChartOutlined />}
                            onClick={() => fetchStoreStats(storeStats.storeId)}
                        >
                            刷新数据
                        </Button>
                    </Space>
                </div>

                <Row gutter={[16, 16]}>
                    <Col xs={24} sm={8}>
                        <Card className={styles.statCard}>
                            <Statistic
                                title="商品数量"
                                value={storeStats.productCount}
                                prefix={<AppstoreOutlined />}
                                valueStyle={{ color: '#fa8c16' }}
                            />
                        </Card>
                    </Col>
                    <Col xs={24} sm={8}>
                        <Card className={styles.statCard}>
                            <Statistic
                                title="今日销售额"
                                value={storeStats.todaySales}
                                precision={2}
                                prefix={<DollarOutlined />}
                                suffix="元"
                                valueStyle={{ color: '#3f8600' }}
                            />
                        </Card>
                    </Col>
                    <Col xs={24} sm={8}>
                        <Card className={styles.statCard}>
                            <Statistic
                                title="今日订单数"
                                value={storeStats.todayOrderCount}
                                prefix={<ShoppingCartOutlined />}
                                valueStyle={{ color: '#1890ff' }}
                            />
                        </Card>
                    </Col>
                </Row>

                <Card
                    title="近7天交易趋势"
                    className={styles.chartCard}
                    extra={
                        <CalendarOutlined />
                    }
                >
                    {renderWeeklyChart(storeStats.weeklyStats)}
                </Card>

                <Card
                    title="热门商品"
                    className={styles.tableCard}
                    extra={
                        <Button
                            type="link"
                            size="small"
                            onClick={() => window.location.href = `/shop/merchant/products?storeId=${storeStats.storeId}`}
                        >
                            商品管理
                        </Button>
                    }
                >
                    <Table
                        dataSource={storeStats.topProducts}
                        rowKey="productId"
                        columns={[
                            {
                                title: '商品名称',
                                dataIndex: 'productName',
                                key: 'productName',
                            },
                            {
                                title: '单价',
                                dataIndex: 'price',
                                key: 'price',
                                render: (text) => `¥${parseFloat(text).toFixed(2)}`,
                            },
                            {
                                title: '订单数',
                                dataIndex: 'orderCount',
                                key: 'orderCount',
                                sorter: (a, b) => a.orderCount - b.orderCount,
                            },
                            {
                                title: '销售额',
                                dataIndex: 'salesAmount',
                                key: 'salesAmount',
                                render: (text) => `¥${parseFloat(text).toFixed(2)}`,
                                sorter: (a, b) => a.salesAmount - b.salesAmount,
                            },
                        ]}
                        pagination={false}
                    />
                </Card>
            </div>
        );
    };

    // 加载中状态
    if (loading) {
        return (
            <div className={styles.loadingContainer}>
                <Spin size="large" />
                <div className={styles.loadingText}>加载数据中...</div>
            </div>
        );
    }

    // 错误状态
    if (error) {
        return (
            <div className={styles.errorContainer}>
                <Alert
                    message="加载失败"
                    description={error}
                    type="error"
                    showIcon
                    action={
                        <Button type="primary" onClick={fetchStats}>
                            重试
                        </Button>
                    }
                />
            </div>
        );
    }

    // 根据用户角色和状态渲染不同的视图
    if (storeStats) {
        return renderStoreDetails();
    } else if (isAdmin) {
        return renderAdminStats();
    } else {
        return renderMerchantStats();
    }
};

export default Dashboard;