// src/components/shopping/PurchaseRequestList.js
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
    Row,
    Col,
    Button,
    Input,
    Select,
    Empty,
    Pagination,
    Spin,
    message,
    Modal,
    Form,
    Radio,
    Divider,
    Card
} from 'antd';
import {
    PlusOutlined,
    SearchOutlined,
    FilterOutlined,
    ShoppingOutlined,
    CompassOutlined,
    EnvironmentOutlined
} from '@ant-design/icons';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import Navbar from '../base/Navbar';
import PurchaseRequestCard from './PurchaseRequestCard';
import styles from '../../assets/css/purchaserequest/PurchaseRequestList.module.css';

const { Option } = Select;

/**
 * 代购需求列表组件
 * 支持筛选和搜索功能，默认显示可接单的互助配送需求
 */
const PurchaseRequestList = ({ isAvailableOnly = false }) => {  // 添加这个参数，并设默认值为false
    const navigate = useNavigate();
    const location = useLocation();
    const { isLoggedIn, isMessenger } = useAuth();
    const [form] = Form.useForm();

    // 使用ref跟踪组件挂载状态和请求状态
    const isMounted = useRef(true);
    const isRequesting = useRef(false);
    const abortControllerRef = useRef(null);

    // 列表数据状态
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [pagination, setPagination] = useState({
        current: 1,
        pageSize: 12,
        total: 0
    });

    // 筛选状态
    const [showFilters, setShowFilters] = useState(false);
    const [filters, setFilters] = useState({
        keyword: '',
        status: isMessenger ? 'PENDING' : null,
        deliveryType: null,
        minPrice: null,
        maxPrice: null
    });

    // 确认弹窗状态
    const [actionModal, setActionModal] = useState({
        visible: false,
        action: '',
        request: null,
        loading: false
    });

    // 添加位置和视图模式相关状态
    const [userLocation, setUserLocation] = useState(null);
    const [isRecommendMode, setIsRecommendMode] = useState(false);
    const [isSearchMode, setIsSearchMode] = useState(false);
    const [isLocating, setIsLocating] = useState(false);

    // 组件挂载和卸载处理
    useEffect(() => {
        return () => {
            isMounted.current = false; // 组件卸载时设置为false
            // 取消任何进行中的请求
            if (abortControllerRef.current) {
                abortControllerRef.current.abort();
            }
        };
    }, []);

    // 获取用户位置的函数
    const getUserLocation = () => {
        if (!navigator.geolocation) {
            message.error('您的浏览器不支持位置服务');
            return;
        }

        setIsLocating(true);

        navigator.geolocation.getCurrentPosition(
            (position) => {
                if (isMounted.current) {
                    setUserLocation({
                        latitude: position.coords.latitude,
                        longitude: position.coords.longitude
                    });
                    setIsLocating(false);

                    // 自动切换到推荐模式
                    setIsRecommendMode(true);
                    setIsSearchMode(false);

                    // 重置到第一页
                    setPagination(prev => ({
                        ...prev,
                        current: 1
                    }));
                }
            },
            (error) => {
                if (isMounted.current) {
                    console.error('获取位置失败:', error);
                    message.error('获取位置失败，请检查位置权限设置');
                    setIsLocating(false);
                }
            },
            {
                enableHighAccuracy: true,
                timeout: 5000,
                maximumAge: 0
            }
        );
    };

    // 添加重置到默认视图的函数
    const resetToDefaultView = () => {
        setIsRecommendMode(false);
        setIsSearchMode(false);
        setPagination(prev => ({ ...prev, current: 1 }));
    };

    /* eslint-disable react-hooks/exhaustive-deps */
    // 统一的数据加载函数
// PurchaseRequestList.js 中的 fetchData 函数需要修改
    const fetchData = useCallback(async () => {
        if (isRequesting.current || !isMounted.current) return;

        // 取消之前的请求（如果有）
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }

        // 创建新的AbortController
        abortControllerRef.current = new AbortController();
        isRequesting.current = true;

        // 设置加载状态
        if (isMounted.current) {
            setLoading(true);
        }

        try {
            let url;
            let params = {
                page: pagination.current - 1,
                size: pagination.pageSize
            };

            if (isRecommendMode && userLocation) {
                // 推荐模式 - 使用推荐API
                url = 'http://127.0.0.1:8080/api/purchase-requests/recommended';
                params = {
                    ...params,
                    userLatitude: userLocation.latitude,
                    userLongitude: userLocation.longitude
                };

                if (filters.status) {
                    params.status = filters.status;
                }
            }
            else if (isSearchMode) {
                // 搜索模式 - 使用搜索API
                url = 'http://127.0.0.1:8080/api/purchase-requests/search';
                params = {
                    ...params,
                    keyword: filters.keyword || '',
                    status: filters.status || ''
                };

                if (filters.deliveryType) {
                    params.deliveryType = filters.deliveryType;
                }

                if (filters.minPrice !== null) {
                    params.minPrice = filters.minPrice;
                }

                if (filters.maxPrice !== null) {
                    params.maxPrice = filters.maxPrice;
                }
            }
            else if (isAvailableOnly) {
                // 可接单模式 - 使用available-mutual API
                url = 'http://127.0.0.1:8080/api/purchase-requests/available-mutual';
            }
            else {
                // 默认模式 - 查询所有需求
                url = 'http://127.0.0.1:8080/api/purchase-requests/available-mutual';
            }

            const response = await axios.get(url, {
                params,
                withCredentials: true,
                signal: abortControllerRef.current.signal
            });

            // 只有在组件仍然挂载的情况下更新状态
            if (isMounted.current) {
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
            }
        } catch (error) {
            // 只处理非取消操作导致的错误
            if (!axios.isCancel(error) && isMounted.current) {
                console.error('获取数据失败:', error);
                message.error('获取数据失败，请稍后重试');
                // 出错时清空列表
                setRequests([]);
            }
        } finally {
            // 只有在组件仍然挂载的情况下更新状态
            if (isMounted.current) {
                setLoading(false);
            }
            isRequesting.current = false;
        }
    }, [filters.keyword, filters.status, filters.deliveryType, filters.minPrice, filters.maxPrice,
        isRecommendMode, isSearchMode, pagination.current, pagination.pageSize, userLocation, isAvailableOnly]);

    /* eslint-disable react-hooks/exhaustive-deps */
    // 无视风险，强制安装

    // 添加超时处理
    useEffect(() => {
        // 如果正在加载，设置一个超时定时器
        let timeoutId;
        if (loading) {
            timeoutId = setTimeout(() => {
                if (isMounted.current && loading) {
                    setLoading(false);
                    isRequesting.current = false;
                    message.warning('请求超时，请检查网络连接');
                }
            }, 15000); // 15秒超时
        }

        return () => {
            if (timeoutId) clearTimeout(timeoutId);
        };
    }, [loading]);

    // 主要数据加载效果 - 监听依赖项变化自动加载数据
    useEffect(() => {
        fetchData();
    }, [fetchData]);

    // 处理路由返回时的刷新
    useEffect(() => {
        const shouldRefresh = location.state?.refresh;
        if (shouldRefresh) {
            navigate(location.pathname, { replace: true });
        }
    }, [location, navigate]);

    // 切换推荐模式的处理函数
    const toggleRecommendMode = () => {
        if (!isRecommendMode) {
            if (!userLocation) {
                getUserLocation();
            } else {
                setIsRecommendMode(true);
                setIsSearchMode(false); // 确保不在搜索模式
                setPagination(prev => ({ ...prev, current: 1 }));
            }
        } else {
            resetToDefaultView();
        }
    };

    // 处理搜索
    const handleSearch = (value) => {
        if (value) {
            setFilters(prev => ({ ...prev, keyword: value }));
            setIsSearchMode(true);
            setIsRecommendMode(false); // 确保不在推荐模式
            setPagination(prev => ({ ...prev, current: 1 }));
        } else {
            setFilters(prev => ({ ...prev, keyword: '' }));
            resetToDefaultView();
        }
    };

    // 处理筛选变更
    const handleFilterChange = (values) => {
        setFilters(prev => ({
            ...prev,
            ...values
        }));
        setPagination(prev => ({ ...prev, current: 1 }));
        setShowFilters(false);

        // 如果设置了筛选条件则启用搜索模式
        if (values.status || values.deliveryType || values.minPrice || values.maxPrice) {
            setIsSearchMode(true);
            setIsRecommendMode(false);
        }
    };

    // 处理分页变化
    const handlePageChange = (page, pageSize) => {
        setPagination(prev => ({
            ...prev,
            current: page,
            pageSize: pageSize
        }));
    };

    // 手动刷新数据
    const refreshData = () => {
        fetchData();
    };

    // 处理卡片上的操作
    const handleAction = (action, request) => {
        setActionModal({
            visible: true,
            action,
            request,
            loading: false
        });
    };

    // 执行确认的操作
    const performAction = async () => {
        const { action, request } = actionModal;

        setActionModal(prev => ({ ...prev, loading: true }));

        try {
            switch (action) {
                case 'accept': {
                    // 接单操作
                    await axios.put(
                        `http://127.0.0.1:8080/api/purchase-requests/${request.requestNumber}/status`,
                        {},
                        {
                            params: {
                                status: 'ASSIGNED',
                                assignedUserId: localStorage.getItem('userId')
                            },
                            withCredentials: true
                        }
                    );
                    message.success('接单成功！');
                    break;
                }

                case 'deliver': {
                    // 开始配送
                    await axios.put(
                        `http://127.0.0.1:8080/api/purchase-requests/${request.requestNumber}/status`,
                        {},
                        {
                            params: { status: 'IN_TRANSIT' },
                            withCredentials: true
                        }
                    );
                    message.success('已开始配送');
                    break;
                }

                case 'complete': {
                    // 确认送达
                    await axios.put(
                        `http://127.0.0.1:8080/api/purchase-requests/${request.requestNumber}/status`,
                        {},
                        {
                            params: { status: 'DELIVERED' },
                            withCredentials: true
                        }
                    );
                    message.success('已确认送达');
                    break;
                }

                case 'confirm': {
                    // 确认收货
                    await axios.put(
                        `http://127.0.0.1:8080/api/purchase-requests/${request.requestNumber}/status`,
                        {},
                        {
                            params: { status: 'COMPLETED' },
                            withCredentials: true
                        }
                    );
                    message.success('已确认收货');
                    break;
                }

                case 'cancel': {
                    // 取消需求
                    await axios.put(
                        `http://127.0.0.1:8080/api/purchase-requests/${request.requestNumber}/status`,
                        {},
                        {
                            params: { status: 'CANCELLED' },
                            withCredentials: true
                        }
                    );
                    message.success('需求已取消');
                    break;
                }

                case 'rate': {
                    // 跳转到评价页面
                    navigate(`/shopping/rate/${request.requestNumber}`);
                    setActionModal(prev => ({ ...prev, visible: false }));
                    return; // 不需要刷新列表
                }

                default:
                    break;
            }

            // 操作成功后关闭模态框
            setActionModal(prev => ({ ...prev, visible: false }));
            // 手动触发刷新
            refreshData();

        } catch (error) {
            console.error('操作失败:', error);
            message.error('操作失败: ' + (error.response?.data || error.message));
        } finally {
            setActionModal(prev => ({ ...prev, loading: false }));
        }
    };

    // 渲染操作确认对话框
    const renderActionModal = () => {
        const { action, request, visible, loading } = actionModal;

        if (!request) return null;

        // 根据不同操作显示不同的确认信息
        let title = '';
        let content = '';

        switch (action) {
            case 'accept':
                title = '确认接单';
                content = `您确定要接受代购需求 "${request.title}" 吗？接单后您需要及时完成代购和配送任务。`;
                break;
            case 'deliver':
                title = '开始配送';
                content = '确认您已经购买了商品并开始配送？';
                break;
            case 'complete':
                title = '确认送达';
                content = '确认您已经将商品送达收件人？';
                break;
            case 'confirm':
                title = '确认收货';
                content = '确认您已经收到商品？确认后订单将完成。';
                break;
            case 'cancel':
                title = '取消需求';
                content = '确认取消此代购需求？取消后不可恢复。';
                break;
            default:
                break;
        }

        return (
            <Modal
                title={title}
                open={visible}
                onOk={performAction}
                onCancel={() => setActionModal(prev => ({ ...prev, visible: false }))}
                confirmLoading={loading}
                okText="确认"
                cancelText="取消"
            >
                <p>{content}</p>
            </Modal>
        );
    };

    return (
        <div className={styles.pageContainer}>
            <Navbar />
            <div className={styles.contentWrapper}>
                <div className={styles.container}>
                    <div className={styles.header}>
                        <div className={styles.title}>
                            <ShoppingOutlined className={styles.titleIcon} />
                            <h2>代购需求列表</h2>
                        </div>

                        <div className={styles.toolbar}>
                            <Input.Search
                                placeholder="搜索代购需求..."
                                enterButton={<SearchOutlined />}
                                onSearch={handleSearch}
                                style={{ width: 250 }}
                                allowClear
                            />

                            <Button
                                icon={<FilterOutlined />}
                                onClick={() => setShowFilters(true)}
                            >
                                筛选
                            </Button>

                            {/* 视图模式切换按钮 */}
                            <Button
                                icon={<ShoppingOutlined />}
                                type={!isRecommendMode && !isSearchMode ? "primary" : "default"}
                                onClick={resetToDefaultView}
                            >
                                可接单需求
                            </Button>

                            <Button
                                icon={isRecommendMode ? <EnvironmentOutlined /> : <CompassOutlined />}
                                loading={isLocating}
                                type={isRecommendMode ? "primary" : "default"}
                                onClick={toggleRecommendMode}
                            >
                                {isRecommendMode ? "推荐模式" : "附近需求"}
                            </Button>

                            {isLoggedIn && (
                                <Button
                                    type="primary"
                                    icon={<PlusOutlined />}
                                    onClick={() => navigate('/request/create')}
                                >
                                    发布需求
                                </Button>
                            )}
                        </div>
                    </div>

                    {/* 筛选抽屉 */}
                    <Modal
                        title="筛选代购需求"
                        open={showFilters}
                        onCancel={() => setShowFilters(false)}
                        footer={null}
                        width={500}
                    >
                        <Form
                            form={form}
                            layout="vertical"
                            initialValues={filters}
                            onFinish={handleFilterChange}
                        >
                            <Form.Item name="status" label="需求状态">
                                <Radio.Group>
                                    <Radio.Button value={null}>全部</Radio.Button>
                                    <Radio.Button value="PENDING">待接单</Radio.Button>
                                    <Radio.Button value="ASSIGNED">已接单</Radio.Button>
                                    <Radio.Button value="IN_TRANSIT">配送中</Radio.Button>
                                    <Radio.Button value="DELIVERED">已送达</Radio.Button>
                                    <Radio.Button value="COMPLETED">已完成</Radio.Button>
                                </Radio.Group>
                            </Form.Item>

                            <Form.Item name="deliveryType" label="配送方式">
                                <Select placeholder="选择配送方式" allowClear>
                                    <Option value="MUTUAL">互助配送</Option>
                                    <Option value="EXPRESS">极速配送</Option>
                                </Select>
                            </Form.Item>

                            <Form.Item label="价格区间">
                                <Row gutter={16}>
                                    <Col span={11}>
                                        <Form.Item name="minPrice" noStyle>
                                            <Input
                                                type="number"
                                                addonBefore="¥"
                                                placeholder="最低价"
                                                min={0}
                                            />
                                        </Form.Item>
                                    </Col>
                                    <Col span={2} style={{ textAlign: 'center' }}>-</Col>
                                    <Col span={11}>
                                        <Form.Item name="maxPrice" noStyle>
                                            <Input
                                                type="number"
                                                addonBefore="¥"
                                                placeholder="最高价"
                                                min={0}
                                            />
                                        </Form.Item>
                                    </Col>
                                </Row>
                            </Form.Item>

                            <Divider />

                            <div className={styles.modalFooter}>
                                <Button onClick={() => form.resetFields()}>重置</Button>
                                <Button type="primary" htmlType="submit">
                                    应用筛选
                                </Button>
                            </div>
                        </Form>
                    </Modal>

                    {/* 视图模式提示 */}
                    {!isRecommendMode && !isSearchMode && (
                        <div className={styles.modeTip}>
                            <ShoppingOutlined /> 显示可接单的互助配送需求
                        </div>
                    )}
                    {isRecommendMode && userLocation && (
                        <div className={styles.recommendTip}>
                            <EnvironmentOutlined /> 正在显示您附近的推荐需求
                        </div>
                    )}
                    {isSearchMode && (
                        <div className={styles.searchTip}>
                            <SearchOutlined /> 搜索结果
                        </div>
                    )}

                    {/* 正在加载状态 */}
                    {loading ? (
                        <div className={styles.loadingContainer}>
                            <Spin size="large" />
                        </div>
                    ) : (
                        <>
                            {/* 筛选条件标签展示 - 仅在搜索模式下显示 */}
                            {isSearchMode && (filters.status || filters.deliveryType || filters.minPrice || filters.maxPrice) && (
                                <div className={styles.activeFilters}>
                                    <span>已筛选: </span>
                                    {filters.status && (
                                        <span className={styles.filterTag}>
                                            状态: {filters.status === 'PENDING' ? '待接单' :
                                            filters.status === 'ASSIGNED' ? '已接单' :
                                                filters.status === 'IN_TRANSIT' ? '配送中' :
                                                    filters.status === 'DELIVERED' ? '已送达' :
                                                        filters.status === 'COMPLETED' ? '已完成' : '全部'}
                                        </span>
                                    )}
                                    {filters.deliveryType && (
                                        <span className={styles.filterTag}>
                                            配送方式: {filters.deliveryType === 'MUTUAL' ? '互助配送' : '极速配送'}
                                        </span>
                                    )}
                                    {(filters.minPrice || filters.maxPrice) && (
                                        <span className={styles.filterTag}>
                                            价格: {filters.minPrice || 0} - {filters.maxPrice || '不限'}
                                        </span>
                                    )}
                                </div>
                            )}

                            {/* 列表内容 */}
                            {requests.length > 0 ? (
                                <div className={styles.listContent}>
                                    <Row gutter={[16, 16]}>
                                        {requests.map(request => (
                                            <Col xs={24} sm={12} md={8} lg={6} key={request.id}>
                                                <PurchaseRequestCard
                                                    request={request}
                                                    onAction={handleAction}
                                                    isMessenger={isMessenger}
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
                                <Card className={styles.emptyContainer}>
                                    <Empty
                                        description={
                                            <span>
                                                {isRecommendMode
                                                    ? "附近暂无推荐需求"
                                                    : isSearchMode
                                                        ? filters.keyword
                                                            ? `没有找到与 "${filters.keyword}" 相关的需求`
                                                            : "没有符合筛选条件的需求"
                                                        : "暂无可接单的互助配送需求"
                                                }
                                            </span>
                                        }
                                    >
                                        {isLoggedIn && (
                                            <Button
                                                type="primary"
                                                icon={<PlusOutlined />}
                                                onClick={() => navigate('/request/create')}
                                            >
                                                发布需求
                                            </Button>
                                        )}
                                    </Empty>
                                </Card>
                            )}
                        </>
                    )}

                    {/* 操作确认对话框 */}
                    {renderActionModal()}
                </div>
            </div>
        </div>
    );
};

export default PurchaseRequestList;