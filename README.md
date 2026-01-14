# Internal Management System

A robust, multi-outlet Warehouse Management System built for managing procurement, inventory, stock transfers, and financial settlements across a distributed network (Holding + Outlets).

## 🚀 Technology Stack

- **Frontend Framework:** React 18 + TypeScript + Vite
- **UI Library:** Shadcn/UI + Tailwind CSS v4
- **State Management:** TanStack Query (v5) + Zustand
- **Backend/Database:** Supabase (PostgreSQL + Auth + Realtime + RPC)
- **Forms:** React Hook Form + Zod
- **Icons:** Lucide React

---

## 📦 Key Modules

### 1. Core & Authentication
- **Role-Based Access Control (RBAC):** 9 distinct roles including Admin Holding, Outlet Admin, Finance, and Warehouse Staff.
- **Multi-Tenancy:** Data isolation between Outlets, with aggregated views for Holding/Superusers.
- **Dynamic Dashboard:** Role-specific dashboards (Financial, Operational, Logistics).

### 2. Procurement (P2P)
- **Purchase Orders (PO):** Create, Manage, and Track POs with approval workflows.
- **Goods Receipts (GR):** Receive goods against POs with strict quantity validation (Over-receiving protection).
- **History & Reporting:** Track PO status (Ordered vs Received) and Supplier performance.

### 3. Inventory Management
- **Master Data:** Manage Products, Prices, and Units.
- **Stock Opname:** Physical stock counting with "Batch" and "Single Item" modes. Updates Opening Balance and Date automatically.
- **Inventory Shrinkage:** Log and deduct lost/damaged stock using write-off workflows.
- **Real-time Balance:** Ledger-based inventory tracking (`inventory_ledger` + `inventory_balance`).

### 4. Stock Transfer Order (STO)
*Inter-outlet logistics handling*
- **Request (Order):** Outlets request stock from other locations.
- **Goods Issue (GI):** Sender ships items (deducts stock).
- **Goods Receipt (GR):** Recipient accepts items (adds stock).
- **Invoicing:** Automatic invoice generation for inter-outlet transfers.

### 5. Finance & Accounting
- **Accounts Payable (AP):** Track debt to Suppliers and other Outlets (STO).
- **Supplier Paydown:** Settle invoices with support for partial payments and settlement discounts.
- **STO Paydown:** Settle inter-outlet debts using the same robust ledger system.
- **General Transactions:** Record operational Cash In/Out expenses.
- **Financial Dashboard:** Live monitor of Revenue, Cash Flow, and Payment allocations.

---

## 👥 User Roles

| Role ID | Role Name | Description |
|:---:|:---|:---|
| **1** | `admin_holding` | Full access to all modules and outlets |
| **2** | `staff_holding` | Administrative support for Holding |
| **3** | `laundry_admin` | Laundry module manager |
| **4** | `laundry_staff` | Laundry operations |
| **5** | `finance` | Access to Paydowns, Ledger, and Financial Reports |
| **6** | `outlet_admin` | Full control over a specific Outlet |
| **7** | `warehouse_staff`| Procurement execution (PO/GR) and Inventory |
| **8** | `SUPERUSER` | System Administrator / Developer |

---

## 🛠️ Setup & Installation

### Prerequisites
- Node.js (v18+)
- Supabase Project

### 1. Clone & Install
```bash
git clone <repository_url>
cd warehousemanagement
npm install
```

### 2. Environment Variables
Create a `.env` file in the root directory:
```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

### 3. Run Locally
```bash
npm run dev
```

### 4. Build for Production
```bash
npm run build
```

---

## 📂 Project Structure

```
src/
├── components/         # Reusable UI components (Shadcn)
├── features/           # Feature-specific components (Inventory, Finance, etc.)
├── hooks/              # Custom React Hooks (Auth, Data)
├── lib/                # Utilities (Supabase client, Formatting)
├── pages/              # Application Pages (Routed)
├── services/           # API/Supabase Service Layer
├── types/              # TypeScript Interfaces (Database, Entities)
└── App.tsx             # Main Router & Layout Configuration
```
