// src/components/shopping/PurchaseRequestLayout.js
import React from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { Layout, Menu, Typography, ConfigProvider } from 'antd';
import {
    ShoppingOutlined,
    PlusOutlined,
    UnorderedListOutlined,
    UserOutlined,
    DollarOutlined,
} from '@ant-design/icons';

import Navbar from '../base/Navbar';
import PurchaseRequestList from './PurchaseRequestList';
import PurchaseRequestDetail from './PurchaseRequestDetail';
import PurchaseRequestForm from './PurchaseRequestForm';
import MyPurchaseRequests from './MyPurchaseRequests';
import WaitingPaymentPurchaseRequests from './WaitingPaymentPurchaseRequests'; // 新增组件导入
import styles from '../../assets/css/purchaserequest/PurchaseRequestLayout.module.css';
import { useAuth } from '../context/AuthContext';

const { Content, Sider } = Layout;
const { Title } = Typography;

const PurchaseRequestLayout = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { isLoggedIn, isMessenger } = useAuth();

    // 获取当前激活的模块
    const getActiveModule = () => {
        const path = location.pathname;
        if (path.includes('/request/create')) return 'create';
        if (path.includes('/request/my-requests')) return 'myRequests';
        if (path.includes('/request/pending-payment')) return 'pendingPayment'; // 新增待支付选项
        if (path.includes('/request/available-mutual')) return 'available'; // 修改为对应后端API路径
        if (path.match(/\/request\/\w/)) return 'detail'; // 如果是详情页，暂时不高亮任何菜单项
        return 'list';
    };

    // 获取背景样式
    const getBackgroundClass = () => {
        const activeModule = getActiveModule();
        switch(activeModule) {
            case 'create':
                return styles.createBackground;
            case 'myRequests':
                return styles.myRequestsBackground;
            case 'pendingPayment': // 新增待支付背景样式
                return styles.pendingPaymentBackground || styles.myRequestsBackground; // 复用已有样式或创建新样式
            case 'detail':
                return styles.detailBackground;
            default:
                return styles.listBackground;
        }
    };

    // 定义导航项
    const navigationItems = [
        {
            key: 'list',
            icon: <UnorderedListOutlined />,
            label: '所有代购需求',
            onClick: () => navigate('/request')
        },
        {
            key: 'pendingPayment', // 新增待支付导航项
            icon: <DollarOutlined />,
            label: '待支付需求',
            onClick: () => navigate('/request/pending-payment'),
            disabled: !isLoggedIn
        },
        {
            key: 'myRequests',
            icon: <UserOutlined />,
            label: '我的代购需求',
            onClick: () => navigate('/request/my-requests'),
            disabled: !isLoggedIn
        },
        {
            key: 'create',
            icon: <PlusOutlined />,
            label: '发布代购需求',
            onClick: () => navigate('/request/create'),
            disabled: !isLoggedIn
        }
    ];

    // 如果是配送员，添加"可接单列表"
    if (isMessenger) {
        navigationItems.splice(1, 0, {
            key: 'available',
            icon: <ShoppingOutlined />,
            label: '可接单列表',
            onClick: () => navigate('/request/available-mutual') // 修改为与后端API匹配的路径
        });
    }

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
                                校园代购系统
                            </Title>
                            <Menu
                                mode="vertical"
                                selectedKeys={[getActiveModule()]}
                                className={styles.menuList}
                                items={navigationItems}
                            />
                        </Sider>
                        <Content className={styles.mainContent}>
                            <Routes>
                                <Route path="/" element={<PurchaseRequestList />} />
                                <Route path="/create" element={<PurchaseRequestForm />} />
                                <Route path="/my-requests" element={
                                    isLoggedIn ? <MyPurchaseRequests /> : <Navigate to="/login" replace />
                                } />
                                {/* 新增待支付订单路由 */}
                                <Route path="/pending-payment" element={
                                    isLoggedIn ? <WaitingPaymentPurchaseRequests /> : <Navigate to="/login" replace />
                                } />
                                {/* 修改可接单列表路由，使其与后端API匹配 */}
                                {isMessenger && (
                                    <Route path="/available-mutual" element={<PurchaseRequestList isAvailableOnly={true} />} />
                                )}
                                <Route path="/:requestNumber" element={<PurchaseRequestDetail />} />
                            </Routes>
                        </Content>
                    </Layout>
                </div>
            </div>
        </ConfigProvider>
    );
};

export default PurchaseRequestLayout;