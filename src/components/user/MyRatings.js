// MyRatings.js
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
    Rate,
    Pagination,
    Spin,
    Empty,
    Tabs,
    Input,
    Button,
    Avatar,
    notification
} from 'antd';
import {
    UserOutlined,
    CalendarOutlined,
    SearchOutlined,
    ArrowLeftOutlined
} from '@ant-design/icons';
import Navbar from '../base/Navbar';
import styles from '../../assets/css/user/UserRatings.module.css';

const { TabPane } = Tabs;
const { Search } = Input;

const MyRatings = () => {
    const { userId } = useAuth();
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState('sent');
    const [sentRatings, setSentRatings] = useState([]);
    const [receivedRatings, setReceivedRatings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchLoading, setSearchLoading] = useState(false);
    const [error, setError] = useState(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    const [total, setTotal] = useState(0);
    const [searchUsername, setSearchUsername] = useState('');

    useEffect(() => {
        if (!userId) {
            navigate('/login');
            return;
        }

        fetchRatings();
    }, [userId, activeTab, currentPage, pageSize]);

    const fetchRatings = async () => {
        setLoading(true);
        setError(null);

        try {
            const endpoint = activeTab === 'sent'
                ? `/api/ratings/from/${userId}`
                : `/api/ratings/user/${userId}`;

            const response = await axios.get(`http://127.0.0.1:8080${endpoint}`, {
                params: {
                    page: currentPage - 1,
                    size: pageSize
                },
                withCredentials: true
            });

            if (activeTab === 'sent') {
                setSentRatings(response.data.content || []);
            } else {
                setReceivedRatings(response.data.content || []);
            }

            setTotal(response.data.totalElements || 0);
        } catch (error) {
            console.error(`获取${activeTab === 'sent' ? '发出' : '收到'}的评价失败:`, error);
            setError(`获取${activeTab === 'sent' ? '发出' : '收到'}的评价失败: ${error.response?.data || error.message}`);
        } finally {
            setLoading(false);
        }
    };

    const handleTabChange = (key) => {
        setActiveTab(key);
        setCurrentPage(1);
    };

    const handlePageChange = (page, size) => {
        setCurrentPage(page);
        setPageSize(size);
    };

    const findUserByUsername = async (username) => {
        if (!username) {
            notification.error({
                message: '请输入用户名',
                description: '请输入要查看评价的用户名'
            });
            return null;
        }

        setSearchLoading(true);
        try {
            const response = await axios.get('http://127.0.0.1:8080/api/users/find-by-username', {
                params: { username },
                withCredentials: true
            });

            return response.data;
        } catch (error) {
            if (error.response && error.response.status === 404) {
                notification.error({
                    message: '用户不存在',
                    description: `未找到用户名为"${username}"的用户`
                });
            } else {
                notification.error({
                    message: '查询失败',
                    description: error.response?.data || '查询用户信息失败，请稍后再试'
                });
            }
            return null;
        } finally {
            setSearchLoading(false);
        }
    };

    const handleViewUserRatings = async () => {
        if (!searchUsername.trim()) {
            notification.error({
                message: '请输入用户名',
                description: '请输入要查看评价的用户名'
            });
            return;
        }

        const user = await findUserByUsername(searchUsername.trim());
        if (user && user.id) {
            navigate(`/ratings/user/${user.id}`);
        }
    };

    const handleUserClick = (userId) => {
        if (userId) {
            navigate(`/ratings/user/${userId}`);
        }
    };

    const formatDate = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('zh-CN', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const handleGoBack = () => {
        navigate('/profile');
    };

    const renderRatings = () => {
        const ratings = activeTab === 'sent' ? sentRatings : receivedRatings;

        if (loading) {
            return (
                <div className={styles.loadingContainer}>
                    <Spin size="large" />
                </div>
            );
        }

        if (error) {
            return (
                <div className={styles.errorContainer}>
                    <p>{error}</p>
                </div>
            );
        }

        if (!ratings || ratings.length === 0) {
            return (
                <div className={styles.emptyState}>
                    <Empty
                        description={`暂无${activeTab === 'sent' ? '发出' : '收到'}的评价`}
                    />
                </div>
            );
        }

        return (
            <div>
                {ratings.map((rating) => (
                    <div key={rating.id} className={styles.ratingCard}>
                        <div className={styles.ratingHeader}>
                            <div className={styles.userInfo}>
                                <Avatar
                                    icon={<UserOutlined />}
                                    src={activeTab === 'sent' ? rating.ratedUserName ? '/avatar.png' : '/system.png' : '/avatar.png'}
                                    alt="用户头像"
                                    className={styles.userAvatar}
                                    onClick={() => {
                                        const targetId = activeTab === 'sent' ? rating.ratedUserId : rating.raterId;
                                        if (targetId) handleUserClick(targetId);
                                    }}
                                />
                                <div>
                                    <div
                                        className={styles.userName}
                                        onClick={() => {
                                            const targetId = activeTab === 'sent' ? rating.ratedUserId : rating.raterId;
                                            if (targetId) handleUserClick(targetId);
                                        }}
                                    >
                                        {activeTab === 'sent'
                                            ? (rating.ratedUserName || '平台')
                                            : rating.raterName}
                                    </div>
                                    <div className={styles.ratingDate}>
                                        <CalendarOutlined /> {formatDate(rating.ratingDate)}
                                    </div>
                                </div>
                            </div>
                            <div className={styles.ratingScore}>
                                <Rate disabled defaultValue={rating.score} />
                            </div>
                        </div>
                        <div className={styles.ratingContent}>
                            <div className={styles.ratingComment}>
                                {rating.comment || '未留下评论'}
                            </div>
                            <div className={styles.ratingMeta}>
                <span className={styles.ratingType}>
                  {rating.ratingTypeDescription}
                </span>
                                <span className={styles.orderType}>
                  {rating.orderTypeDescription}
                </span>
                            </div>
                            <div className={styles.orderNumber}>
                                订单号: {rating.orderNumber}
                            </div>
                        </div>
                    </div>
                ))}
                <div className={styles.paginationContainer}>
                    <Pagination
                        current={currentPage}
                        pageSize={pageSize}
                        total={total}
                        onChange={handlePageChange}
                        showSizeChanger
                        showQuickJumper
                        showTotal={(total) => `共 ${total} 条评价`}
                    />
                </div>
            </div>
        );
    };

    return (
        <div className={styles.pageContainer}>
            <Navbar />
            <div className={styles.profileBackground}></div>
            <div className={styles.ratingsContainer}>
                <div className={styles.ratingsHeader}>
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                        <div className={styles.returnButton} onClick={handleGoBack}>
                            <ArrowLeftOutlined style={{ marginRight: 8 }} />
                            返回
                        </div>
                        <h2 className={styles.ratingsTitle}>我的评价记录</h2>
                    </div>
                </div>

                <div className={styles.searchContainer}>
                    <Search
                        placeholder="输入用户名查看评价"
                        value={searchUsername}
                        onChange={(e) => setSearchUsername(e.target.value)}
                        onSearch={handleViewUserRatings}
                        enterButton={
                            <Button
                                type="primary"
                                icon={<SearchOutlined />}
                                loading={searchLoading}
                            >
                                查看
                            </Button>
                        }
                        style={{ flex: 1 }}
                    />
                </div>

                <div className={styles.tabsContainer}>
                    <Tabs activeKey={activeTab} onChange={handleTabChange}>
                        <TabPane tab="我发出的评价" key="sent" />
                        <TabPane tab="我收到的评价" key="received" />
                    </Tabs>
                </div>

                {renderRatings()}
            </div>
        </div>
    );
};

export default MyRatings;