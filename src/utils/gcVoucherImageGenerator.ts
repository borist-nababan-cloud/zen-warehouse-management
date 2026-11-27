import JsBarcode from 'jsbarcode'
import QRCode from 'qrcode'
import { supabase } from '@/lib/supabase'

export const GC_COMPLIMENT_BUCKET = 'gc-compliment-images'
const CANVAS_WIDTH = 1350
const CANVAS_HEIGHT = 600

export interface GcVoucherRenderInput {
  gcNumber: string
  gcBarcode: string
  qrcode: string
  namaGc: string
  durationMinutes?: number | null
  backgroundImageUrl?: string | null
  expiredDate?: string | null
}

function getJsBarcodeFn() {
  const candidate = JsBarcode as unknown as
    | ((el: unknown, text: string, opts?: Record<string, unknown>) => void)
    | { default?: (el: unknown, text: string, opts?: Record<string, unknown>) => void }
  if (typeof candidate === 'function') return candidate
  if (candidate && typeof candidate.default === 'function') return candidate.default
  throw new Error('Library JsBarcode tidak tersedia.')
}

function formatValidThroughLabel(expiredDate?: string | null): string {
  if (!expiredDate) return '120 Hari sejak Aktivasi'
  const clean = expiredDate.slice(0, 10)
  const parsed = new Date(`${clean}T12:00:00`)
  if (isNaN(parsed.getTime())) return clean
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(parsed)
}

async function loadImageFromBlobUrl(url: string): Promise<HTMLImageElement> {
  const resp = await fetch(url, { mode: 'cors', cache: 'force-cache' })
  if (!resp.ok) {
    throw new Error(`HTTP ${resp.status}`)
  }
  const blob = await resp.blob()
  const objectUrl = URL.createObjectURL(blob)
  try {
    return await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image()
      img.onload = () => resolve(img)
      img.onerror = () => reject(new Error('Gagal memuat gambar latar dari blob.'))
      img.src = objectUrl
    })
  } finally {
    URL.revokeObjectURL(objectUrl)
  }
}

async function loadImageCorsElement(url: string): Promise<HTMLImageElement> {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('Gagal memuat gambar latar via CORS.'))
    img.src = url
  })
}

async function loadBackgroundImage(url?: string | null): Promise<HTMLImageElement | null> {
  if (!url) return null
  try {
    return await loadImageFromBlobUrl(url)
  } catch {
    try {
      return await loadImageCorsElement(url)
    } catch {
      return null
    }
  }
}

function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  const radius = Math.min(r, w / 2, h / 2)
  ctx.beginPath()
  ctx.moveTo(x + radius, y)
  ctx.arcTo(x + w, y, x + w, y + h, radius)
  ctx.arcTo(x + w, y + h, x, y + h, radius)
  ctx.arcTo(x, y + h, x, y, radius)
  ctx.arcTo(x, y, x + w, y, radius)
  ctx.closePath()
}

function drawCoverBackground(ctx: CanvasRenderingContext2D, img: HTMLImageElement | null) {
  if (img && img.width > 0 && img.height > 0) {
    const scale = Math.max(CANVAS_WIDTH / img.width, CANVAS_HEIGHT / img.height)
    const drawW = img.width * scale
    const drawH = img.height * scale
    const dx = (CANVAS_WIDTH - drawW) / 2
    const dy = (CANVAS_HEIGHT - drawH) / 2
    ctx.drawImage(img, dx, dy, drawW, drawH)
  } else {
    const bgGrad = ctx.createLinearGradient(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)
    bgGrad.addColorStop(0, '#302216')
    bgGrad.addColorStop(0.55, '#1d2b22')
    bgGrad.addColorStop(1, '#121a15')
    ctx.fillStyle = bgGrad
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)
  }

  // Luxury dark scrim so gold & white typography stands out cleanly on any service photo
  const scrim = ctx.createLinearGradient(0, 0, 0, CANVAS_HEIGHT)
  scrim.addColorStop(0, 'rgba(12, 10, 8, 0.56)')
  scrim.addColorStop(0.45, 'rgba(12, 10, 8, 0.44)')
  scrim.addColorStop(1, 'rgba(12, 10, 8, 0.68)')
  ctx.fillStyle = scrim
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)

  // Subtle inner hairline frame
  ctx.strokeStyle = 'rgba(218, 185, 102, 0.38)'
  ctx.lineWidth = 2
  ctx.strokeRect(14, 14, CANVAS_WIDTH - 28, CANVAS_HEIGHT - 28)
}

function parseDurationAndCaption(
  namaGc: string,
  fallbackDuration?: number | null
): { durationNumber: string | null; durationUnit: string; titleText: string } {
  const raw = namaGc.trim()
  if (!raw) {
    return {
      durationNumber: fallbackDuration ? String(fallbackDuration) : null,
      durationUnit: 'MIN',
      titleText: 'ZEN TREATMENT',
    }
  }

  // Pattern 1: leading duration e.g. "90 MIN FOOT REFLEXOLOGY" or "90 MENIT - Royal Massage"
  const leadingMatch = raw.match(/^(\d{1,3})\s*(MIN|MENIT|MINUTES?)\b[\s\-:•|]*(.*)$/i)
  if (leadingMatch) {
    const rest = (leadingMatch[3] || '').trim()
    return {
      durationNumber: leadingMatch[1],
      durationUnit: 'MIN',
      titleText: rest || raw,
    }
  }

  // Pattern 2: trailing duration e.g. "Royal Body Massage - 90 Min"
  const trailingMatch = raw.match(/^(.*?)[\s\-:•|(]+(\d{1,3})\s*(MIN|MENIT|MINUTES?)\)?$/i)
  if (trailingMatch && trailingMatch[1].trim()) {
    return {
      durationNumber: trailingMatch[2],
      durationUnit: 'MIN',
      titleText: trailingMatch[1].trim(),
    }
  }

  // Pattern 3: user kept custom text without explicit duration token
  return {
    durationNumber: null,
    durationUnit: 'MIN',
    titleText: raw,
  }
}

function wrapTextLines(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  maxLines: number
): string[] {
  const words = text.toUpperCase().split(/\s+/).filter(Boolean)
  if (words.length === 0) return ['GIFT CERTIFICATE']

  const lines: string[] = []
  let current = words[0]

  for (let i = 1; i < words.length; i++) {
    const candidate = `${current} ${words[i]}`
    if (ctx.measureText(candidate).width <= maxWidth) {
      current = candidate
    } else {
      lines.push(current)
      current = words[i]
      if (lines.length === maxLines - 1) {
        const remaining = words.slice(i + 1).join(' ')
        current = remaining ? `${current} ${remaining}` : current
        break
      }
    }
  }
  lines.push(current)

  // Clamp last line with ellipsis if still wider than maxWidth
  const lastIdx = lines.length - 1
  if (ctx.measureText(lines[lastIdx]).width > maxWidth) {
    let clipped = lines[lastIdx]
    while (clipped.length > 3 && ctx.measureText(`${clipped}...`).width > maxWidth) {
      clipped = clipped.slice(0, -1)
    }
    lines[lastIdx] = `${clipped}...`
  }

  return lines.slice(0, maxLines)
}

function renderBarcodeCanvas(barcodeText: string): HTMLCanvasElement {
  const canvas = document.createElement('canvas')
  const fn = getJsBarcodeFn()
  fn(canvas, barcodeText, {
    format: 'CODE128',
    width: 1.75,
    height: 64,
    displayValue: true,
    fontOptions: 'bold',
    font: 'monospace',
    fontSize: 13,
    textMargin: 3,
    margin: 6,
    background: '#ffffff',
    lineColor: '#111111',
  })
  return canvas
}

async function renderQrCanvas(qrText: string): Promise<HTMLCanvasElement> {
  const canvas = document.createElement('canvas')
  await QRCode.toCanvas(canvas, qrText, {
    width: 120,
    margin: 1,
    errorCorrectionLevel: 'M',
    color: {
      dark: '#111111',
      light: '#ffffff',
    },
  })
  return canvas
}

/**
 * Merender gambar Gift Certificate (1350x600 JPEG) lengkap dengan latar web_services,
 * metadata No. GC & Valid Through, caption nama_gc, 1D Linear Barcode, dan QR Code.
 */
export async function renderGcVoucherBlob(input: GcVoucherRenderInput): Promise<Blob> {
  const canvas = document.createElement('canvas')
  canvas.width = CANVAS_WIDTH
  canvas.height = CANVAS_HEIGHT
  const ctx = canvas.getContext('2d')
  if (!ctx) {
    throw new Error('Konteks 2D HTML5 Canvas tidak tersedia.')
  }

  const [bgImg, qrCanvas] = await Promise.all([
    loadBackgroundImage(input.backgroundImageUrl),
    renderQrCanvas(input.qrcode),
  ])
  const barcodeCanvas = renderBarcodeCanvas(input.gcBarcode)

  // 1. Background + dark scrim
  drawCoverBackground(ctx, bgImg)

  // 2. Top Center Branding: ZEN + family spa & reflexology
  ctx.save()
  ctx.textAlign = 'center'
  ctx.textBaseline = 'top'
  ctx.shadowColor = 'rgba(0, 0, 0, 0.7)'
  ctx.shadowBlur = 10
  ctx.fillStyle = '#ffffff'
  ctx.font = '900 44px "Arial Black", "Montserrat", sans-serif'
  ctx.fillText('ZEN', CANVAS_WIDTH / 2, 26)
  ctx.font = '600 13px "Arial", sans-serif'
  ctx.fillStyle = 'rgba(255, 255, 255, 0.94)'
  ctx.fillText('family spa & reflexology', CANVAS_WIDTH / 2, 72)
  ctx.restore()

  // 3. Top Right Frosted Pills: "No" & "Valid Through"
  ctx.save()
  const pillX = 1010
  const pillW = 304
  const pillH = 34
  const validText = formatValidThroughLabel(input.expiredDate)

  const pills = [
    { label: 'No', value: input.gcNumber, y: 30 },
    { label: 'Valid Through', value: validText, y: 74 },
  ]

  for (const item of pills) {
    ctx.textAlign = 'right'
    ctx.textBaseline = 'middle'
    ctx.font = '600 14px "Arial", sans-serif'
    ctx.fillStyle = '#ffffff'
    ctx.shadowColor = 'rgba(0, 0, 0, 0.8)'
    ctx.shadowBlur = 6
    ctx.fillText(item.label, pillX - 12, item.y + pillH / 2)

    ctx.shadowBlur = 0
    drawRoundedRect(ctx, pillX, item.y, pillW, pillH, 6)
    ctx.fillStyle = 'rgba(18, 15, 11, 0.56)'
    ctx.fill()
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.45)'
    ctx.lineWidth = 1.2
    ctx.stroke()

    ctx.textAlign = 'center'
    ctx.font = '700 14px "Consolas", "Courier New", monospace'
    ctx.fillStyle = '#ffffff'
    ctx.fillText(item.value, pillX + pillW / 2, item.y + pillH / 2 + 1)
  }
  ctx.restore()

  // 4. Center Hero: Gold "GIFT" Plate + White Italic "CERTIFICATE"
  ctx.save()
  const badgeW = 192
  const badgeH = 74
  const badgeX = 415
  const badgeY = 172

  const goldPlateGrad = ctx.createLinearGradient(badgeX, badgeY, badgeX + badgeW, badgeY + badgeH)
  goldPlateGrad.addColorStop(0, '#c89b3c')
  goldPlateGrad.addColorStop(0.5, '#f2d974')
  goldPlateGrad.addColorStop(1, '#b6862c')

  ctx.shadowColor = 'rgba(0, 0, 0, 0.5)'
  ctx.shadowBlur = 14
  ctx.fillStyle = goldPlateGrad
  ctx.fillRect(badgeX, badgeY, badgeW, badgeH)

  ctx.shadowBlur = 0
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillStyle = '#5a3912'
  ctx.font = '700 50px Georgia, "Times New Roman", serif'
  ctx.fillText('GIFT', badgeX + badgeW / 2, badgeY + badgeH / 2 + 2)

  ctx.shadowColor = 'rgba(0, 0, 0, 0.75)'
  ctx.shadowBlur = 12
  ctx.textAlign = 'left'
  ctx.fillStyle = '#ffffff'
  ctx.font = 'italic 600 56px Georgia, "Times New Roman", serif'
  ctx.fillText('CERTIFICATE', badgeX + badgeW + 22, badgeY + badgeH / 2 + 2)

  // Complimentary pill tag right above/under
  drawRoundedRect(ctx, badgeX, badgeY - 34, 174, 24, 12)
  ctx.fillStyle = 'rgba(18, 15, 11, 0.6)'
  ctx.fill()
  ctx.strokeStyle = '#e5c158'
  ctx.lineWidth = 1.2
  ctx.stroke()
  ctx.shadowBlur = 0
  ctx.textAlign = 'center'
  ctx.font = '700 11px "Arial", sans-serif'
  ctx.fillStyle = '#f3d97d'
  ctx.fillText('COMPLIMENTARY', badgeX + 87, badgeY - 21)
  ctx.restore()

  // 5. Center Lower Caption: Duration + nama_gc (auto-sized & wrapped cleanly above barcode card)
  ctx.save()
  const { durationNumber, durationUnit, titleText } = parseDurationAndCaption(
    input.namaGc,
    input.durationMinutes
  )

  const goldTextGrad = ctx.createLinearGradient(0, 270, 0, 415)
  goldTextGrad.addColorStop(0, '#f5df86')
  goldTextGrad.addColorStop(0.5, '#d5a843')
  goldTextGrad.addColorStop(1, '#9f7221')

  if (durationNumber) {
    // Render large gold duration numeral + MIN unit + multi-line italic serif title
    const numX = 435
    const baseNumY = 278

    ctx.textAlign = 'left'
    ctx.textBaseline = 'top'
    ctx.shadowColor = 'rgba(0, 0, 0, 0.75)'
    ctx.shadowBlur = 14
    ctx.fillStyle = goldTextGrad
    ctx.font = 'italic 700 120px Georgia, "Times New Roman", serif'
    ctx.fillText(durationNumber, numX, baseNumY)

    const numWidth = ctx.measureText(durationNumber).width
    const unitX = numX + numWidth + 16
    const maxTitleWidth = Math.min(480, 920 - unitX)

    ctx.font = 'italic 700 32px Georgia, "Times New Roman", serif'
    ctx.fillStyle = '#e9cb69'
    ctx.fillText(durationUnit, unitX, baseNumY + 12)

    const titleFontSize = titleText.length > 34 ? 26 : titleText.length > 22 ? 31 : 35
    ctx.font = `italic 700 ${titleFontSize}px Georgia, "Times New Roman", serif`
    ctx.fillStyle = '#ffffff'
    const lines = wrapTextLines(ctx, titleText, Math.max(260, maxTitleWidth), 3)
    const lineHeight = titleFontSize + 6
    lines.forEach((line, idx) => {
      ctx.fillText(line, unitX, baseNumY + 50 + idx * lineHeight)
    })
  } else {
    // Pure custom nama_gc centered cleanly
    const centerX = 640
    const titleFontSize = titleText.length > 40 ? 28 : titleText.length > 26 ? 34 : 40
    ctx.textAlign = 'center'
    ctx.textBaseline = 'top'
    ctx.shadowColor = 'rgba(0, 0, 0, 0.8)'
    ctx.shadowBlur = 14
    ctx.font = `italic 700 ${titleFontSize}px Georgia, "Times New Roman", serif`
    ctx.fillStyle = '#ffffff'
    const lines = wrapTextLines(ctx, titleText, 640, 3)
    const lineHeight = titleFontSize + 10
    const startY = lines.length === 1 ? 315 : lines.length === 2 ? 295 : 278
    lines.forEach((line, idx) => {
      ctx.fillText(line, centerX, startY + idx * lineHeight)
    })
  }
  ctx.restore()

  // 6. Bottom Left Standalone White Card: 1D Linear Barcode (Code 128)
  ctx.save()
  const cardPad = 12
  const bcDrawW = Math.min(300, Math.max(210, barcodeCanvas.width))
  const bcDrawH = Math.round((barcodeCanvas.height / Math.max(1, barcodeCanvas.width)) * bcDrawW)
  const bcCardW = cardPad * 2 + bcDrawW
  const bcCardH = cardPad * 2 + bcDrawH
  const bcCardX = 28
  const bcCardY = CANVAS_HEIGHT - bcCardH - 24

  ctx.shadowColor = 'rgba(0, 0, 0, 0.55)'
  ctx.shadowBlur = 16
  drawRoundedRect(ctx, bcCardX, bcCardY, bcCardW, bcCardH, 10)
  ctx.fillStyle = 'rgba(255, 255, 255, 0.98)'
  ctx.fill()

  ctx.shadowBlur = 0
  ctx.strokeStyle = 'rgba(212, 175, 55, 0.65)'
  ctx.lineWidth = 1.5
  ctx.stroke()

  ctx.drawImage(barcodeCanvas, bcCardX + cardPad, bcCardY + cardPad, bcDrawW, bcDrawH)
  ctx.restore()

  // 7. Bottom Center Branding
  ctx.save()
  ctx.textAlign = 'center'
  ctx.textBaseline = 'bottom'
  ctx.shadowColor = 'rgba(0, 0, 0, 0.85)'
  ctx.shadowBlur = 8
  ctx.fillStyle = '#ffffff'
  ctx.font = '700 17px "Arial", sans-serif'
  ctx.fillText('@zenfamilyspa  •  www.zenfamilyspa.com', CANVAS_WIDTH / 2, CANVAS_HEIGHT - 28)
  ctx.restore()

  // 8. Bottom Right Standalone White Card: 2D QR Code
  ctx.save()
  const qrSize = 114
  const qrLabelH = 16
  const qrCardW = cardPad * 2 + qrSize
  const qrCardH = cardPad * 2 + qrSize + qrLabelH
  const qrCardX = CANVAS_WIDTH - qrCardW - 28
  const qrCardY = CANVAS_HEIGHT - qrCardH - 24

  ctx.shadowColor = 'rgba(0, 0, 0, 0.55)'
  ctx.shadowBlur = 16
  drawRoundedRect(ctx, qrCardX, qrCardY, qrCardW, qrCardH, 10)
  ctx.fillStyle = 'rgba(255, 255, 255, 0.98)'
  ctx.fill()

  ctx.shadowBlur = 0
  ctx.strokeStyle = 'rgba(212, 175, 55, 0.65)'
  ctx.lineWidth = 1.5
  ctx.stroke()

  ctx.drawImage(qrCanvas, qrCardX + cardPad, qrCardY + cardPad, qrSize, qrSize)

  ctx.textAlign = 'center'
  ctx.textBaseline = 'bottom'
  ctx.fillStyle = '#1f2937'
  ctx.font = '700 10px "Arial", sans-serif'
  ctx.fillText('SCAN QR', qrCardX + qrCardW / 2, qrCardY + qrCardH - 7)
  ctx.restore()

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error('Gagal mengekspor canvas gambar GC menjadi JPEG.'))
          return
        }
        resolve(blob)
      },
      'image/jpeg',
      0.92
    )
  })
}

export async function uploadGcVoucherImage(gcNumber: string, blob: Blob): Promise<string> {
  const safeName = gcNumber.replace(/[^a-zA-Z0-9._-]/g, '_')
  const filePath = `111/${safeName}.jpg`

  const { error: uploadError } = await supabase.storage
    .from(GC_COMPLIMENT_BUCKET)
    .upload(filePath, blob, {
      contentType: 'image/jpeg',
      cacheControl: '60',
      upsert: true,
    })

  if (uploadError) {
    throw new Error(uploadError.message || `Gagal mengunggah gambar GC ${gcNumber}.`)
  }

  const { data } = supabase.storage.from(GC_COMPLIMENT_BUCKET).getPublicUrl(filePath)
  return `${data.publicUrl}?v=${Date.now()}`
}
