import type { FastifyRequest } from "fastify";
import { HttpError } from "../lib/http-error.js";

declare module "@fastify/jwt" {
  interface FastifyJWT {
    payload: { sub: string };
    user: { sub: string };
  }
}

export async function authenticate(request: FastifyRequest): Promise<void> {
  try {
    await request.jwtVerify();
  } catch {
    throw new HttpError(401, "Sessão inválida ou expirada.");
  }

  if (!request.user?.sub) {
    throw new HttpError(401, "Sessão inválida ou expirada.");
  }
}
