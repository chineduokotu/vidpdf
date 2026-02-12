export function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('Failed to load image'))
    img.src = URL.createObjectURL(file)
  })
}

export function imageToBlob(canvas: HTMLCanvasElement, mime: string = 'image/png', quality?: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('toBlob failed'))), mime, quality)
  })
}

/**
 * Simple inpainting: fill the selected rectangle with content from surrounding pixels (edge extension + blur).
 * Not true AI but gives a "removal" effect for watermarks.
 */
export function removeWatermarkFromCanvas(
  sourceCanvas: HTMLCanvasElement,
  x: number,
  y: number,
  width: number,
  height: number
): HTMLCanvasElement {
  const out = document.createElement('canvas')
  out.width = sourceCanvas.width
  out.height = sourceCanvas.height
  const ctx = out.getContext('2d')!
  ctx.drawImage(sourceCanvas, 0, 0)
  const imageData = ctx.getImageData(0, 0, out.width, out.height)
  const data = imageData.data
  const w = out.width
  const h = out.height

  const getPixel = (px: number, py: number) => {
    const cx = Math.max(0, Math.min(w - 1, px))
    const cy = Math.max(0, Math.min(h - 1, py))
    const i = (cy * w + cx) * 4
    return [data[i], data[i + 1], data[i + 2], data[i + 3]]
  }

  const setPixel = (px: number, py: number, r: number, g: number, b: number, a: number) => {
    if (px < 0 || px >= w || py < 0 || py >= h) return
    const i = (py * w + px) * 4
    data[i] = r
    data[i + 1] = g
    data[i + 2] = b
    data[i + 3] = a
  }

  const x2 = Math.min(w, x + width)
  const y2 = Math.min(h, y + height)
  const pad = 3
  for (let py = y; py < y2; py++) {
    for (let px = x; px < x2; px++) {
      let r = 0, g = 0, b = 0, a = 0, n = 0
      for (let dy = -pad; dy <= pad; dy++) {
        for (let dx = -pad; dx <= pad; dx++) {
          const sx = px + dx
          const sy = py + dy
          if (sx >= x && sx < x2 && sy >= y && sy < y2) continue
          const [pr, pg, pb, pa] = getPixel(sx, sy)
          r += pr
          g += pg
          b += pb
          a += pa
          n++
        }
      }
      if (n > 0) {
        setPixel(px, py, Math.round(r / n), Math.round(g / n), Math.round(b / n), Math.round(a / n))
      }
    }
  }
  ctx.putImageData(imageData, 0, 0)
  return out
}
