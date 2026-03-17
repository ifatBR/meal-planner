import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { ROLES } from "@app/types/roles";
import { PERMISSIONS } from "../src/constants/permissions";
import "dotenv/config";

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

// Derive all permissions from the PERMISSIONS constant
const ALL_PERMISSIONS = Object.values(PERMISSIONS).flatMap((module) =>
  Object.values(module),
);

// Workspace data modules — read is free, only write needs permission
// Admin modules — all actions including read require permission
const ADMIN_DOMAINS = ["users", "permissions"];

const ROLE_PERMISSIONS: Record<string, { domain: string; key: string }[]> = {
  [ROLES.ADMIN]: ALL_PERMISSIONS,
  [ROLES.EDITOR]: ALL_PERMISSIONS.filter(
    (p) => !ADMIN_DOMAINS.includes(p.domain),
  ),
  [ROLES.VIEWER]: [],
};

async function main() {
  console.log("Seeding roles...");
  const roleRecords = await Promise.all(
    Object.values(ROLES).map((key) =>
      prisma.role.upsert({
        where: { key },
        update: {},
        create: { key },
      }),
    ),
  );

  console.log("Seeding permissions...");
  const permissionRecords = await Promise.all(
    ALL_PERMISSIONS.map((p) =>
      prisma.permission.upsert({
        where: { domain_key: { domain: p.domain, key: p.key } },
        update: {},
        create: { domain: p.domain, key: p.key },
      }),
    ),
  );

  const roleByKey = Object.fromEntries(roleRecords.map((r) => [r.key, r]));
  const permByKey = Object.fromEntries(
    permissionRecords.map((p) => [`${p.domain}:${p.key}`, p]),
  );

  console.log("Seeding role permissions...");
  for (const [roleKey, perms] of Object.entries(ROLE_PERMISSIONS)) {
    const role = roleByKey[roleKey];
    await Promise.all(
      perms.map((p) => {
        const permission = permByKey[`${p.domain}:${p.key}`];
        return prisma.rolePermission.upsert({
          where: {
            role_id_permission_id: {
              role_id: role.id,
              permission_id: permission.id,
            },
          },
          update: {},
          create: { role_id: role.id, permission_id: permission.id },
        });
      }),
    );
  }

  console.log("Done.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
