const db = require('../db');
(async ()=>{
  await db.ready;
  const rows = db.prepare('SELECT id,name FROM menu_items ORDER BY id').all();
  console.log('count', rows.length);
  console.log(rows);
})();