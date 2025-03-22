// notificationTypeMap.js
// 此文件用于将后端消息类型映射为前端可读的文本内容

/**
 * 系统消息类型列表
 * 这些消息类型是系统内部使用的，不会显示给用户
 */
export const SYSTEM_MESSAGE_TYPES = [
    'PING',
    'PONG',
    'CONNECTION_ESTABLISHED',
    'ERROR'
];

/**
 * 系统中有效的通知类型列表
 * 用于过滤显示在UI中的通知类型
 * 注意: 可以根据需求调整此列表，只包含需要在UI中显示的通知类型
 */
export const VALID_NOTIFICATION_TYPES = [
    'ORDER_CREATED',
    'ORDER_ACCEPTED',
    'ORDER_STATUS_UPDATED',
    'REVIEW_RECEIVED',
    'TICKET_REPLIED',
    'TICKET_STATUS_UPDATED',
    'QUESTION_REPLIED',
    'QUESTION_SOLUTION_APPLIED',
    'QUESTION_SOLUTION_ACCEPTED',
    'QUESTION_RESOLVED',
    'QUESTION_SOLUTION_REJECTED',
    'QUESTION_STATUS_UPDATED',
    'WALLET_RECHARGE_SUCCESS',
    'WALLET_WITHDRAW_SUCCESS',
    'WALLET_WITHDRAW_FAILED',
    'ORDER_PAYMENT_TIMEOUT',
    'ORDER_PAYMENT_CREATED',
    'ORDER_PAYMENT_SUCCESS',
    'ORDER_PAYMENT_CANCELLED',
    'ORDER_REFUND_PROCESSING',
    'WALLET_REFUND',
    'BILLING_INFO',
    'ORDER_WARNING',
    'STORE_NEW_ORDER',
    'ORDER_REFUND_SUCCESS',
    'ORDER_DELIVERED',
    'ORDER_COMPLETED',
    'ORDER_REFUND_REQUESTED',
    'PRODUCT_STATUS_UPDATED',
    'NEW_MESSAGE' // 特殊类型，用于站内信
];

/**
 * 获取通知类型对应的可读文本
 * @param {string} type - 通知类型
 * @returns {string} 对应的中文描述
 */
export const getNotificationTypeText = (type) => {
    const typeTextMap = {
        // 订单相关
        'ORDER_CREATED': '订单已创建',
        'ORDER_ACCEPTED': '订单已接受',
        'ORDER_STATUS_UPDATED': '订单状态更新',
        'ORDER_DELIVERED': '订单已送达',
        'ORDER_COMPLETED': '订单已完成',
        'ORDER_WARNING': '订单警告',
        'STORE_NEW_ORDER': '商店新订单',

        // 支付相关
        'ORDER_PAYMENT_TIMEOUT': '订单支付超时',
        'ORDER_PAYMENT_CREATED': '支付订单已创建',
        'ORDER_PAYMENT_SUCCESS': '支付成功',
        'ORDER_PAYMENT_CANCELLED': '支付已取消',

        // 退款相关
        'ORDER_REFUND_PROCESSING': '退款处理中',
        'ORDER_REFUND_SUCCESS': '退款成功',
        'ORDER_REFUND_REQUESTED': '退款已申请',

        // 评价相关
        'REVIEW_RECEIVED': '收到新评价',

        // 工单相关
        'TICKET_REPLIED': '工单已回复',
        'TICKET_STATUS_UPDATED': '工单状态更新',

        // 问题相关
        'QUESTION_REPLIED': '问题已回复',
        'QUESTION_SOLUTION_APPLIED': '解决方案已应用',
        'QUESTION_SOLUTION_ACCEPTED': '解决方案已接受',
        'QUESTION_RESOLVED': '问题已解决',
        'QUESTION_SOLUTION_REJECTED': '解决方案被拒绝',
        'QUESTION_STATUS_UPDATED': '问题状态更新',

        // 钱包相关
        'WALLET_RECHARGE_SUCCESS': '充值成功',
        'WALLET_WITHDRAW_SUCCESS': '提现成功',
        'WALLET_WITHDRAW_FAILED': '提现失败',
        'WALLET_REFUND': '钱包退款',
        'BILLING_INFO': '账单信息',

        // 产品相关
        'PRODUCT_STATUS_UPDATED': '商品状态更新',

        // 站内信
        'NEW_MESSAGE': '新站内信'
    };

    // 如果找不到对应的类型，返回未知类型提示
    return typeTextMap[type] || `未知通知类型: ${type}`;
};

/**
 * 获取通知类型对应的图标名称
 * 可用于在UI中展示对应类型的图标
 * 注意: 需要配合Ant Design的图标组件使用
 * @param {string} type - 通知类型
 * @returns {string} 对应的图标名称
 */
export const getNotificationIconName = (type) => {
    // 根据消息类型分组
    const typeIconMap = {
        // 订单相关
        'ORDER_CREATED': 'ShoppingOutlined',
        'ORDER_ACCEPTED': 'CheckCircleOutlined',
        'ORDER_STATUS_UPDATED': 'SyncOutlined',
        'ORDER_DELIVERED': 'CarOutlined',
        'ORDER_COMPLETED': 'CheckSquareOutlined',
        'ORDER_WARNING': 'WarningOutlined',
        'STORE_NEW_ORDER': 'ShopOutlined',

        // 支付相关
        'ORDER_PAYMENT_TIMEOUT': 'ClockCircleOutlined',
        'ORDER_PAYMENT_CREATED': 'DollarOutlined',
        'ORDER_PAYMENT_SUCCESS': 'CheckCircleOutlined',
        'ORDER_PAYMENT_CANCELLED': 'CloseCircleOutlined',

        // 退款相关
        'ORDER_REFUND_PROCESSING': 'LoadingOutlined',
        'ORDER_REFUND_SUCCESS': 'CheckCircleOutlined',
        'ORDER_REFUND_REQUESTED': 'RollbackOutlined',

        // 评价相关
        'REVIEW_RECEIVED': 'StarOutlined',

        // 工单相关
        'TICKET_REPLIED': 'MessageOutlined',
        'TICKET_STATUS_UPDATED': 'FileTextOutlined',

        // 问题相关
        'QUESTION_REPLIED': 'CommentOutlined',
        'QUESTION_SOLUTION_APPLIED': 'BulbOutlined',
        'QUESTION_SOLUTION_ACCEPTED': 'LikeOutlined',
        'QUESTION_RESOLVED': 'CheckCircleOutlined',
        'QUESTION_SOLUTION_REJECTED': 'DislikeOutlined',
        'QUESTION_STATUS_UPDATED': 'ExclamationCircleOutlined',

        // 钱包相关
        'WALLET_RECHARGE_SUCCESS': 'PlusCircleOutlined',
        'WALLET_WITHDRAW_SUCCESS': 'MinusCircleOutlined',
        'WALLET_WITHDRAW_FAILED': 'CloseCircleOutlined',
        'WALLET_REFUND': 'RollbackOutlined',
        'BILLING_INFO': 'FileTextOutlined',

        // 产品相关
        'PRODUCT_STATUS_UPDATED': 'TagsOutlined',

        // 站内信
        'NEW_MESSAGE': 'MailOutlined'
    };

    // 如果找不到对应的类型，返回默认图标
    return typeIconMap[type] || 'BellOutlined';
};

/**
 * 根据通知类型获取对应的路由路径
 * @param {string} type - 通知类型
 * @param {Object} params - 路由参数，如id等
 * @returns {string} 对应的路由路径
 */
export const getNotificationRoutePath = (type, params = {}) => {
    // 默认路径映射
    const typeRouteMap = {
        // 订单相关
        'ORDER_CREATED': '/mailorder',
        'ORDER_ACCEPTED': '/mailorder',
        'ORDER_STATUS_UPDATED': '/mailorder',
        'ORDER_DELIVERED': '/mailorder',
        'ORDER_COMPLETED': '/mailorder',
        'ORDER_WARNING': '/mailorder',
        'STORE_NEW_ORDER': '/shop/orders',

        // 支付相关
        'ORDER_PAYMENT_TIMEOUT': '/wallet',
        'ORDER_PAYMENT_CREATED': '/wallet',
        'ORDER_PAYMENT_SUCCESS': '/wallet',
        'ORDER_PAYMENT_CANCELLED': '/wallet',

        // 退款相关
        'ORDER_REFUND_PROCESSING': '/wallet',
        'ORDER_REFUND_SUCCESS': '/wallet',
        'ORDER_REFUND_REQUESTED': '/wallet',

        // 评价相关
        'REVIEW_RECEIVED': '/profile',

        // 工单相关
        'TICKET_REPLIED': params.ticketId ? `/chat/${params.ticketId}` : '/support',
        'TICKET_STATUS_UPDATED': params.ticketId ? `/chat/${params.ticketId}` : '/support',

        // 问题相关
        'QUESTION_REPLIED': params.questionId ? `/question/${params.questionId}` : '/question',
        'QUESTION_SOLUTION_APPLIED': params.questionId ? `/question/${params.questionId}` : '/question',
        'QUESTION_SOLUTION_ACCEPTED': params.questionId ? `/question/${params.questionId}` : '/question',
        'QUESTION_RESOLVED': params.questionId ? `/question/${params.questionId}` : '/question',
        'QUESTION_SOLUTION_REJECTED': params.questionId ? `/question/${params.questionId}` : '/question',
        'QUESTION_STATUS_UPDATED': params.questionId ? `/question/${params.questionId}` : '/question',

        // 钱包相关
        'WALLET_RECHARGE_SUCCESS': '/wallet',
        'WALLET_WITHDRAW_SUCCESS': '/wallet',
        'WALLET_WITHDRAW_FAILED': '/wallet',
        'WALLET_REFUND': '/wallet',
        'BILLING_INFO': '/wallet',

        // 产品相关
        'PRODUCT_STATUS_UPDATED': '/shop',

        // 站内信
        'NEW_MESSAGE': '/messages'
    };

    // 如果找不到对应的类型，返回站内信页面
    return typeRouteMap[type] || '/messages';
};

// 通知优先级，用于排序显示
export const NOTIFICATION_PRIORITIES = {
    'ORDER_WARNING': 1,            // 最高优先级
    'TICKET_REPLIED': 2,
    'NEW_MESSAGE': 3,
    'ORDER_REFUND_REQUESTED': 4,
    'ORDER_PAYMENT_TIMEOUT': 5,
    'WALLET_WITHDRAW_FAILED': 6,
    'ORDER_CREATED': 7,
    'ORDER_ACCEPTED': 8,
    'QUESTION_SOLUTION_APPLIED': 9,
    'PRODUCT_STATUS_UPDATED': 10,  // 最低优先级
    'DEFAULT': 5                   // 默认优先级
};

/**
 * 获取通知优先级
 * @param {string} type - 通知类型
 * @returns {number} 优先级值（数字越小优先级越高）
 */
export const getNotificationPriority = (type) => {
    return NOTIFICATION_PRIORITIES[type] || NOTIFICATION_PRIORITIES.DEFAULT;
};