// src/components/shop/ProductForm.js
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import {
    Form, Input, Button, InputNumber, Select, Card, Typography, Divider,
    Upload, message, Breadcrumb, Spin, Switch, Tooltip, Row, Col
} from 'antd';
import {
    LeftOutlined, SaveOutlined, PlusOutlined,
    DeleteOutlined, EditOutlined, QuestionCircleOutlined
} from '@ant-design/icons';
import Navbar from '../base/Navbar';
import ImageCropper from '../utils/ImageCropper';
import styles from '../../assets/css/shop/ProductForm.module.css';

const { Title, Text } = Typography;
const { TextArea } = Input;
const { Option } = Select;

const ProductForm = () => {
    const { productId } = useParams();
    const navigate = useNavigate();
    const location = useLocation();
    const [form] = Form.useForm();

    // 状态管理
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [isEdit, setIsEdit] = useState(false);
    const [selectedStore, setSelectedStore] = useState(null);
    const [stores, setStores] = useState([]);

    // 修改为与后端枚举一致的分类列表
    const [categories] = useState([
        { value: 'FOOD', label: '食品' },
        { value: 'DAILY_NECESSITIES', label: '日用品' },
        { value: 'ELECTRONICS', label: '电子产品' },
        { value: 'CLOTHING', label: '服装' },
        { value: 'BOOKS', label: '图书' },
        { value: 'BEAUTY', label: '美妆' },
        { value: 'SPORTS', label: '运动' },
        { value: 'OTHER', label: '其他' }
    ]);

    // 图片相关状态
    const [imageUrl, setImageUrl] = useState('');
    const [fileList, setFileList] = useState([]);
    const [showCropper, setShowCropper] = useState(false);
    const [imageToEdit, setImageToEdit] = useState(null);
    const [temporaryFile, setTemporaryFile] = useState(null);

    // 从location state中获取storeId
    useEffect(() => {
        const { state } = location;
        if (state && state.storeId) {
            form.setFieldsValue({ storeId: state.storeId });
            setSelectedStore(state.storeId);
        }
    }, [location, form]);

    // 获取商家的店铺列表
    useEffect(() => {
        const fetchStores = async () => {
            try {
                const response = await axios.get('http://127.0.0.1:8080/api/stores/merchant/current', {
                    withCredentials: true
                });
                setStores(response.data || []);

                // 如果只有一个店铺且没有通过location传递storeId，则自动选中
                if (response.data.length === 1 && !selectedStore) {
                    form.setFieldsValue({ storeId: response.data[0].id });
                    setSelectedStore(response.data[0].id);
                }
            } catch (error) {
                console.error('Error fetching stores:', error);
                message.error('获取店铺列表失败');
            }
        };

        fetchStores();
    }, [form, selectedStore]);

    // 如果是编辑模式，获取商品详情
    useEffect(() => {
        const fetchProductDetails = async () => {
            if (!productId) return;

            try {
                setLoading(true);
                setIsEdit(true);
                const response = await axios.get(`http://127.0.0.1:8080/api/products/${productId}?forEdit=true`, {
                    withCredentials: true
                });

                const product = response.data;

                // 填充表单数据，注意category要转换为枚举值
                form.setFieldsValue({
                    storeId: product.storeId,
                    name: product.name,
                    description: product.description,
                    price: product.price,
                    marketPrice: product.marketPrice,
                    costPrice: product.costPrice,
                    wholesalePrice: product.wholesalePrice,
                    stock: product.stock,
                    weight: product.weight || 1.0,
                    length: product.length,
                    width: product.width,
                    height: product.height,
                    category: product.category,
                    skuCode: product.skuCode,
                    barcode: product.barcode,
                    maxBuyLimit: product.maxBuyLimit,
                    minBuyLimit: product.minBuyLimit !== null ? product.minBuyLimit : 1,
                    isLargeItem: product.isLargeItem,
                    isFragile: product.isFragile,
                    needsPackaging: product.needsPackaging,
                    status: product.status === 'ON_SALE'
                });

                setSelectedStore(product.storeId);

                // 设置图片URL（如果有）
                if (product.imageUrl) {
                    setImageUrl(product.imageUrl);
                    setFileList([
                        {
                            uid: '-1',
                            name: 'product-image.jpg',
                            status: 'done',
                            url: product.imageUrl,
                        }
                    ]);
                }

                setLoading(false);
            } catch (error) {
                console.error('Error fetching product details:', error);
                message.error('获取商品详情失败');
                setLoading(false);
            }
        };

        fetchProductDetails();
    }, [productId, form]);

    // 处理图片上传前的回调
    const beforeUpload = (file) => {
        const isImage = file.type.startsWith('image/');
        if (!isImage) {
            message.error('只能上传图片文件!');
            return false;
        }

        const isLt5M = file.size / 1024 / 1024 < 5;
        if (!isLt5M) {
            message.error('图片必须小于5MB!');
            return false;
        }

        // 阻止自动上传，打开裁剪器
        const reader = new FileReader();
        reader.onload = () => {
            setImageToEdit(reader.result);
            setShowCropper(true);
            setTemporaryFile(file);
        };
        reader.readAsDataURL(file);

        return false; // 阻止默认上传行为
    };

    // 处理上传变化
    const handleUploadChange = (info) => {
        // 这里主要处理删除操作，因为上传我们用了自定义的裁剪流程
        if (info.fileList.length === 0) {
            setImageUrl('');
            setFileList([]);
        }
    };

    // 裁剪完成后的回调
    const handleCropComplete = (cropResult) => {
        setShowCropper(false);
        setImageToEdit(null);
        setTemporaryFile(null);

        // 更新预览图URL和文件列表
        setImageUrl(cropResult.url);
        setFileList([
            {
                uid: '-1',
                name: 'product-image.jpg',
                status: 'done',
                originFileObj: cropResult.file,
                url: cropResult.url
            }
        ]);
    };

    // 取消裁剪
    const handleCropCancel = () => {
        setShowCropper(false);
        setImageToEdit(null);
        setTemporaryFile(null);
    };

    // 删除图片
    const handleRemoveImage = () => {
        setImageUrl('');
        setFileList([]);
    };

    // 表单提交
    const handleSubmit = async (values) => {
        if (!values.storeId) {
            message.warning('请选择店铺');
            return;
        }

        try {
            setSubmitting(true);

            // 构建商品数据
            const productData = new FormData();
            productData.append('storeId', values.storeId);
            productData.append('name', values.name);
            productData.append('description', values.description || '');
            productData.append('price', values.price);
            productData.append('stock', values.stock);
            productData.append('category', values.category);
            productData.append('status', values.status ? 'ON_SALE' : 'OUT_OF_STOCK');
            productData.append('weight', values.weight || 1.0);

            // 添加新增的物理属性字段
            if (values.length) productData.append('length', values.length);
            if (values.width) productData.append('width', values.width);
            if (values.height) productData.append('height', values.height);
            productData.append('isLargeItem', values.isLargeItem || false);
            productData.append('isFragile', values.isFragile || false);
            productData.append('needsPackaging', values.needsPackaging || false);

            // 添加价格相关字段
            if (values.marketPrice) productData.append('marketPrice', values.marketPrice);
            if (values.costPrice) productData.append('costPrice', values.costPrice);
            if (values.wholesalePrice) productData.append('wholesalePrice', values.wholesalePrice);

            // 添加编码与销售限制字段
            if (values.skuCode) productData.append('skuCode', values.skuCode);
            if (values.barcode) productData.append('barcode', values.barcode);
            if (values.maxBuyLimit) productData.append('maxBuyLimit', values.maxBuyLimit);
            productData.append('minBuyLimit', values.minBuyLimit || 1);

            // 添加图片文件（如果有）
            if (fileList.length > 0 && fileList[0].originFileObj) {
                productData.append('imageFile', fileList[0].originFileObj);
            }

            if (isEdit) {
                // 更新商品
                await axios.put(`http://127.0.0.1:8080/api/products/${productId}`, productData, {
                    withCredentials: true,
                    headers: {
                        'Content-Type': 'multipart/form-data'
                    }
                });
                message.success('商品更新成功');
            } else {
                // 创建商品
                await axios.post('http://127.0.0.1:8080/api/products', productData, {
                    withCredentials: true,
                    headers: {
                        'Content-Type': 'multipart/form-data'
                    }
                });
                message.success('商品创建成功');
            }

            setSubmitting(false);
            navigate('/shop/merchant/products');
        } catch (error) {
            console.error('Error saving product:', error);
            message.error('保存商品失败: ' + (error.response?.data || error.message));
            setSubmitting(false);
        }
    };

    // 取消操作
    const handleCancel = () => {
        navigate('/shop/merchant/products');
    };

    // 上传按钮
    const uploadButton = (
        <div>
            <PlusOutlined />
            <div className={styles.uploadText}>上传图片</div>
        </div>
    );

    if (loading) {
        return (
            <div className={styles.loadingContainer}>
                <Spin size="large" />
            </div>
        );
    }

    return (
        <div className={styles.productFormContainer}>
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
                        <Breadcrumb.Item>商品管理</Breadcrumb.Item>
                        <Breadcrumb.Item>{isEdit ? '编辑商品' : '添加商品'}</Breadcrumb.Item>
                    </Breadcrumb>
                </div>

                <Card className={styles.formCard}>
                    <Title level={4}>
                        {isEdit ? '编辑商品' : '添加商品'}
                    </Title>

                    <Divider />

                    <Form
                        form={form}
                        layout="vertical"
                        onFinish={handleSubmit}
                        initialValues={{
                            status: true,
                            stock: 1,
                            weight: 1.0,
                            minBuyLimit: 1,
                            isLargeItem: false,
                            isFragile: false,
                            needsPackaging: false
                        }}
                    >
                        <Form.Item
                            name="storeId"
                            label="选择店铺"
                            rules={[{ required: true, message: '请选择店铺' }]}
                        >
                            <Select
                                placeholder="请选择店铺"
                                onChange={(value) => setSelectedStore(value)}
                                disabled={isEdit || (location.state && location.state.storeId)}
                            >
                                {stores.map(store => (
                                    <Option key={store.id} value={store.id}>{store.storeName}</Option>
                                ))}
                            </Select>
                        </Form.Item>

                        <Form.Item
                            name="name"
                            label="商品名称"
                            rules={[
                                { required: true, message: '请输入商品名称' },
                                { min: 2, max: 100, message: '商品名称长度必须在2-100个字符之间' }
                            ]}
                        >
                            <Input placeholder="请输入商品名称" />
                        </Form.Item>

                        <Row gutter={16}>
                            <Col span={6}>
                                <Form.Item
                                    name="price"
                                    label="售价 (元)"
                                    rules={[
                                        { required: true, message: '请输入价格' },
                                        { type: 'number', min: 0.01, message: '价格必须大于0' }
                                    ]}
                                >
                                    <InputNumber
                                        placeholder="请输入价格"
                                        min={0.01}
                                        step={0.1}
                                        precision={2}
                                        style={{ width: '100%' }}
                                    />
                                </Form.Item>
                            </Col>
                            <Col span={6}>
                                <Form.Item
                                    name="marketPrice"
                                    label={
                                        <span>
                                            市场价 (元)
                                            <Tooltip title="商品的参考市场价格">
                                                <QuestionCircleOutlined style={{ marginLeft: 4 }} />
                                            </Tooltip>
                                        </span>
                                    }
                                >
                                    <InputNumber
                                        placeholder="市场价"
                                        min={0.01}
                                        step={0.1}
                                        precision={2}
                                        style={{ width: '100%' }}
                                    />
                                </Form.Item>
                            </Col>
                            <Col span={6}>
                                <Form.Item
                                    name="costPrice"
                                    label={
                                        <span>
                                            成本价 (元)
                                            <Tooltip title="商品的成本价格，仅供内部参考">
                                                <QuestionCircleOutlined style={{ marginLeft: 4 }} />
                                            </Tooltip>
                                        </span>
                                    }
                                >
                                    <InputNumber
                                        placeholder="成本价"
                                        min={0.01}
                                        step={0.1}
                                        precision={2}
                                        style={{ width: '100%' }}
                                    />
                                </Form.Item>
                            </Col>
                            <Col span={6}>
                                <Form.Item
                                    name="wholesalePrice"
                                    label={
                                        <span>
                                            批发价 (元)
                                            <Tooltip title="批量购买时的优惠价格">
                                                <QuestionCircleOutlined style={{ marginLeft: 4 }} />
                                            </Tooltip>
                                        </span>
                                    }
                                >
                                    <InputNumber
                                        placeholder="批发价"
                                        min={0.01}
                                        step={0.1}
                                        precision={2}
                                        style={{ width: '100%' }}
                                    />
                                </Form.Item>
                            </Col>
                        </Row>

                        <Row gutter={16}>
                            <Col span={6}>
                                <Form.Item
                                    name="stock"
                                    label="库存"
                                    rules={[
                                        { required: true, message: '请输入库存' },
                                        { type: 'number', min: 0, message: '库存不能为负数' }
                                    ]}
                                >
                                    <InputNumber
                                        placeholder="请输入库存"
                                        min={0}
                                        style={{ width: '100%' }}
                                    />
                                </Form.Item>
                            </Col>
                            <Col span={6}>
                                <Form.Item
                                    name="minBuyLimit"
                                    label={
                                        <span>
                                            最小购买数量
                                            <Tooltip title="单次购买的最少数量，默认为1">
                                                <QuestionCircleOutlined style={{ marginLeft: 4 }} />
                                            </Tooltip>
                                        </span>
                                    }
                                >
                                    <InputNumber
                                        placeholder="最少购买数"
                                        min={1}
                                        style={{ width: '100%' }}
                                    />
                                </Form.Item>
                            </Col>
                            <Col span={6}>
                                <Form.Item
                                    name="maxBuyLimit"
                                    label={
                                        <span>
                                            最大购买数量
                                            <Tooltip title="单次购买的最大数量限制，留空表示不限制">
                                                <QuestionCircleOutlined style={{ marginLeft: 4 }} />
                                            </Tooltip>
                                        </span>
                                    }
                                >
                                    <InputNumber
                                        placeholder="最大购买数"
                                        min={1}
                                        style={{ width: '100%' }}
                                    />
                                </Form.Item>
                            </Col>
                            <Col span={6}>
                                <Form.Item
                                    name="category"
                                    label="分类"
                                    rules={[{ required: true, message: '请选择分类' }]}
                                >
                                    <Select placeholder="请选择分类">
                                        {categories.map(category => (
                                            <Option key={category.value} value={category.value}>{category.label}</Option>
                                        ))}
                                    </Select>
                                </Form.Item>
                            </Col>
                        </Row>

                        <Divider orientation="left">商品规格信息</Divider>

                        <Row gutter={16}>
                            <Col span={6}>
                                <Form.Item
                                    name="weight"
                                    label="重量 (kg)"
                                    rules={[
                                        { required: true, message: '请输入重量' },
                                        { type: 'number', min: 0.01, message: '重量必须大于0' }
                                    ]}
                                >
                                    <InputNumber
                                        placeholder="请输入重量"
                                        min={0.01}
                                        step={0.1}
                                        precision={2}
                                        style={{ width: '100%' }}
                                    />
                                </Form.Item>
                            </Col>
                            <Col span={6}>
                                <Form.Item
                                    name="length"
                                    label="长度 (cm)"
                                >
                                    <InputNumber
                                        placeholder="长度"
                                        min={0.1}
                                        step={0.1}
                                        precision={1}
                                        style={{ width: '100%' }}
                                    />
                                </Form.Item>
                            </Col>
                            <Col span={6}>
                                <Form.Item
                                    name="width"
                                    label="宽度 (cm)"
                                >
                                    <InputNumber
                                        placeholder="宽度"
                                        min={0.1}
                                        step={0.1}
                                        precision={1}
                                        style={{ width: '100%' }}
                                    />
                                </Form.Item>
                            </Col>
                            <Col span={6}>
                                <Form.Item
                                    name="height"
                                    label="高度 (cm)"
                                >
                                    <InputNumber
                                        placeholder="高度"
                                        min={0.1}
                                        step={0.1}
                                        precision={1}
                                        style={{ width: '100%' }}
                                    />
                                </Form.Item>
                            </Col>
                        </Row>

                        <Row gutter={16}>
                            <Col span={8}>
                                <Form.Item
                                    name="isLargeItem"
                                    valuePropName="checked"
                                    label={
                                        <span>
                                            是否大件商品
                                            <Tooltip title="大件商品可能需要特殊配送">
                                                <QuestionCircleOutlined style={{ marginLeft: 4 }} />
                                            </Tooltip>
                                        </span>
                                    }
                                >
                                    <Switch
                                        checkedChildren="是"
                                        unCheckedChildren="否"
                                    />
                                </Form.Item>
                            </Col>
                            <Col span={8}>
                                <Form.Item
                                    name="isFragile"
                                    valuePropName="checked"
                                    label={
                                        <span>
                                            是否易碎品
                                            <Tooltip title="易碎品需要特殊包装和小心配送">
                                                <QuestionCircleOutlined style={{ marginLeft: 4 }} />
                                            </Tooltip>
                                        </span>
                                    }
                                >
                                    <Switch
                                        checkedChildren="是"
                                        unCheckedChildren="否"
                                    />
                                </Form.Item>
                            </Col>
                            <Col span={8}>
                                <Form.Item
                                    name="needsPackaging"
                                    valuePropName="checked"
                                    label={
                                        <span>
                                            需要包装
                                            <Tooltip title="商品是否需要特殊包装">
                                                <QuestionCircleOutlined style={{ marginLeft: 4 }} />
                                            </Tooltip>
                                        </span>
                                    }
                                >
                                    <Switch
                                        checkedChildren="是"
                                        unCheckedChildren="否"
                                    />
                                </Form.Item>
                            </Col>
                        </Row>

                        <Divider orientation="left">商品编码</Divider>

                        <Row gutter={16}>
                            <Col span={12}>
                                <Form.Item
                                    name="skuCode"
                                    label={
                                        <span>
                                            SKU编码
                                            <Tooltip title="商品的唯一标识码，用于库存管理">
                                                <QuestionCircleOutlined style={{ marginLeft: 4 }} />
                                            </Tooltip>
                                        </span>
                                    }
                                >
                                    <Input placeholder="请输入SKU编码" />
                                </Form.Item>
                            </Col>
                            <Col span={12}>
                                <Form.Item
                                    name="barcode"
                                    label={
                                        <span>
                                            条形码
                                            <Tooltip title="商品的条形码，用于扫描识别">
                                                <QuestionCircleOutlined style={{ marginLeft: 4 }} />
                                            </Tooltip>
                                        </span>
                                    }
                                >
                                    <Input placeholder="请输入商品条形码" />
                                </Form.Item>
                            </Col>
                        </Row>

                        <Form.Item
                            name="description"
                            label="商品描述"
                        >
                            <TextArea
                                placeholder="请输入商品描述"
                                autoSize={{ minRows: 3, maxRows: 6 }}
                            />
                        </Form.Item>

                        <Form.Item
                            name="status"
                            label="商品状态"
                            valuePropName="checked"
                        >
                            <Switch
                                checkedChildren="上架"
                                unCheckedChildren="下架"
                            />
                        </Form.Item>

                        <div className={styles.uploadContainer}>
                            <Title level={5}>商品图片</Title>
                            <div className={styles.imageUploader}>
                                <Upload
                                    name="imageFile"
                                    listType="picture-card"
                                    className={styles.uploader}
                                    showUploadList={false}
                                    beforeUpload={beforeUpload}
                                    onChange={handleUploadChange}
                                    fileList={fileList}
                                >
                                    {imageUrl ? (
                                        <div className={styles.imagePreview}>
                                            <img
                                                src={imageUrl}
                                                alt="商品图片"
                                                className={styles.uploadedImage}
                                            />
                                            <div className={styles.imageOverlay}>
                                                <Button
                                                    icon={<EditOutlined />}
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setImageToEdit(imageUrl);
                                                        setShowCropper(true);
                                                    }}
                                                >
                                                    编辑
                                                </Button>
                                                <Button
                                                    danger
                                                    icon={<DeleteOutlined />}
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleRemoveImage();
                                                    }}
                                                >
                                                    删除
                                                </Button>
                                            </div>
                                        </div>
                                    ) : (
                                        uploadButton
                                    )}
                                </Upload>
                                <Text type="secondary" className={styles.uploadHint}>
                                    建议上传尺寸: 800x800像素，大小不超过5MB
                                </Text>
                            </div>
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
                            >
                                {isEdit ? '保存修改' : '创建商品'}
                            </Button>
                        </div>
                    </Form>
                </Card>
            </div>

            {/* 图片裁剪器 */}
            {showCropper && (
                <ImageCropper
                    image={imageToEdit}
                    onCropComplete={handleCropComplete}
                    onCancel={handleCropCancel}
                    aspectRatio={1}
                    maxWidth={800}
                    maxHeight={800}
                />
            )}
        </div>
    );
};

export default ProductForm;