// CreateQuestion.js
import React, { useState } from 'react';
import axios from 'axios';
import { QUESTION_TYPE_DESCRIPTION } from '../utils/map/questionTypeMap';
import Loading from '../utils/Loading';
import styles from '../../assets/css/question/CreateQuestion.module.css';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import ImageCropper from '../utils/ImageCropper'; // 导入图片裁剪组件

const CreateQuestion = ({ onCreateSuccess, onCancel }) => {
    // 表单状态管理
    const [formData, setFormData] = useState({
        questionType: '',
        shortTitle: '',
        description: '',
        contactInfo: '',
        contactName: '',
    });

    // 文件和预览状态管理
    const [imageFile, setImageFile] = useState(null);
    const [imagePreview, setImagePreview] = useState('');
    const [isPreviewMode, setIsPreviewMode] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [successMessage, setSuccessMessage] = useState('');

    // 新增图片裁剪状态
    const [cropImage, setCropImage] = useState(null);
    const [showCropper, setShowCropper] = useState(false);

    // 处理文件上传 - 修改为显示裁剪器
    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            if (file.size > 10 * 1024 * 1024) { // 增加上限到10MB，因为裁剪后会减小
                setError('图片大小不能超过10MB');
                return;
            }

            const allowedTypes = ['image/jpeg', 'image/png', 'image/gif'];
            if (!allowedTypes.includes(file.type)) {
                setError('只支持 JPG、PNG 和 GIF 格式的图片');
                return;
            }

            // 创建图片URL并显示裁剪器
            const imageUrl = URL.createObjectURL(file);
            setCropImage(imageUrl);
            setShowCropper(true);
            setError('');
        }
    };

    // 处理裁剪完成
    const handleCropComplete = (cropResult) => {
        // 更新图片文件和预览
        setImageFile(cropResult.file);
        setImagePreview(cropResult.url);

        // 如果描述字段有内容，将图片添加到描述中
        if (formData.description) {
            setFormData(prev => ({
                ...prev,
                description: prev.description + `\n![裁剪后的图片](${cropResult.url})`
            }));
        }

        // 关闭裁剪器
        setShowCropper(false);
        // 清理原始图片URL
        if (cropImage) {
            URL.revokeObjectURL(cropImage);
            setCropImage(null);
        }
    };

    // 取消裁剪
    const handleCropCancel = () => {
        if (cropImage) {
            URL.revokeObjectURL(cropImage);
            setCropImage(null);
        }
        setShowCropper(false);
    };

    // 处理表单输入变化
    const handleInputChange = (e) => {
        const { name, value } = e.target;

        if (name === 'shortTitle' && value.length > 30) {
            return;
        }

        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
        setError('');
    };

    // Markdown 工具栏函数
    const addMarkdownSyntax = (syntax) => {
        const textarea = document.querySelector('textarea[name="description"]');
        if (!textarea) return;

        // 安全地获取选区和文本内容
        const start = textarea.selectionStart || 0;
        const end = textarea.selectionEnd || 0;
        const text = textarea.value || '';
        const before = text.substring(0, start);
        const selection = text.substring(start, end);
        const after = text.substring(end);

        let newText = '';
        let newCursorPos = start;
        let placeholder = '';

        // 根据不同的语法添加相应的标记
        switch (syntax) {
            case 'bold':
                placeholder = '粗体文本';
                newText = `${before}**${selection || placeholder}**${after}`;
                newCursorPos = start + 2;
                break;
            case 'italic':
                placeholder = '斜体文本';
                newText = `${before}_${selection || placeholder}_${after}`;
                newCursorPos = start + 1;
                break;
            case 'code':
                placeholder = '代码块';
                newText = `${before}\`\`\`\n${selection || placeholder}\n\`\`\`${after}`;
                newCursorPos = start + 4;
                break;
            case 'link':
                placeholder = '链接文本';
                newText = `${before}[${selection || placeholder}](url)${after}`;
                newCursorPos = start + 1;
                break;
            case 'list':
                placeholder = '列表项';
                newText = `${before}\n- ${selection || placeholder}${after}`;
                newCursorPos = start + 3;
                break;
            default:
                return;
        }

        // 更新表单数据
        setFormData(prev => ({
            ...prev,
            description: newText
        }));

        // 设置新的光标位置
        setTimeout(() => {
            textarea.focus();
            const selectionLength = (selection || placeholder).length;
            textarea.setSelectionRange(newCursorPos, newCursorPos + selectionLength);
        }, 0);
    };

    // 表单验证
    const validateForm = () => {
        if (!formData.questionType) {
            setError('请选择问题类型');
            return false;
        }
        if (!formData.shortTitle.trim()) {
            setError('请输入问题标题');
            return false;
        }
        if (!formData.description.trim()) {
            setError('请输入问题描述');
            return false;
        }
        if (!formData.contactInfo.trim()) {
            setError('请输入联系方式');
            return false;
        }
        if (!formData.contactName.trim()) {
            setError('请输入联系人姓名');
            return false;
        }

        return true;
    };

    // 表单提交处理
    const handleSubmit = async (e) => {
        e.preventDefault();
        if (isSubmitting || !validateForm()) return;

        try {
            setIsSubmitting(true);
            setError('');
            setSuccessMessage('');

            const submitFormData = new FormData();
            submitFormData.append('questionType', formData.questionType);
            submitFormData.append('shortTitle', formData.shortTitle);
            submitFormData.append('description', formData.description);
            submitFormData.append('contactInfo', formData.contactInfo);
            submitFormData.append('contactName', formData.contactName);

            if (imageFile) {
                submitFormData.append('image', imageFile);
            }

            const response = await axios.post(
                'http://127.0.0.1:8080/api/questions',
                submitFormData,
                {
                    withCredentials: true,
                    headers: {
                        'Content-Type': 'multipart/form-data'
                    }
                }
            );

            if (response.status === 200) {
                setSuccessMessage('问题创建成功！');
                setTimeout(() => {
                    onCreateSuccess?.();
                }, 1500);
            }
        } catch (error) {
            console.error('创建问题失败:', error);
            setError(error.response?.data || '创建问题失败，请稍后重试');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className={styles.formContainer}>
            {isSubmitting && (
                <div className={styles.loadingOverlay}>
                    <div className={styles.loadingWrapper}>
                        <Loading size="lg" color="dark" />
                    </div>
                </div>
            )}

            {/* 图片裁剪组件 */}
            {showCropper && (
                <ImageCropper
                    image={cropImage}
                    onCropComplete={handleCropComplete}
                    onCancel={handleCropCancel}
                    aspectRatio={16 / 9}  // 可以根据需要调整裁剪比例
                />
            )}

            <div className={styles.formHeader}>
                <h2 className={styles.title}>创建新问题</h2>
            </div>

            <form onSubmit={handleSubmit} className={styles.form}>
                {error && <div className={styles.error}>{error}</div>}
                {successMessage && <div className={styles.success}>{successMessage}</div>}

                {/* 问题类型选择 */}
                <div className={styles.formGroup}>
                    <label className={styles.label}>
                        问题类型
                        <span className={styles.required}>*</span>
                    </label>
                    <select
                        name="questionType"
                        value={formData.questionType}
                        onChange={handleInputChange}
                        className={styles.select}
                        required
                    >
                        <option value="">请选择问题类型</option>
                        {Object.entries(QUESTION_TYPE_DESCRIPTION).map(([key, description]) => (
                            <option key={key} value={key}>
                                {description}
                            </option>
                        ))}
                    </select>
                </div>

                {/* 问题标题 */}
                <div className={styles.formGroup}>
                    <label className={styles.label}>
                        问题标题
                        <span className={styles.required}>*</span>
                        <span className={styles.hint}>（不超过30字符）</span>
                    </label>
                    <div className={styles.titleInputContainer}>
                        <input
                            type="text"
                            name="shortTitle"
                            value={formData.shortTitle}
                            onChange={handleInputChange}
                            className={`${styles.titleInput} ${
                                formData.shortTitle.length > 25 ? styles.warning : ''
                            }`}
                            maxLength={30}
                            placeholder="请输入简短的问题标题"
                            required
                        />
                        <div className={`${styles.characterCount} ${
                            formData.shortTitle.length > 25 ? styles.warning : ''
                        }`}>
                            {formData.shortTitle.length}/30
                        </div>
                    </div>
                </div>

                {/* 问题描述 - Markdown 编辑器部分 */}
                <div className={styles.formGroup}>
                    <label className={styles.label}>
                        问题描述
                        <span className={styles.required}>*</span>
                    </label>
                    <div className={styles.markdownEditorContainer}>
                        <div className={styles.markdownToolbar}>
                            <button
                                type="button"
                                onClick={() => addMarkdownSyntax('bold')}
                                className={styles.markdownButton}
                            >
                                粗体
                            </button>
                            <button
                                type="button"
                                onClick={() => addMarkdownSyntax('italic')}
                                className={styles.markdownButton}
                            >
                                斜体
                            </button>
                            <button
                                type="button"
                                onClick={() => addMarkdownSyntax('code')}
                                className={styles.markdownButton}
                            >
                                代码
                            </button>
                            <button
                                type="button"
                                onClick={() => addMarkdownSyntax('link')}
                                className={styles.markdownButton}
                            >
                                链接
                            </button>
                            <button
                                type="button"
                                onClick={() => addMarkdownSyntax('list')}
                                className={styles.markdownButton}
                            >
                                列表
                            </button>
                            <button
                                type="button"
                                onClick={() => setIsPreviewMode(!isPreviewMode)}
                                className={`${styles.markdownButton} ${isPreviewMode ? styles.active : ''}`}
                            >
                                预览
                            </button>
                        </div>
                        {isPreviewMode ? (
                            <div className={styles.markdownPreview}>
                                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                    {formData.description || '预览区域'}
                                </ReactMarkdown>
                            </div>
                        ) : (
                            <textarea
                                name="description"
                                value={formData.description}
                                onChange={handleInputChange}
                                className={styles.textarea}
                                placeholder="请详细描述您遇到的问题，支持Markdown语法..."
                                required
                            />
                        )}
                    </div>
                </div>

                {/* 问题截图上传 - 修改为支持裁剪 */}
                <div className={styles.formGroup}>
                    <label className={styles.label}>
                        问题截图
                        <span className={styles.optional}>（可选）</span>
                    </label>
                    <div className={styles.fileUploadContainer}>
                        <div className={styles.fileInputContainer}>
                            <label className={styles.fileInputLabel}>
                                选择图片
                                <input
                                    type="file"
                                    onChange={handleFileChange}
                                    accept="image/*"
                                    className={styles.fileInput}
                                />
                            </label>
                            {imageFile && (
                                <span className={styles.selectedFileName}>
                                    图片已裁剪并准备上传
                                </span>
                            )}
                        </div>
                        {imagePreview && (
                            <div className={styles.imagePreviewContainer}>
                                <img
                                    src={imagePreview}
                                    alt="问题截图预览"
                                    className={styles.imagePreview}
                                />
                                <div className={styles.imageControls}>
                                    <button
                                        type="button"
                                        className={styles.reCropButton}
                                        onClick={() => {
                                            if (imageFile) {
                                                const imageUrl = URL.createObjectURL(imageFile);
                                                setCropImage(imageUrl);
                                                setShowCropper(true);
                                            }
                                        }}
                                    >
                                        重新裁剪
                                    </button>
                                    <button
                                        type="button"
                                        className={styles.removeImageButton}
                                        onClick={() => {
                                            setImageFile(null);
                                            setImagePreview('');
                                            // 从描述中移除图片引用
                                            const descWithoutImage = formData.description.replace(/\n!\[裁剪后的图片\]\([^)]+\)/g, '');
                                            setFormData(prev => ({
                                                ...prev,
                                                description: descWithoutImage
                                            }));
                                        }}
                                    >
                                        移除图片
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* 联系方式 */}
                <div className={styles.formGroup}>
                    <label className={styles.label}>
                        联系方式
                        <span className={styles.required}>*</span>
                    </label>
                    <input
                        type="text"
                        name="contactInfo"
                        value={formData.contactInfo}
                        onChange={handleInputChange}
                        className={styles.input}
                        placeholder="请留下您的联系方式（手机号/微信/QQ等）"
                        required
                    />
                </div>

                {/* 联系人姓名 */}
                <div className={styles.formGroup}>
                    <label className={styles.label}>
                        联系人姓名
                        <span className={styles.required}>*</span>
                    </label>
                    <input
                        type="text"
                        name="contactName"
                        value={formData.contactName}
                        onChange={handleInputChange}
                        className={styles.input}
                        placeholder="请输入您的姓名"
                        required
                    />
                </div>

                {/* 按钮组 */}
                <div className={styles.buttonContainer}>
                    <button
                        type="button"
                        onClick={onCancel}
                        className={`${styles.button} ${styles.cancelButton}`}
                        disabled={isSubmitting}
                    >
                        返回
                    </button>
                    <button
                        type="submit"
                        className={`${styles.button} ${styles.submitButton}`}
                        disabled={isSubmitting}
                    >
                        {isSubmitting ? '提交中...' : '发布问题'}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default CreateQuestion;