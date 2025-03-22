// src/utils/timeoutStatsFormatter.js

/**
 * 超时统计数据格式化工具
 * 提供各种数据格式化和计算方法
 * 增强版本 - 支持更多高级分析数据格式化和兼容新的数据结构
 */
const timeoutStatsFormatter = {
    /**
     * 将超时类型代码转换为友好显示名称
     * @param {string} type - 超时类型代码
     * @returns {string} 友好显示名称
     */
    getTimeoutTypeDisplay: (type) => {
        const typeMap = {
            'PICKUP': '取件超时',
            'DELIVERY': '配送超时',
            'CONFIRMATION': '确认超时',
            'INTERVENTION': '介入处理',
            'MAIL_ORDER': '快递代拿',
            'SHOPPING_ORDER': '商品购买',
            'PURCHASE_REQUEST': '代购需求'
        };

        return typeMap[type] || type;
    },

    /**
     * 计算超时统计数据的总数 - 兼容新数据结构
     * @param {Object} statistics - 超时统计数据对象
     * @returns {number} 总超时次数
     */
    calculateTotalTimeouts: (statistics) => {
        if (!statistics) {
            return 0;
        }

        // 检查是否是新的数据结构
        if (statistics.serviceStatistics && typeof statistics.serviceStatistics === 'object') {
            return Object.values(statistics.serviceStatistics).reduce((total, stats) => {
                return total + (stats && typeof stats === 'object' ? (stats.timeoutCount || 0) : 0);
            }, 0);
        }

        // 兼容旧的数据结构
        if (statistics.timeoutCounts) {
            return Object.values(statistics.timeoutCounts).reduce((total, count) => total + (count || 0), 0);
        }

        return 0;
    },

    /**
     * 计算各类型超时的百分比分布 - 兼容新数据结构
     * @param {Object} statistics - 超时统计数据对象
     * @returns {Array} 包含类型、数量和百分比的数组
     */
    calculateTimeoutDistribution: (statistics) => {
        if (!statistics) {
            return [];
        }

        let distributionData = [];
        let total = 0;

        // 检查是否是新的数据结构
        if (statistics.serviceStatistics && typeof statistics.serviceStatistics === 'object') {
            const serviceStats = statistics.serviceStatistics;

            // 计算总数
            total = Object.values(serviceStats).reduce((sum, stats) => {
                return sum + (stats && typeof stats === 'object' ? (stats.timeoutCount || 0) : 0);
            }, 0);

            if (total === 0) return [];

            // 构建分布数据
            distributionData = Object.entries(serviceStats).map(([serviceType, stats]) => {
                const count = stats && typeof stats === 'object' ? (stats.timeoutCount || 0) : 0;
                return {
                    type: serviceType,
                    typeName: timeoutStatsFormatter.getTimeoutTypeDisplay(serviceType),
                    count: count,
                    percentage: Math.round((count / total) * 100)
                };
            });
        }
        // 兼容旧的数据结构
        else if (statistics.timeoutCounts && typeof statistics.timeoutCounts === 'object') {
            const timeoutCounts = statistics.timeoutCounts;

            total = Object.values(timeoutCounts).reduce((sum, count) => sum + (count || 0), 0);
            if (total === 0) return [];

            distributionData = Object.entries(timeoutCounts).map(([type, count]) => ({
                type,
                typeName: timeoutStatsFormatter.getTimeoutTypeDisplay(type),
                count: count || 0,
                percentage: Math.round(((count || 0) / total) * 100)
            }));
        }

        return distributionData;
    },

    /**
     * 格式化超时率为百分比字符串
     * @param {number} rate - 超时率（0-1之间的小数）
     * @returns {string} 格式化的百分比字符串
     */
    formatTimeoutRate: (rate) => {
        if (rate === undefined || rate === null) {
            return '0%';
        }

        return `${Math.round(rate * 100)}%`;
    },

    /**
     * 格式化超时趋势数据为图表可用格式 - 兼容新数据结构
     * @param {Object} statistics - 超时统计数据
     * @returns {Array} 图表数据数组
     */
    formatTimeoutTrends: (statistics) => {
        if (!statistics) {
            return [];
        }

        // 检查是否有新结构的趋势数据
        if (statistics.trends && Array.isArray(statistics.trends)) {
            return statistics.trends.map(trend => {
                // 处理新的趋势数据格式
                const timeFrame = trend.timeFrame || '';

                // 转换为图表可用的格式
                return {
                    date: timeFrame,
                    // 在这个版本中，我们没有细分类型的趋势数据，所以将总数分配给一个类型
                    PICKUP: Math.round(trend.timeoutRate * 100) || 0,
                    DELIVERY: 0,
                    CONFIRMATION: 0,
                    INTERVENTION: 0,
                    total: Math.round(trend.timeoutRate * 100) || 0
                };
            });
        }

        // 兼容旧的数据结构
        if (statistics.timeoutTrends && Array.isArray(statistics.timeoutTrends)) {
            return statistics.timeoutTrends.map(item => {
                // 确保 counts 存在且是一个对象
                const counts = item && item.counts && typeof item.counts === 'object' ? item.counts : {};

                return {
                    date: item?.date || '',
                    PICKUP: counts.PICKUP || 0,
                    DELIVERY: counts.DELIVERY || 0,
                    CONFIRMATION: counts.CONFIRMATION || 0,
                    INTERVENTION: counts.INTERVENTION || 0,
                    total: Object.values(counts).reduce((sum, val) => sum + (val || 0), 0)
                };
            });
        }

        return [];
    },

    /**
     * 计算当前与上一时段的变化率
     * @param {number} current - 当前值
     * @param {number} previous - 上一时段值
     * @returns {Object} 包含变化率和趋势方向的对象
     */
    calculateChangeRate: (current, previous) => {
        // 添加对当前值的验证
        if (current === undefined || current === null) {
            return { rate: 0, direction: 'stable' };
        }

        // 验证前值，如果不存在无法计算变化率
        if (previous === undefined || previous === null) {
            return { rate: 0, direction: 'stable' };
        }

        if (previous === 0) {
            return current > 0
                ? { rate: 100, direction: 'up' }
                : { rate: 0, direction: 'stable' };
        }

        const change = ((current - previous) / previous) * 100;

        return {
            rate: Math.abs(Math.round(change)),
            direction: change > 0 ? 'up' : change < 0 ? 'down' : 'stable'
        };
    },

    /**
     * 格式化超时统计摘要信息 - 兼容新的数据结构
     * @param {Object} statistics - 超时统计数据
     * @param {Object} previousStatistics - 上一时段统计数据（可选）
     * @returns {Object} 格式化后的摘要信息
     */
    formatStatisticsSummary: (statistics, previousStatistics = null) => {
        if (!statistics) {
            return {
                totalTimeouts: 0,
                pickupTimeouts: 0,
                deliveryTimeouts: 0,
                confirmationTimeouts: 0,
                averageTimeoutRate: '0%'
            };
        }

        // 处理新的数据结构 - 从serviceStatistics中提取数据
        let totalTimeouts = 0;
        let pickupTimeouts = 0;
        let deliveryTimeouts = 0;
        let confirmationTimeouts = 0;
        let totalOrders = 0;

        // 检查是否存在serviceStatistics
        if (statistics.serviceStatistics && typeof statistics.serviceStatistics === 'object') {
            // 遍历所有服务类型
            Object.entries(statistics.serviceStatistics).forEach(([serviceType, stats]) => {
                // 累加总超时次数
                if (stats && typeof stats === 'object') {
                    const timeoutCount = stats.timeoutCount || 0;
                    totalTimeouts += timeoutCount;
                    totalOrders += stats.orderCount || 0;

                    // 由于后端没有提供按超时类型的细分，我们根据服务类型进行简单分类
                    // 这里可以根据实际业务逻辑调整
                    if (serviceType === 'MAIL_ORDER') {
                        pickupTimeouts += timeoutCount;
                    } else if (serviceType === 'SHOPPING_ORDER') {
                        deliveryTimeouts += timeoutCount;
                    } else {
                        confirmationTimeouts += timeoutCount;
                    }
                }
            });
        } else if (statistics.timeoutCounts) {
            // 兼容旧的数据结构
            const timeoutCounts = statistics.timeoutCounts || {};
            totalTimeouts = timeoutStatsFormatter.calculateTotalTimeouts(statistics);
            pickupTimeouts = timeoutCounts.PICKUP || 0;
            deliveryTimeouts = timeoutCounts.DELIVERY || 0;
            confirmationTimeouts = timeoutCounts.CONFIRMATION || 0;
        }

        // 计算平均超时率
        let averageTimeoutRate = '0%';
        if (statistics.averageTimeoutRate !== undefined) {
            // 使用直接提供的平均超时率
            averageTimeoutRate = timeoutStatsFormatter.formatTimeoutRate(statistics.averageTimeoutRate);
        } else if (totalOrders > 0) {
            // 根据订单总数和超时总数计算
            averageTimeoutRate = timeoutStatsFormatter.formatTimeoutRate(totalTimeouts / totalOrders);
        }

        // 计算变化率（如果有上一时段数据）
        let changeRates = {};
        if (previousStatistics) {
            const prevTotal = timeoutStatsFormatter.calculateTotalTimeouts(previousStatistics);

            // 获取前一时段的各类型超时数
            let prevPickupTimeouts = 0;
            let prevDeliveryTimeouts = 0;
            let prevConfirmationTimeouts = 0;

            if (previousStatistics.serviceStatistics && typeof previousStatistics.serviceStatistics === 'object') {
                // 从新的数据结构中提取
                Object.entries(previousStatistics.serviceStatistics).forEach(([serviceType, stats]) => {
                    if (stats && typeof stats === 'object') {
                        const timeoutCount = stats.timeoutCount || 0;
                        if (serviceType === 'MAIL_ORDER') {
                            prevPickupTimeouts += timeoutCount;
                        } else if (serviceType === 'SHOPPING_ORDER') {
                            prevDeliveryTimeouts += timeoutCount;
                        } else {
                            prevConfirmationTimeouts += timeoutCount;
                        }
                    }
                });
            } else if (previousStatistics.timeoutCounts) {
                // 从旧的数据结构中提取
                const prevTimeoutCounts = previousStatistics.timeoutCounts || {};
                prevPickupTimeouts = prevTimeoutCounts.PICKUP || 0;
                prevDeliveryTimeouts = prevTimeoutCounts.DELIVERY || 0;
                prevConfirmationTimeouts = prevTimeoutCounts.CONFIRMATION || 0;
            }

            changeRates = {
                totalChange: timeoutStatsFormatter.calculateChangeRate(totalTimeouts, prevTotal),
                pickupChange: timeoutStatsFormatter.calculateChangeRate(pickupTimeouts, prevPickupTimeouts),
                deliveryChange: timeoutStatsFormatter.calculateChangeRate(deliveryTimeouts, prevDeliveryTimeouts),
                confirmationChange: timeoutStatsFormatter.calculateChangeRate(confirmationTimeouts, prevConfirmationTimeouts)
            };
        }

        return {
            totalTimeouts,
            pickupTimeouts,
            deliveryTimeouts,
            confirmationTimeouts,
            averageTimeoutRate,
            changeRates: previousStatistics ? changeRates : null
        };
    },

    /**
     * 格式化风险等级为文字描述
     * @param {string} riskLevel - 风险等级代码
     * @returns {Object} 包含文字描述和颜色的对象
     */
    formatRiskLevel: (riskLevel) => {
        switch (riskLevel) {
            case 'CRITICAL':
                return { text: '极高风险', color: 'red' };
            case 'HIGH':
                return { text: '高风险', color: 'orange' };
            case 'MEDIUM':
                return { text: '中等风险', color: 'gold' };
            case 'LOW':
                return { text: '低风险', color: 'green' };
            default:
                return { text: '未知风险', color: 'grey' };
        }
    },

    /**
     * 格式化区域分析数据为热力图格式 - 兼容新数据结构
     * @param {Object} regionData - 区域分析数据
     * @returns {Array} 热力图可用的数据格式
     */
    formatRegionHeatmapData: (regionData) => {
        if (!regionData) return [];

        // 适配新的数据结构，regionData可能直接是RegionStatistics对象
        // 或者是包含regionStatistics属性的对象
        const regionStats = regionData.regionStatistics || regionData;

        if (!regionStats || !regionStats.timeoutCounts || typeof regionStats.timeoutCounts !== 'object') {
            return [];
        }

        const timeoutRates = regionStats.timeoutRates || {};
        const highRiskRegions = Array.isArray(regionStats.highRiskRegions) ? regionStats.highRiskRegions : [];

        return Object.entries(regionStats.timeoutCounts).map(([region, count]) => ({
            region,
            count: count || 0,
            rate: timeoutRates[region] || 0,
            isHighRisk: highRiskRegions.includes(region),
        }));
    },

    /**
     * 格式化时间分析数据为图表格式 - 兼容新数据结构
     * @param {Object} timeData - 时间分析数据
     * @returns {Array} 图表可用的数据格式
     */
    formatHourlyDistributionData: (timeData) => {
        if (!timeData) return [];

        // 适配新的数据结构，timeData可能直接是TimeDistribution对象
        // 或者是包含timeDistribution属性的对象
        const timeDistribution = timeData.timeDistribution || timeData;

        if (!timeDistribution || !timeDistribution.hourlyDistribution || typeof timeDistribution.hourlyDistribution !== 'object') {
            return [];
        }

        const hourlyDistribution = timeDistribution.hourlyDistribution || {};
        const peakHours = Array.isArray(timeDistribution.peakHours)
            ? timeDistribution.peakHours
            : (typeof timeDistribution.getPeakHours === 'function' ? timeDistribution.getPeakHours() : []);

        // 高风险小时可能来自多个地方
        let highRiskHour;
        if (timeData.highRiskHour !== undefined) {
            highRiskHour = timeData.highRiskHour;
        } else if (timeDistribution.highRiskHour !== undefined) {
            highRiskHour = timeDistribution.highRiskHour;
        } else if (typeof timeData.getHighRiskHour === 'function') {
            highRiskHour = timeData.getHighRiskHour();
        }

        // 验证高风险小时是否有效
        const isValidHighRiskHour = highRiskHour !== undefined &&
            highRiskHour !== null &&
            !isNaN(parseInt(highRiskHour, 10)) &&
            parseInt(highRiskHour, 10) >= 0 &&
            parseInt(highRiskHour, 10) < 24;

        return Object.entries(hourlyDistribution).map(([hour, count]) => ({
            hour: `${hour}:00-${parseInt(hour, 10) + 1}:00`,
            hourValue: parseInt(hour, 10),
            count: count || 0,
            isPeak: peakHours.includes(parseInt(hour, 10)),
            isHighRisk: isValidHighRiskHour && parseInt(hour, 10) === parseInt(highRiskHour, 10),
        })).sort((a, b) => a.hourValue - b.hourValue);
    },

    /**
     * 格式化趋势预警数据 - 兼容新数据结构
     * @param {Array} trends - 趋势数据
     * @returns {Object} 包含分类趋势的对象
     */
    formatTrendAlerts: (trends) => {
        if (!trends) {
            return {
                increasingTrends: [],
                decreasingTrends: [],
                stableTrends: [],
                significantChanges: []
            };
        }

        // 适配新的数据结构，trends可能直接是趋势数组
        // 或者是包含trends属性的对象
        const trendData = Array.isArray(trends) ? trends : (trends.trends || []);

        // 过滤无效数据
        const validTrends = trendData.filter(trend =>
            trend && typeof trend === 'object' &&
            typeof trend.changeRate === 'number'
        );

        const increasingTrends = validTrends.filter(trend => trend.changeRate > 0.05);
        const decreasingTrends = validTrends.filter(trend => trend.changeRate < -0.05);
        const stableTrends = validTrends.filter(trend =>
            trend.changeRate >= -0.05 && trend.changeRate <= 0.05
        );

        return {
            increasingTrends,
            decreasingTrends,
            stableTrends,
            significantChanges: validTrends.filter(trend => Math.abs(trend.changeRate) > 0.2),
        };
    },

    /**
     * 格式化服务风险分析数据 - 兼容新数据结构
     * @param {Object} serviceRiskData - 服务风险数据
     * @returns {Array} 格式化后的服务风险数据列表
     */
    formatServiceRiskAnalysis: (serviceRiskData) => {
        if (!serviceRiskData) return [];

        // 新的数据结构，直接访问serviceStatistics
        let serviceStats;
        if (serviceRiskData.serviceStatistics && typeof serviceRiskData.serviceStatistics === 'object') {
            serviceStats = serviceRiskData.serviceStatistics;
        }
        // 旧的数据结构
        else if (serviceRiskData.serviceRiskAnalysis && typeof serviceRiskData.serviceRiskAnalysis === 'object') {
            serviceStats = serviceRiskData.serviceRiskAnalysis;
        } else {
            return [];
        }

        return Object.entries(serviceStats).map(([type, data]) => {
            // 确保data是对象
            if (!data || typeof data !== 'object') {
                data = {};
            }

            // 从数据中提取属性，适应不同的命名
            const timeoutRate = data.timeoutRate || (data.timeoutCount && data.orderCount ? data.timeoutCount / data.orderCount : 0);
            const hasHighTimeoutRate = data.hasHighTimeoutRate || (typeof data.hasHighTimeoutRate === 'function' ? data.hasHighTimeoutRate() : timeoutRate > 0.15);
            const averageTimeoutFee = data.averageTimeoutFee || data.timeoutFees || 0;
            const orderCount = data.orderCount || 0;
            const timeoutCount = data.timeoutCount || 0;

            return {
                serviceType: type,
                timeoutRate,
                hasHighTimeoutRate,
                averageTimeoutFee,
                orderCount,
                timeoutCount,
                riskScore: calculateRiskScore(data),
            };
        }).sort((a, b) => b.riskScore - a.riskScore); // 按风险分数降序排序
    },

    /**
     * 格式化成本分析数据 - 兼容新数据结构
     * @param {Object} costData - 成本分析数据
     * @returns {Object} 格式化后的成本分析数据
     */
    formatCostAnalysis: (costData) => {
        if (!costData) {
            return {
                totalTimeoutFees: 0,
                averageTimeoutFees: {},
                serviceBreakdown: [],
            };
        }

        // 总费用可能在不同位置
        const totalFees = costData.totalTimeoutFees || 0;

        // 服务类型细分可能在不同位置
        let serviceStats;
        if (costData.serviceStatistics && typeof costData.serviceStatistics === 'object') {
            serviceStats = costData.serviceStatistics;
        } else if (costData.serviceBreakdown && typeof costData.serviceBreakdown === 'object') {
            serviceStats = costData.serviceBreakdown;
        } else {
            serviceStats = {};
        }

        // 计算各服务类型占比
        const serviceBreakdown = Object.entries(serviceStats).map(([type, data]) => {
            // 确保data是对象
            if (!data || typeof data !== 'object') {
                data = {};
            }

            const timeoutCount = data.timeoutCount || 0;
            const timeoutFees = data.timeoutFees || 0;
            const averageFee = data.averageFee || data.averageTimeoutFee || (timeoutCount > 0 ? timeoutFees / timeoutCount : 0);

            return {
                serviceType: type,
                timeoutCount,
                timeoutFees,
                averageFee,
                percentage: totalFees ? ((timeoutFees) / totalFees * 100).toFixed(2) : 0,
            };
        }).sort((a, b) => b.timeoutFees - a.timeoutFees); // 按费用降序排序

        // 计算各服务类型的平均费用
        const averageTimeoutFees = {};
        for (const item of serviceBreakdown) {
            averageTimeoutFees[item.serviceType] = item.averageFee;
        }

        return {
            totalTimeoutFees: totalFees,
            averageTimeoutFees,
            serviceBreakdown,
        };
    },

    /**
     * 格式化高风险用户数据 - 兼容新数据结构
     * @param {Object} highRiskUsersData - 高风险用户数据
     * @returns {Array} 格式化后的高风险用户列表
     */
    formatHighRiskUsers: (highRiskUsersData) => {
        if (!highRiskUsersData) return [];

        // 适配不同的数据结构
        const users = Array.isArray(highRiskUsersData)
            ? highRiskUsersData
            : (highRiskUsersData.users && Array.isArray(highRiskUsersData.users)
                ? highRiskUsersData.users
                : []);

        return users.map(user => {
            // 确保user是对象
            if (!user || typeof user !== 'object') {
                user = {};
            }

            // 提取各项属性，适应不同的命名
            const userId = user.userId || user.id;
            const totalTimeoutFees = user.totalTimeoutFees || 0;
            const totalOrders = user.totalOrders || 0;

            // 支持不同命名的超时率
            let timeoutRate;
            if (typeof user.timeoutRate === 'number') {
                timeoutRate = user.timeoutRate;
            } else if (typeof user.getOverallTimeoutRate === 'function') {
                timeoutRate = user.getOverallTimeoutRate();
            } else if (typeof user.getOverallTimeoutRate === 'number') {
                timeoutRate = user.getOverallTimeoutRate;
            } else {
                timeoutRate = 0;
            }

            // 支持不同命名的超时次数
            let timeoutCount;
            if (typeof user.timeoutCount === 'number') {
                timeoutCount = user.timeoutCount;
            } else if (typeof user.getTimeoutCount === 'function') {
                timeoutCount = user.getTimeoutCount();
            } else if (typeof user.getTimeoutCount === 'number') {
                timeoutCount = user.getTimeoutCount;
            } else {
                timeoutCount = 0;
            }

            return {
                userId,
                totalTimeoutFees,
                totalOrders,
                timeoutRate,
                timeoutCount,
                riskLevel: calculateUserRiskLevel(user),
                riskScore: calculateUserRiskScore(user),
            };
        }).sort((a, b) => b.riskScore - a.riskScore); // 按风险分数降序排序
    }
};

/**
 * 计算服务风险分数
 * @param {Object} serviceData - 服务数据
 * @returns {number} 风险分数(0-100)
 */
function calculateRiskScore(serviceData) {
    if (!serviceData || typeof serviceData !== 'object') {
        return 0;
    }

    const timeoutRateWeight = 0.6;
    const feeWeight = 0.2;
    const countWeight = 0.2;

    // 提取各项指标
    let timeoutRate;
    if (typeof serviceData.timeoutRate === 'number') {
        timeoutRate = serviceData.timeoutRate;
    } else if (serviceData.orderCount && serviceData.timeoutCount) {
        timeoutRate = serviceData.timeoutCount / serviceData.orderCount;
    } else {
        timeoutRate = 0;
    }

    const averageTimeoutFee = serviceData.averageTimeoutFee || serviceData.averageFee || 0;
    const timeoutCount = serviceData.timeoutCount || 0;

    const normalizedRate = Math.min(timeoutRate, 0.5) / 0.5; // 最高50%
    const normalizedFee = Math.min(averageTimeoutFee, 100) / 100; // 最高100元
    const normalizedCount = Math.min(timeoutCount, 100) / 100; // 最高100次

    return (
        normalizedRate * timeoutRateWeight * 100 +
        normalizedFee * feeWeight * 100 +
        normalizedCount * countWeight * 100
    );
}

/**
 * 计算用户风险等级
 * @param {Object} userData - 用户数据
 * @returns {string} 风险等级
 */
function calculateUserRiskLevel(userData) {
    if (!userData || typeof userData !== 'object') {
        return 'LOW';
    }

    // 支持不同命名的超时率
    let timeoutRate;
    if (typeof userData.timeoutRate === 'number') {
        timeoutRate = userData.timeoutRate;
    } else if (typeof userData.getOverallTimeoutRate === 'function') {
        timeoutRate = userData.getOverallTimeoutRate();
    } else if (typeof userData.getOverallTimeoutRate === 'number') {
        timeoutRate = userData.getOverallTimeoutRate;
    } else if (userData.totalOrders && userData.timeoutCount) {
        timeoutRate = userData.timeoutCount / userData.totalOrders;
    } else {
        timeoutRate = 0;
    }

    if (timeoutRate > 0.3) return 'CRITICAL';
    if (timeoutRate > 0.2) return 'HIGH';
    if (timeoutRate > 0.1) return 'MEDIUM';
    return 'LOW';
}

/**
 * 计算用户风险分数
 * @param {Object} userData - 用户数据
 * @returns {number} 风险分数(0-100)
 */
function calculateUserRiskScore(userData) {
    if (!userData || typeof userData !== 'object') {
        return 0;
    }

    const timeoutRateWeight = 0.7;
    const feeWeight = 0.2;
    const countWeight = 0.1;

    // 支持不同命名的超时率
    let timeoutRate;
    if (typeof userData.timeoutRate === 'number') {
        timeoutRate = userData.timeoutRate;
    } else if (typeof userData.getOverallTimeoutRate === 'function') {
        timeoutRate = userData.getOverallTimeoutRate();
    } else if (typeof userData.getOverallTimeoutRate === 'number') {
        timeoutRate = userData.getOverallTimeoutRate;
    } else if (userData.totalOrders && userData.timeoutCount) {
        timeoutRate = userData.timeoutCount / userData.totalOrders;
    } else {
        timeoutRate = 0;
    }

    // 提取费用和计数
    const totalTimeoutFees = userData.totalTimeoutFees || 0;

    // 支持不同命名的超时次数
    let timeoutCount;
    if (typeof userData.timeoutCount === 'number') {
        timeoutCount = userData.timeoutCount;
    } else if (typeof userData.getTimeoutCount === 'function') {
        timeoutCount = userData.getTimeoutCount();
    } else if (typeof userData.getTimeoutCount === 'number') {
        timeoutCount = userData.getTimeoutCount;
    } else {
        timeoutCount = 0;
    }

    const normalizedRate = Math.min(timeoutRate, 0.5) / 0.5; // 最高50%
    const normalizedFee = Math.min(totalTimeoutFees, 500) / 500; // 最高500元
    const normalizedCount = Math.min(timeoutCount, 50) / 50; // 最高50次

    return (
        normalizedRate * timeoutRateWeight * 100 +
        normalizedFee * feeWeight * 100 +
        normalizedCount * countWeight * 100
    );
}

export default timeoutStatsFormatter;