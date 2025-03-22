import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { Link, useNavigate } from 'react-router-dom';
import Navbar from '../base/Navbar';
import Loading from '../utils/Loading';
import QuestionTypeFilter from '../utils/filter/QuestionTypeFilter';
import { getQuestionTypeText, getStatusText } from '../utils/map/questionTypeMap';
import styles from '../../assets/css/question/QuestionCenter.module.css';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import defaultAvatarIcon from '../../assets/icon/user.png';
import { fetchAvatarsByUserIds } from '../utils/api/Avatars';

// 创建问题组件懒加载
const CreateQuestion = React.lazy(() => import('./CreateQuestion'));

/**
 * 热门问题项组件
 */
const HotQuestionItem = ({ question, onClick }) => (
    <div
        className={styles.hotQuestionItem}
        onClick={() => onClick(question.id)}
    >
        <div className={styles.hotQuestionRank}>
            <span>{question.rank}</span>
        </div>
        <div className={styles.hotQuestionInfo}>
            <h4 className={styles.hotQuestionTitle}>{question.shortTitle}</h4>
            <div className={styles.hotQuestionStats}>
                <span>浏览 {question.viewCount}</span>
                <span>回复 {question.replyCount || question.replies?.length || 0}</span>
            </div>
        </div>
    </div>
);

/**
 * 空状态展示组件
 */
const EmptyState = ({ onCreateQuestion }) => (
    <div className={styles.noQuestionsContainer}>
        <div className={styles.noQuestionsIcon}>📝</div>
        <p className={styles.noQuestionsText}>暂时没有相关问题，来创建第一个问题吧！</p>
        <button
            className={styles.startQuestionButton}
            onClick={onCreateQuestion}
        >
            创建问题
        </button>
    </div>
);

/**
 * 问题中心主组件
 */
const QuestionCenter = ({ isAdmin }) => {
    // 状态管理
    const [allQuestions, setAllQuestions] = useState([]);
    const [displayedQuestions, setDisplayedQuestions] = useState([]);
    const [hotQuestions, setHotQuestions] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isHotQuestionsLoading, setIsHotQuestionsLoading] = useState(true);
    const [error, setError] = useState('');
    const [hotQuestionsError, setHotQuestionsError] = useState('');
    const [status, setStatus] = useState('ALL'); // 默认显示全部问题
    const [selectedType, setSelectedType] = useState('ALL');
    const [showCreateForm, setShowCreateForm] = useState(false);
    const navigate = useNavigate();

    // 分页状态
    const [currentPage, setCurrentPage] = useState(0);
    const [pageSize] = useState(10); // 使用常量
    const [totalPages, setTotalPages] = useState(0);
    const [totalElements, setTotalElements] = useState(0);

    // 筛选问题的函数 - 提取为独立函数以便于重用
    const filterQuestions = useCallback((questions, type) => {
        return questions.filter(q =>
            type === 'ALL' || q.questionType === type
        );
    }, []);

    // 获取问题列表 - 使用后端分页和状态筛选，前端类型筛选
    const fetchQuestions = useCallback(async () => {
        try {
            setIsLoading(true);
            setError('');

            // 构建查询参数
            const params = {
                page: currentPage,
                size: pageSize
            };

            // 仅当选择了特定状态时添加状态参数
            if (status !== 'ALL') {
                params.status = status;
            }

            const response = await axios.get('http://127.0.0.1:8080/api/questions', {
                params,
                withCredentials: true,
            });

            if (response.data && response.data.content) {
                const questionsData = response.data.content;
                const userIds = [...new Set(questionsData.map(q => q.userId))];
                const avatarMap = await fetchAvatarsByUserIds(userIds);

                const updatedQuestions = questionsData.map(q => ({
                    ...q,
                    userAvatar: avatarMap[q.userId] || defaultAvatarIcon,
                }));

                setAllQuestions(updatedQuestions);

                // 更新分页信息
                setTotalPages(response.data.totalPages || 0);
                setTotalElements(response.data.totalElements || 0);

                // 应用问题类型筛选（客户端筛选）
                const filtered = filterQuestions(updatedQuestions, selectedType);
                setDisplayedQuestions(filtered);
            } else {
                throw new Error('响应格式不正确');
            }
        } catch (error) {
            console.error('获取问题列表失败:', error);
            setError(error.response?.data || '获取问题列表失败，请稍后重试');
        } finally {
            setIsLoading(false);
        }
    }, [currentPage, pageSize, status, selectedType, filterQuestions]);

    // 获取热门问题列表
    const fetchHotQuestions = useCallback(async () => {
        try {
            setIsHotQuestionsLoading(true);
            setHotQuestionsError('');
            const response = await axios.get('http://127.0.0.1:8080/api/questions/hot', {
                withCredentials: true
            });

            const rankedHotQuestions = response.data.map((question, index) => ({
                ...question,
                rank: index + 1
            }));

            setHotQuestions(rankedHotQuestions);
        } catch (error) {
            console.error('获取热门问题失败:', error);
            setHotQuestionsError('获取热门问题失败，请稍后重试');
        } finally {
            setIsHotQuestionsLoading(false);
        }
    }, []);

    // 初始化数据
    useEffect(() => {
        fetchQuestions();
        fetchHotQuestions();
    }, [fetchQuestions, fetchHotQuestions]);

    // 问题点击处理
    const handleQuestionClick = useCallback((questionId) => {
        navigate(`/questions/${questionId}`);
    }, [navigate]);

    // 处理问题卡片渲染
    const renderQuestionCard = useCallback((question) => {
        const truncateDescription = (text) => {
            if (!text) return '';
            const plainText = text.replace(/\[.*?]\(.*?\)/g, '');
            return plainText.length > 100
                ? plainText.slice(0, 100) + '...'
                : plainText;
        };

        const getStatusClassName = (status) => {
            const statusMap = {
                'OPEN': styles.statusOpen,
                'IN_PROGRESS': styles.statusInProgress,
                'RESOLVED': styles.statusResolved,
                'CLOSED': styles.statusClosed
            };
            return statusMap[status] || styles.statusDefault;
        };

        return (
            <div
                key={question.id}
                className={styles.questionCard}
                onClick={() => handleQuestionClick(question.id)}
            >
                <div className={styles.questionContent}>
                    <div className={styles.questionHeader}>
                        <div className={styles.questionMeta}>
                            <span className={styles.typeTag}>
                                {getQuestionTypeText(question.questionType)}
                            </span>
                            <span className={`${styles.statusTag} ${getStatusClassName(question.status)}`}>
                                {getStatusText(question.status)}
                            </span>
                        </div>
                        <h3 className={styles.questionTitle}>{question.shortTitle}</h3>
                    </div>

                    <div className={styles.questionDescription}>
                        <ReactMarkdown remarkPlugins={[remarkGfm]} className={styles.markdownContent}>
                            {truncateDescription(question.description)}
                        </ReactMarkdown>
                    </div>

                    <div className={styles.questionFooter}>
                        <div className={styles.userInfo}>
                            <img
                                src={question.userAvatar}
                                alt={question.userName || '用户头像'}
                                className={styles.userAvatar}
                                onError={(e) => {
                                    e.target.onerror = null;
                                    e.target.src = defaultAvatarIcon;
                                }}
                            />
                            <span className={styles.username}>{question.userName}</span>
                        </div>
                        <div className={styles.questionStats}>
                            <span>发布于 {new Date(question.createdAt).toLocaleString()}</span>
                            <span>浏览 {question.viewCount}</span>
                            <span>回复 {question.replyCount || question.replies?.length || 0}</span>
                        </div>
                    </div>
                </div>

                {question.imageUrl && (
                    <div className={styles.questionImageWrapper}>
                        <img
                            src={question.imageUrl}
                            alt={question.shortTitle}
                            className={styles.questionImage}
                            onError={(e) => {
                                e.target.style.display = 'none';
                            }}
                        />
                    </div>
                )}
            </div>
        );
    }, [handleQuestionClick]);

    // 状态切换时重置页码
    const handleStatusChange = useCallback((newStatus) => {
        setStatus(newStatus);
        setCurrentPage(0);
    }, []);

    // 问题类型变更 - 仅客户端筛选，不触发API调用
    const handleTypeChange = useCallback((type) => {
        setSelectedType(type);

        // 在当前页面数据中筛选
        const filtered = filterQuestions(allQuestions, type);
        setDisplayedQuestions(filtered);
    }, [allQuestions, filterQuestions]);

    // 分页控件渲染
    const renderPagination = () => {
        if (totalPages <= 1) return null;

        return (
            <div className={styles.pagination}>
                <button
                    onClick={() => setCurrentPage(0)}
                    disabled={currentPage === 0}
                    className={styles.paginationButton}
                >
                    首页
                </button>

                <button
                    onClick={() => setCurrentPage(p => Math.max(0, p - 1))}
                    disabled={currentPage === 0}
                    className={styles.paginationButton}
                >
                    上一页
                </button>

                {/* 智能分页显示 */}
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageToShow;
                    if (totalPages <= 5) {
                        pageToShow = i;
                    } else if (currentPage < 2) {
                        pageToShow = i;
                    } else if (currentPage > totalPages - 3) {
                        pageToShow = totalPages - 5 + i;
                    } else {
                        pageToShow = currentPage - 2 + i;
                    }

                    return (
                        <button
                            key={pageToShow}
                            onClick={() => setCurrentPage(pageToShow)}
                            className={`${styles.paginationButton} ${currentPage === pageToShow ? styles.activePage : ''}`}
                        >
                            {pageToShow + 1}
                        </button>
                    );
                })}

                <button
                    onClick={() => setCurrentPage(p => Math.min(totalPages - 1, p + 1))}
                    disabled={currentPage === totalPages - 1}
                    className={styles.paginationButton}
                >
                    下一页
                </button>

                <button
                    onClick={() => setCurrentPage(totalPages - 1)}
                    disabled={currentPage === totalPages - 1}
                    className={styles.paginationButton}
                >
                    末页
                </button>
            </div>
        );
    };

    // 创建问题处理
    const handleCreateQuestion = useCallback(() => {
        setShowCreateForm(true);
    }, []);

    // 创建成功回调
    const handleCreateSuccess = useCallback(() => {
        setShowCreateForm(false);
        fetchQuestions();
        fetchHotQuestions();
    }, [fetchQuestions, fetchHotQuestions]);

    // 渲染热门问题列表
    const renderHotQuestions = useCallback(() => {
        if (isHotQuestionsLoading) {
            return <div className={styles.hotQuestionsLoading}>加载中...</div>;
        }

        if (hotQuestionsError) {
            return <div className={styles.hotQuestionsError}>{hotQuestionsError}</div>;
        }

        return (
            <div className={styles.hotQuestionsList}>
                {hotQuestions.map((question) => (
                    <HotQuestionItem
                        key={question.id}
                        question={question}
                        onClick={handleQuestionClick}
                    />
                ))}
            </div>
        );
    }, [isHotQuestionsLoading, hotQuestionsError, hotQuestions, handleQuestionClick]);

    // 渲染加载状态
    if (isLoading) {
        return (
            <div className={styles.container}>
                <div className={styles.background}></div>
                <Navbar />
                <div className={styles.loadingContainer}>
                    <Loading size="lg" color="dark" />
                </div>
            </div>
        );
    }

    return (
        <div className={styles.container}>
            <Navbar />
            <div className={styles.background}></div>
            <div className={styles.contentWrapper}>
                {showCreateForm ? (
                    <React.Suspense fallback={
                        <div className={styles.loadingContainer}>
                            <Loading size="lg" color="dark" />
                        </div>
                    }>
                        <CreateQuestion
                            onCreateSuccess={handleCreateSuccess}
                            onCancel={() => setShowCreateForm(false)}
                        />
                    </React.Suspense>
                ) : (
                    <div className={styles.layout}>
                        {/* 左侧边栏 */}
                        <div className={styles.sidebar}>
                            <div className={styles.sidebarCard}>
                                {/* 创建问题按钮 */}
                                <button
                                    onClick={handleCreateQuestion}
                                    className={styles.createButton}
                                >
                                    发布问题
                                </button>

                                {/* 导航区域 */}
                                <nav className={styles.navigation}>
                                    <Link to="/question" className={styles.navLink}>问题中心</Link>
                                    <Link to="/my-questions" className={styles.navLink}>我的问题</Link>
                                    {isAdmin && (
                                        <Link to="/admin/questions" className={styles.navLink}>管理问题</Link>
                                    )}
                                </nav>

                                {/* 状态过滤导航 */}
                                <nav className={styles.navigation}>
                                    <button
                                        onClick={() => handleStatusChange('ALL')}
                                        className={status === 'ALL' ? styles.navButtonActive : styles.navButton}
                                    >
                                        全部问题
                                    </button>
                                    {['OPEN', 'IN_PROGRESS', 'RESOLVED'].map(statusType => (
                                        <button
                                            key={statusType}
                                            onClick={() => handleStatusChange(statusType)}
                                            className={status === statusType ? styles.navButtonActive : styles.navButton}
                                        >
                                            {getStatusText(statusType)}问题
                                        </button>
                                    ))}
                                </nav>

                                {/* 问题类型过滤器 */}
                                <QuestionTypeFilter
                                    selectedType={selectedType}
                                    onTypeChange={handleTypeChange}
                                />

                                {/* 分页信息 */}
                                <div className={styles.pageInfo}>
                                    共 {totalElements} 条数据
                                </div>
                            </div>

                            {/* 热门问题卡片 */}
                            <div className={`${styles.sidebarCard} ${styles.hotQuestionsCard}`}>
                                <h3 className={styles.hotQuestionsTitle}>热门问题</h3>
                                {renderHotQuestions()}
                            </div>
                        </div>

                        {/* 主内容区 */}
                        <div className={styles.mainContent}>
                            {error && (
                                <div className={styles.error}>{error}</div>
                            )}

                            <div className={styles.questionsList}>
                                {/* 顶部分页 */}
                                {renderPagination()}

                                {/* 问题列表 */}
                                {displayedQuestions.length > 0 ? (
                                    displayedQuestions.map(question => renderQuestionCard(question))
                                ) : (
                                    <EmptyState onCreateQuestion={handleCreateQuestion} />
                                )}

                                {/* 底部分页 */}
                                {renderPagination()}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default QuestionCenter;