/**
 * 萬用動態團購點餐系統 - 型別定義
 */

export interface MenuItemOptionGroup {
  name: string;
  choices: string[];
  required?: boolean;
}

export interface MenuItem {
  id: string;
  name: string;
  price: number;
  options?: (string | MenuItemOptionGroup)[];
  description?: string;
  image?: string;
}

export interface MenuCategory {
  category_name: string;
  items: MenuItem[];
}

export interface MenuData {
  categories: MenuCategory[];
}

export interface GroupOrder {
  id: string;
  title: string;
  menu_json: MenuData | string;
  status: 'open' | 'closed';
  image_url?: string;
  description?: string;
  deadline?: string;
  created_at?: string;
}

export interface CartItemOption {
  groupName?: string;
  choice: string;
  extraPrice?: number;
}

export interface CartItem {
  cartItemId: string; // unique per cart row
  itemId: string;
  name: string;
  price: number;
  quantity: number;
  options: string[]; // selected option names
  itemNote?: string;
}

export interface Order {
  id: string;
  group_id: string;
  user_name: string;
  items: CartItem[];
  total_price: number;
  is_paid: boolean;
  note?: string;
  created_at: string;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

export interface ItemSummary {
  name: string;
  price: number;
  totalQuantity: number;
  subtotal: number;
  optionsBreakdown: { [optionText: string]: number };
}
