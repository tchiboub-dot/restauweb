const express = require('express');
const { z } = require('zod');
const db = require('../db');
const router = express.Router();

// GET /api/menu?search=&category=&diet=&sort=
router.get('/', (req, res, next)=>{
  try{
    const q = req.query || {};
    const search = (q.search || '').trim();
    const category = q.category || 'all';
    const diet = q.diet || 'all';
    const sort = q.sort || 'popular';

    let whereClauses = [];
    let params = {};

    if(search){
      whereClauses.push("(LOWER(name) LIKE LOWER(@search) OR LOWER(desc) LIKE LOWER(@search))");
      params.search = `%${search}%`;
    }
    if(category && category !== 'all'){
      whereClauses.push('category = @category');
      params.category = category;
    }
    if(diet && diet !== 'all'){
      whereClauses.push('diet = @diet');
      params.diet = diet;
    }

    let sql = 'SELECT * FROM menu_items';
    if(whereClauses.length) sql += ' WHERE ' + whereClauses.join(' AND ');

    if(sort === 'popular') sql += ' ORDER BY popular DESC';
    else if(sort === 'priceAsc') sql += ' ORDER BY price ASC';
    else if(sort === 'priceDesc') sql += ' ORDER BY price DESC';
    else if(sort === 'rating') sql += ' ORDER BY rating DESC';
    else sql += ' ORDER BY popular DESC';

    const stmt = db.prepare(sql);
    const rows = stmt.all(params);

    const out = rows.map(r => ({
      id: r.id,
      name: r.name,
      category: r.category,
      diet: r.diet,
      price: r.price,
      rating: r.rating,
      popular: r.popular,
      desc: r.desc,
      tags: JSON.parse(r.tags_json),
      allergen: r.allergen
    }));

    res.json(out);
  }catch(err){
    next(err);
  }
});

module.exports = router;