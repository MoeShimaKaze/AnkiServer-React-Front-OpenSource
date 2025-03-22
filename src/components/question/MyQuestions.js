import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import Navbar from '../base/Navbar';
import Loading from '../utils/Loading';
import styles from '../../assets/css/question/MyQuestions.module.css';
import { toast } from 'react-toastify';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { getQuestionTypeText, getStatusText } from '../utils/map/questionTypeMap';
import defaultAvatarIcon from '../../assets/icon/user.png';
import { fetchAvatarsByUserIds } from '../utils/api/Avatars';
import ImageViewer from "../utils/ImageViewer";

// 修改组件定义，接收从ProtectedRoute传递的props
const MyQuestions = ({ userId }) => {
    // 状态管理
    const [questions, setQuestions] = useState([]);
    const [activeTab, setActiveTab] = useState('active');
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [selectedImage, setSelectedImage] = useState(null);
    const [avatarMap, setAvatarMap] = useState({});

    // 分页状态
    const [currentPage, setCurrentPage] = useState(0);
    const [pageSize] = useState(10);
    const [totalPages, setTotalPages] = useState(0);
    const [totalElements, setTotalElements] = useState(0);

    // 详情视图状态
    const [selectedQuestion, setSelectedQuestion] = useState(null);

    // 获取用户问题列表 - 只处理列表数据，不处理详情
    const fetchQuestions = useCallback(async () => {
        try {
            setIsLoading(true);
            setError('');

            // 构建查询参数
            const params = {
                page: currentPage,
                size: pageSize
            };

            // 请求用户问题，添加分页参数
            const response = await axios.get(
                `http://127.0.0.1:8080/api/questions/user/${userId}`,
                {
                    params,
                    withCredentials: true
                }
            );

            // 解析分页响应数据
            if (response.data && response.data.content) {
                const questionsData = response.data.content || [];
                setTotalPages(response.data.totalPages || 0);
                setTotalElements(response.data.totalElements || 0);

                // 获取所有相关用户的ID
                const userIds = new Set();
                questionsData.forEach(question => {
                    userIds.add(question.userId);
                    if (question.replies && question.replies.length > 0) {
                        // 限制处理的回复数量，避免过多的头像请求
                        const limitedReplies = question.replies.slice(0, 10);
                        limitedReplies.forEach(reply => userIds.add(reply.userId));
                    }
                });

                // 获取用户头像
                const avatars = await fetchAvatarsByUserIds([...userIds]);
                setAvatarMap(prev => ({...prev, ...avatars}));
                setQuestions(questionsData);

                // 重要：移除了对selectedQuestion的处理
            } else {
                throw new Error('响应格式不正确');
            }
        } catch (error) {
            console.error('获取问题列表失败:', error);
            setError('获取问题列表失败，请稍后重试');
            toast.error('获取问题列表失败');
        } finally {
            setIsLoading(false);
        }
    }, [userId, currentPage, pageSize]); // 移除selectedQuestion依赖

    // 初始化加载列表数据
    useEffect(() => {
        fetchQuestions();
    }, [fetchQuestions]);

    // 查看问题详情 - 优化加载逻辑，防止阻塞心跳检测
    const handleViewQuestionDetail = async (questionId) => {
        setIsLoading(true);

        // 将异步操作放入微任务队列，避免长时间阻塞主线程
        await new Promise(resolve => {
            // 使用setTimeout确保UI有机会更新
            setTimeout(async () => {
                try {
                    const response = await axios.get(
                        `http://127.0.0.1:8080/api/questions/${questionId}`,
                        { withCredentials: true }
                    );

                    const questionData = response.data;

                    // 优化头像加载 - 只加载必要的头像
                    const userIds = new Set();
                    userIds.add(questionData.userId);

                    // 限制处理的回复数量
                    if (questionData.replies && questionData.replies.length > 0) {
                        // 如果回复超过20条，只处理前20条，避免过多请求
                        const limitedReplies = questionData.replies.slice(0, 20);
                        limitedReplies.forEach(reply => userIds.add(reply.userId));
                    }

                    // 只获取新头像，避免重复请求
                    const newUserIds = [...userIds].filter(id => !avatarMap[id]);
                    if (newUserIds.length > 0) {
                        const newAvatars = await fetchAvatarsByUserIds(newUserIds);
                        setAvatarMap(prev => ({...prev, ...newAvatars}));
                    }

                    // 更新详情数据
                    setSelectedQuestion(questionData);
                } catch (error) {
                    console.error('获取问题详情失败:', error);
                    toast.error('获取问题详情失败');
                    setError('获取问题详情失败，请稍后重试');
                }

                setIsLoading(false);
                resolve();
            }, 10); // 小延迟，让其他任务有机会执行
        });
    };

    // 问题操作处理函数 - 现在在详情模式下重新加载详情
    const handleCloseQuestion = async (questionId) => {
        if (!window.confirm('确定要关闭此问题吗？')) return;

        try {
            await axios.post(
                `http://127.0.0.1:8080/api/questions/${questionId}/close`,
                {},
                { withCredentials: true }
            );
            toast.success('已关闭问题');

            // 根据当前视图状态决定刷新哪些数据
            if (selectedQuestion && selectedQuestion.id === questionId) {
                // 如果在详情视图中，重新加载详情
                await handleViewQuestionDetail(questionId);
            } else {
                // 否则刷新列表
                await fetchQuestions();
            }
        } catch (error) {
            console.error('关闭问题失败:', error);
            toast.error('关闭问题失败');
        }
    };

    // 标记问题为已解决 - 也分别处理列表和详情刷新
    const handleMarkResolved = async (questionId) => {
        if (!window.confirm('确定要将此问题标记为已解决吗？')) {
            return;
        }

        try {
            await axios.post(
                `http://127.0.0.1:8080/api/questions/${questionId}/resolve`,
                {},
                { withCredentials: true }
            );
            toast.success('问题已标记为已解决');

            // 根据当前视图状态决定刷新哪些数据
            if (selectedQuestion && selectedQuestion.id === questionId) {
                // 如果在详情视图中，重新加载详情
                await handleViewQuestionDetail(questionId);
            } else {
                // 否则刷新列表
                await fetchQuestions();
            }
        } catch (error) {
            console.error('标记问题已解决失败:', error);
            toast.error('标记问题已解决失败');
        }
    };

    // 删除问题 - 删除后总是返回列表视图
    const handleDeleteQuestion = async (questionId) => {
        if (!window.confirm('确定要删除这个问题吗？此操作无法撤销。')) {
            return;
        }

        try {
            await axios.delete(
                `http://127.0.0.1:8080/api/questions/${questionId}`,
                { withCredentials: true }
            );
            toast.success('问题已删除');

            // 删除后清除详情视图，回到列表
            setSelectedQuestion(null);
            await fetchQuestions();
        } catch (error) {
            console.error('删除问题失败:', error);
            toast.error('删除问题失败');
        }
    };

    // 接受解决方案
    const handleAcceptSolution = async (questionId, replyId) => {
        try {
            await axios.post(
                `http://127.0.0.1:8080/api/questions/${questionId}/replies/${replyId}/accept`,
                {},
                { withCredentials: true }
            );
            toast.success('已接受解决方案');

            // 更新详情视图
            if (selectedQuestion && selectedQuestion.id === questionId) {
                await handleViewQuestionDetail(questionId);
            }
        } catch (error) {
            console.error('接受解决方案失败:', error);
            toast.error('接受解决方案失败');
        }
    };

    // 拒绝解决方案
    const handleRejectSolution = async (questionId, replyId) => {
        try {
            await axios.post(
                `http://127.0.0.1:8080/api/questions/${questionId}/replies/${replyId}/reject`,
                {},
                { withCredentials: true }
            );
            toast.success('已拒绝解决方案');

            // 更新详情视图
            if (selectedQuestion && selectedQuestion.id === questionId) {
                await handleViewQuestionDetail(questionId);
            }
        } catch (error) {
            console.error('拒绝解决方案失败:', error);
            toast.error('拒绝解决方案失败');
        }
    };

    // 返回列表视图
    const handleBackToList = () => {
        setSelectedQuestion(null);
        // 可选：刷新列表数据
        fetchQuestions();
    };

    // 页码变更处理
    const handlePageChange = (newPage) => {
        setCurrentPage(newPage);
    };

    // 切换活动标签
    const handleTabChange = (tab) => {
        setActiveTab(tab);
        setCurrentPage(0); // 重置页码
        setSelectedQuestion(null); // 清除已选择的问题
    };

    // 渲染分页导航
    const renderPagination = () => {
        if (totalPages <= 1) return null;

        return (
            <div className={styles.pagination}>
                <button
                    onClick={() => handlePageChange(0)}
                    disabled={currentPage === 0}
                    className={styles.paginationButton}
                >
                    首页
                </button>
                <button
                    onClick={() => handlePageChange(Math.max(0, currentPage - 1))}
                    disabled={currentPage === 0}
                    className={styles.paginationButton}
                >
                    上一页
                </button>

                {/* 显示最多5个页码按钮 */}
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
                            onClick={() => handlePageChange(pageToShow)}
                            className={`${styles.paginationButton} ${currentPage === pageToShow ? styles.activePage : ''}`}
                        >
                            {pageToShow + 1}
                        </button>
                    );
                })}

                <button
                    onClick={() => handlePageChange(Math.min(totalPages - 1, currentPage + 1))}
                    disabled={currentPage === totalPages - 1}
                    className={styles.paginationButton}
                >
                    下一页
                </button>
                <button
                    onClick={() => handlePageChange(totalPages - 1)}
                    disabled={currentPage === totalPages - 1}
                    className={styles.paginationButton}
                >
                    末页
                </button>
            </div>
        );
    };

    // 渲染工具栏
    const renderToolbar = () => (
        <div className={styles.toolbar}>
            <div className={styles.tabButtons}>
                <button
                    className={`${styles.tabButton} ${activeTab === 'active' ? styles.active : ''}`}
                    onClick={() => handleTabChange('active')}
                >
                    进行中的问题
                </button>
                <button
                    className={`${styles.tabButton} ${activeTab === 'closed' ? styles.active : ''}`}
                    onClick={() => handleTabChange('closed')}
                >
                    已结束的问题
                </button>
            </div>

            {/* 显示总数据信息 */}
            <div className={styles.pageInfo}>
                共 {totalElements} 条数据
            </div>
        </div>
    );

    // 渲染问题列表或详情
    const renderQuestions = () => {
        // 如果选中了某个问题，显示详情视图
        if (selectedQuestion) {
            return renderQuestionDetail(selectedQuestion);
        }

        const filteredQuestions = questions.filter(question => {
            const isActive = !['RESOLVED', 'CLOSED'].includes(question.status);
            return (activeTab === 'active' && isActive) || (activeTab === 'closed' && !isActive);
        });

        if (filteredQuestions.length === 0) {
            return (
                <div className={styles.noQuestions}>
                    当前没有{activeTab === 'active' ? '进行中的' : '已结束的'}问题
                </div>
            );
        }

        return (
            <div className={styles.questionsList}>
                {filteredQuestions.map((question, index) => renderQuestionCard(question, index + 1))}
                {renderPagination()} {/* 添加分页组件 */}
            </div>
        );
    };

    // 渲染问题卡片
    const renderQuestionCard = (question, index) => (
        <div key={question.id} className={styles.questionCard}>
            <div className={styles.questionHeader}>
                <div className={styles.questionMeta}>
                    <span className={styles.typeTag}>
                        {getQuestionTypeText(question.questionType)}
                    </span>
                    <span className={styles.statusTag}>
                        {getStatusText(question.status)}
                    </span>
                </div>
                <h3 className={styles.questionTitle}>
                    #{index} {question.shortTitle}
                </h3>
                <span className={styles.postTime}>
                    {new Date(question.createdAt).toLocaleString()}
                </span>
            </div>

            <div className={styles.questionStats}>
                <span>浏览 {question.viewCount}</span>
                <span>回复 {question.replyCount || question.replies?.length || 0}</span>
            </div>

            <div className={styles.questionActions}>
                <button
                    onClick={() => handleViewQuestionDetail(question.id)}
                    className={styles.viewButton}
                >
                    查看详情
                </button>
                {question.status === 'OPEN' && (
                    <button
                        onClick={() => handleCloseQuestion(question.id)}
                        className={styles.closeButton}
                    >
                        关闭问题
                    </button>
                )}
                {question.status === 'IN_PROGRESS' && (
                    <button
                        onClick={() => handleMarkResolved(question.id)}
                        className={styles.resolveButton}
                    >
                        标记已解决
                    </button>
                )}
                <button
                    onClick={() => handleDeleteQuestion(question.id)}
                    className={styles.deleteButton}
                >
                    删除问题
                </button>
            </div>
        </div>
    );

    // 渲染问题详情
    const renderQuestionDetail = (question) => (
        <div className={styles.questionDetail}>
            <div className={styles.questionHeader}>
                <div className={styles.questionMeta}>
                    <span className={styles.typeTag}>
                        {getQuestionTypeText(question.questionType)}
                    </span>
                    <span className={styles.statusTag}>
                        {getStatusText(question.status)}
                    </span>
                    <h1 className={styles.questionTitle}>{question.shortTitle}</h1>
                    <span className={styles.postTime}>
                        {new Date(question.createdAt).toLocaleString()}
                    </span>
                </div>
            </div>

            <div className={styles.questionContent}>
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {question.description}
                </ReactMarkdown>

                {question.imageUrl && (
                    <div className={styles.questionImage}>
                        <img
                            src={question.imageUrl}
                            alt="问题图片"
                            className={styles.thumbnailImage}
                            onClick={() => setSelectedImage(question.imageUrl)}
                        />
                    </div>
                )}
            </div>

            <div className={styles.questionStats}>
                <span>浏览 {question.viewCount}</span>
                <span>回复 {question.replyCount || question.replies?.length || 0}</span>
            </div>

            <div className={styles.repliesSection}>
                {question.replies?.map((reply, index) => (
                    <div key={reply.id} className={styles.replyCard}>
                        <div className={styles.replyHeader}>
                            <div className={styles.userInfo}>
                                <img
                                    src={avatarMap[reply.userId] || defaultAvatarIcon}
                                    alt={reply.userName}
                                    className={styles.userAvatar}
                                />
                                <span className={styles.username}>{reply.userName}</span>
                            </div>
                            <span className={styles.replyNumber}>#{index + 1}</span>
                        </div>

                        <div className={styles.replyContent}>
                            <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                {reply.content}
                            </ReactMarkdown>
                        </div>

                        <div className={styles.replyFooter}>
                            <span className={styles.replyTime}>
                                回复于 {new Date(reply.createdAt).toLocaleString()}
                            </span>

                            <div className={styles.replyActions}>
                                {reply.applied && !reply.rejected && question.status === 'IN_PROGRESS' && (
                                    <>
                                        {/* 仅在方案被接受且问题状态为IN_PROGRESS时显示"标记已解决"按钮 */}
                                        {question.acceptedUserId === reply.userId && (
                                            <button
                                                onClick={() => handleMarkResolved(question.id)}
                                                className={`${styles.resolveButton}`}
                                            >
                                                标记已解决
                                            </button>
                                        )}
                                        {/* 仅在方案未被接受时显示接受/拒绝按钮 */}
                                        {!question.acceptedUserId && (
                                            <>
                                                <button
                                                    onClick={() => handleAcceptSolution(question.id, reply.id)}
                                                    className={styles.acceptButton}
                                                >
                                                    接受解决方案
                                                </button>
                                                <button
                                                    onClick={() => handleRejectSolution(question.id, reply.id)}
                                                    className={styles.rejectButton}
                                                >
                                                    拒绝解决方案
                                                </button>
                                            </>
                                        )}
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* 返回列表按钮 */}
            <div className={styles.backToList}>
                <button
                    onClick={handleBackToList}
                    className={styles.backButton}
                >
                    返回列表
                </button>
            </div>
        </div>
    );

    // 显示加载中状态
    if (isLoading) {
        return (
            <div className={styles.container}>
                <Navbar />
                <div className={styles.loadingContainer}>
                    <Loading size="lg" color="dark" />
                </div>
            </div>
        );
    }

    return (
        <div className={styles.container}>
            <div className={styles.background}></div>
            <div className={styles.overlay}></div>
            <Navbar />
            <div className={styles.content}>
                <div className={styles.sidebar}>
                    <h2>我的问题</h2>
                    <nav className={styles.navigation}>
                        <a href="/question" className={styles.navLink}>问题中心</a>
                        <a href="/my-questions" className={`${styles.navLink} ${styles.active}`}>我的问题</a>
                    </nav>
                </div>

                <div className={styles.mainContent}>
                    <h1 className={styles.title}>我的问题</h1>
                    {error && <div className={styles.error}>{error}</div>}

                    {!selectedQuestion && renderToolbar()}
                    {renderQuestions()}
                </div>
            </div>

            {selectedImage && (
                <ImageViewer
                    imageUrl={selectedImage}
                    onClose={() => setSelectedImage(null)}
                    alt="问题图片"
                />
            )}
        </div>
    );
};

export default MyQuestions;