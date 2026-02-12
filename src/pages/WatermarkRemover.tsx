import { useState, useRef, useCallback, useEffect } from 'react'
import { HiSparkles, HiPaintBrush, HiArrowPath } from 'react-icons/hi2'
import FileDropZone from '../components/FileDropZone'
import { loadImage, removeWatermarkFromCanvas, imageToBlob } from '../lib/imageUtils'
import ProgressBar from '../components/ProgressBar'

type Rect = { x: number; y: number; w: number; h: number } | null

export default function WatermarkRemover() {
  const [files, setFiles] = useState<File[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [resultUrl, setResultUrl] = useState<string | null>(null)
  const [selecting, setSelecting] = useState<Rect>(null)
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null)
  const [progress, setProgress] = useState(0)
  const [busy, setBusy] = useState(false)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const imgRef = useRef<HTMLImageElement | null>(null)

  const currentFile = files[currentIndex]

  const scaleRef = useRef(1)

  const drawCanvas = useCallback((img: HTMLImageElement, rect: Rect = null) => {
    const canvas = canvasRef.current
    if (!canvas || !img) return
    const ctx = canvas.getContext('2d')!
    const maxW = 600
    const maxH = 400
    let w = img.width
    let h = img.height
    if (w > maxW || h > maxH) {
      const r = Math.min(maxW / w, maxH / h)
      w = Math.round(w * r)
      h = Math.round(h * r)
      scaleRef.current = img.width / w
    } else {
      scaleRef.current = 1
    }
    canvas.width = w
    canvas.height = h
    ctx.drawImage(img, 0, 0, w, h)
    if (rect) {
      ctx.strokeStyle = '#6366f1'
      ctx.lineWidth = 2
      ctx.setLineDash([6, 3])
      ctx.strokeRect(rect.x, rect.y, rect.w, rect.h)
      ctx.setLineDash([])
      // Semi-transparent overlay on selected area
      ctx.fillStyle = 'rgba(99, 102, 241, 0.15)'
      ctx.fillRect(rect.x, rect.y, rect.w, rect.h)
    }
  }, [])

  const handleFiles = useCallback((newFiles: File[]) => {
    setFiles(newFiles)
    setCurrentIndex(0)
    setResultUrl(null)
    setSelecting(null)
  }, [])

  useEffect(() => {
    if (!currentFile || !canvasRef.current) return
    let cancelled = false
    loadImage(currentFile).then((img) => {
      if (cancelled) return
      imgRef.current = img
      drawCanvas(img, null)
    })
    return () => { cancelled = true }
  }, [currentFile, currentIndex, drawCanvas])

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!currentFile || busy) return
    const canvas = canvasRef.current
    if (!canvas) return
    const r = canvas.getBoundingClientRect()
    const scaleX = canvas.width / r.width
    const scaleY = canvas.height / r.height
    const x = (e.clientX - r.left) * scaleX
    const y = (e.clientY - r.top) * scaleY
    setDragStart({ x, y })
    setSelecting({ x, y, w: 0, h: 0 })
  }

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!dragStart || !imgRef.current) return
    const canvas = canvasRef.current
    if (!canvas) return
    const r = canvas.getBoundingClientRect()
    const scaleX = canvas.width / r.width
    const scaleY = canvas.height / r.height
    const x = (e.clientX - r.left) * scaleX
    const y = (e.clientY - r.top) * scaleY
    const w = x - dragStart.x
    const h = y - dragStart.y
    const rect = {
      x: w >= 0 ? dragStart.x : x,
      y: h >= 0 ? dragStart.y : y,
      w: Math.abs(w),
      h: Math.abs(h),
    }
    setSelecting(rect)
    drawCanvas(imgRef.current, rect)
  }

  const handleMouseUp = () => {
    setDragStart(null)
  }

  const removeSelected = async () => {
    if (!selecting || selecting.w < 2 || selecting.h < 2 || !imgRef.current || !canvasRef.current || busy) return
    setBusy(true)
    setProgress(0)
    try {
      const img = imgRef.current
      const scale = scaleRef.current
      const fullCanvas = document.createElement('canvas')
      fullCanvas.width = img.width
      fullCanvas.height = img.height
      const ctx = fullCanvas.getContext('2d')!
      ctx.drawImage(img, 0, 0)
      setProgress(50)
      const x = Math.round(selecting.x * scale)
      const y = Math.round(selecting.y * scale)
      const w = Math.round(selecting.w * scale)
      const h = Math.round(selecting.h * scale)
      const out = removeWatermarkFromCanvas(fullCanvas, x, y, w, h)
      setProgress(90)
      const blob = await imageToBlob(out, currentFile?.type || 'image/png')
      setResultUrl(URL.createObjectURL(blob))
      setProgress(100)
    } finally {
      setBusy(false)
    }
  }

  const processBatch = async () => {
    if (!files.length) return
    setBusy(true)
    setProgress(0)
    const results: string[] = []
    for (let i = 0; i < files.length; i++) {
      setCurrentIndex(i)
      const img = await loadImage(files[i])
      const canvas = document.createElement('canvas')
      canvas.width = img.width
      canvas.height = img.height
      const ctx = canvas.getContext('2d')!
      ctx.drawImage(img, 0, 0)
      const out = removeWatermarkFromCanvas(canvas, 0, 0, 0, 0)
      const blob = await imageToBlob(out, files[i].type || 'image/png')
      results.push(URL.createObjectURL(blob))
      setProgress(((i + 1) / files.length) * 100)
    }
    setResultUrl(results[0])
    setBusy(false)
  }

  const downloadResult = () => {
    if (!resultUrl) return
    const a = document.createElement('a')
    a.href = resultUrl
    a.download = currentFile ? `no-watermark-${currentFile.name}` : 'result.png'
    a.click()
  }

  return (
    <div className="card">
      <h2 style={{ marginTop: 0 }}><HiSparkles style={{ verticalAlign: 'middle', marginRight: '8px' }} /> Image Watermark Remover</h2>
      <p style={{ color: 'var(--text-muted)', marginBottom: '1rem', fontSize: '0.9rem' }}>
        Upload images, draw a rectangle over the watermark area, and remove it. Supports batch processing.
      </p>

      <FileDropZone
        accept="image/jpeg,image/png,image/webp"
        multiple
        onFiles={handleFiles}
        label="Drop images here or click to browse"
        hint="JPG, PNG, WEBP — single or multiple files"
        icon={<HiSparkles />}
      />

      {currentFile && (
        <div className="editor-section" style={{ marginTop: '1.25rem', animation: 'fadeSlideIn 0.35s ease' }}>
          {files.length > 1 && (
            <div className="image-nav">
              <span style={{ fontSize: '0.88rem', color: 'var(--text-muted)' }}>
                📷 Image {currentIndex + 1} of {files.length}
              </span>
              <button
                className="secondary"
                style={{ padding: '0.4rem 0.8rem', fontSize: '0.82rem' }}
                onClick={() => setCurrentIndex((i) => (i + 1) % files.length)}
              >
                Next →
              </button>
            </div>
          )}

          <div className="editor-layout">
            <div className="editor-canvas-area">
              <p style={{ marginBottom: '0.5rem', fontSize: '0.88rem', color: 'var(--text-muted)' }}>
                ✏️ Draw a rectangle over the watermark area
              </p>
              <canvas
                ref={canvasRef}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
                className="editor-canvas"
              />
              <div style={{ marginTop: '0.75rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                <button onClick={removeSelected} disabled={!selecting || selecting.w < 2 || busy}>
                  {busy ? '⏳ Processing…' : <><HiPaintBrush /> Remove selected area</>}
                </button>
                {files.length > 1 && (
                  <button className="secondary" onClick={processBatch} disabled={busy}>
                    <HiArrowPath /> Process all ({files.length})
                  </button>
                )}
              </div>
            </div>

            {resultUrl && (
              <div className="editor-result-area">
                <p style={{ marginBottom: '0.5rem', fontSize: '0.88rem', color: 'var(--text-muted)' }}>✅ Result</p>
                <img src={resultUrl} alt="Result" className="editor-result-img" />
                <button className="cta" onClick={downloadResult}>📥 Download result</button>
              </div>
            )}
          </div>

          {busy && <ProgressBar value={progress} label="Processing…" />}
        </div>
      )}
    </div>
  )
}
