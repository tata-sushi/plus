import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Section } from './Section.jsx'
import { supabase } from '../lib/supabase.js'
import { signoDe } from '../lib/signo.js'
import { AnalisesPerfil } from './AnalisesPerfil.jsx'

// "Meu perfil" da Minha jornada: DISC · Signo (interativo).
export function MeuPerfil() {
  const navigate = useNavigate()
  const [disc, setDisc] = useState(undefined) // undefined = carregando · null = sem DISC
  const [signo, setSigno] = useState(null)

  useEffect(() => {
    let ativo = true
    Promise.all([supabase.rpc('meu_perfil'), supabase.rpc('minha_jornada_extra')]).then(
      ([pr, er]) => {
        if (!ativo) return
        setDisc((pr.data || []).find((p) => p.instrumento === 'disc') || null)
        setSigno(signoDe(er.data?.data_nascimento))
      },
    )
    return () => {
      ativo = false
    }
  }, [])

  if (disc === undefined) return null

  return (
    <Section className="reveal reveal-3 mt-5" title="Meu perfil">
      <AnalisesPerfil
        disc={disc}
        signo={signo}
        onDisc={() => navigate('/perfil-disc')}
        onFazer={() => navigate('/treinamentos')}
      />
    </Section>
  )
}
