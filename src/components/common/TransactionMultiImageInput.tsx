import { useState, useRef, useEffect } from 'react'
import { Camera, Upload, Trash2, Eye, X, RefreshCw, Image as ImageIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { toast } from 'sonner'
import { compressImageIfNeeded } from './TransactionImageInput'

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024 // 5 MB after compression

interface TransactionMultiImageInputProps {
    label?: string
    helperText?: string
    files: (File | null)[]
    onChange: (files: (File | null)[]) => void
    maxImages?: number
    slotLabels?: string[]
    disabled?: boolean
}

export function TransactionMultiImageInput({
    label = 'Bukti Foto (Opsional)',
    helperText = 'Ambil foto langsung dari kamera perangkat atau pilih file dari galeri/penyimpanan (format JPG/PNG/WEBP).',
    files,
    onChange,
    maxImages = 3,
    slotLabels = ['Foto 1 (Surat Jalan)', 'Foto 2 (Kondisi Barang)', 'Foto 3 (Tambahan)'],
    disabled = false,
}: TransactionMultiImageInputProps) {
    const fileInputRef = useRef<HTMLInputElement | null>(null)
    const cameraInputRef = useRef<HTMLInputElement | null>(null)
    const videoRef = useRef<HTMLVideoElement | null>(null)
    const streamRef = useRef<MediaStream | null>(null)
    const activeSlotRef = useRef<number>(0)

    const [previewUrls, setPreviewUrls] = useState<(string | null)[]>([])
    const [zoomSlotIndex, setZoomSlotIndex] = useState<number | null>(null)
    const [isWebcamOpen, setIsWebcamOpen] = useState(false)
    const [webcamSlotIndex, setWebcamSlotIndex] = useState<number>(0)
    const [isProcessing, setIsProcessing] = useState(false)

    const normalizedFiles = Array.from({ length: maxImages }, (_, idx) => files[idx] ?? null)
    const filledCount = normalizedFiles.filter(Boolean).length

    useEffect(() => {
        const urls = normalizedFiles.map((f) => (f ? URL.createObjectURL(f) : null))
        setPreviewUrls(urls)
        return () => {
            urls.forEach((u) => {
                if (u) URL.revokeObjectURL(u)
            })
        }
    }, [files, maxImages])

    useEffect(() => {
        return () => {
            stopWebcamStream()
        }
    }, [])

    const stopWebcamStream = () => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach((track) => track.stop())
            streamRef.current = null
        }
    }

    const updateSlot = (slotIdx: number, nextFile: File | null) => {
        const next = Array.from({ length: maxImages }, (_, i) => (i === slotIdx ? nextFile : normalizedFiles[i]))
        onChange(next)
    }

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const selected = e.target.files?.[0]
        const targetSlot = activeSlotRef.current
        e.target.value = ''
        if (!selected) return

        if (!selected.type.startsWith('image/')) {
            toast.error('Format file tidak didukung. Gunakan foto JPG, PNG, atau WEBP.')
            return
        }

        try {
            setIsProcessing(true)
            const compressed = await compressImageIfNeeded(selected)
            if (compressed.size > MAX_FILE_SIZE_BYTES) {
                toast.error('Ukuran foto terlalu besar (Maksimal 5 MB).')
                return
            }
            updateSlot(targetSlot, compressed)
        } catch (err) {
            console.error('Failed to process image:', err)
            toast.error('Gagal memproses gambar.')
        } finally {
            setIsProcessing(false)
        }
    }

    const triggerGalleryForSlot = (slotIdx: number) => {
        if (disabled || isProcessing) return
        activeSlotRef.current = slotIdx
        fileInputRef.current?.click()
    }

    const handleOpenCameraForSlot = async (slotIdx: number) => {
        if (disabled || isProcessing) return
        activeSlotRef.current = slotIdx

        const isMobileOrTablet = /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent)
        if (isMobileOrTablet) {
            cameraInputRef.current?.click()
            return
        }

        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({
                    video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
                    audio: false,
                })
                streamRef.current = stream
                setWebcamSlotIndex(slotIdx)
                setIsWebcamOpen(true)
                setTimeout(() => {
                    if (videoRef.current) {
                        videoRef.current.srcObject = stream
                        videoRef.current.play().catch(() => {})
                    }
                }, 100)
                return
            } catch {
                cameraInputRef.current?.click()
            }
        } else {
            cameraInputRef.current?.click()
        }
    }

    const handleCaptureWebcam = () => {
        if (!videoRef.current) return
        const video = videoRef.current
        const canvas = document.createElement('canvas')
        canvas.width = video.videoWidth || 1280
        canvas.height = video.videoHeight || 720
        const ctx = canvas.getContext('2d')
        if (!ctx) return

        ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
        canvas.toBlob(
            (blob) => {
                if (blob) {
                    const capturedFile = new File([blob], `camera_slot${webcamSlotIndex + 1}_${Date.now()}.jpg`, {
                        type: 'image/jpeg',
                        lastModified: Date.now(),
                    })
                    updateSlot(webcamSlotIndex, capturedFile)
                }
                stopWebcamStream()
                setIsWebcamOpen(false)
            },
            'image/jpeg',
            0.85
        )
    }

    const handleCloseWebcam = () => {
        stopWebcamStream()
        setIsWebcamOpen(false)
    }

    const activeZoomUrl = zoomSlotIndex !== null ? previewUrls[zoomSlotIndex] : null

    return (
        <div className="space-y-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
                <label className="text-sm font-medium text-slate-800 flex items-center gap-1.5">
                    <ImageIcon className="h-4 w-4 text-blue-600" />
                    {label}
                </label>
                <span className="text-xs text-slate-600 bg-slate-100 px-2.5 py-0.5 rounded font-medium">
                    Terisi {filledCount} / {maxImages} Foto
                </span>
            </div>
            <p className="text-xs text-slate-500">{helperText}</p>

            {/* Hidden Native Inputs */}
            <input
                ref={cameraInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                disabled={disabled || isProcessing}
                onChange={handleFileSelect}
            />
            <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                disabled={disabled || isProcessing}
                onChange={handleFileSelect}
            />

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {normalizedFiles.map((fileItem, idx) => {
                    const slotTitle = slotLabels[idx] || `Foto ${idx + 1}`
                    const thumbUrl = previewUrls[idx]

                    return (
                        <div
                            key={idx}
                            className={`rounded-lg border p-3 flex flex-col justify-between gap-2.5 ${
                                thumbUrl
                                    ? 'border-blue-200 bg-white shadow-sm'
                                    : 'border-dashed border-slate-300 bg-slate-50/60'
                            }`}
                        >
                            <div className="flex items-center justify-between gap-1">
                                <span className="text-xs font-semibold text-slate-700 truncate">{slotTitle}</span>
                                {thumbUrl && (
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        disabled={disabled || isProcessing}
                                        onClick={() => updateSlot(idx, null)}
                                        className="h-6 w-6 text-red-600 hover:text-red-700 hover:bg-red-50 shrink-0"
                                        title={`Hapus ${slotTitle}`}
                                    >
                                        <Trash2 className="h-3.5 w-3.5" />
                                    </Button>
                                )}
                            </div>

                            {thumbUrl && fileItem ? (
                                <>
                                    <div
                                        onClick={() => setZoomSlotIndex(idx)}
                                        className="relative h-32 w-full rounded-md overflow-hidden border border-slate-200 bg-slate-100 cursor-pointer group"
                                        title="Klik untuk memperbesar"
                                    >
                                        <img
                                            src={thumbUrl}
                                            alt={slotTitle}
                                            className="h-full w-full object-cover"
                                        />
                                        <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                            <Eye className="h-5 w-5 text-white" />
                                        </div>
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-xs font-medium text-slate-800 truncate">{fileItem.name}</p>
                                        <p className="text-[11px] text-slate-500">
                                            {(fileItem.size / 1024).toFixed(1)} KB • Siap diunggah
                                        </p>
                                    </div>
                                    <div className="grid grid-cols-3 gap-1">
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => setZoomSlotIndex(idx)}
                                            className="h-7 text-[11px] px-1.5"
                                        >
                                            <Eye className="h-3 w-3 mr-1" />
                                            Lihat
                                        </Button>
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            disabled={disabled || isProcessing}
                                            onClick={() => handleOpenCameraForSlot(idx)}
                                            className="h-7 text-[11px] px-1.5"
                                        >
                                            <Camera className="h-3 w-3 mr-1" />
                                            Kamera
                                        </Button>
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            disabled={disabled || isProcessing}
                                            onClick={() => triggerGalleryForSlot(idx)}
                                            className="h-7 text-[11px] px-1.5"
                                        >
                                            <RefreshCw className="h-3 w-3 mr-1" />
                                            File
                                        </Button>
                                    </div>
                                </>
                            ) : (
                                <div className="py-4 flex flex-col items-center justify-center text-center gap-2.5">
                                    <span className="text-[11px] text-slate-500">Belum ada foto</span>
                                    <div className="flex flex-wrap items-center justify-center gap-1.5">
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            disabled={disabled || isProcessing}
                                            onClick={() => handleOpenCameraForSlot(idx)}
                                            className="h-8 text-xs border-blue-200 bg-blue-50/60 hover:bg-blue-100 text-blue-700"
                                        >
                                            <Camera className="h-3.5 w-3.5 mr-1" />
                                            Kamera
                                        </Button>
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            disabled={disabled || isProcessing}
                                            onClick={() => triggerGalleryForSlot(idx)}
                                            className="h-8 text-xs"
                                        >
                                            <Upload className="h-3.5 w-3.5 mr-1" />
                                            Galeri
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </div>
                    )
                })}
            </div>

            {/* Full-Size Image Preview Modal */}
            <Dialog open={zoomSlotIndex !== null} onOpenChange={(open) => !open && setZoomSlotIndex(null)}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>
                            Pratinjau {zoomSlotIndex !== null ? slotLabels[zoomSlotIndex] || `Foto ${zoomSlotIndex + 1}` : 'Bukti Foto'}
                        </DialogTitle>
                    </DialogHeader>
                    {activeZoomUrl && (
                        <div className="flex items-center justify-center bg-slate-900/5 rounded-lg p-2 max-h-[70vh] overflow-auto">
                            <img
                                src={activeZoomUrl}
                                alt="Bukti Foto Penuh"
                                className="max-h-[65vh] w-auto object-contain rounded"
                            />
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            {/* Desktop Webcam Capture Modal */}
            <Dialog open={isWebcamOpen} onOpenChange={(open) => !open && handleCloseWebcam()}>
                <DialogContent className="max-w-lg">
                    <DialogHeader>
                        <DialogTitle>
                            Ambil Foto ({slotLabels[webcamSlotIndex] || `Foto ${webcamSlotIndex + 1}`})
                        </DialogTitle>
                    </DialogHeader>
                    <div className="relative bg-black rounded-lg overflow-hidden aspect-video flex items-center justify-center">
                        <video
                            ref={videoRef}
                            autoPlay
                            playsInline
                            muted
                            className="w-full h-full object-cover"
                        />
                    </div>
                    <DialogFooter className="flex justify-between sm:justify-end gap-2">
                        <Button type="button" variant="outline" onClick={handleCloseWebcam}>
                            <X className="h-4 w-4 mr-1.5" />
                            Batal
                        </Button>
                        <Button
                            type="button"
                            onClick={handleCaptureWebcam}
                            className="bg-blue-600 hover:bg-blue-700 text-white"
                        >
                            <Camera className="h-4 w-4 mr-1.5" />
                            Jepret Foto
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
