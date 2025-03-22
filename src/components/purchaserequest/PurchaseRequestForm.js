import React, { useState, useEffect } from 'react';
import { Form, Input, InputNumber, DatePicker, Select, Button, Upload, message, Divider, Card, Alert } from 'antd';
import { UploadOutlined, ClockCircleOutlined, ShoppingOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import moment from 'moment';
import { useAuth } from '../context/AuthContext';
import MapSelector from '../utils/amap/MapSelector';
import PaymentLoading from '../utils/PaymentLoading';
import ImageCropper from '../utils/ImageCropper';
import styles from '../../assets/css/purchaserequest/PurchaseRequestForm.module.css';
import {clearPaymentMode, setPaymentMode} from '../utils/errorHandler';

const { TextArea } = Input;
const { Option } = Select;

/**
 * 代购需求发布表单组件
 * 修复支付跳转导致的脚本错误
 */
const PurchaseRequestForm = () => {
    const [form] = Form.useForm();
    const navigate = useNavigate();
    const { userId, isLoggedIn } = useAuth();

    // 状态管理
    const [loading, setLoading] = useState(false);
    const [categoryOptions, setCategoryOptions] = useState([]);
    const [image, setImage] = useState(null);
    const [imageFile, setImageFile] = useState(null);
    const [showCropper, setShowCropper] = useState(false);
    const [cropImage, setCropImage] = useState(null);
    const [isPaymentProcessing, setIsPaymentProcessing] = useState(false);
    const [paymentMessage, setPaymentMessage] = useState('');
    const [errorMessage, setErrorMessage] = useState('');

    // 地址选择状态
    const [purchaseLocation, setPurchaseLocation] = useState(null);
    const [deliveryLocation, setDeliveryLocation] = useState(null);

    // 检查用户登录状态
    useEffect(() => {
        if (!isLoggedIn) {
            message.error('请先登录后再发布代购需求');
            navigate('/login', { state: { from: '/request/create' } });
        }
    }, [isLoggedIn, navigate]);

    // 加载分类选项
    useEffect(() => {
        setCategoryOptions([
            { value: 'FOOD', label: '食品' },
            { value: 'GROCERY', label: '日用品' },
            { value: 'ELECTRONICS', label: '电子产品' },
            { value: 'CLOTHING', label: '服装' },
            { value: 'BOOKS', label: '图书' },
            { value: 'MEDICINE', label: '药品' },
            { value: 'OTHER', label: '其他' }
        ]);
    }, []);

    // 图片上传前处理 - 增加错误处理
    const beforeUpload = (file) => {
        try {
            // 验证文件类型
            const isImage = file.type.startsWith('image/');
            if (!isImage) {
                message.error('请上传图片格式的文件!');
                return false;
            }

            // 验证文件大小
            const isLt5M = file.size / 1024 / 1024 < 5;
            if (!isLt5M) {
                message.error('图片大小不能超过5MB!');
                return false;
            }

            // 打开裁剪器
            const reader = new FileReader();
            reader.onload = () => {
                setCropImage(reader.result);
                setShowCropper(true);
            };
            reader.onerror = () => {
                message.error('读取图片文件失败，请重试');
                console.error('读取图片文件失败');
            };
            reader.readAsDataURL(file);

            // 阻止默认上传行为
            return false;
        } catch (error) {
            console.error('图片预处理失败:', error);
            message.error('图片处理失败，请重试');
            return false;
        }
    };

    // 处理图片裁剪完成 - 增加验证和错误处理
    const handleCropComplete = (data) => {
        try {
            // 验证返回的数据
            if (!data || !data.file) {
                throw new Error('图片裁剪结果无效');
            }

            // 验证文件大小
            if (data.file.size > 5 * 1024 * 1024) {
                message.error('裁剪后的图片大小不能超过5MB');
                setShowCropper(false);
                return;
            }

            // 保存处理后的图片信息
            setImageFile(data.file);
            setImage(data.url);
            setShowCropper(false);

            // 记录成功信息以便调试
            console.log('图片裁剪成功', {
                size: data.file.size,
                type: data.file.type,
                lastModified: data.file.lastModified
            });
        } catch (error) {
            console.error('图片裁剪失败:', error);
            message.error('图片裁剪失败: ' + error.message);
            setShowCropper(false);
        }
    };

    // 处理图片裁剪取消
    const handleCropCancel = () => {
        setShowCropper(false);
        setCropImage(null);
    };

    // 处理代购地址选择
    const handlePurchaseLocationSelect = (location) => {
        setPurchaseLocation(location);
        form.setFieldsValue({
            purchaseAddress: location.name,
        });
    };

    // 处理配送地址选择
    const handleDeliveryLocationSelect = (location) => {
        setDeliveryLocation(location);
        form.setFieldsValue({
            deliveryAddress: location.name,
        });
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

        if (!purchaseLocation || !deliveryLocation) {
            message.error('请选择代购地址和配送地址');
            return;
        }

        if (!imageFile) {
            message.error('请上传商品参考图片');
            return;
        }

        // 开始提交
        setLoading(true);
        setIsPaymentProcessing(true);
        setPaymentMessage('正在创建代购订单...');

        try {
            // 开启支付模式 - 这对于防止自动刷新至关重要
            setPaymentMode(true);

            // 创建表单数据对象
            const formData = new FormData();
            formData.append('userId', userId);
            formData.append('title', values.title);
            formData.append('description', values.description);
            formData.append('category', values.category);
            formData.append('expectedPrice', values.expectedPrice);

            // 使用ISO格式
            formData.append('deadline', values.deadline.toISOString());

            // 代购地址信息
            formData.append('purchaseAddress', purchaseLocation.name);
            formData.append('purchaseLatitude', purchaseLocation.latitude);
            formData.append('purchaseLongitude', purchaseLocation.longitude);

            // 配送地址信息
            formData.append('deliveryAddress', deliveryLocation.name);
            formData.append('deliveryLatitude', deliveryLocation.latitude);
            formData.append('deliveryLongitude', deliveryLocation.longitude);

            // 收件人信息
            formData.append('recipientName', values.recipientName);
            formData.append('recipientPhone', values.recipientPhone);

            // 配送类型
            formData.append('deliveryType', values.deliveryType);

            // 添加图片文件
            formData.append('imageFile', imageFile);

            if (values.weight) {
                formData.append('weight', values.weight);
            }

            // 创建代购需求
            const response = await axios.post(
                'http://127.0.0.1:8080/api/purchase-requests',
                formData,
                {
                    withCredentials: true,
                    timeout: 60000 // 60秒超时
                }
            );

            // 优先使用payUrl方式导航
            if (response.data && response.data.payUrl) {
                const orderNumber = response.data.orderNumber;
                setPaymentMessage('支付订单创建成功，即将跳转到支付页面...');

                // 保存订单号和当前路径到localStorage
                if (orderNumber) {
                    localStorage.setItem('currentOrderNumber', orderNumber);
                    localStorage.setItem('paymentReturnPath', window.location.pathname);
                }

                // 使用setTimeout让用户看到成功消息
                setTimeout(() => {
                    try {
                        // 直接在当前窗口导航到支付页面
                        window.location.href = response.data.payUrl;
                    } catch (redirectError) {
                        console.error('支付跳转错误:', redirectError);
                        clearPaymentMode(); // 出错时关闭支付模式
                        message.error('支付跳转失败，请前往"我的订单"中重新支付');
                        setIsPaymentProcessing(false);
                        setLoading(false);
                        navigate('/request/my-requests');
                    }
                }, 1000);
            } else if (response.data && response.data.payForm) {
                // 回退到使用支付表单方式
                const orderNumber = response.data.orderNumber;
                setPaymentMessage('支付订单创建成功，即将跳转到支付页面...');

                // 保存订单号和路径到localStorage
                if (orderNumber) {
                    localStorage.setItem('currentOrderNumber', orderNumber);
                    localStorage.setItem('paymentReturnPath', window.location.pathname);
                }

                // 使用setTimeout让用户看到成功消息
                setTimeout(() => {
                    try {
                        // 在表单提交期间保持支付模式活跃
                        setPaymentMode(true);

                        // 获取支付表单HTML内容
                        const payFormHtml = response.data.payForm;

                        if (!payFormHtml) {
                            throw new Error('支付表单内容为空');
                        }

                        // 创建临时容器并插入支付表单HTML
                        const tempContainer = document.createElement('div');
                        tempContainer.style.display = 'none';
                        tempContainer.innerHTML = payFormHtml;
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
                        setLoading(false);
                        navigate('/request/my-requests');
                    }
                }, 1000);
            } else {
                throw new Error('支付信息未返回');
            }

        } catch (error) {
            // 重置支付模式和状态
            clearPaymentMode();
            setIsPaymentProcessing(false);
            setLoading(false);

            // 记录错误
            console.error('发布代购需求失败:', error);

            // 构建详细的错误信息并显示
            let errorMsg = '发布代购需求失败: ';

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
                    errorMsg = '上传的图片太大，请重新选择较小的图片';
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

    return (
        <div className={styles.formContainer}>
            {isPaymentProcessing ? (
                <PaymentLoading message={paymentMessage} />
            ) : (
                <Card
                    title={
                        <div className={styles.cardTitle}>
                            <ShoppingOutlined className={styles.titleIcon} />
                            <span>发布代购需求</span>
                        </div>
                    }
                    className={styles.formCard}
                >
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

                    {/* 状态检查显示 */}
                    <div className={styles.formStatusCheck}>
                        <div className={imageFile ? styles.checkComplete : styles.checkIncomplete}>
                            {imageFile ? "✓ 图片已上传" : "⚠ 请上传商品图片"}
                        </div>
                        <div className={purchaseLocation ? styles.checkComplete : styles.checkIncomplete}>
                            {purchaseLocation ? "✓ 已选择代购地址" : "⚠ 请在地图上选择代购地址"}
                        </div>
                        <div className={deliveryLocation ? styles.checkComplete : styles.checkIncomplete}>
                            {deliveryLocation ? "✓ 已选择配送地址" : "⚠ 请在地图上选择配送地址"}
                        </div>
                    </div>

                    <Form
                        form={form}
                        layout="vertical"
                        onFinish={handleSubmit}
                        initialValues={{
                            deadline: moment().add(1, 'days'),
                            deliveryType: 'MUTUAL'
                        }}
                        validateTrigger={['onBlur', 'onChange']}
                    >
                        <div className={styles.formSection}>
                            <h3 className={styles.sectionTitle}>基本信息</h3>

                            <Form.Item
                                name="title"
                                label="标题"
                                rules={[
                                    { required: true, message: '请输入代购需求标题' },
                                    { min: 5, max: 100, message: '标题长度应在5-100个字符之间' },
                                    { whitespace: true, message: '标题不能只包含空格' }
                                ]}
                            >
                                <Input placeholder="请输入需要代购的物品标题" maxLength={100} />
                            </Form.Item>

                            <Form.Item
                                name="category"
                                label="分类"
                                rules={[{ required: true, message: '请选择商品分类' }]}
                            >
                                <Select placeholder="请选择商品分类">
                                    {categoryOptions.map(option => (
                                        <Option key={option.value} value={option.value}>
                                            {option.label}
                                        </Option>
                                    ))}
                                </Select>
                            </Form.Item>

                            <Form.Item
                                name="expectedPrice"
                                label="预期价格 (元)"
                                rules={[
                                    { required: true, message: '请输入预期价格' },
                                    { type: 'number', min: 0.01, message: '价格必须大于0' },
                                    { type: 'number', max: 10000, message: '价格不能超过10000元' }
                                ]}
                            >
                                <InputNumber
                                    style={{ width: '100%' }}
                                    placeholder="商品的预期价格"
                                    min={0.01}
                                    max={10000}
                                    step={0.01}
                                    precision={2}
                                />
                            </Form.Item>

                            <Form.Item
                                name="description"
                                label="详细描述"
                                rules={[
                                    { required: true, message: '请输入代购需求详细描述' },
                                    { min: 10, message: '描述至少需要10个字符' },
                                    { max: 1000, message: '描述不能超过1000个字符' }
                                ]}
                            >
                                <TextArea
                                    placeholder="请详细描述代购需求，包括品牌、型号、规格等信息"
                                    rows={4}
                                    maxLength={1000}
                                    showCount
                                />
                            </Form.Item>

                            <Form.Item
                                name="deadline"
                                label="截止时间"
                                rules={[
                                    { required: true, message: '请选择截止时间' },
                                    {
                                        validator: (_, value) => {
                                            if (!value || value.isBefore(moment())) {
                                                return Promise.reject(new Error('截止时间必须晚于当前时间'));
                                            }
                                            if (value.isAfter(moment().add(7, 'days'))) {
                                                return Promise.reject(new Error('截止时间不能超过7天'));
                                            }
                                            return Promise.resolve();
                                        }
                                    }
                                ]}
                            >
                                <DatePicker
                                    showTime
                                    format="YYYY-MM-DD HH:mm"
                                    disabledDate={(current) => {
                                        return current && (current < moment().startOf('day') || current > moment().add(7, 'days'));
                                    }}
                                    style={{ width: '100%' }}
                                    placeholder="请选择代购截止时间"
                                />
                            </Form.Item>
                            <Form.Item
                                name="weight"
                                label="物品重量 (公斤)"
                                extra="不填将根据商品类别自动设置默认重量"
                                rules={[
                                    { type: 'number', min: 0.1, message: '重量必须大于0.1公斤' },
                                    { type: 'number', max: 50, message: '重量不能超过50公斤' }
                                ]}
                            >
                                <InputNumber
                                    style={{ width: '100%' }}
                                    placeholder="请输入物品重量"
                                    min={0.1}
                                    max={50}
                                    step={0.1}
                                    precision={1}
                                />
                            </Form.Item>
                            <Form.Item
                                label="商品参考图片"
                                name="imageUpload"
                                rules={[
                                    {
                                        validator: (_, value) => {
                                            if (!imageFile) {
                                                return Promise.reject(new Error('请上传商品参考图片'));
                                            }
                                            return Promise.resolve();
                                        }
                                    }
                                ]}
                            >
                                <div className={styles.uploadContainer}>
                                    <Upload
                                        name="file"
                                        beforeUpload={beforeUpload}
                                        showUploadList={false}
                                        accept="image/*"
                                    >
                                        <Button icon={<UploadOutlined />}>点击上传图片</Button>
                                    </Upload>

                                    {image && (
                                        <div className={styles.previewContainer}>
                                            <img src={image} alt="预览" className={styles.previewImage} />
                                        </div>
                                    )}
                                </div>
                            </Form.Item>
                        </div>

                        <Divider />

                        <div className={styles.formSection}>
                            <h3 className={styles.sectionTitle}>代购地址</h3>

                            <Form.Item
                                name="purchaseAddress"
                                label="代购地址"
                                rules={[{ required: true, message: '请选择代购地址' }]}
                            >
                                <Input readOnly placeholder="请在地图上选择代购地址" />
                            </Form.Item>

                            <div className={styles.mapContainer}>
                                <MapSelector
                                    id="purchaseAddress"
                                    initialAddress=""
                                    onAddressSelect={handlePurchaseLocationSelect}
                                    placeholder="搜索代购地址"
                                />
                            </div>
                        </div>

                        <Divider />

                        <div className={styles.formSection}>
                            <h3 className={styles.sectionTitle}>配送信息</h3>

                            <Form.Item
                                name="deliveryType"
                                label="配送方式"
                                rules={[{ required: true, message: '请选择配送方式' }]}
                            >
                                <Select placeholder="请选择配送方式">
                                    <Option value="MUTUAL">互助配送</Option>
                                    <Option value="EXPRESS">极速配送</Option>
                                </Select>
                            </Form.Item>

                            <Form.Item
                                name="recipientName"
                                label="收件人姓名"
                                rules={[
                                    { required: true, message: '请输入收件人姓名' },
                                    { whitespace: true, message: '姓名不能只包含空格' },
                                    { max: 20, message: '姓名长度不能超过20个字符' }
                                ]}
                            >
                                <Input placeholder="请输入收件人姓名" />
                            </Form.Item>

                            <Form.Item
                                name="recipientPhone"
                                label="收件人电话"
                                rules={[
                                    { required: true, message: '请输入收件人电话' },
                                    { pattern: /^1[3-9]\d{9}$/, message: '请输入正确的手机号码' }
                                ]}
                            >
                                <Input placeholder="请输入收件人电话" maxLength={11} />
                            </Form.Item>

                            <Form.Item
                                name="deliveryAddress"
                                label="配送地址"
                                rules={[{ required: true, message: '请选择配送地址' }]}
                            >
                                <Input readOnly placeholder="请在地图上选择配送地址" />
                            </Form.Item>

                            <div className={styles.mapContainer}>
                                <MapSelector
                                    id="deliveryAddress"
                                    initialAddress=""
                                    onAddressSelect={handleDeliveryLocationSelect}
                                    placeholder="搜索配送地址"
                                />
                            </div>
                        </div>

                        <Divider />

                        <div className={styles.formFooter}>
                            <Button
                                onClick={() => navigate(-1)}
                                className={styles.cancelButton}
                            >
                                取消
                            </Button>
                            <Button
                                type="primary"
                                htmlType="submit"
                                loading={loading}
                                className={styles.submitButton}
                                disabled={!imageFile || !purchaseLocation || !deliveryLocation}
                            >
                                {!imageFile ? "请上传图片" :
                                    !purchaseLocation ? "请选择代购地址" :
                                        !deliveryLocation ? "请选择配送地址" :
                                            "立即发布"}
                            </Button>
                        </div>
                    </Form>

                    <div className={styles.notice}>
                        <div className={styles.noticeHeader}>
                            <ClockCircleOutlined /> 温馨提示
                        </div>
                        <ul className={styles.noticeList}>
                            <li>发布代购需求后，需要先完成支付才能正式发布</li>
                            <li>代购员接单后会立即为您购买商品并配送</li>
                            <li>请确保提供准确的代购信息和收货地址</li>
                            <li>如有特殊要求，请在详细描述中注明</li>
                        </ul>
                    </div>
                </Card>
            )}

            {/* 图片裁剪器 */}
            {showCropper && (
                <ImageCropper
                    image={cropImage}
                    onCropComplete={handleCropComplete}
                    onCancel={handleCropCancel}
                    aspectRatio={16 / 9}
                />
            )}
        </div>
    );
};

export default PurchaseRequestForm;