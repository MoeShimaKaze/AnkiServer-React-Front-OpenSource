// src/components/shopping/PurchaseRequestDetail.js
import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    Card,
    Button,
    Tag,
    Descriptions,
    Spin,
    message,
    Modal,
    Divider,
    Row,
    Col,
    Steps,
    Timeline,
    Avatar,
    Form,
    Input,
    Rate,
    Tooltip
} from 'antd';
import {
    ShoppingOutlined,
    EnvironmentOutlined,
    ClockCircleOutlined,
    UserOutlined,
    DollarOutlined,
    PhoneOutlined,
    ArrowRightOutlined,
    MessageOutlined,
    StarOutlined
} from '@ant-design/icons';
import axios from 'axios';
import moment from 'moment';
import { useAuth } from '../context/AuthContext';
import MapModal from '../utils/amap/MapModal';
import RoutePlanningModal from '../utils/amap/RoutePlanningModal';
import ImageViewer from '../utils/ImageViewer';
import styles from '../../assets/css/purchaserequest/PurchaseRequestDetail.module.css';

const { TextArea } = Input;

// 状态颜色映射
const statusColorMap = {
    PENDING: 'blue',
    ASSIGNED: 'processing',
    IN_TRANSIT: 'cyan',
    DELIVERED: 'volcano',
    COMPLETED: 'success',
    CANCELLED: 'default',
    PAYMENT_PENDING: 'warning',
    PAYMENT_TIMEOUT: 'error',
    REFUNDING: 'purple',
    REFUNDED: 'default'
};

// 状态文本映射
const statusTextMap = {
    PENDING: '待接单',
    ASSIGNED: '已接单',
    IN_TRANSIT: '配送中',
    DELIVERED: '已送达',
    COMPLETED: '已完成',
    CANCELLED: '已取消',
    PAYMENT_PENDING: '等待支付',
    PAYMENT_TIMEOUT: '支付超时',
    REFUNDING: '退款中',
    REFUNDED: '已退款'
};

// 配送方式文本映射
const deliveryTypeMap = {
    MUTUAL: '互助配送',
    EXPRESS: '极速配送'
};

// 状态步骤映射
const statusStepMap = {
    PENDING: 0,
    ASSIGNED: 1,
    IN_TRANSIT: 2,
    DELIVERED: 3,
    COMPLETED: 4
};

/**
 * 代购需求详情组件
 * 展示代购需求的详细信息、状态和操作
 */
const PurchaseRequestDetail = () => {
    const { requestNumber } = useParams();
    const navigate = useNavigate();
    const { userId, isMessenger } = useAuth();

    // 需求数据状态
    const [request, setRequest] = useState(null);
    const [loading, setLoading] = useState(true);
    const [avatars, setAvatars] = useState({});
    const [ratings, setRatings] = useState([]);

    // 评价状态
    const [showRatingForm, setShowRatingForm] = useState(false);
    const [ratingForm] = Form.useForm();
    const [submitRating, setSubmitRating] = useState(false);

    // 地图模态框状态
    const [mapModal, setMapModal] = useState({
        visible: false,
        address: '',
        latitude: 0,
        longitude: 0
    });

    // 路线规划模态框状态
    const [routeModal, setRouteModal] = useState(false);

    // 图片预览状态
    const [imagePreview, setImagePreview] = useState({
        visible: false,
        url: ''
    });

    // 操作确认对话框状态
    const [actionModal, setActionModal] = useState({
        visible: false,
        title: '',
        content: '',
        action: '',
        loading: false
    });

    // 获取需求详情 - 使用useCallback包装
// 修改fetchRequestDetail函数中的数据处理逻辑
    const fetchRequestDetail = useCallback(async () => {
        setLoading(true);

        try {
            // 获取需求详情数据
            const response = await axios.get(
                `http://127.0.0.1:8080/api/purchase-requests/${requestNumber}`,
                { withCredentials: true }
            );

            // 处理可能的数据嵌套
            let requestData;
            if (response.data && response.data.data) {
                // 处理格式: { success: true, message: "xxx", data: {...} }
                requestData = response.data.data;
                console.log("从嵌套结构中加载数据成功", requestData);
            } else {
                // 处理未嵌套格式
                requestData = response.data;
                console.log("从直接结构中加载数据成功", requestData);
            }

            // 确保地址字段存在
            if (requestData) {
                // 日志输出查看地址字段
                console.log("代购地址:", requestData.purchaseAddress);
                console.log("配送地址:", requestData.deliveryAddress);

                // 确保地址字段存在，否则设置默认值
                if (!requestData.purchaseAddress) requestData.purchaseAddress = "暂无地址信息";
                if (!requestData.deliveryAddress) requestData.deliveryAddress = "暂无地址信息";
            }

            setRequest(requestData);
        } catch (error) {
            console.error('获取代购需求详情失败:', error);
            message.error('获取代购需求详情失败，请稍后重试');
        } finally {
            setLoading(false);
        }
    }, [requestNumber]);

    // 获取相关用户头像
    const fetchAvatars = useCallback(async () => {
        if (!request) return;

        try {
            const userIds = [];

            // 收集所有需要获取头像的用户ID
            if (request.userId) userIds.push(request.userId);
            if (request.assignedUserId) userIds.push(request.assignedUserId);

            if (userIds.length === 0) return;

            // 调用头像获取API
            const response = await axios.post(
                'http://127.0.0.1:8080/api/users/avatars',
                userIds,
                { withCredentials: true }
            );

            setAvatars(response.data);
        } catch (error) {
            console.error('获取用户头像失败:', error);
        }
    }, [request]);

    // 获取评价数据
    const fetchRatings = useCallback(async () => {
        if (!requestNumber) return;

        try {
            const response = await axios.get(
                `http://127.0.0.1:8080/api/ratings/${requestNumber}`,
                {
                    params: { orderType: 'PURCHASE_REQUEST' },
                    withCredentials: true
                }
            );

            // 改进的响应数据处理逻辑
            let ratingsData;

            // 情况1: 直接返回数组
            if (Array.isArray(response.data)) {
                ratingsData = response.data;
            }
            // 情况2: 嵌套在data属性中
            else if (response.data && Array.isArray(response.data.data)) {
                ratingsData = response.data.data;
            }
            // 情况3: 嵌套在深层结构中
            else if (response.data && response.data.data && Array.isArray(response.data.data.content)) {
                ratingsData = response.data.data.content;
            }
            // 情况4: 未知结构，返回空数组
            else {
                ratingsData = [];
                console.warn('未能识别的评价数据结构:', response.data);
            }

            setRatings(ratingsData);

            // 打印日志以便调试
            console.log(`成功获取${ratingsData.length}条评价数据`);
        } catch (error) {
            console.error('获取评价失败:', error);
            // 错误情况下设置为空数组
            setRatings([]);
        }
    }, [requestNumber]);

    // 加载需求数据
    useEffect(() => {
        fetchRequestDetail();

        // 增加浏览量
        if (requestNumber) {
            axios.put(
                `http://127.0.0.1:8080/api/purchase-requests/${requestNumber}/view`,
                {},
                { withCredentials: true }
            ).catch(error => {
                console.error('增加浏览量失败:', error);
            });
        }
    }, [fetchRequestDetail, requestNumber]);

    // 当请求数据更新后，获取相关用户头像和评价
    useEffect(() => {
        if (request) {
            fetchAvatars();
            fetchRatings();
        }
    }, [request, fetchAvatars, fetchRatings]);

    // 打开地图模态框
    const openMapModal = (type) => {
        if (!request) return;

        if (type === 'purchase') {
            setMapModal({
                visible: true,
                address: request.purchaseAddress,
                latitude: request.purchaseLatitude,
                longitude: request.purchaseLongitude
            });
        } else {
            setMapModal({
                visible: true,
                address: request.deliveryAddress,
                latitude: request.deliveryLatitude,
                longitude: request.deliveryLongitude
            });
        }
    };

    // 打开路线规划模态框
    const openRouteModal = () => {
        if (!request || !request.purchaseLatitude || !request.deliveryLatitude) return;

        setRouteModal(true);
    };

    // 打开图片预览
    const openImagePreview = () => {
        if (!request || !request.imageUrl) return;

        setImagePreview({
            visible: true,
            url: request.imageUrl
        });
    };

    // 处理操作按钮点击
    const handleAction = (action) => {
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
            case 'refund':
                title = '申请退款';
                content = '确认申请退款？申请后将进入退款流程。';
                break;
            default:
                return;
        }

        setActionModal({
            visible: true,
            title,
            content,
            action,
            loading: false
        });
    };

    // 执行操作
    const performAction = async () => {
        const { action } = actionModal;

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
                                assignedUserId: userId
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

                case 'refund': {
                    // 申请退款
                    await axios.post(
                        `http://127.0.0.1:8080/api/purchase-requests/${request.requestNumber}/refund`,
                        { reason: '用户申请退款' },
                        { withCredentials: true }
                    );
                    message.success('退款申请已提交');
                    break;
                }

                default:
                    break;
            }

            // 重新加载详情
            fetchRequestDetail();
            setActionModal(prev => ({ ...prev, visible: false }));

        } catch (error) {
            console.error('操作失败:', error);
            message.error('操作失败: ' + (error.response?.data?.message || error.message));
        } finally {
            setActionModal(prev => ({ ...prev, loading: false }));
        }
    };

    // 提交评价
    const submitRatingForm = async (values) => {
        setSubmitRating(true);

        try {
            // 判断评价类型
            let ratingType = 'REQUESTER_TO_FULFILLER';

            // 如果当前用户是配送员，则评价类型为配送员评价需求方
            if (isMessenger || (request.assignedUserId === parseInt(userId))) {
                ratingType = 'FULFILLER_TO_REQUESTER';
            }

            // 创建评价
            await axios.post(
                `http://127.0.0.1:8080/api/purchase-requests/${request.requestNumber}/rate`,
                {
                    score: values.rating,
                    comment: values.comment,
                    ratingType: ratingType,
                    orderType: 'PURCHASE_REQUEST'
                },
                { withCredentials: true }
            );

            message.success('评价提交成功');
            setShowRatingForm(false);
            ratingForm.resetFields();

            // 重新加载评价
            fetchRatings();

        } catch (error) {
            console.error('提交评价失败:', error);
            message.error('提交评价失败: ' + (error.response?.data?.message || error.message));
        } finally {
            setSubmitRating(false);
        }
    };

    // 安全地获取数值并调用toFixed - 添加这个新的辅助函数
    const safeToFixed = (value, digits = 2) => {
        if (value === undefined || value === null) return '0.00';
        const num = parseFloat(value);
        return isNaN(num) ? '0.00' : num.toFixed(digits);
    };

    // 安全地计算总金额
    const calculateTotalAmount = () => {
        if (!request) return '0.00';

        if (request.totalAmount) {
            return safeToFixed(request.totalAmount);
        }

        const expectedPrice = parseFloat(request.expectedPrice) || 0;
        const deliveryFee = parseFloat(request.deliveryFee) || 0;
        const serviceFee = parseFloat(request.serviceFee) || 0;

        return (expectedPrice + deliveryFee + serviceFee).toFixed(2);
    };

    // 渲染操作按钮
    const renderActionButtons = () => {
        if (!request) return null;

        const buttons = [];

        // 首先添加通用按钮
        buttons.push(
            <Button
                key="back"
                onClick={() => navigate(-1)}
                className={styles.actionButton}
            >
                返回
            </Button>
        );

        // 如果有配送员和代购地址，显示路线规划
        if (request.purchaseLatitude && request.deliveryLatitude &&
            (isMessenger || request.assignedUserId === parseInt(userId))) {
            buttons.push(
                <Button
                    key="route"
                    onClick={openRouteModal}
                    className={styles.actionButton}
                >
                    路线规划
                </Button>
            );
        }

        // 根据用户角色和订单状态显示不同操作按钮
        if (isMessenger || request.assignedUserId === parseInt(userId)) {
            // 配送员视角
            if (request.status === 'PENDING') {
                buttons.push(
                    <Button
                        key="accept"
                        type="primary"
                        onClick={() => handleAction('accept')}
                        className={styles.actionButton}
                    >
                        接单
                    </Button>
                );
            } else if (request.status === 'ASSIGNED' && request.assignedUserId === parseInt(userId)) {
                buttons.push(
                    <Button
                        key="deliver"
                        type="primary"
                        onClick={() => handleAction('deliver')}
                        className={styles.actionButton}
                    >
                        开始配送
                    </Button>
                );
            } else if (request.status === 'IN_TRANSIT' && request.assignedUserId === parseInt(userId)) {
                buttons.push(
                    <Button
                        key="complete"
                        type="primary"
                        onClick={() => handleAction('complete')}
                        className={styles.actionButton}
                    >
                        确认送达
                    </Button>
                );
            } else if (request.status === 'COMPLETED' && !ratings.some(r =>
                r.ratingType === 'FULFILLER_TO_REQUESTER' && r.raterUserId === parseInt(userId))) {
                buttons.push(
                    <Button
                        key="rate"
                        onClick={() => setShowRatingForm(true)}
                        className={styles.actionButton}
                    >
                        评价用户
                    </Button>
                );
            }
        } else if (request.userId === parseInt(userId)) {
            // 需求方视角
            if (request.status === 'PENDING') {
                buttons.push(
                    <Button
                        key="cancel"
                        danger
                        onClick={() => handleAction('cancel')}
                        className={styles.actionButton}
                    >
                        取消需求
                    </Button>
                );
            } else if (request.status === 'DELIVERED') {
                buttons.push(
                    <Button
                        key="confirm"
                        type="primary"
                        onClick={() => handleAction('confirm')}
                        className={styles.actionButton}
                    >
                        确认收货
                    </Button>
                );
            } else if (request.status === 'COMPLETED' && !ratings.some(r =>
                r.ratingType === 'REQUESTER_TO_FULFILLER' && r.raterUserId === parseInt(userId))) {
                buttons.push(
                    <Button
                        key="rate"
                        onClick={() => setShowRatingForm(true)}
                        className={styles.actionButton}
                    >
                        评价服务
                    </Button>
                );
            }

            // 如果满足退款条件，显示退款按钮
            if (request.canRefund) {
                buttons.push(
                    <Button
                        key="refund"
                        danger
                        onClick={() => handleAction('refund')}
                        className={styles.actionButton}
                    >
                        申请退款
                    </Button>
                );
            }
        }

        return buttons;
    };

    // 渲染时间线信息
    const renderTimeline = () => {
        if (!request) return null;

        const events = [];

        // 添加创建时间
        events.push({
            time: request.createdAt,
            status: '订单创建',
            description: '代购需求已创建'
        });

        // 添加支付时间
        if (request.paymentTime) {
            events.push({
                time: request.paymentTime,
                status: '支付完成',
                description: '订单支付已完成，等待配送员接单'
            });
        }

        // 添加接单时间
        if (request.status !== 'PENDING' && request.status !== 'PAYMENT_PENDING' && request.updatedAt) {
            events.push({
                time: request.updatedAt,
                status: '已接单',
                description: `配送员 ${request.assignedUserName || '未知'} 已接单`
            });
        }

        // 添加配送时间
        if (request.status === 'IN_TRANSIT' || request.status === 'DELIVERED' ||
            request.status === 'COMPLETED') {
            events.push({
                time: request.updatedAt,
                status: '开始配送',
                description: '配送员已购买商品并开始配送'
            });
        }

        // 添加送达时间
        if (request.deliveredDate) {
            events.push({
                time: request.deliveredDate,
                status: '已送达',
                description: '商品已送达，等待确认收货'
            });
        }

        // 添加完成时间
        if (request.completionDate) {
            events.push({
                time: request.completionDate,
                status: '订单完成',
                description: '订单已完成'
            });
        }

        // 添加取消信息
        if (request.status === 'CANCELLED') {
            events.push({
                time: request.updatedAt,
                status: '订单取消',
                description: '订单已取消'
            });
        }

        // 添加退款信息
        if (request.status === 'REFUNDING' || request.status === 'REFUNDED') {
            events.push({
                time: request.updatedAt,
                status: request.status === 'REFUNDING' ? '退款申请' : '退款完成',
                description: request.status === 'REFUNDING' ?
                    '退款申请已提交，等待处理' :
                    `退款已完成，退款金额: ¥${request.refundAmount ? safeToFixed(request.refundAmount) : '0.00'}`
            });
        }

        // 按时间排序
        events.sort((a, b) => moment(a.time).diff(moment(b.time)));

        return (
            <Timeline mode="left">
                {events.map((event, index) => (
                    <Timeline.Item key={index} color={index === events.length - 1 ? 'green' : 'blue'}>
                        <div className={styles.timelineItem}>
                            <div className={styles.timelineTime}>
                                {moment(event.time).format('YYYY-MM-DD HH:mm:ss')}
                            </div>
                            <div className={styles.timelineStatus}>{event.status}</div>
                            <div className={styles.timelineDesc}>{event.description}</div>
                        </div>
                    </Timeline.Item>
                ))}
            </Timeline>
        );
    };

    // 渲染评价信息
    const renderRatings = () => {
        if (!ratings || ratings.length === 0) {
            return (
                <div className={styles.noRating}>
                    <div className={styles.noRatingIcon}><StarOutlined /></div>
                    <div className={styles.noRatingText}>暂无评价</div>
                </div>
            );
        }

        return (
            <div className={styles.ratingsContainer}>
                {ratings.map((rating, index) => (
                    <Card
                        key={index}
                        size="small"
                        className={styles.ratingCard}
                        bordered={false}
                    >
                        <div className={styles.ratingHeader}>
                            <Avatar
                                src={avatars[rating.raterUserId]}
                                icon={<UserOutlined />}
                                size="small"
                            />
                            <span className={styles.ratingAuthor}>
                                {rating.ratingType === 'REQUESTER_TO_FULFILLER' ?
                                    '需求方评价' : '配送员评价'}
                            </span>
                            <Tooltip title={moment(rating.createTime).format('YYYY-MM-DD HH:mm:ss')}>
                                <span className={styles.ratingTime}>
                                    {moment(rating.createTime).fromNow()}
                                </span>
                            </Tooltip>
                        </div>
                        <div className={styles.ratingContent}>
                            <Rate disabled defaultValue={rating.score} />
                            <p className={styles.ratingComment}>{rating.comment}</p>
                        </div>
                    </Card>
                ))}
            </div>
        );
    };

    // 渲染评价表单
    const renderRatingForm = () => {
        return (
            <Modal
                title="评价"
                open={showRatingForm}
                onCancel={() => setShowRatingForm(false)}
                footer={null}
            >
                <Form
                    form={ratingForm}
                    layout="vertical"
                    onFinish={submitRatingForm}
                    initialValues={{ rating: 5 }}
                >
                    <Form.Item
                        name="rating"
                        label="评分"
                        rules={[{ required: true, message: '请选择评分' }]}
                    >
                        <Rate />
                    </Form.Item>

                    <Form.Item
                        name="comment"
                        label="评价内容"
                        rules={[{ required: true, message: '请输入评价内容' }]}
                    >
                        <TextArea
                            rows={4}
                            placeholder="请输入您的评价"
                            maxLength={200}
                            showCount
                        />
                    </Form.Item>

                    <div className={styles.formFooter}>
                        <Button onClick={() => setShowRatingForm(false)}>取消</Button>
                        <Button type="primary" htmlType="submit" loading={submitRating}>
                            提交评价
                        </Button>
                    </div>
                </Form>
            </Modal>
        );
    };

    return (
        <div className={styles.container}>
            {loading ? (
                <div className={styles.loadingContainer}>
                    <Spin size="large" />
                </div>
            ) : (
                !request ? (
                    <div className={styles.errorContainer}>
                        <h2>找不到该代购需求</h2>
                        <Button type="primary" onClick={() => navigate('/request')}>
                            返回列表
                        </Button>
                    </div>
                ) : (
                    <Card className={styles.detailCard}>
                        <div className={styles.header}>
                            <div className={styles.title}>
                                <h2>{request.title}</h2>
                                <Tag color={statusColorMap[request.status]} className={styles.statusTag}>
                                    {statusTextMap[request.status]}
                                </Tag>
                            </div>

                            <div className={styles.orderId}>
                                订单编号: {request.requestNumber}
                            </div>
                        </div>

                        <div className={styles.content}>
                            <Row gutter={[24, 24]}>
                                {/* 左侧信息区域 */}
                                <Col xs={24} md={16}>
                                    {/* 进度条 */}
                                    {!['CANCELLED', 'PAYMENT_PENDING', 'PAYMENT_TIMEOUT', 'REFUNDING', 'REFUNDED'].includes(request.status) && (
                                        <div className={styles.progressSection}>
                                            <Steps
                                                current={statusStepMap[request.status] || 0}
                                                items={[
                                                    { title: '待接单', description: '等待配送员接单' },
                                                    { title: '已接单', description: '配送员已接单' },
                                                    { title: '配送中', description: '商品配送中' },
                                                    { title: '已送达', description: '等待确认收货' },
                                                    { title: '已完成', description: '订单已完成' },
                                                ]}
                                            />
                                        </div>
                                    )}

                                    {/* 商品信息 */}
                                    <div className={styles.section}>
                                        <h3 className={styles.sectionTitle}>
                                            <ShoppingOutlined className={styles.sectionIcon} />
                                            商品信息
                                        </h3>

                                        <div className={styles.productInfo}>
                                            <div className={styles.productImageSection}>
                                                <img
                                                    src={request.imageUrl}
                                                    alt={request.title}
                                                    className={styles.productImage}
                                                    onClick={openImagePreview}
                                                />
                                            </div>

                                            <div className={styles.productDetails}>
                                                <Descriptions column={1} bordered>
                                                    <Descriptions.Item label="商品分类">
                                                        {request.category}
                                                    </Descriptions.Item>
                                                    <Descriptions.Item label="预期价格">
                                                        <span className={styles.price}>
                                                            ¥{safeToFixed(request.expectedPrice)}
                                                        </span>
                                                    </Descriptions.Item>
                                                    <Descriptions.Item label="商品描述">
                                                        {request.description}
                                                    </Descriptions.Item>
                                                    <Descriptions.Item label="浏览量">
                                                        {request.viewCount || 0} 次
                                                    </Descriptions.Item>
                                                </Descriptions>
                                            </div>
                                        </div>
                                    </div>

                                    {/* 配送信息部分 */}
                                    <div className={styles.section}>
                                        <h3 className={styles.sectionTitle}>
                                            <EnvironmentOutlined className={styles.sectionIcon} />
                                            配送信息
                                        </h3>

                                    <Descriptions bordered>
                                        <Descriptions.Item label="配送方式" span={3}>
                                        {deliveryTypeMap[request.deliveryType] || request.deliveryType || '未指定'}
                                        </Descriptions.Item>
                                            <Descriptions.Item label="代购地址" span={3}>
                                                <div className={styles.addressItem}>
                                                <span className={styles.addressText}>
                                                    {request.purchaseAddress || '暂无代购地址信息'}
                                                </span>
                                                    {request.purchaseLatitude && request.purchaseLongitude && (
                                            <Button
                                                type="link"
                                                onClick={() => openMapModal('purchase')}
                                                className={styles.mapButton}
                                                        >
                                                    查看地图
                                            </Button>
                                                    )}
                                        </div>
                                    </Descriptions.Item>
                                    <Descriptions.Item label="配送地址" span={3}>
                                    <div className={styles.addressItem}>
                                        <span className={styles.addressText}>
                                            {request.deliveryAddress || '暂无配送地址信息'}
                                        </span>
                                        {request.deliveryLatitude && request.deliveryLongitude && (
                                            <Button
                                                type="link"
                                                onClick={() => openMapModal('delivery')}
                                                className={styles.mapButton}
                                            >
                                                查看地图
                                            </Button>
                                                    )}
                                        </div>
                                            </Descriptions.Item>
                                            <Descriptions.Item label="收件人" span={2}>
                                                {request.recipientName || '未指定'}
                                            </Descriptions.Item>
                                            <Descriptions.Item label="联系电话">
                                                {request.recipientPhone || '未提供'}
                                            </Descriptions.Item>
                                        </Descriptions>
                                    </div>

                                    {/* 费用信息 */}
                                    <div className={styles.section}>
                                        <h3 className={styles.sectionTitle}>
                                            <DollarOutlined className={styles.sectionIcon} />
                                            费用信息
                                        </h3>

                                        <Descriptions bordered>
                                            <Descriptions.Item label="商品价格">
                                                ¥{safeToFixed(request.expectedPrice)}
                                            </Descriptions.Item>
                                            <Descriptions.Item label="配送费">
                                                ¥{request.deliveryFee ? safeToFixed(request.deliveryFee) : '0.00'}
                                            </Descriptions.Item>
                                            <Descriptions.Item label="服务费">
                                                ¥{request.serviceFee ? safeToFixed(request.serviceFee) : '0.00'}
                                            </Descriptions.Item>
                                            <Descriptions.Item label="总计" span={3}>
                                                <span className={styles.totalPrice}>
                                                    ¥{calculateTotalAmount()}
                                                </span>
                                            </Descriptions.Item>
                                        </Descriptions>
                                    </div>

                                    {/* 时间信息 */}
                                    <div className={styles.section}>
                                        <h3 className={styles.sectionTitle}>
                                            <ClockCircleOutlined className={styles.sectionIcon} />
                                            时间信息
                                        </h3>

                                        <Descriptions bordered>
                                            <Descriptions.Item label="创建时间">
                                                {moment(request.createdAt).format('YYYY-MM-DD HH:mm:ss')}
                                            </Descriptions.Item>
                                            <Descriptions.Item label="截止时间">
                                                {moment(request.deadline).format('YYYY-MM-DD HH:mm:ss')}
                                            </Descriptions.Item>
                                            {request.paymentTime && (
                                                <Descriptions.Item label="支付时间">
                                                    {moment(request.paymentTime).format('YYYY-MM-DD HH:mm:ss')}
                                                </Descriptions.Item>
                                            )}
                                            {request.deliveredDate && (
                                                <Descriptions.Item label="送达时间">
                                                    {moment(request.deliveredDate).format('YYYY-MM-DD HH:mm:ss')}
                                                </Descriptions.Item>
                                            )}
                                            {request.completionDate && (
                                                <Descriptions.Item label="完成时间">
                                                    {moment(request.completionDate).format('YYYY-MM-DD HH:mm:ss')}
                                                </Descriptions.Item>
                                            )}
                                        </Descriptions>
                                    </div>
                                </Col>

                                {/* 右侧侧边栏 */}
                                <Col xs={24} md={8}>
                                    {/* 用户信息 */}
                                    <Card className={styles.sideCard}>
                                        <h3 className={styles.sideCardTitle}>
                                            <UserOutlined className={styles.sideCardIcon} />
                                            用户信息
                                        </h3>

                                        <div className={styles.userInfo}>
                                            <div className={styles.userItem}>
                                                <Avatar
                                                    size={64}
                                                    src={avatars[request.userId]}
                                                    icon={<UserOutlined />}
                                                />
                                                <div className={styles.userMeta}>
                                                    <div className={styles.userName}>
                                                        {request.username || '未知用户'}
                                                    </div>
                                                    <div className={styles.userRole}>需求发布者</div>
                                                </div>
                                            </div>

                                            {request.assignedUserId && (
                                                <>
                                                    <div className={styles.userDivider}>
                                                        <ArrowRightOutlined />
                                                    </div>

                                                    <div className={styles.userItem}>
                                                        <Avatar
                                                            size={64}
                                                            src={avatars[request.assignedUserId]}
                                                            icon={<UserOutlined />}
                                                        />
                                                        <div className={styles.userMeta}>
                                                            <div className={styles.userName}>
                                                                {request.assignedUserName || '未知配送员'}
                                                            </div>
                                                            <div className={styles.userRole}>配送员</div>
                                                        </div>
                                                    </div>
                                                </>
                                            )}
                                        </div>

                                        {request.assignedUserId && (
                                            <div className={styles.contactInfo}>
                                                <div className={styles.contactTitle}>
                                                    <PhoneOutlined /> 联系方式
                                                </div>
                                                <Button
                                                    icon={<MessageOutlined />}
                                                    block
                                                    onClick={() => navigate(`/message/${request.assignedUserId}`)}
                                                >
                                                    发送消息
                                                </Button>
                                            </div>
                                        )}
                                    </Card>

                                    {/* 订单状态时间线 */}
                                    <Card className={styles.sideCard}>
                                        <h3 className={styles.sideCardTitle}>
                                            <ClockCircleOutlined className={styles.sideCardIcon} />
                                            订单状态
                                        </h3>

                                        <div className={styles.timelineContainer}>
                                            {renderTimeline()}
                                        </div>
                                    </Card>

                                    {/* 评价信息 */}
                                    <Card className={styles.sideCard}>
                                        <h3 className={styles.sideCardTitle}>
                                            <StarOutlined className={styles.sideCardIcon} />
                                            评价信息
                                        </h3>

                                        {renderRatings()}
                                    </Card>
                                </Col>
                            </Row>
                        </div>

                        <Divider />

                        {/* 底部操作区 */}
                        <div className={styles.footer}>
                            <div className={styles.actionButtons}>
                                {renderActionButtons()}
                            </div>
                        </div>
                    </Card>
                )
            )}

            {/* 地图模态框 */}
            <MapModal
                isOpen={mapModal.visible}
                onClose={() => setMapModal(prev => ({ ...prev, visible: false }))}
                address={mapModal.address}
                latitude={mapModal.latitude}
                longitude={mapModal.longitude}
            />

            {/* 路线规划模态框 */}
            <RoutePlanningModal
                isOpen={routeModal}
                onClose={() => setRouteModal(false)}
                pickupLocation={{
                    latitude: request?.purchaseLatitude,
                    longitude: request?.purchaseLongitude
                }}
                deliveryLocation={{
                    latitude: request?.deliveryLatitude,
                    longitude: request?.deliveryLongitude
                }}
            />

            {/* 图片预览 */}
            {imagePreview.visible && (
                <ImageViewer
                    imageUrl={imagePreview.url}
                    onClose={() => setImagePreview({ visible: false, url: '' })}
                    alt={request?.title}
                />
            )}

            {/* 操作确认对话框 */}
            <Modal
                title={actionModal.title}
                open={actionModal.visible}
                onOk={performAction}
                onCancel={() => setActionModal(prev => ({ ...prev, visible: false }))}
                confirmLoading={actionModal.loading}
                okText="确认"
                cancelText="取消"
            >
                <p>{actionModal.content}</p>
            </Modal>

            {/* 评价表单对话框 */}
            {renderRatingForm()}
        </div>
    );
};

export default PurchaseRequestDetail;