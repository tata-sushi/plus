import { Routes, Route, Navigate } from 'react-router-dom'
import { AppShell } from './components/AppShell.jsx'
import { useAuth } from './lib/AuthContext.jsx'
import { Login } from './routes/Login.jsx'
import { Home } from './routes/Home.jsx'
import { Comunicados } from './routes/Comunicados.jsx'
import { Treinamentos } from './routes/Treinamentos.jsx'
import { Mais } from './routes/Mais.jsx'
import { Jornada } from './routes/Jornada.jsx'
import { Perfil } from './routes/Perfil.jsx'
import { Recompensas } from './routes/Recompensas.jsx'
import { AdminRecompensas } from './routes/AdminRecompensas.jsx'
import { Manutencao } from './routes/Manutencao.jsx'
import { Ranking } from './routes/Ranking.jsx'
import { Cardapio } from './routes/Cardapio.jsx'
import { Avaliar } from './routes/Avaliar.jsx'
import { Comunidade } from './routes/Comunidade.jsx'
import { Ouvidoria } from './routes/Ouvidoria.jsx'
import { Governanca } from './routes/Governanca.jsx'
import { Organograma } from './routes/Organograma.jsx'
import { GerenciarAtalhos } from './routes/GerenciarAtalhos.jsx'
import { QuestionarioDisc } from './routes/QuestionarioDisc.jsx'
import { PainelExterno } from './routes/PainelExterno.jsx'
import { BuscarPessoas } from './routes/BuscarPessoas.jsx'

function Splash() {
  return (
    <div className="grid min-h-screen place-items-center bg-bg">
      <img src="/icons/icon-192.png" alt="Tatá" className="h-16 w-16 animate-pulse rounded-2xl" />
    </div>
  )
}

function Protegido() {
  const { session, loading } = useAuth()
  if (loading) return <Splash />
  return session ? <AppShell /> : <Navigate to="/login" replace />
}

export function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route element={<Protegido />}>
        <Route path="/" element={<Home />} />
        <Route path="/comunicados" element={<Comunicados />} />
        <Route path="/treinamentos" element={<Treinamentos />} />
        <Route path="/mais" element={<Mais />} />
        <Route path="/jornada" element={<Jornada />} />
        <Route path="/perfil/:id" element={<Perfil />} />
        <Route path="/buscar" element={<BuscarPessoas />} />
        <Route path="/recompensas" element={<Recompensas />} />
        <Route path="/admin" element={<AdminRecompensas />} />
        <Route path="/recompensas/admin" element={<AdminRecompensas />} />
        <Route path="/manutencao" element={<Manutencao />} />
        <Route path="/ranking" element={<Ranking />} />
        <Route path="/ouvidoria" element={<Ouvidoria />} />
        <Route path="/cardapio" element={<Cardapio />} />
        <Route path="/avaliar" element={<Avaliar />} />
        <Route path="/comunidade" element={<Comunidade />} />
        <Route path="/governanca" element={<Governanca />} />
        <Route path="/organograma" element={<Organograma />} />
        <Route path="/atalhos-governanca" element={<GerenciarAtalhos />} />
        <Route path="/perfil-disc" element={<QuestionarioDisc />} />
        <Route path="/painel/:id" element={<PainelExterno />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}
