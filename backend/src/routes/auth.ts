import type { FastifyPluginAsync } from "fastify";
import { authenticate } from "../plugins/auth.js";
import { loginSchema, registerSchema } from "../schemas/auth.js";
import { getAuthenticatedUser, loginUser, registerUser } from "../services/auth.js";

export const authRoutes: FastifyPluginAsync = async (app) => {
  app.post("/register", async (request, reply) => {
    const body = registerSchema.parse(request.body);
    const user = await registerUser(body);
    return reply.status(201).send({ user });
  });

  app.post("/login", async (request) => {
    const body = loginSchema.parse(request.body);
    return loginUser(body, (payload) => app.jwt.sign(payload));
  });

  app.get("/me", { preHandler: authenticate }, async (request) => {
    const user = await getAuthenticatedUser(request.user.sub);
    return { user };
  });
};
