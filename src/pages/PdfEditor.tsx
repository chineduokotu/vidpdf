import { useState, useRef, useEffect } from 'react'
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
  const [splitRangesText, setSplitRangesText] = useState('')

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [pdfScale, setPdfScale] = useState(1)

  useEffect(() => {
    if (tool !== 'annotate' || !files[0]) return
    let cancelled = false

    const renderPage = async () => {
      try {
        const pdfjsLib = await import('pdfjs-dist')
        pdfjsLib.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`

        const buf = await files[0].arrayBuffer()
        const pdf = await pdfjsLib.getDocument(buf).promise
        if (cancelled) return

        const pageIdx = Math.max(1, Math.min(annotatePage, pdf.numPages))
        const page = await pdf.getPage(pageIdx)
        if (cancelled) return

        const viewport = page.getViewport({ scale: 1 })
        const canvas = canvasRef.current
        if (!canvas) return

        const maxWidth = 600
        const scale = viewport.width > maxWidth ? maxWidth / viewport.width : 1
        setPdfScale(scale)

        const scaledViewport = page.getViewport({ scale })
        canvas.width = scaledViewport.width
        canvas.height = scaledViewport.height

        const ctx = canvas.getContext('2d')!
        await page.render({ canvasContext: ctx, viewport: scaledViewport }).promise
      } catch (e) {
        console.error('Failed to render PDF preview', e)
      }
    }
    renderPage()

    return () => {
      cancelled = true
    }
  }, [tool, files, annotatePage])

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current) return
    const rect = canvasRef.current.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    setAnnotateX(Math.round(x / pdfScale))
    setAnnotateY(Math.round(y / pdfScale))
  }

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
      const ranges: { start: number; end: number }[] = []
      if (!splitRangesText.trim()) {
        throw new Error('Please specify a page range (e.g., "1-3, 5")')
      }
      
      const parts = splitRangesText.split(',')
      for (const p of parts) {
        const s = p.trim()
        if (!s) continue
        if (s.includes('-')) {
          const [startStr, endStr] = s.split('-')
          const start = parseInt(startStr, 10)
          const end = parseInt(endStr, 10)
          if (isNaN(start) || isNaN(end) || start < 1 || end < start) {
            throw new Error(`Invalid range format: ${s}`)
          }
          ranges.push({ start: start - 1, end: end - 1 })
        } else {
          const n = parseInt(s, 10)
          if (isNaN(n) || n < 1) {
            throw new Error(`Invalid page number: ${s}`)
          }
          ranges.push({ start: n - 1, end: n - 1 })
        }
      }

      if (ranges.length === 0) throw new Error('No valid ranges provided')

      const out = await splitPdf(files[0], ranges)
      
      if (out.length === 1) {
        downloadBlob(out[0], 'split.pdf')
        setMessage('✅ Split PDF downloaded.')
      } else {
        const JSZip = (await import('jszip')).default
        const zip = new JSZip()
        out.forEach((pdfData, index) => {
          zip.file(`split-part-${index + 1}.pdf`, pdfData)
        })
        const zipBlob = await zip.generateAsync({ type: 'blob' })
        const a = document.createElement('a')
        a.href = URL.createObjectURL(zipBlob)
        a.download = 'split-pdfs.zip'
        a.click()
        URL.revokeObjectURL(a.href)
        setMessage(`✅ Split into ${out.length} PDFs and downloaded as a ZIP file.`)
      }
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
        {tool === 'split' && (
          <div className="option-row">
            <input
              placeholder="Ranges to split into separate PDFs (e.g. 1-3, 5, 7-10)"
              value={splitRangesText}
              onChange={(e) => setSplitRangesText(e.target.value)}
              style={{ flex: 1, maxWidth: 360 }}
            />
          </div>
        )}
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
              style={{ width: '100%', marginBottom: '1rem' }}
            />
            {files.length > 0 && (
              <div style={{ position: 'relative', border: '1px solid var(--border)', background: '#fff', borderRadius: '4px', overflow: 'hidden', margin: '0 auto', width: 'fit-content' }}>
                <p style={{ position: 'absolute', top: 10, left: 10, background: 'rgba(0,0,0,0.6)', color: '#fff', padding: '4px 8px', borderRadius: '4px', fontSize: '0.8rem', pointerEvents: 'none' }}>
                  Click on the document to place text
                </p>
                <canvas
                  ref={canvasRef}
                  onClick={handleCanvasClick}
                  style={{ display: 'block', cursor: 'crosshair', maxWidth: '100%' }}
                />
                {annotateX > 0 && annotateY > 0 && (
                  <div
                    style={{
                      position: 'absolute',
                      left: annotateX * pdfScale,
                      top: annotateY * pdfScale,
                      color: 'red',
                      fontSize: `${12 * pdfScale}px`,
                      pointerEvents: 'none',
                      whiteSpace: 'nowrap',
                      transform: 'translateY(-100%)',
                      fontFamily: 'Helvetica, Arial, sans-serif'
                    }}
                  >
                    {annotateText || 'Sample Text'}
                  </div>
                )}
              </div>
            )}
            <div className="annotate-coords" style={{ marginTop: '1rem', display: 'flex', gap: '1rem', alignItems: 'center' }}>
              <label>
                Page
                <input type="number" min={1} value={annotatePage} onChange={(e) => setAnnotatePage(Number(e.target.value))} style={{ width: '60px', marginLeft: '0.5rem' }} />
              </label>
              <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                Position: X: {annotateX}, Y: {annotateY}
              </div>
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
