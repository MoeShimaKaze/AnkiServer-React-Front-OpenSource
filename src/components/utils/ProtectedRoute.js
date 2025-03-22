// src/components/utils/ProtectedRoute.js
import React, { useEffect, useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Loading from './Loading';
import Navbar from '../base/Navbar';
import styles from '../../assets/css/utils/ProtectedRoute.module.css';

/**
 * 增强版受保护路由组件
 * 支持函数子元素，可将用户信息传递给被保护的组件
 */
export const ProtectedRoute = ({
                                   children,
                                   requiredGroup = null,
                                   requiredGroups = null,
                                   redirectPath = "/login",
                                   backgroundStyle = "default" // 可选值: "default", "admin", "messenger"
                               }) => {
    const { isLoggedIn, isLoading, userGroup, isAdmin, isMessenger, userId, username } = useAuth();
    const location = useLocation();
    const navigate = useNavigate();
    const [isValidating, setIsValidating] = useState(true);
    const [accessDenied, setAccessDenied] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');

    // 检查是否是支付宝回调路径
    const isAlipayCallback = location.pathname.includes('/alipay/callback');

    useEffect(() => {
        const validateAccess = async () => {
            // 支付宝回调页面不需要等待验证
            if (isAlipayCallback) {
                setIsValidating(false);
                return;
            }

            // 等待加载和认证状态确定
            if (!isLoading) {
                // 已登录状态下进行权限检查
                if (isLoggedIn) {
                    // 多组权限检查
                    if (requiredGroups && Array.isArray(requiredGroups) && requiredGroups.length > 0) {
                        if (!requiredGroups.includes(userGroup)) {
                            setErrorMessage(`需要 ${requiredGroups.join('、')} 权限`);
                            setAccessDenied(true);
                        }
                    }
                    // 单组权限检查
                    else if (requiredGroup && userGroup !== requiredGroup) {
                        setErrorMessage(`需要 ${requiredGroup} 权限`);
                        setAccessDenied(true);
                    }
                }

                setIsValidating(false);
            }
        };

        validateAccess();
    }, [isLoading, isAlipayCallback, isLoggedIn, userGroup, requiredGroup, requiredGroups]);

    // 支付宝回调页面不需要路由保护
    if (isAlipayCallback) {
        return typeof children === 'function'
            ? children({ isAdmin, isMessenger, userId, username })
            : children;
    }

    // 显示加载状态
    if (isLoading || isValidating) {
        return (
            <div className="loading-container">
                <Loading size="lg" color="dark" />
            </div>
        );
    }

    // 未登录状态处理
    if (!isLoggedIn) {
        // 保存当前路径，用于登录后重定向
        const saveLocation = location.pathname.includes('/alipay') ?
            { pathname: '/profile' } : location;

        return <Navigate to={redirectPath} state={{ from: saveLocation }} replace />;
    }

    // 访问被拒绝显示友好提示
    if (accessDenied) {
        // 根据传入的backgroundStyle属性选择背景样式
        let bgClass = styles.defaultBg;
        if (backgroundStyle === "admin") {
            bgClass = styles.adminBg;
        } else if (backgroundStyle === "messenger") {
            bgClass = styles.messengerBg;
        }

        return (
            <>
                <Navbar />
                <div className={`${styles.accessDeniedContainer} ${bgClass}`}>
                    {/* 背景遮罩 */}
                    <div className={styles.overlay}></div>

                    {/* 权限错误卡片 */}
                    <div className={styles.accessDeniedCard}>
                        <h2 className={styles.title}>访问受限</h2>
                        <p className={styles.message}>{errorMessage}</p>
                        <div className={styles.buttonContainer}>
                            <button
                                onClick={() => navigate(-1)}
                                className={styles.primaryButton}>
                                返回上一页
                            </button>
                            <button
                                onClick={() => navigate('/')}
                                className={styles.secondaryButton}>
                                回到首页
                            </button>
                        </div>
                    </div>
                </div>
            </>
        );
    }

    // 权限验证通过，返回子组件
    return typeof children === 'function'
        ? children({ isAdmin, isMessenger, userId, username })
        : children;
};