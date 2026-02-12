import { useState } from 'react'
import { HiDocumentText, HiOutlineDocumentMagnifyingGlass, HiOutlineListBullet, HiSparkles, HiOutlineLightBulb } from 'react-icons/hi2'
import FileDropZone from '../components/FileDropZone'
import ProgressBar from '../components/ProgressBar'
import { apiUrl } from '../api'

type SummaryResult = {
    summary: string
    sentences: string[]
    meta: {
        length: string
        totalSentences: number
    }
}

export default function PdfSummarizer() {
    const [file, setFile] = useState<File | null>(null)
    const [length, setLength] = useState<'short' | 'medium' | 'long'>('medium')
    const [busy, setBusy] = useState(false)
    const [error, setError] = useState('')
    const [result, setResult] = useState<SummaryResult | null>(null)

    const handleFiles = (files: File[]) => {
        if (files[0]) {
            setFile(files[0])
            setResult(null)
            setError('')
        }
    }

    const runSummary = async () => {
        if (!file) return
        setBusy(true)
        setError('')
        setResult(null)

        const formData = new FormData()
        formData.append('file', file)
        formData.append('length', length)

        try {
            const response = await fetch(apiUrl('/api/pdf/summarize'), {
                method: 'POST',
                body: formData,
            })

            const data = await response.json()

            if (data.success) {
                setResult(data)
            } else {
                setError(data.message || 'Summarization failed.')
            }
        } catch (err) {
            setError('Connection error. Is the server running?')
        } finally {
            setBusy(false)
        }
    }

    return (
        <div className="card">
            <h2 style={{ marginTop: 0 }}>
                <HiOutlineDocumentMagnifyingGlass style={{ verticalAlign: 'middle', marginRight: '8px' }} />
                PDF Summarizer (No AI)
            </h2>
            <p style={{ color: 'var(--text-muted)', marginBottom: '1.25rem', fontSize: '0.9rem' }}>
                Extract key sentences from your PDF documents instantly using local processing.
            </p>

            <FileDropZone
                accept=".pdf,application/pdf"
                multiple={false}
                onFiles={handleFiles}
                label={file ? `Selected: ${file.name}` : 'Drop your PDF here or click to browse'}
                hint="Maximum size: 10MB"
                icon={<HiDocumentText />}
            />

            {file && (
                <div style={{ marginTop: '1.25rem', animation: 'fadeSlideIn 0.3s ease' }}>
                    <div className="option-row" style={{ marginBottom: '1rem' }}>
                        <label style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>Summary length:</label>
                        <div className="tool-selector">
                            {(['short', 'medium', 'long'] as const).map((l) => (
                                <button
                                    key={l}
                                    className={length === l ? 'tool-btn active' : 'tool-btn'}
                                    onClick={() => setLength(l)}
                                    style={{ textTransform: 'capitalize' }}
                                >
                                    {l}
                                </button>
                            ))}
                        </div>
                    </div>

                    <button className="cta" onClick={runSummary} disabled={busy} style={{ width: '100%' }}>
                        {busy ? '⏳ Summarizing…' : <><HiSparkles /> Generate Summary</>}
                    </button>
                    {busy && <ProgressBar value={50} label="Extracting text and analyzing patterns..." />}
                </div>
            )}

            {error && <p className="error-msg">{error}</p>}

            {result && (
                <div className="video-preview-section" style={{ marginTop: '1.5rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                        <h3 style={{ margin: 0 }}>
                            <HiOutlineLightBulb style={{ verticalAlign: 'middle', marginRight: '6px' }} />
                            Key Findings
                        </h3>
                        <span className="platform-badge">
                            {result.meta.totalSentences} sentences processed
                        </span>
                    </div>

                    <div style={{ background: 'var(--bg-hover)', padding: '1.25rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', lineHeight: '1.6' }}>
                        {result.summary}
                    </div>

                    <h4 style={{ marginTop: '1.5rem', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <HiOutlineListBullet /> Key Sentences
                    </h4>
                    <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        {result.sentences.map((sentence, i) => (
                            <li key={i} className="file-item" style={{ fontSize: '0.88rem', alignItems: 'flex-start', padding: '0.75rem' }}>
                                <span style={{ color: 'var(--accent)', fontWeight: 'bold', marginRight: '0.5rem' }}>{i + 1}.</span>
                                <span>{sentence}</span>
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    )
}
