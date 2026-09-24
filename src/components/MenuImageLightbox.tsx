import React, { useState, useEffect } from 'react';
import { X, ZoomIn, ZoomOut, RotateCcw, ExternalLink, Image as ImageIcon } from 'lucide-react';

interface MenuImageLightboxProps {
  imageUrl?: string;
  isOpen: boolean;
  onClose: () => void;
  title?: string;
}

export const MenuImageLightbox: React.FC<MenuImageLightboxProps> = ({
  imageUrl,
  isOpen,
  onClose,
  title = '菜單大圖'
}) => {
  const [scale, setScale] = useState<number>(1);
  const [position, setPosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // 重置縮放
  const resetZoom = () => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
  };

  useEffect(() => {
    if (isOpen) {
      resetZoom();
      // 防止背景滾動
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  // 鍵盤 ESC 關閉
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !imageUrl) return null;

  const zoomIn = () => setScale(prev => Math.min(prev + 0.3, 3.5));
  const zoomOut = () => setScale(prev => Math.max(prev - 0.3, 0.6));

  const handleMouseDown = (e: React.MouseEvent) => {
    if (scale > 1) {
      setIsDragging(true);
      setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging && scale > 1) {
      setPosition({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black/90 backdrop-blur-md animate-in fade-in duration-200">
      {/* 頂部操作工具列 */}
      <div className="flex items-center justify-between px-4 py-3 bg-neutral-900/80 border-b border-neutral-800 text-white select-none">
        <div className="flex items-center gap-2">
          <ImageIcon className="w-5 h-5 text-amber-400" />
          <span className="font-medium text-sm md:text-base truncate max-w-[200px] md:max-w-md">
            {title}
          </span>
          <span className="text-xs text-neutral-400 bg-neutral-800 px-2 py-0.5 rounded-full">
            {Math.round(scale * 100)}%
          </span>
        </div>

        {/* 控制按鈕組 */}
        <div className="flex items-center gap-1.5 md:gap-2">
          <button
            onClick={zoomOut}
            className="p-1.5 md:p-2 text-neutral-300 hover:text-white hover:bg-neutral-800 rounded-lg transition-colors"
            title="縮小"
          >
            <ZoomOut className="w-4 h-4 md:w-5 md:h-5" />
          </button>
          <button
            onClick={zoomIn}
            className="p-1.5 md:p-2 text-neutral-300 hover:text-white hover:bg-neutral-800 rounded-lg transition-colors"
            title="放大"
          >
            <ZoomIn className="w-4 h-4 md:w-5 md:h-5" />
          </button>
          <button
            onClick={resetZoom}
            className="p-1.5 md:p-2 text-neutral-300 hover:text-white hover:bg-neutral-800 rounded-lg transition-colors"
            title="重設大小"
          >
            <RotateCcw className="w-4 h-4 md:w-5 md:h-5" />
          </button>
          <a
            href={imageUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="p-1.5 md:p-2 text-neutral-300 hover:text-white hover:bg-neutral-800 rounded-lg transition-colors flex items-center"
            title="在新分頁開啟原圖"
          >
            <ExternalLink className="w-4 h-4 md:w-5 md:h-5" />
          </a>
          <div className="h-5 w-[1px] bg-neutral-700 mx-1" />
          <button
            onClick={onClose}
            className="p-1.5 md:p-2 bg-red-600/80 hover:bg-red-600 text-white rounded-lg transition-colors flex items-center gap-1 text-sm font-medium"
            title="關閉 (ESC)"
          >
            <X className="w-4 h-4 md:w-5 md:h-5" />
            <span className="hidden md:inline">關閉</span>
          </button>
        </div>
      </div>

      {/* 圖片預覽容器 */}
      <div
        className="flex-1 overflow-hidden flex items-center justify-center p-2 md:p-6 cursor-grab active:cursor-grabbing select-none"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        <div
          style={{
            transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
            transition: isDragging ? 'none' : 'transform 0.15s ease-out'
          }}
          className="max-w-full max-h-full flex items-center justify-center"
        >
          <img
            src={imageUrl}
            alt={title}
            className="max-h-[85vh] max-w-[95vw] object-contain rounded-lg shadow-2xl pointer-events-auto"
            draggable={false}
          />
        </div>
      </div>

      {/* 底部輔助提示 */}
      <div className="py-2 text-center text-xs text-neutral-400 bg-neutral-900/60 border-t border-neutral-800/50">
        💡 提示：點擊按鈕縮放，放大時可拖曳移動圖片，按 ESC 鍵或右上角關閉
      </div>
    </div>
  );
};
