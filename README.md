# Maison Élégance — Backend

Requirements:

- Node.js >= 16 (recommended: Node LTS 18 or 20 for best compatibility with native modules)
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

- Helmet is used but `contentSecurityPolicy` is disabled to allow existing inline `onclick` handlers used by the static frontend.
- Rate limiting is applied to write endpoints (checkout, reservations, reviews).
- All data persisted in SQLite using prepared statements. Schema in `schema.sql`.

Windows / native build note:

If `npm install` fails while building `better-sqlite3` (native module), try one of the following fixes:

- Use Node LTS (recommended): install Node 18 or 20 and retry `npm install`.
- Install the Visual Studio Build Tools (Desktop development with C++ workload). See: https://github.com/nodejs/node-gyp#on-windows
- Use WSL2 on Windows and install build tools there.

If you'd rather avoid native builds, the project includes an optional fallback using a pure-JS SQLite driver (`sql.js`) — you do not need Visual Studio Build Tools to use it.

Useful npm scripts:

- npm run dev        # run in development (nodemon)
- npm run start      # start server
- npm run health     # health check against /health
- npm run init-db    # check DB readiness and counts
- npm run clear-reviews  # delete all reviews directly in DB (admin tool)

CI: A GitHub Actions workflow is included at `.github/workflows/ci.yml`. It runs on push and PR to `main` and executes `npm ci`, health check and `npm test` using Node 18.

Windows notes:

- If `better-sqlite3` fails to build, either:
  - Install Visual Studio Build Tools (Desktop development with C++ workload) and retry, or
  - Use Node LTS 18/20 which works well with this project, or
  - Use WSL2 and run `npm install` inside Linux.

# restauweb- Windows dev note: `better-sqlite3` may require Visual Studio Build Tools (Desktop C++ workload) to compile native modules; use Node LTS or install the build tools if you see install errors.
"# restauweb" 
# restauweb
