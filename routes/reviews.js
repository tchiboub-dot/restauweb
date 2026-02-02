const express = require('express');
const { z } = require('zod');
const db = require('../db');
const router = express.Router();

const reviewSchema = z.object({name: z.string().min(1), rating: z.number().int().min(1).max(5), text: z.string().min(1)});

router.get('/', (req, res, next)=>{
  try{
    const rows = db.prepare('SELECT id, name, rating, text, created_at FROM reviews ORDER BY created_at DESC').all();
    const count = rows.length;
    const avg = count ? Number((rows.reduce((s,r)=> s + r.rating, 0) / count).toFixed(1)) : 0;
    res.json({avg, count, reviews: rows});
  }catch(err){ next(err); }
});

router.post('/', (req, res, next)=>{
  try{
    const parsed = reviewSchema.parse(req.body);
    const now = new Date().toISOString();
    const insert = db.prepare('INSERT INTO reviews (name, rating, text, created_at) VALUES (?, ?, ?, ?)');
    const info = insert.run(parsed.name, parsed.rating, parsed.text, now);
    let created;
    if(info && info.lastInsertRowid){
      created = db.prepare('SELECT id, name, rating, text, created_at FROM reviews WHERE id = ?').get(info.lastInsertRowid);
    }else{
      created = db.prepare('SELECT id, name, rating, text, created_at FROM reviews ORDER BY id DESC LIMIT 1').get();
    }
    res.status(201).json(created);
  }catch(err){
    if(err.name === 'ZodError') return res.status(400).json({error:{message: err.errors.map(e=>e.message).join(', '), code:'VALIDATION_ERROR'}});
    next(err);
  }
});

router.delete('/', (req, res, next)=>{
  try{
    const admin = process.env.ADMIN_TOKEN;
    const token = req.header('x-admin-token');
    if(!admin) return res.status(403).json({error:{message:'Admin not configured', code:'NO_ADMIN'}});
    if(!token || token !== admin) return res.status(403).json({error:{message:'Forbidden', code:'FORBIDDEN'}});
    db.prepare('DELETE FROM reviews').run();
    res.json({ok:true});
  }catch(err){ next(err); }
});

module.exports = router;