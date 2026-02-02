const fs = require('fs');
const path = require('path');
const os = require('os');
const schemaSql = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');

// Use an OS tmp dir on serverless platforms (Vercel) to avoid read-only filesystem issues
const DB_FILE = process.env.DB_FILE || (process.env.VERCEL || process.env.VERCEL_ENV ? path.join(os.tmpdir(), 'data.sqlite') : path.join(__dirname, 'data.sqlite'));


let db = null;
let using = null; // 'better-sqlite3' or 'sql.js'
let driver = null;

let readyResolve, readyReject;
const ready = new Promise((res, rej)=>{ readyResolve = res; readyReject = rej; });

// Helper seed function (works with both drivers via prepared API)
function runMigrationsAndSeed(driver){
  try{
    driver.exec(schemaSql);

    const seedStmt = driver.prepare('SELECT COUNT(1) as c FROM menu_items');
    const row = seedStmt.get();
    if(!row || row.c === 0){
      const insert = driver.prepare(`INSERT INTO menu_items
        (id, name, category, diet, price, rating, popular, desc, tags_json, allergen, created_at, updated_at)
        VALUES (@id, @name, @category, @diet, @price, @rating, @popular, @desc, @tags_json, @allergen, @created_at, @updated_at)`);

      const now = new Date().toISOString();
      const items = [
        {id:1, name:"Burger Gourmet", category:"plat", diet:"halal", price:69, rating:4.8, popular:98, desc:"Pain brioché, steak premium, sauce maison.", tags:["Halal"], allergen:"Gluten"},
        {id:2, name:"Saumon Signature", category:"plat", diet:"sans-gluten", price:95, rating:4.7, popular:80, desc:"Saumon grillé, légumes croquants.", tags:["Sans gluten"], allergen:"Poisson"},
        {id:3, name:"Salade César Végé", category:"entree", diet:"vege", price:45, rating:4.6, popular:72, desc:"Croquante, légère, sauce délicate.", tags:["Végé"], allergen:"Lait"},
        {id:4, name:"Soupe du Chef", category:"entree", diet:"all", price:35, rating:4.5, popular:60, desc:"Recette chaude, parfaite pour commencer.", tags:["Chaud"], allergen:"—"},
        {id:5, name:"Tiramisu Maison", category:"dessert", diet:"all", price:40, rating:4.9, popular:110, desc:"Crème onctueuse, cacao intense.", tags:["Best"], allergen:"Lait"},
        {id:6, name:"Cheesecake Vanille", category:"dessert", diet:"all", price:42, rating:4.7, popular:90, desc:"Texture premium, base biscuit.", tags:["Dessert"], allergen:"Gluten"},
        {id:7, name:"Jus Detox", category:"boisson", diet:"all", price:28, rating:4.4, popular:55, desc:"Frais, énergisant, 100% naturel.", tags:["Fresh"], allergen:"—"},
        {id:8, name:"Mocktail Élégance", category:"boisson", diet:"all", price:34, rating:4.6, popular:75, desc:"Boisson signature, menthe & citron.", tags:["Signature"], allergen:"—"},
        {id:9, name:"Pâtes Alfredo Végé", category:"plat", diet:"vege", price:78, rating:4.6, popular:70, desc:"Sauce crémeuse, parmesan, champignons.", tags:["Végé"], allergen:"Gluten"}
      ];

      const toInsert = [];
      for(const r of items){
        const exist = driver.prepare('SELECT 1 as c FROM menu_items WHERE id = @id').get({id: r.id});
        if(!exist) toInsert.push(r);
      }

      if(toInsert.length > 0){
        const insertMany = driver.transaction((rows)=>{
          for(const r of rows){
            insert.run({
              id: r.id,
              name: r.name,
              category: r.category,
              diet: r.diet,
              price: r.price,
              rating: r.rating,
              popular: r.popular,
              desc: r.desc,
              tags_json: JSON.stringify(r.tags),
              allergen: r.allergen,
              created_at: now,
              updated_at: now
            });
          }
        });

        insertMany(toInsert);
      }
    }
    readyResolve();
  }catch(err){ readyReject(err); }
}

// Try to use better-sqlite3 first (optional dependency)
try{
  const Better = require('better-sqlite3');
  const instance = new Better(DB_FILE);
  // simple wrapper to align with our driver expectations
  driver = {
    exec: (s)=> instance.exec(s),
    prepare: (s)=> instance.prepare(s),
    transaction: (fn)=> instance.transaction(fn)
  };
  db = instance;
  using = 'better-sqlite3';
  runMigrationsAndSeed(driver);
}catch(e){
  // fallback to sql.js (pure JS/WASM)
  (async ()=>{
    try{
      const initSqlJs = require('sql.js');
      // robust locateFile: prefer require.resolve (works better in serverless bundles), fallback to node_modules path
      const locateFile = (file) => {
        try{ return require.resolve(`sql.js/dist/${file}`); }catch(e){ return path.join(__dirname, 'node_modules', 'sql.js', 'dist', file); }
      };

      const SQL = await initSqlJs({ locateFile });
      // ensure DB_FILE path is resolved (tmp dir on Vercel is used above)
      const resolvedDbFile = path.resolve(DB_FILE);
      let data = undefined;
      if(fs.existsSync(resolvedDbFile)){
        data = fs.readFileSync(resolvedDbFile);
      }
      const instance = data ? new SQL.Database(new Uint8Array(data)) : new SQL.Database();

      const persist = ()=>{
        try{
          const exportData = instance.export();
          fs.writeFileSync(resolvedDbFile, Buffer.from(exportData));
        }catch(e){
          // Don't crash serverless invocation if persist fails; log for debugging
          console.error('DB persist failed', e);
        }
      };

      function bindNamed(sql, params){
        // transform @name to ? in order of appearance and build values array
        if(params == null) return { sql, values: [] };
        // primitive single value -> treat as positional array
        if(!Array.isArray(params) && typeof params !== 'object') params = [params];
        if(Array.isArray(params)) return { sql, values: params };
        const values = [];
        const s = sql.replace(/@([a-zA-Z0-9_]+)/g, (m, p1)=>{ values.push(params[p1]); return '?'; });
        return { sql: s, values };
      }

      driver = {
        exec: (s)=> instance.run(s),
        prepare: (s)=>({
          all: (...params)=>{
            let p = params.length === 1 ? params[0] : params;
            const {sql: ns, values} = bindNamed(s, p);
            const stmt = instance.prepare(ns);
            stmt.bind(values);
            const rows = [];
            while(stmt.step()) rows.push(stmt.getAsObject());
            stmt.free();
            return rows;
          },
          get: (...params)=>{
            let p = params.length === 1 ? params[0] : params;
            const {sql: ns, values} = bindNamed(s, p);
            const stmt = instance.prepare(ns);
            stmt.bind(values);
            const has = stmt.step();
            const row = has ? stmt.getAsObject() : undefined;
            stmt.free();
            return row;
          },
          run: (...params)=>{
            let p = params.length === 1 ? params[0] : params;
            const {sql: ns, values} = bindNamed(s, p);
            const stmt = instance.prepare(ns);
            stmt.bind(values);
            stmt.step();
            stmt.free();
            persist();
            // emulate better-sqlite3 run() info
            try{
              const last = instance.prepare('SELECT last_insert_rowid() as id').get();
              if(last && last.id && last.id > 0) return { lastInsertRowid: last.id };
              // Fallback: try to detect table from INSERT and return MAX(id)
              const m = ns.match(/INSERT\s+INTO\s+([a-zA-Z0-9_]+)/i);
              if(m && m[1]){
                try{
                  const max = instance.prepare(`SELECT MAX(id) as id FROM ${m[1]}`).get();
                  return { lastInsertRowid: max ? max.id : undefined };
                }catch(e){}
              }
              return { lastInsertRowid: undefined };
            }catch(e){ return { lastInsertRowid: undefined }; }
          }
        }),
        transaction: (fn)=>{
          // sql.js fallback: run without explicit transaction to avoid nested commit issues
          return (...args)=>{
            const r = fn(...args);
            persist();
            return r;
          };
        }
      };

      db = instance;
      using = 'sql.js';
      runMigrationsAndSeed(driver);
    }catch(err){
      readyReject(err);
    }
  })();
}

module.exports = {
  get db(){ return db; },
  get using(){ return using; },
  ready,
  prepare: (...args)=>{
    if(!driver) throw new Error('DB driver not ready');
    return driver.prepare(...args);
  },
  exec: (...args)=>{ if(!driver) throw new Error('DB driver not ready'); return driver.exec(...args); },
  transaction: (fn)=>{ if(!driver) throw new Error('DB driver not ready'); return driver.transaction(fn); }
};