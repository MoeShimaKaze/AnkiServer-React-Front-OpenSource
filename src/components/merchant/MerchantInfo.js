import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import Loading from '../utils/Loading';
import styles from '../../assets/css/merchant/MerchantInfo.module.css';

const MerchantInfo = ({ merchantUid, userId, userGroup, isAdmin }) => {
    const navigate = useNavigate();

    // 状态管理
    const [merchantInfo, setMerchantInfo] = useState(null);
    const [isEditing, setIsEditing] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [formData, setFormData] = useState({
        contactName: '',
        contactPhone: '',
        businessAddress: ''
    });
    const [submitStatus, setSubmitStatus] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // 获取商家信息
    useEffect(() => {
        const fetchMerchantInfo = async () => {
            try {
                setIsLoading(true);
                const response = await axios.get(
                    `http://127.0.0.1:8080/api/merchants/uid/${merchantUid}`,
                    { withCredentials: true }
                );
                setMerchantInfo(response.data);
                setFormData({
                    contactName: response.data.contactName || '',
                    contactPhone: response.data.contactPhone || '',
                    businessAddress: response.data.businessAddress || ''
                });
            } catch (error) {
                console.error('获取商家信息失败:', error);
                setError('获取商家信息失败，请稍后重试');
            } finally {
                setIsLoading(false);
            }
        };

        if (merchantUid) {
            fetchMerchantInfo();
        }
    }, [merchantUid]);

    // 表单输入处理
    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    // 开始编辑
    const handleStartEdit = () => {
        setIsEditing(true);
    };

    // 取消编辑
    const handleCancelEdit = () => {
        setFormData({
            contactName: merchantInfo.contactName || '',
            contactPhone: merchantInfo.contactPhone || '',
            businessAddress: merchantInfo.businessAddress || ''
        });
        setIsEditing(false);
    };

    // 提交编辑
    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        setSubmitStatus(null);

        try {
            const updateData = {
                userId: userId,
                contactName: formData.contactName,
                contactPhone: formData.contactPhone,
                businessAddress: formData.businessAddress
            };

            const response = await axios.put(
                `http://127.0.0.1:8080/api/merchants/${merchantInfo.id}`,
                updateData,
                { withCredentials: true }
            );

            setMerchantInfo(response.data);
            setSubmitStatus({
                success: true,
                message: '商家信息更新成功'
            });
            setIsEditing(false);
        } catch (error) {
            console.error('更新商家信息失败:', error);
            setSubmitStatus({
                success: false,
                message: error.response?.data || '更新失败，请稍后重试'
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    // 获取商家等级显示
    const getMerchantLevelDisplay = (level) => {
        const levelMap = {
            'BRONZE': '铜牌商家',
            'SILVER': '银牌商家',
            'GOLD': '金牌商家',
            'PLATINUM': '白金商家',
            'DIAMOND': '钻石商家'
        };
        return levelMap[level] || level;
    };

    // 获取验证状态显示
    const getVerificationStatusDisplay = (status) => {
        const statusMap = {
            'PENDING': '审核中',
            'APPROVED': '已认证',
            'REJECTED': '认证被拒绝'
        };
        return statusMap[status] || status;
    };

    // 渲染加载状态
    if (isLoading) {
        return (
            <div className={styles.loadingContainer}>
                <Loading size="lg" color="dark" />
                <p>正在加载商家信息...</p>
            </div>
        );
    }

    // 渲染错误状态
    if (error) {
        return (
            <div className={styles.errorContainer}>
                <div className={styles.errorMessage}>{error}</div>
                <button
                    onClick={() => navigate('/profile')}
                    className={styles.backButton}
                >
                    返回个人中心
                </button>
            </div>
        );
    }

    // 渲染商家信息
    return (
        <div className={styles.merchantInfoContainer}>
            <h2 className={styles.title}>商家信息</h2>

            {/* 提交状态显示 */}
            {submitStatus && (
                <div className={`${styles.statusMessage} ${submitStatus.success ? styles.success : styles.error}`}>
                    {submitStatus.message}
                </div>
            )}

            <div className={styles.infoCard}>
                {/* 商家基本信息部分 */}
                <div className={styles.basicInfo}>
                    <div className={styles.infoRow}>
                        <span className={styles.infoLabel}>认证状态:</span>
                        <span className={`${styles.infoValue} ${styles.statusBadge} ${styles[merchantInfo?.verificationStatus?.toLowerCase()]}`}>
                            {getVerificationStatusDisplay(merchantInfo?.verificationStatus)}
                        </span>
                    </div>

                    <div className={styles.infoRow}>
                        <span className={styles.infoLabel}>商家级别:</span>
                        <span className={`${styles.infoValue} ${styles.levelBadge} ${styles[merchantInfo?.merchantLevel?.toLowerCase()]}`}>
                            {getMerchantLevelDisplay(merchantInfo?.merchantLevel)}
                        </span>
                    </div>

                    <div className={styles.infoRow}>
                        <span className={styles.infoLabel}>商家ID:</span>
                        <span className={styles.infoValue}>{merchantInfo?.merchantUid}</span>
                    </div>

                    <div className={styles.infoRow}>
                        <span className={styles.infoLabel}>营业执照:</span>
                        <span className={styles.infoValue}>{merchantInfo?.businessLicense}</span>
                    </div>

                    <div className={styles.infoRow}>
                        <span className={styles.infoLabel}>评分:</span>
                        <span className={styles.infoValue}>
                            {merchantInfo?.rating?.toFixed(1) || '暂无评分'} / 5.0
                        </span>
                    </div>

                    <div className={styles.infoRow}>
                        <span className={styles.infoLabel}>销售量:</span>
                        <span className={styles.infoValue}>
                            {merchantInfo?.totalSales || 0} 笔
                        </span>
                    </div>
                </div>

                {/* 可编辑信息部分 */}
                <form className={styles.editableInfo} onSubmit={handleSubmit}>
                    <div className={styles.formGroup}>
                        <label htmlFor="contactName">联系人姓名:</label>
                        {isEditing ? (
                            <input
                                type="text"
                                id="contactName"
                                name="contactName"
                                value={formData.contactName}
                                onChange={handleChange}
                                required
                            />
                        ) : (
                            <span className={styles.infoValue}>{merchantInfo?.contactName}</span>
                        )}
                    </div>

                    <div className={styles.formGroup}>
                        <label htmlFor="contactPhone">联系电话:</label>
                        {isEditing ? (
                            <input
                                type="tel"
                                id="contactPhone"
                                name="contactPhone"
                                value={formData.contactPhone}
                                onChange={handleChange}
                                pattern="^1[3-9]\d{9}$"
                                required
                            />
                        ) : (
                            <span className={styles.infoValue}>{merchantInfo?.contactPhone}</span>
                        )}
                    </div>

                    <div className={styles.formGroup}>
                        <label htmlFor="businessAddress">经营地址:</label>
                        {isEditing ? (
                            <textarea
                                id="businessAddress"
                                name="businessAddress"
                                value={formData.businessAddress}
                                onChange={handleChange}
                                rows={3}
                                required
                            />
                        ) : (
                            <span className={styles.infoValue}>{merchantInfo?.businessAddress}</span>
                        )}
                    </div>

                    <div className={styles.formActions}>
                        {isEditing ? (
                            <>
                                <button
                                    type="button"
                                    className={styles.cancelButton}
                                    onClick={handleCancelEdit}
                                    disabled={isSubmitting}
                                >
                                    取消
                                </button>
                                <button
                                    type="submit"
                                    className={styles.submitButton}
                                    disabled={isSubmitting}
                                >
                                    {isSubmitting ? (
                                        <div className={styles.buttonWithLoading}>
                                            <Loading size="sm" color="light" />
                                            <span>保存中...</span>
                                        </div>
                                    ) : '保存'}
                                </button>
                            </>
                        ) : (
                            <button
                                type="button"
                                className={styles.editButton}
                                onClick={handleStartEdit}
                            >
                                编辑信息
                            </button>
                        )}
                    </div>
                </form>
            </div>
        </div>
    );
};

export default MerchantInfo;