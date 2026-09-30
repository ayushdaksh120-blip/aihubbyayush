import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { useState, type ReactNode } from 'react'
import { Check, Copy } from 'lucide-react'

export default function Markdown({ content }: { content: string }) {
  return <div className="markdown"><ReactMarkdown remarkPlugins={[remarkGfm]} components={{
    a: ({ href, children }) => <a href={href} target="_blank" rel="noopener noreferrer">{children}</a>,
    code: ({ className, children, ...props }) => {
      const value = String(children).replace(/\n$/, '')
      if (!className && !value.includes('\n')) return <code {...props}>{children}</code>
      return <CodeBlock className={className} value={value} />
    },
  }}>{content}</ReactMarkdown></div>
}
function CodeBlock({ className, value }: { className?: string; value: string }) {
  const [copied, setCopied] = useState(false)
  const language = className?.replace('language-', '') || 'code'
  const copy = async () => { await navigator.clipboard.writeText(value); setCopied(true); window.setTimeout(() => setCopied(false), 1800) }
  return <div className="code-block"><div className="code-head"><span>{language}</span><button onClick={copy} aria-label="Copy code">{copied ? <Check size={14}/> : <Copy size={14}/>} {copied ? 'Copied' : 'Copy code'}</button></div><pre><code>{value as ReactNode}</code></pre></div>
}
