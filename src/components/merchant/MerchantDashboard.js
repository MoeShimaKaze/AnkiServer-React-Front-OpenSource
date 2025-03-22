import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import Loading from '../utils/Loading';
import Navbar from '../base/Navbar'; // 引入导航栏组件
import MerchantInfo from './MerchantInfo';
import MerchantEmployees from './MerchantEmployees';
import MerchantOrders from './MerchantOrders';
import MerchantInvitations from './MerchantInvitations';
import styles from '../../assets/css/merchant/MerchantDashboard.module.css';

const MerchantDashboard = ({ userId, userGroup, isAdmin, adminView = false }) => {
    const { merchantUid: urlMerchantUid } = useParams();
    const navigate = useNavigate();

    // 状态管理
    const [merchants, setMerchants] = useState([]);
    const [selectedMerchant, setSelectedMerchant] = useState(null);
    const [activeTab, setActiveTab] = useState('info');
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [showCreateStorePrompt, setShowCreateStorePrompt] = useState(false);
    const [, setMerchantInfo] = useState(null);

    // 获取当前激活的标签页的背景样式
    const getBackgroundClass = () => {
        switch (activeTab) {
            case 'info':
                return styles.infoBackground;
            case 'employees':
                return styles.employeesBackground;
            case 'orders':
                return styles.ordersBackground;
            case 'invitations':
                return styles.invitationsBackground;
            default:
                return styles.defaultBackground;
        }
    };

    // 加载商家列表
    useEffect(() => {
        const fetchMerchantData = async () => {
            try {
                setIsLoading(true);
                setError(null);

                // 1. 获取商家列表
                const response = await axios.get(
                    `http://127.0.0.1:8080/api/merchants/user/${userId}`,
                    { withCredentials: true }
                );

                setMerchants(response.data);

                // 2. 如果没有店铺，尝试获取商家信息以检查认证状态
                if (response.data.length === 0) {
                    try {
                        // 获取商家信息，查看验证状态
                        const merchantInfoResponse = await axios.get(
                            `http://127.0.0.1:8080/api/merchants/uid/${userId}`,
                            { withCredentials: true }
                        );

                        setMerchantInfo(merchantInfoResponse.data);

                        // 如果已认证但没有店铺，显示创建店铺提示
                        if (merchantInfoResponse.data.verificationStatus === 'APPROVED') {
                            setShowCreateStorePrompt(true);
                        }
                    } catch (merchantError) {
                        console.log("未找到商家信息或未认证");
                    }
                } else {
                    // 如果有店铺，则重置创建店铺提示
                    setShowCreateStorePrompt(false);
                }

                // 3. 处理商家选择
                if (urlMerchantUid && response.data.length > 0) {
                    const urlMerchant = response.data.find(m => m.merchantUid === urlMerchantUid);
                    if (urlMerchant) {
                        setSelectedMerchant(urlMerchant);
                    } else {
                        // 如果找不到URL中的商家，默认选择第一个
                        setSelectedMerchant(response.data[0]);
                    }
                } else if (response.data.length > 0) {
                    // 没有URL参数时，默认选择第一个商家
                    setSelectedMerchant(response.data[0]);
                }
            } catch (error) {
                console.error('获取商家列表失败:', error);
                setError('获取商家列表失败，请稍后重试');
            } finally {
                setIsLoading(false);
            }
        };

        if (userId) {
            fetchMerchantData();
        }
    }, [userId, urlMerchantUid]);

    // 切换选中的商家
    const handleMerchantChange = (merchantUid) => {
        const merchant = merchants.find(m => m.merchantUid === merchantUid);
        setSelectedMerchant(merchant);
        setActiveTab('info');
    };

    // 切换标签页
    const handleTabChange = (tab) => {
        setActiveTab(tab);
    };

    // 前往商家认证页面
    const handleApplyMerchant = () => {
        navigate('/merchant/verification');
    };

    // 前往创建店铺页面
    const handleCreateStore = () => {
        navigate('/shop/merchant/store/add');
    };

    // 渲染加载状态
    if (isLoading) {
        return (
            <div className={`${styles.pageContainer} ${styles.defaultBackground}`}>
                <Navbar />
                <div className={styles.contentWrapper}>
                    <div className={styles.loadingContainer}>
                        <Loading size="lg" color="dark" />
                        <p>正在加载商家信息...</p>
                    </div>
                </div>
            </div>
        );
    }

    // 检查用户权限
    const canAccess = isAdmin || userGroup === 'store' || adminView;

    // 如果没有权限访问
    if (!canAccess && merchants.length === 0 && !showCreateStorePrompt) {
        return (
            <div className={`${styles.pageContainer} ${styles.defaultBackground}`}>
                <Navbar />
                <div className={styles.accessDeniedContainer}>
                    <div className={styles.overlay}></div>
                    <div className={styles.accessDeniedCard}>
                        <h2>访问受限</h2>
                        <p>您没有权限访问商家管理功能</p>
                        <button
                            onClick={() => navigate('/profile')}
                            className={styles.primaryButton}
                        >
                            返回个人中心
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // 渲染错误状态
    if (error) {
        return (
            <div className={`${styles.pageContainer} ${styles.defaultBackground}`}>
                <Navbar />
                <div className={styles.contentWrapper}>
                    <div className={styles.errorContainer}>
                        <div className={styles.errorMessage}>{error}</div>
                        <button
                            onClick={() => navigate('/profile')}
                            className={styles.backButton}
                        >
                            返回个人中心
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // 显示创建店铺提示（已认证但没有店铺）
    if (showCreateStorePrompt) {
        return (
            <div className={`${styles.pageContainer} ${styles.defaultBackground}`}>
                <Navbar />
                <div className={styles.contentWrapper}>
                    <div className={styles.dashboardContainer}>
                        <div className={styles.dashboardHeader}>
                            <h1 className={styles.title}>商家控制台</h1>
                        </div>

                        <div className={styles.createStorePrompt}>
                            <div className={styles.promptIcon}>🏪</div>
                            <h3>您已通过商家认证，但尚未创建店铺</h3>
                            <p>创建店铺后才能发布商品和管理订单</p>
                            <button
                                onClick={handleCreateStore}
                                className={styles.createStoreButton}
                            >
                                立即创建店铺
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // 如果有权限但没有商家，显示空状态
    if (merchants.length === 0) {
        return (
            <div className={`${styles.pageContainer} ${styles.defaultBackground}`}>
                <Navbar />
                <div className={styles.contentWrapper}>
                    <div className={styles.emptyContainer}>
                        <div className={styles.emptyIcon}>🏪</div>
                        <h2>您还没有商家身份</h2>
                        <p>成为商家可以发布商品、接收订单，享受更多平台功能</p>
                        <button
                            onClick={handleApplyMerchant}
                            className={styles.applyButton}
                        >
                            申请成为商家
                        </button>
                        <button
                            onClick={() => navigate('/profile')}
                            className={styles.backButton}
                        >
                            返回个人中心
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className={`${styles.pageContainer} ${getBackgroundClass()}`}>
            <Navbar />
            <div className={styles.contentWrapper}>
                <div className={styles.dashboardContainer}>
                    <div className={styles.dashboardHeader}>
                        <h1 className={styles.title}>商家控制台</h1>

                        {/* 商家选择器 */}
                        {merchants.length > 1 && (
                            <div className={styles.merchantSelector}>
                                <label htmlFor="merchant-select">选择商家:</label>
                                <select
                                    id="merchant-select"
                                    value={selectedMerchant?.merchantUid}
                                    onChange={(e) => handleMerchantChange(e.target.value)}
                                    className={styles.merchantSelect}
                                >
                                    {merchants.map(merchant => (
                                        <option key={merchant.merchantUid} value={merchant.merchantUid}>
                                            {merchant.contactName} ({merchant.merchantUid})
                                        </option>
                                    ))}
                                </select>
                            </div>
                        )}
                    </div>

                    {/* 标签页切换 */}
                    <div className={styles.tabsContainer}>
                        <div className={styles.tabs}>
                            <button
                                className={`${styles.tabButton} ${activeTab === 'info' ? styles.activeTab : ''}`}
                                onClick={() => handleTabChange('info')}
                            >
                                商家信息
                            </button>
                            <button
                                className={`${styles.tabButton} ${activeTab === 'employees' ? styles.activeTab : ''}`}
                                onClick={() => handleTabChange('employees')}
                            >
                                员工管理
                            </button>
                            <button
                                className={`${styles.tabButton} ${activeTab === 'orders' ? styles.activeTab : ''}`}
                                onClick={() => handleTabChange('orders')}
                            >
                                订单管理
                            </button>
                            <button
                                className={`${styles.tabButton} ${activeTab === 'invitations' ? styles.activeTab : ''}`}
                                onClick={() => handleTabChange('invitations')}
                            >
                                待处理邀请
                            </button>
                        </div>
                    </div>

                    {/* 内容区域 */}
                    <div className={styles.contentContainer}>
                        {activeTab === 'info' && selectedMerchant && (
                            <MerchantInfo
                                merchantUid={selectedMerchant.merchantUid}
                                userId={userId}
                                userGroup={userGroup}
                                isAdmin={isAdmin}
                            />
                        )}

                        {activeTab === 'employees' && selectedMerchant && (
                            <MerchantEmployees
                                merchantUid={selectedMerchant.merchantUid}
                                userId={userId}
                                userGroup={userGroup}
                                isAdmin={isAdmin}
                            />
                        )}

                        {activeTab === 'orders' && selectedMerchant && (
                            <MerchantOrders
                                storeId={selectedMerchant.id}
                                userId={userId}
                                userGroup={userGroup}
                                isAdmin={isAdmin}
                            />
                        )}

                        {activeTab === 'invitations' && (
                            <MerchantInvitations
                                userId={userId}
                                userGroup={userGroup}
                                isAdmin={isAdmin}
                            />
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default MerchantDashboard;