import { z } from "zod";

export const requestStatusSchema = z.enum(
  ["OPEN", "IN_PROGRESS", "COMPLETED", "CANCELLED"],
  "Selecione um status válido.",
);

export const requestPrioritySchema = z.enum(
  ["LOW", "MEDIUM", "HIGH"],
  "Selecione uma prioridade válida.",
);

const titleSchema = z
  .string("Informe o título.")
  .trim()
  .min(3, "O título deve ter pelo menos 3 caracteres.")
  .max(140, "O título deve ter no máximo 140 caracteres.");

const descriptionSchema = z
  .string("Informe a descrição.")
  .trim()
  .min(1, "Informe a descrição.")
  .max(5000, "A descrição deve ter no máximo 5000 caracteres.");

export const requestParamsSchema = z.object({
  id: z.uuid("Identificador inválido."),
});

export const createRequestSchema = z.object({
  title: titleSchema,
  description: descriptionSchema,
  priority: requestPrioritySchema.default("MEDIUM"),
});

export const updateRequestSchema = z
  .object({
    title: titleSchema.optional(),
    description: descriptionSchema.optional(),
    status: requestStatusSchema.optional(),
    priority: requestPrioritySchema.optional(),
  })
  .refine((data) => Object.values(data).some((value) => value !== undefined), {
    message: "Informe ao menos um campo para atualizar.",
  });

export type CreateRequestInput = z.infer<typeof createRequestSchema>;
export type UpdateRequestInput = z.infer<typeof updateRequestSchema>;
