import { MenuData, GroupOrder } from '../types';

export const SAMPLE_BENTO_MENU: MenuData = {
  categories: [
    {
      category_name: "人氣便當系列",
      items: [
        {
          id: "bento_1",
          name: "特選極品燒肉便當",
          price: 110,
          description: "嚴選上等梅花豬肉，特調日式秘醬炙燒，香氣撲鼻。",
          options: ["正常", "飯少", "加飯(+10)", "不要蔥花", "不要酸菜", "小辣", "大辣", "加一顆滷蛋(+15)"]
        },
        {
          id: "bento_2",
          name: "酥炸厚切排骨便當",
          price: 105,
          description: "每日溫體厚切里肌豬排，五香醃漬酥炸金黃酥脆。",
          options: ["正常", "飯少", "加飯(+10)", "胡椒多", "加一顆滷蛋(+15)"]
        },
        {
          id: "bento_3",
          name: "日式照燒雞腿便當",
          price: 120,
          description: "整隻去骨大雞腿，刷上慢熬照燒甜醬慢烤，鮮嫩多汁。",
          options: ["正常", "飯少", "加飯(+10)", "不要酸菜", "加一份青菜(+20)"]
        },
        {
          id: "bento_4",
          name: "海陸雙拼便當 (燒肉+鯖魚)",
          price: 135,
          description: "挪威鹽烤鯖魚搭配招牌秘醬燒肉，飽足又豐盛。",
          options: ["正常", "飯少", "加飯(+10)", "要胡椒鹽", "加一顆滷蛋(+15)"]
        },
        {
          id: "bento_5",
          name: "活力田園蔬食便當 (蛋素)",
          price: 90,
          description: "五色當季無毒時蔬搭配厚切紅燒有機嫩豆腐與滷蛋。",
          options: ["正常", "飯少", "不要蔥蒜(全素)", "加一份青菜(+20)"]
        }
      ]
    },
    {
      category_name: "單點小菜與私房配菜",
      items: [
        {
          id: "side_1",
          name: "古早味滷排骨(單點)",
          price: 65,
          description: "秘傳老滷慢燉，香軟入味。",
          options: ["切塊", "不切", "加辣粉"]
        },
        {
          id: "side_2",
          name: "香酥炸雞捲 (2入)",
          price: 45,
          description: "外皮酥香，內餡荸薺鮮肉香甜爽口。",
          options: ["加甜辣醬", "不加醬"]
        },
        {
          id: "side_3",
          name: "特級黃金溏心蛋",
          price: 25,
          description: "流心蛋黃與甘甜柴魚醬油香。",
          options: ["冰涼食用"]
        },
        {
          id: "side_4",
          name: "燙當季有機鮮時蔬",
          price: 40,
          description: "淋上特調油蔥與薄鹽醬油膏。",
          options: ["加肉燥", "去油蔥(清燙)"]
        }
      ]
    },
    {
      category_name: "湯品與清涼冷泡茶",
      items: [
        {
          id: "drink_1",
          name: "甘甜蘿蔔排骨湯",
          price: 40,
          description: "文火慢熬高湯，蘿蔔清甜。",
          options: ["正常", "加香菜", "不要香菜", "加白胡椒"]
        },
        {
          id: "drink_2",
          name: "無糖日月潭紅玉冷泡茶 (600ml)",
          price: 35,
          description: "茶湯清亮透紅，帶有天然肉桂與薄荷香氣。",
          options: ["微冰", "常溫"]
        },
        {
          id: "drink_3",
          name: "古早味冰糖冬瓜檸檬",
          price: 45,
          description: "屏東九如新鮮檸檬汁佐手工冬瓜露，解膩首選。",
          options: ["正常冰", "少冰", "半糖", "微糖"]
        }
      ]
    }
  ]
};

export const SAMPLE_TEA_MENU: MenuData = {
  categories: [
    {
      category_name: "原葉純茶",
      items: [
        {
          id: "tea_1",
          name: "熟成紅茶",
          price: 35,
          description: "特選阿薩姆紅茶，帶有濃郁果香。",
          options: ["正常甜", "半糖(5分)", "微糖(3分)", "一分糖(1分)", "無糖", "正常冰", "少冰", "微冰", "去冰", "完全去冰"]
        },
        {
          id: "tea_2",
          name: "四季春青茶",
          price: 35,
          description: "台灣高山四季春，茶韻甘醇不澀。",
          options: ["半糖", "微糖", "無糖", "微冰", "去冰"]
        },
        {
          id: "tea_3",
          name: "黃金烏龍",
          price: 35,
          description: "輕焙火烏龍茶，烘焙香氣持久回甘。",
          options: ["半糖", "微糖", "無糖", "微冰", "去冰"]
        }
      ]
    },
    {
      category_name: "厚乳奶茶與鮮奶",
      items: [
        {
          id: "milk_1",
          name: "波霸厚鮮奶茶",
          price: 65,
          description: "小農鮮乳搭配Q彈黑糖波霸，人氣第一名！",
          options: ["半糖", "微糖", "無糖", "少冰", "微冰", "去冰", "加波霸(+10)", "加仙草凍(+10)"]
        },
        {
          id: "milk_2",
          name: "伯爵生乳茶",
          price: 60,
          description: "優雅佛手柑香氣與濃醇鮮奶完美平衡。",
          options: ["半糖", "微糖", "無糖", "少冰", "去冰"]
        }
      ]
    }
  ]
};

export const SAMPLE_BRUNCH_MENU: MenuData = {
  categories: [
    {
      category_name: "炭烤總匯吐司",
      items: [
        {
          id: "brunch_1",
          name: "招牌里肌豬排蛋吐司",
          price: 65,
          description: "炭火慢烤吐司，手工拍打溫體里肌肉與煎蛋。",
          options: ["切半", "不切", "去邊", "加起司(+10)", "不要胡椒", "加辣醬"]
        },
        {
          id: "brunch_2",
          name: "濃醇花生牛肉起司堡",
          price: 95,
          description: "純手打安格斯黑牛排佐新竹福源顆粒花生醬。",
          options: ["正常熟度", "不要洋蔥", "加培根(+15)"]
        }
      ]
    },
    {
      category_name: "香酥手工蛋餅",
      items: [
        {
          id: "brunch_3",
          name: "酥皮起司玉米蛋餅",
          price: 55,
          description: "煎至金黃酥脆的千層餅皮，濃郁拔絲起司與甜玉米。",
          options: ["加醬油膏", "加甜辣醬", "加特製辣椒醬", "不沾醬"]
        }
      ]
    }
  ]
};

// 預設示範團購資料
export const DEFAULT_GROUP: GroupOrder = {
  id: "lunch_2026_demo",
  title: "【今日午餐團】極品燒肉便當專賣店 🍱",
  menu_json: SAMPLE_BENTO_MENU,
  status: "open",
  image_url: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=1200&q=80",
  description: "🔥 今日 10:45 準時結單店家出餐！滿 10 個即可送餐。主揪 Line Pay: @lunch999，點完記得請及時轉帳喔！",
  deadline: "10:45",
  created_at: new Date().toISOString()
};

export const INITIAL_SAMPLE_ORDERS = [
  {
    id: "ord_101",
    group_id: "lunch_2026_demo",
    user_name: "王大明 (技術部)",
    items: [
      {
        cartItemId: "c_1",
        itemId: "bento_1",
        name: "特選極品燒肉便當",
        price: 110,
        quantity: 1,
        options: ["飯少", "加一顆滷蛋(+15)"],
        itemNote: "謝謝主揪！"
      },
      {
        cartItemId: "c_2",
        itemId: "drink_2",
        name: "無糖日月潭紅玉冷泡茶 (600ml)",
        price: 35,
        quantity: 1,
        options: ["微冰"]
      }
    ],
    total_price: 160,
    is_paid: true,
    note: "座位在 4F B02，已 Line Pay 轉帳",
    created_at: "2026-09-23T10:15:00.000Z"
  },
  {
    id: "ord_102",
    group_id: "lunch_2026_demo",
    user_name: "林小芬 (行銷部)",
    items: [
      {
        cartItemId: "c_3",
        itemId: "bento_2",
        name: "酥炸厚切排骨便當",
        price: 105,
        quantity: 1,
        options: ["正常", "胡椒多"]
      }
    ],
    total_price: 105,
    is_paid: false,
    note: "午休拿現金給主揪",
    created_at: "2026-09-23T10:22:00.000Z"
  },
  {
    id: "ord_103",
    group_id: "lunch_2026_demo",
    user_name: "陳副理",
    items: [
      {
        cartItemId: "c_4",
        itemId: "bento_4",
        name: "海陸雙拼便當 (燒肉+鯖魚)",
        price: 135,
        quantity: 2,
        options: ["正常", "加一顆滷蛋(+15)"]
      },
      {
        cartItemId: "c_5",
        itemId: "drink_1",
        name: "甘甜蘿蔔排骨湯",
        price: 40,
        quantity: 2,
        options: ["正常", "不要香菜"]
      }
    ],
    total_price: 380,
    is_paid: true,
    note: "2人份，分機 8820",
    created_at: "2026-09-23T10:30:00.000Z"
  }
];
