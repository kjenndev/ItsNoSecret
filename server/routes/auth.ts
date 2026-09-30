import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../db.ts';

import { validate, email } from '../validation.ts';
import { rateLimit } from '../rateLimit.ts';
const router = express.Router();
import { JWT_SECRET } from '../authConfig.ts';

router.post('/login', rateLimit(), validate(body => {
  const normalizedEmail = email(body.email, true);
  if (typeof body.password !== 'string' || !body.password || Buffer.byteLength(body.password, 'utf8') > 72) throw new Error('Password is invalid');
  return {email: normalizedEmail, password: body.password};
}), async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user || !user.isActive) {
      res.status(401).json({ error: 'Invalid email or password' });
      return;
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);

    if (!isPasswordValid) {
      res.status(401).json({ error: 'Invalid email or password' });
      return;
    }

    const token = jwt.sign(
      { userId: user.id, tokenVersion: user.tokenVersion },
      JWT_SECRET,
      { expiresIn: '8h' }
    );

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        roles: user.roles,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
