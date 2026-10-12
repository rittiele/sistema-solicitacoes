import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../auth";

export function LoadingScreen() {
  return (
    <main className="center-screen">
      <p>Carregando...</p>
    </main>
  );
}

export function RequireAuth() {
  const { user, ready } = useAuth();

  if (!ready) {
    return <LoadingScreen />;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}

export function GuestOnly() {
  const { user, ready } = useAuth();

  if (!ready) {
    return <LoadingScreen />;
  }

  if (user) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}
