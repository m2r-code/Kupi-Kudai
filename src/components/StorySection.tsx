import { Instagram, MapPin, MessageCircle } from 'lucide-react';
import { MenuImage } from './MenuImage.tsx';
import type { StoreSettings } from '../types.ts';
import { sanitizeWhatsappPhone } from '../utils/formatters.ts';

interface StorySectionProps {
  settings: StoreSettings;
  onBackToMenu: () => void;
}

export function StorySection({ settings, onBackToMenu }: StorySectionProps) {
  const waDirectUrl = `https://wa.me/${sanitizeWhatsappPhone(settings.whatsappNumber)}`;

  return (
    <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="grid grid-cols-1 items-stretch gap-10 lg:grid-cols-12">
        <div className="flex flex-col justify-between space-y-6 lg:col-span-6">
          <div className="space-y-4">
            <p className="text-xs font-medium text-[#525F55]">
              Tentang Kupikudai · Landbouw, Kota Bogor
            </p>
            <h2 className="text-balance font-serif text-3xl leading-tight font-semibold text-[#1A241C] sm:text-4xl">
              Perpaduan tradisi Palembang & memori hangat keluarga kami.
            </h2>
            <p className="text-base leading-relaxed text-[#525F55]">
              Di ujung tersembunyi Landbouw, tanpa sekat dinding dan AC, angin lembah bertiup
              bebas bersama sapuan kabut Gunung Salak. Tempat ini berdenyut bersama cerita dapur
              Iboenda dan aroma kopi susu kesukaan keluarga.
            </p>
          </div>

          <div className="space-y-5 border-t border-[rgba(26,36,28,0.1)] pt-6">
            <div>
              <h3 className="font-serif text-lg font-semibold text-[#1E4D31]">
                01. Autentisitas Palembang
              </h3>
              <p className="mt-1 text-sm leading-relaxed text-[#525F55]">
                Pempek ikan tenggiri yang renyah, kuah udang Tekwan dan Model yang kaya, gurihnya
                Lenggang, pekatnya Mie Celor, hingga segarnya Pindang Patin membawa kehangatan
                cita rasa asli Bumi Sriwijaya.
              </p>
            </div>

            <div>
              <h3 className="font-serif text-lg font-semibold text-[#1E4D31]">
                02. Sentuhan Masakan Iboenda
              </h3>
              <p className="mt-1 text-sm leading-relaxed text-[#525F55]">
                Panggangan Lasagna Iboen, Penne Schotel Tuna, dan kudapan Rozza Iboen mengembalikan
                kenangan manis tentang bekal sekolah buatan rumah yang selalu dirindukan.
              </p>
            </div>

            <div>
              <h3 className="font-serif text-lg font-semibold text-[#1E4D31]">
                03. Penghormatan untuk Ayah & Iboenda
              </h3>
              <p className="mt-1 text-sm leading-relaxed text-[#525F55]">
                Setiap tegukan <span className="font-medium text-[#1A241C]">Ay & Ib’s Kupi</span>{' '}
                memadukan espresso lembut dengan daging durian asli—merawat tradisi orang tua kami
                lewat racikan favoritnya.
              </p>
            </div>
          </div>

          <div className="space-y-3 rounded-xl border border-[rgba(26,36,28,0.11)] bg-white p-5">
            <div className="flex items-start gap-3 text-sm text-[#1A241C]">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-[#1E4D31]" aria-hidden="true" />
              <div>
                <p className="font-medium">Alamat Kedai</p>
                <p className="mt-0.5 text-xs leading-relaxed text-[#525F55]">{settings.address}</p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 pt-2">
              <button
                type="button"
                onClick={onBackToMenu}
                className="inline-flex min-h-10 items-center rounded-lg bg-[#1E4D31] px-4 py-2 text-xs font-medium text-[#F7F5EF] hover:bg-[#173C26]"
              >
                Lihat Daftar Menu
              </button>
              <a
                href={waDirectUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-10 items-center gap-1.5 rounded-lg border border-[rgba(26,36,28,0.16)] bg-[#F7F5EF] px-4 py-2 text-xs font-medium text-[#1A241C] hover:bg-[#EDE9DF]"
              >
                <MessageCircle className="h-3.5 w-3.5 text-[#1E4D31]" aria-hidden="true" />
                <span>WhatsApp Kedai</span>
              </a>
              <a
                href="https://www.instagram.com/kupikudai/"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-10 items-center gap-1.5 rounded-lg border border-[rgba(26,36,28,0.16)] bg-[#F7F5EF] px-4 py-2 text-xs font-medium text-[#1A241C] hover:bg-[#EDE9DF]"
              >
                <Instagram className="h-3.5 w-3.5 text-[#1E4D31]" aria-hidden="true" />
                <span>{settings.instagramHandle}</span>
              </a>
            </div>
          </div>
        </div>

        <div className="lg:col-span-6">
          <div className="h-full min-h-[420px] overflow-hidden rounded-2xl border border-[rgba(26,36,28,0.1)] bg-[#EDE9DF]">
            <MenuImage
              src="/images/venue/terrace-vertical.jpg"
              alt="Tangga batu dan taman hijau outdoor Kupikudai Bogor saat senja"
              variant="venue"
              className="h-full w-full object-cover"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
