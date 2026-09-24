import React, { useState, useEffect } from 'react';
import { CartItem } from '../types';
import { X, Trash2, Plus, Minus, Send, AlertCircle, Sparkles, User, MessageSquare } from 'lucide-react';

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  cartItems: CartItem[];
  onUpdateQuantity: (cartItemId: string, newQty: number) => void;
  onRemoveItem: (cartItemId: string) => void;
  onSubmitOrder: (userName: string, note: string) => Promise<boolean>;
  isSubmitting: boolean;
  groupStatus: 'open' | 'closed';
  groupTitle: string;
}

export const CartDrawer: React.FC<CartDrawerProps> = ({
  isOpen,
  onClose,
  cartItems,
  onUpdateQuantity,
  onRemoveItem,
  onSubmitOrder,
  isSubmitting,
  groupStatus,
  groupTitle,
}) => {
  const [userName, setUserName] = useState<string>('');
  const [note, setNote] = useState<string>('');
  const [validationError, setValidationError] = useState<string>('');

  // 讀取上次使用的訂購人姓名
  useEffect(() => {
    const savedName = localStorage.getItem('last_group_order_name');
    if (savedName) {
      setUserName(savedName);
    }
  }, []);

  const totalAmount = cartItems.reduce((acc, item) => acc + item.price * item.quantity, 0);
  const totalCount = cartItems.reduce((acc, item) => acc + item.quantity, 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError('');

    if (groupStatus === 'closed') {
      setValidationError('抱歉，此團購已結單截止，無法再送出訂單。');
      return;
    }

    if (!userName.trim()) {
      setValidationError('請輸入訂購人姓名（方便主揪核對餐點與收費）');
      return;
    }

    if (cartItems.length === 0) {
      setValidationError('點購清單目前是空的，請先挑選餐點');
      return;
    }

    // 儲存姓名方便下次直接使用
    localStorage.setItem('last_group_order_name', userName.trim());

    const success = await onSubmitOrder(userName.trim(), note.trim());
    if (success) {
      setNote('');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/60 backdrop-blur-xs flex justify-end animate-in fade-in duration-200">
      <div 
        className="w-full max-w-md bg-white h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-200"
        onClick={e => e.stopPropagation()}
      >
        {/* Drawer 頂部 */}
        <div className="p-4 border-b border-neutral-100 flex items-center justify-between bg-neutral-50/80">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
              {totalCount}
            </div>
            <div>
              <h3 className="font-bold text-neutral-800 text-base">我的點購清單</h3>
              <p className="text-xs text-neutral-600 truncate max-w-[200px]">{groupTitle}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-neutral-400 hover:text-neutral-700 hover:bg-neutral-200/50 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 結單警告 (若已結單) */}
        {groupStatus === 'closed' && (
          <div className="p-3 bg-red-50 border-b border-red-100 text-red-700 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
            <span>目前團購已設定為【已結單】狀態，暫停接收新訂單。</span>
          </div>
        )}

        {/* 餐點品項列表 */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {cartItems.length === 0 ? (
            <div className="h-64 flex flex-col items-center justify-center text-neutral-600 space-y-2">
              <Sparkles className="w-10 h-10 text-neutral-300 stroke-1" />
              <p className="text-sm font-medium">您的清單還是空的</p>
              <p className="text-xs text-neutral-600">從菜單點擊「+ 點餐」挑選喜愛的餐點吧！</p>
            </div>
          ) : (
            cartItems.map(item => (
              <div
                key={item.cartItemId}
                className="p-3.5 rounded-xl border border-neutral-100 bg-neutral-50/50 hover:bg-neutral-50 transition-colors space-y-2"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h4 className="font-bold text-neutral-800 text-sm">{item.name}</h4>
                    {item.options.length > 0 && (
                      <p className="text-xs text-neutral-600 mt-0.5">
                        規格：{item.options.join('、')}
                      </p>
                    )}
                    {item.itemNote && (
                      <p className="text-xs text-amber-700 bg-amber-50 px-2 py-0.5 rounded mt-1 inline-block">
                        備註：{item.itemNote}
                      </p>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    <div className="font-bold text-sm text-neutral-800">
                      NT$ {item.price * item.quantity}
                    </div>
                    {item.quantity > 1 && (
                      <div className="text-xs text-neutral-600">
                        (${item.price}/份)
                      </div>
                    )}
                  </div>
                </div>

                {/* 數量調整與刪除 */}
                <div className="flex items-center justify-between pt-1 border-t border-neutral-100/80">
                  <button
                    type="button"
                    onClick={() => onRemoveItem(item.cartItemId)}
                    className="text-xs text-neutral-600 hover:text-red-600 flex items-center gap-1 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>刪除</span>
                  </button>

                  <div className="flex items-center gap-2 bg-white px-2 py-1 rounded-lg border border-neutral-200">
                    <button
                      type="button"
                      onClick={() => onUpdateQuantity(item.cartItemId, item.quantity - 1)}
                      className="w-5 h-5 flex items-center justify-center text-neutral-600 hover:text-neutral-900"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className="text-xs font-bold text-neutral-800 w-4 text-center">
                      {item.quantity}
                    </span>
                    <button
                      type="button"
                      onClick={() => onUpdateQuantity(item.cartItemId, item.quantity + 1)}
                      className="w-5 h-5 flex items-center justify-center text-neutral-600 hover:text-neutral-900"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* 訂購人資訊與送出區 */}
        {cartItems.length > 0 && (
          <form onSubmit={handleSubmit} className="p-4 bg-neutral-50/90 border-t border-neutral-200/80 space-y-3">
            {validationError && (
              <div className="p-2.5 bg-red-100/80 border border-red-200 rounded-lg text-xs text-red-700 flex items-center gap-1.5 font-medium">
                <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
                <span>{validationError}</span>
              </div>
            )}

            {/* 訂購人姓名 */}
            <div>
              <label className="block text-xs font-bold text-neutral-700 mb-1 flex items-center gap-1">
                <User className="w-3.5 h-3.5 text-emerald-600" />
                <span>訂購人姓名 / 部門 / 稱呼</span>
                <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={userName}
                onChange={e => setUserName(e.target.value)}
                placeholder="例如：王大明 (技術部) 或 Alice"
                className="w-full px-3 py-2 text-sm bg-white rounded-xl border border-neutral-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500"
              />
            </div>

            {/* 訂單備註 */}
            <div>
              <label className="block text-xs font-medium text-neutral-600 mb-1 flex items-center gap-1">
                <MessageSquare className="w-3.5 h-3.5 text-neutral-600" />
                <span>總體備註 (分機 / 座位 / 繳費方式)</span>
              </label>
              <input
                type="text"
                value={note}
                onChange={e => setNote(e.target.value)}
                placeholder="例如：4F B02 / 已 Line Pay 轉帳"
                className="w-full px-3 py-2 text-sm bg-white rounded-xl border border-neutral-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500"
              />
            </div>

            {/* 金額匯總 */}
            <div className="pt-2 border-t border-neutral-200/80 flex items-center justify-between">
              <div>
                <span className="text-xs text-neutral-600">總金額 ({totalCount} 份餐點)</span>
                <div className="text-2xl font-black text-emerald-800">
                  NT$ {totalAmount}
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting || groupStatus === 'closed'}
                className="py-3 px-6 bg-emerald-600 hover:bg-emerald-700 disabled:bg-neutral-300 disabled:cursor-not-allowed active:scale-98 text-white font-bold rounded-xl shadow-md shadow-emerald-600/20 transition-all flex items-center gap-2 cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>傳送訂單中...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>送出訂單</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
