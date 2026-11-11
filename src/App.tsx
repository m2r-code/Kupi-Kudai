import { useCallback, useEffect, useMemo, useState } from 'react';
import { X } from 'lucide-react';
import { AdminConsole } from './components/AdminConsole.tsx';
import { CartCheckoutDrawer } from './components/CartCheckoutDrawer.tsx';
import { Header, type ActiveTab } from './components/Header.tsx';
import { HeroSection } from './components/HeroSection.tsx';
import { MenuCatalog } from './components/MenuCatalog.tsx';
import { PromoInboxAndToast } from './components/PromoInboxAndToast.tsx';
import { QrAccessView } from './components/QrAccessView.tsx';
import { StorySection } from './components/StorySection.tsx';
import { createSeedDatabase } from './data/seedData.ts';
import type {
  CartItem,
  MenuCategory,
  MenuItem,
  MonthlyAnalyticsBucket,
  OrderRecord,
  OrderStatus,
  PaymentMethod,
  PromoCampaign,
  PushNotificationEntry,
  ServiceType,
  StoreSettings,
  TemperatureOption,
} from './types.ts';
import { buildCartKey, getCartCount, sanitizeWhatsappPhone } from './utils/formatters.ts';

function readInitialTableFromUrl(): string {
  if (typeof window === 'undefined') return 'Meja 01';
  const params = new URLSearchParams(window.location.search);
  const raw = params.get('meja') || params.get('table');
  if (!raw) return 'Meja 01';
  if (raw.toLowerCase() === 'takeaway') return 'Takeaway';
  if (/^\d{1,2}$/.test(raw.trim())) {
    return `Meja ${raw.trim().padStart(2, '0')}`;
  }
  return raw.trim();
}

export default function App() {
  const fallbackSeed = useMemo(() => createSeedDatabase(), []);

  const [menu, setMenu] = useState<MenuItem[]>(fallbackSeed.menu);
  const [promos, setPromos] = useState<PromoCampaign[]>(fallbackSeed.promos);
  const [notifications, setNotifications] = useState<PushNotificationEntry[]>(
    fallbackSeed.notifications,
  );
  const [orders, setOrders] = useState<OrderRecord[]>(fallbackSeed.orders);
  const [monthlyAnalytics, setMonthlyAnalytics] = useState<MonthlyAnalyticsBucket[]>(
    fallbackSeed.monthlyAnalytics,
  );
  const [settings, setSettings] = useState<StoreSettings>(fallbackSeed.settings);
  const [isLoading, setIsLoading] = useState(true);
  const [sseConnected, setSseConnected] = useState(false);

  // Navigation & Customer Interaction State
  const [activeTab, setActiveTab] = useState<ActiveTab>('menu');
  const [selectedTable, setSelectedTable] = useState<string>(() => readInitialTableFromUrl());
  const [cart, setCart] = useState<CartItem[]>([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [appliedPromoCode, setAppliedPromoCode] = useState('');
  const [dismissedTopPromoId, setDismissedTopPromoId] = useState<string | null>(null);

  // Push Notification State
  const [pushEnabled, setPushEnabled] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem('kk_push_enabled') === '1';
  });
  const [pushPermissionState, setPushPermissionState] = useState<
    NotificationPermission | 'unsupported'
  >(() => {
    if (typeof window === 'undefined' || !('Notification' in window)) return 'unsupported';
    return window.Notification.permission;
  });
  const [unreadNotifCount, setUnreadNotifCount] = useState(0);
  const [inboxOpen, setInboxOpen] = useState(false);
  const [liveToast, setLiveToast] = useState<PushNotificationEntry | null>(null);

  // Initial Data Load (Resilient for both full-stack Node server and static GitHub Pages)
  useEffect(() => {
    let mounted = true;

    // Load from localStorage if user previously made local edits
    try {
      const cached = localStorage.getItem('kk_store_db');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed && Array.isArray(parsed.menu) && parsed.menu.length > 0) {
          setMenu(parsed.menu);
          if (parsed.promos) setPromos(parsed.promos);
          if (parsed.notifications) setNotifications(parsed.notifications);
          if (parsed.orders) setOrders(parsed.orders);
          if (parsed.monthlyAnalytics) setMonthlyAnalytics(parsed.monthlyAnalytics);
          if (parsed.settings) setSettings(parsed.settings);
        }
      }
    } catch {
      // Ignored
    }

    async function bootstrap() {
      try {
        const res = await fetch('/api/bootstrap');
        if (!res.ok) throw new Error('Static/offline environment');
        const data = await res.json();
        if (!mounted) return;
        setMenu(data.menu);
        setPromos(data.promos);
        setNotifications(data.notifications);
        setOrders(data.orders);
        setMonthlyAnalytics(data.monthlyAnalytics);
        setSettings(data.settings);
        try {
          localStorage.setItem('kk_store_db', JSON.stringify(data));
        } catch {
          // Ignored
        }
      } catch (err) {
        console.info('Kupikudai: Berjalan dalam mode client-side standalone / GitHub Pages:', err);
      } finally {
        if (mounted) setIsLoading(false);
      }
    }
    void bootstrap();
    return () => {
      mounted = false;
    };
  }, []);

  // Real-time Server-Sent Events subscription (guarded for static GitHub Pages)
  useEffect(() => {
    if (typeof window !== 'undefined' && window.location.hostname.endsWith('github.io')) {
      // On static GitHub Pages, activate standalone mode
      setSseConnected(true);
      return;
    }

    let source: EventSource | null = null;
    try {
      source = new EventSource('/api/events');

      source.addEventListener('connected', () => {
        setSseConnected(true);
      });

      source.addEventListener('menu_updated', (ev) => {
        const updated = JSON.parse((ev as MessageEvent).data) as MenuItem;
        setMenu((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
      });

      source.addEventListener('menu_created', (ev) => {
        const created = JSON.parse((ev as MessageEvent).data) as MenuItem;
        setMenu((prev) => {
          if (prev.some((m) => m.id === created.id)) return prev;
          return [created, ...prev];
        });
      });

      source.addEventListener('order_created', (ev) => {
        const created = JSON.parse((ev as MessageEvent).data) as OrderRecord;
        setOrders((prev) => {
          if (prev.some((o) => o.id === created.id)) return prev;
          return [created, ...prev];
        });
      });

      source.addEventListener('order_updated', (ev) => {
        const updated = JSON.parse((ev as MessageEvent).data) as OrderRecord;
        setOrders((prev) => prev.map((o) => (o.id === updated.id ? updated : o)));
      });

      source.addEventListener('analytics_updated', (ev) => {
        const nextAnalytics = JSON.parse((ev as MessageEvent).data) as MonthlyAnalyticsBucket[];
        setMonthlyAnalytics(nextAnalytics);
      });

      source.addEventListener('promo_updated', (ev) => {
        const nextPromos = JSON.parse((ev as MessageEvent).data) as PromoCampaign[];
        setPromos(nextPromos);
      });

      source.addEventListener('promo_push', (ev) => {
        const notif = JSON.parse((ev as MessageEvent).data) as PushNotificationEntry;
        setNotifications((prev) => [notif, ...prev.filter((n) => n.id !== notif.id)].slice(0, 20));
        setUnreadNotifCount((c) => c + 1);
        setLiveToast(notif);

        if (
          typeof window !== 'undefined' &&
          'Notification' in window &&
          window.Notification.permission === 'granted'
        ) {
          try {
            new window.Notification(`Kupikudai · ${notif.title}`, {
              body: `${notif.message} (Kode: ${notif.code})`,
            });
          } catch {
            // Ignore browser restrictions inside sandboxed iframes
          }
        }
      });

      source.addEventListener('settings_updated', (ev) => {
        const nextSettings = JSON.parse((ev as MessageEvent).data) as StoreSettings;
        setSettings(nextSettings);
      });

      source.onerror = () => {
        setSseConnected(false);
        // If static hosting, close immediately to avoid 404 spam
        source?.close();
      };
    } catch {
      setSseConnected(false);
    }

    return () => {
      source?.close();
    };
  }, []);

  // Cart Actions
  const handleAddToCart = useCallback(
    (
      item: MenuItem,
      quantity: number,
      options?: {
        selectedTemp?: TemperatureOption;
        selectedFlavour?: string;
        notes?: string;
      },
    ) => {
      const unitPrice =
        item.promoPrice && item.promoPrice < item.price ? item.promoPrice : item.price;
      const cartKey = buildCartKey(
        item.id,
        options?.selectedTemp,
        options?.selectedFlavour,
        options?.notes,
      );

      setCart((prev) => {
        const existing = prev.find((c) => c.cartKey === cartKey);
        if (existing) {
          const nextQty = Math.min(item.stock, existing.quantity + quantity);
          return prev.map((c) => (c.cartKey === cartKey ? { ...c, quantity: nextQty } : c));
        }
        return [
          ...prev,
          {
            cartKey,
            menuId: item.id,
            name: item.name,
            category: item.category,
            unitPrice,
            quantity: Math.min(item.stock, quantity),
            image: item.image,
            selectedTemp: options?.selectedTemp,
            selectedFlavour: options?.selectedFlavour,
            notes: options?.notes,
          },
        ];
      });
    },
    [],
  );

  const handleUpdateCartQty = useCallback((cartKey: string, nextQty: number) => {
    if (nextQty <= 0) {
      setCart((prev) => prev.filter((c) => c.cartKey !== cartKey));
      return;
    }
    setCart((prev) =>
      prev.map((c) => (c.cartKey === cartKey ? { ...c, quantity: nextQty } : c)),
    );
  }, []);

  // Push Notification Opt-In
  const handleEnablePush = useCallback(async () => {
    setPushEnabled(true);
    try {
      localStorage.setItem('kk_push_enabled', '1');
    } catch {
      // Ignore
    }
    if (typeof window !== 'undefined' && 'Notification' in window) {
      try {
        const permission = await window.Notification.requestPermission();
        setPushPermissionState(permission);
      } catch {
        // Ignore inside sandboxed frames
      }
    }
    const latestNotif = notifications[0];
    if (latestNotif) {
      setLiveToast(latestNotif);
    }
  }, [notifications]);

  // Save state to localStorage whenever modified to persist changes in static/GitHub Pages mode
  useEffect(() => {
    if (!isLoading) {
      try {
        localStorage.setItem(
          'kk_store_db',
          JSON.stringify({
            menu,
            promos,
            notifications,
            orders,
            monthlyAnalytics,
            settings,
          }),
        );
      } catch {
        // LocalStorage quota or disabled
      }
    }
  }, [menu, promos, notifications, orders, monthlyAnalytics, settings, isLoading]);

  // API Mutations (with resilient fallback for static GitHub Pages)
  const handleSubmitOrder = useCallback(
    async (payload: {
      customerName: string;
      customerPhone: string;
      serviceType: ServiceType;
      tableNumber: string;
      items: OrderRecord['items'];
      subtotal: number;
      discountAmount: number;
      promoCode?: string;
      total: number;
      paymentMethod: PaymentMethod;
      paymentStatus: 'pending' | 'paid';
      paymentReference: string;
      notes?: string;
    }): Promise<OrderRecord> => {
      try {
        const res = await fetch('/api/orders', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (res.ok) {
          const data = await res.json();
          return data as OrderRecord;
        }
      } catch {
        // Fallback for static hosting (GitHub Pages)
      }

      // Standalone client-side creation for GitHub Pages
      const now = new Date();
      const localOrder: OrderRecord = {
        id: `ord_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        createdAt: now.toISOString(),
        monthKey: now.toISOString().slice(0, 7),
        orderStatus: 'Menunggu',
        ...payload,
      };

      // Decrement stock in local state
      setMenu((prev) =>
        prev.map((item) => {
          const ordered = payload.items.find((i) => i.menuId === item.id);
          if (ordered) {
            const nextStock = Math.max(0, item.stock - ordered.quantity);
            return { ...item, stock: nextStock, available: nextStock > 0 };
          }
          return item;
        }),
      );

      setOrders((prev) => [localOrder, ...prev]);
      return localOrder;
    },
    [],
  );

  const handleUpdateMenuItem = useCallback(async (id: string, patch: Partial<MenuItem>) => {
    try {
      const res = await fetch(`/api/menu/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      });
      if (res.ok) {
        const updated = (await res.json()) as MenuItem;
        setMenu((prev) => prev.map((m) => (m.id === updated.id ? updated : m)));
        return;
      }
    } catch {
      // Fallback
    }
    setMenu((prev) =>
      prev.map((m) => {
        if (m.id === id) {
          const merged = { ...m, ...patch };
          if (typeof patch.stock === 'number') {
            merged.available = patch.stock > 0;
          }
          return merged;
        }
        return m;
      }),
    );
  }, []);

  const handleAddMenuItem = useCallback(
    async (item: {
      name: string;
      category: MenuCategory;
      description: string;
      price: number;
      stock: number;
      image?: string;
    }) => {
      try {
        const res = await fetch('/api/menu', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(item),
        });
        if (res.ok) {
          const created = (await res.json()) as MenuItem;
          setMenu((prev) => {
            if (prev.some((m) => m.id === created.id)) return prev;
            return [created, ...prev];
          });
          return;
        }
      } catch {
        // Fallback
      }

      const newItem: MenuItem = {
        id: `custom_${Date.now()}`,
        name: item.name,
        category: item.category,
        description: item.description,
        price: item.price,
        stock: item.stock,
        available: item.stock > 0,
        image: item.image || '/images/menu/kupi-susu-kudai.jpg',
        isRecommended: false,
      };
      setMenu((prev) => [newItem, ...prev]);
    },
    [],
  );

  const handleCreatePromo = useCallback(
    async (promo: {
      code: string;
      title: string;
      message: string;
      discountType: 'percent' | 'fixed';
      discountValue: number;
      minOrder: number;
      targetCategory: MenuCategory | 'Semua Menu';
    }) => {
      try {
        const res = await fetch('/api/promos', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(promo),
        });
        if (res.ok) {
          const created = (await res.json()) as PromoCampaign;
          setPromos((prev) => [created, ...prev.filter((p) => p.id !== created.id)]);
          return;
        }
      } catch {
        // Fallback
      }

      const newPromo: PromoCampaign = {
        id: `promo_${Date.now()}`,
        active: true,
        pushCount: 0,
        ...promo,
      };
      setPromos((prev) => [newPromo, ...prev.filter((p) => p.id !== newPromo.id)]);
    },
    [],
  );

  const handleTogglePromo = useCallback(async (id: string, active: boolean) => {
    try {
      const res = await fetch(`/api/promos/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active }),
      });
      if (res.ok) {
        const updated = (await res.json()) as PromoCampaign;
        setPromos((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
        return;
      }
    } catch {
      // Fallback
    }
    setPromos((prev) => prev.map((p) => (p.id === id ? { ...p, active } : p)));
  }, []);

  const handlePushPromo = useCallback(
    async (id: string) => {
      try {
        await fetch(`/api/promos/${id}/push`, { method: 'POST' });
      } catch {
        // Fallback for static hosting
      }

      const targetPromo = promos.find((p) => p.id === id);
      if (targetPromo) {
        const discountSummary =
          targetPromo.discountType === 'percent'
            ? `${targetPromo.discountValue}%`
            : `Rp ${targetPromo.discountValue.toLocaleString('id-ID')}`;

        const notif: PushNotificationEntry = {
          id: `push_${Date.now()}`,
          promoId: targetPromo.id,
          title: targetPromo.title,
          message: targetPromo.message,
          code: targetPromo.code,
          targetCategory: targetPromo.targetCategory,
          discountSummary,
          sentAt: new Date().toISOString(),
        };
        setNotifications((prev) => [notif, ...prev.filter((n) => n.id !== notif.id)].slice(0, 20));
        setUnreadNotifCount((c) => c + 1);
        setLiveToast(notif);

        if (
          typeof window !== 'undefined' &&
          'Notification' in window &&
          window.Notification.permission === 'granted'
        ) {
          try {
            new window.Notification(`Kupikudai · ${notif.title}`, {
              body: `${notif.message} (Kode: ${notif.code})`,
            });
          } catch {
            // Ignored
          }
        }
      }
    },
    [promos],
  );

  const handleUpdateOrderStatus = useCallback(
    async (id: string, patch: { orderStatus?: OrderStatus; paymentStatus?: 'pending' | 'paid' }) => {
      try {
        const res = await fetch(`/api/orders/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(patch),
        });
        if (res.ok) {
          const updated = (await res.json()) as OrderRecord;
          setOrders((prev) => prev.map((o) => (o.id === updated.id ? updated : o)));
          return;
        }
      } catch {
        // Fallback
      }
      setOrders((prev) => prev.map((o) => (o.id === id ? { ...o, ...patch } : o)));
    },
    [],
  );

  const handleUpdateSettings = useCallback(async (patch: Partial<StoreSettings>) => {
    try {
      const res = await fetch('/api/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      });
      if (res.ok) {
        const updated = (await res.json()) as StoreSettings;
        setSettings(updated);
        return;
      }
    } catch {
      // Fallback
    }
    setSettings((prev) => ({ ...prev, ...patch }));
  }, []);

  const handleTableChange = (nextTable: string) => {
    setSelectedTable(nextTable);
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.searchParams.set('meja', nextTable);
      window.history.replaceState({}, '', url.toString());
    }
  };

  const handleUsePromoCode = (code: string) => {
    setAppliedPromoCode(code);
    setCartOpen(true);
  };

  const activeTopPromo = useMemo(
    () => promos.find((p) => p.active && p.id !== dismissedTopPromoId) ?? null,
    [promos, dismissedTopPromoId],
  );

  const cartCount = useMemo(() => getCartCount(cart), [cart]);

  return (
    <div className="flex min-h-screen flex-col bg-[#F7F5EF] text-[#1A241C]">
      {/* Slim Dismissible Promo Strip (<= 40px) */}
      {activeTab === 'menu' && activeTopPromo && (
        <div className="flex h-10 items-center justify-between gap-4 bg-[#1E4D31] px-4 text-xs text-[#F7F5EF] sm:px-6">
          <div className="mx-auto flex min-w-0 items-center gap-3">
            <p className="truncate">
              <span className="font-semibold">{activeTopPromo.title}</span>
              <span className="hidden text-white/80 sm:inline">
                {' '}
                · Gunakan kode <strong className="font-mono">{activeTopPromo.code}</strong>
              </span>
            </p>
            <button
              type="button"
              onClick={() => handleUsePromoCode(activeTopPromo.code)}
              className="shrink-0 whitespace-nowrap rounded bg-[#F7F5EF] px-2.5 py-0.5 text-[11px] font-semibold text-[#1E4D31] hover:bg-white"
            >
              Pakai Kode
            </button>
          </div>
          <button
            type="button"
            onClick={() => setDismissedTopPromoId(activeTopPromo.id)}
            aria-label="Tutup banner promo"
            className="shrink-0 p-1 text-white/80 hover:text-white"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* 3-Zone Header */}
      <Header
        activeTab={activeTab}
        onNavigate={(tab) => {
          setActiveTab(tab);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        cartCount={cartCount}
        onOpenCart={() => setCartOpen(true)}
      />

      {/* Main Content */}
      <main className="flex-1">
        {isLoading ? (
          <div className="mx-auto max-w-6xl space-y-6 px-4 py-12 sm:px-6 lg:px-8">
            <div className="h-72 animate-pulse rounded-2xl bg-[#EDE9DF]" />
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3, 4, 5, 6].map((n) => (
                <div key={n} className="h-80 animate-pulse rounded-2xl bg-[#EDE9DF]" />
              ))}
            </div>
          </div>
        ) : activeTab === 'menu' ? (
          <>
            <HeroSection
              settings={settings}
              selectedTable={selectedTable}
              onChangeTable={handleTableChange}
              onExploreMenu={() => {
                document
                  .getElementById('katalog-menu')
                  ?.scrollIntoView({ behavior: 'smooth' });
              }}
              onOpenQrStudio={() => setActiveTab('qr')}
              pushEnabled={pushEnabled}
              pushPermissionState={pushPermissionState}
              unreadNotifCount={unreadNotifCount}
              onTogglePushOptIn={handleEnablePush}
              onOpenNotifInbox={() => {
                setUnreadNotifCount(0);
                setInboxOpen(true);
              }}
            />
            <MenuCatalog
              menu={menu}
              cart={cart}
              onAddToCart={handleAddToCart}
              onUpdateCartQty={handleUpdateCartQty}
            />
          </>
        ) : activeTab === 'story' ? (
          <StorySection settings={settings} onBackToMenu={() => setActiveTab('menu')} />
        ) : activeTab === 'qr' ? (
          <QrAccessView
            settings={settings}
            onSimulateScan={(tableLabel) => {
              handleTableChange(tableLabel);
              setActiveTab('menu');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
          />
        ) : (
          <AdminConsole
            menu={menu}
            monthlyAnalytics={monthlyAnalytics}
            promos={promos}
            notifications={notifications}
            orders={orders}
            settings={settings}
            sseConnected={sseConnected}
            onUpdateMenuItem={handleUpdateMenuItem}
            onAddMenuItem={handleAddMenuItem}
            onCreatePromo={handleCreatePromo}
            onTogglePromo={handleTogglePromo}
            onPushPromo={handlePushPromo}
            onUpdateOrderStatus={handleUpdateOrderStatus}
            onUpdateSettings={handleUpdateSettings}
          />
        )}
      </main>

      {/* Clean Editorial Footer */}
      <footer className="border-t border-[rgba(26,36,28,0.1)] bg-[#EDE9DF]/55">
        <div className="mx-auto flex max-w-6xl flex-col justify-between gap-4 px-4 py-8 text-xs text-[#525F55] sm:flex-row sm:items-center sm:px-6 lg:px-8">
          <div>
            <p className="font-serif text-base font-semibold text-[#1E4D31]">kupikudai</p>
            <p className="mt-1">{settings.address}</p>
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <a
              href="https://www.instagram.com/kupikudai/"
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-[#1A241C] hover:underline"
            >
              Instagram {settings.instagramHandle}
            </a>
            <span aria-hidden="true">·</span>
            <a
              href={`https://wa.me/${sanitizeWhatsappPhone(settings.whatsappNumber)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-[#1A241C] hover:underline"
            >
              WhatsApp Kasir
            </a>
            <span aria-hidden="true">·</span>
            <span>© 2026 kupikudai Bogor</span>
          </div>
        </div>
      </footer>

      {/* Cart & Integrated Digital Payment + WhatsApp Drawer */}
      <CartCheckoutDrawer
        open={cartOpen}
        onClose={() => setCartOpen(false)}
        cart={cart}
        menu={menu}
        promos={promos}
        settings={settings}
        selectedTable={selectedTable}
        onChangeTable={handleTableChange}
        appliedPromoCode={appliedPromoCode}
        onApplyPromoCode={setAppliedPromoCode}
        onUpdateQty={handleUpdateCartQty}
        onClearCart={() => setCart([])}
        onSubmitOrder={handleSubmitOrder}
      />

      {/* Push Notification Live Toast & Inbox */}
      <PromoInboxAndToast
        liveToast={liveToast}
        onDismissToast={() => setLiveToast(null)}
        inboxOpen={inboxOpen}
        onCloseInbox={() => setInboxOpen(false)}
        notifications={notifications}
        pushEnabled={pushEnabled}
        pushPermissionState={pushPermissionState}
        onEnablePush={handleEnablePush}
        onUsePromoCode={handleUsePromoCode}
      />
    </div>
  );
}
