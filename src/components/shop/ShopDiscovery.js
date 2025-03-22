// src/components/shop/ShopDiscovery.js
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
    Card, Typography, Rate, Input,
    Row, Col, Button, Spin, Empty, Tabs, message,
    Badge
} from 'antd';
import {
    ShopOutlined, EnvironmentOutlined, PhoneOutlined,
    SearchOutlined, ClockCircleOutlined
} from '@ant-design/icons';
import Navbar from '../base/Navbar';
import styles from '../../assets/css/shop/ShopDiscovery.module.css';
import { useMapContext } from '../context/MapContext';

const { Title, Text, Paragraph } = Typography;
const { Search } = Input;
const { TabPane } = Tabs;

const ShopDiscovery = () => {
    const [loading, setLoading] = useState(true);
    const [recommendedStores, setRecommendedStores] = useState([]);
    const [nearbyStores, setNearbyStores] = useState([]);
    const [searchResults, setSearchResults] = useState([]);
    const [isSearchMode, setIsSearchMode] = useState(false);
    const [userLocation, setUserLocation] = useState(null);
    const [locationLoading, setLocationLoading] = useState(false);
    const navigate = useNavigate();
    const { key: mapKey } = useMapContext();

    // 获取用户位置
    const getUserLocation = () => {
        setLocationLoading(true);
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    const location = {
                        latitude: position.coords.latitude,
                        longitude: position.coords.longitude
                    };
                    setUserLocation(location);
                    fetchNearbyStores(location);
                    setLocationLoading(false);
                },
                (error) => {
                    console.error('Error getting user location:', error);
                    message.warning('无法获取您的位置，请检查定位权限');
                    setLocationLoading(false);
                    // 使用默认位置（可以设为校园中心位置）
                    const defaultLocation = { latitude: 31.2891, longitude: 120.5557 }; // 示例坐标
                    setUserLocation(defaultLocation);
                    fetchNearbyStores(defaultLocation);
                }
            );
        } else {
            message.error('您的浏览器不支持定位功能');
            setLocationLoading(false);
        }
    };

    // 获取推荐店铺
    const fetchRecommendedStores = async () => {
        try {
            setLoading(true);
            const response = await axios.get('http://127.0.0.1:8080/api/stores', {
                withCredentials: true
            });
            setRecommendedStores(response.data.content || []);
            setLoading(false);
        } catch (error) {
            console.error('Error fetching recommended stores:', error);
            message.error('获取推荐店铺失败');
            setLoading(false);
        }
    };

    // 获取附近店铺
    const fetchNearbyStores = async (location) => {
        if (!location) return;

        try {
            setLoading(true);
            const response = await axios.get('http://127.0.0.1:8080/api/stores/nearby', {
                params: {
                    latitude: location.latitude,
                    longitude: location.longitude,
                    distance: 3.0 // 3公里范围内
                },
                withCredentials: true
            });
            setNearbyStores(response.data || []);
            setLoading(false);
        } catch (error) {
            console.error('Error fetching nearby stores:', error);
            message.error('获取附近店铺失败');
            setLoading(false);
        }
    };

    // 搜索店铺
    const searchStores = async (keyword) => {
        if (!keyword) {
            setIsSearchMode(false);
            return;
        }

        try {
            setLoading(true);
            setIsSearchMode(true);
            const response = await axios.get('http://127.0.0.1:8080/api/stores/search', {
                params: {
                    keyword,
                    page: 0,
                    size: 10
                },
                withCredentials: true
            });
            setSearchResults(response.data.content || []);
            setLoading(false);
        } catch (error) {
            console.error('Error searching stores:', error);
            message.error('搜索店铺失败');
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchRecommendedStores();
        getUserLocation();
    }, []);

    const handleStoreClick = (storeId) => {
        navigate(`/shop/stores/${storeId}`);
    };

    const renderStoreCard = (store) => (
        <Card
            className={styles.storeCard}
            hoverable
            onClick={() => handleStoreClick(store.id)}
        >
            <div className={styles.storeCardContent}>
                <div className={styles.storeHeader}>
                    <div className={styles.storeName}>
                        <ShopOutlined className={styles.storeIcon} />
                        <Text strong>{store.storeName}</Text>
                        {store.isOpen && <Badge color="green" text="营业中" className={styles.statusBadge} />}
                    </div>
                    <Rate disabled allowHalf defaultValue={store.rating} className={styles.ratingStars} />
                </div>

                <Paragraph ellipsis={{ rows: 2 }} className={styles.storeDescription}>
                    {store.description || '暂无描述'}
                </Paragraph>

                <div className={styles.storeDetails}>
                    <div className={styles.detailItem}>
                        <ClockCircleOutlined />
                        <Text type="secondary">{store.businessHours || '工作时间未设置'}</Text>
                    </div>
                    <div className={styles.detailItem}>
                        <EnvironmentOutlined />
                        <Text type="secondary" ellipsis>{store.location || '位置未设置'}</Text>
                    </div>
                    {store.contactPhone && (
                        <div className={styles.detailItem}>
                            <PhoneOutlined />
                            <Text type="secondary">{store.contactPhone}</Text>
                        </div>
                    )}
                </div>

                <div className={styles.orderInfo}>
                    <Text type="secondary">订单量: {store.orderCount || 0}</Text>
                    {userLocation && store.latitude && store.longitude && (
                        <Text type="secondary">
                            距离: {calculateDistance(userLocation, {latitude: store.latitude, longitude: store.longitude}).toFixed(1)} 公里
                        </Text>
                    )}
                </div>
            </div>
        </Card>
    );

    // 计算两点之间的距离（公里）
    const calculateDistance = (point1, point2) => {
        const R = 6371; // 地球半径，单位为公里
        const dLat = (point2.latitude - point1.latitude) * Math.PI / 180;
        const dLon = (point2.longitude - point1.longitude) * Math.PI / 180;
        const a =
            Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(point1.latitude * Math.PI / 180) * Math.cos(point2.latitude * Math.PI / 180) *
            Math.sin(dLon/2) * Math.sin(dLon/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        return R * c;
    };

    return (
        <div className={styles.shopDiscoveryContainer}>
            <Navbar />
            <div className={styles.contentWrapper}>
                <div className={styles.searchSection}>
                    <Title level={2} className={styles.pageTitle}>校园商城</Title>
                    <Search
                        placeholder="搜索店铺名称"
                        allowClear
                        enterButton={<SearchOutlined />}
                        size="large"
                        onSearch={searchStores}
                        className={styles.searchInput}
                    />
                </div>

                <div className={styles.mainContent}>
                    {isSearchMode ? (
                        <div className={styles.searchResults}>
                            <div className={styles.sectionHeader}>
                                <Title level={4}>搜索结果</Title>
                                <Button type="link" onClick={() => setIsSearchMode(false)}>
                                    返回推荐
                                </Button>
                            </div>

                            {loading ? (
                                <div className={styles.loadingContainer}>
                                    <Spin size="large" />
                                </div>
                            ) : searchResults.length > 0 ? (
                                <Row gutter={[16, 16]}>
                                    {searchResults.map((store) => (
                                        <Col key={store.id} xs={24} sm={12} md={8} lg={8} xl={6}>
                                            {renderStoreCard(store)}
                                        </Col>
                                    ))}
                                </Row>
                            ) : (
                                <Empty description="没有找到相关店铺" />
                            )}
                        </div>
                    ) : (
                        <Tabs defaultActiveKey="recommended" className={styles.storeTabs}>
                            <TabPane tab="推荐店铺" key="recommended">
                                {loading ? (
                                    <div className={styles.loadingContainer}>
                                        <Spin size="large" />
                                    </div>
                                ) : recommendedStores.length > 0 ? (
                                    <Row gutter={[16, 16]}>
                                        {recommendedStores.map((store) => (
                                            <Col key={store.id} xs={24} sm={12} md={8} lg={8} xl={6}>
                                                {renderStoreCard(store)}
                                            </Col>
                                        ))}
                                    </Row>
                                ) : (
                                    <Empty description="暂无推荐店铺" />
                                )}
                            </TabPane>

                            <TabPane tab="附近店铺" key="nearby">
                                <div className={styles.locationSection}>
                                    <Button
                                        type="primary"
                                        icon={<EnvironmentOutlined />}
                                        loading={locationLoading}
                                        onClick={getUserLocation}
                                    >
                                        获取当前位置
                                    </Button>
                                    {userLocation && (
                                        <Text type="secondary">
                                            当前位置: {userLocation.latitude.toFixed(4)}, {userLocation.longitude.toFixed(4)}
                                        </Text>
                                    )}
                                </div>

                                {loading ? (
                                    <div className={styles.loadingContainer}>
                                        <Spin size="large" />
                                    </div>
                                ) : nearbyStores.length > 0 ? (
                                    <Row gutter={[16, 16]}>
                                        {nearbyStores.map((store) => (
                                            <Col key={store.id} xs={24} sm={12} md={8} lg={8} xl={6}>
                                                {renderStoreCard(store)}
                                            </Col>
                                        ))}
                                    </Row>
                                ) : (
                                    <Empty description={userLocation ? "附近暂无店铺" : "请先获取位置"} />
                                )}
                            </TabPane>
                        </Tabs>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ShopDiscovery;