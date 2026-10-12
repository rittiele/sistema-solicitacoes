import { Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider } from "./auth";
import { GuestOnly, RequireAuth } from "./components/RouteGuards";
import { DashboardPage } from "./pages/DashboardPage";
import { LoginPage } from "./pages/LoginPage";
import { NewRequestPage } from "./pages/NewRequestPage";
import { RegisterPage } from "./pages/RegisterPage";
import { RequestDetailPage } from "./pages/RequestDetailPage";

export function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route element={<GuestOnly />}>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/cadastro" element={<RegisterPage />} />
        </Route>
        <Route element={<RequireAuth />}>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/solicitacoes/nova" element={<NewRequestPage />} />
          <Route path="/solicitacoes/:id" element={<RequestDetailPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthProvider>
  );
}
