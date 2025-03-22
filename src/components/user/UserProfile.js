// UserProfile.js 使用Ant Design重构
import React, { useEffect, useState, useCallback } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { Card, Avatar, Typography, Button, Spin, Descriptions, Result, Badge } from 'antd';
import { EditOutlined, SafetyCertificateOutlined, UserOutlined, CommentOutlined } from '@ant-design/icons';
import styles from '../../assets/css/user/UserProfile.module.css';
import Navbar from '../base/Navbar';
import { getGenderText, getVerificationStatusText } from '../utils/map/userMap';

const { Title } = Typography;

/**
 * 用户资料页面组件 - 使用Ant Design重构
 * 展示和管理用户个人信息
 * 支持实名认证和资料编辑功能
 */
const UserProfile = () => {
  // 状态管理
  const [userInfo, setUserInfo] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Hooks
  const navigate = useNavigate();

  // 初始化用户资料
  useEffect(() => {
    const initializeProfile = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // 获取用户信息
        const response = await axios.get(
            'http://127.0.0.1:8080/api/users/profile',
            { withCredentials: true }
        );

        if (response.status === 200) {
          setUserInfo(response.data);
        } else {
          throw new Error('获取用户信息失败');
        }
      } catch (error) {
        console.error('获取用户信息失败:', error);
        setError(error.message);
      } finally {
        setIsLoading(false);
      }
    };

    initializeProfile();
  }, []);

  // 处理资料编辑
  const handleEditProfile = useCallback(() => {
    try {
      navigate('/edit-profile', { replace: true });
    } catch (error) {
      console.error('导航错误:', error);
      setError('页面跳转失败');
    }
  }, [navigate]);

  // 处理实名认证
  const handleVerification = useCallback(() => {
    try {
      navigate('/verification', { replace: true });
    } catch (error) {
      console.error('导航错误:', error);
      setError('页面跳转失败');
    }
  }, [navigate]);

  // 获取认证状态的Badge状态
  const getVerificationStatusBadge = (status) => {
    switch(status) {
      case 'VERIFIED':
        return 'success';
      case 'PENDING':
        return 'processing';
      case 'REJECTED':
        return 'error';
      default:
        return 'default';
    }
  };

  // 错误状态展示
  if (error) {
    return (
        <div className={styles.pageContainer}>
          <Navbar />
          <div className={styles.profileBackground}></div>
          <div className={styles.errorContainer}>
            <Result
                status="error"
                title="加载失败"
                subTitle={error}
            />
          </div>
        </div>
    );
  }

  // 加载状态展示
  if (isLoading || !userInfo) {
    return (
        <div className={styles.pageContainer}>
          <Navbar />
          <div className={styles.profileBackground}></div>
          <div className={styles.loadingContainer}>
            <Spin size="large" tip="加载中..." />
          </div>
        </div>
    );
  }

  // 渲染用户资料
  return (
      <div className={styles.pageContainer}>
        <Navbar />
        <div className={styles.profileBackground}></div>

        <Card
            className={styles.profileContainer}
            bordered={false}
        >
          <div className={styles.avatarWrapper}>
            <div className={styles.avatarContainer}>
              <Avatar
                  size={150}
                  src={userInfo.avatarUrl}
                  icon={<UserOutlined />}
                  className={styles.avatar}
              />
            </div>
          </div>

          <Title level={3} className={styles.title}>用户信息</Title>

          <Descriptions
              className={styles.infoSection}
              bordered={false}
              column={1}
              labelStyle={{ fontWeight: '500', color: '#666', width: '100px' }}
              contentStyle={{ fontWeight: '500', color: '#333' }}
          >
            <Descriptions.Item label="用户名">{userInfo.username}</Descriptions.Item>
            <Descriptions.Item label="电子邮箱">{userInfo.email}</Descriptions.Item>
            <Descriptions.Item label="注册日期">
              {new Date(userInfo.registrationDate).toLocaleDateString('zh-CN')}
            </Descriptions.Item>
            <Descriptions.Item label="生日">
              {userInfo.birthday ? new Date(userInfo.birthday).toLocaleDateString('zh-CN') : '未设置'}
            </Descriptions.Item>
            <Descriptions.Item label="性别">{getGenderText(userInfo.gender)}</Descriptions.Item>
            <Descriptions.Item label="用户组">{userInfo.userGroup}</Descriptions.Item>
            <Descriptions.Item label="认证状态">
              <Badge
                  status={getVerificationStatusBadge(userInfo.userVerificationStatus)}
                  text={getVerificationStatusText(userInfo.userVerificationStatus)}
                  className={styles.verificationStatus}
              />
            </Descriptions.Item>
          </Descriptions>

          <div className={styles.buttonContainer}>
            <Button
                type="primary"
                icon={<EditOutlined />}
                size="large"
                onClick={handleEditProfile}
                className={styles.profileButton}
            >
              修改用户信息
            </Button>

            {userInfo.userVerificationStatus !== 'VERIFIED' && (
                <Button
                    type="primary"
                    danger={userInfo.userVerificationStatus === 'REJECTED'}
                    icon={<SafetyCertificateOutlined />}
                    size="large"
                    onClick={handleVerification}
                    disabled={userInfo.userVerificationStatus === 'PENDING'}
                    className={`${styles.profileButton} ${styles.verificationButton}`}
                >
                  {userInfo.userVerificationStatus === 'PENDING' ? '实名认证审核中' : '进行实名认证'}
                </Button>
            )}

            {/* 新增评价历史按钮 */}
            <Button
                type="primary"
                icon={<CommentOutlined />}
                size="large"
                onClick={() => navigate('/ratings/my')}
                className={styles.profileButton}
                style={{ backgroundColor: '#52c41a', borderColor: '#52c41a' }}
            >
              我的评价历史
            </Button>
          </div>
        </Card>
      </div>
  );
};

export default UserProfile;