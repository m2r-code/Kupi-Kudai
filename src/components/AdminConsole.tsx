import { useMemo, useState } from 'react';
import {
  BarChart3,
  BellPlus,
  Check,
  Package,
  Plus,
  Send,
  Settings,
  ShoppingBag,
  TrendingUp,
} from 'lucide-react';
import { MENU_CATEGORIES } from '../data/seedData.ts';
import type {
  MenuCategory,
  MenuItem,
  MonthlyAnalyticsBucket,
  OrderRecord,
  OrderStatus,
  PromoCampaign,
  PushNotificationEntry,
  StoreSettings,
} from '../types.ts';
import { formatDateTimeId, formatRp, formatShortRp } from '../utils/formatters.ts';

interface AdminConsoleProps {
  menu: MenuItem[];
  monthlyAnalytics: MonthlyAnalyticsBucket[];
  promos: PromoCampaign[];
  notifications: PushNotificationEntry[];
  orders: OrderRecord[];
  settings: StoreSettings;
  sseConnected: boolean;
  onUpdateMenuItem: (id: string, patch: Partial<MenuItem>) => Promise<void>;
  onAddMenuItem: (item: {
    name: string;
    category: MenuCategory;
    description: string;
    price: number;
    stock: number;
  }) => Promise<void>;
  onCreatePromo: (promo: {
    code: string;
    title: string;
    message: string;
    discountType: 'percent' | 'fixed';
    discountValue: number;
    minOrder: number;
    targetCategory: MenuCategory | 'Semua Menu';
  }) => Promise<void>;
  onTogglePromo: (id: string, active: boolean) => Promise<void>;
  onPushPromo: (id: string) => Promise<void>;
  onUpdateOrderStatus: (
    id: string,
    patch: { orderStatus?: OrderStatus; paymentStatus?: 'pending' | 'paid' },
  ) => Promise<void>;
  onUpdateSettings: (patch: Partial<StoreSettings>) => Promise<void>;
}

type AdminSection = 'inventory' | 'analytics' | 'push' | 'orders';

export function AdminConsole({
  menu,
  monthlyAnalytics,
  promos,
  notifications,
  orders,
  settings,
  sseConnected,
  onUpdateMenuItem,
  onAddMenuItem,
  onCreatePromo,
  onTogglePromo,
  onPushPromo,
  onUpdateOrderStatus,
  onUpdateSettings,
}: AdminConsoleProps) {
  const [section, setSection] = useState<AdminSection>('inventory');

  // Inventory filters & inline edits
  const [invSearch, setInvSearch] = useState('');
  const [invCategory, setInvCategory] = useState<string>('Semua');
  const [invStockFilter, setInvStockFilter] = useState<'all' | 'low' | 'out'>('all');
  const [priceDrafts, setPriceDrafts] = useState<Record<string, string>>({});
  const [promoPriceDrafts, setPromoPriceDrafts] = useState<Record<string, string>>({});
  const [savedFlashId, setSavedFlashId] = useState<string>('');
  const [showAddMenuModal, setShowAddMenuModal] = useState(false);

  // Add Menu form
  const [newName, setNewName] = useState('');
  const [newCat, setNewCat] = useState<MenuCategory>('Signature Coffees');
  const [newDesc, setNewDesc] = useState('');
  const [newPrice, setNewPrice] = useState('32000');
  const [newStock, setNewStock] = useState('20');

  // Analytics state
  const [selectedMonthKey, setSelectedMonthKey] = useState(
    monthlyAnalytics[monthlyAnalytics.length - 1]?.monthKey ?? '2026-11',
  );
  const [hoveredTrendMonth, setHoveredTrendMonth] = useState<string | null>(null);

  // Promo composer state
  const [promoCode, setPromoCode] = useState('');
  const [promoTitle, setPromoTitle] = useState('');
  const [promoMessage, setPromoMessage] = useState('');
  const [promoType, setPromoType] = useState<'percent' | 'fixed'>('percent');
  const [promoValue, setPromoValue] = useState('15');
  const [promoMinOrder, setPromoMinOrder] = useState('50000');
  const [promoTargetCat, setPromoTargetCat] = useState<MenuCategory | 'Semua Menu'>(
    'Semua Menu',
  );
  const [pushFeedback, setPushFeedback] = useState('');

  // Store settings draft
  const [waDraft, setWaDraft] = useState(settings.whatsappNumber);
  const [hoursDraft, setHoursDraft] = useState(settings.openingHours);
  const [qrisMerchantDraft, setQrisMerchantDraft] = useState(settings.qrisMerchantName);
  const [settingsSaved, setSettingsSaved] = useState(false);

  const filteredMenu = useMemo(() => {
    const q = invSearch.trim().toLowerCase();
    return menu.filter((item) => {
      if (invCategory !== 'Semua' && item.category !== invCategory) return false;
      if (invStockFilter === 'low' && (item.stock > 5 || item.stock === 0)) return false;
      if (invStockFilter === 'out' && item.stock > 0 && item.available) return false;
      if (!q) return true;
      return item.name.toLowerCase().includes(q) || item.category.toLowerCase().includes(q);
    });
  }, [menu, invSearch, invCategory, invStockFilter]);

  const lowStockCount = useMemo(
    () => menu.filter((m) => m.stock > 0 && m.stock <= 5).length,
    [menu],
  );
  const outOfStockCount = useMemo(
    () => menu.filter((m) => m.stock === 0 || !m.available).length,
    [menu],
  );

  const flashSaved = (id: string) => {
    setSavedFlashId(id);
    setTimeout(() => setSavedFlashId((cur) => (cur === id ? '' : cur)), 1600);
  };

  const handleSavePrice = async (item: MenuItem) => {
    const rawPrice = priceDrafts[item.id];
    const rawPromo = promoPriceDrafts[item.id];
    const nextPrice = rawPrice !== undefined ? Number(rawPrice) : item.price;
    const nextPromo =
      rawPromo !== undefined
        ? rawPromo.trim() === '' || Number(rawPromo) === 0
          ? null
          : Number(rawPromo)
        : item.promoPrice ?? null;

    if (!Number.isFinite(nextPrice) || nextPrice < 0) return;

    await onUpdateMenuItem(item.id, {
      price: nextPrice,
      promoPrice: nextPromo,
    });
    flashSaved(item.id);
  };

  const handleCreateMenuSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !Number(newPrice)) return;
    await onAddMenuItem({
      name: newName.trim(),
      category: newCat,
      description: newDesc.trim() || 'Sajian segar khas dapur Kupikudai Bogor.',
      price: Number(newPrice),
      stock: Number(newStock) || 15,
    });
    setNewName('');
    setNewDesc('');
    setShowAddMenuModal(false);
  };

  // Analytics computed metrics
  const activeMonthBucket = useMemo(
    () =>
      monthlyAnalytics.find((b) => b.monthKey === selectedMonthKey) ??
      monthlyAnalytics[monthlyAnalytics.length - 1],
    [monthlyAnalytics, selectedMonthKey],
  );

  const sortedMonthlyItems = useMemo(() => {
    if (!activeMonthBucket) return [];
    return [...activeMonthBucket.items].sort((a, b) => b.unitsSold - a.unitsSold);
  }, [activeMonthBucket]);

  const top8Items = sortedMonthlyItems.slice(0, 8);
  const maxTopUnits = top8Items[0]?.unitsSold || 1;

  const monthlyKpis = useMemo(() => {
    const totalUnits = sortedMonthlyItems.reduce((s, r) => s + r.unitsSold, 0);
    const totalRevenue = sortedMonthlyItems.reduce((s, r) => s + r.revenue, 0);
    const topItem = sortedMonthlyItems[0];

    const currentIdx = monthlyAnalytics.findIndex((b) => b.monthKey === selectedMonthKey);
    const prevBucket = currentIdx > 0 ? monthlyAnalytics[currentIdx - 1] : null;
    const prevUnits = prevBucket
      ? prevBucket.items.reduce((s, r) => s + r.unitsSold, 0)
      : 0;
    const growthPct =
      prevUnits > 0 ? Math.round(((totalUnits - prevUnits) / prevUnits) * 100) : null;

    return { totalUnits, totalRevenue, topItem, growthPct };
  }, [sortedMonthlyItems, monthlyAnalytics, selectedMonthKey]);

  const categoryTrendData = useMemo(() => {
    return monthlyAnalytics.map((bucket) => {
      const total = bucket.items.reduce((s, i) => s + i.unitsSold, 0);
      const palembang = bucket.items
        .filter((i) => i.category === 'Otentik Palembang')
        .reduce((s, i) => s + i.unitsSold, 0);
      const coffee = bucket.items
        .filter((i) => i.category === 'Signature Coffees' || i.category === 'Classic Coffee')
        .reduce((s, i) => s + i.unitsSold, 0);
      const pastaNasi = bucket.items
        .filter((i) => i.category === 'Pasta Iboen' || i.category === 'Menu Nasi')
        .reduce((s, i) => s + i.unitsSold, 0);
      return {
        monthKey: bucket.monthKey,
        shortLabel: bucket.label.split(' ')[0].slice(0, 3) + ' ' + bucket.monthKey.slice(2, 4),
        total,
        palembang,
        coffee,
        pastaNasi,
      };
    });
  }, [monthlyAnalytics]);

  const maxTrendValue = Math.max(1, ...categoryTrendData.map((d) => d.total));

  const handleCreatePromoSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!promoCode.trim() || !promoTitle.trim()) return;
    await onCreatePromo({
      code: promoCode.trim().toUpperCase(),
      title: promoTitle.trim(),
      message: promoMessage.trim() || promoTitle.trim(),
      discountType: promoType,
      discountValue: Number(promoValue) || 10,
      minOrder: Number(promoMinOrder) || 0,
      targetCategory: promoTargetCat,
    });
    setPromoCode('');
    setPromoTitle('');
    setPromoMessage('');
    setPushFeedback('Promo baru berhasil dibuat. Klik "Kirim Push" untuk menyiarkan ke pelanggan.');
    setTimeout(() => setPushFeedback(''), 4000);
  };

  const handleFirePush = async (promo: PromoCampaign) => {
    await onPushPromo(promo.id);
    setPushFeedback(`Push notifikasi untuk promo ${promo.code} terkirim ke seluruh pelanggan aktif.`);
    setTimeout(() => setPushFeedback(''), 4000);
  };

  const handleSaveSettingsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onUpdateSettings({
      whatsappNumber: waDraft,
      openingHours: hoursDraft,
      qrisMerchantName: qrisMerchantDraft,
    });
    setSettingsSaved(true);
    setTimeout(() => setSettingsSaved(false), 2500);
  };

  const navButtons: { id: AdminSection; label: string; icon: typeof Package }[] = [
    { id: 'inventory', label: 'Stok & Harga Real-Time', icon: Package },
    { id: 'analytics', label: 'Analitik Terlaris', icon: BarChart3 },
    { id: 'push', label: 'Push Notifikasi Promo', icon: BellPlus },
    { id: 'orders', label: 'Pesanan & Pengaturan', icon: ShoppingBag },
  ];

  return (
    <section className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Header Breadcrumb Bar */}
      <div className="flex flex-col justify-between gap-4 border-b border-[rgba(26,36,28,0.1)] pb-6 sm:flex-row sm:items-center">
        <div>
          <p className="text-xs font-medium text-[#525F55]">
            Konsol Admin Kupikudai ·{' '}
            <span className={sseConnected ? 'text-[#1E4D31]' : 'text-[#B45309]'}>
              {sseConnected ? 'Sinkronisasi Real-Time Aktif' : 'Menghubungkan ulang...'}
            </span>
          </p>
          <h2 className="mt-1 font-serif text-3xl font-semibold tracking-tight text-[#1A241C]">
            Manajemen Kedai & Analitik Bulanan
          </h2>
        </div>

        <div className="flex items-center gap-3 text-xs text-[#525F55] tabular-nums">
          <span>
            Total Menu: <strong className="text-[#1A241C]">{menu.length}</strong>
          </span>
          <span aria-hidden="true">·</span>
          <span>
            Stok Menipis: <strong className="text-[#B45309]">{lowStockCount}</strong>
          </span>
          <span aria-hidden="true">·</span>
          <span>
            Habis: <strong className="text-[#B91C1C]">{outOfStockCount}</strong>
          </span>
        </div>
      </div>

      <div className="mt-7 grid grid-cols-1 gap-8 lg:grid-cols-12">
        {/* Sidebar Navigation */}
        <aside className="lg:col-span-3">
          <nav className="flex flex-row gap-1.5 overflow-x-auto pb-2 lg:flex-col lg:pb-0">
            {navButtons.map((btn) => {
              const Icon = btn.icon;
              const active = section === btn.id;
              return (
                <button
                  key={btn.id}
                  type="button"
                  onClick={() => setSection(btn.id)}
                  className={`flex min-h-11 shrink-0 items-center gap-2.5 whitespace-nowrap rounded-xl px-3.5 py-2.5 text-left text-xs font-medium transition-colors ${
                    active
                      ? 'bg-[#1E4D31] text-[#F7F5EF]'
                      : 'border border-[rgba(26,36,28,0.1)] bg-white text-[#1A241C] hover:bg-[#EDE9DF]'
                  }`}
                >
                  <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                  <span>{btn.label}</span>
                </button>
              );
            })}
          </nav>
        </aside>

        {/* Main Admin Viewport */}
        <div className="min-w-0 lg:col-span-9">
          {/* 1. REAL-TIME STOCK & PRICE MANAGEMENT */}
          {section === 'inventory' && (
            <div className="space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[rgba(26,36,28,0.1)] bg-white p-4">
                <div className="flex flex-wrap items-center gap-2.5">
                  <input
                    type="search"
                    value={invSearch}
                    onChange={(e) => setInvSearch(e.target.value)}
                    placeholder="Cari nama menu..."
                    className="min-h-10 w-52 rounded-lg border border-[rgba(26,36,28,0.16)] bg-[#F7F5EF] px-3 py-1.5 text-xs text-[#1A241C] focus:border-[#1E4D31] focus:outline-none"
                  />
                  <select
                    value={invCategory}
                    onChange={(e) => setInvCategory(e.target.value)}
                    aria-label="Filter kategori admin"
                    className="min-h-10 rounded-lg border border-[rgba(26,36,28,0.16)] bg-[#F7F5EF] px-3 py-1.5 text-xs text-[#1A241C]"
                  >
                    <option value="Semua">Semua Kategori</option>
                    {MENU_CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>

                  <div className="flex items-center gap-1 rounded-lg bg-[#EDE9DF] p-1">
                    {(
                      [
                        { id: 'all', label: 'Semua' },
                        { id: 'low', label: `Menipis (${lowStockCount})` },
                        { id: 'out', label: `Habis (${outOfStockCount})` },
                      ] as const
                    ).map((f) => (
                      <button
                        key={f.id}
                        type="button"
                        onClick={() => setInvStockFilter(f.id)}
                        className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                          invStockFilter === f.id
                            ? 'bg-white text-[#1A241C]'
                            : 'text-[#525F55] hover:text-[#1A241C]'
                        }`}
                      >
                        {f.label}
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setShowAddMenuModal(true)}
                  className="inline-flex min-h-10 items-center gap-1.5 rounded-lg bg-[#1E4D31] px-3.5 py-2 text-xs font-medium text-[#F7F5EF] hover:bg-[#173C26]"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Tambah Menu Baru</span>
                </button>
              </div>

              <div className="overflow-hidden rounded-xl border border-[rgba(26,36,28,0.11)] bg-white">
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-left text-xs">
                    <thead>
                      <tr className="border-b border-[rgba(26,36,28,0.1)] bg-[#F7F5EF] text-[#525F55]">
                        <th className="px-4 py-3 font-semibold">Menu & Kategori</th>
                        <th className="px-4 py-3 font-semibold">Harga Normal (Rp)</th>
                        <th className="px-4 py-3 font-semibold">Harga Promo</th>
                        <th className="px-4 py-3 font-semibold">Stok Porsi</th>
                        <th className="px-4 py-3 font-semibold">Status</th>
                        <th className="px-4 py-3 text-right font-semibold">Simpan</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[rgba(26,36,28,0.08)]">
                      {filteredMenu.map((item) => {
                        const priceVal =
                          priceDrafts[item.id] !== undefined
                            ? priceDrafts[item.id]
                            : String(item.price);
                        const promoVal =
                          promoPriceDrafts[item.id] !== undefined
                            ? promoPriceDrafts[item.id]
                            : item.promoPrice
                              ? String(item.promoPrice)
                              : '';
                        const isDirty =
                          priceDrafts[item.id] !== undefined ||
                          promoPriceDrafts[item.id] !== undefined;
                        const isFlashed = savedFlashId === item.id;

                        return (
                          <tr key={item.id} className="hover:bg-[#F7F5EF]/50">
                            <td className="px-4 py-3">
                              <p className="font-medium text-[#1A241C]">{item.name}</p>
                              <p className="text-[11px] text-[#525F55]">{item.category}</p>
                            </td>

                            <td className="px-4 py-3">
                              <input
                                type="number"
                                step={1000}
                                min={0}
                                value={priceVal}
                                onChange={(e) =>
                                  setPriceDrafts((prev) => ({
                                    ...prev,
                                    [item.id]: e.target.value,
                                  }))
                                }
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') void handleSavePrice(item);
                                }}
                                aria-label={`Harga normal ${item.name}`}
                                className="h-9 w-28 rounded-lg border border-[rgba(26,36,28,0.16)] bg-[#F7F5EF] px-2.5 font-mono text-xs text-[#1A241C] tabular-nums focus:border-[#1E4D31] focus:outline-none"
                              />
                            </td>

                            <td className="px-4 py-3">
                              <input
                                type="number"
                                step={1000}
                                min={0}
                                placeholder="Opsional"
                                value={promoVal}
                                onChange={(e) =>
                                  setPromoPriceDrafts((prev) => ({
                                    ...prev,
                                    [item.id]: e.target.value,
                                  }))
                                }
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') void handleSavePrice(item);
                                }}
                                aria-label={`Harga promo ${item.name}`}
                                className="h-9 w-28 rounded-lg border border-[rgba(26,36,28,0.16)] bg-[#F7F5EF] px-2.5 font-mono text-xs text-[#1A241C] tabular-nums focus:border-[#1E4D31] focus:outline-none"
                              />
                            </td>

                            <td className="px-4 py-3">
                              <div className="inline-flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={() =>
                                    void onUpdateMenuItem(item.id, {
                                      stock: Math.max(0, item.stock - 1),
                                    })
                                  }
                                  className="h-8 w-8 rounded border border-[rgba(26,36,28,0.15)] bg-white font-mono text-xs hover:bg-[#EDE9DF]"
                                >
                                  -
                                </button>
                                <span className="min-w-8 text-center font-mono font-semibold text-[#1A241C] tabular-nums">
                                  {item.stock}
                                </span>
                                <button
                                  type="button"
                                  onClick={() =>
                                    void onUpdateMenuItem(item.id, {
                                      stock: item.stock + 1,
                                      available: true,
                                    })
                                  }
                                  className="h-8 w-8 rounded border border-[rgba(26,36,28,0.15)] bg-white font-mono text-xs hover:bg-[#EDE9DF]"
                                >
                                  +
                                </button>
                                <button
                                  type="button"
                                  onClick={() =>
                                    void onUpdateMenuItem(item.id, {
                                      stock: item.stock + 10,
                                      available: true,
                                    })
                                  }
                                  className="ml-1 h-8 rounded border border-[rgba(26,36,28,0.15)] bg-[#F7F5EF] px-2 font-mono text-[11px] font-medium text-[#1E4D31] hover:bg-[#EDE9DF]"
                                >
                                  +10
                                </button>
                              </div>
                            </td>

                            <td className="px-4 py-3">
                              <button
                                type="button"
                                onClick={() =>
                                  void onUpdateMenuItem(item.id, {
                                    available: !item.available,
                                  })
                                }
                                className={`min-h-8 rounded-md px-2.5 py-1 text-[11px] font-semibold ${
                                  item.available && item.stock > 0
                                    ? 'bg-[#DCFCE7] text-[#166534]'
                                    : 'bg-[#FEE2E2] text-[#991B1B]'
                                }`}
                              >
                                {item.available && item.stock > 0 ? 'Tersedia' : 'Habis'}
                              </button>
                            </td>

                            <td className="px-4 py-3 text-right">
                              <button
                                type="button"
                                onClick={() => void handleSavePrice(item)}
                                className={`inline-flex min-h-8 items-center gap-1 rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                                  isFlashed
                                    ? 'bg-[#16A34A] text-white'
                                    : isDirty
                                      ? 'bg-[#1E4D31] text-[#F7F5EF]'
                                      : 'border border-[rgba(26,36,28,0.14)] bg-white text-[#1A241C] hover:bg-[#EDE9DF]'
                                }`}
                              >
                                {isFlashed && <Check className="h-3 w-3" />}
                                <span>{isFlashed ? 'Tersimpan' : 'Update'}</span>
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* 2. MONTHLY BEST-SELLING MENU ANALYTICS */}
          {section === 'analytics' && activeMonthBucket && (
            <div className="space-y-6">
              {/* Month Picker */}
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[rgba(26,36,28,0.1)] bg-white p-4">
                <div>
                  <h3 className="text-sm font-semibold text-[#1A241C]">
                    Laporan Tren Menu Terlaris Bulanan
                  </h3>
                  <p className="text-xs text-[#525F55]">
                    Pesanan pelanggan baru di bulan berjalan langsung memperbarui angka grafik ini.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-1.5 rounded-lg bg-[#EDE9DF] p-1">
                  {monthlyAnalytics.map((bucket) => (
                    <button
                      key={bucket.monthKey}
                      type="button"
                      onClick={() => setSelectedMonthKey(bucket.monthKey)}
                      className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                        selectedMonthKey === bucket.monthKey
                          ? 'bg-white text-[#1A241C]'
                          : 'text-[#525F55] hover:text-[#1A241C]'
                      }`}
                    >
                      {bucket.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* 4 KPI Summary Strip */}
              <div className="grid grid-cols-1 divide-y divide-[rgba(26,36,28,0.1)] rounded-xl border border-[rgba(26,36,28,0.1)] bg-white sm:grid-cols-2 sm:divide-y-0 lg:grid-cols-4 lg:divide-x">
                <div className="p-4">
                  <p className="text-xs font-medium text-[#525F55]">Total Porsi Terjual</p>
                  <p className="mt-1 font-mono text-2xl font-semibold text-[#1A241C] tabular-nums">
                    {monthlyKpis.totalUnits.toLocaleString('id-ID')}
                  </p>
                  <p className="mt-0.5 text-[11px] text-[#525F55]">{activeMonthBucket.label}</p>
                </div>

                <div className="p-4">
                  <p className="text-xs font-medium text-[#525F55]">Omzet Penjualan Menu</p>
                  <p className="mt-1 font-mono text-2xl font-semibold text-[#1E4D31] tabular-nums">
                    {formatShortRp(monthlyKpis.totalRevenue)}
                  </p>
                  <p className="mt-0.5 font-mono text-[11px] text-[#525F55] tabular-nums">
                    {formatRp(monthlyKpis.totalRevenue)}
                  </p>
                </div>

                <div className="p-4">
                  <p className="text-xs font-medium text-[#525F55]">Menu #1 Paling Laris</p>
                  <p className="mt-1 truncate font-serif text-lg font-semibold text-[#1A241C]">
                    {monthlyKpis.topItem?.name ?? '-'}
                  </p>
                  <p className="mt-0.5 font-mono text-[11px] text-[#1E4D31] tabular-nums">
                    {monthlyKpis.topItem?.unitsSold ?? 0} porsi terjual
                  </p>
                </div>

                <div className="p-4">
                  <p className="text-xs font-medium text-[#525F55]">Perubahan Volume</p>
                  <p className="mt-1 font-mono text-2xl font-semibold text-[#1A241C] tabular-nums">
                    {monthlyKpis.growthPct === null
                      ? 'Baseline'
                      : `${monthlyKpis.growthPct >= 0 ? '+' : ''}${monthlyKpis.growthPct}%`}
                  </p>
                  <p className="mt-0.5 text-[11px] text-[#525F55]">
                    {selectedMonthKey === '2026-11'
                      ? 'Bulan berjalan (parsial)'
                      : 'Dibanding bulan sebelumnya'}
                  </p>
                </div>
              </div>

              {/* Charts Grid */}
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
                {/* Top 8 Best Sellers Bar Chart */}
                <div className="rounded-xl border border-[rgba(26,36,28,0.1)] bg-white p-5 lg:col-span-7">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-semibold text-[#1A241C]">
                      Top 8 Menu Paling Laris — {activeMonthBucket.label}
                    </h4>
                    <TrendingUp className="h-4 w-4 text-[#1E4D31]" aria-hidden="true" />
                  </div>

                  <div className="mt-4 space-y-3.5">
                    {top8Items.map((row, idx) => {
                      const pct = Math.max(6, Math.round((row.unitsSold / maxTopUnits) * 100));
                      return (
                        <div key={row.menuId} className="space-y-1">
                          <div className="flex items-baseline justify-between gap-2 text-xs">
                            <span className="truncate font-medium text-[#1A241C]">
                              <span className="mr-1.5 font-mono text-[#525F55] tabular-nums">
                                0{idx + 1}.
                              </span>
                              {row.name}
                            </span>
                            <span className="shrink-0 font-mono text-[#1A241C] tabular-nums">
                              <strong>{row.unitsSold}</strong> porsi · {formatShortRp(row.revenue)}
                            </span>
                          </div>
                          <div className="h-2.5 w-full overflow-hidden rounded-full bg-[#EDE9DF]">
                            <div
                              className="h-full rounded-full bg-[#1E4D31]"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* 4-Month Category Trend SVG Chart */}
                <div className="rounded-xl border border-[rgba(26,36,28,0.1)] bg-white p-5 lg:col-span-5">
                  <h4 className="text-sm font-semibold text-[#1A241C]">
                    Tren Penjualan Antar Bulan
                  </h4>
                  <p className="mt-0.5 text-xs text-[#525F55]">
                    Perbandingan volume terjual per kategori inti
                  </p>

                  <div className="mt-5">
                    <svg
                      viewBox="0 0 320 200"
                      className="w-full overflow-visible"
                      role="img"
                      aria-label="Grafik tren penjualan 4 bulan Kupikudai"
                    >
                      {[0, 0.25, 0.5, 0.75, 1].map((stepRatio) => {
                        const y = 165 - stepRatio * 135;
                        return (
                          <line
                            key={stepRatio}
                            x1={10}
                            x2={310}
                            y1={y}
                            y2={y}
                            stroke="rgba(26,36,28,0.08)"
                            strokeDasharray="3 3"
                          />
                        );
                      })}

                      {categoryTrendData.map((d, i) => {
                        const xCenter = 48 + i * 74;
                        const totalH = Math.max(8, (d.total / maxTrendValue) * 135);
                        const coffeeH = Math.max(4, (d.coffee / maxTrendValue) * 135);
                        const palembangH = Math.max(4, (d.palembang / maxTrendValue) * 135);
                        const isHovered = hoveredTrendMonth === d.monthKey;

                        return (
                          <g
                            key={d.monthKey}
                            onMouseEnter={() => setHoveredTrendMonth(d.monthKey)}
                            onMouseLeave={() => setHoveredTrendMonth(null)}
                            onClick={() => setSelectedMonthKey(d.monthKey)}
                            className="cursor-pointer"
                          >
                            <rect
                              x={xCenter - 22}
                              y={165 - totalH}
                              width={14}
                              height={totalH}
                              rx={3}
                              fill={isHovered ? '#173C26' : '#1E4D31'}
                            />
                            <rect
                              x={xCenter - 5}
                              y={165 - coffeeH}
                              width={10}
                              height={coffeeH}
                              rx={2}
                              fill="#5D8C6E"
                            />
                            <rect
                              x={xCenter + 8}
                              y={165 - palembangH}
                              width={10}
                              height={palembangH}
                              rx={2}
                              fill="#C28D4E"
                            />
                            <text
                              x={xCenter}
                              y={184}
                              textAnchor="middle"
                              className="fill-[#525F55] text-[10px]"
                            >
                              {d.shortLabel}
                            </text>
                            <text
                              x={xCenter - 15}
                              y={159 - totalH}
                              textAnchor="middle"
                              className="fill-[#1A241C] font-mono text-[9px] font-semibold"
                            >
                              {d.total}
                            </text>
                          </g>
                        );
                      })}
                    </svg>

                    <div className="mt-3 flex flex-wrap items-center gap-4 border-t border-[rgba(26,36,28,0.08)] pt-3 text-[11px] text-[#525F55]">
                      <span className="inline-flex items-center gap-1.5">
                        <span className="h-2.5 w-2.5 rounded-sm bg-[#1E4D31]" />
                        Total Porsi
                      </span>
                      <span className="inline-flex items-center gap-1.5">
                        <span className="h-2.5 w-2.5 rounded-sm bg-[#5D8C6E]" />
                        Kopi
                      </span>
                      <span className="inline-flex items-center gap-1.5">
                        <span className="h-2.5 w-2.5 rounded-sm bg-[#C28D4E]" />
                        Palembang
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Detailed Monthly Table */}
              <div className="overflow-hidden rounded-xl border border-[rgba(26,36,28,0.11)] bg-white">
                <div className="border-b border-[rgba(26,36,28,0.1)] px-5 py-3.5">
                  <h4 className="text-sm font-semibold text-[#1A241C]">
                    Peringkat Lengkap Performa Menu — {activeMonthBucket.label}
                  </h4>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-left text-xs">
                    <thead>
                      <tr className="border-b border-[rgba(26,36,28,0.1)] bg-[#F7F5EF] text-[#525F55]">
                        <th className="px-4 py-2.5 font-semibold">#</th>
                        <th className="px-4 py-2.5 font-semibold">Menu</th>
                        <th className="px-4 py-2.5 font-semibold">Kategori</th>
                        <th className="px-4 py-2.5 text-right font-semibold">Terjual</th>
                        <th className="px-4 py-2.5 text-right font-semibold">Pangsa</th>
                        <th className="px-4 py-2.5 text-right font-semibold">Omzet</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[rgba(26,36,28,0.08)]">
                      {sortedMonthlyItems.slice(0, 15).map((row, idx) => {
                        const share =
                          monthlyKpis.totalUnits > 0
                            ? ((row.unitsSold / monthlyKpis.totalUnits) * 100).toFixed(1)
                            : '0.0';
                        return (
                          <tr key={row.menuId} className="hover:bg-[#F7F5EF]/50">
                            <td className="px-4 py-2.5 font-mono text-[#525F55] tabular-nums">
                              {idx + 1}
                            </td>
                            <td className="px-4 py-2.5 font-medium text-[#1A241C]">{row.name}</td>
                            <td className="px-4 py-2.5 text-[#525F55]">{row.category}</td>
                            <td className="px-4 py-2.5 text-right font-mono font-semibold text-[#1A241C] tabular-nums">
                              {row.unitsSold}
                            </td>
                            <td className="px-4 py-2.5 text-right font-mono text-[#525F55] tabular-nums">
                              {share}%
                            </td>
                            <td className="px-4 py-2.5 text-right font-mono font-medium text-[#1E4D31] tabular-nums">
                              {formatRp(row.revenue)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* 3. PUSH NOTIFICATIONS & PROMOS */}
          {section === 'push' && (
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
              <div className="space-y-4 lg:col-span-7">
                {pushFeedback && (
                  <div className="rounded-xl border border-[#1E4D31]/30 bg-[#DCFCE7] px-4 py-3 text-xs font-medium text-[#166534]">
                    {pushFeedback}
                  </div>
                )}

                <div className="rounded-xl border border-[rgba(26,36,28,0.11)] bg-white p-5">
                  <h3 className="text-sm font-semibold text-[#1A241C]">
                    Kampanye Promo & Siaran Push Pelanggan
                  </h3>
                  <p className="mt-1 text-xs text-[#525F55]">
                    Klik “Kirim Push” untuk langsung memunculkan notifikasi promo ke layar
                    pelanggan yang sedang membuka menu digital.
                  </p>

                  <div className="mt-4 space-y-3">
                    {promos.map((promo) => (
                      <div
                        key={promo.id}
                        className="rounded-xl border border-[rgba(26,36,28,0.11)] bg-[#F7F5EF] p-4"
                      >
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-xs font-semibold text-[#1E4D31]">
                                {promo.code}
                              </span>
                              <span className="text-xs text-[#525F55]">
                                · {promo.targetCategory}
                              </span>
                            </div>
                            <p className="mt-1 font-serif text-base font-semibold text-[#1A241C]">
                              {promo.title}
                            </p>
                            <p className="mt-1 text-xs leading-relaxed text-[#525F55]">
                              {promo.message}
                            </p>
                          </div>

                          <button
                            type="button"
                            onClick={() => void onTogglePromo(promo.id, !promo.active)}
                            className={`rounded-md px-2.5 py-1 text-[11px] font-semibold ${
                              promo.active
                                ? 'bg-[#DCFCE7] text-[#166534]'
                                : 'bg-[#EDE9DF] text-[#525F55]'
                            }`}
                          >
                            {promo.active ? 'Aktif' : 'Nonaktif'}
                          </button>
                        </div>

                        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-[rgba(26,36,28,0.08)] pt-3 text-[11px] text-[#525F55]">
                          <span className="tabular-nums">
                            {promo.discountType === 'percent'
                              ? `Diskon ${promo.discountValue}%`
                              : `Potongan ${formatRp(promo.discountValue)}`}{' '}
                            · Min. {formatRp(promo.minOrder)} · Disiarkan {promo.pushCount}×
                          </span>

                          <button
                            type="button"
                            onClick={() => void handleFirePush(promo)}
                            className="inline-flex min-h-9 items-center gap-1.5 rounded-lg bg-[#1E4D31] px-3 py-1.5 text-xs font-medium text-[#F7F5EF] hover:bg-[#173C26]"
                          >
                            <Send className="h-3.5 w-3.5" aria-hidden="true" />
                            <span>Kirim Push Notifikasi</span>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Recent Push Log */}
                <div className="rounded-xl border border-[rgba(26,36,28,0.11)] bg-white p-5">
                  <h4 className="text-sm font-semibold text-[#1A241C]">Riwayat Siaran Push</h4>
                  <div className="mt-3 divide-y divide-[rgba(26,36,28,0.08)] text-xs">
                    {notifications.slice(0, 6).map((n) => (
                      <div key={n.id} className="flex items-start justify-between gap-3 py-2.5">
                        <div>
                          <p className="font-medium text-[#1A241C]">
                            <span className="font-mono text-[#1E4D31]">{n.code}</span> — {n.title}
                          </p>
                          <p className="text-[11px] text-[#525F55]">{n.discountSummary}</p>
                        </div>
                        <span className="shrink-0 font-mono text-[11px] text-[#525F55] tabular-nums">
                          {formatDateTimeId(n.sentAt)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Create New Promo Form */}
              <div className="lg:col-span-5">
                <form
                  onSubmit={handleCreatePromoSubmit}
                  className="space-y-4 rounded-xl border border-[rgba(26,36,28,0.11)] bg-white p-5"
                >
                  <h3 className="text-sm font-semibold text-[#1A241C]">Buat Promo Baru</h3>

                  <div>
                    <label htmlFor="p-code" className="mb-1 block text-xs font-medium text-[#525F55]">
                      Kode Promo *
                    </label>
                    <input
                      id="p-code"
                      type="text"
                      required
                      value={promoCode}
                      onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                      placeholder="NGOPIMALAM20"
                      className="min-h-10 w-full rounded-lg border border-[rgba(26,36,28,0.16)] bg-[#F7F5EF] px-3 py-2 font-mono text-xs uppercase text-[#1A241C]"
                    />
                  </div>

                  <div>
                    <label htmlFor="p-title" className="mb-1 block text-xs font-medium text-[#525F55]">
                      Judul Notifikasi *
                    </label>
                    <input
                      id="p-title"
                      type="text"
                      required
                      value={promoTitle}
                      onChange={(e) => setPromoTitle(e.target.value)}
                      placeholder="Promo Sore Hujan — Diskon 20% Cemilan"
                      className="min-h-10 w-full rounded-lg border border-[rgba(26,36,28,0.16)] bg-[#F7F5EF] px-3 py-2 text-xs text-[#1A241C]"
                    />
                  </div>

                  <div>
                    <label htmlFor="p-msg" className="mb-1 block text-xs font-medium text-[#525F55]">
                      Pesan Push
                    </label>
                    <textarea
                      id="p-msg"
                      rows={2}
                      value={promoMessage}
                      onChange={(e) => setPromoMessage(e.target.value)}
                      placeholder="Nikmati tahu lada garam & rozza iboen hangat lebih hemat."
                      className="w-full rounded-lg border border-[rgba(26,36,28,0.16)] bg-[#F7F5EF] px-3 py-2 text-xs text-[#1A241C]"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label htmlFor="p-type" className="mb-1 block text-xs font-medium text-[#525F55]">
                        Tipe Diskon
                      </label>
                      <select
                        id="p-type"
                        value={promoType}
                        onChange={(e) => setPromoType(e.target.value as 'percent' | 'fixed')}
                        className="min-h-10 w-full rounded-lg border border-[rgba(26,36,28,0.16)] bg-[#F7F5EF] px-2.5 text-xs text-[#1A241C]"
                      >
                        <option value="percent">Persen (%)</option>
                        <option value="fixed">Nominal (Rp)</option>
                      </select>
                    </div>
                    <div>
                      <label htmlFor="p-val" className="mb-1 block text-xs font-medium text-[#525F55]">
                        Nilai Diskon
                      </label>
                      <input
                        id="p-val"
                        type="number"
                        min={1}
                        value={promoValue}
                        onChange={(e) => setPromoValue(e.target.value)}
                        className="min-h-10 w-full rounded-lg border border-[rgba(26,36,28,0.16)] bg-[#F7F5EF] px-3 font-mono text-xs text-[#1A241C] tabular-nums"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label htmlFor="p-min" className="mb-1 block text-xs font-medium text-[#525F55]">
                        Min. Order (Rp)
                      </label>
                      <input
                        id="p-min"
                        type="number"
                        min={0}
                        step={5000}
                        value={promoMinOrder}
                        onChange={(e) => setPromoMinOrder(e.target.value)}
                        className="min-h-10 w-full rounded-lg border border-[rgba(26,36,28,0.16)] bg-[#F7F5EF] px-3 font-mono text-xs text-[#1A241C] tabular-nums"
                      />
                    </div>
                    <div>
                      <label htmlFor="p-cat" className="mb-1 block text-xs font-medium text-[#525F55]">
                        Kategori
                      </label>
                      <select
                        id="p-cat"
                        value={promoTargetCat}
                        onChange={(e) =>
                          setPromoTargetCat(e.target.value as MenuCategory | 'Semua Menu')
                        }
                        className="min-h-10 w-full rounded-lg border border-[rgba(26,36,28,0.16)] bg-[#F7F5EF] px-2.5 text-xs text-[#1A241C]"
                      >
                        <option value="Semua Menu">Semua Menu</option>
                        {MENU_CATEGORIES.map((c) => (
                          <option key={c} value={c}>
                            {c}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="min-h-10 w-full rounded-lg bg-[#1E4D31] px-4 py-2 text-xs font-medium text-[#F7F5EF] hover:bg-[#173C26]"
                  >
                    Simpan Kampanye Promo
                  </button>
                </form>
              </div>
            </div>
          )}

          {/* 4. LIVE ORDERS & STORE SETTINGS */}
          {section === 'orders' && (
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
              <div className="space-y-4 lg:col-span-7">
                <div className="rounded-xl border border-[rgba(26,36,28,0.11)] bg-white p-5">
                  <h3 className="text-sm font-semibold text-[#1A241C]">
                    Pesanan Masuk Pelanggan ({orders.length})
                  </h3>

                  <div className="mt-4 space-y-3">
                    {orders.map((order) => (
                      <div
                        key={order.id}
                        className="rounded-xl border border-[rgba(26,36,28,0.1)] bg-[#F7F5EF] p-4 text-xs"
                      >
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div>
                            <p className="font-mono font-semibold text-[#1A241C]">
                              #{order.id} · {order.customerName} ({order.tableNumber})
                            </p>
                            <p className="mt-0.5 text-[11px] text-[#525F55]">
                              {formatDateTimeId(order.createdAt)} ·{' '}
                              {order.paymentStatus === 'paid' ? 'Lunas Digital' : 'Bayar di Kasir'}
                            </p>
                          </div>
                          <span className="font-mono text-sm font-semibold text-[#1E4D31] tabular-nums">
                            {formatRp(order.total)}
                          </span>
                        </div>

                        <ul className="mt-2.5 space-y-1 border-t border-[rgba(26,36,28,0.08)] pt-2 text-[11px] text-[#525F55]">
                          {order.items.map((line, i) => (
                            <li key={`${line.menuId}-${i}`}>
                              {line.quantity}× {line.name}
                              {line.selectedTemp ? ` (${line.selectedTemp})` : ''}
                            </li>
                          ))}
                        </ul>

                        <div className="mt-3 flex flex-wrap items-center gap-1.5">
                          {(['Menunggu', 'Diproses', 'Selesai'] as const).map((st) => (
                            <button
                              key={st}
                              type="button"
                              onClick={() => void onUpdateOrderStatus(order.id, { orderStatus: st })}
                              className={`rounded-md px-2.5 py-1 text-[11px] font-medium ${
                                order.orderStatus === st
                                  ? 'bg-[#1E4D31] text-[#F7F5EF]'
                                  : 'bg-white text-[#525F55] hover:text-[#1A241C]'
                              }`}
                            >
                              {st}
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="lg:col-span-5">
                <form
                  onSubmit={handleSaveSettingsSubmit}
                  className="space-y-4 rounded-xl border border-[rgba(26,36,28,0.11)] bg-white p-5"
                >
                  <div className="flex items-center gap-2">
                    <Settings className="h-4 w-4 text-[#1E4D31]" />
                    <h3 className="text-sm font-semibold text-[#1A241C]">
                      Pengaturan WhatsApp & QRIS
                    </h3>
                  </div>

                  <div>
                    <label htmlFor="s-wa" className="mb-1 block text-xs font-medium text-[#525F55]">
                      Nomor WhatsApp Penerima Order
                    </label>
                    <input
                      id="s-wa"
                      type="text"
                      value={waDraft}
                      onChange={(e) => setWaDraft(e.target.value)}
                      className="min-h-10 w-full rounded-lg border border-[rgba(26,36,28,0.16)] bg-[#F7F5EF] px-3 font-mono text-xs text-[#1A241C]"
                    />
                  </div>

                  <div>
                    <label htmlFor="s-hours" className="mb-1 block text-xs font-medium text-[#525F55]">
                      Jam Operasional
                    </label>
                    <input
                      id="s-hours"
                      type="text"
                      value={hoursDraft}
                      onChange={(e) => setHoursDraft(e.target.value)}
                      className="min-h-10 w-full rounded-lg border border-[rgba(26,36,28,0.16)] bg-[#F7F5EF] px-3 text-xs text-[#1A241C]"
                    />
                  </div>

                  <div>
                    <label htmlFor="s-qris" className="mb-1 block text-xs font-medium text-[#525F55]">
                      Nama Merchant QRIS
                    </label>
                    <input
                      id="s-qris"
                      type="text"
                      value={qrisMerchantDraft}
                      onChange={(e) => setQrisMerchantDraft(e.target.value)}
                      className="min-h-10 w-full rounded-lg border border-[rgba(26,36,28,0.16)] bg-[#F7F5EF] px-3 text-xs text-[#1A241C]"
                    />
                  </div>

                  <button
                    type="submit"
                    className="min-h-10 w-full rounded-lg bg-[#1E4D31] px-4 py-2 text-xs font-medium text-[#F7F5EF] hover:bg-[#173C26]"
                  >
                    {settingsSaved ? 'Pengaturan Tersimpan' : 'Simpan Pengaturan'}
                  </button>
                </form>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Add Menu Item Modal */}
      {showAddMenuModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#1A241C]/50 p-4 backdrop-blur-[2px]"
          role="dialog"
          aria-modal="true"
          onClick={() => setShowAddMenuModal(false)}
        >
          <form
            onSubmit={handleCreateMenuSubmit}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md space-y-4 rounded-2xl border border-[rgba(26,36,28,0.14)] bg-[#F7F5EF] p-6"
          >
            <h3 className="font-serif text-xl font-semibold text-[#1A241C]">Tambah Menu Baru</h3>
            <div>
              <label htmlFor="nm-name" className="mb-1 block text-xs font-medium text-[#525F55]">
                Nama Sajian *
              </label>
              <input
                id="nm-name"
                type="text"
                required
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Kupi Susu Pandan Lembah"
                className="min-h-10 w-full rounded-lg border border-[rgba(26,36,28,0.16)] bg-white px-3 text-sm text-[#1A241C]"
              />
            </div>
            <div>
              <label htmlFor="nm-cat" className="mb-1 block text-xs font-medium text-[#525F55]">
                Kategori
              </label>
              <select
                id="nm-cat"
                value={newCat}
                onChange={(e) => setNewCat(e.target.value as MenuCategory)}
                className="min-h-10 w-full rounded-lg border border-[rgba(26,36,28,0.16)] bg-white px-3 text-sm text-[#1A241C]"
              >
                {MENU_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="nm-price" className="mb-1 block text-xs font-medium text-[#525F55]">
                  Harga (Rp) *
                </label>
                <input
                  id="nm-price"
                  type="number"
                  required
                  min={1000}
                  step={1000}
                  value={newPrice}
                  onChange={(e) => setNewPrice(e.target.value)}
                  className="min-h-10 w-full rounded-lg border border-[rgba(26,36,28,0.16)] bg-white px-3 font-mono text-sm text-[#1A241C]"
                />
              </div>
              <div>
                <label htmlFor="nm-stock" className="mb-1 block text-xs font-medium text-[#525F55]">
                  Stok Awal
                </label>
                <input
                  id="nm-stock"
                  type="number"
                  min={0}
                  value={newStock}
                  onChange={(e) => setNewStock(e.target.value)}
                  className="min-h-10 w-full rounded-lg border border-[rgba(26,36,28,0.16)] bg-white px-3 font-mono text-sm text-[#1A241C]"
                />
              </div>
            </div>
            <div>
              <label htmlFor="nm-desc" className="mb-1 block text-xs font-medium text-[#525F55]">
                Deskripsi Singkat
              </label>
              <textarea
                id="nm-desc"
                rows={2}
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
                className="w-full rounded-lg border border-[rgba(26,36,28,0.16)] bg-white px-3 py-2 text-sm text-[#1A241C]"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowAddMenuModal(false)}
                className="min-h-10 rounded-lg border border-[rgba(26,36,28,0.16)] bg-white px-4 py-2 text-xs font-medium text-[#1A241C]"
              >
                Batal
              </button>
              <button
                type="submit"
                className="min-h-10 rounded-lg bg-[#1E4D31] px-4 py-2 text-xs font-medium text-[#F7F5EF]"
              >
                Simpan Menu
              </button>
            </div>
          </form>
        </div>
      )}
    </section>
  );
}
