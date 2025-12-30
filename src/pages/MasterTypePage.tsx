/**
 * Master Type Page - Master Data > Type
 *
 * READ-ONLY display of master_type table.
 * All authenticated users (roles 1-8) can view this page.
 * No CRUD operations - data is managed via Supabase Studio by administrators.
 */

import { useAllTypes } from '@/hooks/useMasterType'
import { ProtectedRoute } from '@/components/ProtectedRoute'
import { DashboardLayout } from '@/components/layout/Sidebar'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { AlertCircle, Search, RefreshCw } from 'lucide-react'
import { useState } from 'react'

// ============================================
// MAIN MASTER TYPE PAGE COMPONENT
// ============================================

export function MasterTypePage() {
  const [searchQuery, setSearchQuery] = useState('')

  // Query - useAllTypes returns ApiResponse<MasterType[]>
  const { data, isLoading, error, refetch } = useAllTypes()
  const types = data?.data || []

  // Filter types based on search
  const filteredTypes = types.filter((type) => {
    if (!searchQuery) return true
    const query = searchQuery.toLowerCase()
    return (
      type.nama_type?.toLowerCase().includes(query) ||
      type.description?.toLowerCase().includes(query) ||
      type.id.toString().includes(query)
    )
  })

  const handleRetry = () => {
    refetch()
  }

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="flex items-center gap-3 text-muted-foreground">
            <RefreshCw className="h-5 w-5 animate-spin" />
            <p>Loading product types...</p>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  if (error) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center h-64 gap-4">
          <div className="flex items-center gap-3 text-destructive">
            <AlertCircle className="h-5 w-5" />
            <p>Failed to load product types</p>
          </div>
          <Button onClick={handleRetry}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Retry
          </Button>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <ProtectedRoute allowedRoles={[1, 2, 3, 4, 5, 6, 7, 8]}>
      <DashboardLayout>
        <div className="space-y-6">
          {/* Header */}
          <div>
            <h1 className="text-3xl font-bold">Product Types</h1>
            <p className="text-muted-foreground mt-1">
              View all product type categories
              <span className="ml-2 text-amber-600 font-medium">
                (Read-only)
              </span>
            </p>
          </div>

          {/* Info Notice */}
          <Card className="border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-900">
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-500 mt-0.5 shrink-0" />
                <div className="text-sm">
                  <p className="font-medium text-amber-900 dark:text-amber-100">
                    Read-Only Access
                  </p>
                  <p className="text-amber-700 dark:text-amber-300 mt-1">
                    Product types are managed by administrators through Supabase Studio.
                    Contact your system administrator to add, modify, or remove product types.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Stats Cards */}
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardContent className="pt-6">
                <p className="text-sm text-muted-foreground">Total Types</p>
                <p className="text-3xl font-bold mt-1">{types.length}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <p className="text-sm text-muted-foreground">Displayed</p>
                <p className="text-3xl font-bold mt-1">{filteredTypes.length}</p>
              </CardContent>
            </Card>
          </div>

          {/* Search */}
          <Card>
            <CardContent className="pt-6">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search by ID, type name, or description..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </CardContent>
          </Card>

          {/* Data Table */}
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-muted">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-medium">ID</th>
                      <th className="px-4 py-3 text-left text-sm font-medium">Type Name</th>
                      <th className="px-4 py-3 text-left text-sm font-medium">Description</th>
                      <th className="px-4 py-3 text-left text-sm font-medium">Created At</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {filteredTypes.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">
                          {searchQuery
                            ? 'No product types match your search'
                            : 'No product types found'}
                        </td>
                      </tr>
                    ) : (
                      filteredTypes.map((type) => (
                        <tr key={type.id} className="hover:bg-muted/50">
                          <td className="px-4 py-3 text-sm text-muted-foreground">
                            #{type.id}
                          </td>
                          <td className="px-4 py-3 text-sm font-medium">
                            {type.nama_type || '-'}
                          </td>
                          <td className="px-4 py-3 text-sm text-muted-foreground">
                            {type.description || '-'}
                          </td>
                          <td className="px-4 py-3 text-sm text-muted-foreground">
                            {type.created_at
                              ? new Date(type.created_at).toLocaleDateString('en-US', {
                                  year: 'numeric',
                                  month: 'short',
                                  day: 'numeric',
                                })
                              : '-'}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Footer Info */}
          <div className="text-center text-sm text-muted-foreground">
            Showing {filteredTypes.length} of {types.length} product type{types.length !== 1 ? 's' : ''}
          </div>
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  )
}
