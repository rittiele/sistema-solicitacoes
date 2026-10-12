import { buildApp } from "./app.js";
import { env } from "./lib/env.js";
import { disconnectPrisma, prisma } from "./lib/prisma.js";

const app = await buildApp();
let shuttingDown = false;

async function shutdown(signal: string): Promise<void> {
  if (shuttingDown) {
    return;
  }

  shuttingDown = true;
  app.log.info(`Recebido ${signal}. Encerrando a aplicação...`);

  try {
    await app.close();
    await disconnectPrisma();
    process.exit(0);
  } catch (error) {
    app.log.error(error);
    process.exit(1);
  }
}

process.on("SIGINT", () => {
  void shutdown("SIGINT");
});

process.on("SIGTERM", () => {
  void shutdown("SIGTERM");
});

try {
  await prisma.$connect();
  app.log.info("Conexão com o banco de dados estabelecida.");
  await app.listen({ port: env.PORT, host: env.HOST });
} catch (error) {
  app.log.error(error);
  await app.close();
  await disconnectPrisma();
  process.exit(1);
}
