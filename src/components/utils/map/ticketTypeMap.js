// ticketTypeMap.js

/**
 * 工单类型映射配置
 * 用于定义所有有效的工单类型及其对应的显示文本
 */
export const TICKET_TYPE_MAP = {
    1: '订单时效问题',
    2: '账号安全问题',
    3: '订单退款问题',
    4: '其他问题'
};

/**
 * 获取工单类型的显示文本
 * @param {number} type - 工单类型ID
 * @returns {string} - 对应的显示文本，如果类型无效则返回"未知类型"
 */
export const getTicketTypeText = (type) => {
    return TICKET_TYPE_MAP[type] || '未知类型';
};

/**
 * 判断是否为有效的工单类型
 * @param {number} type - 需要判断的工单类型
 * @returns {boolean} - 是否为有效的工单类型
 */
export const isValidTicketType = (type) => {
    return Object.keys(TICKET_TYPE_MAP).includes(String(type));
};

/**
 * 获取所有工单类型选项
 * 用于表单选择等场景
 * @returns {Array<{value: number, label: string}>} - 工单类型选项数组
 */
export const getTicketTypeOptions = () => {
    return Object.entries(TICKET_TYPE_MAP).map(([value, label]) => ({
        value: Number(value),
        label
    }));
};

/**
 * 获取工单类型的详细信息
 * @param {number} type - 工单类型ID
 * @returns {Object} - 包含图标、描述、颜色和字段的对象
 */
export const getTicketTypeInfo = (type) => {
    switch(type) {
        case 1: // 订单时效问题
            return {
                icon: '⏱️',
                description: '处理订单延迟、配送时间等问题',
                color: '#4CAF50',
                fields: ['订单编号', '预期送达时间', '实际送达时间', '延迟原因']
            };
        case 2: // 账号安全问题
            return {
                icon: '🔒',
                description: '处理账号登录、密码修改等安全问题',
                color: '#2196F3',
                fields: ['账号信息', '安全问题描述', '发现时间', '是否紧急']
            };
        case 3: // 订单退款问题
            return {
                icon: '💰',
                description: '处理退款申请、退款进度查询等问题',
                color: '#FF9800',
                fields: ['订单编号', '购买时间', '退款金额', '退款原因']
            };
        case 4: // 其他问题
            return {
                icon: '❓',
                description: '处理其他类型的问题和咨询',
                color: '#9E9E9E',
                fields: ['问题描述', '相关信息']
            };
        default:
            return {
                icon: '📝',
                description: '未分类问题',
                color: '#9E9E9E',
                fields: []
            };
    }
};