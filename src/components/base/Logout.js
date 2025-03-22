import React from 'react';
import { Button, message } from 'antd';
import { LogoutOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useHeartbeat } from '../context/HeartbeatContext';
import styles from '../../assets/css/login/LogoutButton.module.css';

/**
 * 登出组件 - 使用Ant Design实现
 * 实现用户登出功能，并在登出过程中提供反馈
 */
const Logout = () => {
  const navigate = useNavigate();
  const { stopHeartbeat } = useHeartbeat();
  const { logout } = useAuth();

  const handleLogout = async () => {
    try {
      // 显示登出中的加载提示
      const loadingMessage = message.loading('正在登出...', 0);

      // 调用登出方法并获取结果
      const result = await logout();

      // 停止心跳检测
      stopHeartbeat();

      // 关闭加载提示
      loadingMessage();

      if (result.success) {
        // 成功登出，显示成功消息，重定向到登录页
        message.success('登出成功');
        navigate('/login');
      } else {
        // 登出失败，显示错误消息，仍然重定向到登录页
        console.error('登出失败:', result.error);
        message.error(result.error || '登出失败');
        navigate('/login');
      }
    } catch (error) {
      // 处理意外错误
      console.error('登出过程发生错误:', error);
      message.error('登出时发生错误，请检查网络连接');
      navigate('/login');
    }
  };

  return (
      <Button
          type="primary"
          icon={<LogoutOutlined />}
          onClick={handleLogout}
          className={styles.logoutButton}
          aria-label="登出"
      >
        登出
      </Button>
  );
};

export default Logout;