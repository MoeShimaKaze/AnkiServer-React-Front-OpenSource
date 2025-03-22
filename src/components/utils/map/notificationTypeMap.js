// notificationTypeMap.js

/**
 * 系统通知类型映射配置
 * 用于定义所有有效的通知类型及其对应的显示文本
 */
export const notificationTypeMap = {
    // 消息相关通知
    NEW_MESSAGE: "新消息",

    // 订单状态更新通知
    ORDER_STATUS_UPDATED: "订单状态更新",
    ORDER_CREATED: "订单创建",
    ORDER_ACCEPTED: "订单已接单",

    // 工单状态更新通知
    TICKET_STATUS_UPDATED: "工单状态更新",
    TICKET_REPLIED: "工单回复",

    // 评价相关通知
    REVIEW_RECEIVED: "收到新评价"
};

/**
 * 有效通知类型列表
 * 用于过滤系统消息，只显示实际的业务通知
 */
export const VALID_NOTIFICATION_TYPES = Object.keys(notificationTypeMap);

/**
 * 获取通知类型的显示文本
 * @param {string} type - 通知类型
 * @returns {string} - 对应的显示文本，如果类型无效则返回原始类型
 */
export const getNotificationTypeText = (type) => {
    return notificationTypeMap[type] || type;
};

/**
 * 判断是否为有效的通知类型
 * @param {string} type - 需要判断的通知类型
 * @returns {boolean} - 是否为有效的通知类型
 */
export const isValidNotificationType = (type) => {
    return VALID_NOTIFICATION_TYPES.includes(type);
};

/**
 * 系统消息类型
 * 这些类型的消息不会显示在通知列表中
 */
export const SYSTEM_MESSAGE_TYPES = [
    'CONNECTION_ESTABLISHED',
    'AUTHENTICATED',
    'PONG',
    'ERROR'
];