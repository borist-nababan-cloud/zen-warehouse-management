/**
 * App Component
 *
 * Main application component with routing configuration.
 * Sets up React Router, TanStack Query, and Toaster for notifications.
 */

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider, QueryCache } from '@tanstack/react-query'
import { Toaster, toast } from 'sonner'
import { LoginPage } from '@/pages/LoginPage'
import { DashboardPage } from '@/pages/DashboardPage'
import { ProductPage } from '@/pages/ProductPage'
import { MasterTypePage } from '@/pages/MasterTypePage'
import { PriceUnitManagerPage } from '@/pages/PriceUnitManagerPage'
import { FinancialDashboardPage } from './pages/posdashboard/FinancialDashboardPage'
import { FinancialAccountsPage } from './pages/finance/FinancialAccountsPage'
import { GeneralTransactionsPage } from './pages/finance/GeneralTransactionsPage'
import { SupplierPaydownPage } from './pages/finance/SupplierPaydownPage'
import { OperationalDashboardPage } from './pages/posdashboard/OperationalDashboardPage'
import { ProductMixDashboardPage } from './pages/posdashboard/ProductMixDashboardPage'
import { PeakHoursDashboardPage } from './pages/posdashboard/PeakHoursDashboardPage'
import { SupplierPage } from '@/pages/SupplierPage'
import { UnderConstructionPage } from '@/pages/UnderConstructionPage'
import { UnauthorizedPage } from '@/pages/UnauthorizedPage'
import { PurchaseOrderCreatePage } from '@/pages/procurement/PurchaseOrderCreatePage'
import { PurchaseOrderListPage } from '@/pages/procurement/PurchaseOrderListPage'
import { PurchaseOrderPrintPage } from '@/pages/procurement/PurchaseOrderPrintPage'
import { GoodsReceiptCreatePage } from '@/pages/procurement/GoodsReceiptCreatePage'
import { GoodsReceiptListPage } from '@/pages/procurement/GoodsReceiptListPage'
import { GoodsReceiptPrintPage } from '@/pages/procurement/GoodsReceiptPrintPage'
import { GoodsReceiptDetailPage } from '@/pages/procurement/GoodsReceiptDetailPage'
import { InvoicingPoPage } from '@/pages/procurement/InvoicingPoPage'
import { ReportGrSupplierPage } from '@/pages/procurement/ReportGrSupplierPage'
import { RecipeListPage } from '@/pages/production/RecipeListPage'
import { RecipeFormPage } from '@/pages/production/RecipeFormPage'
import { ProductionRunPage } from '@/pages/production/ProductionRunPage'
import { ProductionCostYieldPage } from '@/pages/production/ProductionCostYieldPage'
import { ShrinkageFormPage } from '@/pages/inventory/ShrinkageFormPage'
import { StockOpnamePage } from '@/pages/inventory/StockOpnamePage'
import InventoryReportPage from '@/pages/inventory/InventoryReportPage'
import InventoryQtyReportPage from '@/pages/inventory/InventoryQtyReportPage'
import ShrinkageReportPage from '@/pages/inventory/ShrinkageReportPage'
import StockOpnameVariancePage from '@/pages/inventory/StockOpnameVariancePage'
import InternalUsageListPage from '@/pages/inventory/InternalUsageListPage'
import InternalUsageFormPage from '@/pages/inventory/InternalUsageFormPage'
import InternalUsagePrint from '@/components/print/InternalUsagePrint'
import InternalReturnListPage from '@/pages/inventory/InternalReturnListPage'
import InternalReturnFormPage from '@/pages/inventory/InternalReturnFormPage'
import ReportInternalUsagePage from '@/pages/inventory/ReportInternalUsagePage'
import ReportInternalReturnPage from '@/pages/inventory/ReportInternalReturnPage'
import ApAgingReportPage from '@/pages/finance/ApAgingReportPage'
import CashFlowReportPage from '@/pages/finance/CashFlowReportPage'
import { OutstandingPoReportPage } from '@/pages/procurement/OutstandingPoReportPage'
import { SupplierPerformanceReportPage } from '@/pages/procurement/SupplierPerformanceReportPage'
import PoReportPage from '@/pages/procurement/PoReportPage'
import InvoicesReportPage from '@/pages/finance/InvoicesReportPage'
import PurchaseInvoicePrint from '@/pages/finance/PurchaseInvoicePrint'

import StoCreatePage from '@/pages/sto/StoCreatePage'
import StoGoodsIssuePage from '@/pages/sto/StoGoodsIssuePage'
import StoApprovalPage from '@/pages/sto/StoApprovalPage'
import StoGoodsReceiptPage from '@/pages/sto/StoGoodsReceiptPage'
import StoInvoicingPage from '@/pages/sto/StoInvoicingPage'
import StoPaydownPage from '@/pages/finance/StoPaydownPage'
import StoListPage from '@/pages/sto/StoListPage'
import { StoDetailPage } from '@/pages/sto/StoDetailPage'
import { StoPrintPage } from '@/pages/sto/StoPrintPage'
import { ReportStoSummaryPage } from '@/pages/sto/ReportStoSummaryPage'
import { ReportStoTransitPage } from '@/pages/sto/ReportStoTransitPage'
import { ReportStoOrderPage } from '@/pages/sto/ReportStoOrderPage'
import { ReportStoOrderItemsPage } from '@/pages/sto/ReportStoOrderItemsPage'
import { ReportStoReceiptPage } from '@/pages/sto/ReportStoReceiptPage'
import { ReportStoReceiptItemsPage } from '@/pages/sto/ReportStoReceiptItemsPage'

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
  queryCache: new QueryCache({
    onError: (error) => {
      const errorMsg = error instanceof Error ? error.message : String(error)
      // Suppress specific session errors to prevent spamming toasts
      if (
        errorMsg.includes('Failed to load session') ||
        errorMsg.includes('Invalid Refresh Token') ||
        errorMsg.includes('Refresh Token Not Found')
      ) {
        console.warn('Session error suppressed:', errorMsg)
        return
      }
      // Show other errors
      toast.error(`Error: ${errorMsg}`)
    },
  }),
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
          <Route
            path="/unauthorized"
            element={
              <PublicRoute redirectTo="/dashboard">
                <UnauthorizedPage />
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

          {/* Supplier Page - Master Data */}
          <Route
            path="/supplier"
            element={
              <ProtectedRoute allowedRoles={[1, 5, 6, 8]}>
                <SupplierPage />
              </ProtectedRoute>
            }
          />

          {/* =========================================
              PROCUREMENT MODULE (List Views Placeholder)
              Create pages are defined above.
             ========================================= */}
          <Route
            path="/procurement/purchase-orders"
            element={
              <ProtectedRoute allowedRoles={[1, 6, 7, 8]}>
                <PurchaseOrderListPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/procurement/purchase-orders/:id/edit"
            element={
              <ProtectedRoute allowedRoles={[1, 6, 7, 8]}>
                <PurchaseOrderCreatePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/procurement/purchase-orders/:id/print"
            element={
              <ProtectedRoute allowedRoles={[1, 6, 7, 8]}>
                <PurchaseOrderPrintPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/procurement/goods-receipts"
            element={
              <ProtectedRoute allowedRoles={[1, 2, 6, 7, 8]}>
                <GoodsReceiptListPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/procurement/goods-receipt/:id"
            element={
              <ProtectedRoute allowedRoles={[1, 2, 6, 7, 8]}>
                <GoodsReceiptDetailPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/procurement/goods-receipt/:id/print"
            element={
              <ProtectedRoute allowedRoles={[1, 2, 6, 7, 8]}>
                <GoodsReceiptPrintPage />
              </ProtectedRoute>
            }
          />

          {/* Production Module */}
          <Route
            path="/production/recipes"
            element={
              <ProtectedRoute allowedRoles={[1, 6, 8]}>
                <RecipeListPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/production/recipes/create"
            element={
              <ProtectedRoute allowedRoles={[1, 6, 8]}>
                <RecipeFormPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/production/recipes/edit/:id"
            element={
              <ProtectedRoute allowedRoles={[1, 6, 8]}>
                <RecipeFormPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/production/run"
            element={
              <ProtectedRoute allowedRoles={[1, 6, 7, 8]}>
                <ProductionRunPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/production/cost-yield"
            element={
              <ProtectedRoute allowedRoles={[1, 5, 6, 8]}>
                <ProductionCostYieldPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/procurement/settlement-po"
            element={<ProtectedRoute><UnderConstructionPage /></ProtectedRoute>}
          />
          <Route
            path="/procurement/goods-issue"
            element={<ProtectedRoute><UnderConstructionPage /></ProtectedRoute>}
          />
          <Route
            path="/procurement/return"
            element={<ProtectedRoute><UnderConstructionPage /></ProtectedRoute>}
          />
          <Route
            path="/procurement/report-outstanding-po"
            element={
              <ProtectedRoute allowedRoles={[1, 2, 5, 6, 7, 8, 10]}>
                <OutstandingPoReportPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/procurement/report-supplier-performance"
            element={
              <ProtectedRoute allowedRoles={[1, 5, 6, 8, 10]}>
                <SupplierPerformanceReportPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/procurement/report-po"
            element={
              <ProtectedRoute allowedRoles={[1, 2, 5, 6, 7, 8, 10]}>
                <PoReportPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/procurement/report-gr"
            element={
              <ProtectedRoute allowedRoles={[1, 2, 5, 6, 7, 8]}>
                <ReportGrSupplierPage />
              </ProtectedRoute>
            }
          />

          {/* =========================================
              STO MODULE (Stock Transfer)
             ========================================= */}
          <Route
            path="/sto/create"
            element={
              <ProtectedRoute allowedRoles={[1, 6, 8]}>
                <StoCreatePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/sto"
            element={
              <ProtectedRoute allowedRoles={[1, 2, 6, 7, 8]}>
                <StoListPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/sto/:id"
            element={
              <ProtectedRoute allowedRoles={[1, 2, 6, 7, 8]}>
                <StoDetailPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/sto/:id/print"
            element={
              <ProtectedRoute allowedRoles={[1, 2, 6, 7, 8]}>
                <StoPrintPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/sto/issue"
            element={
              <ProtectedRoute allowedRoles={[1, 2, 6, 7, 8]}>
                <StoGoodsIssuePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/sto/approval"
            element={
              <ProtectedRoute allowedRoles={[1, 3, 6, 8]}>
                <StoApprovalPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/sto/receipt"
            element={
              <ProtectedRoute allowedRoles={[1, 2, 6, 7, 8]}>
                <StoGoodsReceiptPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/sto/invoicing"
            element={
              <ProtectedRoute allowedRoles={[1, 3, 5, 6, 8]}>
                <StoInvoicingPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/finance/sto-paydown"
            element={
              <ProtectedRoute allowedRoles={[1, 3, 5, 6, 8]}>
                <StoPaydownPage />
              </ProtectedRoute>
            }
          />


          <Route
            path="/sto/report-summary"
            element={
              <ProtectedRoute allowedRoles={[6, 10]}>
                <ReportStoSummaryPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/sto/report-transit"
            element={
              <ProtectedRoute allowedRoles={[6, 7, 10]}>
                <ReportStoTransitPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/sto/report-order"
            element={
              <ProtectedRoute allowedRoles={[5, 6, 8, 10]}>
                <ReportStoOrderPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/sto/report-order-items"
            element={
              <ProtectedRoute allowedRoles={[5, 6, 7, 8, 10]}>
                <ReportStoOrderItemsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/sto/report-receipt"
            element={
              <ProtectedRoute allowedRoles={[5, 6, 8, 10]}>
                <ReportStoReceiptPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/sto/report-receipt-items"
            element={
              <ProtectedRoute allowedRoles={[5, 6, 7, 8, 10]}>
                <ReportStoReceiptItemsPage />
              </ProtectedRoute>
            }
          />

          {/* =========================================
              GOODS ISSUED MODULE
             ========================================= */}


          {/* =========================================
              PAYMENT MODULE
             ========================================= */}
          <Route
            path="/payment"
            element={<ProtectedRoute><UnderConstructionPage /></ProtectedRoute>}
          />
          <Route
            path="/payment/report"
            element={<ProtectedRoute><UnderConstructionPage /></ProtectedRoute>}
          />

          {/* =========================================
              LAUNDRY MODULE
             ========================================= */}
          <Route
            path="/laundry/out"
            element={<ProtectedRoute><UnderConstructionPage /></ProtectedRoute>}
          />
          <Route
            path="/laundry/in"
            element={<ProtectedRoute><UnderConstructionPage /></ProtectedRoute>}
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
            path="/procurement/purchase-orders/create"
            element={
              <ProtectedRoute allowedRoles={[1, 6, 8]}>
                <PurchaseOrderCreatePage />
              </ProtectedRoute>
            }
          />
          <Route path="/procurement/goods-receipts/create" element={
            <ProtectedRoute>
              <GoodsReceiptCreatePage />
            </ProtectedRoute>
          } />

          <Route path="/procurement/invoicing-po" element={
            <ProtectedRoute>
              <InvoicingPoPage />
            </ProtectedRoute>
          } />

          {/* =========================================
              INVENTORY MODULE
             ========================================= */}
          <Route
            path="/inventory/shrinkage"
            element={
              <ProtectedRoute allowedRoles={[1, 2, 6, 7, 8]}>
                <ShrinkageFormPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/inventory/stock-opname"
            element={
              <ProtectedRoute allowedRoles={[1, 2, 6, 7, 8]}>
                <StockOpnamePage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/inventory/report"
            element={
              <ProtectedRoute allowedRoles={[1, 2, 5, 6, 7, 8, 10]}>
                <InventoryReportPage />
              </ProtectedRoute>
            }
          />

          {/* Reports */}
          <Route
            path="/inventory/report-qty"
            element={
              <ProtectedRoute allowedRoles={[1, 2, 5, 6, 7, 8, 10]}>
                <InventoryQtyReportPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/inventory/report-shrinkage"
            element={
              <ProtectedRoute allowedRoles={[1, 2, 5, 6, 7, 8, 10]}>
                <ShrinkageReportPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/inventory/report-opname-variance"
            element={
              <ProtectedRoute allowedRoles={[1, 2, 5, 6, 7, 8, 10]}>
                <StockOpnameVariancePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/inventory/internal-usage"
            element={
              <ProtectedRoute allowedRoles={[6, 7, 10, 8]}>
                <InternalUsageListPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/inventory/internal-usage/create"
            element={
              <ProtectedRoute allowedRoles={[6, 7, 10, 8]}>
                <InternalUsageFormPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/inventory/internal-usage/print/:id"
            element={
              <ProtectedRoute allowedRoles={[6, 7, 10, 8]}>
                <InternalUsagePrint />
              </ProtectedRoute>
            }
          />
          <Route
            path="/inventory/internal-return"
            element={
              <ProtectedRoute allowedRoles={[6, 7, 10, 8]}>
                <InternalReturnListPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/inventory/internal-return/create"
            element={
              <ProtectedRoute allowedRoles={[6, 7, 10, 8]}>
                <InternalReturnFormPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/inventory/report-internal-usage"
            element={
              <ProtectedRoute allowedRoles={[5, 6, 7, 8, 10]}>
                <ReportInternalUsagePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/inventory/report-internal-return"
            element={
              <ProtectedRoute allowedRoles={[5, 6, 7, 8, 10]}>
                <ReportInternalReturnPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/finance/report-cash-flow"
            element={
              <ProtectedRoute allowedRoles={[3, 5, 6, 8]}>
                <CashFlowReportPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/finance/accounts"
            element={
              <ProtectedRoute allowedRoles={[1, 3, 6]}>
                <FinancialAccountsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/finance/general-transactions"
            element={
              <ProtectedRoute allowedRoles={[1, 3, 6]}>
                <GeneralTransactionsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/finance/report-ap-aging"
            element={
              <ProtectedRoute allowedRoles={[1, 3, 6]}>
                <ApAgingReportPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/finance/paydown"
            element={
              <ProtectedRoute allowedRoles={[1, 3, 6]}>
                <SupplierPaydownPage />
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
            path="/finance/invoices-report"
            element={
              <ProtectedRoute allowedRoles={[1, 3, 5, 6, 8]}>
                <InvoicesReportPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/finance/invoices/print/:invoiceId"
            element={
              <ProtectedRoute allowedRoles={[1, 3, 5, 6, 8]}>
                <PurchaseInvoicePrint />
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
    </QueryClientProvider >
  )
}

export default App
