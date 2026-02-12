import { useState } from 'react'
import {
  HiArrowsRightLeft,
  HiPhoto,
  HiDocumentText,
  HiTableCells,
  HiPencilSquare,
  HiDocumentChartBar,
  HiArrowUpOnSquare,
  HiPaperClip
} from 'react-icons/hi2'
import FileDropZone from '../components/FileDropZone'
import ProgressBar from '../components/ProgressBar'
import {
  imagesToPdf,
  pdfToImages,
  pdfToExcel,
  excelToPdf,
  wordToPdf,
  downloadBytes,
  downloadBlob,
} from '../lib/convertUtils'

type Conversion = 'img2pdf' | 'pdf2img' | 'pdf2excel' | 'pdf2word' | 'excel2pdf' | 'word2pdf'

const conversionOptions: { id: Conversion; label: string; icon: React.ReactNode; accept: string; multiple?: boolean; hint: string; dropIcon: React.ReactNode }[] = [
  { id: 'img2pdf', label: 'Image → PDF', icon: <HiPhoto />, accept: 'image/jpeg,image/png,image/webp', multiple: true, hint: 'JPG, PNG, or WEBP images', dropIcon: <HiPhoto /> },
  { id: 'pdf2img', label: 'PDF → Images', icon: <HiDocumentText />, accept: '.pdf,application/pdf', hint: 'Single PDF file', dropIcon: <HiDocumentText /> },
  { id: 'pdf2excel', label: 'PDF → Excel', icon: <HiTableCells />, accept: '.pdf,application/pdf', hint: 'Single PDF file', dropIcon: <HiDocumentText /> },
  { id: 'pdf2word', label: 'PDF → Word', icon: <HiPencilSquare />, accept: '.pdf,application/pdf', hint: 'Single PDF file', dropIcon: <HiDocumentText /> },
  { id: 'excel2pdf', label: 'Excel → PDF', icon: <HiDocumentChartBar />, accept: '.xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', hint: '.xlsx or .xls file', dropIcon: <HiTableCells /> },
  { id: 'word2pdf', label: 'Word → PDF', icon: <HiArrowUpOnSquare />, accept: '.docx,.doc,application/vnd.openxmlformats-officedocument.wordprocessingml.document', hint: '.docx or .doc file', dropIcon: <HiPencilSquare /> },
]

export default function FileConverter() {
  const [conversion, setConversion] = useState<Conversion>('img2pdf')
  const [files, setFiles] = useState<File[]>([])
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)

  const current = conversionOptions.find((o) => o.id === conversion)!

  const run = async () => {
    setError('')
    setMessage('')
    setProgress(0)
    setBusy(true)
    try {
      if (conversion === 'img2pdf') {
        if (!files.length) { setError('Add at least one image.'); return }
        setProgress(30)
        const out = await imagesToPdf(files)
        setProgress(90)
        downloadBytes(out, 'converted.pdf', 'application/pdf')
        setMessage('✅ PDF downloaded successfully.')
      } else if (conversion === 'pdf2img') {
        if (!files[0]) { setError('Upload a PDF.'); return }
        const blobs = await pdfToImages(files[0], (p) => setProgress(p))
        blobs.forEach((blob, i) => downloadBlob(blob, `page-${i + 1}.png`))
        setProgress(100)
        setMessage(`✅ Downloaded ${blobs.length} image(s).`)
      } else if (conversion === 'pdf2excel') {
        if (!files[0]) { setError('Upload a PDF.'); return }
        setProgress(50)
        const out = await pdfToExcel(files[0])
        downloadBytes(out, 'converted.xlsx', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
        setProgress(100)
        setMessage('✅ Excel file downloaded.')
      } else if (conversion === 'pdf2word') {
        setError('PDF to Word is not yet supported in browser. Use a desktop app or server.')
        return
      } else if (conversion === 'excel2pdf') {
        if (!files[0]) { setError('Upload an Excel file.'); return }
        setProgress(50)
        const out = await excelToPdf(files[0])
        downloadBytes(out, 'converted.pdf', 'application/pdf')
        setProgress(100)
        setMessage('✅ PDF downloaded.')
      } else if (conversion === 'word2pdf') {
        if (!files[0]) { setError('Upload a Word file.'); return }
        setProgress(50)
        const out = await wordToPdf(files[0])
        downloadBytes(out, 'converted.pdf', 'application/pdf')
        setProgress(100)
        setMessage('✅ Placeholder PDF downloaded. For production Word→PDF, use a server.')
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Conversion failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="card">
      <h2 style={{ marginTop: 0 }}><HiArrowsRightLeft style={{ verticalAlign: 'middle', marginRight: '8px' }} /> File Conversion</h2>
      <p style={{ color: 'var(--text-muted)', marginBottom: '1rem', fontSize: '0.9rem' }}>
        Convert between images, PDF, Excel, and Word. Processing is done in your browser where possible.
      </p>

      <div className="tool-selector">
        {conversionOptions.map((o) => (
          <button
            key={o.id}
            className={conversion === o.id ? 'tool-btn active' : 'tool-btn'}
            onClick={() => { setConversion(o.id); setFiles([]); setError(''); setMessage('') }}
          >
            <span className="tool-btn-icon">{o.icon}</span>
            {o.label}
          </button>
        ))}
      </div>

      <div style={{ marginTop: '1.25rem' }}>
        <FileDropZone
          accept={current.accept}
          multiple={current.multiple ?? false}
          onFiles={setFiles}
          label={`Drop file(s) for ${current.label}`}
          hint={current.hint}
          icon={current.dropIcon}
        />

        {files.length > 0 && (
          <div className="file-list">
            {files.map((f, i) => (
              <div key={i} className="file-item">
                <span className="file-item-icon"><HiPaperClip /></span>
                <span className="file-item-name">{f.name}</span>
                <span className="file-item-size">{(f.size / 1024).toFixed(1)} KB</span>
              </div>
            ))}
          </div>
        )}

        <button className="cta" onClick={run} disabled={!files.length || busy} style={{ marginTop: '1rem' }}>
          {busy ? '⏳ Converting…' : '⬇ Convert and download'}
        </button>
      </div>

      {busy && progress > 0 && progress < 100 && <ProgressBar value={progress} label="Converting…" />}
      {error && <p className="error-msg">{error}</p>}
      {message && <p className="success-msg">{message}</p>}
    </div>
  )
}
