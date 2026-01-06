import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const SUPER_ADMIN = 'SUPER_ADMIN';

  // Ensure core roles exist
  const roleNames = [
    'HR_PERSONNEL',
    'OFFICE_MANAGER',
    'FINANCE',
    'VIEW_ONLY',
    'ADMIN',
    SUPER_ADMIN
  ];

  const roles = await Promise.all(
    roleNames.map((name) =>
      prisma.role.upsert({
        where: { name },
        update: {},
        create: {
          name,
          description: `${name} role`,
        },
      })
    )
  );

  // Minimal permission set for now – can be expanded later
  const permissionKeys = [
    'USER_ADMIN',
    'EMPLOYEE_READ',
    'EMPLOYEE_WRITE',
    'SALARY_VIEW',
    'SALARY_EDIT_ADDITIONS',
    'SALARY_EXPORT',
    'BONUS_VIEW',
    'BONUS_EXPORT',
    'PERSONNEL_READ',
    'PERSONNEL_WRITE',
  ];

  const permissions = await Promise.all(
    permissionKeys.map((key) =>
      prisma.permission.upsert({
        where: { key },
        update: {},
        create: {
          key,
          description: key,
        },
      })
    )
  );

  // Attach all permissions to SUPER_ADMIN role
  const superAdminRole = roles.find((r) => r.name === SUPER_ADMIN);
  if (!superAdminRole) {
    throw new Error('SUPER_ADMIN role not found after upsert');
  }

  await Promise.all(
    permissions.map((perm) =>
      prisma.rolePermission.upsert({
        where: {
          roleId_permissionId: {
            roleId: superAdminRole.id,
            permissionId: perm.id,
          },
        },
        update: {},
        create: {
          roleId: superAdminRole.id,
          permissionId: perm.id,
        },
      })
    )
  );

  // Seed SuperAdmin user
  const username = 'khelmy';
  const fullName = 'Khaled Mohamed Helmy Mohamed Yousry Abd Rabo';
  const email = 'khelmy@sarieldin.com';
  const systemId = '3-2';
  const rawPassword = 'P@ssw0rd';

  const passwordHash = await bcrypt.hash(rawPassword, 10);

  const user = await prisma.user.upsert({
    where: { username },
    update: {
      fullName,
      email,
      systemId,
      isActive: true,
      // Only update password if the account was previously created with a different hash
      passwordHash,
    },
    create: {
      username,
      fullName,
      email,
      systemId,
      isActive: true,
      passwordHash,
    },
  });

  // Attach SUPER_ADMIN (and ADMIN) roles to the user
  const adminRole = roles.find((r) => r.name === 'ADMIN');

  const roleConnects = [superAdminRole, adminRole].filter(Boolean) as typeof superAdminRole[];

  await Promise.all(
    roleConnects.map((role) =>
      prisma.userRole.upsert({
        where: {
          userId_roleId: {
            userId: user.id,
            roleId: role.id,
          },
        },
        update: {},
        create: {
          userId: user.id,
          roleId: role.id,
        },
      })
    )
  );

  console.log('✅ SuperAdmin user seeded:', {
    username,
    email,
    systemId,
    roles: roleConnects.map((r) => r.name),
  });
}

main()
  .catch((e) => {
    console.error('❌ Error seeding SuperAdmin:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });


