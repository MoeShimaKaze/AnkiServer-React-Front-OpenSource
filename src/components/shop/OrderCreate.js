// src/components/shop/OrderCreate.js
import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
    Form, Input, Button, Radio, Card, Typography, message,
    Divider, Spin, Empty, Row, Col, Descriptions,
    InputNumber, Statistic, Alert
} from 'antd';
import {
    ShoppingCartOutlined, PhoneOutlined, UserOutlined
} from '@ant-design/icons';
import Navbar from '../base/Navbar';
import MapSelector from '../utils/amap/MapSelector';
import { useAuth } from '../context/AuthContext';
import styles from '../../assets/css/shop/OrderCreate.module.css';
import PaymentLoading from '../utils/PaymentLoading';
import { setPaymentMode, clearPaymentMode } from '../utils/errorHandler';

const { Title, Text} = Typography;
const { TextArea } = Input;

/**
 * 商品订单创建组件
 * 修复支付跳转页面报错问题
 */
const OrderCreate = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const { isLoggedIn, userId } = useAuth();
    const [form] = Form.useForm();

    // 状态管理
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [product, setProduct] = useState(null);
    const [store, setStore] = useState(null);
    const [quantity, setQuantity] = useState(1);
    const [deliveryType, setDeliveryType] = useState('MUTUAL');
    const [addressSelected, setAddressSelected] = useState(false);
    const [, setSelectedAddress] = useState(null);

    // 支付处理状态
    const [isPaymentProcessing, setIsPaymentProcessing] = useState(false);
    const [paymentMessage, setPaymentMessage] = useState('');
    const [errorMessage, setErrorMessage] = useState('');

    // 从location state中获取商品ID和数量信息
    useEffect(() => {
        if (!isLoggedIn) {
            message.warning('请先登录');
            navigate('/login', { state: { from: location.pathname } });
            return;
        }

        const { productId, quantity = 1, storeId } = location.state || {};

        if (!productId) {
            message.error('缺少商品信息');
            navigate(-1);
            return;
        }

        setQuantity(quantity);

        const fetchProductDetails = async () => {
            try {
                setLoading(true);
                const response = await axios.get(`http://127.0.0.1:8080/api/products/${productId}`, {
                    withCredentials: true
                });
                setProduct(response.data);

                // 获取店铺信息
                const storeResponse = await axios.get(`http://127.0.0.1:8080/api/stores/${response.data.storeId}`, {
                    withCredentials: true
                });
                setStore(storeResponse.data);

                setLoading(false);
            } catch (error) {
                console.error('Error fetching product details:', error);
                message.error('获取商品信息失败');
                setLoading(false);
                navigate(-1);
            }
        };

        // 获取用户信息，预填充表单
        const fetchUserInfo = async () => {
            try {
                const response = await axios.get(`http://127.0.0.1:8080/api/users/profile`, {
                    withCredentials: true
                });
                const userInfo = response.data;

                // 预填充表单
                form.setFieldsValue({
                    recipientName: userInfo.fullName || userInfo.username,
                    recipientPhone: userInfo.phone,
                });
            } catch (error) {
                console.error('Error fetching user info:', error);
            }
        };

        fetchProductDetails();
        fetchUserInfo();
    }, [location, navigate, isLoggedIn, form]);

    const handleAddressSelect = (address) => {
        setSelectedAddress(address);
        setAddressSelected(true);

        form.setFieldsValue({
            deliveryAddress: address.detail || address.name,
            deliveryLatitude: address.latitude,
            deliveryLongitude: address.longitude
        });
    };

    const handleDeliveryTypeChange = (e) => {
        setDeliveryType(e.target.value);
    };

    const calculateTotalPrice = () => {
        if (!product) return 0;
        return product.price * quantity;
    };

    const handleQuantityChange = (value) => {
        // 确保数量不超过库存
        if (product && value > product.stock) {
            message.warning(`商品库存只有 ${product.stock} 件`);
            setQuantity(product.stock);
        } else if (value < 1) {
            setQuantity(1);
        } else {
            setQuantity(value);
        }
    };

    const handleSubmit = async (values) => {
        // 重置错误信息
        setErrorMessage('');

        // 参数验证
        if (!userId) {
            message.error('用户信息无效，请重新登录');
            navigate('/login');
            return;
        }

        if (!addressSelected) {
            message.warning('请选择配送地址');
            return;
        }

        try {
            setSubmitting(true);

            // 创建订单数据对象
            const orderData = {
                userId: userId,
                storeId: store.id,
                productId: product.id,
                quantity: quantity,
                productPrice: product.price,
                deliveryType: values.deliveryType,
                recipientName: values.recipientName,
                recipientPhone: values.recipientPhone,
                deliveryAddress: values.deliveryAddress,
                deliveryLatitude: values.deliveryLatitude,
                deliveryLongitude: values.deliveryLongitude,
                remark: values.remark
            };

            // 创建订单
            const response = await axios.post('http://127.0.0.1:8080/api/shopping/orders', orderData, {
                withCredentials: true
            });

            // 成功创建订单后处理支付
            if (response.data && response.data.orderNumber) {
                // 开始支付处理流程
                setIsPaymentProcessing(true);
                setPaymentMessage('订单创建成功，正在准备支付...');

                // 开启支付模式 - 这对于防止自动刷新至关重要
                setPaymentMode(true);

                // 保存订单号和当前路径到localStorage
                localStorage.setItem('currentOrderNumber', response.data.orderNumber);
                localStorage.setItem('paymentReturnPath', window.location.pathname);

                try {
                    // 调用支付API
                    const paymentResponse = await axios.post(
                        `http://127.0.0.1:8080/api/shopping/orders/${response.data.orderNumber}/payment`,
                        {},
                        { withCredentials: true }
                    );

                    // 优先使用payUrl方式导航
                    if (paymentResponse.data && paymentResponse.data.payUrl) {
                        setPaymentMessage('支付订单创建成功，即将跳转到支付页面...');

                        // 使用setTimeout让用户看到成功消息
                        setTimeout(() => {
                            try {
                                // 直接在当前窗口导航到支付页面
                                window.location.href = paymentResponse.data.payUrl;
                            } catch (redirectError) {
                                console.error('支付跳转错误:', redirectError);
                                clearPaymentMode(); // 出错时关闭支付模式
                                message.error('支付跳转失败，请前往"我的订单"中重新支付');
                                setIsPaymentProcessing(false);
                                setSubmitting(false);
                                navigate('/shop/orders');
                            }
                        }, 1000);
                    } else if (paymentResponse.data && paymentResponse.data.formHtml) {
                        // 回退到使用支付表单方式
                        setPaymentMessage('支付订单创建成功，即将跳转到支付页面...');

                        // 使用setTimeout让用户看到成功消息
                        setTimeout(() => {
                            try {
                                // 在表单提交期间保持支付模式活跃
                                setPaymentMode(true);

                                // 创建临时容器并插入支付表单HTML
                                const tempContainer = document.createElement('div');
                                tempContainer.style.display = 'none';
                                tempContainer.innerHTML = paymentResponse.data.formHtml;
                                document.body.appendChild(tempContainer);

                                // 查找表单元素
                                const formElement = tempContainer.querySelector('form');

                                if (formElement) {
                                    // 确保表单在当前窗口中提交（不使用target="_blank"）
                                    formElement.removeAttribute('target');

                                    // 添加事件监听器以检测表单何时真正提交
                                    formElement.addEventListener('submit', () => {
                                        console.log('检测到表单提交');
                                        // 表单提交后保持支付模式再持续几秒钟
                                        setTimeout(() => {
                                            clearPaymentMode();
                                        }, 3000);
                                    });

                                    // 提交表单
                                    formElement.submit();

                                    // 不需要清理DOM元素，因为页面会导航离开
                                } else {
                                    throw new Error('支付表单解析失败');
                                }
                            } catch (redirectError) {
                                console.error('支付处理错误:', redirectError);
                                clearPaymentMode(); // 关闭支付模式
                                message.error('支付跳转失败，请前往"我的订单"中重新支付');
                                setIsPaymentProcessing(false);
                                setSubmitting(false);
                                navigate('/shop/orders');
                            }
                        }, 1000);
                    } else {
                        throw new Error('支付信息未返回');
                    }
                } catch (paymentError) {
                    console.error('创建支付失败:', paymentError);
                    clearPaymentMode();
                    message.error('支付创建失败，请前往"我的订单"中进行支付');
                    setIsPaymentProcessing(false);
                    setSubmitting(false);
                    navigate(`/shop/orders/${response.data.orderNumber}`);
                }
            } else {
                message.success('订单创建成功');
                setSubmitting(false);
                navigate('/shop/orders');
            }
        } catch (error) {
            // 重置支付模式和状态
            clearPaymentMode();
            setIsPaymentProcessing(false);
            setSubmitting(false);

            // 记录错误
            console.error('创建订单失败:', error);

            // 构建详细的错误信息并显示
            let errorMsg = '创建订单失败: ';

            if (error.response) {
                // 服务器返回错误响应
                const statusCode = error.response.status;
                const responseData = error.response.data;

                if (typeof responseData === 'string') {
                    errorMsg += responseData;
                } else if (responseData && responseData.message) {
                    errorMsg += responseData.message;
                } else {
                    errorMsg += `服务器返回错误 (${statusCode})`;
                }

                // 针对特定状态码的处理
                if (statusCode === 401) {
                    errorMsg = '登录已过期，请重新登录';
                    setTimeout(() => navigate('/login'), 2000);
                } else if (statusCode === 403) {
                    errorMsg = '您没有权限执行此操作，请联系管理员';
                } else if (statusCode === 413) {
                    errorMsg = '提交的数据太大，请减少信息量';
                } else if (statusCode >= 500) {
                    errorMsg = '服务器内部错误，请稍后重试';
                }
            } else if (error.request) {
                // 发出请求但未收到响应
                errorMsg += '服务器未响应，请检查网络连接或稍后重试';
            } else {
                // 设置请求时出错
                errorMsg += error.message || '未知错误';
            }

            // 设置错误信息
            setErrorMessage(errorMsg);
            message.error(errorMsg);
        }
    };

    // 取消订单
    const handleCancel = () => {
        navigate(-1);
    };

    if (loading) {
        return (
            <div className={styles.loadingContainer}>
                <Spin size="large" />
            </div>
        );
    }

    if (!product || !store) {
        return (
            <div className={styles.emptyContainer}>
                <Empty description="商品信息不存在或已被删除" />
                <Button onClick={() => navigate('/shop')}>返回商城</Button>
            </div>
        );
    }

    return (
        <div className={styles.orderCreateContainer}>
            <Navbar />
            {isPaymentProcessing ? (
                <PaymentLoading message={paymentMessage} />
            ) : (
                <div className={styles.contentWrapper}>
                    <div className={styles.pageHeader}>
                        <Title level={3}>
                            <ShoppingCartOutlined /> 创建订单
                        </Title>
                    </div>

                    {/* 显示错误信息 */}
                    {errorMessage && (
                        <Alert
                            message="创建失败"
                            description={errorMessage}
                            type="error"
                            showIcon
                            closable
                            className={styles.errorAlert}
                            onClose={() => setErrorMessage('')}
                        />
                    )}

                    <Row gutter={24} className={styles.orderContent}>
                        <Col xs={24} lg={16}>
                            <Card className={styles.formCard} title="订单信息">
                                <div className={styles.productInfo}>
                                    <Title level={4}>商品信息</Title>
                                    <Descriptions bordered column={1} size="small">
                                        <Descriptions.Item label="商品名称">{product.name}</Descriptions.Item>
                                        <Descriptions.Item label="店铺">{store.storeName}</Descriptions.Item>
                                        <Descriptions.Item label="单价">¥{product.price.toFixed(2)}</Descriptions.Item>
                                        <Descriptions.Item label="数量">
                                            <InputNumber
                                                min={1}
                                                max={product.stock}
                                                value={quantity}
                                                onChange={handleQuantityChange}
                                            />
                                        </Descriptions.Item>
                                        <Descriptions.Item label="总价">¥{calculateTotalPrice().toFixed(2)}</Descriptions.Item>
                                    </Descriptions>
                                </div>

                                <Divider />

                                <Form
                                    form={form}
                                    layout="vertical"
                                    onFinish={handleSubmit}
                                    initialValues={{
                                        deliveryType: deliveryType
                                    }}
                                >
                                    <Title level={4}>收货信息</Title>

                                    <Form.Item
                                        name="deliveryType"
                                        label="配送方式"
                                        rules={[{ required: true, message: '请选择配送方式' }]}
                                    >
                                        <Radio.Group onChange={handleDeliveryTypeChange}>
                                            <Radio.Button value="MUTUAL">互助配送</Radio.Button>
                                            <Radio.Button value="PLATFORM">平台配送</Radio.Button>
                                        </Radio.Group>
                                    </Form.Item>

                                    <div className={styles.deliveryTypeInfo}>
                                        {deliveryType === 'MUTUAL' ? (
                                            <Alert
                                                message="互助配送"
                                                description="由其他校园用户帮忙配送，费用较低，配送时间不固定"
                                                type="info"
                                                showIcon
                                            />
                                        ) : (
                                            <Alert
                                                message="平台配送"
                                                description="由平台专业配送员进行配送，费用较高，配送更快速可靠"
                                                type="info"
                                                showIcon
                                            />
                                        )}
                                    </div>

                                    <Form.Item
                                        name="recipientName"
                                        label="收货人姓名"
                                        rules={[{ required: true, message: '请输入收货人姓名' }]}
                                    >
                                        <Input prefix={<UserOutlined />} placeholder="请输入收货人姓名" />
                                    </Form.Item>

                                    <Form.Item
                                        name="recipientPhone"
                                        label="联系电话"
                                        rules={[
                                            { required: true, message: '请输入联系电话' },
                                            { pattern: /^1[3-9]\d{9}$/, message: '请输入正确的手机号码' }
                                        ]}
                                    >
                                        <Input prefix={<PhoneOutlined />} placeholder="请输入联系电话" />
                                    </Form.Item>

                                    <Title level={5}>配送地址</Title>
                                    <div className={styles.mapSelectorContainer}>
                                        <MapSelector
                                            id="addressSelector"
                                            initialAddress=""
                                            onAddressSelect={handleAddressSelect}
                                            placeholder="输入地址搜索"
                                        />
                                    </div>

                                    <Form.Item
                                        name="deliveryAddress"
                                        label="详细地址"
                                        rules={[{ required: true, message: '请选择或输入详细地址' }]}
                                        className={styles.hiddenField}
                                    >
                                        <Input />
                                    </Form.Item>

                                    <Form.Item
                                        name="deliveryLatitude"
                                        className={styles.hiddenField}
                                    >
                                        <Input type="hidden" />
                                    </Form.Item>

                                    <Form.Item
                                        name="deliveryLongitude"
                                        className={styles.hiddenField}
                                    >
                                        <Input type="hidden" />
                                    </Form.Item>

                                    <Form.Item
                                        name="remark"
                                        label="订单备注"
                                    >
                                        <TextArea
                                            placeholder="如有特殊要求，请在此备注"
                                            autoSize={{ minRows: 2, maxRows: 4 }}
                                        />
                                    </Form.Item>

                                    <div className={styles.formActions}>
                                        <Button onClick={handleCancel}>取消</Button>
                                        <Button
                                            type="primary"
                                            htmlType="submit"
                                            loading={submitting}
                                            disabled={!addressSelected}
                                        >
                                            {!addressSelected ? "请选择配送地址" : "提交订单"}
                                        </Button>
                                    </div>
                                </Form>
                            </Card>
                        </Col>

                        <Col xs={24} lg={8}>
                            <Card className={styles.orderSummaryCard} title="订单摘要">
                                <div className={styles.orderSummary}>
                                    <div className={styles.summaryItem}>
                                        <Text>商品金额：</Text>
                                        <Text>¥{calculateTotalPrice().toFixed(2)}</Text>
                                    </div>
                                    <div className={styles.summaryItem}>
                                        <Text>配送费：</Text>
                                        <Text>{deliveryType === 'MUTUAL' ? '¥3.00 (预估)' : '¥8.00 (预估)'}</Text>
                                    </div>
                                    <div className={styles.summaryItem}>
                                        <Text>服务费：</Text>
                                        <Text>¥2.00 (预估)</Text>
                                    </div>

                                    <Divider />

                                    <div className={styles.totalAmount}>
                                        <Statistic
                                            title="预估总价"
                                            value={calculateTotalPrice() + (deliveryType === 'MUTUAL' ? 3 : 8) + 2}
                                            precision={2}
                                            prefix="¥"
                                        />
                                        <Text type="secondary">
                                            实际费用以订单创建后为准
                                        </Text>
                                    </div>

                                    <div className={styles.orderNotes}>
                                        <Alert
                                            message="下单须知"
                                            description={
                                                <ul className={styles.notesList}>
                                                    <li>提交订单后，需要在30分钟内完成支付，否则订单将自动取消</li>
                                                    <li>配送费和服务费将根据实际配送距离和商品情况计算</li>
                                                    <li>如有特殊要求，请在订单备注中说明</li>
                                                </ul>
                                            }
                                            type="info"
                                            showIcon
                                        />
                                    </div>
                                </div>
                            </Card>
                        </Col>
                    </Row>
                </div>
            )}
        </div>
    );
};

export default OrderCreate;