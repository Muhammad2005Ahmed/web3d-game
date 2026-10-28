import 'dotenv/config';
import dns from 'node:dns';
dns.setServers(['8.8.8.8', '1.1.1.1']);
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import mongoose from 'mongoose';
import authRoutes from './routes/auth.js';
import gameRoutes from './routes/games.js';

if (!process.env.MONGODB_URI) { console.error('MONGODB_URI is missing'); process.exit(1); }
if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  console.error('JWT_SECRET is missing or shorter than 32 characters'); process.exit(1);
}

const app = express();
app.set('trust proxy', 1); // needed behind Render/Heroku proxies for correct client IPs
app.use(helmet());

const origins = (process.env.CLIENT_ORIGIN || 'http://localhost:5173').split(',').map((s) => s.trim());
app.use(cors({
  origin: (origin, cb) => (!origin || origins.includes(origin) ? cb(null, true) : cb(new Error('CORS_BLOCKED'))),
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(express.json({ limit: '10kb' }));

const limiter = (max, msg) => rateLimit({
  windowMs: 15 * 60 * 1000, limit: max, standardHeaders: true, legacyHeaders: false,
  message: { error: msg },
});
app.use('/api', limiter(300, 'Too many requests. Please slow down.'));
const authMax = parseInt(process.env.AUTH_RATE_MAX, 10) || 10;
app.use('/api/auth/login', limiter(authMax, 'Too many login attempts. Try again in 15 minutes.'));
app.use('/api/auth/register', limiter(authMax, 'Too many sign-up attempts. Try again later.'));

app.get('/api/health', (_req, res) => res.json({ ok: true }));
app.use('/api/auth', authRoutes);
app.use('/api/games', gameRoutes);

app.use('/api', (_req, res) => res.status(404).json({ error: 'Not found' }));

// Central error handler - never leaks stack traces or internals
// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  if (err.message === 'CORS_BLOCKED') return res.status(403).json({ error: 'Origin not allowed' });
  if (err.type === 'entity.parse.failed') return res.status(400).json({ error: 'Malformed JSON' });
  if (err.type === 'entity.too.large') return res.status(413).json({ error: 'Request too large' });
  console.error('Unhandled error:', err.name, err.message);
  res.status(500).json({ error: 'Something went wrong on the server' });
});

const port = process.env.PORT || 5000;
mongoose.connect(process.env.MONGODB_URI)
  .then(() => app.listen(port, () => console.log(`API running on port ${port}`)))
  .catch((e) => { console.error('Database connection failed:', e.message); process.exit(1); });
