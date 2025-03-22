// FriendSidebar.js
import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Menu, Badge } from 'antd';
import {
    HomeOutlined,
    TeamOutlined,
    UserAddOutlined,
    SearchOutlined,
} from '@ant-design/icons';
import styles from '../../assets/css/friend/FriendSidebar.module.css';

const FriendSidebar = ({ pendingRequests = 0 }) => {
    const navigate = useNavigate();
    const location = useLocation();
    const [selectedKey, setSelectedKey] = useState('center');

    // 根据当前路径设置选中的菜单项
    useEffect(() => {
        const path = location.pathname;
        if (path.includes('/friend/create')) {
            setSelectedKey('create-profile');
        } else if (path.includes('/friend/matches')) {
            setSelectedKey('matches');
        } else if (path.includes('/friend/my')) {
            setSelectedKey('my-friends');
        } else if (path.includes('/friend/detail')) {
            setSelectedKey(''); // 详情页不高亮任何菜单项
        } else {
            setSelectedKey('center');
        }
    }, [location]);

    // 处理菜单项点击
    const handleMenuClick = (e) => {
        switch (e.key) {
            case 'center':
                navigate('/friend');
                break;
            case 'create-profile':
                navigate('/friend/create');
                break;
            case 'matches':
                navigate('/friend/matches');
                break;
            case 'my-friends':
                navigate('/friend/my');
                break;
            default:
                break;
        }
    };

    return (
        <div className={styles.sidebarContainer}>
            <div className={styles.sidebarHeader}>
                <h2 className={styles.sidebarTitle}>搭子服务</h2>
            </div>
            <Menu
                mode="vertical"
                selectedKeys={[selectedKey]}
                onClick={handleMenuClick}
                className={styles.sidebarMenu}
            >
                <Menu.Item key="center" icon={<HomeOutlined />}>
                    搭子中心
                </Menu.Item>
                <Menu.Item key="create-profile" icon={<UserAddOutlined />}>
                    创建档案
                </Menu.Item>
                <Menu.Item key="matches" icon={<SearchOutlined />}>
                    搭子匹配
                </Menu.Item>
                <Menu.Item key="my-friends" icon={<TeamOutlined />}>
                    我的搭子
                    {pendingRequests > 0 && (
                        <Badge count={pendingRequests} offset={[10, 0]} />
                    )}
                </Menu.Item>
            </Menu>
        </div>
    );
};

export default FriendSidebar;