import type { FormEvent } from "react";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ApiError } from "../api";
import { useAuth } from "../auth";
import { AppShell } from "../components/Header";
import { Alert, Field } from "../components/Form";
import { PRIORITY_LABEL, PRIORITY_ORDER } from "../labels";
import type { RequestItem, RequestPriority } from "../types";

export function NewRequestPage() {
  const { request } = useAuth();
  const navigate = useNavigate();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<RequestPriority>("MEDIUM");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (title.trim().length < 3) {
      setError("O título deve ter pelo menos 3 caracteres.");
      return;
    }

    if (description.trim().length < 1) {
      setError("Informe a descrição.");
      return;
    }

    setSubmitting(true);

    try {
      const data = await request<{ request: RequestItem }>("/requests", {
        method: "POST",
        body: {
          title,
          description,
          priority,
        },
      });
      navigate(`/solicitacoes/${data.request.id}`, { replace: true });
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "Não foi possível criar a solicitação.");
      setSubmitting(false);
    }
  }

  return (
    <AppShell>
      <main className="page narrow">
        <Link className="back-link" to="/">
          Voltar ao painel
        </Link>
        <h1>Nova solicitação</h1>
        <p className="lead">Descreva o que precisa ser acompanhado. O status inicial será Aberta.</p>
        <form className="card form" onSubmit={handleSubmit} noValidate>
          {error ? <Alert tone="error">{error}</Alert> : null}
          <Field id="title" label="Título">
            <input
              id="title"
              name="title"
              type="text"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              required
              minLength={3}
              maxLength={140}
            />
          </Field>
          <Field id="description" label="Descrição">
            <textarea
              id="description"
              name="description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              required
              rows={6}
              maxLength={5000}
            />
          </Field>
          <Field id="priority" label="Prioridade">
            <select
              id="priority"
              name="priority"
              value={priority}
              onChange={(event) => setPriority(event.target.value as RequestPriority)}
            >
              {PRIORITY_ORDER.map((item) => (
                <option key={item} value={item}>
                  {PRIORITY_LABEL[item]}
                </option>
              ))}
            </select>
          </Field>
          <button className="button" type="submit" disabled={submitting}>
            {submitting ? "Salvando..." : "Criar solicitação"}
          </button>
        </form>
      </main>
    </AppShell>
  );
}
