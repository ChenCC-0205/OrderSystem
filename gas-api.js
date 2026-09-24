/**
 * =========================================================================
 * 萬用動態團購點餐系統 (GAS 後端 API)
 * Google Apps Script 執行程式碼 (gas-api.js)
 * =========================================================================
 * 
 * 【部屬教學 6 步驟】：
 * 1. 打開 Google Drive，建立一份新的 Google 試算表（Google Sheets）。
 * 2. 點擊頂部選單「擴充功能 (Extensions)」->「Apps Script」。
 * 3. 清空 Code.gs 內原有的內容，將本檔案代碼「全部複製並貼上」。
 * 4. 點擊右上角「部署 (Deploy)」->「新增部署作業 (New deployment)」。
 * 5. 點擊齒輪圖示選擇「網頁應用程式 (Web app)」：
 *    - 說明 (Description)：團購點餐系統 API
 *    - 執行身分 (Execute as)：我 (Me)
 *    - 存取權限 (Who has access)：所有人 (Anyone)  <-- 【非常重要！務必選所有人，使用者才能免 Google 登入點餐】
 * 6. 點擊「部署」，授權存取後複製「網頁應用程式網址 (Web App URL)」。
 *    將該網址填入前端 .env 的 `NEXT_PUBLIC_GAS_API_URL` 或在前端後台「API 設定」中貼上即可！
 * =========================================================================
 */

// 設定工作表名稱
const SHEET_GROUPS = 'groups';
const SHEET_ORDERS = 'orders';

// 工作表欄位定義
const GROUPS_HEADERS = ['id', 'title', 'menu_json', 'status', 'image_url', 'description', 'deadline', 'created_at'];
const ORDERS_HEADERS = ['id', 'group_id', 'user_name', 'items', 'total_price', 'is_paid', 'note', 'created_at'];

/**
 * 處理 GET 請求
 */
function doGet(e) {
  try {
    const params = e.parameter || {};
    const action = params.action;

    // 測試連線
    if (action === 'ping' || !action) {
      return createJsonResponse({
        success: true,
        message: 'GAS API 連線成功！',
        timestamp: new Date().toISOString()
      });
    }

    // 1. 獲取特定團購與其菜單: ?action=get_group&id=[group_id]
    if (action === 'get_group') {
      const groupId = params.id;
      if (!groupId) {
        return createJsonResponse({ success: false, error: '缺少 group_id 參數' });
      }

      const sheet = getOrCreateSheet(SHEET_GROUPS, GROUPS_HEADERS);
      const rows = sheet.getDataRange().getValues();
      if (rows.length <= 1) {
        return createJsonResponse({ success: false, error: '查無此團購資料' });
      }

      const headers = rows[0];
      const idIndex = headers.indexOf('id');

      for (let i = 1; i < rows.length; i++) {
        if (String(rows[i][idIndex]) === String(groupId)) {
          const groupData = {};
          headers.forEach((h, colIdx) => {
            let val = rows[i][colIdx];
            if (h === 'menu_json' && typeof val === 'string') {
              try {
                val = JSON.parse(val);
              } catch (err) {
                // keep as string if parsing fails
              }
            }
            groupData[h] = val;
          });
          return createJsonResponse({ success: true, data: groupData });
        }
      }

      return createJsonResponse({ success: false, error: '找不到指定的團購' });
    }

    // 2. 獲取所有團購列表 (後台選擇團購或歷史紀錄用): ?action=get_groups
    if (action === 'get_groups') {
      const sheet = getOrCreateSheet(SHEET_GROUPS, GROUPS_HEADERS);
      const rows = sheet.getDataRange().getValues();
      if (rows.length <= 1) {
        return createJsonResponse({ success: true, data: [] });
      }

      const headers = rows[0];
      const groups = [];

      for (let i = 1; i < rows.length; i++) {
        const item = {};
        headers.forEach((h, colIdx) => {
          let val = rows[i][colIdx];
          if (h === 'menu_json' && typeof val === 'string') {
            try {
              val = JSON.parse(val);
            } catch (e) {}
          }
          item[h] = val;
        });
        groups.push(item);
      }

      // 按建立時間倒序
      groups.reverse();
      return createJsonResponse({ success: true, data: groups });
    }

    // 3. 獲取團購的訂單統計: ?action=get_orders&group_id=[group_id]
    if (action === 'get_orders') {
      const groupId = params.group_id || params.id;
      if (!groupId) {
        return createJsonResponse({ success: false, error: '缺少 group_id 參數' });
      }

      const sheet = getOrCreateSheet(SHEET_ORDERS, ORDERS_HEADERS);
      const rows = sheet.getDataRange().getValues();
      if (rows.length <= 1) {
        return createJsonResponse({ success: true, data: [] });
      }

      const headers = rows[0];
      const groupIdIdx = headers.indexOf('group_id');
      const orders = [];

      for (let i = 1; i < rows.length; i++) {
        if (String(rows[i][groupIdIdx]) === String(groupId)) {
          const order = {};
          headers.forEach((h, colIdx) => {
            let val = rows[i][colIdx];
            if (h === 'items' && typeof val === 'string') {
              try {
                val = JSON.parse(val);
              } catch (e) {}
            }
            if (h === 'is_paid') {
              val = val === true || String(val).toLowerCase() === 'true';
            }
            order[h] = val;
          });
          orders.push(order);
        }
      }

      return createJsonResponse({ success: true, data: orders });
    }

    return createJsonResponse({ success: false, error: '未知的 action: ' + action });
  } catch (err) {
    return createJsonResponse({ success: false, error: err.toString() });
  }
}

/**
 * 處理 POST 請求
 */
function doPost(e) {
  try {
    let body = {};
    if (e.postData && e.postData.contents) {
      try {
        body = JSON.parse(e.postData.contents);
      } catch (parseErr) {
        body = e.parameter || {};
      }
    } else {
      body = e.parameter || {};
    }

    const action = body.action;
    const payload = body.payload || body;

    // 1. 建立或更新團購: POST { action: "create_group", payload: { id, title, menu_json, status, image_url, description, deadline } }
    if (action === 'create_group') {
      const sheet = getOrCreateSheet(SHEET_GROUPS, GROUPS_HEADERS);
      const id = payload.id || 'grp_' + new Date().getTime();
      const title = payload.title || '今日團購';
      const menuJson = typeof payload.menu_json === 'object' ? JSON.stringify(payload.menu_json) : (payload.menu_json || '{}');
      const status = payload.status || 'open';
      const imageUrl = payload.image_url || '';
      const description = payload.description || '';
      const deadline = payload.deadline || '';
      const createdAt = payload.created_at || new Date().toISOString();

      const rows = sheet.getDataRange().getValues();
      const headers = rows[0];
      const idIndex = headers.indexOf('id');

      let rowIndexToUpdate = -1;
      for (let i = 1; i < rows.length; i++) {
        if (String(rows[i][idIndex]) === String(id)) {
          rowIndexToUpdate = i + 1; // 1-based index
          break;
        }
      }

      const rowValues = [id, title, menuJson, status, imageUrl, description, deadline, createdAt];

      if (rowIndexToUpdate > 0) {
        // 更新現有資料
        sheet.getRange(rowIndexToUpdate, 1, 1, rowValues.length).setValues([rowValues]);
      } else {
        // 新增一行
        sheet.appendRow(rowValues);
      }

      return createJsonResponse({
        success: true,
        message: '團購儲存成功',
        data: { id, title, status }
      });
    }

    // 2. 送出訂單: POST { action: "create_order", payload: { id, group_id, user_name, items, total_price, is_paid, note } }
    if (action === 'create_order') {
      if (!payload.group_id || !payload.user_name) {
        return createJsonResponse({ success: false, error: '缺少必填欄位 (group_id, user_name)' });
      }

      const sheet = getOrCreateSheet(SHEET_ORDERS, ORDERS_HEADERS);
      const id = payload.id || 'ord_' + new Date().getTime() + '_' + Math.floor(Math.random() * 1000);
      const groupId = payload.group_id;
      const userName = payload.user_name;
      const itemsJson = typeof payload.items === 'object' ? JSON.stringify(payload.items) : (payload.items || '[]');
      const totalPrice = Number(payload.total_price) || 0;
      const isPaid = payload.is_paid === true || String(payload.is_paid).toLowerCase() === 'true';
      const note = payload.note || '';
      const createdAt = new Date().toISOString();

      sheet.appendRow([id, groupId, userName, itemsJson, totalPrice, isPaid, note, createdAt]);

      return createJsonResponse({
        success: true,
        message: '訂單送出成功',
        data: { id, group_id: groupId, user_name: userName, total_price: totalPrice, is_paid: isPaid }
      });
    }

    // 3. 更新訂單付款狀態: POST { action: "update_order_payment", payload: { order_id, is_paid } }
    if (action === 'update_order_payment') {
      const orderId = payload.order_id || payload.id;
      if (!orderId) {
        return createJsonResponse({ success: false, error: '缺少 order_id 參數' });
      }

      const isPaid = payload.is_paid === true || String(payload.is_paid).toLowerCase() === 'true';
      const sheet = getOrCreateSheet(SHEET_ORDERS, ORDERS_HEADERS);
      const rows = sheet.getDataRange().getValues();
      const headers = rows[0];
      const idIdx = headers.indexOf('id');
      const paidIdx = headers.indexOf('is_paid');

      let found = false;
      for (let i = 1; i < rows.length; i++) {
        if (String(rows[i][idIdx]) === String(orderId)) {
          sheet.getRange(i + 1, paidIdx + 1).setValue(isPaid);
          found = true;
          break;
        }
      }

      if (!found) {
        return createJsonResponse({ success: false, error: '找不到此訂單 ID: ' + orderId });
      }

      return createJsonResponse({
        success: true,
        message: '付款狀態更新成功',
        data: { order_id: orderId, is_paid: isPaid }
      });
    }

    // 4. 更新團購狀態 (開啟/截單): POST { action: "update_group_status", payload: { group_id, status } }
    if (action === 'update_group_status') {
      const groupId = payload.group_id || payload.id;
      const status = payload.status || 'closed';

      const sheet = getOrCreateSheet(SHEET_GROUPS, GROUPS_HEADERS);
      const rows = sheet.getDataRange().getValues();
      const headers = rows[0];
      const idIdx = headers.indexOf('id');
      const statusIdx = headers.indexOf('status');

      let found = false;
      for (let i = 1; i < rows.length; i++) {
        if (String(rows[i][idIdx]) === String(groupId)) {
          sheet.getRange(i + 1, statusIdx + 1).setValue(status);
          found = true;
          break;
        }
      }

      if (!found) {
        return createJsonResponse({ success: false, error: '找不到此團購 ID' });
      }

      return createJsonResponse({
        success: true,
        message: '團購狀態已更新為 ' + status,
        data: { group_id: groupId, status }
      });
    }

    return createJsonResponse({ success: false, error: '未知的 POST action: ' + action });
  } catch (err) {
    return createJsonResponse({ success: false, error: err.toString() });
  }
}

/**
 * 輔助函式：取得指定工作表，若不存在則自動建立並寫入標題行
 */
function getOrCreateSheet(sheetName, headers) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(sheetName);
  
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
    sheet.appendRow(headers);
    // 設定首行樣式
    sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold').setBackground('#f3f4f6');
  } else {
    // 檢查是否有標題列
    if (sheet.getLastRow() === 0) {
      sheet.appendRow(headers);
      sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold').setBackground('#f3f4f6');
    }
  }
  
  return sheet;
}

/**
 * 輸出標準 JSON 格式與 CORS 回應
 */
function createJsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
