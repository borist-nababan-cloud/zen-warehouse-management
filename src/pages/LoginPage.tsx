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
import { useSignIn } from '@/hooks/useAuth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Warehouse } from 'lucide-react'
import { toast } from 'sonner'
import { AlertCircle } from 'lucide-react'

// ============================================
// FORM VALIDATION SCHEMA
// ============================================

const loginSchema = z.object({
  email: z.string().min(1, 'Email is required').email('Invalid email address'),
  password: z.string().min(1, 'Password is required').min(6, 'Password must be at least 6 characters'),
})

type LoginFormValues = z.infer<typeof loginSchema>

// ============================================
// COMPONENT
// ============================================

export function LoginPage() {
  const navigate = useNavigate()
  const signIn = useSignIn()

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  })

  const onSubmit = async (values: LoginFormValues) => {
    try {
      const result = await signIn.mutateAsync(values)

      if (result.isSuccess && result.data) {
        toast.success(`Welcome back!`)
        navigate('/dashboard')
      } else if (result.error === 'UNASSIGNED_USER') {
        // Special handling for unassigned users
        toast.error('You are not assigned to use this application. Contact Administrator.', {
          duration: 5000,
          icon: <AlertCircle className="h-4 w-4" />,
        })
      } else {
        toast.error(result.error || 'Failed to sign in')
      }
    } catch (error) {
      toast.error('An unexpected error occurred')
      console.error(error)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 p-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="space-y-1 text-center">
          <div className="flex justify-center mb-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
              <Warehouse className="h-6 w-6 text-primary" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold">Warehouse Management</CardTitle>
          <CardDescription>
            Enter your credentials to access the system
          </CardDescription>
        </CardHeader>

        <form onSubmit={form.handleSubmit(onSubmit)}>
          <CardContent className="space-y-4">
            {/* Email Field */}
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="user@company.com"
                {...form.register('email')}
              />
              {form.formState.errors.email && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.email.message}
                </p>
              )}
            </div>

            {/* Password Field */}
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                {...form.register('password')}
              />
              {form.formState.errors.password && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.password.message}
                </p>
              )}
            </div>

            {/* Info Notice */}
            <div className="rounded-md bg-blue-50 p-3 text-sm text-blue-700">
              <p className="font-medium flex items-center gap-2">
                <AlertCircle className="h-4 w-4" />
                User Setup Required
              </p>
              <p className="mt-1">Users must be created in Supabase Studio and assigned a role before logging in.</p>
            </div>
          </CardContent>

          <CardFooter className="flex flex-col space-y-4">
            <Button
              type="submit"
              className="w-full"
              disabled={signIn.isPending}
            >
              {signIn.isPending ? 'Signing in...' : 'Sign In'}
            </Button>

            <p className="text-center text-sm text-muted-foreground">
              Don't have an account? Contact your administrator
            </p>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}
