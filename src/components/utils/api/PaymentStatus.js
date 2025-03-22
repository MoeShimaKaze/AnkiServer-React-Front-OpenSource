// PaymentStatus.js
import React, { useEffect, useState, useCallback, useRef } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import styles from '../../../assets/css/utils/PaymentStatus.module.css';
import Loading from '../Loading';

const PaymentStatus = ({ orderNumber, onPaymentComplete }) => {
    // 状态管理
    const [status, setStatus] = useState(null);
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(true);
    const [remainingTime, setRemainingTime] = useState(null);
    const [retryCount, setRetryCount] = useState(0);
    const navigate = useNavigate();

    // 使用useRef保持MAX_RETRIES引用稳定
    const MAX_RETRIES = useRef(10).current;

    // 计算剩余支付时间的函数
    const calculateRemainingTime = useCallback((expireTime) => {
        const now = new Date();
        const expireDate = new Date(expireTime);
        const diffInMinutes = Math.floor((expireDate - now) / (1000 * 60));
        return Math.max(0, diffInMinutes);
    }, []);

    // 处理支付失败的函数
    const handlePaymentFailure = useCallback(async () => {
        try {
            localStorage.removeItem('currentOrderNumber');
            setError('支付创建超时，正在跳转到待支付订单页面...');
            setLoading(false);
            setTimeout(() => {
                navigate('/mailorder/pending-payment');
            }, 2000);
        } catch (error) {
            console.error('处理支付失败时出错:', error);
            setError('处理支付失败，请稍后重试');
            setLoading(false);
        }
    }, [navigate]);

    // 支付状态查询（使用useCallback包裹）
    const checkPaymentStatus = useCallback(async (currentOrderNumber) => {
        try {
            if (!currentOrderNumber) {
                setError('未找到订单信息');
                setLoading(false);
                return;
            }

            const response = await axios.get(
                `http://127.0.0.1:8080/api/alipay/order/status/${currentOrderNumber}`,
                { withCredentials: true }
            );

            if (response.status === 202) {
                if (retryCount >= MAX_RETRIES) {
                    await handlePaymentFailure();
                    return;
                }

                setRetryCount(prev => prev + 1);
                await new Promise(resolve => setTimeout(resolve, 1000 * (retryCount + 1)));
                return checkPaymentStatus(currentOrderNumber);
            }

            setStatus(response.data);
            setLoading(false);

            if (response.data.paymentStatus === 'WAITING' && response.data.expireTime) {
                const remaining = calculateRemainingTime(response.data.expireTime);
                setRemainingTime(remaining);
            } else if (['PAID', 'CANCELLED', 'TIMEOUT'].includes(response.data.paymentStatus)) {
                if (response.data.paymentStatus === 'PAID') {
                    localStorage.removeItem('currentOrderNumber');
                    setTimeout(() => {
                        onPaymentComplete?.();
                        navigate('/mailorder/my-orders');
                    }, 2000);
                }
            }
        } catch (error) {
            if (error.response?.status === 202 && retryCount < MAX_RETRIES) {
                setRetryCount(prev => prev + 1);
                await new Promise(resolve => setTimeout(resolve, 1000 * (retryCount + 1)));
                return checkPaymentStatus(currentOrderNumber);
            }

            if (retryCount >= MAX_RETRIES) {
                await handlePaymentFailure();
                return;
            }

            console.error('查询支付状态失败:', error);
            setError(error.response?.data || '查询支付状态失败');
            setLoading(false);
        }
    }, [retryCount, MAX_RETRIES, handlePaymentFailure, navigate, onPaymentComplete, calculateRemainingTime]);

    // 启动轮询
    useEffect(() => {
        let intervalId;
        const currentOrderNumber = orderNumber || localStorage.getItem('currentOrderNumber');

        const startPolling = async () => {
            await checkPaymentStatus(currentOrderNumber);
            if (!error && retryCount < MAX_RETRIES) {
                intervalId = setInterval(async () => {
                    await checkPaymentStatus(currentOrderNumber);
                }, 5000);
            }
        };

        startPolling();

        return () => {
            if (intervalId) {
                clearInterval(intervalId);
            }
        };
    }, [orderNumber, checkPaymentStatus, error, retryCount, MAX_RETRIES]);

    // 状态显示文本转换
    const getStatusDisplay = (paymentStatus) => {
        const statusMap = {
            'WAITING': '等待支付',
            'PAID': '支付成功',
            'CANCELLED': '已取消',
            'TIMEOUT': '已超时',
            'PAYMENT_PENDING': '等待支付',
            'REFUNDING': '退款中',
            'REFUNDED': '已退款'
        };
        return statusMap[paymentStatus] || paymentStatus;
    };

    // 渲染加载状态
    if (loading) {
        return (
            <div className={styles.formContainer}>
                <div className={styles.loadingWrapper}>
                    <Loading size="lg" color="dark" />
                </div>
            </div>
        );
    }

    // 渲染主要内容
    return (
        <div className={styles.formContainer}>
            <h2 className={styles.formTitle}>支付状态</h2>

            {error && <div className={styles.error}>{error}</div>}

            {status && (
                <div className={styles.paymentInfo}>
                    <div className={styles.formGroup}>
                        <label>订单号</label>
                        <div className={styles.infoText}>{status.orderNumber}</div>
                    </div>

                    <div className={styles.formGroup}>
                        <label>支付状态</label>
                        <div className={styles.infoText}>
                            {getStatusDisplay(status.paymentStatus)}
                        </div>
                    </div>

                    <div className={styles.formGroup}>
                        <label>支付金额</label>
                        <div className={styles.infoText}>¥{status.amount}</div>
                    </div>

                    {/* 等待支付状态下显示倒计时 */}
                    {status.paymentStatus === 'WAITING' && status.expireTime && (
                        <div className={styles.expireTimeContainer}>
                            <div className={styles.expireTimeIcon}>⏳</div>
                            <div className={styles.expireTimeInfo}>
                                <div className={styles.expireTimeLabel}>
                                    支付截止时间
                                </div>
                                <div className={styles.expireTimeValue}>
                                    {new Date(status.expireTime).toLocaleString()}
                                </div>
                                <div className={styles.expireTimeWarning}>
                                    请在规定时间内完成支付，超时订单将自动取消
                                </div>
                            </div>
                            {remainingTime !== null && (
                                <div className={`${styles.expireTimeCountdown} ${
                                    remainingTime < 5 ? styles.urgent : ''
                                }`}>
                                    剩余 {remainingTime} 分钟
                                </div>
                            )}
                        </div>
                    )}

                    {/* 支付成功状态 */}
                    {status.paymentStatus === 'PAID' && (
                        <div className={styles.success}>
                            支付成功！正在处理您的订单...
                        </div>
                    )}

                    {/* 取消或超时状态 */}
                    {['CANCELLED', 'TIMEOUT'].includes(status.paymentStatus) && (
                        <div className={styles.error}>
                            订单已{status.paymentStatus === 'CANCELLED' ? '取消' : '超时'}，
                            请重新创建订单
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default PaymentStatus;