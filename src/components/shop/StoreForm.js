// src/components/shop/StoreForm.js
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
    Form, Input, Button, TimePicker, Card, Typography, Divider,
    Spin, Breadcrumb, message, Alert
} from 'antd';
import {
    LeftOutlined, SaveOutlined, ShopOutlined,
    PhoneOutlined, ClockCircleOutlined
} from '@ant-design/icons';
import moment from 'moment';
import Navbar from '../base/Navbar';
import { useAuth } from '../context/AuthContext';
import MapSelector from '../utils/amap/MapSelector';
import styles from '../../assets/css/shop/StoreForm.module.css';

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;
const { RangePicker } = TimePicker;

const StoreForm = () => {
    const { storeId } = useParams();
    const navigate = useNavigate();
    const { userId } = useAuth();
    const [form] = Form.useForm();

    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [isEdit, setIsEdit] = useState(false);
    const [addressSelected, setAddressSelected] = useState(false);
    const [selectedAddress, setSelectedAddress] = useState(null);

    useEffect(() => {
        // 如果有storeId参数，则获取店铺详情
        const fetchStoreDetails = async () => {
            if (!storeId) return;

            try {
                setLoading(true);
                setIsEdit(true);
                const response = await axios.get(`http://127.0.0.1:8080/api/stores/${storeId}`, {
                    withCredentials: true
                });

                const store = response.data;

                // 解析营业时间格式，例如：09:00-21:00
                let businessHours = null;
                if (store.businessHours) {
                    const [startTime, endTime] = store.businessHours.split('-');
                    businessHours = [
                        moment(startTime, 'HH:mm'),
                        moment(endTime, 'HH:mm')
                    ];
                }

                // 填充表单数据
                form.setFieldsValue({
                    storeName: store.storeName,
                    description: store.description,
                    contactPhone: store.contactPhone,
                    businessHours: businessHours,
                    location: store.location,
                    latitude: store.latitude,
                    longitude: store.longitude
                });

                if (store.location && store.latitude && store.longitude) {
                    setAddressSelected(true);
                    setSelectedAddress({
                        name: store.location,
                        latitude: store.latitude,
                        longitude: store.longitude,
                        detail: store.location
                    });
                }

                setLoading(false);
            } catch (error) {
                console.error('Error fetching store details:', error);
                message.error('获取店铺详情失败');
                setLoading(false);
            }
        };

        fetchStoreDetails();
    }, [storeId, form]);

    const handleAddressSelect = (address) => {
        setSelectedAddress(address);
        setAddressSelected(true);

        form.setFieldsValue({
            location: address.detail || address.name,
            latitude: address.latitude,
            longitude: address.longitude
        });
    };

    const handleSubmit = async (values) => {
        if (!addressSelected) {
            message.warning('请选择店铺地址');
            return;
        }

        try {
            setSubmitting(true);

            // 格式化营业时间
            let businessHoursFormatted = null;
            if (values.businessHours && values.businessHours.length === 2) {
                businessHoursFormatted = `${values.businessHours[0].format('HH:mm')}-${values.businessHours[1].format('HH:mm')}`;
            }

            // 构建店铺数据
            const storeData = {
                merchantId: userId,
                storeName: values.storeName,
                description: values.description,
                contactPhone: values.contactPhone,
                businessHours: businessHoursFormatted,
                location: values.location,
                latitude: values.latitude,
                longitude: values.longitude,
                status: isEdit ? undefined : 'PENDING_REVIEW' // 新店铺默认为待审核状态
            };

            if (isEdit) {
                // 更新店铺
                await axios.put(`http://127.0.0.1:8080/api/stores/${storeId}`, storeData, {
                    withCredentials: true
                });
                message.success('店铺更新成功');
            } else {
                // 创建店铺
                await axios.post('http://127.0.0.1:8080/api/stores', storeData, {
                    withCredentials: true
                });
                message.success('店铺创建成功，正在等待审核');
            }

            setSubmitting(false);
            navigate('/shop/merchant/store');
        } catch (error) {
            console.error('Error saving store:', error);
            message.error('保存店铺失败: ' + (error.response?.data || error.message));
            setSubmitting(false);
        }
    };

    const handleCancel = () => {
        navigate('/shop/merchant/store');
    };

    if (loading) {
        return (
            <div className={styles.loadingContainer}>
                <Spin size="large" />
            </div>
        );
    }

    return (
        <div className={styles.storeFormContainer}>
            <Navbar />
            <div className={styles.contentWrapper}>
                <div className={styles.breadcrumbSection}>
                    <Breadcrumb className={styles.breadcrumb}>
                        <Breadcrumb.Item>
                            <Button
                                type="link"
                                onClick={handleCancel}
                                className={styles.backButton}
                            >
                                <LeftOutlined /> 返回
                            </Button>
                        </Breadcrumb.Item>
                        <Breadcrumb.Item>店铺管理</Breadcrumb.Item>
                        <Breadcrumb.Item>{isEdit ? '编辑店铺' : '创建店铺'}</Breadcrumb.Item>
                    </Breadcrumb>
                </div>

                <Card className={styles.formCard}>
                    <Title level={4}>
                        <ShopOutlined /> {isEdit ? '编辑店铺' : '创建店铺'}
                    </Title>

                    {!isEdit && (
                        <Alert
                            message="店铺保证金提示"
                            description="创建店铺需要缴纳1000元保证金，提交后将自动从您的账户中扣除。请确保账户余额充足。"
                            type="warning"
                            showIcon
                            className={styles.depositAlert}
                        />
                    )}

                    <Divider />

                    <Form
                        form={form}
                        layout="vertical"
                        onFinish={handleSubmit}
                    >
                        <Form.Item
                            name="storeName"
                            label="店铺名称"
                            rules={[
                                { required: true, message: '请输入店铺名称' },
                                { min: 2, max: 50, message: '店铺名称长度必须在2-50个字符之间' }
                            ]}
                        >
                            <Input
                                placeholder="请输入店铺名称"
                                prefix={<ShopOutlined />}
                            />
                        </Form.Item>

                        <Form.Item
                            name="description"
                            label="店铺描述"
                            rules={[
                                { max: 500, message: '店铺描述不能超过500个字符' }
                            ]}
                        >
                            <TextArea
                                placeholder="请输入店铺描述，介绍您的店铺特色"
                                autoSize={{ minRows: 3, maxRows: 6 }}
                            />
                        </Form.Item>

                        <Form.Item
                            name="contactPhone"
                            label="联系电话"
                            rules={[
                                { required: true, message: '请输入联系电话' },
                                { pattern: /^1[3-9]\d{9}$/, message: '请输入正确的手机号码' }
                            ]}
                        >
                            <Input
                                placeholder="请输入联系电话"
                                prefix={<PhoneOutlined />}
                            />
                        </Form.Item>

                        <Form.Item
                            name="businessHours"
                            label="营业时间"
                            rules={[
                                { required: true, message: '请设置营业时间' }
                            ]}
                        >
                            <RangePicker
                                format="HH:mm"
                                placeholder={['开始时间', '结束时间']}
                                prefix={<ClockCircleOutlined />}
                                style={{ width: '100%' }}
                            />
                        </Form.Item>

                        <div className={styles.addressSection}>
                            <Title level={5}>店铺地址</Title>
                            <div className={styles.mapSelectorContainer}>
                                <MapSelector
                                    id="storeAddressSelector"
                                    initialAddress={form.getFieldValue('location')}
                                    onAddressSelect={handleAddressSelect}
                                    placeholder="输入地址搜索"
                                />
                            </div>

                            <Form.Item
                                name="location"
                                label="详细地址"
                                rules={[{ required: true, message: '请选择或输入详细地址' }]}
                                className={styles.hiddenField}
                            >
                                <Input />
                            </Form.Item>

                            <Form.Item
                                name="latitude"
                                className={styles.hiddenField}
                            >
                                <Input type="hidden" />
                            </Form.Item>

                            <Form.Item
                                name="longitude"
                                className={styles.hiddenField}
                            >
                                <Input type="hidden" />
                            </Form.Item>
                        </div>

                        <Divider />

                        <div className={styles.formActions}>
                            <Button onClick={handleCancel}>
                                取消
                            </Button>
                            <Button
                                type="primary"
                                htmlType="submit"
                                loading={submitting}
                                icon={<SaveOutlined />}
                                disabled={!addressSelected}
                            >
                                {isEdit ? '保存修改' : '创建店铺'}
                            </Button>
                        </div>
                    </Form>
                </Card>
            </div>
        </div>
    );
};

export default StoreForm;