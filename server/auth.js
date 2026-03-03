import jwt from 'jsonwebtoken';

const secret = process.env.RESMO_JWT_SECRET || 'resmo-dev-secret';

export const signToken = (user) => {
  return jwt.sign(
    { sub: user.id, role: user.role, username: user.username },
    secret,
    { expiresIn: '7d' }
  );
};

export const authRequired = (req, res, next) => {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ message: 'unauthorized' });
  try {
    const payload = jwt.verify(token, secret);
    req.user = payload;
    return next();
  } catch {
    return res.status(401).json({ message: 'unauthorized' });
  }
};

export const adminRequired = (req, res, next) => {
  if (!req.user) return res.status(401).json({ message: 'unauthorized' });
  if (req.user.role !== 'admin') return res.status(403).json({ message: 'forbidden' });
  return next();
};

