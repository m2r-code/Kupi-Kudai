import { Bell, BellRing, MapPin, QrCode } from 'lucide-react';
import { MenuImage } from './MenuImage.tsx';
import { TABLE_OPTIONS } from '../data/seedData.ts';
import type { StoreSettings } from '../types.ts';

interface HeroSectionProps {
  settings: StoreSettings;
  selectedTable: string;
  onChangeTable: (tableLabel: string) => void;
  onExploreMenu: () => void;
  onOpenQrStudio: () => void;
  pushEnabled: boolean;
  pushPermissionState: NotificationPermission | 'unsupported';
  unreadNotifCount: number;
  onTogglePushOptIn: () => void;
  onOpenNotifInbox: () => void;
}

export function HeroSection({
  settings,
  selectedTable,
  onChangeTable,
  onExploreMenu,
  onOpenQrStudio,
  pushEnabled,
  unreadNotifCount,
  onTogglePushOptIn,
  onOpenNotifInbox,
}: HeroSectionProps) {
  return (
    <section className="border-b border-[rgba(26,36,28,0.1)] bg-[#F7F5EF]">
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
        <div className="grid grid-cols-1 items-stretch gap-8 lg:grid-cols-12 lg:gap-10">
          {/* Left Editorial Pitch */}
          <div className="flex flex-col justify-between lg:col-span-7">
            <div className="space-y-5">
              <p className="text-xs font-medium tracking-wide text-[#525F55]">
                Landbouw, Bogor Barat · Instagram {settings.instagramHandle} · Menu Digital 2026
              </p>

              <h1 className="text-balance font-serif text-4xl leading-[1.12] font-semibold tracking-tight text-[#1A241C] sm:text-5xl">
                Ngopi dulu di tepi lembah, ditemani masakan autentik keluarga.
              </h1>

              <p className="max-w-xl text-base leading-relaxed text-[#525F55]">
                Dalam bahasa Ogan Palembang, <span className="font-medium text-[#1A241C]">kupikudai</span> berarti
                “ngopi dulu”. Pesan langsung dari meja Anda—mulai dari Pempek & Mie Celor khas
                Sriwijaya, Pasta Iboen, hingga Kupi Susu Kudai dan Mocktail Greenyard—cukup kirim
                pesanan via WhatsApp atau bayar cepat lewat QRIS.
              </p>
            </div>

            <div className="mt-8 space-y-4">
              {/* Inline Table Context + Controls */}
              <div className="flex flex-wrap items-center gap-3 rounded-xl border border-[rgba(26,36,28,0.11)] bg-white p-3.5">
                <div className="flex items-center gap-2 text-sm text-[#1A241C]">
                  <MapPin className="h-4 w-4 text-[#1E4D31]" aria-hidden="true" />
                  <span className="font-medium">Posisi Anda:</span>
                </div>

                <label htmlFor="hero-table-select" className="sr-only">
                  Pilih Nomor Meja atau Layanan
                </label>
                <select
                  id="hero-table-select"
                  value={selectedTable}
                  onChange={(e) => onChangeTable(e.target.value)}
                  className="min-h-10 rounded-lg border border-[rgba(26,36,28,0.15)] bg-[#F7F5EF] px-3 py-1.5 text-sm font-medium text-[#1A241C] focus-visible:outline-2 focus-visible:outline-[#1E4D31]"
                >
                  {TABLE_OPTIONS.map((t) => (
                    <option key={t.id} value={t.label}>
                      {t.label} — {t.zone}
                    </option>
                  ))}
                  <option value="Takeaway">Takeaway — Ambil di Kasir</option>
                </select>

                <button
                  type="button"
                  onClick={onOpenQrStudio}
                  className="inline-flex min-h-10 items-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-medium text-[#1E4D31] transition-colors hover:bg-[#EDE9DF]"
                >
                  <QrCode className="h-4 w-4" aria-hidden="true" />
                  <span>Lihat QR Meja</span>
                </button>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={onExploreMenu}
                  className="inline-flex min-h-11 items-center justify-center whitespace-nowrap rounded-lg bg-[#1E4D31] px-6 py-2.5 text-sm font-medium text-[#F7F5EF] transition-colors duration-150 hover:bg-[#173C26] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1E4D31]"
                >
                  Jelajahi Menu Digital
                </button>

                <button
                  type="button"
                  onClick={pushEnabled ? onOpenNotifInbox : onTogglePushOptIn}
                  className="inline-flex min-h-11 items-center gap-2 whitespace-nowrap rounded-lg border border-[rgba(26,36,28,0.16)] bg-white px-4 py-2.5 text-sm font-medium text-[#1A241C] transition-colors duration-150 hover:bg-[#EDE9DF] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1E4D31]"
                >
                  {pushEnabled ? (
                    <BellRing className="h-4 w-4 text-[#1E4D31]" aria-hidden="true" />
                  ) : (
                    <Bell className="h-4 w-4 text-[#525F55]" aria-hidden="true" />
                  )}
                  <span>
                    {pushEnabled
                      ? unreadNotifCount > 0
                        ? `Info Promo (${unreadNotifCount})`
                        : 'Notifikasi Promo Aktif'
                      : 'Aktifkan Notifikasi Promo'}
                  </span>
                </button>
              </div>
            </div>
          </div>

          {/* Right Garden Photo */}
          <div className="lg:col-span-5">
            <div className="relative h-72 overflow-hidden rounded-2xl border border-[rgba(26,36,28,0.1)] bg-[#EDE9DF] lg:h-full lg:min-h-[360px]">
              <MenuImage
                src="/images/venue/garden-hero.jpg"
                alt="Area duduk outdoor Kupikudai Bogor di bawah rindangnya pepohonan lembah Landbouw"
                variant="venue"
                className="h-full w-full object-cover"
              />
              <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-5 text-white">
                <p className="text-xs font-medium text-white/85">
                  Gg. Kayu Manis No.15-18 · Menteng, Bogor Barat
                </p>
                <p className="mt-1 font-serif text-lg font-medium leading-snug text-white">
                  Ruang outdoor alami menghadap siluet Gunung Salak
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Full-Width 4-Column Operational Summary Strip */}
        <div className="mt-10 grid grid-cols-1 divide-y divide-[rgba(26,36,28,0.1)] rounded-xl border border-[rgba(26,36,28,0.1)] bg-white sm:grid-cols-2 sm:divide-y-0 lg:grid-cols-4 lg:divide-x">
          <div className="p-4 sm:p-5">
            <p className="text-xs font-medium text-[#525F55]">Jam Operasional</p>
            <p className="mt-1 text-sm font-semibold text-[#1A241C]">
              Sen–Min · 13.00–22.00 WIB
            </p>
            <p className="mt-0.5 text-xs text-[#525F55]">Setiap Kamis libur</p>
          </div>
          <div className="p-4 sm:p-5">
            <p className="text-xs font-medium text-[#525F55]">Pemesanan WhatsApp</p>
            <p className="mt-1 text-sm font-semibold text-[#1A241C]">
              Terhubung ke Kasir Kedai
            </p>
            <p className="mt-0.5 text-xs text-[#525F55]">Rincian meja otomatis rapi</p>
          </div>
          <div className="p-4 sm:p-5">
            <p className="text-xs font-medium text-[#525F55]">Pembayaran Digital</p>
            <p className="mt-1 text-sm font-semibold text-[#1A241C]">
              QRIS, E-Wallet & Virtual Account
            </p>
            <p className="mt-0.5 text-xs text-[#525F55]">Checkout cepat tanpa antre</p>
          </div>
          <div className="p-4 sm:p-5">
            <p className="text-xs font-medium text-[#525F55]">Ketersediaan Menu</p>
            <p className="mt-1 text-sm font-semibold text-[#1A241C]">
              Stok & Harga Real-Time
            </p>
            <p className="mt-0.5 text-xs text-[#525F55]">Sinkron langsung dari dapur</p>
          </div>
        </div>
      </div>
    </section>
  );
}
