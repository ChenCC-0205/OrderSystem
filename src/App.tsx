/**
 * 萬用動態團購點餐系統 (GAS + Google Sheets)
 * 前後台分開架構
 */

import React, { useState, useEffect } from 'react';
import { GroupOrder, Order } from './types';
import * as gasApi from './services/gasApi';
import { DEFAULT_GROUP } from './data/sampleMenus';
import { CustomerOrderPage } from './components/CustomerOrderPage';
import { AdminDashboard } from './components/AdminDashboard';
import { AdminLoginModal } from './components/AdminLoginModal';
import { RefreshCw, Utensils } from 'lucide-react';

export default function App() {
  // 檢視模式：前台訂餐 (customer) 或 後台管理 (admin)
  const [currentView, setCurrentView] = useState<'customer' | 'admin'>('customer');
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState<boolean>(false);
  const [isAdminModalOpen, setIsAdminModalOpen] = useState<boolean>(false);

  // 團購清單與當前選取的團購
  const [groups, setGroups] = useState<GroupOrder[]>([DEFAULT_GROUP]);
  const [currentGroupId, setCurrentGroupId] = useState<string>(DEFAULT_GROUP.id);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // 訂單資料
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoadingOrders, setIsLoadingOrders] = useState<boolean>(false);

  // 檢查登入狀態與 URL query 參數
  useEffect(() => {
    // 檢查 session 登入
    const loggedIn = sessionStorage.getItem('is_group_admin_logged_in') === 'true';
    setIsAdminLoggedIn(loggedIn);

    // 檢查網址參數 ?group=xxx
    const params = new URLSearchParams(window.location.search);
    const queryGroup = params.get('group');
    if (queryGroup) {
      setCurrentGroupId(queryGroup);
    }

    // 檢查 hash 是否為 #admin
    if (window.location.hash === '#admin') {
      if (loggedIn) {
        setCurrentView('admin');
      } else {
        setIsAdminModalOpen(true);
      }
    }
  }, []);

  // 載入所有團購資料
  const loadGroupsData = async () => {
    setIsLoading(true);
    try {
      const res = await gasApi.getGroups();
      if (res.success && res.data && res.data.length > 0) {
        setGroups(res.data);

        // 如果目前沒有選取，或是目前的 ID 不在清單中，選第一個
        const params = new URLSearchParams(window.location.search);
        const queryGroup = params.get('group');
        if (queryGroup && res.data.some(g => g.id === queryGroup)) {
          setCurrentGroupId(queryGroup);
        } else if (!res.data.some(g => g.id === currentGroupId)) {
          setCurrentGroupId(res.data[0].id);
        }
      }
    } catch (err) {
      console.error('Failed to load groups:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // 載入當前團購的訂單
  const loadOrdersData = async (groupId: string) => {
    setIsLoadingOrders(true);
    try {
      const res = await gasApi.getOrders(groupId);
      if (res.success && res.data) {
        setOrders(res.data);
      }
    } catch (err) {
      console.error('Failed to load orders:', err);
    } finally {
      setIsLoadingOrders(false);
    }
  };

  // 初始化載入
  useEffect(() => {
    loadGroupsData();
  }, []);

  // 當選取的團購變動時，更新訂單與 URL query
  useEffect(() => {
    if (currentGroupId) {
      loadOrdersData(currentGroupId);

      // 保持前台 URL 參數同步
      if (currentView === 'customer') {
        const url = new URL(window.location.href);
        url.searchParams.set('group', currentGroupId);
        window.history.replaceState({}, '', url.toString());
      }
    }
  }, [currentGroupId, currentView]);

  // 管理員登入成功回呼
  const handleAdminLoginSuccess = () => {
    setIsAdminLoggedIn(true);
    setCurrentView('admin');
    window.location.hash = '#admin';
  };

  // 管理員登出
  const handleAdminLogout = () => {
    sessionStorage.removeItem('is_group_admin_logged_in');
    setIsAdminLoggedIn(false);
    setCurrentView('customer');
    window.location.hash = '';
  };

  // 前往後台按鈕
  const handleOpenAdmin = () => {
    if (isAdminLoggedIn) {
      setCurrentView('admin');
      window.location.hash = '#admin';
    } else {
      setIsAdminModalOpen(true);
    }
  };

  // 從後台返回前台
  const handleViewCustomerPage = (targetGrpId?: string) => {
    if (targetGrpId) {
      setCurrentGroupId(targetGrpId);
    }
    setCurrentView('customer');
    window.location.hash = '';
  };

  // 取得目前作用中的團購
  const activeGroup = groups.find(g => g.id === currentGroupId) || groups[0] || DEFAULT_GROUP;

  if (isLoading && groups.length === 0) {
    return (
      <div className="min-h-screen bg-neutral-50 flex flex-col items-center justify-center p-4">
        <div className="w-12 h-12 rounded-2xl bg-emerald-600 text-white flex items-center justify-center mb-4 shadow-lg">
          <Utensils className="w-6 h-6 animate-pulse" />
        </div>
        <div className="flex items-center gap-2 text-neutral-700 font-bold text-base">
          <RefreshCw className="w-4 h-4 animate-spin text-emerald-600" />
          <span>正在連線至雲端試算表...</span>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* 登入彈窗 */}
      <AdminLoginModal
        isOpen={isAdminModalOpen}
        onClose={() => setIsAdminModalOpen(false)}
        onLoginSuccess={handleAdminLoginSuccess}
      />

      {/* 依模式渲染前台或後台 */}
      {currentView === 'admin' && isAdminLoggedIn ? (
        <AdminDashboard
          groups={groups}
          currentGroupId={currentGroupId}
          onSelectGroup={id => setCurrentGroupId(id)}
          onRefreshData={async () => {
            await loadGroupsData();
            if (currentGroupId) await loadOrdersData(currentGroupId);
          }}
          onLogout={handleAdminLogout}
          onViewCustomerPage={handleViewCustomerPage}
        />
      ) : (
        <CustomerOrderPage
          group={activeGroup}
          orders={orders}
          isLoadingOrders={isLoadingOrders}
          onRefreshOrders={() => loadOrdersData(currentGroupId)}
          onOpenAdminLogin={handleOpenAdmin}
          allGroups={groups}
          onSelectGroup={id => setCurrentGroupId(id)}
        />
      )}
    </>
  );
}
