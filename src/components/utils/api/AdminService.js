// AdminService.js
// 提供管理员相关的API服务

import axios from 'axios';

const API_BASE_URL = 'http://127.0.0.1:8080';

/**
 * 获取所有管理员用户列表
 * @returns {Promise<Array>} 管理员用户列表
 */
export const getAllAdmins = async () => {
    try {
        const response = await axios.get(`${API_BASE_URL}/api/users/admins`, {
            withCredentials: true
        });
        return response.data;
    } catch (error) {
        console.error('获取管理员列表失败:', error);
        throw error;
    }
};

/**
 * 获取分页的管理员用户列表
 * @param {number} page 页码
 * @param {number} size 每页大小
 * @returns {Promise<Object>} 分页的管理员用户列表
 */
export const getAdminsPaged = async (page = 0, size = 10) => {
    try {
        const response = await axios.get(`${API_BASE_URL}/api/users/admins`, {
            params: { paged: true, page, size },
            withCredentials: true
        });
        return response.data;
    } catch (error) {
        console.error('获取分页管理员列表失败:', error);
        throw error;
    }
};

/**
 * 转移工单给指定管理员
 * @param {number} ticketId 工单ID
 * @param {number} adminId 管理员ID
 * @returns {Promise<Object>} 响应结果
 */
export const transferTicket = async (ticketId, adminId) => {
    try {
        const response = await axios.post(
            `${API_BASE_URL}/tickets/transfer/${ticketId}/${adminId}`,
            {},
            { withCredentials: true }
        );
        return response.data;
    } catch (error) {
        console.error('转移工单失败:', error);
        throw error;
    }
};

/**
 * 获取当前管理员的已分配工单（分页）
 * @param {boolean} open 是否为开启状态的工单
 * @param {number} page 页码
 * @param {number} size 每页大小
 * @returns {Promise<Object>} 分页的已分配工单
 */
export const getCurrentAdminAssignedTickets = async (open = true, page = 0, size = 10) => {
    try {
        const response = await axios.get(
            `${API_BASE_URL}/tickets/admin/assigned/paged`,
            {
                params: { open, page, size },
                withCredentials: true
            }
        );
        return response.data;
    } catch (error) {
        console.error('获取当前管理员已分配工单失败:', error);
        throw error;
    }
};

/**
 * 获取指定管理员的已分配工单（分页）
 * @param {number} adminId 管理员ID
 * @param {boolean} open 是否为开启状态的工单
 * @param {number} page 页码
 * @param {number} size 每页大小
 * @returns {Promise<Object>} 分页的已分配工单
 */
export const getAdminAssignedTickets = async (adminId, open = true, page = 0, size = 10) => {
    try {
        const response = await axios.get(
            `${API_BASE_URL}/tickets/admin/${adminId}/assigned/paged`,
            {
                params: { open, page, size },
                withCredentials: true
            }
        );
        return response.data;
    } catch (error) {
        console.error(`获取管理员${adminId}已分配工单失败:`, error);
        throw error;
    }
};

/**
 * 获取当前分配给管理员的工单数量
 * @param {number} adminId 管理员ID
 * @returns {Promise<number>} 工单数量
 */
export const getAdminTicketCount = async (adminId) => {
    try {
        const response = await axios.get(`${API_BASE_URL}/api/admins/${adminId}/ticket-count`, {
            withCredentials: true
        });
        return response.data;
    } catch (error) {
        console.error('获取管理员工单数量失败:', error);
        // 如果API不存在，返回默认值
        return null;
    }
};