import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import argon2 from 'argon2';
import * as readline from 'readline';
import 'dotenv/config';

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const ask = (q: string): Promise<string> => new Promise((resolve) => rl.question(q, resolve));

async function main() {
  console.log('=== Workspace Setup ===\n');

  const workspaceName = await ask('Workspace name: ');
  const firstName = await ask('First name: ');
  const lastName = await ask('Last name: ');
  const email = await ask('Email: ');
  const username = await ask('Username: ');
  const password = await ask('Password: ');

  rl.close();

  const workspace = await prisma.workspace.create({
    data: { name: workspaceName },
  });

  const passwordHash = await argon2.hash(password);

  const user = await prisma.user.create({
    data: {
      email,
      username,
      first_name: firstName,
      last_name: lastName,
      password_hash: passwordHash,
    },
  });

  const adminRole = await prisma.role.findUniqueOrThrow({ where: { key: 'admin' } });

  await prisma.workspaceUser.create({
    data: {
      user_id: user.id,
      workspace_id: workspace.id,
      role_id: adminRole.id,
    },
  });

  console.log(`\nWorkspace ID: ${workspace.id}`);
  console.log('Done.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
