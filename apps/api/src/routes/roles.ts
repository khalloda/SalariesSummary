import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { requireAuth, requireRole } from '../utils/auth.js';

const prisma = new PrismaClient();
export const rolesRouter = Router();

// GET /api/roles - List all roles (ADMIN+ only)
rolesRouter.get('/', requireAuth, requireRole('ADMIN', 'SUPER_ADMIN'), async (req, res) => {
  try {
    const roles = await prisma.role.findMany({
      include: {
        permissions: {
          include: {
            permission: true,
          },
        },
        _count: {
          select: {
            users: true,
          },
        },
      },
      orderBy: {
        name: 'asc',
      },
    });

    const rolesWithDetails = roles.map((role) => ({
      id: role.id,
      name: role.name,
      description: role.description,
      permissions: role.permissions.map((rp) => rp.permission.key),
      userCount: role._count.users,
      createdAt: role.createdAt,
      updatedAt: role.updatedAt,
    }));

    return res.json({ roles: rolesWithDetails });
  } catch (error: any) {
    console.error('Error in GET /api/roles:', error);
    return res.status(500).json({ error: error.message });
  }
});

// GET /api/permissions - List all permissions (ADMIN+ only)
rolesRouter.get('/permissions', requireAuth, requireRole('ADMIN', 'SUPER_ADMIN'), async (req, res) => {
  try {
    const permissions = await prisma.permission.findMany({
      orderBy: {
        key: 'asc',
      },
    });

    return res.json({ permissions });
  } catch (error: any) {
    console.error('Error in GET /api/roles/permissions:', error);
    return res.status(500).json({ error: error.message });
  }
});

