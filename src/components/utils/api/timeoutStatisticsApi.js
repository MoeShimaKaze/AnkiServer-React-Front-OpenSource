// src/utils/api/timeoutStatisticsApi.js
import axios from 'axios';

// 固定的API基础URL
const API_BASE_URL = 'http://127.0.0.1:8080/api/timeout-statistics';

/**
 * 超时统计API服务
 * 提供获取各类超时统计数据的方法
 */
const timeoutStatisticsApi = {
    /**
     * 获取当前用户的超时统计数据
     * @param {Date|null} startTime - 开始时间
     * @param {Date|null} endTime - 结束时间
     * @returns {Promise<Object>} 用户超时统计数据
     */
    getUserStatistics: async (startTime = null, endTime = null) => {
        try {
            const params = {};
            if (startTime) params.startTime = startTime.toISOString();
            if (endTime) params.endTime = endTime.toISOString();

            const response = await axios.get(`${API_BASE_URL}/user`, {
                params,
                withCredentials: true
            });

            return response.data;
        } catch (error) {
            console.error('获取用户超时统计失败:', error);
            throw error;
        }
    },

    /**
     * 获取指定用户的超时统计数据（仅管理员）
     * @param {number} userId - 用户ID
     * @param {Date|null} startTime - 开始时间
     * @param {Date|null} endTime - 结束时间
     * @returns {Promise<Object>} 指定用户的超时统计数据
     */
    getUserStatisticsById: async (userId, startTime = null, endTime = null) => {
        try {
            const params = {};
            if (startTime) params.startTime = startTime.toISOString();
            if (endTime) params.endTime = endTime.toISOString();

            const response = await axios.get(`${API_BASE_URL}/user/${userId}`, {
                params,
                withCredentials: true
            });

            return response.data;
        } catch (error) {
            console.error(`获取用户${userId}超时统计失败:`, error);
            throw error;
        }
    },

    /**
     * 获取系统超时统计数据（仅管理员）
     * @param {Date|null} startTime - 开始时间
     * @param {Date|null} endTime - 结束时间
     * @returns {Promise<Object>} 系统超时统计数据
     */
    getSystemStatistics: async (startTime = null, endTime = null) => {
        try {
            const params = {};
            if (startTime) params.startTime = startTime.toISOString();
            if (endTime) params.endTime = endTime.toISOString();

            const response = await axios.get(`${API_BASE_URL}/system`, {
                params,
                withCredentials: true
            });

            return response.data;
        } catch (error) {
            console.error('获取系统超时统计失败:', error);
            throw error;
        }
    },

    /**
     * 获取全局超时统计数据（仅管理员）
     * @param {Date|null} startTime - 开始时间
     * @param {Date|null} endTime - 结束时间
     * @returns {Promise<Object>} 全局超时统计数据
     */
    getGlobalStatistics: async (startTime = null, endTime = null) => {
        try {
            const params = {};
            if (startTime) params.startTime = startTime.toISOString();
            if (endTime) params.endTime = endTime.toISOString();

            const response = await axios.get(`${API_BASE_URL}/global`, {
                params,
                withCredentials: true
            });

            return response.data;
        } catch (error) {
            console.error('获取全局超时统计失败:', error);
            throw error;
        }
    },

    /**
     * 获取仪表盘统计数据（根据用户身份返回不同数据）
     * @returns {Promise<Object>} 仪表盘统计数据
     */
    getDashboardStatistics: async () => {
        try {
            const response = await axios.get(`${API_BASE_URL}/dashboard`, {
                withCredentials: true
            });

            return response.data;
        } catch (error) {
            console.error('获取仪表盘统计数据失败:', error);
            throw error;
        }
    },

    /**
     * 获取用户超时排行榜
     * @param {Date|null} startTime - 开始时间
     * @param {Date|null} endTime - 结束时间
     * @param {number} page - 页码
     * @param {number} size - 每页大小
     * @param {string} sortBy - 排序字段
     * @param {string} direction - 排序方向
     * @returns {Promise<Object>} 用户排行榜数据
     */
    getUserRankings: async (startTime = null, endTime = null, page = 0, size = 10, sortBy = 'timeoutRate', direction = 'desc') => {
        try {
            const params = {
                page,
                size,
                sortBy,
                direction
            };

            if (startTime) params.startTime = startTime.toISOString();
            if (endTime) params.endTime = endTime.toISOString();

            const response = await axios.get(`${API_BASE_URL}/ranking`, {
                params,
                withCredentials: true
            });

            return response.data;
        } catch (error) {
            console.error('获取用户排行榜失败:', error);
            throw error;
        }
    },

    /**
     * 获取全局用户超时排行榜
     * @param {Date|null} startTime - 开始时间
     * @param {Date|null} endTime - 结束时间
     * @param {number} page - 页码
     * @param {number} size - 每页大小
     * @param {string} sortBy - 排序字段
     * @param {string} direction - 排序方向
     * @returns {Promise<Object>} 全局用户排行榜数据
     */
    getGlobalUserRankings: async (startTime = null, endTime = null, page = 0, size = 10, sortBy = 'timeoutRate', direction = 'desc') => {
        try {
            const params = {
                page,
                size,
                sortBy,
                direction
            };

            if (startTime) params.startTime = startTime.toISOString();
            if (endTime) params.endTime = endTime.toISOString();

            const response = await axios.get(`${API_BASE_URL}/global-ranking`, {
                params,
                withCredentials: true
            });

            return response.data;
        } catch (error) {
            console.error('获取全局用户排行榜失败:', error);
            throw error;
        }
    },

    /**
     * 获取排行榜详情
     * @param {Array<number>} userIds - 用户ID列表
     * @param {Date|null} startTime - 开始时间
     * @param {Date|null} endTime - 结束时间
     * @returns {Promise<Array>} 用户详情数据
     */
    getRankingDetails: async (userIds, startTime = null, endTime = null) => {
        try {
            const params = {
                userIds
            };

            if (startTime) params.startTime = startTime.toISOString();
            if (endTime) params.endTime = endTime.toISOString();

            const response = await axios.get(`${API_BASE_URL}/ranking/details`, {
                params,
                withCredentials: true
            });

            return response.data;
        } catch (error) {
            console.error('获取排行榜详情失败:', error);
            throw error;
        }
    },

    /**
     * 比较不同时间段的超时统计数据
     * @param {Date} periodOneStart - 第一时段开始时间
     * @param {Date} periodOneEnd - 第一时段结束时间
     * @param {Date} periodTwoStart - 第二时段开始时间
     * @param {Date} periodTwoEnd - 第二时段结束时间
     * @returns {Promise<Object>} 比较结果
     */
    compareTimeoutStatistics: async (periodOneStart, periodOneEnd, periodTwoStart, periodTwoEnd) => {
        try {
            const params = {
                periodOneStart: periodOneStart.toISOString(),
                periodOneEnd: periodOneEnd.toISOString(),
                periodTwoStart: periodTwoStart.toISOString(),
                periodTwoEnd: periodTwoEnd.toISOString()
            };

            const response = await axios.get(`${API_BASE_URL}/compare`, {
                params,
                withCredentials: true
            });

            return response.data;
        } catch (error) {
            console.error('比较超时统计失败:', error);
            throw error;
        }
    },

    /**
     * 获取用户历史超时统计
     * @param {Date|null} startTime - 开始时间
     * @param {Date|null} endTime - 结束时间
     * @param {number} days - 天数
     * @returns {Promise<Object>} 历史超时统计数据
     */
    getUserTimeoutHistory: async (startTime = null, endTime = null, days = 7) => {
        try {
            const params = {
                days
            };

            if (startTime) params.startTime = startTime.toISOString();
            if (endTime) params.endTime = endTime.toISOString();

            const response = await axios.get(`${API_BASE_URL}/history`, {
                params,
                withCredentials: true
            });

            return response.data;
        } catch (error) {
            console.error('获取用户历史超时统计失败:', error);
            throw error;
        }
    },

    /**
     * 获取特定类型订单的超时详情
     * @param {string} orderType - 订单类型
     * @param {Date|null} startTime - 开始时间
     * @param {Date|null} endTime - 结束时间
     * @returns {Promise<Object>} 订单超时详情
     */
    getTimeoutDetails: async (orderType, startTime = null, endTime = null) => {
        try {
            const params = {};

            if (startTime) params.startTime = startTime.toISOString();
            if (endTime) params.endTime = endTime.toISOString();

            const response = await axios.get(`${API_BASE_URL}/details/${orderType}`, {
                params,
                withCredentials: true
            });

            return response.data;
        } catch (error) {
            console.error(`获取${orderType}类型订单超时详情失败:`, error);
            throw error;
        }
    },

    /**
     * 获取高风险用户列表
     * @param {Date|null} startTime - 开始时间
     * @param {Date|null} endTime - 结束时间
     * @param {number} limit - 限制返回数量
     * @returns {Promise<Object>} 高风险用户数据
     */
    getHighRiskUsers: async (startTime = null, endTime = null, limit = 10) => {
        try {
            const params = { limit };
            if (startTime) params.startTime = startTime.toISOString();
            if (endTime) params.endTime = endTime.toISOString();

            const response = await axios.get(`${API_BASE_URL}/high-risk-users`, {
                params,
                withCredentials: true
            });

            return response.data;
        } catch (error) {
            console.error('获取高风险用户列表失败:', error);
            throw error;
        }
    },

    /**
     * 获取区域分析数据
     * @param {Date|null} startTime - 开始时间
     * @param {Date|null} endTime - 结束时间
     * @returns {Promise<Object>} 区域分析数据
     */
    getRegionAnalysis: async (startTime = null, endTime = null) => {
        try {
            const params = {};
            if (startTime) params.startTime = startTime.toISOString();
            if (endTime) params.endTime = endTime.toISOString();

            const response = await axios.get(`${API_BASE_URL}/region-analysis`, {
                params,
                withCredentials: true
            });

            return response.data;
        } catch (error) {
            console.error('获取区域分析数据失败:', error);
            throw error;
        }
    },

    /**
     * 获取时间分布分析
     * @param {Date|null} startTime - 开始时间
     * @param {Date|null} endTime - 结束时间
     * @returns {Promise<Object>} 时间分析数据
     */
    getTimeAnalysis: async (startTime = null, endTime = null) => {
        try {
            const params = {};
            if (startTime) params.startTime = startTime.toISOString();
            if (endTime) params.endTime = endTime.toISOString();

            const response = await axios.get(`${API_BASE_URL}/time-analysis`, {
                params,
                withCredentials: true
            });

            return response.data;
        } catch (error) {
            console.error('获取时间分布分析失败:', error);
            throw error;
        }
    },

    /**
     * 获取趋势预警
     * @param {Date|null} startTime - 开始时间
     * @param {Date|null} endTime - 结束时间
     * @param {number} threshold - 变化阈值
     * @returns {Promise<Object>} 趋势预警数据
     */
    getTrendAlerts: async (startTime = null, endTime = null, threshold = 0.2) => {
        try {
            const params = { threshold };
            if (startTime) params.startTime = startTime.toISOString();
            if (endTime) params.endTime = endTime.toISOString();

            const response = await axios.get(`${API_BASE_URL}/trend-alerts`, {
                params,
                withCredentials: true
            });

            return response.data;
        } catch (error) {
            console.error('获取趋势预警失败:', error);
            throw error;
        }
    },

    /**
     * 获取服务风险分析
     * @param {Date|null} startTime - 开始时间
     * @param {Date|null} endTime - 结束时间
     * @returns {Promise<Object>} 服务风险分析数据
     */
    getServiceRiskAnalysis: async (startTime = null, endTime = null) => {
        try {
            const params = {};
            if (startTime) params.startTime = startTime.toISOString();
            if (endTime) params.endTime = endTime.toISOString();

            const response = await axios.get(`${API_BASE_URL}/service-risk-analysis`, {
                params,
                withCredentials: true
            });

            return response.data;
        } catch (error) {
            console.error('获取服务风险分析失败:', error);
            throw error;
        }
    },

    /**
     * 获取超时成本分析
     * @param {Date|null} startTime - 开始时间
     * @param {Date|null} endTime - 结束时间
     * @returns {Promise<Object>} 成本分析数据
     */
    getCostAnalysis: async (startTime = null, endTime = null) => {
        try {
            const params = {};
            if (startTime) params.startTime = startTime.toISOString();
            if (endTime) params.endTime = endTime.toISOString();

            const response = await axios.get(`${API_BASE_URL}/cost-analysis`, {
                params,
                withCredentials: true
            });

            return response.data;
        } catch (error) {
            console.error('获取超时成本分析失败:', error);
            throw error;
        }
    },

    // 获取最新超时报告
    getLatestReport: async () => {
        try {
            const response = await axios.get(`${API_BASE_URL}/reports/latest`, {
                withCredentials: true
            });
            return response.data;
        } catch (error) {
            console.error('获取最新超时报告失败:', error);
            throw error;
        }
    },

    // 获取指定时间段的超时报告
    getReportsByPeriod: async (startTime, endTime) => {
        try {
            const params = {};
            if (startTime) params.startTime = startTime.toISOString();
            if (endTime) params.endTime = endTime.toISOString();

            const response = await axios.get(`${API_BASE_URL}/reports`, {
                params,
                withCredentials: true
            });
            return response.data;
        } catch (error) {
            console.error('获取超时报告失败:', error);
            throw error;
        }
    },

    // 获取超时统计建议
    getRecommendations: async (startTime, endTime) => {
        try {
            const params = {};
            if (startTime) params.startTime = startTime.toISOString();
            if (endTime) params.endTime = endTime.toISOString();

            const response = await axios.get(`${API_BASE_URL}/recommendations`, {
                params,
                withCredentials: true
            });
            return response.data;
        } catch (error) {
            console.error('获取超时统计建议失败:', error);
            throw error;
        }
    },

    /**
     * 获取用户风险评估
     * @returns {Promise<Object>} 用户风险评估数据
     */
    getUserRiskAssessment: async () => {
        try {
            const response = await axios.get(`${API_BASE_URL}/user-risk-assessment`, {
                withCredentials: true
            });

            return response.data;
        } catch (error) {
            console.error('获取用户风险评估失败:', error);
            throw error;
        }
    }
};

export default timeoutStatisticsApi;