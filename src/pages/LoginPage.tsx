/**
 * Login Page
 *
 * Handles user authentication with email and password.
 * Uses React Hook Form for form management and Zod for validation.
 *
 * UPDATED: Now handles unassigned users (role=9) with appropriate error message
 */

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useNavigate } from 'react-router-dom'
import { useSignIn, useSignInWithGoogle } from '@/hooks/useAuth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'sonner'
import { AlertCircle } from 'lucide-react'

// ============================================
// FORM VALIDATION SCHEMA
// ============================================

const loginSchema = z.object({
  email: z.string().min(1, 'Email wajib diisi').email('Format alamat email tidak valid'),
  password: z.string().min(1, 'Kata sandi wajib diisi').min(6, 'Kata sandi minimal 6 karakter'),
})

type LoginFormValues = z.infer<typeof loginSchema>

// ============================================
// COMPONENT
// ============================================

import { Footer } from '@/components/layout/Footer'

export function LoginPage() {
  const navigate = useNavigate()
  const signIn = useSignIn()
  const signInWithGoogleMutation = useSignInWithGoogle()
  const appName = import.meta.env.VITE_APP_NAME || 'Warehouse Management'
  const version = import.meta.env.VITE_APP_VERSION || 'v1.0.0'
  const companyName = import.meta.env.VITE_COMPANY_NAME || 'Zen Family Spa & Reflexology'

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  })

  const handleGoogleSignIn = async () => {
    try {
      await signInWithGoogleMutation.mutateAsync(undefined)
    } catch (error: any) {
      toast.error(error?.message || 'Failed to initialize Google Sign-In')
      console.error(error)
    }
  }

  const onSubmit = async (values: LoginFormValues) => {
    try {
      const result = await signIn.mutateAsync(values)

      if (result.isSuccess && result.data) {
        toast.success(`Selamat datang kembali!`)
        navigate('/dashboard')
      } else if (result.error === 'UNASSIGNED_USER') {
        // Special handling for unassigned users
        toast.error('Akun Anda belum memiliki role aktif untuk aplikasi ini. Silakan hubungi Administrator.', {
          duration: 5000,
          icon: <AlertCircle className="h-4 w-4" />,
        })
      } else if (result.error?.startsWith('Role ') || result.error === 'UNAUTHORIZED_ROLE') {
        toast.error(result.error, {
          duration: 6000,
          icon: <AlertCircle className="h-4 w-4" />,
        })
      } else if (result.error === 'Invalid login credentials' || result.error?.includes('Invalid login credentials')) {
        toast.error('Email atau kata sandi tidak valid. Silakan periksa kembali akun Anda.', {
          duration: 5000,
          icon: <AlertCircle className="h-4 w-4" />,
        })
      } else {
        toast.error(result.error || 'Gagal masuk ke akun')
      }
    } catch {
      toast.error('Terjadi kesalahan yang tidak terduga. Silakan coba lagi.')
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-zen-linen">
      <div className="flex flex-1 items-center justify-center p-4 sm:p-6">
        <Card className="w-full max-w-md bg-white rounded-3xl border border-zen-border shadow-xs">
          <CardHeader className="space-y-2 text-center pb-2">
            <div className="flex justify-center mb-2">
              <div className="p-3 rounded-2xl bg-white shadow-xs border border-zen-border">
                <img
                  src="/Logo150x150.png"
                  alt="Zen Family Spa Logo"
                  className="h-16 w-16 object-contain"
                  onError={(e) => {
                    (e.target as HTMLElement).style.display = 'none'
                  }}
                />
              </div>
            </div>
            <CardTitle className="text-2xl font-bold font-serif text-zen-charcoal tracking-wide">
              {appName}
            </CardTitle>
            <CardDescription className="text-xs text-zen-charcoal/60">
              {companyName} • {version}
            </CardDescription>
          </CardHeader>

          <form onSubmit={form.handleSubmit(onSubmit)}>
            <CardContent className="space-y-4 pt-2">
              {/* Google OAuth Login */}
              <Button
                type="button"
                variant="outline"
                className="w-full flex items-center justify-center gap-3 py-5 rounded-xl border-zen-border hover:bg-zen-sand/15 transition-all font-medium text-zen-charcoal shadow-xs"
                onClick={handleGoogleSignIn}
                disabled={signInWithGoogleMutation.isPending || signIn.isPending}
              >
                <svg className="h-5 w-5" viewBox="0 0 24 24">
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
                {signInWithGoogleMutation.isPending ? 'Mengalihkan ke Google...' : 'Masuk dengan Google'}
              </Button>

              <div className="relative my-4">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-zen-border" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-white px-2 text-zen-charcoal/60">
                    Atau masuk dengan email
                  </span>
                </div>
              </div>

              {/* Email Field */}
              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-xs font-semibold text-zen-charcoal">
                  Email
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="pengguna@zenfamilyspa.id"
                  className="rounded-xl border-zen-border bg-zen-linen/30 focus-visible:ring-zen-matcha"
                  {...form.register('email')}
                />
                {form.formState.errors.email && (
                  <p className="text-xs text-red-600">
                    {form.formState.errors.email.message}
                  </p>
                )}
              </div>

              {/* Password Field */}
              <div className="space-y-1.5">
                <Label htmlFor="password" className="text-xs font-semibold text-zen-charcoal">
                  Kata Sandi
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

              {/* Info Notice */}
              <div className="rounded-2xl bg-zen-matcha/10 border border-zen-matcha/20 p-3 text-xs text-zen-charcoal">
                <p className="font-semibold flex items-center gap-2 text-zen-moss">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  Registrasi Role Diperlukan
                </p>
                <p className="mt-1 text-zen-charcoal/80">
                  Pengguna baru harus dibuat atau disetujui oleh Administrator dengan penetapan role sebelum dapat mengakses modul gudang.
                </p>
              </div>
            </CardContent>

            <CardFooter className="flex flex-col space-y-3 pt-2">
              <Button
                type="submit"
                className="w-full bg-zen-matcha hover:bg-zen-moss text-white font-semibold rounded-xl shadow-xs py-2.5"
                disabled={signIn.isPending}
              >
                {signIn.isPending ? 'Sedang Masuk...' : 'Masuk'}
              </Button>

              <p className="text-center text-xs text-zen-charcoal/60">
                Belum memiliki akun? Hubungi administrator sistem Anda
              </p>
            </CardFooter>
          </form>
        </Card>
      </div>
      <Footer />
    </div>
  )
}
