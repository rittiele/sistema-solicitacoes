import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  HOST: z.string().min(1).default("0.0.0.0"),
  PORT: z.coerce.number().int().positive().default(3333),
  DATABASE_URL: z.string().min(1),
  JWT_SECRET: z.string().min(32, "JWT_SECRET deve ter pelo menos 32 caracteres."),
  JWT_EXPIRES_IN: z.string().min(1).default("8h"),
  CORS_ORIGIN: z.string().min(1).default("http://localhost:5173"),
});

function loadEnv() {
  const parsed = envSchema.safeParse(process.env);

  if (!parsed.success) {
    const details = parsed.error.issues
      .map((issue) => `- ${issue.path.join(".") || "ambiente"}: ${issue.message}`)
      .join("\n");

    console.error(`Variáveis de ambiente inválidas:\n${details}`);
    process.exit(1);
  }

  return parsed.data;
}

export const env = loadEnv();
