import { useState } from 'react'
import {
  HiDocumentText,
  HiDocumentDuplicate,
  HiScissors,
  HiArrowPath,
  HiTrash,
  HiPencil,
  HiArrowsPointingIn
} from 'react-icons/hi2'
import FileDropZone from '../components/FileDropZone'
import ProgressBar from '../components/ProgressBar'
import {
  mergePdfs,
  splitPdf,
  rotatePdf,
  removePdfPages,
  addTextToPdf,
  compressPdf,
  downloadBlob,
} from '../lib/pdfUtils'

type Tool = 'merge' | 'split' | 'rotate' | 'remove' | 'annotate' | 'compress'

const pdfTools: { id: Tool; label: string; icon: React.ReactNode; desc: string }[] = [
  { id: 'merge', label: 'Merge', icon: <HiDocumentDuplicate />, desc: 'Combine multiple PDFs into one' },
  { id: 'split', label: 'Split', icon: <HiScissors />, desc: 'Extract pages from a PDF' },
  { id: 'rotate', label: 'Rotate', icon: <HiArrowPath />, desc: 'Rotate all pages' },
  { id: 'remove', label: 'Remove Pages', icon: <HiTrash />, desc: 'Delete specific pages' },
  { id: 'annotate', label: 'Add Text', icon: <HiPencil />, desc: 'Add text overlay to a page' },
  { id: 'compress', label: 'Compress', icon: <HiArrowsPointingIn />, desc: 'Reduce PDF file size' },
]

export default function PdfEditor() {
  const [tool, setTool] = useState<Tool>('merge')
  const [files, setFiles] = useState<File[]>([])
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const [rotateAngle, setRotateAngle] = useState<90 | 180 | 270>(90)
  const [pagesToRemove, setPagesToRemove] = useState('')
  const [annotatePage, setAnnotatePage] = useState(1)
  const [annotateText, setAnnotateText] = useState('')
  const [annotateX, setAnnotateX] = useState(50)
  const [annotateY, setAnnotateY] = useState(50)

  const currentTool = pdfTools.find((t) => t.id === tool)!

  const handleMerge = async () => {
    if (files.length < 2) { setError('Add at least 2 PDFs to merge.'); return }
    setError(''); setMessage(''); setBusy(true); setProgress(0)
    try {
      const out = await mergePdfs(files)
      downloadBlob(out, 'merged.pdf')
      setMessage('✅ Merged and downloaded.')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Merge failed')
    } finally { setBusy(false) }
  }

  const handleSplit = async () => {
    if (!files[0]) { setError('Upload a PDF first.'); return }
    setError(''); setBusy(true); setProgress(0)
    try {
      const ranges = [{ start: 0, end: 0 }]
      const out = await splitPdf(files[0], ranges)
      downloadBlob(out[0], 'split.pdf')
      setMessage('✅ First page downloaded.')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Split failed')
    } finally { setBusy(false) }
  }

  const handleRotate = async () => {
    if (!files[0]) { setError('Upload a PDF first.'); return }
    setError(''); setBusy(true); setProgress(0)
    try {
      const out = await rotatePdf(files[0], rotateAngle)
      downloadBlob(out, 'rotated.pdf')
      setMessage('✅ Rotated and downloaded.')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Rotate failed')
    } finally { setBusy(false) }
  }

  const handleRemovePages = async () => {
    if (!files[0]) { setError('Upload a PDF first.'); return }
    const indexes = pagesToRemove
      .split(/[\s,]+/)
      .map((s) => parseInt(s.trim(), 10) - 1)
      .filter((n) => !Number.isNaN(n) && n >= 0)
    if (!indexes.length) { setError('Enter page numbers to remove (e.g. 1, 3, 5).'); return }
    setError(''); setBusy(true); setProgress(0)
    try {
      const out = await removePdfPages(files[0], indexes)
      downloadBlob(out, 'removed-pages.pdf')
      setMessage('✅ Pages removed and downloaded.')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Remove failed')
    } finally { setBusy(false) }
  }

  const handleAnnotate = async () => {
    if (!files[0] || !annotateText.trim()) { setError('Upload a PDF and enter text.'); return }
    setError(''); setBusy(true); setProgress(0)
    try {
      const out = await addTextToPdf(files[0], annotatePage - 1, annotateText.trim(), annotateX, annotateY)
      downloadBlob(out, 'annotated.pdf')
      setMessage('✅ Text added and downloaded.')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Annotate failed')
    } finally { setBusy(false) }
  }

  const handleCompress = async () => {
    if (!files[0]) { setError('Upload a PDF first.'); return }
    setError(''); setBusy(true); setProgress(0)
    try {
      const out = await compressPdf(files[0])
      downloadBlob(out, 'compressed.pdf')
      setMessage('✅ Compressed and downloaded.')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Compress failed')
    } finally { setBusy(false) }
  }

  const actionMap: Record<Tool, () => Promise<void>> = {
    merge: handleMerge,
    split: handleSplit,
    rotate: handleRotate,
    remove: handleRemovePages,
    annotate: handleAnnotate,
    compress: handleCompress,
  }

  return (
    <div className="card">
      <h2 style={{ marginTop: 0 }}><HiDocumentText style={{ verticalAlign: 'middle', marginRight: '8px' }} /> PDF Editor</h2>
      <p style={{ color: 'var(--text-muted)', marginBottom: '1rem', fontSize: '0.9rem' }}>
        Merge, split, rotate, remove pages, add text, or compress PDFs — all in your browser.
      </p>

      <div className="tool-selector">
        {pdfTools.map((t) => (
          <button
            key={t.id}
            className={tool === t.id ? 'tool-btn active' : 'tool-btn'}
            onClick={() => { setTool(t.id); setFiles([]); setError(''); setMessage('') }}
            title={t.desc}
          >
            <span className="tool-btn-icon">{t.icon}</span>
            {t.label}
          </button>
        ))}
      </div>

      <div style={{ marginTop: '1.25rem' }}>
        <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
          {currentTool.icon} {currentTool.desc}
        </p>

        <FileDropZone
          accept=".pdf,application/pdf"
          multiple={tool === 'merge'}
          onFiles={setFiles}
          label={tool === 'merge' ? 'Drop PDFs to merge (order = page order)' : 'Drop a PDF here'}
          hint={tool === 'merge' ? 'Multiple PDF files' : 'Single PDF file'}
          icon="📄"
        />

        {files.length > 0 && (
          <div className="file-list">
            {files.map((f, i) => (
              <div key={i} className="file-item">
                <span className="file-item-icon"><HiDocumentText /></span>
                <span className="file-item-name">{f.name}</span>
                <span className="file-item-size">{(f.size / 1024).toFixed(1)} KB</span>
              </div>
            ))}
          </div>
        )}

        {/* Tool-specific options */}
        {tool === 'rotate' && (
          <div className="option-row">
            <label style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>Rotation angle:</label>
            <select value={rotateAngle} onChange={(e) => setRotateAngle(Number(e.target.value) as 90 | 180 | 270)}>
              <option value={90}>90°</option>
              <option value={180}>180°</option>
              <option value={270}>270°</option>
            </select>
          </div>
        )}

        {tool === 'remove' && (
          <div className="option-row">
            <input
              placeholder="Page numbers to remove (e.g. 1, 3, 5)"
              value={pagesToRemove}
              onChange={(e) => setPagesToRemove(e.target.value)}
              style={{ flex: 1, maxWidth: 320 }}
            />
          </div>
        )}

        {tool === 'annotate' && (
          <div className="annotate-options">
            <input
              placeholder="Text to add…"
              value={annotateText}
              onChange={(e) => setAnnotateText(e.target.value)}
              style={{ width: '100%' }}
            />
            <div className="annotate-coords">
              <label>
                Page
                <input type="number" min={1} value={annotatePage} onChange={(e) => setAnnotatePage(Number(e.target.value))} />
              </label>
              <label>
                X
                <input type="number" value={annotateX} onChange={(e) => setAnnotateX(Number(e.target.value))} />
              </label>
              <label>
                Y
                <input type="number" value={annotateY} onChange={(e) => setAnnotateY(Number(e.target.value))} />
              </label>
            </div>
          </div>
        )}

        <button
          className="cta"
          onClick={actionMap[tool]}
          disabled={!files.length || busy || (tool === 'annotate' && !annotateText.trim())}
          style={{ marginTop: '1rem' }}
        >
          {busy ? '⏳ Processing…' : `⬇ ${currentTool.label} and download`}
        </button>
      </div>

      {busy && progress > 0 && progress < 100 && <ProgressBar value={progress} label="Processing…" />}
      {error && <p className="error-msg">{error}</p>}
      {message && <p className="success-msg">{message}</p>}
    </div>
  )
}
