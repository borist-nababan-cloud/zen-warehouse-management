import { useState, useEffect } from 'react'
import { useAuthUser } from '@/hooks/useAuth'
import { masterOutletService } from '@/services/masterOutletService'
import { MasterOutlet, OutletLocation } from '@/types/database'
import { DashboardLayout } from '@/components/layout/Sidebar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
    Store,
    MapPin,
    Phone,
    Mail,
    Save,
    Loader2,
    Navigation,
    ExternalLink,
    Building2,
    Layers,
    ArrowLeftRight,
    CheckCircle2,
    XCircle,
    Info
} from 'lucide-react'
import { toast } from 'sonner'

export function OutletInfoPage() {
    const { user } = useAuthUser()
    const [isLoading, setIsLoading] = useState(true)
    const [isSaving, setIsSaving] = useState(false)
    const [isLocating, setIsLocating] = useState(false)
    const [outlet, setOutlet] = useState<MasterOutlet | null>(null)

    // Form state
    const [alamat, setAlamat] = useState('')
    const [city, setCity] = useState('')
    const [province, setProvince] = useState('')
    const [noTelp, setNoTelp] = useState('')
    const [noWa, setNoWa] = useState('')
    const [email, setEmail] = useState('')
    const [lat, setLat] = useState<string>('')
    const [lng, setLng] = useState<string>('')

    useEffect(() => {
        if (user?.kode_outlet) {
            loadOutletData(user.kode_outlet)
        } else {
            setIsLoading(false)
        }
    }, [user?.kode_outlet])

    async function loadOutletData(outletCode: string) {
        setIsLoading(true)
        try {
            const data = await masterOutletService.getOutletDetail(outletCode)
            if (data) {
                setOutlet(data)
                setAlamat(data.alamat || '')
                setCity(data.city || '')
                setProvince(data.province || '')
                setNoTelp(data.no_telp || '')
                setNoWa(data.no_wa || '')
                setEmail(data.email || '')

                // Parse location
                if (data.location) {
                    if (typeof data.location === 'object' && 'lat' in data.location && 'lng' in data.location) {
                        setLat(String(data.location.lat ?? ''))
                        setLng(String(data.location.lng ?? ''))
                    } else if (typeof data.location === 'string') {
                        try {
                            const parsed = JSON.parse(data.location)
                            if (parsed && typeof parsed === 'object') {
                                setLat(String(parsed.lat ?? ''))
                                setLng(String(parsed.lng ?? ''))
                            }
                        } catch {
                            // Non-json string, ignore
                        }
                    }
                }
            } else {
                toast.error('Data outlet tidak ditemukan.')
            }
        } catch (error) {
            console.error('Failed to load outlet:', error)
            toast.error('Gagal memuat data outlet.')
        } finally {
            setIsLoading(false)
        }
    }

    // Geolocation handler
    const handleSetCurrentLocation = () => {
        if (!navigator.geolocation) {
            toast.error('Peramban Anda tidak mendukung deteksi lokasi (Geolocation).')
            return
        }

        setIsLocating(true)
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                const currentLat = pos.coords.latitude.toFixed(6)
                const currentLng = pos.coords.longitude.toFixed(6)
                setLat(currentLat)
                setLng(currentLng)
                setIsLocating(false)
                toast.success('Lokasi saat ini berhasil disematkan!')
            },
            (err) => {
                setIsLocating(false)
                console.error('Geolocation error:', err)
                if (err.code === err.PERMISSION_DENIED) {
                    toast.error('Akses lokasi ditolak oleh browser. Mohon izinkan izin lokasi.')
                } else {
                    toast.error('Gagal mendeteksi lokasi saat ini.')
                }
            },
            { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 }
        )
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!outlet || !user?.kode_outlet) {
            toast.error('Kode outlet tidak valid.')
            return
        }

        setIsSaving(true)
        try {
            // Build location JSON
            let locationPayload: OutletLocation | null = null
            const numLat = parseFloat(lat)
            const numLng = parseFloat(lng)
            if (!isNaN(numLat) && !isNaN(numLng)) {
                locationPayload = {
                    lat: numLat,
                    lng: numLng
                }
            }

            const result = await masterOutletService.updateOutletInfo(
                user.kode_outlet,
                {
                    alamat: alamat.trim() || null,
                    city: city.trim() || null,
                    province: province.trim() || null,
                    no_telp: noTelp.trim() || null,
                    no_wa: noWa.trim() || null,
                    email: email.trim() || null,
                    location: locationPayload
                },
                user.id
            )

            if (result.error) {
                toast.error(result.error)
            } else {
                toast.success('Informasi outlet berhasil diperbarui!')
                if (result.data) {
                    setOutlet(result.data)
                }
            }
        } catch (error) {
            console.error('Error saving outlet info:', error)
            toast.error('Terjadi kesalahan saat menyimpan data.')
        } finally {
            setIsSaving(false)
        }
    }

    if (isLoading) {
        return (
            <DashboardLayout>
                <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <p className="text-sm text-muted-foreground">Memuat data informasi outlet...</p>
                </div>
            </DashboardLayout>
        )
    }

    if (!user?.kode_outlet) {
        return (
            <DashboardLayout>
                <div className="max-w-2xl mx-auto mt-12">
                    <Card className="border-border/60 shadow-sm bg-card">
                        <CardHeader className="text-center">
                            <Info className="h-10 w-10 text-amber-500 mx-auto mb-2" />
                            <CardTitle className="text-lg">Akses Dibatasi</CardTitle>
                            <CardDescription>
                                Akun Anda belum memiliki relasi dengan kode outlet manapun. Silakan hubungi Super Admin untuk penugasan outlet.
                            </CardDescription>
                        </CardHeader>
                    </Card>
                </div>
            </DashboardLayout>
        )
    }

    const hasValidCoordinates = !isNaN(parseFloat(lat)) && !isNaN(parseFloat(lng))

    return (
        <DashboardLayout>
            <div className="space-y-6 max-w-5xl mx-auto pb-24">
                {/* Page Title */}
                <div className="flex items-center justify-between">
                    <div>
                        <div className="flex items-center gap-2.5">
                            <Store className="h-6 w-6 text-primary" />
                            <h1 className="text-2xl font-bold tracking-tight text-foreground">Info Outlet</h1>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                            Kelola data kontak operasional, alamat fisik, dan titik lokasi peta untuk cabang Anda.
                        </p>
                    </div>
                </div>

                {/* Header Information Card (Read-Only) */}
                <Card className="border border-border/60 shadow-sm bg-card overflow-hidden">
                    <CardHeader className="bg-muted/30 border-b border-border/40 pb-4">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                            <div>
                                <div className="flex items-center gap-2">
                                    <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-primary/10 text-primary border border-primary/20">
                                        KODE: {outlet?.kode_outlet || user.kode_outlet}
                                    </span>
                                    <CardTitle className="text-lg font-bold text-foreground">
                                        {outlet?.name_outlet || 'Outlet Cabang'}
                                    </CardTitle>
                                </div>
                                <CardDescription className="text-xs text-muted-foreground mt-1">
                                    Identitas utama outlet dikontrol secara terpusat oleh Kantor Pusat (Holding).
                                </CardDescription>
                            </div>

                            {/* Status Badges */}
                            <div className="flex flex-wrap items-center gap-2">
                                {/* Active Badge */}
                                {outlet?.active !== false ? (
                                    <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 flex items-center gap-1 font-medium">
                                        <CheckCircle2 className="h-3 w-3" />
                                        Aktif
                                    </Badge>
                                ) : (
                                    <Badge variant="outline" className="bg-rose-50 text-rose-700 border-rose-200 flex items-center gap-1 font-medium">
                                        <XCircle className="h-3 w-3" />
                                        Non-Aktif
                                    </Badge>
                                )}

                                {/* Can STO Badge */}
                                {outlet?.can_sto ? (
                                    <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 flex items-center gap-1 font-medium">
                                        <ArrowLeftRight className="h-3 w-3" />
                                        Transaksi antar Outlet: Ya
                                    </Badge>
                                ) : (
                                    <Badge variant="outline" className="bg-slate-100 text-slate-600 border-slate-200 flex items-center gap-1 font-medium">
                                        <ArrowLeftRight className="h-3 w-3" />
                                        Transaksi antar Outlet: Tidak
                                    </Badge>
                                )}

                                {/* Group Outlet Badge */}
                                <Badge variant="outline" className="bg-amber-50 text-amber-800 border-amber-200 flex items-center gap-1 font-medium">
                                    <Layers className="h-3 w-3" />
                                    Grup: {outlet?.group_outlet?.group_name || 'Umum'}
                                </Badge>
                            </div>
                        </div>
                    </CardHeader>
                </Card>

                {/* Editable Form */}
                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Section 1: Kontak & Alamat Fisik */}
                    <Card className="border border-border/60 shadow-sm bg-card">
                        <CardHeader className="bg-muted/20 border-b border-border/40 pb-3">
                            <CardTitle className="text-base font-semibold text-foreground flex items-center gap-2">
                                <Building2 className="h-4 w-4 text-primary" />
                                Alamat & Kontak Cabang
                            </CardTitle>
                            <CardDescription className="text-xs text-muted-foreground">
                                Lengkapi alamat jalan, kota, provinsi, dan saluran komunikasi outlet yang aktif.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="pt-6 space-y-5">
                            {/* Alamat Lengkap */}
                            <div className="space-y-2">
                                <Label htmlFor="alamat" className="text-xs font-medium text-foreground">
                                    Alamat Fisik / Jalan Lengkap
                                </Label>
                                <Textarea
                                    id="alamat"
                                    rows={3}
                                    placeholder="Contoh: Jl. Sukajadi No. 123, Sukajadi"
                                    value={alamat}
                                    onChange={(e) => setAlamat(e.target.value)}
                                    className="bg-background border-input resize-y text-sm"
                                />
                            </div>

                            {/* Kota & Provinsi */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="city" className="text-xs font-medium text-foreground">
                                        Kota / Kabupaten
                                    </Label>
                                    <Input
                                        id="city"
                                        placeholder="Contoh: Bandung"
                                        value={city}
                                        onChange={(e) => setCity(e.target.value)}
                                        className="h-10 bg-background border-input text-sm"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="province" className="text-xs font-medium text-foreground">
                                        Provinsi
                                    </Label>
                                    <Input
                                        id="province"
                                        placeholder="Contoh: Jawa Barat"
                                        value={province}
                                        onChange={(e) => setProvince(e.target.value)}
                                        className="h-10 bg-background border-input text-sm"
                                    />
                                </div>
                            </div>

                            {/* No Telepon, WhatsApp & Email */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="noTelp" className="text-xs font-medium text-foreground flex items-center gap-1.5">
                                        <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                                        No. Telepon Kantor
                                    </Label>
                                    <Input
                                        id="noTelp"
                                        type="tel"
                                        placeholder="Contoh: 022-1234567"
                                        value={noTelp}
                                        onChange={(e) => setNoTelp(e.target.value)}
                                        className="h-10 bg-background border-input text-sm font-mono"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="noWa" className="text-xs font-medium text-foreground flex items-center gap-1.5">
                                        <Phone className="h-3.5 w-3.5 text-emerald-600" />
                                        No. WhatsApp Outlet
                                    </Label>
                                    <Input
                                        id="noWa"
                                        type="tel"
                                        placeholder="Contoh: 081234567890"
                                        value={noWa}
                                        onChange={(e) => setNoWa(e.target.value)}
                                        className="h-10 bg-background border-input text-sm font-mono"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="email" className="text-xs font-medium text-foreground flex items-center gap-1.5">
                                        <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                                        Email Outlet
                                    </Label>
                                    <Input
                                        id="email"
                                        type="email"
                                        placeholder="Contoh: cabang@zenspa.co.id"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        className="h-10 bg-background border-input text-sm"
                                    />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Section 2: Titik Lokasi Peta & Google Maps */}
                    <Card className="border border-border/60 shadow-sm bg-card overflow-hidden">
                        <CardHeader className="bg-muted/20 border-b border-border/40 pb-3">
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                                <div>
                                    <CardTitle className="text-base font-semibold text-foreground flex items-center gap-2">
                                        <MapPin className="h-4 w-4 text-primary" />
                                        Titik Lokasi Peta (Google Maps)
                                    </CardTitle>
                                    <CardDescription className="text-xs text-muted-foreground">
                                        Tentukan koordinat Latitude & Longitude outlet untuk integrasi peta navigasi.
                                    </CardDescription>
                                </div>

                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={handleSetCurrentLocation}
                                    disabled={isLocating}
                                    className="border-primary/30 text-primary hover:bg-primary/10 flex items-center gap-1.5"
                                >
                                    {isLocating ? (
                                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                    ) : (
                                        <Navigation className="h-3.5 w-3.5" />
                                    )}
                                    Gunakan Lokasi Saat Ini
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent className="pt-6 space-y-4">
                            {/* Input Koordinat */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="lat" className="text-xs font-medium text-foreground">
                                        Latitude (Garis Lintang)
                                    </Label>
                                    <Input
                                        id="lat"
                                        placeholder="-6.917464"
                                        value={lat}
                                        onChange={(e) => setLat(e.target.value)}
                                        className="h-10 bg-background border-input text-sm font-mono"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="lng" className="text-xs font-medium text-foreground">
                                        Longitude (Garis Bujur)
                                    </Label>
                                    <Input
                                        id="lng"
                                        placeholder="107.619123"
                                        value={lng}
                                        onChange={(e) => setLng(e.target.value)}
                                        className="h-10 bg-background border-input text-sm font-mono"
                                    />
                                </div>
                            </div>

                            {/* Google Maps Preview */}
                            <div className="rounded-lg border border-border/60 overflow-hidden bg-muted/20">
                                {hasValidCoordinates ? (
                                    <div className="space-y-2 p-2">
                                        <div className="relative w-full h-[280px] rounded-md overflow-hidden bg-slate-100">
                                            <iframe
                                                title="Peta Lokasi Outlet"
                                                src={`https://maps.google.com/maps?q=${lat},${lng}&hl=id&z=16&output=embed`}
                                                className="w-full h-full border-0"
                                                loading="lazy"
                                            />
                                        </div>
                                        <div className="flex justify-end pt-1">
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="sm"
                                                asChild
                                                className="text-xs text-primary hover:text-primary/80 flex items-center gap-1.5"
                                            >
                                                <a
                                                    href={`https://www.google.com/maps?q=${lat},${lng}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                >
                                                    <ExternalLink className="h-3.5 w-3.5" />
                                                    Buka di Google Maps
                                                </a>
                                            </Button>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="p-8 text-center text-muted-foreground space-y-2">
                                        <MapPin className="h-8 w-8 mx-auto text-muted-foreground/50" />
                                        <p className="text-sm">Belum ada koordinat lokasi yang valid.</p>
                                        <p className="text-xs text-muted-foreground/80">
                                            Klik tombol <strong className="text-foreground">"Gunakan Lokasi Saat Ini"</strong> atau masukkan koordinat Latitude & Longitude di atas untuk melihat pratinjau peta.
                                        </p>
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Action Button */}
                    <div className="flex justify-end pt-2">
                        <Button
                            type="submit"
                            size="lg"
                            disabled={isSaving}
                            className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-md px-8 rounded-lg flex items-center gap-2"
                        >
                            {isSaving ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                                <Save className="h-4 w-4" />
                            )}
                            Simpan Perubahan
                        </Button>
                    </div>
                </form>
            </div>
        </DashboardLayout>
    )
}
export default OutletInfoPage
