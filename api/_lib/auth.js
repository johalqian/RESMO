import jwt from 'jsonwebtoken';

const secret = process.env.RESMO_JWT_SECRET || 'resmo-dev-secret';

export const signToken = (user) =>
  jwt.sign(
    { sub: user.id, role: user.role, username: user.username },
    secret,
    { expiresIn: '7d' }
  );

export const getAuthUser = (req) => {
  const header = req.headers?.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return null;
  try {
    return jwt.verify(token, secret);
  } catch {
    return null;
  }
};

