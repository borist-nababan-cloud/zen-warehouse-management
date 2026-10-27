/**
 * Auth Callback Page
 * Handles Supabase OAuth (Google) redirects, exchanges tokens,
 * validates user roles in public.users_profile, and routes to /dashboard or /login.
 */

import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { getUserProfile, signOut } from '@/services/authService'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'sonner'
import { AlertCircle, Loader2 } from 'lucide-react'

export function AuthCallbackPage() {
  const navigate = useNavigate()
  const [statusText, setStatusText] = useState('Memproses autentikasi Google...')

  useEffect(() => {
    let isSubscribed = true

    const processAuth = async () => {
      try {
        // 1. Get active session from Supabase
        const { data: sessionData, error: sessionError } = await supabase.auth.getSession()

        if (sessionError) {
          throw sessionError
        }

        const session = sessionData?.session

        if (!session?.user) {
          // If no session found immediately, wait for onAuthStateChange
          const { data: authListener } = supabase.auth.onAuthStateChange(async (event, newSession) => {
            if (event === 'SIGNED_IN' && newSession?.user && isSubscribed) {
              authListener.subscription.unsubscribe()
              await handleAuthenticatedUser(newSession.user.id, newSession.user.email || '')
            }
          })

          // Set fallback timeout in case OAuth fails or is cancelled
          const timeoutId = setTimeout(() => {
            if (isSubscribed) {
              authListener.subscription.unsubscribe()
              toast.error('Gagal menyelesaikan login Google. Sesi tidak ditemukan.')
              navigate('/login', { replace: true })
            }
          }, 6000)

          return () => {
            clearTimeout(timeoutId)
            authListener.subscription.unsubscribe()
          }
        }

        if (isSubscribed) {
          await handleAuthenticatedUser(session.user.id, session.user.email || '')
        }
      } catch (err: any) {
        console.error('OAuth Callback processing error:', err)
        if (isSubscribed) {
          toast.error(err?.message || 'Terjadi kesalahan saat memproses login Google.')
          navigate('/login', { replace: true })
        }
      }
    }

    const handleAuthenticatedUser = async (userId: string, email: string) => {
      setStatusText('Memvalidasi profil dan hak akses...')

      // 2. Query users_profile (Authoritative table in WHM)
      const profileResult = await getUserProfile(userId)

      if (!profileResult.data || profileResult.error) {
        // User has no profile yet -> create unassigned profile (role 9) via RPC
        try {
          await supabase.rpc('create_user_profile', {
            p_uid: userId,
            p_user_role: 9,
            p_email: email,
            p_kode_outlet: null,
          })
        } catch (e) {
          console.warn('Auto-create unassigned profile RPC note:', e)
        }

        await signOut()
        toast.error('Akun Anda Belum Terdaftar!', {
          description: 'Akun Anda belum memiliki hak akses (Role 9 - UNASSIGNED). Silakan hubungi Administrator.',
          duration: 7000,
          icon: <AlertCircle className="h-4 w-4" />,
        })
        navigate('/login', { replace: true })
        return
      }

      const profile = profileResult.data

      // 3. Role Gating: Role 9 (UNASSIGNED) & Role 17 (MEMBER) cannot access WHM
      if (profile.user_role === 9) {
        await signOut()
        toast.error('Akses Ditolak!', {
          description: 'Akun Anda belum memiliki role aktif (Role 9 - UNASSIGNED). Silakan hubungi Administrator.',
          duration: 7000,
          icon: <AlertCircle className="h-4 w-4" />,
        })
        navigate('/login', { replace: true })
        return
      }

      if (profile.user_role === 17) {
        await signOut()
        toast.error('Akses Ditolak!', {
          description: 'Role Member (17) tidak diizinkan mengakses aplikasi Warehouse Management.',
          duration: 7000,
          icon: <AlertCircle className="h-4 w-4" />,
        })
        navigate('/login', { replace: true })
        return
      }

      // 4. Role is authorized (1-8, 10, 11-16, 18)
      // Synchronize localStorage
      localStorage.setItem('kode_outlet', profile.kode_outlet || '')
      localStorage.setItem('user_role', profile.user_role.toString())
      localStorage.setItem('user_email', profile.email || email)

      toast.success('Login Berhasil!', {
        description: `Selamat datang kembali, ${email}`,
      })

      navigate('/dashboard', { replace: true })
    }

    processAuth()

    return () => {
      isSubscribed = false
    }
  }, [navigate])

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 p-4">
      <Card className="w-full max-w-md shadow-lg border-primary/20">
        <CardHeader className="text-center pb-2">
          <CardTitle className="text-xl font-bold flex items-center justify-center gap-2">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
            Autentikasi Google
          </CardTitle>
          <CardDescription>
            Menyambungkan ke sistem Zen Warehouse Management
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center py-6">
          <div className="flex flex-col items-center justify-center space-y-3">
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
            <p className="text-sm font-medium text-muted-foreground animate-pulse">
              {statusText}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
