import React, { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import {
  Table,
  Button,
  Pagination,
  Card,
  Descriptions,
  Spin,
  Alert,
  Select,
  Space,
  Tag,
  Modal,
  Divider,
  Empty
} from 'antd';
import { CarOutlined, EnvironmentOutlined, SendOutlined, EyeOutlined, EyeInvisibleOutlined } from '@ant-design/icons';
import styles from '../../assets/css/mail/MailOrder.module.css';
import { orderStatusMap, deliveryServiceMap } from '../utils/map/orderStatusMap';
import MapModal from '../utils/amap/MapModal';
import RoutePlanningModal from '../utils/amap/RoutePlanningModal';
import useAuthStore from '../utils/stores/auth/AuthStore';

const MessengerOrderList = () => {
  // 从 AuthStore 获取用户ID方法
  const getUserId = useAuthStore(state => state.getUserId);

  // 组件状态管理
  const [orders, setOrders] = useState([]); // 订单列表
  const [expandedOrderNumber, setExpandedOrderNumber] = useState(null); // 展开的订单
  const [showMapModal, setShowMapModal] = useState(false); // 地图模态框显示状态
  const [showRoutePlanningModal, setShowRoutePlanningModal] = useState(false); // 路线规划模态框显示状态
  const [selectedLocation, setSelectedLocation] = useState(null); // 选中的位置信息
  const [selectedRoute, setSelectedRoute] = useState(null); // 选中的路线信息
  const [isLoading, setIsLoading] = useState(true); // 加载状态
  const [isSubmitting, setIsSubmitting] = useState(false); // 提交状态
  const [error, setError] = useState(''); // 错误信息
  const [successMessage, setSuccessMessage] = useState(''); // 成功消息

  // 分页状态
  const [page, setPage] = useState(0);
  const [size, setSize] = useState(10);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);

  // 使用 ref 追踪组件挂载状态，防止内存泄漏
  const mountedRef = useRef(true);

  // 获取订单列表的函数，添加分页参数
  const fetchOrders = useCallback(async (pageNum = 0) => {
    // 如果组件已卸载，不执行操作
    if (!mountedRef.current) return;

    // 获取当前用户ID
    const currentUserId = getUserId();
    if (!currentUserId) return;

    try {
      setIsLoading(true);
      setError('');
      // 修改API调用，添加分页参数
      const response = await axios.get('http://127.0.0.1:8080/api/mail-orders/assigned', {
        params: {
          page: pageNum,
          size: size,
          sort: 'createdAt,desc'
        },
        withCredentials: true
      });

      // 确保组件仍然挂载时才更新状态
      if (mountedRef.current) {
        // 更新处理响应数据，适配分页结构
        setOrders(response.data.content);
        setTotalPages(response.data.totalPages);
        setTotalElements(response.data.totalElements);
        setPage(response.data.number);
      }
    } catch (error) {
      if (mountedRef.current) {
        console.error('获取配送订单失败:', error);
        setError('获取配送订单失败，请稍后重试');
      }
    } finally {
      if (mountedRef.current) {
        setIsLoading(false);
      }
    }
  }, [getUserId, size]);

  // 处理订单状态更新
  const handleStatusUpdate = useCallback(async (orderNumber, newStatus) => {
    // 防止重复提交和组件卸载后的操作
    if (!mountedRef.current || isSubmitting) return;

    try {
      setIsSubmitting(true);
      setError('');
      await axios.put(`http://127.0.0.1:8080/api/mail-orders/${newStatus}/${orderNumber}`, {}, {
        withCredentials: true
      });

      if (mountedRef.current) {
        setSuccessMessage('订单状态更新成功！');
        await fetchOrders(page); // 保持在当前页
        // 3秒后清除成功消息
        setTimeout(() => {
          if (mountedRef.current) {
            setSuccessMessage('');
          }
        }, 3000);
      }
    } catch (error) {
      if (mountedRef.current) {
        console.error('更新订单状态失败:', error);
        setError(error.response?.data || '更新订单状态失败，请重试');
      }
    } finally {
      if (mountedRef.current) {
        setIsSubmitting(false);
      }
    }
  }, [fetchOrders, isSubmitting, page]);

  // 处理订单详情的展开/收起
  const toggleDetails = useCallback((orderNumber) => {
    setExpandedOrderNumber(prevOrderNumber =>
        prevOrderNumber === orderNumber ? null : orderNumber
    );
  }, []);

  // 处理位置查看
  const handleViewLocation = useCallback((address, latitude, longitude) => {
    setSelectedLocation({ address, latitude, longitude });
    setShowMapModal(true);
  }, []);

  // 处理路线规划
  const handleRoutePlanning = useCallback((pickupLat, pickupLng, deliveryLat, deliveryLng) => {
    setSelectedRoute({
      pickupLocation: { latitude: pickupLat, longitude: pickupLng },
      deliveryLocation: { latitude: deliveryLat, longitude: deliveryLng }
    });
    setShowRoutePlanningModal(true);
  }, []);

  // 处理页面变化
  const handlePageChange = useCallback((newPage) => {
    // Ant Design Pagination组件的页码从1开始，而API从0开始
    const apiPage = newPage - 1;
    setPage(apiPage);
    fetchOrders(apiPage);
  }, [fetchOrders]);

  // 处理每页条数变化
  const handleSizeChange = useCallback((current, newSize) => {
    setSize(newSize);
    setPage(0);
    fetchOrders(0);
  }, [fetchOrders]);

  // 组件生命周期管理
  useEffect(() => {
    // 组件挂载时设置标记并获取订单
    mountedRef.current = true;
    fetchOrders();

    // 组件卸载时的清理
    return () => {
      mountedRef.current = false;
    };
  }, [fetchOrders]);

  // 格式化日期
  const formatDate = useCallback((dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString();
  }, []);

  // 获取订单状态标签颜色
  const getStatusColor = (status) => {
    switch (status) {
      case 'ASSIGNED':
        return 'blue';
      case 'IN_TRANSIT':
        return 'orange';
      case 'DELIVERED':
        return 'green';
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
      width: 120,
    },
    {
      title: '操作',
      key: 'action',
      width: 240,
      render: (_, record) => (
          <Space size="small">
            {record.orderStatus === 'IN_TRANSIT' && (
                <Button
                    type="primary"
                    onClick={() => handleStatusUpdate(record.orderNumber, 'delivered')}
                    loading={isSubmitting}
                    icon={<SendOutlined />}
                    size="small"
                >
                  确认送达
                </Button>
            )}
            <Button
                type={expandedOrderNumber === record.orderNumber ? 'primary' : 'default'}
                onClick={() => toggleDetails(record.orderNumber)}
                disabled={isSubmitting}
                icon={expandedOrderNumber === record.orderNumber ? <EyeInvisibleOutlined /> : <EyeOutlined />}
                size="small"
            >
              {expandedOrderNumber === record.orderNumber ? '隐藏详情' : '查看详情'}
            </Button>
          </Space>
      ),
    },
  ];

  // 渲染订单详情
  const expandedRowRender = (record) => {
    return (
        <Card bordered={false} className={styles.detailsCard}>
          <Descriptions bordered size="small" column={{ xxl: 3, xl: 3, lg: 2, md: 2, sm: 2, xs: 1 }}>
            <Descriptions.Item label="创建时间">{formatDate(record.createdAt)}</Descriptions.Item>
            <Descriptions.Item label="联系方式">{record.contactInfo}</Descriptions.Item>
            <Descriptions.Item label="取件地址">
              <Space>
                {record.pickupAddress}
                <Button
                    type="link"
                    onClick={() => handleViewLocation(
                        record.pickupAddress,
                        record.pickupLatitude,
                        record.pickupLongitude
                    )}
                    icon={<EnvironmentOutlined />}
                    size="small"
                >
                  查看位置
                </Button>
              </Space>
            </Descriptions.Item>
            <Descriptions.Item label="配送地址">
              <Space>
                {record.deliveryAddress}
                <Button
                    type="link"
                    onClick={() => handleViewLocation(
                        record.deliveryAddress,
                        record.deliveryLatitude,
                        record.deliveryLongitude
                    )}
                    icon={<EnvironmentOutlined />}
                    size="small"
                >
                  查看位置
                </Button>
              </Space>
            </Descriptions.Item>
            <Descriptions.Item label="取件码">
              {record.orderStatus === 'ASSIGNED' ? (
                  <Button
                      type="primary"
                      onClick={() => handleStatusUpdate(record.orderNumber, 'in-transit')}
                      disabled={isSubmitting || record.orderStatus !== 'ASSIGNED'}
                      size="small"
                  >
                    查看取件码
                  </Button>
              ) : record.pickupCode ? (
                  record.pickupCode
              ) : (
                  '-'
              )}
            </Descriptions.Item>
            <Descriptions.Item label="重量">{record.weight?.toFixed(2) || 'N/A'} kg</Descriptions.Item>
            <Descriptions.Item label="是否为大件">{record.largeItem ? '是' : '否'}</Descriptions.Item>
            <Descriptions.Item label="预计收入">¥{record.userIncome?.toFixed(2) || 'N/A'}</Descriptions.Item>
          </Descriptions>
          <Divider style={{ margin: '12px 0' }} />
          <div style={{ textAlign: 'center' }}>
            <Button
                type="primary"
                onClick={() => handleRoutePlanning(
                    record.pickupLatitude,
                    record.pickupLongitude,
                    record.deliveryLatitude,
                    record.deliveryLongitude
                )}
                disabled={isSubmitting}
                icon={<CarOutlined />}
            >
              查看路线规划
            </Button>
          </div>
        </Card>
    );
  };

  // 确定展开行的key
  const expandedRowKeys = expandedOrderNumber ? [expandedOrderNumber] : [];

  // 主渲染部分
  return (
      <div className={`${styles.tableContainer} ${styles.messengerOrderBackground}`}>
        <Modal
            title="加载中"
            visible={isSubmitting}
            footer={null}
            closable={false}
            centered
            maskClosable={false}
            className={styles.loadingModal}
        >
          <div style={{ textAlign: 'center', padding: '20px' }}>
            <Spin size="large" />
            <p style={{ marginTop: '10px' }}>请稍候...</p>
          </div>
        </Modal>

        <h2 className={styles.title}>配送员订单列表</h2>

        {/* 分页和大小控制 */}
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

        {/* 显示错误信息 */}
        {error && (
            <Alert
                message="错误"
                description={error}
                type="error"
                showIcon
                style={{ marginBottom: 16 }}
                closable
                onClose={() => setError('')}
            />
        )}

        {/* 显示成功消息 */}
        {successMessage && (
            <Alert
                message="成功"
                description={successMessage}
                type="success"
                showIcon
                style={{ marginBottom: 16 }}
                closable
                onClose={() => setSuccessMessage('')}
            />
        )}

        {/* 使用Ant Design表格组件 */}
        <Spin spinning={isLoading} tip="加载中...">
          <div className={styles.tableWrapper}>
            {orders.length === 0 ? (
                <Empty description="暂无配送订单" />
            ) : (
                <Table
                    rowKey="orderNumber"
                    dataSource={orders}
                    columns={columns}
                    expandable={{
                      expandedRowRender,
                      expandedRowKeys,
                      onExpand: (expanded, record) => {
                        if (expanded) {
                          setExpandedOrderNumber(record.orderNumber);
                        } else {
                          setExpandedOrderNumber(null);
                        }
                      }
                    }}
                    pagination={false}
                    scroll={{ x: 'max-content' }}
                    bordered
                    size="middle"
                />
            )}
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

export default MessengerOrderList;