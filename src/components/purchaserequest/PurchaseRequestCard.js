// src/components/shopping/PurchaseRequestCard.js
import React from 'react';
import { Card, Tag, Button, Space, Tooltip, Avatar } from 'antd';
import {
    ShoppingOutlined,
    ClockCircleOutlined,
    EnvironmentOutlined,
    UserOutlined,
    DollarOutlined,
    ArrowRightOutlined
} from '@ant-design/icons';
import { Link } from 'react-router-dom';
import moment from 'moment';
import styles from '../../assets/css/purchaserequest/PurchaseRequestCard.module.css';

// 订单状态颜色映射
const statusColorMap = {
    PENDING: 'blue',
    ASSIGNED: 'processing',
    IN_TRANSIT: 'cyan',
    DELIVERED: 'volcano',
    COMPLETED: 'success',
    CANCELLED: 'default',
    PAYMENT_PENDING: 'warning',
    PAYMENT_TIMEOUT: 'error',
    REFUNDING: 'purple',
    REFUNDED: 'default'
};

// 订单状态文本映射
const statusTextMap = {
    PENDING: '待接单',
    ASSIGNED: '已接单',
    IN_TRANSIT: '配送中',
    DELIVERED: '已送达',
    COMPLETED: '已完成',
    CANCELLED: '已取消',
    PAYMENT_PENDING: '等待支付',
    PAYMENT_TIMEOUT: '支付超时',
    REFUNDING: '退款中',
    REFUNDED: '已退款'
};

// 配送方式文本映射
const deliveryTypeMap = {
    MUTUAL: '互助配送',
    EXPRESS: '极速配送'
};

/**
 * 代购需求卡片组件
 * 用于在列表中展示单个代购需求的基本信息
 */
const PurchaseRequestCard = ({ request, onAction, isMessenger = false }) => {
    // 根据状态确定可执行的操作
    const getActions = () => {
        // 针对普通用户的操作按钮
        if (!isMessenger) {
            if (request.status === 'PENDING') {
                return (
                    <Button
                        type="default"
                        size="small"
                        danger
                        onClick={() => onAction && onAction('cancel', request)}
                    >
                        取消需求
                    </Button>
                );
            }

            if (request.status === 'DELIVERED') {
                return (
                    <Button
                        type="primary"
                        size="small"
                        onClick={() => onAction && onAction('confirm', request)}
                    >
                        确认收货
                    </Button>
                );
            }

            if (request.status === 'COMPLETED') {
                return (
                    <Button
                        type="primary"
                        size="small"
                        onClick={() => onAction && onAction('rate', request)}
                    >
                        评价服务
                    </Button>
                );
            }
        }
        // 针对配送员的操作按钮
        else {
            if (request.status === 'PENDING') {
                return (
                    <Button
                        type="primary"
                        size="small"
                        onClick={() => onAction && onAction('accept', request)}
                    >
                        接单
                    </Button>
                );
            }

            if (request.status === 'ASSIGNED' && request.assignedUserId === parseInt(localStorage.getItem('userId'))) {
                return (
                    <Button
                        type="primary"
                        size="small"
                        onClick={() => onAction && onAction('deliver', request)}
                    >
                        开始配送
                    </Button>
                );
            }

            if (request.status === 'IN_TRANSIT' && request.assignedUserId === parseInt(localStorage.getItem('userId'))) {
                return (
                    <Button
                        type="primary"
                        size="small"
                        onClick={() => onAction && onAction('complete', request)}
                    >
                        确认送达
                    </Button>
                );
            }
        }

        return null;
    };

    return (
        <Card
            hoverable
            className={styles.requestCard}
            cover={
                <div className={styles.cardCoverContainer}>
                    <img
                        alt={request.title}
                        src={request.imageUrl || '/default-image.png'}
                        className={styles.cardCover}
                    />
                    <div className={styles.statusBadge}>
                        <Tag color={statusColorMap[request.status]}>
                            {statusTextMap[request.status]}
                        </Tag>
                    </div>
                </div>
            }
        >
            <div className={styles.cardContent}>
                <h3 className={styles.cardTitle}>
                    <Link to={`/request/${request.requestNumber}`}>
                        {request.title}
                    </Link>
                </h3>

                <div className={styles.priceSection}>
                    <span className={styles.priceLabel}>
                        <DollarOutlined /> 预期价格:
                    </span>
                    <span className={styles.price}>¥{request.expectedPrice.toFixed(2)}</span>
                </div>

                <div className={styles.infoSection}>
                    <div className={styles.infoItem}>
                        <Tooltip title="代购地址">
                            <EnvironmentOutlined className={styles.infoIcon} />
                            <span className={styles.truncateText}>{request.purchaseAddress}</span>
                        </Tooltip>
                    </div>

                    <div className={styles.infoItem}>
                        <Tooltip title="配送方式">
                            <ShoppingOutlined className={styles.infoIcon} />
                            <span>{deliveryTypeMap[request.deliveryType]}</span>
                        </Tooltip>
                    </div>

                    <div className={styles.infoItem}>
                        <Tooltip title="截止时间">
                            <ClockCircleOutlined className={styles.infoIcon} />
                            <span>{moment(request.deadline).format('MM-DD HH:mm')}</span>
                        </Tooltip>
                    </div>
                </div>

                <div className={styles.userSection}>
                    {request.assignedUserName ? (
                        <div className={styles.assigneeInfo}>
                            <Avatar size="small" icon={<UserOutlined />} />
                            <span className={styles.assigneeName}>{request.assignedUserName}</span>
                            <ArrowRightOutlined className={styles.arrowIcon} />
                            <span>{request.recipientName}</span>
                        </div>
                    ) : (
                        <div className={styles.requesterInfo}>
                            <span className={styles.requesterName}>收件人: {request.recipientName}</span>
                        </div>
                    )}
                </div>

                <div className={styles.actionSection}>
                    <Space>
                        <Link to={`/request/${request.requestNumber}`}>
                            <Button type="link" size="small">
                                查看详情
                            </Button>
                        </Link>
                        {getActions()}
                    </Space>
                </div>
            </div>
        </Card>
    );
};

export default PurchaseRequestCard;