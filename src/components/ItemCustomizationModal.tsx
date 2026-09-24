import React, { useState } from 'react';
import { MenuItem, CartItem } from '../types';
import { X, Plus, Minus, Check, ShoppingBag } from 'lucide-react';

interface ItemCustomizationModalProps {
  item: MenuItem | null;
  isOpen: boolean;
  onClose: () => void;
  onAddToCart: (cartItem: CartItem) => void;
}

export const ItemCustomizationModal: React.FC<ItemCustomizationModalProps> = ({
  item,
  isOpen,
  onClose,
  onAddToCart,
}) => {
  const [selectedOptions, setSelectedOptions] = useState<string[]>([]);
  const [quantity, setQuantity] = useState<number>(1);
  const [itemNote, setItemNote] = useState<string>('');

  // 重設表單
  React.useEffect(() => {
    if (isOpen && item) {
      setSelectedOptions([]);
      setQuantity(1);
      setItemNote('');
    }
  }, [isOpen, item]);

  if (!isOpen || !item) return null;

  // 計算選項加價 (例如: "加一顆滷蛋(+15)" -> extra 15)
  const calculateOptionExtra = (opt: string): number => {
    const match = opt.match(/\+(\d+)/);
    if (match && match[1]) {
      return parseInt(match[1], 10);
    }
    return 0;
  };

  // 單價含已選加價
  const extraTotal = selectedOptions.reduce((acc, opt) => acc + calculateOptionExtra(opt), 0);
  const unitPrice = item.price + extraTotal;
  const totalPrice = unitPrice * quantity;

  const toggleOption = (optName: string) => {
    setSelectedOptions(prev => {
      if (prev.includes(optName)) {
        return prev.filter(o => o !== optName);
      } else {
        return [...prev, optName];
      }
    });
  };

  const handleConfirm = () => {
    const cartItem: CartItem = {
      cartItemId: 'c_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
      itemId: item.id,
      name: item.name,
      price: unitPrice,
      quantity,
      options: selectedOptions,
      itemNote: itemNote.trim() || undefined
    };

    onAddToCart(cartItem);
    onClose();
  };

  // 整理選項清單（可能為 string 或物件）
  const optionsList: string[] = [];
  if (Array.isArray(item.options)) {
    item.options.forEach(opt => {
      if (typeof opt === 'string') {
        optionsList.push(opt);
      } else if (opt && typeof opt === 'object' && opt.choices) {
        opt.choices.forEach(c => optionsList.push(`${opt.name}: ${c}`));
      }
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden border border-neutral-100 flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-150"
        onClick={e => e.stopPropagation()}
      >
        {/* 頂部標題 */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-100 bg-neutral-50/70">
          <div>
            <h3 className="text-xl font-bold text-neutral-800">{item.name}</h3>
            <div className="text-emerald-700 font-extrabold text-lg mt-0.5">
              NT$ {item.price}
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-neutral-400 hover:text-neutral-700 hover:bg-neutral-200/60 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 內容滾動區 */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-neutral-700">
          {item.description && (
            <p className="text-sm text-neutral-600 bg-amber-50/70 border border-amber-100 p-3 rounded-xl leading-relaxed">
              {item.description}
            </p>
          )}

          {/* 規格 / 客製選項 */}
          {optionsList.length > 0 && (
            <div>
              <label className="block text-sm font-bold text-neutral-800 mb-2">
                規格與配料調整 <span className="text-xs text-neutral-600 font-normal">(可複選)</span>
              </label>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-2">
                {optionsList.map(opt => {
                  const isSelected = selectedOptions.includes(opt);
                  const extra = calculateOptionExtra(opt);
                  return (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => toggleOption(opt)}
                      className={`flex items-center justify-between p-3 rounded-xl border text-left text-sm font-medium transition-all ${
                        isSelected
                          ? 'border-emerald-500 bg-emerald-50/80 text-emerald-900 ring-2 ring-emerald-500/20 shadow-sm'
                          : 'border-neutral-200 hover:border-neutral-300 hover:bg-neutral-50 text-neutral-700'
                      }`}
                    >
                      <span className="truncate pr-1">{opt}</span>
                      <div className="flex items-center gap-1 shrink-0">
                        {extra > 0 && (
                          <span className="text-xs text-emerald-600 font-semibold">
                            +{extra}
                          </span>
                        )}
                        <div
                          className={`w-4 h-4 rounded flex items-center justify-center border ${
                            isSelected
                              ? 'bg-emerald-600 border-emerald-600 text-white'
                              : 'border-neutral-300 bg-white'
                          }`}
                        >
                          {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* 特殊要求 / 備註 */}
          <div>
            <label className="block text-sm font-bold text-neutral-800 mb-1.5">
              個人特殊備註需求 <span className="text-xs text-neutral-600 font-normal">(選填)</span>
            </label>
            <input
              type="text"
              value={itemNote}
              onChange={e => setItemNote(e.target.value)}
              placeholder="例如：醬少一點、不要辣、不要免洗餐具..."
              className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 text-sm"
            />
          </div>

          {/* 數量選擇 */}
          <div className="flex items-center justify-between pt-2 border-t border-neutral-100">
            <span className="text-sm font-bold text-neutral-800">購買數量</span>
            <div className="flex items-center gap-3 bg-neutral-100 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => setQuantity(q => Math.max(1, q - 1))}
                disabled={quantity <= 1}
                className="w-8 h-8 rounded-lg bg-white shadow-xs flex items-center justify-center text-neutral-700 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-neutral-50 active:scale-95 transition-all"
              >
                <Minus className="w-4 h-4" />
              </button>
              <span className="w-8 text-center font-bold text-neutral-800 text-base">
                {quantity}
              </span>
              <button
                type="button"
                onClick={() => setQuantity(q => q + 1)}
                className="w-8 h-8 rounded-lg bg-white shadow-xs flex items-center justify-center text-neutral-700 hover:bg-neutral-50 active:scale-95 transition-all"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* 底部動作列 */}
        <div className="p-4 bg-neutral-50 border-t border-neutral-100 flex items-center justify-between gap-3">
          <div className="pl-2">
            <div className="text-xs text-neutral-600">小計金額</div>
            <div className="text-xl font-black text-emerald-800">
              NT$ {totalPrice}
            </div>
          </div>
          <button
            type="button"
            onClick={handleConfirm}
            className="flex-1 max-w-xs flex items-center justify-center gap-2 py-3 px-5 bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white font-bold rounded-xl shadow-md shadow-emerald-600/20 transition-all cursor-pointer"
          >
            <ShoppingBag className="w-5 h-5" />
            <span>加入點購清單</span>
          </button>
        </div>
      </div>
    </div>
  );
};
