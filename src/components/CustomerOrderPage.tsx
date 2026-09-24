import React, { useState, useMemo } from 'react';
import { GroupOrder, MenuItem, CartItem, Order, MenuData } from '../types';
import { MenuImageLightbox } from './MenuImageLightbox';
import { ItemCustomizationModal } from './ItemCustomizationModal';
import { CartDrawer } from './CartDrawer';
import { OrderSuccessModal } from './OrderSuccessModal';
import { PublicOrderBoard } from './PublicOrderBoard';
import { triggerCelebration } from '../utils/orderHelpers';
import * as gasApi from '../services/gasApi';
import {
  Clock,
  Search,
  Plus,
  ShoppingBag,
  Sparkles,
  Users,
  Utensils,
  Maximize2,
  Share2,
  Check,
  Info,
  Calendar,
  Layers
} from 'lucide-react';

interface CustomerOrderPageProps {
  group: GroupOrder;
  orders: Order[];
  isLoadingOrders: boolean;
  onRefreshOrders: () => void;
  onOpenAdminLogin: () => void;
  allGroups: GroupOrder[];
  onSelectGroup: (groupId: string) => void;
}

export const CustomerOrderPage: React.FC<CustomerOrderPageProps> = ({
  group,
  orders,
  isLoadingOrders,
  onRefreshOrders,
  onOpenAdminLogin,
  allGroups,
  onSelectGroup,
}) => {
  // 檢視模式：菜單點餐 (menu) 或 點餐動態牆 (board)
  const [viewMode, setViewMode] = useState<'menu' | 'board'>('menu');

  // 搜尋與分類
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // 菜單大圖燈箱
  const [isLightboxOpen, setIsLightboxOpen] = useState<boolean>(false);

  // 餐點客製規格 Modal
  const [customizingItem, setCustomizingItem] = useState<MenuItem | null>(null);

  // 購物車清單
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState<boolean>(false);
  const [isSubmittingOrder, setIsSubmittingOrder] = useState<boolean>(false);

  // 訂單完成 Modal
  const [latestOrder, setLatestOrder] = useState<Order | null>(null);
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState<boolean>(false);

  // 分享連結複製回饋
  const [copiedLink, setCopiedLink] = useState<boolean>(false);

  // 解析菜單數據
  const menuData: MenuData = useMemo(() => {
    if (!group || !group.menu_json) return { categories: [] };
    if (typeof group.menu_json === 'string') {
      try {
        return JSON.parse(group.menu_json);
      } catch {
        return { categories: [] };
      }
    }
    return group.menu_json;
  }, [group?.menu_json]);

  // 分類清單
  const categories = useMemo(() => {
    return menuData.categories || [];
  }, [menuData]);

  // 過濾餐點
  const filteredCategories = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return categories
      .map(cat => {
        if (selectedCategory !== 'all' && cat.category_name !== selectedCategory) {
          return null;
        }
        const matchingItems = cat.items.filter(item => {
          if (!q) return true;
          return (
            item.name.toLowerCase().includes(q) ||
            (item.description && item.description.toLowerCase().includes(q))
          );
        });
        if (matchingItems.length === 0) return null;
        return {
          ...cat,
          items: matchingItems
        };
      })
      .filter(Boolean) as typeof categories;
  }, [categories, selectedCategory, searchQuery]);

  // 購物車總計
  const totalCartCount = cartItems.reduce((acc, item) => acc + item.quantity, 0);
  const totalCartAmount = cartItems.reduce((acc, item) => acc + item.price * item.quantity, 0);

  // 加入購物車
  const handleAddToCart = (newItem: CartItem) => {
    setCartItems(prev => {
      // 檢查是否有同品項且完全相同規格與備註
      const existingIdx = prev.findIndex(
        it =>
          it.itemId === newItem.itemId &&
          it.price === newItem.price &&
          it.itemNote === newItem.itemNote &&
          it.options.join(',') === newItem.options.join(',')
      );

      if (existingIdx > -1) {
        const copy = [...prev];
        copy[existingIdx].quantity += newItem.quantity;
        return copy;
      }
      return [...prev, newItem];
    });

    // 小提示動畫
    setIsCartOpen(true);
  };

  const handleUpdateQuantity = (cartItemId: string, newQty: number) => {
    if (newQty <= 0) {
      handleRemoveItem(cartItemId);
      return;
    }
    setCartItems(prev =>
      prev.map(i => (i.cartItemId === cartItemId ? { ...i, quantity: newQty } : i))
    );
  };

  const handleRemoveItem = (cartItemId: string) => {
    setCartItems(prev => prev.filter(i => i.cartItemId !== cartItemId));
  };

  // 送出訂單至 GAS
  const handleSubmitOrder = async (userName: string, note: string): Promise<boolean> => {
    if (cartItems.length === 0) return false;

    setIsSubmittingOrder(true);
    try {
      const orderPayload = {
        group_id: group.id,
        user_name: userName,
        items: cartItems,
        total_price: totalCartAmount,
        is_paid: false,
        note: note
      };

      const res = await gasApi.createOrder(orderPayload);
      if (res.success && res.data) {
        setLatestOrder(res.data);
        setCartItems([]);
        setIsCartOpen(false);
        setIsSuccessModalOpen(true);
        triggerCelebration();
        onRefreshOrders();
        return true;
      } else {
        alert(res.error || '訂單送出失敗，請檢查網路連線');
        return false;
      }
    } catch (err: any) {
      alert('送出訂單發生異常：' + (err.message || String(err)));
      return false;
    } finally {
      setIsSubmittingOrder(false);
    }
  };

  const handleCopyShareLink = () => {
    const url = window.location.href;
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  return (
    <div className="min-h-screen bg-neutral-50/60 text-neutral-800 flex flex-col pb-24 sm:pb-16">
      {/* 菜單大圖燈箱 Modal */}
      <MenuImageLightbox
        isOpen={isLightboxOpen}
        onClose={() => setIsLightboxOpen(false)}
        imageUrl={group.image_url}
        title={group.title}
      />

      {/* 餐點選項客製 Modal */}
      <ItemCustomizationModal
        item={customizingItem}
        isOpen={!!customizingItem}
        onClose={() => setCustomizingItem(null)}
        onAddToCart={handleAddToCart}
      />

      {/* 購物車抽屜 */}
      <CartDrawer
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        cartItems={cartItems}
        onUpdateQuantity={handleUpdateQuantity}
        onRemoveItem={handleRemoveItem}
        onSubmitOrder={handleSubmitOrder}
        isSubmitting={isSubmittingOrder}
        groupStatus={group.status}
        groupTitle={group.title}
      />

      {/* 下單成功收據 Modal */}
      <OrderSuccessModal
        order={latestOrder}
        isOpen={isSuccessModalOpen}
        onClose={() => setIsSuccessModalOpen(false)}
        onOrderAgain={() => setIsSuccessModalOpen(false)}
        onViewAllOrders={() => {
          setIsSuccessModalOpen(false);
          setViewMode('board');
        }}
        groupTitle={group.title}
      />

      {/* 前台頂部導覽列 */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-neutral-200/80 shadow-xs">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center font-black shadow-sm text-lg">
              🍱
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-base sm:text-lg text-neutral-900 tracking-tight">
                  揪團吃飽飽
                </span>
                <span className="hidden sm:inline-block text-[11px] font-semibold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full">
                  線上點餐
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* 多團購切換選單 (若有多個團購) */}
            {allGroups.length > 1 && (
              <select
                value={group.id}
                onChange={e => onSelectGroup(e.target.value)}
                className="text-xs bg-neutral-100 border border-neutral-200 rounded-lg px-2.5 py-1.5 font-bold text-neutral-700 focus:outline-none max-w-[140px] sm:max-w-[180px] truncate"
              >
                {allGroups.map(g => (
                  <option key={g.id} value={g.id}>
                    {g.title}
                  </option>
                ))}
              </select>
            )}

            <button
              onClick={handleCopyShareLink}
              className="p-2 sm:px-3 sm:py-1.5 text-xs font-bold text-neutral-700 bg-neutral-100 hover:bg-neutral-200 rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer"
              title="複製分享連結"
            >
              {copiedLink ? <Check className="w-4 h-4 text-emerald-600" /> : <Share2 className="w-4 h-4" />}
              <span className="hidden sm:inline">{copiedLink ? '已複製連結！' : '分享本團'}</span>
            </button>

            <button
              onClick={onOpenAdminLogin}
              className="px-3 py-1.5 text-xs font-bold text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 rounded-xl border border-neutral-200 transition-colors cursor-pointer"
            >
              後台管理
            </button>
          </div>
        </div>
      </header>

      {/* 主內容區 */}
      <main className="max-w-5xl mx-auto px-4 pt-4 sm:pt-6 w-full flex-1">
        {/* 團購橫幅資訊卡片 (包含菜單縮小圖與放大查看) */}
        <div className="bg-white rounded-3xl border border-neutral-200/90 shadow-sm p-5 sm:p-7 mb-6 overflow-hidden">
          <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
            {/* 左側文字資訊 */}
            <div className="space-y-3 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${
                    group.status === 'open'
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-red-100 text-red-800'
                  }`}
                >
                  <span
                    className={`w-2 h-2 rounded-full ${
                      group.status === 'open' ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'
                    }`}
                  />
                  {group.status === 'open' ? '進行中・歡迎點餐' : '已結單・停止接單'}
                </span>

                {group.deadline && (
                  <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-900 bg-amber-100 px-3 py-1 rounded-full">
                    <Clock className="w-3.5 h-3.5" />
                    截止時間：{group.deadline}
                  </span>
                )}

                <span className="text-xs text-neutral-600 flex items-center gap-1">
                  <Users className="w-3.5 h-3.5 text-neutral-600" />
                  已下單 {orders.length} 人
                </span>
              </div>

              <h1 className="text-xl sm:text-3xl font-black text-neutral-900 tracking-tight">
                {group.title}
              </h1>

              {group.description && (
                <div className="bg-amber-50/70 border border-amber-200/80 rounded-2xl p-3.5 text-xs sm:text-sm text-neutral-700 leading-relaxed flex items-start gap-2">
                  <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-amber-900">主揪公告：</span>
                    {group.description}
                  </div>
                </div>
              )}
            </div>

            {/* 右側：菜單圖片縮小圖 (點擊放大查看 - 核心需求) */}
            {group.image_url ? (
              <div className="shrink-0 flex flex-col items-center sm:items-end">
                <div
                  onClick={() => setIsLightboxOpen(true)}
                  className="relative group cursor-pointer w-44 sm:w-52 h-32 sm:h-36 rounded-2xl overflow-hidden shadow-md border-2 border-emerald-500/30 hover:border-emerald-500 hover:shadow-xl transition-all duration-200 bg-neutral-100"
                >
                  <img
                    src={group.image_url}
                    alt="菜單圖片"
                    className="w-full h-full object-cover group-hover:scale-108 transition-transform duration-300"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent flex flex-col justify-end p-2.5 text-white">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold flex items-center gap-1 drop-shadow-md">
                        <Maximize2 className="w-3.5 h-3.5" /> 菜單圖片
                      </span>
                      <span className="text-[10px] bg-emerald-600/90 px-1.5 py-0.5 rounded font-medium">
                        點擊放大
                      </span>
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsLightboxOpen(true)}
                  className="text-xs font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-1 mt-1.5 transition-colors cursor-pointer"
                >
                  <Maximize2 className="w-3 h-3" />
                  <span>查看菜單大圖 (可縮放)</span>
                </button>
              </div>
            ) : null}
          </div>

          {/* 導覽頁籤切換：菜單點餐 vs 點餐現況牆 */}
          <div className="flex items-center gap-3 mt-6 pt-4 border-t border-neutral-100">
            <button
              onClick={() => setViewMode('menu')}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                viewMode === 'menu'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'bg-neutral-100 hover:bg-neutral-200 text-neutral-700'
              }`}
            >
              <Utensils className="w-4 h-4" />
              <span>菜單挑選點餐</span>
            </button>
            <button
              onClick={() => setViewMode('board')}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                viewMode === 'board'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'bg-neutral-100 hover:bg-neutral-200 text-neutral-700'
              }`}
            >
              <Users className="w-4 h-4" />
              <span>大家點了什麼 ({orders.length})</span>
            </button>
          </div>
        </div>

        {/* 檢視 1: 點餐現況動態牆 */}
        {viewMode === 'board' && (
          <div className="space-y-4">
            <PublicOrderBoard
              orders={orders}
              isLoading={isLoadingOrders}
              onRefresh={onRefreshOrders}
              groupTitle={group.title}
            />
          </div>
        )}

        {/* 檢視 2: 菜單清單 */}
        {viewMode === 'menu' && (
          <div className="space-y-6">
            {/* 分類導覽與搜尋條 */}
            <div className="sticky top-[58px] z-20 bg-neutral-50/95 backdrop-blur-md py-2 space-y-2">
              <div className="flex flex-col sm:flex-row gap-2">
                {/* 搜尋欄位 */}
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-neutral-600 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder="搜尋便當、飲料或餐點名稱..."
                    className="w-full pl-9 pr-4 py-2 text-xs sm:text-sm bg-white rounded-xl border border-neutral-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-neutral-600 hover:text-neutral-900"
                    >
                      清除
                    </button>
                  )}
                </div>

                {/* 分類橫向滾動標籤 */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
                  <button
                    onClick={() => setSelectedCategory('all')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-colors cursor-pointer ${
                      selectedCategory === 'all'
                        ? 'bg-neutral-900 text-white shadow-xs'
                        : 'bg-white text-neutral-700 border border-neutral-200 hover:bg-neutral-100'
                    }`}
                  >
                    全部 ({categories.reduce((acc, c) => acc + c.items.length, 0)})
                  </button>
                  {categories.map((cat, i) => (
                    <button
                      key={i}
                      onClick={() => setSelectedCategory(cat.category_name)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-colors cursor-pointer ${
                        selectedCategory === cat.category_name
                          ? 'bg-emerald-600 text-white shadow-xs'
                          : 'bg-white text-neutral-700 border border-neutral-200 hover:bg-neutral-100'
                      }`}
                    >
                      {cat.category_name} ({cat.items.length})
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* 菜單各分類與品項 */}
            {filteredCategories.length === 0 ? (
              <div className="p-12 text-center bg-white rounded-2xl border border-neutral-200 space-y-2">
                <Search className="w-10 h-10 text-neutral-300 mx-auto stroke-1" />
                <p className="text-neutral-700 font-bold text-sm">找不到符合條件的餐點</p>
                <p className="text-neutral-600 text-xs">試試其他關鍵字或重設分類標籤</p>
              </div>
            ) : (
              filteredCategories.map((cat, catIdx) => (
                <div key={catIdx} className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Layers className="w-4 h-4 text-emerald-600" />
                    <h3 className="font-extrabold text-base sm:text-lg text-neutral-800">
                      {cat.category_name}
                    </h3>
                    <span className="text-xs text-neutral-600">({cat.items.length})</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                    {cat.items.map(item => {
                      // 尋找已在購物車裡的數量
                      const inCartQty = cartItems
                        .filter(c => c.itemId === item.id)
                        .reduce((sum, c) => sum + c.quantity, 0);

                      const hasOptions =
                        Array.isArray(item.options) && item.options.length > 0;

                      return (
                        <div
                          key={item.id}
                          className="bg-white rounded-2xl border border-neutral-200/80 hover:border-emerald-300 p-4 shadow-xs hover:shadow-md transition-all flex flex-col justify-between group"
                        >
                          <div className="space-y-2">
                            <div className="flex items-start justify-between gap-2">
                              <h4 className="font-bold text-neutral-900 text-base group-hover:text-emerald-700 transition-colors">
                                {item.name}
                              </h4>
                              <div className="text-emerald-800 font-black text-base shrink-0">
                                NT$ {item.price}
                              </div>
                            </div>

                            {item.description && (
                              <p className="text-xs text-neutral-600 line-clamp-2 leading-relaxed">
                                {item.description}
                              </p>
                            )}

                            {/* 規格標籤預覽 */}
                            {hasOptions && (
                              <div className="flex flex-wrap gap-1 pt-1">
                                {item.options?.slice(0, 3).map((opt, optIdx) => (
                                  <span
                                    key={optIdx}
                                    className="text-[11px] bg-neutral-100 text-neutral-600 px-2 py-0.5 rounded-md"
                                  >
                                    {typeof opt === 'string' ? opt : opt.name}
                                  </span>
                                ))}
                                {(item.options?.length || 0) > 3 && (
                                  <span className="text-[11px] text-neutral-600">
                                    +{(item.options?.length || 0) - 3}種客製
                                  </span>
                                )}
                              </div>
                            )}
                          </div>

                          <div className="flex items-center justify-between pt-3 mt-3 border-t border-neutral-100">
                            {inCartQty > 0 ? (
                              <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">
                                已選 {inCartQty} 份
                              </span>
                            ) : (
                              <span className="text-[11px] text-neutral-600">
                                {hasOptions ? '多種規格可選' : '單一規格'}
                              </span>
                            )}

                            <button
                              type="button"
                              onClick={() => setCustomizingItem(item)}
                              disabled={group.status === 'closed'}
                              className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-neutral-200 disabled:text-neutral-600 disabled:cursor-not-allowed active:scale-95 text-white text-xs font-bold rounded-xl flex items-center gap-1 shadow-sm transition-all cursor-pointer"
                            >
                              <Plus className="w-3.5 h-3.5" />
                              <span>點餐</span>
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </main>

      {/* 底部浮動購物車欄位 */}
      {cartItems.length > 0 && (
        <aside aria-label="購物車摘要" className="fixed bottom-4 left-4 right-4 max-w-lg mx-auto z-40 animate-in slide-in-from-bottom-4 duration-200">
          <div
            onClick={() => setIsCartOpen(true)}
            className="bg-neutral-900 text-white rounded-2xl p-3.5 shadow-2xl flex items-center justify-between cursor-pointer hover:bg-neutral-800 transition-colors border border-neutral-700/50"
          >
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="w-10 h-10 rounded-xl bg-emerald-500 text-white flex items-center justify-center font-black">
                  <ShoppingBag className="w-5 h-5" />
                </div>
                <span className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white text-[11px] font-black rounded-full flex items-center justify-center ring-2 ring-neutral-900">
                  {totalCartCount}
                </span>
              </div>
              <div>
                <div className="text-xs text-neutral-400">已選 {totalCartCount} 份餐點</div>
                <div className="text-lg font-black text-white">NT$ {totalCartAmount}</div>
              </div>
            </div>

            <button
              type="button"
              onClick={e => {
                e.stopPropagation();
                setIsCartOpen(true);
              }}
              className="py-2 px-4 bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white text-xs font-bold rounded-xl shadow-md transition-all flex items-center gap-1"
            >
              <span>查看清單並下單</span>
            </button>
          </div>
        </aside>
      )}
    </div>
  );
};
