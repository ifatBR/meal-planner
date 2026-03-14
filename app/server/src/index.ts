import "dotenv/config";
import { prisma } from "./prisma";

async function main() {
  const users = await prisma.user.findMany();
  console.log(users);
}

main();
