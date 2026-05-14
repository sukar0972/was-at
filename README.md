# Visit Tracker

A lightweight, self-hostable web application for tracking visits to specific locations via iOS Shortcuts automations. Admin-managed accounts, calendar heatmaps, streaks, and visit statistics.

## Features

- **Admin-only account creation** — No public registration. Server owner manages all users via an admin dashboard.
- **Location management** — Add, edit, and delete tracked locations with name, address, coordinates, and geofence radius.
- **iOS Shortcuts integration** — Log visits automatically via HTTPS POST when arriving at a geofenced location.
- **Calendar dashboard** — Year, month, and week views with visit density heatmaps.
- **Visit statistics** — Weekly counts, current streaks, most visited location, and weekly averages.
- **API tokens** — Per-user rotatable tokens for iOS Shortcuts automation.
- **Dark mode** — Respects system preference with manual toggle.
- **Mobile-first** — Responsive layout optimized for phones.
- **Profile** — Users can change display name and password. Cannot change username or admin status.
- **Failed-login lockout** — 5 failed attempts lock the account for 30 minutes.
- **30-minute deduplication** — Prevents duplicate visit logs when lingering at a geofence boundary.

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 19, Vite, Tailwind CSS v4, React Router, TanStack Query, Lucide React |
| Backend | Node.js, Express, PostgreSQL, bcryptjs, jsonwebtoken |
| Deployment | Docker Compose + Caddy (recommended) or native binary + systemd |

## Project Structure

```
visit-tracker/
├── src/                          # Frontend source
│   ├── api/client.js             # HTTP client layer (fetch + JWT)
│   ├── components/               # Reusable components (Layout, StatCard, ConfirmDialog, ApiTokens)
│   ├── context/AuthContext.jsx   # Authentication state management
│   ├── hooks/useTheme.js         # Dark mode toggle with localStorage persistence
│   ├── pages/                    # Route pages (Login, Dashboard, Admin, Profile)
│   ├── App.jsx                   # Root component with router and query client
│   └── main.jsx                  # Entry point
├── server/                       # Backend source
│   ├── index.js                  # Express entry point
│   ├── db.js                     # PostgreSQL pool connection
│   ├── auth.js                   # JWT sign/verify + requireAuth/requireAdmin middleware
│   ├── migrate.js                # Database migrations
│   ├── cli.js                    # CLI to create the first admin user
│   └── routes/                   # API route modules
│       ├── auth.js               # Login + /me
│       ├── admin.js              # User CRUD (admin only)
│       ├── locations.js          # Location CRUD (user-scoped)
│       ├── visits.js             # Visit logging + history (supports API tokens)
│       ├── stats.js              # Aggregated statistics
│       ├── tokens.js             # API token management
│       └── profile.js            # Profile + password change
├── docker-compose.yml            # Docker Compose stack (app + postgres + caddy)
├── Dockerfile                    # Multi-stage production build
├── Caddyfile                     # Automatic HTTPS with Let's Encrypt
├── visit-tracker.service         # systemd service template
├── .env.example                  # Required environment variables
└── package.json                  # Frontend dependencies + npm scripts
```

## Quick Start

### Development (Native)

Requires: Node.js 22+, PostgreSQL, npm

1. **Install frontend dependencies:**
   ```bash
   npm install
   ```

2. **Install backend dependencies:**
   ```bash
   cd server && npm install
   ```

3. **Configure environment:**
   ```bash
   cp .env.example .env
   # Edit .env:
   #   DATABASE_URL=postgres://user:pass@localhost:5432/visittracker
   #   JWT_SECRET=your-random-secret-at-least-32-characters-long
   ```

4. **Run migrations:**
   ```bash
   cd server && npm run migrate
   ```

5. **Create the first admin user:**
   ```bash
   cd server && npm run create-admin admin yourpassword "Admin User"
   ```

6. **Start the backend:**
   ```bash
   cd server && npm start
   # Runs on http://localhost:3000
   ```

7. **Start the frontend dev server (new terminal):**
   ```bash
   npm run dev
   # Runs on http://localhost:5173
   # API requests are proxied to localhost:3000
   ```

### Production (Docker Compose — Recommended)

Requires: Docker, Docker Compose, a domain pointing to your VPS

1. **Configure environment:**
   ```bash
   cp .env.example .env
   # Edit .env:
   #   JWT_SECRET=your-random-secret-at-least-32-characters-long
   #   DOMAIN=your-domain.com
   ```

2. **Set your domain in the Caddyfile:**
   ```bash
   # Edit Caddyfile, replace {$DOMAIN} with your actual domain
   export DOMAIN=your-domain.com
   ```

3. **Build and start:**
   ```bash
   docker compose up -d
   ```

4. **Run migrations:**
   ```bash
   docker compose exec app npm run migrate
   ```

5. **Create the first admin user:**
   ```bash
   docker compose exec app npm run create-admin admin yourpassword "Admin User"
   ```

6. **Open `https://your-domain.com` and log in.**

### Production (Native + systemd)

Requires: Node.js 22+, PostgreSQL, Caddy or nginx

1. **Build the frontend:**
   ```bash
   npm install && npm run build
   ```

2. **Install backend dependencies:**
   ```bash
   cd server && npm install --omit=dev
   ```

3. **Copy `.env.example` to `.env` and configure `DATABASE_URL` and `JWT_SECRET`.**

4. **Run migrations:**
   ```bash
   cd server && node migrate.js
   ```

5. **Create the first admin user:**
   ```bash
   cd server && node cli.js create-admin admin yourpassword "Admin User"
   ```

6. **Install the systemd service:**
   ```bash
   sudo cp visit-tracker.service /etc/systemd/system/
   sudo systemctl daemon-reload
   sudo systemctl enable --now visit-tracker
   ```

7. **Configure Caddy or nginx** to reverse-proxy `https://your-domain.com` to `localhost:3000`.

## iOS Shortcuts Setup

1. In the web app, go to **Profile → API Tokens** and create a token. **Copy it immediately** — it is shown only once.

2. Go to **Dashboard → Locations**, select a location, and note its ID.

3. On your iPhone:
   - Open **Shortcuts → Automation → Create Personal Automation → Arrival**
   - Select your location and set a radius
   - Add **Get Contents of URL** action:
     - **Method:** POST
     - **URL:** `https://your-domain.com/api/visits`
     - **Headers:**
       - `Authorization: Bearer <your-api-token>`
       - `Content-Type: application/json`
     - **Body (JSON):**
       ```json
       {
         "location_id": "your-location-uuid",
         "timestamp": "2025-01-01T10:00:00Z"
       }
       ```

4. Disable "Ask Before Running" if you want it to run automatically.

> **Critical:** iOS Shortcuts requires a valid HTTPS certificate. Self-signed certificates will not work. Use Let's Encrypt via Caddy or certbot.

## API Endpoints

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/api/auth/login` | POST | — | Login, receive JWT |
| `/api/auth/me` | GET | Bearer | Current user profile |
| `/api/locations` | GET | Bearer | List locations |
| `/api/locations` | POST | Bearer | Create location |
| `/api/locations/:id` | PUT | Bearer | Update location |
| `/api/locations/:id` | DELETE | Bearer | Delete location |
| `/api/visits` | GET | Bearer | Visit history |
| `/api/visits` | POST | Bearer / API Token | Log a visit |
| `/api/visits/stats` | GET | Bearer | Statistics |
| `/api/tokens` | GET | Bearer | List API tokens |
| `/api/tokens` | POST | Bearer | Create API token |
| `/api/tokens/:id` | DELETE | Bearer | Revoke token |
| `/api/profile` | GET | Bearer | Profile |
| `/api/profile` | PUT | Bearer | Update profile / password |
| `/api/admin/users` | GET | Admin | List all users |
| `/api/admin/users` | POST | Admin | Create user |
| `/api/admin/users/:id` | PUT | Admin | Update user |
| `/api/admin/users/:id` | DELETE | Admin | Delete user |
| `/api/health` | GET | — | Health check |

## NPM Scripts

```bash
# Development
npm run dev              # Start frontend dev server
npm run server:dev       # Start backend with hot reload
npm run server:start     # Start backend in production mode
npm run server:migrate   # Run database migrations
npm run server:admin     # Create admin user via CLI
npm run build            # Build frontend for production

# Docker
npm run docker:build     # Build Docker image
npm run docker:up        # Start Docker Compose stack
npm run docker:down      # Stop Docker Compose stack
```

## Security

| Feature | Implementation |
|---------|---------------|
| Password hashing | bcrypt, 12 rounds |
| Authentication | JWT, stateless, 7-day expiry |
| Failed-login lockout | 5 attempts → 30-minute lockout |
| Rate limiting | 10 visit POSTs per minute |
| Visit deduplication | 30-minute minimum interval per location |
| Data isolation | Strict user-level filtering on every query |
| API tokens | SHA-256 hashed before storage |
| Admin self-protection | Cannot delete own account, lockout warning on self-edit |

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `DATABASE_URL` | Yes | — | PostgreSQL connection string |
| `JWT_SECRET` | Yes | — | Random string, min 32 chars |
| `PORT` | No | 3000 | Backend port |
| `NODE_ENV` | No | development | `production` or `development` |

## License

MIT
