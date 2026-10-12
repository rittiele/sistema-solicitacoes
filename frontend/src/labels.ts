import type { RequestPriority, RequestStatus } from "./types";

export const STATUS_ORDER: RequestStatus[] = [
  "OPEN",
  "IN_PROGRESS",
  "COMPLETED",
  "CANCELLED",
];

export const STATUS_LABEL: Record<RequestStatus, string> = {
  OPEN: "Aberta",
  IN_PROGRESS: "Em andamento",
  COMPLETED: "Concluída",
  CANCELLED: "Cancelada",
};

export const PRIORITY_ORDER: RequestPriority[] = ["LOW", "MEDIUM", "HIGH"];

export const PRIORITY_LABEL: Record<RequestPriority, string> = {
  LOW: "Baixa",
  MEDIUM: "Média",
  HIGH: "Alta",
};

export function formatDate(value: string): string {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}
