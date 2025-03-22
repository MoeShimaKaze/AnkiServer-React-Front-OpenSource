// MailOrder.js
import React from 'react';
import { useHeartbeat } from '../context/HeartbeatContext';
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { Layout, Menu, Typography, ConfigProvider } from 'antd';
import {
  ShoppingOutlined,
  UnorderedListOutlined,
  FileOutlined,
  UserSwitchOutlined,
  ToolOutlined,
  CarOutlined,
  DollarOutlined
} from '@ant-design/icons';

import Navbar from '../base/Navbar';
import CreateOrderForm from './CreateOrderForm';
import AssignOrderList from './AssignOrderList';
import OrderManagement from './OrderManagement';
import AdminOrderManagement from './AdminOrderManagement';
import MyAssignedOrders from './MyAssignedOrders';
import MessengerOrderList from './MessengerOrderList';
import WaitingPaymentOrders from './WaitingPaymentOrders';
import styles from '../../assets/css/mail/MailOrder.module.css';
import { ProtectedRoute } from '../utils/ProtectedRoute';

const { Content, Sider } = Layout;
const { Title } = Typography;

// 修改为通过 props 接收角色信息
const MailOrder = ({ isAdmin = false, isMessenger = false }) => {
  const navigate = useNavigate();
  const location = useLocation();
  useHeartbeat(); // 保留心跳检测

  // 获取当前激活的模块
  const getActiveModule = () => {
    const path = location.pathname;
    if (path.includes('/create')) return 'create';
    if (path.includes('/pending')) return 'pending';
    if (path.includes('/my-orders')) return 'myOrders';
    if (path.includes('/assigned')) return 'assigned';
    if (path.includes('/admin')) return 'admin';
    if (path.includes('/messenger')) return 'messenger';
    if (path.includes('/waiting-payment')) return 'waitingPayment';
    return 'create';
  };

  // 根据当前模块获取背景样式
  const getBackgroundClass = () => {
    const activeModule = getActiveModule();
    switch(activeModule) {
      case 'create':
        return styles.createOrderBackground;
      case 'pending':
        return styles.pendingOrdersBackground;
      case 'myOrders':
        return styles.orderManagementBackground;
      case 'assigned':
        return styles.myAssignedOrdersBackground;
      case 'admin':
        return styles.adminOrderBackground;
      case 'messenger':
        return styles.messengerOrderBackground;
      case 'waitingPayment':
        return styles.waitingPaymentBackground;
      default:
        return styles.defaultBackground;
    }
  };

  // 定义导航项 - 使用传入的角色信息进行条件显示
  const navigationItems = [
    {
      key: 'create',
      icon: <ShoppingOutlined />,
      label: '下单系统',
      show: true,
      onClick: () => navigate('/mailorder/create')
    },
    {
      key: 'pending',
      icon: <UnorderedListOutlined />,
      label: '待接订单',
      show: true,
      onClick: () => navigate('/mailorder/pending')
    },
    {
      key: 'my-orders',
      icon: <FileOutlined />,
      label: '我的订单',
      show: true,
      onClick: () => navigate('/mailorder/my-orders')
    },
    {
      key: 'assigned',
      icon: <UserSwitchOutlined />,
      label: '我的接单',
      show: !isMessenger,
      onClick: () => navigate('/mailorder/assigned')
    },
    {
      key: 'admin',
      icon: <ToolOutlined />,
      label: '管理员订单',
      show: isAdmin,
      onClick: () => navigate('/mailorder/admin')
    },
    {
      key: 'messenger',
      icon: <CarOutlined />,
      label: '配送员订单',
      show: isMessenger || isAdmin,
      onClick: () => navigate('/mailorder/messenger')
    },
    {
      key: 'waiting-payment',
      icon: <DollarOutlined />,
      label: '待支付订单',
      show: true,
      onClick: () => navigate('/mailorder/waiting-payment')
    },
  ];

  // 过滤有权限显示的菜单项
  const filteredNavItems = navigationItems.filter(item => item.show);

  return (
      <ConfigProvider
          theme={{
            token: {
              borderRadius: 6,
              colorPrimary: '#007bff',
            },
            components: {
              Menu: {
                itemHoverColor: '#ffffff',
                itemSelectedColor: '#ffffff',
                itemHoverBg: '#0056b3',
                itemSelectedBg: '#007bff',
                itemHeight: 50,
              }
            }
          }}
      >
        <div className={`${styles.pageContainer} ${getBackgroundClass()}`}>
          <Navbar />
          <div className={styles.contentWrapper}>
            <Layout className={styles.contentContainer}>
              <Sider
                  width={200}
                  className={styles.sidebar}
                  theme="light"
              >
                <Title level={4} className={styles.sidebarTitle}>
                  快递代拿系统
                </Title>
                <Menu
                    mode="vertical"
                    selectedKeys={[getActiveModule()]}
                    className={styles.menuList}
                    items={filteredNavItems}
                />
              </Sider>
              <Content className={styles.mainContent}>
                <Routes>
                  <Route path="/" element={<Navigate to="create" replace />} />
                  <Route path="create" element={<CreateOrderForm />} />
                  <Route path="pending" element={<AssignOrderList />} />
                  <Route path="my-orders" element={<OrderManagement />} />
                  <Route path="assigned" element={<MyAssignedOrders />} />

                  {/* 使用增强的 ProtectedRoute 保护管理员路由 */}
                  <Route path="admin" element={
                    <ProtectedRoute
                        requiredGroup="admin"
                        redirectPath="/mailorder/create"
                    >
                      <AdminOrderManagement />
                    </ProtectedRoute>
                  } />

                  {/* 使用增强的 ProtectedRoute 保护配送员路由 */}
                  <Route path="messenger" element={
                    <ProtectedRoute
                        requiredGroups={["messenger", "admin"]}
                        redirectPath="/mailorder/create"
                    >
                      <MessengerOrderList />
                    </ProtectedRoute>
                  } />

                  <Route path="waiting-payment" element={<WaitingPaymentOrders />} />
                </Routes>
              </Content>
            </Layout>
          </div>
        </div>
      </ConfigProvider>
  );
};

export default MailOrder;