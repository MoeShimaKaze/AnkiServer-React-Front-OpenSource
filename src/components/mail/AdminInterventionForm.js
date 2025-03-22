import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Form,
  Input,
  Select,
  Button,
  Checkbox,
  Card,
  Spin,
  Alert,
  Space,
  Row,
  Col,
  Typography,
  Divider
} from 'antd';
import { ArrowLeftOutlined, SaveOutlined, RollbackOutlined } from '@ant-design/icons';
import styles from '../../assets/css/mail/AdminInterventionForm.module.css';
import Navbar from '../base/Navbar';
import { orderStatusMap } from '../utils/map/orderStatusMap';
import MapSelector from '../utils/amap/MapSelector';

const { Title } = Typography;
const { Option } = Select;
const { TextArea } = Input;

const AdminInterventionForm = () => {
  const { orderNumber } = useParams();
  const navigate = useNavigate();
  const [form] = Form.useForm();

  const [order, setOrder] = useState(null);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchOrder = useCallback(async () => {
    try {
      setIsLoading(true);
      setError('');
      const response = await axios.get(
          `http://127.0.0.1:8080/api/mail-orders/${orderNumber}`,
          { withCredentials: true }
      );
      setOrder(response.data);
      // 设置表单初始值
      form.setFieldsValue({
        name: response.data.name,
        contactInfo: response.data.contactInfo,
        pickupDetail: response.data.pickupDetail,
        deliveryDetail: response.data.deliveryDetail,
        weight: response.data.weight,
        isLargeItem: response.data.isLargeItem,
        fee: response.data.fee,
        orderStatus: response.data.orderStatus
      });
    } catch (error) {
      console.error('获取订单失败:', error);
      if (error.response?.status === 403) {
        setError('您无权访问此订单或订单不处于平台介入状态。');
      } else {
        setError('获取订单失败，请重试。');
      }
    } finally {
      setIsLoading(false);
    }
  }, [orderNumber, form]);

  useEffect(() => {
    let mounted = true;

    const loadOrder = async () => {
      try {
        await fetchOrder();
      } catch (error) {
        if (mounted) {
          console.error('加载订单失败:', error);
        }
      }
    };

    loadOrder();

    return () => {
      mounted = false;
    };
  }, [fetchOrder]);

  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => {
        navigate('/mailorder', { replace: true });
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [error, navigate]);

  const handleValuesChange = (changedValues, allValues) => {
    setOrder(prevOrder => ({
      ...prevOrder,
      ...changedValues
    }));
  };

  const handlePickupAddressSelect = (selectedAddress) => {
    setOrder(prevOrder => ({
      ...prevOrder,
      pickupAddress: selectedAddress.name,
      pickupLatitude: selectedAddress.latitude,
      pickupLongitude: selectedAddress.longitude,
      pickupDetail: selectedAddress.detail
    }));

    // 更新表单值
    form.setFieldsValue({
      pickupDetail: selectedAddress.detail
    });
  };

  const handleDeliveryAddressSelect = (selectedAddress) => {
    setOrder(prevOrder => ({
      ...prevOrder,
      deliveryAddress: selectedAddress.name,
      deliveryLatitude: selectedAddress.latitude,
      deliveryLongitude: selectedAddress.longitude,
      deliveryDetail: selectedAddress.detail
    }));

    // 更新表单值
    form.setFieldsValue({
      deliveryDetail: selectedAddress.detail
    });
  };

  const handleSubmit = async (values) => {
    if (isSubmitting) return;

    try {
      setIsSubmitting(true);
      setError('');

      // 合并表单值与当前order对象
      const updatedOrder = {
        ...order,
        ...values
      };

      await axios.put(
          `http://127.0.0.1:8080/api/mail-orders/update-intervened/${orderNumber}`,
          updatedOrder,
          { withCredentials: true }
      );

      setSuccessMessage('订单更新成功');
      setTimeout(() => {
        navigate('/mailorder', { replace: true });
      }, 1500);
    } catch (error) {
      console.error('更新订单失败:', error);
      setError(error.response?.data || '更新订单失败，请重试');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRefund = async () => {
    if (isSubmitting) return;

    try {
      setIsSubmitting(true);
      setError('');
      await axios.put(
          `http://127.0.0.1:8080/api/mail-orders/refund/${orderNumber}`,
          {},
          { withCredentials: true }
      );
      setSuccessMessage('退款申请已提交');
      setTimeout(() => fetchOrder(), 1500);
    } catch (error) {
      console.error('申请退款失败:', error);
      setError('申请退款失败，请重试');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFocus = () => setIsFocused(true);
  const handleBlur = () => setIsFocused(false);

  const handleReturn = () => {
    try {
      navigate('/mailorder', { replace: true });
    } catch (error) {
      console.error('导航错误:', error);
    }
  };

  if (isLoading) {
    return (
        <div className={styles.pageContainer}>
          <Navbar />
          <div className={styles.loadingContainer}>
            <Spin size="large" tip="加载订单信息中..." />
          </div>
        </div>
    );
  }

  if (error) {
    return (
        <div className={styles.pageContainer}>
          <Navbar />
          <div className={styles.errorContainer}>
            <Alert
                message="错误"
                description={error}
                type="error"
                showIcon
            />
            <div className={styles.redirectMessage}>
              即将返回订单列表页面...
            </div>
          </div>
        </div>
    );
  }

  if (!order) {
    return (
        <div className={styles.pageContainer}>
          <Navbar />
          <div className={styles.errorContainer}>
            <Alert
                message="订单不存在"
                description="订单数据不存在"
                type="error"
                showIcon
            />
            <div className={styles.redirectMessage}>
              即将返回订单列表页面...
            </div>
          </div>
        </div>
    );
  }

  return (
      <div className={styles.pageContainer}>
        <Navbar />
        <div className={`${styles.background} ${isFocused ? styles.blur : ''}`}></div>

        <Card
            className={styles.formWrapper}
            bordered={false}
            loading={isSubmitting}
        >
          <div className={styles.formHeader}>
            <Title level={3} className={styles.title}>管理员订单介入</Title>
            <Button
                icon={<ArrowLeftOutlined />}
                onClick={handleReturn}
                className={styles.returnButton}
            >
              返回
            </Button>
          </div>

          {successMessage && (
              <Alert
                  message="成功"
                  description={successMessage}
                  type="success"
                  showIcon
                  style={{ marginBottom: 20 }}
              />
          )}

          {error && (
              <Alert
                  message="错误"
                  description={error}
                  type="error"
                  showIcon
                  style={{ marginBottom: 20 }}
              />
          )}

          <Form
              form={form}
              layout="vertical"
              onFinish={handleSubmit}
              onFocus={handleFocus}
              onBlur={handleBlur}
              onValuesChange={handleValuesChange}
              initialValues={{
                name: order.name,
                contactInfo: order.contactInfo,
                pickupDetail: order.pickupDetail,
                deliveryDetail: order.deliveryDetail,
                weight: order.weight,
                isLargeItem: order.isLargeItem,
                fee: order.fee,
                orderStatus: order.orderStatus
              }}
              disabled={isSubmitting}
          >
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                    label="收件人姓名"
                    name="name"
                    rules={[{ required: true, message: '请输入收件人姓名' }]}
                >
                  <Input placeholder="请输入收件人姓名" />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                    label="联系方式"
                    name="contactInfo"
                    rules={[{ required: true, message: '请输入联系方式' }]}
                >
                  <Input placeholder="请输入联系方式" />
                </Form.Item>
              </Col>
            </Row>

            <Divider orientation="left">取件信息</Divider>

            <Form.Item
                label="取件地址"
            >
              <MapSelector
                  initialAddress={order.pickupAddress}
                  onAddressSelect={handlePickupAddressSelect}
                  placeholder="输入取件地址搜索"
                  initialLatitude={order.pickupLatitude}
                  initialLongitude={order.pickupLongitude}
                  disabled={isSubmitting}
              />
            </Form.Item>

            <Form.Item
                label="取件详细地址"
                name="pickupDetail"
                rules={[{ required: true, message: '请输入取件详细地址' }]}
            >
              <TextArea rows={2} placeholder="请输入取件详细地址" />
            </Form.Item>

            <Divider orientation="left">配送信息</Divider>

            <Form.Item
                label="配送地址"
            >
              <MapSelector
                  initialAddress={order.deliveryAddress}
                  onAddressSelect={handleDeliveryAddressSelect}
                  placeholder="输入配送地址搜索"
                  initialLatitude={order.deliveryLatitude}
                  initialLongitude={order.deliveryLongitude}
                  disabled={isSubmitting}
              />
            </Form.Item>

            <Form.Item
                label="配送详细地址"
                name="deliveryDetail"
                rules={[{ required: true, message: '请输入配送详细地址' }]}
            >
              <TextArea rows={2} placeholder="请输入配送详细地址" />
            </Form.Item>

            <Divider orientation="left">订单信息</Divider>

            <Row gutter={16}>
              <Col span={8}>
                <Form.Item
                    label="重量(kg)"
                    name="weight"
                    rules={[{ required: true, message: '请输入重量' }]}
                >
                  <Input type="number" step="0.1" min="0" placeholder="请输入重量" />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item
                    label="是否大件"
                    name="isLargeItem"
                    valuePropName="checked"
                >
                  <Checkbox>是否大件</Checkbox>
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item
                    label="费用"
                    name="fee"
                >
                  <Input type="number" disabled />
                </Form.Item>
              </Col>
            </Row>

            <Form.Item
                label="订单状态"
                name="orderStatus"
                rules={[{ required: true, message: '请选择订单状态' }]}
            >
              <Select placeholder="请选择订单状态">
                {Object.entries(orderStatusMap).map(([key, value]) => (
                    <Option key={key} value={key}>{value}</Option>
                ))}
              </Select>
            </Form.Item>

            <Form.Item>
              <Space size="middle">
                <Button
                    type="primary"
                    htmlType="submit"
                    loading={isSubmitting}
                    icon={<SaveOutlined />}
                >
                  {isSubmitting ? '更新中...' : '更新订单'}
                </Button>

                {order.orderStatus === 'PLATFORM_INTERVENTION' && (
                    <Button
                        type="danger"
                        onClick={handleRefund}
                        loading={isSubmitting}
                        icon={<RollbackOutlined />}
                        danger
                    >
                      申请退款
                    </Button>
                )}
              </Space>
            </Form.Item>
          </Form>
        </Card>
      </div>
  );
};

export default AdminInterventionForm;