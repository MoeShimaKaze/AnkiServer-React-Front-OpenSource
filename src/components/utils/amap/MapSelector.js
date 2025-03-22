import React, { useState, useEffect, useRef, useCallback } from 'react';
import AMapLoader from '@amap/amap-jsapi-loader';
import { Input, Button, List, Spin, Typography } from 'antd'; // 引入Ant Design组件
import { SearchOutlined } from '@ant-design/icons'; // 引入图标
import styles from '../../../assets/css/map/MapSelector.module.css';
import { useMapContext } from '../../context/MapContext';

const { Text } = Typography;

const MapSelector = ({
                         id,  // 接收 id 属性
                         initialAddress,
                         onAddressSelect,
                         placeholder = "输入地址搜索"
                     }) => {
    const [map, setMap] = useState(null);
    const [AMap, setAMap] = useState(null);
    const [placeSearch, setPlaceSearch] = useState(null);
    const [searchResults, setSearchResults] = useState([]);
    const [searchStatus, setSearchStatus] = useState('');
    const [address, setAddress] = useState(initialAddress || '');
    const [isLoading, setIsLoading] = useState(false);

    const mapContainerRef = useRef(null);
    const { key: mapKey } = useMapContext();

    useEffect(() => {
        if (!mapKey) return;

        const loadMap = async () => {
            try {
                setIsLoading(true);
                const AMapInstance = await AMapLoader.load({
                    key: mapKey,
                    version: "2.0",
                    plugins: ['AMap.PlaceSearch'],
                });

                setAMap(AMapInstance);

                if (mapContainerRef.current) {
                    const mapInstance = new AMapInstance.Map(mapContainerRef.current, {
                        viewMode: "3D",
                        zoom: 17,
                        center: [113.025864, 23.139027],
                    });
                    setMap(mapInstance);

                    const placeSearchInstance = new AMapInstance.PlaceSearch({
                        map: mapInstance
                    });
                    setPlaceSearch(placeSearchInstance);
                }
                setIsLoading(false);
            } catch (error) {
                console.error('Error loading AMap:', error);
                setSearchStatus('地图加载失败，请刷新页面重试');
                setIsLoading(false);
            }
        };

        loadMap();
    }, [mapKey]);

    const handleAddressSearch = useCallback((e) => {
        e.preventDefault();
        if (!placeSearch) return;

        setIsLoading(true);
        setSearchStatus('搜索中...');

        placeSearch.search(address, (status, result) => {
            setIsLoading(false);
            if (status === 'complete' && result.poiList && result.poiList.pois.length > 0) {
                setSearchResults(result.poiList.pois);
                setSearchStatus('');
            } else {
                setSearchResults([]);
                setSearchStatus('未找到匹配的地址，请尝试其他关键词');
            }
        });
    }, [placeSearch, address]);

    const handleSelectAddress = useCallback((selected) => {
        if (selected && map && AMap) {
            setSearchStatus('正在获取详细地址信息...');
            setAddress(selected.name);
            setSearchResults([]);
            setSearchStatus('');

            map.setCenter([selected.location.lng, selected.location.lat]);
            new AMap.Marker({
                map: map,
                position: [selected.location.lng, selected.location.lat]
            });

            onAddressSelect({
                name: selected.name,
                latitude: selected.location.lat,
                longitude: selected.location.lng,
                detail: selected.address
            });
        }
    }, [map, AMap, onAddressSelect]);

    return (
        <div className={styles.container}>
            <div className={styles.inputGroup}>
                <Input
                    id={id}
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder={placeholder}
                    onPressEnter={handleAddressSearch}
                    style={{ flex: 1 }}
                    allowClear
                />
                <Button
                    type="primary"
                    onClick={handleAddressSearch}
                    icon={<SearchOutlined />}
                    loading={isLoading}
                >
                    搜索
                </Button>
            </div>

            {searchStatus && <Text type="secondary" className={styles.status}>{searchStatus}</Text>}

            {searchResults.length > 0 && (
                <List
                    className={styles.resultsList}
                    bordered
                    size="small"
                    dataSource={searchResults}
                    renderItem={(result) => (
                        <List.Item
                            className={styles.resultItem}
                            onClick={() => handleSelectAddress(result)}
                            style={{ cursor: 'pointer' }}
                            hoverable
                        >
                            <Text>{result.name}</Text>
                        </List.Item>
                    )}
                />
            )}

            <div className={styles.mapContainer}>
                {isLoading && (
                    <div className={styles.mapLoading}>
                        <Spin tip="地图加载中..." size="large" />
                    </div>
                )}
                <div
                    ref={mapContainerRef}
                    className={styles.mapContent}
                    style={{ height: '100%', width: '100%' }}
                />
            </div>
        </div>
    );
};

export default MapSelector;