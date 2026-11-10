export type MenuCategory =
  | 'Menu Nasi'
  | 'Otentik Palembang'
  | 'Pasta Iboen'
  | 'Menu Lainnya'
  | 'Cemilan'
  | 'Signature Coffees'
  | 'Ice Blend & Smoothies'
  | 'Noncoffee'
  | 'Classic Coffee'
  | 'Mocktails, Affogato & Manual Brew';

export type TemperatureOption = 'Cold' | 'Hot';

export interface MenuItem {
  id: string;
  name: string;
  category: MenuCategory;
  description: string;
  price: number; // in IDR, e.g. 35000
  promoPrice?: number | null;
  stock: number;
  available: boolean;
  isRecommended?: boolean;
  image: string;
  temperatures?: TemperatureOption[];
  flavours?: string[];
  pdfNote?: string;
}

export interface CartItem {
  cartKey: string;
  menuId: string;
  name: string;
  category: MenuCategory;
  unitPrice: number;
  quantity: number;
  image: string;
  selectedTemp?: TemperatureOption;
  selectedFlavour?: string;
  notes?: string;
}

export type ServiceType = 'dine-in' | 'takeaway' | 'delivery';

export type PaymentMethod =
  | 'qris'
  | 'gopay'
  | 'ovo'
  | 'dana'
  | 'va_bca'
  | 'va_mandiri'
  | 'cashier';

export type PaymentStatus = 'pending' | 'paid';

export type OrderStatus = 'Menunggu' | 'Diproses' | 'Selesai';

export interface OrderItemSnapshot {
  menuId: string;
  name: string;
  category: MenuCategory;
  quantity: number;
  unitPrice: number;
  selectedTemp?: TemperatureOption;
  selectedFlavour?: string;
  notes?: string;
}

export interface OrderRecord {
  id: string;
  createdAt: string;
  monthKey: string; // e.g. "2026-11"
  customerName: string;
  customerPhone: string;
  serviceType: ServiceType;
  tableNumber: string;
  items: OrderItemSnapshot[];
  subtotal: number;
  discountAmount: number;
  promoCode?: string;
  total: number;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  paymentReference: string;
  orderStatus: OrderStatus;
  notes?: string;
}

export interface PromoCampaign {
  id: string;
  code: string;
  title: string;
  message: string;
  discountType: 'percent' | 'fixed';
  discountValue: number;
  minOrder: number;
  targetCategory: MenuCategory | 'Semua Menu';
  active: boolean;
  lastPushedAt?: string;
  pushCount: number;
}

export interface PushNotificationEntry {
  id: string;
  promoId: string;
  code: string;
  title: string;
  message: string;
  targetCategory: string;
  discountSummary: string;
  sentAt: string;
}

export interface MonthlyMenuSale {
  menuId: string;
  name: string;
  category: MenuCategory;
  unitsSold: number;
  revenue: number;
}

export interface MonthlyAnalyticsBucket {
  monthKey: string; // YYYY-MM
  label: string; // e.g. "November 2026"
  items: MonthlyMenuSale[];
}

export interface StoreSettings {
  storeName: string;
  instagramHandle: string;
  whatsappNumber: string;
  address: string;
  openingHours: string;
  qrisMerchantName: string;
  qrisNmid: string;
}

export interface StoreDatabase {
  menu: MenuItem[];
  promos: PromoCampaign[];
  notifications: PushNotificationEntry[];
  orders: OrderRecord[];
  monthlyAnalytics: MonthlyAnalyticsBucket[];
  settings: StoreSettings;
}
