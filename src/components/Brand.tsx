import { Link } from 'react-router-dom'
export default function Brand({ compact = false }: { compact?: boolean }) {
  return <Link to="/" className="brand" aria-label="FLAX AI home"><span className="brand-mark"><span className="brand-petal p1"/><span className="brand-petal p2"/><span className="brand-petal p3"/><span className="brand-petal p4"/><span className="brand-dot"/></span>{!compact && <span className="brand-word">FLAX<span> AI</span></span>}</Link>
}
