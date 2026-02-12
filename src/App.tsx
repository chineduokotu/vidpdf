import { Routes, Route, NavLink } from 'react-router-dom'
import { HiSparkles } from 'react-icons/hi2'
import VideoDownloader from './pages/VideoDownloader'
import WatermarkRemover from './pages/WatermarkRemover'
import PdfEditor from './pages/PdfEditor'
import FileConverter from './pages/FileConverter'
import PdfSummarizer from './pages/PdfSummarizer'

const nav = [
  { to: '/', label: 'Video Downloader', end: true },
  { to: '/watermark', label: 'Watermark Remover', end: false },
  { to: '/pdf', label: 'PDF Editor', end: false },
  { to: '/summarize', label: 'PDF Summarizer', end: false },
  { to: '/convert', label: 'File Converter', end: false },
]

function App() {
  return (
    <div className="app">
      <header className="app-header">
        <div className="header-top">
          <div className="app-icon"><HiSparkles /></div>
          <h1>Media & Document Converter</h1>
        </div>
        <p className="app-subtitle">
          Download videos, remove watermarks, edit PDFs, and convert files — all in your browser.
        </p>
      </header>
      <nav className="tabs">
        {nav.map(({ to, label, end }) => (
          <NavLink key={to} to={to} end={end} className={({ isActive }) => (isActive ? 'active' : '')}>
            {label}
          </NavLink>
        ))}
      </nav>
      <main>
        <Routes>
          <Route path="/" element={<VideoDownloader />} />
          <Route path="/watermark" element={<WatermarkRemover />} />
          <Route path="/pdf" element={<PdfEditor />} />
          <Route path="/summarize" element={<PdfSummarizer />} />
          <Route path="/convert" element={<FileConverter />} />
        </Routes>
      </main>
    </div>
  )
}

export default App
