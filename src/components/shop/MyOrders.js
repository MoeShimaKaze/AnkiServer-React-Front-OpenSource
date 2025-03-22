// src/components/shop/MyOrders.js
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
    Tabs, Card, Typography, Button, Empty, Spin, List, Space,
    Tag, Badge, Divider, Row, Col, message, Modal,
    Statistic, Popconfirm
} from 'antd';
import {
    ShoppingOutlined, CheckCircleOutlined, ClockCircleOutlined,
    CarOutlined, InfoCircleOutlined, ExclamationCircleOutlined,
    FileTextOutlined, StarOutlined, DollarOutlined,
    ShopOutlined, PhoneOutlined
} from '@ant-design/icons';
import Navbar from '../base/Navbar';
import { useAuth } from '../context/AuthContext';
import styles from '../../assets/css/shop/MyOrders.module.css';

const { Title, Text, Paragraph } = Typography;
const { TabPane } = Tabs;
const { confirm } = Modal;

const OrderStatusBadge = ({ status }) => {
    const statusConfig = {
        'PAYMENT_PENDING': { status: 'warning', text: '待支付', icon: <ClockCircleOutlined /> },
        'PENDING': { status: 'warning', text: '待接单', icon: <ClockCircleOutlined /> },
        'ASSIGNED': { status: 'processing', text: '已接单', icon: <CarOutlined /> },
        'IN_TRANSIT': { status: 'processing', text: '配送中', icon: <CarOutlined /> },
        'DELIVERED': { status: 'success', text: '已送达', icon: <CheckCircleOutlined /> },
        'COMPLETED': { status: 'success', text: '已完成', icon: <CheckCircleOutlined /> },
        'PLATFORM_INTERVENTION': { status: 'error', text: '平台介入中', icon: <ExclamationCircleOutlined /> },
        'REFUNDING': { status: 'warning', text: '退款中', icon: <DollarOutlined /> },
        'REFUNDED': { status: 'default', text: '已退款', icon: <DollarOutlined /> },
        'CANCELLED': { status: 'default', text: '已取消', icon: <InfoCircleOutlined /> },
        'PAYMENT_TIMEOUT': { status: 'default', text: '支付超时', icon: <ClockCircleOutlined /> },
        'MERCHANT_PENDING': { status: 'warning', text: '等待商家确认', icon: <ShopOutlined /> }
    };

    const config = statusConfig[status] || { status: 'default', text: status, icon: <InfoCircleOutlined /> };

    return (
        <Badge
            status={config.status}
            text={<Space>{config.icon} {config.text}</Space>}
        />
    );
};

const DeliveryTypeBadge = ({ type }) => {
    return type === 'MUTUAL' ? (
        <Tag color="blue">互助配送</Tag>
    ) : (
        <Tag color="purple">平台配送</Tag>
    );
};

const MyOrders = () => {
    const navigate = useNavigate();
    const { isLoggedIn, userId } = useAuth();

    const [activeTab, setActiveTab] = useState('pending');
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [deliveryLoading, setDeliveryLoading] = useState(false);

    const getStatusByTab = (tab) => {
        switch (tab) {
            case 'pending':
                return ['PENDING', 'ASSIGNED', 'IN_TRANSIT', 'MERCHANT_PENDING'];
            case 'completed':
                return ['DELIVERED', 'COMPLETED'];
            case 'refunding':
                return ['REFUNDING', 'REFUNDED'];
            case 'cancelled':
                return ['CANCELLED', 'PAYMENT_TIMEOUT'];
            default:
                return null; // All orders
        }
    };

    const fetchOrders = async () => {
        if (!isLoggedIn) {
            navigate('/login', { state: { from: '/shop/orders' } });
            return;
        }

        try {
            setLoading(true);

            const statusList = getStatusByTab(activeTab);
            const params = statusList ? { status: statusList } : {};

            const response = await axios.get('http://127.0.0.1:8080/api/shopping/orders/user', {
                params: params,
                paramsSerializer: params => {
                    // 使用 URLSearchParams 正确序列化数组参数
                    const searchParams = new URLSearchParams();
                    Object.keys(params).forEach(key => {
                        const value = params[key];
                        if (Array.isArray(value)) {
                            value.forEach(val => searchParams.append(key, val));
                        } else {
                            searchParams.append(key, value);
                        }
                    });
                    return searchParams.toString();
                },
                withCredentials: true
            });

            setOrders(response.data.content || []);
            setLoading(false);
        } catch (error) {
            console.error('Error fetching orders:', error);
            message.error('获取订单列表失败');
            setLoading(false);
        }
    };
    useEffect(() => {
        fetchOrders();
    }, [activeTab, isLoggedIn]);

    const handleTabChange = (key) => {
        setActiveTab(key);
    };

    const handleOrderClick = (orderNumber) => {
        navigate(`/shop/orders/${orderNumber}`);
    };

    const handleConfirmDelivery = async (orderNumber) => {
        try {
            setDeliveryLoading(true);
            await axios.put(`http://127.0.0.1:8080/api/shopping/orders/${orderNumber}/status`, null, {
                params: { newStatus: 'COMPLETED' },
                withCredentials: true
            });
            message.success('确认收货成功');
            fetchOrders();
            setDeliveryLoading(false);
        } catch (error) {
            console.error('Error confirming delivery:', error);
            message.error('确认收货失败');
            setDeliveryLoading(false);
        }
    };

    const handleRequestRefund = (order) => {
        confirm({
            title: '申请退款',
            icon: <ExclamationCircleOutlined />,
            content: '您确定要申请退款吗？请在弹窗中填写退款原因。',
            okText: '确认',
            cancelText: '取消',
            onOk() {
                // 弹出输入框获取退款原因
                Modal.confirm({
                    title: '请输入退款原因',
                    content: (
                        <textarea
                            id="refundReason"
                            style={{ width: '100%', height: '80px', margin: '10px 0' }}
                            placeholder="请详细描述退款原因，以便商家和平台处理"
                        />
                    ),
                    onOk() {
                        const reason = document.getElementById('refundReason').value;
                        if (!reason.trim()) {
                            message.warning('请输入退款原因');
                            return Promise.reject('请输入退款原因');
                        }
                        return submitRefundRequest(order.orderNumber, reason);
                    }
                });
            }
        });
    };

    const submitRefundRequest = async (orderNumber, reason) => {
        try {
            await axios.post(`http://127.0.0.1:8080/api/shopping/orders/${orderNumber}/refund`, null, {
                params: { reason },
                withCredentials: true
            });
            message.success('退款申请提交成功');
            fetchOrders();
        } catch (error) {
            console.error('Error requesting refund:', error);
            message.error('申请退款失败: ' + (error.response?.data || error.message));
        }
    };

    const requestIntervention = (order) => {
        confirm({
            title: '申请平台介入',
            icon: <ExclamationCircleOutlined />,
            content: '您确定要申请平台介入处理此订单吗？请在弹窗中填写原因。',
            okText: '确认',
            cancelText: '取消',
            onOk() {
                // 弹出输入框获取介入原因
                Modal.confirm({
                    title: '请输入申请平台介入的原因',
                    content: (
                        <textarea
                            id="interventionReason"
                            style={{ width: '100%', height: '80px', margin: '10px 0' }}
                            placeholder="请详细描述问题，以便平台更好地处理"
                        />
                    ),
                    onOk() {
                        const reason = document.getElementById('interventionReason').value;
                        if (!reason.trim()) {
                            message.warning('请输入申请原因');
                            return Promise.reject('请输入申请原因');
                        }
                        return submitInterventionRequest(order.orderNumber, reason);
                    }
                });
            }
        });
    };

    const submitInterventionRequest = async (orderNumber, reason) => {
        try {
            await axios.post(`http://127.0.0.1:8080/api/shopping/orders/${orderNumber}/intervention`, null, {
                params: { reason },
                withCredentials: true
            });
            message.success('平台介入申请提交成功');
            fetchOrders();
        } catch (error) {
            console.error('Error requesting intervention:', error);
            message.error('申请平台介入失败: ' + (error.response?.data || error.message));
        }
    };

    const renderOrderItem = (order) => {
        const canConfirmDelivery = order.orderStatus === 'DELIVERED';
        const canRequestRefund = ['PENDING', 'ASSIGNED', 'IN_TRANSIT'].includes(order.orderStatus);
        const canRequestIntervention = !['COMPLETED', 'CANCELLED', 'PAYMENT_TIMEOUT', 'REFUNDING', 'REFUNDED', 'PLATFORM_INTERVENTION'].includes(order.orderStatus);

        return (
            <List.Item key={order.orderNumber}>
                <Card
                    className={styles.orderCard}
                    hoverable
                    onClick={() => handleOrderClick(order.orderNumber)}
                >
                    <div className={styles.orderHeader}>
                        <div className={styles.orderInfo}>
                            <div className={styles.orderNumber}>
                                <Text strong>订单号: {order.orderNumber.substring(0, 8)}...</Text>
                                <Text type="secondary">
                                    {new Date(order.createdAt).toLocaleString()}
                                </Text>
                            </div>
                            <div className={styles.orderStatus}>
                                <OrderStatusBadge status={order.orderStatus} />
                                <DeliveryTypeBadge type={order.deliveryType} />
                            </div>
                        </div>
                    </div>

                    <Divider className={styles.orderDivider} />

                    <div className={styles.orderContent}>
                        <Row gutter={16}>
                            <Col xs={24} sm={16}>
                                <div className={styles.productInfo}>
                                    <div className={styles.productName}>
                                        <Text strong>{order.productName}</Text>
                                        <Text type="secondary">x{order.quantity}</Text>
                                    </div>
                                    <div className={styles.storeInfo}>
                                        <ShopOutlined className={styles.storeIcon} />
                                        <Text>{order.storeName}</Text>
                                    </div>
                                    <div className={styles.recipientInfo}>
                                        <Space>
                                            <Text type="secondary">{order.recipientName}</Text>
                                            <PhoneOutlined />
                                            <Text type="secondary">{order.recipientPhone}</Text>
                                        </Space>
                                    </div>
                                </div>
                            </Col>
                            <Col xs={24} sm={8}>
                                <div className={styles.orderAmount}>
                                    <Statistic
                                        title="订单金额"
                                        value={order.totalAmount}
                                        precision={2}
                                        prefix="¥"
                                        valueStyle={{ color: '#1890ff' }}
                                    />
                                    {(order.expectedDeliveryTime || order.deliveredTime) && (
                                        <div className={styles.deliveryTime}>
                                            <ClockCircleOutlined />
                                            <Text type="secondary">
                                                {order.deliveredTime
                                                    ? `送达时间: ${new Date(order.deliveredTime).toLocaleString()}`
                                                    : `预计送达: ${new Date(order.expectedDeliveryTime).toLocaleString()}`}
                                            </Text>
                                        </div>
                                    )}
                                </div>
                            </Col>
                        </Row>
                    </div>

                    <Divider className={styles.orderDivider} />

                    <div className={styles.orderActions} onClick={(e) => e.stopPropagation()}>
                        {canConfirmDelivery && (
                            <Popconfirm
                                title="确认已收到商品？"
                                onConfirm={() => handleConfirmDelivery(order.orderNumber)}
                                okText="确认"
                                cancelText="取消"
                            >
                                <Button
                                    type="primary"
                                    icon={<CheckCircleOutlined />}
                                    loading={deliveryLoading}
                                >
                                    确认收货
                                </Button>
                            </Popconfirm>
                        )}

                        {canRequestRefund && (
                            <Button
                                type="default"
                                icon={<DollarOutlined />}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleRequestRefund(order);
                                }}
                            >
                                申请退款
                            </Button>
                        )}

                        {canRequestIntervention && (
                            <Button
                                type="default"
                                danger
                                icon={<ExclamationCircleOutlined />}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    requestIntervention(order);
                                }}
                            >
                                申请平台介入
                            </Button>
                        )}

                        {order.orderStatus === 'COMPLETED' && (
                            <Button
                                type="default"
                                icon={<StarOutlined />}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    navigate(`/shop/orders/${order.orderNumber}/rate`);
                                }}
                            >
                                评价订单
                            </Button>
                        )}

                        <Button
                            type="link"
                            icon={<FileTextOutlined />}
                            onClick={(e) => {
                                e.stopPropagation();
                                handleOrderClick(order.orderNumber);
                            }}
                        >
                            订单详情
                        </Button>
                    </div>
                </Card>
            </List.Item>
        );
    };

    return (
        <div className={styles.myOrdersContainer}>
            <Navbar />
            <div className={styles.contentWrapper}>
                <div className={styles.pageHeader}>
                    <Title level={3}>
                        <ShoppingOutlined /> 我的订单
                    </Title>
                </div>

                <Card className={styles.orderListCard}>
                    <Tabs
                        activeKey={activeTab}
                        onChange={handleTabChange}
                        className={styles.orderTabs}
                    >
                        <TabPane tab="进行中" key="pending" />
                        <TabPane tab="已完成" key="completed" />
                        <TabPane tab="退款/售后" key="refunding" />
                        <TabPane tab="已取消" key="cancelled" />
                        <TabPane tab="全部订单" key="all" />
                    </Tabs>

                    {loading ? (
                        <div className={styles.loadingContainer}>
                            <Spin size="large" />
                        </div>
                    ) : orders.length > 0 ? (
                        <List
                            className={styles.orderList}
                            itemLayout="vertical"
                            dataSource={orders}
                            renderItem={renderOrderItem}
                            pagination={{
                                onChange: (page) => {
                                    window.scrollTo(0, 0);
                                },
                                pageSize: 5,
                                showTotal: (total) => `共 ${total} 个订单`
                            }}
                        />
                    ) : (
                        <div className={styles.emptyContainer}>
                            <Empty description={
                                activeTab === 'pending' ? '没有进行中的订单' :
                                    activeTab === 'completed' ? '没有已完成的订单' :
                                        activeTab === 'refunding' ? '没有退款/售后订单' :
                                            activeTab === 'cancelled' ? '没有已取消的订单' :
                                                '没有订单记录'
                            } />
                            <Button
                                type="primary"
                                onClick={() => navigate('/shop')}
                            >
                                去购物
                            </Button>
                        </div>
                    )}
                </Card>
            </div>
        </div>
    );
};

export default MyOrders;