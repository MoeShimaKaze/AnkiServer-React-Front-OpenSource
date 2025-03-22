import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Navbar from '../base/Navbar';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import styles from '../../assets/css/base/ChatPage.module.css';
import axios from 'axios';

// 引入 Ant Design 组件
import {
  Card,
  Input,
  Button,
  List,
  Spin,
  notification
} from 'antd';
import {
  SendOutlined,
  PictureOutlined,
  BellOutlined
} from '@ant-design/icons';

const { TextArea } = Input;

// 修改组件定义，接收从ProtectedRoute传递的userId
const ChatPage = ({ userId }) => {
  // 路由参数，删除对useAuth的依赖
  const { ticketId } = useParams();
  const navigate = useNavigate();

  // 状态管理
  const [ticket, setTicket] = useState(null);
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showImageForm, setShowImageForm] = useState(false);
  const [imageUrls, setImageUrls] = useState(['']);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isPreviewMode, setIsPreviewMode] = useState(false);

  // 引用管理
  const chatWsRef = useRef(null);
  const retryRef = useRef(0);
  const messagesEndRef = useRef(null);
  const imageFormRef = useRef(null);
  const userMapRef = useRef({});
  const isMountedRef = useRef(true);

  // 处理未授权访问
  const handleUnauthorized = useCallback(() => {
    notification.error({
      message: '访问被拒绝',
      description: '您没有权限访问此资源',
      duration: 3
    });
    navigate('/');
  }, [navigate]);

  // 检查通知权限的函数
  const checkNotificationPermission = async () => {
    if (!("Notification" in window)) {
      console.log("此浏览器不支持桌面通知");
      return false;
    }

    if (Notification.permission === "denied") {
      console.log("通知权限已被用户拒绝");
      return false;
    }

    if (Notification.permission === "granted") {
      return true;
    }

    try {
      const permission = await Notification.requestPermission();
      return permission === "granted";
    } catch (error) {
      console.error('请求通知权限时出错:', error);
      return false;
    }
  };

  // 添加一个通用的滚动到底部函数
  const scrollToBottom = useCallback(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'end',
        inline: 'nearest'
      });
    }
  }, []);

  // 获取用户信息的函数
  const fetchUserInfo = useCallback(async (userIds) => {
    try {
      const userResponses = await Promise.all(
          userIds.map(id => axios.get(`http://127.0.0.1:8080/api/users/${id}`, {withCredentials: true}))
      );
      userResponses.forEach(res => {
        userMapRef.current[res.data.id] = res.data.username;
      });
    } catch (error) {
      console.error('获取用户信息失败:', error);
      if (error.response?.status === 403) {
        handleUnauthorized();
      }
    }
  }, [handleUnauthorized]);

  // 在fetchTicket函数中添加加载完成后的滚动
  const fetchTicket = useCallback(async () => {
    try {
      setIsLoading(true);
      console.log('获取工单:', ticketId);

      const response = await axios.get(
          `http://127.0.0.1:8080/tickets/${ticketId}`,
          {withCredentials: true}
      );

      if (response.status === 200) {
        const ticketData = response.data;
        setTicket(ticketData);

        // 按时间戳排序消息
        const sortedChats = (ticketData?.chats || [])
            .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

        setMessages(sortedChats);

        // 获取所有参与者的用户信息
        if (ticketData?.chats?.length > 0) {
          const userIds = [...new Set(ticketData.chats.map(chat => chat.user.id))];
          await fetchUserInfo(userIds);
        }

        // 添加一个短暂延时确保DOM更新完成
        setTimeout(() => {
          scrollToBottom();
        }, 100);
      }
    } catch (error) {
      console.error('获取工单失败:', error);
      if (error.response?.status === 403) {
        handleUnauthorized();
      }
    } finally {
      setIsLoading(false);
    }
  }, [ticketId, fetchUserInfo, handleUnauthorized, scrollToBottom]);

  // 应用Markdown语法的核心函数
  const applyMarkdownSyntax = useCallback((syntax) => {
    const textarea = document.querySelector('textarea.ant-input');
    if (!textarea) return;

    // 安全地获取选区和文本内容
    const start = textarea.selectionStart || 0;
    const end = textarea.selectionEnd || 0;
    const text = textarea.value || '';
    const before = text.substring(0, start);
    const selection = text.substring(start, end);
    const after = text.substring(end);

    let newText = '';
    let newCursorPos = start;
    let placeholder = '';

    // 根据不同的语法添加相应的标记
    switch (syntax) {
      case 'bold':
        placeholder = '粗体文本';
        newText = `${before}**${selection || placeholder}**${after}`;
        newCursorPos = start + 2;
        break;
      case 'italic':
        placeholder = '斜体文本';
        newText = `${before}_${selection || placeholder}_${after}`;
        newCursorPos = start + 1;
        break;
      case 'code':
        placeholder = '代码块';
        newText = `${before}\`\`\`\n${selection || placeholder}\n\`\`\`${after}`;
        newCursorPos = start + 4;
        break;
      case 'link':
        placeholder = '链接文本';
        newText = `${before}[${selection || placeholder}](url)${after}`;
        newCursorPos = start + 1;
        break;
      case 'list':
        placeholder = '列表项';
        newText = `${before}\n- ${selection || placeholder}${after}`;
        newCursorPos = start + 3;
        break;
      default:
        return;
    }

    // 更新消息内容
    setMessage(newText);

    // 设置新的光标位置
    setTimeout(() => {
      textarea.focus();
      const selectionLength = (selection || placeholder).length;
      textarea.setSelectionRange(newCursorPos, newCursorPos + selectionLength);
    }, 0);
  }, []);

  // 设置通知权限
  useEffect(() => {
    const initializeNotifications = async () => {
      const hasPermission = await checkNotificationPermission();
      setNotificationsEnabled(hasPermission);
    };

    initializeNotifications();
  }, []);

  // 处理通知权限
  useEffect(() => {
    const requestNotificationPermission = async () => {
      try {
        if ("Notification" in window) {
          const permission = await Notification.requestPermission();
          console.log('通知权限状态:', permission);
        }
      } catch (error) {
        console.error('请求通知权限失败:', error);
      }
    };

    requestNotificationPermission();
  }, []);

  // Markdown 工具栏函数
  const addMarkdownSyntax = useCallback((syntax) => {
    // 如果是预览模式，先切换回编辑模式
    if (isPreviewMode) {
      setIsPreviewMode(false);
      // 使用setTimeout确保UI已更新
      setTimeout(() => {
        applyMarkdownSyntax(syntax);
      }, 50);
      return;
    }

    applyMarkdownSyntax(syntax);
  }, [applyMarkdownSyntax, isPreviewMode]);

  // 通知显示处理
  const showNotification = useCallback((title, message) => {
    if (!notificationsEnabled) {
      console.log('通知未启用，无法显示桌面通知');
      return;
    }

    try {
      const notification = new Notification(title, {
        body: message,
        icon: '/icon/communication.png',
        tag: `ticket-${ticketId}`,
        requireInteraction: false,
        silent: false
      });

      notification.onclick = () => {
        window.focus();
        notification.close();
      };

      console.log('通知创建成功');
    } catch (error) {
      console.error('创建通知失败:', error);
    }
  }, [ticketId, notificationsEnabled]);

  // WebSocket 消息处理函数
  const handleWebSocketMessage = useCallback(async (event) => {
    try {
      const data = JSON.parse(typeof event === 'string' ? event : event.data);
      console.log("收到 WebSocket 消息:", data);

      if (data.type === 'CONNECTION_ESTABLISHED') {
        console.log('连接确认:', data.message);
        return;
      }

      const messages = Array.isArray(data) ? data : [data];

      setMessages(prevMessages => {
        let hasNewMessages = false;
        const updatedMessages = [...prevMessages];

        messages.forEach(newMessage => {
          if (!newMessage?.id || !newMessage?.message || !newMessage?.user?.id) {
            console.warn('无效消息格式:', newMessage);
            return;
          }

          if (newMessage.status === 403) {
            handleUnauthorized();
            if (chatWsRef.current) {
              chatWsRef.current.close();
            }
            return;
          }

          if (String(newMessage.ticket?.id) === String(ticketId)) {
            const existingIndex = updatedMessages.findIndex(msg => msg.id === newMessage.id);
            if (existingIndex === -1) {
              updatedMessages.push(newMessage);
              hasNewMessages = true;

              if (!userMapRef.current[newMessage.user.id]) {
                fetchUserInfo([newMessage.user.id]).catch(console.error);
              }

              if (newMessage.user.id !== userId && document.hidden && notificationsEnabled) {
                const notificationTitle = `工单 #${ticketId} - 新消息`;
                const notificationMessage = `${newMessage.user.username || '用户'}: ${newMessage.message}`;
                showNotification(notificationTitle, notificationMessage);
              }
            }
          }
        });

        if (!hasNewMessages) return prevMessages;

        // 在更新消息后添加短暂延时后滚动
        setTimeout(() => {
          scrollToBottom();
        }, 100);

        return updatedMessages.sort((a, b) =>
            new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
        );
      });
    } catch (error) {
      console.error('处理消息时出错:', error);
    }
  }, [ticketId, userId, handleUnauthorized, showNotification, fetchUserInfo, notificationsEnabled, scrollToBottom]);

  // WebSocket 连接状态追踪
  const connectionStatusRef = useRef({
    isConnecting: false,
    hasConnected: false
  });

  // WebSocket 连接管理，移除isLoggedIn检查
  useEffect(() => {
    if (!ticketId) {
      return;
    }

    let reconnectTimer = null;
    let cleanupCalled = false;
    const connectionStatus = connectionStatusRef.current;

    const connectWebSocket = () => {
      if (connectionStatus.isConnecting ||
          chatWsRef.current?.readyState === WebSocket.CONNECTING ||
          chatWsRef.current?.readyState === WebSocket.OPEN) {
        console.log('WebSocket 已经在连接中或已连接');
        return;
      }

      try {
        connectionStatus.isConnecting = true;
        console.log('正在建立 WebSocket 连接...');

        if (chatWsRef.current) {
          chatWsRef.current.close();
          chatWsRef.current = null;
        }

        const CONNECTION_TIMEOUT = 3000;
        const timeoutId = setTimeout(() => {
          if (chatWsRef.current?.readyState === WebSocket.CONNECTING) {
            console.log('WebSocket 连接超时，准备重试');
            if (chatWsRef.current) {
              chatWsRef.current.close();
            }
            handleRetry();
          }
        }, CONNECTION_TIMEOUT);

        const ws = new WebSocket(`ws://127.0.0.1:8080/ws/chat/${ticketId}`);
        chatWsRef.current = ws;

        ws.onopen = () => {
          clearTimeout(timeoutId);
          console.log('WebSocket 连接成功');
          connectionStatus.isConnecting = false;
          connectionStatus.hasConnected = true;
          retryRef.current = 0;
        };

        ws.onerror = (error) => {
          if (process.env.NODE_ENV === 'development') {
            console.warn('WebSocket 连接出现问题，准备重试:', error);
          }
        };

        ws.onclose = (event) => {
          clearTimeout(timeoutId);
          connectionStatus.isConnecting = false;
          chatWsRef.current = null;
          handleRetry(event);
        };

        ws.onmessage = handleWebSocketMessage;

      } catch (error) {
        connectionStatus.isConnecting = false;
        console.error('建立 WebSocket 连接时发生意外错误:', error);
        handleRetry();
      }
    };

    const handleRetry = (event) => {
      if (process.env.NODE_ENV === 'development') {
        console.log('准备重试连接', event ? `关闭原因: ${event.code}` : '');
      }

      if (isMountedRef.current && !cleanupCalled && retryRef.current < 3) {
        const delay = Math.min(1000 * Math.pow(2, retryRef.current), 10000);
        retryRef.current += 1;

        if (process.env.NODE_ENV === 'development') {
          console.log(`将在 ${delay}ms 后进行第 ${retryRef.current} 次重试`);
        }

        reconnectTimer = setTimeout(connectWebSocket, delay);
      } else if (retryRef.current >= 3) {
        console.log('已达到最大重试次数，停止重试');
      }
    };

    connectWebSocket();

    return () => {
      cleanupCalled = true;
      isMountedRef.current = false;
      connectionStatus.isConnecting = false;

      if (reconnectTimer) {
        clearTimeout(reconnectTimer);
        reconnectTimer = null;
      }

      if (chatWsRef.current) {
        chatWsRef.current.onclose = null;
        chatWsRef.current.close();
        chatWsRef.current = null;
      }
    };
  }, [ticketId, handleWebSocketMessage]);

  // 消息发送处理
  const handleSendMessage = useCallback(async (e) => {
    e.preventDefault();

    const ws = chatWsRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      console.error('WebSocket 未连接');
      return;
    }

    if (!message.trim() && !imageUrls.some(url => url.trim())) {
      return;
    }

    try {
      setIsSending(true);

      const chatMessage = {
        ticket: {id: ticketId},
        user: {id: userId},
        message: message.trim(),
        timestamp: new Date().toISOString(),
      };

      if (imageUrls.some(url => url.trim())) {
        const imagesMarkdown = imageUrls
            .filter(url => url.trim())
            .map(url => `![图片](${url.trim()})`)
            .join('\n');

        chatMessage.message += chatMessage.message ? `\n${imagesMarkdown}` : imagesMarkdown;
      }

      ws.send(JSON.stringify(chatMessage));

      setMessage('');
      setImageUrls(['']);
      setShowImageForm(false);

      // 发送成功后滚动到底部
      setTimeout(() => {
        scrollToBottom();
      }, 100);

    } catch (error) {
      console.error('发送消息失败:', error);
      notification.error({
        message: '发送失败',
        description: '发送消息失败，请重试',
        duration: 3
      });
    } finally {
      setIsSending(false);
    }
  }, [message, imageUrls, ticketId, userId, scrollToBottom]);

  // 验证图片URL
  const validateImageUrl = useCallback((url) => {
    const regex = /^(https?:\/\/.*\.(?:png|jpg|jpeg|gif|svg|webp|bmp|tiff|ico))$/i;
    return regex.test(url);
  }, []);

  // 处理添加图片
  const handleAddImage = useCallback((index, value) => {
    setImageUrls(prevUrls => {
      const newImageUrls = [...prevUrls];
      if (validateImageUrl(value) || value === '') {
        newImageUrls[index] = value;
        if (value.trim() && index === prevUrls.length - 1) {
          newImageUrls.push('');
        }
      }
      return newImageUrls;
    });
  }, [validateImageUrl]);

  // 图片表单点击外部处理
  const handleClickOutside = useCallback((event) => {
    if (imageFormRef.current && !imageFormRef.current.contains(event.target)) {
      setShowImageForm(false);
    }
  }, []);

  // 初始化效果，移除登录检查
  useEffect(() => {
    fetchTicket();

    return () => {
      isMountedRef.current = false;
    };
  }, [fetchTicket]);

  // 添加一个监听消息容器大小变化的效果
  useEffect(() => {
    const messageContainer = document.querySelector(`.${styles.messagesList}`);
    if (!messageContainer) return;

    const resizeObserver = new ResizeObserver(() => {
      scrollToBottom();
    });

    resizeObserver.observe(messageContainer);

    return () => {
      resizeObserver.disconnect();
    };
  }, [scrollToBottom]);

  // 消息滚动效果
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({behavior: 'smooth'});
    }
  }, [messages]);

  // 图片表单点击外部关闭效果
  useEffect(() => {
    if (showImageForm) {
      document.addEventListener('mousedown', handleClickOutside);
    } else {
      document.removeEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showImageForm, handleClickOutside]);

  if (isLoading) {
    return (
        <div className={styles.pageContainer}>
          <Navbar/>
          <div className={styles.loadingWrapper}>
            <Spin size="large" tip="加载中..."/>
          </div>
        </div>
    );
  }

  return (
      <div>
        <Navbar/>
          <div className={styles.profileBackground}>
            <div className={styles.profileContainer}>
              <h2 className="ant-typography">{ticket?.id ? `${ticket.id}号工单：${ticket.issue}` : '加载中...'}</h2>

              <ul className={styles.messagesList}>
                <List
                    itemLayout="horizontal"
                    dataSource={messages}
                    locale={{ emptyText: '暂无消息记录' }}
                    renderItem={(msg) => {
                      const isCurrentUser = msg.user?.id === userId;
                      const displayName = isCurrentUser ? '您' : userMapRef.current[msg.user?.id];
                      const messageTime = new Date(msg.timestamp).toLocaleString();

                      return (
                          <li
                              key={`${msg.id}-${msg.user?.id}-${msg.timestamp}`}
                              className={`${styles.messageItem} ${isCurrentUser ? styles.myMessage : styles.otherMessage}`}
                          >
                            <span className={styles.sender}>{displayName}</span>
                            <span className={styles.timestamp}>{messageTime}</span>
                            <div className={styles.message}>
                              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                {msg.message}
                              </ReactMarkdown>
                            </div>
                          </li>
                      );
                    }}
                />
                <div ref={messagesEndRef} />
              </ul>

              <form onSubmit={handleSendMessage} className={styles.form}>
                <div className={styles.markdownEditorContainer}>
                  <div className={styles.markdownToolbar}>
                    <Button
                        type="text"
                        size="small"
                        onClick={() => addMarkdownSyntax('bold')}
                        className={styles.markdownButton}
                    >
                      粗体
                    </Button>
                    <Button
                        type="text"
                        size="small"
                        onClick={() => addMarkdownSyntax('italic')}
                        className={styles.markdownButton}
                    >
                      斜体
                    </Button>
                    <Button
                        type="text"
                        size="small"
                        onClick={() => addMarkdownSyntax('code')}
                        className={styles.markdownButton}
                    >
                      代码
                    </Button>
                    <Button
                        type="text"
                        size="small"
                        onClick={() => addMarkdownSyntax('link')}
                        className={styles.markdownButton}
                    >
                      链接
                    </Button>
                    <Button
                        type="text"
                        size="small"
                        onClick={() => addMarkdownSyntax('list')}
                        className={styles.markdownButton}
                    >
                      列表
                    </Button>
                    <Button
                        type="text"
                        size="small"
                        icon={<PictureOutlined />}
                        onClick={() => setShowImageForm(!showImageForm)}
                        className={styles.markdownButton}
                        disabled={isSending}
                    >
                      图片
                    </Button>
                    <Button
                        type="text"
                        size="small"
                        onClick={() => setIsPreviewMode(!isPreviewMode)}
                        className={`${styles.markdownButton} ${isPreviewMode ? styles.active : ''}`}
                    >
                      预览
                    </Button>
                  </div>

                  {isPreviewMode ? (
                      <div className={styles.markdownPreview}>
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                          {message || '预览区域'}
                        </ReactMarkdown>
                      </div>
                  ) : (
                      <TextArea
                          value={message}
                          onChange={(e) => setMessage(e.target.value)}
                          className={styles.textarea}
                          placeholder="输入消息..."
                          autoSize={{ minRows: 2, maxRows: 6 }}
                          disabled={isSending}
                      />
                  )}
                </div>

                <div style={{ display: 'flex', marginTop: '10px', justifyContent: 'flex-end' }}>
                  <Button
                      type="primary"
                      htmlType="submit"
                      icon={<SendOutlined />}
                      className={styles.button}
                      disabled={isSending || (!message.trim() && !imageUrls.some(url => url.trim()))}
                      loading={isSending}
                  >
                    发送
                  </Button>
                </div>
              </form>

              {showImageForm && (
                  <div className={styles.imageForm} ref={imageFormRef}>
                    {imageUrls.map((url, index) => (
                        <Input
                            key={index}
                            type="text"
                            value={url}
                            onChange={(e) => handleAddImage(index, e.target.value)}
                            onBlur={() => {
                              setImageUrls(prevUrls =>
                                  prevUrls.filter((url, idx) =>
                                      url.trim() || idx === prevUrls.length - 1
                                  )
                              );
                            }}
                            placeholder="输入图床图片地址"
                            className={styles.input}
                            style={{ marginBottom: '10px' }}
                            disabled={isSending}
                        />
                    ))}
                    <Button
                        type="primary"
                        onClick={() => {
                          // 将图片URL添加到消息中
                          if (imageUrls.some(url => url.trim())) {
                            const imagesMarkdown = imageUrls
                                .filter(url => url.trim())
                                .map(url => `![图片](${url.trim()})`)
                                .join('\n');

                            setMessage(prev => prev ? `${prev}\n${imagesMarkdown}` : imagesMarkdown);
                            setImageUrls(['']);
                            setShowImageForm(false);
                          }
                        }}
                        className={styles.button}
                        disabled={isSending || !imageUrls.some(url => url.trim())}
                    >
                      插入图片
                    </Button>
                  </div>
              )}
            </div>
          </div>

          {!notificationsEnabled && (
              <div className={styles.notificationSidebar}>
                <Card className={styles.notificationCard}>
                  <div style={{ textAlign: 'center' }}>
                    <div className={styles.notificationIcon}>
                      <BellOutlined style={{ fontSize: '24px' }} />
                    </div>
                    <h3 className={styles.notificationTitle}>开启消息通知</h3>
                    <p className={styles.notificationText}>
                      开启通知功能，及时接收新消息提醒
                    </p>
                    <Button
                        type="primary"
                        className={styles.enableButton}
                        onClick={async () => {
                          const hasPermission = await checkNotificationPermission();
                          setNotificationsEnabled(hasPermission);
                          if (!hasPermission) {
                            notification.info({
                              message: '通知权限',
                              description: '您需要在浏览器设置中允许此网站发送通知',
                              duration: 4
                            });
                          }
                        }}
                    >
                      立即开启
                    </Button>
                  </div>
                </Card>
              </div>
          )}
        </div>
  );
};

export default React.memo(ChatPage);