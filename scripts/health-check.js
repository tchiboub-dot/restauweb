const http = require('http');
const PORT = process.env.PORT || 3000;

const opts = { hostname: 'localhost', port: PORT, path: '/health', method: 'GET' };
const req = http.request(opts, res=>{
  let data = '';
  res.on('data', c=> data += c.toString());
  res.on('end', ()=>{
    console.log('Status:', res.statusCode, data);
    process.exit(res.statusCode === 200 ? 0 : 2);
  });
});
req.on('error', e=>{ console.error('Error:', e.message); process.exit(2); });
req.end();