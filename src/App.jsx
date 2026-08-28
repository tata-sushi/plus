import { lazy, Suspense } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { AppShell } from './components/AppShell.jsx'
import { ErroBoundary } from './components/ErroBoundary.jsx'
import { useAuth } from './lib/AuthContext.jsx'
import { Login } from './routes/Login.jsx'
import { Home } from './routes/Home.jsx'
import { Comunicados } from './routes/Comunicados.jsx'
import { Treinamentos } from './routes/Treinamentos.jsx'
import { Mais } from './routes/Mais.jsx'
import { Jornada } from './routes/Jornada.jsx'
import { Perfil } from './routes/Perfil.jsx'
import { Recompensas } from './routes/Recompensas.jsx'
import { Lojinha } from './routes/Lojinha.jsx'
import { AdminRecompensas } from './routes/AdminRecompensas.jsx'
import { Manutencao } from './routes/Manutencao.jsx'
import { Ranking } from './routes/Ranking.jsx'
import { Cardapio } from './routes/Cardapio.jsx'
import { Avaliar } from './routes/Avaliar.jsx'
import { Comunidade } from './routes/Comunidade.jsx'
import { Ouvidoria } from './routes/Ouvidoria.jsx'
import { Governanca } from './routes/Governanca.jsx'
import { Organograma } from './routes/Organograma.jsx'
import { ControleEscala } from './routes/ControleEscala.jsx'
import { GerenciarAtalhos } from './routes/GerenciarAtalhos.jsx'
import { QuestionarioDisc } from './routes/QuestionarioDisc.jsx'
import { PainelExterno } from './routes/PainelExterno.jsx'
import { BuscarPessoas } from './routes/BuscarPessoas.jsx'
import { Carteira } from './routes/Carteira.jsx'
import { Radio } from './routes/Radio.jsx'
import { Compartilhar } from './routes/Compartilhar.jsx'
import { Reconhecimentos } from './routes/Reconhecimentos.jsx'
import { MinhaExperiencia } from './routes/MinhaExperiencia.jsx'
import { Passatempos } from './routes/Passatempos.jsx'

// Painel Kanban (Quadros) — carregado sob demanda (poucos têm acesso), pra não
// pesar o bundle de todo mundo com a lib de drag-and-drop.
const Quadros = lazy(() => import('./routes/Quadros.jsx'))
// Agenda/Escala do colaborador — carregada sob demanda (liberada a todo colaborador ativo).
const Escala = lazy(() => import('./routes/Escala.jsx'))
// Limpeza de banheiros — check via QR, carregada sob demanda.
const Limpeza = lazy(() => import('./routes/Limpeza.jsx'))
// Desafio do dia (Tatá Tango) — jogo diário, carregado sob demanda.
const Jogo = lazy(() => import('./routes/Jogo.jsx'))
// Rota do Sushi — segundo jogo diário (estilo Zip), carregado sob demanda.
const RotaSushi = lazy(() => import('./routes/RotaSushi.jsx'))
// Termo Tatá — terceiro jogo diário (estilo Termo/Wordle), carregado sob demanda.
const Termo = lazy(() => import('./routes/Termo.jsx'))
// Assinaturas — documentos para o colaborador ler e assinar, carregado sob demanda.
const Documentos = lazy(() => import('./routes/Documentos.jsx'))
// Comprovante imprimível de uma assinatura, carregado sob demanda.
const Comprovante = lazy(() => import('./routes/Comprovante.jsx'))

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
        <Route path="/carteira" element={<Carteira />} />
        <Route path="/jornada" element={<Jornada />} />
        <Route path="/perfil/:id" element={<Perfil />} />
        <Route path="/buscar" element={<BuscarPessoas />} />
        <Route path="/recompensas" element={<Recompensas />} />
        <Route
          path="/lojinha"
          element={
            <ErroBoundary>
              <Lojinha />
            </ErroBoundary>
          }
        />
        <Route path="/admin" element={<AdminRecompensas />} />
        <Route path="/recompensas/admin" element={<AdminRecompensas />} />
        <Route path="/manutencao" element={<Manutencao />} />
        <Route path="/ranking" element={<Ranking />} />
        <Route path="/ouvidoria" element={<Ouvidoria />} />
        <Route path="/cardapio" element={<Cardapio />} />
        <Route path="/avaliar" element={<Avaliar />} />
        <Route path="/comunidade" element={<Comunidade />} />
        <Route path="/reconhecimentos" element={<Reconhecimentos />} />
        <Route path="/passatempos" element={<Passatempos />} />
        <Route path="/minha-experiencia" element={<MinhaExperiencia />} />
        <Route path="/governanca" element={<Governanca />} />
        <Route path="/organograma" element={<Organograma />} />
        <Route path="/controle-escala" element={<ControleEscala />} />
        <Route path="/radio" element={<Radio />} />
        <Route path="/compartilhar" element={<Compartilhar />} />
        <Route path="/atalhos-governanca" element={<GerenciarAtalhos />} />
        <Route path="/perfil-disc" element={<QuestionarioDisc />} />
        <Route path="/painel/:id" element={<PainelExterno />} />
        <Route
          path="/quadros"
          element={
            <Suspense fallback={<Splash />}>
              <Quadros />
            </Suspense>
          }
        />
        <Route
          path="/escala"
          element={
            <Suspense fallback={<Splash />}>
              <Escala />
            </Suspense>
          }
        />
        <Route
          path="/limpeza"
          element={
            <Suspense fallback={<Splash />}>
              <Limpeza />
            </Suspense>
          }
        />
        <Route
          path="/jogo"
          element={
            <ErroBoundary>
              <Suspense fallback={<Splash />}>
                <Jogo />
              </Suspense>
            </ErroBoundary>
          }
        />
        <Route
          path="/rota-sushi"
          element={
            <ErroBoundary>
              <Suspense fallback={<Splash />}>
                <RotaSushi />
              </Suspense>
            </ErroBoundary>
          }
        />
        <Route
          path="/termo"
          element={
            <ErroBoundary>
              <Suspense fallback={<Splash />}>
                <Termo />
              </Suspense>
            </ErroBoundary>
          }
        />
        <Route
          path="/documentos"
          element={
            <ErroBoundary>
              <Suspense fallback={<Splash />}>
                <Documentos />
              </Suspense>
            </ErroBoundary>
          }
        />
        <Route
          path="/comprovante/:atribuicaoId"
          element={
            <ErroBoundary>
              <Suspense fallback={<Splash />}>
                <Comprovante />
              </Suspense>
            </ErroBoundary>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}
