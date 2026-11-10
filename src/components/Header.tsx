import { Menu, ShoppingBag, X } from 'lucide-react';
import { useState } from 'react';

export type ActiveTab = 'menu' | 'story' | 'qr' | 'admin';

interface HeaderProps {
  activeTab: ActiveTab;
  onNavigate: (tab: ActiveTab) => void;
  cartCount: number;
  onOpenCart: () => void;
}

export function Header({ activeTab, onNavigate, cartCount, onOpenCart }: HeaderProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems: { id: ActiveTab; label: string }[] = [
    { id: 'menu', label: 'Menu' },
    { id: 'story', label: 'Cerita Kami' },
    { id: 'qr', label: 'QR Meja' },
    { id: 'admin', label: 'Kelola & Analitik' },
  ];

  const handleNavClick = (id: ActiveTab) => {
    setMobileMenuOpen(false);
    onNavigate(id);
  };

  return (
    <header className="sticky top-0 z-40 border-b border-[rgba(26,36,28,0.1)] bg-[#F7F5EF]/95 backdrop-blur-sm">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-8 px-4 sm:px-6 lg:px-8">
        {/* Zone 1: Single-element Brand Wordmark */}
        <button
          type="button"
          onClick={() => handleNavClick('menu')}
          className="shrink-0 whitespace-nowrap font-serif text-2xl font-semibold tracking-tight text-[#1E4D31] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#1E4D31]"
        >
          kupikudai
        </button>

        {/* Zone 2: Clean single-line text navigation links */}
        <nav className="hidden items-center gap-7 md:flex" aria-label="Navigasi utama">
          {navItems.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleNavClick(item.id)}
                className={`shrink-0 whitespace-nowrap border-b-2 py-1 text-sm font-medium transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#1E4D31] ${
                  isActive
                    ? 'border-[#1E4D31] text-[#1A241C]'
                    : 'border-transparent text-[#525F55] hover:border-[#1E4D31]/30 hover:text-[#1A241C]'
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </nav>

        {/* Zone 3: Single Primary Action */}
        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={onOpenCart}
            className="inline-flex min-h-10 shrink-0 items-center gap-2 whitespace-nowrap rounded-lg bg-[#1E4D31] px-4 py-2 text-sm font-medium text-[#F7F5EF] transition-colors duration-150 hover:bg-[#173C26] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1E4D31]"
          >
            <ShoppingBag className="h-4 w-4" aria-hidden="true" />
            <span className="tabular-nums">
              {cartCount > 0 ? `Keranjang (${cartCount})` : 'Keranjang'}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setMobileMenuOpen((prev) => !prev)}
            className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-[rgba(26,36,28,0.14)] text-[#1A241C] md:hidden"
            aria-label={mobileMenuOpen ? 'Tutup menu navigasi' : 'Buka menu navigasi'}
            aria-expanded={mobileMenuOpen}
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {mobileMenuOpen && (
        <nav
          className="border-t border-[rgba(26,36,28,0.1)] bg-[#F7F5EF] px-4 py-3 md:hidden"
          aria-label="Navigasi seluler"
        >
          <div className="flex flex-col gap-1">
            {navItems.map((item) => {
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleNavClick(item.id)}
                  className={`flex min-h-11 items-center justify-between rounded-lg px-3 py-2 text-left text-sm font-medium whitespace-nowrap ${
                    isActive
                      ? 'bg-[#EDE9DF] text-[#1E4D31]'
                      : 'text-[#525F55] hover:bg-[#EDE9DF]/60 hover:text-[#1A241C]'
                  }`}
                >
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>
        </nav>
      )}
    </header>
  );
}
