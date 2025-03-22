// src/components/marketing/SpecialDateManager.js
import React, { useState, useEffect, useCallback } from 'react';
import {
    Table, Button, Modal, Form, Input, DatePicker, InputNumber,
    Select, Switch, Popconfirm, message, Tag, Tooltip, Space, Divider,
    Typography
} from 'antd';
import {
    PlusOutlined, EditOutlined, DeleteOutlined,
    SyncOutlined, CheckCircleOutlined,
    CloseCircleOutlined
} from '@ant-design/icons';
import axios from 'axios';
import moment from 'moment';
import styles from '../../assets/css/marketing/SpecialDateManager.module.css';

const { Option } = Select;
const { Text } = Typography;
const API_BASE_URL = 'http://127.0.0.1:8080/api/marketing';

const SpecialDateManager = () => {
    // 状态定义
    const [specialDates, setSpecialDates] = useState([]);
    const [loading, setLoading] = useState(false);
    const [modalVisible, setModalVisible] = useState(false);
    const [editingDate, setEditingDate] = useState(null);
    const [form] = Form.useForm();
    const [selectedRows, setSelectedRows] = useState([]);
    const [dateRange, setDateRange] = useState([moment(), moment().add(1, 'month')]);

    // 使用useCallback包装fetchSpecialDates函数，以解决Hook依赖警告
    const fetchSpecialDates = useCallback(async () => {
        setLoading(true);
        try {
            const startDate = dateRange[0].format('YYYY-MM-DD');
            const endDate = dateRange[1].format('YYYY-MM-DD');

            const response = await axios.get(`${API_BASE_URL}/dates`, {
                params: { startDate, endDate },
                withCredentials: true
            });

            if (response.data.success) {
                setSpecialDates(response.data.data);
            } else {
                message.error(`获取特殊日期失败: ${response.data.message}`);
            }
        } catch (error) {
            console.error('获取特殊日期出错:', error);
            message.error('获取特殊日期出错，请检查网络连接');
        } finally {
            setLoading(false);
        }
    }, [dateRange]); // 添加dateRange作为依赖项

    // 初始加载
    useEffect(() => {
        fetchSpecialDates();
    }, [fetchSpecialDates]); // 正确添加fetchSpecialDates作为依赖项

    // 选择日期范围变化
    const handleDateRangeChange = (dates) => {
        if (dates && dates.length === 2) {
            setDateRange(dates);
        }
    };

    // 搜索按钮点击
    const handleSearch = () => {
        fetchSpecialDates();
    };

    // 表格行选择变化
    const rowSelection = {
        selectedRowKeys: selectedRows.map(row => row.id),
        onChange: (selectedRowKeys, selectedRows) => {
            setSelectedRows(selectedRows);
        }
    };

    // 打开新增模态框
    const showAddModal = () => {
        setEditingDate(null);
        form.resetFields();
        form.setFieldsValue({
            active: true,
            rateEnabled: true,
            priority: 0,
            rateMultiplier: 1.0
        });
        setModalVisible(true);
    };

    // 打开编辑模态框
    const showEditModal = (record) => {
        setEditingDate(record);
        form.setFieldsValue({
            ...record,
            date: moment(record.date),
            rateMultiplier: parseFloat(record.rateMultiplier)
        });
        setModalVisible(true);
    };

    // 关闭模态框
    const handleCancel = () => {
        setModalVisible(false);
    };

    // 提交表单
    const handleSubmit = async () => {
        try {
            const values = await form.validateFields();

            // 处理日期格式
            const formattedValues = {
                ...values,
                date: values.date.format('YYYY-MM-DD')
            };

            if (editingDate) {
                // 更新特殊日期
                const response = await axios.put(
                    `${API_BASE_URL}/dates/${editingDate.id}`,
                    formattedValues,
                    { withCredentials: true }
                );

                if (response.data.success) {
                    message.success('特殊日期更新成功');
                    setModalVisible(false);
                    fetchSpecialDates();
                } else {
                    message.error(`更新失败: ${response.data.message}`);
                }
            } else {
                // 创建特殊日期
                const response = await axios.post(
                    `${API_BASE_URL}/dates`,
                    formattedValues,
                    { withCredentials: true }
                );

                if (response.data.success) {
                    message.success('特殊日期创建成功');
                    setModalVisible(false);
                    fetchSpecialDates();
                } else {
                    message.error(`创建失败: ${response.data.message}`);
                }
            }
        } catch (error) {
            console.error('表单提交出错:', error);
        }
    };

    // 删除特殊日期
    const handleDelete = async (id) => {
        try {
            const response = await axios.delete(
                `${API_BASE_URL}/dates/${id}`,
                { withCredentials: true }
            );

            if (response.data.success) {
                message.success('特殊日期删除成功');
                fetchSpecialDates();
            } else {
                message.error(`删除失败: ${response.data.message}`);
            }
        } catch (error) {
            console.error('删除特殊日期出错:', error);
            message.error('删除特殊日期出错，请重试');
        }
    };

    // 批量启用/禁用特殊日期费率
    const handleBatchUpdateRateStatus = async (enabled) => {
        if (selectedRows.length === 0) {
            message.warning('请至少选择一个特殊日期');
            return;
        }

        try {
            const ids = selectedRows.map(row => row.id);
            const response = await axios.put(
                `${API_BASE_URL}/dates/batch/rate-status`,
                { ids, enabled },
                { withCredentials: true }
            );

            if (response.data.success) {
                message.success(`已${enabled ? '启用' : '禁用'}所选特殊日期的费率`);
                fetchSpecialDates();
                setSelectedRows([]);
            } else {
                message.error(`操作失败: ${response.data.message}`);
            }
        } catch (error) {
            console.error('批量更新状态出错:', error);
            message.error('批量更新状态出错，请重试');
        }
    };

    // 表格列定义
    const columns = [
        {
            title: '名称',
            dataIndex: 'name',
            key: 'name',
            align: 'center', // 添加居中对齐
            render: (text, record) => (
                <span className={styles.nameCell}>
                    {text}
                    {record.type === 'HOLIDAY' &&
                        <Tag color="blue" className={styles.dateTypeTag}>节假日</Tag>
                    }
                    {record.type === 'PROMOTION' &&
                        <Tag color="orange" className={styles.dateTypeTag}>促销</Tag>
                    }
                </span>
            )
        },
        {
            title: '日期',
            dataIndex: 'date',
            key: 'date',
            align: 'center', // 添加居中对齐
            className: styles.dateCell
        },
        {
            title: '费率倍数',
            dataIndex: 'rateMultiplier',
            key: 'rateMultiplier',
            align: 'center', // 添加居中对齐
            render: text => <span className={styles.rateCell}>{parseFloat(text).toFixed(2)}x</span>
        },
        {
            title: '费用类型',
            dataIndex: 'feeType',
            key: 'feeType',
            align: 'center', // 添加居中对齐
            render: text => {
                const feeTypeMap = {
                    'BASE_FEE': '基本费用',
                    'DISTANCE_FEE': '距离费用',
                    'WEIGHT_FEE': '重量费用',
                    'TIME_FEE': '时间费用',
                    'ALL': '所有费用'
                };
                return <span className={styles.feeTypeCell}>{feeTypeMap[text] || text}</span>;
            }
        },
        {
            title: '优先级',
            dataIndex: 'priority',
            key: 'priority',
            align: 'center', // 添加居中对齐
            className: styles.priorityCell
        },
        {
            title: '状态',
            key: 'status',
            align: 'center', // 添加居中对齐
            render: (_, record) => (
                <div className={styles.statusContainer}>
                    {record.active ?
                        <Tag color="green" icon={<CheckCircleOutlined />}>已启用</Tag> :
                        <Tag color="red" icon={<CloseCircleOutlined />}>已禁用</Tag>
                    }
                    {record.rateEnabled ?
                        <Tag color="blue" icon={<CheckCircleOutlined />}>费率生效</Tag> :
                        <Tag color="gray" icon={<CloseCircleOutlined />}>费率未生效</Tag>
                    }
                </div>
            )
        },
        {
            title: '描述',
            dataIndex: 'description',
            key: 'description',
            align: 'center', // 添加居中对齐
            ellipsis: {
                showTitle: false,
            },
            render: text => (
                <Tooltip placement="topLeft" title={text} className={styles.descriptionCell}>
                    <Text ellipsis>{text || '暂无描述'}</Text>
                </Tooltip>
            ),
        },
        {
            title: '操作',
            key: 'action',
            align: 'center',
            className: styles.actionCell,
            render: (_, record) => (
                // 将原来的Space组件改为div，使用纵向flex布局
                <div className={styles.actionButtons}>
                    <Button
                        type="primary"
                        icon={<EditOutlined />}
                        size="small"
                        className={styles.editButton}
                        onClick={() => showEditModal(record)}
                    >
                        编辑
                    </Button>
                    <Popconfirm
                        title="确定要删除这个特殊日期吗？"
                        onConfirm={() => handleDelete(record.id)}
                        okText="确定"
                        cancelText="取消"
                    >
                        <Button
                            danger
                            icon={<DeleteOutlined />}
                            size="small"
                            className={styles.deleteButton}
                        >
                            删除
                        </Button>
                    </Popconfirm>
                </div>
            ),
        },
    ];

    // 渲染组件
    return (
        <div className={styles.specialDateContainer}>
            <div className={styles.toolbarContainer}>
                <div className={styles.searchContainer}>
                    <Space>
                        <DatePicker.RangePicker
                            value={dateRange}
                            onChange={handleDateRangeChange}
                            format="YYYY-MM-DD"
                            className={styles.datePicker}
                        />
                        <Button
                            type="primary"
                            onClick={handleSearch}
                            icon={<SyncOutlined />}
                            className={styles.refreshButton}
                        >
                            刷新
                        </Button>
                    </Space>
                </div>

                <div className={styles.actionContainer}>
                    <Space split={<Divider type="vertical" />}>
                        <Button
                            type="primary"
                            icon={<PlusOutlined />}
                            onClick={showAddModal}
                            className={styles.addButton}
                        >
                            新增特殊日期
                        </Button>

                        <Space>
                            <Button
                                type="primary"
                                ghost
                                disabled={selectedRows.length === 0}
                                onClick={() => handleBatchUpdateRateStatus(true)}
                                className={styles.batchEnableButton}
                            >
                                批量启用费率
                            </Button>
                            <Button
                                danger
                                ghost
                                disabled={selectedRows.length === 0}
                                onClick={() => handleBatchUpdateRateStatus(false)}
                                className={styles.batchDisableButton}
                            >
                                批量禁用费率
                            </Button>
                        </Space>
                    </Space>
                </div>
            </div>

            <Table
                rowKey="id"
                columns={columns}
                dataSource={specialDates}
                loading={loading}
                rowSelection={rowSelection}
                pagination={{
                    defaultPageSize: 10,
                    showSizeChanger: true,
                    showQuickJumper: true,
                    showTotal: total => `共 ${total} 条`
                }}
                className={styles.dataTable}
            />

            {/* 新增/编辑模态框 */}
            <Modal
                title={editingDate ? '编辑特殊日期' : '新增特殊日期'}
                open={modalVisible}
                onOk={handleSubmit}
                onCancel={handleCancel}
                maskClosable={false}
                width={600}
                className={styles.formModal}
            >
                <Form
                    form={form}
                    layout="vertical"
                    name="specialDateForm"
                    className={styles.specialDateForm}
                >
                    <Form.Item
                        name="name"
                        label="名称"
                        rules={[{ required: true, message: '请输入特殊日期名称' }]}
                    >
                        <Input placeholder="例如：元旦、双11促销" />
                    </Form.Item>

                    <Form.Item
                        name="date"
                        label="日期"
                        rules={[{ required: true, message: '请选择日期' }]}
                    >
                        <DatePicker format="YYYY-MM-DD" style={{ width: '100%' }} />
                    </Form.Item>

                    <Form.Item
                        name="type"
                        label="类型"
                        rules={[{ required: true, message: '请选择类型' }]}
                    >
                        <Select placeholder="选择特殊日期类型">
                            <Option value="HOLIDAY">节假日</Option>
                            <Option value="PROMOTION">促销活动</Option>
                        </Select>
                    </Form.Item>

                    <Form.Item
                        name="feeType"
                        label="适用费用类型"
                        rules={[{ required: true, message: '请选择适用的费用类型' }]}
                    >
                        <Select placeholder="选择费用类型">
                            <Option value="ALL">所有费用</Option>
                            <Option value="BASE_FEE">基本费用</Option>
                            <Option value="DISTANCE_FEE">距离费用</Option>
                            <Option value="WEIGHT_FEE">重量费用</Option>
                            <Option value="TIME_FEE">时间费用</Option>
                        </Select>
                    </Form.Item>

                    <Form.Item
                        name="rateMultiplier"
                        label="费率倍数"
                        rules={[
                            { required: true, message: '请输入费率倍数' },
                            { type: 'number', min: 0.1, message: '费率倍数必须大于0.1' }
                        ]}
                        tooltip="设置该特殊日期的费率倍数，1.0表示不变，1.5表示上浮50%"
                    >
                        <InputNumber
                            step={0.1}
                            precision={2}
                            style={{ width: '100%' }}
                            placeholder="请输入费率倍数，例如：1.5"
                        />
                    </Form.Item>

                    <Form.Item
                        name="priority"
                        label="优先级"
                        rules={[{ required: true, message: '请输入优先级' }]}
                        tooltip="当同一天有多个特殊日期时，以优先级高的为准"
                    >
                        <InputNumber
                            precision={0}
                            style={{ width: '100%' }}
                            placeholder="优先级，数字越大优先级越高"
                        />
                    </Form.Item>

                    <Form.Item
                        name="description"
                        label="描述"
                    >
                        <Input.TextArea
                            rows={3}
                            placeholder="请输入特殊日期的描述信息"
                        />
                    </Form.Item>

                    <div className={styles.switchContainer}>
                        <Form.Item
                            name="active"
                            valuePropName="checked"
                            label="启用状态"
                        >
                            <Switch checkedChildren="启用" unCheckedChildren="禁用" />
                        </Form.Item>

                        <Form.Item
                            name="rateEnabled"
                            valuePropName="checked"
                            label="费率状态"
                        >
                            <Switch checkedChildren="生效" unCheckedChildren="不生效" />
                        </Form.Item>
                    </div>
                </Form>
            </Modal>
        </div>
    );
};

export default SpecialDateManager;