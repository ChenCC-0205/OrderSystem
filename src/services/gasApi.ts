import { GroupOrder, Order, ApiResponse, MenuData } from '../types';
import { DEFAULT_GROUP, INITIAL_SAMPLE_ORDERS } from '../data/sampleMenus';

// 取得環境變數或自訂的 GAS 網址
export function getGasApiUrl(): string {
  if (typeof window !== 'undefined') {
    const customUrl = localStorage.getItem('gas_api_url');
    if (customUrl && customUrl.trim().length > 0) {
      return customUrl.trim();
    }
  }
  // Vite 支援 import.meta.env
  const viteUrl = (import.meta as any).env?.VITE_GAS_API_URL;
  const nextPublicUrl = (import.meta as any).env?.NEXT_PUBLIC_GAS_API_URL;
  return (viteUrl || nextPublicUrl || '').trim();
}

export function setCustomGasApiUrl(url: string): void {
  if (typeof window !== 'undefined') {
    if (!url || url.trim() === '') {
      localStorage.removeItem('gas_api_url');
    } else {
      localStorage.setItem('gas_api_url', url.trim());
    }
  }
}

// 取得與儲存本機展示資料 (若未設定 GAS 網址時的即時體驗支援)
const LOCAL_GROUPS_KEY = 'group_order_local_groups_v1';
const LOCAL_ORDERS_KEY = 'group_order_local_orders_v1';

function getLocalGroups(): GroupOrder[] {
  if (typeof window === 'undefined') return [DEFAULT_GROUP];
  const saved = localStorage.getItem(LOCAL_GROUPS_KEY);
  if (!saved) {
    localStorage.setItem(LOCAL_GROUPS_KEY, JSON.stringify([DEFAULT_GROUP]));
    return [DEFAULT_GROUP];
  }
  try {
    return JSON.parse(saved);
  } catch {
    return [DEFAULT_GROUP];
  }
}

function saveLocalGroups(groups: GroupOrder[]) {
  if (typeof window !== 'undefined') {
    localStorage.setItem(LOCAL_GROUPS_KEY, JSON.stringify(groups));
  }
}

function getLocalOrders(groupId?: string): Order[] {
  if (typeof window === 'undefined') return INITIAL_SAMPLE_ORDERS as Order[];
  const saved = localStorage.getItem(LOCAL_ORDERS_KEY);
  let orders: Order[] = [];
  if (!saved) {
    orders = INITIAL_SAMPLE_ORDERS as Order[];
    localStorage.setItem(LOCAL_ORDERS_KEY, JSON.stringify(orders));
  } else {
    try {
      orders = JSON.parse(saved);
    } catch {
      orders = INITIAL_SAMPLE_ORDERS as Order[];
    }
  }
  if (groupId) {
    return orders.filter(o => o.group_id === groupId);
  }
  return orders;
}

function saveLocalOrders(orders: Order[]) {
  if (typeof window !== 'undefined') {
    localStorage.setItem(LOCAL_ORDERS_KEY, JSON.stringify(orders));
  }
}

/**
 * 核心 POST 呼叫 GAS
 * 注意：使用 text/plain 以避免 Google Apps Script 遇到 CORS OPTIONS preflight 限制
 */
async function postToGas(url: string, body: any): Promise<any> {
  const response = await fetch(url, {
    method: 'POST',
    // 使用 text/plain 避免觸發 preflight 限制，GAS 仍可透過 e.postData.contents 正常讀取 JSON
    headers: {
      'Content-Type': 'text/plain;charset=utf-8',
    },
    body: JSON.stringify(body),
  });

  const text = await response.text();
  try {
    return JSON.parse(text);
  } catch (err) {
    console.warn('GAS POST response is not JSON:', text);
    return { success: response.ok, raw: text };
  }
}

/**
 * 核心 GET 呼叫 GAS
 */
async function getFromGas(url: string, params: Record<string, string>): Promise<any> {
  const urlObj = new URL(url);
  Object.entries(params).forEach(([k, v]) => {
    urlObj.searchParams.set(k, v);
  });

  const response = await fetch(urlObj.toString(), {
    method: 'GET',
  });

  const text = await response.text();
  try {
    return JSON.parse(text);
  } catch (err) {
    console.warn('GAS GET response is not JSON:', text);
    return { success: response.ok, raw: text };
  }
}

// -------------------------------------------------------------
// GAS API 對外方法
// -------------------------------------------------------------

/**
 * 測試 GAS API 連線
 */
export async function testGasConnection(targetUrl?: string): Promise<{ success: boolean; message: string }> {
  const url = targetUrl || getGasApiUrl();
  if (!url) {
    return { success: false, message: '尚未設定 Google Apps Script Web App 網址' };
  }
  try {
    const res = await getFromGas(url, { action: 'ping' });
    if (res.success || res.status === 'ok' || res.message) {
      return { success: true, message: res.message || '連線正常！' };
    }
    return { success: false, message: res.error || '連線成功但回應異常' };
  } catch (err: any) {
    return { success: false, message: '連線失敗：' + (err.message || String(err)) };
  }
}

/**
 * 1. 建立或更新團購
 * POST { action: "create_group", payload: { id, title, menu_json, status, image_url, description, deadline } }
 */
export async function createGroup(group: GroupOrder): Promise<ApiResponse<GroupOrder>> {
  const gasUrl = getGasApiUrl();
  
  // 雲端 GAS 呼叫
  if (gasUrl) {
    try {
      const res = await postToGas(gasUrl, {
        action: 'create_group',
        payload: {
          id: group.id,
          title: group.title,
          menu_json: typeof group.menu_json === 'string' ? group.menu_json : JSON.stringify(group.menu_json),
          status: group.status || 'open',
          image_url: group.image_url || '',
          description: group.description || '',
          deadline: group.deadline || '',
          created_at: group.created_at || new Date().toISOString()
        }
      });
      if (res && res.success) {
        // 同步更新本機快取
        const locals = getLocalGroups().filter(g => g.id !== group.id);
        locals.unshift(group);
        saveLocalGroups(locals);
        return { success: true, data: group, message: res.message || '團購儲存成功' };
      }
      return { success: false, error: res.error || '儲存至 Google 試算表失敗' };
    } catch (err: any) {
      console.error('GAS create_group error:', err);
      // 若連線失敗，退回本機儲存並提示
      const locals = getLocalGroups().filter(g => g.id !== group.id);
      locals.unshift(group);
      saveLocalGroups(locals);
      return {
        success: true,
        data: group,
        message: '連線至 GAS 暫時異常，已暫存至本機，請檢查 GAS 部署權限是否為「所有人」'
      };
    }
  }

  // 本機模式
  const locals = getLocalGroups().filter(g => g.id !== group.id);
  locals.unshift(group);
  saveLocalGroups(locals);
  return { success: true, data: group, message: '團購已於本機建立成功！' };
}

/**
 * 2. 獲取特定團購與其菜單
 * GET ?action=get_group&id=[group_id]
 */
export async function getGroup(groupId: string): Promise<ApiResponse<GroupOrder>> {
  const gasUrl = getGasApiUrl();

  if (gasUrl) {
    try {
      const res = await getFromGas(gasUrl, {
        action: 'get_group',
        id: groupId
      });

      if (res && res.success && res.data) {
        const item = res.data;
        let menuJson: MenuData;
        if (typeof item.menu_json === 'string') {
          try {
            menuJson = JSON.parse(item.menu_json);
          } catch {
            menuJson = { categories: [] };
          }
        } else {
          menuJson = item.menu_json || { categories: [] };
        }

        const group: GroupOrder = {
          id: String(item.id),
          title: item.title,
          menu_json: menuJson,
          status: item.status || 'open',
          image_url: item.image_url || '',
          description: item.description || '',
          deadline: item.deadline || '',
          created_at: item.created_at || ''
        };

        // 更新本機快取
        const locals = getLocalGroups().filter(g => g.id !== group.id);
        locals.unshift(group);
        saveLocalGroups(locals);

        return { success: true, data: group };
      }
      if (res && !res.success) {
        // GAS 回傳查無此團購，檢查本機是否存在
        const local = getLocalGroups().find(g => g.id === groupId);
        if (local) return { success: true, data: local };
        return { success: false, error: res.error || '查無此團購' };
      }
    } catch (err: any) {
      console.warn('GAS get_group failed, falling back to local:', err);
    }
  }

  // 本機回退
  const local = getLocalGroups().find(g => g.id === groupId);
  if (local) {
    return { success: true, data: local };
  }
  // 若是預設範例 ID 則回傳 DEFAULT_GROUP
  if (groupId === DEFAULT_GROUP.id) {
    return { success: true, data: DEFAULT_GROUP };
  }
  return { success: false, error: '找不到指定的團購資料' };
}

/**
 * 獲取所有團購列表 (後台切換與管理用)
 * GET ?action=get_groups
 */
export async function getGroups(): Promise<ApiResponse<GroupOrder[]>> {
  const gasUrl = getGasApiUrl();

  if (gasUrl) {
    try {
      const res = await getFromGas(gasUrl, { action: 'get_groups' });
      if (res && res.success && Array.isArray(res.data)) {
        const groups: GroupOrder[] = res.data.map((item: any) => {
          let menuJson: MenuData;
          if (typeof item.menu_json === 'string') {
            try {
              menuJson = JSON.parse(item.menu_json);
            } catch {
              menuJson = { categories: [] };
            }
          } else {
            menuJson = item.menu_json || { categories: [] };
          }
          return {
            id: String(item.id),
            title: item.title,
            menu_json: menuJson,
            status: item.status || 'open',
            image_url: item.image_url || '',
            description: item.description || '',
            deadline: item.deadline || '',
            created_at: item.created_at || ''
          };
        });

        if (groups.length > 0) {
          saveLocalGroups(groups);
          return { success: true, data: groups };
        }
      }
    } catch (err) {
      console.warn('GAS get_groups fallback to local:', err);
    }
  }

  return { success: true, data: getLocalGroups() };
}

/**
 * 3. 送出訂單
 * POST { action: "create_order", payload: { id, group_id, user_name, items, total_price, is_paid, note } }
 */
export async function createOrder(order: Omit<Order, 'id' | 'created_at'> & { id?: string }): Promise<ApiResponse<Order>> {
  const newOrder: Order = {
    ...order,
    id: order.id || 'ord_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
    created_at: new Date().toISOString()
  };

  const gasUrl = getGasApiUrl();

  if (gasUrl) {
    try {
      const res = await postToGas(gasUrl, {
        action: 'create_order',
        payload: {
          id: newOrder.id,
          group_id: newOrder.group_id,
          user_name: newOrder.user_name,
          items: JSON.stringify(newOrder.items),
          total_price: newOrder.total_price,
          is_paid: newOrder.is_paid,
          note: newOrder.note || ''
        }
      });

      if (res && res.success) {
        // 同步存入本機
        const localOrders = getLocalOrders();
        localOrders.push(newOrder);
        saveLocalOrders(localOrders);
        return { success: true, data: newOrder, message: res.message || '訂單已成功送至 Google 試算表！' };
      }
      return { success: false, error: res.error || '訂單送出失敗' };
    } catch (err: any) {
      console.error('GAS create_order error:', err);
      // 連線異常，保存在本機並提示
      const localOrders = getLocalOrders();
      localOrders.push(newOrder);
      saveLocalOrders(localOrders);
      return {
        success: true,
        data: newOrder,
        message: '連線 GAS 異常，已先在客戶端保存訂單'
      };
    }
  }

  // 本機模式
  const localOrders = getLocalOrders();
  localOrders.push(newOrder);
  saveLocalOrders(localOrders);
  return { success: true, data: newOrder, message: '訂單送出成功 (展示模式)' };
}

/**
 * 4. 獲取團購的訂單統計
 * GET ?action=get_orders&group_id=[group_id]
 */
export async function getOrders(groupId: string): Promise<ApiResponse<Order[]>> {
  const gasUrl = getGasApiUrl();

  if (gasUrl) {
    try {
      const res = await getFromGas(gasUrl, {
        action: 'get_orders',
        group_id: groupId
      });

      if (res && res.success && Array.isArray(res.data)) {
        const orders: Order[] = res.data.map((item: any) => {
          let itemsList: any = [];
          if (typeof item.items === 'string') {
            try {
              itemsList = JSON.parse(item.items);
            } catch {
              itemsList = [];
            }
          } else if (Array.isArray(item.items)) {
            itemsList = item.items;
          }
          return {
            id: String(item.id),
            group_id: String(item.group_id),
            user_name: String(item.user_name || '匿名'),
            items: itemsList,
            total_price: Number(item.total_price) || 0,
            is_paid: item.is_paid === true || String(item.is_paid).toLowerCase() === 'true',
            note: item.note || '',
            created_at: item.created_at || ''
          };
        });

        // 倒序排列
        orders.reverse();
        return { success: true, data: orders };
      }
    } catch (err) {
      console.warn('GAS get_orders failed, fallback to local:', err);
    }
  }

  // 本機回退
  const localList = getLocalOrders(groupId);
  return { success: true, data: [...localList].reverse() };
}

/**
 * 5. 更新訂單付款狀態
 * POST { action: "update_order_payment", payload: { order_id, is_paid } }
 */
export async function updateOrderPayment(orderId: string, isPaid: boolean): Promise<ApiResponse<boolean>> {
  const gasUrl = getGasApiUrl();

  if (gasUrl) {
    try {
      const res = await postToGas(gasUrl, {
        action: 'update_order_payment',
        payload: {
          order_id: orderId,
          is_paid: isPaid
        }
      });
      if (res && res.success) {
        // 同步更新本機
        const localOrders = getLocalOrders();
        const found = localOrders.find(o => o.id === orderId);
        if (found) {
          found.is_paid = isPaid;
          saveLocalOrders(localOrders);
        }
        return { success: true, data: isPaid };
      }
      return { success: false, error: res.error || '更新付款狀態失敗' };
    } catch (err: any) {
      console.error('GAS update_order_payment error:', err);
    }
  }

  // 本機更新
  const localOrders = getLocalOrders();
  const found = localOrders.find(o => o.id === orderId);
  if (found) {
    found.is_paid = isPaid;
    saveLocalOrders(localOrders);
    return { success: true, data: isPaid };
  }
  return { success: false, error: '找不到指定訂單' };
}

/**
 * 6. 更新團購狀態 (open / closed)
 * POST { action: "update_group_status", payload: { group_id, status } }
 */
export async function updateGroupStatus(groupId: string, status: 'open' | 'closed'): Promise<ApiResponse<boolean>> {
  const gasUrl = getGasApiUrl();

  if (gasUrl) {
    try {
      const res = await postToGas(gasUrl, {
        action: 'update_group_status',
        payload: {
          group_id: groupId,
          status: status
        }
      });
      if (res && res.success) {
        const groups = getLocalGroups();
        const g = groups.find(x => x.id === groupId);
        if (g) {
          g.status = status;
          saveLocalGroups(groups);
        }
        return { success: true, data: true };
      }
    } catch (err) {
      console.error('GAS update_group_status error:', err);
    }
  }

  // 本機更新
  const groups = getLocalGroups();
  const g = groups.find(x => x.id === groupId);
  if (g) {
    g.status = status;
    saveLocalGroups(groups);
    return { success: true, data: true };
  }
  return { success: false, error: '更新失敗' };
}
