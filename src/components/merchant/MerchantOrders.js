import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import Loading from '../utils/Loading';
import styles from '../../assets/css/merchant/MerchantOrders.module.css';

const MerchantOrders = ({ storeId, userId, userGroup, isAdmin }) => {
    const navigate = useNavigate();

    // 状态管理
    const [orders, setOrders] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [actionStatus, setActionStatus] = useState(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [currentPage, setCurrentPage] = useState(0);
    const [totalPages, setTotalPages] = useState(0);
    const [pageSize] = useState(10);
    const [showCreateStoreButton, setShowCreateStoreButton] = useState(false);

    // 加载待确认订单列表
    useEffect(() => {
        const fetchOrders = async () => {
            if (!storeId) {
                setIsLoading(false);
                setError('无效的店铺ID，请确认店铺信息');
                return;
            }

            try {
                setIsLoading(true);
                setError(null);
                setShowCreateStoreButton(false);

                const response = await axios.get(
                    `http://127.0.0.1:8080/api/merchant/orders/store/${storeId}/pending-confirmation`,
                    {
                        params: {
                            page: currentPage,
                            size: pageSize
                        },
                        withCredentials: true
                    }
                );

                if (response.data && response.data.content) {
                    setOrders(response.data.content);
                    setTotalPages(response.data.totalPages || 0);
                } else {
                    setOrders([]);
                    setTotalPages(0);
                }
            } catch (error) {
                console.error('获取待确认订单失败:', error);

                // 检查是否是店铺不存在的错误
                if (error.response?.status === 404 && error.response?.data?.needCreateStore) {
                    setError('您尚未创建店铺，请先创建店铺后再管理订单');
                    setShowCreateStoreButton(true);
                } else if (error.response?.status === 403) {
                    setError('您没有权限访问该店铺的订单');
                } else {
                    setError(error.response?.data?.message || '获取待确认订单失败，请稍后重试');
                }
            } finally {
                setIsLoading(false);
            }
        };

        fetchOrders();
    }, [storeId, currentPage, pageSize]);

    // 处理确认订单
    const handleConfirmOrder = async (orderNumber) => {
        setIsProcessing(true);
        setActionStatus(null);

        try {
            const response = await axios.post(
                `http://127.0.0.1:8080/api/merchant/orders/${orderNumber}/confirm`,
                {},
                { withCredentials: true }
            );

            // 更新订单列表
            const updatedOrders = orders.filter(
                order => order.orderNumber !== orderNumber
            );
            setOrders(updatedOrders);

            setActionStatus({
                success: true,
                message: response.data.message || '订单确认成功'
            });
        } catch (error) {
            console.error('确认订单失败:', error);
            setActionStatus({
                success: false,
                message: error.response?.data || '确认订单失败，请稍后重试'
            });
        } finally {
            setIsProcessing(false);
        }
    };

    // 处理分页
    const handlePageChange = (newPage) => {
        setCurrentPage(newPage);
    };

    // 导航到创建店铺页面
    const handleCreateStore = () => {
        navigate('/shop/merchant/store/add');
    };

    // 格式化日期时间
    const formatDateTime = (dateString) => {
        if (!dateString) return '未知时间';
        return new Date(dateString).toLocaleString();
    };

    // 格式化金额
    const formatCurrency = (amount) => {
        return `¥${parseFloat(amount).toFixed(2)}`;
    };

    // 渲染加载状态
    if (isLoading) {
        return (
            <div className={styles.loadingContainer}>
                <Loading size="lg" color="dark" />
                <p>正在加载订单信息...</p>
            </div>
        );
    }

    // 渲染错误状态
    if (error) {
        return (
            <div className={styles.errorContainer}>
                <div className={styles.errorMessage}>{error}</div>
                {showCreateStoreButton && (
                    <div className={styles.createStoreContainer}>
                        <p>您已通过商家认证，但尚未创建店铺</p>
                        <p>创建店铺后才能发布商品和管理订单</p>
                        <button
                            onClick={handleCreateStore}
                            className={styles.createStoreButton}
                        >
                            立即创建店铺
                        </button>
                    </div>
                )}
            </div>
        );
    }

    return (
        <div className={styles.ordersContainer}>
            <h2 className={styles.title}>订单管理</h2>

            {/* 状态消息 */}
            {actionStatus && (
                <div className={`${styles.statusMessage} ${
                    actionStatus.success ? styles.success : styles.error
                }`}>
                    {actionStatus.message}
                </div>
            )}

            {/* 订单列表 */}
            <div className={styles.ordersCard}>
                <div className={styles.cardHeader}>
                    <h3>待确认订单</h3>
                </div>

                {orders.length === 0 ? (
                    <div className={styles.emptyState}>
                        暂无待确认的订单
                    </div>
                ) : (
                    <>
                        <div className={styles.ordersTable}>
                            <div className={styles.orderHeader}>
                                <div className={styles.orderCol}>订单号</div>
                                <div className={styles.orderCol}>商品信息</div>
                                <div className={styles.orderCol}>金额</div>
                                <div className={styles.orderCol}>下单时间</div>
                                <div className={styles.orderCol}>操作</div>
                            </div>

                            {orders.map(order => (
                                <div key={order.orderNumber} className={styles.orderRow}>
                                    <div className={styles.orderCol}>
                                        <div className={styles.orderNumber}>{order.orderNumber}</div>
                                        <div className={styles.orderStatus}>待确认</div>
                                    </div>

                                    <div className={styles.orderCol}>
                                        <div className={styles.productInfo}>
                                            {order.itemName || '未知商品'}
                                            {order.itemCount > 1 && (
                                                <span className={styles.itemCount}>x{order.itemCount}</span>
                                            )}
                                        </div>
                                        {order.buyerUsername && (
                                            <div className={styles.buyerInfo}>
                                                买家: {order.buyerUsername}
                                            </div>
                                        )}
                                    </div>

                                    <div className={styles.orderCol}>
                                        <div className={styles.orderAmount}>
                                            {formatCurrency(order.totalAmount)}
                                        </div>
                                    </div>

                                    <div className={styles.orderCol}>
                                        <div className={styles.orderTime}>
                                            {formatDateTime(order.createdAt)}
                                        </div>
                                    </div>

                                    <div className={styles.orderCol}>
                                        <button
                                            onClick={() => handleConfirmOrder(order.orderNumber)}
                                            className={styles.confirmButton}
                                            disabled={isProcessing}
                                        >
                                            {isProcessing ? '处理中...' : '确认订单'}
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* 分页控件 */}
                        {totalPages > 1 && (
                            <div className={styles.pagination}>
                                <button
                                    onClick={() => handlePageChange(0)}
                                    disabled={currentPage === 0}
                                    className={styles.pageButton}
                                >
                                    首页
                                </button>
                                <button
                                    onClick={() => handlePageChange(currentPage - 1)}
                                    disabled={currentPage === 0}
                                    className={styles.pageButton}
                                >
                                    上一页
                                </button>
                                <span className={styles.pageInfo}>
                                    第 {currentPage + 1} 页，共 {totalPages} 页
                                </span>
                                <button
                                    onClick={() => handlePageChange(currentPage + 1)}
                                    disabled={currentPage === totalPages - 1}
                                    className={styles.pageButton}
                                >
                                    下一页
                                </button>
                                <button
                                    onClick={() => handlePageChange(totalPages - 1)}
                                    disabled={currentPage === totalPages - 1}
                                    className={styles.pageButton}
                                >
                                    末页
                                </button>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
};

export default MerchantOrders;