import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import type { User } from '@prisma/client';
import { prisma } from '../db/prisma.js';
import { AuthUserPayloadSchema } from '../validation/schemas/auth.js';
import { ZodError } from 'zod';

// NOTE: In production, use a strong secret from environment variables.
const JWT_SECRET = process.env.JWT_SECRET || 'CHANGE_ME_IN_PRODUCTION';
const JWT_COOKIE_NAME = 'salaries_auth';
const JWT_EXPIRES_IN_SECONDS = 60 * 60 * 8; // 8 hours

// Re-export RoleName from validation schemas for backward compatibility
export type { RoleName } from '../validation/schemas/rbac.js';
export type { AuthUserPayload } from '../validation/schemas/auth.js';

declare module 'express-serve-static-core' {
  interface Request {
    user?: AuthUserPayload;
  }
}

export function signAuthToken(payload: AuthUserPayload): string {
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN_SECONDS,
  });
}

export function clearAuthCookie(res: Response) {
  res.clearCookie(JWT_COOKIE_NAME, {
    httpOnly: true,
    sameSite: 'lax',
    secure: false,
    path: '/',
  });
}

export function setAuthCookie(res: Response, token: string) {
  res.cookie(JWT_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: false,
    maxAge: JWT_EXPIRES_IN_SECONDS * 1000,
    path: '/',
  });
}

export async function loadUserWithRoles(userId: string): Promise<AuthUserPayload | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      roles: {
        include: { role: true },
      },
    },
  });

  if (!user || !user.isActive) {
    return null;
  }

  const roles = user.roles.map((ur) => ur.role.name as RoleName);

  return {
    id: user.id,
    username: user.username,
    roles,
  };
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const token = (req as any).cookies?.[JWT_COOKIE_NAME];
  if (!token) {
    console.log('[AUTH] No token found in cookies');
    return res.status(401).json({ error: 'Authentication required' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    console.log('[AUTH] JWT decoded successfully:', { id: (decoded as any).id, username: (decoded as any).username });
    
    // Validate JWT payload structure with Zod
    const validatedPayload = AuthUserPayloadSchema.parse(decoded);
    req.user = validatedPayload;
    return next();
  } catch (error) {
    clearAuthCookie(res);
    // Check if it's a validation error or JWT error
    if (error instanceof ZodError) {
      console.error('[AUTH] Invalid JWT payload structure:', error.errors);
      console.error('[AUTH] Decoded token was:', (error as any).input || 'unknown');
      return res.status(401).json({ error: 'Invalid session token structure' });
    }
    if (error instanceof Error) {
      console.error('[AUTH] JWT verification failed:', error.message);
    }
    return res.status(401).json({ error: 'Invalid or expired session' });
  }
}

export function requireRole(...allowedRoles: RoleName[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const hasRole = req.user.roles.some((r) => allowedRoles.includes(r));
    if (!hasRole) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    return next();
  };
}

export function canViewSalaryAmounts(roles: RoleName[]): boolean {
  if (roles.includes('SUPER_ADMIN')) return true;
  if (roles.includes('OFFICE_MANAGER')) return true;
  if (roles.includes('FINANCE')) return true;
  if (roles.includes('VIEW_ONLY')) return true;
  // ADMIN and HR_PERSONNEL cannot see salary amounts by default
  return false;
}

export function redactSalaryRecordForRoles(record: any, roles: RoleName[]): any {
  if (canViewSalaryAmounts(roles)) return record;

  return {
    ...record,
    basicSalary: 'RESTRICTED',
    gross: 'RESTRICTED',
    net: 'RESTRICTED',
    yearlyIncrease: 'RESTRICTED',
    bonuses: 'RESTRICTED',
    // additions/deductions and other HR fields remain as-is
  };
}

export function redactSalaryArrayForRoles(records: any[], roles: RoleName[]): any[] {
  return records.map((r) => redactSalaryRecordForRoles(r, roles));
}


