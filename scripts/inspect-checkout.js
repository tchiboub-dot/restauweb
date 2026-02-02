const request = require('supertest');
const app = require('../server');
const db = require('../db');
(async ()=>{
  await db.ready;
  const res = await request(app).post('/api/orders/checkout').send({items:[{id:1,qty:1}]});
  console.log(res.status, res.body);
})();