import React, { useState } from 'react';
import axios from 'axios';
import { Modal, Form, Rate, Input, Button, message, Space, Typography, Divider } from 'antd';
import { StarOutlined, CommentOutlined, SendOutlined, CloseOutlined } from '@ant-design/icons';

const { TextArea } = Input;
const { Title, Text } = Typography;

/**
 * 通用评价模态框组件
 * @param {string} orderNumber - 订单号
 * @param {function} onClose - 关闭回调
 * @param {function} onRatingSubmit - 提交成功回调
 * @param {string} ratingType - 评价类型，如 SENDER_TO_DELIVERER, DELIVERER_TO_SENDER 等
 * @param {string} orderType - 订单类型，如 MAIL_ORDER, SHOPPING_ORDER, PURCHASE_REQUEST
 */
const RatingModal = ({ orderNumber, onClose, onRatingSubmit, ratingType, orderType = 'MAIL_ORDER' }) => {
  const [form] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (values) => {
    setSubmitting(true);
    try {
      let response;

      // 根据订单类型选择不同的API端点
      if (orderType === 'MAIL_ORDER') {
        // 快递代拿订单使用专用端点
        response = await axios.post(`http://127.0.0.1:8080/api/mail-orders/${orderNumber}/rate`, {
          score: values.rating,
          comment: values.comment,
          ratingType: ratingType
        }, {
          withCredentials: true
        });
      } else {
        // 其他订单类型使用通用评价端点
        response = await axios.post(`http://127.0.0.1:8080/api/ratings`, {
          score: values.rating,
          comment: values.comment,
          ratingType: ratingType,
          orderType: orderType,
          orderNumber: orderNumber
        }, {
          withCredentials: true
        });
      }

      if (response.status === 200) {
        message.success('评价提交成功');
        onRatingSubmit();
        onClose();
      }
    } catch (error) {
      console.error('提交评价失败:', error);
      message.error('提交评价失败，请重试');
    } finally {
      setSubmitting(false);
    }
  };

  const getRatingTitle = () => {
    switch(ratingType) {
      case 'SENDER_TO_DELIVERER':
        return '评价配送员';
      case 'DELIVERER_TO_SENDER':
        return '评价寄件人';
      case 'SENDER_TO_PLATFORM':
        return '评价平台配送服务';
      case 'CUSTOMER_TO_MERCHANT':
        return '评价商家';
      case 'MERCHANT_TO_CUSTOMER':
        return '评价顾客';
      case 'CUSTOMER_TO_DELIVERER':
        return '评价配送员';
      case 'DELIVERER_TO_CUSTOMER':
        return '评价顾客';
      case 'REQUESTER_TO_FULFILLER':
        return '评价代购方';
      case 'FULFILLER_TO_REQUESTER':
        return '评价需求方';
      default:
        return '评价订单';
    }
  };

  const getRatingDescription = () => {
    switch(ratingType) {
      case 'SENDER_TO_DELIVERER':
        return '请为此次服务的配送员进行评价，您的反馈将帮助我们提升服务质量';
      case 'DELIVERER_TO_SENDER':
        return '请为此次订单的寄件人进行评价，您的反馈有助于建立良好的社区氛围';
      case 'SENDER_TO_PLATFORM':
        return '请为平台的配送服务进行评价，您的意见对我们非常重要';
      case 'CUSTOMER_TO_MERCHANT':
        return '请为此次服务的商家进行评价，您的反馈将帮助我们提升服务质量';
      case 'MERCHANT_TO_CUSTOMER':
        return '请为顾客进行评价，您的反馈有助于建立良好的社区氛围';
      case 'CUSTOMER_TO_DELIVERER':
        return '请为配送员进行评价，您的反馈将帮助我们提升服务质量';
      case 'DELIVERER_TO_CUSTOMER':
        return '请为顾客进行评价，您的反馈有助于建立良好的社区氛围';
      case 'REQUESTER_TO_FULFILLER':
        return '请为代购方进行评价，您的反馈将帮助我们提升服务质量';
      case 'FULFILLER_TO_REQUESTER':
        return '请为需求方进行评价，您的反馈有助于建立良好的社区氛围';
      default:
        return '请对本次服务体验进行评价，您的反馈是我们不断改进的动力';
    }
  };

  const ratingDescriptions = ['十分不满意', '不满意', '一般', '满意', '非常满意'];

  return (
      <Modal
          open={true}
          title={<Title level={4}>{getRatingTitle()}</Title>}
          onCancel={onClose}
          footer={null}
          maskClosable={false}
          width={500}
          centered
          destroyOnClose
      >
        <Divider />

        <Text type="secondary">{getRatingDescription()}</Text>

        <Form
            form={form}
            layout="vertical"
            onFinish={handleSubmit}
            initialValues={{ rating: 5 }}
            style={{ marginTop: 20 }}
        >
          <Form.Item
              name="rating"
              label={<Text strong><StarOutlined /> 评分</Text>}
              rules={[{ required: true, message: '请选择评分' }]}
          >
            <Rate
                tooltips={ratingDescriptions}
                allowClear={false}
            />
          </Form.Item>

          <Form.Item
              name="comment"
              label={<Text strong><CommentOutlined /> 评价内容</Text>}
              rules={[{ required: true, message: '请输入评价内容' }]}
          >
            <TextArea
                rows={4}
                placeholder="请输入您的评价内容..."
                maxLength={200}
                showCount
            />
          </Form.Item>

          <Form.Item style={{ marginTop: 24, textAlign: 'right' }}>
            <Space>
              <Button
                  icon={<CloseOutlined />}
                  onClick={onClose}
              >
                取消
              </Button>
              <Button
                  type="primary"
                  htmlType="submit"
                  loading={submitting}
                  icon={<SendOutlined />}
              >
                提交评价
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
  );
};

export default RatingModal;