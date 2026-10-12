import { Prisma } from "@prisma/client";
import { HttpError } from "../lib/http-error.js";
import { hashPassword, verifyPassword } from "../lib/passwords.js";
import { prisma } from "../lib/prisma.js";
import { toPublicUser, type PublicUser } from "../lib/users.js";
import type { LoginInput, RegisterInput } from "../schemas/auth.js";

export async function registerUser(input: RegisterInput): Promise<PublicUser> {
  const passwordHash = await hashPassword(input.password);

  try {
    const user = await prisma.user.create({
      data: {
        name: input.name,
        email: input.email,
        passwordHash,
      },
      select: {
        id: true,
        name: true,
        email: true,
      },
    });

    return toPublicUser(user);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      throw new HttpError(409, "Este e-mail já está cadastrado.");
    }

    throw error;
  }
}

export async function loginUser(
  input: LoginInput,
  signToken: (payload: { sub: string }) => string,
): Promise<{ token: string; user: PublicUser }> {
  const user = await prisma.user.findUnique({
    where: { email: input.email },
  });

  const passwordMatches = user
    ? await verifyPassword(user.passwordHash, input.password)
    : false;

  if (!user || !passwordMatches) {
    throw new HttpError(401, "E-mail ou senha inválidos.");
  }

  return {
    token: signToken({ sub: user.id }),
    user: toPublicUser(user),
  };
}

export async function getAuthenticatedUser(userId: string): Promise<PublicUser> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
    },
  });

  if (!user) {
    throw new HttpError(401, "Sessão inválida ou expirada.");
  }

  return toPublicUser(user);
}
