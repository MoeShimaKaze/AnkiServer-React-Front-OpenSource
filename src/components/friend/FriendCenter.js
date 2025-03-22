import React, { useState, useEffect, useCallback } from 'react';
import { Card, Button, Alert, Spin, Empty, Tag, Avatar, Divider } from 'antd';
import { UserOutlined, TeamOutlined, SearchOutlined } from '@ant-design/icons';
import styles from '../../assets/css/friend/FriendCenter.module.css';
import FriendLayout from './FriendLayout';

// 定义搭子匹配类型的配置信息
const MATCH_TYPES = [
    { id: 'GAME', name: '游戏搭子', description: '寻找游戏好友一起组队', icon: '🎮' },
    { id: 'HOBBY', name: '兴趣搭子', description: '找到志同道合的兴趣伙伴', icon: '⭐' },
    { id: 'STUDY', name: '学习搭子', description: '结识学习伙伴互相进步', icon: '📚' },
    { id: 'SPORTS', name: '运动搭子', description: '找到运动伙伴一起锻炼', icon: '⚽' },
    { id: 'TALENT', name: '特长搭子', description: '与特长互补的朋友一起提升', icon: '🎨' },
    { id: 'TRAVEL', name: '旅游搭子', description: '寻找志同道合的旅行伙伴', icon: '✈️' },
    { id: 'COMPREHENSIVE', name: '综合匹配', description: '全方位寻找合适的朋友', icon: '🤝' }
];

// 定义共同特征的文本映射
const COMMON_ITEM_TEXT = {
    hobbies: '兴趣爱好',
    games: '游戏',
    sports: '运动',
    subjects: '学习科目',
    talents: '特长',
    destinations: '旅行目的地'
};

const FriendCenter = () => {
    // 状态管理
    const [hasProfile, setHasProfile] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [selectedType, setSelectedType] = useState('COMPREHENSIVE');
    const [potentialMatches, setPotentialMatches] = useState([]);
    const [recommendedMatches, setRecommendedMatches] = useState([]);

    // 检查用户是否已创建搭子档案
    const checkProfile = useCallback(async () => {
        try {
            const response = await window.fetch('http://127.0.0.1:8080/api/friend/profile', {
                credentials: 'include'
            });
            if (response.ok) {
                const data = await response.json();
                setHasProfile(true);
                return data;
            }
            setHasProfile(false);
            return null;
        } catch (error) {
            console.error('检查档案失败:', error);
            setError('无法检查用户档案状态');
            return null;
        }
    }, []);

    // 获取潜在搭子匹配列表
    const fetchPotentialMatches = useCallback(async () => {
        try {
            const response = await window.fetch(
                `http://127.0.0.1:8080/api/friend/matches/${selectedType}?page=0&size=10`,
                { credentials: 'include' }
            );
            if (response.ok) {
                const data = await response.json();
                setPotentialMatches(data.matches);
            } else {
                throw new Error('获取匹配数据失败');
            }
        } catch (error) {
            console.error('获取潜在匹配失败:', error);
            setError('获取匹配列表失败，请稍后重试');
        }
    }, [selectedType]);

    // 获取推荐搭子列表
    const fetchRecommendedMatches = useCallback(async () => {
        try {
            const response = await window.fetch('http://127.0.0.1:8080/api/friend/matches/recommended', {
                credentials: 'include'
            });
            if (response.ok) {
                const data = await response.json();
                setRecommendedMatches(data);
            }
        } catch (error) {
            console.error('获取推荐匹配失败:', error);
        }
    }, []);

    // 初始化数据
    useEffect(() => {
        const initializeData = async () => {
            setIsLoading(true);
            try {
                const profileData = await checkProfile();
                if (profileData) {
                    await Promise.all([
                        fetchPotentialMatches(),
                        fetchRecommendedMatches()
                    ]);
                }
            } catch (error) {
                console.error('初始化数据失败:', error);
                setError('加载数据失败，请刷新页面重试');
            } finally {
                setIsLoading(false);
            }
        };

        initializeData();
    }, [checkProfile, fetchPotentialMatches, fetchRecommendedMatches]);

    // 点击匹配类型的处理函数
    const handleMatchTypeClick = (typeId) => {
        setSelectedType(typeId);
        fetchPotentialMatches();
    };

    // 点击搭子卡片的处理函数
    const handleFriendCardClick = (friendId) => {
        window.location.href = `/friend/detail/${friendId}`;
    };

    // 渲染匹配类型卡片
    const renderMatchTypeCard = (type) => (
        <Card
            key={type.id}
            hoverable
            className={`${styles.matchTypeCard} ${
                selectedType === type.id ? styles.selected : ''
            }`}
            onClick={() => handleMatchTypeClick(type.id)}
        >
            <div className={styles.matchTypeIcon}>{type.icon}</div>
            <Card.Meta
                title={type.name}
                description={type.description}
            />
        </Card>
    );

    // 渲染搭子卡片
    const renderFriendCard = (match) => (
        <Card
            key={match.id}
            className={styles.friendCard}
            onClick={() => handleFriendCardClick(match.id)}
        >
            <Card.Meta
                avatar={
                    <Avatar
                        size={64}
                        src={match.avatarUrl}
                        icon={<UserOutlined />}
                        className={styles.friendAvatar}
                    />
                }
                title={
                    <div className={styles.friendCardHeader}>
                        <span className={styles.friendName}>{match.username}</span>
                        <span className={styles.matchScore}>
                            匹配度: {(match.matchScore * 100).toFixed(1)}%
                        </span>
                    </div>
                }
                description={
                    <div className={styles.friendCardContent}>
                        <div className={styles.university}>{match.university}</div>
                        <div className={styles.commonItems}>
                            {Object.entries(match.commonItems || {}).map(([key, value]) => (
                                value > 0 && (
                                    <Tag key={key} color="blue">
                                        共同{COMMON_ITEM_TEXT[key]}: {value}
                                    </Tag>
                                )
                            ))}
                        </div>
                    </div>
                }
            />
        </Card>
    );

    // 渲染创建档案提示
    const renderCreateProfilePrompt = () => (
        <Card className={styles.createProfileCard}>
            <div className={styles.createProfileContent}>
                <Avatar size={80} icon={<TeamOutlined />} className={styles.createProfileIcon} />
                <h2>开始寻找搭子</h2>
                <p>创建你的搭子档案，让我们帮你找到志同道合的伙伴</p>
                <Button
                    type="primary"
                    size="large"
                    icon={<SearchOutlined />}
                    onClick={() => window.location.href = '/friend/create-profile'}
                >
                    创建档案
                </Button>
            </div>
        </Card>
    );

    // 渲染加载状态
    if (isLoading) {
        return (
            <FriendLayout>
                <div className={styles.loadingContainer}>
                    <Spin size="large" tip="加载中..." />
                </div>
            </FriendLayout>
        );
    }

    // 主要渲染逻辑
    return (
        <FriendLayout>
            {/* 错误提示 */}
            {error && (
                <Alert
                    message="错误提示"
                    description={error}
                    type="error"
                    showIcon
                    closable
                    className={styles.errorAlert}
                />
            )}

            {/* 根据是否有档案显示不同内容 */}
            {!hasProfile ? (
                renderCreateProfilePrompt()
            ) : (
                <div className={styles.mainContent}>
                    {/* 侧边栏：匹配类型选择 */}
                    <div className={styles.sidebar}>
                        <Card>
                            {MATCH_TYPES.map(renderMatchTypeCard)}
                        </Card>
                    </div>

                    {/* 主内容区：推荐搭子和匹配列表 */}
                    <div className={styles.contentArea}>
                        {/* 推荐搭子区域 */}
                        <Card title="推荐搭子">
                            {recommendedMatches.length > 0 ? (
                                <div className={styles.recommendedList}>
                                    {recommendedMatches.map(renderFriendCard)}
                                </div>
                            ) : (
                                <Empty description="暂无推荐搭子" />
                            )}
                        </Card>

                        <Divider className={styles.divider} />

                        {/* 匹配搭子列表区域 */}
                        <Card
                            title="搭子匹配"
                            extra={`已找到 ${potentialMatches.length} 个潜在搭子`}
                        >
                            {potentialMatches.length > 0 ? (
                                <div className={styles.matchesList}>
                                    {potentialMatches.map(renderFriendCard)}
                                </div>
                            ) : (
                                <Empty description="暂无匹配结果" />
                            )}
                        </Card>
                    </div>
                </div>
            )}
        </FriendLayout>
    );
};

export default FriendCenter;