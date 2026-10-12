import { HttpError } from "../lib/http-error.js";
import { prisma } from "../lib/prisma.js";
import type { CreateRequestInput, UpdateRequestInput } from "../schemas/requests.js";

const requestFields = {
  id: true,
  title: true,
  description: true,
  status: true,
  priority: true,
  createdAt: true,
  updatedAt: true,
} as const;

export async function listRequests(userId: string) {
  return prisma.request.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    select: requestFields,
  });
}

export async function getOwnedRequest(userId: string, requestId: string) {
  const request = await prisma.request.findFirst({
    where: { id: requestId, userId },
    select: requestFields,
  });

  if (!request) {
    throw new HttpError(404, "Solicitação não encontrada.");
  }

  return request;
}

export async function createRequest(userId: string, input: CreateRequestInput) {
  return prisma.request.create({
    data: {
      title: input.title,
      description: input.description,
      priority: input.priority,
      userId,
    },
    select: requestFields,
  });
}

export async function updateOwnedRequest(
  userId: string,
  requestId: string,
  input: UpdateRequestInput,
) {
  const updated = await prisma.request.updateMany({
    where: { id: requestId, userId },
    data: input,
  });

  if (updated.count === 0) {
    throw new HttpError(404, "Solicitação não encontrada.");
  }

  return getOwnedRequest(userId, requestId);
}

export async function deleteOwnedRequest(userId: string, requestId: string): Promise<void> {
  const deleted = await prisma.request.deleteMany({
    where: { id: requestId, userId },
  });

  if (deleted.count === 0) {
    throw new HttpError(404, "Solicitação não encontrada.");
  }
}
