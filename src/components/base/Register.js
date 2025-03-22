import React, { useState, useCallback, useEffect } from 'react';
import axios from 'axios';
import {
  Form,
  Input,
  Button,
  DatePicker,
  Select,
  message,
  Card,
  Space
} from 'antd';
import {
  UserOutlined,
  MailOutlined,
  LockOutlined,
  SafetyCertificateOutlined,
  CalendarOutlined
} from '@ant-design/icons';
import styles from '../../assets/css/Register.module.css';
import Navbar from './Navbar';

const { Option } = Select;

const Register = () => {
  // 表单引用
  const [form] = Form.useForm();

  // UI 状态
  const [uiState, setUiState] = useState({
    isSubmitting: false,
    isSendingCode: false,
    isFocused: false,
    verificationCodeSent: false,
    verificationCountdown: 0
  });

  // 处理焦点
  const handleFocus = useCallback(() => {
    setUiState(prev => ({ ...prev, isFocused: true }));
  }, []);

  // 处理失焦
  const handleBlur = useCallback(() => {
    setUiState(prev => ({ ...prev, isFocused: false }));
  }, []);

  // 验证码倒计时
  useEffect(() => {
    let timer;
    if (uiState.verificationCodeSent && uiState.verificationCountdown > 0) {
      timer = setTimeout(() => {
        setUiState(prev => ({
          ...prev,
          verificationCountdown: prev.verificationCountdown - 1
        }));
      }, 1000);
    } else if (uiState.verificationCodeSent && uiState.verificationCountdown === 0) {
      setUiState(prev => ({
        ...prev,
        verificationCodeSent: false
      }));
    }
    return () => clearTimeout(timer);
  }, [uiState.verificationCodeSent, uiState.verificationCountdown]);

  // 发送验证码
  const handleSendVerificationCode = useCallback(async () => {
    try {
      // 获取邮箱值并验证
      const email = form.getFieldValue('email');

      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        message.error('请先输入有效的邮箱地址');
        return;
      }

      setUiState(prev => ({ ...prev, isSendingCode: true }));

      const response = await axios.get('http://127.0.0.1:8080/email/sendVerificationCode', {
        params: { email }
      });

      message.success(response.data);

      if (response.data.includes('已发送')) {
        setUiState(prev => ({
          ...prev,
          verificationCodeSent: true,
          verificationCountdown: 120
        }));
      }
    } catch (error) {
      message.error(error.response?.data || '发送验证码失败，请稍后重试');
    } finally {
      setUiState(prev => ({ ...prev, isSendingCode: false }));
    }
  }, [form]);

  // 提交表单
  const handleSubmit = useCallback(async (values) => {
    try {
      setUiState(prev => ({ ...prev, isSubmitting: true }));

      const registrationData = {
        username: values.username,
        email: values.email,
        password: values.password,
        birthday: values.birthday.format('YYYY-MM-DD'),
        gender: values.gender,
        verificationCode: values.verificationCode
      };

      const response = await axios.post('http://127.0.0.1:8080/register', registrationData);
      message.success(response.data);
      // 成功后可以跳转到登录页
      setTimeout(() => {
        window.location.href = '/login';
      }, 2000);

    } catch (error) {
      console.error('Registration error:', error);
      message.error(error.response?.data || '注册失败，请稍后重试');
    } finally {
      setUiState(prev => ({ ...prev, isSubmitting: false }));
    }
  }, []);

  return (
      <div className={styles.registerContainer}>
        <Navbar />
        <div className={`${styles.backgroundBlur} ${uiState.isFocused ? styles.blur : ''}`} />

        <Card
            className={styles.registerForm}
            bordered={false}
            style={{ background: 'rgba(255, 255, 255, 0.8)' }}
        >
          <h1 className={styles.registerTitle}>用户注册</h1>

          <Form
              form={form}
              name="register"
              layout="vertical"
              requiredMark={false}
              onFinish={handleSubmit}
              initialValues={{
                gender: 'male'
              }}
          >
            <Form.Item
                name="username"
                label="用户名"
                rules={[
                  { required: true, message: '请输入用户名' },
                  { min: 3, message: '用户名至少需要3个字符' }
                ]}
            >
              <Input
                  prefix={<UserOutlined />}
                  placeholder="请输入用户名"
                  onFocus={handleFocus}
                  onBlur={handleBlur}
              />
            </Form.Item>

            <Form.Item
                name="email"
                label="电子邮箱"
                rules={[
                  { required: true, message: '请输入邮箱地址' },
                  { type: 'email', message: '请输入有效的邮箱地址' }
                ]}
            >
              <Input
                  prefix={<MailOutlined />}
                  placeholder="请输入邮箱地址"
                  onFocus={handleFocus}
                  onBlur={handleBlur}
              />
            </Form.Item>

            <Form.Item label="验证码">
              <Space style={{ display: 'flex', width: '100%' }}>
                <Form.Item
                    name="verificationCode"
                    noStyle
                    rules={[{ required: true, message: '请输入验证码' }]}
                >
                  <Input
                      prefix={<SafetyCertificateOutlined />}
                      placeholder="请输入验证码"
                      onFocus={handleFocus}
                      onBlur={handleBlur}
                      style={{ flex: 1 }}
                  />
                </Form.Item>
                <Button
                    type="primary"
                    onClick={handleSendVerificationCode}
                    loading={uiState.isSendingCode}
                    disabled={uiState.isSendingCode || uiState.verificationCodeSent}
                    style={{
                      backgroundColor: '#8bc34a',
                      borderColor: '#8bc34a'
                    }}
                >
                  {uiState.verificationCodeSent
                      ? `重新发送 (${uiState.verificationCountdown}s)`
                      : uiState.isSendingCode
                          ? '发送中...'
                          : '获取验证码'}
                </Button>
              </Space>
            </Form.Item>

            <Form.Item
                name="password"
                label="密码"
                rules={[
                  { required: true, message: '请输入密码' },
                  { min: 8, message: '密码至少需要8个字符' }
                ]}
                hasFeedback
            >
              <Input.Password
                  prefix={<LockOutlined />}
                  placeholder="请输入密码"
                  onFocus={handleFocus}
                  onBlur={handleBlur}
              />
            </Form.Item>

            <Form.Item
                name="confirmPassword"
                label="确认密码"
                dependencies={['password']}
                hasFeedback
                rules={[
                  { required: true, message: '请再次输入密码' },
                  ({ getFieldValue }) => ({
                    validator(_, value) {
                      if (!value || getFieldValue('password') === value) {
                        return Promise.resolve();
                      }
                      return Promise.reject(new Error('两次输入的密码不一致'));
                    },
                  }),
                ]}
            >
              <Input.Password
                  prefix={<LockOutlined />}
                  placeholder="请再次输入密码"
                  onFocus={handleFocus}
                  onBlur={handleBlur}
              />
            </Form.Item>

            <Form.Item
                name="birthday"
                label="出生日期"
                rules={[{ required: true, message: '请选择出生日期' }]}
            >
              <DatePicker
                  style={{ width: '100%' }}
                  placeholder="请选择出生日期"
                  onFocus={handleFocus}
                  onBlur={handleBlur}
                  format="YYYY-MM-DD"
                  suffixIcon={<CalendarOutlined />}
              />
            </Form.Item>

            <Form.Item
                name="gender"
                label="性别"
                rules={[{ required: true, message: '请选择性别' }]}
            >
              <Select
                  placeholder="请选择性别"
                  onFocus={handleFocus}
                  onBlur={handleBlur}
              >
                <Option value="male">男</Option>
                <Option value="female">女</Option>
                <Option value="other">其他</Option>
              </Select>
            </Form.Item>

            <Form.Item>
              <Button
                  type="primary"
                  htmlType="submit"
                  className={styles.submitButton}
                  loading={uiState.isSubmitting}
                  block
              >
                {uiState.isSubmitting ? '注册中...' : '注册'}
              </Button>
            </Form.Item>
          </Form>
        </Card>
      </div>
  );
};

export default Register;