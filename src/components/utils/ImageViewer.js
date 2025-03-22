// ImageViewer.js
import React from 'react';
import styles from '../../assets/css/utils/ImageViewer.module.css';

const ImageViewer = ({ imageUrl, onClose, alt = '图片预览' }) => {
    // 阻止图片容器的点击事件冒泡
    const handleContainerClick = (e) => {
        e.stopPropagation();
    };

    return (
        <div className={styles.viewerOverlay} onClick={onClose}>
            <div className={styles.viewerContainer} onClick={handleContainerClick}>
                <img
                    src={imageUrl}
                    alt={alt}
                    className={styles.viewerImage}
                />
                <div
                    className={styles.closeButtonContainer}
                    onClick={onClose}
                    role="button"
                    aria-label="关闭预览"
                >
                    <div className={styles.closeButton} />
                </div>
            </div>
        </div>
    );
};

export default ImageViewer;