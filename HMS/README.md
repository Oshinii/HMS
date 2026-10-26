# Hospital Management System

React and Vite frontend with an Express API and MySQL persistence.

## Local setup

Requirements: Node.js 22 or later and a running MySQL server.

1. Install dependencies:

   ```powershell
   npm install
   ```

2. Copy `.env.example` to `.env`:

   ```powershell
   Copy-Item .env.example .env
   ```

   Set the local MySQL host, port, username, password, and database name. Replace `SESSION_SECRET` with a random secret of at least 32 characters. Set a unique `INITIAL_ADMIN_USERNAME` and a strong `INITIAL_ADMIN_PASSWORD` of at least 12 characters.

3. Create the database and tables, then create the initial administrator:

   ```powershell
   npm run db:setup
   npm run admin:create
   ```

   The initial administrator command refuses to overwrite an existing username. Do not commit `.env`.

4. Start the API and Vite in separate terminals:

   ```powershell
   npm run dev:server
   ```

   ```powershell
   npm run dev
   ```

   Open the Vite URL shown in the terminal (normally `http://localhost:5173`). Sign in with the administrator username and password configured in `.env`.

For a production-style run, build the frontend with `npm run build`, set `NODE_ENV=production` and `APP_ORIGIN` to the site origin in `.env`, then run `npm start`. The Express server serves `dist` and the API from the same origin.

## Persistence and security

The API stores the website's JSON module state in MySQL, scoped to the signed-in account. On the first sign-in, existing browser-local data is copied into MySQL only for state keys that are not already present; MySQL is authoritative after that. Data changes are saved to the backend while signed in, and load across browsers using the same account. Browser-only UI preferences remain local to that browser.

Passwords are stored as bcrypt hashes. Sessions use opaque, `HttpOnly`, same-site cookies whose hashes are stored in MySQL, and expire after eight hours. Login attempts are rate-limited. Use HTTPS in production.

The initial administrator credentials are only read during `npm run admin:create`; they are not application defaults. Change the administrator password from the account menu after signing in.

Run checks with:

```powershell
npm run lint
npm run build
```
