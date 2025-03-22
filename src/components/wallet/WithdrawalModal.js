import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Modal, Form, Input, Button, InputNumber, message, Alert, Typography, Divider, Spin } from 'antd';
import { WalletOutlined } from '@ant-design/icons';
import styles from '../../assets/css/wallet/WithdrawalModal.module.css';

const { Text } = Typography;

const WithdrawalModal = ({ visible, onClose, availableBalance, onSuccess }) => {
    const [form] = Form.useForm();
    const [canWithdraw, setCanWithdraw] = useState(false);
    const [checkingConditions, setCheckingConditions] = useState(true);
    const [sendingCode, setSendingCode] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [countdown, setCountdown] = useState(0);
    const [errorMessage, setErrorMessage] = useState(null);
    const [successMessage, setSuccessMessage] = useState(null);

    // 检查提现条件
    useEffect(() => {
        if (visible) {
            checkWithdrawalConditions();
        } else {
            // 重置状态
            setErrorMessage(null);
            setSuccessMessage(null);
            setCanWithdraw(false);
            setCheckingConditions(true);
            form.resetFields();
        }
    }, [visible, form]);

    // 处理倒计时
    useEffect(() => {
        let timer = null;
        if (countdown > 0) {
            timer = setTimeout(() => {
                setCountdown(countdown - 1);
            }, 1000);
        }
        return () => {
            if (timer) clearTimeout(timer);
        };
    }, [countdown]);

    // 检查提现条件
    const checkWithdrawalConditions = async () => {
        setCheckingConditions(true);
        setErrorMessage(null);

        try {
            const response = await axios.get('http://127.0.0.1:8080/api/wallet/withdraw/check', {
                withCredentials: true
            });

            setCanWithdraw(response.data.canWithdraw);

            if (!response.data.canWithdraw) {
                setErrorMessage(response.data.message || '您需要先绑定支付宝账户才能提现');
            }
        } catch (error) {
            console.error('检查提现条件失败:', error);
            setErrorMessage('检查提现条件失败，请稍后重试');
            setCanWithdraw(false);
        } finally {
            setCheckingConditions(false);
        }
    };

    // 发送验证码
    const sendVerificationCode = async () => {
        if (countdown > 0) return;

        setSendingCode(true);
        setErrorMessage(null);

        try {
            await axios.post('http://127.0.0.1:8080/api/wallet/withdraw/send-code', {}, {
                withCredentials: true
            });
            message.success('验证码已发送到您的邮箱');
            setCountdown(60); // 设置60秒倒计时
        } catch (error) {
            console.error('发送验证码失败:', error);

            if (error.response && error.response.data) {
                setErrorMessage(error.response.data);
            } else {
                setErrorMessage('发送验证码失败，请稍后重试');
            }
        } finally {
            setSendingCode(false);
        }
    };

    // 提交提现申请
    const handleSubmit = async (values) => {
        setSubmitting(true);
        setErrorMessage(null);

        try {
            const withdrawalRequest = {
                amount: values.amount,
                withdrawalMethod: 'ALIPAY', // 目前仅支持支付宝
                verificationCode: values.verificationCode
            };
            const response = await axios.post('http://127.0.0.1:8080/api/wallet/withdraw', withdrawalRequest, {
                withCredentials: true
            });

            setSuccessMessage('提现申请已提交，请等待处理。处理结果将通过系统通知告知您。');
            message.success('提现申请已提交');

            // 延迟关闭模态框，给用户时间阅读成功消息
            setTimeout(() => {
                // 调用成功回调，传递订单号
                const orderNumber = response.data && response.data.orderNumber ? response.data.orderNumber : null;
                onSuccess(orderNumber);
                onClose();
            }, 2000);
        } catch (error) {
            console.error('提交提现申请失败:', error);

            if (error.response && error.response.data) {
                setErrorMessage(error.response.data);
            } else {
                setErrorMessage('提交提现申请失败，请稍后重试');
            }
        } finally {
            setSubmitting(false);
        }
    };

    // 渲染提现条件检查结果
    const renderCheckResult = () => {
        if (checkingConditions) {
            return (
                <div className={styles.loadingContainer}>
                    <Spin />
                    <Text>正在检查提现条件...</Text>
                </div>
            );
        }

        if (!canWithdraw) {
            return (
                <Alert
                    message="无法提现"
                    description={errorMessage || '您需要先绑定支付宝账户才能提现'}
                    type="error"
                    showIcon
                />
            );
        }

        return (
            <Alert
                message="可以提现"
                description={`您当前可提现余额为 ¥${availableBalance}`}
                type="success"
                showIcon
            />
        );
    };

    return (
        <Modal
            title={
                <div className={styles.modalTitle}>
                    <WalletOutlined /> 申请提现
                </div>
            }
            open={visible}
            onCancel={onClose}
            footer={null}
            width={500}
            maskClosable={false}
            className={styles.withdrawalModal}
        >
            {renderCheckResult()}

            {successMessage && (
                <Alert
                    message="提现申请已提交"
                    description={successMessage}
                    type="success"
                    showIcon
                    className={styles.successAlert}
                />
            )}

            {canWithdraw && !successMessage && (
                <>
                    <Divider />
                    <Form
                        form={form}
                        layout="vertical"
                        onFinish={handleSubmit}
                        initialValues={{ amount: 0 }}
                    >
                        <Form.Item
                            name="amount"
                            label="提现金额"
                            rules={[
                                { required: true, message: '请输入提现金额' },
                                {
                                    validator: (_, value) => {
                                        if (value <= 0) {
                                            return Promise.reject('提现金额必须大于0');
                                        }
                                        if (value > availableBalance) {
                                            return Promise.reject('提现金额不能超过可用余额');
                                        }
                                        return Promise.resolve();
                                    }
                                }
                            ]}
                        >
                            <InputNumber
                                min={0.01}
                                max={availableBalance}
                                step={0.01}
                                precision={2}
                                style={{ width: '100%' }}
                                placeholder="请输入提现金额"
                                prefix="¥"
                                disabled={submitting}
                            />
                        </Form.Item>

                        <Form.Item
                            name="verificationCode"
                            label="验证码"
                            rules={[
                                { required: true, message: '请输入验证码' },
                                { len: 6, message: '验证码应为6位数字' }
                            ]}
                            extra="验证码将发送到您的绑定邮箱"
                        >
                            <div className={styles.codeInputGroup}>
                                <Input
                                    placeholder="请输入验证码"
                                    disabled={submitting}
                                    maxLength={6}
                                />
                                <Button
                                    type="primary"
                                    onClick={sendVerificationCode}
                                    loading={sendingCode}
                                    disabled={countdown > 0 || submitting}
                                >
                                    {countdown > 0 ? `${countdown}秒后重试` : '发送验证码'}
                                </Button>
                            </div>
                        </Form.Item>

                        <Divider />

                        <div className={styles.formActions}>
                            <Button onClick={onClose} disabled={submitting}>
                                取消
                            </Button>
                            <Button
                                type="primary"
                                htmlType="submit"
                                loading={submitting}
                                disabled={!canWithdraw}
                            >
                                提交提现申请
                            </Button>
                        </div>
                    </Form>
                </>
            )}
        </Modal>
    );
};

export default WithdrawalModal;