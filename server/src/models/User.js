import mongoose from 'mongoose';

const userSchema = new mongoose.Schema(
  {
    username: { type: String, required: true, trim: true },
    usernameLower: { type: String, required: true, unique: true, index: true },
    email: { type: String, required: true, unique: true, lowercase: true, index: true },
    passwordHash: { type: String, required: true, select: false },
  },
  { timestamps: true }
);

export default mongoose.model('User', userSchema);
