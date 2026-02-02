const dbm = require('../db');
(async ()=>{
  try{
    await dbm.ready;
    console.log('DB ready. Driver:', dbm.using);
    console.log('Menu count:', dbm.prepare('SELECT COUNT(1) as c FROM menu_items').get().c);
    console.log('Reviews count:', dbm.prepare('SELECT COUNT(1) as c FROM reviews').get().c);
    console.log('Orders count:', dbm.prepare('SELECT COUNT(1) as c FROM orders').get().c);
    process.exit(0);
  }catch(e){
    console.error('DB init failed', e);
    process.exit(1);
  }
})();