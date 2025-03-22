import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button, Badge, Drawer, Dropdown, Space } from 'antd';
import {
  HomeOutlined,
  TeamOutlined,
  ShoppingOutlined,
  ToolOutlined,
  CustomerServiceOutlined,
  WalletOutlined,
  BellOutlined,
  MenuOutlined,
  GlobalOutlined,
  MailOutlined,
  UserSwitchOutlined,
  FieldTimeOutlined,
  GiftOutlined,
  ShopOutlined,
  ShoppingCartOutlined,
  FileProtectOutlined,
  MoreOutlined,
  EllipsisOutlined
} from '@ant-design/icons';
import styles from '../../assets/css/base/Navbar.module.css';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import { VALID_NOTIFICATION_TYPES, getNotificationTypeText } from '../utils/map/notificationTypeMap';
import Logout from './Logout';
import defaultAvatarIcon from '../../assets/icon/user.png';

// 定义基础导航项配置，添加优先级属性
const NAV_ITEMS = [
  {
    key: 'home',
    icon: <HomeOutlined />,
    label: '首页',
    path: '/',
    isExternal: false,
    priority: 1 // 高优先级
  },
  {
    key: 'community',
    icon: <GlobalOutlined />,
    label: '社群动态',
    path: 'https://bbs.foreactos.fun/',
    isExternal: true,
    priority: 2
  },
  {
    key: 'mailorder',
    icon: <ShoppingOutlined />,
    label: '代拿业务',
    path: '/mailorder',
    isExternal: false,
    priority: 1 // 高优先级
  },
  {
    key: 'shop',
    icon: <ShopOutlined />,
    label: '校园商城',
    path: '/shop',
    isExternal: false,
    priority: 1 // 高优先级
  },
  {
    key: 'purchaseRequest',
    icon: <ShoppingCartOutlined />,
    label: '商品代购',
    path: '/request',
    isExternal: false,
    priority: 2
  },
  {
    key: 'question',
    icon: <ToolOutlined />,
    label: '疑难专区',
    path: '/question',
    isExternal: false,
    priority: 3
  },
  {
    key: 'friend',
    icon: <UserSwitchOutlined />,
    label: '搭子匹配',
    path: '/friend',
    isExternal: false,
    priority: 3
  }
];

// 登录用户可见的导航项
const AUTH_NAV_ITEMS = [
  {
    key: 'support',
    icon: <CustomerServiceOutlined />,
    label: '工单中心',
    path: '/support',
    isExternal: false,
    priority: 2
  },
  {
    key: 'wallet',
    icon: <WalletOutlined />,
    label: '钱包',
    path: '/wallet',
    isExternal: false,
    priority: 2
  },
  {
    key: 'timeout',
    icon: <FieldTimeOutlined />,
    label: '超时统计',
    path: '/timeout-statistics',
    isExternal: false,
    priority: 3
  }
];

// 管理员可见的导航项
const ADMIN_NAV_ITEMS = [
  {
    key: 'admin',
    icon: <TeamOutlined />,
    label: '用户管理',
    path: '/allusers',
    isExternal: false,
    priority: 3
  },
  {
    key: 'marketing',
    icon: <GiftOutlined />,
    label: '营销设置',
    path: '/marketing',
    isExternal: false,
    priority: 3
  },
  {
    key: 'productReview',
    icon: <FileProtectOutlined />,
    label: '商品审核',
    path: '/admin/products/review',
    isExternal: false,
    priority: 2
  }
];

const Navbar = () => {
  const { isLoggedIn, isAdmin, username: authUsername } = useAuth();
  const { notifications, messages } = useNotification();
  const navigate = useNavigate();
  const navContainerRef = useRef(null);

  const [userAvatar, setUserAvatar] = useState(defaultAvatarIcon);
  const [showNotifications, setShowNotifications] = useState(false);
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [isMobileView, setIsMobileView] = useState(false);

  // 新增：控制可见菜单项目和溢出菜单项目
  const [visibleItems, setVisibleItems] = useState([]);
  const [overflowItems, setOverflowItems] = useState([]);
  const [showOverflowIndicator, setShowOverflowIndicator] = useState(false);

  // 获取所有导航项
  const allNavItems = useMemo(() => {
    return [
      ...NAV_ITEMS,
      ...(isLoggedIn ? AUTH_NAV_ITEMS : []),
      ...(isAdmin ? ADMIN_NAV_ITEMS : [])
    ].sort((a, b) => a.priority - b.priority);
  }, [isLoggedIn, isAdmin]);

  // 计算有效通知列表
  const validNotifications = useMemo(() => {
    const systemNotifications = notifications.filter(notification =>
        VALID_NOTIFICATION_TYPES.includes(notification.type)
    );

    const messageNotifications = messages.map(message => ({
      type: 'NEW_MESSAGE',
      content: message.content,
      ticketId: null,
      id: message.id,
      createdDate: message.createdDate
    }));

    return [...systemNotifications, ...messageNotifications];
  }, [notifications, messages]);

  // 计算哪些项应该显示，哪些应该放到溢出菜单中
  const calculateVisibleItems = useCallback(() => {
    if (isMobileView) {
      // 移动视图中，所有项都在抽屉菜单中
      setVisibleItems([]);
      setOverflowItems(allNavItems);
      setShowOverflowIndicator(false);
      return;
    }

    // 获取导航容器的宽度
    if (!navContainerRef.current) return;

    const containerWidth = navContainerRef.current.offsetWidth;
    const logoPlusUserWidth = 400; // 估计logo和用户信息区域的宽度
    const itemWidth = 100; // 估计每个导航项的宽度
    const overflowButtonWidth = 50; // 估计溢出按钮的宽度

    // 计算可用于导航项的空间
    const availableWidth = containerWidth - logoPlusUserWidth;

    // 计算可以显示的导航项数量
    let maxVisibleItems = Math.floor((availableWidth - overflowButtonWidth) / itemWidth);
    maxVisibleItems = Math.max(2, maxVisibleItems); // 至少显示2个主要导航项

    // 分配可见项和溢出项
    if (allNavItems.length <= maxVisibleItems) {
      // 所有项都可以显示
      setVisibleItems(allNavItems);
      setOverflowItems([]);
      setShowOverflowIndicator(false);
    } else {
      // 只显示最高优先级的项目
      setVisibleItems(allNavItems.slice(0, maxVisibleItems));
      setOverflowItems(allNavItems.slice(maxVisibleItems));
      setShowOverflowIndicator(true);
    }
  }, [allNavItems, isMobileView]);

  // 监听窗口大小变化
  useEffect(() => {
    const handleResize = () => {
      const isMobile = window.innerWidth <= 768;
      setIsMobileView(isMobile);
      if (!isMobile && drawerVisible) {
        setDrawerVisible(false);
      }

      // 重新计算可见项
      calculateVisibleItems();
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [drawerVisible, calculateVisibleItems]);

  // 当nav项目变化时重新计算
  useEffect(() => {
    calculateVisibleItems();
  }, [allNavItems, calculateVisibleItems]);

  // 获取用户信息
  useEffect(() => {
    const fetchUserInfo = async () => {
      if (isLoggedIn) {
        try {
          const response = await fetch('http://127.0.0.1:8080/api/users/profile', {
            credentials: 'include'
          });

          if (response.ok) {
            const data = await response.json();
            setUserAvatar(data.avatarUrl || defaultAvatarIcon);
          }
        } catch (error) {
          console.error('获取用户信息失败:', error);
          setUserAvatar(defaultAvatarIcon);
        }
      }
    };

    fetchUserInfo();
  }, [isLoggedIn]);

  // 处理通知点击 - 根据通知类型导航到不同页面
  const handleNotificationClick = useCallback((notification) => {
    setShowNotifications(false);

    // 根据通知类型导航到不同页面
    switch(notification.type) {
      case 'NEW_MESSAGE':
        // 站内信通知 - 导航到站内信页面
        navigate('/messages');
        break;
      case 'TICKET_STATUS_UPDATED':
      case 'TICKET_REPLIED':
        // 工单相关通知 - 如果有 ticketId，导航到工单聊天页面
        if (notification.ticketId) {
          navigate(`/chat/${notification.ticketId}`);
        }
        break;
      case 'ORDER_STATUS_UPDATED':
      case 'ORDER_CREATED':
      case 'ORDER_ACCEPTED':
        // 订单相关通知 - 导航到订单页面
        navigate('/mailorder');
        break;
      case 'REVIEW_RECEIVED':
        // 评价相关通知 - 可能需要导航到相应页面
        // 根据实际需求补充
        break;
      default:
        // 其他类型的通知，不执行特定导航操作
        navigate('/messages');
        console.log('未处理的通知类型:', notification.type);
    }
  }, [navigate]);

  // 渲染导航链接
  const renderNavLink = useCallback((item) => {
    if (item.isExternal) {
      // 处理外部链接 - 使用 <a> 标签
      return (
          <a
              href={item.path}
              className={styles.navLink}
              target="_blank"
              rel="noopener noreferrer"
          >
            {item.icon}
            <span>{item.label}</span>
          </a>
      );
    }

    return (
        <Link
            to={item.path}
            className={styles.navLink}
            onClick={() => setDrawerVisible(false)}
        >
          {item.icon}
          <span>{item.label}</span>
        </Link>
    );
  }, [setDrawerVisible]);

  // 渲染导航菜单
  const renderNavLinks = useCallback(() => {
    return (
        <div className={styles.navLinks}>
          {visibleItems.map((item) => (
              <div key={item.key} className={styles.navItem}>
                {renderNavLink(item)}
              </div>
          ))}

          {/* 溢出菜单指示器 */}
          {showOverflowIndicator && overflowItems.length > 0 && (
              <div className={styles.navItem}>
                <Dropdown
                    menu={{
                      items: overflowItems.map(item => ({
                        key: item.key,
                        label: item.isExternal ? (
                            <a href={item.path} target="_blank" rel="noopener noreferrer">
                              {item.icon} {item.label}
                            </a>
                        ) : (
                            <Link to={item.path}>
                              {item.icon} {item.label}
                            </Link>
                        ),
                        icon: item.icon
                      })),
                    }}
                    placement="bottomRight"
                >
                  <Button type="text" className={styles.moreButton}>
                    <Space>
                      <EllipsisOutlined style={{ fontSize: '18px' }} />
                      <span>更多</span>
                    </Space>
                  </Button>
                </Dropdown>
              </div>
          )}
        </div>
    );
  }, [visibleItems, overflowItems, showOverflowIndicator, renderNavLink]);

  // 抽屉菜单中需要显示所有的导航项
  const renderDrawerNavLinks = useCallback(() => {
    return (
        <div className={styles.navLinks}>
          {allNavItems.map((item) => (
              <div key={item.key} className={styles.navItem}>
                {renderNavLink(item)}
              </div>
          ))}
        </div>
    );
  }, [allNavItems, renderNavLink]);

  // 渲染通知列表
  const renderNotificationContent = () => {
    if (validNotifications.length === 0) {
      return (
          <div className={styles.emptyNotificationContainer}>
            <div className={styles.emptyNotification}>
              暂无新通知
            </div>
            <Link
                to="/messages"
                className={styles.messageLink}
                onClick={() => setShowNotifications(false)}
            >
              <MailOutlined />
              <span>查看站内信</span>
            </Link>
          </div>
      );
    }

    // 对通知按时间排序（最新的在前）
    const sortedNotifications = [...validNotifications].sort((a, b) =>
        new Date(b.createdDate) - new Date(a.createdDate)
    );

    // 限制显示最新的5条通知
    const MAX_DISPLAY_COUNT = 5;
    const displayNotifications = sortedNotifications.slice(0, MAX_DISPLAY_COUNT);
    const hiddenCount = sortedNotifications.length - displayNotifications.length;

    return (
        <>
          {displayNotifications.map((notification, index) => (
              <div
                  key={notification.id || index}
                  className={styles.notificationItem}
                  onClick={() => handleNotificationClick(notification)}
                  role="button"
                  tabIndex={0}
              >
                <div className={styles.notificationHeader}>
                  {notification.type === 'NEW_MESSAGE' ? '新站内信' : getNotificationTypeText(notification.type)}
                </div>
                <div className={styles.notificationContent}>
                  {notification.content}
                </div>
                <div className={styles.notificationTime}>
                  {new Date(notification.createdDate).toLocaleString()}
                </div>
              </div>
          ))}

          {/* 显示隐藏的通知数量 */}
          {hiddenCount > 0 && (
              <div className={styles.hiddenNotificationCount}>
                还有 {hiddenCount} 条通知未显示
              </div>
          )}

          <Link
              to="/messages"
              className={styles.viewAll}
              onClick={() => setShowNotifications(false)}
          >
            查看全部通知
          </Link>
        </>
    );
  };

  return (
      <nav className={styles.nav}>
        <div className={styles.container} ref={navContainerRef}>
          {isMobileView && (
              <Button
                  type="text"
                  icon={<MenuOutlined />}
                  onClick={() => setDrawerVisible(true)}
                  className={styles.menuBtn}
              />
          )}

          <Link to="/" className={styles.logo}>
            <img src={require('../../assets/img/logo.png')} alt="Logo" className={styles.logo} />
          </Link>

          {!isMobileView && (
              <div className={styles.desktop}>
                {renderNavLinks()}
              </div>
          )}

          <div className={styles.user}>
            {isLoggedIn ? (
                <>
                  <div className={styles.notify}>
                    <Badge count={validNotifications.length}>
                      <Button
                          type="text"
                          icon={<BellOutlined />}
                          onClick={() => setShowNotifications(!showNotifications)}
                          className={styles.notifyBtn}
                      />
                    </Badge>
                    {showNotifications && (
                        <div className={styles.notifyDropdown}>
                          {renderNotificationContent()}
                        </div>
                    )}
                  </div>

                  <Link to="/profile" className={styles.profile}>
                    <img src={userAvatar} alt="头像" className={styles.avatar} />
                    <span className={styles.name}>{authUsername}</span>
                  </Link>
                  <Logout />
                </>
            ) : (
                <div className={styles.auth}>
                  <Link to="/register">
                    <Button type="text">注册</Button>
                  </Link>
                  <Link to="/login">
                    <Button type="primary">登录</Button>
                  </Link>
                </div>
            )}
          </div>

          <Drawer
              title="菜单"
              placement="left"
              open={drawerVisible}
              onClose={() => setDrawerVisible(false)}
              className={styles.drawer}
          >
            {renderDrawerNavLinks()}
          </Drawer>
        </div>
      </nav>
  );
};

export default Navbar;