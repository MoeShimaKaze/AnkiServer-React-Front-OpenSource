// src/components/marketing/TimeRangeManager.js
import React, { useState, useEffect } from 'react';
import {
    Table, Button, Modal, Form, Input, InputNumber,
    Select, Switch, Popconfirm, message, Tag, Tooltip,
    Card, Row, Col, Statistic
} from 'antd';
import {
    PlusOutlined, EditOutlined, DeleteOutlined,
     SyncOutlined, ClockCircleOutlined,
    CheckCircleOutlined, CloseCircleOutlined
} from '@ant-design/icons';
import axios from 'axios';
import styles from '../../assets/css/marketing/TimeRangeManager.module.css';

const { Option } = Select;
const API_BASE_URL = 'http://127.0.0.1:8080/api/marketing';

const TimeRangeManager = () => {
    // 状态定义
    const [timeRanges, setTimeRanges] = useState([]);
    const [loading, setLoading] = useState(false);
    const [modalVisible, setModalVisible] = useState(false);
    const [editingTimeRange, setEditingTimeRange] = useState(null);
    const [form] = Form.useForm();
    const [stats, setStats] = useState({
        total: 0,
        active: 0
    });

    // 初始加载
    useEffect(() => {
        fetchTimeRanges();
    }, []);

    // 获取特殊时段列表
    const fetchTimeRanges = async () => {
        setLoading(true);
        try {
            const response = await axios.get(`${API_BASE_URL}/timeranges`, {
                withCredentials: true
            });

            if (response.data.success) {
                const timeRangesData = response.data.data;
                setTimeRanges(timeRangesData);

                // 计算统计数据
                setStats({
                    total: timeRangesData.length,
                    active: timeRangesData.filter(tr => tr.active).length
                });
            } else {
                message.error(`获取特殊时段失败: ${response.data.message}`);
            }
        } catch (error) {
            console.error('获取特殊时段出错:', error);
            message.error('获取特殊时段出错，请检查网络连接');
        } finally {
            setLoading(false);
        }
    };

    // 打开新增模态框
    const showAddModal = () => {
        setEditingTimeRange(null);
        form.resetFields();
        form.setFieldsValue({
            active: true,
            rateMultiplier: 1.0,
            startHour: 0,
            endHour: 1
        });
        setModalVisible(true);
    };

    // 打开编辑模态框
    const showEditModal = (record) => {
        setEditingTimeRange(record);
        form.setFieldsValue({
            ...record,
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

            // 验证时间范围
            if (values.startHour >= values.endHour) {
                message.error('开始时间必须早于结束时间');
                return;
            }

            if (editingTimeRange) {
                // 更新特殊时段
                const response = await axios.put(
                    `${API_BASE_URL}/timeranges/${editingTimeRange.id}`,
                    values,
                    { withCredentials: true }
                );

                if (response.data.success) {
                    message.success('特殊时段更新成功');
                    setModalVisible(false);
                    fetchTimeRanges();
                } else {
                    message.error(`更新失败: ${response.data.message}`);
                }
            } else {
                // 创建特殊时段
                const response = await axios.post(
                    `${API_BASE_URL}/timeranges`,
                    values,
                    { withCredentials: true }
                );

                if (response.data.success) {
                    message.success('特殊时段创建成功');
                    setModalVisible(false);
                    fetchTimeRanges();
                } else {
                    message.error(`创建失败: ${response.data.message}`);
                }
            }
        } catch (error) {
            console.error('表单提交出错:', error);
        }
    };

    // 删除特殊时段
    const handleDelete = async (id) => {
        try {
            const response = await axios.delete(
                `${API_BASE_URL}/timeranges/${id}`,
                { withCredentials: true }
            );

            if (response.data.success) {
                message.success('特殊时段删除成功');
                fetchTimeRanges();
            } else {
                message.error(`删除失败: ${response.data.message}`);
            }
        } catch (error) {
            console.error('删除特殊时段出错:', error);
            message.error('删除特殊时段出错，请重试');
        }
    };

// 表格列定义
    const columns = [
        {
            title: '名称',
            dataIndex: 'name',
            key: 'name',
            align: 'center', // 添加居中对齐
        },
        {
            title: '时间范围',
            dataIndex: 'timeRangeDisplay',
            key: 'timeRangeDisplay',
            align: 'center', // 添加居中对齐
            render: (text, record) => (
                <Tag color="blue" icon={<ClockCircleOutlined />}>
                    {text}
                </Tag>
            )
        },
        {
            title: '费率倍数',
            dataIndex: 'rateMultiplier',
            key: 'rateMultiplier',
            align: 'center', // 添加居中对齐
            render: text => <span>{parseFloat(text).toFixed(2)}x</span>
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
                return feeTypeMap[text] || text;
            }
        },
        {
            title: '状态',
            key: 'status',
            align: 'center', // 添加居中对齐
            render: (_, record) => (
                record.active ?
                    <Tag color="green" icon={<CheckCircleOutlined />}>已启用</Tag> :
                    <Tag color="red" icon={<CloseCircleOutlined />}>已禁用</Tag>
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
                <Tooltip placement="topLeft" title={text}>
                    {text}
                </Tooltip>
            ),
        },
        {
            title: '操作',
            key: 'action',
            align: 'center', // 添加居中对齐
            className: styles.actionCell,
            render: (_, record) => (
                // 改为纵向排列的容器
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
                        title="确定要删除这个特殊时段吗？"
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

    // 时段可视化
    const renderTimeRangeVisualization = () => {
        // 创建24小时时段表示
        let hours = [];
        for (let i = 0; i < 24; i++) {
            hours.push({
                hour: i,
                label: `${i.toString().padStart(2, '0')}:00`,
                timeRanges: []
            });
        }

        // 填充时段数据
        timeRanges.forEach(tr => {
            if (tr.active) {
                for (let i = tr.startHour; i < tr.endHour; i++) {
                    if (i >= 0 && i < 24) {
                        hours[i].timeRanges.push(tr);
                    }
                }
            }
        });

        return (
            <div className={styles.timeVisualization}>
                <h3>24小时时段费率可视化</h3>
                <div className={styles.timeRangeBlocks}>
                    {hours.map(hourData => (
                        <div key={hourData.hour} className={styles.hourBlock}>
                            <div className={styles.hourLabel}>{hourData.label}</div>
                            <div
                                className={`${styles.hourContent} ${hourData.timeRanges.length > 0 ? styles.active : ''}`}
                                style={{
                                    backgroundColor: hourData.timeRanges.length > 0
                                        ? `rgba(24, 144, 255, ${Math.min(0.3 + hourData.timeRanges.length * 0.2, 0.9)})`
                                        : 'transparent'
                                }}
                            >
                                {hourData.timeRanges.length > 0 && (
                                    <Tooltip
                                        title={
                                            <div>
                                                {hourData.timeRanges.map((tr, idx) => (
                                                    <div key={idx}>
                                                        {tr.name}: {parseFloat(tr.rateMultiplier).toFixed(2)}x
                                                    </div>
                                                ))}
                                            </div>
                                        }
                                    >
                                        <span>{hourData.timeRanges.length}</span>
                                    </Tooltip>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        );
    };

    // 渲染组件
    return (
        <div className={styles.timeRangeContainer}>
            <Row gutter={16} className={styles.statsRow}>
                <Col span={8}>
                    <Card bordered={false}>
                        <Statistic
                            title="总时段数"
                            value={stats.total}
                            valueStyle={{ color: '#1890ff' }}
                            prefix={<ClockCircleOutlined />}
                        />
                    </Card>
                </Col>
                <Col span={8}>
                    <Card bordered={false}>
                        <Statistic
                            title="活跃时段数"
                            value={stats.active}
                            valueStyle={{ color: '#52c41a' }}
                            prefix={<CheckCircleOutlined />}
                        />
                    </Card>
                </Col>
            </Row>

            {timeRanges.length > 0 && renderTimeRangeVisualization()}

            <div className={styles.toolbarContainer}>
                <Button
                    type="primary"
                    icon={<SyncOutlined />}
                    onClick={fetchTimeRanges}
                >
                    刷新
                </Button>
                <Button
                    type="primary"
                    icon={<PlusOutlined />}
                    onClick={showAddModal}
                >
                    新增特殊时段
                </Button>
            </div>

            <Table
                rowKey="id"
                columns={columns}
                dataSource={timeRanges}
                loading={loading}
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
                title={editingTimeRange ? '编辑特殊时段' : '新增特殊时段'}
                open={modalVisible}
                onOk={handleSubmit}
                onCancel={handleCancel}
                maskClosable={false}
                width={600}
            >
                <Form
                    form={form}
                    layout="vertical"
                    name="timeRangeForm"
                    className={styles.timeRangeForm}
                >
                    <Form.Item
                        name="name"
                        label="名称"
                        rules={[{ required: true, message: '请输入特殊时段名称' }]}
                    >
                        <Input placeholder="例如：早高峰、夜间配送" />
                    </Form.Item>

                    <Row gutter={16}>
                        <Col span={12}>
                            <Form.Item
                                name="startHour"
                                label="开始时间（小时）"
                                rules={[{ required: true, message: '请输入开始时间' }]}
                                tooltip="输入0-23之间的整数，表示小时"
                            >
                                <InputNumber
                                    min={0}
                                    max={23}
                                    style={{ width: '100%' }}
                                    formatter={value => `${value}:00`}
                                    parser={value => value.replace(':00', '')}
                                />
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item
                                name="endHour"
                                label="结束时间（小时）"
                                rules={[{ required: true, message: '请输入结束时间' }]}
                                tooltip="输入1-24之间的整数，表示小时（不含）"
                            >
                                <InputNumber
                                    min={1}
                                    max={24}
                                    style={{ width: '100%' }}
                                    formatter={value => `${value}:00`}
                                    parser={value => value.replace(':00', '')}
                                />
                            </Form.Item>
                        </Col>
                    </Row>

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
                        tooltip="设置该特殊时段的费率倍数，1.0表示不变，1.5表示上浮50%"
                    >
                        <InputNumber
                            step={0.1}
                            precision={2}
                            style={{ width: '100%' }}
                            placeholder="请输入费率倍数，例如：1.5"
                        />
                    </Form.Item>

                    <Form.Item
                        name="description"
                        label="描述"
                    >
                        <Input.TextArea
                            rows={3}
                            placeholder="请输入特殊时段的描述信息"
                        />
                    </Form.Item>

                    <Form.Item
                        name="active"
                        valuePropName="checked"
                        label="启用状态"
                    >
                        <Switch checkedChildren="启用" unCheckedChildren="禁用" />
                    </Form.Item>
                </Form>
            </Modal>
        </div>
    );
};

export default TimeRangeManager;