import React, { useState } from 'react';
import { Order } from '../types';
import { CheckCircle2, Copy, Check, Users, PlusCircle, X } from 'lucide-react';

interface OrderSuccessModalProps {
  order: Order | null;
  isOpen: boolean;
  onClose: () => void;
  onOrderAgain: () => void;
  onViewAllOrders: () => void;
  groupTitle: string;
}

export const OrderSuccessModal: React.FC<OrderSuccessModalProps> = ({
  order,
  isOpen,
  onClose,
  onOrderAgain,
  onViewAllOrders,
  groupTitle,
}) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen || !order) return null;

  const handleCopyOrder = () => {
    const itemsText = order.items
      .map(i => `${i.name} x ${i.quantity} (${i.options.join(', ') || '無特殊規格'})`)
      .join('\n• ');

    const text = `🎉【${groupTitle}】點餐成功！\n訂購人：${order.user_name}\n點購品項：\n• ${itemsText}\n訂單金額：NT$ ${order.total_price} 元\n備註：${order.note || '無'}\n訂單編號：${order.id}`;

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden border border-neutral-100 animate-in zoom-in-95 duration-150 flex flex-col text-neutral-800"
        onClick={e => e.stopPropagation()}
      >
        {/* 頂部彩頭 */}
        <div className="p-6 bg-gradient-to-b from-emerald-500 to-teal-600 text-white text-center relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 text-white/80 hover:text-white hover:bg-white/10 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="w-16 h-16 bg-white/20 backdrop-blur-xs rounded-full flex items-center justify-center mx-auto mb-3 ring-4 ring-white/30">
            <CheckCircle2 className="w-10 h-10 text-white" />
          </div>
          <h3 className="text-2xl font-black tracking-tight">訂餐成功！</h3>
          <p className="text-emerald-100 text-sm mt-1">訂單已成功送達雲端試算表</p>
        </div>

        {/* 訂單內容摘要 */}
        <div className="p-6 space-y-4">
          <div className="bg-neutral-50 rounded-xl p-4 border border-neutral-100 space-y-2 text-sm">
            <div className="flex justify-between items-center pb-2 border-b border-neutral-200">
              <span className="text-neutral-600">訂購人</span>
              <span className="font-bold text-neutral-800">{order.user_name}</span>
            </div>
            <div className="flex justify-between items-center pb-2 border-b border-neutral-200">
              <span className="text-neutral-600">訂單金額</span>
              <span className="font-black text-emerald-800 text-lg">NT$ {order.total_price}</span>
            </div>
            {order.note && (
              <div className="flex justify-between items-start pb-2 border-b border-neutral-200">
                <span className="text-neutral-600">備註留言</span>
                <span className="text-neutral-700 text-right max-w-[200px]">{order.note}</span>
              </div>
            )}
            <div className="pt-1">
              <span className="text-xs text-neutral-600 block mb-1">點購餐點：</span>
              <div className="space-y-1">
                {order.items.map((item, idx) => (
                  <div key={idx} className="flex justify-between text-xs text-neutral-700">
                    <span className="truncate max-w-[240px]">
                      {item.name} x {item.quantity} {item.options.length > 0 && `(${item.options.join(',')})`}
                    </span>
                    <span className="font-medium shrink-0">NT$ {item.price * item.quantity}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* 溫馨提示 */}
          <div className="p-3 bg-amber-50 rounded-xl border border-amber-200/70 text-amber-800 text-xs flex items-center gap-2">
            <span>💡 提醒：請記得依照主揪規定的方式完成付款喔！</span>
          </div>

          {/* 動作按鈕組 */}
          <div className="space-y-2 pt-2">
            <button
              onClick={handleCopyOrder}
              className="w-full py-2.5 px-4 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold rounded-xl border border-emerald-200 flex items-center justify-center gap-2 text-sm transition-colors cursor-pointer"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
              <span>{copied ? '已複製訂單文字到剪貼簿！' : '複製我的點餐明細 (傳 LINE)'}</span>
            </button>

            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={onViewAllOrders}
                className="py-2.5 px-3 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 font-bold rounded-xl flex items-center justify-center gap-1.5 text-xs transition-colors cursor-pointer"
              >
                <Users className="w-4 h-4" />
                <span>看大家點了什麼</span>
              </button>

              <button
                onClick={onOrderAgain}
                className="py-2.5 px-3 bg-neutral-900 hover:bg-neutral-800 text-white font-bold rounded-xl flex items-center justify-center gap-1.5 text-xs transition-colors cursor-pointer"
              >
                <PlusCircle className="w-4 h-4" />
                <span>幫同事再訂一份</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
