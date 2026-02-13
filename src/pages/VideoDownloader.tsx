import { useState } from 'react'
import { HiVideoCamera, HiMagnifyingGlass } from 'react-icons/hi2'
import { FaYoutube, FaInstagram, FaTiktok, FaFacebook, FaXTwitter } from 'react-icons/fa6'
import { fetchVideoInfo, formatDuration, formatSize, startVideoDownload, fetchVideoProgress, getVideoRetrieveUrl, type VideoInfo } from '../lib/videoApi'
import ProgressBar from '../components/ProgressBar'

export default function VideoDownloader() {
  const [url, setUrl] = useState('')
  const [info, setInfo] = useState<VideoInfo | null>(null)
  const [loading, setLoading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [downloading, setDownloading] = useState(false)
  const [downloadProgress, setDownloadProgress] = useState(0)
  const [downloadError, setDownloadError] = useState('')

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

  const handleDownload = async (quality?: { format_id?: string; height?: number | null }) => {
    setDownloading(true)
    setDownloadProgress(1)
    setDownloadError('')

    try {
      const progressId = await startVideoDownload(url, quality)

      const poll = setInterval(async () => {
        try {
          const state = await fetchVideoProgress(progressId)

          if (state.status === 'error') {
            clearInterval(poll)
            setDownloadError(state.error || 'Download failed on server')
            setDownloading(false)
            return
          }

          setDownloadProgress(state.progress)

          if (state.status === 'complete') {
            clearInterval(poll)
            // Trigger automatic retrieval
            const retrieveUrl = getVideoRetrieveUrl(progressId)
            const link = document.createElement('a')
            link.href = retrieveUrl
            link.click()

            setTimeout(() => {
              setDownloading(false)
              setDownloadProgress(0)
            }, 3000)
          }
        } catch (err) {
          console.error('Polling error:', err)
        }
      }, 2000)
    } catch (err) {
      setDownloadError(err instanceof Error ? err.message : 'Could not start download')
      setDownloading(false)
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
      {downloadError && <p className="error-msg">{downloadError}</p>}

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
                disabled={downloading}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  padding: '12px 16px',
                  minHeight: '80px',
                  textAlign: 'center'
                }}
              >
                <div style={{ fontWeight: 700, fontSize: '1.1rem', marginBottom: '4px' }}>
                  {q.label} {(q.height || 0) >= 720 && <span className="hd-badge" style={{ backgroundColor: 'var(--accent)', color: 'white', padding: '2px 4px', borderRadius: '4px', fontSize: '0.65rem', verticalAlign: 'middle', marginLeft: '4px' }}>HD</span>}
                </div>
                <div style={{ fontSize: '0.8rem', opacity: 0.8 }}>
                  {q.size ? formatSize(q.size) : 'Unknown size'} • {q.ext?.toUpperCase() || 'MP4'}
                </div>
              </button>
            ))}
          </div>

          {downloading && (
            <div className="download-status downloading" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '0.5rem' }}>
              <div>Processing Video… {downloadProgress > 0 ? `${downloadProgress}%` : 'Starting…'}</div>
              <div className="progress-bar" style={{ width: '100%', margin: 0, height: '4px' }}>
                <div style={{ width: `${Math.max(0, downloadProgress)}%` }}></div>
              </div>
              <div style={{ fontSize: '0.75rem', opacity: 0.8 }}>
                The download will start automatically once processing is complete.
              </div>
            </div>
          )}

          {!getVideoRetrieveUrl('dummy-id') && ( // Changed from getDownloadUrl to getVideoRetrieveUrl for consistency, though the original check was likely for API base URL presence.
            <p className="error-msg" style={{ marginTop: '0.75rem' }}>
              Set VITE_API_BASE_URL in .env and run the server to enable downloads.
            </p>
          )}
        </div>
      )}
    </div>
  )
}
