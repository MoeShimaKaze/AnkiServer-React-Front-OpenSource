import React, { createContext, useState, useEffect, useContext } from 'react';
import axios from 'axios';

const MapContext = createContext();

export const MapProvider = ({ children }) => {
    const [mapConfig, setMapConfig] = useState({
        key: '',
        proxyUrl: ''
    });

    useEffect(() => {
        const fetchMapConfig = async () => {
            try {
                const response = await axios.get('http://127.0.0.1:8080/api/map-config', {
                    withCredentials: true
                });
                setMapConfig({
                    key: response.data.key,
                    proxyUrl: response.data.proxyUrl || "http://127.0.0.1:8080/_AMapService" // 使用默认值或从后端获取
                });
            } catch (error) {
                console.error('获取高德地图配置失败:', error);
            }
        };

        fetchMapConfig();
    }, []);

    useEffect(() => {
        if (mapConfig.proxyUrl) {
            window._AMapSecurityConfig = {
                serviceHost: mapConfig.proxyUrl
            };
        }
    }, [mapConfig.proxyUrl]);

    return (
        <MapContext.Provider value={mapConfig}>
            {children}
        </MapContext.Provider>
    );
};

export const useMapContext = () => useContext(MapContext);