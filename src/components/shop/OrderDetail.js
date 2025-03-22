// src/components/shop/OrderDetail.js
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
    Card, Typography, Button, Divider, Descriptions, Spin, Empty, Breadcrumb, Tag, Badge, Space, Statistic, Row,
    Col, Modal, Input, message, Steps, Popconfirm
} from 'antd';
import {
    LeftOutlined, ShopOutlined, CheckCircleOutlined,
    ClockCircleOutlined, EnvironmentOutlined, PhoneOutlined, CarOutlined,
    ExclamationCircleOutlined, QuestionCircleOutlined, DollarOutlined,
    UserOutlined, StarOutlined, FileTextOutlined
} from '@ant-design/icons';
import Navbar from '../base/Navbar';
import MapModal from '../utils/amap/MapModal';
import RoutePlanningModal from '../utils/amap/RoutePlanningModal';
import { useAuth } from '../context/AuthContext';
import styles from '../../assets/css/shop/OrderDetail.module.css';

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;
const { Step } = Steps;
const { confirm } = Modal;

const OrderDetail = () => {
    const { orderNumber } = useParams();
    const navigate = useNavigate();
    const { isLoggedIn, userId } = useAuth();

    const [loading, setLoading] = useState(true);
    const [order, setOrder] = useState(null);
    const [deliveryLoading, setDeliveryLoading] = useState(false);
    const [showMapModal, setShowMapModal] = useState(false);
    const [showRouteModal, setShowRouteModal] = useState(false);

    const fetchOrderDetails = async () => {
        if (!isLoggedIn) {
            navigate('/login', { state: { from: `/shop/orders/${orderNumber}` } });
            return;
        }

        try {
            setLoading(true);
            const response = await axios.get(`http://127.0.0.1:8080/api/shopping/orders/${orderNumber}`, {
                withCredentials: true
            });

            setOrder(response.data);
            setLoading(false);
        } catch (error) {
            console.error('Error fetching order details:', error);
            message.error('获取订单详情失败');
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchOrderDetails();
    }, [orderNumber, isLoggedIn]);

    const handleBackClick = () => {
        navigate(-1);
    };

    const handleConfirmDelivery = async () => {
        try {
            setDeliveryLoading(true);
            await axios.put(`http://127.0.0.1:8080/api/shopping/orders/${orderNumber}/status`, null, {
                params: { newStatus: 'COMPLETED' },
                withCredentials: true
            });
            message.success('确认收货成功');
            fetchOrderDetails();
            setDeliveryLoading(false);
        } catch (error) {
            console.error('Error confirming delivery:', error);
            message.error('确认收货失败');
            setDeliveryLoading(false);
        }
    };

    const handleRequestRefund = () => {
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
                        <TextArea
                            id="refundReason"
                            rows={4}
                            placeholder="请详细描述退款原因，以便商家和平台处理"
                        />
                    ),
                    onOk() {
                        const reason = document.getElementById('refundReason').value;
                        if (!reason.trim()) {
                            message.warning('请输入退款原因');
                            return Promise.reject('请输入退款原因');
                        }
                        return submitRefundRequest(reason);
                    }
                });
            }
        });
    };

    const submitRefundRequest = async (reason) => {
        try {
            await axios.post(`http://127.0.0.1:8080/api/shopping/orders/${orderNumber}/refund`, null, {
                params: { reason },
                withCredentials: true
            });
            message.success('退款申请提交成功');
            fetchOrderDetails();
        } catch (error) {
            console.error('Error requesting refund:', error);
            message.error('申请退款失败: ' + (error.response?.data || error.message));
        }
    };

    const requestIntervention = () => {
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
                        <TextArea
                            id="interventionReason"
                            rows={4}
                            placeholder="请详细描述问题，以便平台更好地处理"
                        />
                    ),
                    onOk() {
                        const reason = document.getElementById('interventionReason').value;
                        if (!reason.trim()) {
                            message.warning('请输入申请原因');
                            return Promise.reject('请输入申请原因');
                        }
                        return submitInterventionRequest(reason);
                    }
                });
            }
        });
    };

    const submitInterventionRequest = async (reason) => {
        try {
            await axios.post(`http://127.0.0.1:8080/api/shopping/orders/${orderNumber}/intervention`, null, {
                params: { reason },
                withCredentials: true
            });
            message.success('平台介入申请提交成功');
            fetchOrderDetails();
        } catch (error) {
            console.error('Error requesting intervention:', error);
            message.error('申请平台介入失败: ' + (error.response?.data || error.message));
        }
    };

    const getStepStatus = (currentStatus, stepStatus) => {
        const orderSequence = [
            'PAYMENT_PENDING',
            'MERCHANT_PENDING',
            'PENDING',
            'ASSIGNED',
            'IN_TRANSIT',
            'DELIVERED',
            'COMPLETED'
        ];

        const currentIndex = orderSequence.indexOf(currentStatus);
        const stepIndex = orderSequence.indexOf(stepStatus);

        if (currentIndex === -1 || stepIndex === -1) return 'wait';

        if (stepIndex < currentIndex) return 'finish';
        if (stepIndex === currentIndex) return 'process';
        return 'wait';
    };

    const getOrderStatusDescription = (status) => {
        switch (status) {
            case 'PAYMENT_PENDING': return '等待支付';
            case 'MERCHANT_PENDING': return '等待商家确认';
            case 'PENDING': return '等待配送员接单';
            case 'ASSIGNED': return '配送员已接单';
            case 'IN_TRANSIT': return '配送中';
            case 'DELIVERED': return '已送达，等待确认';
            case 'COMPLETED': return '订单已完成';
            case 'PLATFORM_INTERVENTION': return '平台介入处理中';
            case 'REFUNDING': return '退款处理中';
            case 'REFUNDED': return '已退款';
            case 'CANCELLED': return '订单已取消';
            case 'PAYMENT_TIMEOUT': return '支付超时，订单已关闭';
            default: return status;
        }
    };

    if (loading) {
        return (
            <div className={styles.loadingContainer}>
                <Spin size="large" />
            </div>
        );
    }

    if (!order) {
        return (
            <div className={styles.emptyContainer}>
                <Empty description="订单不存在或已被删除" />
                <Button onClick={handleBackClick}>返回</Button>
            </div>
        );
    }

    const canConfirmDelivery = order.orderStatus === 'DELIVERED';
    const canRequestRefund = ['PENDING', 'ASSIGNED', 'IN_TRANSIT'].includes(order.orderStatus);
    const canRequestIntervention = !['COMPLETED', 'CANCELLED', 'PAYMENT_TIMEOUT', 'REFUNDING', 'REFUNDED', 'PLATFORM_INTERVENTION'].includes(order.orderStatus);
    const canRateOrder = order.orderStatus === 'COMPLETED';

    // 检查是否是正常流程的订单（不是退款、取消等）
    const isNormalOrder = !['PLATFORM_INTERVENTION', 'REFUNDING', 'REFUNDED', 'CANCELLED', 'PAYMENT_TIMEOUT'].includes(order.orderStatus);

    return (
        <div className={styles.orderDetailContainer}>
            <Navbar />
            <div className={styles.contentWrapper}>
                <div className={styles.breadcrumbSection}>
                    <Breadcrumb className={styles.breadcrumb}>
                        <Breadcrumb.Item>
                            <Button
                                type="link"
                                onClick={handleBackClick}
                                className={styles.backButton}
                            >
                                <LeftOutlined /> 返回
                            </Button>
                        </Breadcrumb.Item>
                        <Breadcrumb.Item>订单详情</Breadcrumb.Item>
                        <Breadcrumb.Item>{order.orderNumber}</Breadcrumb.Item>
                    </Breadcrumb>
                </div>

                <Card className={styles.orderStatusCard}>
                    <div className={styles.orderHeader}>
                        <div className={styles.orderTitle}>
                            <Title level={4}>订单状态</Title>
                            <div className={styles.orderStatus}>
                                <Badge
                                    status={
                                        ['COMPLETED'].includes(order.orderStatus) ? 'success' :
                                            ['DELIVERED', 'IN_TRANSIT', 'ASSIGNED', 'MERCHANT_PENDING'].includes(order.orderStatus) ? 'processing' :
                                                ['PENDING', 'PAYMENT_PENDING', 'REFUNDING'].includes(order.orderStatus) ? 'warning' :
                                                    ['PLATFORM_INTERVENTION'].includes(order.orderStatus) ? 'error' :
                                                        'default'
                                    }
                                    text={getOrderStatusDescription(order.orderStatus)}
                                />
                                <Tag color={order.deliveryType === 'MUTUAL' ? 'blue' : 'purple'}>
                                    {order.deliveryType === 'MUTUAL' ? '互助配送' : '平台配送'}
                                </Tag>
                            </div>
                        </div>
                        <div className={styles.orderActions}>
                            {canConfirmDelivery && (
                                <Popconfirm
                                    title="确认已收到商品？"
                                    onConfirm={handleConfirmDelivery}
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
                                    icon={<DollarOutlined />}
                                    onClick={handleRequestRefund}
                                >
                                    申请退款
                                </Button>
                            )}

                            {canRequestIntervention && (
                                <Button
                                    danger
                                    icon={<ExclamationCircleOutlined />}
                                    onClick={requestIntervention}
                                >
                                    申请平台介入
                                </Button>
                            )}

                            {canRateOrder && (
                                <Button
                                    icon={<StarOutlined />}
                                    onClick={() => navigate(`/shop/orders/${order.orderNumber}/rate`)}
                                >
                                    评价订单
                                </Button>
                            )}
                        </div>
                    </div>

                    {isNormalOrder && (
                        <div className={styles.orderProgress}>
                            <Steps
                                current={
                                    order.orderStatus === 'PAYMENT_PENDING' ? 0 :
                                        order.orderStatus === 'MERCHANT_PENDING' ? 1 :
                                            order.orderStatus === 'PENDING' ? 2 :
                                                order.orderStatus === 'ASSIGNED' ? 3 :
                                                    order.orderStatus === 'IN_TRANSIT' ? 4 :
                                                        order.orderStatus === 'DELIVERED' ? 5 :
                                                            order.orderStatus === 'COMPLETED' ? 6 : 0
                                }
                                status={
                                    ['PAYMENT_TIMEOUT', 'CANCELLED'].includes(order.orderStatus) ? 'error' :
                                        ['COMPLETED'].includes(order.orderStatus) ? 'finish' :
                                            'process'
                                }
                            >
                                <Step title="待支付" icon={<DollarOutlined />} />
                                <Step title="商家确认" icon={<ShopOutlined />} />
                                <Step title="待接单" icon={<QuestionCircleOutlined />} />
                                <Step title="已接单" icon={<UserOutlined />} />
                                <Step title="配送中" icon={<CarOutlined />} />
                                <Step title="已送达" icon={<CheckCircleOutlined />} />
                                <Step title="已完成" icon={<FileTextOutlined />} />
                            </Steps>
                        </div>
                    )}
                </Card>

                <Row gutter={24} className={styles.detailsRow}>
                    <Col xs={24} lg={16}>
                        <Card title="订单信息" className={styles.orderInfoCard}>
                            <Descriptions bordered column={1} size="small">
                                <Descriptions.Item label="订单号">{order.orderNumber}</Descriptions.Item>
                                <Descriptions.Item label="商品名称">{order.productName}</Descriptions.Item>
                                <Descriptions.Item label="商品单价">¥{order.productPrice.toFixed(2)}</Descriptions.Item>
                                <Descriptions.Item label="购买数量">{order.quantity}</Descriptions.Item>
                                <Descriptions.Item label="店铺名称">
                                    <Space>
                                        <ShopOutlined />
                                        <Text>{order.storeName}</Text>
                                    </Space>
                                </Descriptions.Item>
                                <Descriptions.Item label="配送方式">
                                    {order.deliveryType === 'MUTUAL' ? '互助配送' : '平台配送'}
                                </Descriptions.Item>
                                <Descriptions.Item label="收货人">
                                    <Space>
                                        <UserOutlined />
                                        <Text>{order.recipientName}</Text>
                                    </Space>
                                </Descriptions.Item>
                                <Descriptions.Item label="联系电话">
                                    <Space>
                                        <PhoneOutlined />
                                        <Text>{order.recipientPhone}</Text>
                                    </Space>
                                </Descriptions.Item>
                                <Descriptions.Item label="收货地址">
                                    <Space>
                                        <EnvironmentOutlined />
                                        <Text>{order.deliveryAddress}</Text>
                                        <Button
                                            type="link"
                                            size="small"
                                            onClick={() => setShowMapModal(true)}
                                        >
                                            查看地图
                                        </Button>
                                    </Space>
                                </Descriptions.Item>
                                {order.assignedUser && (
                                    <Descriptions.Item label="配送员">
                                        <Space>
                                            <UserOutlined />
                                            <Text>{order.assignedUserName}</Text>
                                        </Space>
                                    </Descriptions.Item>
                                )}
                                {(order.expectedDeliveryTime || order.deliveredTime) && (
                                    <Descriptions.Item label={order.deliveredTime ? "送达时间" : "预计送达时间"}>
                                        <Space>
                                            <ClockCircleOutlined />
                                            <Text>
                                                {order.deliveredTime
                                                    ? new Date(order.deliveredTime).toLocaleString()
                                                    : new Date(order.expectedDeliveryTime).toLocaleString()}
                                            </Text>
                                        </Space>
                                    </Descriptions.Item>
                                )}
                                {order.remark && (
                                    <Descriptions.Item label="订单备注">
                                        <Paragraph>{order.remark}</Paragraph>
                                    </Descriptions.Item>
                                )}
                                <Descriptions.Item label="下单时间">
                                    {new Date(order.createdAt).toLocaleString()}
                                </Descriptions.Item>
                                {order.paymentTime && (
                                    <Descriptions.Item label="支付时间">
                                        {new Date(order.paymentTime).toLocaleString()}
                                    </Descriptions.Item>
                                )}
                            </Descriptions>

                            {order.assignedUser && order.deliveryLatitude && order.deliveryLongitude && (
                                <div className={styles.routeSection}>
                                    <Button
                                        type="primary"
                                        icon={<CarOutlined />}
                                        onClick={() => setShowRouteModal(true)}
                                        className={styles.routeButton}
                                    >
                                        查看配送路线
                                    </Button>
                                </div>
                            )}
                        </Card>
                    </Col>

                    <Col xs={24} lg={8}>
                        <Card title="费用信息" className={styles.priceCard}>
                            <div className={styles.priceInfo}>
                                <div className={styles.priceItem}>
                                    <Text>商品金额：</Text>
                                    <Text>¥{(order.productPrice * order.quantity).toFixed(2)}</Text>
                                </div>
                                <div className={styles.priceItem}>
                                    <Text>配送费：</Text>
                                    <Text>¥{order.deliveryFee.toFixed(2)}</Text>
                                </div>
                                <div className={styles.priceItem}>
                                    <Text>服务费：</Text>
                                    <Text>¥{order.serviceFee.toFixed(2)}</Text>
                                </div>

                                <Divider style={{ margin: '12px 0' }} />

                                <div className={styles.totalPrice}>
                                    <Statistic
                                        title="订单总价"
                                        value={order.totalAmount}
                                        precision={2}
                                        prefix="¥"
                                        valueStyle={{ color: '#1890ff', fontWeight: 'bold' }}
                                    />
                                </div>
                            </div>

                            {['REFUNDING', 'REFUNDED'].includes(order.orderStatus) && (
                                <div className={styles.refundInfo}>
                                    <Divider>退款信息</Divider>

                                    <div className={styles.refundStatus}>
                                        <Badge
                                            status={order.orderStatus === 'REFUNDED' ? 'success' : 'processing'}
                                            text={order.orderStatus === 'REFUNDED' ? '已退款' : '退款处理中'}
                                        />
                                    </div>

                                    {order.refundAmount && (
                                        <div className={styles.refundAmount}>
                                            <Text>退款金额：</Text>
                                            <Text strong>¥{order.refundAmount.toFixed(2)}</Text>
                                        </div>
                                    )}

                                    {order.refundReason && (
                                        <div className={styles.refundReason}>
                                            <Text type="secondary">退款原因：{order.refundReason}</Text>
                                        </div>
                                    )}

                                    {order.refundTime && (
                                        <div className={styles.refundTime}>
                                            <Text type="secondary">退款时间：{new Date(order.refundTime).toLocaleString()}</Text>
                                        </div>
                                    )}
                                </div>
                            )}
                        </Card>
                    </Col>
                </Row>
            </div>

            {/* 位置地图模态框 */}
            {showMapModal && (
                <MapModal
                    isOpen={showMapModal}
                    onClose={() => setShowMapModal(false)}
                    address={order.deliveryAddress}
                    latitude={order.deliveryLatitude}
                    longitude={order.deliveryLongitude}
                />
            )}

            {/* 路线规划模态框 */}
            {showRouteModal && (
                <RoutePlanningModal
                    isOpen={showRouteModal}
                    onClose={() => setShowRouteModal(false)}
                    pickupLocation={{
                        latitude: order.store?.latitude,
                        longitude: order.store?.longitude
                    }}
                    deliveryLocation={{
                        latitude: order.deliveryLatitude,
                        longitude: order.deliveryLongitude
                    }}
                />
            )}
        </div>
    );
};

export default OrderDetail;