import { Sparkles, Atom, Waypoints } from 'lucide-react'
export default function ModelIcon({ provider, size = 20 }: { provider: string; size?: number }) {
  const p = provider.toLowerCase()
  return <span className={`model-icon ${p.includes('anthropic') || p.includes('claude') ? 'model-icon-claude' : p.includes('deepseek') ? 'model-icon-deepseek' : 'model-icon-gpt'}`}>{p.includes('anthropic') || p.includes('claude') ? <Sparkles size={size}/> : p.includes('deepseek') ? <Waypoints size={size}/> : <Atom size={size}/>}</span>
}
