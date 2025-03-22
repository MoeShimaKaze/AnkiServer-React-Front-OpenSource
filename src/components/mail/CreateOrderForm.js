// noinspection JSUnresolvedReference

import React, { useState } from 'react';
import axios from 'axios';
import { Form, Input, Select, Checkbox, DatePicker, Button, Alert } from 'antd';
import moment from 'moment';
import styles from '../../assets/css/mail/MailOrder.module.css';
import MapSelector from '../utils/amap/MapSelector';
import PaymentStatus from '../utils/api/PaymentStatus';
import PaymentLoading from '../utils/PaymentLoading';
import { setPaymentMode, clearPaymentMode } from '../utils/errorHandler';

/**
 * 创建订单表单组件
 * 处理订单创建、支付流程和表单状态管理
 */
const CreateOrderForm = ({ onOrderCreated }) => {
  // 基础表单状态管理
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [paymentLoadingMessage, setPaymentLoadingMessage] = useState('');

  // 订单和支付状态管理
  const [orderNumber, setOrderNumber] = useState(null);
  const [showPayment] = useState(false);

  // 订单表单数据状态
  const [order, setOrder] = useState({
    name: '',
    pickupCode: '',
    trackingNumber: '',
    contactInfo: '',
    pickupAddress: '',
    pickupLatitude: null,
    pickupLongitude: null,
    pickupDetail: '',
    deliveryAddress: '',
    deliveryLatitude: null,
    deliveryLongitude: null,
    deliveryDetail: '',
    deliveryTime: '',
    deliveryService: '1',
    weight: 0,
    isLargeItem: false
  });

  /**
   * 处理表单字段变更
   * @param {Event} e - 表单事件对象
   */
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setOrder(prevOrder => ({
      ...prevOrder,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  /**
   * 处理Form.Item字段值变更 - 适配Ant Design表单
   * @param {string} name - 字段名
   * @param {any} value - 字段值
   */
  const handleFormChange = (name, value) => {
    setOrder(prevOrder => ({
      ...prevOrder,
      [name]: value
    }));
  };

  /**
   * 处理取货地址选择
   * @param {Object} selectedAddress - 选中的地址信息
   */
  const handlePickupAddressSelect = (selectedAddress) => {
    setOrder(prevOrder => ({
      ...prevOrder,
      pickupAddress: selectedAddress.name,
      pickupLatitude: selectedAddress.latitude,
      pickupLongitude: selectedAddress.longitude,
      pickupDetail: selectedAddress.detail
    }));
  };

  /**
   * 处理配送地址选择
   * @param {Object} selectedAddress - 选中的地址信息
   */
  const handleDeliveryAddressSelect = (selectedAddress) => {
    setOrder(prevOrder => ({
      ...prevOrder,
      deliveryAddress: selectedAddress.name,
      deliveryLatitude: selectedAddress.latitude,
      deliveryLongitude: selectedAddress.longitude,
      deliveryDetail: selectedAddress.detail
    }));
  };

  /**
   * 处理支付完成回调
   */
  const handlePaymentComplete = () => {
    localStorage.removeItem('currentOrderNumber');
    onOrderCreated?.();
  };

  /**
   * 处理日期时间选择
   * @param {moment} date - moment日期对象
   */
  const handleDateTimeChange = (date) => {
    if (date) {
      setOrder(prevOrder => ({
        ...prevOrder,
        deliveryTime: date.format('YYYY-MM-DDTHH:mm:ss')
      }));
    }
  };

// 修改支付处理函数 handleSubmit
  const handleSubmit = async (e) => {
    if (e && e.preventDefault) {
      e.preventDefault();
    }

    setLoading(true);
    setError('');
    setPaymentLoadingMessage('正在创建订单...');

    try {
      // 开启支付模式，防止自动刷新
      setPaymentMode(true);

      // 创建订单并获取支付信息
      const response = await axios.post(
          'http://127.0.0.1:8080/api/mail-orders/create',
          order,
          { withCredentials: true }
      );

      const paymentResponse = response.data;
      setPaymentLoadingMessage('正在准备支付环境...');
      setOrderNumber(paymentResponse.orderNumber);

      // 保存订单号到localStorage，用于后续支付状态查询和回跳识别
      localStorage.setItem('currentOrderNumber', paymentResponse.orderNumber);
      // 保存当前页面路径，用于支付完成后导航回来
      localStorage.setItem('paymentReturnPath', window.location.pathname);

      // 使用payUrl进行支付（直接跳转当前窗口）
      if (paymentResponse.payUrl) {
        setPaymentLoadingMessage('即将跳转到支付页面...');

        setTimeout(() => {
          // 直接在当前窗口导航到支付链接
          window.location.href = paymentResponse.payUrl;
        }, 1000);
        return;
      }

      // 回退到表单方式 - 使用临时表单在当前窗口提交
      if (paymentResponse.payForm) {
        setPaymentLoadingMessage('正在准备支付表单...');

        // 创建临时表单容器
        const formContainer = document.createElement('div');
        formContainer.id = 'temp-payment-form';
        formContainer.style.display = 'none';
        formContainer.innerHTML = paymentResponse.payForm;
        document.body.appendChild(formContainer);

        // 获取并修改表单
        const form = formContainer.querySelector('form');

        if (form) {
          // 确保表单在当前窗口中提交（不使用target="_blank"）
          form.removeAttribute('target');

          setPaymentLoadingMessage('即将跳转到支付页面...');

          setTimeout(() => {
            try {
              // 在当前窗口提交表单
              form.submit();
            } catch (submitError) {
              console.error('表单提交失败:', submitError);
              setError('提交支付表单时出错，请重试');
              setLoading(false);
              clearPaymentMode();

              // 清理DOM
              if (document.body.contains(formContainer)) {
                document.body.removeChild(formContainer);
              }
            }
          }, 1000);
        } else {
          throw new Error('找不到支付表单');
        }
        return;
      }

      // 如果两种方式都不可用，抛出错误
      throw new Error('未返回有效的支付信息');

    } catch (error) {
      console.error('订单创建或支付失败:', error);
      setError(error.response?.data || error.message || '创建订单失败，请重试');
      setLoading(false);
      clearPaymentMode(); // 清理支付模式
    }
  };

  // 如果正在显示支付状态，渲染支付状态组件
  if (showPayment && orderNumber) {
    return (
        <PaymentStatus
            orderNumber={orderNumber}
            onPaymentComplete={handlePaymentComplete}
        />
    );
  }

  // 渲染订单创建表单
  return (
      <div className={styles.formContainer}>
        <h2 className={styles.formTitle}>创建新订单</h2>

        {error && (
            <Alert
                message={<div dangerouslySetInnerHTML={{__html: error}} />}
                type="error"
                style={{ marginBottom: 16 }}
            />
        )}

        {/* 加载状态组件 - 使用相对定位的容器覆盖表单 */}
        {loading && <PaymentLoading message={paymentLoadingMessage} />}

        {/* 表单内容遮罩 - 确保滚动内容也被覆盖 */}
        {loading && <div className={styles.formLoadingMask}></div>}

        <Form
            layout="vertical"
            className={styles.form}
            onFinish={handleSubmit}
        >
          {/* 表单字段保持不变 */}
          {/* 收件人信息 */}
          <Form.Item
              label="收件人姓名"
              required
              className={styles.formGroup}
          >
            <Input
                id="name"
                name="name"
                value={order.name}
                onChange={handleChange}
                placeholder="请输入收件人姓名"
                required
            />
          </Form.Item>

          <Form.Item
              label="联系方式"
              required
              className={styles.formGroup}
          >
            <Input
                id="contactInfo"
                name="contactInfo"
                value={order.contactInfo}
                onChange={handleChange}
                placeholder="请输入联系方式"
                required
            />
          </Form.Item>

          <Form.Item
              label="取件码"
              required
              className={styles.formGroup}
          >
            <Input
                id="pickupCode"
                name="pickupCode"
                value={order.pickupCode}
                onChange={handleChange}
                placeholder="请输入取件码"
                required
            />
          </Form.Item>

          <Form.Item
              label="快递单号"
              required
              className={styles.formGroup}
          >
            <Input
                id="trackingNumber"
                name="trackingNumber"
                value={order.trackingNumber}
                onChange={handleChange}
                placeholder="请输入快递单号"
                required
            />
          </Form.Item>

          {/* 地址信息 */}
          <Form.Item
              label="取货地址"
              required
              className={styles.formGroup}
          >
            <MapSelector
                id="pickupAddress"
                initialAddress={order.pickupAddress}
                onAddressSelect={handlePickupAddressSelect}
                placeholder="输入取货地址搜索"
            />
          </Form.Item>

          <Form.Item
              label="取货详细地址"
              required
              className={styles.formGroup}
          >
            <Input
                id="pickupDetail"
                name="pickupDetail"
                value={order.pickupDetail}
                onChange={handleChange}
                placeholder="请输入取货详细地址"
                required
            />
          </Form.Item>

          <Form.Item
              label="配送地址"
              required
              className={styles.formGroup}
          >
            <MapSelector
                id="deliveryAddress"
                initialAddress={order.deliveryAddress}
                onAddressSelect={handleDeliveryAddressSelect}
                placeholder="输入配送地址搜索"
            />
          </Form.Item>

          <Form.Item
              label="配送详细地址"
              required
              className={styles.formGroup}
          >
            <Input
                id="deliveryDetail"
                name="deliveryDetail"
                value={order.deliveryDetail}
                onChange={handleChange}
                placeholder="请输入配送详细地址"
                required
            />
          </Form.Item>

          {/* 配送信息 */}
          <Form.Item
              label="最晚配送时间"
              required
              className={styles.formGroup}
          >
            <DatePicker
                showTime
                format="YYYY-MM-DD HH:mm:ss"
                placeholder="选择配送时间"
                onChange={handleDateTimeChange}
                style={{ width: '100%' }}
                value={order.deliveryTime ? moment(order.deliveryTime) : null}
            />
          </Form.Item>

          <Form.Item
              label="配送服务"
              className={styles.formGroup}
          >
            <Select
                id="deliveryService"
                value={order.deliveryService}
                onChange={(value) => handleFormChange('deliveryService', value)}
                style={{ width: '100%' }}
            >
              <Select.Option value="1">标准配送</Select.Option>
              <Select.Option value="2">快速配送</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item
              label="重量(kg)"
              required
              className={styles.formGroup}
          >
            <Input
                type="number"
                id="weight"
                name="weight"
                value={order.weight}
                onChange={handleChange}
                step="0.1"
                required
                min="0"
            />
          </Form.Item>

          <Form.Item
              className={styles.formGroup}
          >
            <Checkbox
                id="isLargeItem"
                name="isLargeItem"
                checked={order.isLargeItem}
                onChange={handleChange}
                className={styles.checkboxLabel}
            >
              是否大件
            </Checkbox>
          </Form.Item>

          <Form.Item>
            <Button
                type="primary"
                htmlType="submit"
                className={styles.submitButton}
                loading={loading}
                block
            >
              {loading ? '创建中...' : '提交订单'}
            </Button>
          </Form.Item>
        </Form>
      </div>
  );
};

export default CreateOrderForm;