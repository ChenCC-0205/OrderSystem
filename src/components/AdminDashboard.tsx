import React, { useState, useEffect } from 'react';
import { GroupOrder, Order, MenuData } from '../types';
import * as gasApi from '../services/gasApi';
import { SAMPLE_BENTO_MENU, SAMPLE_TEA_MENU, SAMPLE_BRUNCH_MENU } from '../data/sampleMenus';
import {
  aggregateOrderItems,
  generateRestaurantReport,
  generatePaymentTally,
  exportOrdersToCSV
} from '../utils/orderHelpers';
import { setAdminPasscode, getAdminPasscode } from './AdminLoginModal';
import { MenuImageLightbox } from './MenuImageLightbox';
import {
  ClipboardList,
  PlusCircle,
  Settings,
  CheckCircle2,
  Clock,
  Copy,
  Check,
  FileSpreadsheet,
  RefreshCw,
  ExternalLink,
  Image as ImageIcon,
  Key,
  Database,
  Eye,
  AlertTriangle,
  Code2,
  Share2
} from 'lucide-react';

interface AdminDashboardProps {
  groups: GroupOrder[];
  currentGroupId: string;
  onSelectGroup: (groupId: string) => void;
  onRefreshData: () => Promise<void>;
  onLogout: () => void;
  onViewCustomerPage: (groupId?: string) => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  groups,
  currentGroupId,
  onSelectGroup,
  onRefreshData,
  onLogout,
  onViewCustomerPage,
}) => {
  const [activeTab, setActiveTab] = useState<'orders' | 'create' | 'settings'>('orders');

  // 訂單狀態
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoadingOrders, setIsLoadingOrders] = useState<boolean>(false);
  const [updatingPaymentId, setUpdatingPaymentId] = useState<string | null>(null);

  // 複製回饋狀態
  const [copiedAction, setCopiedAction] = useState<string | null>(null);

  // 團購編輯表單
  const [formId, setFormId] = useState<string>('');
  const [formTitle, setFormTitle] = useState<string>('');
  const [formStatus, setFormStatus] = useState<'open' | 'closed'>('open');
  const [formImageUrl, setFormImageUrl] = useState<string>('');
  const [formDescription, setFormDescription] = useState<string>('');
  const [formDeadline, setFormDeadline] = useState<string>('');
  const [formMenuJsonStr, setFormMenuJsonStr] = useState<string>('');
  const [jsonError, setJsonError] = useState<string | null>(null);
  const [isSavingGroup, setIsSavingGroup] = useState<boolean>(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);

  // 菜單圖片大圖燈箱預覽
  const [isPreviewImageOpen, setIsPreviewImageOpen] = useState<boolean>(false);

  // GAS 設定
  const [gasUrlInput, setGasUrlInput] = useState<string>('');
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [isTestingGas, setIsTestingGas] = useState<boolean>(false);

  // 修改管理密碼
  const [newPassword, setNewPassword] = useState<string>('');
  const [pwdMsg, setPwdMsg] = useState<string | null>(null);

  // 取得目前選取的團購物件
  const currentGroup = groups.find(g => g.id === currentGroupId) || groups[0];

  // 載入當前團購的訂單
  const fetchGroupOrders = async (grpId: string) => {
    setIsLoadingOrders(true);
    try {
      const res = await gasApi.getOrders(grpId);
      if (res.success && res.data) {
        setOrders(res.data);
      }
    } catch (err) {
      console.error('Fetch orders error:', err);
    } finally {
      setIsLoadingOrders(false);
    }
  };

  useEffect(() => {
    if (currentGroup) {
      fetchGroupOrders(currentGroup.id);
    }
  }, [currentGroup?.id]);

  // 初始化 GAS 網址與表單資料
  useEffect(() => {
    setGasUrlInput(gasApi.getGasApiUrl());
  }, []);

  // 當選擇團購變更時，若在編輯模式則載入其資料
  const loadGroupToForm = (group: GroupOrder) => {
    setFormId(group.id);
    setFormTitle(group.title);
    setFormStatus(group.status);
    setFormImageUrl(group.image_url || '');
    setFormDescription(group.description || '');
    setFormDeadline(group.deadline || '');
    const jsonStr = typeof group.menu_json === 'string'
      ? group.menu_json
      : JSON.stringify(group.menu_json, null, 2);
    setFormMenuJsonStr(jsonStr);
    setJsonError(null);
  };

  const initNewGroupForm = () => {
    const newId = 'grp_' + Date.now();
    setFormId(newId);
    setFormTitle('【今日午餐團】美味點餐');
    setFormStatus('open');
    setFormImageUrl('https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=1200&q=80');
    setFormDescription('🔥 今日 10:45 準時結單，滿額即可出單！主揪 Line Pay: @lunch999');
    setFormDeadline('10:45');
    setFormMenuJsonStr(JSON.stringify(SAMPLE_BENTO_MENU, null, 2));
    setJsonError(null);
  };

  // 切換付款狀態
  const handleTogglePayment = async (orderId: string, currentPaid: boolean) => {
    setUpdatingPaymentId(orderId);
    try {
      const newPaid = !currentPaid;
      const res = await gasApi.updateOrderPayment(orderId, newPaid);
      if (res.success) {
        setOrders(prev =>
          prev.map(o => (o.id === orderId ? { ...o, is_paid: newPaid } : o))
        );
      }
    } catch (err) {
      console.error(err);
    } finally {
      setUpdatingPaymentId(null);
    }
  };

  // 切換團購狀態 (接單中 / 已結單)
  const handleToggleGroupStatus = async () => {
    if (!currentGroup) return;
    const newStatus = currentGroup.status === 'open' ? 'closed' : 'open';
    const res = await gasApi.updateGroupStatus(currentGroup.id, newStatus);
    if (res.success) {
      await onRefreshData();
    }
  };

  // 儲存團購 (建立或更新)
  const handleSaveGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    setJsonError(null);
    setSaveSuccessMsg(null);

    let parsedMenu: MenuData;
    try {
      parsedMenu = JSON.parse(formMenuJsonStr);
      if (!parsedMenu.categories || !Array.isArray(parsedMenu.categories)) {
        throw new Error('JSON 格式錯誤：根物件必須包含 categories 陣列！');
      }
    } catch (err: any) {
      setJsonError('菜單 JSON 解析失敗：' + err.message);
      return;
    }

    setIsSavingGroup(true);
    try {
      const groupData: GroupOrder = {
        id: formId || 'grp_' + Date.now(),
        title: formTitle,
        status: formStatus,
        image_url: formImageUrl.trim(),
        description: formDescription.trim(),
        deadline: formDeadline.trim(),
        menu_json: parsedMenu,
        created_at: new Date().toISOString()
      };

      const res = await gasApi.createGroup(groupData);
      if (res.success) {
        setSaveSuccessMsg('團購儲存成功！已同步至系統。');
        await onRefreshData();
        onSelectGroup(groupData.id);
        setTimeout(() => setSaveSuccessMsg(null), 4000);
      } else {
        setJsonError(res.error || '儲存失敗');
      }
    } catch (err: any) {
      setJsonError(err.message || '儲存過程發生錯誤');
    } finally {
      setIsSavingGroup(false);
    }
  };

  // 格式化 JSON
  const handleFormatJson = () => {
    try {
      const parsed = JSON.parse(formMenuJsonStr);
      setFormMenuJsonStr(JSON.stringify(parsed, null, 2));
      setJsonError(null);
    } catch (err: any) {
      setJsonError('無法美化：' + err.message);
    }
  };

  // 套用示範菜單
  const applySampleMenu = (menu: MenuData, defaultImg: string, defaultTitle: string) => {
    setFormMenuJsonStr(JSON.stringify(menu, null, 2));
    setFormImageUrl(defaultImg);
    setFormTitle(defaultTitle);
    setJsonError(null);
  };

  // 一鍵複製工具
  const copyToClipboard = (text: string, actionName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedAction(actionName);
    setTimeout(() => setCopiedAction(null), 2500);
  };

  // 測試 GAS
  const handleTestGas = async () => {
    setIsTestingGas(true);
    setTestResult(null);
    try {
      const res = await gasApi.testGasConnection(gasUrlInput.trim());
      setTestResult(res);
      if (res.success) {
        gasApi.setCustomGasApiUrl(gasUrlInput.trim());
      }
    } catch (err: any) {
      setTestResult({ success: false, message: err.message });
    } finally {
      setIsTestingGas(false);
    }
  };

  const handleSaveGasUrl = () => {
    gasApi.setCustomGasApiUrl(gasUrlInput.trim());
    setTestResult({ success: true, message: '已儲存 GAS 網址！' });
    setTimeout(() => setTestResult(null), 3000);
  };

  // 更新密碼
  const handleChangePassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.trim().length < 4) {
      setPwdMsg('密碼長度至少需要 4 位數');
      return;
    }
    setAdminPasscode(newPassword.trim());
    setNewPassword('');
    setPwdMsg('管理員密碼修改成功！下次登入請使用新密碼。');
    setTimeout(() => setPwdMsg(null), 4000);
  };

  // 統計數據
  const totalItemCount = orders.reduce((acc, o) => acc + o.items.reduce((s, i) => s + i.quantity, 0), 0);
  const totalRevenue = orders.reduce((acc, o) => acc + o.total_price, 0);
  const paidOrders = orders.filter(o => o.is_paid);
  const paidAmount = paidOrders.reduce((acc, o) => acc + o.total_price, 0);
  const unpaidAmount = totalRevenue - paidAmount;
  const itemSummaries = aggregateOrderItems(orders);

  // 團購點餐專屬前台連結
  const customerLink = typeof window !== 'undefined'
    ? `${window.location.origin}${window.location.pathname}?group=${currentGroup?.id || ''}`
    : '';

  return (
    <div className="min-h-screen bg-neutral-100 text-neutral-800 pb-16">
      {/* 菜單大圖預覽燈箱 */}
      <MenuImageLightbox
        isOpen={isPreviewImageOpen}
        onClose={() => setIsPreviewImageOpen(false)}
        imageUrl={formImageUrl || currentGroup?.image_url}
        title={formTitle || currentGroup?.title}
      />

      {/* 後台頂部列 */}
      <header className="bg-neutral-900 text-white shadow-md sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-500 flex items-center justify-center font-bold text-white shadow-md">
              團
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-bold text-base sm:text-lg">團購後台管理系統</h1>
                <span className="text-xs bg-emerald-800 text-emerald-200 px-2 py-0.5 rounded font-mono">
                  GAS 雲端版
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={() => onViewCustomerPage(currentGroup?.id)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-neutral-800 hover:bg-neutral-700 text-emerald-400 rounded-lg border border-neutral-700 transition-colors cursor-pointer"
            >
              <Eye className="w-3.5 h-3.5" />
              <span>預覽前台點餐頁</span>
            </button>
            <button
              onClick={onLogout}
              className="px-3 py-1.5 text-xs font-semibold bg-red-950/60 hover:bg-red-900 text-red-300 rounded-lg border border-red-800/50 transition-colors cursor-pointer"
            >
              登出後台
            </button>
          </div>
        </div>

        {/* 頁籤切換 */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex border-t border-neutral-800 space-x-1 sm:space-x-4">
          <button
            onClick={() => setActiveTab('orders')}
            className={`py-3 px-3 sm:px-4 text-xs sm:text-sm font-bold flex items-center gap-2 border-b-2 transition-colors cursor-pointer ${
              activeTab === 'orders'
                ? 'border-emerald-400 text-emerald-400'
                : 'border-transparent text-neutral-400 hover:text-white'
            }`}
          >
            <ClipboardList className="w-4 h-4" />
            <span>訂單統計與收款 ({orders.length})</span>
          </button>
          <button
            onClick={() => {
              setActiveTab('create');
              if (currentGroup) loadGroupToForm(currentGroup);
            }}
            className={`py-3 px-3 sm:px-4 text-xs sm:text-sm font-bold flex items-center gap-2 border-b-2 transition-colors cursor-pointer ${
              activeTab === 'create'
                ? 'border-emerald-400 text-emerald-400'
                : 'border-transparent text-neutral-400 hover:text-white'
            }`}
          >
            <PlusCircle className="w-4 h-4" />
            <span>開團與菜單 JSON 設計</span>
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={`py-3 px-3 sm:px-4 text-xs sm:text-sm font-bold flex items-center gap-2 border-b-2 transition-colors cursor-pointer ${
              activeTab === 'settings'
                ? 'border-emerald-400 text-emerald-400'
                : 'border-transparent text-neutral-400 hover:text-white'
            }`}
          >
            <Settings className="w-4 h-4" />
            <span>GAS 試算表設定</span>
          </button>
        </div>
      </header>

      {/* 主要內容區 */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 pt-6">
        {/* ===================== TAB 1: 訂單統計與收款 ===================== */}
        {activeTab === 'orders' && (
          <div className="space-y-6">
            {/* 團購切換器與狀態控制列 */}
            <div className="bg-white p-4 sm:p-5 rounded-2xl border border-neutral-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                <label className="text-xs font-bold text-neutral-600 shrink-0">選擇進行中的團購：</label>
                <select
                  value={currentGroup?.id || ''}
                  onChange={e => onSelectGroup(e.target.value)}
                  className="px-3.5 py-2 bg-neutral-50 rounded-xl border border-neutral-200 text-sm font-bold text-neutral-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                >
                  {groups.map(g => (
                    <option key={g.id} value={g.id}>
                      {g.title} ({g.status === 'open' ? '接單中' : '已結單'})
                    </option>
                  ))}
                </select>

                <div className="flex items-center gap-2">
                  <span
                    className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold ${
                      currentGroup?.status === 'open'
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-red-100 text-red-800'
                    }`}
                  >
                    <span className={`w-2 h-2 rounded-full ${currentGroup?.status === 'open' ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`} />
                    {currentGroup?.status === 'open' ? '接單中' : '已截單'}
                  </span>
                  {currentGroup?.deadline && (
                    <span className="text-xs text-neutral-600 flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" /> 截止: {currentGroup.deadline}
                    </span>
                  )}
                </div>
              </div>

              {/* 右側操作按鈕 */}
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={handleToggleGroupStatus}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                    currentGroup?.status === 'open'
                      ? 'bg-red-50 hover:bg-red-100 text-red-700 border border-red-200'
                      : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200'
                  }`}
                >
                  {currentGroup?.status === 'open' ? '⛔ 停止接單 (結單)' : '🟢 開放接單'}
                </button>

                <button
                  onClick={() => copyToClipboard(customerLink, 'customer_link')}
                  className="px-3.5 py-2 rounded-xl text-xs font-bold bg-neutral-100 hover:bg-neutral-200 text-neutral-700 border border-neutral-200 flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  {copiedAction === 'customer_link' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Share2 className="w-3.5 h-3.5" />}
                  <span>{copiedAction === 'customer_link' ? '已複製點餐網址！' : '複製點餐連結'}</span>
                </button>

                <button
                  onClick={() => currentGroup && fetchGroupOrders(currentGroup.id)}
                  disabled={isLoadingOrders}
                  className="px-3.5 py-2 rounded-xl text-xs font-bold bg-neutral-900 hover:bg-neutral-800 text-white flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isLoadingOrders ? 'animate-spin' : ''}`} />
                  <span>{isLoadingOrders ? '更新中...' : '同步訂單'}</span>
                </button>
              </div>
            </div>

            {/* KPI 指標卡片 */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white p-5 rounded-2xl border border-neutral-200 shadow-xs">
                <span className="text-xs font-bold text-neutral-600">下單人次</span>
                <div className="text-2xl font-black text-neutral-900 mt-1">{orders.length} 人</div>
                <div className="text-xs text-neutral-600 mt-0.5">跟單夥伴人數</div>
              </div>
              <div className="bg-white p-5 rounded-2xl border border-neutral-200 shadow-xs">
                <span className="text-xs font-bold text-neutral-600">餐點總份數</span>
                <div className="text-2xl font-black text-emerald-800 mt-1">{totalItemCount} 份</div>
                <div className="text-xs text-neutral-600 mt-0.5">叫餐便當/飲品總量</div>
              </div>
              <div className="bg-white p-5 rounded-2xl border border-neutral-200 shadow-xs">
                <span className="text-xs font-bold text-neutral-600">訂單總金額</span>
                <div className="text-2xl font-black text-neutral-900 mt-1">NT$ {totalRevenue}</div>
                <div className="text-xs text-neutral-600 mt-0.5">本團應付店家總額</div>
              </div>
              <div className="bg-white p-5 rounded-2xl border border-neutral-200 shadow-xs">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-neutral-600">收款進度</span>
                  <span className="text-xs font-bold text-emerald-700">
                    {totalRevenue > 0 ? Math.round((paidAmount / totalRevenue) * 100) : 0}%
                  </span>
                </div>
                <div className="text-2xl font-black text-emerald-800 mt-1">
                  ${paidAmount} <span className="text-xs font-normal text-neutral-600">/ 待收 ${unpaidAmount}</span>
                </div>
                {/* 進度條 */}
                <div className="w-full bg-neutral-100 rounded-full h-1.5 mt-2 overflow-hidden">
                  <div
                    className="bg-emerald-500 h-1.5 rounded-full transition-all duration-300"
                    style={{ width: `${totalRevenue > 0 ? (paidAmount / totalRevenue) * 100 : 0}%` }}
                  />
                </div>
              </div>
            </div>

            {/* 店家叫餐清單 (品項彙整報單專用) */}
            <div className="bg-white rounded-2xl border border-neutral-200 shadow-xs overflow-hidden">
              <div className="p-4 sm:p-5 border-b border-neutral-100 bg-emerald-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="font-extrabold text-base text-neutral-800 flex items-center gap-2">
                    <span className="text-lg">🍱</span> 店家叫餐清單 (規格匯總)
                  </h3>
                  <p className="text-xs text-neutral-600 mt-0.5">
                    已自動彙整各品項總數與特殊客製需求，可直接撥電話或傳給店家
                  </p>
                </div>

                <button
                  onClick={() =>
                    copyToClipboard(
                      generateRestaurantReport(currentGroup?.title || '團購', orders),
                      'restaurant_report'
                    )
                  }
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm transition-all cursor-pointer"
                >
                  {copiedAction === 'restaurant_report' ? (
                    <Check className="w-4 h-4" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                  <span>
                    {copiedAction === 'restaurant_report'
                      ? '已複製店家叫餐表！'
                      : '一鍵複製叫餐明細 (傳 LINE 店家)'}
                  </span>
                </button>
              </div>

              {/* 彙總表格 */}
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr className="bg-neutral-50/80 border-b border-neutral-100 text-xs font-bold text-neutral-600">
                      <th className="py-3 px-4 w-12 text-center">#</th>
                      <th className="py-3 px-4">品項名稱</th>
                      <th className="py-3 px-4 text-center">單價</th>
                      <th className="py-3 px-4 text-center font-black text-emerald-800">總數量</th>
                      <th className="py-3 px-4">規格 / 配料明細統計</th>
                      <th className="py-3 px-4 text-right">小計</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100">
                    {itemSummaries.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-neutral-600 text-xs">
                          目前尚未有餐點資料
                        </td>
                      </tr>
                    ) : (
                      itemSummaries.map((item, idx) => (
                        <tr key={idx} className="hover:bg-neutral-50/50">
                          <td className="py-3 px-4 text-center text-xs font-bold text-neutral-600">
                            {idx + 1}
                          </td>
                          <td className="py-3 px-4 font-bold text-neutral-800">
                            {item.name}
                          </td>
                          <td className="py-3 px-4 text-center text-neutral-600">
                            NT$ {item.price}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <span className="inline-block px-2.5 py-1 rounded-full text-xs font-black bg-emerald-100 text-emerald-800">
                              {item.totalQuantity} 份
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex flex-wrap gap-1.5">
                              {Object.entries(item.optionsBreakdown).map(([opt, count], optIdx) => (
                                <span
                                  key={optIdx}
                                  className="text-xs bg-neutral-100 border border-neutral-200 px-2 py-0.5 rounded text-neutral-700"
                                >
                                  {opt}：<strong className="text-emerald-700">{count}</strong>
                                </span>
                              ))}
                            </div>
                          </td>
                          <td className="py-3 px-4 text-right font-bold text-neutral-800">
                            NT$ {item.subtotal}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* 訂購人明細與收款核對 */}
            <div className="bg-white rounded-2xl border border-neutral-200 shadow-xs overflow-hidden">
              <div className="p-4 sm:p-5 border-b border-neutral-100 bg-neutral-50/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="font-extrabold text-base text-neutral-800 flex items-center gap-2">
                    <span className="text-lg">💰</span> 訂購人名冊與收款狀態
                  </h3>
                  <p className="text-xs text-neutral-600 mt-0.5">
                    點擊核取方塊即可即時標記付款狀態，並同步至 Google Sheets
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={() =>
                      copyToClipboard(
                        generatePaymentTally(currentGroup?.title || '團購', orders),
                        'payment_tally'
                      )
                    }
                    className="px-3.5 py-2 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    {copiedAction === 'payment_tally' ? (
                      <Check className="w-3.5 h-3.5" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                    <span>
                      {copiedAction === 'payment_tally'
                        ? '已複製催款對帳單！'
                        : '複製 LINE 催款名單'}
                    </span>
                  </button>

                  <button
                    onClick={() => exportOrdersToCSV(currentGroup?.title || '團購', orders)}
                    className="px-3.5 py-2 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 border border-neutral-200 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                    <span>匯出 CSV 檔</span>
                  </button>
                </div>
              </div>

              {/* 明細列表 */}
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr className="bg-neutral-50/60 border-b border-neutral-100 text-xs font-bold text-neutral-600">
                      <th className="py-3 px-4 w-12 text-center">序</th>
                      <th className="py-3 px-4">訂購人</th>
                      <th className="py-3 px-4">餐點明細與規格</th>
                      <th className="py-3 px-4 text-center">金額</th>
                      <th className="py-3 px-4 text-center">付款狀態 (點擊切換)</th>
                      <th className="py-3 px-4">訂單備註 / 留言</th>
                      <th className="py-3 px-4 text-right">下單時間</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100">
                    {orders.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-10 text-center text-neutral-600 text-xs">
                          目前尚未有任何訂單
                        </td>
                      </tr>
                    ) : (
                      orders.map((order, idx) => (
                        <tr key={order.id} className="hover:bg-neutral-50/50">
                          <td className="py-3 px-4 text-center text-xs font-bold text-neutral-600">
                            {idx + 1}
                          </td>
                          <td className="py-3 px-4 font-bold text-neutral-900">
                            {order.user_name}
                          </td>
                          <td className="py-3 px-4">
                            <div className="space-y-1">
                              {order.items.map((it, itIdx) => (
                                <div key={itIdx} className="text-xs text-neutral-700">
                                  <span className="font-semibold text-neutral-900">
                                    {it.name}
                                  </span>{' '}
                                  x {it.quantity}{' '}
                                  {it.options.length > 0 && (
                                    <span className="text-neutral-600">
                                      ({it.options.join(',')})
                                    </span>
                                  )}
                                  {it.itemNote && (
                                    <span className="text-amber-700 bg-amber-50 px-1 py-0.2 rounded ml-1 text-[11px]">
                                      [{it.itemNote}]
                                    </span>
                                  )}
                                </div>
                              ))}
                            </div>
                          </td>
                          <td className="py-3 px-4 text-center font-extrabold text-neutral-900">
                            NT$ {order.total_price}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <button
                              onClick={() => handleTogglePayment(order.id, order.is_paid)}
                              disabled={updatingPaymentId === order.id}
                              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold transition-all cursor-pointer ${
                                order.is_paid
                                  ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                                  : 'bg-amber-100 text-amber-800 hover:bg-amber-200 ring-1 ring-amber-300'
                              }`}
                            >
                              {updatingPaymentId === order.id ? (
                                <RefreshCw className="w-3 h-3 animate-spin" />
                              ) : order.is_paid ? (
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                              ) : (
                                <Clock className="w-3.5 h-3.5 text-amber-600" />
                              )}
                              <span>{order.is_paid ? '已付款' : '未付款 (點此收款)'}</span>
                            </button>
                          </td>
                          <td className="py-3 px-4 text-xs text-neutral-600 max-w-[180px] truncate">
                            {order.note || '-'}
                          </td>
                          <td className="py-3 px-4 text-right text-xs text-neutral-600">
                            {order.created_at ? new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-'}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ===================== TAB 2: 開團與菜單 JSON 設計 ===================== */}
        {activeTab === 'create' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 sm:p-5 rounded-2xl border border-neutral-200">
              <div>
                <h2 className="text-lg font-bold text-neutral-800">建立或編輯團購菜單</h2>
                <p className="text-xs text-neutral-600 mt-0.5">
                  支援貼上菜單圖片網址、匯入自訂 JSON 規格，以及即時預覽
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={initNewGroupForm}
                  className="px-3 py-1.5 text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 rounded-xl transition-colors cursor-pointer"
                >
                  + 建立全新團購
                </button>
              </div>
            </div>

            {saveSuccessMsg && (
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-800 text-sm flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                <span>{saveSuccessMsg}</span>
              </div>
            )}

            {jsonError && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-2xl text-red-800 text-sm flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-red-600 shrink-0" />
                <span>{jsonError}</span>
              </div>
            )}

            <form onSubmit={handleSaveGroup} className="space-y-6">
              {/* 基本資訊區塊 */}
              <div className="bg-white p-5 rounded-2xl border border-neutral-200 space-y-4 shadow-xs">
                <h3 className="font-bold text-sm text-neutral-800 border-b border-neutral-100 pb-2">
                  1. 團購活動基本資訊
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-xs font-bold text-neutral-700 mb-1">
                      團購名稱 / 餐廳名稱 <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={formTitle}
                      onChange={e => setFormTitle(e.target.value)}
                      placeholder="例如：【今日午餐團】極品燒肉便當專賣店"
                      className="w-full px-3.5 py-2.5 text-sm bg-neutral-50 rounded-xl border border-neutral-200 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 font-medium"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-neutral-700 mb-1">
                      截止時間 (提示用)
                    </label>
                    <input
                      type="text"
                      value={formDeadline}
                      onChange={e => setFormDeadline(e.target.value)}
                      placeholder="例如：10:45 或 11:00"
                      className="w-full px-3.5 py-2.5 text-sm bg-neutral-50 rounded-xl border border-neutral-200 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 font-medium"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-neutral-700 mb-1">
                      團購狀態
                    </label>
                    <select
                      value={formStatus}
                      onChange={e => setFormStatus(e.target.value as any)}
                      className="w-full px-3.5 py-2.5 text-sm bg-neutral-50 rounded-xl border border-neutral-200 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                    >
                      <option value="open">🟢 開放接單中 (open)</option>
                      <option value="closed">⛔ 已結單截止 (closed)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-neutral-700 mb-1">
                      團購識別 ID (系統唯一鍵)
                    </label>
                    <input
                      type="text"
                      value={formId}
                      onChange={e => setFormId(e.target.value)}
                      className="w-full px-3.5 py-2.5 text-sm bg-neutral-100 rounded-xl border border-neutral-200 font-mono text-neutral-600 text-xs"
                      readOnly
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-neutral-700 mb-1">
                    團購說明與繳費提醒 (顯示在前台橫幅)
                  </label>
                  <textarea
                    rows={2}
                    value={formDescription}
                    onChange={e => setFormDescription(e.target.value)}
                    placeholder="例如：今日 10:45 準時結單店家出餐！主揪 Line Pay: @lunch999，滿 10 個即可送餐。"
                    className="w-full px-3.5 py-2 text-sm bg-neutral-50 rounded-xl border border-neutral-200 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                  />
                </div>
              </div>

              {/* 菜單圖片連結欄位與即時預覽 */}
              <div className="bg-white p-5 rounded-2xl border border-neutral-200 space-y-4 shadow-xs">
                <div className="flex items-center justify-between border-b border-neutral-100 pb-2">
                  <h3 className="font-bold text-sm text-neutral-800 flex items-center gap-2">
                    <ImageIcon className="w-4 h-4 text-emerald-600" />
                    <span>2. 菜單圖片連結設定 (前台提供縮圖與點擊放大查看)</span>
                  </h3>
                  <span className="text-xs text-neutral-600 font-normal">
                    可貼上任何公開圖床或 Google 雲端圖片網址
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-bold text-neutral-700 mb-1">
                    菜單圖片的圖片連結 (Image URL)
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="url"
                      value={formImageUrl}
                      onChange={e => setFormImageUrl(e.target.value)}
                      placeholder="請貼上圖片網址，例如：https://images.unsplash.com/..."
                      className="flex-1 px-3.5 py-2.5 text-sm bg-neutral-50 rounded-xl border border-neutral-200 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500"
                    />
                    {formImageUrl && (
                      <button
                        type="button"
                        onClick={() => setIsPreviewImageOpen(true)}
                        className="px-3.5 py-2 text-xs font-bold bg-neutral-100 hover:bg-neutral-200 text-neutral-700 rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <Eye className="w-4 h-4" />
                        <span>測試燈箱</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* 圖片即時預覽區 */}
                {formImageUrl ? (
                  <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-200/80 flex flex-col sm:flex-row items-center gap-4">
                    <div
                      onClick={() => setIsPreviewImageOpen(true)}
                      className="relative w-36 h-24 rounded-lg overflow-hidden bg-neutral-200 border border-neutral-300 shrink-0 cursor-pointer group shadow-sm"
                    >
                      <img
                        src={formImageUrl}
                        alt="菜單預覽"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-bold gap-1">
                        <Eye className="w-3.5 h-3.5" /> 放大
                      </div>
                    </div>
                    <div className="text-xs text-neutral-600 space-y-1">
                      <p className="font-bold text-neutral-800">✅ 菜單圖片連結有效！</p>
                      <p>前台將在頂部顯示這張菜單的縮小圖，使用者可隨時點擊彈出大圖並自由放大檢視品項與價格。</p>
                    </div>
                  </div>
                ) : (
                  <div className="p-4 bg-amber-50/60 border border-amber-200/60 rounded-xl text-xs text-amber-800">
                    💡 尚未填寫菜單圖片連結。建議貼上餐廳實體菜單照片，方便點餐者點擊放大查看完整紙本菜單！
                  </div>
                )}
              </div>

              {/* 菜單 JSON 匯入與編輯器 */}
              <div className="bg-white p-5 rounded-2xl border border-neutral-200 space-y-4 shadow-xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-neutral-100 pb-2">
                  <h3 className="font-bold text-sm text-neutral-800 flex items-center gap-2">
                    <Code2 className="w-4 h-4 text-emerald-600" />
                    <span>3. 菜單 JSON 數據 (JSON Menu Standard)</span>
                  </h3>

                  {/* 範本快捷載入按鈕 */}
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-xs text-neutral-600 mr-1">快捷範本：</span>
                    <button
                      type="button"
                      onClick={() =>
                        applySampleMenu(
                          SAMPLE_BENTO_MENU,
                          'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=1200&q=80',
                          '【今日午餐團】極品燒肉便當專賣店 🍱'
                        )
                      }
                      className="px-2.5 py-1 text-xs font-semibold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-lg border border-emerald-200 transition-colors cursor-pointer"
                    >
                      🍱 便當店範本
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        applySampleMenu(
                          SAMPLE_TEA_MENU,
                          'https://images.unsplash.com/photo-1558857563-b37cf5e4a83b?auto=format&fit=crop&w=1200&q=80',
                          '【下午茶團購】禾茶手搖飲專門店 🧋'
                        )
                      }
                      className="px-2.5 py-1 text-xs font-semibold bg-amber-50 text-amber-700 hover:bg-amber-100 rounded-lg border border-amber-200 transition-colors cursor-pointer"
                    >
                      🧋 手搖飲範本
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        applySampleMenu(
                          SAMPLE_BRUNCH_MENU,
                          'https://images.unsplash.com/photo-1525351484163-7529414344d8?auto=format&fit=crop&w=1200&q=80',
                          '【晨光時光】手工漢堡早午餐 🥪'
                        )
                      }
                      className="px-2.5 py-1 text-xs font-semibold bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg border border-blue-200 transition-colors cursor-pointer"
                    >
                      🥪 早午餐範本
                    </button>
                    <button
                      type="button"
                      onClick={handleFormatJson}
                      className="px-2.5 py-1 text-xs font-semibold bg-neutral-100 hover:bg-neutral-200 text-neutral-700 rounded-lg transition-colors cursor-pointer"
                    >
                      美化 JSON
                    </button>
                  </div>
                </div>

                <p className="text-xs text-neutral-600">
                  菜單遵循標準格式：<code className="text-emerald-700 font-mono">{"categories: [{ category_name, items: [{ id, name, price, options }] }]"}</code>
                </p>

                <div className="relative">
                  <textarea
                    rows={12}
                    value={formMenuJsonStr}
                    onChange={e => {
                      setFormMenuJsonStr(e.target.value);
                      setJsonError(null);
                    }}
                    className="w-full p-4 font-mono text-xs bg-neutral-900 text-emerald-400 rounded-xl border border-neutral-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 leading-relaxed shadow-inner"
                    spellCheck={false}
                  />
                </div>
              </div>

              {/* 儲存送出按鈕 */}
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="submit"
                  disabled={isSavingGroup}
                  className="px-8 py-3 bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white font-bold rounded-xl shadow-md shadow-emerald-600/20 text-sm flex items-center gap-2 transition-all cursor-pointer"
                >
                  {isSavingGroup ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>儲存至 Google 試算表...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>儲存並發布團購菜單</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* ===================== TAB 3: GAS 試算表設定與部署代碼 ===================== */}
        {activeTab === 'settings' && (
          <div className="space-y-6">
            {/* GAS 連線狀態 */}
            <div className="bg-white p-5 rounded-2xl border border-neutral-200 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
                <div className="flex items-center gap-2">
                  <Database className="w-5 h-5 text-emerald-600" />
                  <h3 className="font-bold text-base text-neutral-800">
                    Google Apps Script (GAS) 雲端 API 連線設定
                  </h3>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${
                      gasApi.getGasApiUrl()
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    <span className={`w-2 h-2 rounded-full ${gasApi.getGasApiUrl() ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
                    {gasApi.getGasApiUrl() ? '已設定 GAS 雲端網址' : '目前處於本機展示模式'}
                  </span>
                </div>
              </div>

              <div className="space-y-3">
                <label className="block text-xs font-bold text-neutral-700">
                  GAS Web App URL (網頁應用程式網址)
                </label>
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="url"
                    value={gasUrlInput}
                    onChange={e => setGasUrlInput(e.target.value)}
                    placeholder="https://script.google.com/macros/s/AKfycb.../exec"
                    className="flex-1 px-3.5 py-2.5 text-sm bg-neutral-50 rounded-xl border border-neutral-200 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                  />
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={handleTestGas}
                      disabled={isTestingGas || !gasUrlInput}
                      className="px-4 py-2.5 bg-neutral-900 hover:bg-neutral-800 disabled:opacity-50 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      {isTestingGas ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : null}
                      <span>測試連線</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleSaveGasUrl}
                      className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
                    >
                      儲存網址
                    </button>
                  </div>
                </div>

                {testResult && (
                  <div
                    className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
                      testResult.success
                        ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
                        : 'bg-red-50 border border-red-200 text-red-800'
                    }`}
                  >
                    {testResult.success ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
                    )}
                    <span>{testResult.message}</span>
                  </div>
                )}
              </div>
            </div>

            {/* 完整部署步驟教學與 gas-api.js 代碼一鍵複製 */}
            <div className="bg-white p-5 rounded-2xl border border-neutral-200 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
                <div>
                  <h3 className="font-bold text-base text-neutral-800">
                    📋 GAS 後端部署教學 (全系統零伺服器成本)
                  </h3>
                  <p className="text-xs text-neutral-600 mt-0.5">
                    本系統後端完全採用 Google Apps Script + Google Sheets 作為資料庫
                  </p>
                </div>

                <a
                  href="/gas-api.js"
                  download="gas-api.js"
                  className="px-3.5 py-1.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 rounded-xl text-xs font-bold flex items-center gap-1 transition-colors"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>下載 gas-api.js</span>
                </a>
              </div>

              {/* 步驟指南 */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                <div className="p-4 bg-neutral-50 rounded-xl border border-neutral-200/80 space-y-1.5">
                  <div className="w-6 h-6 rounded-full bg-emerald-600 text-white font-bold flex items-center justify-center text-xs">
                    1
                  </div>
                  <h4 className="font-bold text-neutral-800">建立 Google 試算表</h4>
                  <p className="text-neutral-600">
                    在 Google 雲端硬碟建立一份空白 Google 試算表，點擊頂部選單「擴充功能」-&gt;「Apps Script」。
                  </p>
                </div>

                <div className="p-4 bg-neutral-50 rounded-xl border border-neutral-200/80 space-y-1.5">
                  <div className="w-6 h-6 rounded-full bg-emerald-600 text-white font-bold flex items-center justify-center text-xs">
                    2
                  </div>
                  <h4 className="font-bold text-neutral-800">貼上 gas-api.js 程式碼</h4>
                  <p className="text-neutral-600">
                    將下方提供的完整原始碼複製並覆蓋 Apps Script 的 Code.gs，儲存專案。
                  </p>
                </div>

                <div className="p-4 bg-neutral-50 rounded-xl border border-neutral-200/80 space-y-1.5">
                  <div className="w-6 h-6 rounded-full bg-emerald-600 text-white font-bold flex items-center justify-center text-xs">
                    3
                  </div>
                  <h4 className="font-bold text-neutral-800">部署為網頁應用程式</h4>
                  <p className="text-neutral-600">
                    右上角點「部署」-&gt;「新增部署作業」-&gt; 選「網頁應用程式」，存取權限務必設為<strong>「所有人 (Anyone)」</strong>，複製 Web App 網址貼回系統即可！
                  </p>
                </div>
              </div>
            </div>

            {/* 修改管理員密碼 */}
            <div className="bg-white p-5 rounded-2xl border border-neutral-200 shadow-xs space-y-4">
              <div className="flex items-center gap-2 border-b border-neutral-100 pb-3">
                <Key className="w-5 h-5 text-emerald-600" />
                <h3 className="font-bold text-base text-neutral-800">修改後台管理員登入密碼</h3>
              </div>

              <form onSubmit={handleChangePassword} className="space-y-3 max-w-md">
                {pwdMsg && (
                  <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs">
                    {pwdMsg}
                  </div>
                )}
                <div>
                  <label className="block text-xs font-bold text-neutral-700 mb-1">
                    設定新管理密碼 (目前預設：{getAdminPasscode()})
                  </label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    placeholder="輸入新密碼 (至少 4 位數)"
                    className="w-full px-3.5 py-2 text-sm bg-neutral-50 rounded-xl border border-neutral-200 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                  />
                </div>
                <button
                  type="submit"
                  className="px-4 py-2 bg-neutral-900 hover:bg-neutral-800 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
                >
                  確認修改密碼
                </button>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};
