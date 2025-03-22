import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Loading from '../utils/Loading';
import styles from '../../assets/css/merchant/MerchantInvitations.module.css';

const MerchantInvitations = ({ userId, userGroup, isAdmin }) => {

    // 状态管理
    const [invitations, setInvitations] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [actionStatus, setActionStatus] = useState(null);
    const [isProcessing, setIsProcessing] = useState(false);

    // 加载邀请列表
    useEffect(() => {
        const fetchInvitations = async () => {
            try {
                setIsLoading(true);
                const response = await axios.get(
                    'http://127.0.0.1:8080/api/merchants/invitations',
                    { withCredentials: true }
                );

                setInvitations(response.data);
            } catch (error) {
                console.error('获取邀请列表失败:', error);
                setError('获取邀请列表失败，请稍后重试');
            } finally {
                setIsLoading(false);
            }
        };

        fetchInvitations();
    }, [userId]);

    // 处理接受邀请
    const handleAcceptInvitation = async (mappingId) => {
        setIsProcessing(true);
        setActionStatus(null);

        try {
            await axios.post(
                `http://127.0.0.1:8080/api/merchants/invitations/${mappingId}/accept`,
                {},
                { withCredentials: true }
            );

            // 更新邀请列表
            const updatedInvitations = invitations.filter(
                invitation => invitation.id !== mappingId
            );
            setInvitations(updatedInvitations);

            setActionStatus({
                success: true,
                message: '已成功接受邀请'
            });
        } catch (error) {
            console.error('接受邀请失败:', error);
            setActionStatus({
                success: false,
                message: error.response?.data || '接受邀请失败，请稍后重试'
            });
        } finally {
            setIsProcessing(false);
        }
    };

    // 处理拒绝邀请
    const handleRejectInvitation = async (mappingId) => {
        setIsProcessing(true);
        setActionStatus(null);

        try {
            await axios.post(
                `http://127.0.0.1:8080/api/merchants/invitations/${mappingId}/reject`,
                {},
                { withCredentials: true }
            );

            // 更新邀请列表
            const updatedInvitations = invitations.filter(
                invitation => invitation.id !== mappingId
            );
            setInvitations(updatedInvitations);

            setActionStatus({
                success: true,
                message: '已拒绝邀请'
            });
        } catch (error) {
            console.error('拒绝邀请失败:', error);
            setActionStatus({
                success: false,
                message: error.response?.data || '拒绝邀请失败，请稍后重试'
            });
        } finally {
            setIsProcessing(false);
        }
    };

    // 获取角色显示文本
    const getRoleDisplay = (role) => {
        const roleMap = {
            'OWNER': '拥有者',
            'ADMIN': '管理员',
            'OPERATOR': '操作员',
            'VIEWER': '查看者'
        };
        return roleMap[role] || role;
    };

    // 渲染加载状态
    if (isLoading) {
        return (
            <div className={styles.loadingContainer}>
                <Loading size="lg" color="dark" />
                <p>正在加载邀请信息...</p>
            </div>
        );
    }

    // 渲染错误状态
    if (error) {
        return (
            <div className={styles.errorContainer}>
                <div className={styles.errorMessage}>{error}</div>
            </div>
        );
    }

    return (
        <div className={styles.invitationsContainer}>
            <h2 className={styles.title}>商家邀请</h2>

            {/* 状态消息 */}
            {actionStatus && (
                <div className={`${styles.statusMessage} ${
                    actionStatus.success ? styles.success : styles.error
                }`}>
                    {actionStatus.message}
                </div>
            )}

            {/* 邀请列表 */}
            <div className={styles.invitationsCard}>
                <div className={styles.cardHeader}>
                    <h3>待处理的邀请</h3>
                </div>

                {invitations.length === 0 ? (
                    <div className={styles.emptyState}>
                        暂无待处理的邀请
                    </div>
                ) : (
                    <div className={styles.invitationsList}>
                        {invitations.map(invitation => (
                            <div key={invitation.id} className={styles.invitationItem}>
                                <div className={styles.invitationInfo}>
                                    <div className={styles.merchantName}>
                                        {invitation.merchantInfo?.merchantUid || '未知商家'}
                                    </div>
                                    <div className={styles.invitationDetails}>
                                        <span className={styles.invitedBy}>
                                            邀请人: {invitation.invitedByUserId || '未知'}
                                        </span>
                                        <span className={styles.invitedRole}>
                                            邀请角色: <span className={`${styles.roleBadge} ${styles[invitation.role.toLowerCase()]}`}>
                                                {getRoleDisplay(invitation.role)}
                                            </span>
                                        </span>
                                        <span className={styles.invitedDate}>
                                            邀请时间: {new Date(invitation.createdAt).toLocaleString()}
                                        </span>
                                    </div>
                                </div>
                                <div className={styles.invitationActions}>
                                    <button
                                        onClick={() => handleAcceptInvitation(invitation.id)}
                                        className={styles.acceptButton}
                                        disabled={isProcessing}
                                    >
                                        {isProcessing ? '处理中...' : '接受'}
                                    </button>
                                    <button
                                        onClick={() => handleRejectInvitation(invitation.id)}
                                        className={styles.rejectButton}
                                        disabled={isProcessing}
                                    >
                                        {isProcessing ? '处理中...' : '拒绝'}
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default MerchantInvitations;