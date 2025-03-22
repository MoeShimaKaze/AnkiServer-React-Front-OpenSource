// src/components/timeout/TimeoutStatisticsCard.js
import React from 'react';
import { Statistic, Tooltip, Divider } from 'antd';
import {
    ArrowUpOutlined,
    ArrowDownOutlined,
    ClockCircleOutlined,
    CarOutlined,
    CheckCircleOutlined,
    ExclamationCircleOutlined,
    ShoppingOutlined,
    MailOutlined,
    ShoppingCartOutlined
} from '@ant-design/icons';
import timeoutTypeMapping from '../utils/map/timeoutTypeMapping';
import styles from '../../assets/css/timeout/TimeoutDashboard.module.css';
import '../../assets/css/timeout/timeoutTypeStyles.css';

const TimeoutStatisticsCard = ({
                                   title,
                                   value,
                                   previousValue = null,
                                   icon,
                                   color,
                                   loading = false,
                                   tooltip = null,
                                   suffix = null,
                                   type = null // 新增type参数，用于指定类型（可以是订单类型或超时类型）
                               }) => {
    // 计算变化率和方向
    let changeDirection = null;
    let changeRate = 0;

    if (previousValue !== null && previousValue !== undefined) {
        if (previousValue === 0) {
            changeDirection = value > 0 ? 'up' : 'stable';
            changeRate = value > 0 ? 100 : 0;
        } else {
            const change = ((value - previousValue) / previousValue) * 100;
            changeDirection = change > 0 ? 'up' : change < 0 ? 'down' : 'stable';
            changeRate = Math.abs(Math.round(change));
        }
    }

    // 检查是否提供了类型，如果有，则使用映射关系获取样式类名
    const typeClassName = type ?
        (timeoutTypeMapping.getTimeoutTypeStyleClass(type) ||
            timeoutTypeMapping.getOrderTypeStyleClass(type)) : '';

    // 根据不同类型选择图标
    const renderIcon = () => {
        // 如果提供了明确的图标类型，则使用指定的图标
        if (icon) {
            switch (icon) {
                case 'pickup':
                    return <ClockCircleOutlined className={`${styles.cardIcon} timeout-icon PICKUP`} />;
                case 'delivery':
                    return <CarOutlined className={`${styles.cardIcon} timeout-icon DELIVERY`} />;
                case 'confirmation':
                    return <CheckCircleOutlined className={`${styles.cardIcon} timeout-icon CONFIRMATION`} />;
                case 'warning':
                    return <ExclamationCircleOutlined className={`${styles.cardIcon} timeout-icon INTERVENTION`} />;
                default:
                    break;
            }
        }

        // 如果提供了类型但没有指定图标，尝试根据类型选择图标
        if (type) {
            switch (type) {
                case 'PICKUP':
                    return <ClockCircleOutlined className={`${styles.cardIcon} timeout-icon PICKUP`} />;
                case 'DELIVERY':
                    return <CarOutlined className={`${styles.cardIcon} timeout-icon DELIVERY`} />;
                case 'CONFIRMATION':
                    return <CheckCircleOutlined className={`${styles.cardIcon} timeout-icon CONFIRMATION`} />;
                case 'INTERVENTION':
                    return <ExclamationCircleOutlined className={`${styles.cardIcon} timeout-icon INTERVENTION`} />;
                case 'MAIL_ORDER':
                    return <MailOutlined className={`${styles.cardIcon} timeout-icon PICKUP`} />;
                case 'SHOPPING_ORDER':
                    return <ShoppingOutlined className={`${styles.cardIcon} timeout-icon DELIVERY`} />;
                case 'PURCHASE_REQUEST':
                    return <ShoppingCartOutlined className={`${styles.cardIcon} timeout-icon CONFIRMATION`} />;
                default:
                    return <ExclamationCircleOutlined className={`${styles.cardIcon}`} style={{ color }} />;
            }
        }

        // 如果没有提供任何类型信息，返回默认图标
        return <ExclamationCircleOutlined className={styles.cardIcon} style={{ color }} />;
    };

    // 变化率显示
    const renderValueChange = () => {
        if (changeDirection === null) return null;

        return (
            <div className={styles.changeContainer}>
                {changeDirection === 'up' ? (
                    <span className={styles.changeUp}>
                        <ArrowUpOutlined /> {changeRate}%
                    </span>
                ) : changeDirection === 'down' ? (
                    <span className={styles.changeDown}>
                        <ArrowDownOutlined /> {changeRate}%
                    </span>
                ) : (
                    <span className={styles.changeStable}>
                        0%
                    </span>
                )}
            </div>
        );
    };

    // 如果有类型信息，尝试获取更友好的标题
    const displayTitle = type ?
        (timeoutTypeMapping.getTimeoutTypeDisplay(type) ||
            timeoutTypeMapping.getOrderTypeDisplay(type) ||
            title) : title;

    return (
        <div className={`${styles.timeoutCard} ${type ? `timeout-card ${type}` : ''}`}>
            <div className={styles.cardHeader}>
                {renderIcon()}
                <Tooltip title={tooltip || (type ? `${displayTitle}统计信息` : null)}>
                    <h3 className={`${styles.cardTitle} ${typeClassName}`}>{displayTitle || title}</h3>
                </Tooltip>
            </div>

            <Statistic
                value={value}
                loading={loading}
                suffix={suffix}
                valueStyle={{
                    color: type ? undefined : color,
                    fontSize: '36px',
                    textAlign: 'center',
                    fontWeight: 'bold'
                }}
                className={typeClassName}
            />

            {previousValue !== null && (
                <>
                    <Divider style={{ margin: '16px 0 12px 0' }} />
                    {renderValueChange()}
                </>
            )}
        </div>
    );
};

export default TimeoutStatisticsCard;