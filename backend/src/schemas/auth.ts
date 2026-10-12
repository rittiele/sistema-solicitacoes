import { z } from "zod";

const nameSchema = z
  .string("Informe o nome.")
  .trim()
  .min(2, "O nome deve ter pelo menos 2 caracteres.")
  .max(120, "O nome deve ter no máximo 120 caracteres.");

const emailSchema = z
  .string("Informe o e-mail.")
  .trim()
  .pipe(z.email("Informe um e-mail válido."))
  .transform((email) => email.toLowerCase());

const passwordSchema = z
  .string("Informe a senha.")
  .min(8, "A senha deve ter pelo menos 8 caracteres.")
  .max(128, "A senha deve ter no máximo 128 caracteres.");

export const registerSchema = z.object({
  name: nameSchema,
  email: emailSchema,
  password: passwordSchema,
});

export const loginSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
