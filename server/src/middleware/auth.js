import jwt from 'jsonwebtoken';

export function requireAuth(req, res, next) {
  const [type, token] = (req.headers.authorization || '').split(' ');
  if (type !== 'Bearer' || !token) return res.status(401).json({ error: 'Authentication required' });
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ['HS256'] });
    req.userId = payload.sub;
    next();
  } catch {
    res.status(401).json({ error: 'Session expired. Please log in again.' });
  }
}
