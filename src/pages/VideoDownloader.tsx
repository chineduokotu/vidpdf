import { useState } from 'react'
import { HiVideoCamera, HiMagnifyingGlass, HiArrowDownTray } from 'react-icons/hi2'
import { FaYoutube, FaInstagram, FaTiktok, FaFacebook, FaXTwitter } from 'react-icons/fa6'
import { fetchVideoInfo, formatDuration, formatSize, getDownloadUrl, type VideoInfo } from '../lib/videoApi'
import ProgressBar from '../components/ProgressBar'

export default function VideoDownloader() {
  const [url, setUrl] = useState('')
  const [info, setInfo] = useState<VideoInfo | null>(null)
  const [loading, setLoading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [downloading, setDownloading] = useState(false)

  const handleFetch = async () => {
    setInfo(null)
    setLoading(true)
    setProgress(0)
    try {
      const result = await fetchVideoInfo(url)
      setProgress(100)
      setInfo(result)
    } finally {
      setLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !loading && url.trim()) handleFetch()
  }

  const handleDownload = (quality?: { format_id?: string; height?: number | null }) => {
    const downloadUrl = getDownloadUrl(url, quality)
    if (downloadUrl) {
      setDownloading(true)
      // Open in new window so we can detect when it starts
      const link = document.createElement('a')
      link.href = downloadUrl
      link.target = '_blank'
      link.click()
      // Reset after a reasonable delay since we can't track the actual download
      setTimeout(() => setDownloading(false), 5000)
    }
  }

  return (
    <div className="card">
      <h2 style={{ marginTop: 0 }}><HiVideoCamera style={{ verticalAlign: 'middle', marginRight: '8px' }} /> Social Media Video Downloader</h2>
      <p style={{ color: 'var(--text-muted)', marginBottom: '0.75rem', fontSize: '0.9rem' }}>
        Paste a link to preview and download videos with audio in MP4 format.
      </p>
      <div className="platform-badges">
        <span className="platform-badge"><FaYoutube /> YouTube</span>
        <span className="platform-badge"><FaInstagram /> Instagram</span>
        <span className="platform-badge"><FaTiktok /> TikTok</span>
        <span className="platform-badge"><FaXTwitter /> Twitter/X</span>
        <span className="platform-badge"><FaFacebook /> Facebook</span>
      </div>

      <div className="url-input-group" style={{ marginTop: '1.25rem' }}>
        <input
          type="url"
          placeholder="https://www.youtube.com/watch?v=..."
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onKeyDown={handleKeyDown}
        />
        <button onClick={handleFetch} disabled={loading || !url.trim()}>
          {loading ? '⏳ Loading…' : <><HiMagnifyingGlass /> Load Info</>}
        </button>
      </div>

      {loading && <ProgressBar value={progress} label="Fetching video metadata…" />}
      {info?.error && <p className="error-msg">{info.error}</p>}

      {info && !info.error && (
        <div className="video-preview-section">
          <h3 style={{ marginTop: 0, marginBottom: '0.75rem' }}>📋 Preview & Metadata</h3>

          {info.thumbnail && (
            <img
              src={info.thumbnail}
              alt="Video thumbnail"
              className="video-thumbnail"
            />
          )}

          <dl className="video-meta">
            <dt>Title</dt>
            <dd>{info.title || '—'}</dd>
            <dt>Duration</dt>
            <dd>{formatDuration(info.duration)}</dd>
            <dt>Size</dt>
            <dd>{formatSize(info.size)}</dd>
          </dl>

          <p style={{ fontWeight: 600, marginBottom: '0.5rem', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
            ⬇ Choose quality
          </p>
          <div className="quality-grid">
            {info.qualities.map((q, i) => (
              <button
                key={i}
                onClick={() => handleDownload(q)}
                className="secondary"
                disabled={!getDownloadUrl(url, q) || downloading}
              >
                <HiArrowDownTray style={{ marginRight: '4px' }} /> {q.label}
              </button>
            ))}
          </div>

          {downloading && (
            <div className="download-status downloading">
              Preparing your download… This may take a moment for large videos.
            </div>
          )}

          {!getDownloadUrl(url, info.qualities[0]) && (
            <p className="error-msg" style={{ marginTop: '0.75rem' }}>
              Set VITE_API_BASE_URL in .env and run the server to enable downloads.
            </p>
          )}
        </div>
      )}
    </div>
  )
}
