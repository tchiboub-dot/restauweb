const express = require('express');
const { z } = require('zod');
const db = require('../db');
const router = express.Router();

const phoneRe = /^(?:\+212|0)\d{8,9}$/; // Moroccan simple formats

const schema = z.object({
  name: z.string().min(1),
  phone: z.string().min(8).regex(phoneRe, 'Invalid Moroccan phone format'),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'date must be YYYY-MM-DD'),
  time: z.string().regex(/^\d{2}:\d{2}$/, 'time must be HH:MM'),
  people: z.number().int().min(1).max(8),
  preference: z.string().optional().nullable(),
  note: z.string().optional().nullable()
});

router.post('/', (req, res, next)=>{
  try{
    const parsed = schema.parse(req.body);

    const today = new Date();
    const d = new Date(parsed.date + 'T00:00:00');
    d.setHours(0,0,0,0);
    today.setHours(0,0,0,0);
    if(d < today) return res.status(400).json({error:{message:'Date must be today or later', code:'PAST_DATE'}});

    const now = new Date().toISOString();
    const insert = db.prepare(`INSERT INTO reservations (name, phone, date, time, people, preference, note, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`);
    const info = insert.run(parsed.name, parsed.phone, parsed.date, parsed.time, parsed.people, parsed.preference || null, parsed.note || null, now);
    let reservationId = info && info.lastInsertRowid ? info.lastInsertRowid : (db.prepare('SELECT MAX(id) as id FROM reservations').get() || {}).id;
    res.json({reservationId, status: 'confirmed', message: 'Réservation confirmée'});
  }catch(err){
    if(err.name === 'ZodError') return res.status(400).json({error:{message: err.errors.map(e=>e.message).join(', '), code:'VALIDATION_ERROR'}});
    next(err);
  }
});

module.exports = router;