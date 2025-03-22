import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
    Button, Card, message, Tooltip,
    Spin, Row, Col, Alert, Input, List
} from 'antd';
import {
    SyncOutlined, InfoCircleOutlined,
    EnvironmentOutlined, SearchOutlined, LoadingOutlined
} from '@ant-design/icons';
import AMapLoader from '@amap/amap-jsapi-loader';
import axios from 'axios';
import { useMapContext } from '../../context/MapContext';
import styles from '../../../assets/css/marketing/region/RegionRateCalculator.module.css';

const API_BASE_URL = 'http://127.0.0.1:8080/api/marketing';

// 高德地图容器组件 - 使用React.memo减少重渲染
const MapContainer = React.memo(({ id, onReady, children, style = {} }) => {
    const containerRef = useRef(null);

    // 通知父组件容器已就绪
    useEffect(() => {
        if (containerRef.current) {
            onReady(containerRef.current);
        }
    }, [onReady]);

    return (
        <div
            id={id}
            ref={containerRef}
            style={{
                width: '100%',
                height: '300px',
                position: 'relative',
                ...style
            }}
        >
            {children}
        </div>
    );
});

const RegionRateCalculator = () => {
    // 状态定义
    const [mapError, setMapError] = useState(null);
    const [loading, setLoading] = useState(false);
    const [mapStatus, setMapStatus] = useState('未初始化');

    // 地图容器和实例引用
    const pickupContainerRef = useRef(null);
    const deliveryContainerRef = useRef(null);
    const pickupMapRef = useRef(null);
    const deliveryMapRef = useRef(null);
    const mapInstancesReady = useRef(false);
    const AMapRef = useRef(null);

    // 搜索插件引用
    const pickupSearchRef = useRef(null);
    const deliverySearchRef = useRef(null);

    // 从MapContext中获取高德地图配置
    const mapConfig = useMapContext();

    // 计算两个地址间的配送费率
    const [rateQuery, setRateQuery] = useState({
        pickupCoordinate: '',
        deliveryCoordinate: ''
    });
    const [rateResult, setRateResult] = useState(null);
    const [rateLoading, setRateLoading] = useState(false);

    // 搜索相关状态
    const [pickupSearchText, setPickupSearchText] = useState('');
    const [deliverySearchText, setDeliverySearchText] = useState('');
    const [pickupSearching, setPickupSearching] = useState(false);
    const [deliverySearching, setDeliverySearching] = useState(false);
    const [pickupSearchResults, setPickupSearchResults] = useState([]);
    const [deliverySearchResults, setDeliverySearchResults] = useState([]);

    // 地图显示状态
    const [pickupMapReady, setPickupMapReady] = useState(false);
    const [deliveryMapReady, setDeliveryMapReady] = useState(false);

    // 防止并发操作的锁
    const operationInProgress = useRef(false);

    // 处理地图容器准备就绪
    const handlePickupContainerReady = useCallback((container) => {
        pickupContainerRef.current = container;
        console.log("取件点地图容器已就绪");
    }, []);

    const handleDeliveryContainerReady = useCallback((container) => {
        deliveryContainerRef.current = container;
        console.log("配送点地图容器已就绪");
    }, []);

    // 安全地销毁地图实例
    const destroyMapInstances = useCallback(() => {
        if (operationInProgress.current) return;
        operationInProgress.current = true;

        console.log("开始销毁地图实例");
        setMapStatus('正在清理地图资源...');

        // 重置显示状态，立即隐藏地图
        setPickupMapReady(false);
        setDeliveryMapReady(false);

        try {
            // 清理取件点地图
            if (pickupMapRef.current) {
                // 先移除所有事件处理器
                pickupMapRef.current.clearEvents();
                // 确保销毁前地图是稳定的
                pickupMapRef.current.setStatus({isHotspot: false});
                pickupMapRef.current.destroy();
                console.log("取件点地图销毁完成");
            }
        } catch (e) {
            console.error("销毁取件点地图时发生错误:", e);
        }

        try {
            // 清理配送点地图
            if (deliveryMapRef.current) {
                deliveryMapRef.current.clearEvents();
                deliveryMapRef.current.setStatus({isHotspot: false});
                deliveryMapRef.current.destroy();
                console.log("配送点地图销毁完成");
            }
        } catch (e) {
            console.error("销毁配送点地图时发生错误:", e);
        }

        // 重置所有引用
        pickupMapRef.current = null;
        deliveryMapRef.current = null;
        pickupSearchRef.current = null;
        deliverySearchRef.current = null;
        mapInstancesReady.current = false;

        // 等待DOM清理完成
        setTimeout(() => {
            operationInProgress.current = false;
            console.log("地图实例销毁完成");
        }, 300);
    }, []);

    // 组件卸载时清理地图资源
    useEffect(() => {
        return () => {
            destroyMapInstances();
        };
    }, [destroyMapInstances]);

    // 初始化地图
    const initializeMaps = useCallback(async () => {
        if (!mapConfig.key || operationInProgress.current ||
            !pickupContainerRef.current || !deliveryContainerRef.current) {
            return;
        }

        operationInProgress.current = true;
        setLoading(true);
        setMapStatus('正在初始化地图...');

        // 确保任何现有的地图实例被销毁
        if (pickupMapRef.current || deliveryMapRef.current) {
            destroyMapInstances();
            // 给DOM一些时间更新
            await new Promise(resolve => setTimeout(resolve, 300));
        }

        try {
            console.log("加载高德地图API");
            // 加载高德地图API
            const AMap = await AMapLoader.load({
                key: mapConfig.key,
                version: "2.0",
                plugins: ['AMap.Scale', 'AMap.ToolBar', 'AMap.PlaceSearch'],
            });

            AMapRef.current = AMap;
            setMapStatus('API加载成功，创建地图实例...');

            // 创建取件点地图
            console.log("创建取件点地图");
            const pickupMap = new AMap.Map(pickupContainerRef.current, {
                zoom: 11,
                center: [113.264385, 23.129112],
                viewMode: '2D'
            });

            // 创建配送点地图
            console.log("创建配送点地图");
            const deliveryMap = new AMap.Map(deliveryContainerRef.current, {
                zoom: 11,
                center: [113.264385, 23.129112],
                viewMode: '2D'
            });

            // 添加控件
            pickupMap.addControl(new AMap.Scale());
            pickupMap.addControl(new AMap.ToolBar());
            deliveryMap.addControl(new AMap.Scale());
            deliveryMap.addControl(new AMap.ToolBar());

            // 等待地图加载完成
            await Promise.all([
                new Promise(resolve => {
                    if (pickupMap.getStatus().isComplete) {
                        resolve();
                    } else {
                        pickupMap.on('complete', resolve);
                    }
                }),
                new Promise(resolve => {
                    if (deliveryMap.getStatus().isComplete) {
                        resolve();
                    } else {
                        deliveryMap.on('complete', resolve);
                    }
                })
            ]);

            // 创建搜索插件
            try {
                const pickupSearch = new AMap.PlaceSearch({
                    pageSize: 5,
                    pageIndex: 1,
                    city: "全国",
                    citylimit: false,
                    autoFitView: false
                });

                const deliverySearch = new AMap.PlaceSearch({
                    pageSize: 5,
                    pageIndex: 1,
                    city: "全国",
                    citylimit: false,
                    autoFitView: false
                });

                pickupSearchRef.current = pickupSearch;
                deliverySearchRef.current = deliverySearch;
            } catch (e) {
                console.error("初始化搜索插件失败:", e);
                message.warning("地址搜索功能初始化失败，但地图可以正常使用");
            }

            // 设置地图点击事件
            pickupMap.on('click', (e) => {
                if (!pickupMapRef.current) return;

                const coordinate = `${e.lnglat.getLng()},${e.lnglat.getLat()}`;
                setRateQuery(prev => ({
                    ...prev,
                    pickupCoordinate: coordinate
                }));

                // 标记点击位置
                pickupMap.clearMap();
                new AMap.Marker({
                    position: e.lnglat,
                    map: pickupMap,
                    title: '取件点'
                });
            });

            deliveryMap.on('click', (e) => {
                if (!deliveryMapRef.current) return;

                const coordinate = `${e.lnglat.getLng()},${e.lnglat.getLat()}`;
                setRateQuery(prev => ({
                    ...prev,
                    deliveryCoordinate: coordinate
                }));

                // 标记点击位置
                deliveryMap.clearMap();
                new AMap.Marker({
                    position: e.lnglat,
                    map: deliveryMap,
                    title: '配送点'
                });
            });

            // 保存实例引用
            pickupMapRef.current = pickupMap;
            deliveryMapRef.current = deliveryMap;
            mapInstancesReady.current = true;

            // 设置地图已准备就绪
            setMapStatus('地图加载完成');

            // 等待DOM更新，然后显示地图
            setTimeout(() => {
                setPickupMapReady(true);
                setDeliveryMapReady(true);
                setLoading(false);
                operationInProgress.current = false;
            }, 300);

        } catch (error) {
            console.error("地图初始化失败:", error);
            setMapError(`地图初始化失败: ${error.message || '未知错误'}`);
            setLoading(false);
            operationInProgress.current = false;

            // 确保清理任何部分创建的实例
            destroyMapInstances();
        }
    }, [mapConfig.key, destroyMapInstances]);

    // 当配置或容器可用时，初始化地图
    useEffect(() => {
        if (mapConfig.key && pickupContainerRef.current && deliveryContainerRef.current && !mapInstancesReady.current) {
            // 延迟初始化，确保DOM已完全渲染
            const timer = setTimeout(() => {
                initializeMaps();
            }, 500);

            return () => clearTimeout(timer);
        }
    }, [mapConfig.key, initializeMaps]);

    // 处理地图重新加载
    const handleReloadMap = useCallback(() => {
        if (operationInProgress.current) {
            message.info("操作正在进行中，请稍候再试");
            return;
        }

        message.info("正在重新加载地图...");

        // 重新初始化地图
        initializeMaps();
    }, [initializeMaps]);

    // 计算费率
    const calculateRate = async () => {
        const { pickupCoordinate, deliveryCoordinate } = rateQuery;

        if (!pickupCoordinate || !deliveryCoordinate) {
            message.warning('请先在地图上选择取件点和配送点');
            return;
        }

        setRateLoading(true);
        try {
            const response = await axios.get(
                `${API_BASE_URL}/regions/rate`,
                {
                    params: { pickupCoordinate, deliveryCoordinate },
                    withCredentials: true
                }
            );

            if (response.data.success) {
                setRateResult(response.data.data);
            } else {
                message.error(`计算费率失败: ${response.data.message}`);
            }
        } catch (error) {
            console.error('计算费率出错:', error);
            message.error('计算费率出错，请重试');
        } finally {
            setRateLoading(false);
        }
    };

    // 重置费率计算
    const resetRateCalculation = () => {
        setRateQuery({
            pickupCoordinate: '',
            deliveryCoordinate: ''
        });
        setRateResult(null);
        setPickupSearchText('');
        setDeliverySearchText('');
        setPickupSearchResults([]);
        setDeliverySearchResults([]);

        // 清除地图上的标记
        if (pickupMapRef.current) {
            pickupMapRef.current.clearMap();
        }
        if (deliveryMapRef.current) {
            deliveryMapRef.current.clearMap();
        }
    };

    // 处理取件点搜索
    const handlePickupSearch = () => {
        if (!pickupSearchText || !pickupSearchRef.current || !pickupMapRef.current) {
            if (!pickupSearchText) {
                message.info('请输入要搜索的取件点地址');
            } else if (!pickupMapRef.current || !pickupSearchRef.current) {
                message.error('地图或搜索服务尚未准备好，请稍后再试');
            }
            return;
        }

        setPickupSearching(true);
        setPickupSearchResults([]);

        // 使用PlaceSearch进行搜索
        pickupSearchRef.current.search(pickupSearchText, (status, result) => {
            setPickupSearching(false);

            if (status === 'complete' && result.info === 'OK') {
                if (result.poiList && result.poiList.pois && result.poiList.pois.length > 0) {
                    setPickupSearchResults(result.poiList.pois);
                } else {
                    message.info('未找到相关地址');
                    setPickupSearchResults([]);
                }
            } else {
                console.error('取件点搜索失败:', result);
                message.error('搜索失败，请重试');
                setPickupSearchResults([]);
            }
        });
    };

    // 处理配送点搜索
    const handleDeliverySearch = () => {
        if (!deliverySearchText || !deliverySearchRef.current || !deliveryMapRef.current) {
            if (!deliverySearchText) {
                message.info('请输入要搜索的配送点地址');
            } else if (!deliveryMapRef.current || !deliverySearchRef.current) {
                message.error('地图或搜索服务尚未准备好，请稍后再试');
            }
            return;
        }

        setDeliverySearching(true);
        setDeliverySearchResults([]);

        // 使用PlaceSearch进行搜索
        deliverySearchRef.current.search(deliverySearchText, (status, result) => {
            setDeliverySearching(false);

            if (status === 'complete' && result.info === 'OK') {
                if (result.poiList && result.poiList.pois && result.poiList.pois.length > 0) {
                    setDeliverySearchResults(result.poiList.pois);
                } else {
                    message.info('未找到相关地址');
                    setDeliverySearchResults([]);
                }
            } else {
                console.error('配送点搜索失败:', result);
                message.error('搜索失败，请重试');
                setDeliverySearchResults([]);
            }
        });
    };

    // 处理选择取件点地址
    const handleSelectPickupAddress = (poi) => {
        if (!pickupMapRef.current || !poi || !poi.location) return;

        // 清空搜索结果（隐藏列表）
        setPickupSearchResults([]);

        // 设置坐标
        const coordinate = `${poi.location.lng},${poi.location.lat}`;
        setRateQuery(prev => ({
            ...prev,
            pickupCoordinate: coordinate
        }));

        // 移动地图到选择的位置
        pickupMapRef.current.setCenter([poi.location.lng, poi.location.lat]);
        // 设置适当的缩放级别
        pickupMapRef.current.setZoom(15);

        // 清除之前的标记点
        pickupMapRef.current.clearMap();

        // 添加新的标记点
        if (AMapRef.current) {
            new AMapRef.current.Marker({
                position: [poi.location.lng, poi.location.lat],
                map: pickupMapRef.current,
                title: '取件点'
            });
        }

        message.success(`已将取件点设置为: ${poi.name}`);
    };

    // 处理选择配送点地址
    const handleSelectDeliveryAddress = (poi) => {
        if (!deliveryMapRef.current || !poi || !poi.location) return;

        // 清空搜索结果（隐藏列表）
        setDeliverySearchResults([]);

        // 设置坐标
        const coordinate = `${poi.location.lng},${poi.location.lat}`;
        setRateQuery(prev => ({
            ...prev,
            deliveryCoordinate: coordinate
        }));

        // 移动地图到选择的位置
        deliveryMapRef.current.setCenter([poi.location.lng, poi.location.lat]);
        // 设置适当的缩放级别
        deliveryMapRef.current.setZoom(15);

        // 清除之前的标记点
        deliveryMapRef.current.clearMap();

        // 添加新的标记点
        if (AMapRef.current) {
            new AMapRef.current.Marker({
                position: [poi.location.lng, poi.location.lat],
                map: deliveryMapRef.current,
                title: '配送点'
            });
        }

        message.success(`已将配送点设置为: ${poi.name}`);
    };

    // 处理输入框变化
    const handlePickupInputChange = (e) => {
        setPickupSearchText(e.target.value);
    };

    const handleDeliveryInputChange = (e) => {
        setDeliverySearchText(e.target.value);
    };

    // 处理按键按下 - 回车键搜索
    const handlePickupKeyDown = (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            handlePickupSearch();
        }
    };

    const handleDeliveryKeyDown = (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleDeliverySearch();
        }
    };

    // 渲染地图错误状态
    const renderMapError = () => {
        if (!mapError) return null;

        return (
            <Alert
                message="地图加载失败"
                description={
                    <div>
                        <p>{mapError}</p>
                        <Button type="primary" size="small" onClick={handleReloadMap} style={{ marginTop: 8 }}>
                            重新加载地图
                        </Button>
                    </div>
                }
                type="error"
                showIcon
                style={{ marginBottom: 16 }}
            />
        );
    };

    return (
        <Card
            title={
                <div>
                    <EnvironmentOutlined /> 区域费率测试工具
                    <Tooltip title="选择取件点和配送点，计算对应的区域费率倍数">
                        <InfoCircleOutlined style={{ marginLeft: 8 }} />
                    </Tooltip>
                    <span style={{ fontSize: '14px', marginLeft: '16px', color: '#888' }}>
                        加载状态: {mapStatus}
                    </span>
                </div>
            }
            className={styles.rateTestCard}
        >
            {renderMapError()}

            <div className={styles.mapContainer}>
                <Row gutter={16}>
                    <Col span={24} md={11}>
                        <div className={styles.mapLabel}>取件点 (点击地图选择)</div>

                        {/* 取件点搜索框 */}
                        <div className={styles.searchBox}>
                            <Input
                                placeholder="输入取件点地址搜索"
                                value={pickupSearchText}
                                onChange={handlePickupInputChange}
                                onKeyDown={handlePickupKeyDown}
                                disabled={!pickupMapRef.current || !pickupSearchRef.current}
                                suffix={
                                    pickupSearching ? (
                                        <LoadingOutlined />
                                    ) : (
                                        <SearchOutlined
                                            onClick={handlePickupSearch}
                                            style={{ cursor: 'pointer', color: '#1890ff' }}
                                        />
                                    )
                                }
                                className={styles.searchInput}
                            />

                            {/* 取件点搜索结果列表 */}
                            {pickupSearchResults.length > 0 && (
                                <div className={styles.searchResultsContainer}>
                                    <List
                                        size="small"
                                        bordered
                                        dataSource={pickupSearchResults}
                                        renderItem={item => (
                                            <List.Item
                                                className={styles.searchResultItem}
                                                onClick={() => handleSelectPickupAddress(item)}
                                            >
                                                <div className={styles.poiItem}>
                                                    <div className={styles.poiName}>
                                                        <EnvironmentOutlined style={{ marginRight: 5, color: '#1890ff' }} />
                                                        {item.name}
                                                    </div>
                                                    <div className={styles.poiAddress}>
                                                        {item.address || '地址不详'}
                                                    </div>
                                                </div>
                                            </List.Item>
                                        )}
                                    />
                                </div>
                            )}
                        </div>

                        {/* 地图容器 */}
                        <div className={styles.miniMap}>
                            <MapContainer
                                id="pickup-map-container"
                                onReady={handlePickupContainerReady}
                            >
                                {!pickupMapReady && (
                                    <div
                                        style={{
                                            position: 'absolute',
                                            top: 0, left: 0, right: 0, bottom: 0,
                                            background: '#f0f2f5',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            zIndex: 10
                                        }}
                                    >
                                        <Spin tip="加载地图中..." />
                                    </div>
                                )}
                            </MapContainer>
                        </div>

                        <div className={styles.coordinateText}>
                            {rateQuery.pickupCoordinate || '尚未选择取件点'}
                        </div>
                    </Col>

                    <Col span={24} md={11}>
                        <div className={styles.mapLabel}>配送点 (点击地图选择)</div>

                        {/* 配送点搜索框 */}
                        <div className={styles.searchBox}>
                            <Input
                                placeholder="输入配送点地址搜索"
                                value={deliverySearchText}
                                onChange={handleDeliveryInputChange}
                                onKeyDown={handleDeliveryKeyDown}
                                disabled={!deliveryMapRef.current || !deliverySearchRef.current}
                                suffix={
                                    deliverySearching ? (
                                        <LoadingOutlined />
                                    ) : (
                                        <SearchOutlined
                                            onClick={handleDeliverySearch}
                                            style={{ cursor: 'pointer', color: '#1890ff' }}
                                        />
                                    )
                                }
                                className={styles.searchInput}
                            />

                            {/* 配送点搜索结果列表 */}
                            {deliverySearchResults.length > 0 && (
                                <div className={styles.searchResultsContainer}>
                                    <List
                                        size="small"
                                        bordered
                                        dataSource={deliverySearchResults}
                                        renderItem={item => (
                                            <List.Item
                                                className={styles.searchResultItem}
                                                onClick={() => handleSelectDeliveryAddress(item)}
                                            >
                                                <div className={styles.poiItem}>
                                                    <div className={styles.poiName}>
                                                        <EnvironmentOutlined style={{ marginRight: 5, color: '#1890ff' }} />
                                                        {item.name}
                                                    </div>
                                                    <div className={styles.poiAddress}>
                                                        {item.address || '地址不详'}
                                                    </div>
                                                </div>
                                            </List.Item>
                                        )}
                                    />
                                </div>
                            )}
                        </div>

                        {/* 地图容器 */}
                        <div className={styles.miniMap}>
                            <MapContainer
                                id="delivery-map-container"
                                onReady={handleDeliveryContainerReady}
                            >
                                {!deliveryMapReady && (
                                    <div
                                        style={{
                                            position: 'absolute',
                                            top: 0, left: 0, right: 0, bottom: 0,
                                            background: '#f0f2f5',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            zIndex: 10
                                        }}
                                    >
                                        <Spin tip="加载地图中..." />
                                    </div>
                                )}
                            </MapContainer>
                        </div>

                        <div className={styles.coordinateText}>
                            {rateQuery.deliveryCoordinate || '尚未选择配送点'}
                        </div>
                    </Col>

                    <Col span={24} md={2} className={styles.rateActions}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <Button
                                type="primary"
                                onClick={calculateRate}
                                loading={rateLoading}
                                disabled={!rateQuery.pickupCoordinate || !rateQuery.deliveryCoordinate || loading}
                                icon={<SyncOutlined />}
                            >
                                计算费率
                            </Button>
                            <Button onClick={resetRateCalculation}>
                                重置
                            </Button>
                            <Button
                                onClick={handleReloadMap}
                                type="dashed"
                                disabled={loading || operationInProgress.current}
                            >
                                重新加载地图
                            </Button>
                        </div>
                    </Col>
                </Row>
            </div>

            {rateResult && (
                <div className={styles.rateResult}>
                    <Alert
                        message={
                            <div>
                                <strong>费率计算结果</strong>: 最终费率倍数 <span style={{ fontSize: '16px', color: '#1890ff', fontWeight: 'bold' }}>{rateResult.finalRate.toFixed(2)}x</span>
                            </div>
                        }
                        description={
                            <div>
                                {rateResult.description}<br/>
                                {rateResult.isCrossRegion && '注意: 这是跨区域配送，费率为两个区域的平均值'}
                            </div>
                        }
                        type="info"
                        showIcon
                    />
                </div>
            )}
        </Card>
    );
};

export default RegionRateCalculator;