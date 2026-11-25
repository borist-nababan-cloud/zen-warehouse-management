import { useEffect, useState } from 'react'
import { ChevronLeft, ChevronRight, ExternalLink, Image as ImageIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import type { GoodsReceipt, ReceiptImageEntry } from '@/types/database'

export interface GalleryImageItem {
    url: string
    label?: string
    grDoc?: string
    receivedAt?: string | null
}

/**
 * Collects all non-empty proof photo slots (1..3) from a single GoodsReceipt row.
 */
export function collectGrImages(gr: Pick<GoodsReceipt, 'document_number' | 'received_at' | 'image_url' | 'image_url_2' | 'image_url_3'>): GalleryImageItem[] {
    const rawSlots: Array<{ slot: number; url?: string | null }> = [
        { slot: 1, url: gr.image_url },
        { slot: 2, url: gr.image_url_2 },
        { slot: 3, url: gr.image_url_3 },
    ]

    return rawSlots
        .filter((s) => Boolean(s.url && s.url.trim()))
        .map((s) => ({
            url: s.url!.trim(),
            label: `Foto ${s.slot}`,
            grDoc: gr.document_number,
            receivedAt: gr.received_at ?? null,
        }))
}

/**
 * Normalizes `receipt_images` JSON array from PO / GR report views,
 * falling back to legacy single `receipt_image_url` if array is empty.
 */
export function normalizeViewReceiptImages(
    receiptImages?: ReceiptImageEntry[] | null,
    fallbackUrl?: string | null,
    fallbackDoc?: string
): GalleryImageItem[] {
    const valid = (Array.isArray(receiptImages) ? receiptImages : [])
        .filter((item) => Boolean(item?.url && String(item.url).trim()))
        .map((item) => ({
            url: String(item.url).trim(),
            label: item.slot ? `Foto ${item.slot}` : undefined,
            grDoc: item.gr_doc || fallbackDoc,
            receivedAt: item.received_at ?? null,
        }))

    if (valid.length > 0) return valid

    if (fallbackUrl && fallbackUrl.trim()) {
        return [
            {
                url: fallbackUrl.trim(),
                label: 'Foto 1',
                grDoc: fallbackDoc,
            },
        ]
    }

    return []
}

interface TransactionImageGalleryDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    title: string
    images: GalleryImageItem[]
    initialIndex?: number
}

export function TransactionImageGalleryDialog({
    open,
    onOpenChange,
    title,
    images,
    initialIndex = 0,
}: TransactionImageGalleryDialogProps) {
    const [activeIndex, setActiveIndex] = useState(initialIndex)

    useEffect(() => {
        if (open) {
            const safeIdx = Math.min(Math.max(0, initialIndex), Math.max(0, images.length - 1))
            setActiveIndex(safeIdx)
        }
    }, [open, initialIndex, images])

    useEffect(() => {
        if (!open || images.length <= 1) return
        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'ArrowLeft') {
                setActiveIndex((prev) => (prev - 1 + images.length) % images.length)
            } else if (e.key === 'ArrowRight') {
                setActiveIndex((prev) => (prev + 1) % images.length)
            }
        }
        window.addEventListener('keydown', onKeyDown)
        return () => window.removeEventListener('keydown', onKeyDown)
    }, [open, images.length])

    const current = images[activeIndex]

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-3xl">
                <DialogHeader>
                    <DialogTitle className="flex items-center justify-between gap-2 pr-6">
                        <span className="flex items-center gap-2 truncate">
                            <ImageIcon className="h-5 w-5 text-blue-600 shrink-0" />
                            <span className="truncate">{title}</span>
                        </span>
                        {images.length > 0 && (
                            <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-700 border shrink-0">
                                Foto {activeIndex + 1} dari {images.length}
                            </span>
                        )}
                    </DialogTitle>
                </DialogHeader>

                {current ? (
                    <div className="space-y-3">
                        {/* Caption metadata bar */}
                        {(current.grDoc || current.label || current.receivedAt) && (
                            <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground bg-muted/50 px-3 py-1.5 rounded-md border">
                                <div className="flex items-center gap-2">
                                    {current.grDoc && (
                                        <span className="font-mono font-semibold text-foreground">
                                            {current.grDoc}
                                        </span>
                                    )}
                                    {current.label && (
                                        <span className="px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200 font-medium text-[11px]">
                                            {current.label}
                                        </span>
                                    )}
                                </div>
                                {current.receivedAt && (
                                    <span>
                                        Diterima: {new Date(current.receivedAt).toLocaleString('id-ID')}
                                    </span>
                                )}
                            </div>
                        )}

                        {/* Main Image Stage with Prev/Next */}
                        <div className="relative flex items-center justify-center bg-slate-900/5 rounded-lg p-2 min-h-[260px] max-h-[65vh] overflow-hidden border">
                            <img
                                src={current.url}
                                alt={current.label || title}
                                className="max-h-[60vh] w-auto object-contain rounded"
                            />

                            {images.length > 1 && (
                                <>
                                    <Button
                                        type="button"
                                        variant="secondary"
                                        size="icon"
                                        aria-label="Foto Sebelumnya"
                                        onClick={() =>
                                            setActiveIndex((prev) => (prev - 1 + images.length) % images.length)
                                        }
                                        className="absolute left-2 top-1/2 -translate-y-1/2 h-9 w-9 rounded-full shadow-md bg-white/90 hover:bg-white text-slate-800"
                                    >
                                        <ChevronLeft className="h-5 w-5" />
                                    </Button>
                                    <Button
                                        type="button"
                                        variant="secondary"
                                        size="icon"
                                        aria-label="Foto Berikutnya"
                                        onClick={() => setActiveIndex((prev) => (prev + 1) % images.length)}
                                        className="absolute right-2 top-1/2 -translate-y-1/2 h-9 w-9 rounded-full shadow-md bg-white/90 hover:bg-white text-slate-800"
                                    >
                                        <ChevronRight className="h-5 w-5" />
                                    </Button>
                                </>
                            )}
                        </div>

                        {/* Thumbnail Strip */}
                        {images.length > 1 && (
                            <div className="flex items-center gap-2 overflow-x-auto pb-1">
                                {images.map((img, idx) => {
                                    const isActive = idx === activeIndex
                                    return (
                                        <button
                                            key={`${img.url}-${idx}`}
                                            type="button"
                                            onClick={() => setActiveIndex(idx)}
                                            className={`relative shrink-0 rounded-md overflow-hidden border-2 transition-all ${
                                                isActive
                                                    ? 'border-blue-600 ring-2 ring-blue-200'
                                                    : 'border-slate-200 opacity-70 hover:opacity-100'
                                            }`}
                                            title={`${img.grDoc || ''} ${img.label || `Foto ${idx + 1}`}`.trim()}
                                        >
                                            <img
                                                src={img.url}
                                                alt={`Thumbnail ${idx + 1}`}
                                                className="h-14 w-14 object-cover"
                                            />
                                            <span className="absolute bottom-0 inset-x-0 bg-black/60 text-white text-[9px] font-medium px-1 text-center truncate">
                                                {img.label || `#${idx + 1}`}
                                            </span>
                                        </button>
                                    )
                                })}
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="py-10 text-center text-sm text-muted-foreground">
                        Tidak ada foto bukti penerimaan yang tersedia.
                    </div>
                )}

                <DialogFooter>
                    {current && (
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => window.open(current.url, '_blank')}
                        >
                            <ExternalLink className="h-4 w-4 mr-1.5" />
                            Buka di Tab Baru
                        </Button>
                    )}
                    <Button variant="secondary" size="sm" onClick={() => onOpenChange(false)}>
                        Tutup
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
