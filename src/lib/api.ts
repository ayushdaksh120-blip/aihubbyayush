import supabase from './supabase'

export async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  const { data: { session } } = await supabase.auth.getSession()
  const response = await fetch(`/api/${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}), ...options.headers },
  })
  const payload = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(payload.error || 'Something went wrong. Please try again.')
  return payload as T
}
export type Model = { id: number; display_name: string; model_id: string; provider: string; protocol: 'anthropic' | 'openai'; description: string; badge: string; context_window: number; is_active: boolean; is_featured: boolean; sort_order: number; accent: string }
export type Conversation = { id: number; title: string; model_id: number; created_at: string; updated_at: string }
export type Message = { id: number; conversation_id: number; role: 'user' | 'assistant'; content: string; created_at: string }
export type Profile = { user_id: string; display_name: string; role: 'ADMIN' | 'USER' }
