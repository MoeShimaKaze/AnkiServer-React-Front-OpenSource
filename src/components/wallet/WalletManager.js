import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { Table, Menu, Spin, Button, Typography, Divider, Alert, Result } from 'antd';
import {
    WalletOutlined,
    BankOutlined,
    TeamOutlined,
    IdcardOutlined,
    HistoryOutlined
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import Navbar from '../base/Navbar';
import WithdrawalModal from './WithdrawalModal'; // 引入提现模态框组件
import WithdrawalHistory from './WithdrawalHistory'; // 引入新的提现历史组件
import styles from '../../assets/css/wallet/WalletManager.module.css';

const { Title } = Typography;

// 组件接收从ProtectedRoute传递的props
const WalletManager = ({ isAdmin }) => {
    const navigate = useNavigate();
    const [walletInfo, setWalletInfo] = useState(null);
    const [allWallets, setAllWallets] = useState([]);
    const [systemBalance, setSystemBalance] = useState(0);
    const [error, setError] = useState(null);
    const [isVerificationRequired, setIsVerificationRequired] = useState(false);
    const [isWalletNotExist, setIsWalletNotExist] = useState(false);
    const [activeModule, setActiveModule] = useState('userWallet');

    // 为每个模块创建loading状态
    const [isLoadingUserWallet, setIsLoadingUserWallet] = useState(true);
    const [isLoadingSystemBalance, setIsLoadingSystemBalance] = useState(true);
    const [isLoadingAllWallets, setIsLoadingAllWallets] = useState(true);

    // 添加模块切换的loading状态
    const [isModuleTransitioning, setIsModuleTransitioning] = useState(false);

    // 分页相关状态
    const [currentPage, setCurrentPage] = useState(0);
    const [pageSize, setPageSize] = useState(10);
    const [totalElements, setTotalElements] = useState(0);
    const [sortField, setSortField] = useState('');
    const [sortDirection, setSortDirection] = useState('ASC');

    // 提现模态框状态
    const [withdrawalModalVisible, setWithdrawalModalVisible] = useState(false);

    // 新增：提现历史状态
    const [showWithdrawalHistory, setShowWithdrawalHistory] = useState(false);
    const [focusOrderNumber, setFocusOrderNumber] = useState(null);

    const fetchWalletInfo = useCallback(async () => {
        setIsLoadingUserWallet(true);
        try {
            const response = await axios.get('http://127.0.0.1:8080/api/wallet/balance', { withCredentials: true });
            setWalletInfo(response.data);
            setIsVerificationRequired(false);
            setIsWalletNotExist(false);
        } catch (error) {
            console.error('获取钱包信息时出错:', error);

            // 检查钱包不存在的特定错误码
            if (error.response) {
                // 检查HTTP 404错误和特定错误码header
                if (error.response.status === 404 ||
                    error.response.headers['x-wallet-error'] === 'WALLET_NOT_EXIST') {
                    setIsWalletNotExist(true);
                    setIsVerificationRequired(false);
                    setError(null);
                    return;
                }

                // 检查响应体中的errorCode
                if (error.response.data && error.response.data.errorCode === 'WALLET_NOT_EXIST') {
                    setIsWalletNotExist(true);
                    setIsVerificationRequired(false);
                    setError(null);
                    return;
                }

                // 检查是否是实名认证相关的错误
                if (error.response.status === 403 ||
                    (error.response.data && error.response.data.message &&
                        error.response.data.message.includes('实名认证'))) {
                    setIsVerificationRequired(true);
                    setIsWalletNotExist(false);
                    setError(null);
                    return;
                }

                // 检查错误消息中是否包含"钱包不存在"字样（兼容旧版API）
                if (error.response.data && error.response.data.message &&
                    (error.response.data.message.includes('钱包不存在') ||
                        error.response.data.message === '钱包不存在')) {
                    setIsWalletNotExist(true);
                    setIsVerificationRequired(false);
                    setError(null);
                    return;
                }
            }

            // 其他错误情况
            setError('获取钱包信息失败');
            setIsVerificationRequired(false);
            setIsWalletNotExist(false);
        } finally {
            setIsLoadingUserWallet(false);
        }
    }, []);

    const fetchAllWallets = useCallback(async () => {
        setIsLoadingAllWallets(true);
        try {
            // 构建带分页和排序参数的URL
            let url = `http://127.0.0.1:8080/api/wallet/all?page=${currentPage}&size=${pageSize}`;

            // 如果有排序参数，添加到URL
            if (sortField) {
                url += `&sortBy=${sortField}&direction=${sortDirection}`;
            }

            const response = await axios.get(url, { withCredentials: true });

            // 设置钱包列表数据
            setAllWallets(response.data.content);

            // 设置分页相关数据
            setTotalElements(response.data.totalElements);
        } catch (error) {
            console.error('获取所有钱包信息时出错:', error);
            setError('获取所有钱包信息失败');
        } finally {
            setIsLoadingAllWallets(false);
        }
    }, [currentPage, pageSize, sortField, sortDirection]);

    const fetchSystemBalance = useCallback(async () => {
        setIsLoadingSystemBalance(true);
        try {
            const response = await axios.get('http://127.0.0.1:8080/api/wallet/system-account/balance', { withCredentials: true });
            setSystemBalance(response.data.availableBalance);
        } catch (error) {
            console.error('获取系统余额时出错:', error);
            setError('获取系统余额失败');
        } finally {
            setIsLoadingSystemBalance(false);
        }
    }, []);

    // 初始数据加载
    useEffect(() => {
        fetchWalletInfo();
        if (isAdmin) {
            fetchSystemBalance();
        }
    }, [isAdmin, fetchWalletInfo, fetchSystemBalance]);

    // 当管理员模块为"所有用户钱包"时，或者分页参数改变时，获取钱包列表
    useEffect(() => {
        if (isAdmin && activeModule === 'allWallets') {
            fetchAllWallets();
        }
    }, [isAdmin, activeModule, fetchAllWallets, currentPage, pageSize, sortField, sortDirection]);

    const handleWithdraw = () => {
        setWithdrawalModalVisible(true);
    };

    // 修改：提现回调函数，添加订单号参数
    const handleWithdrawalSuccess = (orderNumber) => {
        // 提现申请提交成功后刷新钱包信息
        fetchWalletInfo();

        // 如果有订单号，则导航到提现历史页面并聚焦该订单
        if (orderNumber) {
            setFocusOrderNumber(orderNumber);
            setShowWithdrawalHistory(true);
        }
    };

    // 处理模块切换的函数
    const handleModuleChange = (module) => {
        if (module === activeModule) return;

        setIsModuleTransitioning(true);
        setActiveModule(module);

        // 如果切换到所有钱包模块，重置分页信息
        if (module === 'allWallets') {
            setCurrentPage(0);
        }

        // 模拟加载时间
        setTimeout(() => {
            setIsModuleTransitioning(false);
        }, 500);
    };

    // 处理前往实名认证页面
    const handleGoToVerification = () => {
        navigate('/verification');
    };

    // 处理查看提现历史
    const handleViewWithdrawalHistory = () => {
        setShowWithdrawalHistory(true);
    };

    // 返回钱包主界面
    const handleBackFromHistory = () => {
        setShowWithdrawalHistory(false);
        setFocusOrderNumber(null);
    };

    // 处理Ant Design表格的排序和分页
    const handleTableChange = (pagination, filters, sorter) => {
        // 处理排序
        if (sorter && sorter.order) {
            const direction = sorter.order === 'ascend' ? 'ASC' : 'DESC';
            setSortField(sorter.field);
            setSortDirection(direction);
        } else {
            // 排序被清除的情况
            setSortField('');
            setSortDirection('ASC');
        }

        // 处理分页 - Ant Design使用1-based索引，我们的API使用0-based
        if (pagination) {
            setCurrentPage(pagination.current - 1);
            setPageSize(pagination.pageSize);
        }
    };

    // 定义所有钱包表格的列配置
    const allWalletsColumns = [
        {
            title: '用户ID',
            dataIndex: 'userId',
            key: 'userId',
            sorter: true,
            sortOrder: sortField === 'userId' ? (sortDirection === 'ASC' ? 'ascend' : 'descend') : null,
        },
        {
            title: '用户名',
            dataIndex: 'username',
            key: 'username',
            sorter: true,
            sortOrder: sortField === 'username' ? (sortDirection === 'ASC' ? 'ascend' : 'descend') : null,
        },
        {
            title: '总余额',
            dataIndex: 'totalBalance',
            key: 'totalBalance',
            sorter: true,
            sortOrder: sortField === 'totalBalance' ? (sortDirection === 'ASC' ? 'ascend' : 'descend') : null,
            render: (value) => `¥${value}`,
        },
        {
            title: '可用余额',
            dataIndex: 'availableBalance',
            key: 'availableBalance',
            sorter: true,
            sortOrder: sortField === 'availableBalance' ? (sortDirection === 'ASC' ? 'ascend' : 'descend') : null,
            render: (value) => `¥${value}`,
        },
        {
            title: '待结算余额',
            dataIndex: 'pendingBalance',
            key: 'pendingBalance',
            sorter: true,
            sortOrder: sortField === 'pendingBalance' ? (sortDirection === 'ASC' ? 'ascend' : 'descend') : null,
            render: (value) => `¥${value}`,
        },
    ];

    // 在组件内部添加的内联样式
    const menuStyles = {
        border: 'none',
        background: 'transparent'
    };

    const menuItemStyles = {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        height: '40px',
        margin: '5px 0',
        borderRadius: '5px'
    };

    // 定义用户钱包表格的列配置
    const userWalletColumns = [
        {
            title: '总余额',
            dataIndex: 'totalBalance',
            key: 'totalBalance',
            render: (value) => `¥${value}`,
        },
        {
            title: '可用余额',
            dataIndex: 'availableBalance',
            key: 'availableBalance',
            render: (value) => `¥${value}`,
        },
        {
            title: '待结算余额',
            dataIndex: 'pendingBalance',
            key: 'pendingBalance',
            render: (value) => `¥${value}`,
        },
    ];

    // 渲染实名认证提醒组件
    const renderVerificationReminder = () => {
        return (
            <Result
                icon={<IdcardOutlined style={{ color: '#1890ff' }} />}
                title="实名认证提醒"
                subTitle="您需要完成实名认证后才能查看钱包信息和使用相关功能"
                extra={[
                    <Button
                        type="primary"
                        key="verification"
                        onClick={handleGoToVerification}
                        icon={<IdcardOutlined />}
                    >
                        立即前往认证
                    </Button>
                ]}
                className={styles.verificationReminder}
            />
        );
    };

    // 渲染钱包不存在提醒组件 - 修改为引导用户完成实名认证
    const renderWalletNotExistPrompt = () => {
        return (
            <Result
                icon={<WalletOutlined style={{ color: '#1890ff' }} />}
                title="您的钱包尚未激活"
                subTitle="您需要完成实名认证后，系统将自动为您创建钱包。完成认证后即可使用钱包功能。"
                extra={[
                    <Button
                        type="primary"
                        key="verification"
                        onClick={handleGoToVerification}
                        icon={<IdcardOutlined />}
                    >
                        前往实名认证
                    </Button>
                ]}
                className={styles.verificationReminder}
            />
        );
    };

    // 渲染活动模块内容
    const renderActiveModule = () => {
        // 如果需要显示提现历史记录，直接返回提现历史组件
        if (showWithdrawalHistory) {
            return (
                <WithdrawalHistory
                    onBack={handleBackFromHistory}
                    focusOrderNumber={focusOrderNumber}
                />
            );
        }

        // 如果需要实名认证，显示认证提醒
        if (activeModule === 'userWallet' && isVerificationRequired) {
            return renderVerificationReminder();
        }

        // 如果钱包不存在，显示认证提醒（引导用户去完成认证）
        if (activeModule === 'userWallet' && isWalletNotExist) {
            return renderWalletNotExistPrompt();
        }

        // 如果正在切换模块，显示加载动画
        if (isModuleTransitioning) {
            return (
                <div className={styles.loadingWrapper}>
                    <Spin size="large" />
                </div>
            );
        }

        switch(activeModule) {
            case 'userWallet':
                if (isLoadingUserWallet) {
                    return (
                        <div className={styles.loadingWrapper}>
                            <Spin size="large" />
                        </div>
                    );
                }
                return (
                    <div className={styles.userWallet}>
                        <Title level={2} className={styles.centeredTitle}>您的钱包</Title>
                        <Divider className={styles.divider} />
                        <div className={styles.tableContainer}>
                            {walletInfo && (
                                <Table
                                    dataSource={[walletInfo]}
                                    columns={userWalletColumns}
                                    pagination={false}
                                    rowKey={() => 'user-wallet'}
                                    className={styles.table}
                                />
                            )}
                        </div>
                        <Divider className={styles.divider} />
                        <div className={styles.buttonContainer}>
                            <Button
                                type="primary"
                                onClick={handleWithdraw}
                                className={styles.button}
                                disabled={!walletInfo || walletInfo.availableBalance <= 0}
                                style={{ marginRight: '10px' }}
                            >
                                申请提现
                            </Button>
                            <Button
                                onClick={handleViewWithdrawalHistory}
                                className={styles.button}
                                icon={<HistoryOutlined />}
                            >
                                提现记录
                            </Button>
                        </div>
                    </div>
                );
            case 'adminWallet':
                if (isLoadingSystemBalance) {
                    return (
                        <div className={styles.loadingWrapper}>
                            <Spin size="large" />
                        </div>
                    );
                }
                return (
                    <div className={styles.adminWallet}>
                        <Title level={2} className={styles.centeredTitle}>系统账户余额</Title>
                        <Divider className={styles.divider} />
                        <p className={styles.systemBalance}>¥{systemBalance}</p>
                    </div>
                );
            case 'allWallets':
                if (isLoadingAllWallets) {
                    return (
                        <div className={styles.loadingWrapper}>
                            <Spin size="large" />
                        </div>
                    );
                }
                return (
                    <div className={styles.allWallets}>
                        <Title level={2} className={styles.centeredTitle}>所有用户钱包</Title>
                        <Divider className={styles.divider} />

                        <div className={styles.tableContainer}>
                            <Table
                                dataSource={allWallets}
                                columns={allWalletsColumns}
                                rowKey="userId"
                                pagination={{
                                    current: currentPage + 1, // 转换为1-based索引
                                    pageSize: pageSize,
                                    total: totalElements,
                                    showSizeChanger: true,
                                    pageSizeOptions: ['5', '10', '20', '50'],
                                    showTotal: (total, range) => `显示 ${range[0]}-${range[1]} 条，共 ${total} 条`,
                                }}
                                onChange={handleTableChange}
                                className={styles.table}
                                locale={{ emptyText: '暂无用户钱包信息' }}
                            />
                        </div>
                    </div>
                );
            default:
                return null;
        }
    };

    if (error) {
        return <Alert message={error} type="error" className={styles.error} />;
    }

    return (
        <div className={styles.pageContainer}>
            <Navbar />
            <div className={styles.contentContainer}>
                <div className={styles.sidebar}>
                    <h2>钱包管理系统</h2>
                    <Menu
                        mode="vertical"
                        selectedKeys={[activeModule]}
                        style={menuStyles}
                    >
                        <Menu.Item
                            key="userWallet"
                            icon={<WalletOutlined />}
                            onClick={() => {
                                handleModuleChange('userWallet');
                                setShowWithdrawalHistory(false);
                            }}
                            className={activeModule === 'userWallet' && !showWithdrawalHistory ? styles.active : ''}
                            style={menuItemStyles}
                        >
                            我的钱包
                        </Menu.Item>
                        {isAdmin && (
                            <>
                                <Menu.Item
                                    key="adminWallet"
                                    icon={<BankOutlined />}
                                    onClick={() => {
                                        handleModuleChange('adminWallet');
                                        setShowWithdrawalHistory(false);
                                    }}
                                    className={activeModule === 'adminWallet' ? styles.active : ''}
                                    style={menuItemStyles}
                                >
                                    系统账户
                                </Menu.Item>
                                <Menu.Item
                                    key="allWallets"
                                    icon={<TeamOutlined />}
                                    onClick={() => {
                                        handleModuleChange('allWallets');
                                        setShowWithdrawalHistory(false);
                                    }}
                                    className={activeModule === 'allWallets' ? styles.active : ''}
                                    style={menuItemStyles}
                                >
                                    所有用户钱包
                                </Menu.Item>
                            </>
                        )}
                    </Menu>
                </div>
                <div className={styles.mainContent}>
                    {renderActiveModule()}
                </div>
            </div>

            {/* 提现模态框 */}
            {walletInfo && (
                <WithdrawalModal
                    visible={withdrawalModalVisible}
                    onClose={() => setWithdrawalModalVisible(false)}
                    availableBalance={walletInfo.availableBalance}
                    onSuccess={handleWithdrawalSuccess}
                />
            )}
        </div>
    );
};

export default WalletManager;