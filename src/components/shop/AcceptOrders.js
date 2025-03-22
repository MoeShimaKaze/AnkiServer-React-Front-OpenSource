// src/components/shop/AcceptOrders.js
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
    Card, Typography, Button, List, Spin, Empty, Tabs, message,
    Tag, Badge, Space, Statistic, Switch, Divider,
    Radio, Modal
} from 'antd';
import {
    EnvironmentOutlined, ClockCircleOutlined, ShopOutlined, QuestionCircleOutlined,
    CarOutlined, InfoCircleOutlined
} from '@ant-design/icons';
import Navbar from '../base/Navbar';
import { useAuth } from '../context/AuthContext';
import { useMapContext } from '../context/MapContext';
import styles from '../../assets/css/shop/AcceptOrders.module.css';

const { Title, Text, Paragraph } = Typography;
const { TabPane } = Tabs;
const { confirm } = Modal;

const AcceptOrders = () => {
    const navigate = useNavigate();
    const { isLoggedIn, userId } = useAuth();
    const { key: mapKey } = useMapContext();

    const [loading, setLoading] = useState(true);
    const [availableOrders, setAvailableOrders] = useState([]);
    const [myOrders, setMyOrders] = useState([]);
    const [locationEnabled, setLocationEnabled] = useState(false);
    const [userLocation, setUserLocation] = useState(null);
    const [locationLoading, setLocationLoading] = useState(false);
    const [acceptLoading, setAcceptLoading] = useState(false);
    const [activeTab, setActiveTab] = useState('available');
    const [deliveryTypeFilter, setDeliveryTypeFilter] = useState('all');

    // 获取用户位置
    const getUserLocation = () => {
        if (!locationEnabled) {
            setUserLocation(null);
            fetchAvailableOrders();
            return;
        }

        setLocationLoading(true);
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    const location = {
                        latitude: position.coords.latitude,
                        longitude: position.coords.longitude
                    };
                    setUserLocation(location);
                    fetchAvailableOrders(location);
                    setLocationLoading(false);
                },
                (error) => {
                    console.error('Error getting user location:', error);
                    message.warning('无法获取您的位置，请检查定位权限');
                    setLocationLoading(false);
                    setLocationEnabled(false);
                }
            );
        } else {
            message.error('您的浏览器不支持定位功能');
            setLocationLoading(false);
            setLocationEnabled(false);
        }
    };

    const fetchAvailableOrders = async (location) => {
        if (!isLoggedIn) {
            navigate('/login', { state: { from: '/shop/delivery/accept' } });
            return;
        }

        try {
            setLoading(true);

            let url = 'http://127.0.0.1:8080/api/shopping/orders/available';
            let params;

            // 如果有位置信息，按位置查询
            if (location) {
                url = 'http://127.0.0.1:8080/api/shopping/orders/available';
                params = {
                    latitude: location.latitude,
                    longitude: location.longitude,
                    distance: 5, // 5公里内
                    deliveryType: deliveryTypeFilter !== 'all' ? deliveryTypeFilter : undefined
                };
            } else {
                params = {
                    deliveryType: deliveryTypeFilter !== 'all' ? deliveryTypeFilter : undefined,
                    page: 0,
                    size: 50
                };
            }

            const response = await axios.get(url, {
                params,
                withCredentials: true
            });

            setAvailableOrders(response.data.content || []);
            setLoading(false);
        } catch (error) {
            console.error('Error fetching available orders:', error);
            message.error('获取可接单列表失败');
            setLoading(false);
        }
    };

    const fetchMyOrders = async () => {
        if (!isLoggedIn) return;

        try {
            const response = await axios.get('http://127.0.0.1:8080/api/shopping/orders/deliverer', {
                withCredentials: true
            });

            setMyOrders(response.data || []);
        } catch (error) {
            console.error('Error fetching my orders:', error);
            message.error('获取我的配送订单失败');
        }
    };

    useEffect(() => {
        if (activeTab === 'available') {
            if (locationEnabled && userLocation) {
                fetchAvailableOrders(userLocation);
            } else {
                fetchAvailableOrders();
            }
        } else {
            fetchMyOrders();
        }
    }, [activeTab, locationEnabled, deliveryTypeFilter, isLoggedIn]);

    const handleTabChange = (key) => {
        setActiveTab(key);
    };

    const handleLocationToggle = (checked) => {
        setLocationEnabled(checked);
        if (checked) {
            getUserLocation();
        } else {
            setUserLocation(null);
            fetchAvailableOrders();
        }
    };

    const handleDeliveryTypeChange = (e) => {
        setDeliveryTypeFilter(e.target.value);
    };

    const handleAcceptOrder = (orderNumber) => {
        confirm({
            title: '确认接单',
            icon: <QuestionCircleOutlined />,
            content: '您确定要接此订单吗？接单后您需要按时完成配送任务。',
            onOk() {
                return acceptOrder(orderNumber);
            }
        });
    };

    const acceptOrder = async (orderNumber) => {
        try {
            setAcceptLoading(true);
            await axios.post(`http://127.0.0.1:8080/api/shopping/orders/${orderNumber}/accept`, null, {
                withCredentials: true
            });

            message.success('接单成功');
            setAcceptLoading(false);

            // 刷新列表
            if (locationEnabled && userLocation) {
                fetchAvailableOrders(userLocation);
            } else {
                fetchAvailableOrders();
            }
            fetchMyOrders();

            setActiveTab('myOrders');
        } catch (error) {
            console.error('Error accepting order:', error);
            message.error('接单失败: ' + (error.response?.data || error.message));
            setAcceptLoading(false);
        }
    };

    const handleUpdateDeliveryStatus = async (orderNumber, newStatus) => {
        try {
            await axios.put(`http://127.0.0.1:8080/api/shopping/orders/${orderNumber}/status`, null, {
                params: { newStatus },
                withCredentials: true
            });

            message.success('状态更新成功');
            fetchMyOrders();
        } catch (error) {
            console.error('Error updating delivery status:', error);
            message.error('更新状态失败: ' + (error.response?.data || error.message));
        }
    };

    const handleViewOrderDetail = (orderNumber) => {
        navigate(`/shop/orders/${orderNumber}`);
    };

    // 计算两点之间的距离（公里）
    const calculateDistance = (point1, point2) => {
        if (!point1 || !point2) return null;

        const R = 6371; // 地球半径，单位为公里
        const dLat = (point2.latitude - point1.latitude) * Math.PI / 180;
        const dLon = (point2.longitude - point1.longitude) * Math.PI / 180;
        const a =
            Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(point1.latitude * Math.PI / 180) * Math.cos(point2.latitude * Math.PI / 180) *
            Math.sin(dLon/2) * Math.sin(dLon/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        return R * c;
    };

    const renderAvailableOrderItem = (order) => {
        const distance = userLocation
            ? calculateDistance(userLocation, { latitude: order.deliveryLatitude, longitude: order.deliveryLongitude })
            : null;

        return (
            <List.Item key={order.orderNumber}>
                <Card
                    className={styles.orderCard}
                    hoverable
                >
                    <div className={styles.orderHeader}>
                        <div className={styles.orderInfo}>
                            <div className={styles.orderNumber}>
                                <Text strong>订单号: {order.orderNumber.substring(0, 8)}...</Text>
                                <Text type="secondary">
                                    {new Date(order.createdAt).toLocaleString()}
                                </Text>
                            </div>
                            <div className={styles.orderTags}>
                                <Tag color={order.deliveryType === 'MUTUAL' ? 'blue' : 'purple'}>
                                    {order.deliveryType === 'MUTUAL' ? '互助配送' : '平台配送'}
                                </Tag>
                                <Badge status="warning" text="待接单" />
                            </div>
                        </div>
                    </div>

                    <div className={styles.orderContent}>
                        <div className={styles.orderMain}>
                            <div className={styles.storeInfo}>
                                <Space>
                                    <ShopOutlined />
                                    <Text strong>{order.storeName}</Text>
                                </Space>
                            </div>

                            <div className={styles.productInfo}>
                                <Text>{order.productName} x{order.quantity}</Text>
                            </div>

                            <div className={styles.addressInfo}>
                                <Space direction="vertical" size={1}>
                                    <div className={styles.deliveryAddress}>
                                        <EnvironmentOutlined />
                                        <Text>配送至: {order.deliveryAddress}</Text>
                                    </div>

                                    {distance && (
                                        <div className={styles.distanceInfo}>
                                            <Text type="secondary">距离您: {distance.toFixed(2)}公里</Text>
                                        </div>
                                    )}
                                </Space>
                            </div>
                        </div>

                        <div className={styles.orderPricing}>
                            <Statistic
                                title="配送费"
                                value={order.deliveryFee}
                                precision={2}
                                prefix="¥"
                                valueStyle={{ color: '#1890ff' }}
                            />
                            <Text type="secondary">订单总价: ¥{order.totalAmount.toFixed(2)}</Text>
                        </div>
                    </div>

                    <Divider style={{ margin: '12px 0' }} />

                    <div className={styles.orderActions}>
                        <Button
                            type="primary"
                            icon={<CarOutlined />}
                            onClick={() => handleAcceptOrder(order.orderNumber)}
                            loading={acceptLoading}
                        >
                            接单
                        </Button>

                        <Button
                            type="link"
                            icon={<InfoCircleOutlined />}
                            onClick={() => handleViewOrderDetail(order.orderNumber)}
                        >
                            查看详情
                        </Button>
                    </div>
                </Card>
            </List.Item>
        );
    };

    const renderMyOrderItem = (order) => {
        const isInTransit = order.orderStatus === 'IN_TRANSIT';
        const isAssigned = order.orderStatus === 'ASSIGNED';

        return (
            <List.Item key={order.orderNumber}>
                <Card className={styles.orderCard}>
                    <div className={styles.orderHeader}>
                        <div className={styles.orderInfo}>
                            <div className={styles.orderNumber}>
                                <Text strong>订单号: {order.orderNumber.substring(0, 8)}...</Text>
                                <Text type="secondary">
                                    {new Date(order.createdAt).toLocaleString()}
                                </Text>
                            </div>
                            <div className={styles.orderTags}>
                                <Tag color={order.deliveryType === 'MUTUAL' ? 'blue' : 'purple'}>
                                    {order.deliveryType === 'MUTUAL' ? '互助配送' : '平台配送'}
                                </Tag>
                                <Badge
                                    status={isInTransit ? "processing" : isAssigned ? "warning" : "default"}
                                    text={isInTransit ? "配送中" : isAssigned ? "已接单" : order.orderStatus}
                                />
                            </div>
                        </div>
                    </div>

                    <div className={styles.orderContent}>
                        <div className={styles.orderMain}>
                            <div className={styles.storeInfo}>
                                <Space>
                                    <ShopOutlined />
                                    <Text strong>{order.storeName}</Text>
                                </Space>
                            </div>

                            <div className={styles.productInfo}>
                                <Text>{order.productName} x{order.quantity}</Text>
                            </div>

                            <div className={styles.customerInfo}>
                                <Space>
                                    <Text>收货人: {order.recipientName}</Text>
                                    <Text>{order.recipientPhone}</Text>
                                </Space>
                            </div>

                            <div className={styles.addressInfo}>
                                <Space>
                                    <EnvironmentOutlined />
                                    <Text ellipsis={{ tooltip: order.deliveryAddress }}>
                                        {order.deliveryAddress}
                                    </Text>
                                </Space>
                            </div>
                        </div>

                        <div className={styles.orderPricing}>
                            <Statistic
                                title="配送费"
                                value={order.deliveryFee}
                                precision={2}
                                prefix="¥"
                                valueStyle={{ color: '#1890ff' }}
                            />
                            <div className={styles.deliveryTime}>
                                <ClockCircleOutlined />
                                <Text type="secondary">
                                    {order.expectedDeliveryTime
                                        ? `预计送达: ${new Date(order.expectedDeliveryTime).toLocaleString()}`
                                        : '送达时间未设置'}
                                </Text>
                            </div>
                        </div>
                    </div>

                    <Divider style={{ margin: '12px 0' }} />

                    <div className={styles.orderActions}>
                        {isAssigned && (
                            <Button
                                type="primary"
                                onClick={() => handleUpdateDeliveryStatus(order.orderNumber, 'IN_TRANSIT')}
                            >
                                开始配送
                            </Button>
                        )}

                        {isInTransit && (
                            <Button
                                type="primary"
                                onClick={() => handleUpdateDeliveryStatus(order.orderNumber, 'DELIVERED')}
                            >
                                已送达
                            </Button>
                        )}

                        <Button
                            type="link"
                            icon={<InfoCircleOutlined />}
                            onClick={() => handleViewOrderDetail(order.orderNumber)}
                        >
                            查看详情
                        </Button>
                    </div>
                </Card>
            </List.Item>
        );
    };

    return (
        <div className={styles.acceptOrdersContainer}>
            <Navbar />
            <div className={styles.contentWrapper}>
                <div className={styles.pageHeader}>
                    <Title level={3}>
                        <CarOutlined /> 配送接单
                    </Title>
                </div>

                <Card className={styles.orderListCard}>
                    <Tabs
                        activeKey={activeTab}
                        onChange={handleTabChange}
                        className={styles.orderTabs}
                    >
                        <TabPane tab="可接订单" key="available" />
                        <TabPane tab="我的配送" key="myOrders" />
                    </Tabs>

                    {activeTab === 'available' && (
                        <div className={styles.filterSection}>
                            <div className={styles.filterItem}>
                                <Text>位置筛选:</Text>
                                <Switch
                                    checked={locationEnabled}
                                    onChange={handleLocationToggle}
                                    loading={locationLoading}
                                />
                                <Text type="secondary">
                                    {locationEnabled ? '按距离排序' : '显示所有可接订单'}
                                </Text>

                                {userLocation && (
                                    <Text type="secondary" className={styles.locationInfo}>
                                        当前位置: {userLocation.latitude.toFixed(4)}, {userLocation.longitude.toFixed(4)}
                                    </Text>
                                )}
                            </div>

                            <div className={styles.filterItem}>
                                <Text>配送类型:</Text>
                                <Radio.Group
                                    value={deliveryTypeFilter}
                                    onChange={handleDeliveryTypeChange}
                                    buttonStyle="solid"
                                >
                                    <Radio.Button value="all">全部</Radio.Button>
                                    <Radio.Button value="MUTUAL">互助配送</Radio.Button>
                                    <Radio.Button value="PLATFORM">平台配送</Radio.Button>
                                </Radio.Group>
                            </div>
                        </div>
                    )}

                    {loading ? (
                        <div className={styles.loadingContainer}>
                            <Spin size="large" />
                        </div>
                    ) : activeTab === 'available' ? (
                        availableOrders.length > 0 ? (
                            <List
                                className={styles.orderList}
                                itemLayout="vertical"
                                dataSource={availableOrders}
                                renderItem={renderAvailableOrderItem}
                                pagination={{
                                    onChange: (page) => {
                                        window.scrollTo(0, 0);
                                    },
                                    pageSize: 5,
                                    showTotal: (total) => `共 ${total} 个可接订单`
                                }}
                            />
                        ) : (
                            <div className={styles.emptyContainer}>
                                <Empty description="暂无可接订单" />
                            </div>
                        )
                    ) : (
                        myOrders.length > 0 ? (
                            <List
                                className={styles.orderList}
                                itemLayout="vertical"
                                dataSource={myOrders}
                                renderItem={renderMyOrderItem}
                                pagination={{
                                    onChange: (page) => {
                                        window.scrollTo(0, 0);
                                    },
                                    pageSize: 5,
                                    showTotal: (total) => `共 ${total} 个配送订单`
                                }}
                            />
                        ) : (
                            <div className={styles.emptyContainer}>
                                <Empty description="您还没有接单记录" />
                                <Button
                                    type="primary"
                                    onClick={() => setActiveTab('available')}
                                >
                                    去接单
                                </Button>
                            </div>
                        )
                    )}
                </Card>
            </div>
        </div>
    );
};

export default AcceptOrders;