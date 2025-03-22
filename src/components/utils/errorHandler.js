// src/utils/errorHandler.js
window.disableErrorRefresh = false;
// 添加一个可以在支付操作前设置的全局标志
window.isPaymentInProgress = false;
/**
 * 防抖函数，避免短时间内多次刷新
 * @param {Function} func 要执行的函数
 * @param {number} wait 等待时间
 */
const debounce = (func, wait) => {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
};

/**
 * 执行页面刷新
 * 使用 sessionStorage 记录刷新次数，避免无限刷新
 */
const performRefresh = () => {
    // 如果支付正在进行中，不进行刷新
    if (window.isPaymentInProgress) {
        console.log('支付操作期间已阻止页面刷新');
        return;
    }
    const maxRefreshCount = 3; // 最大刷新次数
    const refreshCountKey = 'error_refresh_count';
    const lastRefreshTimeKey = 'last_refresh_time';
    const refreshCountResetTime = 60000; // 1分钟后重置刷新计数

    // 获取当前刷新次数和最后刷新时间
    const currentTime = Date.now();
    const lastRefreshTime = parseInt(sessionStorage.getItem(lastRefreshTimeKey) || '0');
    let refreshCount = parseInt(sessionStorage.getItem(refreshCountKey) || '0');

    // 如果距离上次刷新已经超过重置时间，重置计数
    if (currentTime - lastRefreshTime > refreshCountResetTime) {
        refreshCount = 0;
    }

    // 如果刷新次数未超过最大值，执行刷新
    if (refreshCount < maxRefreshCount) {
        // 更新刷新次数和时间
        sessionStorage.setItem(refreshCountKey, (refreshCount + 1).toString());
        sessionStorage.setItem(lastRefreshTimeKey, currentTime.toString());

        // 执行刷新
        window.location.reload();
    } else {
        console.warn('Reached maximum refresh count. Please try manually refreshing the page.');
    }
};

// 修改 debouncedRefresh 函数以检查支付标志
const debouncedRefresh = debounce(() => {
    if (window.isPaymentInProgress || window.disableErrorRefresh) {
        console.log('由于正在进行支付，自动刷新已禁用');
        return;
    }
    performRefresh();
}, 1000);

// 添加一个函数用于临时禁用刷新
export const disableRefreshTemporarily = (duration = 5000) => {
    window.disableErrorRefresh = true;
    setTimeout(() => {
        window.disableErrorRefresh = false;
    }, duration);
};

// 强化支付模式控制函数
export const setPaymentMode = (isActive) => {
    console.log(`${isActive ? '开启' : '关闭'}支付模式`);
    window.isPaymentInProgress = isActive;
    if (isActive) {
        window.disableErrorRefresh = true;
        // 增加一个安全定时器，确保支付模式不会永久开启
        if (window.paymentModeTimeout) {
            clearTimeout(window.paymentModeTimeout);
        }
        window.paymentModeTimeout = setTimeout(() => {
            window.isPaymentInProgress = false;
            window.disableErrorRefresh = false;
            console.log('支付模式安全超时已触发，已自动关闭');
        }, 60000); // 60秒后自动关闭
    }
};

// 添加取消支付模式的清理函数
export const clearPaymentMode = () => {
    window.isPaymentInProgress = false;
    window.disableErrorRefresh = false;
    if (window.paymentModeTimeout) {
        clearTimeout(window.paymentModeTimeout);
        window.paymentModeTimeout = null;
    }
    console.log('支付模式已手动清理');
};

/**
 * 设置全局错误处理器
 */
// 修改全局错误处理器设置
export const setupGlobalErrorHandler = () => {
    window.onerror = function(message, source, lineno, colno, error) {
        // 如果支付正在进行中，直接忽略所有错误
        if (window.isPaymentInProgress) {
            console.log('忽略支付过程中的错误:', message);
            return true; // 阻止错误冒泡
        }

        // 检查是否是支付相关错误 - 增强检测逻辑
        if (message && (
            message.includes('payment') ||
            message.includes('alipay') ||
            message.includes('form') ||
            message.includes('submit') ||
            message.includes('Script error')
        )) {
            console.log('忽略支付相关错误:', message);
            return true;
        }

        // 对其他错误继续使用原始逻辑
        if (message === 'Script error.' || message?.includes('Script error')) {
            if (!source?.includes('localhost:3000')) {
                debouncedRefresh();
                return true;
            }
        }
        return false;
    };


    // 对未处理的拒绝进行类似检查
    window.onunhandledrejection = function(event) {
        if (window.isPaymentInProgress) {
            console.log('忽略支付过程中的未处理Promise拒绝');
            event.preventDefault();
            return;
        }

        if (event.reason && (
            event.reason.message === 'Script error.' ||
            event.reason.message?.includes('Script error')
        )) {
            if (!event.reason.stack?.includes('localhost:3000')) {
                debouncedRefresh();
                event.preventDefault();
            }
        }
    };

    // 重写console.error并添加支付检查
    const originalConsoleError = console.error;
    console.error = (...args) => {
        const errorString = args.join(' ');
        if (window.isPaymentInProgress) {
            // 在支付过程中只记录错误但不触发刷新
            originalConsoleError.apply(console, args);
            return;
        }

        if (errorString.includes('Script error')) {
            debouncedRefresh();
            return;
        }
        originalConsoleError.apply(console, args);
    };
};

/**
 * 错误边界组件用的错误处理函数
 */
export const handleScriptError = (error) => {
    if (error?.message === 'Script error.' ||
        error?.message?.includes('Script error') ||
        error?.toString().includes('Script error')) {
        debouncedRefresh();
        return true;
    }
    return false;
};