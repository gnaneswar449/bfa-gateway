export interface User {
  id: string;
  name: string;
  email: string;
  role: 'Student' | 'Faculty' | 'Admin';
  department: string;
  timetable: { courseCode: string; courseName: string; timeSlot: string; room: string }[];
}

export interface RoomBooking {
  bookingId: string;
  userId: string;
  userName: string;
  buildingId: string;
  roomId: string;
  timeSlot: string;
  purpose: string;
  createdAt: string;
  status: 'ACTIVE' | 'CANCELLED';
}

export interface InventoryItem {
  itemId: string;
  category: 'Lab Equipment' | 'Stationery' | 'Electronics' | 'Books';
  name: string;
  price: number;
  stock: number;
  facultyOnly: boolean;
}

export interface Order {
  orderId: string;
  userId: string;
  userName: string;
  itemId: string;
  itemName: string;
  quantity: number;
  totalCost: number;
  status: 'PROCESSING' | 'SHIPPED' | 'DELIVERED';
  orderDate: string;
}

export interface NotificationLog {
  notificationId: string;
  recipientId: string;
  channel: 'EMAIL' | 'SMS';
  message: string;
  sentAt: string;
}
