import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Loading from '../utils/Loading';
import styles from '../../assets/css/merchant/MerchantEmployees.module.css';

const MerchantEmployees = ({ merchantUid, userId, isAdmin }) => {

    // 状态管理
    const [employees, setEmployees] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isOwner, setIsOwner] = useState(false);
    // 移除了重复的 isAdmin 状态变量，直接使用 props 中传入的 isAdmin

    // 添加员工相关状态
    const [showAddForm, setShowAddForm] = useState(false);
    const [newEmployee, setNewEmployee] = useState({
        userId: '',
        role: 'VIEWER'
    });
    const [addStatus, setAddStatus] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // 角色更新相关状态
    const [editingEmployee, setEditingEmployee] = useState(null);
    const [newRole, setNewRole] = useState('');
    const [updateStatus, setUpdateStatus] = useState(null);

    // 获取员工列表
    useEffect(() => {
        const fetchEmployees = async () => {
            try {
                setIsLoading(true);
                const response = await axios.get(
                    `http://127.0.0.1:8080/api/merchants/${merchantUid}/employees`,
                    { withCredentials: true }
                );

                setEmployees(response.data);

                // 检查当前用户权限
                const currentUser = response.data.find(emp => emp.userId === userId);
                if (currentUser) {
                    setIsOwner(currentUser.role === 'OWNER');
                    // 注意：这里不再设置内部的isAdmin状态，而是直接使用props中的isAdmin
                }
            } catch (error) {
                console.error('获取员工列表失败:', error);
                setError('获取员工列表失败，请稍后重试');
            } finally {
                setIsLoading(false);
            }
        };

        if (merchantUid) {
            fetchEmployees();
        }
    }, [merchantUid, userId]);

    // 处理添加员工表单输入变化
    const handleAddInputChange = (e) => {
        const { name, value } = e.target;
        setNewEmployee(prev => ({
            ...prev,
            [name]: value
        }));
    };

    // 提交添加员工表单
    const handleAddSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        setAddStatus(null);

        try {
            await axios.post(
                `http://127.0.0.1:8080/api/merchants/${merchantUid}/employees`,
                null,
                {
                    params: {
                        userId: newEmployee.userId,
                        role: newEmployee.role
                    },
                    withCredentials: true
                }
            );
// 刷新员工列表
            const updatedEmployees = await axios.get(
                `http://127.0.0.1:8080/api/merchants/${merchantUid}/employees`,
                { withCredentials: true }
            );
            setEmployees(updatedEmployees.data);

            setAddStatus({
                success: true,
                message: '员工添加成功'
            });

            // 重置表单
            setNewEmployee({
                userId: '',
                role: 'VIEWER'
            });
            setShowAddForm(false);
        } catch (error) {
            console.error('添加员工失败:', error);
            setAddStatus({
                success: false,
                message: error.response?.data || '添加员工失败，请稍后重试'
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    // 开始更新员工角色
    const handleStartUpdateRole = (employee) => {
        setEditingEmployee(employee);
        setNewRole(employee.role);
    };

    // 取消更新角色
    const handleCancelUpdateRole = () => {
        setEditingEmployee(null);
        setNewRole('');
        setUpdateStatus(null);
    };

    // 提交更新角色
    const handleUpdateRole = async () => {
        if (!editingEmployee || editingEmployee.role === newRole) {
            handleCancelUpdateRole();
            return;
        }

        setIsSubmitting(true);
        setUpdateStatus(null);

        try {
            await axios.put(
                `http://127.0.0.1:8080/api/merchants/${merchantUid}/employees/${editingEmployee.userId}/role`,
                null,
                {
                    params: { newRole },
                    withCredentials: true
                }
            );

            // 刷新员工列表
            const updatedEmployees = await axios.get(
                `http://127.0.0.1:8080/api/merchants/${merchantUid}/employees`,
                { withCredentials: true }
            );
            setEmployees(updatedEmployees.data);

            setUpdateStatus({
                success: true,
                message: '员工角色更新成功'
            });

            // 重置表单
            setEditingEmployee(null);
            setNewRole('');
        } catch (error) {
            console.error('更新员工角色失败:', error);
            setUpdateStatus({
                success: false,
                message: error.response?.data || '更新员工角色失败，请稍后重试'
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    // 移除员工
    const handleRemoveEmployee = async (employeeUserId) => {
        if (!window.confirm('确定要移除此员工吗？')) {
            return;
        }

        try {
            await axios.delete(
                `http://127.0.0.1:8080/api/merchants/${merchantUid}/employees/${employeeUserId}`,
                { withCredentials: true }
            );

            // 刷新员工列表
            const updatedEmployees = await axios.get(
                `http://127.0.0.1:8080/api/merchants/${merchantUid}/employees`,
                { withCredentials: true }
            );
            setEmployees(updatedEmployees.data);

            setUpdateStatus({
                success: true,
                message: '员工已成功移除'
            });
        } catch (error) {
            console.error('移除员工失败:', error);
            setUpdateStatus({
                success: false,
                message: error.response?.data || '移除员工失败，请稍后重试'
            });
        }
    };

    // 获取角色显示文本
    const getRoleDisplay = (role) => {
        const roleMap = {
            'OWNER': '拥有者',
            'ADMIN': '管理员',
            'OPERATOR': '操作员',
            'VIEWER': '查看者'
        };
        return roleMap[role] || role;
    };

    // 渲染加载状态
    if (isLoading) {
        return (
            <div className={styles.loadingContainer}>
                <Loading size="lg" color="dark" />
                <p>正在加载员工信息...</p>
            </div>
        );
    }

    // 渲染错误状态
    if (error) {
        return (
            <div className={styles.errorContainer}>
                <div className={styles.errorMessage}>{error}</div>
            </div>
        );
    }

    return (
        <div className={styles.employeesContainer}>
            <h2 className={styles.title}>员工管理</h2>

            {/* 状态消息 */}
            {(addStatus || updateStatus) && (
                <div className={`${styles.statusMessage} ${
                    (addStatus?.success || updateStatus?.success) ? styles.success : styles.error
                }`}>
                    {addStatus?.message || updateStatus?.message}
                </div>
            )}

            {/* 员工列表 */}
            <div className={styles.employeesCard}>
                <div className={styles.cardHeader}>
                    <h3>员工列表</h3>
                    {(isAdmin || isOwner) && (
                        <button
                            className={styles.addButton}
                            onClick={() => setShowAddForm(true)}
                        >
                            添加员工
                        </button>
                    )}
                </div>

                {employees.length === 0 ? (
                    <div className={styles.emptyState}>
                        暂无员工数据
                    </div>
                ) : (
                    <div className={styles.employeesList}>
                        <div className={styles.employeeHeader}>
                            <div className={styles.employeeCol}>员工</div>
                            <div className={styles.employeeCol}>角色</div>
                            <div className={styles.employeeCol}>加入时间</div>
                            {(isAdmin || isOwner) && <div className={styles.employeeCol}>操作</div>}
                        </div>

                        {employees.map(employee => (
                            <div
                                key={employee.userId}
                                className={`${styles.employeeRow} ${
                                    employee.userId === userId ? styles.currentUser : ''
                                }`}
                            >
                                <div className={styles.employeeCol}>
                                    <div className={styles.employeeInfo}>
                                        <img
                                            src={employee.avatarUrl || '/default-avatar.png'}
                                            alt={employee.username}
                                            className={styles.avatar}
                                        />
                                        <div className={styles.userDetails}>
                                            <div className={styles.username}>
                                                {employee.username}
                                                {employee.isPrimaryUser && (
                                                    <span className={styles.primaryUserBadge}>创建者</span>
                                                )}
                                                {employee.userId === userId && (
                                                    <span className={styles.currentUserBadge}>当前用户</span>
                                                )}
                                            </div>
                                            <div className={styles.email}>{employee.email}</div>
                                        </div>
                                    </div>
                                </div>

                                <div className={styles.employeeCol}>
                                    {editingEmployee?.userId === employee.userId ? (
                                        <select
                                            value={newRole}
                                            onChange={(e) => setNewRole(e.target.value)}
                                            className={styles.roleSelect}
                                            disabled={isSubmitting}
                                        >
                                            <option value="OWNER">拥有者</option>
                                            <option value="ADMIN">管理员</option>
                                            <option value="OPERATOR">操作员</option>
                                            <option value="VIEWER">查看者</option>
                                        </select>
                                    ) : (
                                        <span className={`${styles.roleBadge} ${styles[employee.role.toLowerCase()]}`}>
                                            {getRoleDisplay(employee.role)}
                                        </span>
                                    )}
                                </div>

                                <div className={styles.employeeCol}>
                                    {new Date(employee.joinedAt).toLocaleDateString()}
                                </div>

                                {(isAdmin || isOwner) && (
                                    <div className={styles.employeeCol}>
                                        {editingEmployee?.userId === employee.userId ? (
                                            <div className={styles.actionButtons}>
                                                <button
                                                    onClick={handleUpdateRole}
                                                    className={styles.saveButton}
                                                    disabled={isSubmitting}
                                                >
                                                    {isSubmitting ? '保存中...' : '保存'}
                                                </button>
                                                <button
                                                    onClick={handleCancelUpdateRole}
                                                    className={styles.cancelButton}
                                                    disabled={isSubmitting}
                                                >
                                                    取消
                                                </button>
                                            </div>
                                        ) : (
                                            <div className={styles.actionButtons}>
                                                {(isOwner || employee.role !== 'OWNER') && employee.userId !== userId && (
                                                    <>
                                                        <button
                                                            onClick={() => handleStartUpdateRole(employee)}
                                                            className={styles.editButton}
                                                        >
                                                            修改角色
                                                        </button>
                                                        <button
                                                            onClick={() => handleRemoveEmployee(employee.userId)}
                                                            className={styles.removeButton}
                                                            disabled={employee.isPrimaryUser}
                                                            title={employee.isPrimaryUser ? "无法移除主要用户" : ""}
                                                        >
                                                            移除
                                                        </button>
                                                    </>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* 添加员工表单 */}
            {showAddForm && (
                <div className={styles.formOverlay}>
                    <div className={styles.formCard}>
                        <div className={styles.formHeader}>
                            <h3>添加员工</h3>
                            <button
                                className={styles.closeButton}
                                onClick={() => setShowAddForm(false)}
                            >
                                &times;
                            </button>
                        </div>

                        <form onSubmit={handleAddSubmit} className={styles.addForm}>
                            <div className={styles.formGroup}>
                                <label htmlFor="userId">用户ID</label>
                                <input
                                    type="text"
                                    id="userId"
                                    name="userId"
                                    value={newEmployee.userId}
                                    onChange={handleAddInputChange}
                                    required
                                    placeholder="输入要添加的用户ID"
                                />
                            </div>

                            <div className={styles.formGroup}>
                                <label htmlFor="role">角色</label>
                                <select
                                    id="role"
                                    name="role"
                                    value={newEmployee.role}
                                    onChange={handleAddInputChange}
                                    required
                                >
                                    {isOwner && <option value="ADMIN">管理员</option>}
                                    <option value="OPERATOR">操作员</option>
                                    <option value="VIEWER">查看者</option>
                                </select>
                            </div>

                            <div className={styles.formActions}>
                                <button
                                    type="button"
                                    className={styles.cancelButton}
                                    onClick={() => setShowAddForm(false)}
                                    disabled={isSubmitting}
                                >
                                    取消
                                </button>
                                <button
                                    type="submit"
                                    className={styles.submitButton}
                                    disabled={isSubmitting}
                                >
                                    {isSubmitting ? (
                                        <div className={styles.buttonWithLoading}>
                                            <Loading size="sm" color="light" />
                                            <span>添加中...</span>
                                        </div>
                                    ) : '添加员工'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default MerchantEmployees;