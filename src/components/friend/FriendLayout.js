// FriendLayout.js
import React, { useState, useEffect } from 'react';
import Navbar from '../base/Navbar';
import FriendSidebar from './FriendSidebar';
import styles from '../../assets/css/friend/FriendLayout.module.css';

const FriendLayout = ({ children, background = 'default' }) => {
    const [pendingRequests, setPendingRequests] = useState(0);

    // 获取待处理请求数量
    useEffect(() => {
        const fetchPendingRequests = async () => {
            try {
                const response = await fetch(
                    'http://127.0.0.1:8080/api/friend/requests/pending-count',
                    { credentials: 'include' }
                );
                if (response.ok) {
                    const count = await response.json();
                    setPendingRequests(count);
                }
            } catch (error) {
                console.error('获取待处理请求数量失败:', error);
            }
        };

        fetchPendingRequests();
    }, []);

    // 根据传入的background参数选择背景图
    const getBackgroundClass = () => {
        switch (background) {
            case 'create-profile':
                return styles.createProfileBg;
            case 'detail':
                return styles.detailBg;
            case 'matches':
                return styles.matchesBg;
            case 'my-friends':
                return styles.myFriendsBg;
            default:
                return styles.defaultBg;
        }
    };

    return (
        <div className={styles.pageContainer}>
            <Navbar />
            <div className={`${styles.background} ${getBackgroundClass()}`}></div>
            <div className={styles.contentWrapper}>
                <div className={styles.layoutContainer}>
                    <FriendSidebar pendingRequests={pendingRequests} />
                    <div className={styles.mainContent}>
                        {children}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default FriendLayout;