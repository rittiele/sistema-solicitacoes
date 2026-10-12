import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { ApiError } from "../api";
import { useAuth } from "../auth";
import { AppShell } from "../components/Header";
import { Alert } from "../components/Form";
import { PRIORITY_LABEL, STATUS_LABEL, STATUS_ORDER, formatDate } from "../labels";
import type { RequestItem, RequestStatus } from "../types";

export function DashboardPage() {
  const { request } = useAuth();
  const location = useLocation();
  const [requests, setRequests] = useState<RequestItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    request<{ requests: RequestItem[] }>("/requests")
      .then((data) => {
        if (active) {
          setRequests(data.requests);
        }
      })
      .catch((caught) => {
        if (active) {
          setError(caught instanceof ApiError ? caught.message : "Não foi possível carregar as solicitações.");
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
  }, [request]);

  useEffect(() => {
    if (location.hash !== "#lista" || loading) {
      return;
    }

    document.getElementById("lista")?.scrollIntoView({ block: "start" });
  }, [location.hash, loading]);

  const counts = STATUS_ORDER.reduce(
    (total, status) => {
      total[status] = requests.filter((item) => item.status === status).length;
      return total;
    },
    {} as Record<RequestStatus, number>,
  );

  return (
    <AppShell>
      <main className="page">
        <div className="page-heading">
          <div>
            <h1>Painel</h1>
            <p className="lead">Acompanhe as solicitações da sua conta.</p>
          </div>
          <Link className="button secondary" to="/solicitacoes/nova">
            Nova solicitação
          </Link>
        </div>

        <section className="summary" aria-label="Resumo por status">
          {STATUS_ORDER.map((status) => (
            <article className="summary-card" key={status}>
              <span>{STATUS_LABEL[status]}</span>
              <strong>{counts[status]}</strong>
            </article>
          ))}
        </section>

        {loading ? <p>Carregando solicitações...</p> : null}
        {error ? <Alert tone="error">{error}</Alert> : null}

        <section id="lista">
        {!loading && !error && requests.length === 0 ? (
          <section className="card empty">
            <h2>Nenhuma solicitação ainda</h2>
            <p>Crie a primeira para começar a acompanhar o andamento.</p>
            <Link className="button" to="/solicitacoes/nova">
              Criar solicitação
            </Link>
          </section>
        ) : null}

        {requests.length > 0 ? (
          <ul className="request-list">
            {requests.map((item) => (
              <li key={item.id}>
                <Link className="request-card" to={`/solicitacoes/${item.id}`}>
                  <div>
                    <h2>{item.title}</h2>
                    <p>{item.description}</p>
                  </div>
                  <div className="request-meta">
                    <span className={`badge ${item.status.toLowerCase()}`}>{STATUS_LABEL[item.status]}</span>
                    <span>{PRIORITY_LABEL[item.priority]}</span>
                    <time dateTime={item.createdAt}>{formatDate(item.createdAt)}</time>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        ) : null}
        </section>
      </main>
    </AppShell>
  );
}
