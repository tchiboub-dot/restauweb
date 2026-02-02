# Maison Élégance — Backend

Simple Node.js + Express + SQLite backend for the single-file frontend.

Requirements:
- Node.js >= 16
- npm

Setup:

1. npm install
2. Create a `.env` file or export env vars. Minimal example:

```
PORT=3000
DB_FILE=./data.sqlite
ADMIN_TOKEN=optional_admin_token_here
```

3. Run in dev mode with:

```
npm run dev
```

Or start production:

```
npm start
```

Open the frontend: http://localhost:PORT (default 3000)

Notes:
- Helmet is used but contentSecurityPolicy is disabled to allow existing inline handlers in the static frontend.
- Rate limiting added to write endpoints (checkout, reservations, reviews).
- All data persisted in SQLite using prepared statements. Schema in `schema.sql`.
"# restauweb" 
# restauweb
