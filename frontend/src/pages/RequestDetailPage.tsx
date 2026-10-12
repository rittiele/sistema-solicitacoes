import type { FormEvent } from "react";
import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ApiError } from "../api";
import { useAuth } from "../auth";
import { AppShell } from "../components/Header";
import { Alert, Field } from "../components/Form";
import { PRIORITY_LABEL, PRIORITY_ORDER, STATUS_LABEL, STATUS_ORDER, formatDate } from "../labels";
import type { RequestItem, RequestPriority, RequestStatus } from "../types";

export function RequestDetailPage() {
  const { id } = useParams();
  const { request } = useAuth();
  const navigate = useNavigate();
  const [item, setItem] = useState<RequestItem | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<RequestStatus>("OPEN");
  const [priority, setPriority] = useState<RequestPriority>("MEDIUM");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  useEffect(() => {
    if (!id) {
      return;
    }

    let active = true;

    request<{ request: RequestItem }>(`/requests/${id}`)
      .then((data) => {
        if (!active) {
          return;
        }

        setItem(data.request);
        setTitle(data.request.title);
        setDescription(data.request.description);
        setStatus(data.request.status);
        setPriority(data.request.priority);
      })
      .catch((caught) => {
        if (active) {
          setError(caught instanceof ApiError ? caught.message : "Não foi possível carregar a solicitação.");
        }
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [id, request]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccess("");

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
      const data = await request<{ request: RequestItem }>(`/requests/${id}`, {
        method: "PATCH",
        body: { title, description, status, priority },
      });
      setItem(data.request);
      setSuccess("Solicitação atualizada.");
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "Não foi possível atualizar a solicitação.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete() {
    setError("");
    setSubmitting(true);

    try {
      await request(`/requests/${id}`, { method: "DELETE" });
      navigate("/", { replace: true });
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "Não foi possível excluir a solicitação.");
      setSubmitting(false);
    }
  }

  return (
    <AppShell>
      <main className="page narrow">
        <Link className="back-link" to="/">
          Voltar ao painel
        </Link>
        <h1>Detalhes da solicitação</h1>
        {loading ? <p>Carregando solicitação...</p> : null}
        {error ? <Alert tone="error">{error}</Alert> : null}
        {success ? <Alert tone="success">{success}</Alert> : null}

        {item ? (
          <>
            <p className="meta-line">
              Criada em <time dateTime={item.createdAt}>{formatDate(item.createdAt)}</time>
              {" · "}
              Atualizada em <time dateTime={item.updatedAt}>{formatDate(item.updatedAt)}</time>
            </p>
            <form className="card form" onSubmit={handleSubmit} noValidate>
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
              <div className="field-grid">
              <Field id="status" label="Status">
                <select
                  id="status"
                  name="status"
                  value={status}
                  onChange={(event) => setStatus(event.target.value as RequestStatus)}
                >
                  {STATUS_ORDER.map((itemStatus) => (
                    <option key={itemStatus} value={itemStatus}>
                      {STATUS_LABEL[itemStatus]}
                    </option>
                  ))}
                </select>
              </Field>
              <Field id="priority" label="Prioridade">
                <select
                  id="priority"
                  name="priority"
                  value={priority}
                  onChange={(event) => setPriority(event.target.value as RequestPriority)}
                >
                  {PRIORITY_ORDER.map((itemPriority) => (
                    <option key={itemPriority} value={itemPriority}>
                      {PRIORITY_LABEL[itemPriority]}
                    </option>
                  ))}
                </select>
              </Field>
              </div>
              <button className="button" type="submit" disabled={submitting}>
                {submitting ? "Salvando..." : "Salvar alterações"}
              </button>
            </form>

            <section className="danger-zone">
              <h2>Excluir solicitação</h2>
              {confirmingDelete ? (
                <div className="confirm-box">
                  <p>Esta ação remove a solicitação da sua conta. Deseja continuar?</p>
                  <div className="button-row">
                    <button className="button danger" type="button" onClick={handleDelete} disabled={submitting}>
                      Confirmar exclusão
                    </button>
                    <button
                      className="button secondary"
                      type="button"
                      onClick={() => setConfirmingDelete(false)}
                      disabled={submitting}
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              ) : (
                <button className="button danger" type="button" onClick={() => setConfirmingDelete(true)}>
                  Excluir
                </button>
              )}
            </section>
          </>
        ) : null}
      </main>
    </AppShell>
  );
}
