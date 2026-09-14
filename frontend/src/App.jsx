import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import AppShell from "./components/layout/AppShell";
import LandingPage from "./pages/LandingPage";
import NegociacoesPage from "./pages/NegociacoesPage";
import NegociacaoDetalhePage from "./pages/NegociacaoDetalhePage";
import AnalisesPage from "./pages/AnalisesPage";
import OportunidadesPage from "./pages/OportunidadesPage";
import ConfiguracoesPage from "./pages/ConfiguracoesPage";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/app" element={<AppShell />}>
          <Route index element={<Navigate to="negociacoes" replace />} />
          <Route path="negociacoes" element={<NegociacoesPage />} />
          <Route path="negociacoes/:id" element={<NegociacaoDetalhePage />} />
          <Route path="analises" element={<AnalisesPage />} />
          <Route path="oportunidades" element={<OportunidadesPage />} />
          <Route path="configuracoes" element={<ConfiguracoesPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
