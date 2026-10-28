import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { validateRegister, validateLogin } from '../validate.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();
const ROUNDS = 12;
const DUMMY_HASH = bcrypt.hashSync('dummy-password-for-timing', ROUNDS);

const publicUser = (u) => ({ id: u._id, username: u.username, email: u.email, createdAt: u.createdAt });
const signToken = (u) =>
  jwt.sign({}, process.env.JWT_SECRET, { subject: String(u._id), expiresIn: '7d', algorithm: 'HS256' });

router.post('/register', async (req, res, next) => {
  try {
    const { errors, value } = validateRegister(req.body);
    if (!value) return res.status(400).json({ error: 'Validation failed', details: errors });

    const exists = await User.findOne({
      $or: [{ email: value.email }, { usernameLower: value.username.toLowerCase() }],
    }).lean();
    if (exists) return res.status(409).json({ error: 'Username or email is already registered' });

    const passwordHash = await bcrypt.hash(value.password, ROUNDS);
    let user;
    try {
      user = await User.create({
        username: value.username,
        usernameLower: value.username.toLowerCase(),
        email: value.email,
        passwordHash,
      });
    } catch (e) {
      if (e.code === 11000) return res.status(409).json({ error: 'Username or email is already registered' });
      throw e;
    }
    res.status(201).json({ token: signToken(user), user: publicUser(user) });
  } catch (e) { next(e); }
});

router.post('/login', async (req, res, next) => {
  try {
    const { errors, value } = validateLogin(req.body);
    if (!value) return res.status(400).json({ error: errors.form });

    const query = value.identifier.includes('@')
      ? { email: value.identifier }
      : { usernameLower: value.identifier };
    const user = await User.findOne(query).select('+passwordHash');

    // Compare even when the user doesn't exist so response time doesn't reveal valid accounts
    const ok = await bcrypt.compare(value.password, user ? user.passwordHash : DUMMY_HASH);
    if (!user || !ok) return res.status(401).json({ error: 'Invalid credentials' });

    res.json({ token: signToken(user), user: publicUser(user) });
  } catch (e) { next(e); }
});

router.get('/me', requireAuth, async (req, res, next) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) return res.status(401).json({ error: 'Account no longer exists' });
    res.json({ user: publicUser(user) });
  } catch (e) { next(e); }
});

export default router;
