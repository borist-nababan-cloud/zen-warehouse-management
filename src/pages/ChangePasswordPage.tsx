import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useNavigate } from 'react-router-dom'
import { useUpdatePassword } from '@/hooks/useAuth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Lock } from 'lucide-react'
import { toast } from 'sonner'
import { DashboardLayout } from '@/components/layout/Sidebar'

// ============================================
// FORM VALIDATION SCHEMA
// ============================================

const passwordSchema = z.object({
    password: z.string().min(6, 'Password must be at least 6 characters'),
    confirmPassword: z.string().min(6, 'Password must be at least 6 characters'),
}).refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
})

type PasswordFormValues = z.infer<typeof passwordSchema>

// ============================================
// COMPONENT
// ============================================

export function ChangePasswordPage() {
    const navigate = useNavigate()
    const updatePassword = useUpdatePassword()

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
                toast.success(`Password updated successfully!`)
                navigate('/dashboard')
            } else {
                toast.error(result.error || 'Failed to update password')
            }
        } catch (error) {
            toast.error('An unexpected error occurred')
            console.error(error)
        }
    }

    return (
        <DashboardLayout>
            <div className="flex flex-col gap-6">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight">Security Settings</h2>
                    <p className="text-muted-foreground">Manage your account security and password.</p>
                </div>

                <div className="flex justify-center mt-4">
                    <Card className="w-full max-w-md">
                        <CardHeader>
                            <div className="flex items-center gap-2 mb-2">
                                <Lock className="h-5 w-5 text-primary" />
                                <CardTitle>Change Password</CardTitle>
                            </div>
                            <CardDescription>
                                Enter your new password below.
                            </CardDescription>
                        </CardHeader>

                        <form onSubmit={form.handleSubmit(onSubmit)}>
                            <CardContent className="space-y-4">
                                {/* Password Field */}
                                <div className="space-y-2">
                                    <Label htmlFor="password">New Password</Label>
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

                                {/* Confirm Password Field */}
                                <div className="space-y-2">
                                    <Label htmlFor="confirmPassword">Confirm New Password</Label>
                                    <Input
                                        id="confirmPassword"
                                        type="password"
                                        placeholder="••••••••"
                                        {...form.register('confirmPassword')}
                                    />
                                    {form.formState.errors.confirmPassword && (
                                        <p className="text-sm text-destructive">
                                            {form.formState.errors.confirmPassword.message}
                                        </p>
                                    )}
                                </div>
                            </CardContent>

                            <CardFooter className="flex justify-between">
                                <Button variant="outline" type="button" onClick={() => navigate('/dashboard')}>
                                    Cancel
                                </Button>
                                <Button
                                    type="submit"
                                    disabled={updatePassword.isPending}
                                >
                                    {updatePassword.isPending ? 'Updating...' : 'Update Password'}
                                </Button>
                            </CardFooter>
                        </form>
                    </Card>
                </div>
            </div>
        </DashboardLayout>
    )
}
