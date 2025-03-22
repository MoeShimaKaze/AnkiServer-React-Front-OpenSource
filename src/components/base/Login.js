import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Form, Input, Button, message, Card, Divider } from 'antd';
import { UserOutlined, LockOutlined, AlipayCircleOutlined } from '@ant-design/icons';
import { useAuth } from '../context/AuthContext';
import useAuthStore from '../utils/stores/auth/AuthStore';
import Navbar from '../base/Navbar';
import axios from 'axios';
import styles from '../../assets/css/login/Login.module.css';

const Login = () => {

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loginMessage, setLoginMessage] = useState('');
  const [messageType, setMessageType] = useState('');
  const [isBlurred, setIsBlurred] = useState(false);
  const navigate = useNavigate();

  // 从状态管理获取登录状态
  const isLoggedIn = useAuthStore(state => state.isLoggedIn);
  const { login } = useAuth();

  // 如果已登录，重定向到个人中心
  useEffect(() => {
    if (isLoggedIn) {
      navigate('/profile');
    }
  }, [isLoggedIn, navigate]);

  // 处理表单输入状态
  const handleFocus = () => setIsBlurred(true);
  const handleBlur = () => setIsBlurred(false);

  // 处理普通登录提交
  const handleSubmit = async (values) => {
    if (isSubmitting) return;

    try {
      setIsSubmitting(true);
      setLoginMessage('');

      const result = await login(values);

      if (result.success) {
        setLoginMessage('登录成功，正在跳转...');
        setMessageType('success');
        navigate('/profile');
      } else {
        setLoginMessage(result.error || '登录失败，请重试');
        setMessageType('error');
      }
    } catch (error) {
      console.error('登录错误:', error);
      setLoginMessage('登录过程发生错误，请重试');
      setMessageType('error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 处理支付宝登录
  const handleAlipayLogin = async () => {
    try {
      setLoginMessage('正在获取支付宝授权链接...');
      setMessageType('info');
      setIsSubmitting(true);

      const response = await axios.get('http://127.0.0.1:8080/api/alipay/login/url', {
        withCredentials: true
      });

      if (response.data && response.data.url) {
        // 使用 sessionStorage 存储状态
        if (response.data.state) {
          sessionStorage.setItem('alipayAuthState', response.data.state);

          // 添加状态存储时间戳，用于验证会话时效性
          sessionStorage.setItem('alipayAuthTimestamp', Date.now().toString());
        }

        // 添加调试日志
        console.debug('Authorization state stored in session:', response.data.state);

        window.location.href = response.data.url;
      } else {
        setLoginMessage('获取支付宝登录链接失败');
        setMessageType('error');
        setIsSubmitting(false);
      }
    } catch (error) {
      console.error('支付宝登录错误:', error);
      setLoginMessage(error.response?.data?.message || '支付宝登录过程发生错误，请重试');
      setMessageType('error');
      setIsSubmitting(false);
    }
  };

  // 显示消息
  useEffect(() => {
    if (loginMessage) {
      if (messageType === 'success') {
        message.success(loginMessage);
      } else if (messageType === 'error') {
        message.error(loginMessage);
      } else if (messageType === 'info') {
        message.info(loginMessage);
      }
    }
  }, [loginMessage, messageType]);

  return (
      <div className={styles.loginContainer}>
        <Navbar />
        <div className={`${styles.backgroundBlur} ${isBlurred ? styles.activeBlur : ''}`}></div>
        <div className={styles.formWrapper}>
          <Card
              bordered={false}
              className={styles.form}
              style={{ background: 'rgba(255, 255, 255, 0.8)' }}
          >
            <h2 className={styles.formTitle}>登录</h2>

            <Form
                name="login_form"
                initialValues={{ remember: true }}
                onFinish={handleSubmit}
                layout="vertical"
                requiredMark={false}
            >
              <Form.Item
                  name="email"
                  label="邮箱"
                  rules={[{ required: true, message: '请输入邮箱' }]}
              >
                <Input
                    prefix={<UserOutlined />}
                    placeholder="请输入邮箱"
                    onFocus={handleFocus}
                    onBlur={handleBlur}
                    disabled={isSubmitting}
                />
              </Form.Item>

              <Form.Item
                  name="password"
                  label="密码"
                  rules={[{ required: true, message: '请输入密码' }]}
              >
                <Input.Password
                    prefix={<LockOutlined />}
                    placeholder="请输入密码"
                    onFocus={handleFocus}
                    onBlur={handleBlur}
                    disabled={isSubmitting}
                />
              </Form.Item>

              <Form.Item>
                <Button
                    type="primary"
                    htmlType="submit"
                    className={styles.submitButton}
                    loading={isSubmitting}
                    block
                >
                  {isSubmitting ? '登录中...' : '登录'}
                </Button>
              </Form.Item>
            </Form>

            <Divider plain>或者</Divider>

            <Button
                icon={<AlipayCircleOutlined />}
                onClick={handleAlipayLogin}
                className={styles.alipayButton}
                disabled={isSubmitting}
                loading={isSubmitting}
                block
            >
              {isSubmitting ? '正在跳转...' : '支付宝登录'}
            </Button>

            <div className={styles.links}>
              <a href="/register" className={styles.registerLink}>
                没有账号？立即注册
              </a>
            </div>
          </Card>
        </div>
      </div>
  );
};

export default Login;