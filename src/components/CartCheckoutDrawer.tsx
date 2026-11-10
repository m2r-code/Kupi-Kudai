import { useMemo, useState } from 'react';
import {
  Check,
  CheckCircle2,
  Copy,
  CreditCard,
  MessageCircle,
  Minus,
  Plus,
  QrCode,
  ShieldCheck,
  Smartphone,
  Tag,
  Trash2,
  Wallet,
  X,
} from 'lucide-react';
import { TABLE_OPTIONS } from '../data/seedData.ts';
import type {
  CartItem,
  MenuItem,
  OrderRecord,
  PaymentMethod,
  PromoCampaign,
  ServiceType,
  StoreSettings,
} from '../types.ts';
import {
  buildWhatsAppOrderMessage,
  buildWhatsAppUrl,
  formatRp,
  getPaymentMethodLabel,
} from '../utils/formatters.ts';
import { MenuImage } from './MenuImage.tsx';
import { QrCodeGraphic } from './QrCodeGraphic.tsx';

interface CartCheckoutDrawerProps {
  open: boolean;
  onClose: () => void;
  cart: CartItem[];
  menu: MenuItem[];
  promos: PromoCampaign[];
  settings: StoreSettings;
  selectedTable: string;
  onChangeTable: (tableLabel: string) => void;
  appliedPromoCode: string;
  onApplyPromoCode: (code: string) => void;
  onUpdateQty: (cartKey: string, nextQty: number) => void;
  onClearCart: () => void;
  onSubmitOrder: (payload: {
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
  }) => Promise<OrderRecord>;
}

const DIGITAL_PAYMENTS: {
  id: PaymentMethod;
  label: string;
  hint: string;
  kind: 'qris' | 'ewallet' | 'va' | 'cashier';
}[] = [
  {
    id: 'qris',
    label: 'QRIS Instan',
    hint: 'Scan dengan GoPay, OVO, DANA, ShopeePay, BCA/Mandiri',
    kind: 'qris',
  },
  {
    id: 'gopay',
    label: 'GoPay',
    hint: 'Pembayaran instan e-wallet GoPay',
    kind: 'ewallet',
  },
  {
    id: 'ovo',
    label: 'OVO Cash',
    hint: 'Notifikasi bayar langsung ke aplikasi OVO',
    kind: 'ewallet',
  },
  {
    id: 'dana',
    label: 'DANA',
    hint: 'Konfirmasi cepat lewat saldo DANA',
    kind: 'ewallet',
  },
  {
    id: 'va_bca',
    label: 'Virtual Account BCA',
    hint: 'Nomor VA otomatis terverifikasi',
    kind: 'va',
  },
  {
    id: 'va_mandiri',
    label: 'Virtual Account Mandiri',
    hint: 'Transfer mudah via Livin’ by Mandiri',
    kind: 'va',
  },
  {
    id: 'cashier',
    label: 'Bayar di Kasir',
    hint: 'Tunai atau kartu debit/kredit langsung di kasir',
    kind: 'cashier',
  },
];

export function CartCheckoutDrawer({
  open,
  onClose,
  cart,
  menu,
  promos,
  settings,
  selectedTable,
  onChangeTable,
  appliedPromoCode,
  onApplyPromoCode,
  onUpdateQty,
  onClearCart,
  onSubmitOrder,
}: CartCheckoutDrawerProps) {
  const [step, setStep] = useState<'cart' | 'payment' | 'confirmed'>('cart');
  const [serviceType, setServiceType] = useState<ServiceType>(
    selectedTable === 'Takeaway' ? 'takeaway' : 'dine-in',
  );
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [orderNotes, setOrderNotes] = useState('');
  const [promoInput, setPromoInput] = useState(appliedPromoCode);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('qris');
  const [digitalPaidRef, setDigitalPaidRef] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string>('');
  const [confirmedOrder, setConfirmedOrder] = useState<OrderRecord | null>(null);
  const [copiedMsg, setCopiedMsg] = useState(false);
  const [copiedVa, setCopiedVa] = useState(false);

  // Compute live prices & subtotal from current menu
  const enrichedCart = useMemo(() => {
    return cart.map((entry) => {
      const liveItem = menu.find((m) => m.id === entry.menuId);
      const liveUnitPrice = liveItem
        ? liveItem.promoPrice && liveItem.promoPrice < liveItem.price
          ? liveItem.promoPrice
          : liveItem.price
        : entry.unitPrice;
      const maxStock = liveItem?.stock ?? 99;
      return {
        ...entry,
        unitPrice: liveUnitPrice,
        maxStock,
      };
    });
  }, [cart, menu]);

  const subtotal = useMemo(
    () => enrichedCart.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0),
    [enrichedCart],
  );

  // Promo calculation
  const promoEvaluation = useMemo(() => {
    const code = appliedPromoCode.trim().toUpperCase();
    if (!code) {
      return { promo: null, discount: 0, reason: '' };
    }
    const found = promos.find((p) => p.code.toUpperCase() === code && p.active);
    if (!found) {
      return { promo: null, discount: 0, reason: 'Kode promo tidak ditemukan atau nonaktif.' };
    }
    const eligibleSubtotal =
      found.targetCategory === 'Semua Menu'
        ? subtotal
        : enrichedCart
            .filter((item) => item.category === found.targetCategory)
            .reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);

    if (eligibleSubtotal === 0) {
      return {
        promo: found,
        discount: 0,
        reason: `Berlaku khusus kategori ${found.targetCategory}.`,
      };
    }
    if (subtotal < found.minOrder) {
      return {
        promo: found,
        discount: 0,
        reason: `Minimal pesanan ${formatRp(found.minOrder)} untuk kode ini.`,
      };
    }
    const discount =
      found.discountType === 'percent'
        ? Math.round((eligibleSubtotal * found.discountValue) / 100)
        : Math.min(eligibleSubtotal, found.discountValue);
    return { promo: found, discount, reason: '' };
  }, [appliedPromoCode, promos, subtotal, enrichedCart]);

  const grandTotal = Math.max(0, subtotal - promoEvaluation.discount);

  const qrisPayload = useMemo(() => {
    return `00020101021226580014ID.KUPIKUDAI.QRIS0118${settings.qrisNmid}520458125303360540${grandTotal}5802ID5915${settings.qrisMerchantName}6005BOGOR6304`;
  }, [grandTotal, settings.qrisMerchantName, settings.qrisNmid]);

  const virtualAccountNumber =
    paymentMethod === 'va_bca' ? '8801 0818 8773 44' : '8902 0818 8773 44';

  const handleApplyPromoSubmit = () => {
    onApplyPromoCode(promoInput.trim().toUpperCase());
  };

  const handleVerifyDigitalPayment = () => {
    const prefix = paymentMethod.toUpperCase().replace('VA_', '');
    const ref = `${prefix}-${Date.now().toString(36).toUpperCase().slice(-6)}`;
    setDigitalPaidRef(ref);
  };

  const handlePlaceOrder = async () => {
    if (!customerName.trim()) {
      setSubmitError('Mohon isi nama pemesan terlebih dahulu.');
      return;
    }
    if (enrichedCart.length === 0) {
      setSubmitError('Keranjang masih kosong.');
      return;
    }
    if (paymentMethod !== 'cashier' && !digitalPaidRef) {
      setSubmitError('Silakan selesaikan verifikasi pembayaran digital terlebih dahulu.');
      return;
    }

    setSubmitError('');
    setIsSubmitting(true);
    try {
      const order = await onSubmitOrder({
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim(),
        serviceType,
        tableNumber: serviceType === 'dine-in' ? selectedTable : 'Takeaway',
        items: enrichedCart.map((c) => ({
          menuId: c.menuId,
          name: c.name,
          category: c.category,
          quantity: c.quantity,
          unitPrice: c.unitPrice,
          selectedTemp: c.selectedTemp,
          selectedFlavour: c.selectedFlavour,
          notes: c.notes,
        })),
        subtotal,
        discountAmount: promoEvaluation.discount,
        promoCode: promoEvaluation.discount > 0 ? promoEvaluation.promo?.code : undefined,
        total: grandTotal,
        paymentMethod,
        paymentStatus: paymentMethod === 'cashier' ? 'pending' : 'paid',
        paymentReference:
          paymentMethod === 'cashier'
            ? `KASIR-${Date.now().toString(36).toUpperCase().slice(-5)}`
            : digitalPaidRef,
        notes: orderNotes.trim() || undefined,
      });

      setConfirmedOrder(order);
      setStep('confirmed');
      onClearCart();
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Gagal mengirim pesanan.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopyWhatsAppMessage = async () => {
    if (!confirmedOrder) return;
    try {
      await navigator.clipboard.writeText(buildWhatsAppOrderMessage(confirmedOrder));
      setCopiedMsg(true);
      setTimeout(() => setCopiedMsg(false), 2000);
    } catch {
      // Ignore clipboard failure
    }
  };

  const handleCopyVa = async () => {
    try {
      await navigator.clipboard.writeText(virtualAccountNumber.replace(/\s+/g, ''));
      setCopiedVa(true);
      setTimeout(() => setCopiedVa(false), 2000);
    } catch {
      // Ignore
    }
  };

  const handleResetAfterConfirm = () => {
    setConfirmedOrder(null);
    setDigitalPaidRef('');
    setStep('cart');
    onClose();
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-[#1A241C]/50 backdrop-blur-[2px]"
      role="dialog"
      aria-modal="true"
      aria-label="Keranjang & Pembayaran Kupikudai"
      onClick={onClose}
    >
      <div
        className="flex h-full w-full max-w-xl flex-col border-l border-[rgba(26,36,28,0.12)] bg-[#F7F5EF]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drawer Header */}
        <div className="flex items-center justify-between border-b border-[rgba(26,36,28,0.1)] bg-white px-6 py-4">
          <div>
            <p className="text-xs font-medium text-[#525F55]">
              {step === 'confirmed'
                ? 'Pesanan Tercatat'
                : step === 'payment'
                  ? 'Langkah 2 dari 2 · Pembayaran & WhatsApp'
                  : 'Langkah 1 dari 2 · Ringkasan Pesanan'}
            </p>
            <h2 className="font-serif text-xl font-semibold text-[#1A241C]">
              {step === 'confirmed'
                ? 'Pesanan Siap Dikirim ke WhatsApp'
                : step === 'payment'
                  ? 'Pembayaran Digital & Pengiriman'
                  : 'Keranjang Pesanan'}
            </h2>
          </div>

          <button
            type="button"
            onClick={step === 'confirmed' ? handleResetAfterConfirm : onClose}
            aria-label="Tutup keranjang"
            className="flex h-10 w-10 items-center justify-center rounded-lg border border-[rgba(26,36,28,0.12)] text-[#1A241C] hover:bg-[#EDE9DF]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Drawer Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {step === 'confirmed' && confirmedOrder ? (
            <div className="space-y-6">
              <div className="rounded-2xl border border-[#1E4D31]/25 bg-white p-5">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="mt-0.5 h-6 w-6 shrink-0 text-[#1E4D31]" />
                  <div>
                    <p className="font-serif text-xl font-semibold text-[#1A241C]">
                      Pesanan #{confirmedOrder.id} Dikonfirmasi
                    </p>
                    <p className="mt-1 text-xs text-[#525F55]">
                      Stok dapur diperbarui otomatis ·{' '}
                      {confirmedOrder.paymentStatus === 'paid'
                        ? `Lunas (${confirmedOrder.paymentReference})`
                        : 'Pembayaran di Kasir'}
                    </p>
                  </div>
                </div>

                <div className="mt-4 space-y-2 border-t border-[rgba(26,36,28,0.08)] pt-4 text-xs">
                  <div className="flex justify-between">
                    <span className="text-[#525F55]">Pemesan</span>
                    <span className="font-medium text-[#1A241C]">
                      {confirmedOrder.customerName} ({confirmedOrder.tableNumber})
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#525F55]">Metode Pembayaran</span>
                    <span className="font-medium text-[#1A241C]">
                      {getPaymentMethodLabel(confirmedOrder.paymentMethod)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#525F55]">Total Bayar</span>
                    <span className="font-mono text-sm font-semibold text-[#1E4D31] tabular-nums">
                      {formatRp(confirmedOrder.total)}
                    </span>
                  </div>
                </div>
              </div>

              {/* WhatsApp Slip Preview & Direct Launch */}
              <div className="rounded-2xl border border-[rgba(26,36,28,0.12)] bg-white p-5">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-sm font-semibold text-[#1A241C]">
                    Pratinjau Pesan WhatsApp ke {settings.instagramHandle}
                  </h3>
                  <button
                    type="button"
                    onClick={handleCopyWhatsAppMessage}
                    className="inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium text-[#1E4D31] hover:bg-[#EDE9DF]"
                  >
                    {copiedMsg ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                    <span>{copiedMsg ? 'Tersalin' : 'Salin Teks'}</span>
                  </button>
                </div>

                <pre className="mt-3 max-h-60 overflow-y-auto rounded-xl bg-[#F7F5EF] p-4 font-mono text-xs leading-relaxed whitespace-pre-wrap text-[#1A241C]">
                  {buildWhatsAppOrderMessage(confirmedOrder)}
                </pre>

                <div className="mt-4 flex flex-col gap-2.5 sm:flex-row">
                  <a
                    href={buildWhatsAppUrl(confirmedOrder, settings)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-lg bg-[#1E4D31] px-4 py-2.5 text-sm font-medium text-[#F7F5EF] transition-colors hover:bg-[#173C26]"
                  >
                    <MessageCircle className="h-4 w-4" aria-hidden="true" />
                    <span>Kirim via WhatsApp Sekarang</span>
                  </a>
                  <button
                    type="button"
                    onClick={handleResetAfterConfirm}
                    className="inline-flex min-h-11 items-center justify-center rounded-lg border border-[rgba(26,36,28,0.16)] bg-white px-4 py-2.5 text-sm font-medium text-[#1A241C] hover:bg-[#EDE9DF]"
                  >
                    Kembali ke Menu
                  </button>
                </div>
              </div>
            </div>
          ) : enrichedCart.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center py-16 text-center">
              <p className="font-serif text-xl font-medium text-[#1A241C]">
                Keranjang Anda masih kosong
              </p>
              <p className="mt-2 max-w-xs text-sm text-[#525F55]">
                Pilih sajian Palembang, Pasta Iboen, atau Kupi Susu Kudai untuk mulai memesan.
              </p>
              <button
                type="button"
                onClick={onClose}
                className="mt-5 inline-flex min-h-10 items-center rounded-lg bg-[#1E4D31] px-5 py-2 text-sm font-medium text-[#F7F5EF]"
              >
                Pilih Menu
              </button>
            </div>
          ) : step === 'cart' ? (
            <div className="space-y-6">
              {/* Cart Items */}
              <div className="space-y-3">
                {enrichedCart.map((item) => {
                  const variants: string[] = [];
                  if (item.selectedTemp) {
                    variants.push(item.selectedTemp === 'Cold' ? 'Dingin' : 'Hangat');
                  }
                  if (item.selectedFlavour) variants.push(item.selectedFlavour);

                  return (
                    <div
                      key={item.cartKey}
                      className="flex items-start gap-3.5 rounded-xl border border-[rgba(26,36,28,0.1)] bg-white p-3.5"
                    >
                      <div className="h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-[#E9E6D3] p-1">
                        <MenuImage
                          src={item.image}
                          alt={item.name}
                          className="h-full w-full"
                        />
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="font-serif text-sm font-semibold text-[#1A241C]">
                              {item.name}
                            </p>
                            {variants.length > 0 && (
                              <p className="text-xs text-[#525F55]">{variants.join(' · ')}</p>
                            )}
                            {item.notes && (
                              <p className="mt-0.5 text-xs italic text-[#525F55]">
                                Catatan: {item.notes}
                              </p>
                            )}
                          </div>
                          <button
                            type="button"
                            onClick={() => onUpdateQty(item.cartKey, 0)}
                            aria-label={`Hapus ${item.name}`}
                            className="p-1 text-[#525F55] hover:text-[#B91C1C]"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>

                        <div className="mt-3 flex items-center justify-between">
                          <span className="font-mono text-sm font-semibold text-[#1A241C] tabular-nums">
                            {formatRp(item.unitPrice * item.quantity)}
                          </span>

                          <div className="inline-flex items-center rounded-lg border border-[rgba(26,36,28,0.14)] bg-[#F7F5EF] p-0.5">
                            <button
                              type="button"
                              onClick={() => onUpdateQty(item.cartKey, item.quantity - 1)}
                              aria-label={`Kurangi ${item.name}`}
                              className="flex h-8 w-8 items-center justify-center rounded-md text-[#1A241C] hover:bg-[#EDE9DF]"
                            >
                              <Minus className="h-3.5 w-3.5" />
                            </button>
                            <span className="min-w-7 text-center font-mono text-xs font-semibold tabular-nums">
                              {item.quantity}
                            </span>
                            <button
                              type="button"
                              disabled={item.quantity >= item.maxStock}
                              onClick={() => onUpdateQty(item.cartKey, item.quantity + 1)}
                              aria-label={`Tambah ${item.name}`}
                              className="flex h-8 w-8 items-center justify-center rounded-md text-[#1A241C] hover:bg-[#EDE9DF] disabled:opacity-40"
                            >
                              <Plus className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Promo Code Box */}
              <div className="rounded-xl border border-[rgba(26,36,28,0.1)] bg-white p-4">
                <div className="flex items-center gap-2 text-xs font-semibold text-[#1A241C]">
                  <Tag className="h-3.5 w-3.5 text-[#1E4D31]" aria-hidden="true" />
                  <span>Kode Promo Kupikudai</span>
                </div>
                <div className="mt-2.5 flex gap-2">
                  <input
                    type="text"
                    value={promoInput}
                    onChange={(e) => setPromoInput(e.target.value.toUpperCase())}
                    placeholder="Masukkan kode, cth: NGOPISORE15"
                    className="min-h-10 flex-1 rounded-lg border border-[rgba(26,36,28,0.16)] bg-[#F7F5EF] px-3 py-1.5 font-mono text-xs uppercase text-[#1A241C] focus:border-[#1E4D31] focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={handleApplyPromoSubmit}
                    className="min-h-10 rounded-lg bg-[#1E4D31] px-4 py-1.5 text-xs font-medium text-[#F7F5EF] hover:bg-[#173C26]"
                  >
                    Pakai
                  </button>
                </div>

                {/* Quick active promos */}
                <div className="mt-2.5 flex flex-wrap gap-2">
                  {promos
                    .filter((p) => p.active)
                    .map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => {
                          setPromoInput(p.code);
                          onApplyPromoCode(p.code);
                        }}
                        className="rounded-md border border-[rgba(26,36,28,0.14)] bg-[#F7F5EF] px-2.5 py-1 font-mono text-[11px] font-medium text-[#1E4D31] hover:bg-[#EDE9DF]"
                      >
                        {p.code}
                      </button>
                    ))}
                </div>

                {appliedPromoCode && (
                  <p
                    className={`mt-2 text-xs ${
                      promoEvaluation.discount > 0 ? 'text-[#1E4D31]' : 'text-[#B45309]'
                    }`}
                  >
                    {promoEvaluation.discount > 0
                      ? `Promo ${promoEvaluation.promo?.code} aktif: hemat ${formatRp(promoEvaluation.discount)}`
                      : promoEvaluation.reason}
                  </p>
                )}
              </div>
            </div>
          ) : (
            /* Step 2: Customer Details & Integrated Digital Payment */
            <div className="space-y-5">
              {/* Customer & Table Details */}
              <div className="space-y-4 rounded-xl border border-[rgba(26,36,28,0.1)] bg-white p-4">
                <h3 className="text-sm font-semibold text-[#1A241C]">Detail Pemesanan</h3>

                <div className="grid grid-cols-3 gap-2">
                  {(
                    [
                      { id: 'dine-in', label: 'Dine-In' },
                      { id: 'takeaway', label: 'Takeaway' },
                      { id: 'delivery', label: 'Delivery' },
                    ] as const
                  ).map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setServiceType(opt.id)}
                      className={`min-h-10 rounded-lg border px-2 py-2 text-xs font-medium transition-colors ${
                        serviceType === opt.id
                          ? 'border-[#1E4D31] bg-[#1E4D31] text-[#F7F5EF]'
                          : 'border-[rgba(26,36,28,0.15)] bg-[#F7F5EF] text-[#1A241C]'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <label htmlFor="cust-name" className="mb-1 block text-xs font-medium text-[#525F55]">
                      Nama Pemesan *
                    </label>
                    <input
                      id="cust-name"
                      type="text"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      placeholder="Nama lengkap"
                      className="min-h-10 w-full rounded-lg border border-[rgba(26,36,28,0.16)] bg-[#F7F5EF] px-3 py-2 text-sm text-[#1A241C] focus:border-[#1E4D31] focus:outline-none"
                    />
                  </div>
                  <div>
                    <label htmlFor="cust-wa" className="mb-1 block text-xs font-medium text-[#525F55]">
                      Nomor WhatsApp
                    </label>
                    <input
                      id="cust-wa"
                      type="tel"
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      placeholder="0812..."
                      className="min-h-10 w-full rounded-lg border border-[rgba(26,36,28,0.16)] bg-[#F7F5EF] px-3 py-2 text-sm text-[#1A241C] focus:border-[#1E4D31] focus:outline-none"
                    />
                  </div>
                </div>

                {serviceType === 'dine-in' && (
                  <div>
                    <label htmlFor="checkout-table" className="mb-1 block text-xs font-medium text-[#525F55]">
                      Nomor Meja (Terhubung QR)
                    </label>
                    <select
                      id="checkout-table"
                      value={selectedTable === 'Takeaway' ? 'Meja 01' : selectedTable}
                      onChange={(e) => onChangeTable(e.target.value)}
                      className="min-h-10 w-full rounded-lg border border-[rgba(26,36,28,0.16)] bg-[#F7F5EF] px-3 py-2 text-sm text-[#1A241C] focus:border-[#1E4D31] focus:outline-none"
                    >
                      {TABLE_OPTIONS.map((t) => (
                        <option key={t.id} value={t.label}>
                          {t.label} — {t.zone}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div>
                  <label htmlFor="order-notes" className="mb-1 block text-xs font-medium text-[#525F55]">
                    Catatan Pesanan / Alamat Delivery (Opsional)
                  </label>
                  <input
                    id="order-notes"
                    type="text"
                    value={orderNotes}
                    onChange={(e) => setOrderNotes(e.target.value)}
                    placeholder="Contoh: sajikan minuman bersamaan dengan makanan"
                    className="min-h-10 w-full rounded-lg border border-[rgba(26,36,28,0.16)] bg-[#F7F5EF] px-3 py-2 text-sm text-[#1A241C] focus:border-[#1E4D31] focus:outline-none"
                  />
                </div>
              </div>

              {/* Integrated Digital Payment Checkout */}
              <div className="space-y-4 rounded-xl border border-[rgba(26,36,28,0.1)] bg-white p-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-[#1A241C]">
                    Metode Pembayaran Digital
                  </h3>
                  <span className="font-mono text-sm font-semibold text-[#1E4D31] tabular-nums">
                    {formatRp(grandTotal)}
                  </span>
                </div>

                <div className="space-y-2">
                  {DIGITAL_PAYMENTS.map((pm) => {
                    const selected = paymentMethod === pm.id;
                    return (
                      <button
                        key={pm.id}
                        type="button"
                        onClick={() => {
                          setPaymentMethod(pm.id);
                          setDigitalPaidRef('');
                        }}
                        className={`flex w-full items-center justify-between rounded-xl border p-3 text-left transition-colors ${
                          selected
                            ? 'border-[#1E4D31] bg-[#F7F5EF]'
                            : 'border-[rgba(26,36,28,0.11)] bg-white hover:bg-[#F7F5EF]/60'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          {pm.kind === 'qris' ? (
                            <QrCode className="h-4 w-4 text-[#1E4D31]" />
                          ) : pm.kind === 'ewallet' ? (
                            <Smartphone className="h-4 w-4 text-[#1E4D31]" />
                          ) : pm.kind === 'va' ? (
                            <CreditCard className="h-4 w-4 text-[#1E4D31]" />
                          ) : (
                            <Wallet className="h-4 w-4 text-[#525F55]" />
                          )}
                          <div>
                            <p className="text-xs font-semibold text-[#1A241C]">{pm.label}</p>
                            <p className="text-[11px] text-[#525F55]">{pm.hint}</p>
                          </div>
                        </div>
                        <span
                          className={`h-4 w-4 rounded-full border-2 ${
                            selected ? 'border-[#1E4D31] bg-[#1E4D31]' : 'border-[#525F55]/40'
                          }`}
                        />
                      </button>
                    );
                  })}
                </div>

                {/* Live Interactive Payment Verification Panel */}
                {paymentMethod !== 'cashier' && (
                  <div className="rounded-xl border border-[rgba(26,36,28,0.12)] bg-[#F7F5EF] p-4">
                    {digitalPaidRef ? (
                      <div className="flex items-center justify-between gap-3 text-xs">
                        <div className="flex items-center gap-2 text-[#1E4D31]">
                          <ShieldCheck className="h-5 w-5 shrink-0" />
                          <div>
                            <p className="font-semibold">Pembayaran Digital Terverifikasi</p>
                            <p className="font-mono text-[11px] text-[#525F55]">
                              Ref: {digitalPaidRef} · Nominal {formatRp(grandTotal)}
                            </p>
                          </div>
                        </div>
                        <span className="font-semibold text-[#1E4D31]">Lunas</span>
                      </div>
                    ) : paymentMethod === 'qris' ? (
                      <div className="flex flex-col items-center text-center">
                        <p className="text-xs font-semibold text-[#1A241C]">
                          {settings.qrisMerchantName} · NMID {settings.qrisNmid}
                        </p>
                        <div className="my-3">
                          <QrCodeGraphic
                            value={qrisPayload}
                            size={165}
                            label="Kode QRIS Dinamis Kupikudai"
                          />
                        </div>
                        <p className="font-mono text-sm font-semibold text-[#1A241C] tabular-nums">
                          Total: {formatRp(grandTotal)}
                        </p>
                        <p className="mt-1 text-[11px] text-[#525F55]">
                          Mendukung GoPay, OVO, DANA, ShopeePay, LinkAja & Mobile Banking
                        </p>
                        <button
                          type="button"
                          onClick={handleVerifyDigitalPayment}
                          className="mt-3 min-h-10 rounded-lg bg-[#1E4D31] px-4 py-2 text-xs font-medium text-[#F7F5EF] hover:bg-[#173C26]"
                        >
                          Simulasi Scan & Konfirmasi Bayar QRIS
                        </button>
                      </div>
                    ) : paymentMethod === 'va_bca' || paymentMethod === 'va_mandiri' ? (
                      <div className="space-y-3 text-xs">
                        <p className="font-semibold text-[#1A241C]">
                          {paymentMethod === 'va_bca'
                            ? 'Nomor Virtual Account BCA'
                            : 'Nomor Virtual Account Mandiri'}
                        </p>
                        <div className="flex items-center justify-between rounded-lg border border-[rgba(26,36,28,0.14)] bg-white px-3 py-2.5">
                          <span className="font-mono text-sm font-semibold tracking-wider text-[#1A241C] tabular-nums">
                            {virtualAccountNumber}
                          </span>
                          <button
                            type="button"
                            onClick={handleCopyVa}
                            className="inline-flex items-center gap-1 font-medium text-[#1E4D31]"
                          >
                            {copiedVa ? (
                              <Check className="h-3.5 w-3.5" />
                            ) : (
                              <Copy className="h-3.5 w-3.5" />
                            )}
                            <span>{copiedVa ? 'Tersalin' : 'Salin'}</span>
                          </button>
                        </div>
                        <button
                          type="button"
                          onClick={handleVerifyDigitalPayment}
                          className="min-h-10 w-full rounded-lg bg-[#1E4D31] px-4 py-2 text-xs font-medium text-[#F7F5EF] hover:bg-[#173C26]"
                        >
                          Konfirmasi Transfer VA ({formatRp(grandTotal)})
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-3 text-xs">
                        <p className="font-semibold text-[#1A241C]">
                          Otorisasi {getPaymentMethodLabel(paymentMethod)}
                        </p>
                        <p className="text-[#525F55]">
                          Tagihan sebesar{' '}
                          <span className="font-mono font-semibold text-[#1A241C] tabular-nums">
                            {formatRp(grandTotal)}
                          </span>{' '}
                          akan diproses langsung via aplikasi e-wallet Anda.
                        </p>
                        <button
                          type="button"
                          onClick={handleVerifyDigitalPayment}
                          className="min-h-10 w-full rounded-lg bg-[#1E4D31] px-4 py-2 text-xs font-medium text-[#F7F5EF] hover:bg-[#173C26]"
                        >
                          Bayar Sekarang via {paymentMethod.toUpperCase()}
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {submitError && (
                <p className="rounded-lg border border-[#B91C1C]/30 bg-[#FEF2F2] px-3 py-2 text-xs font-medium text-[#B91C1C]">
                  {submitError}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Drawer Footer */}
        {step !== 'confirmed' && enrichedCart.length > 0 && (
          <div className="border-t border-[rgba(26,36,28,0.1)] bg-white px-6 py-4">
            <div className="space-y-1.5 text-xs">
              <div className="flex justify-between text-[#525F55]">
                <span>Subtotal</span>
                <span className="font-mono tabular-nums">{formatRp(subtotal)}</span>
              </div>
              {promoEvaluation.discount > 0 && (
                <div className="flex justify-between font-medium text-[#1E4D31]">
                  <span>Diskon ({promoEvaluation.promo?.code})</span>
                  <span className="font-mono tabular-nums">
                    -{formatRp(promoEvaluation.discount)}
                  </span>
                </div>
              )}
              <div className="flex justify-between border-t border-[rgba(26,36,28,0.08)] pt-2 text-sm font-semibold text-[#1A241C]">
                <span>Total Bayar</span>
                <span className="font-mono text-base text-[#1E4D31] tabular-nums">
                  {formatRp(grandTotal)}
                </span>
              </div>
            </div>

            <div className="mt-4 flex items-center gap-3">
              {step === 'payment' && (
                <button
                  type="button"
                  onClick={() => setStep('cart')}
                  className="min-h-11 rounded-lg border border-[rgba(26,36,28,0.16)] bg-white px-4 py-2.5 text-sm font-medium text-[#1A241C] hover:bg-[#EDE9DF]"
                >
                  Kembali
                </button>
              )}

              {step === 'cart' ? (
                <button
                  type="button"
                  onClick={() => setStep('payment')}
                  className="flex min-h-11 flex-1 items-center justify-center rounded-lg bg-[#1E4D31] px-5 py-2.5 text-sm font-medium text-[#F7F5EF] transition-colors hover:bg-[#173C26]"
                >
                  Lanjut ke Pembayaran Digital & WhatsApp
                </button>
              ) : (
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={handlePlaceOrder}
                  className="flex min-h-11 flex-1 items-center justify-center gap-2 rounded-lg bg-[#1E4D31] px-5 py-2.5 text-sm font-medium text-[#F7F5EF] transition-colors hover:bg-[#173C26] disabled:opacity-50"
                >
                  <MessageCircle className="h-4 w-4" aria-hidden="true" />
                  <span>
                    {isSubmitting ? 'Memproses Pesanan...' : 'Konfirmasi & Siapkan WhatsApp'}
                  </span>
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
