// src/utils/map/userMap.js

/**
 * 性别映射
 */
export const GENDER_MAP = {
    'male': '男',
    'female': '女',
    'other': '其他',
    'undefined': '未指定'
};

/**
 * 认证状态映射
 */
export const VERIFICATION_STATUS_MAP = {
    'VERIFIED': '已认证',
    'PENDING': '认证审核中',
    'UNVERIFIED': '未认证',
    'REJECTED': '认证被拒绝',
};

/**
 * 用户组映射
 */
export const USER_GROUP_MAP = {
    'user': '普通用户',
    'admin': '管理员',
    'messenger': '配送员',
    'platform_staff': '平台专员',
    'store': '商家' // 新增商家用户组
};

/**
 * 认证身份映射
 */
export const IDENTITY_MAP = {
    'STUDENT': '学生',
    'MERCHANT': '商家',
    'PLATFORM_STAFF': '平台专员',
    'VERIFIED_USER': '普通实名用户' // 新增普通实名用户身份
};

/**
 * 获取性别显示文本
 */
export const getGenderText = (gender) => {
    return GENDER_MAP[gender] || GENDER_MAP.undefined;
};

/**
 * 获取认证状态显示文本
 */
export const getVerificationStatusText = (status) => {
    return VERIFICATION_STATUS_MAP[status] || '未知状态';
};

/**
 * 获取用户组显示文本
 */
export const getUserGroupText = (group) => {
    return USER_GROUP_MAP[group] || '未知用户组';
};

/**
 * 获取认证身份显示文本
 */
export const getIdentityText = (identity) => {
    return IDENTITY_MAP[identity] || '未知身份';
};

/**
 * 获取所有性别选项
 */
export const getGenderOptions = () => {
    return Object.entries(GENDER_MAP).map(([value, label]) => ({
        value,
        label
    }));
};

/**
 * 获取所有用户组选项
 */
export const getUserGroupOptions = () => {
    return Object.entries(USER_GROUP_MAP).map(([value, label]) => ({
        value,
        label
    }));
};

/**
 * 获取所有认证身份选项
 */
export const getIdentityOptions = () => {
    return Object.entries(IDENTITY_MAP).map(([value, label]) => ({
        value,
        label
    }));
};