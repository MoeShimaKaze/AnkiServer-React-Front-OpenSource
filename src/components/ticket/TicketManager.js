// TicketManager.js - Logic Part with Ant Design Integration

import React, {useCallback, useEffect, useRef, useState} from 'react';
import axios from 'axios';
import {useNavigate} from 'react-router-dom';
import Navbar from '../base/Navbar';
import styles from '../../assets/css/manager/TicketManager.module.css';
// 导入AdminService
import {
  getAdminAssignedTickets,
  getAllAdmins,
  getCurrentAdminAssignedTickets,
  transferTicket
} from '../utils/api/AdminService';
// 修改为
import {
  TICKET_TYPE_MAP,
  getTicketTypeOptions,
  getTicketTypeInfo
} from '../utils/map/ticketTypeMap';// 导入Ant Design组件
import {
  Alert,
  Badge,
  Button,
  Card,
  Col,
  Divider,
  Form,
  Input,
  List,
  Modal,
  Pagination,
  Radio,
  Row,
  Select,
  Space,
  Spin,
  Statistic,
  Table,
  Tabs,
  Tag,
  Typography
} from 'antd';
import {
  CloseCircleOutlined,
  ExclamationCircleOutlined,
  MessageOutlined,
  ReloadOutlined,
  SwapOutlined,
  TeamOutlined,
  UnorderedListOutlined,
  UserOutlined
} from '@ant-design/icons';

const { Title, Text, Paragraph } = Typography;
const { TabPane } = Tabs;
const { confirm } = Modal;
const API_BASE_URL = 'http://127.0.0.1:8080';

// 修改组件接收从ProtectedRoute传递的props
const TicketManager = ({ userId, isAdmin }) => {
  const navigate = useNavigate();
  const mounted = useRef(true);

  const [userTickets, setUserTickets] = useState([]);
  const [closedTickets, setClosedTickets] = useState([]);
  const [allTickets, setAllTickets] = useState([]);
  const [assignedTickets, setAssignedTickets] = useState([]); // 新增：当前管理员的已分配工单
  const [issue, setIssue] = useState('');
  const [type, setType] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // 分页状态管理
  const [activeTicketType, setActiveTicketType] = useState('open'); // 'open' 或 'closed'
  const [currentPage, setCurrentPage] = useState(0); // 当前页码，从0开始
  const [totalPages, setTotalPages] = useState(1); // 总页数
  const [pageSize, setPageSize] = useState(5); // 每页显示数量
  const [adminTicketStatus, setAdminTicketStatus] = useState('all'); // 'all', 'open', 'closed'
  const [activeAdminTab, setActiveAdminTab] = useState('all'); // 'all' 或 'assigned'

  // 工单详情状态
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [showTicketDetail, setShowTicketDetail] = useState(false);

  // 工单转移相关状态
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [admins, setAdmins] = useState([]);
  const [selectedAdminId, setSelectedAdminId] = useState(null);
  const [transferLoading, setTransferLoading] = useState(false);
  const [ticketToTransfer, setTicketToTransfer] = useState(null);

  // 特定管理员的工单查看状态
  const [viewingAdminId, setViewingAdminId] = useState(null);
  const [viewingAdminName, setViewingAdminName] = useState('');
  const [showAdminSelector, setShowAdminSelector] = useState(false);

  // 组件挂载状态管理
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  // 获取所有管理员 - 替换
  const fetchAdmins = useCallback(async () => {
    try {
      const adminsData = await getAllAdmins();
      if (mounted.current) {
        setAdmins(adminsData || []);
      }
    } catch (error) {
      console.error('获取管理员列表失败:', error);
    }
  }, []);


  // 在组件初始化时获取管理员列表
  useEffect(() => {
    if (isAdmin) {
      fetchAdmins();
    }
  }, [isAdmin, fetchAdmins]);

  // 修改 fetchUserTickets 函数
  const fetchUserTickets = useCallback(async (page = 0, isOpen = true) => {
    if (!userId) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      const response = await axios.get(
          `${API_BASE_URL}/tickets/user/${userId}/paged?open=${isOpen}&page=${page}&size=${pageSize}`,
          { withCredentials: true }
      );

      if (mounted.current) {
        // 使用更安全的方式处理响应数据
        const ticketsData = response.data || {};

        // 确保content是数组
        const content = Array.isArray(ticketsData.content) ? ticketsData.content : [];

        if (isOpen) {
          setUserTickets(content);
        } else {
          setClosedTickets(content);
        }

        // 确保totalPages是数字
        setTotalPages(typeof ticketsData.totalPages === 'number' ? ticketsData.totalPages : 0);
        setIsLoading(false);
      }
    } catch (error) {
      if (mounted.current) {
        console.error(`获取${isOpen ? '开启' : '已关闭'}工单失败:`, error);

        // 设置空数组，但不设置错误状态，以免阻止UI渲染
        if (isOpen) {
          setUserTickets([]);
        } else {
          setClosedTickets([]);
        }

        // 仅在确实有错误时才显示错误信息
        if (error.response && error.response.status !== 200) {
          setError('获取工单失败，请稍后重试');
        }

        setIsLoading(false);
      }
    }
  }, [userId, pageSize]);

  // 修改 fetchAllTickets 函数
  const fetchAllTickets = useCallback(async (page = 0, status = 'all') => {
    try {
      setIsLoading(true);
      let url = `${API_BASE_URL}/tickets/all/paged?page=${page}&size=${pageSize}`;

      if (status === 'open') {
        url += '&open=true';
      } else if (status === 'closed') {
        url += '&open=false';
      }

      const response = await axios.get(url, { withCredentials: true });

      if (mounted.current) {
        const ticketsData = response.data || {};
        setAllTickets(Array.isArray(ticketsData.content) ? ticketsData.content : []);
        setTotalPages(typeof ticketsData.totalPages === 'number' ? ticketsData.totalPages : 0);
        setIsLoading(false);
      }
    } catch (error) {
      if (mounted.current) {
        console.error('获取所有工单失败:', error);
        setAllTickets([]);

        // 仅在确实有错误时才显示错误信息
        if (error.response && error.response.status !== 200) {
          setError('获取工单失败，请稍后重试');
        }

        setIsLoading(false);
      }
    }
  }, [pageSize]);

  // 获取当前管理员的已分配工单 - 替换
  const fetchAssignedTickets = useCallback(async (page = 0, isOpen = true) => {
    try {
      setIsLoading(true);
      const response = await getCurrentAdminAssignedTickets(isOpen, page, pageSize);

      if (mounted.current) {
        const ticketsData = response || {};
        setAssignedTickets(Array.isArray(ticketsData.content) ? ticketsData.content : []);
        setTotalPages(typeof ticketsData.totalPages === 'number' ? ticketsData.totalPages : 0);
        setIsLoading(false);
      }
    } catch (error) {
      // 错误处理部分保持不变
      if (mounted.current) {
        console.error('获取已分配工单失败:', error);
        setAssignedTickets([]);

        if (error.response && error.response.status !== 200) {
          setError('获取已分配工单失败，请稍后重试');
        }

        setIsLoading(false);
      }
    }
  }, [pageSize]);

  // 获取特定管理员的已分配工单 - 替换
  const fetchAdminTickets = useCallback(async (adminId, page = 0, isOpen = true) => {
    try {
      setIsLoading(true);
      const response = await getAdminAssignedTickets(adminId, isOpen, page, pageSize);

      if (mounted.current) {
        const ticketsData = response || {};
        setAssignedTickets(Array.isArray(ticketsData.content) ? ticketsData.content : []);
        setTotalPages(typeof ticketsData.totalPages === 'number' ? ticketsData.totalPages : 0);
        setIsLoading(false);
      }
    } catch (error) {
      // 错误处理部分保持不变
      if (mounted.current) {
        console.error(`获取管理员 ${adminId} 的工单失败:`, error);
        setAssignedTickets([]);

        if (error.response && error.response.status !== 200) {
          setError('获取管理员工单失败，请稍后重试');
        }

        setIsLoading(false);
      }
    }
  }, [pageSize]);

  // 第一个useEffect：负责数据加载
  useEffect(() => {
    const loadData = async () => {
      if (!mounted.current) return;

      setIsLoading(true);
      setError(null);

      try {
        // 用户工单区域
        if (!isAdmin || (isAdmin && activeAdminTab === 'all')) {
          if (activeTicketType === 'open') {
            await fetchUserTickets(currentPage, true);
          } else {
            await fetchUserTickets(currentPage, false);
          }
        }

        // 管理员工单区域
        if (isAdmin) {
          if (activeAdminTab === 'all') {
            await fetchAllTickets(currentPage, adminTicketStatus);
          } else if (activeAdminTab === 'assigned') {
            if (viewingAdminId) {
              await fetchAdminTickets(viewingAdminId, currentPage, adminTicketStatus !== 'closed');
            } else {
              await fetchAssignedTickets(currentPage, adminTicketStatus !== 'closed');
            }
          }
        }
      } catch (error) {
        console.error('加载数据失败:', error);
      } finally {
        // 确保在最后设置loading为false
        if (mounted.current) {
          setIsLoading(false);
        }
      }
    };

    loadData();

    return () => {}; // 空清理函数
  }, [
    isAdmin,
    fetchUserTickets,
    fetchAllTickets,
    fetchAssignedTickets,
    fetchAdminTickets,
    currentPage,
    activeTicketType,
    adminTicketStatus,
    pageSize,
    activeAdminTab,
    viewingAdminId
  ]);

  // 第二个useEffect：仅负责安全超时处理
  useEffect(() => {
    let safetyTimeout = null;

    // 只在isLoading为true时设置超时
    if (isLoading) {
      safetyTimeout = setTimeout(() => {
        if (mounted.current) {
          console.warn('安全超时触发：强制结束加载状态');
          setIsLoading(false);
        }
      }, 15000);
    }

    return () => {
      if (safetyTimeout) {
        clearTimeout(safetyTimeout);
      }
    };
  }, [isLoading]); // 只依赖isLoading

  // 创建工单处理
  const handleCreateTicket = async (e) => {
    e.preventDefault();
    if (!mounted.current) return;

    try {
      setIsLoading(true);
      await axios.post(`${API_BASE_URL}/tickets/create`,
          { issue, type },
          {
            withCredentials: true,
            signal: AbortSignal.timeout(5000)
          }
      );
      if (!mounted.current) return;

      // 重置表单
      setIssue('');
      setType(1);

      // 刷新工单列表
      setActiveTicketType('open');
      setCurrentPage(0);
      await fetchUserTickets(0, true);

      if (isAdmin) {
        await fetchAllTickets(0, 'all');
      }

      setIsLoading(false);
      Modal.success({
        title: '操作成功',
        content: '工单创建成功',
      });
    } catch (error) {
      if (!mounted.current) return;
      console.error('创建工单失败:', error);
      setIsLoading(false);
      Modal.error({
        title: '操作失败',
        content: '创建工单失败：' + (error.response?.data || error.message || '未知错误'),
      });
    }
  };

  // 关闭工单处理
  const handleCloseTicket = async (ticketId) => {
    if (!mounted.current) return;

    confirm({
      title: '确认操作',
      icon: <ExclamationCircleOutlined />,
      content: '您确定要关闭此工单吗？',
      onOk: async () => {
        try {
          setIsLoading(true);
          await axios.post(`${API_BASE_URL}/tickets/close/${ticketId}`, {}, {
            withCredentials: true,
            signal: AbortSignal.timeout(5000)
          });

          if (!mounted.current) return;

          // 刷新工单列表
          if (activeAdminTab === 'all') {
            await fetchUserTickets(currentPage, activeTicketType === 'open');
            if (isAdmin) {
              await fetchAllTickets(currentPage, adminTicketStatus);
            }
          } else if (activeAdminTab === 'assigned') {
            if (viewingAdminId) {
              await fetchAdminTickets(viewingAdminId, currentPage, adminTicketStatus !== 'closed');
            } else {
              await fetchAssignedTickets(currentPage, adminTicketStatus !== 'closed');
            }
          }

          setIsLoading(false);
          Modal.success({
            title: '操作成功',
            content: '工单关闭成功',
          });
        } catch (error) {
          if (!mounted.current) return;
          console.error('关闭工单失败:', error);
          setIsLoading(false);
          Modal.error({
            title: '操作失败',
            content: '关闭工单失败：' + (error.response?.data || error.message || '未知错误'),
          });
        }
      },
    });
  };

  // 重新打开工单处理
  const handleReopenTicket = async (ticketId) => {
    if (!mounted.current) return;

    confirm({
      title: '确认操作',
      icon: <ExclamationCircleOutlined />,
      content: '您确定要重新开启此工单吗？',
      onOk: async () => {
        try {
          setIsLoading(true);
          await axios.post(`${API_BASE_URL}/tickets/reopen/${ticketId}`, {}, {
            withCredentials: true,
            signal: AbortSignal.timeout(5000)
          });

          if (!mounted.current) return;

          // 刷新工单列表
          if (activeAdminTab === 'all') {
            await fetchUserTickets(currentPage, activeTicketType === 'open');
            if (isAdmin) {
              await fetchAllTickets(currentPage, adminTicketStatus);
            }
          } else if (activeAdminTab === 'assigned') {
            if (viewingAdminId) {
              await fetchAdminTickets(viewingAdminId, currentPage, adminTicketStatus !== 'closed');
            } else {
              await fetchAssignedTickets(currentPage, adminTicketStatus !== 'closed');
            }
          }

          setIsLoading(false);
          Modal.success({
            title: '操作成功',
            content: '工单重新打开成功',
          });
        } catch (error) {
          if (!mounted.current) return;
          console.error('重新打开工单失败:', error);
          setIsLoading(false);
          Modal.error({
            title: '操作失败',
            content: '重新打开工单失败：' + (error.response?.data || error.message || '未知错误'),
          });
        }
      },
    });
  };

  // 进入聊天处理
  const handleEnterChat = async (ticketId) => {
    if (!mounted.current || !userId) return;

    try {
      const response = await axios.get(`${API_BASE_URL}/chat/ticket/${ticketId}?userId=${userId}`, {
        withCredentials: true,
        signal: AbortSignal.timeout(5000)
      });

      if (!mounted.current) return;

      // 检查响应状态并相应处理
      if (response.status === 200) {
        // 创建或获取聊天记录成功，跳转到聊天页面
        navigate(`/chat/${ticketId}`);
        // 可以将部分响应数据存储在本地存储中，以便在聊天页面使用
        localStorage.setItem(`chat_${ticketId}`, JSON.stringify({
          ticketId,
          lastAccessed: new Date().toISOString()
        }));
      }
    } catch (error) {
      if (!mounted.current) return;

      console.error('进入聊天失败:', error);
      if (error.response) {
        switch (error.response.status) {
          case 403:
            Modal.error({
              title: '操作失败',
              content: '工单已关闭，无法进入聊天',
            });
            break;
          case 404:
            Modal.error({
              title: '操作失败',
              content: '工单未找到',
            });
            break;
          default:
            Modal.error({
              title: '操作失败',
              content: `进入聊天时出错: ${error.message}`,
            });
        }
      }
    }
  };

  // 点击进入聊天按钮处理
  const handleEnterChatClick = (ticket) => {
    handleEnterChat(ticket.id);
  };

  // 处理页码变化
  const handlePageChange = (newPage) => {
    setCurrentPage(newPage - 1); // Ant Design的分页是从1开始的，我们的状态是从0开始
  };

  // 处理工单类型变化
  const handleTicketTypeChange = (type) => {
    setActiveTicketType(type);
    setCurrentPage(0); // 重置为第一页
  };

  // 处理管理员工单状态变化
  const handleAdminStatusChange = (status) => {
    setAdminTicketStatus(status);
    setCurrentPage(0); // 重置为第一页
  };

  // 处理管理员标签页切换 (新增)
  const handleAdminTabChange = (tab) => {
    setActiveAdminTab(tab);
    setCurrentPage(0); // 重置为第一页

    // 如果切换到"已分配"标签，默认显示当前管理员的工单
    if (tab === 'assigned') {
      setViewingAdminId(null);
      setViewingAdminName('');
    }
  };

  // 处理页面大小变化
  const handlePageSizeChange = (value) => {
    setPageSize(value);
    setCurrentPage(0); // 重置为第一页
  };

  // 显示工单详情
  const handleShowTicketDetail = (ticket) => {
    setSelectedTicket(ticket);
    setShowTicketDetail(true);
  };

  // 关闭工单详情
  const handleCloseTicketDetail = () => {
    setShowTicketDetail(false);
    setSelectedTicket(null);
  };

  // 显示工单转移模态框
  const handleShowTransferModal = (ticket) => {
    setTicketToTransfer(ticket);
    setSelectedAdminId(null);
    setShowTransferModal(true);
  };

  // 关闭工单转移模态框
  const handleCloseTransferModal = () => {
    setShowTransferModal(false);
    setTicketToTransfer(null);
    setSelectedAdminId(null);
  };

  // 处理工单转移 - 替换
  const handleTransferTicket = async () => {
    if (!ticketToTransfer || !selectedAdminId) {
      Modal.warning({
        title: '请选择接收人',
        content: '请选择一位管理员作为工单接收人',
      });
      return;
    }

    try {
      setTransferLoading(true);
      await transferTicket(ticketToTransfer.id, selectedAdminId);

      Modal.success({
        title: '转移成功',
        content: '工单已成功转移给其他管理员',
      });
      handleCloseTransferModal();

      // 根据当前活动标签页刷新相应数据
      if (activeAdminTab === 'all') {
        fetchAllTickets(currentPage, adminTicketStatus);
      } else if (activeAdminTab === 'assigned') {
        if (viewingAdminId) {
          fetchAdminTickets(viewingAdminId, currentPage, adminTicketStatus !== 'closed');
        } else {
          fetchAssignedTickets(currentPage, adminTicketStatus !== 'closed');
        }
      }
    } catch (error) {
      console.error('转移工单失败:', error);
      Modal.error({
        title: '转移失败',
        content: `转移工单失败: ${error.response?.data || error.message}`,
      });
    } finally {
      setTransferLoading(false);
    }
  };

  // 显示管理员选择模态框 (新增)
  const handleShowAdminSelector = () => {
    setShowAdminSelector(true);
  };

  // 选择指定管理员查看工单 (新增)
  const handleSelectAdmin = (admin) => {
    setViewingAdminId(admin.id);
    setViewingAdminName(admin.username);
    setShowAdminSelector(false);
    setCurrentPage(0);
  };

  // 切换回当前管理员工单视图 (新增)
  const handleViewCurrentAdminTickets = () => {
    setViewingAdminId(null);
    setViewingAdminName('');
    setCurrentPage(0);
  };

  // 格式化日期时间显示
  const formatDateTime = (dateTimeString) => {
    const options = {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    };
    return new Date(dateTimeString).toLocaleString('zh-CN', options);
  };

  // 在这里处理加载和错误状态
  if (error) {
    return (
        <div className={styles.pageContainer}>
          <Navbar />
          <Alert
              message="错误"
              description={error}
              type="error"
              showIcon
              action={
                <Button
                    onClick={() => {
                      setError(null);
                      setIsLoading(true);
                      fetchUserTickets(currentPage, activeTicketType === 'open');
                      if (isAdmin) {
                        if (activeAdminTab === 'all') {
                          fetchAllTickets(currentPage, adminTicketStatus);
                        } else if (activeAdminTab === 'assigned') {
                          if (viewingAdminId) {
                            fetchAdminTickets(viewingAdminId, currentPage, adminTicketStatus !== 'closed');
                          } else {
                            fetchAssignedTickets(currentPage, adminTicketStatus !== 'closed');
                          }
                        }
                      }
                    }}
                    type="primary"
                >
                  重试
                </Button>
              }
              className={styles.errorContainer}
          />
        </div>
    );
  }

  if (isLoading) {
    return (
        <div className={styles.pageContainer}>
          <Navbar />
          <div className={styles.loadingWrapper}>
            <Spin size="large" />
          </div>
        </div>
    );
  }

  // 准备渲染所需的属性
  return {
    userTickets,
    closedTickets,
    allTickets,
    assignedTickets,
    issue,
    type,
    isAdmin,
    activeTicketType,
    currentPage,
    totalPages,
    pageSize,
    adminTicketStatus,
    activeAdminTab,
    showTicketDetail,
    selectedTicket,
    admins,
    showTransferModal,
    ticketToTransfer,
    selectedAdminId,
    transferLoading,
    viewingAdminId,
    viewingAdminName,
    showAdminSelector,
    handleCreateTicket,
    handleCloseTicket,
    handleReopenTicket,
    handleEnterChatClick,
    handlePageChange,
    handleTicketTypeChange,
    handleAdminStatusChange,
    handleAdminTabChange,
    handlePageSizeChange,
    handleShowTicketDetail,
    handleCloseTicketDetail,
    handleShowTransferModal,
    handleCloseTransferModal,
    handleTransferTicket,
    handleShowAdminSelector,
    handleSelectAdmin,
    handleViewCurrentAdminTickets,
    setIssue,
    setType,
    setSelectedAdminId,
    setShowAdminSelector,
    formatDateTime,
    TICKET_TYPE_MAP
  };

};

// 修改 TicketManagerRender 组件
const TicketManagerRender = ({ userId, isAdmin }) => {
  // 使用传递的props初始化TicketManager
  const renderProps = TicketManager({ userId, isAdmin });

  // 添加默认值以防止在访问属性时出现undefined错误
  const {
    userTickets = [],
    closedTickets = [],
    allTickets = [],
    assignedTickets = [],
    issue,
    type,
    activeTicketType,
    currentPage,
    totalPages,
    pageSize,
    adminTicketStatus,
    activeAdminTab,
    showTicketDetail,
    selectedTicket,
    admins = [],
    showTransferModal,
    ticketToTransfer,
    selectedAdminId,
    transferLoading,
    viewingAdminId,
    viewingAdminName,
    showAdminSelector,
    handleCreateTicket,
    handleCloseTicket,
    handleReopenTicket,
    handleEnterChatClick,
    handlePageChange,
    handleTicketTypeChange,
    handleAdminStatusChange,
    handleAdminTabChange,
    handlePageSizeChange,
    handleShowTicketDetail,
    handleCloseTicketDetail,
    handleShowTransferModal,
    handleCloseTransferModal,
    handleTransferTicket,
    handleShowAdminSelector,
    handleSelectAdmin,
    handleViewCurrentAdminTickets,
    setIssue,
    setType,
    setSelectedAdminId,
    setShowAdminSelector,
    formatDateTime,
    TICKET_TYPE_MAP
  } = renderProps;

  // 用户工单表格列配置
  const userTicketColumns = [
    {
      title: '工单主题',
      dataIndex: 'issue',
      key: 'issue',
      render: (text, record) => {
        const typeInfo = getTicketTypeInfo(record.type);
        return (
            <div className={styles.ticketTitle}>
              <span className={styles.typeIcon} style={{ color: typeInfo.color }}>{typeInfo.icon}</span>
              {text}
            </div>
        );
      },
    },
    {
      title: '工单类型',
      dataIndex: 'type',
      key: 'type',
      render: (type) => {
        const typeInfo = getTicketTypeInfo(type);
        return (
            <Tag color={typeInfo.color} className={styles.ticketType}>
              {TICKET_TYPE_MAP[type]}
            </Tag>
        );
      },
    },
    {
      title: '创建日期',
      dataIndex: 'createdDate',
      key: 'createdDate',
      render: (date) => formatDateTime(date),
    },
    {
      title: '工单状态',
      key: 'status',
      render: (_, record) => (
          <Badge
              status={record.open ? "success" : "error"}
              text={record.open ? "开启" : "关闭"}
              className={record.open ? styles.statusBadgeOpen : styles.statusBadgeClosed}
          />
      ),
    },
    {
      title: '操作',
      key: 'action',
      render: (_, record) => (
          <Space size="small">
            <Button
                type="primary"
                icon={<MessageOutlined />}
                onClick={(e) => {
                  e.stopPropagation();
                  handleEnterChatClick(record);
                }}
            >
              回复
            </Button>
            {record.open ? (
                <Button
                    danger
                    icon={<CloseCircleOutlined />}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleCloseTicket(record.id);
                    }}
                >
                  关闭
                </Button>
            ) : (
                <Button
                    icon={<ReloadOutlined />}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleReopenTicket(record.id);
                    }}
                    disabled={record.closedByAdmin && !isAdmin}
                >
                  开启
                </Button>
            )}
          </Space>
      ),
    },
  ];

  // 管理员工单表格列配置
  const adminTicketColumns = [
    {
      title: '工单编号',
      dataIndex: 'id',
      key: 'id',
    },
    {
      title: '工单主题',
      dataIndex: 'issue',
      key: 'issue',
      render: (text, record) => {
        const typeInfo = getTicketTypeInfo(record.type);
        return (
            <div className={styles.ticketTitle}>
              <span className={styles.typeIcon} style={{ color: typeInfo.color }}>{typeInfo.icon}</span>
              {text}
            </div>
        );
      },
    },
    {
      title: '工单类型',
      dataIndex: 'type',
      key: 'type',
      render: (type) => {
        const typeInfo = getTicketTypeInfo(type);
        return (
            <Tag color={typeInfo.color} className={styles.ticketType}>
              {TICKET_TYPE_MAP[type]}
            </Tag>
        );
      },
    },
    {
      title: '创建日期',
      dataIndex: 'createdDate',
      key: 'createdDate',
      render: (date) => formatDateTime(date),
    },
    {
      title: '关闭日期',
      dataIndex: 'closedDate',
      key: 'closedDate',
      render: (date) => date ? formatDateTime(date) : '暂无',
    },
    {
      title: '关闭者',
      dataIndex: 'closedByAdmin',
      key: 'closedBy',
      render: (closedByAdmin) => closedByAdmin ? '管理员' : '用户',
    },
    {
      title: '工单状态',
      key: 'status',
      render: (_, record) => (
          <Badge
              status={record.open ? "success" : "error"}
              text={record.open ? "开启" : "关闭"}
              className={record.open ? styles.statusBadgeOpen : styles.statusBadgeClosed}
          />
      ),
    },
    {
      title: '操作',
      key: 'action',
      render: (_, record) => (
          <Space size="small">
            {record.open ? (
                <>
                  <Button
                      type="primary"
                      icon={<MessageOutlined />}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEnterChatClick(record);
                      }}
                  >
                    回复
                  </Button>
                  <Button
                      icon={<SwapOutlined />}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleShowTransferModal(record);
                      }}
                  >
                    转移
                  </Button>
                  <Button
                      danger
                      icon={<CloseCircleOutlined />}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCloseTicket(record.id);
                      }}
                  >
                    关闭
                  </Button>
                </>
            ) : (
                <Button
                    icon={<ReloadOutlined />}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleReopenTicket(record.id);
                    }}
                >
                  开启
                </Button>
            )}
          </Space>
      ),
    },
  ];

  // 已分配工单表格列配置 (新增)
  const assignedTicketColumns = [
    {
      title: '工单编号',
      dataIndex: 'id',
      key: 'id',
    },
    {
      title: '工单主题',
      dataIndex: 'issue',
      key: 'issue',
      render: (text, record) => {
        const typeInfo = getTicketTypeInfo(record.type);
        return (
            <div className={styles.ticketTitle}>
              <span className={styles.typeIcon} style={{ color: typeInfo.color }}>{typeInfo.icon}</span>
              {text}
            </div>
        );
      },
    },
    {
      title: '工单类型',
      dataIndex: 'type',
      key: 'type',
      render: (type) => {
        const typeInfo = getTicketTypeInfo(type);
        return (
            <Tag color={typeInfo.color} className={styles.ticketType}>
              {TICKET_TYPE_MAP[type]}
            </Tag>
        );
      },
    },
    {
      title: '创建日期',
      dataIndex: 'createdDate',
      key: 'createdDate',
      render: (date) => formatDateTime(date),
    },
    {
      title: '工单状态',
      key: 'status',
      render: (_, record) => (
          <Badge
              status={record.open ? "success" : "error"}
              text={record.open ? "开启" : "关闭"}
              className={record.open ? styles.statusBadgeOpen : styles.statusBadgeClosed}
          />
      ),
    },
    {
      title: '操作',
      key: 'action',
      render: (_, record) => (
          <Space size="small">
            {record.open ? (
                <>
                  <Button
                      type="primary"
                      icon={<MessageOutlined />}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEnterChatClick(record);
                      }}
                  >
                    回复
                  </Button>
                  <Button
                      icon={<SwapOutlined />}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleShowTransferModal(record);
                      }}
                  >
                    转移
                  </Button>
                  <Button
                      danger
                      icon={<CloseCircleOutlined />}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCloseTicket(record.id);
                      }}
                  >
                    关闭
                  </Button>
                </>
            ) : (
                <Button
                    icon={<ReloadOutlined />}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleReopenTicket(record.id);
                    }}
                >
                  开启
                </Button>
            )}
          </Space>
      ),
    },
  ];

  return (
      <div>
        <Navbar />
        <div className={styles.ordersBackground}></div>
        <div className={styles.container}>
          <Title level={2} className={styles.title}>工单中心</Title>

          {/* 创建工单表单 */}
          <Card className={styles.form}>
            <Form layout="horizontal" onSubmit={handleCreateTicket}>
              <div className={styles.formHorizontal}>
                <Form.Item label="工单主题" className={styles.inputGroup}>
                  <Input
                      value={issue}
                      onChange={(e) => setIssue(e.target.value)}
                      placeholder="请输入工单主题..."
                      required
                      className={styles.input}
                  />
                </Form.Item>

                <Form.Item label="工单主题" className={styles.inputGroup}>
                  <Input
                      value={issue}
                      onChange={(e) => setIssue(e.target.value)}
                      placeholder="请输入工单主题..."
                      required
                      className={styles.input}
                  />
                </Form.Item>
                <Form.Item label="工单类型" className={styles.inputGroup}>
                  <Select
                      value={type}
                      onChange={(value) => setType(value)}
                      dropdownMatchSelectWidth={true}
                  >
                    {getTicketTypeOptions().map(({ value, label }) => (
                        <Select.Option key={value} value={value}>
                          {getTicketTypeInfo(value).icon} {label}
                        </Select.Option>
                    ))}
                  </Select>
                </Form.Item>
                <Button
                    type="primary"
                    htmlType="submit"
                    className={styles.button}
                    onClick={handleCreateTicket}
                >
                  创建工单
                </Button>
              </div>
            </Form>
          </Card>

          <div className={styles.pageSizeSelector}>
            <span>每页显示: </span>
            <Select
                value={pageSize}
                onChange={handlePageSizeChange}
                className={styles.pageSizeSelect}
                dropdownMatchSelectWidth={true}
            >
              <Select.Option value={5}>5条</Select.Option>
              <Select.Option value={10}>10条</Select.Option>
              <Select.Option value={20}>20条</Select.Option>
              <Select.Option value={50}>50条</Select.Option>
            </Select>
          </div>

          {/* 管理员工单标签页 (新增) */}
          {isAdmin && (
              <Tabs
                  activeKey={activeAdminTab}
                  onChange={handleAdminTabChange}
                  style={{ marginBottom: 16 }}
              >
                <TabPane
                    tab={
                      <span>
                  <UnorderedListOutlined />
                  所有工单
                </span>
                    }
                    key="all"
                />
                <TabPane
                    tab={
                      <span>
                  <UserOutlined />
                  已分配工单
                </span>
                    }
                    key="assigned"
                />
              </Tabs>
          )}

          {/* 用户工单区域或所有工单区域（根据activeAdminTab显示） */}
          {(!isAdmin || (isAdmin && activeAdminTab === 'all')) && (
              <Card>
                <Tabs
                    activeKey={activeTicketType}
                    onChange={handleTicketTypeChange}
                    className={styles.ticketTypeSelector}
                >
                  <TabPane tab="进行中的工单" key="open" />
                  <TabPane tab="已关闭的工单" key="closed" />
                </Tabs>

                <Title level={4} className={styles.title}>
                  {activeTicketType === 'open' ? '您的进行中工单' : '您的已关闭工单'}
                </Title>

                {activeTicketType === 'open' ? (
                    userTickets.length > 0 ? (
                        <div className={styles.tableContainer}>
                          <Table
                              dataSource={userTickets}
                              columns={userTicketColumns}
                              rowKey="id"
                              pagination={false}
                              onRow={(record) => ({
                                onClick: () => handleShowTicketDetail(record),
                              })}
                              className={styles.table}
                              rowClassName={styles.clickableRow}
                          />
                          <Pagination
                              current={currentPage + 1}
                              total={totalPages * pageSize}
                              pageSize={pageSize}
                              onChange={handlePageChange}
                              className={styles.pagination}
                              showSizeChanger={false}
                          />
                        </div>
                    ) : (
                        <div className={styles.noTickets}>没有正在进行的工单。</div>
                    )
                ) : (
                    closedTickets.length > 0 ? (
                        <div className={styles.tableContainer}>
                          <Table
                              dataSource={closedTickets}
                              columns={userTicketColumns}
                              rowKey="id"
                              pagination={false}
                              onRow={(record) => ({
                                onClick: () => handleShowTicketDetail(record),
                              })}
                              className={styles.table}
                              rowClassName={styles.clickableRow}
                          />
                          <Pagination
                              current={currentPage + 1}
                              total={totalPages * pageSize}
                              pageSize={pageSize}
                              onChange={handlePageChange}
                              className={styles.pagination}
                              showSizeChanger={false}
                          />
                        </div>
                    ) : (
                        <div className={styles.noTickets}>没有已关闭的工单。</div>
                    )
                )}

                {/* 管理员可见的所有工单 */}
                {isAdmin && activeAdminTab === 'all' && (
                    <>
                      <Title level={4} className={styles.title} style={{ marginTop: 30 }}>所有工单</Title>

                      {/* 管理员工单状态选择器 */}
                      <Radio.Group
                          value={adminTicketStatus}
                          onChange={(e) => handleAdminStatusChange(e.target.value)}
                          className={styles.ticketTypeSelector}
                      >
                        <Radio.Button value="all">全部工单</Radio.Button>
                        <Radio.Button value="open">开启工单</Radio.Button>
                        <Radio.Button value="closed">关闭工单</Radio.Button>
                      </Radio.Group>

                      {allTickets.length > 0 ? (
                          <div className={styles.tableContainer}>
                            <Table
                                dataSource={allTickets}
                                columns={adminTicketColumns}
                                rowKey="id"
                                pagination={false}
                                onRow={(record) => ({
                                  onClick: () => handleShowTicketDetail(record),
                                })}
                                className={styles.table}
                                rowClassName={styles.clickableRow}
                            />
                            <Pagination
                                current={currentPage + 1}
                                total={totalPages * pageSize}
                                pageSize={pageSize}
                                onChange={handlePageChange}
                                className={styles.pagination}
                                showSizeChanger={false}
                            />
                          </div>
                      ) : (
                          <div className={styles.noTickets}>没有工单记录。</div>
                      )}
                    </>
                )}
              </Card>
          )}

          {/* 已分配工单区域 (新增) */}
          {isAdmin && activeAdminTab === 'assigned' && (
              <Card>
                {/* 查看特定管理员工单的顶部栏 */}
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
                  <Title level={4} style={{ margin: 0 }}>
                    {viewingAdminId ?
                        `${viewingAdminName} 的已分配工单` :
                        '我的已分配工单'}
                  </Title>
                  <Space>
                    {viewingAdminId ? (
                        <Button
                            type="default"
                            icon={<UserOutlined />}
                            onClick={handleViewCurrentAdminTickets}
                        >
                          查看我的工单
                        </Button>
                    ) : (
                        <Button
                            type="default"
                            icon={<TeamOutlined />}
                            onClick={handleShowAdminSelector}
                        >
                          查看其他管理员工单
                        </Button>
                    )}
                    <Select
                        value={adminTicketStatus}
                        onChange={(value) => handleAdminStatusChange(value)}
                        style={{ width: 120 }}
                    >
                      <Select.Option value="open">开启工单</Select.Option>
                      <Select.Option value="closed">关闭工单</Select.Option>
                    </Select>
                  </Space>
                </div>

                {/* 工单统计信息 (新增) - 增加了安全访问检查 */}
                <Row gutter={16} style={{ marginBottom: 16 }}>
                  <Col span={8}>
                    <Card>
                      <Statistic
                          title="已分配工单数"
                          value={assignedTickets.length}
                          valueStyle={{ color: '#3f8600' }}
                      />
                    </Card>
                  </Col>
                  <Col span={8}>
                    <Card>
                      <Statistic
                          title="进行中工单"
                          value={assignedTickets.filter(ticket => ticket.open).length}
                          valueStyle={{ color: '#0050b3' }}
                      />
                    </Card>
                  </Col>
                  <Col span={8}>
                    <Card>
                      <Statistic
                          title="已关闭工单"
                          value={assignedTickets.filter(ticket => !ticket.open).length}
                          valueStyle={{ color: '#cf1322' }}
                      />
                    </Card>
                  </Col>
                </Row>

                {/* 已分配工单表格 - 增加了安全访问检查 */}
                {assignedTickets.length > 0 ? (
                    <div className={styles.tableContainer}>
                      <Table
                          dataSource={assignedTickets}
                          columns={assignedTicketColumns}
                          rowKey="id"
                          pagination={false}
                          onRow={(record) => ({
                            onClick: () => handleShowTicketDetail(record),
                          })}
                          className={styles.table}
                          rowClassName={styles.clickableRow}
                      />
                      <Pagination
                          current={currentPage + 1}
                          total={totalPages * pageSize}
                          pageSize={pageSize}
                          onChange={handlePageChange}
                          className={styles.pagination}
                          showSizeChanger={false}
                      />
                    </div>
                ) : (
                    <div className={styles.noTickets}>
                      {adminTicketStatus === 'open'
                          ? '没有已分配的进行中工单。'
                          : '没有已分配的已关闭工单。'}
                    </div>
                )}
              </Card>
          )}
        </div>

        {/* 工单详情模态框 - 增加了安全检查确保selectedTicket存在 */}
        {selectedTicket && (
            <Modal
                title={
                  <div style={{ color: 'white' }}>
              <span style={{ marginRight: 8 }}>
                {getTicketTypeInfo(selectedTicket.type).icon}
              </span>
                    {selectedTicket.issue}
                  </div>
                }
                open={showTicketDetail}
                onCancel={handleCloseTicketDetail}
                footer={[
                  selectedTicket.open ? (
                      <>
                        <Button
                            key="chat"
                            type="primary"
                            onClick={() => {
                              handleEnterChatClick(selectedTicket);
                              handleCloseTicketDetail();
                            }}
                        >
                          进入聊天
                        </Button>
                        <Button
                            key="close"
                            onClick={() => {
                              handleCloseTicket(selectedTicket.id);
                              handleCloseTicketDetail();
                            }}
                        >
                          关闭工单
                        </Button>
                      </>
                  ) : (
                      <Button
                          key="reopen"
                          onClick={() => {
                            handleReopenTicket(selectedTicket.id);
                            handleCloseTicketDetail();
                          }}
                          disabled={selectedTicket.closedByAdmin && !isAdmin}
                      >
                        重新打开工单
                      </Button>
                  )
                ]}
                width={800}
                className={styles.modalContent}
                bodyStyle={{ padding: '20px' }}
                headerStyle={{
                  backgroundColor: getTicketTypeInfo(selectedTicket.type).color,
                  color: 'white'
                }}
            >
              <div className={styles.ticketInfo}>
                <Paragraph><Text strong>工单编号:</Text> {selectedTicket.id}</Paragraph>
                <Paragraph>
                  <Text strong>工单类型:</Text> {TICKET_TYPE_MAP[selectedTicket.type]}
                  ({getTicketTypeInfo(selectedTicket.type).description})
                </Paragraph>
                <Paragraph>
                  <Text strong>创建时间:</Text> {formatDateTime(selectedTicket.createdDate)}
                </Paragraph>
                <Paragraph>
                  <Text strong>工单状态:</Text> {selectedTicket.open ? '开启' : '关闭'}
                </Paragraph>
                <Paragraph>
                  <Text strong>负责管理员:</Text> {
                  selectedTicket.assignedAdminId ?
                      (admins.find(admin => admin.id === selectedTicket.assignedAdminId)?.username || '未知管理员') :
                      '未分配'
                }
                </Paragraph>
                {!selectedTicket.open && (
                    <>
                      <Paragraph>
                        <Text strong>关闭时间:</Text> {formatDateTime(selectedTicket.closedDate)}
                      </Paragraph>
                      <Paragraph>
                        <Text strong>关闭者:</Text> {selectedTicket.closedByAdmin ? '管理员' : '用户'}
                      </Paragraph>
                    </>
                )}
              </div>

              {/* 根据工单类型显示不同的信息字段 */}
              <div className={styles.typeSpecificInfo}>
                <Title level={5}>详细信息</Title>
                {getTicketTypeInfo(selectedTicket.type).fields.map((field, index) => (
                    <div key={index} className={styles.fieldItem}>
                      <Text strong>{field}:</Text> <span>[用户提交的信息将显示在这里]</span>
                    </div>
                ))}
              </div>

              {/* 聊天记录预览 - 增加了防御性检查确保chats存在 */}
              {selectedTicket.chats && selectedTicket.chats.length > 0 ? (
                  <div className={styles.chatPreview}>
                    <Title level={5}>最近聊天记录</Title>
                    <div className={styles.chatContainer}>
                      {Array.isArray(selectedTicket.chats) && [...selectedTicket.chats].slice(0, 3).map(chat => (
                          <div key={chat.id} className={styles.chatMessage}>
                            <div className={styles.chatHeader}>
                              <span className={styles.chatUser}>{chat.user?.username || '未知用户'}</span>
                              <span className={styles.chatTime}>{formatDateTime(chat.timestamp)}</span>
                            </div>
                            <div className={styles.chatContent}>{chat.message}</div>
                          </div>
                      ))}
                      {selectedTicket.chats.length > 3 && (
                          <div className={styles.viewMoreChat}>查看更多消息...</div>
                      )}
                    </div>
                  </div>
              ) : (
                  <div className={styles.noChatMessages}>暂无聊天记录</div>
              )}
            </Modal>
        )}

        {/* 工单转移模态框 */}
        <Modal
            title="转移工单"
            open={showTransferModal}
            onCancel={handleCloseTransferModal}
            footer={[
              <Button key="cancel" onClick={handleCloseTransferModal}>
                取消
              </Button>,
              <Button
                  key="submit"
                  type="primary"
                  loading={transferLoading}
                  onClick={handleTransferTicket}
                  disabled={!selectedAdminId}
              >
                确认转移
              </Button>,
            ]}
        >
          <div style={{ marginBottom: 16 }}>
            <Text>请选择要转移的目标管理员：</Text>
          </div>

          {admins.length > 0 ? (
              <Radio.Group
                  onChange={(e) => setSelectedAdminId(e.target.value)}
                  value={selectedAdminId}
                  style={{ width: '100%' }}
              >
                <Space direction="vertical" style={{ width: '100%' }}>
                  {admins.map(admin => (
                      <Radio key={admin.id} value={admin.id}>
                        {admin.username} ({admin.email || '无邮箱'})
                      </Radio>
                  ))}
                </Space>
              </Radio.Group>
          ) : (
              <div>没有其他管理员可用。</div>
          )}

          {ticketToTransfer && (
              <div style={{ marginTop: 16 }}>
                <Divider />
                <Text strong>工单信息：</Text>
                <Paragraph>工单编号: {ticketToTransfer.id}</Paragraph>
                <Paragraph>工单主题: {ticketToTransfer.issue}</Paragraph>
                <Paragraph>
                  工单类型: {TICKET_TYPE_MAP[ticketToTransfer.type]}
                </Paragraph>
              </div>
          )}
        </Modal>

        {/* 管理员选择模态框 (新增) */}
        <Modal
            title="选择要查看的管理员"
            open={showAdminSelector}
            onCancel={() => setShowAdminSelector(false)}
            footer={[
              <Button key="cancel" onClick={() => setShowAdminSelector(false)}>
                取消
              </Button>
            ]}
        >
          <List
              itemLayout="horizontal"
              dataSource={admins}
              renderItem={admin => (
                  <List.Item
                      actions={[
                        <Button
                            type="primary"
                            onClick={() => handleSelectAdmin(admin)}
                        >
                          查看
                        </Button>
                      ]}
                  >
                    <List.Item.Meta
                        avatar={<UserOutlined style={{ fontSize: 24 }} />}
                        title={admin.username}
                        description={`邮箱: ${admin.email || '未设置'}`}
                    />
                  </List.Item>
              )}
          />
        </Modal>
      </div>
  );
};

export default TicketManagerRender;