import { useState, useRef, useEffect } from 'react'
import { Camera, Upload, Trash2, Eye, X, RefreshCw, Image as ImageIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'

const TRANSACTION_IMAGE_BUCKET = 'transaction-images'
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024 // 5 MB after compression
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp']

/**
 * Compresses an image File (especially large mobile camera photos > 1.5MB)
 * down to max 1600px dimension JPEG (quality 0.82) so it always fits well under 5MB.
 */
export async function compressImageIfNeeded(file: File): Promise<File> {
    // If already small (< 1.2 MB) and valid mime type, keep as-is
    if (file.size <= 1.2 * 1024 * 1024 && ALLOWED_MIME_TYPES.includes(file.type)) {
        return file
    }

    return new Promise((resolve, reject) => {
        const img = new Image()
        const objectUrl = URL.createObjectURL(file)

        img.onload = () => {
            URL.revokeObjectURL(objectUrl)
            const maxDim = 1600
            let { width, height } = img

            if (width > maxDim || height > maxDim) {
                if (width > height) {
                    height = Math.round((height * maxDim) / width)
                    width = maxDim
                } else {
                    width = Math.round((width * maxDim) / height)
                    height = maxDim
                }
            }

            const canvas = document.createElement('canvas')
            canvas.width = width
            canvas.height = height
            const ctx = canvas.getContext('2d')
            if (!ctx) {
                resolve(file)
                return
            }

            ctx.drawImage(img, 0, 0, width, height)
            canvas.toBlob(
                (blob) => {
                    if (!blob) {
                        resolve(file)
                        return
                    }
                    const baseName = file.name.replace(/\.[^/.]+$/, '') || 'capture'
                    const compressedFile = new File([blob], `${baseName}.jpg`, {
                        type: 'image/jpeg',
                        lastModified: Date.now(),
                    })
                    resolve(compressedFile)
                },
                'image/jpeg',
                0.82
            )
        }

        img.onerror = (err) => {
            URL.revokeObjectURL(objectUrl)
            reject(err)
        }

        img.src = objectUrl
    })
}

/**
 * Uploads a single image file to the `transaction-images` Supabase Storage bucket
 * and returns its public URL.
 */
export async function uploadTransactionImage(
    file: File,
    folder: 'sto-shipments' | 'sto-receipts' | 'goods-receipts',
    outletCode: string
): Promise<string> {
    const processedFile = await compressImageIfNeeded(file)

    if (processedFile.size > MAX_FILE_SIZE_BYTES) {
        throw new Error('Ukuran gambar melebihi batas maksimal 5 MB.')
    }

    const ext = processedFile.name.split('.').pop()?.toLowerCase() || 'jpg'
    const safeOutlet = (outletCode || 'general').replace(/[^a-zA-Z0-9_-]/g, '_')
    const filePath = `${folder}/${safeOutlet}/${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${ext}`

    const { error: uploadError } = await supabase.storage
        .from(TRANSACTION_IMAGE_BUCKET)
        .upload(filePath, processedFile, {
            cacheControl: '3600',
            upsert: true,
            contentType: processedFile.type || 'image/jpeg',
        })

    if (uploadError) {
        throw new Error(`Gagal mengunggah foto: ${uploadError.message}`)
    }

    const { data } = supabase.storage.from(TRANSACTION_IMAGE_BUCKET).getPublicUrl(filePath)
    return data.publicUrl
}

interface TransactionImageInputProps {
    label?: string
    helperText?: string
    file: File | null
    onChange: (file: File | null) => void
    disabled?: boolean
}

export function TransactionImageInput({
    label = 'Bukti Foto (Opsional)',
    helperText = 'Ambil foto langsung dari kamera perangkat atau pilih file dari galeri/penyimpanan (Maks. 1 foto, format JPG/PNG/WEBP).',
    file,
    onChange,
    disabled = false,
}: TransactionImageInputProps) {
    const fileInputRef = useRef<HTMLInputElement | null>(null)
    const cameraInputRef = useRef<HTMLInputElement | null>(null)
    const videoRef = useRef<HTMLVideoElement | null>(null)
    const streamRef = useRef<MediaStream | null>(null)

    const [previewUrl, setPreviewUrl] = useState<string | null>(null)
    const [isZoomOpen, setIsZoomOpen] = useState(false)
    const [isWebcamOpen, setIsWebcamOpen] = useState(false)
    const [isProcessing, setIsProcessing] = useState(false)

    useEffect(() => {
        if (!file) {
            setPreviewUrl(null)
            return
        }
        const url = URL.createObjectURL(file)
        setPreviewUrl(url)
        return () => URL.revokeObjectURL(url)
    }, [file])

    // Cleanup webcam stream on unmount
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

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const selected = e.target.files?.[0]
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
            onChange(compressed)
        } catch (err) {
            console.error('Failed to process image:', err)
            toast.error('Gagal memproses gambar.')
        } finally {
            setIsProcessing(false)
        }
    }

    const handleOpenCamera = async () => {
        if (disabled || isProcessing) return

        // On mobile/tablet devices, native <input capture="environment"> opens the rear camera directly
        const isMobileOrTablet = /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent)
        if (isMobileOrTablet) {
            cameraInputRef.current?.click()
            return
        }

        // On desktop/laptop, try WebRTC getUserMedia camera modal first; fallback to cameraInputRef
        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({
                    video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
                    audio: false,
                })
                streamRef.current = stream
                setIsWebcamOpen(true)
                setTimeout(() => {
                    if (videoRef.current) {
                        videoRef.current.srcObject = stream
                        videoRef.current.play().catch(() => {})
                    }
                }, 100)
                return
            } catch {
                // Fallback to native file input if no webcam or permission declined
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
                    const capturedFile = new File([blob], `camera_${Date.now()}.jpg`, {
                        type: 'image/jpeg',
                        lastModified: Date.now(),
                    })
                    onChange(capturedFile)
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

    return (
        <div className="space-y-2">
            <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-slate-800 flex items-center gap-1.5">
                    <ImageIcon className="h-4 w-4 text-blue-600" />
                    {label}
                </label>
                <span className="text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                    Opsional (Maks. 1 Foto)
                </span>
            </div>

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

            {!previewUrl ? (
                <div className="border-2 border-dashed border-slate-300 rounded-lg p-4 bg-slate-50/60 hover:bg-slate-50 transition-colors">
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                        <div className="text-xs text-slate-600 text-center sm:text-left">
                            <p className="font-medium text-slate-700">Belum ada foto dipilih</p>
                            <p className="text-slate-500 mt-0.5">{helperText}</p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                disabled={disabled || isProcessing}
                                onClick={handleOpenCamera}
                                className="border-blue-200 bg-blue-50/60 hover:bg-blue-100 text-blue-700"
                            >
                                <Camera className="h-4 w-4 mr-1.5" />
                                Ambil Foto (Kamera)
                            </Button>
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                disabled={disabled || isProcessing}
                                onClick={() => fileInputRef.current?.click()}
                            >
                                <Upload className="h-4 w-4 mr-1.5" />
                                Pilih File / Galeri
                            </Button>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="border border-slate-200 rounded-lg p-3 bg-white flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm">
                    <div className="flex items-center gap-3 w-full sm:w-auto">
                        <div
                            onClick={() => setIsZoomOpen(true)}
                            className="relative h-16 w-16 rounded-md overflow-hidden border border-slate-200 bg-slate-100 shrink-0 cursor-pointer group"
                            title="Klik untuk memperbesar"
                        >
                            <img
                                src={previewUrl}
                                alt="Preview Bukti Foto"
                                className="h-full w-full object-cover"
                            />
                            <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                <Eye className="h-4 w-4 text-white" />
                            </div>
                        </div>
                        <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium text-slate-800 truncate">
                                {file?.name || 'bukti-foto.jpg'}
                            </p>
                            <p className="text-xs text-slate-500">
                                {file ? `${(file.size / 1024).toFixed(1)} KB` : ''} • Siap diunggah
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-1.5 self-end sm:self-center shrink-0">
                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => setIsZoomOpen(true)}
                            title="Lihat ukuran penuh"
                        >
                            <Eye className="h-4 w-4 mr-1" />
                            Lihat
                        </Button>
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            disabled={disabled || isProcessing}
                            onClick={handleOpenCamera}
                            title="Ambil ulang dengan kamera"
                        >
                            <Camera className="h-4 w-4 mr-1" />
                            Kamera
                        </Button>
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            disabled={disabled || isProcessing}
                            onClick={() => fileInputRef.current?.click()}
                            title="Ganti dari file/galeri"
                        >
                            <RefreshCw className="h-3.5 w-3.5 mr-1" />
                            File
                        </Button>
                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            disabled={disabled || isProcessing}
                            onClick={() => onChange(null)}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            title="Hapus foto"
                        >
                            <Trash2 className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            )}

            {/* Full-Size Image Preview Modal */}
            <Dialog open={isZoomOpen} onOpenChange={setIsZoomOpen}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>Pratinjau Bukti Foto</DialogTitle>
                    </DialogHeader>
                    {previewUrl && (
                        <div className="flex items-center justify-center bg-slate-900/5 rounded-lg p-2 max-h-[70vh] overflow-auto">
                            <img
                                src={previewUrl}
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
                        <DialogTitle>Ambil Foto dari Kamera</DialogTitle>
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

