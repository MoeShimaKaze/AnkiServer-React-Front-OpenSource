// src/components/timeout/TimeoutTypeTag.js
import React from 'react';
import { Tag, Tooltip } from 'antd';
import timeoutTypeMapping from '../utils/map/timeoutTypeMapping';
import '../../assets/css/timeout/timeoutTypeStyles.css';

/**
 * 超时类型标签组件
 * 用于统一显示超时类型和订单类型的标签
 *
 * @param {Object} props 组件属性
 * @param {string} props.type 类型代码 - 可以是超时类型或订单类型
 * @param {boolean} props.isOrderType 是否为订单类型标签
 * @param {boolean} props.showCount 是否显示计数
 * @param {number} props.count 计数值
 * @param {boolean} props.showTooltip 是否显示工具提示
 * @param {string} props.tooltipText 工具提示文本，如果未提供则使用类型名称
 * @param {function} props.onClick 点击事件回调
 */
const TimeoutTypeTag = ({
                            type,
                            isOrderType = false,
                            showCount = false,
                            count = 0,
                            showTooltip = false,
                            tooltipText = '',
                            onClick = null,
                            className = '',
                            style = {}
                        }) => {
    if (!type) return null;

    // 获取类型显示名称
    const displayName = isOrderType
        ? timeoutTypeMapping.getOrderTypeDisplay(type)
        : timeoutTypeMapping.getTimeoutTypeDisplay(type);

    // 确定标签的CSS类名
    const tagClassName = isOrderType
        ? `order-type-tag ${type}`
        : `timeout-type-tag ${type}`;

    // 确定提示文本
    const tipText = tooltipText || displayName;

    // 标签内容
    const tagContent = (
        <Tag
            className={`${tagClassName} ${className}`}
            onClick={onClick}
            style={{
                cursor: onClick ? 'pointer' : 'default',
                ...style
            }}
        >
            {displayName}
            {showCount && count > 0 && `: ${count}`}
        </Tag>
    );

    // 是否包装在工具提示中
    return showTooltip ? (
        <Tooltip title={tipText}>
            {tagContent}
        </Tooltip>
    ) : tagContent;
};

/**
 * 订单类型标签组件
 * 特化的TimeoutTypeTag，专门用于订单类型
 */
export const OrderTypeTag = (props) => (
    <TimeoutTypeTag {...props} isOrderType={true} />
);

/**
 * 超时类型标签列表组件
 * 显示多个超时类型标签
 *
 * @param {Object} props 组件属性
 * @param {Array} props.types 类型代码数组
 * @param {boolean} props.isOrderTypes 是否为订单类型标签
 * @param {Object} props.counts 各类型的计数对象 (可选)
 * @param {function} props.onTagClick 标签点击事件回调 (可选)
 */
export const TimeoutTypeTags = ({
                                    types = [],
                                    isOrderTypes = false,
                                    counts = {},
                                    onTagClick = null
                                }) => {
    if (!types || types.length === 0) return null;

    return (
        <div className="timeout-type-tags">
            {types.map(type => (
                <TimeoutTypeTag
                    key={type}
                    type={type}
                    isOrderType={isOrderTypes}
                    showCount={!!counts[type]}
                    count={counts[type] || 0}
                    onClick={onTagClick ? () => onTagClick(type) : null}
                    showTooltip={!!counts[type]}
                    tooltipText={counts[type] ? `${isOrderTypes ? timeoutTypeMapping.getOrderTypeDisplay(type) : timeoutTypeMapping.getTimeoutTypeDisplay(type)}: ${counts[type]}` : ''}
                />
            ))}
        </div>
    );
};

export default TimeoutTypeTag;