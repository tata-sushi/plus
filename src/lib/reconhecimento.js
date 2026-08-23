import { Users, Zap, HeartHandshake, BadgeCheck, Handshake, Sparkles, Award } from 'lucide-react'
import { supabase } from './supabase.js'

// Reconhecimento entre pares — helpers de UI. A BASE (tabela dp_rh.reconhecimentos
// + RPCs em tata_plus) é mantida por outro agente; aqui só consumimos as RPCs.

// Ícone por motivo (o rótulo/label vem da RPC reconhecimento_motivos).
export const MOTIVO_ICONE = {
  equipe: Users,
  proatividade: Zap,
  atendimento: HeartHandshake,
  qualidade: BadgeCheck,
  apoio: Handshake,
  cultura: Sparkles,
  outro: Award,
}

export function iconeMotivo(slug) {
  return MOTIVO_ICONE[slug] || Award
}

// Catálogo de motivos (RPC 4) — cacheado no módulo (não muda durante a sessão).
let _motivos = null
let _promise = null
export async function carregarMotivos() {
  if (_motivos) return _motivos
  if (!_promise) {
    _promise = supabase
      .rpc('reconhecimento_motivos')
      .then(({ data }) => {
        _motivos = data || []
        return _motivos
      })
      .catch(() => {
        _promise = null
        return []
      })
  }
  return _promise
}

export function rotuloMotivo(slug, motivos) {
  const m = (motivos || []).find((x) => x.slug === slug)
  return m ? m.label : slug
}

// Soft-launch (versão de teste): por enquanto só admins veem o Reconhecimento.
// Pra liberar pra todo mundo, troque o corpo por `return true`.
export function podeVerReconhecimento(usuario) {
  return (usuario?.perfil || '').toLowerCase() === 'admin'
}
