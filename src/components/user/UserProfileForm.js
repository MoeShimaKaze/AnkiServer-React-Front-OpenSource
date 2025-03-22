import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { useHeartbeat } from '../context/HeartbeatContext';
import styles from '../../assets/css/user/UserProfileForm.module.css';
import Navbar from '../base/Navbar';
import Loading from '../utils/Loading';
import { getGenderOptions } from '../utils/map/userMap';
import { Form, Input, Button, DatePicker, Select, Switch, Upload, Alert } from 'antd';
import { UploadOutlined, ArrowLeftOutlined } from '@ant-design/icons';
import moment from 'moment';

const { Option } = Select;

const UserProfileForm = () => {
  const navigate = useNavigate();
  const { stopHeartbeat } = useHeartbeat();
  const [form] = Form.useForm();

  // 初始化用户表单数据状态
  const [formData, setFormData] = useState({
    email: '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
    birthday: '',
    gender: '',
    verificationCode: '',
    id: ''
  });

  // UI状态管理
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const [changeEmail, setChangeEmail] = useState(false);
  const [changePassword, setChangePassword] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  // 处理连接断开的逻辑
  const handleDisconnect = useCallback(() => {
    try {
      stopHeartbeat();
      navigate('/login', { replace: true });
    } catch (error) {
      console.error('导航错误:', error);
    }
  }, [navigate, stopHeartbeat]);

  // 加载用户数据
  useEffect(() => {
    let isComponentMounted = true;

    const loadUserData = async () => {
      try {
        setIsLoading(true);
        const response = await axios.get('http://127.0.0.1:8080/api/users/profile', {
          withCredentials: true
        });

        if (!isComponentMounted) return;

        if (response.status === 200 && response.data) {
          const user = response.data;
          setFormData(prev => ({
            ...prev,
            email: user.email || '',
            birthday: user.birthday || '',
            gender: user.gender || '',
            id: user.id || ''
          }));

          if (user.birthday) {
            form.setFieldsValue({
              birthday: moment(user.birthday),
              gender: user.gender,
              email: user.email
            });
          }

          setAvatarPreview(user.avatarUrl || '');
        }
      } catch (error) {
        if (!isComponentMounted) return;
        console.error('获取用户信息失败:', error);
        setError('获取用户信息失败，请稍后重试');
        handleDisconnect();
      } finally {
        if (isComponentMounted) {
          setIsLoading(false);
        }
      }
    };

    loadUserData();

    return () => {
      isComponentMounted = false;
    };
  }, [handleDisconnect, form]);

  const handleReturn = useCallback(() => {
    try {
      navigate('/profile', { replace: true });
    } catch (error) {
      console.error('导航错误:', error);
    }
  }, [navigate]);

  // 表单元素的焦点状态控制
  const handleFocus = () => setIsFocused(true);
  const handleBlur = () => setIsFocused(false);

  // 处理表单输入变化
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setError('');
  };

  // 处理头像上传
  const handleAvatarChange = (info) => {
    if (info.file.status === 'uploading') {
      return;
    }

    if (info.file.status === 'done') {
      const file = info.file.originFileObj;

      if (file.size > 5 * 1024 * 1024) {
        setError('头像文件大小不能超过5MB');
        return;
      }

      const allowedTypes = ['image/jpeg', 'image/png', 'image/gif'];
      if (!allowedTypes.includes(file.type)) {
        setError('只支持 JPG、PNG 和 GIF 格式的图片');
        return;
      }

      setAvatarFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setAvatarPreview(reader.result);
      reader.readAsDataURL(file);
    }
  };

  // 控制邮箱修改状态
  const handleEmailChangeToggle = (checked) => {
    setChangeEmail(checked);
    if (!checked) {
      setFormData(prev => ({ ...prev, verificationCode: '' }));
      form.setFieldsValue({ verificationCode: '' });
    }
  };

  // 控制密码修改状态
  const handlePasswordChangeToggle = (checked) => {
    setChangePassword(checked);
    if (!checked) {
      setFormData(prev => ({
        ...prev,
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
        verificationCode: ''
      }));
      form.setFieldsValue({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
        verificationCode: ''
      });
    }
  };

  // 发送验证码
  const handleSendVerificationCode = async () => {
    if (isSubmitting) return;

    try {
      setIsSubmitting(true);
      setError('');
      const response = await axios.get(
          `http://127.0.0.1:8080/email/sendVerificationCode?email=${formData.email}`,
          { withCredentials: true }
      );

      if (response.data) {
        setSuccessMessage('验证码已发送，请查收邮件');
      }
    } catch (error) {
      setError(error.response?.data || '验证码发送失败，请稍后重试');
      console.error('验证码发送失败:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // 提交表单
  const handleSubmit = async (values) => {
    if (isSubmitting) return;

    try {
      setIsSubmitting(true);
      setError('');
      setSuccessMessage('');

      const formDataToSend = new FormData();
      formDataToSend.append('id', formData.id);

      // 添加敏感信息和验证码
      if (changeEmail) {
        formDataToSend.append('email', values.email);
        formDataToSend.append('verificationCode', values.verificationCode);
      }

      if (changePassword) {
        formDataToSend.append('currentPassword', values.currentPassword);
        formDataToSend.append('newPassword', values.newPassword);
        formDataToSend.append('verificationCode', values.verificationCode);
      }

      // 转换日期格式
      const birthdayValue = values.birthday instanceof moment
          ? values.birthday.format('YYYY-MM-DD')
          : values.birthday;

      formDataToSend.append('birthday', birthdayValue);
      formDataToSend.append('gender', values.gender);

      if (avatarFile) {
        formDataToSend.append('avatar', avatarFile);
      }

      const updateResponse = await axios.put(
          'http://127.0.0.1:8080/api/users/update',
          formDataToSend,
          {
            withCredentials: true,
            headers: {
              'Content-Type': 'multipart/form-data'
            }
          }
      );

      if (updateResponse.data) {
        setSuccessMessage('个人信息更新成功');
        await new Promise(resolve => setTimeout(resolve, 1500));
        handleReturn();
      }
    } catch (error) {
      console.error('更新失败:', error);
      setError(typeof error === 'string' ? error : (error.response?.data || error.message || '更新失败，请稍后重试'));
    } finally {
      setIsSubmitting(false);
    }
  };

  // 加载状态展示
  if (isLoading) {
    return (
        <div className={styles.pageContainer}>
          <Navbar />
          <div className={styles.loadingContainer}>
            <Loading size="lg" color="dark" />
          </div>
        </div>
    );
  }

  return (
      <div className={styles.pageContainer}>
        <Navbar />
        <div className={`${styles.background} ${isFocused ? styles.blur : ''}`}></div>
        <div className={styles.container}>
          <div
              className={styles.form}
              onFocus={handleFocus}
              onBlur={handleBlur}
          >
            {isSubmitting && (
                <div className={styles.submittingOverlay}>
                  <Loading size="lg" color="dark" />
                </div>
            )}

            <div className={styles.formHeader}>
              <h2 className={styles.title}>个人信息修改</h2>
              <Button
                  type="default"
                  icon={<ArrowLeftOutlined />}
                  onClick={handleReturn}
                  className={styles.returnButton}
              >
                返回
              </Button>
            </div>

            {error && <Alert message={error} type="error" showIcon style={{marginBottom: '20px'}} />}
            {successMessage && <Alert message={successMessage} type="success" showIcon style={{marginBottom: '20px'}} />}

            <div className={styles.avatarUploadContainer}>
              <div className={styles.avatarPreview}>
                <img
                    src={avatarPreview || '/default-avatar.png'}
                    alt="头像"
                    className={styles.avatarImage}
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.src = '/default-avatar.png';
                    }}
                />
              </div>
              <Upload
                  name="avatar"
                  showUploadList={false}
                  beforeUpload={() => false}
                  onChange={handleAvatarChange}
              >
                <Button
                    icon={<UploadOutlined />}
                    className={styles.avatarButton}
                >
                  更换头像
                </Button>
              </Upload>
            </div>

            <Form
                form={form}
                layout="vertical"
                onFinish={handleSubmit}
                initialValues={formData}
                className={styles.formContent}
            >
              <div className={styles.inputWrapper}>
                <label className={styles.label}>电子邮箱:</label>
                <Form.Item
                    name="email"
                    noStyle
                >
                  <Input
                      disabled={!changeEmail}
                      onChange={(e) => handleChange({ target: { name: 'email', value: e.target.value } })}
                      className={styles.input}
                  />
                </Form.Item>
              </div>

              <div className={styles.toggleWrapper}>
                <label className={styles.toggleLabel}>
                  修改邮箱
                  <Switch
                      checked={changeEmail}
                      onChange={handleEmailChangeToggle}
                      className={styles.switch}
                  />
                </label>
              </div>

              <div className={styles.toggleWrapper}>
                <label className={styles.toggleLabel}>
                  修改密码
                  <Switch
                      checked={changePassword}
                      onChange={handlePasswordChangeToggle}
                      className={styles.switch}
                  />
                </label>
              </div>

              {(changeEmail || changePassword) && (
                  <div className={styles.verificationSection}>
                    <div className={styles.inputWrapper}>
                      <label className={styles.label}>验证码:</label>
                      <div className={styles.verificationInputGroup}>
                        <Form.Item
                            name="verificationCode"
                            noStyle
                            rules={[{ required: true, message: '请输入验证码' }]}
                        >
                          <Input
                              placeholder="请输入验证码"
                              onChange={(e) => handleChange({ target: { name: 'verificationCode', value: e.target.value } })}
                              className={styles.verificationInput}
                          />
                        </Form.Item>
                        <Button
                            type="primary"
                            onClick={handleSendVerificationCode}
                            disabled={isSubmitting}
                            className={styles.verificationButton}
                        >
                          发送验证码
                        </Button>
                      </div>
                    </div>
                  </div>
              )}

              {changePassword && (
                  <div className={styles.passwordSection}>
                    <div className={styles.inputWrapper}>
                      <label className={styles.label}>当前密码:</label>
                      <Form.Item
                          name="currentPassword"
                          noStyle
                          rules={[{ required: true, message: '请输入当前密码' }]}
                      >
                        <Input.Password
                            placeholder="请输入当前密码"
                            onChange={(e) => handleChange({ target: { name: 'currentPassword', value: e.target.value } })}
                            className={styles.input}
                        />
                      </Form.Item>
                    </div>
                    <div className={styles.inputWrapper}>
                      <label className={styles.label}>新密码:</label>
                      <Form.Item
                          name="newPassword"
                          noStyle
                          rules={[
                            { required: true, message: '请输入新密码' },
                            { min: 6, message: '密码长度不能少于6位' }
                          ]}
                      >
                        <Input.Password
                            placeholder="请输入新密码"
                            onChange={(e) => handleChange({ target: { name: 'newPassword', value: e.target.value } })}
                            className={styles.input}
                        />
                      </Form.Item>
                    </div>
                    <div className={styles.inputWrapper}>
                      <label className={styles.label}>确认密码:</label>
                      <Form.Item
                          name="confirmPassword"
                          noStyle
                          rules={[
                            { required: true, message: '请再次输入新密码' },
                            ({ getFieldValue }) => ({
                              validator(_, value) {
                                if (!value || getFieldValue('newPassword') === value) {
                                  return Promise.resolve();
                                }
                                return Promise.reject(new Error('两次输入的密码不一致'));
                              },
                            }),
                          ]}
                      >
                        <Input.Password
                            placeholder="请再次输入新密码"
                            onChange={(e) => handleChange({ target: { name: 'confirmPassword', value: e.target.value } })}
                            className={styles.input}
                        />
                      </Form.Item>
                    </div>
                  </div>
              )}

              <div className={styles.inputWrapper}>
                <label className={styles.label}>生日:</label>
                <Form.Item
                    name="birthday"
                    noStyle
                    rules={[{ required: true, message: '请选择生日' }]}
                >
                  <DatePicker
                      format="YYYY-MM-DD"
                      placeholder="请选择生日"
                      className={styles.input}
                      style={{ width: '100%' }}
                  />
                </Form.Item>
              </div>

              <div className={styles.inputWrapper}>
                <label className={styles.label}>性别:</label>
                <Form.Item
                    name="gender"
                    noStyle
                    rules={[{ required: true, message: '请选择性别' }]}
                >
                  <Select
                      placeholder="请选择性别"
                      className={styles.select}
                  >
                    {getGenderOptions().map(({ value, label }) => (
                        <Option key={value} value={value}>{label}</Option>
                    ))}
                  </Select>
                </Form.Item>
              </div>

              <Button
                  type="primary"
                  htmlType="submit"
                  disabled={isSubmitting}
                  className={styles.submitButton}
              >
                {isSubmitting ? '更新中...' : '更新个人信息'}
              </Button>
            </Form>
          </div>
        </div>
      </div>
  );
};

export default UserProfileForm;