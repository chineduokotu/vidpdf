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
 * Simple inpainting: fill the selected rectangle with content from surrounding pixels.
 * Uses a distance-weighted interpolation from the four edges, followed by a slight blur.
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
  
  if (width <= 0 || height <= 0) return out

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

  const startX = Math.max(0, x)
  const endX = Math.min(w - 1, x + width - 1)
  const startY = Math.max(0, y)
  const endY = Math.min(h - 1, y + height - 1)

  // 1. Interpolate from borders
  for (let py = startY; py <= endY; py++) {
    for (let px = startX; px <= endX; px++) {
      const leftPixel = getPixel(startX - 1, py)
      const rightPixel = getPixel(endX + 1, py)
      const hRatio = endX === startX ? 0.5 : (px - startX) / (endX - startX)

      const topPixel = getPixel(px, startY - 1)
      const bottomPixel = getPixel(px, endY + 1)
      const vRatio = endY === startY ? 0.5 : (py - startY) / (endY - startY)

      const r = (leftPixel[0] * (1 - hRatio) + rightPixel[0] * hRatio + topPixel[0] * (1 - vRatio) + bottomPixel[0] * vRatio) / 2
      const g = (leftPixel[1] * (1 - hRatio) + rightPixel[1] * hRatio + topPixel[1] * (1 - vRatio) + bottomPixel[1] * vRatio) / 2
      const b = (leftPixel[2] * (1 - hRatio) + rightPixel[2] * hRatio + topPixel[2] * (1 - vRatio) + bottomPixel[2] * vRatio) / 2
      const a = (leftPixel[3] * (1 - hRatio) + rightPixel[3] * hRatio + topPixel[3] * (1 - vRatio) + bottomPixel[3] * vRatio) / 2

      setPixel(px, py, Math.round(r), Math.round(g), Math.round(b), Math.round(a))
    }
  }

  // 2. Local blur over the filled area to smooth artifacts
  const pad = 2
  const tempData = new Uint8ClampedArray(data)
  const getTempPixel = (px: number, py: number) => {
    const cx = Math.max(0, Math.min(w - 1, px))
    const cy = Math.max(0, Math.min(h - 1, py))
    const i = (cy * w + cx) * 4
    return [tempData[i], tempData[i + 1], tempData[i + 2], tempData[i + 3]]
  }

  for (let py = startY; py <= endY; py++) {
    for (let px = startX; px <= endX; px++) {
      let r = 0, g = 0, b = 0, a = 0, n = 0
      for (let dy = -pad; dy <= pad; dy++) {
        for (let dx = -pad; dx <= pad; dx++) {
          const [pr, pg, pb, pa] = getTempPixel(px + dx, py + dy)
          r += pr
          g += pg
          b += pb
          a += pa
          n++
        }
      }
      setPixel(px, py, Math.round(r / n), Math.round(g / n), Math.round(b / n), Math.round(a / n))
    }
  }

  ctx.putImageData(imageData, 0, 0)
  return out
}
