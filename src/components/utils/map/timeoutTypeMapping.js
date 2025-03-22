// src/utils/timeoutTypeMapping.js

/**
 * 超时类型与订单类型映射关系工具
 * 提供订单类型、超时类型之间的转换与显示名称映射
 */
const timeoutTypeMapping = {
    /**
     * 订单类型映射到显示名称
     */
    orderTypeDisplay: {
        'MAIL_ORDER': '快递代拿',
        'SHOPPING_ORDER': '商品购买',
        'PURCHASE_REQUEST': '代购需求'
    },

    /**
     * 超时类型映射到显示名称
     */
    timeoutTypeDisplay: {
        'PICKUP': '取件超时',
        'DELIVERY': '配送超时',
        'CONFIRMATION': '确认超时',
        'INTERVENTION': '介入处理'
    },

    /**
     * 订单类型到主要超时类型的映射关系
     * 指示每种订单类型最常见的超时情况
     */
    orderToTimeoutType: {
        'MAIL_ORDER': 'PICKUP',
        'SHOPPING_ORDER': 'DELIVERY',
        'PURCHASE_REQUEST': 'CONFIRMATION'
    },

    /**
     * 超时类型到可能订单类型的映射关系
     * 指示每种超时类型可能发生在哪些订单类型上
     */
    timeoutToOrderTypes: {
        'PICKUP': ['MAIL_ORDER'],
        'DELIVERY': ['SHOPPING_ORDER', 'MAIL_ORDER'],
        'CONFIRMATION': ['PURCHASE_REQUEST', 'SHOPPING_ORDER', 'MAIL_ORDER'],
        'INTERVENTION': ['MAIL_ORDER', 'SHOPPING_ORDER', 'PURCHASE_REQUEST']
    },

    /**
     * 获取订单类型的显示名称
     * @param {string} orderType - 订单类型代码
     * @returns {string} 订单类型显示名称
     */
    getOrderTypeDisplay: (orderType) => {
        return timeoutTypeMapping.orderTypeDisplay[orderType] || orderType;
    },

    /**
     * 获取超时类型的显示名称
     * @param {string} timeoutType - 超时类型代码
     * @returns {string} 超时类型显示名称
     */
    getTimeoutTypeDisplay: (timeoutType) => {
        return timeoutTypeMapping.timeoutTypeDisplay[timeoutType] || timeoutType;
    },

    /**
     * 根据订单类型获取主要对应的超时类型
     * @param {string} orderType - 订单类型代码
     * @returns {string} 对应的超时类型
     */
    getTimeoutTypeByOrderType: (orderType) => {
        return timeoutTypeMapping.orderToTimeoutType[orderType] || 'INTERVENTION';
    },

    /**
     * 根据超时类型获取可能的订单类型
     * @param {string} timeoutType - 超时类型代码
     * @returns {Array} 可能的订单类型数组
     */
    getOrderTypesByTimeoutType: (timeoutType) => {
        return timeoutTypeMapping.timeoutToOrderTypes[timeoutType] || [];
    },

    /**
     * 判断订单类型是否可能产生指定的超时类型
     * @param {string} orderType - 订单类型代码
     * @param {string} timeoutType - 超时类型代码
     * @returns {boolean} 是否匹配
     */
    isOrderTypeMatchTimeoutType: (orderType, timeoutType) => {
        const possibleOrderTypes = timeoutTypeMapping.getOrderTypesByTimeoutType(timeoutType);
        return possibleOrderTypes.includes(orderType);
    },

    /**
     * 从服务统计数据中提取超时类型计数
     * 适配新的数据结构到旧的统计组件
     * @param {Object} serviceStatistics - 服务统计数据对象
     * @returns {Object} 超时类型计数对象
     */
    extractTimeoutCounts: (serviceStatistics) => {
        if (!serviceStatistics || typeof serviceStatistics !== 'object') {
            return {};
        }

        const timeoutCounts = {
            'PICKUP': 0,
            'DELIVERY': 0,
            'CONFIRMATION': 0,
            'INTERVENTION': 0
        };

        // 从服务统计提取数据，按照映射关系统计
        Object.entries(serviceStatistics).forEach(([serviceType, stats]) => {
            if (stats && typeof stats === 'object' && stats.timeoutCount) {
                const timeoutType = timeoutTypeMapping.getTimeoutTypeByOrderType(serviceType);
                timeoutCounts[timeoutType] = (timeoutCounts[timeoutType] || 0) + stats.timeoutCount;
            }
        });

        return timeoutCounts;
    },

    /**
     * 获取所有订单类型
     * @returns {Array} 所有订单类型的代码数组
     */
    getAllOrderTypes: () => {
        return Object.keys(timeoutTypeMapping.orderTypeDisplay);
    },

    /**
     * 获取所有超时类型
     * @returns {Array} 所有超时类型的代码数组
     */
    getAllTimeoutTypes: () => {
        return Object.keys(timeoutTypeMapping.timeoutTypeDisplay);
    },

    /**
     * 根据订单类型获取其在UI组件中的样式类名
     * @param {string} orderType - 订单类型代码
     * @returns {string} 样式类名
     */
    getOrderTypeStyleClass: (orderType) => {
        const styleMap = {
            'MAIL_ORDER': 'mail-order-style',
            'SHOPPING_ORDER': 'shopping-order-style',
            'PURCHASE_REQUEST': 'purchase-request-style'
        };
        return styleMap[orderType] || 'default-order-style';
    },

    /**
     * 根据超时类型获取其在UI组件中的样式类名
     * @param {string} timeoutType - 超时类型代码
     * @returns {string} 样式类名
     */
    getTimeoutTypeStyleClass: (timeoutType) => {
        const styleMap = {
            'PICKUP': 'pickup-timeout-style',
            'DELIVERY': 'delivery-timeout-style',
            'CONFIRMATION': 'confirmation-timeout-style',
            'INTERVENTION': 'intervention-timeout-style'
        };
        return styleMap[timeoutType] || 'default-timeout-style';
    }
};

export default timeoutTypeMapping;