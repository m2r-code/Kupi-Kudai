import type { CartItem, OrderRecord, PaymentMethod, ServiceType, StoreSettings } from '../types.ts';

export function formatRp(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })
    .format(amount)
    .replace(/\u00a0/g, ' ');
}

export function formatShortRp(amount: number): string {
  if (amount >= 1_000_000) {
    const val = (amount / 1_000_000).toFixed(1).replace('.', ',');
    return `Rp ${val.endsWith(',0') ? val.slice(0, -2) : val} jt`;
  }
  if (amount >= 1_000) {
    return `Rp ${Math.round(amount / 1_000)} rb`;
  }
  return formatRp(amount);
}

export function formatDateTimeId(isoString: string): string {
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return isoString;
  return new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

export function getPaymentMethodLabel(method: PaymentMethod): string {
  const map: Record<PaymentMethod, string> = {
    qris: 'QRIS Instan (GoPay / OVO / DANA / m-Banking)',
    gopay: 'GoPay Instan',
    ovo: 'OVO Cash',
    dana: 'DANA Wallet',
    va_bca: 'Virtual Account BCA',
    va_mandiri: 'Virtual Account Mandiri',
    cashier: 'Bayar di Kasir (Tunai / Debit)',
  };
  return map[method] ?? method;
}

export function getServiceTypeLabel(serviceType: ServiceType): string {
  if (serviceType === 'dine-in') return 'Dine-In (Makan di Tempat)';
  if (serviceType === 'takeaway') return 'Takeaway (Ambil di Kedai)';
  return 'Delivery Sekitar Bogor';
}

export function sanitizeWhatsappPhone(raw: string): string {
  const digits = raw.replace(/\D/g, '');
  if (digits.startsWith('0')) {
    return `62${digits.slice(1)}`;
  }
  if (digits.startsWith('8')) {
    return `62${digits}`;
  }
  return digits || '62818877344';
}

export function buildWhatsAppOrderMessage(order: OrderRecord): string {
  const lines: string[] = [
    `*PESANAN BARU KUPIKUDAI*`,
    `No. Pesanan: *${order.id}*`,
    `Waktu: ${formatDateTimeId(order.createdAt)}`,
    ``,
    `*Data Pelanggan*`,
    `Nama: ${order.customerName}`,
    `No. WA: ${order.customerPhone || '-'}`,
    `Layanan: ${getServiceTypeLabel(order.serviceType)}`,
    ...(order.serviceType === 'dine-in' ? [`Meja: *${order.tableNumber}*`] : []),
    ``,
    `*Rincian Menu*`,
  ];

  order.items.forEach((item, idx) => {
    const variants: string[] = [];
    if (item.selectedTemp) variants.push(item.selectedTemp === 'Cold' ? 'Dingin' : 'Hangat');
    if (item.selectedFlavour) variants.push(item.selectedFlavour);
    const variantStr = variants.length > 0 ? ` (${variants.join(', ')})` : '';
    const lineTotal = item.unitPrice * item.quantity;
    lines.push(`${idx + 1}. ${item.name}${variantStr} × ${item.quantity} = ${formatRp(lineTotal)}`);
    if (item.notes) {
      lines.push(`   Catatan: ${item.notes}`);
    }
  });

  lines.push('');
  lines.push(`Subtotal: ${formatRp(order.subtotal)}`);
  if (order.discountAmount > 0 && order.promoCode) {
    lines.push(`Diskon (${order.promoCode}): -${formatRp(order.discountAmount)}`);
  }
  lines.push(`*Total Bayar: ${formatRp(order.total)}*`);
  lines.push('');
  lines.push(`*Pembayaran*`);
  lines.push(`Metode: ${getPaymentMethodLabel(order.paymentMethod)}`);
  lines.push(
    `Status: ${order.paymentStatus === 'paid' ? 'LUNAS (Terverifikasi Digital)' : 'Menunggu Pembayaran di Kasir'}`,
  );
  lines.push(`Ref: ${order.paymentReference}`);

  if (order.notes) {
    lines.push('');
    lines.push(`Catatan Tambahan: ${order.notes}`);
  }

  lines.push('');
  lines.push(`Dikirim dari Menu Digital Kupikudai Bogor.`);

  return lines.join('\n');
}

export function buildWhatsAppUrl(order: OrderRecord, settings: StoreSettings): string {
  const target = sanitizeWhatsappPhone(settings.whatsappNumber);
  const text = encodeURIComponent(buildWhatsAppOrderMessage(order));
  return `https://wa.me/${target}?text=${text}`;
}

export function buildCartKey(
  menuId: string,
  temp?: string,
  flavour?: string,
  notes?: string,
): string {
  return [menuId, temp ?? '', flavour ?? '', (notes ?? '').trim().toLowerCase()].join('::');
}

export function getCartCount(items: CartItem[]): number {
  return items.reduce((sum, item) => sum + item.quantity, 0);
}
