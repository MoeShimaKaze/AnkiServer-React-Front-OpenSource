// src/components/timeout/TimeoutStatisticsCard.js
import React from 'react';
import { Statistic, Tooltip, Divider } from 'antd';
import {
    ArrowUpOutlined,
    ArrowDownOutlined,
    ClockCircleOutlined,
    CarOutlined,
    CheckCircleOutlined,
    ExclamationCircleOutlined
} from '@ant-design/icons';
import styles from '../../assets/css/timeout/TimeoutDashboard.module.css';

const TimeoutStatisticsCard = ({
                                   title,
                                   value,
                                   previousValue = null,
                                   icon,
                                   color,
                                   loading = false,
                                   tooltip = null,
                                   suffix = null
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

    // 根据不同类型选择图标
    const renderIcon = () => {
        switch (icon) {
            case 'pickup':
                return <ClockCircleOutlined className={styles.cardIcon} style={{ color }} />;
            case 'delivery':
                return <CarOutlined className={styles.cardIcon} style={{ color }} />;
            case 'confirmation':
                return <CheckCircleOutlined className={styles.cardIcon} style={{ color }} />;
            case 'warning':
                return <ExclamationCircleOutlined className={styles.cardIcon} style={{ color }} />;
            default:
                return null;
        }
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

    return (
        <div className={styles.timeoutCard}>
            <div className={styles.cardHeader}>
                {renderIcon()}
                <Tooltip title={tooltip}>
                    <h3 className={styles.cardTitle}>{title}</h3>
                </Tooltip>
            </div>

            <Statistic
                value={value}
                loading={loading}
                suffix={suffix}
                valueStyle={{ color, fontSize: '36px', textAlign: 'center' }}
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