const express = require('express');
const { z } = require('zod');
const db = require('../db');
const router = express.Router();

const checkoutSchema = z.object({
  items: z.array(z.object({id: z.number().int().positive(), qty: z.number().int().positive()})),
  promoCode: z.string().optional(),
  customer: z.object({name: z.string().optional(), phone: z.string().optional()}).optional()
});

router.post('/checkout', async (req, res, next)=>{
  try{
    const parsed = checkoutSchema.parse(req.body);
    const items = parsed.items;
    if(items.length === 0) return res.status(400).json({error:{message:'No items', code:'NO_ITEMS'}});

    // Fetch prices from DB
    const placeholders = items.map((_,i)=>`?`).join(',');
    const ids = items.map(i=>i.id);
    const rows = db.prepare(`SELECT id, name, price FROM menu_items WHERE id IN (${placeholders})`).all(...ids);
    if(rows.length !== ids.length) return res.status(400).json({error:{message:'Invalid item id', code:'INVALID_ITEM'}});

    const priceMap = new Map(rows.map(r=>[r.id, r]));

    let subtotal = 0;
    for(const it of items){
      const r = priceMap.get(it.id);
      if(!r) return res.status(400).json({error:{message:'Invalid item id', code:'INVALID_ITEM'}});
      subtotal += r.price * it.qty;
    }

    subtotal = Number(subtotal.toFixed(2));
    let shipping = 0;
    if(subtotal > 0 && subtotal < 200) shipping = 15;

    let discount = 0;
    if(parsed.promoCode === 'ELEGANCE10'){
      discount = Number((subtotal * 0.10).toFixed(2));
    }

    const total = Number((subtotal - discount + shipping).toFixed(2));

    const now = new Date().toISOString();
    const insertOrder = db.prepare(`INSERT INTO orders (customer_name, customer_phone, subtotal, shipping, discount, promo_code, total, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`);
    const info = insertOrder.run(parsed.customer?.name || null, parsed.customer?.phone || null, subtotal, shipping, discount, parsed.promoCode || null, total, now);
    // Last insert id fallback for drivers without lastInsertRowid
    let orderId;
    if(info && info.lastInsertRowid) orderId = info.lastInsertRowid;
    else{
      const r = db.prepare('SELECT MAX(id) as id FROM orders').get();
      orderId = r ? r.id : undefined;
    }

    const insertItem = db.prepare(`INSERT INTO order_items (order_id, menu_item_id, name_snapshot, unit_price, qty, line_total) VALUES (?, ?, ?, ?, ?, ?)`);
    const insertMany = db.transaction((rows)=>{
      for(const r of rows){
        insertItem.run(r.order_id, r.menu_item_id, r.name_snapshot, r.unit_price, r.qty, r.line_total);
      }
    });

    const itemsToInsert = items.map(it=>{
      const r = priceMap.get(it.id);
      return {
        order_id: orderId,
        menu_item_id: it.id,
        name_snapshot: r.name,
        unit_price: r.price,
        qty: it.qty,
        line_total: Number((r.price * it.qty).toFixed(2))
      };
    });

    insertMany(itemsToInsert);

    res.json({orderId, totals: {subTotal: subtotal, shipping, discount, grandTotal: total}});
  }catch(err){
    if(err.name === 'ZodError') return res.status(400).json({error:{message: err.errors.map(e=>e.message).join(', '), code:'VALIDATION_ERROR'}});
    next(err);
  }
});

module.exports = router;