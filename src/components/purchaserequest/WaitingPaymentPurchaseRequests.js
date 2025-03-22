// WaitingPaymentPurchaseRequests.js
import React, {useState, useEffect, useCallback, useRef} from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import styles from '../../assets/css/purchaserequest/PurchaseRequestForm.module.css';
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
    Empty,
    Tag,
    Image
} from 'antd';

const { Title, Text } = Typography;
const { Option } = Select;

// 代购需求订单卡片组件 - 负责单个订单的展示和交互
const PurchaseRequestCard = ({ order, onContinuePayment, processingOrder }) => {
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
                    <Text strong>{order.title || '代购需求'}</Text>
                    <Text type="secondary">订单号: {order.orderNumber}</Text>
                </div>
            }
            style={{ marginBottom: 16 }}
        >
            <div className={styles.orderContent}>
                <Row gutter={[16, 16]}>
                    {/* 左侧商品图片 */}
                    <Col xs={24} sm={8} md={6}>
                        <div className={styles.imageContainer}>
                            {order.productImage ? (
                                <Image
                                    src={order.productImage || order.imageUrl}
                                    alt={order.title}
                                    style={{ width: '100%', height: 'auto', objectFit: 'cover', borderRadius: '4px' }}
                                    fallback="data:image/png;base64,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"
                                />
                            ) : (
                                <div className={styles.noImage}>暂无图片</div>
                            )}
                        </div>
                    </Col>

                    {/* 右侧信息部分 */}
                    <Col xs={24} sm={16} md={18}>
                        <div className={styles.infoSection}>
                            <Row gutter={[16, 8]}>
                                {/* 商品描述与价格 */}
                                <Col span={24}>
                                    <div className={styles.infoItem}>
                                        <Text type="secondary">商品描述：</Text>
                                        <Text>{order.description || '无描述'}</Text>
                                    </div>
                                </Col>

                                <Col xs={24} sm={12}>
                                    <div className={styles.infoItem}>
                                        <Text type="secondary">预期价格：</Text>
                                        <Text className={styles.price} style={{ color: '#d32f2f', fontWeight: 'bold' }}>
                                            ¥{formatAmount(order.expectedPrice)}
                                        </Text>
                                    </div>
                                </Col>

                                <Col xs={24} sm={12}>
                                    <div className={styles.infoItem}>
                                        <Text type="secondary">订单总额：</Text>
                                        <Text className={styles.amount} style={{ color: '#d32f2f', fontWeight: 'bold' }}>
                                            ¥{formatAmount(order.fee)}
                                        </Text>
                                        {order.deliveryFee && (
                                            <Text type="secondary" style={{ marginLeft: '8px', fontSize: '12px' }}>
                                                (含配送费: ¥{formatAmount(order.deliveryFee)})
                                            </Text>
                                        )}
                                    </div>
                                </Col>

                                {/* 地址信息 */}
                                <Col span={24}>
                                    <div className={styles.infoItem}>
                                        <Text type="secondary">代购地址：</Text>
                                        <Text>{order.purchaseAddress || '未指定'}</Text>
                                    </div>
                                </Col>

                                <Col span={24}>
                                    <div className={styles.infoItem}>
                                        <Text type="secondary">配送地址：</Text>
                                        <Text>{order.deliveryAddress || '未指定'}</Text>
                                    </div>
                                </Col>

                                <Col xs={24} sm={12}>
                                    <div className={styles.infoItem}>
                                        <Text type="secondary">配送方式：</Text>
                                        <Tag color={order.deliveryType === 'MUTUAL' ? 'blue' : 'green'}>
                                            {order.deliveryType === 'MUTUAL' ? '互助配送' : '极速配送'}
                                        </Tag>
                                    </div>
                                </Col>

                                <Col xs={24} sm={12}>
                                    <div className={styles.infoItem}>
                                        <Text type="secondary">收件人：</Text>
                                        <Text>{order.recipientName || '未指定'}</Text>
                                        {order.recipientPhone && (
                                            <Text style={{ marginLeft: '8px' }}>({order.recipientPhone})</Text>
                                        )}
                                    </div>
                                </Col>

                                <Col xs={24} sm={12}>
                                    <div className={styles.infoItem}>
                                        <Text type="secondary">创建时间：</Text>
                                        <Text>{formatDateTime(order.createdAt)}</Text>
                                    </div>
                                </Col>

                                <Col xs={24} sm={12}>
                                    <div className={styles.infoItem}>
                                        <Text type="secondary">截止时间：</Text>
                                        <Text>{order.deadline ? formatDateTime(order.deadline) : '未设置'}</Text>
                                    </div>
                                </Col>
                            </Row>
                        </div>
                    </Col>
                </Row>

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
const WaitingPaymentPurchaseRequests = () => {
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
                `http://127.0.0.1:8080/api/alipay/pending-orders/purchase-request?page=${currentPage}&size=${pageSize}&sort=${sortParam}`,
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

    // 组件加载时获取数据并设置定时刷新
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

            // 处理支付表单提交
            if (order.payUrl) {
                // 如果有支付链接，直接跳转
                localStorage.setItem('currentOrderNumber', order.orderNumber);
                window.location.href = order.payUrl;
            } else if (order.payForm) {
                // 如果有支付表单，添加到DOM并自动提交
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
            } else {
                throw new Error('订单支付信息不完整');
            }

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

                    <Title level={2} className={styles.title}>待支付代购需求</Title>

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
                                description="暂无待支付代购需求"
                                style={{ marginTop: 40, marginBottom: 40 }}
                            >
                                <Button
                                    type="primary"
                                    onClick={() => navigate('/request/create')}
                                    size="large"
                                >
                                    发布代购需求
                                </Button>
                            </Empty>
                        </div>
                    ) : (
                        <>
                            <div className={styles.orderList}>
                                {orders.map(order => (
                                    <PurchaseRequestCard
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

export default WaitingPaymentPurchaseRequests;