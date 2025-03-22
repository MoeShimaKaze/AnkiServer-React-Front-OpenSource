import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import Navbar from '../base/Navbar';
import Loading from '../utils/Loading';
import styles from '../../assets/css/question/AdminQuestionCenter.module.css';
import { getQuestionTypeText, getStatusText } from '../utils/map/questionTypeMap';
import ImageViewer from '../utils/ImageViewer';
import { toast } from 'react-toastify';
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import defaultAvatarIcon from '../../assets/icon/user.png';
import { fetchAvatarsByUserIds } from '../utils/api/Avatars';
import QuestionTypeFilter from '../utils/filter/QuestionTypeFilter';

// 组件接收从ProtectedRoute传递的属性
const AdminQuestionCenter = ({ isAdmin }) => {
    // 状态管理
    const [questions, setQuestions] = useState([]);
    const [filteredQuestions, setFilteredQuestions] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [selectedImage, setSelectedImage] = useState(null);
    const [status, setStatus] = useState('ALL'); // 默认显示所有状态
    const [expandedQuestionId, setExpandedQuestionId] = useState(null);
    const [avatarMap, setAvatarMap] = useState({});
    const [selectedType, setSelectedType] = useState('ALL');

    // 分页状态
    const [currentPage, setCurrentPage] = useState(0);
    const [pageSize] = useState(10); // 移除setPageSize，使用常量
    const [totalPages, setTotalPages] = useState(0);
    const [totalElements, setTotalElements] = useState(0);

    // 获取问题列表 - 支持分页和筛选
    const fetchQuestions = useCallback(async () => {
        try {
            setIsLoading(true);
            setError('');

            // 添加分页参数
            const params = {
                page: currentPage,
                size: pageSize
            };

            // 仅当选择了特定状态时添加状态参数
            if (status !== 'ALL') {
                params.status = status;
            }

            const response = await axios.get(`http://127.0.0.1:8080/api/questions`, {
                params,
                withCredentials: true
            });

            // 处理分页响应数据
            if (response.data && response.data.content) {
                const questionData = response.data.content;
                setTotalPages(response.data.totalPages || 0);
                setTotalElements(response.data.totalElements || 0);
                setQuestions(questionData);

                // 获取用户头像
                const userIds = new Set();
                questionData.forEach(question => {
                    userIds.add(question.userId);
                    question.replies?.forEach(reply => userIds.add(reply.userId));
                });
                const avatars = await fetchAvatarsByUserIds([...userIds]);
                setAvatarMap(avatars);

                // 应用类型筛选
                const filtered = questionData.filter(q =>
                    selectedType === 'ALL' || q.questionType === selectedType
                );
                setFilteredQuestions(filtered);
            } else {
                throw new Error('响应格式不正确');
            }
        } catch (error) {
            console.error('获取问题列表失败:', error);
            setError(error.response?.data || '获取问题列表失败');
        } finally {
            setIsLoading(false);
        }
    }, [currentPage, pageSize, status, selectedType]);

    // 初始化和刷新问题列表
    useEffect(() => {
        fetchQuestions();
        const refreshInterval = setInterval(fetchQuestions, 300000); // 5分钟刷新一次
        return () => clearInterval(refreshInterval);
    }, [fetchQuestions]);

    // 状态变更时重置页码
    const handleStatusChange = useCallback((newStatus) => {
        setStatus(newStatus);
        setCurrentPage(0); // 重置页码
        setExpandedQuestionId(null); // 清除展开的问题
    }, []);

    // 类型变更时重置页码和重新筛选
    const handleTypeChange = useCallback((type) => {
        setSelectedType(type);
        setCurrentPage(0); // 重置页码
        setExpandedQuestionId(null); // 清除展开的问题

        // 只在客户端筛选类型，不发送新请求
        const filtered = questions.filter(q =>
            type === 'ALL' || q.questionType === type
        );
        setFilteredQuestions(filtered);
    }, [questions]);

    // 页码变更处理
    const handlePageChange = (newPage) => {
        setCurrentPage(newPage);
        setExpandedQuestionId(null); // 清除展开的问题
    };

    // 删除问题处理
    const handleDeleteQuestion = async (questionId) => {
        if (!window.confirm('确定要删除该问题吗？此操作不可恢复。')) return;
        try {
            await axios.delete(`http://127.0.0.1:8080/api/questions/${questionId}`, {
                withCredentials: true
            });
            toast.success('问题删除成功');
            await fetchQuestions();
        } catch (error) {
            console.error('删除问题失败:', error);
            toast.error('删除问题失败，请重试');
        }
    };

    // 关闭问题处理
    const handleCloseQuestion = async (questionId) => {
        try {
            await axios.post(`http://127.0.0.1:8080/api/questions/${questionId}/close`, {}, {
                withCredentials: true
            });
            toast.success('问题已关闭');
            await fetchQuestions();
        } catch (error) {
            console.error('关闭问题失败:', error);
            toast.error('关闭问题失败，请重试');
        }
    };

    // 切换问题展开状态
    const toggleQuestionExpand = (questionId) => {
        setExpandedQuestionId(expandedQuestionId === questionId ? null : questionId);
    };

    // 处理图片点击
    const handleImageClick = (imageUrl) => {
        setSelectedImage(imageUrl);
    };

    // 删除回复处理
    const handleDeleteReply = async (questionId, replyId) => {
        if (!window.confirm('确定要删除这条回复吗？此操作不可撤销。')) return;
        try {
            await axios.delete(`http://127.0.0.1:8080/api/questions/${questionId}/replies/${replyId}`, {
                withCredentials: true
            });
            // 更新本地状态
            setQuestions(prev => prev.map(q =>
                q.id === questionId
                    ? {...q, replies: q.replies.filter(r => r.id !== replyId)}
                    : q
            ));
            setFilteredQuestions(prev => prev.map(q =>
                q.id === questionId
                    ? {...q, replies: q.replies.filter(r => r.id !== replyId)}
                    : q
            ));
            toast.success('回复删除成功');
        } catch (error) {
            console.error('删除回复失败:', error);
            toast.error(error.response?.data || '删除回复失败，请重试');
        }
    };

    // 渲染分页控件
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

                {/* 显示页码 */}
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

    // 渲染问题详情
    const renderQuestionDetail = (question) => (
        <div className={styles.questionDetails}>
            <div className={styles.descriptionSection}>
                <h4>问题描述：</h4>
                <div className={styles.markdownWrapper}>
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {question.description}
                    </ReactMarkdown>
                </div>
                <div className={styles.postTime}>
                    发布于 {new Date(question.createdAt).toLocaleString()}
                </div>
                {question.imageUrl && (
                    <div className={styles.imageContainer}>
                        <img
                            src={question.imageUrl}
                            alt="问题图片"
                            className={styles.questionImage}
                            onClick={() => handleImageClick(question.imageUrl)}
                        />
                    </div>
                )}
            </div>
            <div className={styles.repliesSection}>
                <h4>回复列表：({question.replyCount || question.replies?.length || 0})</h4>
                {question.replies?.length > 0 ? (
                    question.replies.map(reply => (
                        <div key={reply.id} className={styles.replyItem}>
                            <div className={styles.replyHeader}>
                                <div className={styles.replyUserInfo}>
                                    <img
                                        src={avatarMap[reply.userId] || defaultAvatarIcon}
                                        alt={reply.userName}
                                        className={styles.replyUserAvatar}
                                    />
                                    <div className={styles.replyUserDetails}>
                                        <span className={styles.replyUser}>{reply.userName}</span>
                                        <span className={styles.replyTime}>
                                            {new Date(reply.createdAt).toLocaleString()}
                                        </span>
                                    </div>
                                </div>
                                <div className={styles.replyActions}>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleDeleteReply(question.id, reply.id);
                                        }}
                                        className={styles.deleteReplyButton}
                                    >
                                        删除回复
                                    </button>
                                </div>
                            </div>
                            <div className={styles.replyContent}>
                                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                    {reply.content}
                                </ReactMarkdown>
                            </div>
                        </div>
                    ))
                ) : (
                    <p className={styles.noReplies}>暂无回复</p>
                )}
            </div>
        </div>
    );

    if (isLoading) {
        return (
            <div className={styles.container}>
                <Navbar />
                <div className={styles.loadingWrapper}>
                    <Loading size="lg" color="dark" />
                </div>
            </div>
        );
    }

    return (
        <div className={styles.container}>
            <Navbar />
            <div className={styles.background}></div>

            <div className={styles.pageHeader}>
                <h1>问题管理中心</h1>
            </div>

            <div className={styles.contentWrapper}>
                <div className={styles.layout}>
                    <div className={styles.sidebar}>
                        <div className={styles.filterSection}>
                            <h3>问题状态</h3>
                            <button
                                onClick={() => handleStatusChange('ALL')}
                                className={status === 'ALL' ? styles.activeFilter : styles.filterButton}
                            >
                                全部问题
                            </button>
                            {['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'].map(statusType => (
                                <button
                                    key={statusType}
                                    onClick={() => handleStatusChange(statusType)}
                                    className={status === statusType
                                        ? styles.activeFilter
                                        : styles.filterButton}
                                >
                                    {getStatusText(statusType)}
                                </button>
                            ))}
                        </div>

                        <div className={styles.filterSection}>
                            <QuestionTypeFilter
                                selectedType={selectedType}
                                onTypeChange={handleTypeChange}
                                showAllOption={true}
                            />
                        </div>

                        {/* 分页信息 */}
                        <div className={styles.filterSection}>
                            <div className={styles.pageInfo}>
                                共 {totalElements} 条数据
                            </div>
                        </div>
                    </div>

                    <div className={styles.mainContent}>
                        {error && <div className={styles.error}>{error}</div>}

                        {filteredQuestions.length > 0 ? (
                            <div className={styles.questionsList}>
                                {/* 顶部分页导航 */}
                                {renderPagination()}

                                {/* 问题列表 */}
                                {filteredQuestions.map(question => (
                                    <div key={question.id} className={styles.questionCard}>
                                        <div className={styles.questionHeader}>
                                            <div className={styles.headerTop}>
                                                <img
                                                    src={avatarMap[question.userId] || defaultAvatarIcon}
                                                    alt={question.userName}
                                                    className={styles.titleAvatar}
                                                />
                                                <div className={styles.headerText}>
                                                    <div className={styles.questionMeta}>
                                                    <span className={styles.questionType}>
                                                        {getQuestionTypeText(question.questionType)}
                                                    </span>
                                                        <span className={styles.questionStatus}>
                                                        {getStatusText(question.status)}
                                                    </span>
                                                    </div>
                                                    <h3 className={styles.questionTitle}>
                                                        {question.shortTitle}
                                                    </h3>
                                                </div>
                                            </div>
                                            <div className={styles.questionInfo}>
                                                <span>发布者：{question.userName}</span>
                                                <span>浏览量：{question.viewCount}</span>
                                                <span>回复数：{question.replyCount || question.replies?.length || 0}</span>
                                            </div>
                                        </div>

                                        <div className={styles.actionButtons}>
                                            <button
                                                onClick={() => toggleQuestionExpand(question.id)}
                                                className={styles.detailButton}
                                            >
                                                {expandedQuestionId === question.id ? '收起详情' : '查看详情'}
                                            </button>
                                            {question.status !== 'CLOSED' && (
                                                <button
                                                    onClick={() => handleCloseQuestion(question.id)}
                                                    className={styles.closeButton}
                                                >
                                                    关闭问题
                                                </button>
                                            )}
                                            <button
                                                onClick={() => handleDeleteQuestion(question.id)}
                                                className={styles.deleteButton}
                                            >
                                                删除问题
                                            </button>
                                        </div>

                                        {expandedQuestionId === question.id && renderQuestionDetail(question)}
                                    </div>
                                ))}

                                {/* 底部分页导航 */}
                                {renderPagination()}
                            </div>
                        ) : (
                            <div className={styles.emptyState}>
                                🕸️ 当前没有符合条件的问题
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {selectedImage && (
                <ImageViewer
                    imageUrl={selectedImage}
                    onClose={() => setSelectedImage(null)}
                />
            )}
        </div>
    );
};

export default AdminQuestionCenter;