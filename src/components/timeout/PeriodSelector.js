// src/components/timeout/PeriodSelector.js
import React, { useState } from 'react';
import { Radio, DatePicker } from 'antd';
import { CalendarOutlined } from '@ant-design/icons';
import styles from '../../assets/css/timeout/TimeoutDashboard.module.css';

const { RangePicker } = DatePicker;

/**
 * 时间段选择器组件
 * 提供常用时间段选项和自定义日期范围选择
 */
const PeriodSelector = ({ onChange }) => {
    // 时间段选项
    const [periodType, setPeriodType] = useState('today');
    // 是否显示自定义日期选择器
    const [showCustomDate, setShowCustomDate] = useState(false);
    // 自定义日期范围
    const [customDateRange, setCustomDateRange] = useState(null);

    /**
     * 处理时间段类型变更
     * @param {Event} e - Radio变更事件
     */
    const handlePeriodTypeChange = (e) => {
        const value = e.target.value;
        setPeriodType(value);
        setShowCustomDate(value === 'custom');

        // 根据选择的时间段类型计算日期范围
        let startTime = null;
        let endTime = null;

        const now = new Date();

        switch (value) {
            case 'today':
                // 今天开始时间
                startTime = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
                endTime = now;
                break;

            case 'yesterday':
                // 昨天
                startTime = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 0, 0, 0);
                endTime = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 23, 59, 59);
                break;

            case 'week':
                // 本周
                const dayOfWeek = now.getDay() || 7; // 如果是0（周日）转为7
                startTime = new Date(now.getFullYear(), now.getMonth(), now.getDate() - dayOfWeek + 1, 0, 0, 0);
                endTime = now;
                break;

            case 'month':
                // 本月
                startTime = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);
                endTime = now;
                break;

            case 'last7days':
                // 过去7天
                startTime = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6, 0, 0, 0);
                endTime = now;
                break;

            case 'last30days':
                // 过去30天
                startTime = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 29, 0, 0, 0);
                endTime = now;
                break;

            case 'custom':
                // 自定义日期范围使用已保存的值
                if (customDateRange && customDateRange.length === 2) {
                    [startTime, endTime] = customDateRange;
                }
                break;

            default:
                break;
        }

        // 触发onChange回调
        if (value !== 'custom' || (customDateRange && customDateRange.length === 2)) {
            onChange && onChange(startTime, endTime);
        }
    };

    /**
     * 处理自定义日期范围变更
     * @param {Array} dates - 日期范围数组
     */
    const handleCustomDateChange = (dates) => {
        if (!dates) {
            setCustomDateRange(null);
            return;
        }

        // 设置时间为一天的开始和结束
        const startDate = new Date(dates[0]);
        startDate.setHours(0, 0, 0, 0);

        const endDate = new Date(dates[1]);
        endDate.setHours(23, 59, 59, 999);

        setCustomDateRange([startDate, endDate]);

        // 触发onChange回调
        onChange && onChange(startDate, endDate);
    };

    return (
        <div className={styles.periodSelector}>
            <Radio.Group
                value={periodType}
                onChange={handlePeriodTypeChange}
                className={styles.radioGroup}
            >
                <Radio.Button value="today">今天</Radio.Button>
                <Radio.Button value="yesterday">昨天</Radio.Button>
                <Radio.Button value="week">本周</Radio.Button>
                <Radio.Button value="month">本月</Radio.Button>
                <Radio.Button value="last7days">过去7天</Radio.Button>
                <Radio.Button value="last30days">过去30天</Radio.Button>
                <Radio.Button value="custom">
                    <CalendarOutlined /> 自定义
                </Radio.Button>
            </Radio.Group>

            {showCustomDate && (
                <div className={styles.customDatePicker}>
                    <RangePicker
                        onChange={handleCustomDateChange}
                        value={customDateRange}
                        allowClear={false}
                    />
                </div>
            )}
        </div>
    );
};

export default PeriodSelector;