# Orb Rush - Web 3D Game Application

Three.js target-collection game with user accounts, dashboard and saved game history.

| Layer | Technology |
|---|---|
| Frontend | React 18 + Vite, React Router, **Three.js** |
| Backend | Node.js + Express (REST API) |
| Database | MongoDB (Atlas) + Mongoose |
| Auth | bcrypt password hashes + JWT (7 days) in `Authorization: Bearer` header |
| Security | helmet, CORS allow-list, rate limiting, server-side validation |
| Hosting | MongoDB Atlas + Render (API) + Vercel (frontend) |

## Folder structure
```
web3d-game/
├── client/                 React + Three.js
│   └── src/
│       ├── api.js                    fetch wrapper (adds token, handles errors)
│       ├── context/AuthContext.jsx   login / register / logout / session restore
│       ├── components/               Layouts, ProtectedRoute, Field, StatCard, Status
│       ├── pages/                    Landing, Login, Signup, Dashboard, History, Game
│       ├── game/GameScene.js         Three.js scene + raycasting (no React inside)
│       ├── game/gameLogic.js         pure reducer: states, scoring, rounds, timer
│       └── utils/validators.js       client-side form validation
└── server/
    ├── src/index.js                  app setup, security middleware, error handler
    ├── src/routes/{auth,games}.js    API endpoints
    ├── src/models/                   User, GameSession (Mongoose)
    ├── src/validate.js, gameRules.js input + game-result validation
    └── tests/                        unit + API integration tests
```

## Run locally
**1. Database** - create a free cluster on https://cloud.mongodb.com, a DB user, allow your IP (Network Access), copy the connection string.

**2. Backend**
```bash
cd server
npm install
cp .env.example .env      # fill MONGODB_URI and JWT_SECRET
npm run dev               # http://localhost:5000/api/health -> {"ok":true}
```
**3. Frontend** (new terminal)
```bash
cd client
npm install
cp .env.example .env      # VITE_API_URL=http://localhost:5000/api
npm run dev               # http://localhost:5173
```
**4. Try the full flow:** Sign Up -> Dashboard (empty state) -> Play Game -> finish or lose -> "Result saved" -> Dashboard/History show real data.

## API
| Method | Endpoint | Auth | Purpose |
|---|---|---|---|
| GET | `/api/health` | - | health check |
| POST | `/api/auth/register` | - | `{username,email,password}` -> `{token,user}` |
| POST | `/api/auth/login` | - | `{identifier,password}` -> `{token,user}` |
| GET | `/api/auth/me` | ✔ | current user |
| POST | `/api/games` | ✔ | save a finished game (idempotent via `clientSessionId`) |
| GET | `/api/games?limit=20` | ✔ | own game history |
| GET | `/api/games/stats` | ✔ | totals, best, average, highest level |

## Database
- **users**: `username`, `usernameLower` (unique), `email` (unique), `passwordHash` (never returned), timestamps
- **gamesessions**: `user` (ref, indexed), `clientSessionId`, `score`, `roundsCompleted`, `levelReached`, `hits`, `bombHits`, `durationSec`, timestamps. Unique index `(user, clientSessionId)` blocks duplicates.

## Game rules
9 rounds = 3 levels × 3 rounds. Each round: collect all cyan crystals (+10) before the timer ends, avoid red bombs (−5). Finishing early gives +2 points per second left. Later rounds have more orbs and bombs, less time and faster movement. Timer expiry = game over.
States: `ready → playing ⇄ paused → roundComplete → playing … → gameOver → results`. Invalid transitions are ignored by the reducer.

## Security implemented
- Passwords: bcrypt (cost 12); hash excluded from queries by default (`select:false`)
- JWT secret from env (server refuses to start without a 32+ char secret); tokens expire in 7 days
- Server-side validation of every input; non-string values rejected (NoSQL-injection guard)
- Game results cross-checked against game rules (max score, hits vs rounds, level) + duplicate protection
- Rate limits: 10 login/register attempts per IP per 15 min, 300 API requests per 15 min
- helmet headers, CORS allow-list (`CLIENT_ORIGIN`), 10 kB body limit, generic error messages
- React escapes output (XSS); Mongoose queries are object-based (no string-built queries)
- **Known limitations:** token is in `localStorage` (an XSS bug could steal it; httpOnly cookies are safer but need same-site hosting); logout only deletes the token client-side; scores are plausibility-checked, not fully cheat-proof (would need server-side simulation).

## Testing
```bash
cd server && npm test            # validation + rules unit tests (no DB needed)
cd client && npm test            # reducer + validators unit tests
cd server && npm run dev         # then in another terminal:
cd server && npm run test:api    # integration tests against the running API (needs MongoDB)
```
Manual checklist: landing links · signup errors · duplicate signup · wrong login · logout · direct visit to `/dashboard` while logged out redirects to login · game start/pause/restart · bombs · timer expiry · round progression · scorecard · result saved once · history · mobile layout (DevTools) · resize window then click targets.

## Deployment
**A. Database** - Atlas: Network Access -> allow `0.0.0.0/0` (Render IPs change), use a dedicated DB user.

**B. Backend on Render** (https://render.com)
1. Push the repo to GitHub. New → Web Service → select repo.
2. Root Directory `server` · Build `npm install` · Start `npm start`.
3. Environment: `MONGODB_URI`, `JWT_SECRET`, `CLIENT_ORIGIN` (add after step C), `AUTH_RATE_MAX=10`.
4. Deploy, open `https://<name>.onrender.com/api/health`. (Free plan sleeps after inactivity: first request takes ~30 s.)

**C. Frontend on Vercel** (https://vercel.com)
1. New Project → same repo. Root Directory `client`, framework Vite (build `npm run build`, output `dist`).
2. Environment variable `VITE_API_URL=https://<name>.onrender.com/api` (then redeploy; Vite bakes it in at build time).
3. `vercel.json` already makes deep links like `/dashboard` work.

**D. Connect them** - go back to Render → set `CLIENT_ORIGIN=https://<your-app>.vercel.app` (no trailing slash; comma-separate multiple) → redeploy. Test signup on the live site.

Troubleshooting: CORS error → `CLIENT_ORIGIN` wrong · "Cannot reach the server" → wrong `VITE_API_URL` or Render asleep · Mongo connection error → Atlas IP allow-list or password with special characters (URL-encode it) · 404 on refresh → missing SPA rewrite.
