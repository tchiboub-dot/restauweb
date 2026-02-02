(async ()=>{
  const dbm = require('../db');
  await dbm.ready;
  try{
    const items = [{id:1, qty:1}];
    const placeholders = items.map((_,i)=>'?').join(',');
    const ids = items.map(i=>i.id);
    console.log('ids', ids);
    const rows = dbm.prepare(`SELECT id, name, price FROM menu_items WHERE id IN (${placeholders})`).all(...ids);
    console.log('rows', rows);

    const priceMap = new Map(rows.map(r=>[r.id, r]));
    let subtotal = 0;
    for(const it of items){
      const r = priceMap.get(it.id);
      if(!r) { console.log('invalid item', it.id); }
      subtotal += r.price * it.qty;
    }

    console.log('subtotal', subtotal);
    const now = new Date().toISOString();
    const insertOrder = dbm.prepare(`INSERT INTO orders (customer_name, customer_phone, subtotal, shipping, discount, promo_code, total, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`);
    const info = insertOrder.run(null, null, subtotal, 0, 0, null, subtotal, now);
    console.log('info', info);
    const r = dbm.prepare('SELECT MAX(id) as id FROM orders').get();
    const orderId = r.id;
    console.log('orderId', orderId);

    const insertItem = dbm.prepare(`INSERT INTO order_items (order_id, menu_item_id, name_snapshot, unit_price, qty, line_total) VALUES (?, ?, ?, ?, ?, ?)`);
    const insertMany = dbm.transaction((rows)=>{
      for(const row of rows){
        insertItem.run(row.order_id, row.menu_item_id, row.name_snapshot, row.unit_price, row.qty, row.line_total);
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

    try{
      insertMany(itemsToInsert);
      console.log('insertMany ok');
    }catch(e){ console.error('insertMany err', e); }

    console.log('done');

  }catch(e){ console.error('err', e.stack || e); }
})();