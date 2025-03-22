import React, {useState, useEffect, useCallback, useRef} from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import styles from '../../assets/css/mail/MailOrder.module.css';
import { orderStatusMap, deliveryServiceMap } from '../utils/map/orderStatusMap';
import MapModal from '../utils/amap/MapModal';
import { fetchUsernamesByUserIds } from '../utils/api/Usernames';

// 引入Ant Design组件
import {
  Table,
  Button,
  Typography,
  Space,
  Spin,
  message,
  Modal,
  Pagination,
  Select,
  Tag,
  Divider,
  Row,
  Col,
  Card,
  Alert
} from 'antd';

const { Title, Text } = Typography;
const { Option } = Select;
const { confirm } = Modal;

const AdminOrderManagement = () => {
  // 在组件顶部添加
  const mountedRef = useRef(true);
  const [orders, setOrders] = useState([]);
  const [usernames, setUsernames] = useState({});
  const [showMapModal, setShowMapModal] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // 添加分页状态
  const [page, setPage] = useState(0);
  const [size, setSize] = useState(10);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);

  // 使用Ant Design的消息提示
  const setTemporaryMessage = useCallback((message, isError = false) => {
    if (isError) {
      setError(message);
      setSuccessMessage('');
    } else {
      setSuccessMessage(message);
      setError('');
    }
    setTimeout(() => {
      if (isError) {
        setError('');
      } else {
        setSuccessMessage('');
      }
    }, 3000);
  }, []);

  // 修改fetchUsernames函数
  const fetchUsernames = useCallback(async (ordersData) => {
    const userIds = new Set();
    ordersData.forEach(order => {
      if (order.userId) userIds.add(order.userId);
      if (order.assignedUserId) userIds.add(order.assignedUserId);
    });

    if (userIds.size === 0) return;

    try {
      // 使用批量API获取所有用户名
      const usernamesData = await fetchUsernamesByUserIds(Array.from(userIds));
      setUsernames(usernamesData);
    } catch (error) {
      console.error('获取用户名失败:', error);
    }
  }, []);

  // 修改订单获取函数，添加分页支持
  const fetchAllOrders = useCallback(async (pageNum = 0) => {
    if (!mountedRef.current) return;
    try {
      setIsLoading(true);
      // 修改API调用，增加分页参数
      const response = await axios.get('https://data.foreactos.fun/api/mail-orders/all', {
        params: {
          page: pageNum,
          size: size,
          sort: 'createdAt,desc'
        },
        withCredentials: true
      });
      if (mountedRef.current) {
        // 更新数据处理，适配分页响应结构
        const ordersWithDetails = response.data.content.map(order => ({
          ...order,
          showDetails: false,
          key: order.orderNumber // 为表格添加key
        }));
        setOrders(ordersWithDetails);
        setTotalPages(response.data.totalPages);
        setTotalElements(response.data.totalElements);
        setPage(response.data.number);

        await fetchUsernames(response.data.content);
      }
    } catch (error) {
      if (mountedRef.current) {
        setTemporaryMessage('获取订单数据失败，请重试', true);
        setOrders([]);
      }
    } finally {
      if (mountedRef.current) {
        setIsLoading(false);
      }
    }
  }, [fetchUsernames, setTemporaryMessage, size]);

  // 修改 useEffect
  useEffect(() => {
    mountedRef.current = true;
    fetchAllOrders();
    return () => {
      mountedRef.current = false;
    };
  }, [fetchAllOrders]);

  const toggleDetails = useCallback((orderNumber) => {
    setOrders(prevOrders =>
        prevOrders.map(order =>
            order.orderNumber === orderNumber
                ? { ...order, showDetails: !order.showDetails }
                : order
        )
    );
  }, []);

  const handleViewLocation = useCallback((address, latitude, longitude) => {
    setSelectedLocation({ address, latitude, longitude });
    setShowMapModal(true);
  }, []);

  // 添加分页处理函数
  const handlePageChange = useCallback((page) => {
    // Ant Design 分页从1开始，而API从0开始
    const newPage = page - 1;
    setPage(newPage);
    fetchAllOrders(newPage);
  }, [fetchAllOrders]);

  // 处理每页条数变化
  const handleSizeChange = useCallback((value) => {
    const newSize = parseInt(value, 10);
    setSize(newSize);
    setPage(0);
    fetchAllOrders(0);
  }, [fetchAllOrders]);

  const performAction = useCallback(async (
      actionType,
      orderNumber,
      confirmMessage,
      successMessage,
      apiPath,
      method = 'put'
  ) => {
    if (confirmMessage) {
      confirm({
        title: '确认操作',
        content: confirmMessage,
        okText: '确认',
        cancelText: '取消',
        onOk: async () => {
          try {
            setIsSubmitting(true);
            const config = { withCredentials: true };
            let response;

            switch (method.toLowerCase()) {
              case 'delete':
                response = await axios.delete(`${apiPath}/${orderNumber}`, config);
                break;
              case 'put':
              default:
                response = await axios.put(`${apiPath}/${orderNumber}`, {}, config);
                break;
            }

            if (response.status === 200) {
              message.success(successMessage);
              await fetchAllOrders(page); // 保持当前页
            }
          } catch (error) {
            console.error(`${actionType}失败:`, error);
            message.error(`${actionType}失败，请重试`);
          } finally {
            setIsSubmitting(false);
          }
        }
      });
    } else {
      try {
        setIsSubmitting(true);
        const config = { withCredentials: true };
        let response;

        switch (method.toLowerCase()) {
          case 'delete':
            response = await axios.delete(`${apiPath}/${orderNumber}`, config);
            break;
          case 'put':
          default:
            response = await axios.put(`${apiPath}/${orderNumber}`, {}, config);
            break;
        }

        if (response.status === 200) {
          message.success(successMessage);
          await fetchAllOrders(page); // 保持当前页
        }
      } catch (error) {
        console.error(`${actionType}失败:`, error);
        message.error(`${actionType}失败，请重试`);
      } finally {
        setIsSubmitting(false);
      }
    }
  }, [fetchAllOrders, page]);

  const handleManualRefund = useCallback((orderNumber) => {
    performAction(
        '退款处理',
        orderNumber,
        '确定要手动处理此退款吗？如果不手动处理，系统将在30分钟后自动处理。',
        '退款处理成功！',
        'https://data.foreactos.fun/api/mail-orders/process-refund'
    );
  }, [performAction]);

  const handleIntervene = useCallback((orderNumber) => {
    performAction(
        '订单介入',
        orderNumber,
        null,
        '已成功介入订单！',
        'https://data.foreactos.fun/api/mail-orders/intervene'
    );
  }, [performAction]);

  const handleDelete = useCallback((orderNumber) => {
    performAction(
        '删除订单',
        orderNumber,
        '确定要删除此订单吗？此操作无法撤销。',
        '订单及其相关评价删除成功',
        'https://data.foreactos.fun/api/mail-orders',
        'delete'
    );
  }, [performAction]);

  const handleDeleteRating = useCallback((orderNumber, ratingId) => {
    if (!ratingId) {
      setTemporaryMessage('无法删除未定义的评价', true);
      return;
    }
    performAction(
        '删除评价',
        `${orderNumber}/rating/${ratingId}`,
        '确定要删除此评价吗？此操作无法撤销。',
        '评价已成功删除',
        'https://data.foreactos.fun/api/mail-orders',
        'delete'
    );
  }, [performAction, setTemporaryMessage]);

  const formatDate = useCallback((dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString();
  }, []);

  // 定义表格列配置
  const columns = [
    {
      title: '订单号',
      dataIndex: 'orderNumber',
      key: 'orderNumber',
    },
    {
      title: '状态',
      dataIndex: 'orderStatus',
      key: 'orderStatus',
      render: (status) => (
          <Tag color={
            status === 'COMPLETED' ? 'green' :
                status === 'DELIVERED' ? 'blue' :
                    status === 'IN_TRANSIT' ? 'geekblue' :
                        status === 'PENDING' ? 'orange' :
                            status === 'PLATFORM_INTERVENTION' ? 'red' :
                                status === 'REFUNDING' ? 'purple' :
                                    status === 'REFUNDED' ? 'cyan' :
                                        status === 'PAYMENT_PENDING' ? 'gold' :
                                            'default'
          }>
            {orderStatusMap[status] || 'N/A'}
          </Tag>
      ),
    },
    {
      title: '配送服务',
      dataIndex: 'deliveryService',
      key: 'deliveryService',
      render: (service) => deliveryServiceMap[service] || 'N/A',
    },
    {
      title: '发单用户名',
      dataIndex: 'userId',
      key: 'userId',
      render: (userId) => usernames[userId] || '未知用户',
    },
    {
      title: '接单用户名',
      dataIndex: 'assignedUserId',
      key: 'assignedUserId',
      render: (assignedUserId) => usernames[assignedUserId] || '暂无',
    },
    {
      title: '操作',
      key: 'action',
      render: (_, order) => (
          <Space size="small" wrap>
            {!isRefunded(order) && !isPlatformIntervention(order) && !isRefunding(order) && (
                <Button
                    size="small"
                    type="primary"
                    onClick={() => handleIntervene(order.orderNumber)}
                    loading={isSubmitting}
                >
                  介入订单
                </Button>
            )}
            {isPlatformIntervention(order) && !isRefunded(order) && (
                <Button
                    size="small"
                    type="primary"
                    disabled={isSubmitting}
                >
                  <Link to={`/admin-intervention/${order.orderNumber}`} className={isSubmitting ? styles.disabled : ''}>
                    修改订单
                  </Link>
                </Button>
            )}
            {isRefunding(order) && !isRefunded(order) && (
                <Button
                    size="small"
                    type="primary"
                    onClick={() => handleManualRefund(order.orderNumber)}
                    loading={isSubmitting}
                >
                  手动处理退款
                </Button>
            )}
            <Button
                size="small"
                danger
                onClick={() => handleDelete(order.orderNumber)}
                loading={isSubmitting}
            >
              删除订单
            </Button>
            <Button
                size="small"
                type={order.showDetails ? "primary" : "default"}
                onClick={() => toggleDetails(order.orderNumber)}
                loading={isSubmitting}
            >
              {order.showDetails ? '隐藏详情' : '查看明细'}
            </Button>
          </Space>
      ),
    },
  ];

  // 详情展开渲染函数
  const expandedRowRender = (order) => {
    return (
        <Card bordered={false} className={styles.detailsCard}>
          <Row gutter={[16, 16]}>
            <Col span={12}>
              <Text strong>创建时间:</Text> {formatDate(order.createdAt)}
            </Col>
            <Col span={12}>
              <Text strong>联系方式:</Text> {order.contactInfo || 'N/A'}
            </Col>
            <Col span={12}>
              <Text strong>取件地址:</Text> {order.pickupAddress || 'N/A'}
              <Button
                  size="small"
                  style={{ marginLeft: 8 }}
                  onClick={() => handleViewLocation(
                      order.pickupAddress,
                      order.pickupLatitude,
                      order.pickupLongitude
                  )}
                  disabled={isSubmitting}
              >
                查看位置
              </Button>
            </Col>
            <Col span={12}>
              <Text strong>配送地址:</Text> {order.deliveryAddress || 'N/A'}
              <Button
                  size="small"
                  style={{ marginLeft: 8 }}
                  onClick={() => handleViewLocation(
                      order.deliveryAddress,
                      order.deliveryLatitude,
                      order.deliveryLongitude
                  )}
                  disabled={isSubmitting}
              >
                查看位置
              </Button>
            </Col>
            <Col span={12}>
              <Text strong>重量:</Text> {order.weight ? `${order.weight.toFixed(2)}kg` : 'N/A'}
            </Col>
            <Col span={12}>
              <Text strong>大件物品:</Text> {order.largeItem ? '是' : '否'}
            </Col>
            <Col span={12}>
              <Text strong>收入:</Text> {order.userIncome ? `¥${order.userIncome.toFixed(2)}` : 'N/A'}
            </Col>
            <Col span={12}>
              <Text strong>完成日期:</Text> {formatDate(order.completionDate)}
            </Col>
            {order.rating && (
                <>
                  <Divider orientation="left">评价信息</Divider>
                  <Col span={12}>
                    <Text strong>评分:</Text> {order.rating.score || 'N/A'}
                  </Col>
                  <Col span={24}>
                    <Text strong>评价内容:</Text> {order.rating.comment || 'N/A'}
                  </Col>
                  <Col span={24}>
                    <Button
                        danger
                        size="small"
                        onClick={() => handleDeleteRating(order.orderNumber, order.rating.id)}
                        disabled={isSubmitting}
                    >
                      删除评价
                    </Button>
                  </Col>
                </>
            )}
          </Row>
        </Card>
    );
  };

  // 辅助函数，检查订单状态
  const isRefunded = (order) => order.orderStatus === 'REFUNDED';
  const isPlatformIntervention = (order) => order.orderStatus === 'PLATFORM_INTERVENTION';
  const isRefunding = (order) => order.orderStatus === 'REFUNDING';

  if (isLoading) {
    return (
        <div className={styles.loadingContainer}>
          <Spin size="large" tip="加载中..." />
        </div>
    );
  }

  return (
      <div className={`${styles.tableContainer} ${styles.adminOrderBackground}`}>
        {isSubmitting && (
            <div className={styles.submittingOverlay}>
              <Spin size="large" tip="处理中..." />
            </div>
        )}

        <Title level={2} className={styles.title}>所有订单管理（管理员）</Title>

        {/* 添加分页控制面板 */}
        <div className={styles.horizontalControlPanel}>
          <div className={styles.leftControls}>
            <Space>
              <Text>每页显示：</Text>
              <Select
                  value={size}
                  onChange={handleSizeChange}
                  disabled={isSubmitting}
                  style={{ width: 120 }}
              >
                <Option value={10}>10条</Option>
                <Option value={20}>20条</Option>
                <Option value={50}>50条</Option>
                <Option value={100}>100条</Option>
              </Select>
            </Space>
          </div>
        </div>

        {error && (
            <Alert
                message="错误"
                description={error}
                type="error"
                showIcon
                style={{ marginBottom: 16 }}
            />
        )}

        {successMessage && (
            <Alert
                message="成功"
                description={successMessage}
                type="success"
                showIcon
                style={{ marginBottom: 16 }}
            />
        )}

        {orders.length === 0 ? (
            <div className={styles.noData}>暂无订单数据</div>
        ) : (
            <div className={styles.tableWrapper}>
              <Table
                  dataSource={orders}
                  columns={columns}
                  rowKey="orderNumber"
                  expandable={{
                    expandedRowRender: expandedRowRender,
                    expandRowByClick: false,
                    expandIcon: () => null, // 不显示展开图标，因为我们用按钮替代了
                  }}
                  expandedRowKeys={orders.filter(o => o.showDetails).map(o => o.orderNumber)}
                  pagination={false} // 不使用内置分页，我们自定义分页组件
                  size="middle"
                  bordered
                  scroll={{ x: 'max-content' }}
              />
            </div>
        )}

        {/* 添加分页控件 */}
        {totalPages > 0 && (
            <div className={styles.paginationContainer}>
              <div className={styles.paginationInfo}>
                <Text type="secondary">
                  显示 {orders.length} 条，共 {totalElements} 条记录，第 {page + 1} / {totalPages} 页
                </Text>
              </div>
              <Pagination
                  current={page + 1} // Ant Design分页从1开始
                  total={totalElements}
                  pageSize={size}
                  onChange={handlePageChange}
                  showSizeChanger={false} // 因为已经在上面有size选择了
                  showQuickJumper
                  showTotal={(total) => `共 ${total} 条记录`}
                  disabled={isSubmitting}
              />
            </div>
        )}

        {showMapModal && (
            <MapModal
                isOpen={showMapModal}
                onClose={() => setShowMapModal(false)}
                address={selectedLocation.address}
                latitude={selectedLocation.latitude}
                longitude={selectedLocation.longitude}
            />
        )}
      </div>
  );
};

export default AdminOrderManagement;