import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
    Button, Modal, Form, Input, InputNumber,
    message, Alert, Switch, Spin, Row, Col
} from 'antd';
import {
    PlusOutlined, EditOutlined, UndoOutlined, BugOutlined,
    SearchOutlined, EnvironmentOutlined
} from '@ant-design/icons';
import AMapLoader from '@amap/amap-jsapi-loader';
import axios from 'axios';
import { useMapContext } from '../../context/MapContext';
import styles from '../../../assets/css/marketing/region/RegionCreator.module.css';

const API_BASE_URL = 'http://127.0.0.1:8080/api/marketing';

const RegionCreator = ({ onRegionCreated }) => {
    // 状态定义
    const [loading, setLoading] = useState(false);
    const [mapLoading, setMapLoading] = useState(false);
    const [modalVisible, setModalVisible] = useState(false);
    const [boundaryPoints, setBoundaryPoints] = useState([]);
    const [mapInstance, setMapInstance] = useState(null);
    const [AMapRef, setAMapRef] = useState(null);
    const [mouseTool, setMouseTool] = useState(null);
    const [drawingPolygon, setDrawingPolygon] = useState(null);
    const [mapError, setMapError] = useState(null);
    const [mapFullyLoaded, setMapFullyLoaded] = useState(false);
    const [debugInfo, setDebugInfo] = useState({
        mapContainerExists: false,
        mapContainerSize: { width: 0, height: 0 },
        initializationAttempts: 0,
        keyStatus: 'checking'
    });
    const [showDebug, setShowDebug] = useState(false);

    // 地址搜索相关状态
    const [searchAddress, setSearchAddress] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [searchStatus, setSearchStatus] = useState('');
    const [selectedAddress, setSelectedAddress] = useState(null);
    const [placeSearch, setPlaceSearch] = useState(null);

    // 地图容器引用
    const mapContainerRef = useRef(null);
    const mapInstanceRef = useRef(null);
    const mouseToolRef = useRef(null);
    const AMapLibRef = useRef(null);

    // 使用 useRef 存储函数引用，解决循环依赖问题
    const initModalMapRef = useRef(null);
    const checkMapContainerRef = useRef(null);

    // 从MapContext中获取高德地图配置
    const mapConfig = useMapContext();
    const [mapKeyReady, setMapKeyReady] = useState(false);

    const [form] = Form.useForm();

    // 加载和初始化MouseTool的Promise函数
    const loadMouseTool = async (AMapInstance, map) => {
        return new Promise((resolve, reject) => {
            if (!AMapInstance) {
                reject(new Error('AMap实例不可用'));
                return;
            }

            if (AMapInstance.MouseTool) {
                try {
                    const tool = new AMapInstance.MouseTool(map);
                    resolve(tool);
                } catch (error) {
                    reject(error);
                }
            } else if (AMapInstance.plugin) {
                try {
                    AMapInstance.plugin(['AMap.MouseTool'], () => {
                        if (AMapInstance.MouseTool) {
                            const tool = new AMapInstance.MouseTool(map);
                            resolve(tool);
                        } else {
                            reject(new Error('MouseTool插件加载失败'));
                        }
                    });
                } catch (error) {
                    reject(error);
                }
            } else {
                reject(new Error('AMap插件方法不可用'));
            }
        });
    };

    // 加载和初始化PlaceSearch插件的Promise函数
    const loadPlaceSearch = async (AMapInstance, map) => {
        return new Promise((resolve, reject) => {
            if (!AMapInstance) {
                reject(new Error('AMap实例不可用'));
                return;
            }

            if (AMapInstance.PlaceSearch) {
                try {
                    const placeSearch = new AMapInstance.PlaceSearch({
                        map: map,
                        pageSize: 10
                    });
                    resolve(placeSearch);
                } catch (error) {
                    reject(error);
                }
            } else if (AMapInstance.plugin) {
                try {
                    AMapInstance.plugin(['AMap.PlaceSearch'], () => {
                        if (AMapInstance.PlaceSearch) {
                            const placeSearch = new AMapInstance.PlaceSearch({
                                map: map,
                                pageSize: 10
                            });
                            resolve(placeSearch);
                        } else {
                            reject(new Error('PlaceSearch插件加载失败'));
                        }
                    });
                } catch (error) {
                    reject(error);
                }
            } else {
                reject(new Error('AMap插件方法不可用'));
            }
        });
    };

    // 改进的地图初始化函数
    const initMap = useCallback(async (containerRef, center = [113.264385, 23.129112], zoom = 12) => {
        if (!containerRef.current) {
            console.warn('[RegionCreator] 地图容器元素不存在');
            setDebugInfo(prev => ({
                ...prev,
                mapContainerExists: false,
                initializationAttempts: prev.initializationAttempts + 1
            }));
            return null;
        }

        if (!mapKeyReady || !mapConfig.key) {
            setMapError('正在加载地图API密钥，请稍候...');
            setDebugInfo(prev => ({
                ...prev,
                keyStatus: 'waiting',
                initializationAttempts: prev.initializationAttempts + 1
            }));
            return null;
        }

        // 检查容器尺寸是否正常
        const containerWidth = containerRef.current.clientWidth;
        const containerHeight = containerRef.current.clientHeight;

        setDebugInfo(prev => ({
            ...prev,
            mapContainerSize: { width: containerWidth, height: containerHeight },
            initializationAttempts: prev.initializationAttempts + 1
        }));

        if (containerWidth === 0 || containerHeight === 0) {
            console.warn(`[RegionCreator] 地图容器尺寸异常: ${containerWidth}x${containerHeight}`);
            setMapError('地图容器尺寸异常，请调整窗口大小后重试');
            return null;
        }

        try {
            setMapLoading(true);
            setMapError(null);

            console.log(`[RegionCreator] 初始化地图, 容器尺寸: ${containerWidth}x${containerHeight}`);

            // 一次性加载AMap及所有所需插件
            const AMap = await AMapLoader.load({
                key: mapConfig.key,
                version: "2.0",
                plugins: [
                    'AMap.MouseTool',
                    'AMap.Scale',
                    'AMap.ToolBar',
                    'AMap.PlaceSearch', // 添加PlaceSearch插件
                ],
            });

            // 在React状态更新前，直接保存AMap引用到ref中
            AMapLibRef.current = AMap;

            // 在状态中保存AMap引用 - 这是必要的，确保React组件捕获到AMap的加载和更新
            setAMapRef(AMap);

            // 创建地图实例
            const map = new AMap.Map(containerRef.current, {
                zoom: zoom,
                center: center,
                viewMode: '2D'
            });

            // 添加比例尺和缩放控件
            map.addControl(new AMap.Scale());
            map.addControl(new AMap.ToolBar());

            // 等待地图完全加载
            if (!map.getStatus().isComplete) {
                await new Promise(resolve => {
                    map.on('complete', resolve);
                });
            }

            console.log('[RegionCreator] 地图加载完成');
            setMapLoading(false);
            return map;
        } catch (error) {
            console.error('[RegionCreator] 加载地图出错:', error);
            setMapError(`加载地图出错: ${error.message || '未知错误'}`);
            message.error('加载地图出错，请检查网络连接或刷新页面');
            return null;
        } finally {
            // 确保在任何情况下都关闭加载状态
            setTimeout(() => {
                setMapLoading(false);
            }, 1000);
        }
    }, [mapKeyReady, mapConfig]);

    // 使用 useCallback 定义 checkMapContainer，但同时将函数引用存储在 ref 中
    const checkMapContainer = useCallback(() => {
        if (mapContainerRef.current) {
            const width = mapContainerRef.current.clientWidth;
            const height = mapContainerRef.current.clientHeight;

            console.log(`[RegionCreator] 地图容器尺寸: ${width}x${height}`);

            setDebugInfo(prev => ({
                ...prev,
                mapContainerExists: true,
                mapContainerSize: { width, height }
            }));

            // 如果容器尺寸正常，尝试初始化地图
            if (width > 0 && height > 0) {
                console.log("[RegionCreator] 地图容器已就绪，开始初始化地图");
                if (initModalMapRef.current) {
                    initModalMapRef.current();
                }
            } else {
                console.log("[RegionCreator] 地图容器尺寸异常，等待重试");
                // 延迟500ms再次检查
                setTimeout(() => {
                    if (checkMapContainerRef.current) {
                        checkMapContainerRef.current();
                    }
                }, 500);
            }
        } else {
            console.log("[RegionCreator] 地图容器不存在，等待重试");
            setDebugInfo(prev => ({...prev, mapContainerExists: false}));
            // 延迟500ms再次检查
            setTimeout(() => {
                if (checkMapContainerRef.current) {
                    checkMapContainerRef.current();
                }
            }, 500);
        }
    }, []);  // 空依赖数组，因为我们用 ref 解决了依赖问题

    // 保存 checkMapContainer 到 ref
    useEffect(() => {
        checkMapContainerRef.current = checkMapContainer;
    }, [checkMapContainer]);

    // 在模态框完全打开后初始化地图 - 增强版
    const initModalMap = useCallback(async () => {
        if (!mapKeyReady) {
            setMapError('正在加载地图API密钥，请稍候...');
            return;
        }

        console.log("[RegionCreator] 开始初始化模态框地图");

        // 使用更长的延迟，确保DOM已完全渲染
        setTimeout(async () => {
            try {
                if (!mapContainerRef.current) {
                    console.error('[RegionCreator] 地图容器DOM元素未找到');
                    setMapError('地图容器加载失败，请关闭后重试');
                    return;
                }

                // 检查容器尺寸
                const containerWidth = mapContainerRef.current.clientWidth;
                const containerHeight = mapContainerRef.current.clientHeight;

                if (containerWidth === 0 || containerHeight === 0) {
                    console.warn('[RegionCreator] 地图容器尺寸为0:', containerWidth, containerHeight);
                    setMapError('地图容器尺寸异常，请关闭后调整窗口大小再重试');

                    // 尝试再次检查容器
                    setTimeout(() => {
                        if (checkMapContainerRef.current) {
                            checkMapContainerRef.current();
                        }
                    }, 1000);
                    return;
                }

                console.log('[RegionCreator] 初始化新增模态框地图, 容器尺寸:', containerWidth, containerHeight);

                // 如果已有地图实例，先销毁
                if (mapInstanceRef.current) {
                    mapInstanceRef.current.destroy();
                    mapInstanceRef.current = null;
                    mouseToolRef.current = null;
                    setDrawingPolygon(null);
                }

                const map = await initMap(mapContainerRef);
                if (map) {
                    // 同时更新ref和state
                    mapInstanceRef.current = map;
                    setMapInstance(map);

                    try {
                        // 初始化MouseTool
                        const mTool = await loadMouseTool(AMapLibRef.current, map);
                        mouseToolRef.current = mTool;
                        setMouseTool(mTool);

                        // 监听多边形绘制完成事件
                        mTool.on('draw', function(event) {
                            if (event.obj && event.obj.getPath) {
                                const path = event.obj.getPath();
                                const points = path.map(point => `${point.lng},${point.lat}`);
                                setBoundaryPoints(points);
                                setDrawingPolygon(event.obj);
                                message.success(`成功绘制区域，共${points.length}个边界点`);
                            }
                        });

                        // 初始化PlaceSearch
                        const pSearch = await loadPlaceSearch(AMapLibRef.current, map);
                        setPlaceSearch(pSearch);

                        setMapFullyLoaded(true);
                        console.log('[RegionCreator] 地图和绘图工具初始化成功');
                    } catch (toolError) {
                        console.error('[RegionCreator] 创建地图工具实例失败:', toolError);
                        setMapError(`创建地图工具失败: ${toolError.message}`);
                    }
                }
            } catch (error) {
                console.error('[RegionCreator] 初始化模态框地图失败:', error);
                setMapError(`初始化地图失败: ${error.message || '未知错误'}`);
            }
        }, 1500); // 增加延迟到1500ms
    }, [mapKeyReady, initMap]); // 从依赖数组中移除 checkMapContainer

    // 保存 initModalMap 到 ref
    useEffect(() => {
        initModalMapRef.current = initModalMap;
    }, [initModalMap]);

    // 监控mapConfig中的key是否已经加载完成
    useEffect(() => {
        if (mapConfig && mapConfig.key && mapConfig.key.length > 0) {
            console.log("[RegionCreator] 高德地图API密钥已加载");
            setMapKeyReady(true);
            setMapError(null);
            setDebugInfo(prev => ({...prev, keyStatus: 'ready'}));
        } else {
            console.log("[RegionCreator] 等待高德地图API密钥加载...");
            setMapKeyReady(false);
            setDebugInfo(prev => ({...prev, keyStatus: 'loading'}));
        }
    }, [mapConfig]);

    // 监听模态框可见性变化
    useEffect(() => {
        if (modalVisible) {
            console.log("[RegionCreator] 模态框已打开，准备初始化地图");
            // 打开模态框后延迟检查地图容器
            const timer = setTimeout(() => {
                if (checkMapContainerRef.current) {
                    checkMapContainerRef.current();
                }
            }, 500);

            return () => clearTimeout(timer);
        } else {
            // 模态框关闭时清理资源
            console.log("[RegionCreator] 模态框已关闭，清理资源");
            if (mapInstanceRef.current) {
                console.log("[RegionCreator] 销毁地图实例");
                mapInstanceRef.current.destroy();
                mapInstanceRef.current = null;
                mouseToolRef.current = null;
                setMapInstance(null);
                setMouseTool(null);
                setDrawingPolygon(null);
                setMapFullyLoaded(false);
                setPlaceSearch(null);
            }
        }
    }, [modalVisible]);

    // 组件卸载时清理地图资源
    useEffect(() => {
        return () => {
            if (mapInstanceRef.current) {
                mapInstanceRef.current.destroy();
                mapInstanceRef.current = null;
                mouseToolRef.current = null;
                setMapInstance(null);
                setMouseTool(null);
            }
        };
    }, []);

    // 打开新增模态框
    const showAddModal = () => {
        // 重置表单和状态
        form.resetFields();
        form.setFieldsValue({
            rateMultiplier: 1.0,
            priority: 0,
            active: true
        });
        setBoundaryPoints([]);
        setMapError(null);
        setMapFullyLoaded(false);
        setModalVisible(true);
        setDebugInfo(prev => ({...prev, initializationAttempts: 0}));
        setSelectedAddress(null); // 重置选中的地址
        setSearchAddress(''); // 重置搜索地址输入
        setSearchResults([]); // 重置搜索结果

        console.log("[RegionCreator] 打开新增模态框");
    };

    // 改进的开始绘制多边形函数
    const startDrawPolygon = () => {
        // 优先使用ref引用
        const mapInst = mapInstanceRef.current;
        const mTool = mouseToolRef.current;

        if (!mapInst) {
            message.warning('地图尚未完全加载，请稍候再试');
            return;
        }

        if (!mTool) {
            message.warning('绘图工具尚未准备好，请刷新页面后重试');
            return;
        }

        // 先清除之前绘制的多边形
        if (drawingPolygon) {
            mapInst.remove(drawingPolygon);
            setDrawingPolygon(null);
            setBoundaryPoints([]);
        }

        // 开始绘制
        try {
            mTool.polygon({
                fillColor: '#1890ff33',
                strokeColor: '#1890ff',
                strokeWeight: 2
            });

            message.success('请在地图上绘制区域边界，单击添加点，双击结束绘制');
        } catch (drawError) {
            console.error('[RegionCreator] 启动绘图模式失败:', drawError);
            message.error('启动绘图模式失败: ' + drawError.message);
        }
    };

    // 清除绘制
    const clearDrawing = () => {
        const mapInst = mapInstanceRef.current;
        if (mapInst) {
            mapInst.clearMap();
            setBoundaryPoints([]);
            setDrawingPolygon(null);
        }
    };

    // 关闭新增模态框
    const handleAddCancel = () => {
        setModalVisible(false);
        setMapFullyLoaded(false);

        // 清除绘制内容
        clearDrawing();

        // 如果存在地图实例，销毁它
        if (mapInstanceRef.current) {
            mapInstanceRef.current.destroy();
            mapInstanceRef.current = null;
            mouseToolRef.current = null;
            setMapInstance(null);
            setMouseTool(null);
            setDrawingPolygon(null);
        }
    };

    // 提交新增表单
    const handleAddSubmit = async () => {
        try {
            const values = await form.validateFields();

            // 验证边界点
            if (!boundaryPoints.length || boundaryPoints.length < 3) {
                message.error('请先在地图上绘制区域边界，至少需要3个点');
                return;
            }

            // 创建配送区域
            setLoading(true);
            const regionData = {
                ...values,
                boundaryPoints: boundaryPoints
            };

            console.log('[RegionCreator] 提交新增区域数据:', regionData);

            const response = await axios.post(
                `${API_BASE_URL}/regions`,
                regionData,
                { withCredentials: true }
            );

            if (response.data.success) {
                message.success('配送区域创建成功');
                setModalVisible(false);
                clearDrawing();
                if (onRegionCreated && typeof onRegionCreated === 'function') {
                    onRegionCreated();
                }
            } else {
                message.error(`创建失败: ${response.data.message}`);
            }
        } catch (error) {
            console.error('[RegionCreator] 表单提交出错:', error);
            message.error('创建配送区域失败，请重试');
        } finally {
            setLoading(false);
        }
    };

    // 重新加载地图
    const reloadMap = () => {
        console.log("[RegionCreator] 手动重新加载地图");

        // 如果已有地图实例，先销毁
        if (mapInstanceRef.current) {
            mapInstanceRef.current.destroy();
            mapInstanceRef.current = null;
            mouseToolRef.current = null;
            setDrawingPolygon(null);
        }

        setMapFullyLoaded(false);
        setMapError(null);

        // 重新检查容器并初始化
        setTimeout(() => {
            if (checkMapContainerRef.current) {
                checkMapContainerRef.current();
            }
        }, 500);
    };

    // 切换调试信息显示
    const toggleDebugInfo = () => {
        setShowDebug(!showDebug);
    };

    // 处理地址搜索 - 直接集成搜索功能
    const handleAddressSearch = (e) => {
        e.preventDefault();
        setSearchStatus('搜索中...');

        if (!searchAddress) {
            message.warning('请输入地址关键词');
            setSearchStatus('');
            return;
        }

        if (placeSearch && mapInstance) {
            // 清除之前的搜索结果
            placeSearch.clear();

            // 执行搜索
            placeSearch.search(searchAddress, (status, result) => {
                if (status === 'complete' && result.poiList && result.poiList.pois.length > 0) {
                    setSearchResults(result.poiList.pois);
                    setSearchStatus('');

                    // 将第一个结果显示在地图上
                    const firstPoi = result.poiList.pois[0];
                    mapInstance.setCenter([firstPoi.location.lng, firstPoi.location.lat]);
                    mapInstance.setZoom(15);
                } else {
                    setSearchResults([]);
                    setSearchStatus('未找到匹配的地址，请尝试其他关键词');
                }
            });
        } else {
            setSearchStatus('搜索服务尚未准备好，请稍后再试');
            message.warning('搜索服务尚未准备好，请稍后再试');
        }
    };

    // 处理选择地址
    const handleSelectAddress = (poi) => {
        if (poi && mapInstance && AMapLibRef.current) {
            setSearchStatus('正在获取详细地址信息...');
            setSearchAddress(poi.name);
            setSearchResults([]);
            setSearchStatus('');

            mapInstance.setCenter([poi.location.lng, poi.location.lat]);

            // 清除之前的标记
            mapInstance.clearMap();

            // 添加新标记
            new AMapLibRef.current.Marker({
                map: mapInstance,
                position: [poi.location.lng, poi.location.lat],
                title: poi.name
            });

            // 保存选中的地址信息
            setSelectedAddress({
                name: poi.name,
                latitude: poi.location.lat,
                longitude: poi.location.lng,
                detail: poi.address || ''
            });

            message.success(`已定位至: ${poi.name}`);
        }
    };

    // 渲染地图错误状态
    const renderMapError = () => {
        if (!mapError || mapError.includes('正在加载')) return null;

        return (
            <Alert
                message="地图加载失败"
                description={
                    <div>
                        <p>{mapError}</p>
                        <Button type="primary" size="small" onClick={reloadMap} style={{marginTop: 8}}>
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

    // 渲染调试信息
    const renderDebugInfo = () => {
        if (!showDebug) return null;

        return (
            <Alert
                message="地图调试信息"
                description={
                    <div>
                        <p>API密钥状态: {debugInfo.keyStatus}</p>
                        <p>地图容器存在: {debugInfo.mapContainerExists ? '是' : '否'}</p>
                        <p>容器尺寸: {debugInfo.mapContainerSize.width}x{debugInfo.mapContainerSize.height}</p>
                        <p>初始化尝试次数: {debugInfo.initializationAttempts}</p>
                        <p>地图实例状态: {mapInstance ? '已创建' : '未创建'}</p>
                        <p>AMap库状态: {AMapRef ? '已加载' : '未加载'}</p>
                        <p>绘图工具状态: {mouseTool ? '已加载' : '未加载'}</p>
                        <p>搜索工具状态: {placeSearch ? '已加载' : '未加载'}</p>
                    </div>
                }
                type="info"
                style={{ marginBottom: 16 }}
            />
        );
    };

    return (
        <>
            <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={showAddModal}
                disabled={!mapKeyReady}
                className={styles.addButton}
            >
                新增配送区域
            </Button>

            {/* 新增区域模态框 */}
            <Modal
                title={
                    <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                        <span>新增配送区域</span>
                        <Button
                            type="text"
                            icon={<BugOutlined />}
                            onClick={toggleDebugInfo}
                            size="small"
                        />
                    </div>
                }
                open={modalVisible}
                onOk={handleAddSubmit}
                onCancel={handleAddCancel}
                afterOpen={() => console.log("[RegionCreator] 模态框afterOpen事件触发")}
                maskClosable={false}
                width={800}
                destroyOnClose
                confirmLoading={loading}
            >
                <Spin spinning={mapLoading} tip="加载地图中...">
                    {renderDebugInfo()}

                    <Form
                        form={form}
                        layout="vertical"
                        name="regionForm"
                        className={styles.regionForm}
                    >
                        <Row gutter={16}>
                            <Col span={12}>
                                <Form.Item
                                    name="name"
                                    label="区域名称"
                                    rules={[{ required: true, message: '请输入区域名称' }]}
                                >
                                    <Input placeholder="例如：校园区域、市中心区域" />
                                </Form.Item>
                            </Col>
                            <Col span={12}>
                                <Form.Item
                                    name="priority"
                                    label="优先级"
                                    rules={[{ required: true, message: '请输入优先级' }]}
                                    tooltip="当点位于多个区域时，使用优先级高的区域，数字越大优先级越高"
                                >
                                    <InputNumber
                                        precision={0}
                                        style={{ width: '100%' }}
                                        placeholder="优先级"
                                    />
                                </Form.Item>
                            </Col>
                        </Row>

                        <Row gutter={16}>
                            <Col span={12}>
                                <Form.Item
                                    name="rateMultiplier"
                                    label="费率倍数"
                                    rules={[
                                        { required: true, message: '请输入费率倍数' },
                                        { type: 'number', min: 0.1, message: '费率倍数必须大于0.1' }
                                    ]}
                                    tooltip="设置该区域的费率倍数，1.0表示不变，1.5表示上浮50%"
                                >
                                    <InputNumber
                                        step={0.1}
                                        precision={2}
                                        style={{ width: '100%' }}
                                        placeholder="请输入费率倍数，例如：1.5"
                                    />
                                </Form.Item>
                            </Col>
                            <Col span={12}>
                                <Form.Item
                                    name="active"
                                    valuePropName="checked"
                                    label="启用状态"
                                >
                                    <Switch checkedChildren="启用" unCheckedChildren="禁用" />
                                </Form.Item>
                            </Col>
                        </Row>

                        <Form.Item
                            name="description"
                            label="区域描述"
                        >
                            <Input.TextArea
                                rows={2}
                                placeholder="请输入区域的描述信息"
                            />
                        </Form.Item>

                        {renderMapError()}

                        <div className={styles.mapTools}>
                            {/* 地址搜索 - 直接集成 */}
                            <div className={styles.searchAddressContainer}>
                                <h4>
                                    <SearchOutlined /> 地址搜索
                                    <span className={styles.searchTip}>
                                        (搜索并定位到目标区域)
                                    </span>
                                </h4>
                                <div className={styles.searchInputGroup}>
                                    <Input
                                        value={searchAddress}
                                        onChange={(e) => setSearchAddress(e.target.value)}
                                        placeholder="输入地址关键词进行搜索"
                                        onPressEnter={handleAddressSearch}
                                        disabled={!mapFullyLoaded}
                                    />
                                    <Button
                                        onClick={handleAddressSearch}
                                        type="primary"
                                        icon={<SearchOutlined />}
                                        disabled={!mapFullyLoaded}
                                    >
                                        搜索
                                    </Button>
                                </div>

                                {searchStatus && (
                                    <div className={styles.searchStatus}>{searchStatus}</div>
                                )}

                                {searchResults.length > 0 && (
                                    <div className={styles.searchResultsList}>
                                        {searchResults.map((poi, index) => (
                                            <div
                                                key={index}
                                                className={styles.searchResultItem}
                                                onClick={() => handleSelectAddress(poi)}
                                            >
                                                <div className={styles.poiName}>{poi.name}</div>
                                                <div className={styles.poiAddress}>{poi.address || '无详细地址'}</div>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {selectedAddress && (
                                    <div className={styles.selectedAddressInfo}>
                                        <EnvironmentOutlined /> 已选择：{selectedAddress.name}
                                    </div>
                                )}
                            </div>

                            <div className={styles.mapToolbar}>
                                <Button
                                    type="primary"
                                    onClick={startDrawPolygon}
                                    icon={<EditOutlined />}
                                    disabled={!mapFullyLoaded}
                                >
                                    开始绘制区域
                                </Button>
                                <Button
                                    onClick={clearDrawing}
                                    icon={<UndoOutlined />}
                                    disabled={!mapFullyLoaded}
                                >
                                    清除绘制
                                </Button>
                                <Button
                                    onClick={reloadMap}
                                    type="dashed"
                                >
                                    重新加载地图
                                </Button>
                            </div>

                            <Alert
                                message="绘制说明"
                                description="单击地图添加边界点，双击结束绘制。绘制的多边形区域将作为该配送区域的边界。请至少添加3个点形成一个封闭区域。"
                                type="info"
                                showIcon
                                className={styles.drawingTip}
                            />

                            <div className={styles.drawingInfo}>
                                {boundaryPoints.length > 0 && (
                                    <div className={styles.pointsInfo}>
                                        已绘制 {boundaryPoints.length} 个边界点
                                        {boundaryPoints.length < 3 && (
                                            <span className={styles.warningText}> (至少需要3个点)</span>
                                        )}
                                    </div>
                                )}
                                {!mapFullyLoaded && (
                                    <div className={styles.loadingIndicator}>
                                        <Spin size="small" /> 地图加载中...
                                    </div>
                                )}
                            </div>

                            <div
                                ref={mapContainerRef}
                                className={styles.mapContainer}
                                style={{
                                    height: '400px',
                                    border: '1px solid #eee',
                                    position: 'relative'
                                }}
                            >
                                {!mapFullyLoaded && (
                                    <div style={{
                                        position: 'absolute',
                                        top: 0,
                                        left: 0,
                                        right: 0,
                                        bottom: 0,
                                        background: 'rgba(240, 242, 245, 0.8)',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        justifyContent: 'center',
                                        alignItems: 'center',
                                        zIndex: 10
                                    }}>
                                        <Spin tip="加载地图中..." />
                                        <div style={{marginTop: 10}}>
                                            {mapError ? `加载状态: ${mapError}` : '地图正在初始化，请稍候...'}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </Form>
                </Spin>
            </Modal>
        </>
    );
};

export default RegionCreator;