import { prisma } from '../db/prisma.js';
import type { AuthUserPayload } from './auth.js';

export async function logAudit(
  user: AuthUserPayload | undefined,
  action: string,
  resource: string,
  resourceId?: string,
  details?: unknown
): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        userId: user?.id ?? null,
        action,
        resource,
        resourceId: resourceId ?? null,
        details: details ? JSON.stringify(details) : null,
      },
    });
  } catch (error) {
    // Do not block main request flow on audit failures
    console.error('Failed to write audit log:', error);
  }
}


