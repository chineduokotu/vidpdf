import { PDFDocument } from 'pdf-lib'
import * as XLSX from 'xlsx'

export async function imagesToPdf(files: File[]): Promise<Uint8Array> {
  const doc = await PDFDocument.create()
  for (const imgFile of files) {
    const buf = await imgFile.arrayBuffer()
    const ext = imgFile.name.split('.').pop()?.toLowerCase()
    let image
    if (ext === 'png') image = await doc.embedPng(buf)
    else if (ext === 'jpg' || ext === 'jpeg') image = await doc.embedJpg(buf)
    else if (ext === 'webp') image = await doc.embedPng(buf)
    else continue
    const page = doc.addPage([image.width, image.height])
    page.drawImage(image, { x: 0, y: 0, width: image.width, height: image.height })
  }
  return doc.save()
}

export function downloadBytes(data: Uint8Array, filename: string, mime: string) {
  const blob = new Blob([data], { type: mime })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = filename
  a.click()
  URL.revokeObjectURL(a.href)
}

export function downloadBlob(blob: Blob, filename: string) {
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = filename
  a.click()
  URL.revokeObjectURL(a.href)
}

// PDF to images using canvas (we need pdf.js for rendering)
export async function pdfToImages(file: File, onProgress?: (pct: number) => void): Promise<Blob[]> {
  const pdfjsLib = await import('pdfjs-dist')
  const buf = await file.arrayBuffer()
  const pdf = await pdfjsLib.getDocument(buf).promise
  const numPages = pdf.numPages
  const blobs: Blob[] = []
  const scale = 2
  for (let i = 1; i <= numPages; i++) {
    const page = await pdf.getPage(i)
    const viewport = page.getViewport({ scale })
    const canvas = document.createElement('canvas')
    canvas.width = viewport.width
    canvas.height = viewport.height
    const ctx = canvas.getContext('2d')!
    await page.render({ canvasContext: ctx, viewport }).promise
    const blob = await new Promise<Blob>((res, rej) => {
      canvas.toBlob((b) => (b ? res(b) : rej(new Error('toBlob failed'))), 'image/png')
    })
    blobs.push(blob)
    onProgress?.((i / numPages) * 100)
  }
  return blobs
}

// PDF to Excel: extract text per page and try to detect tables (simple: one sheet per page, text in cells)
export async function pdfToExcel(file: File): Promise<Uint8Array> {
  const pdfjsLib = await import('pdfjs-dist')
  const buf = await file.arrayBuffer()
  const pdf = await pdfjsLib.getDocument(buf).promise
  const wb = XLSX.utils.book_new()
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i)
    const content = await page.getTextContent()
    const lines = content.items
      .filter((x): x is { str: string } => 'str' in x)
      .map((x) => x.str)
    const rows = lines.map((line) => [line])
    const ws = XLSX.utils.aoa_to_sheet(rows.length ? rows : [['']])
    XLSX.utils.book_append_sheet(wb, ws, `Page ${i}`)
  }
  return XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
}

// Excel to PDF: render sheet as table in PDF
export async function excelToPdf(file: File): Promise<Uint8Array> {
  const buf = await file.arrayBuffer()
  const wb = XLSX.read(buf, { type: 'array' })
  const doc = await PDFDocument.create()
  const sheet = wb.Sheets[wb.SheetNames[0]]
  if (!sheet) return doc.save()
  const aoa = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as unknown[][]
  const page = doc.addPage([600, 800])
  const cellW = 80
  const cellH = 20
  const fontSize = 10
  let y = 780
  for (const row of aoa.slice(0, 35)) {
    let x = 50
    for (const cell of (row as unknown[]).slice(0, 7)) {
      const text = cell != null ? String(cell) : ''
      if (text) page.drawText(text.slice(0, 20), { x, y, size: fontSize })
      x += cellW
    }
    y -= cellH
  }
  return doc.save()
}

// Word to PDF: client-side we can't parse .docx to PDF easily; we'll create a placeholder that says "Use a server for Word→PDF"
export async function wordToPdf(_file: File): Promise<Uint8Array> {
  const doc = await PDFDocument.create()
  const page = doc.addPage([600, 400])
  page.drawText('Word to PDF conversion requires a server-side library. Use the Excel to PDF or Image to PDF tools for client-side conversion.', {
    x: 50,
    y: 350,
    size: 12,
  })
  return doc.save()
}
