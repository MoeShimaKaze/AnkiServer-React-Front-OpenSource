import React from 'react';
import styles from '../../assets/css/base/Loading.module.css';

const Loading = ({ size = 'md', color = '#fff', className = '' }) => {
    const sizeClass = {
        sm: styles['la-sm'],
        md: '',
        lg: styles['la-2x'],
        xl: styles['la-3x']
    }[size] || '';

    const colorClass = color === 'dark' ? styles['la-dark'] : '';

    return (
        <div className={`${styles.loadingContainer} ${className}`}>
            <div className={`${styles['la-ball-clip-rotate-pulse']} ${sizeClass} ${colorClass}`}>
                <div></div>
                <div></div>
            </div>
        </div>
    );
};

export default Loading;