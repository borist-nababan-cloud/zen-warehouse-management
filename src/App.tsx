/**
 * App Component
 *
 * Main application component with routing configuration.
 * Sets up React Router, TanStack Query, and Toaster for notifications.
 */

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'sonner'
import { LoginPage } from '@/pages/LoginPage'
import { DashboardPage } from '@/pages/DashboardPage'
import { ProductPage } from '@/pages/ProductPage'
import { MasterTypePage } from '@/pages/MasterTypePage'
import { PriceUnitManagerPage } from '@/pages/PriceUnitManagerPage'
import { FinancialDashboardPage } from './pages/FinancialDashboardPage'
import { OperationalDashboardPage } from './pages/OperationalDashboardPage'
import { ProductMixDashboardPage } from './pages/ProductMixDashboardPage'
import { PeakHoursDashboardPage } from './pages/PeakHoursDashboardPage'
import { UnderConstructionPage } from '@/pages/UnderConstructionPage'

import { ChangePasswordPage } from '@/pages/ChangePasswordPage'
import { ProtectedRoute, PublicRoute } from '@/components/ProtectedRoute'

// ============================================
// TANSTACK QUERY CONFIGURATION
// ============================================

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
})

// ============================================
// APP COMPONENT
// ============================================

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          {/* Public Routes */}
          <Route
            path="/login"
            element={
              <PublicRoute>
                <LoginPage />
              </PublicRoute>
            }
          />

          {/* Protected Routes */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <DashboardPage />
              </ProtectedRoute>
            }
          />

          {/* Financial Dashboard - New Module */}
          <Route
            path="/dashboard/financial"
            element={
              <ProtectedRoute allowedRoles={[1, 5, 6, 8]}>
                <FinancialDashboardPage />
              </ProtectedRoute>
            }
          />

          {/* Operational Dashboard - New Module */}
          <Route
            path="/dashboard/operational"
            element={
              <ProtectedRoute allowedRoles={[1, 5, 6, 8]}>
                <OperationalDashboardPage />
              </ProtectedRoute>
            }
          />

          {/* Product Mix Dashboard - New Module */}
          <Route
            path="/dashboard/product-mix"
            element={
              <ProtectedRoute allowedRoles={[1, 5, 6, 8]}>
                <ProductMixDashboardPage />
              </ProtectedRoute>
            }
          />

          {/* Peak Hours Dashboard - New Module */}
          <Route
            path="/dashboard/peak-hours"
            element={
              <ProtectedRoute allowedRoles={[1, 5, 6, 8]}>
                <PeakHoursDashboardPage />
              </ProtectedRoute>
            }
          />

          {/* Product Page - Master Data */}
          <Route
            path="/product"
            element={
              <ProtectedRoute allowedRoles={[1, 5, 6, 8]}>
                <ProductPage />
              </ProtectedRoute>
            }
          />

          {/* Master Type Page - Master Data (Read-only, all authenticated users) */}
          <Route
            path="/master-type"
            element={
              <ProtectedRoute allowedRoles={[1, 2, 3, 4, 5, 6, 7, 8]}>
                <MasterTypePage />
              </ProtectedRoute>
            }
          />

          {/* Price & Unit Manager Page - Master Data (Price and Satuan both link here) */}
          <Route
            path="/price-unit"
            element={
              <ProtectedRoute allowedRoles={[1, 5, 6, 8]}>
                <PriceUnitManagerPage />
              </ProtectedRoute>
            }
          />

          {/* Placeholder routes for future implementation */}
          {/* Placeholder routes for future implementation */}
          <Route
            path="/inventory"
            element={
              <ProtectedRoute>
                <UnderConstructionPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/purchase-orders"
            element={
              <ProtectedRoute>
                <UnderConstructionPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/finance"
            element={
              <ProtectedRoute allowedRoles={[1, 5, 8]}>
                <UnderConstructionPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/laundry"
            element={
              <ProtectedRoute allowedRoles={[3, 4, 8]}>
                <UnderConstructionPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/users"
            element={
              <ProtectedRoute allowedRoles={[1, 8]}>
                <UnderConstructionPage />
              </ProtectedRoute>
            }
          />

          {/* Change Password Page */}
          <Route
            path="/change-password"
            element={
              <ProtectedRoute>
                <ChangePasswordPage />
              </ProtectedRoute>
            }
          />

          {/* Unauthorized Page */}
          <Route
            path="/unauthorized"
            element={
              <div className="flex min-h-screen items-center justify-center">
                <div className="text-center">
                  <h1 className="text-2xl font-bold text-destructive">Unauthorized</h1>
                  <p className="text-muted-foreground mt-2">You don't have permission to access this page.</p>
                </div>
              </div>
            }
          />

          {/* Default redirect */}
          <Route path="/" element={<Navigate to="/dashboard" replace />} />

          {/* 404 */}
          <Route
            path="*"
            element={
              <div className="flex min-h-screen items-center justify-center">
                <div className="text-center">
                  <h1 className="text-2xl font-bold">404</h1>
                  <p className="text-muted-foreground mt-2">Page not found</p>
                </div>
              </div>
            }
          />
        </Routes>

        {/* Toast Notifications */}
        <Toaster position="top-right" richColors />
      </BrowserRouter>
    </QueryClientProvider>
  )
}

export default App
