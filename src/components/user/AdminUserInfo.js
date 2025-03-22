import React, { useEffect, useState, useCallback } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import styles from '../../assets/css/user/AdminUserInfo.module.css';
import Navbar from '../base/Navbar';
import {
  Table,
  Button,
  Modal,
  Form,
  Input,
  Select,
  DatePicker,
  Spin,
  message,
  Space,
  Pagination,
  Tabs,
  Badge,
  Card,
  Descriptions,
  Image,
  Tag,
} from 'antd';
import {
  EditOutlined,
  LockOutlined,
  UnlockOutlined,
  EyeOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  ExclamationCircleOutlined,
  ShopOutlined,
  EnvironmentOutlined,
  PhoneOutlined,
  ClockCircleOutlined,
} from '@ant-design/icons';
import moment from 'moment';
import { getGenderText, getUserGroupText } from '../utils/map/userMap';

const { TabPane } = Tabs;
const { Option } = Select;
const { confirm } = Modal;
const { TextArea } = Input;

const AdminUserInfo = () => {
  const navigate = useNavigate();
  const [form] = Form.useForm();

  const [users, setUsers] = useState([]);
  const [editData, setEditData] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pendingVerifications, setPendingVerifications] = useState([]);
  const [selectedImage, setSelectedImage] = useState(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [currentDetailUser, setCurrentDetailUser] = useState(null);

  // 所有用户分页状态
  const [currentPage, setCurrentPage] = useState(0);
  const [pageSize] = useState(10);
  const [totalPages, setTotalPages] = useState(0);
  const [totalItems, setTotalItems] = useState(0);

  // 待认证用户分页状态
  const [pendingCurrentPage, setPendingCurrentPage] = useState(0);
  const [pendingTotalPages, setPendingTotalPages] = useState(0);
  const [pendingTotalItems, setPendingTotalItems] = useState(0);
  const [pendingPageSize] = useState(10);

  // 商家入驻审核状态
  const [pendingMerchants, setPendingMerchants] = useState([]);
  const [merchantCurrentPage, setMerchantCurrentPage] = useState(0);
  const [merchantTotalPages, setMerchantTotalPages] = useState(0);
  const [merchantTotalItems, setMerchantTotalItems] = useState(0);
  const [merchantPageSize] = useState(10);
  const [currentDetailMerchant, setCurrentDetailMerchant] = useState(null);
  const [isMerchantDetailsModalOpen, setIsMerchantDetailsModalOpen] = useState(false);
  const [merchantAuditRemarks, setMerchantAuditRemarks] = useState('');

  // 店铺审核状态
  const [pendingStores, setPendingStores] = useState([]);
  const [storeCurrentPage, setStoreCurrentPage] = useState(0);
  const [storeTotalPages, setStoreTotalPages] = useState(0);
  const [storeTotalItems, setStoreTotalItems] = useState(0);
  const [storePageSize] = useState(10);
  const [currentDetailStore, setCurrentDetailStore] = useState(null);
  const [isStoreDetailsModalOpen, setIsStoreDetailsModalOpen] = useState(false);
  const [storeAuditRemarks, setStoreAuditRemarks] = useState('');

  // 避免重复加载的标记
  const [initialLoadComplete, setInitialLoadComplete] = useState(false);

  // 查看大图
  const handleImageClick = (imageUrl) => {
    setSelectedImage(imageUrl);
  };

  // 关闭图片预览
  const closeImageViewer = () => {
    setSelectedImage(null);
  };

  // 获取附加照片标签
  const getAdditionalPhotoLabel = (identity) => {
    switch (identity) {
      case 'STUDENT': return '学生证照片';
      case 'PLATFORM_STAFF': return '合同照片';
      case 'MERCHANT': return '营业执照照片';
      default: return '附加照片';
    }
  };

  // 处理用户列表分页
  const handlePageChange = (page) => {
    const adjustedPage = page - 1; // 转换为0-based索引
    setCurrentPage(adjustedPage);
    fetchUsers(adjustedPage, pageSize);
  };

  // 处理待验证用户分页
  const handlePendingPageChange = (page) => {
    const adjustedPage = page - 1; // 转换为0-based索引
    setPendingCurrentPage(adjustedPage);
    fetchPendingVerifications(adjustedPage, pendingPageSize);
  };

  // 处理待审核商家分页
  const handleMerchantPageChange = (page) => {
    const adjustedPage = page - 1; // 转换为0-based索引
    setMerchantCurrentPage(adjustedPage);
    fetchPendingMerchants(adjustedPage, merchantPageSize);
  };

  // 处理待审核店铺分页
  const handleStorePageChange = (page) => {
    const adjustedPage = page - 1;
    setStoreCurrentPage(adjustedPage);
    fetchPendingStores(adjustedPage, storePageSize);
  };

  // 获取所有用户
  const fetchUsers = useCallback(async (pageNumber = 0, pageSize = 10) => {
    try {
      const response = await axios.get('http://127.0.0.1:8080/api/users/all', {
        params: { pageNumber, pageSize },
        withCredentials: true,
      });

      if (response.status === 200) {
        if (response.data.content && Array.isArray(response.data.content)) {
          setUsers(response.data.content);
          setTotalPages(response.data.totalPages);
          setTotalItems(response.data.totalElements || response.data.content.length * response.data.totalPages);
        } else {
          setUsers([]);
          setTotalPages(0);
          setTotalItems(0);
        }
      }
    } catch (error) {
      console.error('获取用户信息失败:', error);
      setError('获取用户数据失败: ' + (error.response?.data || error.message));
    } finally {
      setIsLoading(false);
    }
  }, []);

  // 获取待认证用户
  const fetchPendingVerifications = useCallback(async (pageNumber = 0, pageSize = 10) => {
    try {
      const response = await axios.get('http://127.0.0.1:8080/api/users/pending-verification', {
        params: { pageNumber, pageSize },
        withCredentials: true
      });

      if (response.status === 200) {
        if (Array.isArray(response.data)) {
          setPendingVerifications(response.data);
          setPendingTotalPages(Math.ceil(response.data.length / pageSize));
          setPendingTotalItems(response.data.length);
        } else if (response.data.content && Array.isArray(response.data.content)) {
          setPendingVerifications(response.data.content);
          setPendingTotalPages(response.data.totalPages);
          setPendingTotalItems(response.data.totalElements || response.data.content.length);
        } else {
          setPendingVerifications(response.data || []);
          setPendingTotalPages(Math.ceil((response.data?.length || 0) / pageSize));
          setPendingTotalItems(response.data?.length || 0);
        }
      }
    } catch (error) {
      console.error('获取待审核实名认证失败:', error);
      setError('获取待审核用户失败: ' + (error.response?.data || error.message));
    }
  }, []);

  // 获取待审核商家
  const fetchPendingMerchants = useCallback(async (pageNumber = 0, pageSize = 10) => {
    try {
      const response = await axios.get('http://127.0.0.1:8080/api/merchants/pending', {
        params: { pageNumber, pageSize },
        withCredentials: true
      });

      if (response.status === 200) {
        if (Array.isArray(response.data)) {
          setPendingMerchants(response.data);
          setMerchantTotalPages(Math.ceil(response.data.length / pageSize));
          setMerchantTotalItems(response.data.length);
        } else if (response.data.content && Array.isArray(response.data.content)) {
          setPendingMerchants(response.data.content);
          setMerchantTotalPages(response.data.totalPages);
          setMerchantTotalItems(response.data.totalElements || response.data.content.length);
        } else {
          setPendingMerchants(response.data || []);
          setMerchantTotalPages(Math.ceil((response.data?.length || 0) / pageSize));
          setMerchantTotalItems(response.data?.length || 0);
        }
      }
    } catch (error) {
      console.error('获取待审核商家失败:', error);
      message.error('获取待审核商家失败: ' + (error.response?.data || error.message));
    }
  }, []);

  // 获取待审核店铺
  const fetchPendingStores = useCallback(async (pageNumber = 0, pageSize = 10) => {
    try {
      console.log("开始获取待审核店铺数据...");
      // 确保API路径与后端一致
      const response = await axios.get('http://127.0.0.1:8080/api/stores/pending-review', {
        params: { pageNumber, pageSize },
        withCredentials: true
      });

      console.log("获取待审核店铺响应:", response.data);

      if (response.status === 200) {
        if (Array.isArray(response.data)) {
          setPendingStores(response.data);
          setStoreTotalPages(Math.ceil(response.data.length / pageSize));
          setStoreTotalItems(response.data.length);
          console.log("成功设置待审核店铺数据(数组格式):", response.data);
        } else if (response.data.content && Array.isArray(response.data.content)) {
          setPendingStores(response.data.content);
          setStoreTotalPages(response.data.totalPages);
          setStoreTotalItems(response.data.totalElements || response.data.content.length);
          console.log("成功设置待审核店铺数据(分页格式):", response.data.content);
        } else {
          setPendingStores(response.data || []);
          setStoreTotalPages(Math.ceil((response.data?.length || 0) / pageSize));
          setStoreTotalItems(response.data?.length || 0);
          console.log("成功设置待审核店铺数据(其他格式):", response.data);
        }
      }
    } catch (error) {
      console.error('获取待审核店铺失败:', error);
      console.error('错误详情:', error.response?.data);
      message.error('获取待审核店铺失败: ' + (error.response?.data?.message || error.message));
      // 设置空数据，确保UI能正常显示
      setPendingStores([]);
    }
  }, []);

  // 初始化数据加载
  useEffect(() => {
    if (initialLoadComplete) {
      return;
    }

    setIsLoading(true);
    console.log("开始初始化数据加载...");

    // 单独调用每个函数，以便于调试
    fetchUsers(currentPage, pageSize)
        .then(() => fetchPendingVerifications(pendingCurrentPage, pendingPageSize))
        .then(() => fetchPendingMerchants(merchantCurrentPage, merchantPageSize))
        .then(() => {
          console.log("调用fetchPendingStores...");
          return fetchPendingStores(storeCurrentPage, storePageSize);
        })
        .catch(error => {
          console.error('初始数据加载失败:', error);
          setError('数据加载失败');
        })
        .finally(() => {
          setIsLoading(false);
          setInitialLoadComplete(true);
          console.log("初始化数据加载完成");
        });

  }, [
    fetchUsers,
    fetchPendingVerifications,
    fetchPendingMerchants,
    fetchPendingStores,
    initialLoadComplete,
    currentPage,
    pageSize,
    pendingCurrentPage,
    pendingPageSize,
    merchantCurrentPage,
    merchantPageSize,
    storeCurrentPage,
    storePageSize
  ]);

  // 处理认证审核决定
  const handleVerificationDecision = async (userId, approved) => {
    try {
      await axios.put(`http://127.0.0.1:8080/api/users/verify/${userId}`, null, {
        params: { approved },
        withCredentials: true
      });

      message.success(approved ? '实名认证已通过' : '实名认证已拒绝');
      fetchPendingVerifications(pendingCurrentPage, pendingPageSize);
    } catch (error) {
      console.error('处理实名认证失败:', error);
      message.error('处理实名认证失败: ' + (error.response?.data || error.message));
    }
  };

  // 处理商家审核决定
  const handleMerchantAudit = async (merchantUid, approved) => {
    try {
      await axios.post(`http://127.0.0.1:8080/api/merchants/${merchantUid}/audit`, null, {
        params: { approved, remarks: merchantAuditRemarks },
        withCredentials: true
      });

      message.success(approved ? '商家认证已通过' : '商家认证已拒绝');
      setIsMerchantDetailsModalOpen(false);
      setCurrentDetailMerchant(null);
      setMerchantAuditRemarks('');
      fetchPendingMerchants(merchantCurrentPage, merchantPageSize);
    } catch (error) {
      console.error('处理商家审核失败:', error);
      message.error('处理商家审核失败: ' + (error.response?.data || error.message));
    }
  };

// 处理店铺审核决定
  const handleStoreAudit = async (storeId, approved) => {
    try {
      // 使用新的审核API
      await axios.post(`http://127.0.0.1:8080/api/stores/${storeId}/audit`, null, {
        params: { approved, remarks: storeAuditRemarks },
        withCredentials: true
      });

      message.success(approved ? '店铺审核已通过' : '店铺审核已拒绝');
      setIsStoreDetailsModalOpen(false);
      setCurrentDetailStore(null);
      setStoreAuditRemarks('');
      fetchPendingStores(storeCurrentPage, storePageSize);
    } catch (error) {
      console.error('处理店铺审核失败:', error);
      message.error('处理店铺审核失败: ' + (error.response?.data?.message || error.message));
    }
  };

  // 编辑用户
  const handleEditUser = useCallback((user) => {
    setEditData({
      ...user,
      birthday: user.birthday ? moment(user.birthday) : null
    });
    setIsEditModalOpen(true);

    form.setFieldsValue({
      ...user,
      birthday: user.birthday ? moment(user.birthday) : null
    });
  }, [form]);

  // 关闭编辑模态框
  const handleCloseEditModal = useCallback(() => {
    setIsEditModalOpen(false);
    setEditData({});
    form.resetFields();
  }, [form]);

  // 查看认证详情
  const handleLoadVerificationDetails = (user) => {
    setCurrentDetailUser(user);
    setIsDetailsModalOpen(true);
  };

  // 关闭认证详情模态框
  const handleCloseDetailsModal = () => {
    setIsDetailsModalOpen(false);
    setCurrentDetailUser(null);
  };

  // 查看商家详情
  const handleLoadMerchantDetails = (merchant) => {
    setCurrentDetailMerchant(merchant);
    setIsMerchantDetailsModalOpen(true);
    setMerchantAuditRemarks('');
  };

  // 关闭商家详情模态框
  const handleCloseMerchantDetailsModal = () => {
    setIsMerchantDetailsModalOpen(false);
    setCurrentDetailMerchant(null);
    setMerchantAuditRemarks('');
  };

  // 查看店铺详情
  const handleLoadStoreDetails = (store) => {
    setCurrentDetailStore(store);
    setIsStoreDetailsModalOpen(true);
    setStoreAuditRemarks('');
  };

  // 关闭店铺详情模态框
  const handleCloseStoreDetailsModal = () => {
    setIsStoreDetailsModalOpen(false);
    setCurrentDetailStore(null);
    setStoreAuditRemarks('');
  };

  // 处理表单输入变化
  const handleEditChange = (changedValues) => {
    setEditData({...editData, ...changedValues});
  };

  // 保存用户编辑
  const handleSaveUser = useCallback(async (values) => {
    try {
      // 转换日期格式
      const formattedValues = {
        ...values,
        birthday: values.birthday ? values.birthday.format('YYYY-MM-DD') : null
      };

      await axios.put(
          'http://127.0.0.1:8080/api/users/update',
          formattedValues,
          { withCredentials: true }
      );

      setUsers(prevUsers =>
          prevUsers.map(user =>
              user.id === formattedValues.id ? { ...user, ...formattedValues } : user
          )
      );

      handleCloseEditModal();
      message.success('用户信息更新成功');
    } catch (error) {
      console.error('更新用户失败:', error);
      message.error('更新用户信息失败: ' + (error.response?.data || error.message));
    }
  }, [handleCloseEditModal]);

  // 切换用户登录权限
  const handleToggleLoginAbility = (userId, currentCanLogin) => {
    confirm({
      title: `确定要${currentCanLogin ? '禁止' : '允许'}该用户登录吗？`,
      icon: <ExclamationCircleOutlined />,
      content: currentCanLogin ? '禁止后该用户将无法登录系统。' : '允许后该用户将可以正常登录系统。',
      onOk: async () => {
        try {
          const response = await axios.put(
              `http://127.0.0.1:8080/api/users/toggle-login/${userId}`,
              null,
              {
                params: { canLogin: !currentCanLogin },
                withCredentials: true
              }
          );

          if (response.status === 200) {
            setUsers(prevUsers =>
                prevUsers.map(user =>
                    user.id === userId ? { ...user, canLogin: !currentCanLogin } : user
                )
            );
            message.success(`用户登录权限${!currentCanLogin ? '已启用' : '已禁用'}`);
          }
        } catch (error) {
          console.error('切换用户登录权限失败:', error);
          message.error('切换用户登录权限失败: ' + (error.response?.data || error.message));
        }
      }
    });
  };

  // 表格列定义
  const columns = [
    {
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
      width: 60
    },
    {
      title: '用户名',
      dataIndex: 'username',
      key: 'username',
    },
    {
      title: '电子邮箱',
      dataIndex: 'email',
      key: 'email',
    },
    {
      title: '注册日期',
      dataIndex: 'registrationDate',
      key: 'registrationDate',
      render: (date) => date ? moment(date).format('YYYY-MM-DD') : '-'
    },
    {
      title: '生日',
      dataIndex: 'birthday',
      key: 'birthday',
      render: (date) => date ? moment(date).format('YYYY-MM-DD') : '-'
    },
    {
      title: '性别',
      dataIndex: 'gender',
      key: 'gender',
      render: (gender) => getGenderText(gender)
    },
    {
      title: '用户组',
      dataIndex: 'userGroup',
      key: 'userGroup',
      render: (userGroup) => getUserGroupText(userGroup)
    },
    {
      title: '实名认证',
      dataIndex: 'userVerificationStatus',
      key: 'userVerificationStatus',
      render: (status) => (
          <Badge
              status={status === 'VERIFIED' ? 'success' : 'default'}
              text={status === 'VERIFIED' ? '是' : '否'}
          />
      )
    },
    {
      title: '登录状态',
      dataIndex: 'canLogin',
      key: 'canLogin',
      render: (canLogin) => (
          <Badge
              status={canLogin ? 'success' : 'error'}
              text={canLogin ? '允许' : '禁止'}
          />
      )
    },
    {
      title: '操作',
      key: 'action',
      render: (_, record) => (
          <Space>
            <Button
                type="primary"
                icon={<EditOutlined />}
                size="small"
                onClick={() => handleEditUser(record)}
            >
              编辑
            </Button>
            <Button
                type={record.canLogin ? 'danger' : 'primary'}
                icon={record.canLogin ? <LockOutlined /> : <UnlockOutlined />}
                size="small"
                onClick={() => handleToggleLoginAbility(record.id, record.canLogin)}
            >
              {record.canLogin ? '封禁' : '解封'}
            </Button>
          </Space>
      ),
    },
  ];

  // 待审核表格列定义
  const pendingColumns = [
    {
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
    },
    {
      title: '用户名',
      dataIndex: 'username',
      key: 'username',
    },
    {
      title: '操作',
      key: 'action',
      render: (_, record) => (
          <Space>
            <Button
                type="primary"
                icon={<EyeOutlined />}
                size="small"
                onClick={() => handleLoadVerificationDetails(record)}
            >
              详情
            </Button>
            <Button
                type="primary"
                icon={<CheckCircleOutlined />}
                size="small"
                style={{ backgroundColor: '#28a745', borderColor: '#28a745' }}
                onClick={() => handleVerificationDecision(record.id, true)}
            >
              通过
            </Button>
            <Button
                type="primary"
                danger
                icon={<CloseCircleOutlined />}
                size="small"
                onClick={() => handleVerificationDecision(record.id, false)}
            >
              拒绝
            </Button>
          </Space>
      ),
    },
  ];

  // 商家审核表格列定义
  const merchantColumns = [
    {
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
      width: 60
    },
    {
      title: '商家UID',
      dataIndex: 'merchantUid',
      key: 'merchantUid',
    },
    {
      title: '联系人',
      dataIndex: 'contactName',
      key: 'contactName',
    },
    {
      title: '联系电话',
      dataIndex: 'contactPhone',
      key: 'contactPhone',
    },
    {
      title: '营业执照',
      dataIndex: 'businessLicense',
      key: 'businessLicense',
    },
    {
      title: '申请时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (date) => date ? moment(date).format('YYYY-MM-DD HH:mm') : '-'
    },
    {
      title: '操作',
      key: 'action',
      render: (_, record) => (
          <Space>
            <Button
                type="primary"
                icon={<EyeOutlined />}
                size="small"
                onClick={() => handleLoadMerchantDetails(record)}
            >
              详情
            </Button>
            <Button
                type="primary"
                icon={<CheckCircleOutlined />}
                size="small"
                style={{ backgroundColor: '#28a745', borderColor: '#28a745' }}
                onClick={() => {
                  handleLoadMerchantDetails(record);
                }}
            >
              审核
            </Button>
          </Space>
      ),
    },
  ];

  // 店铺审核表格列定义
  const storeColumns = [
    {
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
      width: 60
    },
    {
      title: '店铺名称',
      dataIndex: 'storeName',
      key: 'storeName',
    },
    {
      title: '商家ID',
      dataIndex: 'merchantId',
      key: 'merchantId',
    },
    {
      title: '商家名称',
      dataIndex: 'merchantName',
      key: 'merchantName',
    },
    {
      title: '联系电话',
      dataIndex: 'contactPhone',
      key: 'contactPhone',
    },
    {
      title: '申请时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (date) => date ? moment(date).format('YYYY-MM-DD HH:mm') : '-'
    },
    {
      title: '操作',
      key: 'action',
      render: (_, record) => (
          <Space>
            <Button
                type="primary"
                icon={<EyeOutlined />}
                size="small"
                onClick={() => handleLoadStoreDetails(record)}
            >
              详情
            </Button>
            <Button
                type="primary"
                icon={<CheckCircleOutlined />}
                size="small"
                style={{ backgroundColor: '#28a745', borderColor: '#28a745' }}
                onClick={() => {
                  handleLoadStoreDetails(record);
                }}
            >
              审核
            </Button>
          </Space>
      ),
    },
  ];

  // 加载状态
  if (isLoading) {
    return (
        <div className={styles.pageContainer}>
          <Navbar />
          <div className={styles.loadingWrapper}>
            <Spin size="large" tip="加载中..." />
          </div>
        </div>
    );
  }

  // 错误状态
  if (error) {
    return (
        <div className={styles.pageContainer}>
          <Navbar />
          <div className={styles.errorContainer || styles.loadingWrapper}>
            <h2>出错了</h2>
            <p>{error}</p>
            <Button
                type="primary"
                onClick={() => navigate('/profile')}
            >
              返回个人资料页面
            </Button>
          </div>
        </div>
    );
  }

  return (
      <div className={styles.background}>
        <Navbar />
        <div className={styles.container}>
          <h1 className={styles.title}>用户管理系统</h1>
          <div className={styles.contentWrapper}>
            <div className={styles.tabsContainer}>
              <Tabs defaultActiveKey="1" className={styles.tabs}>
                <TabPane tab="所有用户信息" key="1">
                  <Card className={styles.section}>
                    <Table
                        dataSource={users}
                        columns={columns}
                        rowKey="id"
                        pagination={false}
                        scroll={{ x: 'max-content' }}
                        className={styles.table}
                    />
                    {totalPages > 1 && (
                        <div className={styles.pagination}>
                          <Pagination
                              current={currentPage + 1}
                              total={totalItems}
                              pageSize={pageSize}
                              onChange={handlePageChange}
                              showSizeChanger={false}
                              showTotal={(total) => `共 ${total} 条记录`}
                          />
                        </div>
                    )}
                  </Card>
                </TabPane>
                <TabPane tab="待审核实名认证" key="2">
                  <Card className={styles.section}>
                    <Table
                        dataSource={pendingVerifications}
                        columns={pendingColumns}
                        rowKey="id"
                        pagination={false}
                        className={styles.table}
                    />
                    {pendingTotalPages > 1 && (
                        <div className={styles.pagination}>
                          <Pagination
                              current={pendingCurrentPage + 1}
                              total={pendingTotalItems}
                              pageSize={pendingPageSize}
                              onChange={handlePendingPageChange}
                              showSizeChanger={false}
                              showTotal={(total) => `共 ${total} 条记录`}
                          />
                        </div>
                    )}
                  </Card>
                </TabPane>
                <TabPane tab={
                  <span>
                  <ShopOutlined /> 待审核商家
                    {pendingMerchants.length > 0 &&
                        <Badge count={pendingMerchants.length} style={{ marginLeft: 5 }} />
                    }
                </span>
                } key="3">
                  <Card className={styles.section}>
                    <Table
                        dataSource={pendingMerchants}
                        columns={merchantColumns}
                        rowKey="id"
                        pagination={false}
                        className={styles.table}
                    />
                    {merchantTotalPages > 1 && (
                        <div className={styles.pagination}>
                          <Pagination
                              current={merchantCurrentPage + 1}
                              total={merchantTotalItems}
                              pageSize={merchantPageSize}
                              onChange={handleMerchantPageChange}
                              showSizeChanger={false}
                              showTotal={(total) => `共 ${total} 条记录`}
                          />
                        </div>
                    )}
                  </Card>
                </TabPane>
                <TabPane tab={
                  <span>
                    <ShopOutlined /> 待审核店铺
                    {pendingStores.length > 0 &&
                        <Badge count={pendingStores.length} style={{ marginLeft: 5 }} />
                    }
                  </span>
                } key="4">
                  <Card className={styles.section}>
                    <div style={{marginBottom: 10}}>
                      <span>店铺审核状态：{pendingStores.length > 0 ? `有${pendingStores.length}个待审核店铺` : '暂无待审核店铺'}</span>
                    </div>
                    <Table
                        dataSource={pendingStores}
                        columns={storeColumns}
                        rowKey="id"
                        pagination={false}
                        className={styles.table}
                        locale={{emptyText: '暂无待审核店铺'}}
                    />
                    {storeTotalPages > 1 && (
                        <div className={styles.pagination}>
                          <Pagination
                              current={storeCurrentPage + 1}
                              total={storeTotalItems}
                              pageSize={storePageSize}
                              onChange={handleStorePageChange}
                              showSizeChanger={false}
                              showTotal={(total) => `共 ${total} 条记录`}
                          />
                        </div>
                    )}
                  </Card>
                </TabPane>
              </Tabs>
            </div>
          </div>

          {/* 用户编辑模态框 */}
          <Modal
              title="编辑用户信息"
              visible={isEditModalOpen}
              onCancel={handleCloseEditModal}
              footer={null}
              width={600}
              destroyOnClose
              className={styles.modal}
          >
            <Form
                form={form}
                layout="vertical"
                onFinish={handleSaveUser}
                onValuesChange={handleEditChange}
                initialValues={editData}
                className={styles.editForm}
            >
              <Form.Item
                  name="id"
                  hidden
              >
                <Input />
              </Form.Item>

              <Form.Item
                  label="用户名"
                  name="username"
                  rules={[{ required: true, message: '请输入用户名' }]}
              >
                <Input />
              </Form.Item>

              <Form.Item
                  label="电子邮箱"
                  name="email"
                  rules={[
                    { required: true, message: '请输入电子邮箱' },
                    { type: 'email', message: '请输入有效的电子邮箱' }
                  ]}
              >
                <Input />
              </Form.Item>

              <Form.Item
                  label="注册日期"
                  name="registrationDate"
              >
                <DatePicker style={{ width: '100%' }} />
              </Form.Item>

              <Form.Item
                  label="生日"
                  name="birthday"
              >
                <DatePicker style={{ width: '100%' }} />
              </Form.Item>

              <Form.Item
                  label="性别"
                  name="gender"
              >
                <Select>
                  <Option value="male">男</Option>
                  <Option value="female">女</Option>
                  <Option value="other">其他</Option>
                </Select>
              </Form.Item>

              <Form.Item
                  label="用户组"
                  name="userGroup"
              >
                <Select>
                  <Option value="user">普通用户</Option>
                  <Option value="admin">管理员</Option>
                </Select>
              </Form.Item>

              <div className={styles.formActions}>
                <Button onClick={handleCloseEditModal}>
                  取消
                </Button>
                <Button type="primary" htmlType="submit">
                  保存并提交
                </Button>
              </div>
            </Form>
          </Modal>

          {/* 认证详情模态框 */}
          <Modal
              title="实名认证详情"
              visible={isDetailsModalOpen}
              onCancel={handleCloseDetailsModal}
              width={800}
              footer={[
                <Button key="approve" type="primary" style={{ backgroundColor: '#28a745', borderColor: '#28a745' }} onClick={() => {
                  handleVerificationDecision(currentDetailUser?.id, true);
                  handleCloseDetailsModal();
                }}>
                  通过
                </Button>,
                <Button key="reject" type="primary" danger onClick={() => {
                  handleVerificationDecision(currentDetailUser?.id, false);
                  handleCloseDetailsModal();
                }}>
                  拒绝
                </Button>,
                <Button key="close" onClick={handleCloseDetailsModal}>
                  关闭
                </Button>
              ]}
              className={styles.verificationModal}
          >
            {currentDetailUser && (
                <>
                  <Descriptions
                      title="基本信息"
                      bordered
                      column={2}
                      size="small"
                      className={styles.descriptions}
                  >
                    <Descriptions.Item label="真实姓名">
                      {currentDetailUser.realName || (currentDetailUser.personalInfo ? currentDetailUser.personalInfo.real_name : '')}
                    </Descriptions.Item>
                    <Descriptions.Item label="身份证号">
                      {currentDetailUser.idNumber || (currentDetailUser.personalInfo ? currentDetailUser.personalInfo.id_number : '')}
                    </Descriptions.Item>
                    <Descriptions.Item label="学生证号">
                      {currentDetailUser.studentId || (currentDetailUser.personalInfo ? currentDetailUser.personalInfo.student_id : '')}
                    </Descriptions.Item>
                    <Descriptions.Item label="用户身份">
                      {currentDetailUser.userIdentity}
                    </Descriptions.Item>
                    <Descriptions.Item label="性别">
                      {getGenderText(currentDetailUser.gender)}
                    </Descriptions.Item>
                    <Descriptions.Item label="用户组">
                      {getUserGroupText(currentDetailUser.userGroup)}
                    </Descriptions.Item>
                  </Descriptions>

                  <div className={styles.imagesSection}>
                    <h3>证件照片</h3>
                    <div className={styles.imagesGrid}>
                      <div className={styles.imageItem}>
                        <p className={styles.imageTitle}>身份证正面</p>
                        <div className={styles.imageContainer}>
                          <Image
                              src={currentDetailUser.idCardFrontUrl || (currentDetailUser.personalInfo ? currentDetailUser.personalInfo.id_card_front_url : '')}
                              alt="身份证正面"
                              className={styles.thumbnailImage}
                              onClick={() => handleImageClick(currentDetailUser.idCardFrontUrl || (currentDetailUser.personalInfo ? currentDetailUser.personalInfo.id_card_front_url : ''))}
                              preview={false}
                          />
                        </div>
                      </div>
                      <div className={styles.imageItem}>
                        <p className={styles.imageTitle}>身份证反面</p>
                        <div className={styles.imageContainer}>
                          <Image
                              src={currentDetailUser.idCardBackUrl || (currentDetailUser.personalInfo ? currentDetailUser.personalInfo.id_card_back_url : '')}
                              alt="身份证反面"
                              className={styles.thumbnailImage}
                              onClick={() => handleImageClick(currentDetailUser.idCardBackUrl || (currentDetailUser.personalInfo ? currentDetailUser.personalInfo.id_card_back_url : ''))}
                              preview={false}
                          />
                        </div>
                      </div>
                      <div className={styles.imageItem}>
                        <p className={styles.imageTitle}>手持身份证照片</p>
                        <div className={styles.imageContainer}>
                          <Image
                              src={currentDetailUser.selfPhotoUrl || (currentDetailUser.personalInfo ? currentDetailUser.personalInfo.self_photo_url : '')}
                              alt="手持身份证照片"
                              className={styles.thumbnailImage}
                              onClick={() => handleImageClick(currentDetailUser.selfPhotoUrl || (currentDetailUser.personalInfo ? currentDetailUser.personalInfo.self_photo_url : ''))}
                              preview={false}
                          />
                        </div>
                      </div>

                      {/* 只有当用户是学生或平台专员时才显示附加照片 */}
                      {(currentDetailUser.userIdentity === 'STUDENT' ||
                          currentDetailUser.userIdentity === 'PLATFORM_STAFF') && (
                          <div className={styles.imageItem}>
                            <p className={styles.imageTitle}>{getAdditionalPhotoLabel(currentDetailUser.userIdentity)}</p>
                            <div className={styles.imageContainer}>
                              <Image
                                  src={currentDetailUser.additionalPhotoUrl || (currentDetailUser.personalInfo ? currentDetailUser.personalInfo.additional_photo_url : '')}
                                  alt={getAdditionalPhotoLabel(currentDetailUser.userIdentity)}
                                  className={styles.thumbnailImage}
                                  onClick={() => handleImageClick(currentDetailUser.additionalPhotoUrl || (currentDetailUser.personalInfo ? currentDetailUser.personalInfo.additional_photo_url : ''))}
                                  preview={false}
                              />
                            </div>
                          </div>
                      )}
                    </div>
                  </div>
                </>
            )}
          </Modal>

          {/* 商家详情模态框 */}
          <Modal
              title={
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <ShopOutlined style={{ marginRight: 8 }} />
                  <span>商家认证审核</span>
                </div>
              }
              visible={isMerchantDetailsModalOpen}
              onCancel={handleCloseMerchantDetailsModal}
              width={800}
              footer={[
                <Button
                    key="approve"
                    type="primary"
                    icon={<CheckCircleOutlined />}
                    style={{ backgroundColor: '#28a745', borderColor: '#28a745' }}
                    onClick={() => handleMerchantAudit(currentDetailMerchant?.merchantUid, true)}
                >
                  通过认证
                </Button>,
                <Button
                    key="reject"
                    type="primary"
                    danger
                    icon={<CloseCircleOutlined />}
                    onClick={() => handleMerchantAudit(currentDetailMerchant?.merchantUid, false)}
                >
                  拒绝认证
                </Button>,
                <Button key="close" onClick={handleCloseMerchantDetailsModal}>
                  关闭
                </Button>
              ]}
              className={styles.verificationModal}
          >
            {currentDetailMerchant && (
                <>
                  <Descriptions
                      title="商家基本信息"
                      bordered
                      column={2}
                      size="small"
                      className={styles.descriptions}
                  >
                    <Descriptions.Item label="商家UID">
                      {currentDetailMerchant.merchantUid}
                    </Descriptions.Item>
                    <Descriptions.Item label="营业执照号">
                      {currentDetailMerchant.businessLicense}
                    </Descriptions.Item>
                    <Descriptions.Item label="联系人姓名">
                      {currentDetailMerchant.contactName}
                    </Descriptions.Item>
                    <Descriptions.Item label="联系电话">
                      {currentDetailMerchant.contactPhone}
                    </Descriptions.Item>
                    <Descriptions.Item label="经营地址" span={2}>
                      {currentDetailMerchant.businessAddress}
                    </Descriptions.Item>
                    <Descriptions.Item label="申请时间">
                      {currentDetailMerchant.createdAt ? moment(currentDetailMerchant.createdAt).format('YYYY-MM-DD HH:mm:ss') : '-'}
                    </Descriptions.Item>
                    <Descriptions.Item label="申请用户">
                      {currentDetailMerchant.primaryUser?.username || '-'}
                      <Tag color="blue" style={{ marginLeft: 8 }}>
                        ID: {currentDetailMerchant.primaryUser?.id || '-'}
                      </Tag>
                    </Descriptions.Item>
                  </Descriptions>

                  <div className={styles.imagesSection}>
                    <h3>商家营业执照</h3>
                    <div className={styles.merchantImageContainer}>
                      <Image
                          src={currentDetailMerchant.licenseImage}
                          alt="营业执照图片"
                          className={styles.merchantLicenseImage}
                          onClick={() => handleImageClick(currentDetailMerchant.licenseImage)}
                          preview={false}
                          style={{ maxHeight: '300px', objectFit: 'contain' }}
                      />
                    </div>
                  </div>

                  <div style={{ marginTop: 20 }}>
                    <h3>审核意见</h3>
                    <TextArea
                        rows={4}
                        placeholder="请输入审核意见或备注说明（可选）"
                        value={merchantAuditRemarks}
                        onChange={e => setMerchantAuditRemarks(e.target.value)}
                        maxLength={200}
                        showCount
                    />
                  </div>
                </>
            )}
          </Modal>

          {/* 店铺详情模态框 */}
          <Modal
              title={
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <ShopOutlined style={{ marginRight: 8 }} />
                  <span>店铺审核</span>
                </div>
              }
              visible={isStoreDetailsModalOpen}
              onCancel={handleCloseStoreDetailsModal}
              width={800}
              footer={[
                <Button
                    key="approve"
                    type="primary"
                    icon={<CheckCircleOutlined />}
                    style={{ backgroundColor: '#28a745', borderColor: '#28a745' }}
                    onClick={() => handleStoreAudit(currentDetailStore?.id, true)}
                >
                  通过审核
                </Button>,
                <Button
                    key="reject"
                    type="primary"
                    danger
                    icon={<CloseCircleOutlined />}
                    onClick={() => handleStoreAudit(currentDetailStore?.id, false)}
                >
                  拒绝审核
                </Button>,
                <Button key="close" onClick={handleCloseStoreDetailsModal}>
                  关闭
                </Button>
              ]}
              className={styles.verificationModal}
          >
            {currentDetailStore && (
                <>
                  <Descriptions
                      title="店铺基本信息"
                      bordered
                      column={2}
                      size="small"
                      className={styles.descriptions}
                  >
                    <Descriptions.Item label="店铺ID">
                      {currentDetailStore.id}
                    </Descriptions.Item>
                    <Descriptions.Item label="店铺名称">
                      {currentDetailStore.storeName}
                    </Descriptions.Item>
                    <Descriptions.Item label="商家ID">
                      {currentDetailStore.merchantId}
                    </Descriptions.Item>
                    <Descriptions.Item label="商家名称">
                      {currentDetailStore.merchantName}
                    </Descriptions.Item>
                    <Descriptions.Item label="联系电话">
                      <PhoneOutlined style={{ marginRight: 8 }} />
                      {currentDetailStore.contactPhone}
                    </Descriptions.Item>
                    <Descriptions.Item label="营业时间">
                      <ClockCircleOutlined style={{ marginRight: 8 }} />
                      {currentDetailStore.businessHours}
                    </Descriptions.Item>
                    <Descriptions.Item label="店铺地址" span={2}>
                      <EnvironmentOutlined style={{ marginRight: 8 }} />
                      {currentDetailStore.location}
                    </Descriptions.Item>
                    <Descriptions.Item label="店铺经纬度" span={2}>
                      经度: {currentDetailStore.longitude}, 纬度: {currentDetailStore.latitude}
                    </Descriptions.Item>
                    <Descriptions.Item label="创建时间">
                      {currentDetailStore.createdAt ? moment(currentDetailStore.createdAt).format('YYYY-MM-DD HH:mm:ss') : '-'}
                    </Descriptions.Item>
                    <Descriptions.Item label="更新时间">
                      {currentDetailStore.updatedAt ? moment(currentDetailStore.updatedAt).format('YYYY-MM-DD HH:mm:ss') : '-'}
                    </Descriptions.Item>
                  </Descriptions>

                  <div style={{ marginTop: 20 }}>
                    <h3>店铺简介</h3>
                    <div className={styles.storeDescription}>
                      {currentDetailStore.description || '暂无店铺简介'}
                    </div>
                  </div>

                  <div style={{ marginTop: 20 }}>
                    <h3>审核意见</h3>
                    <TextArea
                        rows={4}
                        placeholder="请输入审核意见或备注说明（可选）"
                        value={storeAuditRemarks}
                        onChange={e => setStoreAuditRemarks(e.target.value)}
                        maxLength={200}
                        showCount
                    />
                  </div>
                </>
            )}
          </Modal>

          {/* 图片查看器 */}
          <Modal
              visible={!!selectedImage}
              footer={null}
              onCancel={closeImageViewer}
              width={800}
              centered
              className={styles.imageViewerModal}
          >
            <img
                src={selectedImage}
                alt="大图预览"
                style={{ width: '100%', maxHeight: '80vh', objectFit: 'contain' }}
            />
          </Modal>
        </div>
      </div>
  );
};

export default AdminUserInfo;