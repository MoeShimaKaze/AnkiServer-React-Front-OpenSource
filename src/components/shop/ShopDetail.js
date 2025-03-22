// src/components/shop/ShopDetail.js
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
    Card, Typography, Rate, Row, Col, Button,
    Spin, Empty, Divider, Breadcrumb, message, Tabs, Badge
} from 'antd';
import {
    ShopOutlined, EnvironmentOutlined, PhoneOutlined,
    LeftOutlined, ClockCircleOutlined, ShoppingCartOutlined,
    TagsOutlined, DollarOutlined, InboxOutlined
} from '@ant-design/icons';
import Navbar from '../base/Navbar';
import MapModal from '../utils/amap/MapModal';
import styles from '../../assets/css/shop/ShopDetail.module.css';

const { Title, Text, Paragraph } = Typography;
const { TabPane } = Tabs;

const ProductCard = ({ product, onProductClick }) => {
    return (
        <Card
            hoverable
            className={styles.productCard}
            onClick={() => onProductClick(product.id)}
            cover={
                <div className={styles.productImageContainer}>
                    {product.imageUrl ? (
                        <img
                            alt={product.name}
                            src={product.imageUrl}
                            className={styles.productImage}
                        />
                    ) : (
                        <div className={styles.noImageContainer}>
                            <InboxOutlined className={styles.noImageIcon} />
                            <Text type="secondary">暂无图片</Text>
                        </div>
                    )}
                    {product.stock <= 0 && (
                        <div className={styles.outOfStockOverlay}>
                            <Text className={styles.outOfStockText}>售罄</Text>
                        </div>
                    )}
                </div>
            }
        >
            <Card.Meta
                title={
                    <div className={styles.productTitle}>
                        <Text ellipsis>{product.name}</Text>
                        {product.stock <= 5 && product.stock > 0 && (
                            <Badge count={`仅剩${product.stock}件`} className={styles.stockBadge} />
                        )}
                    </div>
                }
                description={
                    <div className={styles.productDetails}>
                        <div className={styles.productPrice}>
                            <DollarOutlined />
                            <Text type="danger" strong>¥{product.price.toFixed(2)}</Text>
                        </div>
                        <div className={styles.productCategory}>
                            <TagsOutlined />
                            <Text type="secondary">{product.category}</Text>
                        </div>
                        <div className={styles.productRating}>
                            <Rate disabled allowHalf defaultValue={product.rating} className={styles.smallRating} />
                            <Text type="secondary">销量: {product.salesCount || 0}</Text>
                        </div>
                    </div>
                }
            />
        </Card>
    );
};

const ShopDetail = () => {
    const { storeId } = useParams();
    const navigate = useNavigate();

    const [loading, setLoading] = useState(true);
    const [productsLoading, setProductsLoading] = useState(true);
    const [store, setStore] = useState(null);
    const [products, setProducts] = useState([]);
    const [showMapModal, setShowMapModal] = useState(false);

    useEffect(() => {
        const fetchStoreDetails = async () => {
            try {
                setLoading(true);
                const response = await axios.get(`http://127.0.0.1:8080/api/stores/${storeId}`, {
                    withCredentials: true
                });
                setStore(response.data);
                setLoading(false);
            } catch (error) {
                console.error('Error fetching store details:', error);
                message.error('获取店铺详情失败');
                setLoading(false);
            }
        };

        const fetchStoreProducts = async () => {
            try {
                setProductsLoading(true);
                const response = await axios.get(`http://127.0.0.1:8080/api/products/store/${storeId}`, {
                    params: {
                        page: 0,
                        size: 20
                    },
                    withCredentials: true
                });
                setProducts(response.data.content || []);
                setProductsLoading(false);
            } catch (error) {
                console.error('Error fetching store products:', error);
                message.error('获取商品列表失败');
                setProductsLoading(false);
            }
        };

        fetchStoreDetails();
        fetchStoreProducts();
    }, [storeId]);

    const handleProductClick = (productId) => {
        navigate(`/shop/products/${productId}`);
    };

    const handleBackClick = () => {
        navigate(-1);
    };

    const openMapModal = () => {
        if (store && store.latitude && store.longitude) {
            setShowMapModal(true);
        } else {
            message.warning('店铺未设置位置信息');
        }
    };

    if (loading) {
        return (
            <div className={styles.loadingContainer}>
                <Spin size="large" />
            </div>
        );
    }

    if (!store) {
        return (
            <div className={styles.emptyContainer}>
                <Empty description="店铺不存在或已被删除" />
                <Button onClick={handleBackClick}>返回</Button>
            </div>
        );
    }

    return (
        <div className={styles.shopDetailContainer}>
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
                        <Breadcrumb.Item>店铺详情</Breadcrumb.Item>
                        <Breadcrumb.Item>{store.storeName}</Breadcrumb.Item>
                    </Breadcrumb>
                </div>

                <div className={styles.storeInfoCard}>
                    <div className={styles.storeHeader}>
                        <div className={styles.storeMainInfo}>
                            <div className={styles.storeTitleSection}>
                                <ShopOutlined className={styles.storeIcon} />
                                <Title level={3}>{store.storeName}</Title>
                                {store.status === 'ACTIVE' ? (
                                    <Badge color="green" text="营业中" className={styles.statusBadge} />
                                ) : (
                                    <Badge color="red" text="暂停营业" className={styles.statusBadge} />
                                )}
                            </div>
                            <div className={styles.ratingSection}>
                                <Rate disabled allowHalf defaultValue={store.rating} />
                                <Text type="secondary">订单量: {store.orderCount || 0}</Text>
                            </div>
                        </div>
                        <div className={styles.storeActionButtons}>
                            <Button
                                type="primary"
                                icon={<EnvironmentOutlined />}
                                onClick={openMapModal}
                            >
                                查看地图
                            </Button>
                        </div>
                    </div>

                    <Divider />

                    <Paragraph className={styles.storeDescription}>
                        {store.description || '暂无店铺描述'}
                    </Paragraph>

                    <div className={styles.storeDetails}>
                        <div className={styles.detailItem}>
                            <ClockCircleOutlined />
                            <Text>营业时间: {store.businessHours || '未设置'}</Text>
                        </div>
                        <div className={styles.detailItem}>
                            <EnvironmentOutlined />
                            <Text onClick={openMapModal} className={styles.locationText}>
                                地址: {store.location || '未设置'}
                            </Text>
                        </div>
                        {store.contactPhone && (
                            <div className={styles.detailItem}>
                                <PhoneOutlined />
                                <Text>联系电话: {store.contactPhone}</Text>
                            </div>
                        )}
                    </div>
                </div>

                <div className={styles.productsSection}>
                    <Title level={4} className={styles.sectionTitle}>
                        <ShoppingCartOutlined /> 商品列表
                    </Title>

                    {productsLoading ? (
                        <div className={styles.loadingContainer}>
                            <Spin size="large" />
                        </div>
                    ) : products.length > 0 ? (
                        <Row gutter={[16, 16]}>
                            {products.map((product) => (
                                <Col key={product.id} xs={24} sm={12} md={8} lg={6} xl={6}>
                                    <ProductCard
                                        product={product}
                                        onProductClick={handleProductClick}
                                    />
                                </Col>
                            ))}
                        </Row>
                    ) : (
                        <Empty description="暂无商品" />
                    )}
                </div>
            </div>

            {/* 位置地图模态框 */}
            {showMapModal && (
                <MapModal
                    isOpen={showMapModal}
                    onClose={() => setShowMapModal(false)}
                    address={store.location}
                    latitude={store.latitude}
                    longitude={store.longitude}
                />
            )}
        </div>
    );
};

export default ShopDetail;