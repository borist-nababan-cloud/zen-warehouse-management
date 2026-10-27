import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useNavigate } from 'react-router-dom'
import { useAuthUser, useUpdatePassword } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Lock, ArrowLeft, AlertCircle, ShieldCheck, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'
import { DashboardLayout } from '@/components/layout/Sidebar'

// ============================================
// FORM VALIDATION SCHEMA
// ============================================

const passwordSchema = z.object({
  password: z.string().min(6, 'Kata sandi minimal 6 karakter'),
  confirmPassword: z.string().min(6, 'Kata sandi minimal 6 karakter'),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Konfirmasi kata sandi tidak cocok',
  path: ['confirmPassword'],
})

type PasswordFormValues = z.infer<typeof passwordSchema>

// ============================================
// COMPONENT
// ============================================

export function ChangePasswordPage() {
  const navigate = useNavigate()
  const { user: currentUser, isLoading: authLoading } = useAuthUser()
  const updatePassword = useUpdatePassword()

  const [provider, setProvider] = useState<string | null>(null)
  const [checkingProvider, setCheckingProvider] = useState(true)

  // Detect whether user authenticated via Google OAuth or Email-Password
  useEffect(() => {
    async function detectAuthProvider() {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          const isGoogle =
            user.app_metadata?.provider === 'google' ||
            user.app_metadata?.providers?.includes('google') ||
            user.identities?.some((id) => id.provider === 'google')

          setProvider(isGoogle ? 'google' : 'email')
        }
      } catch (err) {
        console.warn('Failed to detect auth provider:', err)
      } finally {
        setCheckingProvider(false)
      }
    }

    detectAuthProvider()
  }, [])

  const form = useForm<PasswordFormValues>({
    resolver: zodResolver(passwordSchema),
    defaultValues: {
      password: '',
      confirmPassword: '',
    },
  })

  const onSubmit = async (values: PasswordFormValues) => {
    try {
      const result = await updatePassword.mutateAsync(values.password)

      if (result.isSuccess) {
        toast.success('Kata sandi berhasil diperbarui!')
        navigate('/dashboard')
      } else {
        toast.error(result.error || 'Gagal memperbarui kata sandi')
      }
    } catch (error) {
      toast.error('Terjadi kesalahan yang tidak terduga')
      console.error(error)
    }
  }

  const isGoogleUser = provider === 'google' || currentUser?.provider === 'google'
  const isLoading = authLoading || checkingProvider

  return (
    <DashboardLayout>
      <div className="flex flex-col gap-6 max-w-4xl mx-auto">
        {/* Header Title */}
        <div>
          <h2 className="text-xl md:text-2xl font-bold font-serif text-zen-charcoal tracking-wide">
            Pengaturan Keamanan
          </h2>
          <p className="text-xs md:text-sm text-zen-charcoal/65 mt-0.5">
            Kelola kata sandi dan metode autentikasi akun Anda.
          </p>
        </div>

        <div className="flex justify-center mt-2">
          {isLoading ? (
            <Card className="w-full max-w-md bg-white rounded-3xl border border-zen-border shadow-xs p-8 text-center">
              <RefreshCw className="h-6 w-6 text-zen-matcha animate-spin mx-auto mb-3" />
              <p className="text-xs text-zen-charcoal/70">Memeriksa metode autentikasi akun...</p>
            </Card>
          ) : isGoogleUser ? (
            /* ====================================================
               GOOGLE OAUTH NOTICE - PASSWORD CHANGE DISABLED
               ==================================================== */
            <Card className="w-full max-w-md bg-white rounded-3xl border border-zen-border shadow-xs overflow-hidden">
              <CardHeader className="text-center pb-2 pt-6">
                <div className="mx-auto w-14 h-14 rounded-2xl bg-white border border-zen-border shadow-xs flex items-center justify-center mb-3">
                  <svg className="h-7 w-7" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                    />
                  </svg>
                </div>
                <CardTitle className="text-xl font-bold font-serif text-zen-charcoal">
                  Masuk via Akun Google
                </CardTitle>
                <CardDescription className="text-xs text-zen-charcoal/65 mt-1">
                  Akun Anda terhubung dengan Google OAuth
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-4 pt-2">
                <div className="rounded-2xl bg-zen-sand/20 border border-zen-sand/40 p-4 text-xs text-zen-charcoal space-y-2">
                  <div className="flex items-center gap-2 font-semibold text-zen-charcoal">
                    <ShieldCheck className="h-4 w-4 text-zen-matcha shrink-0" />
                    <span>Keamanan Dikelola Oleh Google</span>
                  </div>
                  <p className="text-zen-charcoal/80 leading-relaxed">
                    Anda masuk ke aplikasi ini menggunakan akun Google{' '}
                    <strong className="text-zen-charcoal">{currentUser?.email}</strong>.
                    Kata sandi Anda dikelola dan diamankan sepenuhnya oleh Google, sehingga fitur ubah kata sandi lokal tidak berlaku untuk akun ini.
                  </p>
                </div>

                <div className="rounded-2xl bg-amber-50/80 border border-amber-200/70 p-3.5 text-xs text-amber-800 flex items-start gap-2.5">
                  <AlertCircle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                  <p className="leading-relaxed">
                    Halaman ubah kata sandi ini hanya berfungsi untuk pengguna yang terdaftar secara manual dengan metode <strong>Email & Kata Sandi</strong>.
                  </p>
                </div>
              </CardContent>

              <CardFooter className="pt-2 pb-6 flex justify-center">
                <Button
                  type="button"
                  onClick={() => navigate('/dashboard')}
                  className="w-full bg-zen-matcha hover:bg-zen-moss text-white font-semibold rounded-xl shadow-xs py-2.5 flex items-center justify-center gap-2"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Kembali ke Dasbor
                </Button>
              </CardFooter>
            </Card>
          ) : (
            /* ====================================================
               EMAIL-PASSWORD USER - PASSWORD FORM ENABLED
               ==================================================== */
            <Card className="w-full max-w-md bg-white rounded-3xl border border-zen-border shadow-xs">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2.5 mb-1">
                  <div className="p-2 rounded-xl bg-zen-matcha/15 text-zen-moss">
                    <Lock className="h-5 w-5" />
                  </div>
                  <div>
                    <CardTitle className="text-lg font-bold font-serif text-zen-charcoal">
                      Ubah Kata Sandi
                    </CardTitle>
                    <CardDescription className="text-xs text-zen-charcoal/65">
                      Untuk akun email: {currentUser?.email}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>

              <form onSubmit={form.handleSubmit(onSubmit)}>
                <CardContent className="space-y-4 pt-1">
                  {/* Password Field */}
                  <div className="space-y-1.5">
                    <Label htmlFor="password" className="text-xs font-semibold text-zen-charcoal">
                      Kata Sandi Baru
                    </Label>
                    <Input
                      id="password"
                      type="password"
                      placeholder="••••••••"
                      className="rounded-xl border-zen-border bg-zen-linen/30 focus-visible:ring-zen-matcha"
                      {...form.register('password')}
                    />
                    {form.formState.errors.password && (
                      <p className="text-xs text-red-600">
                        {form.formState.errors.password.message}
                      </p>
                    )}
                  </div>

                  {/* Confirm Password Field */}
                  <div className="space-y-1.5">
                    <Label htmlFor="confirmPassword" className="text-xs font-semibold text-zen-charcoal">
                      Konfirmasi Kata Sandi Baru
                    </Label>
                    <Input
                      id="confirmPassword"
                      type="password"
                      placeholder="••••••••"
                      className="rounded-xl border-zen-border bg-zen-linen/30 focus-visible:ring-zen-matcha"
                      {...form.register('confirmPassword')}
                    />
                    {form.formState.errors.confirmPassword && (
                      <p className="text-xs text-red-600">
                        {form.formState.errors.confirmPassword.message}
                      </p>
                    )}
                  </div>
                </CardContent>

                <CardFooter className="flex justify-between gap-3 pt-3">
                  <Button
                    variant="outline"
                    type="button"
                    onClick={() => navigate('/dashboard')}
                    className="rounded-xl border-zen-border text-zen-charcoal hover:bg-zen-sand/20 text-xs px-4"
                  >
                    Batal
                  </Button>
                  <Button
                    type="submit"
                    disabled={updatePassword.isPending}
                    className="bg-zen-matcha hover:bg-zen-moss text-white font-semibold rounded-xl shadow-xs text-xs px-5"
                  >
                    {updatePassword.isPending ? 'Memperbarui...' : 'Simpan Kata Sandi'}
                  </Button>
                </CardFooter>
              </form>
            </Card>
          )}
        </div>
      </div>
    </DashboardLayout>
  )
}
