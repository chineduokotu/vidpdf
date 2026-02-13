import { apiUrl } from '../api'

/** Starts a background download on the server and returns a progressId */
export async function startVideoDownload(videoUrl: string, quality?: { format_id?: string; height?: number | null }): Promise<string> {
  const base = apiUrl('/api/video-download-start')
  if (!base) return ''
  const params = new URLSearchParams({ url: videoUrl })
  if (quality?.height) params.set('height', String(quality.height))

  const res = await fetch(`${base}?${params.toString()}`)
  if (!res.ok) throw new Error(await res.text())
  const data = await res.json()
  return data.progressId
}

/** Fetches current download state */
export async function fetchVideoProgress(id: string): Promise<{ progress: number; status: string; error?: string }> {
  const url = apiUrl(`/api/video-progress?id=${id}`)
  if (!url) return { progress: 0, status: 'error' }
  try {
    const res = await fetch(url)
    if (!res.ok) return { progress: 0, status: 'error' }
    return await res.json()
  } catch {
    return { progress: 0, status: 'error' }
  }
}

/** Gets the final retrieval URL for a finished download */
export function getVideoRetrieveUrl(id: string): string {
  return apiUrl(`/api/video-download-retrieve?id=${id}`)
}

export type VideoQuality = { label: string; height?: number; url?: string; format_id?: string; size?: number | null; ext?: string }

export type VideoInfo = {
  title: string
  duration?: number
  thumbnail?: string
  size?: number
  qualities: VideoQuality[]
  error?: string
}

function parseDuration(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

export async function fetchVideoInfo(url: string): Promise<VideoInfo> {
  const trimmed = url.trim()
  if (!trimmed) return { title: '', qualities: [], error: 'Please enter a video URL.' }

  // Check if it looks like a supported URL
  const patterns = [
    /youtube\.com|youtu\.be/i,
    /instagram\.com/i,
    /tiktok\.com/i,
    /twitter\.com|x\.com/i,
    /facebook\.com|fb\.watch|fb\.com/i,
  ]
  if (!patterns.some((p) => p.test(trimmed))) {
    return {
      title: '',
      qualities: [],
      error: 'Unsupported URL. Try YouTube, Instagram, TikTok, Twitter/X, or Facebook.',
    }
  }

  const requestUrl = apiUrl('/api/video-info')
  if (!requestUrl) {
    return {
      title: 'Demo: Video from URL',
      duration: 120,
      thumbnail: '',
      qualities: [
        { label: '1080p', height: 1080 },
        { label: '720p', height: 720 },
        { label: '480p', height: 480 },
      ],
      error: 'To enable real downloads, set VITE_API_BASE_URL in .env or run the included server.',
    }
  }

  try {
    const res = await fetch(`${requestUrl}?url=${encodeURIComponent(trimmed)}`)
    if (!res.ok) throw new Error(await res.text().catch(() => res.statusText))
    const data = await res.json()
    return {
      title: data.title || 'Video',
      duration: data.duration,
      thumbnail: data.thumbnail,
      size: data.size,
      qualities: (data.qualities || []).map((q: { label?: string; height?: number; url?: string; format_id?: string }) => ({
        label: q.label || `${q.height || '?'}p`,
        height: q.height,
        url: q.url,
        format_id: q.format_id || 'best',
      })),
    }
  } catch (e) {
    return {
      title: '',
      qualities: [],
      error: e instanceof Error ? e.message : 'Failed to fetch video info.',
    }
  }
}

export function formatDuration(seconds?: number): string {
  if (seconds == null) return '—'
  return parseDuration(seconds)
}

export function formatSize(bytes?: number): string {
  if (bytes == null) return '—'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}
