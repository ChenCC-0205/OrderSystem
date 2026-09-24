import { Order, ItemSummary } from '../types';

/**
 * 統計品項匯總（供主揪向店家報單）
 */
export function aggregateOrderItems(orders: Order[]): ItemSummary[] {
  const itemMap: { [key: string]: ItemSummary } = {};

  orders.forEach(order => {
    order.items.forEach(item => {
      const key = item.name + '___' + item.price;
      if (!itemMap[key]) {
        itemMap[key] = {
          name: item.name,
          price: item.price,
          totalQuantity: 0,
          subtotal: 0,
          optionsBreakdown: {},
        };
      }

      itemMap[key].totalQuantity += item.quantity;
      itemMap[key].subtotal += item.price * item.quantity;

      // 統計選項規格
      const optStr = item.options.length > 0 ? item.options.join(', ') : '正常/無特殊規格';
      itemMap[key].optionsBreakdown[optStr] = (itemMap[key].optionsBreakdown[optStr] || 0) + item.quantity;
    });
  });

  return Object.values(itemMap).sort((a, b) => b.totalQuantity - a.totalQuantity);
}

/**
 * 產生給店家訂餐的格式化文字 (一鍵複製傳 LINE 或電話報單)
 */
export function generateRestaurantReport(groupTitle: string, orders: Order[]): string {
  const summaries = aggregateOrderItems(orders);
  const totalCount = summaries.reduce((acc, curr) => acc + curr.totalQuantity, 0);
  const totalAmount = orders.reduce((acc, curr) => acc + curr.total_price, 0);

  let text = `📋【${groupTitle}】店家叫餐統計表\n`;
  text += `─────────────────────\n`;
  text += `總計份數：${totalCount} 份\n`;
  text += `總計金額：$${totalAmount} 元\n`;
  text += `─────────────────────\n`;
  text += `【餐點明細清單】：\n`;

  summaries.forEach((sum, idx) => {
    text += `${idx + 1}. ${sum.name} x ${sum.totalQuantity} 份 ($${sum.price}/份)\n`;
    // 列出規格
    Object.entries(sum.optionsBreakdown).forEach(([opt, count]) => {
      text += `   ↳ ${opt}: ${count} 份\n`;
    });
  });

  // 列出備註匯總
  const notes = orders.filter(o => o.note && o.note.trim().length > 0);
  if (notes.length > 0) {
    text += `─────────────────────\n`;
    text += `【特殊備註需求】：\n`;
    notes.forEach(n => {
      text += `• ${n.user_name}: ${n.note}\n`;
    });
  }

  return text;
}

/**
 * 產生群組催款 / 分帳明細文字 (傳至 LINE / Slack)
 */
export function generatePaymentTally(groupTitle: string, orders: Order[]): string {
  const totalAmount = orders.reduce((acc, curr) => acc + curr.total_price, 0);
  const paidCount = orders.filter(o => o.is_paid).length;
  const unpaidCount = orders.filter(o => !o.is_paid).length;

  let text = `📢【${groupTitle}】結單對帳收款通知\n`;
  text += `感謝大家跟單！總計 ${orders.length} 人訂購，金額 $${totalAmount} 元。\n`;
  text += `目前收款進度：${paidCount} 人已付 / ${unpaidCount} 人待付款\n`;
  text += `─────────────────────\n`;

  orders.forEach((o, idx) => {
    const statusIcon = o.is_paid ? '✅ 已付' : '⏳ 未付';
    const itemsBrief = o.items.map(i => `${i.name}x${i.quantity}`).join('、');
    text += `${idx + 1}. ${o.user_name}：$${o.total_price} [${statusIcon}] (${itemsBrief})\n`;
  });

  text += `─────────────────────\n`;
  text += `尚未付款的夥伴，請盡速透過 Line Pay / 現金交給主揪，謝謝大家！`;
  return text;
}

/**
 * 匯出訂單為 CSV
 */
export function exportOrdersToCSV(groupTitle: string, orders: Order[]): void {
  const headers = ['訂單編號', '訂購人姓名', '點購品項', '數量', '單價', '規格備註', '訂單總額', '付款狀態', '訂購備註', '下單時間'];
  const rows: string[][] = [];

  orders.forEach(order => {
    order.items.forEach(item => {
      rows.push([
        order.id,
        `"${order.user_name.replace(/"/g, '""')}"`,
        `"${item.name.replace(/"/g, '""')}"`,
        String(item.quantity),
        String(item.price),
        `"${item.options.join(', ').replace(/"/g, '""')}"`,
        String(order.total_price),
        order.is_paid ? '已付款' : '未付款',
        `"${(order.note || '').replace(/"/g, '""')}"`,
        order.created_at || ''
      ]);
    });
  });

  const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `${groupTitle}_訂單名單_${new Date().toISOString().slice(0, 10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * 輕量紙花慶祝特效
 */
export function triggerCelebration(): void {
  try {
    const canvas = document.createElement('canvas');
    canvas.style.position = 'fixed';
    canvas.style.top = '0';
    canvas.style.left = '0';
    canvas.style.width = '100vw';
    canvas.style.height = '100vh';
    canvas.style.pointerEvents = 'none';
    canvas.style.zIndex = '99999';
    document.body.appendChild(canvas);

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      document.body.removeChild(canvas);
      return;
    }

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const colors = ['#f43f5e', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899'];
    const particles: any[] = [];
    const count = 100;

    for (let i = 0; i < count; i++) {
      particles.push({
        x: canvas.width / 2 + (Math.random() - 0.5) * 200,
        y: canvas.height * 0.4,
        vx: (Math.random() - 0.5) * 14,
        vy: (Math.random() - 1.2) * 12,
        size: Math.random() * 8 + 4,
        color: colors[Math.floor(Math.random() * colors.length)],
        rotation: Math.random() * 360,
        rSpeed: (Math.random() - 0.5) * 10,
        opacity: 1
      });
    }

    let frame = 0;
    const animate = () => {
      frame++;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      let alive = false;
      particles.forEach(p => {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.25; // gravity
        p.rotation += p.rSpeed;
        p.opacity = Math.max(0, 1 - frame / 100);

        if (p.opacity > 0 && p.y < canvas.height + 50) {
          alive = true;
          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate((p.rotation * Math.PI) / 180);
          ctx.globalAlpha = p.opacity;
          ctx.fillStyle = p.color;
          ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
          ctx.restore();
        }
      });

      if (alive && frame < 120) {
        requestAnimationFrame(animate);
      } else {
        if (canvas.parentNode) {
          canvas.parentNode.removeChild(canvas);
        }
      }
    };

    requestAnimationFrame(animate);
  } catch (e) {
    // ignore
  }
}
