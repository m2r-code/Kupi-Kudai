import { Bell, BellRing, Tag, X } from 'lucide-react';
import type { PushNotificationEntry } from '../types.ts';
import { formatDateTimeId } from '../utils/formatters.ts';

interface PromoInboxAndToastProps {
  liveToast: PushNotificationEntry | null;
  onDismissToast: () => void;
  inboxOpen: boolean;
  onCloseInbox: () => void;
  notifications: PushNotificationEntry[];
  pushEnabled: boolean;
  pushPermissionState: NotificationPermission | 'unsupported';
  onEnablePush: () => void;
  onUsePromoCode: (code: string) => void;
}

export function PromoInboxAndToast({
  liveToast,
  onDismissToast,
  inboxOpen,
  onCloseInbox,
  notifications,
  pushEnabled,
  pushPermissionState,
  onEnablePush,
  onUsePromoCode,
}: PromoInboxAndToastProps) {
  return (
    <>
      {/* Live Push Notification Toast (Only triggered on real SSE broadcast or opt-in confirmation) */}
      {liveToast && (
        <div
          className="fixed right-4 bottom-4 z-50 w-[calc(100%-2rem)] max-w-sm rounded-2xl border border-[#1E4D31]/25 bg-[#1E4D31] p-4 text-[#F7F5EF] shadow-lg"
          role="status"
          aria-live="polite"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-2.5">
              <BellRing className="mt-0.5 h-4 w-4 shrink-0 text-[#C9E2D1]" aria-hidden="true" />
              <div>
                <p className="text-[11px] font-medium text-white/80">
                  Notifikasi Promo Baru · {liveToast.targetCategory}
                </p>
                <p className="mt-0.5 font-serif text-base font-semibold leading-snug text-white">
                  {liveToast.title}
                </p>
                <p className="mt-1 text-xs leading-relaxed text-white/85">{liveToast.message}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={onDismissToast}
              aria-label="Tutup notifikasi promo"
              className="rounded-md p-1 text-white/75 hover:bg-white/10 hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="mt-3 flex items-center justify-between gap-2 border-t border-white/15 pt-2.5">
            <span className="font-mono text-xs font-semibold text-[#D6F5E0]">
              Kode: {liveToast.code}
            </span>
            <button
              type="button"
              onClick={() => {
                onUsePromoCode(liveToast.code);
                onDismissToast();
              }}
              className="rounded-lg bg-[#F7F5EF] px-3 py-1.5 text-xs font-semibold text-[#1E4D31] hover:bg-white"
            >
              Pakai Kode Promo
            </button>
          </div>
        </div>
      )}

      {/* Notification Inbox Drawer */}
      {inboxOpen && (
        <div
          className="fixed inset-0 z-50 flex justify-end bg-[#1A241C]/50 backdrop-blur-[2px]"
          role="dialog"
          aria-modal="true"
          aria-label="Kotak Masuk Promo Kupikudai"
          onClick={onCloseInbox}
        >
          <div
            className="flex h-full w-full max-w-md flex-col border-l border-[rgba(26,36,28,0.12)] bg-[#F7F5EF]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-[rgba(26,36,28,0.1)] bg-white px-5 py-4">
              <div>
                <p className="text-xs font-medium text-[#525F55]">Siaran Promo Real-Time</p>
                <h2 className="font-serif text-xl font-semibold text-[#1A241C]">
                  Promo & Diskon Terbaru
                </h2>
              </div>
              <button
                type="button"
                onClick={onCloseInbox}
                aria-label="Tutup kotak promo"
                className="flex h-10 w-10 items-center justify-center rounded-lg border border-[rgba(26,36,28,0.12)] text-[#1A241C]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex-1 space-y-4 overflow-y-auto p-5">
              <div className="flex items-center justify-between gap-3 rounded-xl border border-[rgba(26,36,28,0.1)] bg-white p-4">
                <div className="flex items-center gap-2.5 text-xs">
                  <Bell className="h-4 w-4 text-[#1E4D31]" aria-hidden="true" />
                  <div>
                    <p className="font-semibold text-[#1A241C]">
                      {pushEnabled
                        ? 'Notifikasi Push Browser Aktif'
                        : 'Aktifkan Notifikasi Browser'}
                    </p>
                    <p className="text-[11px] text-[#525F55]">
                      {pushPermissionState === 'denied'
                        ? 'Izin browser diblokir, notifikasi tetap muncul di halaman ini.'
                        : 'Dapatkan peringatan instan saat promo sore atau akhir pekan rilis.'}
                    </p>
                  </div>
                </div>
                {!pushEnabled && (
                  <button
                    type="button"
                    onClick={onEnablePush}
                    className="shrink-0 rounded-lg bg-[#1E4D31] px-3 py-1.5 text-xs font-medium text-[#F7F5EF]"
                  >
                    Aktifkan
                  </button>
                )}
              </div>

              {notifications.length === 0 ? (
                <p className="py-10 text-center text-sm text-[#525F55]">
                  Belum ada pengumuman promo saat ini.
                </p>
              ) : (
                notifications.map((item) => (
                  <article
                    key={item.id}
                    className="rounded-xl border border-[rgba(26,36,28,0.1)] bg-white p-4"
                  >
                    <div className="flex items-center justify-between gap-2 text-[11px] text-[#525F55]">
                      <span>{item.targetCategory}</span>
                      <span className="font-mono tabular-nums">{formatDateTimeId(item.sentAt)}</span>
                    </div>
                    <h3 className="mt-1 font-serif text-base font-semibold text-[#1A241C]">
                      {item.title}
                    </h3>
                    <p className="mt-1 text-xs leading-relaxed text-[#525F55]">{item.message}</p>

                    <div className="mt-3 flex items-center justify-between gap-2 border-t border-[rgba(26,36,28,0.08)] pt-3">
                      <span className="inline-flex items-center gap-1 font-mono text-xs font-semibold text-[#1E4D31]">
                        <Tag className="h-3.5 w-3.5" aria-hidden="true" />
                        {item.code}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          onUsePromoCode(item.code);
                          onCloseInbox();
                        }}
                        className="rounded-lg bg-[#1E4D31] px-3 py-1.5 text-xs font-medium text-[#F7F5EF] hover:bg-[#173C26]"
                      >
                        Pakai di Keranjang
                      </button>
                    </div>
                  </article>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
