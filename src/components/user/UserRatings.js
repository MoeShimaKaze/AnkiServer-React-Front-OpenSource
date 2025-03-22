// UserRatings.js
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useParams, useNavigate } from 'react-router-dom';
import {
    Rate,
    Pagination,
    Spin,
    Empty,
    Avatar,
    Input,
    Button,
    notification
} from 'antd';
import {
    UserOutlined,
    CalendarOutlined,
    ArrowLeftOutlined,
    SearchOutlined
} from '@ant-design/icons';
import Navbar from '../base/Navbar';
import styles from '../../assets/css/user/UserRatings.module.css';

const { Search } = Input;

const UserRatings = () => {
    const { userId } = useParams();
    const navigate = useNavigate();
    const [ratings, setRatings] = useState([]);
    const [userInfo, setUserInfo] = useState(null);
    const [loading, setLoading] = useState(true);
    const [searchLoading, setSearchLoading] = useState(false);
    const [error, setError] = useState(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    const [total, setTotal] = useState(0);
    const [searchUsername, setSearchUsername] = useState('');

    useEffect(() => {
        if (!userId) {
            navigate('/');
            return;
        }

        fetchUserInfo();
        fetchRatings();
    }, [userId, currentPage, pageSize]);

    const fetchUserInfo = async () => {
        try {
            const response = await axios.get(`http://127.0.0.1:8080/api/users/${userId}`, {
                withCredentials: true
            });
            setUserInfo(response.data);
        } catch (error) {
            console.error('获取用户信息失败:', error);
            setError('获取用户信息失败: ' + (error.response?.data || error.message));
        }
    };

    const fetchRatings = async () => {
        setLoading(true);
        setError(null);

        try {
            const response = await axios.get(`http://127.0.0.1:8080/api/ratings/user/${userId}`, {
                params: {
                    page: currentPage - 1,
                    size: pageSize
                },
                withCredentials: true
            });

            setRatings(response.data.content || []);
            setTotal(response.data.totalElements || 0);
        } catch (error) {
            console.error('获取用户评价失败:', error);
            setError('获取用户评价失败: ' + (error.response?.data || error.message));
        } finally {
            setLoading(false);
        }
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
            setSearchUsername('');  // 清空搜索框
        }
    };

    const handlePageChange = (page, size) => {
        setCurrentPage(page);
        setPageSize(size);
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
        navigate(-1);
    };

    const renderRatings = () => {
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
                    <Empty description="该用户暂无收到的评价" />
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
                                    src={'/avatar.png'}
                                    alt={rating.raterName}
                                    className={styles.userAvatar}
                                    onClick={() => handleUserClick(rating.raterId)}
                                />
                                <div>
                                    <div
                                        className={styles.userName}
                                        onClick={() => handleUserClick(rating.raterId)}
                                    >
                                        {rating.raterName}
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
                        <h2 className={styles.ratingsTitle}>
                            {userInfo ? `${userInfo.username} 的评价` : '用户评价'}
                        </h2>
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

                {renderRatings()}
            </div>
        </div>
    );
};

export default UserRatings;