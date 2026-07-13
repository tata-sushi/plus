import { Routes, Route, Navigate } from 'react-router-dom'
import { AppShell } from './components/AppShell.jsx'
import { Home } from './routes/Home.jsx'
import { Comunicados } from './routes/Comunicados.jsx'
import { Treinamentos } from './routes/Treinamentos.jsx'
import { Procedimentos } from './routes/Procedimentos.jsx'
import { Mais } from './routes/Mais.jsx'
import { Jornada } from './routes/Jornada.jsx'
import { Perfil } from './routes/Perfil.jsx'
import { Recompensas } from './routes/Recompensas.jsx'
import { RhFacil } from './routes/RhFacil.jsx'
import { AssistenteIa } from './routes/AssistenteIa.jsx'
import { Manutencao } from './routes/Manutencao.jsx'
import { Ranking } from './routes/Ranking.jsx'
import { Cardapio } from './routes/Cardapio.jsx'
import { Comunidade } from './routes/Comunidade.jsx'
import { Ouvidoria } from './routes/Ouvidoria.jsx'
import { Governanca } from './routes/Governanca.jsx'
import { InicioCarbon } from './routes/InicioCarbon.jsx'

export function App() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route path="/" element={<Home />} />
        <Route path="/comunicados" element={<Comunicados />} />
        <Route path="/treinamentos" element={<Treinamentos />} />
        <Route path="/procedimentos" element={<Procedimentos />} />
        <Route path="/mais" element={<Mais />} />
        <Route path="/jornada" element={<Jornada />} />
        <Route path="/perfil/:id" element={<Perfil />} />
        <Route path="/recompensas" element={<Recompensas />} />
        <Route path="/rh" element={<RhFacil />} />
        <Route path="/assistente" element={<AssistenteIa />} />
        <Route path="/manutencao" element={<Manutencao />} />
        <Route path="/ranking" element={<Ranking />} />
        <Route path="/ouvidoria" element={<Ouvidoria />} />
        <Route path="/cardapio" element={<Cardapio />} />
        <Route path="/comunidade" element={<Comunidade />} />
        <Route path="/governanca" element={<Governanca />} />
        <Route path="/inicio-carbon" element={<InicioCarbon />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}
