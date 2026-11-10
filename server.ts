import express from 'express';
import fs from 'node:fs';
import path from 'node:path';
import type { Request, Response } from 'express';
import { createSeedDatabase } from './src/data/seedData.ts';
import type {
  MenuItem,
  OrderRecord,
  OrderStatus,
  PromoCampaign,
  PushNotificationEntry,
  StoreDatabase,
  StoreSettings,
} from './src/types.ts';

const PORT = Number(process.env.PORT) || 3000;
const DATA_DIR = path.join(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'kupikudai-db.json');

function loadDatabase(): StoreDatabase {
  try {
    if (fs.existsSync(DB_FILE)) {
      const raw = fs.readFileSync(DB_FILE, 'utf-8');
      const parsed = JSON.parse(raw) as StoreDatabase;
      if (parsed && Array.isArray(parsed.menu) && Array.isArray(parsed.monthlyAnalytics)) {
        return parsed;
      }
    }
  } catch (err) {
    console.error('Failed to load kupikudai-db.json, recreating seed:', err);
  }
  const seed = createSeedDatabase();
  saveDatabase(seed);
  return seed;
}

function saveDatabase(data: StoreDatabase): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
}

const db: StoreDatabase = loadDatabase();

const sseClients = new Set<Response>();

function broadcastEvent(event: string, payload: unknown): void {
  const serialized = `event: ${event}\ndata: ${JSON.stringify(payload)}\n\n`;
  for (const client of sseClients) {
    try {
      client.write(serialized);
    } catch {
      sseClients.delete(client);
    }
  }
}

async function startServer(): Promise<void> {
  const app = express();
  app.use(express.json({ limit: '2mb' }));

  // SSE Live Updates & Push Notifications Channel
  app.get('/api/events', (req: Request, res: Response) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders?.();

    res.write(`event: connected\ndata: ${JSON.stringify({ ts: new Date().toISOString() })}\n\n`);
    sseClients.add(res);

    const heartbeat = setInterval(() => {
      try {
        res.write(': keepalive\n\n');
      } catch {
        clearInterval(heartbeat);
        sseClients.delete(res);
      }
    }, 25000);

    req.on('close', () => {
      clearInterval(heartbeat);
      sseClients.delete(res);
    });
  });

  // Bootstrap initial store payload
  app.get('/api/bootstrap', (_req: Request, res: Response) => {
    res.json({
      menu: db.menu,
      promos: db.promos,
      notifications: db.notifications,
      orders: db.orders,
      monthlyAnalytics: db.monthlyAnalytics,
      settings: db.settings,
    });
  });

  // Real-Time Menu Price / Stock / Availability Update
  app.patch('/api/menu/:id', (req: Request, res: Response) => {
    const id = req.params.id;
    const item = db.menu.find((m) => m.id === id);
    if (!item) {
      res.status(404).json({ error: 'Menu tidak ditemukan' });
      return;
    }

    const body = req.body as Partial<MenuItem>;
    if (typeof body.name === 'string' && body.name.trim()) {
      item.name = body.name.trim();
    }
    if (typeof body.description === 'string') {
      item.description = body.description.trim();
    }
    if (typeof body.price === 'number' && Number.isFinite(body.price) && body.price >= 0) {
      item.price = Math.round(body.price);
    }
    if (body.promoPrice === null) {
      item.promoPrice = null;
    } else if (
      typeof body.promoPrice === 'number' &&
      Number.isFinite(body.promoPrice) &&
      body.promoPrice >= 0
    ) {
      item.promoPrice = body.promoPrice > 0 ? Math.round(body.promoPrice) : null;
    }
    if (typeof body.stock === 'number' && Number.isFinite(body.stock)) {
      item.stock = Math.max(0, Math.round(body.stock));
      if (item.stock === 0) {
        item.available = false;
      } else if (body.available === undefined && !item.available && item.stock > 0) {
        item.available = true;
      }
    }
    if (typeof body.available === 'boolean') {
      item.available = body.available;
    }
    if (typeof body.isRecommended === 'boolean') {
      item.isRecommended = body.isRecommended;
    }

    saveDatabase(db);
    broadcastEvent('menu_updated', item);
    res.json(item);
  });

  // Add New Menu Item
  app.post('/api/menu', (req: Request, res: Response) => {
    const body = req.body as Partial<MenuItem>;
    if (!body.name || !body.category || typeof body.price !== 'number') {
      res.status(400).json({ error: 'Nama, kategori, dan harga menu wajib diisi.' });
      return;
    }

    const slug = body.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
    const newItem: MenuItem = {
      id: `${slug || 'menu'}-${Date.now().toString(36)}`,
      name: body.name.trim(),
      category: body.category,
      description: (body.description ?? 'Menu spesial olahan segar dari dapur Kupikudai.').trim(),
      price: Math.max(1000, Math.round(body.price)),
      promoPrice:
        typeof body.promoPrice === 'number' && body.promoPrice > 0
          ? Math.round(body.promoPrice)
          : null,
      stock: typeof body.stock === 'number' ? Math.max(0, Math.round(body.stock)) : 20,
      available: body.available ?? true,
      isRecommended: body.isRecommended ?? false,
      image: body.image || '/images/menu/kupi-susu-kudai.jpg',
      temperatures: body.temperatures,
      flavours: body.flavours,
    };

    db.menu.unshift(newItem);
    saveDatabase(db);
    broadcastEvent('menu_created', newItem);
    res.status(201).json(newItem);
  });

  // Create Customer Order (Deducts stock, logs order, increments current month analytics)
  app.post('/api/orders', (req: Request, res: Response) => {
    const body = req.body as Omit<OrderRecord, 'id' | 'createdAt' | 'monthKey' | 'orderStatus'>;
    if (!body.customerName || !Array.isArray(body.items) || body.items.length === 0) {
      res.status(400).json({ error: 'Data pemesan dan daftar menu tidak boleh kosong.' });
      return;
    }

    // Validate stock availability
    for (const line of body.items) {
      const menuEntry = db.menu.find((m) => m.id === line.menuId);
      if (!menuEntry) {
        res.status(400).json({ error: `Menu ${line.name} tidak ditemukan.` });
        return;
      }
      if (!menuEntry.available || menuEntry.stock < line.quantity) {
        res.status(409).json({
          error: `Stok ${menuEntry.name} tersisa ${menuEntry.stock} porsi.`,
        });
        return;
      }
    }

    const now = new Date();
    const orderId = `KK-2611-${Math.floor(1000 + Math.random() * 9000)}`;
    const monthKey = '2026-11';

    const newOrder: OrderRecord = {
      id: orderId,
      createdAt: now.toISOString(),
      monthKey,
      customerName: body.customerName.trim(),
      customerPhone: (body.customerPhone ?? '').trim(),
      serviceType: body.serviceType || 'dine-in',
      tableNumber: body.tableNumber || 'Meja 01',
      items: body.items,
      subtotal: body.subtotal,
      discountAmount: body.discountAmount || 0,
      promoCode: body.promoCode,
      total: body.total,
      paymentMethod: body.paymentMethod || 'qris',
      paymentStatus: body.paymentStatus || (body.paymentMethod === 'cashier' ? 'pending' : 'paid'),
      paymentReference: body.paymentReference || `PAY-${Date.now().toString(36).toUpperCase()}`,
      orderStatus: 'Menunggu',
      notes: body.notes,
    };

    // Deduct stock & notify
    const updatedMenuItems: MenuItem[] = [];
    let currentBucket = db.monthlyAnalytics.find((b) => b.monthKey === monthKey);
    if (!currentBucket) {
      currentBucket = {
        monthKey,
        label: 'November 2026 (Berjalan)',
        items: [],
      };
      db.monthlyAnalytics.push(currentBucket);
    }

    for (const line of newOrder.items) {
      const menuEntry = db.menu.find((m) => m.id === line.menuId);
      if (menuEntry) {
        menuEntry.stock = Math.max(0, menuEntry.stock - line.quantity);
        if (menuEntry.stock === 0) {
          menuEntry.available = false;
        }
        updatedMenuItems.push(menuEntry);

        let saleRow = currentBucket.items.find((s) => s.menuId === line.menuId);
        if (!saleRow) {
          saleRow = {
            menuId: line.menuId,
            name: line.name,
            category: line.category,
            unitsSold: 0,
            revenue: 0,
          };
          currentBucket.items.push(saleRow);
        }
        saleRow.unitsSold += line.quantity;
        saleRow.revenue += line.quantity * line.unitPrice;
      }
    }

    db.orders.unshift(newOrder);
    saveDatabase(db);

    for (const updated of updatedMenuItems) {
      broadcastEvent('menu_updated', updated);
    }
    broadcastEvent('order_created', newOrder);
    broadcastEvent('analytics_updated', db.monthlyAnalytics);

    res.status(201).json(newOrder);
  });

  // Update Order Status
  app.patch('/api/orders/:id', (req: Request, res: Response) => {
    const order = db.orders.find((o) => o.id === req.params.id);
    if (!order) {
      res.status(404).json({ error: 'Pesanan tidak ditemukan' });
      return;
    }
    const { orderStatus, paymentStatus } = req.body as {
      orderStatus?: OrderStatus;
      paymentStatus?: 'pending' | 'paid';
    };
    if (orderStatus) order.orderStatus = orderStatus;
    if (paymentStatus) order.paymentStatus = paymentStatus;
    saveDatabase(db);
    broadcastEvent('order_updated', order);
    res.json(order);
  });

  // Create Promo Campaign
  app.post('/api/promos', (req: Request, res: Response) => {
    const body = req.body as Partial<PromoCampaign>;
    if (!body.code || !body.title || typeof body.discountValue !== 'number') {
      res.status(400).json({ error: 'Kode, judul promo, dan nilai diskon wajib diisi.' });
      return;
    }

    const promo: PromoCampaign = {
      id: `promo-${Date.now().toString(36)}`,
      code: body.code.trim().toUpperCase(),
      title: body.title.trim(),
      message: (body.message ?? body.title).trim(),
      discountType: body.discountType || 'percent',
      discountValue: Math.max(1, Math.round(body.discountValue)),
      minOrder: typeof body.minOrder === 'number' ? Math.max(0, Math.round(body.minOrder)) : 0,
      targetCategory: body.targetCategory || 'Semua Menu',
      active: body.active ?? true,
      pushCount: 0,
    };

    db.promos.unshift(promo);
    saveDatabase(db);
    broadcastEvent('promo_updated', db.promos);
    res.status(201).json(promo);
  });

  // Toggle Promo Active State
  app.patch('/api/promos/:id', (req: Request, res: Response) => {
    const promo = db.promos.find((p) => p.id === req.params.id);
    if (!promo) {
      res.status(404).json({ error: 'Promo tidak ditemukan' });
      return;
    }
    const body = req.body as Partial<PromoCampaign>;
    if (typeof body.active === 'boolean') promo.active = body.active;
    if (typeof body.title === 'string') promo.title = body.title.trim();
    if (typeof body.message === 'string') promo.message = body.message.trim();
    if (typeof body.discountValue === 'number') promo.discountValue = body.discountValue;

    saveDatabase(db);
    broadcastEvent('promo_updated', db.promos);
    res.json(promo);
  });

  // Trigger Live Push Notification for Promo
  app.post('/api/promos/:id/push', (req: Request, res: Response) => {
    const promo = db.promos.find((p) => p.id === req.params.id);
    if (!promo) {
      res.status(404).json({ error: 'Promo tidak ditemukan' });
      return;
    }
    promo.active = true;
    promo.pushCount += 1;
    promo.lastPushedAt = new Date().toISOString();

    const discountText =
      promo.discountType === 'percent'
        ? `Diskon ${promo.discountValue}%`
        : `Potongan Rp ${promo.discountValue.toLocaleString('id-ID')}`;
    const minText =
      promo.minOrder > 0 ? `Min. Rp ${promo.minOrder.toLocaleString('id-ID')}` : 'Tanpa minimum order';

    const notification: PushNotificationEntry = {
      id: `notif-${Date.now().toString(36)}`,
      promoId: promo.id,
      code: promo.code,
      title: promo.title,
      message: promo.message,
      targetCategory: promo.targetCategory,
      discountSummary: `${discountText} · ${minText}`,
      sentAt: promo.lastPushedAt,
    };

    db.notifications.unshift(notification);
    if (db.notifications.length > 20) {
      db.notifications = db.notifications.slice(0, 20);
    }

    saveDatabase(db);
    broadcastEvent('promo_updated', db.promos);
    broadcastEvent('promo_push', notification);
    res.json({ notification, promo });
  });

  // Update Store Settings (WhatsApp number, opening hours, QRIS info)
  app.patch('/api/settings', (req: Request, res: Response) => {
    const body = req.body as Partial<StoreSettings>;
    if (typeof body.whatsappNumber === 'string' && body.whatsappNumber.trim()) {
      db.settings.whatsappNumber = body.whatsappNumber.trim();
    }
    if (typeof body.openingHours === 'string') {
      db.settings.openingHours = body.openingHours.trim();
    }
    if (typeof body.qrisMerchantName === 'string') {
      db.settings.qrisMerchantName = body.qrisMerchantName.trim();
    }
    if (typeof body.address === 'string') {
      db.settings.address = body.address.trim();
    }
    saveDatabase(db);
    broadcastEvent('settings_updated', db.settings);
    res.json(db.settings);
  });

  // Frontend Vite / Production Static Handler
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.join(process.cwd(), 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Kupikudai Digital Menu Server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Fatal server startup error:', err);
  process.exit(1);
});
