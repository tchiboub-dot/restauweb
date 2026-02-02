const express = require('express');
const db = require('../db');
const router = express.Router();

router.get('/', (req, res, next)=>{
  try{
    const reviews = db.prepare('SELECT rating FROM reviews').all();
    const reviewsCount = reviews.length;
    const avgRating = reviewsCount ? Number((reviews.reduce((s,r)=> s + r.rating, 0) / reviewsCount).toFixed(1)) : 0;

    const thirtyAgo = new Date(Date.now() - (30 * 24 * 60 * 60 * 1000)).toISOString();
    const ordersCount30dRow = db.prepare('SELECT COUNT(1) as c FROM orders WHERE created_at >= ?').get(thirtyAgo);
    const ordersCount30d = ordersCount30dRow ? ordersCount30dRow.c : 0;

    res.json({avgRating, reviewsCount, ordersCount30d});
  }catch(err){ next(err); }
});

module.exports = router;