/**
 * Auth Callback Page
 * Handles Supabase OAuth (Google) redirects, exchanges tokens,
 * validates user roles in public.users_profile, and routes to /dashboard or /login.
 */

import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import type { User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { getOutletByCode, getUserProfile, signOut } from '@/services/authService'
import { authQueryKeys } from '@/hooks/useAuth'
import type { AuthUser } from '@/types/database'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'sonner'
import { AlertCircle, Loader2 } from 'lucide-react'

export function AuthCallbackPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const handledRef = useRef(false)
  const [statusText, setStatusText] = useState('Memproses autentikasi Google...')

  useEffect(() => {
    let isSubscribed = true
    let timeoutId: ReturnType<typeof setTimeout> | null = null
    let authUnsubscribe: (() => void) | null = null

    const handleAuthenticatedUser = async (
      userId: string,
      email: string,
      sessionUser?: User
    ) => {
      if (!isSubscribed || handledRef.current) return
      handledRef.current = true

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
        queryClient.setQueryData(authQueryKeys.user, null)
        toast.error('Akun Anda Belum Terdaftar!', {
          description: 'Akun Anda belum memiliki hak akses (Role 9 - UNASSIGNED). Silakan hubungi Administrator.',
          duration: 7000,
          icon: <AlertCircle className="h-4 w-4" />,
        })
        if (isSubscribed) navigate('/login', { replace: true })
        return
      }

      const profile = profileResult.data

      // 3. Role Gating: Role 9 (UNASSIGNED) & Role 17 (MEMBER) cannot access WHM
      if (profile.user_role === 9) {
        await signOut()
        queryClient.setQueryData(authQueryKeys.user, null)
        toast.error('Akses Ditolak!', {
          description: 'Akun Anda belum memiliki role aktif (Role 9 - UNASSIGNED). Silakan hubungi Administrator.',
          duration: 7000,
          icon: <AlertCircle className="h-4 w-4" />,
        })
        if (isSubscribed) navigate('/login', { replace: true })
        return
      }

      if (profile.user_role === 17) {
        await signOut()
        queryClient.setQueryData(authQueryKeys.user, null)
        toast.error('Akses Ditolak!', {
          description: 'Role Member (17) tidak diizinkan mengakses aplikasi Warehouse Management.',
          duration: 7000,
          icon: <AlertCircle className="h-4 w-4" />,
        })
        if (isSubscribed) navigate('/login', { replace: true })
        return
      }

      // 4. Role is authorized (1-8, 10, 11-16, 18)
      // Synchronize localStorage
      localStorage.setItem('kode_outlet', profile.kode_outlet || '')
      localStorage.setItem('user_role', profile.user_role.toString())
      localStorage.setItem('user_email', profile.email || email)

      let outlet = null
      if (profile.kode_outlet) {
        const outletResult = await getOutletByCode(profile.kode_outlet)
        outlet = outletResult.data
      }

      const provider =
        sessionUser?.app_metadata?.provider ||
        (sessionUser?.identities?.some((id) => id.provider === 'google')
          ? 'google'
          : 'email')

      const authUser: AuthUser = {
        id: profile.uid,
        email: profile.email,
        user_role: profile.user_role,
        kode_outlet: profile.kode_outlet,
        full_name: profile.full_name,
        provider,
        app_metadata: sessionUser?.app_metadata,
        profile,
        outlet,
      }

      queryClient.setQueryData(authQueryKeys.user, authUser)

      toast.success('Login Berhasil!', {
        description: `Selamat datang kembali, ${email}`,
      })

      if (isSubscribed) {
        navigate('/dashboard', { replace: true })
      }
    }

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
          const { data: authListener } = supabase.auth.onAuthStateChange((event, newSession) => {
            if (
              (event === 'SIGNED_IN' || event === 'INITIAL_SESSION') &&
              newSession?.user &&
              isSubscribed &&
              !handledRef.current
            ) {
              if (timeoutId) {
                clearTimeout(timeoutId)
                timeoutId = null
              }
              authListener.subscription.unsubscribe()
              authUnsubscribe = null
              const targetUser = newSession.user
              setTimeout(() => {
                void handleAuthenticatedUser(
                  targetUser.id,
                  targetUser.email || '',
                  targetUser
                )
              }, 0)
            }
          })
          authUnsubscribe = () => authListener.subscription.unsubscribe()

          // Set fallback timeout in case OAuth fails or is cancelled
          timeoutId = setTimeout(() => {
            if (isSubscribed && !handledRef.current) {
              if (authUnsubscribe) {
                authUnsubscribe()
                authUnsubscribe = null
              }
              toast.error('Gagal menyelesaikan login Google. Sesi tidak ditemukan.')
              navigate('/login', { replace: true })
            }
          }, 8000)

          return
        }

        if (isSubscribed && !handledRef.current) {
          await handleAuthenticatedUser(
            session.user.id,
            session.user.email || '',
            session.user
          )
        }
      } catch (err: any) {
        console.error('OAuth Callback processing error:', err)
        if (isSubscribed && !handledRef.current) {
          toast.error(err?.message || 'Terjadi kesalahan saat memproses login Google.')
          navigate('/login', { replace: true })
        }
      }
    }

    void processAuth()

    return () => {
      isSubscribed = false
      if (timeoutId) {
        clearTimeout(timeoutId)
      }
      if (authUnsubscribe) {
        authUnsubscribe()
      }
    }
  }, [navigate, queryClient])

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
