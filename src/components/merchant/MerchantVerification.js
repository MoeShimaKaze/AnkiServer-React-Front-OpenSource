import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import Loading from '../utils/Loading';
import Navbar from '../base/Navbar'; // 引入导航栏组件
import ImageCropper from '../utils/ImageCropper';
import ImageViewer from '../utils/ImageViewer';
import styles from '../../assets/css/merchant/MerchantVerification.module.css';

const MerchantVerification = () => {
    const { userId } = useAuth();
    const navigate = useNavigate();

    // 表单状态
    const [formData, setFormData] = useState({
        businessLicense: '',
        realName: '',
        contactPhone: '',
        businessAddress: ''
    });

    // 图片状态
    const [licenseImage, setLicenseImage] = useState(null);
    const [licensePreview, setLicensePreview] = useState(null);
    const [isImageViewerOpen, setIsImageViewerOpen] = useState(false);
    const [showCropper, setShowCropper] = useState(false);
    const [tempImage, setTempImage] = useState(null);

    // 验证状态
    const [errors, setErrors] = useState({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitStatus, setSubmitStatus] = useState(null);

    // 表单输入处理
    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));

        // 清除字段错误
        if (errors[name]) {
            setErrors(prev => ({
                ...prev,
                [name]: null
            }));
        }
    };

    // 文件选择处理
    const handleFileSelect = (e) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            const fileUrl = URL.createObjectURL(file);
            setTempImage(fileUrl);
            setShowCropper(true);
        }
    };

    // 图片裁剪完成处理
    const handleCropComplete = (croppedImage) => {
        setLicenseImage(croppedImage.file);
        setLicensePreview(croppedImage.url);
        setShowCropper(false);

        // 清除图片错误
        if (errors.licenseImage) {
            setErrors(prev => ({
                ...prev,
                licenseImage: null
            }));
        }
    };

    // 取消裁剪
    const handleCropCancel = () => {
        setShowCropper(false);
        setTempImage(null);
    };

    // 预览图片
    const handlePreviewImage = () => {
        if (licensePreview) {
            setIsImageViewerOpen(true);
        }
    };

    // 关闭预览
    const handleClosePreview = () => {
        setIsImageViewerOpen(false);
    };

    // 移除已上传图片
    const handleRemoveImage = () => {
        setLicenseImage(null);
        setLicensePreview(null);
    };

    // 表单验证
    const validateForm = () => {
        const newErrors = {};

        // 营业执照验证 (18位字母数字)
        if (!formData.businessLicense) {
            newErrors.businessLicense = '请输入营业执照号';
        } else if (!/^[A-Za-z0-9]{18}$/.test(formData.businessLicense)) {
            newErrors.businessLicense = '营业执照号格式不正确，应为18位字母或数字';
        }

        // 姓名验证
        if (!formData.realName) {
            newErrors.realName = '请输入联系人姓名';
        } else if (formData.realName.trim().length < 2) {
            newErrors.realName = '联系人姓名不能少于2个字符';
        }

        // 手机号验证 (中国大陆手机号)
        if (!formData.contactPhone) {
            newErrors.contactPhone = '请输入联系电话';
        } else if (!/^1[3-9]\d{9}$/.test(formData.contactPhone)) {
            newErrors.contactPhone = '请输入正确的手机号码';
        }

        // 地址验证
        if (!formData.businessAddress) {
            newErrors.businessAddress = '请输入经营地址';
        } else if (formData.businessAddress.trim().length < 10) {
            newErrors.businessAddress = '经营地址信息不完整，请提供详细地址';
        }

        // 图片验证
        if (!licenseImage) {
            newErrors.licenseImage = '请上传营业执照图片';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    // 表单提交
    const handleSubmit = async (e) => {
        e.preventDefault();

        // 表单验证
        if (!validateForm()) {
            return;
        }

        // 开始提交
        setIsSubmitting(true);
        setSubmitStatus(null);

        try {
            // 创建FormData对象用于文件上传
            const formDataToSend = new FormData();
            formDataToSend.append('userId', userId);
            formDataToSend.append('businessLicense', formData.businessLicense);
            formDataToSend.append('realName', formData.realName);
            formDataToSend.append('licenseImage', licenseImage);
            formDataToSend.append('contactPhone', formData.contactPhone);
            formDataToSend.append('businessAddress', formData.businessAddress);

            // 发送请求
            const response = await axios.post(
                'http://127.0.0.1:8080/api/merchants/verification',
                formDataToSend,
                {
                    withCredentials: true,
                    headers: {
                        'Content-Type': 'multipart/form-data'
                    }
                }
            );

            // 处理成功响应
            setSubmitStatus({
                success: true,
                message: '商家认证申请已提交，等待审核',
                data: response.data
            });

            // 延迟跳转到商家信息页面
            setTimeout(() => {
                navigate('/profile');
            }, 2000);

        } catch (error) {
            console.error('商家认证申请失败:', error);

            // 处理错误响应
            setSubmitStatus({
                success: false,
                message: error.response?.data || '商家认证申请失败，请稍后重试'
            });

        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className={styles.pageContainer}>
            <Navbar />
            <div className={styles.contentWrapper}>
                <div className={styles.verificationContainer}>
                    <h2 className={styles.title}>商家认证申请</h2>

                    {/* 提交状态显示 */}
                    {submitStatus && (
                        <div className={`${styles.statusMessage} ${submitStatus.success ? styles.success : styles.error}`}>
                            {submitStatus.message}
                        </div>
                    )}

                    <form className={styles.verificationForm} onSubmit={handleSubmit}>
                        {/* 营业执照 */}
                        <div className={styles.formGroup}>
                            <label htmlFor="businessLicense">营业执照号 <span className={styles.required}>*</span></label>
                            <input
                                type="text"
                                id="businessLicense"
                                name="businessLicense"
                                className={errors.businessLicense ? styles.inputError : ''}
                                value={formData.businessLicense}
                                onChange={handleChange}
                                placeholder="请输入18位统一社会信用代码"
                            />
                            {errors.businessLicense && <div className={styles.errorText}>{errors.businessLicense}</div>}
                        </div>

                        {/* 联系人姓名 */}
                        <div className={styles.formGroup}>
                            <label htmlFor="realName">联系人姓名 <span className={styles.required}>*</span></label>
                            <input
                                type="text"
                                id="realName"
                                name="realName"
                                className={errors.realName ? styles.inputError : ''}
                                value={formData.realName}
                                onChange={handleChange}
                                placeholder="请输入联系人姓名"
                            />
                            {errors.realName && <div className={styles.errorText}>{errors.realName}</div>}
                        </div>

                        {/* 联系电话 */}
                        <div className={styles.formGroup}>
                            <label htmlFor="contactPhone">联系电话 <span className={styles.required}>*</span></label>
                            <input
                                type="tel"
                                id="contactPhone"
                                name="contactPhone"
                                className={errors.contactPhone ? styles.inputError : ''}
                                value={formData.contactPhone}
                                onChange={handleChange}
                                placeholder="请输入手机号码"
                            />
                            {errors.contactPhone && <div className={styles.errorText}>{errors.contactPhone}</div>}
                        </div>

                        {/* 经营地址 */}
                        <div className={styles.formGroup}>
                            <label htmlFor="businessAddress">经营地址 <span className={styles.required}>*</span></label>
                            <textarea
                                id="businessAddress"
                                name="businessAddress"
                                className={errors.businessAddress ? styles.textareaError : ''}
                                value={formData.businessAddress}
                                onChange={handleChange}
                                placeholder="请输入详细经营地址"
                                rows={3}
                            />
                            {errors.businessAddress && <div className={styles.errorText}>{errors.businessAddress}</div>}
                        </div>

                        {/* 营业执照图片上传 */}
                        <div className={styles.formGroup}>
                            <label>营业执照照片 <span className={styles.required}>*</span></label>

                            <div className={styles.uploadSection}>
                                {!licensePreview ? (
                                    <div className={styles.uploadBox}>
                                        <input
                                            type="file"
                                            id="licenseImage"
                                            accept="image/*"
                                            onChange={handleFileSelect}
                                            className={styles.fileInput}
                                        />
                                        <div className={styles.uploadPlaceholder}>
                                            <div className={styles.uploadIcon}>+</div>
                                            <div>点击上传营业执照照片</div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className={styles.previewBox}>
                                        <img
                                            src={licensePreview}
                                            alt="营业执照预览"
                                            className={styles.previewImage}
                                            onClick={handlePreviewImage}
                                        />
                                        <div className={styles.previewActions}>
                                            <button
                                                type="button"
                                                className={styles.previewButton}
                                                onClick={handlePreviewImage}
                                            >
                                                预览
                                            </button>
                                            <button
                                                type="button"
                                                className={styles.removeButton}
                                                onClick={handleRemoveImage}
                                            >
                                                移除
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {errors.licenseImage && <div className={styles.errorText}>{errors.licenseImage}</div>}

                            <div className={styles.uploadTips}>
                                <p>提示：</p>
                                <ul>
                                    <li>请上传清晰、完整的营业执照原件照片</li>
                                    <li>支持 JPG、PNG 格式，文件大小不超过 5MB</li>
                                    <li>请确保照片中的信息清晰可见，便于审核</li>
                                </ul>
                            </div>
                        </div>

                        {/* 提交按钮 */}
                        <div className={styles.formActions}>
                            <button
                                type="button"
                                className={styles.cancelButton}
                                onClick={() => navigate('/profile')}
                                disabled={isSubmitting}
                            >
                                取消
                            </button>
                            <button
                                type="submit"
                                className={styles.submitButton}
                                disabled={isSubmitting}
                            >
                                {isSubmitting ? (
                                    <div className={styles.buttonWithLoading}>
                                        <Loading size="sm" color="light" />
                                        <span>提交中...</span>
                                    </div>
                                ) : '提交认证'}
                            </button>
                        </div>
                    </form>

                    {/* 图片裁剪器 */}
                    {showCropper && (
                        <ImageCropper
                            image={tempImage}
                            onCropComplete={handleCropComplete}
                            onCancel={handleCropCancel}
                            aspectRatio={16/9}
                        />
                    )}

                    {/* 图片预览器 */}
                    {isImageViewerOpen && (
                        <ImageViewer
                            imageUrl={licensePreview}
                            onClose={handleClosePreview}
                            alt="营业执照预览"
                        />
                    )}
                </div>
            </div>
        </div>
    );
};

export default MerchantVerification;