// FriendMatchList.js
import React, { useState, useCallback, useRef } from 'react';
import {
    Card, Button, Tag, Avatar, Empty, Spin,
    Select, Pagination, message, Modal, Alert
} from 'antd';
import {
    UserOutlined, SendOutlined,
    HeartOutlined, TrophyOutlined, CompassOutlined,
    SearchOutlined
} from '@ant-design/icons';
import { useParams, useNavigate } from 'react-router-dom';
import FriendLayout from './FriendLayout';
import styles from '../../assets/css/friend/FriendMatchList.module.css';

const { Option } = Select;
const { Meta } = Card;

// 定义匹配类型
const MATCH_TYPES = [
    { value: 'GAME', label: '游戏搭子', icon: '🎮' },
    { value: 'HOBBY', label: '兴趣搭子', icon: '⭐' },
    { value: 'STUDY', label: '学习搭子', icon: '📚' },
    { value: 'SPORTS', label: '运动搭子', icon: '⚽' },
    { value: 'TALENT', label: '特长搭子', icon: '🎨' },
    { value: 'TRAVEL', label: '旅游搭子', icon: '✈️' },
    { value: 'COMPREHENSIVE', label: '综合匹配', icon: '🤝' }
];

// 共同项目标签映射
const COMMON_ITEM_NAMES = {
    commonHobbiesCount: '共同兴趣',
    commonGamesCount: '共同游戏',
    commonSportsCount: '共同运动',
    commonSubjectsCount: '共同科目',
    commonTalentsCount: '共同特长',
    commonDestinationsCount: '共同目的地'
};

// 匹配分数颜色映射
const getScoreColor = (score) => {
    if (score >= 0.8) return '#f5222d'; // 红色，高匹配度
    if (score >= 0.6) return '#fa8c16'; // 橙色，较高匹配度
    if (score >= 0.4) return '#52c41a'; // 绿色，中等匹配度
    return '#1890ff'; // 蓝色，一般匹配度
};

// 防抖函数
const useDebounce = (fn, delay) => {
    const timer = useRef(null);

    return function(...args) {
        if (timer.current) {
            clearTimeout(timer.current);
        }

        timer.current = setTimeout(() => {
            fn.apply(this, args);
            timer.current = null;
        }, delay);
    };
};

const FriendMatchList = () => {
    const { matchType = 'COMPREHENSIVE' } = useParams();
    const navigate = useNavigate();

    // 状态管理
    const [loading, setLoading] = useState(false);
    const [matches, setMatches] = useState([]);
    const [pagination, setPagination] = useState({
        current: 1,
        pageSize: 10,
        total: 0
    });
    const [selectedType, setSelectedType] = useState(matchType);
    const [sortBy, setSortBy] = useState('matchScore');
    const [sortDirection, setSortDirection] = useState('DESC');
    const [isContactModalVisible, setIsContactModalVisible] = useState(false);
    const [currentTarget, setCurrentTarget] = useState(null);
    const [requestInProgress, setRequestInProgress] = useState(false);
    const [error, setError] = useState('');
    const [hasQueried, setHasQueried] = useState(false);  // 新增：记录是否已查询过
    const [lastQueryTime, setLastQueryTime] = useState(0); // 新增：记录上次查询时间

    // 获取搭子匹配数据
    const fetchMatches = useCallback(async (page = 1) => {
        // 检查是否在冷却期内（3秒）
        const now = Date.now();
        const cooldownTime = 3000; // 3秒冷却时间

        if (now - lastQueryTime < cooldownTime && lastQueryTime !== 0) {
            message.warning(`请求过于频繁，请在${Math.ceil((cooldownTime - (now - lastQueryTime)) / 1000)}秒后再试`);
            return;
        }

        setLoading(true);
        setError('');
        setLastQueryTime(now);

        try {
            const response = await fetch(
                `http://127.0.0.1:8080/api/friend/matches/${selectedType}` +
                `?page=${page - 1}` +
                `&size=${pagination.pageSize}` +
                `&sortBy=${sortBy}` +
                `&direction=${sortDirection}`,
                { credentials: 'include' }
            );

            if (!response.ok) throw new Error('获取匹配列表失败');

            const data = await response.json();
            setMatches(data.matches);
            setPagination({
                ...pagination,
                current: page,
                total: data.totalElements
            });
            setHasQueried(true);
        } catch (error) {
            console.error('获取匹配失败:', error);
            setError('获取匹配列表失败，请稍后重试');
        } finally {
            setLoading(false);
        }
    }, [selectedType, sortBy, sortDirection, pagination, lastQueryTime]);

    // 防抖处理的查询函数
    const debouncedFetchMatches = useDebounce(fetchMatches, 300);

    // 处理匹配类型变更
    const handleTypeChange = (value) => {
        setSelectedType(value);
        navigate(`/friend/matches/${value}`);
    };

    // 处理排序方式变更
    const handleSortChange = (value) => {
        setSortBy(value);
    };

    // 处理排序方向变更
    const handleSortDirectionChange = (value) => {
        setSortDirection(value);
    };

    // 查看搭子详情
    const handleViewDetails = (friendId) => {
        navigate(`/friend/detail/${friendId}`);
    };

    // 打开发送联系请求确认模态框
    const showContactRequestModal = (match) => {
        setCurrentTarget(match);
        setIsContactModalVisible(true);
    };

    // 发送联系请求
    const sendContactRequest = async () => {
        if (!currentTarget) return;

        setRequestInProgress(true);
        try {
            const response = await fetch(
                `http://127.0.0.1:8080/api/friend/request/${currentTarget.targetId}`,
                {
                    method: 'POST',
                    credentials: 'include'
                }
            );

            if (!response.ok) throw new Error('发送请求失败');

            message.success('联系方式交换请求已发送');
            setIsContactModalVisible(false);
        } catch (error) {
            console.error('发送联系请求失败:', error);
            message.error('发送请求失败，请稍后重试');
        } finally {
            setRequestInProgress(false);
        }
    };

    // 渲染匹配项目标签
    const renderMatchTags = (match) => {
        if (!match.matchDetails) return null;

        return Object.entries(match.matchDetails)
            .filter(([key, value]) =>
                key.includes('Count') && value > 0 && COMMON_ITEM_NAMES[key]
            )
            .map(([key, value]) => (
                <Tag key={key} color="blue" className={styles.matchTag}>
                    {COMMON_ITEM_NAMES[key]}: {value}
                </Tag>
            ));
    };

    // 渲染匹配特征
    const renderMatchFeatures = (match) => {
        if (!match.matchDetails) return null;

        const highScoreFeatures = Object.entries(match.matchDetails)
            .filter(([key, value]) =>
                !key.includes('Count') && value > 0.7 &&
                ['talent', 'hobby', 'sports', 'game', 'study', 'travel'].some(type => key.includes(type))
            )
            .map(([key, value]) => {
                let icon;
                if (key.includes('talent')) icon = <TrophyOutlined />;
                else if (key.includes('hobby')) icon = <HeartOutlined />;
                else if (key.includes('travel')) icon = <CompassOutlined />;
                else icon = null;

                return (
                    <Tag key={key} color="purple" icon={icon} className={styles.featureTag}>
                        {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                    </Tag>
                );
            });

        return highScoreFeatures.length > 0 ? (
            <div className={styles.matchFeatures}>
                <span className={styles.featureLabel}>匹配亮点:</span>
                {highScoreFeatures}
            </div>
        ) : null;
    };

    // 渲染搭子卡片
    const renderFriendCard = (match) => {
        // 计算形式化的匹配百分比
        const matchPercentage = Math.round(match.matchScore * 100);
        const scoreColor = getScoreColor(match.matchScore);

        return (
            <Card
                key={match.id}
                className={styles.friendCard}
                actions={[
                    <Button
                        type="primary"
                        ghost
                        onClick={() => handleViewDetails(match.targetId)}
                    >
                        查看详情
                    </Button>,
                    <Button
                        type="primary"
                        icon={<SendOutlined />}
                        onClick={() => showContactRequestModal(match)}
                    >
                        请求联系
                    </Button>
                ]}
            >
                <Meta
                    avatar={
                        <Avatar
                            size={64}
                            icon={<UserOutlined />}
                            src={match.profile?.avatarUrl}
                        />
                    }
                    title={
                        <div className={styles.cardTitle}>
                            <span>{match.profile?.username || match.targetName}</span>
                            <span
                                className={styles.matchScore}
                                style={{ color: scoreColor }}
                            >
                                匹配度: {matchPercentage}%
                            </span>
                        </div>
                    }
                    description={
                        <div className={styles.cardDescription}>
                            <div className={styles.university}>
                                {match.profile?.university || '未知学校'}
                            </div>
                            <div className={styles.tagContainer}>
                                {renderMatchTags(match)}
                            </div>
                            {renderMatchFeatures(match)}
                        </div>
                    }
                />
            </Card>
        );
    };

    // 渲染初始状态提示
    const renderInitialState = () => (
        <div className={styles.initialStateContainer}>
            <div className={styles.initialStateContent}>
                <SearchOutlined className={styles.initialStateIcon} />
                <h2>开始寻找搭子</h2>
                <p>请选择匹配类型和排序方式，然后点击"查找搭子"按钮开始搜索</p>
            </div>
        </div>
    );

    return (
        <FriendLayout background="matches">
            <div className={styles.headerSection}>
                <h1 className={styles.title}>
                    搭子匹配列表
                    <span className={styles.titleIcon}>
                        {MATCH_TYPES.find(type => type.value === selectedType)?.icon}
                    </span>
                </h1>

                <div className={styles.filterSection}>
                    <div className={styles.filterItem}>
                        <span className={styles.filterLabel}>匹配类型:</span>
                        <Select
                            value={selectedType}
                            onChange={handleTypeChange}
                            className={styles.selector}
                        >
                            {MATCH_TYPES.map(type => (
                                <Option key={type.value} value={type.value}>
                                    {type.icon} {type.label}
                                </Option>
                            ))}
                        </Select>
                    </div>

                    <div className={styles.filterItem}>
                        <span className={styles.filterLabel}>排序方式:</span>
                        <Select
                            value={sortBy}
                            onChange={handleSortChange}
                            className={styles.selector}
                        >
                            <Option value="matchScore">匹配度</Option>
                            <Option value="createdAt">创建时间</Option>
                        </Select>
                    </div>

                    <div className={styles.filterItem}>
                        <span className={styles.filterLabel}>排序方向:</span>
                        <Select
                            value={sortDirection}
                            onChange={handleSortDirectionChange}
                            className={styles.selector}
                        >
                            <Option value="DESC">降序</Option>
                            <Option value="ASC">升序</Option>
                        </Select>
                    </div>

                    <Button
                        type="primary"
                        icon={<SearchOutlined />}
                        onClick={() => debouncedFetchMatches(1)}
                        className={styles.filterButton}
                        loading={loading}
                    >
                        {hasQueried ? '重新查询' : '查找搭子'}
                    </Button>
                </div>

                {!hasQueried && !loading && (
                    <Alert
                        message="使用提示"
                        description="请选择您感兴趣的匹配类型和排序方式，然后点击'查找搭子'按钮开始搜索匹配的朋友。"
                        type="info"
                        showIcon
                        className={styles.alertTip}
                    />
                )}
            </div>

            <div className={styles.matchesContainer}>
                {loading ? (
                    <div className={styles.loadingContainer}>
                        <Spin size="large" tip="加载中..." />
                    </div>
                ) : !hasQueried ? (
                    renderInitialState()
                ) : error ? (
                    <div className={styles.errorContainer}>
                        <Empty
                            description={error}
                            image={Empty.PRESENTED_IMAGE_SIMPLE}
                        />
                    </div>
                ) : matches.length === 0 ? (
                    <div className={styles.emptyContainer}>
                        <Empty description="暂无匹配搭子" />
                    </div>
                ) : (
                    <div className={styles.matchList}>
                        {matches.map(renderFriendCard)}
                    </div>
                )}
            </div>

            {!loading && hasQueried && matches.length > 0 && (
                <div className={styles.paginationContainer}>
                    <Pagination
                        current={pagination.current}
                        pageSize={pagination.pageSize}
                        total={pagination.total}
                        onChange={page => debouncedFetchMatches(page)}
                        showSizeChanger={false}
                        showQuickJumper
                    />
                </div>
            )}

            <Modal
                title="发送联系方式交换请求"
                visible={isContactModalVisible}
                onOk={sendContactRequest}
                onCancel={() => setIsContactModalVisible(false)}
                confirmLoading={requestInProgress}
                okText="发送请求"
                cancelText="取消"
            >
                <p>
                    你确定要向 <strong>{currentTarget?.profile?.username || currentTarget?.targetName}</strong> 发送联系方式交换请求吗？
                </p>
                <p>
                    对方接受请求后，你们将可以看到彼此的联系方式。
                </p>
            </Modal>
        </FriendLayout>
    );
};

export default FriendMatchList;