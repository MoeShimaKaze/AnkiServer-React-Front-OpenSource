// questionTypeMap.js

/**
 * 问题类型显示文本映射
 * 用于直接显示问题类型的中文名称
 */
export const QUESTION_TYPE_DISPLAY = {
    HARDWARE_REPAIR: '硬件维修',
    SOFTWARE_ISSUE: '软件问题',
    SYSTEM_INSTALL: '系统安装',
    VIRUS_REMOVAL: '病毒清除',
    DATA_RECOVERY: '数据恢复',
    PERFORMANCE_OPTIMIZATION: '性能优化',
    OTHER: '其他'
};

/**
 * 问题类型描述映射
 * 用于显示每种问题类型的详细描述
 */
export const QUESTION_TYPE_DESCRIPTION = {
    HARDWARE_REPAIR: '电脑硬件相关的维修问题',
    SOFTWARE_ISSUE: '软件安装、运行、兼容性等问题',
    SYSTEM_INSTALL: '操作系统安装与配置问题',
    VIRUS_REMOVAL: '病毒、木马等恶意软件清除',
    DATA_RECOVERY: '意外删除或丢失的数据恢复',
    PERFORMANCE_OPTIMIZATION: '系统运行速度优化、内存管理等',
    OTHER: '其他类型的电脑相关问题'
};

/**
 * 问题状态显示文本映射
 */
export const QUESTION_STATUS_DISPLAY = {
    OPEN: '待解决',
    IN_PROGRESS: '处理中',
    RESOLVED: '已解决',
    CLOSED: '已关闭'
};

/**
 * 问题状态描述映射
 */
export const QUESTION_STATUS_DESCRIPTION = {
    OPEN: '问题已发布,等待回复和解决',
    IN_PROGRESS: '已有人接受处理此问题',
    RESOLVED: '问题已经得到解决',
    CLOSED: '问题已关闭'
};

/**
 * 获取问题类型的显示文本
 */
export const getQuestionTypeText = (type) => {
    return QUESTION_TYPE_DISPLAY[type] || '未知类型';
};

/**
 * 获取问题类型的描述
 */
export const getQuestionTypeDescription = (type) => {
    return QUESTION_TYPE_DESCRIPTION[type] || '';
};

/**
 * 获取问题状态的显示文本
 */
export const getStatusText = (status) => {
    return QUESTION_STATUS_DISPLAY[status] || '未知状态';
};

/**
 * 获取问题状态的描述
 */
export const getStatusDescription = (status) => {
    return QUESTION_STATUS_DESCRIPTION[status] || '';
};

/**
 * 获取所有问题类型选项
 * 用于表单选择等场景
 */
export const getQuestionTypeOptions = () => {
    return Object.entries(QUESTION_TYPE_DISPLAY).map(([value, label]) => ({
        value,
        label
    }));
};

/**
 * 判断问题状态是否为终态
 */
export const isFinalState = (status) => {
    return status === 'RESOLVED' || status === 'CLOSED';
};

/**
 * 判断问题状态是否可修改
 */
export const isStatusModifiable = (status) => {
    return status === 'OPEN' || status === 'IN_PROGRESS';
};

/**
 * 获取问题状态对应的样式
 */
export const getStatusStyle = (status) => {
    switch (status) {
        case 'OPEN':
            return {
                // 这里返回你在 CSS Module 中定义的类名
                background: 'statusOpen'
            };
        case 'IN_PROGRESS':
            return {
                background: 'statusInProgress'
            };
        case 'RESOLVED':
            return {
                background: 'statusResolved'
            };
        case 'CLOSED':
            return {
                background: 'statusClosed'
            };
        default:
            return {
                background: ''
            };
    }
};