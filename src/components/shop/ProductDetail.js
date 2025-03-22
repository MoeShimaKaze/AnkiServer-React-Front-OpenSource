// src/components/shop/ProductDetail.js
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
    Typography, Button, Divider, InputNumber, message,
    Image, Spin, Empty, Breadcrumb, Rate, Space,
    Row, Col, Descriptions, Badge, Tag
} from 'antd';
import {
    LeftOutlined, ShoppingCartOutlined, ShopOutlined,
    DollarOutlined, TagOutlined, InboxOutlined, ClockCircleOutlined,
    EnvironmentOutlined, BarcodeOutlined
} from '@ant-design/icons';
import Navbar from '../base/Navbar';
import { useAuth } from '../context/AuthContext';
import styles from '../../assets/css/shop/ProductDetail.module.css';

const { Title, Text, Paragraph } = Typography;

// 商品分类映射表，用于将后端枚举值转为显示文本
const categoryMap = {
    'FOOD': '食品',
    'DAILY_NECESSITIES': '日用品',
    'ELECTRONICS': '电子产品',
    'CLOTHING': '服装',
    'BOOKS': '图书',
    'BEAUTY': '美妆',
    'SPORTS': '运动',
    'OTHER': '其他'
};

const ProductDetail = () => {
    const { productId } = useParams();
    const navigate = useNavigate();
    const { isLoggedIn, userId } = useAuth();

    const [loading, setLoading] = useState(true);
    const [product, setProduct] = useState(null);
    const [store, setStore] = useState(null);
    const [quantity, setQuantity] = useState(1);
    const [orderCreating, setOrderCreating] = useState(false);

    useEffect(() => {
        const fetchProductDetails = async () => {
            try {
                setLoading(true);
                const response = await axios.get(`http://127.0.0.1:8080/api/products/${productId}`, {
                    withCredentials: true
                });
                setProduct(response.data);

                // 获取店铺信息
                if (response.data.storeId) {
                    const storeResponse = await axios.get(`http://127.0.0.1:8080/api/stores/${response.data.storeId}`, {
                        withCredentials: true
                    });
                    setStore(storeResponse.data);
                }

                setLoading(false);
            } catch (error) {
                console.error('Error fetching product details:', error);
                message.error('获取商品详情失败');
                setLoading(false);
            }
        };

        fetchProductDetails();
    }, [productId]);

    useEffect(() => {
        // 当商品加载完成后，初始化购买数量，并确保不小于最小购买数量
        if (product) {
            const minBuy = product.minBuyLimit || 1;
            setQuantity(minBuy);
        }
    }, [product]);

    const handleQuantityChange = (value) => {
        if (!product) return;

        const minBuy = product.minBuyLimit || 1;
        const maxBuy = product.maxBuyLimit || product.stock;

        // 确保数量不低于最小购买限制
        if (value < minBuy) {
            message.warning(`该商品最少需购买 ${minBuy} 件`);
            setQuantity(minBuy);
            return;
        }

        // 确保数量不超过最大购买限制或库存
        if (product.maxBuyLimit && value > product.maxBuyLimit) {
            message.warning(`该商品最多限购 ${product.maxBuyLimit} 件`);
            setQuantity(Math.min(product.maxBuyLimit, product.stock));
            return;
        }

        // 确保数量不超过库存
        if (value > product.stock) {
            message.warning(`商品库存只有 ${product.stock} 件`);
            setQuantity(product.stock);
            return;
        }

        setQuantity(value);
    };

    const handleBackClick = () => {
        navigate(-1);
    };

    const handleStoreClick = () => {
        if (store) {
            navigate(`/shop/stores/${store.id}`);
        }
    };

    const handleBuyNow = () => {
        if (!isLoggedIn) {
            message.warning('请先登录后再购买');
            navigate('/login', { state: { from: `/shop/products/${productId}` } });
            return;
        }

        if (!product.canPurchase) {
            message.error('该商品当前无法购买');
            return;
        }

        // 跳转到下单页面，并传递商品和数量信息
        navigate('/shop/order/create', {
            state: {
                productId: product.id,
                quantity: quantity,
                storeId: product.storeId
            }
        });
    };

    if (loading) {
        return (
            <div className={styles.loadingContainer}>
                <Spin size="large" />
            </div>
        );
    }

    if (!product) {
        return (
            <div className={styles.emptyContainer}>
                <Empty description="商品不存在或已被删除" />
                <Button onClick={handleBackClick}>返回</Button>
            </div>
        );
    }

    // 获取分类的显示名称
    const categoryLabel = categoryMap[product.category] || product.category;

    return (
        <div className={styles.productDetailContainer}>
            <Navbar />
            <div className={styles.contentWrapper}>
                <div className={styles.breadcrumbSection}>
                    <Breadcrumb className={styles.breadcrumb}>
                        <Breadcrumb.Item>
                            <Button
                                type="link"
                                onClick={handleBackClick}
                                className={styles.backButton}
                            >
                                <LeftOutlined /> 返回
                            </Button>
                        </Breadcrumb.Item>
                        <Breadcrumb.Item onClick={handleStoreClick} className={styles.clickableBreadcrumb}>
                            {store ? store.storeName : '店铺'}
                        </Breadcrumb.Item>
                        <Breadcrumb.Item>商品详情</Breadcrumb.Item>
                    </Breadcrumb>
                </div>

                <div className={styles.productContent}>
                    <Row gutter={24}>
                        <Col xs={24} md={12} lg={10}>
                            <div className={styles.productImageSection}>
                                {product.imageUrl ? (
                                    <Image
                                        src={product.imageUrl}
                                        alt={product.name}
                                        className={styles.productImage}
                                        fallback="/placeholder.png"
                                    />
                                ) : (
                                    <div className={styles.noImageContainer}>
                                        <InboxOutlined className={styles.noImageIcon} />
                                        <Text type="secondary">暂无图片</Text>
                                    </div>
                                )}
                            </div>
                        </Col>

                        <Col xs={24} md={12} lg={14}>
                            <div className={styles.productInfo}>
                                <div className={styles.productHeader}>
                                    <Title level={3}>{product.name}</Title>
                                    <div className={styles.productStatusBadge}>
                                        {product.status === 'ON_SALE' ? (
                                            <Badge status="success" text="在售" />
                                        ) : product.status === 'OUT_OF_STOCK' ? (
                                            <Badge status="error" text="缺货" />
                                        ) : (
                                            <Badge status="default" text={product.status} />
                                        )}
                                    </div>
                                </div>

                                <div className={styles.productRating}>
                                    <Rate disabled allowHalf defaultValue={product.rating} />
                                    <Text type="secondary">销量: {product.salesCount || 0}</Text>
                                </div>

                                <div className={styles.priceSection}>
                                    <DollarOutlined className={styles.priceIcon} />
                                    <Text className={styles.priceText}>¥{product.price.toFixed(2)}</Text>

                                    {product.marketPrice && product.marketPrice > product.price && (
                                        <Text delete type="secondary" className={styles.marketPrice}>
                                            ¥{product.marketPrice.toFixed(2)}
                                        </Text>
                                    )}

                                    {product.skuCode && (
                                        <Text type="secondary" className={styles.skuCode}>
                                            SKU: {product.skuCode}
                                        </Text>
                                    )}
                                </div>

                                <Divider />

                                <div className={styles.productAttributes}>
                                    <Descriptions column={1} bordered size="small">
                                        <Descriptions.Item label="类别">
                                            <Space>
                                                <TagOutlined />
                                                {categoryLabel}
                                            </Space>
                                        </Descriptions.Item>
                                        <Descriptions.Item label="库存">
                                            <Space>
                                                <InboxOutlined />
                                                {product.stock > 0 ? (
                                                    product.stock < 10 ? (
                                                        <Text type="warning">仅剩 {product.stock} 件</Text>
                                                    ) : (
                                                        <Text>充足 ({product.stock})</Text>
                                                    )
                                                ) : (
                                                    <Text type="danger">无货</Text>
                                                )}
                                            </Space>
                                        </Descriptions.Item>
                                        <Descriptions.Item label="重量">
                                            <Space>
                                                <TagOutlined />
                                                {product.weight} kg
                                            </Space>
                                        </Descriptions.Item>

                                        {/* 新增尺寸信息显示 */}
                                        {product.length && product.width && product.height && (
                                            <Descriptions.Item label="尺寸">
                                                <Space>
                                                    <TagOutlined />
                                                    {`${product.length} × ${product.width} × ${product.height} cm`}
                                                </Space>
                                            </Descriptions.Item>
                                        )}

                                        {/* 显示特殊属性标签 */}
                                        <Descriptions.Item label="商品属性">
                                            <Space wrap>
                                                {product.isLargeItem && (
                                                    <Tag color="orange">大件商品</Tag>
                                                )}
                                                {product.isFragile && (
                                                    <Tag color="red">易碎品</Tag>
                                                )}
                                                {product.needsPackaging && (
                                                    <Tag color="blue">需特殊包装</Tag>
                                                )}
                                                {!product.isLargeItem && !product.isFragile && !product.needsPackaging && (
                                                    <Text type="secondary">普通商品</Text>
                                                )}
                                            </Space>
                                        </Descriptions.Item>

                                        {/* 显示购买限制信息 */}
                                        {(product.minBuyLimit > 1 || product.maxBuyLimit) && (
                                            <Descriptions.Item label="购买限制">
                                                <Space direction="vertical">
                                                    {product.minBuyLimit > 1 && (
                                                        <Text>最少购买: {product.minBuyLimit} 件</Text>
                                                    )}
                                                    {product.maxBuyLimit && (
                                                        <Text>最多购买: {product.maxBuyLimit} 件</Text>
                                                    )}
                                                </Space>
                                            </Descriptions.Item>
                                        )}

                                        {/* 条形码信息 */}
                                        {product.barcode && (
                                            <Descriptions.Item label="条形码">
                                                <Space>
                                                    <BarcodeOutlined />
                                                    {product.barcode}
                                                </Space>
                                            </Descriptions.Item>
                                        )}

                                        {store && (
                                            <>
                                                <Descriptions.Item label="店铺">
                                                    <Space>
                                                        <ShopOutlined />
                                                        <Text className={styles.clickableText} onClick={handleStoreClick}>
                                                            {store.storeName}
                                                        </Text>
                                                    </Space>
                                                </Descriptions.Item>
                                                <Descriptions.Item label="营业时间">
                                                    <Space>
                                                        <ClockCircleOutlined />
                                                        {store.businessHours || '未设置'}
                                                    </Space>
                                                </Descriptions.Item>
                                                <Descriptions.Item label="店铺地址">
                                                    <Space>
                                                        <EnvironmentOutlined />
                                                        {store.location || '未设置地址'}
                                                    </Space>
                                                </Descriptions.Item>
                                            </>
                                        )}
                                    </Descriptions>
                                </div>

                                <Divider />

                                <div className={styles.purchaseSection}>
                                    <div className={styles.quantitySection}>
                                        <Text>数量：</Text>
                                        <InputNumber
                                            min={product.minBuyLimit || 1}
                                            max={product.maxBuyLimit ? Math.min(product.maxBuyLimit, product.stock) : product.stock}
                                            value={quantity}
                                            onChange={handleQuantityChange}
                                            disabled={!product.canPurchase || product.stock <= 0}
                                        />
                                        <Text type="secondary">
                                            {product.stock > 0 ? `库存 ${product.stock} 件` : '无货'}
                                        </Text>
                                    </div>

                                    <div className={styles.actionButtons}>
                                        <Button
                                            type="primary"
                                            size="large"
                                            icon={<ShoppingCartOutlined />}
                                            onClick={handleBuyNow}
                                            loading={orderCreating}
                                            disabled={!product.canPurchase || product.stock <= 0}
                                            block
                                        >
                                            立即购买
                                        </Button>
                                    </div>

                                    {!product.canPurchase && (
                                        <div className={styles.unavailableReason}>
                                            <Text type="danger">
                                                {product.stock <= 0 ? '商品已售罄' :
                                                    product.status !== 'ON_SALE' ? '商品已下架' :
                                                        store && store.status !== 'ACTIVE' ? '店铺暂停营业' :
                                                            '商品当前不可购买'}
                                            </Text>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </Col>
                    </Row>

                    <Divider orientation="left">商品详情</Divider>

                    <div className={styles.productDescriptionSection}>
                        {product.description ? (
                            <Paragraph>{product.description}</Paragraph>
                        ) : (
                            <Empty description="暂无商品详情描述" image={Empty.PRESENTED_IMAGE_SIMPLE} />
                        )}
                    </div>

                    {/* 新增商品规格表格 */}
                    <Divider orientation="left">规格参数</Divider>

                    <div className={styles.productSpecsSection}>
                        <Descriptions bordered column={{ xs: 1, sm: 2, md: 3 }}>
                            <Descriptions.Item label="商品名称">{product.name}</Descriptions.Item>
                            <Descriptions.Item label="商品分类">{categoryLabel}</Descriptions.Item>
                            <Descriptions.Item label="商品重量">{product.weight} kg</Descriptions.Item>

                            {product.length && (
                                <Descriptions.Item label="长度">{product.length} cm</Descriptions.Item>
                            )}
                            {product.width && (
                                <Descriptions.Item label="宽度">{product.width} cm</Descriptions.Item>
                            )}
                            {product.height && (
                                <Descriptions.Item label="高度">{product.height} cm</Descriptions.Item>
                            )}

                            <Descriptions.Item label="商品状态">
                                {product.status === 'ON_SALE' ? '在售' :
                                    product.status === 'OUT_OF_STOCK' ? '缺货' :
                                        product.status === 'DISCONTINUED' ? '已下架' :
                                            product.status === 'PENDING_REVIEW' ? '审核中' :
                                                product.status}
                            </Descriptions.Item>

                            {product.marketPrice && (
                                <Descriptions.Item label="市场价">¥{product.marketPrice.toFixed(2)}</Descriptions.Item>
                            )}

                            {product.minBuyLimit > 1 && (
                                <Descriptions.Item label="最小购买量">{product.minBuyLimit} 件</Descriptions.Item>
                            )}

                            {product.maxBuyLimit && (
                                <Descriptions.Item label="最大购买量">{product.maxBuyLimit} 件</Descriptions.Item>
                            )}

                            <Descriptions.Item label="销量">{product.salesCount || 0} 件</Descriptions.Item>
                            <Descriptions.Item label="评分">{product.rating || 5} 分</Descriptions.Item>

                            {product.skuCode && (
                                <Descriptions.Item label="SKU编码">{product.skuCode}</Descriptions.Item>
                            )}

                            {product.barcode && (
                                <Descriptions.Item label="条形码">{product.barcode}</Descriptions.Item>
                            )}
                        </Descriptions>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ProductDetail;