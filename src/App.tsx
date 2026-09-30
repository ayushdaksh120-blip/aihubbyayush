import { useEffect, useState, type ReactNode } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import Landing from './pages/Landing'
import Auth from './pages/Auth'
import Dashboard from './pages/Dashboard'
import Admin from './pages/Admin'
import { handleGoogleRedirect } from './lib/googleAuth'

void handleGoogleRedirect()
function Protected({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth()
  if (loading) return <div className="screen-loading"><span className="spinner"/> Opening your workspace...</div>
  return user ? children : <Navigate to="/login" replace />
}
function AppRoutes() {
  const [theme, setTheme] = useState<'light' | 'dark'>(() => localStorage.getItem('flax-theme') === 'dark' ? 'dark' : 'light')
  useEffect(() => { document.documentElement.setAttribute('data-theme', theme); localStorage.setItem('flax-theme', theme) }, [theme])
  const toggleTheme = () => setTheme(previous => previous === 'light' ? 'dark' : 'light')
  return <Routes>
    <Route path="/" element={<Landing theme={theme} toggleTheme={toggleTheme}/>} />
    <Route path="/login" element={<Auth signup={false}/>} />
    <Route path="/signup" element={<Auth signup/>} />
    <Route path="/app" element={<Protected><Dashboard theme={theme} toggleTheme={toggleTheme}/></Protected>} />
    <Route path="/app/chat/:id" element={<Protected><Dashboard theme={theme} toggleTheme={toggleTheme}/></Protected>} />
    <Route path="/admin" element={<Protected><Admin theme={theme} toggleTheme={toggleTheme}/></Protected>} />
    <Route path="*" element={<Navigate to="/" replace/>} />
  </Routes>
}
export default function App() { return <BrowserRouter><AuthProvider><AppRoutes/></AuthProvider></BrowserRouter> }
