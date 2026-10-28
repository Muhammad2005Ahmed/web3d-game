import mongoose from 'mongoose';

const gameSessionSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    clientSessionId: { type: String, required: true },
    score: { type: Number, required: true, min: 0 },
    roundsCompleted: { type: Number, required: true, min: 0, max: 9 },
    levelReached: { type: Number, required: true, min: 1, max: 3 },
    hits: { type: Number, required: true, min: 0 },
    bombHits: { type: Number, required: true, min: 0 },
    durationSec: { type: Number, required: true, min: 0 },
  },
  { timestamps: true }
);

// One result per game session per user -> prevents duplicate submissions
gameSessionSchema.index({ user: 1, clientSessionId: 1 }, { unique: true });
gameSessionSchema.index({ user: 1, createdAt: -1 });

export default mongoose.model('GameSession', gameSessionSchema);
