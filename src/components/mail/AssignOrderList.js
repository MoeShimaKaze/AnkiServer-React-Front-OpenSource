import React, { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import { Table, Button, Pagination, Spin, Alert, Select, Space, Card, Typography } from 'antd';
import styles from '../../assets/css/mail/MailOrder.module.css';
import MapModal from '../utils/amap/MapModal';
import { useMapContext } from '../context/MapContext';

const { Option } = Select;
const { Title } = Typography;

const AssignOrderList = () => {
  const mountedRef = useRef(true);

  // 修改状态管理，增加分页相关状态
  const [orders, setOrders] = useState([]);
  const [selectedAddress, setSelectedAddress] = useState('');
  const [isMapModalOpen, setIsMapModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const { key: mapKey } = useMapContext();

  // 添加分页状态
  const [page, setPage] = useState(0);
  const [size, setSize] = useState(10);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);

  const fetchOrders = useCallback(async (pageNum = 0) => {
    if (!mountedRef.current) return;

    try {
      setIsLoading(true);
      setError('');
      // 修改API调用，增加分页参数
      const response = await axios.get(`http://127.0.0.1:8080/api/mail-orders/pending`, {
        params: {
          page: pageNum,
          size: size,
          sort: 'createdAt,desc'
        },
        withCredentials: true
      });

      if (mountedRef.current) {
        // 更新响应处理，使用分页响应结构
        setOrders(response.data.content);
        setTotalPages(response.data.totalPages);
        setTotalElements(response.data.totalElements);
        setPage(response.data.number);
      }
    } catch (error) {
      if (mountedRef.current) {
        console.error('获取待接单订单失败:', error);
        setError('获取待接单订单失败，请稍后重试');
      }
    } finally {
      if (mountedRef.current) {
        setIsLoading(false);
      }
    }
  }, [size]);

  const handleAssign = useCallback(async (orderNumber) => {
    if (!mountedRef.current || isSubmitting) return;

    try {
      setIsSubmitting(true);
      setError('');
      await axios.put(`http://127.0.0.1:8080/api/mail-orders/assign/${orderNumber}`, {}, {
        withCredentials: true
      });
      if (mountedRef.current) {
        await fetchOrders(page); // 保持当前页面
        alert('接单成功！');
      }
    } catch (error) {
      if (mountedRef.current) {
        console.error('接单失败:', error);
        alert('接单失败，请重试。');
      }
    } finally {
      if (mountedRef.current) {
        setIsSubmitting(false);
      }
    }
  }, [isSubmitting, fetchOrders, page]);

  const formatDate = useCallback((dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleString();
  }, []);

  const handleViewLocation = useCallback((address, latitude, longitude) => {
    setSelectedAddress({ address, latitude, longitude });
    setIsMapModalOpen(true);
  }, []);

  // 添加分页处理函数
  const handlePageChange = useCallback((newPage) => {
    // Ant Design的分页从1开始，而我们的API从0开始
    fetchOrders(newPage - 1);
  }, [fetchOrders]);

  // 处理每页条数变化
  const handleSizeChange = useCallback((value) => {
    const newSize = parseInt(value, 10);
    setSize(newSize);
    setPage(0); // 重置页码
    fetchOrders(0); // 获取第一页
  }, [fetchOrders]);

  useEffect(() => {
    mountedRef.current = true;
    fetchOrders();

    return () => {
      mountedRef.current = false;
    };
  }, [fetchOrders]);

  // 定义Table列配置
  const columns = [
    {
      title: '订单号',
      dataIndex: 'orderNumber',
      key: 'orderNumber',
    },
    {
      title: '收件人',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: '联系方式',
      dataIndex: 'contactInfo',
      key: 'contactInfo',
    },
    {
      title: '取件地址',
      dataIndex: 'pickupAddress',
      key: 'pickupAddress',
      render: (text, record) => (
          <Space direction="vertical" size="small">
            {text}
            <Button
                type="primary"
                size="small"
                onClick={() => handleViewLocation(
                    record.pickupAddress,
                    record.pickupLatitude,
                    record.pickupLongitude
                )}
                className={styles.smallButton}
                disabled={isSubmitting}
            >
              查看位置
            </Button>
          </Space>
      ),
    },
    {
      title: '配送地址',
      dataIndex: 'deliveryAddress',
      key: 'deliveryAddress',
      render: (text, record) => (
          <Space direction="vertical" size="small">
            {text}
            <Button
                type="primary"
                size="small"
                onClick={() => handleViewLocation(
                    record.deliveryAddress,
                    record.deliveryLatitude,
                    record.deliveryLongitude
                )}
                className={styles.smallButton}
                disabled={isSubmitting}
            >
              查看位置
            </Button>
          </Space>
      ),
    },
    {
      title: '重量(kg)',
      dataIndex: 'weight',
      key: 'weight',
      render: (text) => text.toFixed(2),
    },
    {
      title: '是否大件',
      dataIndex: 'isLargeItem',
      key: 'isLargeItem',
      render: (text) => text ? '是' : '否',
    },
    {
      title: '预计收入',
      dataIndex: 'userIncome',
      key: 'userIncome',
      render: (text) => `¥${text.toFixed(2)}`,
    },
    {
      title: '发布日期',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (text) => formatDate(text),
    },
    {
      title: '操作',
      key: 'action',
      render: (_, record) => (
          <Button
              type="primary"
              onClick={() => handleAssign(record.orderNumber)}
              className={styles.smallButton}
              loading={isSubmitting}
              disabled={isSubmitting}
          >
            {isSubmitting ? '接单中...' : '接单'}
          </Button>
      ),
    },
  ];

  return (
      <div className={`${styles.tableContainer} ${styles.pendingOrdersBackground}`}>
        {isSubmitting && (
            <div className={styles.submittingOverlay}>
              <Spin size="large" tip="处理中..." />
            </div>
        )}

        <Card
            className={styles.tableContainer}
            title={<Title level={4} className={styles.title}>待接订单列表</Title>}
            bordered={false}
        >
          <div className={styles.pageSizeContainer}>
            <span className={styles.paginationLabel}>每页显示:</span>
            <Select
                value={size.toString()}
                onChange={handleSizeChange}
                disabled={isSubmitting}
                dropdownMatchSelectWidth={false}
            >
              <Option value="5">5条</Option>
              <Option value="10">10条</Option>
              <Option value="20">20条</Option>
              <Option value="50">50条</Option>
            </Select>
          </div>

          {error && (
              <Alert
                  message={error}
                  type="error"
                  showIcon
                  style={{ marginBottom: 16 }}
              />
          )}

          {/* 使用Ant Design表格 */}
          <Spin spinning={isLoading} tip="加载中...">
            {orders.length === 0 && !isLoading ? (
                <Alert
                    message="暂无待接订单"
                    type="info"
                    showIcon
                    style={{ marginBottom: 16 }}
                />
            ) : (
                <Table
                    columns={columns}
                    dataSource={orders}
                    rowKey="orderNumber"
                    pagination={false}
                    className={styles.table}
                    size="middle"
                    bordered
                />
            )}
          </Spin>

          {/* 使用Ant Design分页器 */}
          {totalPages > 0 && (
              <div className={styles.paginationContainer}>
                <div className={styles.paginationInfo}>
                  显示 {orders.length} 条，共 {totalElements} 条记录，第 {page + 1} / {totalPages} 页
                </div>
                <Pagination
                    current={page + 1}
                    total={totalElements}
                    pageSize={size}
                    onChange={handlePageChange}
                    disabled={isSubmitting}
                    showSizeChanger={false}
                    showQuickJumper
                    showTotal={(total) => `共 ${total} 条记录`}
                />
              </div>
          )}

          {isMapModalOpen && (
              <MapModal
                  isOpen={isMapModalOpen}
                  onClose={() => setIsMapModalOpen(false)}
                  address={selectedAddress.address}
                  latitude={selectedAddress.latitude}
                  longitude={selectedAddress.longitude}
                  mapKey={mapKey}
              />
          )}
        </Card>
      </div>
  );
};

export default AssignOrderList;