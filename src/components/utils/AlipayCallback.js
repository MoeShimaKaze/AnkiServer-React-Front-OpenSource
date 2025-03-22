import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import { Spin, Typography, Alert, Card } from 'antd';
import styles from '../../assets/css/utils/AlipayCallback.module.css';

const { Title } = Typography;

const AlipayCallback = () => {
    const [searchParams] = useSearchParams();
    const { setUserInfo, validateSession } = useAuth();
    const [status, setStatus] = useState('正在处理支付宝登录...');
    const [error, setError] = useState(null);

    // 将验证函数移到组件内部，作为助手函数
    const validateAuthParams = (authCode, state) => {
        // 从会话存储中获取保存的状态和时间戳
        const savedState = sessionStorage.getItem('alipayAuthState');
        const authTimestamp = sessionStorage.getItem('alipayAuthTimestamp');

        // 验证状态参数
        if (!savedState || !authTimestamp || state !== savedState) {
            throw new Error('授权状态验证失败');
        }

        // 验证时间戳是否在有效期内（15分钟）
        const timestampAge = Date.now() - parseInt(authTimestamp);
        if (timestampAge > 15 * 60 * 1000) {
            throw new Error('授权会话已过期');
        }

        return true;
    };

    // 清理授权会话数据的助手函数
    const cleanupAuthSession = () => {
        sessionStorage.removeItem('alipayAuthState');
        sessionStorage.removeItem('alipayAuthTimestamp');
        sessionStorage.removeItem('alipayAuthInProgress');
    };

    useEffect(() => {
        const processLogin = async () => {
            try {
                // 1. 获取并验证授权参数
                const authCode = searchParams.get('auth_code');
                const state = searchParams.get('state');

                if (!authCode || !state) {
                    throw new Error('缺少必要的授权参数');
                }

                // 2. 验证授权状态
                validateAuthParams(authCode, state);
                setStatus('正在验证支付宝授权...');

                // 3. 发送登录请求
                const response = await axios.get(
                    'http://127.0.0.1:8080/api/alipay/login/callback',
                    {
                        params: { auth_code: authCode, state: state },
                        withCredentials: true,
                        timeout: 10000
                    }
                );

                // 4. 处理登录响应
                if (response.data.authResponse) {
                    // 更新认证状态
                    await setUserInfo({
                        isLoggedIn: true,
                        userId: response.data.userId,
                        username: response.data.username,
                        userGroup: response.data.userGroup,
                        isAdmin: response.data.userGroup === 'admin',
                        isMessenger: response.data.userGroup === 'messenger'
                    });

                    setStatus('登录成功，正在完成认证...');

                    // 等待状态更新完成
                    await new Promise(resolve => setTimeout(resolve, 1500));

                    // 验证会话状态
                    const isValid = await validateSession();

                    if (isValid) {
                        setStatus('认证完成，准备跳转...');
                        // 确保状态完全更新
                        await new Promise(resolve => setTimeout(resolve, 500));

                        // 清理会话数据
                        cleanupAuthSession();

                        // 使用replaceState进行跳转
                        window.history.replaceState(null, '', '/profile');
                        window.location.reload();
                    } else {
                        throw new Error('会话验证失败');
                    }
                } else {
                    throw new Error('登录响应无效');
                }

            } catch (error) {
                console.error('支付宝登录处理失败:', error);
                setError(error.message || '登录失败，请重试');
                setStatus('登录失败');

                // 清理会话数据
                cleanupAuthSession();

                // 延迟跳转到登录页
                setTimeout(() => {
                    window.location.href = '/login';
                }, 2000);
            }
        };

        processLogin();
    }, [searchParams, setUserInfo, validateSession]);

    // 使用Ant Design组件渲染UI
    return (
        <div className={styles.callbackContainer}>
            <Card
                className={styles.callbackContent}
                bordered={false}
                style={{ textAlign: 'center' }}
            >
                <Spin
                    size="large"
                    style={{ display: 'block', margin: '0 auto 20px' }}
                />
                <Title
                    level={4}
                    style={{
                        margin: '16px 0',
                        fontSize: '1.2rem',
                        color: '#333'
                    }}
                >
                    {status}
                </Title>
                {error && (
                    <Alert
                        message="错误信息"
                        description={error}
                        type="error"
                        showIcon
                        style={{ marginTop: '16px', textAlign: 'left' }}
                    />
                )}
            </Card>
        </div>
    );
};

export default AlipayCallback;