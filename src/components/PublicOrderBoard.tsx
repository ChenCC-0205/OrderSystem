import React from 'react';
import { Order } from '../types';
import { Users, CheckCircle2, Clock, RefreshCw, Utensils } from 'lucide-react';

interface PublicOrderBoardProps {
  orders: Order[];
  isLoading: boolean;
  onRefresh: () => void;
  groupTitle: string;
}

export const PublicOrderBoard: React.FC<PublicOrderBoardProps> = ({
  orders,
  isLoading,
  onRefresh,
  groupTitle
}) => {
  const totalCount = orders.reduce(
    (acc, ord) => acc + ord.items.reduce((s, i) => s + i.quantity, 0),
    0
  );
  const totalAmount = orders.reduce((acc, ord) => acc + ord.total_price, 0);

  return (
    <div className="bg-white rounded-2xl border border-neutral-200/80 shadow-xs overflow-hidden">
      {/* 標題列 */}
      <div className="p-4 sm:p-5 border-b border-neutral-100 flex items-center justify-between bg-neutral-50/60">
        <div className="flex items-center gap-2">
          <Users className="w-5 h-5 text-emerald-600" />
          <h3 className="font-bold text-neutral-800 text-base">本團點餐現況 ({orders.length} 人跟單)</h3>
        </div>

        <button
          onClick={onRefresh}
          disabled={isLoading}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-neutral-600 hover:text-neutral-900 bg-white border border-neutral-200 rounded-lg hover:bg-neutral-50 transition-colors cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-emerald-600' : ''}`} />
          <span>{isLoading ? '同步中...' : '重新整理'}</span>
        </button>
      </div>

      {/* 統計摘要條 */}
      <div className="grid grid-cols-2 sm:grid-cols-3 divide-x divide-neutral-100 border-b border-neutral-100 bg-emerald-50/40 text-center py-3">
        <div>
          <span className="text-xs text-neutral-600">已訂人數</span>
          <div className="text-lg font-black text-neutral-800">{orders.length} 人</div>
        </div>
        <div>
          <span className="text-xs text-neutral-600">餐點總份數</span>
          <div className="text-lg font-black text-emerald-800">{totalCount} 份</div>
        </div>
        <div className="col-span-2 sm:col-span-1 pt-2 sm:pt-0 border-t sm:border-t-0 border-neutral-100">
          <span className="text-xs text-neutral-600">目前累積總額</span>
          <div className="text-lg font-black text-amber-600">NT$ {totalAmount}</div>
        </div>
      </div>

      {/* 訂單清單 */}
      <div className="divide-y divide-neutral-100 max-h-[500px] overflow-y-auto">
        {orders.length === 0 ? (
          <div className="p-10 text-center text-neutral-600">
            <Utensils className="w-10 h-10 mx-auto text-neutral-300 stroke-1 mb-2" />
            <p className="text-sm font-medium">目前還沒有人下單</p>
            <p className="text-xs text-neutral-600 mt-1">搶先當第一位點餐者吧！</p>
          </div>
        ) : (
          orders.map((order, index) => (
            <div key={order.id || index} className="p-4 hover:bg-neutral-50/70 transition-colors">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-2.5">
                  <div className="w-7 h-7 rounded-full bg-neutral-100 text-neutral-600 text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                    {index + 1}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-neutral-800 text-sm">
                        {order.user_name}
                      </span>
                      {order.is_paid ? (
                        <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-700">
                          <CheckCircle2 className="w-3 h-3" />
                          已付款
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-100 text-amber-800">
                          <Clock className="w-3 h-3" />
                          待付款
                        </span>
                      )}
                    </div>

                    {/* 品項明細 */}
                    <div className="mt-1.5 space-y-1">
                      {order.items.map((item, itemIdx) => (
                        <div key={itemIdx} className="text-xs text-neutral-700 flex items-center gap-1.5">
                          <span className="font-semibold text-neutral-800">
                            • {item.name} x {item.quantity}
                          </span>
                          {item.options.length > 0 && (
                            <span className="text-neutral-600">
                              ({item.options.join(', ')})
                            </span>
                          )}
                          {item.itemNote && (
                            <span className="text-amber-700 bg-amber-50 px-1.5 py-0.2 rounded text-[11px]">
                              備註: {item.itemNote}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>

                    {order.note && (
                      <p className="text-xs text-neutral-600 mt-1 italic">
                        💬 留言：{order.note}
                      </p>
                    )}
                  </div>
                </div>

                {/* 金額與時間 */}
                <div className="text-right shrink-0">
                  <div className="font-extrabold text-sm text-neutral-800">
                    NT$ {order.total_price}
                  </div>
                  <div className="text-[11px] text-neutral-600">
                    {order.created_at ? new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
