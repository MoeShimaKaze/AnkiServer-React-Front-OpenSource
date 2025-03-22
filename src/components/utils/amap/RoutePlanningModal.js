import React, { useState, useEffect, useRef } from 'react';
import AMapLoader from '@amap/amap-jsapi-loader';
import { Modal, Spin, Alert, Button } from 'antd'; // 引入 Ant Design 组件
import styles from '../../../assets/css/map/RoutePlanningModal.module.css';
import { useMapContext } from '../../context/MapContext';

const RoutePlanningModal = ({ isOpen, onClose, pickupLocation, deliveryLocation }) => {
    const mapContainerRef = useRef(null);
    const { key: mapKey } = useMapContext();
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const mapRef = useRef(null);
    const walkingRef = useRef(null);

    useEffect(() => {
        let isMounted = true;

        if (isOpen && mapContainerRef.current && mapKey && pickupLocation && deliveryLocation) {
            setIsLoading(true);
            setError(null);

            const loadMap = async () => {
                try {
                    const AMap = await AMapLoader.load({
                        key: mapKey,
                        version: "2.0",
                        plugins: ['AMap.Walking'],
                    });

                    if (!isMounted) return;

                    const map = new AMap.Map(mapContainerRef.current, {
                        zoom: 12,
                        center: [
                            (pickupLocation.longitude + deliveryLocation.longitude) / 2,
                            (pickupLocation.latitude + deliveryLocation.latitude) / 2
                        ]
                    });

                    mapRef.current = map;

                    const walking = new AMap.Walking({
                        map: map,
                        panel: "panel"
                    });

                    walkingRef.current = walking;

                    walking.search(
                        [pickupLocation.longitude, pickupLocation.latitude],
                        [deliveryLocation.longitude, deliveryLocation.latitude],
                        (status, result) => {
                            if (isMounted) {
                                if (status === 'complete') {
                                    console.log('绘制步行路线完成');
                                    setIsLoading(false);
                                } else {
                                    console.error('步行路线数据查询失败' + result);
                                    setError('无法加载路线规划，请稍后再试');
                                    setIsLoading(false);
                                }
                            }
                        }
                    );
                } catch (error) {
                    if (isMounted) {
                        console.error('Error loading AMap:', error);
                        setError('加载地图失败，请刷新页面重试');
                        setIsLoading(false);
                    }
                }
            };

            loadMap();
        }

        return () => {
            isMounted = false;
            if (mapRef.current) {
                mapRef.current.destroy();
                mapRef.current = null;
            }
            if (walkingRef.current) {
                walkingRef.current.clear();
                walkingRef.current = null;
            }
        };
    }, [isOpen, mapKey, pickupLocation, deliveryLocation]);

    return (
        <Modal
            title="路线规划"
            open={isOpen}
            onCancel={onClose}
            width={800}
            centered
            destroyOnClose
            footer={[
                <Button key="close" type="primary" danger onClick={onClose}>
                    关闭
                </Button>
            ]}
            bodyStyle={{ padding: '20px', maxHeight: '80vh', overflowY: 'auto' }}
        >
            <div className={styles.mapWrapper}>
                {isLoading && (
                    <div className={styles.loadingContainer}>
                        <Spin size="large" tip="加载中..." />
                    </div>
                )}
                {error && (
                    <Alert
                        message="错误"
                        description={error}
                        type="error"
                        showIcon
                        style={{ margin: '20px 0' }}
                    />
                )}
                <div
                    ref={mapContainerRef}
                    className={`${styles.mapContainer} ${isLoading ? styles.hidden : ''}`}
                />
            </div>
            <div
                id="panel"
                className={`${styles.panel} ${isLoading ? styles.hidden : ''}`}
            />
        </Modal>
    );
};

export default RoutePlanningModal;