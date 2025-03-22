// PaymentReturn.js
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import styles from '../../../assets/css/utils/PaymentStatus.module.css';
import Loading from '../Loading';

const PaymentReturn = () => {
    const navigate = useNavigate();
    const [message, setMessage] = useState('正在处理支付结果...');

    useEffect(() => {
        const processPaymentReturn = async () => {
            try {
                const orderNumber = localStorage.getItem('currentOrderNumber');
                if (!orderNumber) {
                    setMessage('未找到订单信息，正在跳转...');
                    setTimeout(() => navigate('/mailorder/my-orders'), 2000);
                    return;
                }

                // 验证支付结果
                const response = await axios.get(
                    `http://127.0.0.1:8080/api/alipay/order/status/${orderNumber}`,
                    { withCredentials: true }
                );

                // 清理本地存储
                localStorage.removeItem('currentOrderNumber');

                if (response.data.paymentStatus === 'PAID') {
                    setMessage('支付成功，正在跳转到订单页面...');
                    setTimeout(() => navigate('/mailorder/my-orders'), 2000);
                } else {
                    setMessage('支付未完成，正在跳转到待支付订单页面...');
                    setTimeout(() => navigate('/mailorder/pending-payment'), 2000);
                }

            } catch (error) {
                console.error('处理支付返回时出错:', error);
                setMessage('处理支付结果时出错，正在跳转到待支付订单页面...');
                setTimeout(() => navigate('/mailorder/pending-payment'), 2000);
            }
        };

        processPaymentReturn();
    }, [navigate]);

    return (
        <div className={styles.formContainer}>
            <div className={styles.loadingWrapper}>
                <Loading size="lg" color="dark" />
                <p>{message}</p>
            </div>
        </div>
    );
};

export default PaymentReturn;