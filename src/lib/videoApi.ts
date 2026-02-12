import { apiUrl } from '../api'

/** Builds the backend download URL for a video (requires VITE_API_BASE_URL). Uses height for merged video+audio. */
export function getDownloadUrl(videoUrl: string, quality?: { format_id?: string; height?: number | null }): string {
  const base = apiUrl('/api/download')
  if (!base) return ''
  const params = new URLSearchParams({ url: videoUrl })
  if (quality?.height) params.set('height', String(quality.height))
  return `${base}?${params.toString()}`
}

export type VideoQuality = { label: string; height?: number; url?: string; format_id?: string }

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
