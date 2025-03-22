// VerificationForm.js - Ant Design版本
import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import styles from '../../assets/css/user/VerificationForm.module.css';
import Navbar from "../base/Navbar";
import ImageCropper from '../utils/ImageCropper'; // 保留原有图片裁剪组件
import {
    Form,
    Input,
    Select,
    Button,
    Spin,
    Alert,
    Card,
    Typography,
    Upload,
    Divider
} from 'antd';
import {
    IdcardOutlined,
    UserOutlined,
    UploadOutlined,
    ArrowLeftOutlined,
    CheckOutlined,
    DeleteOutlined,
    ScissorOutlined
} from '@ant-design/icons';

const { Title } = Typography;
const { Option } = Select;

const VerificationForm = () => {
    const [form] = Form.useForm();
    const [formData, setFormData] = useState({
        idNumber: '',
        realName: '',
        identity: '',
        studentId: '',
        socialCreditCode: '',
    });

    const [files, setFiles] = useState({
        idCardFront: null,
        idCardBack: null,
        selfPhoto: null,
        additionalPhoto: null,
    });

    // 预览图片状态
    const [previews, setPreviews] = useState({
        idCardFront: '',
        idCardBack: '',
        selfPhoto: '',
        additionalPhoto: '',
    });

    // 裁剪图片状态
    const [currentCropImage, setCurrentCropImage] = useState(null);
    const [currentCropField, setCurrentCropField] = useState(null);
    const [showCropper, setShowCropper] = useState(false);

    const [isFocused, setIsFocused] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [successMessage, setSuccessMessage] = useState('');

    const navigate = useNavigate();
    const { userId } = useAuth();

    const handleReturn = useCallback(() => {
        try {
            navigate('/profile', { replace: true });
        } catch (error) {
            console.error('导航错误:', error);
        }
    }, [navigate]);

    useEffect(() => {
        // 此处只保留其他必要的初始化逻辑，不再检查登录状态
        setIsLoading(false);
    }, []);

    const handleInputChange = (name, value) => {
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
        setError('');
    };

    const handleFileChange = (field, file) => {
        if (file) {
            if (file.size > 10 * 1024 * 1024) { // 10MB limit
                setError('文件大小不能超过10MB');
                return false;
            }

            const allowedTypes = ['image/jpeg', 'image/png', 'image/gif'];
            if (!allowedTypes.includes(file.type)) {
                setError('只支持 JPG、PNG 和 GIF 格式的图片');
                return false;
            }

            // 创建文件的URL用于裁剪
            const imageUrl = URL.createObjectURL(file);
            setCurrentCropImage(imageUrl);
            setCurrentCropField(field);
            setShowCropper(true);
            setError('');
            return false; // 阻止默认上传行为
        }
        return false;
    };

    // 处理裁剪完成
    const handleCropComplete = (cropResult) => {
        if (!currentCropField) return;

        // 更新文件和预览
        setFiles(prev => ({
            ...prev,
            [currentCropField]: cropResult.file
        }));

        setPreviews(prev => ({
            ...prev,
            [currentCropField]: cropResult.url
        }));

        // 关闭裁剪器
        setShowCropper(false);

        // 清理原始图片URL
        if (currentCropImage) {
            URL.revokeObjectURL(currentCropImage);
            setCurrentCropImage(null);
        }

        setCurrentCropField(null);
    };

    // 取消裁剪
    const handleCropCancel = () => {
        if (currentCropImage) {
            URL.revokeObjectURL(currentCropImage);
            setCurrentCropImage(null);
        }
        setCurrentCropField(null);
        setShowCropper(false);
    };

    // 移除已上传图片
    const handleRemoveImage = (field) => {
        setFiles(prev => ({ ...prev, [field]: null }));
        setPreviews(prev => ({ ...prev, [field]: '' }));
    };

    // 重新裁剪图片
    const handleReCropImage = (field) => {
        if (files[field]) {
            const imageUrl = URL.createObjectURL(files[field]);
            setCurrentCropImage(imageUrl);
            setCurrentCropField(field);
            setShowCropper(true);
        }
    };

    const handleSubmit = async (values) => {
        if (!userId || isSubmitting) return;

        // 检查必须的文件是否已上传
        if (!files.idCardFront || !files.idCardBack || !files.selfPhoto) {
            setError('请上传必要的证件照片');
            return;
        }

        // 检查学生身份和平台专员身份是否上传了附加照片
        if ((values.identity === 'STUDENT' || values.identity === 'PLATFORM_STAFF') && !files.additionalPhoto) {
            setError(`请上传${getAdditionalPhotoLabel(values.identity)}`);
            return;
        }

        try {
            setIsSubmitting(true);
            setError('');
            setSuccessMessage('');

            const formDataToSend = new FormData();
            formDataToSend.append('idNumber', values.idNumber);
            formDataToSend.append('realName', values.realName);
            formDataToSend.append('userIdentity', values.identity);

            if (values.identity === 'STUDENT') {
                formDataToSend.append('studentId', values.studentId);
            } else if (values.identity === 'MERCHANT') {
                formDataToSend.append('socialCreditCode', values.socialCreditCode);
            }

            // 添加必需文件
            formDataToSend.append('idCardFront', files.idCardFront);
            formDataToSend.append('idCardBack', files.idCardBack);
            formDataToSend.append('selfPhoto', files.selfPhoto);

            // 只有学生和平台专员需要附加照片
            if ((values.identity === 'STUDENT' || values.identity === 'PLATFORM_STAFF') && files.additionalPhoto) {
                formDataToSend.append('additionalPhoto', files.additionalPhoto);
            } else if (values.identity === 'VERIFIED_USER') {
                // 普通用户实名认证不需要附加照片，添加一个null文件占位
                const emptyBlob = new Blob([], { type: "application/octet-stream" });
                formDataToSend.append('additionalPhoto', emptyBlob, "empty.jpg");
            }

            // 打印表单数据用于调试
            console.log('提交表单数据:', {
                idNumber: values.idNumber,
                realName: values.realName,
                userIdentity: values.identity,
                studentId: values.studentId,
                socialCreditCode: values.socialCreditCode,
                hasIdCardFront: !!files.idCardFront,
                hasIdCardBack: !!files.idCardBack,
                hasSelfPhoto: !!files.selfPhoto,
                hasAdditionalPhoto: !!files.additionalPhoto
            });

            // 发送请求
            await axios({
                method: 'post',
                url: `http://127.0.0.1:8080/api/users/${userId}/verify`,
                data: formDataToSend,
                withCredentials: true,
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            setSuccessMessage('实名认证申请提交成功');
            await new Promise(resolve => setTimeout(resolve, 1500));
            handleReturn();
        } catch (error) {
            console.error('提交失败:', error);

            // 错误处理部分保持不变
            let errorMessage = '提交失败，请稍后重试';
            try {
                if (error.response) {
                    if (typeof error.response.data === 'string') {
                        errorMessage = error.response.data;
                    } else if (error.response.data && typeof error.response.data === 'object') {
                        errorMessage = error.response.data.message ||
                            error.response.data.error ||
                            JSON.stringify(error.response.data);
                    }
                } else if (error.message) {
                    errorMessage = error.message;
                }
            } catch (e) {
                console.error('处理错误响应时发生异常:', e);
                errorMessage = '无法处理错误响应';
            }

            setError(errorMessage);
        } finally {
            setIsSubmitting(false);
        }
    };

    const getAdditionalPhotoLabel = (identity) => {
        switch (identity) {
            case 'STUDENT': return '学生证照片';
            case 'PLATFORM_STAFF': return '合同照片';
            case 'MERCHANT': return '营业执照照片';
            default: return '附加照片';
        }
    };

    // 自定义文件上传按钮
    const uploadButton = (
        <div>
            <UploadOutlined />
            <div style={{ marginTop: 8 }}>选择文件</div>
        </div>
    );

    if (isLoading) {
        return (
            <div className={styles.verificationWrapper}>
                <Navbar />
                <div className={styles.loadingContainer}>
                    <Spin size="large" tip="加载中..." />
                </div>
            </div>
        );
    }

    return (
        <div className={styles.verificationWrapper}>
            <Navbar />
            <div className={`${styles.verificationBackground} ${isFocused ? styles.blur : ''}`}></div>

            <Card className={styles.verificationContainer} bordered={false}>
                {isSubmitting && (
                    <div className={styles.submittingOverlay}>
                        <Spin size="large" tip="提交中..." />
                    </div>
                )}

                {/* 图片裁剪组件 */}
                {showCropper && (
                    <ImageCropper
                        image={currentCropImage}
                        onCropComplete={handleCropComplete}
                        onCancel={handleCropCancel}
                        aspectRatio={
                            // 对于身份证，使用更接近真实尺寸的比例
                            currentCropField === 'idCardFront' || currentCropField === 'idCardBack'
                                ? 1.58 // 身份证标准比例
                                : 1 // 其他照片使用正方形
                        }
                    />
                )}

                <div className={styles.formHeader}>
                    <Title level={4}>实名认证</Title>
                    <Button
                        type="default"
                        icon={<ArrowLeftOutlined />}
                        onClick={handleReturn}
                        className={styles.returnButton}
                    >
                        返回
                    </Button>
                </div>

                {error && <Alert message={error} type="error" showIcon style={{marginBottom: '20px'}} />}
                {successMessage && <Alert message={successMessage} type="success" showIcon style={{marginBottom: '20px'}} />}

                <Form
                    form={form}
                    name="verificationForm"
                    layout="vertical"
                    initialValues={formData}
                    onFinish={handleSubmit}
                    onFocus={() => setIsFocused(true)}
                    onBlur={() => setIsFocused(false)}
                >
                    <Form.Item
                        label="身份证号"
                        name="idNumber"
                        rules={[{ required: true, message: '请输入身份证号' }]}
                    >
                        <Input
                            prefix={<IdcardOutlined />}
                            placeholder="请输入身份证号"
                            onChange={(e) => handleInputChange('idNumber', e.target.value)}
                        />
                    </Form.Item>

                    <Form.Item
                        label="真实姓名"
                        name="realName"
                        rules={[{ required: true, message: '请输入真实姓名' }]}
                    >
                        <Input
                            prefix={<UserOutlined />}
                            placeholder="请输入真实姓名"
                            onChange={(e) => handleInputChange('realName', e.target.value)}
                        />
                    </Form.Item>

                    <Form.Item
                        label="身份"
                        name="identity"
                        rules={[{ required: true, message: '请选择身份' }]}
                    >
                        <Select
                            placeholder="选择身份"
                            onChange={(value) => handleInputChange('identity', value)}
                        >
                            <Option value="STUDENT">学生</Option>
                            <Option value="PLATFORM_STAFF">平台专人</Option>
                            <Option value="VERIFIED_USER">普通实名用户</Option>
                        </Select>
                    </Form.Item>

                    {formData.identity === 'STUDENT' && (
                        <Form.Item
                            label="学号"
                            name="studentId"
                            rules={[{ required: true, message: '请输入学号' }]}
                        >
                            <Input
                                placeholder="请输入学号"
                                onChange={(e) => handleInputChange('studentId', e.target.value)}
                            />
                        </Form.Item>
                    )}

                    {formData.identity === 'MERCHANT' && (
                        <Form.Item
                            label="统一社会信用代码"
                            name="socialCreditCode"
                            rules={[{ required: true, message: '请输入统一社会信用代码' }]}
                        >
                            <Input
                                placeholder="请输入统一社会信用代码"
                                onChange={(e) => handleInputChange('socialCreditCode', e.target.value)}
                            />
                        </Form.Item>
                    )}

                    <Divider>证件照片上传</Divider>

                    {/* 身份证正面照片 */}
                    <Form.Item
                        label="身份证正面照片"
                        required
                        extra="拍摄时确保身份证信息清晰可见"
                    >
                        <Upload
                            listType="picture-card"
                            showUploadList={false}
                            beforeUpload={(file) => handleFileChange('idCardFront', file)}
                            fileList={files.idCardFront ? [files.idCardFront] : []}
                        >
                            {previews.idCardFront ? null : uploadButton}
                        </Upload>

                        {previews.idCardFront && (
                            <div className={styles.imagePreview}>
                                <img src={previews.idCardFront} alt="身份证正面" />
                                <div className={styles.imageControls}>
                                    <Button
                                        type="primary"
                                        icon={<ScissorOutlined />}
                                        size="small"
                                        onClick={() => handleReCropImage('idCardFront')}
                                        className={styles.reCropButton}
                                    >
                                        重新裁剪
                                    </Button>
                                    <Button
                                        type="primary"
                                        danger
                                        icon={<DeleteOutlined />}
                                        size="small"
                                        onClick={() => handleRemoveImage('idCardFront')}
                                        className={styles.removeButton}
                                    >
                                        移除
                                    </Button>
                                </div>
                            </div>
                        )}
                    </Form.Item>

                    {/* 身份证背面照片 */}
                    <Form.Item
                        label="身份证背面照片"
                        required
                        extra="拍摄时确保身份证信息清晰可见"
                    >
                        <Upload
                            listType="picture-card"
                            showUploadList={false}
                            beforeUpload={(file) => handleFileChange('idCardBack', file)}
                            fileList={files.idCardBack ? [files.idCardBack] : []}
                        >
                            {previews.idCardBack ? null : uploadButton}
                        </Upload>

                        {previews.idCardBack && (
                            <div className={styles.imagePreview}>
                                <img src={previews.idCardBack} alt="身份证背面" />
                                <div className={styles.imageControls}>
                                    <Button
                                        type="primary"
                                        icon={<ScissorOutlined />}
                                        size="small"
                                        onClick={() => handleReCropImage('idCardBack')}
                                        className={styles.reCropButton}
                                    >
                                        重新裁剪
                                    </Button>
                                    <Button
                                        type="primary"
                                        danger
                                        icon={<DeleteOutlined />}
                                        size="small"
                                        onClick={() => handleRemoveImage('idCardBack')}
                                        className={styles.removeButton}
                                    >
                                        移除
                                    </Button>
                                </div>
                            </div>
                        )}
                    </Form.Item>

                    {/* 个人照片 */}
                    <Form.Item
                        label="个人照片"
                        required
                        extra="清晰的免冠照片"
                    >
                        <Upload
                            listType="picture-card"
                            showUploadList={false}
                            beforeUpload={(file) => handleFileChange('selfPhoto', file)}
                            fileList={files.selfPhoto ? [files.selfPhoto] : []}
                        >
                            {previews.selfPhoto ? null : uploadButton}
                        </Upload>

                        {previews.selfPhoto && (
                            <div className={styles.imagePreview}>
                                <img src={previews.selfPhoto} alt="个人照片" />
                                <div className={styles.imageControls}>
                                    <Button
                                        type="primary"
                                        icon={<ScissorOutlined />}
                                        size="small"
                                        onClick={() => handleReCropImage('selfPhoto')}
                                        className={styles.reCropButton}
                                    >
                                        重新裁剪
                                    </Button>
                                    <Button
                                        type="primary"
                                        danger
                                        icon={<DeleteOutlined />}
                                        size="small"
                                        onClick={() => handleRemoveImage('selfPhoto')}
                                        className={styles.removeButton}
                                    >
                                        移除
                                    </Button>
                                </div>
                            </div>
                        )}
                    </Form.Item>

                    {/* 其他照片 - 只在学生或平台专员身份时显示 */}
                    {(formData.identity === 'STUDENT' || formData.identity === 'PLATFORM_STAFF') && (
                        <Form.Item
                            label={getAdditionalPhotoLabel(formData.identity)}
                            required
                            extra={`请上传${formData.identity === 'STUDENT' ? '学生证照片' : '合同照片'}以完成认证`}
                        >
                            <Upload
                                listType="picture-card"
                                showUploadList={false}
                                beforeUpload={(file) => handleFileChange('additionalPhoto', file)}
                                fileList={files.additionalPhoto ? [files.additionalPhoto] : []}
                            >
                                {previews.additionalPhoto ? null : uploadButton}
                            </Upload>

                            {previews.additionalPhoto && (
                                <div className={styles.imagePreview}>
                                    <img src={previews.additionalPhoto} alt={getAdditionalPhotoLabel(formData.identity)} />
                                    <div className={styles.imageControls}>
                                        <Button
                                            type="primary"
                                            icon={<ScissorOutlined />}
                                            size="small"
                                            onClick={() => handleReCropImage('additionalPhoto')}
                                            className={styles.reCropButton}
                                        >
                                            重新裁剪
                                        </Button>
                                        <Button
                                            type="primary"
                                            danger
                                            icon={<DeleteOutlined />}
                                            size="small"
                                            onClick={() => handleRemoveImage('additionalPhoto')}
                                            className={styles.removeButton}
                                        >
                                            移除
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </Form.Item>
                    )}

                    <Form.Item className={styles.buttonContainer}>
                        <Button
                            type="primary"
                            htmlType="submit"
                            size="large"
                            icon={<CheckOutlined />}
                            disabled={isSubmitting}
                            className={styles.submitButton}
                            loading={isSubmitting}
                        >
                            {isSubmitting ? '提交中...' : '提交实名认证'}
                        </Button>
                    </Form.Item>
                </Form>
            </Card>
        </div>
    );
};

export default VerificationForm;