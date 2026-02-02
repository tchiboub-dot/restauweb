const dbm = require('../db');
(async ()=>{
  try{
    await dbm.ready;
    const before = dbm.prepare('SELECT COUNT(1) as c FROM reviews').get().c;
    dbm.prepare('DELETE FROM reviews').run();
    console.log(`Deleted ${before} reviews.`);
    process.exit(0);
  }catch(e){
    console.error('Error clearing reviews', e);
    process.exit(1);
  }
})();