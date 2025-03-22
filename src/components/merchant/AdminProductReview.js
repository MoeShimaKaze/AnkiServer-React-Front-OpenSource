// src/components/admin/product/AdminProductReview.js
import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Table, Button, Card, Modal, Form, Input, message, Statistic, Row, Col, Tag, Image, Pagination, Spin, Empty } from 'antd';
import { ShopOutlined, CheckCircleOutlined, CloseCircleOutlined, ExclamationCircleOutlined, LineChartOutlined } from '@ant-design/icons';
import axios from 'axios';
import Navbar from '../base/Navbar';
import styles from '../../assets/css/merchant/AdminProductReview.module.css';

const { TextArea } = Input;
const { confirm } = Modal;

const AdminProductReview = ({ backgroundStyle = "reviewBackground" }) => {
    const { isAdmin } = useAuth();
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [statsLoading, setStatsLoading] = useState(true);
    const [pagination, setPagination] = useState({
        current: 1,
        pageSize: 10,
        total: 0
    });

    // 确定使用哪种背景样式类
    const getBackgroundClass = () => {
        switch(backgroundStyle) {
            case 'default':
                return styles.defaultBackground;
            case 'statistics':
                return styles.statisticsBackground;
            case 'review':
            default:
                return styles.reviewBackground;
        }
    };
    const [stats, setStats] = useState({
        pendingReview: 0,
        onSale: 0,
        outOfStock: 0,
        rejected: 0
    });
    const [reviewModalVisible, setReviewModalVisible] = useState(false);
    const [currentProduct, setCurrentProduct] = useState(null);
    const [reviewForm] = Form.useForm();
    const [reviewLoading, setReviewLoading] = useState(false);

    // 加载待审核商品列表
    const fetchProducts = async (page = 1, size = 10) => {
        try {
            setLoading(true);
            const response = await axios.get('http://127.0.0.1:8080/api/admin/products/pending-review', {
                params: {
                    page: page - 1, // Spring Data JPA是从0开始计数的
                    size: size
                },
                withCredentials: true
            });

            // 从响应中提取数据和分页信息
            const { content, totalElements, totalPages, number, size: pageSize } = response.data;

            setProducts(content);
            setPagination({
                current: number + 1, // 转换为从1开始的页码
                pageSize: pageSize,
                total: totalElements
            });
        } catch (error) {
            console.error('获取待审核商品失败:', error);
            message.error('获取待审核商品失败，请稍后重试');
        } finally {
            setLoading(false);
        }
    };

    // 获取商品统计数据
    const fetchStats = async () => {
        try {
            setStatsLoading(true);
            const response = await axios.get('http://127.0.0.1:8080/api/admin/products/status-count', {
                withCredentials: true
            });

            setStats(response.data);
        } catch (error) {
            console.error('获取商品统计数据失败:', error);
            message.error('获取商品统计数据失败，请稍后重试');
        } finally {
            setStatsLoading(false);
        }
    };

    // 初始化加载数据
    useEffect(() => {
        if (isAdmin) {
            fetchProducts();
            fetchStats();
        }
    }, [isAdmin]);

    // 处理分页变化
    const handleTableChange = (pagination) => {
        fetchProducts(pagination.current, pagination.pageSize);
    };

    // 打开审核模态框
    const showReviewModal = (product) => {
        setCurrentProduct(product);
        reviewForm.resetFields();
        setReviewModalVisible(true);
    };

    // 关闭审核模态框
    const handleCancel = () => {
        setReviewModalVisible(false);
        setCurrentProduct(null);
    };

    // 处理审核通过
    const handleApprove = async () => {
        try {
            const values = await reviewForm.validateFields();

            // 确认提示
            confirm({
                title: '确认审核通过',
                icon: <CheckCircleOutlined style={{ color: '#52c41a' }} />,
                content: '确定要通过此商品的审核吗？通过后商品将上架销售。',
                onOk: async () => {
                    await submitReview(true, values.remarks);
                }
            });
        } catch (error) {
            console.error('表单验证失败:', error);
        }
    };

    // 处理审核拒绝
    const handleReject = async () => {
        try {
            const values = await reviewForm.validateFields(['remarks']);

            if (!values.remarks) {
                message.warning('拒绝时必须填写备注说明原因');
                return;
            }

            // 确认提示
            confirm({
                title: '确认拒绝审核',
                icon: <CloseCircleOutlined style={{ color: '#f5222d' }} />,
                content: '确定要拒绝此商品的审核吗？',
                onOk: async () => {
                    await submitReview(false, values.remarks);
                }
            });
        } catch (error) {
            console.error('表单验证失败:', error);
        }
    };

    // 提交审核结果
    const submitReview = async (approved, remarks) => {
        if (!currentProduct) return;

        setReviewLoading(true);
        try {
            await axios.post(
                `http://127.0.0.1:8080/api/admin/products/${currentProduct.id}/review`,
                null,
                {
                    params: {
                        approved: approved,
                        remarks: remarks
                    },
                    withCredentials: true
                }
            );

            message.success(approved ? '商品审核已通过' : '商品审核已拒绝');
            setReviewModalVisible(false);

            // 刷新数据
            fetchProducts(pagination.current, pagination.pageSize);
            fetchStats();
        } catch (error) {
            console.error('商品审核提交失败:', error);
            message.error('商品审核提交失败，请稍后重试');
        } finally {
            setReviewLoading(false);
        }
    };

    // 渲染商品状态标签
    const renderStatusTag = (status) => {
        switch(status) {
            case 'PENDING_REVIEW':
                return <Tag color="blue">待审核</Tag>;
            case 'ON_SALE':
                return <Tag color="green">在售</Tag>;
            case 'OUT_OF_STOCK':
                return <Tag color="orange">缺货</Tag>;
            case 'REJECTED':
                return <Tag color="red">已拒绝</Tag>;
            default:
                return <Tag color="default">{status}</Tag>;
        }
    };

    // 表格列定义
    const columns = [
        {
            title: '商品ID',
            dataIndex: 'id',
            key: 'id',
            width: 80,
        },
        {
            title: '商品图片',
            dataIndex: 'imageUrl',
            key: 'imageUrl',
            width: 100,
            render: (imageUrl) => (
                imageUrl ? (
                    <Image
                        src={imageUrl}
                        alt="商品图片"
                        width={80}
                        height={80}
                        style={{ objectFit: 'cover' }}
                        fallback="data:image/png;base64,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"
                    />
                ) : (
                    <div style={{ width: 80, height: 80, background: '#f5f5f5', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                        无图片
                    </div>
                )
            ),
        },
        {
            title: '商品名称',
            dataIndex: 'name',
            key: 'name',
            render: (text, record) => (
                <div>
                    <div style={{ fontWeight: 500 }}>{text}</div>
                    <div style={{ fontSize: 12, color: '#666' }}>店铺: {record.storeName}</div>
                </div>
            ),
        },
        {
            title: '价格',
            dataIndex: 'price',
            key: 'price',
            width: 120,
            render: (price) => `¥${price.toFixed(2)}`,
        },
        {
            title: '类别',
            dataIndex: 'category',
            key: 'category',
            width: 120,
            render: (category) => {
                const categoryMap = {
                    'FOOD': '食品',
                    'ELECTRONICS': '电子产品',
                    'CLOTHING': '服装',
                    'BOOKS': '图书',
                    'OTHERS': '其他'
                };
                return categoryMap[category] || category;
            },
        },
        {
            title: '状态',
            dataIndex: 'status',
            key: 'status',
            width: 100,
            render: renderStatusTag,
        },
        {
            title: '提交时间',
            dataIndex: 'createdAt',
            key: 'createdAt',
            width: 170,
            render: (createdAt) => new Date(createdAt).toLocaleString(),
        },
        {
            title: '操作',
            key: 'action',
            width: 120,
            render: (_, record) => (
                <Button
                    type="primary"
                    onClick={() => showReviewModal(record)}
                >
                    审核
                </Button>
            ),
        },
    ];

    // 如果不是管理员则显示没有权限
    if (!isAdmin) {
        return (
            <div className={`${styles.pageContainer} ${styles.defaultBackground}`}>
                <Navbar />
                <div className={styles.contentWrapper}>
                    <div className={styles.productList}>
                        <Empty
                            description="您没有管理员权限，无法访问此页面"
                            image={Empty.PRESENTED_IMAGE_SIMPLE}
                        />
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className={`${styles.pageContainer} ${getBackgroundClass()}`}>
            <Navbar />
            <div className={styles.contentWrapper}>
                <div className={styles.header}>
                    <h1 className={styles.title}>商品审核管理</h1>
                </div>

                {/* 统计信息面板 */}
                <div className={styles.dashboardContainer}>
                    <Card className={styles.statusCard}>
                        <h3 className={styles.statusTitle}>商品状态统计</h3>
                        <Spin spinning={statsLoading}>
                            <Row gutter={16} className={styles.statsGrid}>
                                <Col>
                                    <Card className={`${styles.statItem} ${styles.pending}`}>
                                        <Statistic
                                            title="待审核"
                                            value={stats.pendingReview}
                                            prefix={<ExclamationCircleOutlined />}
                                        />
                                    </Card>
                                </Col>
                                <Col>
                                    <Card className={`${styles.statItem} ${styles.approved}`}>
                                        <Statistic
                                            title="在售"
                                            value={stats.onSale}
                                            prefix={<CheckCircleOutlined />}
                                        />
                                    </Card>
                                </Col>
                                <Col>
                                    <Card className={`${styles.statItem} ${styles.outOfStock}`}>
                                        <Statistic
                                            title="缺货"
                                            value={stats.outOfStock}
                                            prefix={<ShopOutlined />}
                                        />
                                    </Card>
                                </Col>
                                <Col>
                                    <Card className={`${styles.statItem} ${styles.rejected}`}>
                                        <Statistic
                                            title="已拒绝"
                                            value={stats.rejected}
                                            prefix={<CloseCircleOutlined />}
                                        />
                                    </Card>
                                </Col>
                            </Row>
                        </Spin>
                    </Card>
                </div>

                {/* 商品列表 */}
                <div className={styles.productList}>
                    <div className={styles.tableHeader}>
                        <h2 className={styles.tableTitle}>待审核商品</h2>
                        <div className={styles.filterActions}>
                            <Button
                                type="primary"
                                icon={<LineChartOutlined />}
                                onClick={() => fetchProducts(pagination.current, pagination.pageSize)}
                            >
                                刷新数据
                            </Button>
                        </div>
                    </div>

                    {/* 添加这个表格容器以支持横向滚动 */}
                    <div className={styles.tableContainer}>
                        <Table
                            dataSource={products}
                            columns={columns}
                            rowKey="id"
                            pagination={false}
                            loading={loading}
                            locale={{
                                emptyText: (
                                    <div className={styles.emptyState}>
                                        <div className={styles.emptyIcon}>📦</div>
                                        <p>暂无待审核商品</p>
                                    </div>
                                )
                            }}
                        />
                    </div>

                    {products.length > 0 && (
                        <div style={{ padding: '16px', textAlign: 'right' }}>
                            <Pagination
                                current={pagination.current}
                                pageSize={pagination.pageSize}
                                total={pagination.total}
                                onChange={(page, pageSize) => {
                                    handleTableChange({ current: page, pageSize });
                                }}
                                showSizeChanger
                                showQuickJumper
                                showTotal={(total) => `共 ${total} 条`}
                            />
                        </div>
                    )}
                </div>

                {/* 审核模态框 */}
                <Modal
                    title="商品审核"
                    visible={reviewModalVisible}
                    onCancel={handleCancel}
                    footer={null}
                    width={700}
                    className={styles.reviewModal}
                >
                    {currentProduct && (
                        <>
                            <div className={styles.productDetail}>
                                <h3 className={styles.productName}>{currentProduct.name}</h3>

                                <div className={styles.productInfo}>
                                    <div className={styles.infoItem}>
                                        <span className={styles.infoLabel}>商品ID:</span>
                                        <span className={styles.infoValue}>{currentProduct.id}</span>
                                    </div>
                                    <div className={styles.infoItem}>
                                        <span className={styles.infoLabel}>店铺:</span>
                                        <span className={styles.infoValue}>{currentProduct.storeName}</span>
                                    </div>
                                    <div className={styles.infoItem}>
                                        <span className={styles.infoLabel}>价格:</span>
                                        <span className={styles.infoValue}>¥{currentProduct.price.toFixed(2)}</span>
                                    </div>
                                    <div className={styles.infoItem}>
                                        <span className={styles.infoLabel}>类别:</span>
                                        <span className={styles.infoValue}>
                                        {(() => {
                                            const categoryMap = {
                                                'FOOD': '食品',
                                                'ELECTRONICS': '电子产品',
                                                'CLOTHING': '服装',
                                                'BOOKS': '图书',
                                                'OTHERS': '其他'
                                            };
                                            return categoryMap[currentProduct.category] || currentProduct.category;
                                        })()}
                                    </span>
                                    </div>
                                    <div className={styles.infoItem}>
                                        <span className={styles.infoLabel}>库存:</span>
                                        <span className={styles.infoValue}>{currentProduct.stock}</span>
                                    </div>
                                    <div className={styles.infoItem}>
                                        <span className={styles.infoLabel}>提交时间:</span>
                                        <span className={styles.infoValue}>
                                        {new Date(currentProduct.createdAt).toLocaleString()}
                                    </span>
                                    </div>
                                </div>

                                <div className={styles.infoItem} style={{ marginBottom: '16px' }}>
                                    <span className={styles.infoLabel}>商品描述:</span>
                                    <div style={{ marginTop: '8px' }}>{currentProduct.description || '无描述'}</div>
                                </div>

                                {currentProduct.imageUrl && (
                                    <Image
                                        src={currentProduct.imageUrl}
                                        alt={currentProduct.name}
                                        className={styles.imagePreview}
                                    />
                                )}
                            </div>

                            <Form
                                form={reviewForm}
                                layout="vertical"
                            >
                                <Form.Item
                                    name="remarks"
                                    label="审核备注"
                                    rules={[
                                        {
                                            max: 500,
                                            message: '备注不能超过500个字符'
                                        }
                                    ]}
                                >
                                    <TextArea
                                        rows={4}
                                        placeholder="请输入审核备注，拒绝时必须填写原因"
                                    />
                                </Form.Item>

                                <div className={styles.actionButtons}>
                                    <Button onClick={handleCancel}>取消</Button>
                                    <Button
                                        type="danger"
                                        onClick={handleReject}
                                        loading={reviewLoading}
                                        icon={<CloseCircleOutlined />}
                                    >
                                        拒绝
                                    </Button>
                                    <Button
                                        type="primary"
                                        onClick={handleApprove}
                                        loading={reviewLoading}
                                        icon={<CheckCircleOutlined />}
                                    >
                                        通过
                                    </Button>
                                </div>
                            </Form>
                        </>
                    )}
                </Modal>
            </div>
        </div>
    );
};

export default AdminProductReview;