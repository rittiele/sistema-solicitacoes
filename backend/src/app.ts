import cors from "@fastify/cors";
import fastifyJwt from "@fastify/jwt";
import { Prisma } from "@prisma/client";
import Fastify, { type FastifyInstance } from "fastify";
import { ZodError } from "zod";
import { env } from "./lib/env.js";
import { HttpError } from "./lib/http-error.js";
import { authRoutes } from "./routes/auth.js";
import { healthRoutes } from "./routes/health.js";
import { requestRoutes } from "./routes/requests.js";

function statusCodeOf(error: unknown): number {
  if (error instanceof HttpError) {
    return error.statusCode;
  }

  if (
    typeof error === "object" &&
    error !== null &&
    "statusCode" in error &&
    typeof error.statusCode === "number"
  ) {
    return error.statusCode;
  }

  return 500;
}

type BuildAppOptions = {
  logger?: boolean;
};

export async function buildApp(options: BuildAppOptions = {}): Promise<FastifyInstance> {
  const app = Fastify({
    logger: options.logger ?? true,
  });

  await app.register(cors, {
    origin: env.CORS_ORIGIN,
    methods: ["GET", "HEAD", "POST", "PATCH", "DELETE"],
  });

  await app.register(fastifyJwt, {
    secret: env.JWT_SECRET,
    sign: {
      expiresIn: env.JWT_EXPIRES_IN,
    },
  });

  app.setNotFoundHandler((_request, reply) => {
    reply.status(404).send({ message: "Rota não encontrada." });
  });

  app.setErrorHandler((error, request, reply) => {
    if (error instanceof ZodError) {
      request.log.warn("Falha de validação.");
      return reply.status(400).send({
        message: "Dados inválidos.",
        errors: error.issues.map((issue) => ({
          field: issue.path.join(".") || "body",
          message: issue.message,
        })),
      });
    }

    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      request.log.warn("Conflito de dado único.");
      return reply.status(409).send({ message: "Este e-mail já está cadastrado." });
    }

    const statusCode = statusCodeOf(error);

    if (statusCode >= 500) {
      request.log.error(error);
    } else {
      request.log.warn(error instanceof Error ? error.message : "Erro na requisição.");
    }

    const message =
      statusCode >= 500
        ? "Ocorreu um erro interno. Tente novamente mais tarde."
        : error instanceof Error
          ? error.message
          : "Não foi possível concluir a operação.";

    return reply.status(statusCode).send({ message });
  });

  await app.register(healthRoutes);
  await app.register(authRoutes, { prefix: "/auth" });
  await app.register(requestRoutes, { prefix: "/requests" });

  return app;
}
