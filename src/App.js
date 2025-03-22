import React, {useCallback, useEffect, useState} from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './components/context/AuthContext';
import { HeartbeatProvider } from './components/context/HeartbeatContext';
import { NotificationProvider } from './components/context/NotificationContext';
import { MapProvider } from './components/context/MapContext';
import { ProtectedRoute } from './components/utils/ProtectedRoute';
import { ConnectionMonitor } from './components/utils/stores/connections/ConnectionMonitor';
import ErrorBoundary from './components/utils/ErrorBoundary';

// Pages and Components
import HomePage from './components/base/HomePage';
import Register from './components/base/Register';
import Login from './components/base/Login';
import UserProfile from './components/user/UserProfile';
import UserProfileForm from './components/user/UserProfileForm';
import AdminUserInfo from './components/user/AdminUserInfo';
import VerificationForm from './components/user/VerificationForm';
import TicketManagerRender from './components/ticket/TicketManager';
import MessageCenter from './components/base/MessageCenter';
import ChatPage from './components/ticket/ChatPage';
import MailOrder from './components/mail/MailOrder';
import AdminInterventionForm from './components/mail/AdminInterventionForm';
import WalletManager from './components/wallet/WalletManager';
import useConnectionStore from "./components/utils/stores/connections/ConnectionStore";
import Loading from "./components/utils/Loading";
import QuestionCenter from "./components/question/QuestionCenter";
import QuestionDetail from './components/question/QuestionDetail';
import MyQuestions from './components/question/MyQuestions';
import AdminQuestionCenter from './components/question/AdminQuestionCenter';
import PaymentReturn from "./components/utils/api/PaymentReturn";
import AlipayCallback from './components/utils/AlipayCallback';
import FriendCenter from './components/friend/FriendCenter';
import CreateFriendProfile from './components/friend/CreateFriendProfile';
import FriendMatchList from './components/friend/FriendMatchList';
import FriendDetail from './components/friend/FriendDetail';
import MyFriends from './components/friend/MyFriends';
import MarketingManager from "./components/marketing/MarketingManager";
import MerchantVerification from "./components/merchant/MerchantVerification";
import TimeoutDashboard from "./components/timeout/TimeoutDashboard";
import MerchantDashboard from "./components/merchant/MerchantDashboard";
import MerchantInvitations from "./components/merchant/MerchantInvitations";
import MerchantEmployees from "./components/merchant/MerchantEmployees";
import MerchantOrders from "./components/merchant/MerchantOrders";
import ShopDiscovery from "./components/shop/ShopDiscovery";
import ShopDetail from "./components/shop/ShopDetail";
import ProductDetail from "./components/shop/ProductDetail";
import OrderCreate from "./components/shop/OrderCreate";
import MyOrders from "./components/shop/MyOrders";
import OrderDetail from "./components/shop/OrderDetail";
import ShopManager from "./components/shop/ShopManager";
import AcceptOrders from "./components/shop/AcceptOrders";
import PurchaseRequestLayout from "./components/purchaserequest/PurchaseRequestLayout";
import { setupGlobalErrorHandler } from './components/utils/errorHandler';
import MyRatings from "./components/user/MyRatings";
import UserRatings from "./components/user/UserRatings";
import AdminProductReview from "./components/merchant/AdminProductReview";

function App() {
  // 在应用初始化期间调用此函数
  setupGlobalErrorHandler();
  const { setHeartbeatStatus, setNotificationStatus } = useConnectionStore();
  const [isAppReady, setIsAppReady] = useState(false);

  useEffect(() => {
    // 确保应用初始化完成
    setIsAppReady(true);
  }, []);

  const handleConnectionChange = useCallback((status) => {
    try {
      setHeartbeatStatus(status.heartbeat ? 'connected' : 'disconnected');
      setNotificationStatus(status.notification ? 'connected' : 'disconnected');
    } catch (error) {
      console.error('状态更新错误:', error);
      // 重置状态
      setHeartbeatStatus('disconnected');
      setNotificationStatus('disconnected');
    }
  }, [setHeartbeatStatus, setNotificationStatus]);

  if (!isAppReady) {
    return (
        <div className="app-loading">
          <Loading size="lg" color="dark" />
        </div>
    );
  }

  return (
      <ErrorBoundary>
        <AuthProvider>
          <Router>
            <HeartbeatProvider>
              <NotificationProvider>
                <ConnectionMonitor onStatusChange={handleConnectionChange}>
                  <Routes>
                    <Route path="/" element={<HomePage />} />
                    <Route path="/register" element={<Register />} />
                    <Route path="/login" element={<Login />} />
                    <Route path="/alipay/callback" element={<AlipayCallback />} />
                    <Route path="/profile" element={
                      <ProtectedRoute backgroundStyle="default">
                        <UserProfile />
                      </ProtectedRoute>
                    } />
                    <Route path="/timeout-statistics" element={
                      <ProtectedRoute>
                        {({ isAdmin }) => <TimeoutDashboard />}
                      </ProtectedRoute>
                    } />
                    <Route path="/admin/timeout-statistics" element={
                      <ProtectedRoute
                          requiredGroup="admin"
                          backgroundStyle="admin"
                      >
                        <TimeoutDashboard />
                      </ProtectedRoute>
                    } />
                    <Route path="/edit-profile" element={
                      <ProtectedRoute backgroundStyle="default">
                        <UserProfileForm />
                      </ProtectedRoute>
                    } />
                    {/* 商家管理路由 */}
                    <Route path="/merchant" element={
                      <ProtectedRoute backgroundStyle="default">
                        {({ userId, userGroup, isAdmin }) => (
                            <MerchantDashboard
                                userId={userId}
                                userGroup={userGroup}
                                isAdmin={isAdmin}
                            />
                        )}
                      </ProtectedRoute>
                    } />

                    {/* 商家认证路由 */}
                    <Route path="/merchant/verification" element={
                      <ProtectedRoute backgroundStyle="default">
                        {({ userId, userGroup, isAdmin }) => (
                            <MerchantVerification
                                userId={userId}
                                userGroup={userGroup}
                                isAdmin={isAdmin}
                            />
                        )}
                      </ProtectedRoute>
                    } />
                    {/* 单个商家管理路由，用于直接访问特定商家 */}
                    <Route path="/merchant/:merchantUid" element={
                      <ProtectedRoute backgroundStyle="default">
                        {({ userId, userGroup, isAdmin }) => (
                            <MerchantDashboard
                                userId={userId}
                                userGroup={userGroup}
                                isAdmin={isAdmin}
                            />
                        )}
                      </ProtectedRoute>
                    } />

                    {/* 商家员工管理专用路由 */}
                    <Route path="/merchant/:merchantUid/employees" element={
                      <ProtectedRoute backgroundStyle="default">
                        {({ userId }) => (
                            <div className="merchant-background">
                              <MerchantEmployees userId={userId} />
                            </div>
                        )}
                      </ProtectedRoute>
                    } />

                    {/* 商家订单管理专用路由 */}
                    <Route path="/merchant/:merchantUid/orders" element={
                      <ProtectedRoute backgroundStyle="default">
                        {({ userId }) => (
                            <div className="merchant-background">
                              <MerchantOrders userId={userId} />
                            </div>
                        )}
                      </ProtectedRoute>
                    } />

                    {/* 店铺管理员专用路由 - 需要店主或管理员权限 */}
                    <Route path="/merchant/admin" element={
                      <ProtectedRoute backgroundStyle="default">
                        {({ userId, userGroup, isAdmin }) => (
                            <MerchantDashboard
                                userId={userId}
                                userGroup={userGroup}
                                isAdmin={isAdmin}
                                adminView={true}
                            />
                        )}
                      </ProtectedRoute>
                    } />

                    {/* 商家邀请管理路由 */}
                    <Route path="/merchant/invitations" element={
                      <ProtectedRoute backgroundStyle="default">
                        {({ userId, userGroup, isAdmin }) => (
                            <MerchantInvitations
                                userId={userId}
                                userGroup={userGroup}
                                isAdmin={isAdmin}
                            />
                        )}
                      </ProtectedRoute>
                    } />
                    <Route path="/admin/products/review" element={
                      <ProtectedRoute
                          requiredGroup="admin"
                          backgroundStyle="admin"
                      >
                        <AdminProductReview />
                      </ProtectedRoute>
                    } />
                    <Route path="/friend" element={
                      <ProtectedRoute backgroundStyle="default">
                        <FriendCenter />
                      </ProtectedRoute>
                    } />
                    <Route path="/friend/create" element={
                      <ProtectedRoute backgroundStyle="default">
                        <CreateFriendProfile />
                      </ProtectedRoute>
                    } />
                    <Route path="/friend/matches" element={
                      <ProtectedRoute backgroundStyle="default">
                        <FriendMatchList />
                      </ProtectedRoute>
                    } />

                    <Route path="/friend/matches/:matchType" element={
                      <ProtectedRoute backgroundStyle="default">
                        <FriendMatchList />
                      </ProtectedRoute>
                    } />

                    <Route path="/friend/detail/:id" element={
                      <ProtectedRoute backgroundStyle="default">
                        <FriendDetail />
                      </ProtectedRoute>
                    } />

                    <Route path="/friend/my" element={
                      <ProtectedRoute backgroundStyle="default">
                        <MyFriends />
                      </ProtectedRoute>
                    } />
                    <Route path="/allusers" element={
                      <ProtectedRoute
                          requiredGroup="admin"
                          backgroundStyle="admin"
                      >
                        <AdminUserInfo />
                      </ProtectedRoute>
                    } />
                    <Route path="/verification" element={
                      <ProtectedRoute backgroundStyle="default">
                        <VerificationForm />
                      </ProtectedRoute>
                    } />
                    <Route path="/support" element={
                      <ProtectedRoute>
                        {({ userId, isAdmin }) => (
                            <div className={isAdmin ? "admin-background" : "default-background"}>
                              <TicketManagerRender userId={userId} isAdmin={isAdmin} />
                            </div>
                        )}
                      </ProtectedRoute>
                    } />
                    <Route path="/messages" element={
                      <ProtectedRoute backgroundStyle="default">
                        <MessageCenter />
                      </ProtectedRoute>
                    } />
                    <Route path="/chat/:ticketId" element={
                      <ProtectedRoute backgroundStyle="default">
                        {({ userId }) => <ChatPage userId={userId} />}
                      </ProtectedRoute>
                    } />
                    <Route path="/mailorder/*" element={
                      <ProtectedRoute>
                        {(userInfo) => (
                            <MapProvider>
                              <MailOrder
                                  isAdmin={userInfo.isAdmin}
                                  isMessenger={userInfo.isMessenger}
                              />
                            </MapProvider>
                        )}
                      </ProtectedRoute>
                    } />
                    <Route path="/admin-intervention/:orderNumber" element={
                      <ProtectedRoute
                          requiredGroup="admin"
                          backgroundStyle="admin"
                      >
                        <MapProvider>
                          <AdminInterventionForm />
                        </MapProvider>
                      </ProtectedRoute>
                    } />
                    <Route path="/wallet" element={
                      <ProtectedRoute>
                        {({ isAdmin }) => (
                            <div className={isAdmin ? "admin-background" : "default-background"}>
                              <WalletManager isAdmin={isAdmin} />
                            </div>
                        )}
                      </ProtectedRoute>
                    } />
                    <Route path="/question" element={
                      <ProtectedRoute>
                        {({ isAdmin }) => (
                            <div className={isAdmin ? "admin-background" : "default-background"}>
                              <QuestionCenter isAdmin={isAdmin} />
                            </div>
                        )}
                      </ProtectedRoute>
                    } />

                    <Route path="/questions/:questionId" element={
                      <ProtectedRoute backgroundStyle="default">
                        {({ userId }) => <QuestionDetail userId={userId} />}
                      </ProtectedRoute>
                    } />

                    <Route path="/my-questions" element={
                      <ProtectedRoute backgroundStyle="default">
                        {({ userId }) => <MyQuestions userId={userId} />}
                      </ProtectedRoute>
                    } />

                    <Route path="/admin/questions" element={
                      <ProtectedRoute
                          requiredGroup="admin"
                          backgroundStyle="admin"
                      >
                        {({ isAdmin }) => <AdminQuestionCenter isAdmin={isAdmin} />}
                      </ProtectedRoute>
                    } />
                    <Route path="/marketing/*" element={
                      <ProtectedRoute
                          requiredGroup="admin"
                          backgroundStyle="admin"
                      >
                        <MapProvider>
                          <MarketingManager />
                        </MapProvider>
                      </ProtectedRoute>
                    } />
                    <Route path="/payment/return" element={
                      <ProtectedRoute backgroundStyle="default">
                        <PaymentReturn />
                      </ProtectedRoute>
                    } />
                    <Route path="/ratings/my" element={
                      <ProtectedRoute backgroundStyle="default">
                        <MyRatings />
                      </ProtectedRoute>
                    } />
                    <Route path="/ratings/user/:userId" element={
                      <ProtectedRoute backgroundStyle="default">
                        <UserRatings />
                      </ProtectedRoute>
                    } />
                    {/* 商城路由 */}
                    <Route path="/shop" element={<MapProvider><ShopDiscovery /></MapProvider>} />
                    <Route path="/shop/stores/:storeId" element={<MapProvider><ShopDetail /></MapProvider>} />
                    <Route path="/shop/products/:productId" element={<ProductDetail />} />
                    <Route path="/shop/order/create" element={<ProtectedRoute><MapProvider><OrderCreate /></MapProvider></ProtectedRoute>} />
                    <Route path="/shop/orders" element={<ProtectedRoute><MyOrders /></ProtectedRoute>} />
                    <Route path="/shop/orders/:orderNumber" element={<ProtectedRoute><OrderDetail /></ProtectedRoute>} />

                    {/* 商家管理路由 */}
                    <Route path="/shop/merchant/*" element={<ProtectedRoute requiredGroups={['admin', 'store']}><MapProvider><ShopManager /></MapProvider></ProtectedRoute>} />

                    {/* 配送员接单路由 */}
                    <Route path="/shop/delivery/accept" element={<ProtectedRoute><MapProvider><AcceptOrders /></MapProvider></ProtectedRoute>} />
                    <Route path="/shop" element={<ShopDiscovery />} />
                    <Route path="/shop/stores/:storeId" element={<ShopDetail />} />
                    <Route path="/shop/products/:productId" element={<ProductDetail />} />
                    <Route path="/shop/order/create" element={<ProtectedRoute><MapProvider><OrderCreate /></MapProvider></ProtectedRoute>} />
                    <Route path="/shop/orders" element={<ProtectedRoute><MyOrders /></ProtectedRoute>} />
                    <Route path="/shop/orders/:orderNumber" element={<ProtectedRoute><OrderDetail /></ProtectedRoute>} />
                    {/* 替换代购需求路由 */}
                    <Route
                        path="/request/*"
                        element={
                          <ProtectedRoute>
                            <MapProvider>
                              <PurchaseRequestLayout />
                            </MapProvider>
                          </ProtectedRoute>
                        }
                    />
                  </Routes>
                </ConnectionMonitor>
              </NotificationProvider>
            </HeartbeatProvider>
          </Router>
        </AuthProvider>
      </ErrorBoundary>
  );
}

export default App;