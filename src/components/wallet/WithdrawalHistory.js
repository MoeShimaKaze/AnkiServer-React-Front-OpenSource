import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import styles from '../../assets/css/wallet/WalletManager.module.css';
import { Table, Spin, Alert, Button, Typography, Divider, Tooltip } from 'antd';
import { ArrowLeftOutlined, ReloadOutlined, CheckCircleOutlined, CloseCircleOutlined, SyncOutlined } from '@ant-design/icons';

const { Title, Text } = Typography;

// 定义提现记录组件
const WithdrawalHistory = ({ onBack, focusOrderNumber = null }) => {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [withdrawalHistory, setWithdrawalHistory] = useState([]);
    const [selectedOrder, setSelectedOrder] = useState(null);

    // 加载提现历史记录
    const loadWithdrawalHistory = useCallback(async () => {
        setLoading(true);
        setError(null);

        try {
            const response = await axios.get('http://127.0.0.1:8080/api/wallet/withdrawal/history', {
                withCredentials: true
            });

            setWithdrawalHistory(response.data);

            // 如果有焦点订单号，选中该订单
            if (focusOrderNumber) {
                const matchedOrder = response.data.find(order => order.orderNumber === focusOrderNumber);
                if (matchedOrder) {
                    setSelectedOrder(matchedOrder);
                }
            }

        } catch (error) {
            console.error('加载提现历史记录失败:', error);
            setError('获取提现历史记录失败，请稍后再试');
        } finally {
            setLoading(false);
        }
    }, [focusOrderNumber]);

    // 组件加载时获取提现历史
    useEffect(() => {
        loadWithdrawalHistory();

        // 设置定时刷新 - 每30秒刷新一次状态
        const intervalId = setInterval(() => {
            if (selectedOrder && selectedOrder.status === 'PROCESSING') {
                loadWithdrawalHistory();
            }
        }, 30000);

        return () => {
            clearInterval(intervalId);
        };
    }, [loadWithdrawalHistory, selectedOrder]);

    // 刷新数据
    const handleRefresh = () => {
        loadWithdrawalHistory();
    };

    // 返回钱包主界面
    const handleBack = () => {
        if (onBack && typeof onBack === 'function') {
            onBack();
        }
    };

    // 获取状态图标
    const getStatusIcon = (status) => {
        switch (status) {
            case 'SUCCESS':
                return <CheckCircleOutlined style={{ color: '#52c41a' }} />;
            case 'FAILED':
                return <CloseCircleOutlined style={{ color: '#f5222d' }} />;
            case 'PROCESSING':
                return <SyncOutlined spin style={{ color: '#1890ff' }} />;
            default:
                return null;
        }
    };

    // 表格列定义
    const columns = [
        {
            title: '订单号',
            dataIndex: 'orderNumber',
            key: 'orderNumber',
            render: (text) => <span style={{ fontFamily: 'monospace' }}>{text}</span>,
        },
        {
            title: '提现金额',
            dataIndex: 'amount',
            key: 'amount',
            render: (amount) => `¥${amount.toFixed(2)}`,
        },
        {
            title: '提现方式',
            dataIndex: 'withdrawalMethod',
            key: 'withdrawalMethod',
            render: (method) => method === 'ALIPAY' ? '支付宝' : method,
        },
        {
            title: '状态',
            dataIndex: 'status',
            key: 'status',
            render: (status, record) => (
                <span>
                    {getStatusIcon(status)} {record.statusText}
                </span>
            ),
        },
        {
            title: '申请时间',
            dataIndex: 'createdTime',
            key: 'createdTime',
            render: (time) => new Date(time).toLocaleString(),
        },
        {
            title: '完成时间',
            dataIndex: 'completedTime',
            key: 'completedTime',
            render: (time) => time ? new Date(time).toLocaleString() : '-',
        },
    ];

    return (
        <div className={styles.withdrawalHistory}>
            <div className={styles.historyHeader}>
                <Button
                    icon={<ArrowLeftOutlined />}
                    onClick={handleBack}
                    style={{ marginRight: '10px' }}
                >
                    返回
                </Button>
                <Title level={3} style={{ margin: 0 }}>提现记录</Title>
                <Tooltip title="刷新">
                    <Button
                        icon={<ReloadOutlined />}
                        onClick={handleRefresh}
                        loading={loading}
                        style={{ marginLeft: 'auto' }}
                    />
                </Tooltip>
            </div>

            <Divider />

            {error && (
                <Alert
                    message="加载失败"
                    description={error}
                    type="error"
                    showIcon
                    style={{ marginBottom: '20px' }}
                />
            )}

            {loading ? (
                <div className={styles.loadingWrapper}>
                    <Spin size="large" />
                </div>
            ) : (
                <>
                    {withdrawalHistory.length === 0 ? (
                        <div className={styles.emptyHistory}>
                            <Text>暂无提现记录</Text>
                        </div>
                    ) : (
                        <div className={styles.historyTable}>
                            <Table
                                dataSource={withdrawalHistory}
                                columns={columns}
                                rowKey="orderNumber"
                                pagination={{ pageSize: 5 }}
                                expandable={{
                                    expandedRowRender: (record) => (
                                        <div className={styles.expandedRow}>
                                            <div className={styles.expandedItem}>
                                                <span className={styles.expandedLabel}>订单详情：</span>
                                                <span className={styles.expandedValue}>
                                                    {record.status === 'FAILED' && record.errorMessage ? (
                                                        <Text type="danger">{record.errorMessage}</Text>
                                                    ) : (
                                                        <Text>
                                                            {record.status === 'PROCESSING' ? '您的提现申请正在处理中，预计1-3个工作日内到账' :
                                                                record.status === 'SUCCESS' ? '提现成功，资金已转入您的账户' :
                                                                    '提现处理失败，如有疑问请联系客服'}
                                                        </Text>
                                                    )}
                                                </span>
                                            </div>
                                        </div>
                                    ),
                                }}
                                rowClassName={(record) => record.orderNumber === focusOrderNumber ? styles.highlightedRow : ''}
                            />
                        </div>
                    )}
                </>
            )}
        </div>
    );
};

export default WithdrawalHistory;