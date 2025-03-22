import React, { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import { Table, Button, Card, Space, Tag, Pagination, Spin, Alert, Select, Typography, Tooltip, Modal } from 'antd';
import { EnvironmentOutlined, CarOutlined, CheckOutlined, StarOutlined, EyeOutlined } from '@ant-design/icons';
import styles from '../../assets/css/mail/MailOrder.module.css';
import RatingModal from '../mail/RatingModal';
import MapModal from '../utils/amap/MapModal';
import RoutePlanningModal from '../utils/amap/RoutePlanningModal';
import { orderStatusMap, deliveryServiceMap } from '../utils/map/orderStatusMap';
import useAuthStore from '../utils/stores/auth/AuthStore';

const { Text } = Typography;

const MyAssignedOrders = () => {
  const [orders, setOrders] = useState([]);
  const getUserId = useAuthStore(state => state.getUserId);
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [showMapModal, setShowMapModal] = useState(false);
  const [showRoutePlanningModal, setShowRoutePlanningModal] = useState(false);
  const [selectedOrderNumber, setSelectedOrderNumber] = useState(null);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [selectedRoute, setSelectedRoute] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const mountedRef = useRef(true);

  // 分页状态
  const [page, setPage] = useState(0);
  const [size, setSize] = useState(10);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);

  const fetchAssignedOrders = useCallback(async (pageNum = 0) => {
    if (!mountedRef.current) return;

    const currentUserId = getUserId();
    if (!currentUserId) return;

    try {
      setIsLoading(true);
      setError('');
      // 分页API调用
      const response = await axios.get(
          `http://127.0.0.1:8080/api/mail-orders/assigned/${currentUserId}`,
          {
            params: {
              page: pageNum,
              size: size,
              sort: 'createdAt,desc'
            },
            withCredentials: true
          }
      );

      if (mountedRef.current) {
        // 更新数据处理，使用分页响应结构
        setOrders(response.data.content);
        setTotalPages(response.data.totalPages);
        setTotalElements(response.data.totalElements);
        setPage(response.data.number);
      }
    } catch (error) {
      if (mountedRef.current) {
        console.error('获取已接单订单失败:', error);
        setError('获取已接单订单失败，请稍后重试');
      }
    } finally {
      if (mountedRef.current) {
        setIsLoading(false);
      }
    }
  }, [getUserId, size]);

  useEffect(() => {
    mountedRef.current = true;
    fetchAssignedOrders();

    return () => {
      mountedRef.current = false;
    };
  }, [fetchAssignedOrders]);

  const showPickupCode = async (orderNumber) => {
    if (isSubmitting) return;

    try {
      setIsSubmitting(true);
      setError('');
      await axios.put(`http://127.0.0.1:8080/api/mail-orders/in-transit/${orderNumber}`, {}, {
        withCredentials: true
      });
      setSuccessMessage('取件码获取成功！');
      await fetchAssignedOrders(page); // 保持当前页
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (error) {
      console.error('更新订单状态失败:', error);
      setError('获取取件码失败，请重试');
    } finally {
      setIsSubmitting(false);
    }
  };

  const markAsDelivered = async (orderNumber) => {
    if (isSubmitting) return;

    try {
      setIsSubmitting(true);
      setError('');
      await axios.put(`http://127.0.0.1:8080/api/mail-orders/delivered/${orderNumber}`, {}, {
        withCredentials: true
      });
      setSuccessMessage('订单已成功标记为已送达！');
      await fetchAssignedOrders(page); // 保持当前页
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (error) {
      console.error('标记为已送达失败:', error);
      setError('标记为已送达失败，请重试');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRating = (orderNumber) => {
    setSelectedOrderNumber(orderNumber);
    setShowRatingModal(true);
  };

  const handleViewLocation = (address, latitude, longitude) => {
    setSelectedLocation({ address, latitude, longitude });
    setShowMapModal(true);
  };

  const handleRoutePlanning = (pickupLat, pickupLng, deliveryLat, deliveryLng) => {
    setSelectedRoute({
      pickupLocation: { latitude: pickupLat, longitude: pickupLng },
      deliveryLocation: { latitude: deliveryLat, longitude: deliveryLng }
    });
    setShowRoutePlanningModal(true);
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  // 处理页面变化 - Ant Design 的分页从1开始
  const handlePageChange = useCallback((newPage) => {
    const apiPage = newPage - 1; // 转换为API所需的从0开始的页码
    setPage(apiPage);
    fetchAssignedOrders(apiPage);
  }, [fetchAssignedOrders]);

  // 处理每页条数变化
  const handleSizeChange = useCallback((current, newSize) => {
    setSize(newSize);
    setPage(0); // 重置到第一页
    fetchAssignedOrders(0);
  }, [fetchAssignedOrders]);

  // 获取订单状态标签颜色
  const getStatusColor = (status) => {
    switch (status) {
      case 'ASSIGNED':
        return 'blue';
      case 'IN_TRANSIT':
        return 'orange';
      case 'DELIVERED':
        return 'cyan';
      case 'COMPLETED':
        return 'green';
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
      fixed: 'left',
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
      title: '配送服务',
      dataIndex: 'deliveryService',
      key: 'deliveryService',
      width: 120,
      render: (service) => deliveryServiceMap[service] || 'N/A',
    },
    {
      title: '收件人',
      dataIndex: 'name',
      key: 'name',
      width: 100,
    },
    {
      title: '联系电话',
      dataIndex: 'contactInfo',
      key: 'contactInfo',
      width: 150,
    },
    {
      title: '取件地址',
      dataIndex: 'pickupAddress',
      key: 'pickupAddress',
      width: 200,
      render: (address, record) => (
          <Space>
            <Tooltip title={address}>
              <Text ellipsis style={{ maxWidth: 120 }}>{address}</Text>
            </Tooltip>
            <Button
                type="link"
                size="small"
                icon={<EnvironmentOutlined />}
                onClick={() => handleViewLocation(
                    address,
                    record.pickupLatitude,
                    record.pickupLongitude
                )}
            >
              位置
            </Button>
          </Space>
      ),
    },
    {
      title: '配送地址',
      dataIndex: 'deliveryAddress',
      key: 'deliveryAddress',
      width: 200,
      render: (address, record) => (
          <Space>
            <Tooltip title={address}>
              <Text ellipsis style={{ maxWidth: 120 }}>{address}</Text>
            </Tooltip>
            <Button
                type="link"
                size="small"
                icon={<EnvironmentOutlined />}
                onClick={() => handleViewLocation(
                    address,
                    record.deliveryLatitude,
                    record.deliveryLongitude
                )}
            >
              位置
            </Button>
          </Space>
      ),
    },
    {
      title: '重量(KG)',
      dataIndex: 'weight',
      key: 'weight',
      width: 100,
      render: (weight) => weight?.toFixed(2) || 'N/A',
    },
    {
      title: '是否大件',
      dataIndex: 'largeItem',
      key: 'largeItem',
      width: 100,
      render: (isLarge) => isLarge ? '是' : '否',
    },
    {
      title: '预计收入',
      dataIndex: 'userIncome',
      key: 'userIncome',
      width: 120,
      render: (income) => `¥${income?.toFixed(2) || 'N/A'}`,
    },
    {
      title: '接单日期',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 180,
      render: (date) => formatDate(date),
    },
    {
      title: '完成日期',
      dataIndex: 'completionDate',
      key: 'completionDate',
      width: 180,
      render: (date) => formatDate(date),
    },
    {
      title: '取件码',
      key: 'pickupCode',
      width: 150,
      render: (_, record) => {
        if (record.orderStatus === 'ASSIGNED' && record.deliveryService === 'EXPRESS') {
          return record.pickupCode;
        } else if (record.orderStatus === 'ASSIGNED') {
          return (
              <Button
                  type="primary"
                  size="small"
                  onClick={() => showPickupCode(record.orderNumber)}
                  loading={isSubmitting}
                  icon={<EyeOutlined />}
              >
                查看取件码
              </Button>
          );
        } else {
          return record.pickupCode || '-';
        }
      },
    },
    {
      title: '操作',
      key: 'action',
      width: 120,
      render: (_, record) => {
        if (record.orderStatus === 'IN_TRANSIT') {
          return (
              <Button
                  type="primary"
                  size="small"
                  onClick={() => markAsDelivered(record.orderNumber)}
                  loading={isSubmitting}
                  icon={<CheckOutlined />}
              >
                已送达
              </Button>
          );
        }
        return null;
      },
    },
    {
      title: '评价状态',
      key: 'ratingStatus',
      width: 120,
      render: (_, record) => {
        if (record.orderStatus === 'COMPLETED' && !record.rating) {
          return (
              <Button
                  type="primary"
                  size="small"
                  onClick={() => handleRating(record.orderNumber)}
                  loading={isSubmitting}
                  icon={<StarOutlined />}
              >
                评价
              </Button>
          );
        } else if (record.rating) {
          return <Tag color="green">已评价</Tag>;
        }
        return null;
      },
    },
    {
      title: '评分',
      dataIndex: ['rating', 'score'],
      key: 'ratingScore',
      width: 100,
      render: (score) => score || '-',
    },
    {
      title: '评价内容',
      dataIndex: ['rating', 'comment'],
      key: 'ratingComment',
      width: 200,
      render: (comment) => {
        if (!comment) return '-';
        return (
            <Tooltip title={comment}>
              <Text ellipsis style={{ maxWidth: 180 }}>{comment}</Text>
            </Tooltip>
        );
      },
    },
    {
      title: '路线规划',
      key: 'routePlanning',
      width: 120,
      fixed: 'right',
      render: (_, record) => (
          <Button
              type="primary"
              size="small"
              onClick={() => handleRoutePlanning(
                  record.pickupLatitude,
                  record.pickupLongitude,
                  record.deliveryLatitude,
                  record.deliveryLongitude
              )}
              disabled={isSubmitting}
              icon={<CarOutlined />}
          >
            路线规划
          </Button>
      ),
    },
  ];

  // 主渲染部分
  return (
      <div className={`${styles.tableContainer} ${styles.myAssignedOrdersBackground}`}>
        {/* 提交中加载状态 */}
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

        <h2 className={styles.title}>我的接单列表</h2>

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

        {/* 错误与成功提示 */}
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

        {/* 订单表格 */}
        <Card bordered={false} className={styles.tableWrapper}>
          <Spin spinning={isLoading} tip="加载中...">
            <Table
                dataSource={orders}
                columns={columns}
                rowKey="orderNumber"
                pagination={false}
                scroll={{ x: 'max-content' }}
                size="middle"
                bordered
                locale={{ emptyText: '暂无接单记录' }}
            />
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
        </Card>

        {/* 评价弹窗 */}
        {showRatingModal && (
            <RatingModal
                orderNumber={selectedOrderNumber}
                onClose={() => setShowRatingModal(false)}
                onRatingSubmit={fetchAssignedOrders}
                ratingType="DELIVERER_TO_SENDER"
                orderType="MAIL_ORDER" // 添加订单类型参数
            />
        )}

        {/* 地图模态框 */}
        {showMapModal && (
            <MapModal
                isOpen={showMapModal}
                onClose={() => setShowMapModal(false)}
                address={selectedLocation.address}
                latitude={selectedLocation.latitude}
                longitude={selectedLocation.longitude}
            />
        )}

        {/* 路线规划模态框 */}
        {showRoutePlanningModal && (
            <RoutePlanningModal
                isOpen={showRoutePlanningModal}
                onClose={() => setShowRoutePlanningModal(false)}
                pickupLocation={selectedRoute.pickupLocation}
                deliveryLocation={selectedRoute.deliveryLocation}
            />
        )}
      </div>
  );
};

export default MyAssignedOrders;