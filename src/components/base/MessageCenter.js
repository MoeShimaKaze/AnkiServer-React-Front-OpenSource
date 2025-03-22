import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Navbar from './Navbar';
import styles from '../../assets/css/manager/MessageCenter.module.css';
import Loading from "../utils/Loading";
import { useNotification } from "../context/NotificationContext";
import { toast } from "react-toastify";
import { getNotificationTypeText } from "../utils/map/notificationTypeMap";

const MessageCenter = () => {
  const { notifications } = useNotification();
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const { updateMessages, clearAllMessages } = useNotification();

  // 分页相关状态
  const [currentPage, setCurrentPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [totalItems, setTotalItems] = useState(0);
  const [pageSize, setPageSize] = useState(10);

  // 初始化时获取消息
  useEffect(() => {
    fetchMessages(currentPage, pageSize);
  }, [currentPage, pageSize]);

  useEffect(() => {
    const newMessages = notifications.filter(n => n.type === 'NEW_MESSAGE');
    if (newMessages.length > 0) {
      // 当有新消息时重新获取第一页
      fetchMessages(0, pageSize);
    }
  }, [notifications, pageSize]);

  const fetchMessages = async (page, size) => {
    try {
      setIsLoading(true);
      const response = await axios.get(`http://localhost:8080/messages?page=${page}&size=${size}`,
          { withCredentials: true }
      );

      // 更新状态
      if (response.data && response.data.messages) {
        setMessages(response.data.messages);
        setCurrentPage(response.data.currentPage);
        setTotalPages(response.data.totalPages);
        setTotalItems(response.data.totalItems);
      } else {
        setMessages([]);
        setTotalPages(0);
        setTotalItems(0);
      }
    } catch (error) {
      console.error('获取消息失败:', error);
      setMessages([]);
      toast.error('获取消息失败，请重试');
    } finally {
      setIsLoading(false);
    }
  };

  // 分页导航
  const handlePageChange = (newPage) => {
    if (newPage >= 0 && newPage < totalPages) {
      setCurrentPage(newPage);
    }
  };

  // 修改每页显示数量
  const handlePageSizeChange = (event) => {
    const newSize = parseInt(event.target.value);
    setPageSize(newSize);
    setCurrentPage(0); // 重置到第一页
  };

  // 单个消息标记已读的处理函数
  const markAsRead = async (messageId) => {
    try {
      const response = await axios.post(
          `http://localhost:8080/messages/${messageId}/read?page=${currentPage}&size=${pageSize}`,
          {},
          { withCredentials: true }
      );

      if (response.status === 200 && response.data.messages) {
        // 更新消息列表
        setMessages(response.data.messages);
        setCurrentPage(response.data.currentPage);
        setTotalPages(response.data.totalPages);
        setTotalItems(response.data.totalItems);

        // 更新通知上下文中的未读消息
        updateMessages(response.data.messages.filter(msg => !msg.read));
      }
    } catch (error) {
      console.error('标记消息已读失败:', error);
      toast.error('操作失败，请重试');
    }
  };

  const markAllAsRead = async () => {
    try {
      const response = await axios.post(
          `http://localhost:8080/messages/read-all?page=${currentPage}&size=${pageSize}`,
          {},
          { withCredentials: true }
      );

      if (response.status === 200 && response.data.messages) {
        // 更新消息列表
        setMessages(response.data.messages);
        setCurrentPage(response.data.currentPage);
        setTotalPages(response.data.totalPages);
        setTotalItems(response.data.totalItems);

        // 清除通知上下文中的未读消息
        clearAllMessages();
        // 添加提示
        toast.success('所有消息已标记为已读');
      }
    } catch (error) {
      console.error('标记所有消息为已读时出错:', error);
      toast.error('操作失败，请重试');
    }
  };

  // 获取消息类型文本
  const getMessageTypeText = (type) => {
    return getNotificationTypeText(type);
  };

  const formatDateTime = (dateTimeString) => {
    const options = { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' };
    return new Date(dateTimeString).toLocaleString('zh-CN', options);
  };

  if (isLoading) {
    return (
        <div className={styles.pageContainer}>
          <Navbar />
          <div className={styles.loadingWrapper}>
            <Loading size="lg" color="dark" />
          </div>
        </div>
    );
  }

  return (
      <div>
        <Navbar />
        <div className={styles.messageBackground}></div>
        <div className={styles.container}>
          <h1 className={styles.title}>站内信</h1>

          {/* 页面大小选择器放在容器右上角 */}
          <div className={styles.pageSizeSelector}>
            每页显示：
            <select
                value={pageSize}
                onChange={handlePageSizeChange}
                className={styles.pageSizeSelect}
            >
              <option value={5}>5</option>
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
            </select>
          </div>

          {/* 标记所有已读按钮居中显示 */}
          <button onClick={markAllAsRead} className={styles.markAllAsReadBtn}>
            标记所有为已读
          </button>

          {messages.length === 0 ? (
              <div className={styles.noMessages}>没有新消息</div>
          ) : (
              <div className={styles.messageList}>
                {Array.isArray(messages) && messages.map(message => (
                    <div key={message.id} className={`${styles.messageItem} ${!message.read ? styles.unread : ''}`}>
                      <div className={styles.messageContent}>{message.content}</div>
                      <div className={styles.messageTime}>{formatDateTime(message.createdDate)}</div>
                      <div className={styles.messageType}>
                        {getMessageTypeText(message.type)}
                      </div>
                      {!message.read && (
                          <button onClick={() => markAsRead(message.id)} className={styles.markAsReadBtn}>
                            标记为已读
                          </button>
                      )}
                    </div>
                ))}
              </div>
          )}

          {/* 分页控制 */}
          {totalPages > 0 && (
              <div className={styles.pagination}>
                <button
                    onClick={() => handlePageChange(0)}
                    disabled={currentPage === 0}
                    className={styles.paginationButton}
                >
                  首页
                </button>

                <button
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 0}
                    className={styles.paginationButton}
                >
                  上一页
                </button>

                <span className={styles.pageInfo}>
              第 {currentPage + 1} 页，共 {totalPages} 页
            </span>

                <button
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage >= totalPages - 1}
                    className={styles.paginationButton}
                >
                  下一页
                </button>

                <button
                    onClick={() => handlePageChange(totalPages - 1)}
                    disabled={currentPage >= totalPages - 1}
                    className={styles.paginationButton}
                >
                  末页
                </button>
              </div>
          )}

          <div className={styles.totalItems}>
            共 {totalItems} 条消息
          </div>
        </div>
      </div>
  );
};

export default MessageCenter;