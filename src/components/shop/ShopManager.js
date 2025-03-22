// src/components/shop/ShopManager.js
import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import {
    Layout, Menu, Typography, Card, Button, Table, Tag, message,
    Tabs, Spin, Empty, Dropdown, Modal, Statistic, Row, Col,
    Space, Badge, ConfigProvider
} from 'antd';
import {
    ShopOutlined, AppstoreOutlined, FileTextOutlined,
    PlusOutlined, EditOutlined, SettingOutlined,
    EllipsisOutlined, ExclamationCircleOutlined,
    DashboardOutlined
} from '@ant-design/icons';
import Navbar from '../base/Navbar';
import { ProtectedRoute } from '../utils/ProtectedRoute';
import StoreForm from './StoreForm';
import ProductForm from './ProductForm';
import Dashboard from './Dashboard';
import styles from '../../assets/css/shop/ShopManager.module.css';

const { Content, Sider } = Layout;
const { Title, Text } = Typography;
const { TabPane } = Tabs;
const { confirm } = Modal;

const StoreList = ({ onEdit, onAddProduct, onManageProducts, onViewOrders }) => {
    const [loading, setLoading] = useState(true);
    const [stores, setStores] = useState([]);
    const navigate = useNavigate();

    const fetchStores = async () => {
        try {
            setLoading(true);
            const response = await axios.get('http://127.0.0.1:8080/api/stores/merchant/current', {
                withCredentials: true
            });
            setStores(response.data || []);
            setLoading(false);
        } catch (error) {
            console.error('Error fetching merchant stores:', error);
            message.error('获取店铺列表失败');
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchStores();
    }, []);

    const getStatusBadge = (status) => {
        switch (status) {
            case 'ACTIVE':
                return <Badge status="success" text="营业中" />;
            case 'PENDING_REVIEW':
                return <Badge status="processing" text="审核中" />;
            case 'SUSPENDED':
                return <Badge status="warning" text="已暂停" />;
            case 'CLOSED':
                return <Badge status="default" text="已关闭" />;
            case 'REJECTED':
                return <Badge status="error" text="已拒绝" />;
            default:
                return <Badge status="default" text={status} />;
        }
    };

    const handleAddStore = () => {
        navigate('/shop/merchant/store/add');
    };

    const actionMenu = (store) => [
        {
            key: 'edit',
            label: '编辑店铺',
            icon: <EditOutlined />,
            onClick: () => onEdit(store)
        },
        {
            key: 'addProduct',
            label: '添加商品',
            icon: <PlusOutlined />,
            onClick: () => onAddProduct(store)
        },
        {
            key: 'products',
            label: '管理商品',
            icon: <AppstoreOutlined />,
            onClick: () => onManageProducts(store)
        },
        {
            key: 'orders',
            label: '查看订单',
            icon: <FileTextOutlined />,
            onClick: () => onViewOrders(store)
        }
    ];

    if (loading) {
        return (
            <div className={styles.loadingContainer}>
                <Spin size="large" />
            </div>
        );
    }

    return (
        <div className={styles.storeListContainer}>
            <div className={styles.storeListHeader}>
                <Title level={4}>我的店铺</Title>
                <Button
                    type="primary"
                    icon={<PlusOutlined />}
                    onClick={handleAddStore}
                >
                    创建店铺
                </Button>
            </div>

            {stores.length === 0 ? (
                <div className={styles.emptyContainer}>
                    <Empty
                        description="您还没有店铺，立即创建一个吧"
                        image={Empty.PRESENTED_IMAGE_SIMPLE}
                    />
                    <Button
                        type="primary"
                        icon={<PlusOutlined />}
                        onClick={handleAddStore}
                    >
                        创建店铺
                    </Button>
                </div>
            ) : (
                <Row gutter={[16, 16]}>
                    {stores.map(store => (
                        <Col xs={24} sm={12} md={8} lg={8} xl={6} key={store.id}>
                            <Card
                                className={styles.storeCard}
                                title={
                                    <div className={styles.storeCardTitle}>
                                        <Text ellipsis>{store.storeName}</Text>
                                        {getStatusBadge(store.status)}
                                    </div>
                                }
                                extra={
                                    <Dropdown
                                        menu={{ items: actionMenu(store) }}
                                        placement="bottomRight"
                                        trigger={['click']}
                                    >
                                        <Button type="text" icon={<EllipsisOutlined />} />
                                    </Dropdown>
                                }
                                actions={[
                                    <Button
                                        type="link"
                                        icon={<EditOutlined />}
                                        onClick={() => onEdit(store)}
                                    >
                                        编辑
                                    </Button>,
                                    <Button
                                        type="link"
                                        icon={<AppstoreOutlined />}
                                        onClick={() => onManageProducts(store)}
                                    >
                                        商品
                                    </Button>,
                                    <Button
                                        type="link"
                                        icon={<FileTextOutlined />}
                                        onClick={() => onViewOrders(store)}
                                    >
                                        订单
                                    </Button>
                                ]}
                            >
                                <div className={styles.storeCardContent}>
                                    <div className={styles.storeStatRow}>
                                        <Statistic
                                            title="商品数"
                                            value={store.productCount || 0}
                                            valueStyle={{ fontSize: '16px' }}
                                        />
                                        <Statistic
                                            title="订单量"
                                            value={store.orderCount || 0}
                                            valueStyle={{ fontSize: '16px' }}
                                        />
                                        <Statistic
                                            title="评分"
                                            value={store.rating || 5.0}
                                            precision={1}
                                            valueStyle={{ fontSize: '16px' }}
                                            suffix="/5"
                                        />
                                    </div>
                                    <div className={styles.storeAddress}>
                                        <Text type="secondary" ellipsis>{store.location || '地址未设置'}</Text>
                                    </div>
                                </div>
                            </Card>
                        </Col>
                    ))}
                </Row>
            )}
        </div>
    );
};

const ProductManagement = ({ store }) => {
    const [loading, setLoading] = useState(true);
    const [products, setProducts] = useState([]);
    const navigate = useNavigate();

    const fetchProducts = async () => {
        if (!store) return;

        try {
            setLoading(true);
            const response = await axios.get(`http://127.0.0.1:8080/api/products/store/${store.id}`, {
                params: {
                    page: 0,
                    size: 100
                },
                withCredentials: true
            });
            setProducts(response.data.content || []);
            setLoading(false);
        } catch (error) {
            console.error('Error fetching store products:', error);
            message.error('获取商品列表失败');
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchProducts();
    }, [store]);

    const handleAddProduct = () => {
        navigate(`/shop/merchant/product/add`, { state: { storeId: store.id } });
    };

    const handleEditProduct = (product) => {
        navigate(`/shop/merchant/product/edit/${product.id}`);
    };

    const handleUpdateStock = async (productId, newStock) => {
        try {
            await axios.put(`http://127.0.0.1:8080/api/products/${productId}/stock`, null, {
                params: { quantity: newStock },
                withCredentials: true
            });
            message.success('库存更新成功');
            fetchProducts();
        } catch (error) {
            console.error('Error updating product stock:', error);
            message.error('更新库存失败');
        }
    };

    const handleUpdateStatus = async (product, newStatus) => {
        try {
            await axios.put(`http://127.0.0.1:8080/api/products/${product.id}/status`, null, {
                params: { status: newStatus },
                withCredentials: true
            });
            message.success('商品状态更新成功');
            fetchProducts();
        } catch (error) {
            console.error('Error updating product status:', error);
            message.error('更新商品状态失败: ' + (error.response?.data || error.message));
        }
    };

    const confirmUpdateStatus = (product, newStatus) => {
        let statusText;
        switch (newStatus) {
            case 'ON_SALE':
                statusText = '上架';
                break;
            case 'OUT_OF_STOCK':
                statusText = '下架并标记为缺货';
                break;
            case 'DISCONTINUED':
                statusText = '永久下架';
                break;
            default:
                statusText = newStatus;
        }

        confirm({
            title: `确定要${statusText}商品 "${product.name}" 吗？`,
            icon: <ExclamationCircleOutlined />,
            content: '此操作将改变商品状态，影响顾客购买',
            onOk() {
                handleUpdateStatus(product, newStatus);
            }
        });
    };

    const columns = [
        {
            title: '商品名称',
            dataIndex: 'name',
            key: 'name',
            ellipsis: true,
        },
        {
            title: '价格',
            dataIndex: 'price',
            key: 'price',
            render: (price) => `¥${price.toFixed(2)}`
        },
        {
            title: '库存',
            dataIndex: 'stock',
            key: 'stock',
            render: (stock, record) => (
                <Space>
                    {stock}
                    <Button
                        size="small"
                        onClick={() => {
                            let newStock = prompt('请输入新的库存数量:', stock);
                            if (newStock !== null) {
                                newStock = parseInt(newStock);
                                if (!isNaN(newStock) && newStock >= 0) {
                                    handleUpdateStock(record.id, newStock);
                                } else {
                                    message.error('请输入有效的库存数量');
                                }
                            }
                        }}
                    >
                        修改
                    </Button>
                </Space>
            )
        },
        {
            title: '分类',
            dataIndex: 'category',
            key: 'category',
            render: (category) => (
                <Tag color="blue">{category}</Tag>
            )
        },
        {
            title: '状态',
            dataIndex: 'status',
            key: 'status',
            render: (status) => {
                let color = 'default';
                let text = status;

                switch (status) {
                    case 'ON_SALE':
                        color = 'success';
                        text = '在售';
                        break;
                    case 'OUT_OF_STOCK':
                        color = 'warning';
                        text = '缺货';
                        break;
                    case 'PENDING_REVIEW':
                        color = 'processing';
                        text = '审核中';
                        break;
                    case 'DISCONTINUED':
                        color = 'default';
                        text = '已下架';
                        break;
                    case 'REJECTED':
                        color = 'error';
                        text = '已拒绝';
                        break;
                    default:
                        break;
                }

                return <Badge status={color} text={text} />;
            }
        },
        {
            title: '操作',
            key: 'action',
            render: (_, record) => (
                <Space size="small">
                    <Button size="small" onClick={() => handleEditProduct(record)}>
                        编辑
                    </Button>
                    <Dropdown
                        menu={{
                            items: [
                                {
                                    key: 'onSale',
                                    label: '上架',
                                    disabled: record.status === 'ON_SALE' || record.stock <= 0,
                                    onClick: () => confirmUpdateStatus(record, 'ON_SALE')
                                },
                                {
                                    key: 'outOfStock',
                                    label: '标记缺货',
                                    disabled: record.status === 'OUT_OF_STOCK',
                                    onClick: () => confirmUpdateStatus(record, 'OUT_OF_STOCK')
                                },
                                {
                                    key: 'discontinued',
                                    label: '下架',
                                    disabled: record.status === 'DISCONTINUED',
                                    onClick: () => confirmUpdateStatus(record, 'DISCONTINUED')
                                }
                            ]
                        }}
                    >
                        <Button size="small">
                            状态 <SettingOutlined />
                        </Button>
                    </Dropdown>
                </Space>
            )
        }
    ];

    if (!store) {
        return (
            <div className={styles.emptyContainer}>
                <Empty description="请先选择一个店铺" />
            </div>
        );
    }

    return (
        <div className={styles.productManagementContainer}>
            <div className={styles.productManagementHeader}>
                <div className={styles.headerInfo}>
                    <Title level={4}>商品管理 - {store.storeName}</Title>
                    <Text type="secondary">
                        共 {products.length} 件商品
                    </Text>
                </div>
                <Button
                    type="primary"
                    icon={<PlusOutlined />}
                    onClick={handleAddProduct}
                >
                    添加商品
                </Button>
            </div>

            <div className={styles.productTable}>
                <Table
                    columns={columns}
                    dataSource={products}
                    rowKey="id"
                    loading={loading}
                    pagination={{
                        pageSize: 10,
                        showTotal: (total) => `共 ${total} 件商品`
                    }}
                    size="middle"
                />
            </div>
        </div>
    );
};

const OrderManagement = ({ store }) => {
    const [loading, setLoading] = useState(true);
    const [orders, setOrders] = useState([]);
    const [activeTab, setActiveTab] = useState('MERCHANT_PENDING');

    const fetchOrders = async (status) => {
        if (!store) return;

        try {
            setLoading(true);
            const response = await axios.get(`http://127.0.0.1:8080/api/merchant/orders/store/${store.id}/pending-confirmation`, {
                params: {
                    status: status,
                    page: 0,
                    size: 100
                },
                withCredentials: true
            });
            setOrders(response.data.content || []);
            setLoading(false);
        } catch (error) {
            console.error('Error fetching store orders:', error);
            message.error('获取订单列表失败');
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchOrders(activeTab);
    }, [store, activeTab]);

    const handleTabChange = (key) => {
        setActiveTab(key);
    };

    const handleConfirmOrder = async (orderNumber) => {
        try {
            await axios.post(`http://127.0.0.1:8080/api/merchant/orders/${orderNumber}/confirm`, null, {
                withCredentials: true
            });
            message.success('订单确认成功');
            fetchOrders(activeTab);
        } catch (error) {
            console.error('Error confirming order:', error);
            message.error('确认订单失败: ' + (error.response?.data || error.message));
        }
    };

    const confirmOrderAction = (order) => {
        confirm({
            title: '确认订单',
            icon: <ExclamationCircleOutlined />,
            content: `确定要接受订单 #${order.orderNumber} 吗？确认后将开始为顾客配送商品。`,
            onOk() {
                handleConfirmOrder(order.orderNumber);
            }
        });
    };

    const getOrderStatusText = (status) => {
        const statusMap = {
            'MERCHANT_PENDING': '待确认',
            'PAYMENT_PENDING': '待支付',
            'PENDING': '待接单',
            'ASSIGNED': '已接单',
            'IN_TRANSIT': '配送中',
            'DELIVERED': '已送达',
            'COMPLETED': '已完成',
            'PLATFORM_INTERVENTION': '平台介入',
            'REFUNDING': '退款中',
            'REFUNDED': '已退款',
            'CANCELLED': '已取消',
            'PAYMENT_TIMEOUT': '支付超时'
        };
        return statusMap[status] || status;
    };

    const getStatusBadge = (status) => {
        let color = 'default';

        switch (status) {
            case 'MERCHANT_PENDING':
                color = 'processing';
                break;
            case 'PAYMENT_PENDING':
                color = 'warning';
                break;
            case 'PENDING':
                color = 'warning';
                break;
            case 'ASSIGNED':
                color = 'processing';
                break;
            case 'IN_TRANSIT':
                color = 'processing';
                break;
            case 'DELIVERED':
                color = 'success';
                break;
            case 'COMPLETED':
                color = 'success';
                break;
            case 'PLATFORM_INTERVENTION':
                color = 'error';
                break;
            case 'REFUNDING':
                color = 'warning';
                break;
            case 'REFUNDED':
                color = 'default';
                break;
            case 'CANCELLED':
                color = 'default';
                break;
            case 'PAYMENT_TIMEOUT':
                color = 'default';
                break;
            default:
                break;
        }

        return <Badge status={color} text={getOrderStatusText(status)} />;
    };

    const columns = [
        {
            title: '订单号',
            dataIndex: 'orderNumber',
            key: 'orderNumber',
            render: (text) => text.substring(0, 8) + '...'
        },
        {
            title: '商品',
            dataIndex: 'productName',
            key: 'productName',
            ellipsis: true
        },
        {
            title: '数量',
            dataIndex: 'quantity',
            key: 'quantity'
        },
        {
            title: '总价',
            dataIndex: 'totalAmount',
            key: 'totalAmount',
            render: (amount) => `¥${amount.toFixed(2)}`
        },
        {
            title: '配送方式',
            dataIndex: 'deliveryType',
            key: 'deliveryType',
            render: (type) => type === 'MUTUAL' ? '互助配送' : '平台配送'
        },
        {
            title: '收货人',
            key: 'recipient',
            render: (_, record) => `${record.recipientName} (${record.recipientPhone})`
        },
        {
            title: '下单时间',
            dataIndex: 'createdAt',
            key: 'createdAt',
            render: (time) => new Date(time).toLocaleString()
        },
        {
            title: '状态',
            dataIndex: 'orderStatus',
            key: 'orderStatus',
            render: (status) => getStatusBadge(status)
        },
        {
            title: '操作',
            key: 'action',
            render: (_, record) => {
                if (record.orderStatus === 'MERCHANT_PENDING') {
                    return (
                        <Button
                            type="primary"
                            size="small"
                            onClick={() => confirmOrderAction(record)}
                        >
                            确认接单
                        </Button>
                    );
                }
                if (record.orderStatus === 'REFUNDING') {
                    return (
                        <Space>
                            <Button
                                type="primary"
                                size="small"
                                onClick={() => {/* 同意退款处理 */}}
                            >
                                同意退款
                            </Button>
                            <Button
                                danger
                                size="small"
                                onClick={() => {/* 拒绝退款处理 */}}
                            >
                                拒绝
                            </Button>
                        </Space>
                    );
                }
                return null;
            }
        }
    ];

    if (!store) {
        return (
            <div className={styles.emptyContainer}>
                <Empty description="请先选择一个店铺" />
            </div>
        );
    }

    return (
        <div className={styles.orderManagementContainer}>
            <div className={styles.orderManagementHeader}>
                <Title level={4}>订单管理 - {store.storeName}</Title>
            </div>

            <Tabs
                activeKey={activeTab}
                onChange={handleTabChange}
                className={styles.orderTabs}
            >
                <TabPane tab="待确认" key="MERCHANT_PENDING" />
                <TabPane tab="进行中" key="ASSIGNED" />
                <TabPane tab="已完成" key="COMPLETED" />
                <TabPane tab="退款中" key="REFUNDING" />
                <TabPane tab="全部" key="" />
            </Tabs>

            <div className={styles.orderTable}>
                <Table
                    columns={columns}
                    dataSource={orders}
                    rowKey="id"
                    loading={loading}
                    pagination={{
                        pageSize: 10,
                        showTotal: (total) => `共 ${total} 条订单`
                    }}
                    size="middle"
                />
            </div>
        </div>
    );
};

const ShopManager = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const [activeComponent, setActiveComponent] = useState('stores');
    const [selectedStore, setSelectedStore] = useState(null);
    const [currentUser, setCurrentUser] = useState(null);
    const [isAdmin, setIsAdmin] = useState(false);

    // 获取当前用户信息
    const fetchCurrentUser = async () => {
        try {
            const response = await axios.get('http://127.0.0.1:8080/api/users/profile', {
                withCredentials: true
            });
            setCurrentUser(response.data);
            setIsAdmin(response.data.userGroup === 'admin');
        } catch (error) {
            console.error('Error fetching current user:', error);
            message.error('获取用户信息失败');
        }
    };

    // 获取当前激活的模块
    const getActiveModule = () => {
        const path = location.pathname;
        if (path.includes('/merchant/store')) return 'stores';
        if (path.includes('/merchant/products')) return 'products';
        if (path.includes('/merchant/orders')) return 'orders';
        if (path.includes('/merchant/dashboard')) return 'dashboard';
        return 'stores';
    };

    useEffect(() => {
        fetchCurrentUser();
    }, []);

    useEffect(() => {
        setActiveComponent(getActiveModule());
    }, [location]);

    // 根据当前模块获取背景样式
    const getBackgroundClass = () => {
        const activeModule = getActiveModule();
        switch(activeModule) {
            case 'dashboard':
                return styles.dashboardBackground;
            case 'products':
                return styles.productsBackground;
            case 'orders':
                return styles.ordersBackground;
            case 'stores':
            default:
                return styles.storesBackground;
        }
    };

    const handleEditStore = (store) => {
        navigate(`/shop/merchant/store/edit/${store.id}`);
    };

    const handleAddProduct = (store) => {
        navigate(`/shop/merchant/product/add`, { state: { storeId: store.id } });
    };

    const handleManageProducts = (store) => {
        setSelectedStore(store);
        setActiveComponent('products');
        navigate('/shop/merchant/products');
    };

    const handleViewOrders = (store) => {
        setSelectedStore(store);
        setActiveComponent('orders');
        navigate('/shop/merchant/orders');
    };

    // 定义导航项
    const navigationItems = [
        {
            key: 'dashboard',
            icon: <DashboardOutlined />,
            label: '店铺概览',
            onClick: () => navigate('/shop/merchant/dashboard')
        },
        {
            key: 'stores',
            icon: <ShopOutlined />,
            label: '店铺管理',
            onClick: () => navigate('/shop/merchant/store')
        },
        {
            key: 'products',
            icon: <AppstoreOutlined />,
            label: '商品管理',
            onClick: () => {
                if (selectedStore) {
                    navigate('/shop/merchant/products');
                } else {
                    message.warning('请先选择一个店铺');
                }
            }
        },
        {
            key: 'orders',
            icon: <FileTextOutlined />,
            label: '订单管理',
            onClick: () => {
                if (selectedStore) {
                    navigate('/shop/merchant/orders');
                } else {
                    message.warning('请先选择一个店铺');
                }
            }
        }
    ];

    const renderContent = () => {
        switch (activeComponent) {
            case 'products':
                return (
                    <ProductManagement store={selectedStore} />
                );
            case 'orders':
                return (
                    <OrderManagement store={selectedStore} />
                );
            case 'dashboard':
                return (
                    <Dashboard
                        selectedStore={selectedStore}
                    />
                );
            case 'stores':
            default:
                return (
                    <StoreList
                        onEdit={handleEditStore}
                        onAddProduct={handleAddProduct}
                        onManageProducts={handleManageProducts}
                        onViewOrders={handleViewOrders}
                    />
                );
        }
    };

    return (
        <ConfigProvider
            theme={{
                token: {
                    borderRadius: 6,
                    colorPrimary: '#1890ff',
                },
                components: {
                    Menu: {
                        itemHoverColor: '#ffffff',
                        itemSelectedColor: '#ffffff',
                        itemHoverBg: '#0056b3',
                        itemSelectedBg: '#1890ff',
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
                                {isAdmin ? '系统管理' : '商家管理系统'}
                            </Title>
                            <Menu
                                mode="vertical"
                                selectedKeys={[activeComponent]}
                                className={styles.menuList}
                                items={navigationItems}
                            />
                        </Sider>
                        <Content className={styles.mainContent}>
                            <Routes>
                                <Route path="/" element={<Navigate to="dashboard" replace />} />
                                <Route path="dashboard" element={renderContent()} />
                                <Route path="store" element={renderContent()} />
                                <Route path="store/add" element={<StoreForm />} />
                                <Route path="store/edit/:storeId" element={<StoreForm />} />
                                <Route path="product/add" element={<ProductForm />} />
                                <Route path="product/edit/:productId" element={<ProductForm />} />
                                <Route path="products" element={renderContent()} />
                                <Route path="orders" element={renderContent()} />
                            </Routes>
                        </Content>
                    </Layout>
                </div>
            </div>
        </ConfigProvider>
    );
};

// 保护路由的商家管理页面
const ProtectedShopManager = () => (
    <ProtectedRoute requiredGroups={['admin', 'store']}>
        <ShopManager />
    </ProtectedRoute>
);

export default ProtectedShopManager;