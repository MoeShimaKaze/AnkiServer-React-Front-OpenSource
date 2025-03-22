// MyFriends.js
import React, { useState, useEffect, useCallback } from 'react';
import {
    Card, Tabs, Button, Table, Tag, Avatar,
    Space, Empty, Spin, message, Modal
} from 'antd';
import {
    UserOutlined, TeamOutlined, CheckOutlined,
    CloseOutlined, EyeOutlined, BellOutlined
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import FriendLayout from './FriendLayout';
import styles from '../../assets/css/friend/MyFriends.module.css';

const { TabPane } = Tabs;

// 请求状态映射
const REQUEST_STATUS_MAP = {
    PENDING: { label: '待处理', color: 'gold' },
    ACCEPTED: { label: '已接受', color: 'green' },
    REJECTED: { label: '已拒绝', color: 'red' }
};

const MyFriends = () => {
    const navigate = useNavigate();

    // 状态管理
    const [activeTab, setActiveTab] = useState('received');
    const [loading, setLoading] = useState(true);
    const [receivedRequests, setReceivedRequests] = useState([]);
    const [sentRequests, setSentRequests] = useState([]);
    const [matches, setMatches] = useState([]);
    const [contactModalVisible, setContactModalVisible] = useState(false);
    const [currentContact, setCurrentContact] = useState('');
    const [actionLoading, setActionLoading] = useState(false);
    const [confirmModalVisible, setConfirmModalVisible] = useState(false);
    const [currentAction, setCurrentAction] = useState({});

    // 获取请求和匹配数据
    const fetchData = useCallback(async () => {
        setLoading(true);

        try {
            // 获取收到的请求
            const receivedResponse = await fetch(
                'http://127.0.0.1:8080/api/friend/requests/received',
                { credentials: 'include' }
            );

            if (receivedResponse.ok) {
                const receivedData = await receivedResponse.json();
                setReceivedRequests(receivedData);
            }

            // 获取发送的请求
            const sentResponse = await fetch(
                'http://127.0.0.1:8080/api/friend/requests/sent',
                { credentials: 'include' }
            );

            if (sentResponse.ok) {
                const sentData = await sentResponse.json();
                setSentRequests(sentData);
            }

            // 获取匹配的搭子
            const matchesResponse = await fetch(
                'http://127.0.0.1:8080/api/friend/matches',
                { credentials: 'include' }
            );

            if (matchesResponse.ok) {
                const matchesData = await matchesResponse.json();
                setMatches(matchesData);
            }
        } catch (error) {
            console.error('获取数据失败:', error);
            message.error('获取数据失败，请稍后重试');
        } finally {
            setLoading(false);
        }
    }, []);

    // 初始加载数据
    useEffect(() => {
        fetchData();
    }, [fetchData]);

    // 处理标签切换
    const handleTabChange = (key) => {
        setActiveTab(key);
    };

    // 处理查看详情
    const handleViewDetail = (id) => {
        navigate(`/friend/detail/${id}`);
    };

    // 处理接受请求
    const handleAcceptRequest = async (requestId) => {
        setActionLoading(true);

        try {
            const response = await fetch(
                `http://127.0.0.1:8080/api/friend/request/${requestId}/handle`,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    credentials: 'include',
                    body: JSON.stringify({ accept: true })
                }
            );

            if (!response.ok) {
                throw new Error('处理请求失败');
            }

            message.success('已接受搭子请求');
            fetchData(); // 刷新数据
            setConfirmModalVisible(false);
        } catch (error) {
            console.error('接受请求失败:', error);
            message.error('接受请求失败，请稍后重试');
        } finally {
            setActionLoading(false);
        }
    };

    // 处理拒绝请求
    const handleRejectRequest = async (requestId) => {
        setActionLoading(true);

        try {
            const response = await fetch(
                `http://127.0.0.1:8080/api/friend/request/${requestId}/handle`,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    credentials: 'include',
                    body: JSON.stringify({ accept: false })
                }
            );

            if (!response.ok) {
                throw new Error('处理请求失败');
            }

            message.success('已拒绝搭子请求');
            fetchData(); // 刷新数据
            setConfirmModalVisible(false);
        } catch (error) {
            console.error('拒绝请求失败:', error);
            message.error('拒绝请求失败，请稍后重试');
        } finally {
            setActionLoading(false);
        }
    };

    // 处理查看联系方式
    const handleViewContact = async (id) => {
        setActionLoading(true);

        try {
            const response = await fetch(
                `http://127.0.0.1:8080/api/friend/contact/${id}`,
                { credentials: 'include' }
            );

            if (!response.ok) {
                throw new Error('获取联系方式失败');
            }

            const contactInfo = await response.text();
            setCurrentContact(contactInfo);
            setContactModalVisible(true);
        } catch (error) {
            console.error('获取联系方式失败:', error);
            message.error('获取联系方式失败，可能需要先发送请求');
        } finally {
            setActionLoading(false);
        }
    };

    // 显示确认操作模态框
    const showConfirmModal = (action, item) => {
        setCurrentAction({ action, item });
        setConfirmModalVisible(true);
    };

    // 执行确认的操作
    const executeAction = () => {
        const { action, item } = currentAction;

        if (action === 'accept') {
            handleAcceptRequest(item.id);
        } else if (action === 'reject') {
            handleRejectRequest(item.id);
        }
    };

    // 收到的请求表格列配置
    const receivedColumns = [
        {
            title: '用户',
            dataIndex: 'requesterName',
            key: 'requesterName',
            render: (text, record) => (
                <div className={styles.userCell}>
                    <Avatar
                        icon={<UserOutlined />}
                        src={record.requesterAvatar}
                        className={styles.avatar}
                    />
                    <span className={styles.username}>{text}</span>
                </div>
            ),
        },
        {
            title: '匹配度',
            dataIndex: 'matchScore',
            key: 'matchScore',
            render: (score) => score ? `${(score * 100).toFixed(0)}%` : '未计算',
            sorter: (a, b) => (a.matchScore || 0) - (b.matchScore || 0),
        },
        {
            title: '状态',
            dataIndex: 'status',
            key: 'status',
            render: (status) => (
                <Tag color={REQUEST_STATUS_MAP[status]?.color || 'default'}>
                    {REQUEST_STATUS_MAP[status]?.label || status}
                </Tag>
            ),
            filters: Object.entries(REQUEST_STATUS_MAP).map(([key, value]) => ({
                text: value.label,
                value: key,
            })),
            onFilter: (value, record) => record.status === value,
        },
        {
            title: '请求时间',
            dataIndex: 'createdAt',
            key: 'createdAt',
            render: (date) => new Date(date).toLocaleString(),
            sorter: (a, b) => new Date(a.createdAt) - new Date(b.createdAt),
        },
        {
            title: '操作',
            key: 'action',
            render: (_, record) => (
                <Space size="small">
                    <Button
                        type="link"
                        icon={<EyeOutlined />}
                        onClick={() => handleViewDetail(record.requesterId)}
                    >
                        详情
                    </Button>
                    {record.status === 'PENDING' && (
                        <>
                            <Button
                                type="link"
                                icon={<CheckOutlined />}
                                style={{ color: '#52c41a' }}
                                onClick={() => showConfirmModal('accept', record)}
                            >
                                接受
                            </Button>
                            <Button
                                type="link"
                                danger
                                icon={<CloseOutlined />}
                                onClick={() => showConfirmModal('reject', record)}
                            >
                                拒绝
                            </Button>
                        </>
                    )}
                    {record.status === 'ACCEPTED' && (
                        <Button
                            type="link"
                            icon={<EyeOutlined />}
                            onClick={() => handleViewContact(record.requesterId)}
                        >
                            联系方式
                        </Button>
                    )}
                </Space>
            ),
        },
    ];

    // 发送的请求表格列配置
    const sentColumns = [
        {
            title: '用户',
            dataIndex: 'targetName',
            key: 'targetName',
            render: (text, record) => (
                <div className={styles.userCell}>
                    <Avatar
                        icon={<UserOutlined />}
                        src={record.targetAvatar}
                        className={styles.avatar}
                    />
                    <span className={styles.username}>{text}</span>
                </div>
            ),
        },
        {
            title: '匹配度',
            dataIndex: 'matchScore',
            key: 'matchScore',
            render: (score) => score ? `${(score * 100).toFixed(0)}%` : '未计算',
            sorter: (a, b) => (a.matchScore || 0) - (b.matchScore || 0),
        },
        {
            title: '状态',
            dataIndex: 'status',
            key: 'status',
            render: (status) => (
                <Tag color={REQUEST_STATUS_MAP[status]?.color || 'default'}>
                    {REQUEST_STATUS_MAP[status]?.label || status}
                </Tag>
            ),
            filters: Object.entries(REQUEST_STATUS_MAP).map(([key, value]) => ({
                text: value.label,
                value: key,
            })),
            onFilter: (value, record) => record.status === value,
        },
        {
            title: '请求时间',
            dataIndex: 'createdAt',
            key: 'createdAt',
            render: (date) => new Date(date).toLocaleString(),
            sorter: (a, b) => new Date(a.createdAt) - new Date(b.createdAt),
        },
        {
            title: '操作',
            key: 'action',
            render: (_, record) => (
                <Space size="small">
                    <Button
                        type="link"
                        icon={<EyeOutlined />}
                        onClick={() => handleViewDetail(record.targetId)}
                    >
                        详情
                    </Button>
                    {record.status === 'ACCEPTED' && (
                        <Button
                            type="link"
                            icon={<EyeOutlined />}
                            onClick={() => handleViewContact(record.targetId)}
                        >
                            联系方式
                        </Button>
                    )}
                </Space>
            ),
        },
    ];

    // 渲染匹配的搭子卡片
    const renderMatchCard = (match) => {
        return (
            <Card
                key={match.targetId}
                className={styles.matchCard}
                actions={[
                    <Button
                        type="link"
                        icon={<EyeOutlined />}
                        onClick={() => handleViewDetail(match.targetId)}
                    >
                        查看详情
                    </Button>,
                    <Button
                        type="link"
                        icon={<EyeOutlined />}
                        onClick={() => handleViewContact(match.targetId)}
                    >
                        联系方式
                    </Button>
                ]}
            >
                <Card.Meta
                    avatar={
                        <Avatar
                            size={64}
                            icon={<UserOutlined />}
                            src={match.targetAvatar}
                        />
                    }
                    title={
                        <div className={styles.matchTitle}>
                            <span>{match.targetName}</span>
                            <Tag color="green">已匹配</Tag>
                        </div>
                    }
                    description={
                        <div className={styles.matchInfo}>
                            <div className={styles.matchDetail}>
                                <span>{match.university || '未知学校'}</span>
                            </div>
                            <div className={styles.matchScore}>
                                匹配度: {match.matchScore ? `${(match.matchScore * 100).toFixed(0)}%` : '未计算'}
                            </div>
                        </div>
                    }
                />
            </Card>
        );
    };

    // 如果正在加载，显示加载状态
    if (loading) {
        return (
            <FriendLayout background="my-friends">
                <div className={styles.loadingContainer}>
                    <Spin size="large" tip="加载中..." />
                </div>
            </FriendLayout>
        );
    }

    return (
        <FriendLayout background="my-friends">
            <Card className={styles.mainCard}>
                <div className={styles.header}>
                    <h1 className={styles.title}>
                        <TeamOutlined className={styles.titleIcon} />
                        我的搭子
                    </h1>
                    <Button
                        type="primary"
                        onClick={() => navigate('/friend/matches')}
                    >
                        寻找搭子
                    </Button>
                </div>

                <Tabs
                    activeKey={activeTab}
                    onChange={handleTabChange}
                    className={styles.tabs}
                >
                    <TabPane
                        tab={
                            <span>
                                <BellOutlined />
                                收到的请求
                                {receivedRequests.filter(r => r.status === 'PENDING').length > 0 && (
                                    <Tag color="red" className={styles.countTag}>
                                        {receivedRequests.filter(r => r.status === 'PENDING').length}
                                    </Tag>
                                )}
                            </span>
                        }
                        key="received"
                    >
                        <Table
                            dataSource={receivedRequests}
                            columns={receivedColumns}
                            rowKey="id"
                            loading={loading}
                            pagination={{
                                pageSize: 10,
                                showSizeChanger: false
                            }}
                            locale={{
                                emptyText: <Empty description="暂无收到的请求" />
                            }}
                        />
                    </TabPane>

                    <TabPane
                        tab={
                            <span>
                                <BellOutlined />
                                发送的请求
                            </span>
                        }
                        key="sent"
                    >
                        <Table
                            dataSource={sentRequests}
                            columns={sentColumns}
                            rowKey="id"
                            loading={loading}
                            pagination={{
                                pageSize: 10,
                                showSizeChanger: false
                            }}
                            locale={{
                                emptyText: <Empty description="暂无发送的请求" />
                            }}
                        />
                    </TabPane>

                    <TabPane
                        tab={
                            <span>
                                <TeamOutlined />
                                已匹配搭子
                            </span>
                        }
                        key="matches"
                    >
                        {matches.length > 0 ? (
                            <div className={styles.matchesGrid}>
                                {matches.map(renderMatchCard)}
                            </div>
                        ) : (
                            <Empty description="暂无匹配搭子" />
                        )}
                    </TabPane>
                </Tabs>
            </Card>

            {/* 联系方式查看模态框 */}
            <Modal
                title="联系方式"
                visible={contactModalVisible}
                onCancel={() => setContactModalVisible(false)}
                footer={[
                    <Button key="close" onClick={() => setContactModalVisible(false)}>
                        关闭
                    </Button>
                ]}
            >
                <p className={styles.contactInfo}>{currentContact}</p>
            </Modal>

            {/* 确认操作模态框 */}
            <Modal
                title={
                    currentAction.action === 'accept'
                        ? "接受搭子请求"
                        : "拒绝搭子请求"
                }
                visible={confirmModalVisible}
                onOk={executeAction}
                onCancel={() => setConfirmModalVisible(false)}
                confirmLoading={actionLoading}
                okText={currentAction.action === 'accept' ? "接受" : "拒绝"}
                cancelText="取消"
            >
                <p>
                    你确定要
                    {currentAction.action === 'accept' ? "接受" : "拒绝"}
                    来自 <strong>{currentAction.item?.requesterName}</strong> 的搭子请求吗？
                </p>
                {currentAction.action === 'accept' && (
                    <p>接受后，你们将可以看到彼此的联系方式。</p>
                )}
            </Modal>
        </FriendLayout>
    );
};

export default MyFriends;