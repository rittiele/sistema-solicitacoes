import { useEffect, useState, type ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../auth";

export function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="auth-screen">
      <main className="auth-card">
        <p className="brand-mark">Solicitações</p>
        {children}
      </main>
    </div>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [open, setOpen] = useState(() => window.matchMedia("(min-width: 960px)").matches);

  useEffect(() => {
    if (window.matchMedia("(max-width: 959px)").matches) {
      setOpen(false);
    }
  }, [location.pathname, location.hash]);

  const isNew = location.pathname === "/solicitacoes/nova";
  const isRequest = location.pathname.startsWith("/solicitacoes/") && !isNew;
  const isList = location.hash === "#lista" || isRequest;
  const isPanel = location.pathname === "/" && !isList;

  return (
    <div className={open ? "shell menu-open" : "shell"}>
      {open ? (
        <button className="sidebar-backdrop" type="button" aria-label="Fechar menu" onClick={() => setOpen(false)} />
      ) : null}
      <aside id="sidebar" className="sidebar" aria-label="Menu principal">
        <Link className="brand" to="/">
          Solicitações
        </Link>
        <nav className="sidebar-nav">
          <Link className={isPanel ? "nav-link active" : "nav-link"} to="/" aria-current={isPanel ? "page" : undefined}>
            Painel
          </Link>
          <Link
            className={isList ? "nav-link active" : "nav-link"}
            to="/#lista"
            aria-current={isList ? "page" : undefined}
          >
            Solicitações
          </Link>
          <Link
            className={isNew ? "nav-link action active" : "nav-link action"}
            to="/solicitacoes/nova"
            aria-current={isNew ? "page" : undefined}
          >
            Nova solicitação
          </Link>
        </nav>
      </aside>
      <div className="workspace">
        <div className="workspace-bar">
          <button
            className="text-button"
            type="button"
            aria-expanded={open}
            aria-controls="sidebar"
            onClick={() => setOpen((value) => !value)}
          >
            {open ? "Recolher menu" : "Abrir menu"}
          </button>
          <div className="workspace-user">
            <span className="user-name" title={user?.name}>
              {user?.name}
            </span>
            <button className="text-button" type="button" onClick={logout}>
              Sair
            </button>
          </div>
        </div>
        {children}
      </div>
    </div>
  );
}
