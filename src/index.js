import React from 'react';
import ReactDOM from 'react-dom/client';
import './assets/css/index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';
import { setupGlobalErrorHandler } from './components/utils/errorHandler';

// 设置全局错误处理
setupGlobalErrorHandler();

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
    // 移除 StrictMode 进行测试
    <App />
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
