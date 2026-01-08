import { Router } from 'express';
import bcrypt from 'bcrypt';
import { PrismaClient } from '@prisma/client';
import { requireAuth, requireRole, type RoleName } from '../utils/auth.js';
import { logAudit } from '../utils/audit.js';
import { validateBody, validateParams } from '../validation/middleware.js';
import { UserCreateSchema, UserUpdateSchema, UserIdParamSchema } from '../validation/schemas/users.js';

const prisma = new PrismaClient();
export const usersRouter = Router();

// GET /api/users - List all users (ADMIN+ only)
usersRouter.get('/', requireAuth, requireRole('ADMIN', 'SUPER_ADMIN'), async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      include: {
        roles: {
          include: {
            role: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    const usersWithRoles = users.map((user) => ({
      id: user.id,
      username: user.username,
      email: user.email,
      fullName: user.fullName,
      systemId: user.systemId,
      isActive: user.isActive,
      roles: user.roles.map((ur) => ur.role.name),
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    }));

    return res.json({ users: usersWithRoles });
  } catch (error: any) {
    console.error('Error in GET /api/users:', error);
    return res.status(500).json({ error: error.message });
  }
});

// GET /api/users/:id - Get a specific user (ADMIN+ only)
usersRouter.get('/:id', 
  requireAuth, 
  requireRole('ADMIN', 'SUPER_ADMIN'),
  validateParams(UserIdParamSchema),
  async (req, res) => {
  try {
    const { id } = req.params;
    const user = await prisma.user.findUnique({
      where: { id },
      include: {
        roles: {
          include: {
            role: true,
          },
        },
      },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    return res.json({
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        fullName: user.fullName,
        systemId: user.systemId,
        isActive: user.isActive,
        roles: user.roles.map((ur) => ur.role.name),
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
    });
  } catch (error: any) {
    console.error('Error in GET /api/users/:id:', error);
    return res.status(500).json({ error: error.message });
  }
});

// POST /api/users - Create a new user (ADMIN+ only)
usersRouter.post('/', requireAuth, requireRole('ADMIN', 'SUPER_ADMIN'), async (req, res) => {
  try {
    const { username, password, email, fullName, systemId, roles, isActive } = req.body;

    if (!username || !password || !fullName) {
      return res.status(400).json({ error: 'username, password, and fullName are required' });
    }

    // Check if username already exists
    const existingUser = await prisma.user.findUnique({
      where: { username },
    });

    if (existingUser) {
      return res.status(400).json({ error: 'Username already exists' });
    }

    // Check if email already exists (if provided)
    if (email) {
      const existingEmail = await prisma.user.findUnique({
        where: { email },
      });

      if (existingEmail) {
        return res.status(400).json({ error: 'Email already exists' });
      }
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Create user
    const user = await prisma.user.create({
      data: {
        username,
        passwordHash,
        email: email || null,
        fullName,
        systemId: systemId || null,
        isActive: isActive !== undefined ? isActive : true,
      },
    });

    // Assign roles if provided
    if (roles && Array.isArray(roles) && roles.length > 0) {
      const roleRecords = await prisma.role.findMany({
        where: {
          name: {
            in: roles,
          },
        },
      });

      if (roleRecords.length > 0) {
        await prisma.userRole.createMany({
          data: roleRecords.map((role) => ({
            userId: user.id,
            roleId: role.id,
          })),
        });
      }
    }

    // Fetch user with roles
    const userWithRoles = await prisma.user.findUnique({
      where: { id: user.id },
      include: {
        roles: {
          include: {
            role: true,
          },
        },
      },
    });

    await logAudit(req.user || undefined, 'USER_CREATE', 'user', user.id, { username, fullName });

    return res.status(201).json({
      user: {
        id: userWithRoles!.id,
        username: userWithRoles!.username,
        email: userWithRoles!.email,
        fullName: userWithRoles!.fullName,
        systemId: userWithRoles!.systemId,
        isActive: userWithRoles!.isActive,
        roles: userWithRoles!.roles.map((ur) => ur.role.name),
        createdAt: userWithRoles!.createdAt,
        updatedAt: userWithRoles!.updatedAt,
      },
    });
  } catch (error: any) {
    console.error('Error in POST /api/users:', error);
    return res.status(500).json({ error: error.message });
  }
});

// PUT /api/users/:id - Update a user (ADMIN+ only)
usersRouter.put('/:id', 
  requireAuth, 
  requireRole('ADMIN', 'SUPER_ADMIN'),
  validateParams(UserIdParamSchema),
  validateBody(UserUpdateSchema),
  async (req, res) => {
  try {
    const { id } = req.params;
    const { username, password, email, fullName, systemId, roles, isActive } = req.body;

    const user = await prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Prevent modifying SUPER_ADMIN user unless current user is SUPER_ADMIN
    if (user.username === 'khelmy' && !req.user?.roles.includes('SUPER_ADMIN')) {
      return res.status(403).json({ error: 'Cannot modify SuperAdmin user' });
    }

    const updateData: any = {};

    if (username !== undefined && username !== user.username) {
      // Check if new username already exists
      const existingUser = await prisma.user.findUnique({
        where: { username },
      });

      if (existingUser) {
        return res.status(400).json({ error: 'Username already exists' });
      }

      updateData.username = username;
    }

    if (password !== undefined && password !== '') {
      updateData.passwordHash = await bcrypt.hash(password, 10);
    }

    if (email !== undefined) {
      if (email && email !== user.email) {
        // Check if new email already exists
        const existingEmail = await prisma.user.findUnique({
          where: { email },
        });

        if (existingEmail) {
          return res.status(400).json({ error: 'Email already exists' });
        }
      }
      updateData.email = email || null;
    }

    if (fullName !== undefined) {
      updateData.fullName = fullName;
    }

    if (systemId !== undefined) {
      updateData.systemId = systemId || null;
    }

    if (isActive !== undefined) {
      updateData.isActive = isActive;
    }

    // Update user
    await prisma.user.update({
      where: { id },
      data: updateData,
    });

    // Update roles if provided
    if (roles !== undefined && Array.isArray(roles)) {
      // Remove all existing roles
      await prisma.userRole.deleteMany({
        where: { userId: id },
      });

      // Add new roles
      if (roles.length > 0) {
        const roleRecords = await prisma.role.findMany({
          where: {
            name: {
              in: roles,
            },
          },
        });

        if (roleRecords.length > 0) {
          await prisma.userRole.createMany({
            data: roleRecords.map((role) => ({
              userId: id,
              roleId: role.id,
            })),
          });
        }
      }
    }

    // Fetch updated user with roles
    const userWithRoles = await prisma.user.findUnique({
      where: { id },
      include: {
        roles: {
          include: {
            role: true,
          },
        },
      },
    });

    await logAudit(req.user || undefined, 'USER_UPDATE', 'user', id, { username: updateData.username || user.username });

    return res.json({
      user: {
        id: userWithRoles!.id,
        username: userWithRoles!.username,
        email: userWithRoles!.email,
        fullName: userWithRoles!.fullName,
        systemId: userWithRoles!.systemId,
        isActive: userWithRoles!.isActive,
        roles: userWithRoles!.roles.map((ur) => ur.role.name),
        createdAt: userWithRoles!.createdAt,
        updatedAt: userWithRoles!.updatedAt,
      },
    });
  } catch (error: any) {
    console.error('Error in PUT /api/users/:id:', error);
    return res.status(500).json({ error: error.message });
  }
});

// DELETE /api/users/:id - Delete a user (ADMIN+ only, but cannot delete self or SUPER_ADMIN)
usersRouter.delete('/:id', 
  requireAuth, 
  requireRole('ADMIN', 'SUPER_ADMIN'),
  validateParams(UserIdParamSchema),
  async (req, res) => {
  try {
    const { id } = req.params;

    // Prevent deleting self
    if (id === req.user?.id) {
      return res.status(400).json({ error: 'Cannot delete your own account' });
    }

    const user = await prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Prevent deleting SUPER_ADMIN user unless current user is SUPER_ADMIN
    if (user.username === 'khelmy' && !req.user?.roles.includes('SUPER_ADMIN')) {
      return res.status(403).json({ error: 'Cannot delete SuperAdmin user' });
    }

    await prisma.user.delete({
      where: { id },
    });

    await logAudit(req.user || undefined, 'USER_DELETE', 'user', id, { username: user.username });

    return res.json({ success: true });
  } catch (error: any) {
    console.error('Error in DELETE /api/users/:id:', error);
    return res.status(500).json({ error: error.message });
  }
});

