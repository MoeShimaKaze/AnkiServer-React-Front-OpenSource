// FriendDetail.js
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    Card, Avatar, Button, Spin, Tag, Divider, Empty, Tabs, message, Modal
} from 'antd';
import {
    UserOutlined, EnvironmentOutlined, TrophyOutlined,
    CompassOutlined, BookOutlined, SendOutlined,
    RollbackOutlined, HeartOutlined, HomeOutlined,
    TeamOutlined
} from '@ant-design/icons';
import FriendLayout from './FriendLayout';
import styles from '../../assets/css/friend/FriendDetail.module.css';

const { TabPane } = Tabs;
const { Meta } = Card;

// 匹配类型映射
const MATCH_TYPE_MAP = {
    GAME: { label: '游戏搭子', icon: '🎮', color: '#722ed1' },
    HOBBY: { label: '兴趣搭子', icon: '⭐', color: '#fa8c16' },
    STUDY: { label: '学习搭子', icon: '📚', color: '#52c41a' },
    SPORTS: { label: '运动搭子', icon: '⚽', color: '#1890ff' },
    TALENT: { label: '特长搭子', icon: '🎨', color: '#eb2f96' },
    TRAVEL: { label: '旅游搭子', icon: '✈️', color: '#13c2c2' },
    COMPREHENSIVE: { label: '综合匹配', icon: '🤝', color: '#faad14' }
};

// 技能等级映射
const SKILL_LEVEL_MAP = {
    BEGINNER: { label: '入门', color: 'green' },
    INTERMEDIATE: { label: '进阶', color: 'blue' },
    ADVANCED: { label: '精通', color: 'purple' },
    EXPERT: { label: '专家', color: 'magenta' },
    PROFESSIONAL: { label: '专业', color: 'red' }
};

// 旅行类型映射
const TRAVEL_TYPE_MAP = {
    CULTURAL: { label: '文化游', color: 'magenta' },
    SCENERY: { label: '风景游', color: 'green' },
    FOOD: { label: '美食游', color: 'orange' },
    ADVENTURE: { label: '探险游', color: 'red' },
    SHOPPING: { label: '购物游', color: 'purple' },
    PHOTOGRAPHY: { label: '摄影游', color: 'blue' }
};

// 季节映射
const SEASON_MAP = {
    SPRING: '春季',
    SUMMER: '夏季',
    AUTUMN: '秋季',
    WINTER: '冬季'
};

const FriendDetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();

    // 状态管理
    const [loading, setLoading] = useState(true);
    const [profileData, setProfileData] = useState(null);
    const [matchData, setMatchData] = useState(null);
    const [error, setError] = useState('');
    const [isContactModalVisible, setIsContactModalVisible] = useState(false);
    const [contactInfo, setContactInfo] = useState('');
    const [requestLoading, setRequestLoading] = useState(false);
    const [contactRequestModalVisible, setContactRequestModalVisible] = useState(false);

    // 获取搭子详情数据
    useEffect(() => {
        const fetchFriendDetails = async () => {
            setLoading(true);
            setError('');

            try {
                // 使用统一的搭子详情端点获取所有信息
                const detailResponse = await fetch(
                    `http://127.0.0.1:8080/api/friend/detail/${id}`,
                    { credentials: 'include' }
                );

                if (!detailResponse.ok) {
                    throw new Error('获取搭子资料失败');
                }

                const detailData = await detailResponse.json();

                // 分别设置用户档案和匹配信息
                setProfileData(detailData.profile);

                // 提取匹配相关信息并设置到matchData
                const matchData = {
                    matchId: detailData.matchId,
                    matchScore: detailData.matchScore,
                    matchStatus: detailData.matchStatus,
                    isRequestSent: detailData.isRequestSent,
                    isRequestReceived: detailData.isRequestReceived,
                    matchDetails: detailData.matchDetails,
                    commonItems: detailData.commonItems
                };

                setMatchData(matchData);
            } catch (error) {
                console.error('获取搭子详情失败:', error);
                setError('获取搭子资料失败，请稍后重试');
            } finally {
                setLoading(false);
            }
        };

        fetchFriendDetails();
    }, [id]);

    // 处理返回列表操作
    const handleBack = () => {
        navigate(-1);
    };

    // 处理发送联系请求
    const handleContactRequest = async () => {
        setRequestLoading(true);

        try {
            const response = await fetch(
                `http://127.0.0.1:8080/api/friend/request/${id}`,
                {
                    method: 'POST',
                    credentials: 'include'
                }
            );

            if (!response.ok) {
                throw new Error('发送请求失败');
            }

            message.success('联系方式交换请求已发送');
            setContactRequestModalVisible(false);
        } catch (error) {
            console.error('发送联系请求失败:', error);
            message.error('发送请求失败，请稍后重试');
        } finally {
            setRequestLoading(false);
        }
    };

    // 处理查看联系方式
    const handleViewContact = async () => {
        setRequestLoading(true);

        try {
            const response = await fetch(
                `http://127.0.0.1:8080/api/friend/contact/${id}`,
                { credentials: 'include' }
            );

            if (!response.ok) {
                throw new Error('获取联系方式失败');
            }

            const contact = await response.text();
            setContactInfo(contact);
            setIsContactModalVisible(true);
        } catch (error) {
            console.error('获取联系方式失败:', error);
            message.error('获取联系方式失败，请先发送联系请求');
        } finally {
            setRequestLoading(false);
        }
    };

    // 渲染匹配分数
    const renderMatchScore = () => {
        if (!matchData || matchData.matchScore === undefined) return null;

        const matchPercentage = Math.round(matchData.matchScore * 100);
        let color = '#1890ff';

        if (matchPercentage >= 80) color = '#f5222d';
        else if (matchPercentage >= 60) color = '#fa8c16';
        else if (matchPercentage >= 40) color = '#52c41a';

        return (
            <div className={styles.matchScoreContainer}>
                <div className={styles.matchScoreTitle}>匹配度</div>
                <div
                    className={styles.matchScoreValue}
                    style={{ color: color }}
                >
                    {matchPercentage}%
                </div>
                {matchData.matchDetails && (
                    <div className={styles.matchDetailTags}>
                        {Object.entries(matchData.matchDetails)
                            .filter(([key, value]) => key.includes('Count') && value > 0)
                            .map(([key, value]) => {
                                const label = key.replace('common', '').replace('Count', '');
                                return (
                                    <Tag key={key} color="blue">
                                        共同{label}: {value}
                                    </Tag>
                                );
                            })}
                    </div>
                )}
            </div>
        );
    };

    // 渲染兴趣爱好列表
    const renderHobbies = () => {
        if (!profileData?.hobbies || profileData.hobbies.length === 0) {
            return <Empty description="暂无兴趣爱好" />;
        }

        return (
            <div className={styles.tagList}>
                {profileData.hobbies.map((hobby, index) => (
                    <Tag
                        key={index}
                        color="blue"
                        icon={<HeartOutlined />}
                        className={styles.itemTag}
                    >
                        {hobby}
                    </Tag>
                ))}
            </div>
        );
    };

    // 渲染游戏技能列表
    const renderGameSkills = () => {
        if (!profileData?.gameSkills || profileData.gameSkills.length === 0) {
            return <Empty description="暂无游戏技能" />;
        }

        return (
            <div className={styles.skillList}>
                {profileData.gameSkills.map((skill, index) => (
                    <Card key={index} className={styles.skillCard}>
                        <div className={styles.skillName}>{skill.gameName}</div>
                        <div className={styles.skillDetails}>
                            <Tag color={SKILL_LEVEL_MAP[skill.skillLevel]?.color || 'blue'}>
                                {SKILL_LEVEL_MAP[skill.skillLevel]?.label || skill.skillLevel}
                            </Tag>
                            {skill.rank && <Tag color="cyan">段位: {skill.rank}</Tag>}
                            {skill.preferredPosition && (
                                <Tag color="gold">定位: {skill.preferredPosition}</Tag>
                            )}
                        </div>
                    </Card>
                ))}
            </div>
        );
    };

    // 渲染特长列表
    const renderTalents = () => {
        if (!profileData?.talents || profileData.talents.length === 0) {
            return <Empty description="暂无特长" />;
        }

        return (
            <div className={styles.skillList}>
                {profileData.talents.map((talent, index) => (
                    <Card key={index} className={styles.skillCard}>
                        <div className={styles.skillName}>{talent.talentName}</div>
                        <div className={styles.skillDetails}>
                            <Tag color={SKILL_LEVEL_MAP[talent.proficiency]?.color || 'blue'}>
                                {SKILL_LEVEL_MAP[talent.proficiency]?.label || talent.proficiency}
                            </Tag>
                            {talent.canTeach && <Tag color="green">可教授</Tag>}
                            {talent.certification && <Tag color="volcano">证书: {talent.certification}</Tag>}
                        </div>
                    </Card>
                ))}
            </div>
        );
    };

    // 渲染运动列表
    const renderSports = () => {
        if (!profileData?.sports || profileData.sports.length === 0) {
            return <Empty description="暂无运动项目" />;
        }

        return (
            <div className={styles.tagList}>
                {profileData.sports.map((sport, index) => (
                    <Tag
                        key={index}
                        color="cyan"
                        className={styles.itemTag}
                    >
                        {sport}
                    </Tag>
                ))}
            </div>
        );
    };

    // 渲染学习科目列表
    const renderStudySubjects = () => {
        if (!profileData?.studySubjects || profileData.studySubjects.length === 0) {
            return <Empty description="暂无学习科目" />;
        }

        return (
            <div className={styles.tagList}>
                {profileData.studySubjects.map((subject, index) => (
                    <Tag
                        key={index}
                        color="green"
                        icon={<BookOutlined />}
                        className={styles.itemTag}
                    >
                        {subject}
                    </Tag>
                ))}
            </div>
        );
    };

    // 渲染旅行目的地列表
    const renderTravelDestinations = () => {
        if (!profileData?.travelDestinations || profileData.travelDestinations.length === 0) {
            return <Empty description="暂无旅行目的地" />;
        }

        return (
            <div className={styles.destinationList}>
                {profileData.travelDestinations.map((destination, index) => (
                    <Card key={index} className={styles.destinationCard}>
                        <div className={styles.destinationHeader}>
                          <span className={styles.destinationName}>
                            {destination.destination}
                          </span>
                            <Tag color={TRAVEL_TYPE_MAP[destination.travelType]?.color || 'blue'}>
                                {TRAVEL_TYPE_MAP[destination.travelType]?.label || destination.travelType}
                            </Tag>
                        </div>
                        <div className={styles.destinationDetails}>
                            <Tag color="blue" icon={<EnvironmentOutlined />}>
                                {destination.province}, {destination.country}
                            </Tag>
                            {destination.expectedSeason && (
                                <Tag color="gold">
                                    {SEASON_MAP[destination.expectedSeason] || destination.expectedSeason}
                                </Tag>
                            )}
                        </div>
                    </Card>
                ))}
            </div>
        );
    };

    // 如果正在加载，显示加载状态
    if (loading) {
        return (
            <FriendLayout background="detail">
                <div className={styles.loadingContainer}>
                    <Spin size="large" tip="加载中..." />
                </div>
            </FriendLayout>
        );
    }

    // 如果加载出错，显示错误信息
    if (error) {
        return (
            <FriendLayout background="detail">
                <div className={styles.errorContainer}>
                    <Empty
                        description={error}
                        image={Empty.PRESENTED_IMAGE_SIMPLE}
                    />
                    <Button
                        type="primary"
                        icon={<RollbackOutlined />}
                        onClick={handleBack}
                        style={{ marginTop: 16 }}
                    >
                        返回上一页
                    </Button>
                </div>
            </FriendLayout>
        );
    }

    // 如果没有找到资料，显示提示
    if (!profileData) {
        return (
            <FriendLayout background="detail">
                <div className={styles.errorContainer}>
                    <Empty description="未找到用户资料" />
                    <Button
                        type="primary"
                        icon={<RollbackOutlined />}
                        onClick={handleBack}
                        style={{ marginTop: 16 }}
                    >
                        返回上一页
                    </Button>
                </div>
            </FriendLayout>
        );
    }

    return (
        <FriendLayout background="detail">
            <div className={styles.headerActions}>
                <Button
                    icon={<RollbackOutlined />}
                    onClick={handleBack}
                >
                    返回列表
                </Button>
            </div>

            <Card className={styles.profileCard}>
                <div className={styles.profileHeader}>
                    <Meta
                        avatar={
                            <Avatar
                                size={80}
                                icon={<UserOutlined />}
                                src={profileData.avatarUrl}
                            />
                        }
                        title={
                            <div className={styles.profileTitle}>
                                <h2>{profileData.username}</h2>
                                <Tag
                                    color={MATCH_TYPE_MAP[profileData.preferredMatchType]?.color || 'blue'}
                                    icon={<TeamOutlined />}
                                    className={styles.matchTypeTag}
                                >
                                    {MATCH_TYPE_MAP[profileData.preferredMatchType]?.icon}
                                    {MATCH_TYPE_MAP[profileData.preferredMatchType]?.label || profileData.preferredMatchType}
                                </Tag>
                            </div>
                        }
                        description={
                            <div className={styles.profileBasicInfo}>
                                <Tag icon={<HomeOutlined />} color="processing">
                                    {profileData.university}
                                </Tag>
                            </div>
                        }
                    />

                    <div className={styles.profileActions}>
                        <Button
                            type="primary"
                            icon={<SendOutlined />}
                            onClick={() => setContactRequestModalVisible(true)}
                            loading={requestLoading}
                        >
                            请求联系方式
                        </Button>
                        <Button
                            type="default"
                            onClick={handleViewContact}
                            loading={requestLoading}
                        >
                            查看联系方式
                        </Button>
                    </div>
                </div>

                <Divider />

                <div className={styles.profileContent}>
                    <div className={styles.profileMain}>
                        <Tabs defaultActiveKey="hobbies" tabPosition="left">
                            <TabPane
                                tab={<span><HeartOutlined /> 兴趣爱好</span>}
                                key="hobbies"
                            >
                                {renderHobbies()}
                            </TabPane>
                            <TabPane
                                tab={<span><TrophyOutlined /> 游戏技能</span>}
                                key="games"
                            >
                                {renderGameSkills()}
                            </TabPane>
                            <TabPane
                                tab={<span><TrophyOutlined /> 特长</span>}
                                key="talents"
                            >
                                {renderTalents()}
                            </TabPane>
                            <TabPane
                                tab={<span><TeamOutlined /> 运动项目</span>}
                                key="sports"
                            >
                                {renderSports()}
                            </TabPane>
                            <TabPane
                                tab={<span><BookOutlined /> 学习科目</span>}
                                key="study"
                            >
                                {renderStudySubjects()}
                            </TabPane>
                            <TabPane
                                tab={<span><CompassOutlined /> 旅行目的地</span>}
                                key="travel"
                            >
                                {renderTravelDestinations()}
                            </TabPane>
                        </Tabs>
                    </div>

                    <div className={styles.profileSidebar}>
                        {renderMatchScore()}
                    </div>
                </div>
            </Card>

            {/* 联系方式查看模态框 */}
            <Modal
                title="联系方式"
                visible={isContactModalVisible}
                onCancel={() => setIsContactModalVisible(false)}
                footer={[
                    <Button key="close" onClick={() => setIsContactModalVisible(false)}>
                        关闭
                    </Button>
                ]}
            >
                <p className={styles.contactInfo}>{contactInfo}</p>
            </Modal>

            {/* 联系请求确认模态框 */}
            <Modal
                title="发送联系方式交换请求"
                visible={contactRequestModalVisible}
                onOk={handleContactRequest}
                onCancel={() => setContactRequestModalVisible(false)}
                confirmLoading={requestLoading}
                okText="发送请求"
                cancelText="取消"
            >
                <p>
                    你确定要向 <strong>{profileData.username}</strong> 发送联系方式交换请求吗？
                </p>
                <p>
                    对方接受请求后，你们将可以看到彼此的联系方式。
                </p>
            </Modal>
        </FriendLayout>
    );
};

export default FriendDetail;