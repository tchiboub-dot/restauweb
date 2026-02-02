require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const morgan = require('morgan');
const path = require('path');

const menuRoutes = require('./routes/menu');
const ordersRoutes = require('./routes/orders');
const reservationsRoutes = require('./routes/reservations');
const reviewsRoutes = require('./routes/reviews');
const kpisRoutes = require('./routes/kpis');
const db = require('./db');

const app = express();

app.use(helmet({ contentSecurityPolicy: false }));
app.use(express.json());
app.use(morgan('tiny'));

// Rate limiters for write endpoints
const limiter = rateLimit({ windowMs: 60*1000, max: 6, message: {error:{message:'Too many requests', code:'RATE_LIMIT'}} });

// Routes
app.use('/api/menu', menuRoutes);
app.use('/api/orders', limiter, ordersRoutes);
app.use('/api/reservations', limiter, reservationsRoutes);
app.use('/api/reviews', limiter, reviewsRoutes);
app.use('/api/kpis', kpisRoutes);

// Health
app.get('/health', (req, res)=> res.json({status:'ok'}));

// Serve static frontend
app.use(express.static(path.join(__dirname, 'public')));
app.get('/', (req, res)=> res.sendFile(path.join(__dirname, 'public', 'index.html')));

// 404
app.use((req, res, next)=> res.status(404).json({error:{message:'Not found', code:'NOT_FOUND'}}));

// Central error handler
app.use((err, req, res, next)=>{
  console.error(err && err.stack ? err.stack : err);
  const status = err && err.status ? err.status : 500;
  res.status(status).json({error:{message: err && err.message ? err.message : 'Internal Server Error', code: status === 400 ? 'BAD_REQUEST' : 'SERVER_ERROR'}});
});

const PORT = process.env.PORT || 3000;

// Start server after DB is ready
db.ready.then(()=>{
  if(require.main === module){
    console.log('DB driver in use:', db.using || 'unknown');
    app.listen(PORT, ()=> console.log(`Server running on port ${PORT}`));
  }
}).catch(err => { console.error('DB init failed', err); process.exit(1); });

module.exports = app;