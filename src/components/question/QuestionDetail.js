import React, {useState, useEffect, useCallback} from 'react';
import axios from 'axios';
import { useParams } from 'react-router-dom';
import Navbar from '../base/Navbar';
import Loading from '../utils/Loading';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { toast } from 'react-toastify';
import {
    getQuestionTypeText,
    getStatusText,
    getStatusStyle,
    isFinalState
} from '../utils/map/questionTypeMap';
import { fetchAvatarsByUserIds } from '../utils/api/Avatars';
import styles from '../../assets/css/question/QuestionDetail.module.css';
import defaultAvatarIcon from '../../assets/icon/user.png';

// 图片预览组件
const ImagePreview = ({ imageUrl, onClose }) => {
    return (
        <div className={styles.imagePreviewOverlay} onClick={onClose}>
            <img
                src={imageUrl}
                alt="图片预览"
                className={styles.imagePreviewContent}
                onClick={(e) => e.stopPropagation()}
            />
        </div>
    );
};

// 组件接收从ProtectedRoute传递的用户ID
const QuestionDetail = ({ userId }) => {
    // 路由相关状态
    const { questionId } = useParams();

    // 状态管理
    const [question, setQuestion] = useState(null);
    const [avatarMap, setAvatarMap] = useState({});
    const [replyContent, setReplyContent] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isPreviewMode, setIsPreviewMode] = useState(false);
    const [previewImage, setPreviewImage] = useState(null);
    const [isApplying, setIsApplying] = useState(false);
    const [applyError, setApplyError] = useState('');
    const [showReplyForm, setShowReplyForm] = useState(false);
    const [visibleContactInfo, setVisibleContactInfo] = useState(new Set());
    const [showContactInfo, setShowContactInfo] = useState(null);

    // 新增 - 回复分页状态
    const [currentReplyPage, setCurrentReplyPage] = useState(0);
    const [replyPageSize] = useState(10);
    const [totalReplyPages, setTotalReplyPages] = useState(0);
    const [isRepliesLoading, setIsRepliesLoading] = useState(false);

    // 获取问题详情 - 无需登录检查
    useEffect(() => {
        const fetchQuestionDetail = async () => {
            try {
                setIsLoading(true);
                const response = await axios.get(
                    `http://127.0.0.1:8080/api/questions/${questionId}`,
                    { withCredentials: true }
                );

                const questionData = response.data;
                const userIds = new Set([
                    questionData.userId,
                    ...(questionData.replies || []).map(reply => reply.userId)
                ]);

                const avatars = await fetchAvatarsByUserIds([...userIds]);
                setAvatarMap(avatars);
                setQuestion(questionData);

                // 计算总页数
                if (questionData.replyCount > 0) {
                    setTotalReplyPages(Math.ceil(questionData.replyCount / replyPageSize));
                }
            } catch (error) {
                console.error('获取问题详情失败:', error);
                setError(error.response?.data || '获取问题详情失败');
                toast.error('获取问题详情失败');
            } finally {
                setIsLoading(false);
            }
        };

        fetchQuestionDetail();
    }, [questionId, replyPageSize]);

    // 新增 - 加载特定页的回复
    const loadRepliesPage = async (page) => {
        if (page === currentReplyPage && question.replies && question.replies.length > 0) {
            return; // 如果已经是当前页且已有数据，不重复加载
        }

        try {
            setIsRepliesLoading(true);
            const response = await axios.get(
                `http://127.0.0.1:8080/api/questions/${questionId}/replies`,
                {
                    params: { page, size: replyPageSize },
                    withCredentials: true
                }
            );

            // 更新回复数据
            const repliesData = response.data.content;

            // 获取新回复中的用户头像
            const userIds = new Set(repliesData.map(reply => reply.userId));
            let updatedAvatarMap = {...avatarMap};

            // 只获取没有的头像
            const newUserIds = [...userIds].filter(id => !updatedAvatarMap[id]);
            if (newUserIds.length > 0) {
                const newAvatars = await fetchAvatarsByUserIds(newUserIds);
                updatedAvatarMap = {...updatedAvatarMap, ...newAvatars};
                setAvatarMap(updatedAvatarMap);
            }

            // 更新问题中的回复
            setQuestion(prev => ({
                ...prev,
                replies: repliesData
            }));

            setCurrentReplyPage(page);
        } catch (error) {
            console.error('加载回复失败:', error);
            toast.error('加载回复页面失败');
        } finally {
            setIsRepliesLoading(false);
        }
    };

    // Markdown工具栏功能
    const addMarkdownSyntax = (syntax) => {
        const textarea = document.querySelector('textarea[name="replyContent"]');
        if (!textarea) return;

        const start = textarea.selectionStart || 0;
        const end = textarea.selectionEnd || 0;
        const text = textarea.value || '';
        const before = text.substring(0, start);
        const selection = text.substring(start, end);
        const after = text.substring(end);

        let newText = '';
        let newCursorPos = start;
        let placeholder = '';

        switch (syntax) {
            case 'bold':
                placeholder = '粗体文本';
                newText = `${before}**${selection || placeholder}**${after}`;
                newCursorPos = start + 2;
                break;
            case 'italic':
                placeholder = '斜体文本';
                newText = `${before}_${selection || placeholder}_${after}`;
                newCursorPos = start + 1;
                break;
            case 'code':
                placeholder = '代码块';
                newText = `${before}\`\`\`\n${selection || placeholder}\n\`\`\`${after}`;
                newCursorPos = start + 4;
                break;
            case 'link':
                placeholder = '链接文本';
                newText = `${before}[${selection || placeholder}](url)${after}`;
                newCursorPos = start + 1;
                break;
            case 'list':
                placeholder = '列表项';
                newText = `${before}\n- ${selection || placeholder}${after}`;
                newCursorPos = start + 3;
                break;
            default:
                return;
        }

        setReplyContent(newText);

        setTimeout(() => {
            try {
                textarea.focus();
                const selectionLength = (selection || placeholder).length;
                textarea.setSelectionRange(newCursorPos, newCursorPos + selectionLength);
            } catch (error) {
                console.warn('设置光标位置失败:', error);
            }
        }, 0);
    };

    // 提交回复
    const handleSubmitReply = async (e) => {
        e.preventDefault();
        if (!replyContent.trim()) {
            setError('回复内容不能为空');
            toast.error('回复内容不能为空');
            return;
        }

        try {
            setIsSubmitting(true);
            const response = await axios.post(
                `http://127.0.0.1:8080/api/questions/${questionId}/replies`,
                { content: replyContent },
                { withCredentials: true }
            );

            if (response.data) {
                setQuestion(response.data);
                const userIds = new Set([
                    response.data.userId,
                    ...(response.data.replies || []).map(reply => reply.userId)
                ]);
                const avatars = await fetchAvatarsByUserIds([...userIds]);
                setAvatarMap(avatars);

                // 更新总页数
                if (response.data.replyCount > 0) {
                    setTotalReplyPages(Math.ceil(response.data.replyCount / replyPageSize));
                }

                // 自动跳到第一页查看最新回复
                setCurrentReplyPage(0);

                setReplyContent('');
                setError('');
                setIsPreviewMode(false);
                setShowReplyForm(false);
                toast.success('回复发送成功');
            }
        } catch (error) {
            const errorMessage = error.response?.data || '发送回复失败';
            setError(typeof errorMessage === 'object' ? JSON.stringify(errorMessage) : errorMessage);
            toast.error('发送回复失败');
        } finally {
            setIsSubmitting(false);
        }
    };

    // 申请解决问题
    const handleApplyToSolve = async (replyId) => {
        try {
            setIsApplying(true);
            setApplyError('');

            await axios.post(
                `http://127.0.0.1:8080/api/questions/${questionId}/replies/${replyId}/apply`,
                {},
                { withCredentials: true }
            );

            const updatedResponse = await axios.get(
                `http://127.0.0.1:8080/api/questions/${questionId}`,
                { withCredentials: true }
            );
            setQuestion(updatedResponse.data);

            // 更新总页数
            if (updatedResponse.data.replyCount > 0) {
                setTotalReplyPages(Math.ceil(updatedResponse.data.replyCount / replyPageSize));
            }

            toast.success('申请已提交成功');
        } catch (error) {
            console.error('申请解决失败:', error);
            setApplyError(error.response?.data || '申请解决失败');
            toast.error('申请提交失败');
        } finally {
            setIsApplying(false);
        }
    };

    // 处理联系信息显示/隐藏
    const toggleContactInfo = useCallback((replyId) => {
        setVisibleContactInfo(prev => {
            const newSet = new Set(prev);
            if (newSet.has(replyId)) {
                newSet.delete(replyId);
            } else {
                newSet.add(replyId);
            }
            return newSet;
        });
    }, []);

    // 新增 - 渲染分页控件
    const renderPagination = () => {
        if (totalReplyPages <= 1) return null;

        return (
            <div className={styles.replyPagination}>
                <div className={styles.paginationInfo}>
                    共 {question.replyCount} 条回复，第 {currentReplyPage + 1}/{totalReplyPages} 页
                </div>
                <div className={styles.paginationButtons}>
                    <button
                        className={styles.paginationButton}
                        onClick={() => loadRepliesPage(0)}
                        disabled={currentReplyPage === 0 || isRepliesLoading}
                    >
                        首页
                    </button>

                    <button
                        className={styles.paginationButton}
                        onClick={() => loadRepliesPage(currentReplyPage - 1)}
                        disabled={currentReplyPage === 0 || isRepliesLoading}
                    >
                        上一页
                    </button>

                    {/* 动态生成页码按钮 */}
                    {Array.from({ length: Math.min(5, totalReplyPages) }, (_, i) => {
                        let pageNum;
                        // 处理页码逻辑，显示当前页附近的页码
                        if (totalReplyPages <= 5) {
                            // 如果总页数少于5，直接显示所有页
                            pageNum = i;
                        } else if (currentReplyPage < 2) {
                            // 如果当前页靠前，显示前5页
                            pageNum = i;
                        } else if (currentReplyPage > totalReplyPages - 3) {
                            // 如果当前页靠后，显示后5页
                            pageNum = totalReplyPages - 5 + i;
                        } else {
                            // 否则显示当前页附近的页码
                            pageNum = currentReplyPage - 2 + i;
                        }

                        return (
                            <button
                                key={pageNum}
                                className={`${styles.paginationButton} ${currentReplyPage === pageNum ? styles.activePage : ''}`}
                                onClick={() => loadRepliesPage(pageNum)}
                                disabled={isRepliesLoading}
                            >
                                {pageNum + 1}
                            </button>
                        );
                    })}

                    <button
                        className={styles.paginationButton}
                        onClick={() => loadRepliesPage(currentReplyPage + 1)}
                        disabled={currentReplyPage === totalReplyPages - 1 || isRepliesLoading}
                    >
                        下一页
                    </button>

                    <button
                        className={styles.paginationButton}
                        onClick={() => loadRepliesPage(totalReplyPages - 1)}
                        disabled={currentReplyPage === totalReplyPages - 1 || isRepliesLoading}
                    >
                        末页
                    </button>
                </div>
            </div>
        );
    };

    // 渲染解决按钮
    const renderSolveButton = (reply) => {
        // 如果该回复是被接受的解决方案
        if (question.acceptedUserId === reply.userId) {
            const isContactVisible = visibleContactInfo.has(reply.id);

            return (
                <div className={styles.solutionContainer}>
                    <button
                        className={`${styles.applyButton} ${styles.accepted} ${isContactVisible ? styles.active : ''}`}
                        onClick={() => toggleContactInfo(reply.id)}
                    >
                        {isContactVisible ? '隐藏联系方式' : '已被采纳的方案 - 点击查看联系方式'}
                    </button>
                    {isContactVisible && (
                        <div className={styles.contactInfo}>
                            <h4>联系方式</h4>
                            <p><strong>联系人：</strong>{question.contactName}</p>
                            <p><strong>联系方式：</strong>{question.contactInfo}</p>
                        </div>
                    )}
                </div>
            );
        }

        // 回复者查看按钮逻辑中的相关部分
        if (userId === reply.userId && question.acceptedUserId === userId) {
            const isContactVisible = visibleContactInfo.has(reply.id);

            return (
                <div className={styles.solutionContainer}>
                    <button
                        className={`${styles.applyButton} ${styles.accepted} ${isContactVisible ? styles.active : ''}`}
                        onClick={() => toggleContactInfo(reply.id)}
                    >
                        {isContactVisible ? '隐藏联系方式' : '解决方案已被接受 - 点击查看联系方式'}
                    </button>
                    {isContactVisible && (
                        <div className={styles.contactInfo}>
                            <h4>联系方式</h4>
                            <p><strong>联系人：</strong>{question.contactName}</p>
                            <p><strong>联系方式：</strong>{question.contactInfo}</p>
                        </div>
                    )}
                </div>
            );
        }

        // 问题发布者查看按钮逻辑
        if (userId === question.userId) {
            // 如果当前回复正在申请解决且问题状态为IN_PROGRESS
            if (reply.applied && question.status === 'IN_PROGRESS' &&
                question.acceptedUserId === reply.userId) {
                return (
                    <div className={styles.solutionButtons}>
                    <span className={styles.acceptedTag}>
                        已接受此解决方案
                    </span>
                    </div>
                );
            }
            // 如果方案被拒绝
            if (reply.rejected) {
                return (
                    <span className={styles.rejectedTag}>
                    方案已被拒绝
                </span>
                );
            }
            return null;
        }

        // 回复者查看按钮逻辑
        if (userId === reply.userId) {
            // 如果是当前用户的回复且已被接受
            if (question.acceptedUserId === userId) {
                return (
                    <div>
                        <button
                            className={`${styles.applyButton} ${styles.accepted}`}
                            onClick={() => setShowContactInfo(reply.id)}
                        >
                            解决方案已被接受 - 点击查看联系方式
                        </button>
                        {showContactInfo === reply.id && (
                            <div className={styles.contactInfo}>
                                <h4>联系方式</h4>
                                <p><strong>联系人：</strong>{question.contactName}</p>
                                <p><strong>联系方式：</strong>{question.contactInfo}</p>
                            </div>
                        )}
                    </div>
                );
            }

            // 如果方案被拒绝
            if (reply.rejected) {
                return (
                    <button
                        className={`${styles.applyButton} ${styles.rejected}`}
                        disabled={true}
                    >
                        方案已被拒绝
                    </button>
                );
            }

            // 如果问题已有被接受的解决方案
            if (question.acceptedUserId) {
                return (
                    <button
                        className={`${styles.applyButton} ${styles.disabled}`}
                        disabled={true}
                    >
                        问题已有解决方案
                    </button>
                );
            }

            // 检查是否可以申请解决
            const canApply = question.status === 'OPEN' &&
                !reply.applied &&
                !question.acceptedUserId &&
                reply.userId !== question.userId;

            if (canApply) {
                return (
                    <button
                        onClick={() => handleApplyToSolve(reply.id)}
                        disabled={isApplying}
                        className={`${styles.applyButton} ${isApplying ? styles.applying : ''}`}
                    >
                        {isApplying ? '申请中...' : '申请解决问题'}
                    </button>
                );
            }
        }

        return null;
    };

    // 回复表单渲染
    const renderReplyForm = () => {
        if (!question || isFinalState(question.status)) return null;

        return (
            <div className={styles.replySection}>
                {!showReplyForm ? (
                    <button
                        onClick={() => setShowReplyForm(true)}
                        className={styles.writeReplyButton}
                    >
                        写回复
                    </button>
                ) : (
                    <form onSubmit={handleSubmitReply} className={styles.replyForm}>
                        <div className={styles.markdownEditorContainer}>
                            <div className={styles.markdownToolbar}>
                                <button type="button" onClick={() => addMarkdownSyntax('bold')} className={styles.markdownButton}>
                                    粗体
                                </button>
                                <button type="button" onClick={() => addMarkdownSyntax('italic')} className={styles.markdownButton}>
                                    斜体
                                </button>
                                <button type="button" onClick={() => addMarkdownSyntax('code')} className={styles.markdownButton}>
                                    代码
                                </button>
                                <button type="button" onClick={() => addMarkdownSyntax('link')} className={styles.markdownButton}>
                                    链接
                                </button>
                                <button type="button" onClick={() => addMarkdownSyntax('list')} className={styles.markdownButton}>
                                    列表
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setIsPreviewMode(!isPreviewMode)}
                                    className={`${styles.markdownButton} ${isPreviewMode ? styles.active : ''}`}
                                >
                                    预览
                                </button>
                            </div>

                            {isPreviewMode ? (
                                <div className={styles.markdownPreview}>
                                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                        {replyContent || '预览区域'}
                                    </ReactMarkdown>
                                </div>
                            ) : (
                                <textarea
                                    name="replyContent"
                                    value={replyContent}
                                    onChange={(e) => setReplyContent(e.target.value)}
                                    placeholder="写下你的回复，支持 Markdown 语法..."
                                    className={styles.replyInput}
                                    required
                                />
                            )}
                        </div>

                        <div className={styles.formActions}>
                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className={styles.submitButton}
                            >
                                {isSubmitting ? '发送中...' : '发送回复'}
                            </button>
                            <button
                                type="button"
                                onClick={() => setShowReplyForm(false)}
                                className={styles.cancelButton}
                            >
                                取消回复
                            </button>
                        </div>
                    </form>
                )}
            </div>
        );
    };

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

    if (!question) return null;

    return (
        <div className={styles.container}>
            <Navbar />
            <div className={styles.background}></div>
            <div className={styles.overlay}></div>
            <div className={styles.contentWrapper}>
                {error && (
                    <div className={styles.error}>
                        {typeof error === 'string' ? error : '操作失败，请稍后重试'}
                    </div>
                )}

                {/* 问题详情卡片 */}
                <div className={styles.questionCard}>
                    <div className={styles.questionHeader}>
                        <div className={styles.titleArea}>
                            <div className={styles.questionMeta}>
                                <span className={styles.typeTag}>
                                    {getQuestionTypeText(question.questionType)}
                                </span>
                                <span
                                    className={`
                                    ${styles.statusTag} 
                                    ${styles[getStatusStyle(question.status).background]}
                                    `}
                                >
                                    {getStatusText(question.status)}
                                </span>
                                <h1 className={styles.questionTitle}>{question.shortTitle}</h1>
                            </div>
                        </div>

                        <div className={styles.userInfoContainer}>
                            <div className={styles.userInfo}>
                                <img
                                    src={avatarMap[question.userId] || defaultAvatarIcon}
                                    alt={question.userName}
                                    className={styles.userAvatar}
                                    onError={(e) => {
                                        e.target.onerror = null;
                                        e.target.src = defaultAvatarIcon;
                                    }}
                                />
                                <span className={styles.username}>{question.userName}</span>
                            </div>
                        </div>
                    </div>

                    {/* 问题内容区域 */}
                    <div className={styles.questionContent}>
                        <div className={styles.markdownWrapper}>
                            <ReactMarkdown
                                remarkPlugins={[remarkGfm]}
                                components={{
                                    img: () => null,
                                    p: ({node, children}) => {
                                        if (node.children[0]?.type === 'image') {
                                            return null;
                                        }
                                        return <p>{children}</p>;
                                    }
                                }}
                            >
                                {question.description}
                            </ReactMarkdown>
                        </div>

                        {question.imageUrl && (
                            <div className={styles.questionImage}>
                                <img
                                    src={question.imageUrl}
                                    alt="问题相关图片"
                                    className={styles.questionImageContent}
                                    onClick={() => setPreviewImage(question.imageUrl)}
                                />
                            </div>
                        )}

                        <div className={styles.questionFooter}>
                            <div className={styles.postTime}>
                                发布于 {new Date(question.createdAt).toLocaleString()}
                            </div>
                            <div className={styles.viewCount}>
                                浏览 {question.viewCount}
                            </div>
                        </div>
                    </div>

                    <div className={styles.replySection}>
                        {renderReplyForm()}
                    </div>
                </div>

                {/* 回复列表部分 */}
                <div className={styles.repliesSection}>
                    <h2 className={styles.repliesTitle}>
                        全部回复 ({question.replyCount || 0})
                    </h2>

                    {/* 分页导航 - 顶部 */}
                    {question.replyCount > 0 && renderPagination()}

                    {/* 回复加载状态 */}
                    {isRepliesLoading ? (
                        <div className={styles.repliesLoading}>
                            <Loading size="md" color="dark" />
                        </div>
                    ) : question.replies && question.replies.length > 0 ? (
                        question.replies.map((reply, index) => (
                            <div key={reply.id} className={styles.replyCard}>
                                <div className={styles.replyHeader}>
                                    <div className={styles.replyUserInfo}>
                                        <img
                                            src={avatarMap[reply.userId] || defaultAvatarIcon}
                                            alt={reply.userName}
                                            className={styles.userAvatar}
                                            onError={(e) => {
                                                e.target.onerror = null;
                                                e.target.src = defaultAvatarIcon;
                                            }}
                                        />
                                        <span className={styles.username}>{reply.userName}</span>
                                    </div>
                                    <span className={styles.replyNumber}>
                                        #{currentReplyPage * replyPageSize + index + 1}
                                    </span>
                                </div>

                                <div className={styles.replyContent}>
                                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                        {reply.content}
                                    </ReactMarkdown>
                                </div>

                                <div className={styles.replyFooter}>
                                    <div className={styles.replyTime}>
                                        回复于 {new Date(reply.createdAt).toLocaleString()}
                                    </div>
                                </div>

                                <div className={styles.replyActions}>
                                    {renderSolveButton(reply)}

                                    {/* 已解决状态标签 */}
                                    {question.status === 'SOLVED' &&
                                        question.solvedReplyId === reply.id && (
                                            <span className={styles.solvedTag}>
                                                最佳答案
                                            </span>
                                        )}
                                </div>

                                {/* 显示联系方式 */}
                                {(question.status === 'SOLVED' || question.status === 'IN_PROGRESS') &&
                                    ((question.solvedReplyId === reply.id) || (question.solvingReplyId === reply.id)) &&
                                    (userId === reply.userId || userId === question.userId) && (
                                        <div className={styles.contactInfo}>
                                            <h4>联系方式</h4>
                                            <p><strong>联系人：</strong>{question.contactName}</p>
                                            <p><strong>联系方式：</strong>{question.contactInfo}</p>
                                        </div>
                                    )}

                                {/* 申请解决失败的错误信息 */}
                                {applyError && reply.id === question.solvingReplyId && (
                                    <div className={styles.errorText}>
                                        {applyError}
                                    </div>
                                )}
                            </div>
                        ))
                    ) : (
                        <div className={styles.noReplies}>暂无回复</div>
                    )}

                    {/* 分页导航 - 底部 */}
                    {question.replyCount > 0 && renderPagination()}
                </div>

                {/* 图片预览组件 */}
                {previewImage && (
                    <ImagePreview
                        imageUrl={previewImage}
                        onClose={() => setPreviewImage(null)}
                    />
                )}
            </div>
        </div>
    );
};

export default QuestionDetail;