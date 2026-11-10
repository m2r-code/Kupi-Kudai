import { useMemo, useState } from 'react';
import { Minus, Plus, Search, SlidersHorizontal, X } from 'lucide-react';
import { MENU_CATEGORIES } from '../data/seedData.ts';
import type { CartItem, MenuCategory, MenuItem, TemperatureOption } from '../types.ts';
import { formatRp } from '../utils/formatters.ts';
import { MenuImage } from './MenuImage.tsx';

interface MenuCatalogProps {
  menu: MenuItem[];
  cart: CartItem[];
  onAddToCart: (
    item: MenuItem,
    quantity: number,
    options?: {
      selectedTemp?: TemperatureOption;
      selectedFlavour?: string;
      notes?: string;
    },
  ) => void;
  onUpdateCartQty: (cartKey: string, nextQty: number) => void;
}

type CategoryFilter = 'Semua' | 'Favorit' | MenuCategory;

export function MenuCatalog({
  menu,
  cart,
  onAddToCart,
  onUpdateCartQty,
}: MenuCatalogProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<CategoryFilter>('Semua');
  const [onlyAvailable, setOnlyAvailable] = useState(false);
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);

  // Modal customization state
  const [modalTemp, setModalTemp] = useState<TemperatureOption | undefined>(undefined);
  const [modalFlavour, setModalFlavour] = useState<string | undefined>(undefined);
  const [modalNotes, setModalNotes] = useState('');
  const [modalQty, setModalQty] = useState(1);

  const openDetailModal = (item: MenuItem) => {
    setSelectedItem(item);
    setModalTemp(item.temperatures?.[0]);
    setModalFlavour(item.flavours?.[0]);
    setModalNotes('');
    setModalQty(1);
  };

  const closeDetailModal = () => {
    setSelectedItem(null);
  };

  const categoryTabs: { id: CategoryFilter; label: string }[] = useMemo(
    () => [
      { id: 'Semua', label: 'Semua Menu' },
      { id: 'Favorit', label: 'Favorit Kupikudai' },
      ...MENU_CATEGORIES.map((cat) => ({
        id: cat,
        label: cat === 'Mocktails, Affogato & Manual Brew' ? 'Mocktails & Brew' : cat,
      })),
    ],
    [],
  );

  const filteredItems = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return menu.filter((item) => {
      if (onlyAvailable && (!item.available || item.stock <= 0)) return false;
      if (activeCategory === 'Favorit' && !item.isRecommended) return false;
      if (
        activeCategory !== 'Semua' &&
        activeCategory !== 'Favorit' &&
        item.category !== activeCategory
      ) {
        return false;
      }
      if (!q) return true;
      return (
        item.name.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q)
      );
    });
  }, [menu, searchQuery, activeCategory, onlyAvailable]);

  const getCartEntriesForMenu = (menuId: string) =>
    cart.filter((c) => c.menuId === menuId);

  const handleQuickAdd = (item: MenuItem) => {
    if (!item.available || item.stock <= 0) return;
    const hasChoices =
      (item.temperatures && item.temperatures.length > 1) ||
      (item.flavours && item.flavours.length > 0);
    if (hasChoices) {
      openDetailModal(item);
      return;
    }
    onAddToCart(item, 1, {
      selectedTemp: item.temperatures?.[0],
    });
  };

  const handleConfirmModal = () => {
    if (!selectedItem || !selectedItem.available || selectedItem.stock <= 0) return;
    onAddToCart(selectedItem, modalQty, {
      selectedTemp: modalTemp,
      selectedFlavour: modalFlavour,
      notes: modalNotes.trim() || undefined,
    });
    closeDetailModal();
  };

  return (
    <section id="katalog-menu" className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="flex flex-col justify-between gap-4 border-b border-[rgba(26,36,28,0.1)] pb-6 md:flex-row md:items-end">
        <div>
          <p className="text-xs font-medium text-[#525F55]">
            Daftar Sajian Lengkap · Harga & Stok Sinkron Real-Time
          </p>
          <h2 className="mt-1 font-serif text-3xl font-semibold tracking-tight text-[#1A241C]">
            Menu Kupikudai
          </h2>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="relative min-w-[240px] flex-1 sm:w-72">
            <Search
              className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-[#525F55]"
              aria-hidden="true"
            />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari pempek, pasta, kupi..."
              aria-label="Cari menu Kupikudai"
              className="min-h-10 w-full rounded-lg border border-[rgba(26,36,28,0.16)] bg-white py-2 pr-3 pl-9 text-sm text-[#1A241C] placeholder:text-[#525F55]/70 focus:border-[#1E4D31] focus:outline-none"
            />
          </div>

          <button
            type="button"
            onClick={() => setOnlyAvailable((prev) => !prev)}
            className={`inline-flex min-h-10 items-center gap-2 whitespace-nowrap rounded-lg border px-3.5 py-2 text-xs font-medium transition-colors ${
              onlyAvailable
                ? 'border-[#1E4D31] bg-[#1E4D31] text-[#F7F5EF]'
                : 'border-[rgba(26,36,28,0.16)] bg-white text-[#1A241C] hover:bg-[#EDE9DF]'
            }`}
          >
            <SlidersHorizontal className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Tersedia Saja</span>
          </button>
        </div>
      </div>

      {/* Category Filter Tabs */}
      <div
        className="mt-5 flex items-center gap-2 overflow-x-auto pb-2"
        role="tablist"
        aria-label="Filter kategori menu"
      >
        {categoryTabs.map((tab) => {
          const isActive = activeCategory === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => setActiveCategory(tab.id)}
              className={`min-h-9 shrink-0 whitespace-nowrap rounded-lg px-3.5 py-1.5 text-xs font-medium transition-colors duration-150 ${
                isActive
                  ? 'bg-[#1E4D31] text-[#F7F5EF]'
                  : 'bg-[#EDE9DF] text-[#525F55] hover:bg-[#E2DDD0] hover:text-[#1A241C]'
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Results Count */}
      <div className="mt-4 flex items-center justify-between text-xs text-[#525F55]">
        <span className="tabular-nums">
          Menampilkan {filteredItems.length} dari {menu.length} sajian
        </span>
        {activeCategory !== 'Semua' && (
          <button
            type="button"
            onClick={() => {
              setActiveCategory('Semua');
              setSearchQuery('');
              setOnlyAvailable(false);
            }}
            className="font-medium text-[#1E4D31] hover:underline"
          >
            Reset filter
          </button>
        )}
      </div>

      {/* Menu Grid */}
      {filteredItems.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-[rgba(26,36,28,0.1)] bg-white px-6 py-14 text-center">
          <p className="font-serif text-xl font-medium text-[#1A241C]">
            Tidak ada menu yang cocok dengan pencarian Anda
          </p>
          <p className="mt-2 text-sm text-[#525F55]">
            Coba kata kunci lain seperti “Pempek”, “Kupi Susu”, atau tampilkan semua kategori.
          </p>
          <button
            type="button"
            onClick={() => {
              setSearchQuery('');
              setActiveCategory('Semua');
              setOnlyAvailable(false);
            }}
            className="mt-5 inline-flex min-h-10 items-center rounded-lg bg-[#1E4D31] px-4 py-2 text-sm font-medium text-[#F7F5EF]"
          >
            Tampilkan Semua Menu
          </button>
        </div>
      ) : (
        <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filteredItems.map((item) => {
            const isOutOfStock = !item.available || item.stock <= 0;
            const isLowStock = !isOutOfStock && item.stock <= 5;
            const hasPromo =
              typeof item.promoPrice === 'number' &&
              item.promoPrice > 0 &&
              item.promoPrice < item.price;
            const effectivePrice = hasPromo ? item.promoPrice! : item.price;
            const cartEntries = getCartEntriesForMenu(item.id);
            const totalInCart = cartEntries.reduce((sum, c) => sum + c.quantity, 0);

            const metaParts: string[] = [item.category];
            if (item.isRecommended) metaParts.push('Favorit');
            if (item.temperatures && item.temperatures.length > 0) {
              metaParts.push(
                item.temperatures.map((t) => (t === 'Cold' ? 'Dingin' : 'Hangat')).join(' / '),
              );
            }

            return (
              <article
                key={item.id}
                className={`group flex flex-col overflow-hidden rounded-2xl border border-[rgba(26,36,28,0.1)] bg-white transition-transform duration-150 ${
                  isOutOfStock ? 'opacity-75' : 'hover:-translate-y-0.5'
                }`}
              >
                {/* Dish Image Surface matched to PDF studio paper #E9E6D3 */}
                <button
                  type="button"
                  onClick={() => openDetailModal(item)}
                  className="relative aspect-[4/3] w-full overflow-hidden bg-[#E9E6D3] p-4 text-left focus-visible:outline-2 focus-visible:outline-inset focus-visible:outline-[#1E4D31]"
                >
                  <MenuImage
                    src={item.image}
                    alt={item.name}
                    className={`h-full w-full transition-transform duration-200 group-hover:scale-[1.03] ${
                      isOutOfStock ? 'grayscale' : ''
                    }`}
                  />
                  {isOutOfStock && (
                    <div className="absolute inset-0 flex items-center justify-center bg-[#1A241C]/45">
                      <span className="rounded-lg bg-[#1A241C] px-3 py-1.5 text-xs font-semibold text-[#F7F5EF]">
                        Stok Habis
                      </span>
                    </div>
                  )}
                </button>

                {/* Card Content */}
                <div className="flex flex-1 flex-col justify-between p-5">
                  <div>
                    <p className="truncate text-xs font-medium text-[#525F55]">
                      {metaParts.join(' · ')}
                    </p>

                    <button
                      type="button"
                      onClick={() => openDetailModal(item)}
                      className="mt-1.5 block text-left font-serif text-lg font-semibold leading-snug text-[#1A241C] hover:text-[#1E4D31]"
                    >
                      {item.name}
                    </button>

                    <p className="mt-1.5 line-clamp-2 text-sm leading-relaxed text-[#525F55]">
                      {item.description}
                    </p>
                  </div>

                  <div className="mt-5 flex items-end justify-between gap-3 border-t border-[rgba(26,36,28,0.08)] pt-4">
                    <div>
                      <div className="flex items-baseline gap-2">
                        <span className="font-mono text-base font-semibold text-[#1A241C] tabular-nums">
                          {formatRp(effectivePrice)}
                        </span>
                        {hasPromo && (
                          <span className="font-mono text-xs text-[#525F55] line-through tabular-nums">
                            {formatRp(item.price)}
                          </span>
                        )}
                      </div>

                      <p
                        className={`mt-0.5 text-xs font-medium tabular-nums ${
                          isOutOfStock
                            ? 'text-[#B91C1C]'
                            : isLowStock
                              ? 'text-[#B45309]'
                              : 'text-[#1E4D31]'
                        }`}
                      >
                        {isOutOfStock
                          ? 'Habis hari ini'
                          : isLowStock
                            ? `Stok menipis · Sisa ${item.stock}`
                            : `Tersedia · ${item.stock} porsi`}
                      </p>
                    </div>

                    {isOutOfStock ? (
                      <button
                        type="button"
                        disabled
                        className="min-h-10 cursor-not-allowed whitespace-nowrap rounded-lg bg-[#EDE9DF] px-4 py-2 text-xs font-medium text-[#525F55]"
                      >
                        Habis
                      </button>
                    ) : totalInCart > 0 && cartEntries.length === 1 && !item.flavours ? (
                      <div className="inline-flex items-center rounded-lg border border-[#1E4D31]/25 bg-[#F7F5EF] p-0.5">
                        <button
                          type="button"
                          onClick={() =>
                            onUpdateCartQty(cartEntries[0].cartKey, cartEntries[0].quantity - 1)
                          }
                          aria-label={`Kurangi ${item.name}`}
                          className="flex h-9 w-9 items-center justify-center rounded-md text-[#1E4D31] hover:bg-[#EDE9DF]"
                        >
                          <Minus className="h-3.5 w-3.5" />
                        </button>
                        <span className="min-w-7 text-center font-mono text-sm font-semibold text-[#1A241C] tabular-nums">
                          {totalInCart}
                        </span>
                        <button
                          type="button"
                          disabled={totalInCart >= item.stock}
                          onClick={() =>
                            onUpdateCartQty(cartEntries[0].cartKey, cartEntries[0].quantity + 1)
                          }
                          aria-label={`Tambah ${item.name}`}
                          className="flex h-9 w-9 items-center justify-center rounded-md text-[#1E4D31] hover:bg-[#EDE9DF] disabled:opacity-40"
                        >
                          <Plus className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleQuickAdd(item)}
                        className="inline-flex min-h-10 items-center gap-1.5 whitespace-nowrap rounded-lg bg-[#1E4D31] px-4 py-2 text-xs font-medium text-[#F7F5EF] transition-colors hover:bg-[#173C26]"
                      >
                        <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                        <span>{totalInCart > 0 ? `Tambah (${totalInCart})` : 'Tambah'}</span>
                      </button>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* Dish Detail & Customization Modal */}
      {selectedItem && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-[#1A241C]/50 p-0 backdrop-blur-[2px] sm:items-center sm:p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-dish-title"
          onClick={closeDetailModal}
        >
          <div
            className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-t-2xl border border-[rgba(26,36,28,0.12)] bg-[#F7F5EF] sm:rounded-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative aspect-[16/10] w-full bg-[#E9E6D3] p-5">
              <MenuImage
                src={selectedItem.image}
                alt={selectedItem.name}
                className="h-full w-full"
              />
              <button
                type="button"
                onClick={closeDetailModal}
                aria-label="Tutup detail menu"
                className="absolute top-3 right-3 flex h-10 w-10 items-center justify-center rounded-full border border-[rgba(26,36,28,0.15)] bg-white text-[#1A241C] hover:bg-[#EDE9DF]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-5 p-6">
              <div>
                <p className="text-xs font-medium text-[#525F55]">
                  {selectedItem.category}
                  {selectedItem.pdfNote ? ` · ${selectedItem.pdfNote}` : ''} · Stok{' '}
                  <span className="tabular-nums">{selectedItem.stock}</span> porsi
                </p>
                <div className="mt-1 flex items-start justify-between gap-4">
                  <h3
                    id="modal-dish-title"
                    className="font-serif text-2xl font-semibold text-[#1A241C]"
                  >
                    {selectedItem.name}
                  </h3>
                  <div className="shrink-0 text-right">
                    <span className="font-mono text-lg font-semibold text-[#1E4D31] tabular-nums">
                      {formatRp(
                        selectedItem.promoPrice && selectedItem.promoPrice < selectedItem.price
                          ? selectedItem.promoPrice
                          : selectedItem.price,
                      )}
                    </span>
                    {selectedItem.promoPrice && selectedItem.promoPrice < selectedItem.price && (
                      <p className="font-mono text-xs text-[#525F55] line-through tabular-nums">
                        {formatRp(selectedItem.price)}
                      </p>
                    )}
                  </div>
                </div>
                <p className="mt-2 text-sm leading-relaxed text-[#525F55]">
                  {selectedItem.description}
                </p>
              </div>

              {selectedItem.temperatures && selectedItem.temperatures.length > 0 && (
                <div>
                  <p className="mb-2 text-xs font-semibold text-[#1A241C]">Sajian Suhu</p>
                  <div className="flex flex-wrap gap-2">
                    {selectedItem.temperatures.map((temp) => (
                      <button
                        key={temp}
                        type="button"
                        onClick={() => setModalTemp(temp)}
                        className={`min-h-10 rounded-lg border px-4 py-2 text-xs font-medium transition-colors ${
                          modalTemp === temp
                            ? 'border-[#1E4D31] bg-[#1E4D31] text-[#F7F5EF]'
                            : 'border-[rgba(26,36,28,0.16)] bg-white text-[#1A241C] hover:bg-[#EDE9DF]'
                        }`}
                      >
                        {temp === 'Cold' ? 'Dingin (Es)' : 'Hangat / Panas'}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {selectedItem.flavours && selectedItem.flavours.length > 0 && (
                <div>
                  <p className="mb-2 text-xs font-semibold text-[#1A241C]">Pilihan Rasa Sirup</p>
                  <div className="flex flex-wrap gap-2">
                    {selectedItem.flavours.map((flavour) => (
                      <button
                        key={flavour}
                        type="button"
                        onClick={() => setModalFlavour(flavour)}
                        className={`min-h-10 rounded-lg border px-4 py-2 text-xs font-medium transition-colors ${
                          modalFlavour === flavour
                            ? 'border-[#1E4D31] bg-[#1E4D31] text-[#F7F5EF]'
                            : 'border-[rgba(26,36,28,0.16)] bg-white text-[#1A241C] hover:bg-[#EDE9DF]'
                        }`}
                      >
                        {flavour}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <label htmlFor="dish-notes" className="mb-1.5 block text-xs font-semibold text-[#1A241C]">
                  Catatan untuk Dapur / Barista (Opsional)
                </label>
                <input
                  id="dish-notes"
                  type="text"
                  value={modalNotes}
                  onChange={(e) => setModalNotes(e.target.value)}
                  placeholder="Contoh: cuko dipisah, gula dikurangi, tanpa seledri"
                  className="min-h-10 w-full rounded-lg border border-[rgba(26,36,28,0.16)] bg-white px-3 py-2 text-sm text-[#1A241C] placeholder:text-[#525F55]/70 focus:border-[#1E4D31] focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-between gap-4 border-t border-[rgba(26,36,28,0.1)] pt-4">
                <div className="inline-flex items-center rounded-lg border border-[rgba(26,36,28,0.16)] bg-white p-0.5">
                  <button
                    type="button"
                    onClick={() => setModalQty((q) => Math.max(1, q - 1))}
                    aria-label="Kurangi jumlah"
                    className="flex h-10 w-10 items-center justify-center rounded-md text-[#1A241C] hover:bg-[#EDE9DF]"
                  >
                    <Minus className="h-4 w-4" />
                  </button>
                  <span className="min-w-9 text-center font-mono text-sm font-semibold tabular-nums">
                    {modalQty}
                  </span>
                  <button
                    type="button"
                    disabled={modalQty >= selectedItem.stock}
                    onClick={() => setModalQty((q) => Math.min(selectedItem.stock, q + 1))}
                    aria-label="Tambah jumlah"
                    className="flex h-10 w-10 items-center justify-center rounded-md text-[#1A241C] hover:bg-[#EDE9DF] disabled:opacity-40"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>

                <button
                  type="button"
                  disabled={!selectedItem.available || selectedItem.stock <= 0}
                  onClick={handleConfirmModal}
                  className="flex min-h-11 flex-1 items-center justify-center gap-2 whitespace-nowrap rounded-lg bg-[#1E4D31] px-5 py-2.5 text-sm font-medium text-[#F7F5EF] transition-colors hover:bg-[#173C26] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <span>Tambah ke Keranjang</span>
                  <span className="font-mono tabular-nums">
                    ·{' '}
                    {formatRp(
                      (selectedItem.promoPrice && selectedItem.promoPrice < selectedItem.price
                        ? selectedItem.promoPrice
                        : selectedItem.price) * modalQty,
                    )}
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
