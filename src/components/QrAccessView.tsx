import { useCallback, useState } from 'react';
import { Check, Copy, Download, ExternalLink, Printer, QrCode } from 'lucide-react';
import { TABLE_OPTIONS } from '../data/seedData.ts';
import type { StoreSettings } from '../types.ts';
import { QrCodeGraphic } from './QrCodeGraphic.tsx';

interface QrAccessViewProps {
  settings: StoreSettings;
  onSimulateScan: (tableLabel: string) => void;
}

export function QrAccessView({ settings, onSimulateScan }: QrAccessViewProps) {
  const [selectedTarget, setSelectedTarget] = useState<string>('05');
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [qrAssets, setQrAssets] = useState<{ dataUrl: string; svg: string }>({
    dataUrl: '',
    svg: '',
  });

  const baseOrigin =
    typeof window !== 'undefined' ? `${window.location.origin}${window.location.pathname}` : '';

  const targetMeta =
    selectedTarget === 'utama'
      ? { label: 'Menu Utama (Semua Meja)', zone: 'Linktree & Etalase Depan', param: '' }
      : selectedTarget === 'takeaway'
        ? { label: 'Takeaway / Pick-up', zone: 'Area Kasir Depan', param: '?meja=Takeaway' }
        : (() => {
            const found = TABLE_OPTIONS.find((t) => t.id === selectedTarget) ?? TABLE_OPTIONS[0];
            return {
              label: found.label,
              zone: found.zone,
              param: `?meja=${encodeURIComponent(found.label)}`,
            };
          })();

  const qrUrl = `${baseOrigin}${targetMeta.param}`;

  const handleGenerated = useCallback((dataUrl: string, svg: string) => {
    setQrAssets({ dataUrl, svg });
  }, []);

  const handleCopyUrl = async () => {
    try {
      await navigator.clipboard.writeText(qrUrl);
      setCopiedUrl(true);
      setTimeout(() => setCopiedUrl(false), 2000);
    } catch {
      // Fallback ignored inside restricted clipboards
    }
  };

  const handleDownloadPng = () => {
    if (!qrAssets.dataUrl) return;
    const link = document.createElement('a');
    link.href = qrAssets.dataUrl;
    link.download = `qr-kupikudai-${selectedTarget}.png`;
    link.click();
  };

  const handleDownloadSvg = () => {
    if (!qrAssets.svg) return;
    const blob = new Blob([qrAssets.svg], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `qr-kupikudai-${selectedTarget}.svg`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <section className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="border-b border-[rgba(26,36,28,0.1)] pb-6">
        <p className="text-xs font-medium text-[#525F55]">
          Akses Pelanggan Tanpa Aplikasi · Cetak Kartu Meja
        </p>
        <h2 className="mt-1 font-serif text-3xl font-semibold tracking-tight text-[#1A241C]">
          QR Code Menu & Kartu Meja Kupikudai
        </h2>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[#525F55]">
          Setiap meja memiliki tautan QR unik agar nomor meja terisi otomatis saat pelanggan
          memesan lewat WhatsApp maupun membayar dengan QRIS.
        </p>
      </div>

      <div className="mt-8 grid grid-cols-1 items-start gap-8 lg:grid-cols-12">
        {/* Left: Table Selector & Controls */}
        <div className="space-y-6 lg:col-span-7">
          <div className="rounded-2xl border border-[rgba(26,36,28,0.11)] bg-white p-6">
            <h3 className="text-sm font-semibold text-[#1A241C]">Pilih Tujuan Kode QR</h3>
            <p className="mt-1 text-xs text-[#525F55]">
              Klik salah satu meja atau akses umum untuk membuat kode QR siap cetak.
            </p>

            <div className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-3">
              <button
                type="button"
                onClick={() => setSelectedTarget('utama')}
                className={`rounded-xl border p-3 text-left transition-colors ${
                  selectedTarget === 'utama'
                    ? 'border-[#1E4D31] bg-[#1E4D31] text-[#F7F5EF]'
                    : 'border-[rgba(26,36,28,0.12)] bg-[#F7F5EF] text-[#1A241C] hover:bg-[#EDE9DF]'
                }`}
              >
                <p className="text-xs font-semibold">QR Menu Utama</p>
                <p
                  className={`mt-0.5 text-[11px] ${
                    selectedTarget === 'utama' ? 'text-white/80' : 'text-[#525F55]'
                  }`}
                >
                  Bio IG / Etalase
                </p>
              </button>

              <button
                type="button"
                onClick={() => setSelectedTarget('takeaway')}
                className={`rounded-xl border p-3 text-left transition-colors ${
                  selectedTarget === 'takeaway'
                    ? 'border-[#1E4D31] bg-[#1E4D31] text-[#F7F5EF]'
                    : 'border-[rgba(26,36,28,0.12)] bg-[#F7F5EF] text-[#1A241C] hover:bg-[#EDE9DF]'
                }`}
              >
                <p className="text-xs font-semibold">Takeaway</p>
                <p
                  className={`mt-0.5 text-[11px] ${
                    selectedTarget === 'takeaway' ? 'text-white/80' : 'text-[#525F55]'
                  }`}
                >
                  Kasir Depan
                </p>
              </button>

              {TABLE_OPTIONS.map((t) => {
                const isSelected = selectedTarget === t.id;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setSelectedTarget(t.id)}
                    className={`rounded-xl border p-3 text-left transition-colors ${
                      isSelected
                        ? 'border-[#1E4D31] bg-[#1E4D31] text-[#F7F5EF]'
                        : 'border-[rgba(26,36,28,0.12)] bg-[#F7F5EF] text-[#1A241C] hover:bg-[#EDE9DF]'
                    }`}
                  >
                    <p className="text-xs font-semibold">{t.label}</p>
                    <p
                      className={`mt-0.5 truncate text-[11px] ${
                        isSelected ? 'text-white/80' : 'text-[#525F55]'
                      }`}
                    >
                      {t.zone}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="rounded-2xl border border-[rgba(26,36,28,0.11)] bg-white p-6">
            <h3 className="text-sm font-semibold text-[#1A241C]">Tautan Langsung & Ekspor</h3>
            <div className="mt-3 flex flex-wrap items-center gap-2 rounded-lg border border-[rgba(26,36,28,0.12)] bg-[#F7F5EF] p-2.5">
              <code className="min-w-0 flex-1 truncate font-mono text-xs text-[#1A241C]">
                {qrUrl}
              </code>
              <button
                type="button"
                onClick={handleCopyUrl}
                className="inline-flex min-h-9 shrink-0 items-center gap-1.5 rounded-md border border-[rgba(26,36,28,0.16)] bg-white px-3 py-1.5 text-xs font-medium text-[#1A241C] hover:bg-[#EDE9DF]"
              >
                {copiedUrl ? (
                  <Check className="h-3.5 w-3.5 text-[#1E4D31]" />
                ) : (
                  <Copy className="h-3.5 w-3.5" />
                )}
                <span>{copiedUrl ? 'Tersalin' : 'Salin Tautan'}</span>
              </button>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={handleDownloadPng}
                className="inline-flex min-h-10 items-center gap-1.5 rounded-lg bg-[#1E4D31] px-4 py-2 text-xs font-medium text-[#F7F5EF] hover:bg-[#173C26]"
              >
                <Download className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Unduh PNG</span>
              </button>

              <button
                type="button"
                onClick={handleDownloadSvg}
                className="inline-flex min-h-10 items-center gap-1.5 rounded-lg border border-[rgba(26,36,28,0.16)] bg-white px-4 py-2 text-xs font-medium text-[#1A241C] hover:bg-[#EDE9DF]"
              >
                <QrCode className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Unduh SVG</span>
              </button>

              <button
                type="button"
                onClick={() => window.print()}
                className="inline-flex min-h-10 items-center gap-1.5 rounded-lg border border-[rgba(26,36,28,0.16)] bg-white px-4 py-2 text-xs font-medium text-[#1A241C] hover:bg-[#EDE9DF]"
              >
                <Printer className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Cetak Kartu</span>
              </button>

              <button
                type="button"
                onClick={() =>
                  onSimulateScan(selectedTarget === 'utama' ? 'Meja 01' : targetMeta.label)
                }
                className="inline-flex min-h-10 items-center gap-1.5 rounded-lg border border-[#1E4D31]/30 bg-[#F7F5EF] px-4 py-2 text-xs font-semibold text-[#1E4D31] hover:bg-[#EDE9DF]"
              >
                <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Simulasi Scan {targetMeta.label}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Right: Print-Ready Kupikudai Table Tent Preview */}
        <div className="lg:col-span-5">
          <div className="overflow-hidden rounded-2xl border border-[rgba(26,36,28,0.15)] bg-[#1E4D31] p-7 text-center text-[#F7F5EF]">
            <p className="font-serif text-2xl font-semibold tracking-tight">kupikudai</p>
            <p className="mt-1 text-xs text-white/80">
              {settings.instagramHandle} · Landbouw, Bogor Barat
            </p>

            <div className="my-6 inline-block rounded-2xl bg-[#F7F5EF] p-5 text-[#1A241C]">
              <QrCodeGraphic
                value={qrUrl}
                size={210}
                darkColor="#1A241C"
                lightColor="#FFFFFF"
                label={`Kode QR untuk ${targetMeta.label}`}
                onGenerated={handleGenerated}
              />
              <p className="mt-3 font-serif text-lg font-semibold text-[#1E4D31]">
                {targetMeta.label}
              </p>
              <p className="text-xs text-[#525F55]">{targetMeta.zone}</p>
            </div>

            <div className="space-y-1 text-xs text-white/90">
              <p className="font-medium">Pindai kamera ponsel untuk membuka menu</p>
              <p className="text-white/75">
                Pilih hidangan · Bayar via QRIS / E-Wallet · Kirim ke WhatsApp
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
