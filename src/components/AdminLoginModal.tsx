import React, { useState } from 'react';
import { Lock, Eye, EyeOff, X, KeyRound, ShieldAlert } from 'lucide-react';

interface AdminLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: () => void;
}

export const ADMIN_PASSCODE_STORAGE_KEY = 'group_order_admin_pwd';

export function getAdminPasscode(): string {
  if (typeof window === 'undefined') return 'admin888';
  return localStorage.getItem(ADMIN_PASSCODE_STORAGE_KEY) || 'admin888';
}

export function setAdminPasscode(newPwd: string): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem(ADMIN_PASSCODE_STORAGE_KEY, newPwd.trim());
  }
}

export const AdminLoginModal: React.FC<AdminLoginModalProps> = ({
  isOpen,
  onClose,
  onLoginSuccess,
}) => {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const targetPassword = getAdminPasscode();
    if (password === targetPassword) {
      // 記錄登入狀態
      sessionStorage.setItem('is_group_admin_logged_in', 'true');
      setPassword('');
      onLoginSuccess();
      onClose();
    } else {
      setError('密碼不正確，請重新輸入 (預設密碼為 admin888)');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="w-full max-w-sm bg-white rounded-2xl shadow-2xl overflow-hidden border border-neutral-100 p-6 animate-in zoom-in-95 duration-150"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <Lock className="w-4 h-4" />
            </div>
            <h3 className="font-bold text-neutral-800 text-base">後台管理員登入</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 rounded-full transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <p className="text-xs text-neutral-500">
            請輸入主揪管理員密碼以進入後台開團、編輯菜單及管理訂單收款。
          </p>

          {error && (
            <div className="p-2.5 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 shrink-0 text-red-500" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-neutral-700 mb-1">
              管理密碼
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                required
                autoFocus
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="預設密碼：admin888"
                className="w-full pl-3 pr-10 py-2.5 text-sm bg-neutral-50 rounded-xl border border-neutral-200 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500"
              />
              <button
                type="button"
                onClick={() => setShowPassword(p => !p)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <div className="mt-1 flex items-center justify-between text-[11px] text-neutral-600">
              <span>預設密碼：admin888</span>
              <span className="flex items-center gap-1">
                <KeyRound className="w-3 h-3 text-neutral-600" /> 登入後可修改
              </span>
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white font-bold rounded-xl shadow-md shadow-emerald-600/20 text-sm transition-all cursor-pointer"
            >
              驗證並登入後台
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
