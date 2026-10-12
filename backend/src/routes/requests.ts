import type { FastifyPluginAsync } from "fastify";
import { authenticate } from "../plugins/auth.js";
import {
  createRequestSchema,
  requestParamsSchema,
  updateRequestSchema,
} from "../schemas/requests.js";
import {
  createRequest,
  deleteOwnedRequest,
  getOwnedRequest,
  listRequests,
  updateOwnedRequest,
} from "../services/requests.js";

export const requestRoutes: FastifyPluginAsync = async (app) => {
  app.addHook("preHandler", authenticate);

  app.get("/", async (request) => {
    const requests = await listRequests(request.user.sub);
    return { requests };
  });

  app.get("/:id", async (request) => {
    const params = requestParamsSchema.parse(request.params);
    const requestItem = await getOwnedRequest(request.user.sub, params.id);
    return { request: requestItem };
  });

  app.post("/", async (request, reply) => {
    const body = createRequestSchema.parse(request.body);
    const requestItem = await createRequest(request.user.sub, body);
    return reply.status(201).send({ request: requestItem });
  });

  app.patch("/:id", async (request) => {
    const params = requestParamsSchema.parse(request.params);
    const body = updateRequestSchema.parse(request.body);
    const requestItem = await updateOwnedRequest(request.user.sub, params.id, body);
    return { request: requestItem };
  });

  app.delete("/:id", async (request, reply) => {
    const params = requestParamsSchema.parse(request.params);
    await deleteOwnedRequest(request.user.sub, params.id);
    return reply.status(204).send();
  });
};
