type Props = { value: number; max?: number; label?: string }

export default function ProgressBar({ value, max = 100, label }: Props) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100))
  return (
    <div>
      {label && <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>{label}</span>}
      <div className="progress-bar">
        <div style={{ width: `${pct}%`, height: '100%', background: 'var(--accent)', transition: 'width 0.3s' }} />
      </div>
    </div>
  )
}
