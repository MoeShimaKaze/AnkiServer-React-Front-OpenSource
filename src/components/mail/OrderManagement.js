import React, {useState, useEffect, useCallback, useRef} from 'react';
import axios from 'axios';
import { Table, Button, Space, Tag, Pagination, Select, Alert, Spin, Modal, Typography, Tooltip } from 'antd';
import { CheckOutlined, StarOutlined, CheckCircleOutlined } from '@ant-design/icons';
import styles from '../../assets/css/mail/MailOrder.module.css';
import RatingModal from './RatingModal';
import { orderStatusMap, deliveryServiceMap } from '../utils/map/orderStatusMap';
import useAuthStore from "../utils/stores/auth/AuthStore";

const { Text } = Typography;

const OrderManagement = () => {
  const getUserId = useAuthStore(state => state.getUserId);
  const mountedRef = useRef(true);
  const [orders, setOrders] = useState([]);
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [selectedOrderNumber, setSelectedOrderNumber] = useState(null);
  const [selectedRatingType, setSelectedRatingType] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // 分页状态
  const [page, setPage] = useState(0);
  const [size, setSize] = useState(10);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);

  // 修改订单获取函数
  const fetchOrders = useCallback(async (pageNum = 0) => {
    const currentUserId = getUserId();
    if (!currentUserId) return;

    if (!mountedRef.current || !currentUserId) return;

    try {
      setIsLoading(true);
      setError('');
      // 修改API调用，增加分页参数
      const response = await axios.get(`http://127.0.0.1:8080/api/mail-orders/user/${currentUserId}`, {
        params: {
          page: pageNum,
          size: size,
          sort: 'createdAt,desc'
        },
        withCredentials: true
      });
      if (mountedRef.current) {
        // 更新数据处理，适配分页响应结构
        setOrders(response.data.content);
        setTotalPages(response.data.totalPages);
        setTotalElements(response.data.totalElements);
        setPage(response.data.number);
      }
    } catch (error) {
      if (mountedRef.current) {
        setError('获取订单失败，请稍后重试');
      }
    } finally {
      if (mountedRef.current) {
        setIsLoading(false);
      }
    }
  }, [getUserId, size]);

  // 添加 useEffect
  useEffect(() => {
    mountedRef.current = true;
    fetchOrders();
    return () => {
      mountedRef.current = false;
    };
  }, [fetchOrders]);

  const handleStatusUpdate = async (orderNumber, newStatus) => {
    if (isSubmitting) return;

    try {
      setIsSubmitting(true);
      setError('');
      await axios.put(`http://127.0.0.1:8080/api/mail-orders/${newStatus}/${orderNumber}`, {}, {
        withCredentials: true
      });
      setSuccessMessage('订单状态更新成功！');
      await fetchOrders(page); // 保持当前页
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (error) {
      console.error('更新订单状态失败:', error);
      setError(error.response?.data || '更新订单状态失败，请重试');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRating = (orderNumber, deliveryService) => {
    setSelectedOrderNumber(orderNumber);
    setSelectedRatingType(deliveryService === 'EXPRESS' ? 'SENDER_TO_PLATFORM' : 'SENDER_TO_DELIVERER');
    setShowRatingModal(true);
  };

  const handleRatingSubmit = async () => {
    await fetchOrders(page); // 保持当前页
    setShowRatingModal(false);
  };

  const handleRatingClose = () => {
    setShowRatingModal(false);
    setSelectedOrderNumber(null);
    setSelectedRatingType(null);
  };

  // 处理页面变化 - Ant Design的分页从1开始
  const handlePageChange = useCallback((newPage) => {
    const apiPage = newPage - 1; // 转换为API需要的从0开始的页码
    setPage(apiPage);
    fetchOrders(apiPage);
  }, [fetchOrders]);

  // 处理每页条数变化
  const handleSizeChange = useCallback((current, newSize) => {
    setSize(newSize);
    setPage(0); // 重置到第一页
    fetchOrders(0);
  }, [fetchOrders]);

  // 格式化日期
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString();
  };

  // 获取订单状态对应的标签颜色
  const getStatusColor = (status) => {
    switch(status) {
      case 'PENDING':
        return 'default';
      case 'ASSIGNED':
        return 'blue';
      case 'IN_TRANSIT':
        return 'processing';
      case 'DELIVERED':
        return 'cyan';
      case 'COMPLETED':
        return 'success';
      case 'CANCELLED':
        return 'error';
      case 'REFUNDED':
        return 'warning';
      default:
        return 'default';
    }
  };

  // 表格列定义
  const columns = [
    {
      title: '订单号',
      dataIndex: 'orderNumber',
      key: 'orderNumber',
      width: 200,
    },
    {
      title: '状态',
      dataIndex: 'orderStatus',
      key: 'orderStatus',
      width: 120,
      render: (status) => (
          <Tag color={getStatusColor(status)}>
            {orderStatusMap[status] || '未知状态'}
          </Tag>
      ),
    },
    {
      title: '配送方式',
      dataIndex: 'deliveryService',
      key: 'deliveryService',
      width: 120,
      render: (service) => deliveryServiceMap[service] || 'N/A',
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 180,
      render: (date) => formatDate(date),
    },
    {
      title: '完成时间',
      dataIndex: 'completionDate',
      key: 'completionDate',
      width: 180,
      render: (date) => formatDate(date) || '-',
    },
    {
      title: '操作',
      key: 'action',
      width: 150,
      render: (_, record) => (
          <Space size="small">
            {record.orderStatus === 'IN_TRANSIT' && (
                <Button
                    type="primary"
                    size="small"
                    icon={<CheckOutlined />}
                    onClick={() => handleStatusUpdate(record.orderNumber, 'delivered')}
                    loading={isSubmitting}
                >
                  标记为已送达
                </Button>
            )}
            {record.orderStatus === 'DELIVERED' && (
                <Button
                    type="primary"
                    size="small"
                    icon={<CheckCircleOutlined />}
                    onClick={() => handleStatusUpdate(record.orderNumber, 'complete')}
                    loading={isSubmitting}
                >
                  确认完成
                </Button>
            )}
          </Space>
      ),
    },
    {
      title: '评价状态',
      key: 'ratingStatus',
      width: 120,
      render: (_, record) => (
          <Space>
            {record.orderStatus === 'COMPLETED' && !record.rating && (
                <Button
                    type="primary"
                    size="small"
                    icon={<StarOutlined />}
                    onClick={() => handleRating(record.orderNumber, record.deliveryService)}
                    loading={isSubmitting}
                >
                  评价
                </Button>
            )}
            {record.rating && (
                <Tag color="success" icon={<CheckCircleOutlined />}>已评价</Tag>
            )}
          </Space>
      ),
    },
    {
      title: '评分',
      dataIndex: ['rating', 'score'],
      key: 'ratingScore',
      width: 80,
      render: (score) => score || '-',
    },
    {
      title: '评价内容',
      dataIndex: ['rating', 'comment'],
      key: 'ratingComment',
      width: 250,
      render: (comment) => {
        if (!comment) return '-';
        return (
            <Tooltip title={comment}>
              <Text ellipsis style={{ maxWidth: 200 }}>{comment}</Text>
            </Tooltip>
        );
      },
    },
  ];

  return (
      <div className={`${styles.tableContainer} ${styles.orderManagementBackground}`}>
        {/* 提交中遮罩 */}
        {isSubmitting && (
            <Modal
                title="处理中"
                visible={isSubmitting}
                footer={null}
                closable={false}
                centered
            >
              <div style={{ textAlign: 'center', padding: '20px' }}>
                <Spin size="large" />
                <p style={{ marginTop: '10px' }}>请稍候...</p>
              </div>
            </Modal>
        )}

        <h2 className={styles.title}>我的订单列表</h2>

        {/* 分页控制面板 */}
        <div className={styles.horizontalControlPanel}>
          <div className={styles.leftControls}>
            <span className={styles.sizeLabel}>每页显示：</span>
            <Select
                value={size}
                onChange={(value) => handleSizeChange(page + 1, value)}
                disabled={isSubmitting}
                style={{ width: 120 }}
                options={[
                  { value: 5, label: '5条' },
                  { value: 10, label: '10条' },
                  { value: 20, label: '20条' },
                  { value: 50, label: '50条' },
                ]}
            />
          </div>
        </div>

        {/* 错误信息显示 */}
        {error && (
            <Alert
                message="错误"
                description={error}
                type="error"
                showIcon
                closable
                onClose={() => setError('')}
                style={{ marginBottom: 16 }}
            />
        )}

        {/* 成功信息显示 */}
        {successMessage && (
            <Alert
                message="成功"
                description={successMessage}
                type="success"
                showIcon
                closable
                onClose={() => setSuccessMessage('')}
                style={{ marginBottom: 16 }}
            />
        )}

        {/* 订单数据表格 */}
        <Spin spinning={isLoading} tip="加载中...">
          <div className={styles.tableWrapper}>
            <Table
                dataSource={orders}
                columns={columns}
                rowKey="orderNumber"
                pagination={false}
                bordered
                size="middle"
                scroll={{ x: 'max-content' }}
                locale={{ emptyText: '暂无订单记录' }}
            />
          </div>
        </Spin>

        {/* 分页控件 */}
        {totalPages > 0 && (
            <div className={styles.paginationContainer}>
              <div className={styles.paginationInfo}>
                显示 {orders.length} 条，共 {totalElements} 条记录，第 {page + 1} / {totalPages} 页
              </div>
              <Pagination
                  current={page + 1}
                  total={totalElements}
                  pageSize={size}
                  showSizeChanger={false}
                  showQuickJumper
                  disabled={isSubmitting}
                  onChange={handlePageChange}
                  showTotal={(total) => `共 ${total} 条记录`}
              />
            </div>
        )}

        {/* 评价模态框 */}
        {showRatingModal && (
            <RatingModal
                orderNumber={selectedOrderNumber}
                onClose={handleRatingClose}
                onRatingSubmit={handleRatingSubmit}
                ratingType={selectedRatingType}
                orderType="MAIL_ORDER" // 添加订单类型参数
            />
        )}
      </div>
  );
};

export default OrderManagement;