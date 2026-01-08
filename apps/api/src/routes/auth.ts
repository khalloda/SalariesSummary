import { Router } from 'express';
import bcrypt from 'bcrypt';
import { PrismaClient } from '@prisma/client';
import {
  type AuthUserPayload,
  loadUserWithRoles,
  signAuthToken,
  setAuthCookie,
  clearAuthCookie,
  requireAuth,
} from '../utils/auth.js';
import { logAudit } from '../utils/audit.js';
import { validateBody } from '../validation/middleware.js';
import { LoginRequestSchema } from '../validation/schemas/auth.js';

const prisma = new PrismaClient();
export const authRouter = Router();

authRouter.post('/login', validateBody(LoginRequestSchema), async (req, res) => {
  try {
    const { username, password } = req.body;

    const user = await prisma.user.findUnique({
      where: { username },
      include: {
        roles: {
          include: { role: true },
        },
      },
    });

    if (!user || !user.isActive) {
      await logAudit(undefined, 'LOGIN_FAILED', 'auth', undefined, { username, reason: 'invalid_or_inactive' });
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) {
      await logAudit(undefined, 'LOGIN_FAILED', 'auth', undefined, { username, reason: 'wrong_password' });
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const roles = user.roles.map((ur) => ur.role.name);
    const payload: AuthUserPayload = {
      id: user.id,
      username: user.username,
      roles: roles as any,
    };

    const token = signAuthToken(payload);
    setAuthCookie(res, token);

    await logAudit(payload, 'LOGIN_SUCCESS', 'auth', user.id, { username });

    return res.json({
      user: {
        id: user.id,
        username: user.username,
        fullName: user.fullName,
        roles,
      },
    });
  } catch (error: any) {
    console.error('Error in /api/auth/login:', error);
    return res.status(500).json({ error: error.message });
  }
});

authRouter.post('/logout', (req, res) => {
  const user = (req as any).user as AuthUserPayload | undefined;
  clearAuthCookie(res);
  void logAudit(user, 'LOGOUT', 'auth', user?.id, undefined);
  return res.json({ success: true });
});

authRouter.get('/me', requireAuth, async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const dbUser = await prisma.user.findUnique({
      where: { id: req.user.id },
      include: {
        roles: {
          include: {
            role: true,
          },
        },
      },
    });

    if (!dbUser || !dbUser.isActive) {
      clearAuthCookie(res);
      return res.status(401).json({ error: 'User not found or inactive' });
    }

    const roles = dbUser.roles.map((ur) => ur.role.name);

    return res.json({
      user: {
        id: dbUser.id,
        username: dbUser.username,
        fullName: dbUser.fullName,
        roles,
      },
    });
  } catch (error: any) {
    console.error('Error in /api/auth/me:', error);
    return res.status(500).json({ error: error.message });
  }
});


