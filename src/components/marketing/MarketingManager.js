// src/components/marketing/MarketingManager.js
import React from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { Layout, Menu, Typography, ConfigProvider } from 'antd';
import {
    CalendarOutlined,
    ClockCircleOutlined,
    EnvironmentOutlined,
} from '@ant-design/icons';

import Navbar from '../base/Navbar'; // 引入导航栏组件
import SpecialDateManager from './SpecialDateManager';
import TimeRangeManager from './TimeRangeManager';
import RegionManager from './region/RegionManager';
import styles from '../../assets/css/marketing/MarketingManager.module.css';

const { Content, Sider } = Layout;
const { Title } = Typography;

const MarketingManager = () => {
    const navigate = useNavigate();
    const location = useLocation();

    // 获取当前激活的模块
    const getActiveModule = () => {
        const path = location.pathname;
        if (path.includes('/special-dates')) return 'specialDates';
        if (path.includes('/time-ranges')) return 'timeRanges';
        if (path.includes('/regions')) return 'regions';
        return 'specialDates';
    };

    // 根据当前模块获取背景样式
    const getBackgroundClass = () => {
        const activeModule = getActiveModule();
        switch(activeModule) {
            case 'specialDates':
                return styles.specialDatesBackground;
            case 'timeRanges':
                return styles.timeRangesBackground;
            case 'regions':
                return styles.regionsBackground;
            default:
                return styles.defaultBackground;
        }
    };

    // 定义导航项
    const navigationItems = [
        {
            key: 'specialDates',
            icon: <CalendarOutlined />,
            label: '特殊日期管理',
            onClick: () => navigate('/marketing/special-dates')
        },
        {
            key: 'timeRanges',
            icon: <ClockCircleOutlined />,
            label: '特殊时段管理',
            onClick: () => navigate('/marketing/time-ranges')
        },
        {
            key: 'regions',
            icon: <EnvironmentOutlined />,
            label: '配送区域管理',
            onClick: () => navigate('/marketing/regions')
        },
    ];

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
                <Navbar /> {/* 添加顶部导航栏 */}
                <div className={styles.contentWrapper}>
                    <Layout className={styles.contentContainer}>
                        <Sider
                            width={200}
                            className={styles.sidebar}
                            theme="light"
                        >
                            <Title level={4} className={styles.sidebarTitle}>
                                营销管理系统
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
                                <Route path="/" element={<Navigate to="special-dates" replace />} />
                                <Route path="special-dates" element={<SpecialDateManager />} />
                                <Route path="time-ranges" element={<TimeRangeManager />} />
                                <Route path="regions" element={<RegionManager />} />
                            </Routes>
                        </Content>
                    </Layout>
                </div>
            </div>
        </ConfigProvider>
    );
};

export default MarketingManager;