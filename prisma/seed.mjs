import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  await prisma.channel.upsert({
    where: { id: "notice" },
    update: { name: "連絡" },
    create: { id: "notice", name: "連絡" },
  });

  await prisma.channel.upsert({
    where: { id: "chat" },
    update: { name: "雑談" },
    create: { id: "chat", name: "雑談" },
  });
}

main()
  .catch((error) => {
    console.error("Failed to seed channels:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
