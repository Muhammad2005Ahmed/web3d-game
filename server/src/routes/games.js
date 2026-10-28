import { Router } from 'express';
import mongoose from 'mongoose';
import GameSession from '../models/GameSession.js';
import { requireAuth } from '../middleware/auth.js';
import { validateResult } from '../validate.js';

const router = Router();
router.use(requireAuth); // every game route is private

// Save a finished game (idempotent: same clientSessionId is stored only once)
router.post('/', async (req, res, next) => {
  try {
    const { errors, value } = validateResult(req.body);
    if (!value) return res.status(400).json({ error: 'Invalid game result', details: errors });
    try {
      const s = await GameSession.create({ ...value, user: req.userId });
      return res.status(201).json({ session: s, duplicate: false });
    } catch (e) {
      if (e.code === 11000) return res.status(200).json({ duplicate: true });
      throw e;
    }
  } catch (e) { next(e); }
});

// Game history of the logged-in user only
router.get('/', async (req, res, next) => {
  try {
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 20, 1), 100);
    const sessions = await GameSession.find({ user: req.userId })
      .sort({ createdAt: -1 }).limit(limit).select('-user -__v').lean();
    res.json({ sessions });
  } catch (e) { next(e); }
});

// Aggregated dashboard statistics
router.get('/stats', async (req, res, next) => {
  try {
    const [s] = await GameSession.aggregate([
      { $match: { user: new mongoose.Types.ObjectId(req.userId) } },
      { $group: {
          _id: null,
          totalGames: { $sum: 1 },
          bestScore: { $max: '$score' },
          totalScore: { $sum: '$score' },
          avgScore: { $avg: '$score' },
          highestLevel: { $max: '$levelReached' },
          totalRounds: { $sum: '$roundsCompleted' },
      } },
    ]);
    res.json({
      totalGames: s?.totalGames ?? 0,
      bestScore: s?.bestScore ?? 0,
      totalScore: s?.totalScore ?? 0,
      avgScore: Math.round(s?.avgScore ?? 0),
      highestLevel: s?.highestLevel ?? 0,
      totalRounds: s?.totalRounds ?? 0,
    });
  } catch (e) { next(e); }
});

export default router;
