import { useEffect, useState } from 'react'
import { ChevronLeft, ChevronRight, ExternalLink, Image as ImageIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import type { GalleryImageItem } from '@/components/common/TransactionImageGalleryDialog'

interface DualPhotoPanelProps {
    title: string
    outletLabel: string
    images: GalleryImageItem[]
    emptyText: string
}

function DualPhotoPanel({ title, outletLabel, images, emptyText }: DualPhotoPanelProps) {
    const [activeIdx, setActiveIdx] = useState(0)

    useEffect(() => {
        setActiveIdx(0)
    }, [images])

    const current = images[activeIdx]

    return (
        <div className="border border-slate-200 dark:border-slate-700 rounded-lg p-3 bg-slate-50/50 dark:bg-slate-900/40 flex flex-col justify-between space-y-3">
            <div className="flex items-start justify-between gap-2 border-b border-slate-200 dark:border-slate-700 pb-2">
                <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                            {title}
                        </p>
                        {images.length > 0 && (
                            <span className="text-[11px] font-mono font-semibold px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800">
                                {activeIdx + 1} / {images.length}
                            </span>
                        )}
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
                        {outletLabel}
                    </p>
                </div>
                {current && (
                    <Button
                        variant="outline"
                        size="sm"
                        className="shrink-0 h-7 text-xs"
                        onClick={() => window.open(current.url, '_blank')}
                    >
                        <ExternalLink className="h-3.5 w-3.5 mr-1" />
                        Tab Baru
                    </Button>
                )}
            </div>

            {current ? (
                <div className="space-y-2">
                    <div className="relative flex items-center justify-center bg-white dark:bg-slate-950 rounded border border-slate-200 dark:border-slate-700 p-2 h-64 overflow-hidden">
                        <img
                            src={current.url}
                            alt={current.label || title}
                            className="max-h-full max-w-full object-contain rounded"
                        />
                        {images.length > 1 && (
                            <>
                                <Button
                                    type="button"
                                    variant="secondary"
                                    size="icon"
                                    aria-label="Foto Sebelumnya"
                                    onClick={() => setActiveIdx((prev) => (prev - 1 + images.length) % images.length)}
                                    className="absolute left-2 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full shadow bg-white/90 hover:bg-white text-slate-800"
                                >
                                    <ChevronLeft className="h-4 w-4" />
                                </Button>
                                <Button
                                    type="button"
                                    variant="secondary"
                                    size="icon"
                                    aria-label="Foto Berikutnya"
                                    onClick={() => setActiveIdx((prev) => (prev + 1) % images.length)}
                                    className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full shadow bg-white/90 hover:bg-white text-slate-800"
                                >
                                    <ChevronRight className="h-4 w-4" />
                                </Button>
                            </>
                        )}
                    </div>

                    {images.length > 1 && (
                        <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5">
                            {images.map((img, idx) => {
                                const isActive = idx === activeIdx
                                return (
                                    <button
                                        key={`${img.url}-${idx}`}
                                        type="button"
                                        onClick={() => setActiveIdx(idx)}
                                        className={`relative shrink-0 h-12 w-12 rounded overflow-hidden border-2 transition-all ${
                                            isActive
                                                ? 'border-blue-600 ring-1 ring-blue-300'
                                                : 'border-slate-200 opacity-70 hover:opacity-100'
                                        }`}
                                        title={img.label || `Foto ${idx + 1}`}
                                    >
                                        <img
                                            src={img.url}
                                            alt={`Thumb ${idx + 1}`}
                                            className="h-full w-full object-cover"
                                        />
                                        <span className="absolute bottom-0 inset-x-0 bg-black/60 text-white text-[9px] text-center truncate px-0.5">
                                            {img.label || `#${idx + 1}`}
                                        </span>
                                    </button>
                                )
                            })}
                        </div>
                    )}
                </div>
            ) : (
                <div className="flex flex-col items-center justify-center bg-slate-100/70 dark:bg-slate-800/40 rounded border border-dashed border-slate-300 dark:border-slate-700 h-64 text-slate-400 text-xs">
                    <ImageIcon className="h-8 w-8 mb-1 opacity-40" />
                    <span>{emptyText}</span>
                </div>
            )}
        </div>
    )
}

interface StoDualPhotoDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    title: string
    fromOutletLabel: string
    toOutletLabel: string
    senderImages: GalleryImageItem[]
    receiverImages: GalleryImageItem[]
}

export function StoDualPhotoDialog({
    open,
    onOpenChange,
    title,
    fromOutletLabel,
    toOutletLabel,
    senderImages,
    receiverImages,
}: StoDualPhotoDialogProps) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>{title}</DialogTitle>
                    <DialogDescription>
                        Perbandingan bukti foto pengiriman dari outlet pengirim dan bukti foto penerimaan dari outlet penerima (masing-masing hingga 3 foto).
                    </DialogDescription>
                </DialogHeader>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-2">
                    <DualPhotoPanel
                        title="1. Foto Pengiriman (Pengirim)"
                        outletLabel={`Outlet Pengirim: ${fromOutletLabel}`}
                        images={senderImages}
                        emptyText="Tidak ada foto dari pengirim"
                    />
                    <DualPhotoPanel
                        title="2. Foto Penerimaan (Penerima)"
                        outletLabel={`Outlet Penerima: ${toOutletLabel}`}
                        images={receiverImages}
                        emptyText="Tidak ada foto dari penerima"
                    />
                </div>
                <DialogFooter>
                    <Button variant="secondary" size="sm" onClick={() => onOpenChange(false)}>
                        Tutup
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
