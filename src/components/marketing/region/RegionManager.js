import React, { useState, useEffect, useRef } from 'react';
import {
    Table, Button, Modal, Form, Input, InputNumber,
    Card, message, Popconfirm, Tooltip, Tag,
    Switch, Spin, Row, Col, Statistic, Alert, List
} from 'antd';
import {
    SyncOutlined, DeleteOutlined,
    EditOutlined, EnvironmentOutlined, CheckCircleOutlined,
    CloseCircleOutlined, LoadingOutlined, UndoOutlined,
    BugOutlined, ReloadOutlined, SearchOutlined
} from '@ant-design/icons';
import AMapLoader from '@amap/amap-jsapi-loader';
import axios from 'axios';
import { useMapContext } from '../../context/MapContext';
import styles from '../../../assets/css/marketing/region/RegionManager.module.css';

// 导入分离的组件
import RegionRateCalculator from './RegionRateCalculator';
import RegionCreator from './RegionCreator';

const API_BASE_URL = 'http://127.0.0.1:8080/api/marketing';

const RegionManager = () => {
    // 状态定义
    const [regions, setRegions] = useState([]);
    const [loading, setLoading] = useState(false);
    const [editModalVisible, setEditModalVisible] = useState(false);
    const [selectedRegion, setSelectedRegion] = useState(null);
    const [stats, setStats] = useState({
        total: 0,
        active: 0
    });

    // 从MapContext中获取高德地图配置
    const mapConfig = useMapContext();
    const [mapKeyReady, setMapKeyReady] = useState(false);
    const [mapError, setMapError] = useState(null);

    // 编辑相关状态
    const [editMapInstance, setEditMapInstance] = useState(null);
    const [editMapFullyLoaded, setEditMapFullyLoaded] = useState(false);
    const [mapLoading, setMapLoading] = useState(false);
    const editMapContainerRef = useRef(null);
    const editMapInstanceRef = useRef(null);
    const polyEditorRef = useRef(null);
    const AMapLibRef = useRef(null);
    const [currentPolygon, setCurrentPolygon] = useState(null);
    const [poliEditor, setPolyEditor] = useState(null);

    // 搜索相关状态
    const [searchText, setSearchText] = useState('');
    const [searching, setSearching] = useState(false);
    const [searchResults, setSearchResults] = useState([]);
    // 使用 useRef 来保存 placeSearch
    const placeSearchRef = useRef(null);
    const [lastSearchedLocation, setLastSearchedLocation] = useState(null);
    const searchInputRef = useRef(null);

    // 创建一个 ref 来存储所有相关的地图函数，解决循环依赖问题
    const mapFunctionsRef = useRef({});

    // 添加调试状态
    const [debugInfo, setDebugInfo] = useState({
        mapContainerExists: false,
        mapContainerSize: { width: 0, height: 0 },
        initializationAttempts: 0,
        keyStatus: 'checking',
        polygonPoints: 0
    });
    const [showDebug, setShowDebug] = useState(false);

    const [editForm] = Form.useForm();

    // 监控mapConfig中的key是否已经加载完成
    useEffect(() => {
        if (mapConfig && mapConfig.key && mapConfig.key.length > 0) {
            console.log("[RegionManager] 高德地图API密钥已加载");
            setMapKeyReady(true);
            setMapError(null);
            setDebugInfo(prev => ({...prev, keyStatus: 'ready'}));
        } else {
            console.log("[RegionManager] 等待高德地图API密钥加载...");
            setMapKeyReady(false);
            setDebugInfo(prev => ({...prev, keyStatus: 'loading'}));
        }
    }, [mapConfig]);

    // 使用 useEffect 初始化地图相关函数，解决循环依赖
    useEffect(() => {
        // 初始化地图函数
        mapFunctionsRef.current.checkMapContainer = () => {
            if (editMapContainerRef.current) {
                const width = editMapContainerRef.current.clientWidth;
                const height = editMapContainerRef.current.clientHeight;

                console.log(`[RegionManager] 地图容器尺寸: ${width}x${height}`);

                setDebugInfo(prev => ({
                    ...prev,
                    mapContainerExists: true,
                    mapContainerSize: { width, height }
                }));

                // 如果容器尺寸正常，尝试初始化地图
                if (width > 0 && height > 0) {
                    console.log("[RegionManager] 地图容器已就绪，开始初始化地图");
                    mapFunctionsRef.current.initEditModalMap();
                } else {
                    console.log("[RegionManager] 地图容器尺寸异常，等待重试");
                    // 延迟500ms再次检查
                    setTimeout(mapFunctionsRef.current.checkMapContainer, 500);
                }
            } else {
                console.log("[RegionManager] 地图容器不存在，等待重试");
                setDebugInfo(prev => ({...prev, mapContainerExists: false}));
                // 延迟500ms再次检查
                setTimeout(mapFunctionsRef.current.checkMapContainer, 500);
            }
        };

        mapFunctionsRef.current.updateEditPolygonPoints = () => {
            if (currentPolygon) {
                const path = currentPolygon.getPath();
                const points = path.map(point => `${point.lng},${point.lat}`);

                // 更新调试信息
                setDebugInfo(prev => ({
                    ...prev,
                    polygonPoints: points.length
                }));

                console.log(`[RegionManager] 区域边界已更新，共${points.length}个点`);

                // 判断点数是否足够
                if (points.length < 3) {
                    message.warning('警告：当前边界点数量少于3个，无法形成有效区域');
                }
            }
        };

        mapFunctionsRef.current.initMap = async (containerRef, center = [113.264385, 23.129112], zoom = 12) => {
            if (!containerRef.current) {
                console.warn('[RegionManager] 地图容器元素不存在');
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
                console.warn(`[RegionManager] 地图容器尺寸异常: ${containerWidth}x${containerHeight}`);
                setMapError('地图容器尺寸异常，请调整窗口大小后重试');
                return null;
            }

            try {
                setMapLoading(true);
                setMapError(null);

                console.log(`[RegionManager] 初始化地图, 容器尺寸: ${containerWidth}x${containerHeight}`);

                // 一次性加载AMap及所有所需插件
                const AMap = await AMapLoader.load({
                    key: mapConfig.key,
                    version: "2.0",
                    plugins: [
                        'AMap.PolygonEditor',
                        'AMap.Scale',
                        'AMap.ToolBar',
                        'AMap.PlaceSearch',
                        'AMap.Geocoder',
                    ],
                });

                // 在React状态更新前，直接保存AMap引用到ref中
                AMapLibRef.current = AMap;

                // 创建地图实例
                const map = new AMap.Map(containerRef.current, {
                    zoom: zoom,
                    center: center,
                    viewMode: '2D'
                });

                // 添加比例尺和缩放控件
                map.addControl(new AMap.Scale());
                map.addControl(new AMap.ToolBar());

                // 初始化搜索插件
                try {
                    const search = new AMap.PlaceSearch({
                        pageSize: 5,      // 单页显示结果条数
                        pageIndex: 1,     // 页码
                        city: "全国",     // 兴趣点城市
                        citylimit: false,  // 是否强制限制在设置的城市内搜索
                        autoFitView: false // 是否自动调整地图视野使绘制的 Marker 点都处于视口的可见范围
                    });
                    placeSearchRef.current = search;
                    console.log('[RegionManager] 搜索插件初始化成功');
                } catch (searchError) {
                    console.error('[RegionManager] 初始化搜索插件失败:', searchError);
                }

                // 等待地图完全加载
                if (!map.getStatus().isComplete) {
                    await new Promise(resolve => {
                        map.on('complete', resolve);
                    });
                }

                console.log('[RegionManager] 地图加载完成');
                setMapLoading(false);
                return map;
            } catch (error) {
                console.error('[RegionManager] 加载地图出错:', error);
                setMapError(`加载地图出错: ${error.message || '未知错误'}`);
                message.error('加载地图出错，请检查网络连接或刷新页面');
                return null;
            } finally {
                // 确保在任何情况下都关闭加载状态
                setTimeout(() => {
                    setMapLoading(false);
                }, 1000);
            }
        };

        mapFunctionsRef.current.initEditModalMap = async () => {
            if (!mapKeyReady) {
                setMapError('正在加载地图API密钥，请稍候...');
                return;
            }

            console.log("[RegionManager] 开始初始化编辑模态框地图");

            // 使用更长的延迟，确保DOM已完全渲染
            setTimeout(async () => {
                try {
                    if (!editMapContainerRef.current || !selectedRegion) {
                        console.error('[RegionManager] 编辑地图容器未找到或没有选择区域');
                        setMapError('地图容器加载失败，请关闭后重试');
                        return;
                    }

                    // 检查容器尺寸
                    const containerWidth = editMapContainerRef.current.clientWidth;
                    const containerHeight = editMapContainerRef.current.clientHeight;

                    console.log(`[RegionManager] 编辑地图容器尺寸: ${containerWidth}x${containerHeight}`);

                    if (containerWidth === 0 || containerHeight === 0) {
                        console.warn('[RegionManager] 编辑地图容器尺寸为0:', containerWidth, containerHeight);
                        setMapError('地图容器尺寸异常，请关闭后重试');
                        // 尝试再次检查容器
                        setTimeout(mapFunctionsRef.current.checkMapContainer, 1000);
                        return;
                    }

                    // 如果已有编辑地图实例，先销毁
                    if (editMapInstanceRef.current) {
                        console.log("[RegionManager] 销毁旧的地图实例");
                        editMapInstanceRef.current.destroy();
                        editMapInstanceRef.current = null;
                        polyEditorRef.current = null;
                        setEditMapInstance(null);
                        setPolyEditor(null);
                        setCurrentPolygon(null);
                    }

                    // 初始化编辑地图
                    const map = await mapFunctionsRef.current.initMap(editMapContainerRef);
                    if (!map) {
                        setMapError('编辑地图初始化失败');
                        return;
                    }

                    // 同时更新ref和state
                    editMapInstanceRef.current = map;
                    setEditMapInstance(map);

                    // 获取AMap实例 - 优先使用ref中的直接引用
                    const AMapInstance = AMapLibRef.current;

                    if (!AMapInstance) {
                        console.error('[RegionManager] AMap未初始化');
                        setMapError('地图API未初始化，请刷新页面后重试');
                        return;
                    }

                    // 检查边界点数据
                    if (!selectedRegion.boundaryPoints || selectedRegion.boundaryPoints.length < 3) {
                        console.warn(`[RegionManager] 区域[${selectedRegion.name}]的边界点数据不足：`,
                            selectedRegion.boundaryPoints ? selectedRegion.boundaryPoints.length : 0);
                        message.warning('当前区域没有有效的边界点数据或边界点不足3个');
                        setEditMapFullyLoaded(true);
                        return;
                    }

                    // 绘制已有多边形
                    console.log(`[RegionManager] 开始绘制区域[${selectedRegion.name}]的边界，点数：`,
                        selectedRegion.boundaryPoints.length);

                    try {
                        // 转换边界点为LngLat对象
                        const path = selectedRegion.boundaryPoints.map(point => {
                            const [lng, lat] = point.split(',').map(Number);
                            return new AMapInstance.LngLat(lng, lat);
                        });

                        // 创建多边形
                        const polygon = new AMapInstance.Polygon({
                            path: path,
                            fillColor: '#1890ff33',
                            strokeColor: '#1890ff',
                            strokeWeight: 2
                        });

                        console.log(`[RegionManager] 多边形创建成功，添加到地图`);
                        map.add(polygon);
                        setCurrentPolygon(polygon);

                        // 自适应显示多边形
                        map.setFitView([polygon]);

                        setDebugInfo(prev => ({
                            ...prev,
                            polygonPoints: path.length
                        }));

                        try {
                            // 创建多边形编辑器
                            console.log(`[RegionManager] 开始创建多边形编辑器`);
                            const pEditor = await loadPolygonEditor(AMapInstance, map, polygon);
                            console.log(`[RegionManager] 多边形编辑器创建成功`);

                            polyEditorRef.current = pEditor;
                            setPolyEditor(pEditor);

                            // 监听编辑器的改变事件
                            pEditor.on('adjust', mapFunctionsRef.current.updateEditPolygonPoints);
                            pEditor.on('addnode', mapFunctionsRef.current.updateEditPolygonPoints);
                            pEditor.on('removenode', mapFunctionsRef.current.updateEditPolygonPoints);

                            setEditMapFullyLoaded(true);
                            console.log('[RegionManager] 多边形编辑器初始化成功');
                            message.success('区域地图加载成功，可以开始编辑区域边界');
                        } catch (editorError) {
                            console.error('[RegionManager] 创建多边形编辑器失败:', editorError);
                            setMapError(`多边形编辑器初始化失败: ${editorError.message}`);
                        }
                    } catch (error) {
                        console.error('[RegionManager] 绘制多边形失败:', error);
                        setMapError(`绘制区域失败: ${error.message}`);
                    }
                } catch (error) {
                    console.error('[RegionManager] 初始化编辑地图失败:', error);
                    setMapError(`初始化编辑地图失败: ${error.message || '未知错误'}`);
                }
            }, 1500); // 增加延迟到1500ms
        };
    }, [mapKeyReady, mapConfig, selectedRegion, currentPolygon]); // 只包含核心依赖

    // 初始加载
    useEffect(() => {
        fetchRegions();
    }, []);

    // 监听模态框可见性变化
    useEffect(() => {
        if (editModalVisible) {
            console.log("[RegionManager] 编辑模态框已打开，准备初始化地图");
            // 打开模态框后延迟检查地图容器
            const timer = setTimeout(() => {
                mapFunctionsRef.current.checkMapContainer();
            }, 500);

            return () => clearTimeout(timer);
        } else {
            // 模态框关闭时清理资源
            console.log("[RegionManager] 编辑模态框已关闭，清理资源");
            if (editMapInstanceRef.current) {
                console.log("[RegionManager] 销毁地图实例");
                editMapInstanceRef.current.destroy();
                editMapInstanceRef.current = null;
                polyEditorRef.current = null;
                setEditMapInstance(null);
                setPolyEditor(null);
                setEditMapFullyLoaded(false);
            }

            // 重置搜索状态
            setSearchText('');
            setSearchResults([]);
            setLastSearchedLocation(null);
            placeSearchRef.current = null;
        }
    }, [editModalVisible]); // 只保留 editModalVisible 依赖项

    // 组件卸载时清理地图资源
    useEffect(() => {
        return () => {
            if (editMapInstanceRef.current) {
                editMapInstanceRef.current.destroy();
                editMapInstanceRef.current = null;
            }

            if (polyEditorRef.current) {
                polyEditorRef.current = null;
            }

            setEditMapInstance(null);
            setPolyEditor(null);

            // 清理 placeSearchRef
            placeSearchRef.current = null;
        };
    }, []);

    // 获取配送区域列表
    const fetchRegions = async () => {
        setLoading(true);
        try {
            const response = await axios.get(`${API_BASE_URL}/regions`, {
                params: { includeInactive: true },
                withCredentials: true
            });

            if (response.data.success) {
                const regionsData = response.data.data;
                setRegions(regionsData);

                // 计算统计数据
                setStats({
                    total: regionsData.length,
                    active: regionsData.filter(r => r.active).length
                });
            } else {
                message.error(`获取配送区域失败: ${response.data.message}`);
            }
        } catch (error) {
            console.error('获取配送区域出错:', error);
            message.error('获取配送区域出错，请检查网络连接');
        } finally {
            setLoading(false);
        }
    };

    // 加载和初始化PolygonEditor的Promise函数
    const loadPolygonEditor = async (AMapInstance, map, polygon) => {
        return new Promise((resolve, reject) => {
            if (!AMapInstance) {
                reject(new Error('AMap实例不可用'));
                return;
            }

            if (AMapInstance.PolygonEditor) {
                try {
                    const editor = new AMapInstance.PolygonEditor(map, polygon);
                    resolve(editor);
                } catch (error) {
                    reject(error);
                }
            } else if (AMapInstance.plugin) {
                try {
                    AMapInstance.plugin(['AMap.PolygonEditor'], () => {
                        if (AMapInstance.PolygonEditor) {
                            const editor = new AMapInstance.PolygonEditor(map, polygon);
                            resolve(editor);
                        } else {
                            reject(new Error('PolygonEditor插件加载失败'));
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

    // 打开编辑模态框
    const showEditModal = (record) => {
        setSelectedRegion(record);
        editForm.setFieldsValue({
            id: record.id,
            name: record.name,
            description: record.description,
            rateMultiplier: record.rateMultiplier,
            priority: record.priority,
            active: record.active
        });
        setMapError(null);
        setEditMapFullyLoaded(false);
        setDebugInfo(prev => ({...prev, initializationAttempts: 0}));

        // 重置搜索状态
        setSearchText('');
        setSearchResults([]);
        setLastSearchedLocation(null);

        setEditModalVisible(true);

        console.log("[RegionManager] 打开编辑模态框，区域ID:", record.id);
    };

    // 开始编辑多边形
    const startEditPolygon = () => {
        // 优先使用ref
        const pEditor = polyEditorRef.current;

        if (!pEditor) {
            // 尝试创建编辑器
            const AMapInstance = AMapLibRef.current;
            const mapInst = editMapInstanceRef.current;
            const polygon = currentPolygon;

            if (!AMapInstance || !mapInst || !polygon) {
                message.warning('多边形编辑器未就绪，请稍候再试');
                return;
            }

            if (AMapInstance.PolygonEditor) {
                try {
                    console.log("[RegionManager] 创建新的多边形编辑器");
                    const newEditor = new AMapInstance.PolygonEditor(mapInst, polygon);
                    polyEditorRef.current = newEditor;
                    setPolyEditor(newEditor);

                    // 设置监听器
                    newEditor.on('adjust', mapFunctionsRef.current.updateEditPolygonPoints);
                    newEditor.on('addnode', mapFunctionsRef.current.updateEditPolygonPoints);
                    newEditor.on('removenode', mapFunctionsRef.current.updateEditPolygonPoints);

                    // 打开编辑器
                    newEditor.open();
                    message.success('编辑器已启用，您现在可以编辑区域边界');
                } catch (error) {
                    console.error('[RegionManager] 创建编辑器失败:', error);
                    message.error('初始化编辑器失败: ' + error.message);
                }
            } else {
                message.error('多边形编辑器插件未加载，请刷新页面后重试');
            }
        } else {
            // 如果已有编辑器，打开它
            console.log("[RegionManager] 使用现有编辑器开始编辑");
            pEditor.open();
            message.success('编辑器已启用，您现在可以：');
            message.info('- 拖动边界点调整位置');
            message.info('- 单击边线添加新点');
            message.info('- 按住Alt点击节点可删除点');
        }
    };

    // 停止编辑多边形
    const stopEditPolygon = () => {
        // 优先使用ref
        const pEditor = polyEditorRef.current;

        if (pEditor) {
            pEditor.close();
            message.success('已停止编辑区域边界');

            // 保存当前编辑状态
            if (currentPolygon) {
                const path = currentPolygon.getPath();
                const points = path.map(point => `${point.lng},${point.lat}`);

                if (points.length < 3) {
                    message.warning('警告: 当前边界点数量少于3个，保存时将无法形成有效区域');
                } else {
                    message.info(`当前区域有${points.length}个边界点`);
                }
            }
        } else {
            message.warning('编辑器未初始化');
        }
    };

    // 重新加载地图
    const reloadMap = () => {
        console.log("[RegionManager] 手动重新加载地图");

        // 如果已有地图实例，先销毁
        if (editMapInstanceRef.current) {
            editMapInstanceRef.current.destroy();
            editMapInstanceRef.current = null;
            polyEditorRef.current = null;
            setCurrentPolygon(null);
        }

        setEditMapFullyLoaded(false);
        setMapError(null);

        // 重新检查容器并初始化
        setTimeout(() => {
            mapFunctionsRef.current.checkMapContainer();
        }, 500);
    };

    // 切换调试信息显示
    const toggleDebugInfo = () => {
        setShowDebug(!showDebug);
    };

    // 地址搜索处理函数
    const handleSearch = () => {
        if (!searchText || !placeSearchRef.current || !editMapInstance) {
            if (!searchText) {
                message.info('请输入要搜索的地址');
            } else if (!editMapInstance || !placeSearchRef.current) {
                message.error('地图或搜索服务尚未准备好，请稍后再试');
            }
            return;
        }

        setSearching(true);
        setSearchResults([]);

        // 使用PlaceSearch进行搜索
        placeSearchRef.current.search(searchText, (status, result) => {
            setSearching(false);

            if (status === 'complete' && result.info === 'OK') {
                console.log('[RegionManager] 搜索结果:', result);
                if (result.poiList && result.poiList.pois && result.poiList.pois.length > 0) {
                    setSearchResults(result.poiList.pois);
                } else {
                    message.info('未找到相关地址');
                    setSearchResults([]);
                }
            } else {
                console.error('[RegionManager] 搜索失败:', result);
                message.error('搜索失败，请重试');
                setSearchResults([]);
            }
        });
    };

    // 处理地址项选择
    const handleSelectAddress = (poi) => {
        if (!editMapInstance || !poi || !poi.location) return;

        console.log('[RegionManager] 选择的地址:', poi);

        // 保存搜索位置信息
        setLastSearchedLocation({
            lng: poi.location.lng,
            lat: poi.location.lat,
            name: poi.name
        });

        // 清空搜索结果（隐藏列表）
        setSearchResults([]);

        // 移动地图到选择的位置
        editMapInstance.setCenter([poi.location.lng, poi.location.lat]);
        // 设置适当的缩放级别
        editMapInstance.setZoom(15);

        // 添加标记（可选）
        const AMap = AMapLibRef.current;
        if (AMap) {
            // 清除之前的标记点，但保留已绘制的多边形
            editMapInstance.getAllOverlays('marker').forEach(marker => {
                editMapInstance.remove(marker);
            });

            // 添加新的标记点
            new AMap.Marker({
                position: [poi.location.lng, poi.location.lat],
                map: editMapInstance,
                title: poi.name
            });
        }

        message.success(`已定位到: ${poi.name}`);
    };

    // 处理输入框变化
    const handleSearchInputChange = (e) => {
        setSearchText(e.target.value);
    };

    // 处理按键按下 - 回车键搜索
    const handleKeyDown = (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleSearch();
        }
    };

    // 关闭编辑模态框
    const handleEditCancel = () => {
        setEditModalVisible(false);
        setEditMapFullyLoaded(false);
        setCurrentPolygon(null);

        if (polyEditorRef.current) {
            polyEditorRef.current.close();
        }

        // 销毁编辑地图实例
        if (editMapInstanceRef.current) {
            editMapInstanceRef.current.destroy();
            editMapInstanceRef.current = null;
            polyEditorRef.current = null;
            setEditMapInstance(null);
            setPolyEditor(null);
        }
    };

    // 提交编辑表单
    const handleEditSubmit = async () => {
        try {
            const values = await editForm.validateFields();

            // 获取编辑后的多边形边界点
            let updatedPoints = [];
            if (currentPolygon) {
                const path = currentPolygon.getPath();
                updatedPoints = path.map(point => `${point.lng},${point.lat}`);

                console.log(`[RegionManager] 提交表单，获取到${updatedPoints.length}个边界点`);
            } else if (selectedRegion && selectedRegion.boundaryPoints) {
                // 如果没有编辑多边形，使用原始边界点
                updatedPoints = selectedRegion.boundaryPoints;
                console.log(`[RegionManager] 提交表单，使用原始${updatedPoints.length}个边界点`);
            }

            if (updatedPoints.length < 3) {
                message.error('区域边界至少需要3个点');
                return;
            }

            // 更新配送区域
            const regionData = {
                ...values,
                boundaryPoints: updatedPoints
            };

            console.log(`[RegionManager] 提交更新区域数据：`, regionData);

            const response = await axios.put(
                `${API_BASE_URL}/regions/${values.id}`,
                regionData,
                { withCredentials: true }
            );

            if (response.data.success) {
                message.success('配送区域更新成功');
                setEditModalVisible(false);
                setCurrentPolygon(null);
                if (polyEditorRef.current) {
                    polyEditorRef.current.close();
                }
                fetchRegions();
            } else {
                message.error(`更新失败: ${response.data.message}`);
            }
        } catch (error) {
            console.error('[RegionManager] 表单提交出错:', error);
            message.error('更新配送区域失败，请重试');
        }
    };

    // 删除配送区域
    const handleDelete = async (id) => {
        try {
            const response = await axios.delete(
                `${API_BASE_URL}/regions/${id}`,
                { withCredentials: true }
            );

            if (response.data.success) {
                message.success('配送区域删除成功');
                fetchRegions();
            } else {
                message.error(`删除失败: ${response.data.message}`);
            }
        } catch (error) {
            console.error('删除配送区域出错:', error);
            message.error('删除配送区域出错，请重试');
        }
    };

    // 渲染地图加载中状态
    const renderMapLoading = () => {
        if (mapKeyReady) return null;

        return (
            <Alert
                message="地图正在加载中"
                description={
                    <div>
                        <p>正在从服务器获取高德地图API密钥，请稍候...</p>
                        <p>地图功能将在API密钥加载完成后可用。</p>
                    </div>
                }
                type="info"
                icon={<LoadingOutlined />}
                showIcon
                style={{ marginBottom: 16 }}
            />
        );
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
                        <p>可能原因：</p>
                        <ol>
                            <li>高德地图API密钥无效或未设置</li>
                            <li>网络连接问题</li>
                            <li>高德地图服务异常</li>
                        </ol>
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
                        <p>地图实例状态: {editMapInstance ? '已创建' : '未创建'}</p>
                        <p>多边形编辑器: {poliEditor ? '已加载' : '未加载'}</p>
                        <p>多边形点数: {debugInfo.polygonPoints}</p>
                        <p>搜索插件状态: {placeSearchRef.current ? '已加载' : '未加载'}</p>
                        <p>最后搜索位置: {lastSearchedLocation ?
                            `经度${lastSearchedLocation.lng.toFixed(6)}, 纬度${lastSearchedLocation.lat.toFixed(6)}` :
                            '未搜索'}
                        </p>
                    </div>
                }
                type="info"
                style={{ marginBottom: 16 }}
            />
        );
    };

// 表格列定义
    const columns = [
        {
            title: '名称',
            dataIndex: 'name',
            key: 'name',
            align: 'center', // 添加居中对齐
        },
        {
            title: '费率倍数',
            dataIndex: 'rateMultiplier',
            key: 'rateMultiplier',
            align: 'center', // 添加居中对齐
            render: text => <span>{parseFloat(text).toFixed(2)}x</span>
        },
        {
            title: '优先级',
            dataIndex: 'priority',
            key: 'priority',
            align: 'center', // 添加居中对齐
        },
        {
            title: '状态',
            key: 'status',
            align: 'center', // 添加居中对齐
            render: (_, record) => (
                record.active ?
                    <Tag color="green" icon={<CheckCircleOutlined />}>已启用</Tag> :
                    <Tag color="red" icon={<CloseCircleOutlined />}>已禁用</Tag>
            )
        },
        {
            title: '描述',
            dataIndex: 'description',
            key: 'description',
            align: 'center', // 添加居中对齐
            ellipsis: {
                showTitle: false,
            },
            render: text => (
                <Tooltip placement="topLeft" title={text}>
                    {text}
                </Tooltip>
            ),
        },
        {
            title: '边界点数',
            dataIndex: 'boundaryPoints',
            key: 'boundaryPoints',
            align: 'center', // 添加居中对齐
            render: points => Array.isArray(points) ? points.length : '未知'
        },
        {
            title: '操作',
            key: 'action',
            align: 'center', // 添加居中对齐
            className: styles.actionCell,
            render: (_, record) => (
                // 改为纵向排列的容器
                <div className={styles.actionButtons}>
                    <Button
                        type="primary"
                        icon={<EditOutlined />}
                        size="small"
                        className={styles.editButton}
                        onClick={() => showEditModal(record)}
                        disabled={!mapKeyReady}
                    >
                        编辑
                    </Button>
                    <Popconfirm
                        title="确定要删除这个配送区域吗？"
                        onConfirm={() => handleDelete(record.id)}
                        okText="确定"
                        cancelText="取消"
                    >
                        <Button
                            danger
                            icon={<DeleteOutlined />}
                            size="small"
                            className={styles.deleteButton}
                        >
                            删除
                        </Button>
                    </Popconfirm>
                </div>
            ),
        },
    ];

    return (
        <div className={styles.regionContainer}>
            <Row gutter={16} className={styles.statsRow}>
                <Col span={8}>
                    <Card bordered={false}>
                        <Statistic
                            title="配送区域总数"
                            value={stats.total}
                            valueStyle={{ color: '#1890ff' }}
                            prefix={<EnvironmentOutlined />}
                        />
                    </Card>
                </Col>
                <Col span={8}>
                    <Card bordered={false}>
                        <Statistic
                            title="活跃区域数"
                            value={stats.active}
                            valueStyle={{ color: '#52c41a' }}
                            prefix={<CheckCircleOutlined />}
                        />
                    </Card>
                </Col>
            </Row>

            {renderMapLoading()}
            {renderMapError()}

            {/* 费率测试工具组件 */}
            {mapKeyReady && !mapError && (
                <RegionRateCalculator />
            )}

            <div className={styles.toolbarContainer}>
                <Button
                    type="primary"
                    icon={<SyncOutlined />}
                    onClick={fetchRegions}
                >
                    刷新
                </Button>

                {/* 区域创建组件 */}
                <RegionCreator onRegionCreated={fetchRegions} />
            </div>

            <Table
                rowKey="id"
                columns={columns}
                dataSource={regions}
                loading={loading}
                pagination={{
                    defaultPageSize: 10,
                    showSizeChanger: true,
                    showQuickJumper: true,
                    showTotal: total => `共 ${total} 条`
                }}
                className={styles.dataTable}
            />

            {/* 编辑区域模态框 */}
            <Modal
                title={
                    <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                        <span>编辑配送区域</span>
                        <Button
                            type="text"
                            icon={<BugOutlined />}
                            onClick={toggleDebugInfo}
                            size="small"
                        />
                    </div>
                }
                open={editModalVisible}
                onOk={handleEditSubmit}
                onCancel={handleEditCancel}
                maskClosable={false}
                width={800}
                destroyOnClose
            >
                <Spin spinning={mapLoading} tip="加载地图中...">
                    {renderDebugInfo()}

                    <Form
                        form={editForm}
                        layout="vertical"
                        name="editRegionForm"
                        className={styles.regionForm}
                    >
                        <Form.Item name="id" hidden>
                            <Input />
                        </Form.Item>

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

                        {mapError ? (
                            <Alert
                                message="地图加载状态"
                                description={mapError}
                                type={mapError.includes('正在加载') ? 'info' : 'error'}
                                showIcon
                            />
                        ) : (
                            <div className={styles.mapTools}>
                                <div className={styles.mapToolbar}>
                                    <Button
                                        type="primary"
                                        onClick={startEditPolygon}
                                        icon={<EditOutlined />}
                                        disabled={!editMapFullyLoaded}
                                    >
                                        编辑区域边界
                                    </Button>
                                    <Button
                                        onClick={stopEditPolygon}
                                        icon={<UndoOutlined />}
                                        disabled={!editMapFullyLoaded}
                                    >
                                        停止编辑
                                    </Button>
                                    <Button
                                        onClick={reloadMap}
                                        icon={<ReloadOutlined />}
                                        type="dashed"
                                    >
                                        重新加载地图
                                    </Button>
                                </div>

                                {/* 添加内置地址搜索组件 */}
                                <div className={styles.searchContainer}>
                                    <div className={styles.searchHeader}>
                                        <EnvironmentOutlined /> <span>搜索区域位置</span>
                                    </div>
                                    <div className={styles.searchInputContainer}>
                                        <Input
                                            placeholder="输入地址快速定位到相应区域"
                                            value={searchText}
                                            onChange={handleSearchInputChange}
                                            onKeyDown={handleKeyDown}
                                            ref={searchInputRef}
                                            disabled={!editMapFullyLoaded || !placeSearchRef.current}
                                            suffix={
                                                searching ? (
                                                    <LoadingOutlined />
                                                ) : (
                                                    <SearchOutlined
                                                        onClick={handleSearch}
                                                        style={{ cursor: 'pointer', color: '#1890ff' }}
                                                    />
                                                )
                                            }
                                        />
                                        {searchResults.length > 0 && (
                                            <div className={styles.searchResultsContainer}>
                                                <List
                                                    size="small"
                                                    bordered
                                                    dataSource={searchResults}
                                                    renderItem={item => (
                                                        <List.Item
                                                            className={styles.searchResultItem}
                                                            onClick={() => handleSelectAddress(item)}
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
                                    {(!editMapFullyLoaded || !placeSearchRef.current) && (
                                        <div className={styles.loadingSearch}>
                                            <Spin size="small" /> 地图加载中，搜索功能稍后可用...
                                        </div>
                                    )}
                                </div>

                                <Alert
                                    message="编辑说明"
                                    description="拖动边界点调整位置，单击边线添加新点，按住Alt点击节点可删除。确保保持至少3个边界点形成封闭区域。"
                                    type="info"
                                    showIcon
                                    className={styles.drawingTip}
                                />

                                <div className={styles.drawingInfo}>
                                    {currentPolygon && (
                                        <div className={styles.pointsInfo}>
                                            已绘制 {debugInfo.polygonPoints} 个边界点
                                            {debugInfo.polygonPoints < 3 && (
                                                <span className={styles.warningText}> (至少需要3个点)</span>
                                            )}
                                        </div>
                                    )}
                                    {!editMapFullyLoaded && (
                                        <div className={styles.loadingIndicator}>
                                            <Spin size="small" /> 地图加载中...
                                        </div>
                                    )}
                                </div>

                                <div
                                    ref={editMapContainerRef}
                                    className={styles.mapContainer}
                                    style={{
                                        height: '400px',
                                        border: '1px solid #eee',
                                        position: 'relative'
                                    }}
                                >
                                    {!editMapFullyLoaded && (
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
                        )}
                    </Form>
                </Spin>
            </Modal>
        </div>
    );
};

export default RegionManager;