import { PDFDocument, degrees } from 'pdf-lib'

export async function mergePdfs(files: File[]): Promise<Uint8Array> {
  const merged = await PDFDocument.create()
  for (const file of files) {
    const buf = await file.arrayBuffer()
    const doc = await PDFDocument.load(buf)
    const pages = await merged.copyPages(doc, doc.getPageIndices())
    pages.forEach((p) => merged.addPage(p))
  }
  return merged.save()
}

export async function splitPdf(file: File, pageRanges: { start: number; end: number }[]): Promise<Uint8Array[]> {
  const buf = await file.arrayBuffer()
  const doc = await PDFDocument.load(buf)
  const results: Uint8Array[] = []
  for (const { start, end } of pageRanges) {
    const newDoc = await PDFDocument.create()
    for (let i = start; i <= end; i++) {
      const [page] = await newDoc.copyPages(doc, [i])
      newDoc.addPage(page)
    }
    results.push(await newDoc.save())
  }
  return results
}

export async function rotatePdf(file: File, angle: 90 | 180 | 270): Promise<Uint8Array> {
  const buf = await file.arrayBuffer()
  const doc = await PDFDocument.load(buf)
  const pages = doc.getPages()
  for (const p of pages) {
    const r = p.getRotation()
    const currentDeg = r.angle * (180 / Math.PI)
    const next = Math.round(((currentDeg + angle) % 360) / 90) * 90 % 360
    p.setRotation(degrees((next || 0) as 0 | 90 | 180 | 270))
  }
  return doc.save()
}

export async function removePdfPages(file: File, pageIndexesToRemove: number[]): Promise<Uint8Array> {
  const buf = await file.arrayBuffer()
  const doc = await PDFDocument.load(buf)
  const toRemove = new Set(pageIndexesToRemove.sort((a, b) => b - a))
  const total = doc.getPageCount()
  for (let i = total - 1; i >= 0; i--) {
    if (toRemove.has(i)) doc.removePage(i)
  }
  return doc.save()
}

export async function addTextToPdf(
  file: File,
  pageIndex: number,
  text: string,
  x: number,
  y: number,
  size: number = 12
): Promise<Uint8Array> {
  const buf = await file.arrayBuffer()
  const doc = await PDFDocument.load(buf)
  const pages = doc.getPages()
  if (pageIndex < 0 || pageIndex >= pages.length) throw new Error('Invalid page index')
  const page = pages[pageIndex]
  const { height } = page.getSize()
  page.drawText(text, { x, y: height - y, size })
  return doc.save()
}

export async function compressPdf(file: File): Promise<Uint8Array> {
  const buf = await file.arrayBuffer()
  const doc = await PDFDocument.load(buf, { ignoreEncryption: true })
  return doc.save({ useObjectStreams: true })
}

export async function createPdfFromImages(images: File[]): Promise<Uint8Array> {
  const doc = await PDFDocument.create()
  for (const imgFile of images) {
    const buf = await imgFile.arrayBuffer()
    const ext = imgFile.name.split('.').pop()?.toLowerCase()
    let image
    if (ext === 'png') image = await doc.embedPng(buf)
    else if (ext === 'jpg' || ext === 'jpeg') image = await doc.embedJpg(buf)
    else continue
    const page = doc.addPage([image.width, image.height])
    page.drawImage(image, { x: 0, y: 0, width: image.width, height: image.height })
  }
  return doc.save()
}

export function downloadBlob(data: Uint8Array, filename: string) {
  const blob = new Blob([data], { type: 'application/pdf' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = filename
  a.click()
  URL.revokeObjectURL(a.href)
}
