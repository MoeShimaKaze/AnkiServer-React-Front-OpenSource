// src/components/ErrorBoundary.js
import React from 'react';
import { handleScriptError } from './errorHandler';

class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true };
    }

    componentDidCatch(error, errorInfo) {
        // 检查是否与支付跳转相关的错误
        const isPaymentError = error.message && (
            error.message.includes('payment') ||
            error.message.includes('alipay') ||
            error.message.includes('pay')
        );

        // 对支付相关错误特殊处理，不刷新页面
        if (isPaymentError) {
            console.warn('检测到支付相关错误，不触发页面刷新:', error.message);
            return;
        }

        // 其他错误正常处理
        if (!handleScriptError(error)) {
            console.error('Error caught by boundary:', error, errorInfo);
        }
    }

    render() {
        // Script error 会触发自动刷新，所以这里主要处理其他类型的错误
        if (this.state.hasError) {
            return null; // 或者返回一个友好的错误提示
        }

        return this.props.children;
    }
}

export default ErrorBoundary;