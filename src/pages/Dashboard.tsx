import { useCallback, useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowDown, ArrowLeft, ArrowRight, Check, ChevronDown, Copy, Ellipsis, LogOut, Menu, MessageSquare, PanelLeftClose, PenLine, Plus, Search, Send, Settings2, Sparkles, Trash2, X } from 'lucide-react'
import { motion } from 'framer-motion'
import Brand from '../components/Brand'
import ModelIcon from '../components/ModelIcon'
import Markdown from '../components/Markdown'
import ThemeToggle from '../components/ThemeToggle'
import { api, type Conversation, type Message, type Model, type Profile } from '../lib/api'
import { useAuth } from '../contexts/AuthContext'
import supabase from '../lib/supabase'

export default function Dashboard({ theme, toggleTheme }: { theme: 'light' | 'dark'; toggleTheme: () => void }) {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [models, setModels] = useState<Model[]>([])
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [profile, setProfile] = useState<Profile | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [selectedModel, setSelectedModel] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [threadLoading, setThreadLoading] = useState(false)
  const [sending, setSending] = useState(false)
  const [draft, setDraft] = useState('')
  const [error, setError] = useState('')
  const [toast, setToast] = useState('')
  const [search, setSearch] = useState('')
  const [modelOpen, setModelOpen] = useState(false)
  const [mobileSidebar, setMobileSidebar] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [menuId, setMenuId] = useState<number | null>(null)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const [showScroll, setShowScroll] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const currentId = id ? Number(id) : null
  const currentModel = models.find(m => m.id === selectedModel)
  const activeConversation = conversations.find(c => c.id === currentId)
  const notify = (message: string) => { setToast(message); window.setTimeout(() => setToast(''), 3000) }
  const fetchConversations = useCallback(async () => { try { setConversations(await api<Conversation[]>('conversations')) } catch (err) { setError(err instanceof Error ? err.message : 'Could not load conversations.') } }, [])
  useEffect(() => {
    let alive = true
    Promise.all([api<Model[]>('models'), api<Conversation[]>('conversations'), api<Profile>('profile')]).then(([modelData, convData, profileData]) => { if (!alive) return; setModels(modelData); setConversations(convData); setProfile(profileData); setSelectedModel(prev => prev ?? modelData[0]?.id ?? null) }).catch(err => { if (alive) setError(err.message) }).finally(() => { if (alive) setLoading(false) })
    return () => { alive = false }
  }, [])
  useEffect(() => {
    if (!currentId) { setMessages([]); setThreadLoading(false); return }
    let alive = true; setThreadLoading(true); setMessages([]); setError('')
    api<Conversation & { messages: Message[] }>(`conversations?id=${currentId}`).then(data => { if (alive) { setMessages(data.messages); if (models.some(m => m.id === data.model_id)) setSelectedModel(data.model_id) } }).catch(err => { if (alive) setError(err.message) }).finally(() => { if (alive) setThreadLoading(false) })
    return () => { alive = false }
  }, [currentId, models])
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages, sending])
  useEffect(() => { if (toast) { const timer = window.setTimeout(() => setToast(''), 3500); return () => clearTimeout(timer) } }, [toast])
  async function send(event?: FormEvent) {
    event?.preventDefault()
    const content = draft.trim()
    if (!content || sending) return
    if (!selectedModel) { setError('No model is available yet. Ask an administrator to add one.'); return }
    if (content.length > 12000) { setError('Message is too long (12,000 characters maximum).'); return }
    setDraft(''); setError(''); setSending(true)
    const temp: Message = { id: -Date.now(), conversation_id: currentId || 0, role: 'user', content, created_at: new Date().toISOString() }
    setMessages(previous => [...previous, temp])
    try {
      const result = await api<{ conversation_id: number; messages: Message[] }>('chat', { method: 'POST', body: JSON.stringify({ conversation_id: currentId, model_id: selectedModel, content }) })
      if (currentId && result.conversation_id === currentId) setMessages(previous => [...previous.filter(m => m.id !== temp.id), ...result.messages])
      await fetchConversations()
      if (!currentId) navigate(`/app/chat/${result.conversation_id}`)
    } catch (err) { setMessages(previous => previous.filter(m => m.id !== temp.id)); setDraft(content); setError(err instanceof Error ? err.message : 'Could not send message.') }
    finally { setSending(false); textareaRef.current?.focus() }
  }
  function onKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); void send() } }
  async function createConversation() {
    if (!selectedModel) return setError('No active models available.')
    try { const conversation = await api<Conversation>('conversations', { method: 'POST', body: JSON.stringify({ title: 'New conversation', model_id: selectedModel }) }); await fetchConversations(); setMobileSidebar(false); navigate(`/app/chat/${conversation.id}`); textareaRef.current?.focus() }
    catch (err) { setError(err instanceof Error ? err.message : 'Could not create conversation.') }
  }
  async function renameConversation(conversationId: number) {
    if (!editTitle.trim()) return setError('Enter a name for this conversation.')
    try { await api('conversations', { method: 'PUT', body: JSON.stringify({ id: conversationId, title: editTitle.trim() }) }); await fetchConversations(); setEditingId(null); notify('Conversation renamed') }
    catch (err) { setError(err instanceof Error ? err.message : 'Could not rename conversation.') }
  }
  async function deleteConversation(conversationId: number) {
    if (!window.confirm('Delete this conversation and all its messages? This cannot be undone.')) return
    try { await api('conversations', { method: 'DELETE', body: JSON.stringify({ id: conversationId }) }); await fetchConversations(); setMenuId(null); if (currentId === conversationId) navigate('/app'); notify('Conversation deleted') }
    catch (err) { setError(err instanceof Error ? err.message : 'Could not delete conversation.') }
  }
  async function signOut() { await supabase.auth.signOut(); navigate('/') }
  const filtered = conversations.filter(c => c.title.toLowerCase().includes(search.toLowerCase()))
  return <div className="workspace">
    {mobileSidebar && <div className="sidebar-scrim" onClick={() => setMobileSidebar(false)}/>}
    <aside className={`sidebar ${mobileSidebar ? 'mobile-open' : ''} ${sidebarCollapsed ? 'collapsed' : ''}`}><div className="sidebar-top"><Brand compact={sidebarCollapsed}/><button className="icon-button sidebar-close" onClick={() => { setSidebarCollapsed(!sidebarCollapsed); setMobileSidebar(false) }} title="Toggle sidebar"><PanelLeftClose size={19}/></button></div><div className="sidebar-body"><button className="new-chat" onClick={createConversation}><Plus size={19}/><span>New conversation</span><span className="new-shortcut">+</span></button><div className="search-wrap"><Search size={17}/><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search conversations" aria-label="Search conversations"/><kbd>⌘ K</kbd></div><div className="sidebar-section-label">YOUR CONVERSATIONS <span>{conversations.length}</span></div><div className="conversation-list">{loading ? <div className="sidebar-skeleton"><i/><i/><i/><i/></div> : filtered.length ? filtered.map(c => <div key={c.id} className={`conversation-item ${currentId === c.id ? 'active' : ''}`}><button className="conversation-link" onClick={() => { navigate(`/app/chat/${c.id}`); setMobileSidebar(false) }}><MessageSquare size={16}/>{editingId === c.id ? <input autoFocus value={editTitle} onChange={e => setEditTitle(e.target.value)} onClick={e => e.stopPropagation()} onKeyDown={e => { e.stopPropagation(); if (e.key === 'Enter') void renameConversation(c.id); if (e.key === 'Escape') setEditingId(null) }} onBlur={() => setEditingId(null)}/> : <span>{c.title}</span>}</button><button className="conversation-menu-btn" onClick={() => setMenuId(menuId === c.id ? null : c.id)} aria-label="Conversation options"><Ellipsis size={17}/></button>{menuId === c.id && <div className="conversation-menu"><button onClick={() => { setEditingId(c.id); setEditTitle(c.title); setMenuId(null) }}><PenLine size={14}/> Rename</button><button className="danger" onClick={() => void deleteConversation(c.id)}><Trash2 size={14}/> Delete</button></div>}</div>) : <div className="sidebar-empty">{search ? 'No matching conversations' : 'Your conversations will appear here.'}</div>}</div></div><div className="sidebar-footer"><div className="sidebar-tip"><span>✳</span><strong>A little more possibility.</strong><p>Different minds, one workspace. Try switching models any time.</p></div><div className="sidebar-bottom"><Link to="/" className="sidebar-bottom-link"><ArrowLeft size={16}/> Back to site</Link>{profile?.role === 'ADMIN' && <Link to="/admin" className="sidebar-bottom-link"><Settings2 size={16}/> Admin console</Link>}</div><button className="profile-button" onClick={signOut} title="Sign out"><span className="profile-avatar">{(profile?.display_name || user?.email || 'F').slice(0, 1).toUpperCase()}</span><span className="profile-info"><strong>{profile?.display_name || user?.email?.split('@')[0]}</strong><small>{user?.email}</small></span><LogOut size={17}/></button></div></aside>
    <div className="workspace-main"><header className="workspace-header"><div className="workspace-header-left"><button className="icon-button workspace-mobile-menu" onClick={() => setMobileSidebar(true)} aria-label="Open sidebar"><Menu size={21}/></button>{sidebarCollapsed && <button className="icon-button desktop-expand" onClick={() => setSidebarCollapsed(false)} aria-label="Open sidebar"><Menu size={20}/></button>}<span className="workspace-breadcrumb">Workspace</span><span className="breadcrumb-slash">/</span><strong>{activeConversation?.title || 'New conversation'}</strong></div><div className="workspace-header-right"><span className="private-label"><LockIcon/> Private workspace</span><ThemeToggle theme={theme} toggle={toggleTheme}/></div></header>
      <div className="chat-scroll" ref={scrollRef} onScroll={e => { const el = e.currentTarget; setShowScroll(el.scrollHeight - el.scrollTop - el.clientHeight > 160) }}><div className="chat-inner">{threadLoading ? <div className="chat-loading"><div className="message-skeleton"><i/><i/><i/></div><div className="message-skeleton second"><i/><i/><i/></div></div> : messages.length ? <div className="message-list">{messages.map(message => <div key={message.id} className={`message-row ${message.role}`}><div className="message-avatar">{message.role === 'assistant' ? '✳' : (profile?.display_name || user?.email || 'Y').slice(0, 1).toUpperCase()}</div><div className="message-content"><div className="message-meta"><strong>{message.role === 'assistant' ? currentModel?.display_name || 'FLAX AI' : 'You'}</strong><span>{message.id > 0 ? new Date(message.created_at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) : 'now'}</span></div><Markdown content={message.content}/>{message.role === 'assistant' && <button className="copy-message" onClick={async () => { await navigator.clipboard.writeText(message.content); notify('Copied to clipboard') }}><Copy size={14}/> Copy</button>}</div></div>)}{sending && <div className="message-row assistant"><div className="message-avatar">✳</div><div className="message-content"><div className="message-meta"><strong>{currentModel?.display_name || 'FLAX AI'}</strong></div><div className="thinking"><i/><i/><i/><span>Thinking through your question...</span></div></div></div>}</div> : <div className="chat-empty"><div className="chat-empty-symbol">✳</div><span className="section-kicker">A FRESH PERSPECTIVE STARTS HERE</span><h1>What’s on your mind<span>?</span></h1><p>Choose a model, ask anything, and see where the conversation takes you.</p><div className="suggestion-grid"><button onClick={() => { setDraft('Help me brainstorm a fresh idea for a creative project.'); textareaRef.current?.focus() }}><Sparkles size={17}/> Brainstorm an idea <ArrowRight size={16}/></button><button onClick={() => { setDraft('Explain a complex topic to me in simple terms.'); textareaRef.current?.focus() }}><MessageSquare size={17}/> Explain a concept <ArrowRight size={16}/></button></div></div>}<div ref={bottomRef}/></div></div>
      {showScroll && <button className="scroll-bottom" onClick={() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' })} aria-label="Scroll to latest message"><ArrowDown size={17}/></button>}
      <div className="composer-area"><div className="composer-inner">{error && <div className="chat-error" role="alert"><span>{error}</span><button onClick={() => setError('')} aria-label="Dismiss error"><X size={15}/></button></div>}<div className="composer"><div className="composer-top"><div className="model-picker-wrap"><button className={`model-picker ${modelOpen ? 'open' : ''}`} onClick={() => setModelOpen(!modelOpen)} disabled={!models.length}><ModelIcon provider={currentModel?.provider || 'AI'} size={17}/><span>{currentModel?.display_name || 'Select a model'}</span><ChevronDown size={15}/></button>{modelOpen && <div className="model-popover"><div className="popover-head"><span>CHOOSE YOUR MODEL</span><button onClick={() => setModelOpen(false)} aria-label="Close model selector"><X size={15}/></button></div><div className="model-options">{models.map(model => <button key={model.id} onClick={() => { setSelectedModel(model.id); setModelOpen(false); notify(`Switched to ${model.display_name}`) }} className={selectedModel === model.id ? 'selected' : ''}><ModelIcon provider={model.provider} size={20}/><span className="model-option-copy"><strong>{model.display_name} {model.badge && <em>{model.badge}</em>}</strong><small>{model.description}</small></span>{selectedModel === model.id && <Check size={16} className="selected-check"/>}</button>)}</div><div className="popover-footer">Models are provided through AbhiBots Opus</div></div>}</div><span className="composer-helper">Shift + Enter for new line</span></div><form onSubmit={send}><textarea ref={textareaRef} value={draft} onChange={e => setDraft(e.target.value)} onKeyDown={onKeyDown} placeholder="Ask anything, imagine everything..." rows={2} maxLength={12000} disabled={sending || threadLoading}/><div className="composer-bottom"><span><Sparkles size={14}/> Make something wonderful.</span><button type="submit" className="send-button" disabled={!draft.trim() || sending || !selectedModel} aria-label="Send message">{sending ? <span className="spinner small"/> : <Send size={18}/>}</button></div></form></div><p className="composer-disclaimer">FLAX AI can make mistakes. Check important information.</p></div></div>
    </div>{toast && <div className="toast"><Check size={17}/>{toast}</div>}
  </div>
}
function LockIcon() { return <span className="lock-dot"/> }
