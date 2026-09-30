import { Moon, Sun } from 'lucide-react'
export default function ThemeToggle({ theme, toggle }: { theme: 'light' | 'dark'; toggle: () => void }) {
  return <button className="icon-button theme-toggle" onClick={toggle} title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`} aria-label="Toggle color theme">{theme === 'light' ? <Moon size={18}/> : <Sun size={18}/>}</button>
}
