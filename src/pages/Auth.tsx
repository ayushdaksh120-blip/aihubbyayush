import { useState, type FormEvent } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { ArrowLeft, ArrowRight, Eye, EyeOff, LockKeyhole, Sparkles } from 'lucide-react'
import Brand from '../components/Brand'
import { useAuth } from '../contexts/AuthContext'
import supabase from '../lib/supabase'
import { signInWithGoogle } from '../lib/googleAuth'

export default function Auth({ signup }: { signup: boolean }) {
  const { user, loading } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  if (loading) return <div className="screen-loading"><span className="spinner"/> Loading your space...</div>
  if (user) return <Navigate to="/app" replace />
  async function submit(event: FormEvent) {
    event.preventDefault(); setError(''); setSuccess('')
    if (!email.includes('@')) return setError('Enter a valid email address.')
    if (password.length < 6) return setError('Password must be at least 6 characters.')
    setBusy(true)
    try {
      const result = signup ? await supabase.auth.signUp({ email, password }) : await supabase.auth.signInWithPassword({ email, password })
      if (result.error) throw result.error
      if (result.data.session) navigate('/app')
      else setSuccess('Check your inbox for a confirmation link, then sign in.')
    } catch (err) { setError(err instanceof Error ? err.message : 'Could not continue. Try again.') }
    finally { setBusy(false) }
  }
  return <div className="auth-page"><div className="auth-left"><Link to="/" className="auth-back"><ArrowLeft size={17}/> Back to home</Link><div className="auth-quote"><span className="auth-asterisk">✳</span><h2>Make room for<br/><em>what's possible.</em></h2><p>All the intelligence you need. One place to let your ideas grow.</p></div><div className="auth-bottom"><span>FLAX AI</span><span>ONE PLACE FOR EVERY AI.</span></div></div><div className="auth-right"><div className="auth-top-brand"><Brand/></div><div className="auth-form-wrap"><div className="auth-form-icon"><Sparkles size={22}/></div><span className="section-kicker">YOUR SPACE STARTS HERE</span><h1>{signup ? 'Create your account.' : 'Welcome back.'}</h1><p>{signup ? 'A better way to think is just around the corner.' : 'Ready to pick up where you left off?'}</p><form onSubmit={submit} className="auth-form"><label>Email address<input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" autoComplete="email" required/></label><label>Password<div className="password-field"><input type={showPassword ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} placeholder="At least 6 characters" autoComplete={signup ? 'new-password' : 'current-password'} required minLength={6}/><button type="button" onClick={() => setShowPassword(!showPassword)} aria-label={showPassword ? 'Hide password' : 'Show password'}>{showPassword ? <EyeOff size={18}/> : <Eye size={18}/>}</button></div></label>{error && <div className="form-error" role="alert">{error}</div>}{success && <div className="form-success" role="status">{success}</div>}<button className="btn btn-dark auth-submit" disabled={busy}>{busy ? <span className="spinner small"/> : <>{signup ? 'Create account' : 'Sign in'} <ArrowRight size={18}/></>}</button></form><div className="auth-divider"><span>or continue with</span></div><button className="google-button" onClick={() => { try { signInWithGoogle() } catch (err) { setError(err instanceof Error ? err.message : 'Google sign-in unavailable.') } }}><span className="google-g">G</span> Google</button><div className="auth-switch">{signup ? 'Already have an account?' : 'New to FLAX?'} <Link to={signup ? '/login' : '/signup'}>{signup ? 'Sign in' : 'Create an account'}</Link></div></div><div className="auth-secure"><LockKeyhole size={14}/> Your space, securely yours.</div></div></div>
}
