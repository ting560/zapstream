import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const existing = await prisma.server.count();
  if (existing > 0) {
    console.log(`Já existem ${existing} servidores cadastrados. Pulando seed.`);
    return;
  }

  await prisma.server.createMany({
    data: [
      {
        name: "ooo.fo",
        url: "https://ooo.fo",
        username: "josias.barbosa.costa@gmail.com",
        password: "123abc",
        active: true,
      },
      {
        name: "srv.cldplay.in",
        url: "http://srv.cldplay.in:80",
        username: "lelezago",
        password: "lelezago@2021",
        active: true,
      },
    ],
  });

  console.log("Servidores padrão adicionados com sucesso!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
