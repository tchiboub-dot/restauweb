const request = require('supertest');
const { expect } = require('chai');
const app = require('../server');
const db = require('../db');

describe('API', function(){
  before(async function(){
    this.timeout(5000);
    await db.ready;
    // Clean writable tables to ensure deterministic tests
    ['order_items','orders','reservations','reviews'].forEach(t=>{ try{ db.prepare(`DELETE FROM ${t}`).run(); }catch(e){} });
  });

  it('GET /health', async ()=>{
    const res = await request(app).get('/health');
    expect(res.status).to.equal(200);
    expect(res.body).to.have.property('status','ok');
  });

  it('GET /api/menu returns 9 items', async ()=>{
    const res = await request(app).get('/api/menu');
    expect(res.status).to.equal(200);
    expect(res.body).to.be.an('array').with.lengthOf(9);
    expect(res.body[0]).to.have.keys(['id','name','category','diet','price','rating','popular','desc','tags','allergen']);
  });

  it('POST /api/orders/checkout rejects empty items', async ()=>{
    const res = await request(app).post('/api/orders/checkout').send({ items:[] });
    expect(res.status).to.equal(400);
    expect(res.body).to.have.nested.property('error.code','NO_ITEMS');
  });

  it('POST /api/orders/checkout applies promo and shipping rules', async ()=>{
    // 3x Saumon Signature (95 * 3 = 285) -> promo 10% = 28.5, shipping 0
    const res = await request(app).post('/api/orders/checkout').send({ items:[{id:2, qty:3}], promoCode: 'ELEGANCE10' });
    expect(res.status).to.equal(200);
    expect(res.body).to.have.property('orderId');
    expect(res.body).to.have.nested.property('totals.subTotal', 285);
    expect(res.body).to.have.nested.property('totals.shipping', 0);
    expect(res.body).to.have.nested.property('totals.discount', 28.5);
    expect(res.body).to.have.nested.property('totals.grandTotal', 256.5);
  });

  it('POST /api/reservations rejects past dates', async ()=>{
    const payload = { name: 'Test', phone:'+212600000000', date: '2000-01-01', time:'19:00', people:2 };
    const res = await request(app).post('/api/reservations').send(payload);
    expect(res.status).to.equal(400);
    expect(res.body).to.have.nested.property('error.code','PAST_DATE');
  });

  it('Rate limit: more than 6 reservation requests should be limited', async ()=>{
    const payload = { name: 'T', phone:'+212600000001', date: new Date().toISOString().slice(0,10), time:'19:00', people:2 };
    let last;
    for(let i=0;i<7;i++){
      last = await request(app).post('/api/reservations').send(payload);
    }
    expect(last.status).to.equal(429);
    expect(last.body).to.have.nested.property('error.code','RATE_LIMIT');
  });

  it('Reviews: create then admin delete', async ()=>{
    const resPost = await request(app).post('/api/reviews').send({name:'AdminTest', rating:4, text:'ok'});
    expect(resPost.status).to.equal(201);
    // set admin token and delete
    process.env.ADMIN_TOKEN = 'admintok';
    const resDel = await request(app).delete('/api/reviews').set('x-admin-token','admintok');
    expect(resDel.status).to.equal(200);
    const resGet = await request(app).get('/api/reviews');
    expect(resGet.status).to.equal(200);
    expect(resGet.body).to.have.property('count').that.is.a('number');
  });

});