// src/utils/ImageCropper.js
import React, { useState, useRef, useEffect } from 'react';
import Cropper from 'react-cropper';
import 'cropperjs/dist/cropper.css';
import styles from '../../assets/css/utils/ImageCropper.module.css';

const ImageCropper = ({
                          image,
                          onCropComplete,
                          onCancel,
                          aspectRatio = 1,
                          maxWidth = 800,
                          maxHeight = 800
                      }) => {
    const [cropper, setCropper] = useState(null);
    const cropperRef = useRef(null);
    const [isLoading, setIsLoading] = useState(false);

    // 监听窗口大小变化，调整cropper容器大小
    useEffect(() => {
        const handleResize = () => {
            if (cropper) {
                cropper.resize();
            }
        };

        window.addEventListener('resize', handleResize);
        return () => {
            window.removeEventListener('resize', handleResize);
        };
    }, [cropper]);

    // 获取裁剪后的图片数据
    const getCroppedImage = async () => {
        try {
            setIsLoading(true);
            if (!cropper) {
                throw new Error('Cropper not initialized');
            }

            // 获取裁剪区域的canvas
            const canvas = cropper.getCroppedCanvas({
                maxWidth: maxWidth,
                maxHeight: maxHeight,
                fillColor: '#fff',
                imageSmoothingEnabled: true,
                imageSmoothingQuality: 'high',
            });

            if (!canvas) {
                throw new Error('Could not create cropped canvas');
            }

            // 将canvas转换为Blob
            const blob = await new Promise((resolve) => {
                canvas.toBlob((blob) => {
                    resolve(blob);
                }, 'image/jpeg', 0.9);
            });

            // 创建File对象
            const file = new File([blob], 'cropped_image.jpg', { type: 'image/jpeg' });

            // 创建一个预览URL，用于显示裁剪后的图片
            const previewUrl = URL.createObjectURL(blob);

            // 将裁剪后的图片数据返回给父组件
            onCropComplete({
                file,
                url: previewUrl,
            });
        } catch (error) {
            console.error('裁剪图片失败:', error);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className={styles.cropperContainer}>
            <div className={styles.cropperOverlay} onClick={onCancel} />
            <div className={styles.cropperWrapper}>
                <div className={styles.cropperHeader}>
                    <h3>调整图片</h3>
                    <button
                        className={styles.closeButton}
                        onClick={onCancel}
                        aria-label="关闭裁剪器"
                    >
                        &times;
                    </button>
                </div>
                <div className={styles.cropperContent}>
                    <Cropper
                        ref={cropperRef}
                        src={image}
                        style={{ height: 400, width: '100%' }}
                        aspectRatio={aspectRatio}
                        guides={true}
                        viewMode={1}
                        dragMode="move"
                        scalable={true}
                        zoomable={true}
                        cropBoxMovable={true}
                        cropBoxResizable={true}
                        onInitialized={(instance) => {
                            setCropper(instance);
                        }}
                    />
                </div>
                <div className={styles.cropperFooter}>
                    <button
                        className={styles.cancelButton}
                        onClick={onCancel}
                        disabled={isLoading}
                    >
                        取消
                    </button>
                    <button
                        className={styles.cropButton}
                        onClick={getCroppedImage}
                        disabled={isLoading}
                    >
                        {isLoading ? '处理中...' : '确认裁剪'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ImageCropper;