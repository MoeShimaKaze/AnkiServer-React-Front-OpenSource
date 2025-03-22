// WaitingPaymentOrders.js
import React, {useState, useEffect, useCallback, useRef} from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import styles from '../../assets/css/mail/MailOrder.module.css';
import ErrorBoundary from '../utils/ErrorBoundary';
import PaymentLoading from '../utils/PaymentLoading';

// 引入Ant Design组件
import {
    Card,
    Button,
    Spin,
    Alert,
    Select,
    Pagination,
    Divider,
    Space,
    Row,
    Col,
    Typography,
    Empty
} from 'antd';

const { Title, Text } = Typography;
const { Option } = Select;

// 订单卡片组件 - 负责单个订单的展示和交互
const OrderCard = ({ order, onContinuePayment, processingOrder }) => {
    const [remainingTime, setRemainingTime] = useState(null);
    const [isButtonDisabled, setIsButtonDisabled] = useState(false);

    // 计算剩余时间
    const calculateRemainingTime = useCallback(() => {
        const now = new Date();
        const expireTime = new Date(order.expireTime);
        const diffInSeconds = Math.floor((expireTime - now) / 1000);
        return Math.max(0, diffInSeconds);
    }, [order.expireTime]);

    // 格式化显示时间
    const formatDateTime = (dateString) => {
        return new Date(dateString).toLocaleString('zh-CN', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    // 格式化金额显示
    const formatAmount = (amount) => {
        return typeof amount === 'number' ?
            amount.toFixed(2) :
            Number(amount).toFixed(2);
    };

    // 格式化剩余时间显示
    const formatRemainingTime = (seconds) => {
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
    };

    // 更新倒计时效果
    useEffect(() => {
        const updateRemainingTime = () => {
            const remaining = calculateRemainingTime();
            setRemainingTime(remaining);
            setIsButtonDisabled(remaining <= 0);
        };

        updateRemainingTime();
        const intervalId = setInterval(updateRemainingTime, 1000);

        return () => clearInterval(intervalId);
    }, [calculateRemainingTime]);

    return (
        <Card
            className={styles.orderCard}
            title={
                <div className={styles.orderHeader}>
                    <Text strong>订单号: {order.orderNumber}</Text>
                    <Text type="secondary">创建时间: {formatDateTime(order.createdAt)}</Text>
                </div>
            }
            style={{ marginBottom: 16 }}
        >
            <div className={styles.orderContent}>
                <div className={styles.infoSection}>
                    <Row gutter={[16, 16]}>
                        <Col span={12}>
                            <div className={styles.infoItem}>
                                <Text type="secondary">收件人：</Text>
                                <Text>{order.name}</Text>
                            </div>
                        </Col>
                        <Col span={24}>
                            <div className={styles.infoItem}>
                                <Text type="secondary">取件地址：</Text>
                                <div className={styles.addressInfo}>
                                    <Text>{order.pickupAddress}</Text>
                                    <Text type="secondary" className={styles.addressDetail}>
                                        {order.pickupDetail}
                                    </Text>
                                </div>
                            </div>
                        </Col>
                        <Col span={24}>
                            <div className={styles.infoItem}>
                                <Text type="secondary">配送地址：</Text>
                                <div className={styles.addressInfo}>
                                    <Text>{order.deliveryAddress}</Text>
                                    <Text type="secondary" className={styles.addressDetail}>
                                        {order.deliveryDetail}
                                    </Text>
                                </div>
                            </div>
                        </Col>
                        <Col span={12}>
                            <div className={styles.infoItem}>
                                <Text type="secondary">配送时间：</Text>
                                <Text>{formatDateTime(order.deliveryTime)}</Text>
                            </div>
                        </Col>
                        <Col span={12}>
                            <div className={styles.infoItem}>
                                <Text type="secondary">订单金额：</Text>
                                <Text className={styles.amount} style={{ color: '#d32f2f', fontWeight: 'bold' }}>
                                    ¥{formatAmount(order.fee)}
                                </Text>
                            </div>
                        </Col>
                    </Row>
                </div>

                <Divider style={{ margin: '16px 0' }} />

                <div className={styles.paymentSection}>
                    {!isButtonDisabled ? (
                        <>
                            <Button
                                type="primary"
                                size="large"
                                block
                                className={styles.paymentButton}
                                onClick={() => onContinuePayment(order)}
                                loading={processingOrder === order.orderNumber}
                                disabled={isButtonDisabled}
                            >
                                {processingOrder === order.orderNumber ? '处理中...' : '继续支付'}
                            </Button>
                            <div className={styles.expireTimeInfo} style={{ marginTop: 16 }}>
                                <div className={styles.expireTime}>
                                    <Text type="secondary">支付截止时间：{formatDateTime(order.expireTime)}</Text>
                                </div>
                                <div>
                                    <Text
                                        className={remainingTime < 300 ? styles.urgent : ''}
                                        style={{
                                            color: remainingTime < 300 ? '#d32f2f' : '#1a73e8',
                                            fontWeight: 'bold'
                                        }}
                                    >
                                        剩余支付时间：{formatRemainingTime(remainingTime)}
                                    </Text>
                                </div>
                            </div>
                        </>
                    ) : (
                        <Alert
                            message="订单已超时"
                            description="订单已超时，请重新下单"
                            type="error"
                            showIcon
                        />
                    )}
                </div>
            </div>
        </Card>
    );
};

// 主组件
const WaitingPaymentOrders = () => {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [paymentLoading, setPaymentLoading] = useState(false);
    const [processingOrder, setProcessingOrder] = useState(null);

    // 添加分页状态
    const [page, setPage] = useState(0);
    const [size, setSize] = useState(5); // 每页显示5条
    const [totalItems, setTotalItems] = useState(0);
    const [totalPages, setTotalPages] = useState(0);
    const [sort, setSort] = useState('createdTime,desc'); // 默认按创建时间降序

    const navigate = useNavigate();
    const mountedRef = useRef(true);

    // 修改fetchPendingOrders以支持分页
    const fetchPendingOrders = useCallback(async (currentPage = page, pageSize = size, sortParam = sort, retryCount = 0) => {
        if (!mountedRef.current) return;

        try {
            setLoading(true);
            setError(null);

            // 使用查询参数添加分页支持
            const response = await axios.get(
                `http://127.0.0.1:8080/api/alipay/pending-orders/mail-order?page=${currentPage}&size=${pageSize}&sort=${sortParam}`,
                { withCredentials: true }
            );

            if (mountedRef.current) {
                // 新的响应结构处理
                const data = response.data;
                if (!data || !Array.isArray(data.content)) {
                    throw new Error('返回数据格式错误');
                }

                setOrders(data.content);
                setPage(data.page);
                setTotalItems(data.totalItems);
                setTotalPages(data.totalPages);
            }
        } catch (error) {
            if (mountedRef.current && retryCount < 3) {
                setTimeout(() => fetchPendingOrders(currentPage, pageSize, sortParam, retryCount + 1), 1000 * (retryCount + 1));
            } else if (mountedRef.current) {
                setError(error.response?.data || '获取订单信息失败，请稍后重试');
            }
        } finally {
            if (mountedRef.current) {
                setLoading(false);
            }
        }
    }, [page, size, sort]);

    // 处理页面变化
    const handlePageChange = useCallback((page) => {
        // Ant Design分页是从1开始的，而我们的API是从0开始的
        const apiPage = page - 1;
        setPage(apiPage);
        fetchPendingOrders(apiPage, size, sort);
    }, [fetchPendingOrders, size, sort]);

    // 处理每页条目数变化
    const handleSizeChange = useCallback((value) => {
        setSize(value);
        setPage(0); // 重置到第一页
        fetchPendingOrders(0, value, sort);
    }, [fetchPendingOrders, sort]);

    // 处理排序变化
    const handleSortChange = useCallback((value) => {
        setSort(value);
        fetchPendingOrders(page, size, value);
    }, [fetchPendingOrders, page, size]);

    // 添加 useEffect
    useEffect(() => {
        mountedRef.current = true;
        fetchPendingOrders();
        const intervalId = setInterval(() => fetchPendingOrders(page, size, sort), 30000);

        return () => {
            mountedRef.current = false;
            clearInterval(intervalId);
        };
    }, [fetchPendingOrders, page, size, sort]);

    // 处理继续支付
    const handleContinuePayment = async (order) => {
        if (processingOrder === order.orderNumber) {
            return;
        }

        try {
            setPaymentLoading(true);
            setProcessingOrder(order.orderNumber);
            setError(null);

            const paymentDiv = document.createElement('div');
            paymentDiv.id = `payment-form-${order.orderNumber}`;
            paymentDiv.style.display = 'none';
            paymentDiv.innerHTML = order.payForm;
            document.body.appendChild(paymentDiv);

            const form = paymentDiv.querySelector('form');
            if (!form) {
                throw new Error('支付表单无效');
            }

            localStorage.setItem('currentOrderNumber', order.orderNumber);
            form.submit();

            setTimeout(() => {
                const tempDiv = document.getElementById(`payment-form-${order.orderNumber}`);
                if (tempDiv && document.body.contains(tempDiv)) {
                    document.body.removeChild(tempDiv);
                }
            }, 2000);

        } catch (error) {
            console.error('发起支付失败:', error);
            setError('发起支付失败，请刷新页面重试');
        } finally {
            setPaymentLoading(false);
            setTimeout(() => setProcessingOrder(null), 1000);
        }
    };

    // 加载状态显示
    if (loading) {
        return (
            <div className={styles.pageContainer}>
                <div className={styles.container}>
                    <div className={styles.loadingWrapper}>
                        <Spin size="large" tip="加载中..." />
                    </div>
                </div>
            </div>
        );
    }

    return (
        <ErrorBoundary fallback={
            <div className={styles.tableContainer}>
                <Alert
                    message="页面显示异常"
                    description="页面显示异常，请刷新重试"
                    type="error"
                    showIcon
                />
            </div>
        }>
            <div className={styles.pageContainer}>
                <div className={styles.container}>
                    {paymentLoading && (
                        <PaymentLoading message="正在跳转到支付页面..." />
                    )}

                    <Title level={2} className={styles.title}>待支付订单</Title>

                    <div className={styles.filterRow}>
                        <div className={styles.filterLeft}>
                            <Space>
                                <Text className={styles.filterLabel}>排序方式:</Text>
                                <Select
                                    value={sort}
                                    onChange={handleSortChange}
                                    style={{ width: 180 }}
                                >
                                    <Option value="createdTime,desc">创建时间 (最新)</Option>
                                    <Option value="createdTime,asc">创建时间 (最早)</Option>
                                    <Option value="expireTime,asc">过期时间 (最近)</Option>
                                    <Option value="amount,desc">金额 (高到低)</Option>
                                    <Option value="amount,asc">金额 (低到高)</Option>
                                </Select>
                            </Space>
                        </div>
                        <div className={styles.filterRight}>
                            <Space>
                                <Text className={styles.filterLabel}>每页显示:</Text>
                                <Select
                                    value={size}
                                    onChange={handleSizeChange}
                                    style={{ width: 80 }}
                                >
                                    <Option value={5}>5项</Option>
                                    <Option value={10}>10项</Option>
                                    <Option value={20}>20项</Option>
                                </Select>
                            </Space>
                        </div>
                    </div>

                    {error && (
                        <Alert
                            message="获取订单失败"
                            description={error}
                            type="error"
                            showIcon
                            action={
                                <Button
                                    type="primary"
                                    danger
                                    onClick={() => fetchPendingOrders()}
                                >
                                    重新加载
                                </Button>
                            }
                            style={{ marginBottom: 16 }}
                        />
                    )}

                    {!error && orders.length === 0 ? (
                        <div className={styles.emptyState}>
                            <Empty
                                description="暂无待支付订单"
                                style={{ marginTop: 40, marginBottom: 40 }}
                            >
                                <Button
                                    type="primary"
                                    onClick={() => navigate('/mailorder/create')}
                                    size="large"
                                >
                                    创建新订单
                                </Button>
                            </Empty>
                        </div>
                    ) : (
                        <>
                            <div className={styles.orderList}>
                                {orders.map(order => (
                                    <OrderCard
                                        key={order.orderNumber}
                                        order={order}
                                        onContinuePayment={handleContinuePayment}
                                        processingOrder={processingOrder}
                                    />
                                ))}
                            </div>

                            {/* 分页信息和控制 */}
                            {totalItems > 0 && (
                                <div className={styles.paginationContainer}>
                                    <div className={styles.paginationInfo}>
                                        <Text type="secondary">
                                            显示 {orders.length > 0 ? page * size + 1 : 0} - {Math.min((page + 1) * size, totalItems)} 项，共 {totalItems} 项
                                        </Text>
                                    </div>
                                    <Pagination
                                        current={page + 1} // Ant Design分页从1开始
                                        pageSize={size}
                                        total={totalItems}
                                        onChange={handlePageChange}
                                        showSizeChanger={false} // 因为我们已经在上面的select中实现了size changer
                                        showQuickJumper
                                        showTotal={(total) => `共 ${total} 项，${totalPages} 页`}
                                        // 如果后端分页逻辑与前端计算不一致，可以限制最大页码
                                        disabled={page >= totalPages - 1} // 当到达最后一页时禁用下一页按钮
                                    />
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>
        </ErrorBoundary>
    );
};

export default WaitingPaymentOrders;