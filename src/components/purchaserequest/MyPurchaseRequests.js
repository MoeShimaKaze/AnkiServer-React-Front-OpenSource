// src/components/shopping/MyPurchaseRequests.js
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Row,
    Col,
    Button,
    Select,
    Empty,
    Pagination,
    Spin,
    message,
    Card,
    Modal
} from 'antd';
import {
    PlusOutlined,
    UserOutlined,
    ExclamationCircleOutlined
} from '@ant-design/icons';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import PurchaseRequestCard from './PurchaseRequestCard';
import styles from '../../assets/css/purchaserequest/MyPurchaseRequests.module.css';

const { Option } = Select;
const { confirm } = Modal;

/**
 * 我的代购需求组件
 * 展示当前用户发布的所有代购需求，支持按状态筛选
 */
const MyPurchaseRequests = () => {
    const navigate = useNavigate();
    const { userId, isLoggedIn } = useAuth();

    // 状态管理
    const [loading, setLoading] = useState(true);
    const [requests, setRequests] = useState([]);
    const [selectedStatus, setSelectedStatus] = useState('ALL');
    const [pagination, setPagination] = useState({
        current: 1,
        pageSize: 12,
        total: 0
    });

    // 检查登录状态
    useEffect(() => {
        if (!isLoggedIn) {
            message.error('请先登录后再查看您的代购需求');
            navigate('/login', { state: { from: '/request/my-requests' } });
        }
    }, [isLoggedIn, navigate]);

    // 获取数据
    /* eslint-disable react-hooks/exhaustive-deps */
    const fetchData = useCallback(async () => {
        if (!userId) return;

        setLoading(true);

        try {
            const response = await axios.get(
                `http://127.0.0.1:8080/api/purchase-requests/user/${userId}`,
                {
                    params: {
                        status: selectedStatus !== 'ALL' ? selectedStatus : null,
                        page: pagination.current - 1,
                        size: pagination.pageSize
                    },
                    withCredentials: true
                }
            );

            // 处理多层嵌套的API响应格式
            if (response.data && response.data.data && Array.isArray(response.data.data.content)) {
                // 处理格式: { success: true, message: "xxx", data: { content: [...], ... }, meta: {...} }
                setRequests(response.data.data.content);
                setPagination(prev => ({
                    ...prev,
                    total: response.data.data.totalElements || 0
                }));
                console.log("从嵌套结构中加载数据成功:", response.data.data.content.length);
            } else if (response.data && Array.isArray(response.data.content)) {
                // 处理格式: { content: [...], ... }
                setRequests(response.data.content);
                setPagination(prev => ({
                    ...prev,
                    total: response.data.totalElements || 0
                }));
                console.log("从直接结构中加载数据成功:", response.data.content.length);
            } else {
                // 处理响应格式不正确的情况
                console.warn('接口返回格式不正确:', response.data);
                setRequests([]);
                setPagination(prev => ({
                    ...prev,
                    total: 0
                }));
            }
        } catch (error) {
            console.error('获取我的代购需求失败:', error);
            message.error('获取代购需求失败，请稍后重试');
            setRequests([]);
        } finally {
            setLoading(false);
        }
    }, [userId, selectedStatus, pagination.current, pagination.pageSize]);
    /* eslint-disable react-hooks/exhaustive-deps */
    // 无视风险，强制安装

    // 组件挂载后加载数据
    useEffect(() => {
        if (userId) {
            fetchData();
        }
    }, [userId, fetchData]);

    // 处理状态筛选变化
    const handleStatusChange = (value) => {
        setSelectedStatus(value);
        setPagination(prev => ({ ...prev, current: 1 }));
    };

    // 处理分页变化
    const handlePageChange = (page, pageSize) => {
        setPagination(prev => ({
            ...prev,
            current: page,
            pageSize: pageSize
        }));
    };

    // 处理卡片上的操作
    const handleAction = (action, request) => {
        switch (action) {
            case 'cancel':
                confirmCancelRequest(request);
                break;
            case 'confirm':
                confirmReceiveRequest(request);
                break;
            case 'rate':
                navigate(`/request/rate/${request.requestNumber}`);
                break;
            case 'pay':
                handlePayRequest(request);
                break;
            default:
                navigate(`/request/${request.requestNumber}`);
                break;
        }
    };

    // 确认取消需求
    const confirmCancelRequest = (request) => {
        confirm({
            title: '确认取消代购需求',
            icon: <ExclamationCircleOutlined />,
            content: `您确定要取消代购需求"${request.title}"吗？此操作不可恢复。`,
            onOk: async () => {
                try {
                    await axios.put(
                        `http://127.0.0.1:8080/api/purchase-requests/${request.requestNumber}/status`,
                        {},
                        {
                            params: { status: 'CANCELLED' },
                            withCredentials: true
                        }
                    );
                    message.success('代购需求已取消');
                    fetchData(); // 刷新数据
                } catch (error) {
                    console.error('取消代购需求失败:', error);
                    message.error('取消代购需求失败: ' + (error.response?.data || error.message));
                }
            }
        });
    };

    // 确认收货
    const confirmReceiveRequest = (request) => {
        confirm({
            title: '确认收货',
            icon: <ExclamationCircleOutlined />,
            content: '您确认已经收到商品了吗？确认后订单将完成。',
            onOk: async () => {
                try {
                    await axios.put(
                        `http://127.0.0.1:8080/api/purchase-requests/${request.requestNumber}/status`,
                        {},
                        {
                            params: { status: 'COMPLETED' },
                            withCredentials: true
                        }
                    );
                    message.success('确认收货成功');
                    fetchData(); // 刷新数据
                } catch (error) {
                    console.error('确认收货失败:', error);
                    message.error('确认收货失败: ' + (error.response?.data || error.message));
                }
            }
        });
    };

    // 处理支付请求
    const handlePayRequest = (request) => {
        // 这里应该实现跳转到支付页面的逻辑
        message.info('跳转到支付页面...');
        navigate(`/request/pay/${request.requestNumber}`);
    };

    // 渲染状态筛选器
    const renderStatusFilter = () => (
        <div className={styles.filters}>
            <span className={styles.filterLabel}>状态筛选:</span>
            <Select
                value={selectedStatus}
                onChange={handleStatusChange}
                style={{ width: 120 }}
            >
                <Option value="ALL">全部</Option>
                <Option value="PAYMENT_PENDING">待支付</Option>
                <Option value="PENDING">待接单</Option>
                <Option value="ASSIGNED">已接单</Option>
                <Option value="IN_TRANSIT">配送中</Option>
                <Option value="DELIVERED">已送达</Option>
                <Option value="COMPLETED">已完成</Option>
                <Option value="CANCELLED">已取消</Option>
                <Option value="REFUNDING">退款中</Option>
                <Option value="REFUNDED">已退款</Option>
            </Select>
        </div>
    );

    // 渲染空状态
    const renderEmpty = () => (
        <Card className={styles.emptyContainer}>
            <Empty
                description={
                    <span>
                        {selectedStatus === 'ALL'
                            ? '您还没有发布过代购需求'
                            : `没有${getStatusText(selectedStatus)}的代购需求`}
                    </span>
                }
            >
                <Button
                    type="primary"
                    icon={<PlusOutlined />}
                    onClick={() => navigate('/request/create')}
                >
                    发布代购需求
                </Button>
            </Empty>
        </Card>
    );

    // 获取状态对应的文本
    const getStatusText = (status) => {
        const statusMap = {
            'PAYMENT_PENDING': '待支付',
            'PENDING': '待接单',
            'ASSIGNED': '已接单',
            'IN_TRANSIT': '配送中',
            'DELIVERED': '已送达',
            'COMPLETED': '已完成',
            'CANCELLED': '已取消',
            'REFUNDING': '退款中',
            'REFUNDED': '已退款',
            'ALL': '全部'
        };
        return statusMap[status] || status;
    };

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <div className={styles.title}>
                    <UserOutlined className={styles.titleIcon} />
                    <h2>我的代购需求</h2>
                </div>

                <div className={styles.filters}>
                    {renderStatusFilter()}
                    <Button
                        type="primary"
                        icon={<PlusOutlined />}
                        onClick={() => navigate('/request/create')}
                    >
                        发布代购需求
                    </Button>
                </div>
            </div>

            {loading ? (
                <div className={styles.loadingContainer}>
                    <Spin size="large" />
                </div>
            ) : requests.length > 0 ? (
                <div className={styles.listContent}>
                    <Row gutter={[16, 16]}>
                        {requests.map(request => (
                            <Col xs={24} sm={12} md={8} lg={6} key={request.id}>
                                <PurchaseRequestCard
                                    request={request}
                                    onAction={handleAction}
                                    isOwner={true}
                                />
                            </Col>
                        ))}
                    </Row>

                    <div className={styles.pagination}>
                        <Pagination
                            current={pagination.current}
                            pageSize={pagination.pageSize}
                            total={pagination.total}
                            onChange={handlePageChange}
                            showSizeChanger
                            showQuickJumper
                            showTotal={(total) => `共 ${total} 条需求`}
                        />
                    </div>
                </div>
            ) : (
                renderEmpty()
            )}
        </div>
    );
};

export default MyPurchaseRequests;