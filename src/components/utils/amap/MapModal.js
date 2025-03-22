import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Modal, Button, Spin, Alert } from 'antd';
import { useMapContext } from '../../context/MapContext'; // 确保路径正确
import styles from '../../../assets/css/map/MapModal.module.css';

/**
 * 地址地图展示模态框组件
 */
const MapModal = ({ isOpen, onClose, address, latitude, longitude }) => {
    const mapRef = useRef(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const mapInstanceRef = useRef(null); // 使用ref而不是state存储地图实例
    const mapConfig = useMapContext();
    const mapScriptLoadedRef = useRef(false); // 跟踪脚本是否已加载

    // 使用useCallback包装areCoordinatesValid函数，确保函数引用稳定
    const areCoordinatesValid = useCallback(() => {
        return latitude && longitude &&
            !isNaN(parseFloat(latitude)) &&
            !isNaN(parseFloat(longitude)) &&
            parseFloat(latitude) >= -90 &&
            parseFloat(latitude) <= 90 &&
            parseFloat(longitude) >= -180 &&
            parseFloat(longitude) <= 180;
    }, [latitude, longitude]);

    // 防止重复加载地图脚本
    useEffect(() => {
        if (!isOpen || mapScriptLoadedRef.current || !mapConfig.key) return;

        const loadMapScript = () => {
            // 如果AMap已存在，不再加载脚本
            if (window.AMap) {
                mapScriptLoadedRef.current = true;
                return;
            }

            // 加载地图脚本
            const script = document.createElement('script');
            script.src = `https://webapi.amap.com/maps?v=2.0&key=${mapConfig.key}`;
            script.async = true;

            script.onload = () => {
                console.log("地图脚本加载成功");
                mapScriptLoadedRef.current = true;
            };

            script.onerror = (e) => {
                console.error('地图脚本加载失败:', e);
                setError('地图服务加载失败，请检查网络连接和API密钥');
                setLoading(false);
            };

            document.head.appendChild(script);
        };

        loadMapScript();
    }, [isOpen, mapConfig.key]);

    // 初始化地图
    useEffect(() => {
        // 只有当模态框打开、地图容器存在、坐标有效、API密钥存在且脚本已加载时初始化地图
        if (!isOpen || !mapRef.current || !areCoordinatesValid() || !mapConfig.key || !window.AMap) {
            if (isOpen && !areCoordinatesValid()) {
                setLoading(false);
                setError('坐标数据无效，无法显示地图');
            }
            return;
        }

        setLoading(true);
        setError(null);

        // 清理旧地图实例
        if (mapInstanceRef.current) {
            mapInstanceRef.current.destroy();
            mapInstanceRef.current = null;
        }

        try {
            console.log("初始化地图，坐标:", longitude, latitude);

            // 创建新地图实例
            const map = new window.AMap.Map(mapRef.current, {
                zoom: 15,
                center: [parseFloat(longitude), parseFloat(latitude)]
            });

            // 添加标记
            const marker = new window.AMap.Marker({
                position: [parseFloat(longitude), parseFloat(latitude)],
                title: address || '位置标记'
            });

            map.add(marker);

            // 添加控件
            map.plugin(['AMap.ToolBar', 'AMap.Scale'], () => {
                map.addControl(new window.AMap.ToolBar());
                map.addControl(new window.AMap.Scale());
            });

            mapInstanceRef.current = map;
            setLoading(false);
            console.log("地图初始化成功");
        } catch (err) {
            console.error('地图初始化失败:', err);
            setLoading(false);
            setError(`地图初始化失败: ${err.message || '未知错误'}`);
        }

        // 清理函数
        return () => {
            if (mapInstanceRef.current) {
                mapInstanceRef.current.destroy();
                mapInstanceRef.current = null;
            }
        };
    }, [isOpen, latitude, longitude, address, mapConfig.key, areCoordinatesValid]);

    // 模态框关闭时清理地图
    useEffect(() => {
        if (!isOpen && mapInstanceRef.current) {
            mapInstanceRef.current.destroy();
            mapInstanceRef.current = null;
        }
    }, [isOpen]);

    return (
        <Modal
            title={`地址位置: ${address || '未知地址'}`}
            open={isOpen}
            onCancel={onClose}
            footer={[
                <Button key="close" onClick={onClose}>
                    关闭
                </Button>
            ]}
            width={700}
        >
            <div className={styles.mapContainer}>
                {loading && (
                    <div className={styles.loadingContainer}>
                        <Spin tip="地图加载中..." />
                        {!mapConfig.key && (
                            <div style={{ marginTop: '10px', color: '#ff4d4f' }}>
                                正在获取地图API密钥...
                            </div>
                        )}
                    </div>
                )}

                {error && (
                    <Alert
                        message="地图加载错误"
                        description={error}
                        type="error"
                        showIcon
                    />
                )}

                <div
                    ref={mapRef}
                    className={styles.map}
                    style={{ display: loading || error ? 'none' : 'block' }}
                />

                <div className={styles.addressInfo}>
                    <p><strong>地址:</strong> {address || '未提供地址'}</p>
                    {areCoordinatesValid() && (
                        <p><strong>坐标:</strong> {latitude}, {longitude}</p>
                    )}
                </div>
            </div>
        </Modal>
    );
};

export default MapModal;