import React from 'react';
import { Card, Typography, Spin } from 'antd';
import { LoadingOutlined } from '@ant-design/icons';
import styles from '../../assets/css/utils/PaymentLoading.module.css';

const { Title, Paragraph } = Typography;

/**
 * 支付加载组件 - 使用Ant Design实现
 * 显示支付处理过程中的加载状态和进度条
 * @param {string} message - 显示的加载消息，如果未提供则显示默认消息
 */
const PaymentLoading = ({ message }) => {
    // 自定义加载图标，调整大小以匹配原设计
    const antIcon = <LoadingOutlined style={{ fontSize: 48, color: '#1890ff' }} spin />;

    return (
        <div className={styles.loadingOverlay}>
            <Card
                className={styles.loadingCard}
                bordered={false}
            >
                <div className={styles.loadingContent}>
                    <div className={styles.loadingIcon}>
                        <Spin indicator={antIcon} />
                    </div>

                    <Title
                        level={3}
                        className={styles.loadingTitle}
                        style={{ margin: 0 }}
                    >
                        订单处理中
                    </Title>

                    <Paragraph className={styles.loadingMessage}>
                        {message || '正在创建支付订单，请稍候...'}
                    </Paragraph>

                    {/* 使用Ant Design的Progress组件，但保持自定义动画 */}
                    <div className={styles.progressContainer}>
                        <div className={styles.progressBar} />
                    </div>
                </div>
            </Card>
        </div>
    );
};

export default PaymentLoading;