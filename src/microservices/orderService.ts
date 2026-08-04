import { InventoryItem, Order } from './types';

const INVENTORY_DB: InventoryItem[] = [
  { itemId: 'item_notebook', category: 'Stationery', name: 'Engineering Grid Notebook', price: 5.99, stock: 150, facultyOnly: false },
  { itemId: 'item_pen_set', category: 'Stationery', name: 'Fine Tip Black Pens (5-pack)', price: 4.50, stock: 200, facultyOnly: false },
  { itemId: 'item_raspberry_pi', category: 'Electronics', name: 'Raspberry Pi 4 Model B (8GB)', price: 75.00, stock: 25, facultyOnly: false },
  { itemId: 'item_oscilloscope', category: 'Lab Equipment', name: 'Digital Storage Oscilloscope 100MHz', price: 450.00, stock: 5, facultyOnly: true },
  { itemId: 'item_logic_analyzer', category: 'Lab Equipment', name: '16-Channel USB Logic Analyzer', price: 120.00, stock: 8, facultyOnly: true }
];

const ORDERS_DB: Order[] = [
  {
    orderId: 'ord_501',
    userId: 'usr_faculty_01',
    userName: 'Dr. Evelyn Reed',
    itemId: 'item_logic_analyzer',
    itemName: '16-Channel USB Logic Analyzer',
    quantity: 2,
    totalCost: 240.00,
    status: 'SHIPPED',
    orderDate: '2026-08-01T14:20:00Z'
  }
];

export class OrderService {
  public static searchInventory(category?: string) {
    if (!category) {
      return { success: true, items: INVENTORY_DB };
    }
    const filtered = INVENTORY_DB.filter(i => i.category.toLowerCase() === category.toLowerCase());
    return { success: true, category, items: filtered };
  }

  public static placeOrder(userId: string, userName: string, userRole: string, itemId: string, quantity: number) {
    const item = INVENTORY_DB.find(i => i.itemId === itemId);
    if (!item) {
      return { success: false, error: `Item ID '${itemId}' not found in store inventory.` };
    }

    if (item.facultyOnly && userRole !== 'Faculty' && userRole !== 'Admin') {
      return { success: false, error: `Item '${item.name}' is restricted to Faculty orders only.` };
    }

    if (item.stock < quantity) {
      return { success: false, error: `Insufficient stock for '${item.name}'. Available: ${item.stock}, requested: ${quantity}.` };
    }

    item.stock -= quantity;

    const newOrder: Order = {
      orderId: `ord_${Date.now().toString().slice(-4)}`,
      userId,
      userName,
      itemId,
      itemName: item.name,
      quantity,
      totalCost: parseFloat((item.price * quantity).toFixed(2)),
      status: 'PROCESSING',
      orderDate: new Date().toISOString()
    };

    ORDERS_DB.push(newOrder);
    return { success: true, order: newOrder };
  }

  public static checkOrderStatus(orderId: string) {
    const order = ORDERS_DB.find(o => o.orderId === orderId);
    if (!order) {
      return { success: false, error: `Order ID '${orderId}' not found.` };
    }
    return { success: true, order };
  }

  public static getOrder(orderId: string): Order | undefined {
    return ORDERS_DB.find(o => o.orderId === orderId);
  }
}
