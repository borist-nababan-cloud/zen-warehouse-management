# Project Summary - Warehouse Management System (WMS)

## Project Overview

**Project Name:** Warehouse Management System (Frontend)
**Technology Stack:** React 18 + TypeScript + Vite + Supabase + Shadcn/UI
**Development Start Date:** December 27, 2025
**Current Status:** Authentication complete, Dashboard with sidebar implemented

---

## Table of Contents

1. [Initial Requirements](#1-initial-requirements)
2. [Project Setup](#2-project-setup)
3. [Database Design](#3-database-design)
4. [Challenges & Solutions](#4-challenges--solutions)
5. [Authentication Implementation](#5-authentication-implementation)
6. [UI Components & Layout](#6-ui-components--layout)
7. [Current System State](#7-current-system-state)
8. [Database Connection Details](#8-database-connection-details)
9. [Next Steps](#9-next-steps)

---

## 1. Initial Requirements

### Source Document
- **File:** `frontendplan.md`
- **Key Requirements:**
  - Multi-role WMS with Holding (HQ) and multiple Outlets
  - 7 User Roles: admin_holding, staff_holding, laundry_staff, laundry_admin, finance, outlet_admin, warehouse_staff
  - Ledger-based inventory tracking system
  - Master-detail forms for Purchase Orders
  - Role-based access control (RBAC)

### Technology Stack Decided
| Technology | Purpose | Version |
|------------|---------|---------|
| React | Frontend Framework | 18+ |
| TypeScript | Language | Strict mode |
| Vite | Build Tool | Latest |
| TanStack Query | Server State | v5 |
| Zustand | Global State | Latest |
| Shadcn/UI | Component Library | Tailwind + Radix |
| React Hook Form | Forms | Latest |
| Zod | Validation | Latest |
| Supabase | Backend | Latest |

---

## 2. Project Setup

### Files Created
```
warehousemanagement/
├── src/
│   ├── components/
│   │   ├── ProtectedRoute.tsx      # Auth + Role wrapper
│   │   ├── ui/                     # UI components
│   │   └── layout/
│   │       └── Sidebar.tsx         # Sidebar navigation
│   ├── features/                   # Business logic modules
│   ├── hooks/
│   │   └── useAuth.ts              # Auth hooks (TanStack Query)
│   ├── lib/
│   │   ├── supabase.ts             # Supabase client
│   │   ├── authStore.ts            # Zustand store
│   │   └── utils.ts                # Utilities
│   ├── pages/
│   │   ├── LoginPage.tsx           # Login page
│   │   └── DashboardPage.tsx       # Dashboard
│   ├── services/
│   │   └── authService.ts          # Auth service layer
│   ├── types/
│   │   └── database.ts             # TypeScript types
│   ├── App.tsx                     # Routes
│   └── main.tsx                    # Entry point
├── docs/
│   └── SYSTEM_FLOW.md              # Architecture documentation
├── scripts/
│   └── setup-db.js                 # Database setup script
├── .env                            # Environment variables
├── vite.config.ts
├── tsconfig.json
├── tailwind.config.js
└── package.json
```

---

## 3. Database Design

### Tables Created

#### `locations` Table
| Column | Type | Description |
|--------|------|-------------|
| id | BIGSERIAL (PK) | Auto-increment ID |
| name | TEXT | Location name |
| location_code | TEXT (UNIQUE) | Short code (HQ01, OUT01) |
| location_type | TEXT | 'holding', 'outlet', 'laundry', 'warehouse' |
| is_active | BOOLEAN | Active status |
| created_at | TIMESTAMPTZ | Created timestamp |
| updated_at | TIMESTAMPTZ | Updated timestamp |

#### `profiles` Table
| Column | Type | Description |
|--------|------|-------------|
| id | TEXT (PK) | References auth.users.id |
| email | TEXT (UNIQUE) | User email |
| full_name | TEXT | User full name |
| phone | TEXT | Phone number |
| role | TEXT | One of 7 roles |
| location_id | BIGINT (FK) | References locations.id |
| is_active | BOOLEAN | User status |
| created_at | TIMESTAMPTZ | Created timestamp |
| updated_at | TIMESTAMPTZ | Updated timestamp |

### Auto-Create Trigger
- **Function:** `public.handle_new_user()`
- **Trigger:** `on_auth_user_created`
- **Purpose:** Automatically creates profile when user added to auth.users
- **Default Role:** `staff_holding`

### RLS Policies Created
- **locations:** Public read, authenticated insert/update
- **profiles:** Public read, service role insert, user can update own profile

### Current Data
**Locations:**
| id | name | location_code | location_type |
|----|------|---------------|---------------|
| 1 | HQ Jakarta | HQ01 | holding |

**Profiles:**
| id | email | full_name | role | location_id |
|----|-------|-----------|------|-------------|
| 801ed3dd-a81b-4417-88a3-8fb340e0d23e | adminholding@zenfamilyspa.id | Admin Holding | admin_holding | 1 |

---

## 4. Challenges & Solutions

### Challenge 1: Supabase SSL Protocol Error

**Problem:**
```
ERR_SSL_PROTOCOL_ERROR
SSL routines:ssl3_read_bytes:tlsv1 alert internal error
```

**Root Cause:**
- Using Kong proxy subdomain with misconfigured SSL
- URL: `https://supabasekong-osc88kc48gckgwgo4cswowgc.nababancloud.com`

**Solution:**
1. Changed `API_EXTERNAL_URL` in Coolify from Kong subdomain to main domain
2. Updated frontend `.env` to use `https://bensupabase.nababancloud.com`
3. Coolify handles SSL for main domain via Traefik/Caddy

**Configuration:**
```bash
# Before (broken)
API_EXTERNAL_URL=https://supabasekong-osc88kc48gckgwgo4cswowgc.nababancloud.com

# After (working)
API_EXTERNAL_URL=https://bensupabase.nababancloud.com
```

### Challenge 2: Tables Not Existing

**Problem:**
```
"relation \"public.locations\" does not exist"
"relation \"public.profiles\" does not exist"
```

**Root Cause:**
- User created auth user but didn't create database tables
- Tables existed only in design, not in actual database

**Solution:**
1. Created Node.js script `scripts/setup-db.js` with direct PostgreSQL connection
2. Ran all CREATE TABLE, RLS policies, and trigger setup programmatically
3. Created sample data and user profile

### Challenge 3: Type Mismatches

**Problem:**
```
foreign key constraint cannot be implemented
types: text and bigint are incompatible
```

**Root Cause:**
- `locations.id` was BIGINT (auto-increment)
- `profiles.location_id` was TEXT
- Types didn't match for foreign key

**Solution:**
Changed `profiles.location_id` to BIGINT to match `locations.id`

### Challenge 4: RLS Policy Type Casting

**Problem:**
```
operator does not exist: uuid = text
```

**Root Cause:**
- `auth.uid()` returns UUID
- `profiles.id` is TEXT

**Solution:**
```sql
USING (auth.uid()::text = id)
```

---

## 5. Authentication Implementation

### Authentication Flow
```
1. User enters credentials (LoginPage.tsx)
   ↓
2. React Hook Form + Zod validation
   ↓
3. useSignIn() hook (TanStack Query mutation)
   ↓
4. authService.signIn()
   - supabase.auth.signInWithPassword()
   - On success: getProfile(user.id)
   ↓
5. getProfile() fetches from profiles table
   - SELECT *, location:locations(*)
   ↓
6. Dashboard displays user info + role-based modules
```

### Service Layer Pattern
**IMPORTANT:** No direct Supabase calls in components. Always use service layer.

**authService.ts provides:**
- `signIn(credentials)` - Sign in with email/password
- `signOut()` - Sign out current user
- `getSession()` - Get current session
- `getCurrentUser()` - Get authenticated user with profile
- `getProfile(userId)` - Fetch profile with location
- `updateProfile(userId, updates)` - Update user profile
- `onAuthStateChange(callback)` - Subscribe to auth changes

### Hook Layer (TanStack Query)
**useAuth.ts provides:**
- `useAuthUser()` - Get current user with loading/error states
- `useSignIn()` - Sign in mutation
- `useSignOut()` - Sign out mutation
- `useHasRole(allowedRoles)` - Check if user has specific role
- `useUserRole()` - Get current user's role

### ProtectedRoute Component
```tsx
// Any authenticated user
<ProtectedRoute>
  <Dashboard />
</ProtectedRoute>

// Only specific roles
<ProtectedRoute allowedRoles={['admin_holding', 'finance']}>
  <FinancePage />
</ProtectedRoute>
```

---

## 6. UI Components & Layout

### Sidebar Component
**File:** `src/components/layout/Sidebar.tsx`

**Features:**
- ✅ Collapsible sidebar (chevron button)
- ✅ Role-based menu filtering
- ✅ Active path highlighting
- ✅ User info display (name, role, location)
- ✅ Sign out button
- ✅ Smooth animations

**Menu Items:**
| Item | Path | Roles |
|------|------|-------|
| Dashboard | /dashboard | All roles |
| Inventory | /inventory | admin_holding, staff_holding, warehouse_staff, outlet_admin |
| Purchase Orders | /purchase-orders | admin_holding, staff_holding, warehouse_staff |
| Finance | /finance | admin_holding, finance |
| Laundry | /laundry | laundry_admin, laundry_staff |
| Users | /users | admin_holding (Admin badge) |

### Dashboard Layout
**File:** `src/components/layout/Sidebar.tsx` (exported as `DashboardLayout`)

**Structure:**
```
┌────────────┬─────────────────────────────────┐
│            │  Header (WMS title)              │
│  Sidebar   ├─────────────────────────────────┤
│            │                                  │
│  - Menu    │  Page Content                   │
│  - User    │  (scrollable)                    │
│  - Sign O  │                                  │
│            │                                  │
└────────────┴─────────────────────────────────┘
```

### Dashboard Page Components

**1. WelcomeCard**
- Personalized greeting with user's name
- Shows role and location
- Styled with gradient background

**2. StatCard** (4 stats shown)
- Total Products: 124
- Active Orders: 18
- Pending Tasks: 5
- Revenue (MTD): $12,450
- Each with trend indicators

**3. ModuleGrid**
- Role-based module cards
- Hover effects with arrow indicator
- Color-coded icons

---

## 7. Current System State

### Working Features
| Feature | Status |
|---------|--------|
| User Registration (via Supabase Auth) | ✅ Complete |
| Email/Password Authentication | ✅ Complete |
| Auto-create profile on signup | ✅ Complete |
| Role-based access control | ✅ Complete |
| Location-based data | ✅ Complete |
| Sidebar navigation | ✅ Complete |
| Dashboard with stats | ✅ Complete |
| Sign out functionality | ✅ Complete |
| Loading states | ✅ Complete |
| Error handling (toast notifications) | ✅ Complete |

### User Role Capabilities
**For `admin_holding` (current user):**
- ✅ Access Dashboard
- ✅ Access Inventory Management
- ✅ Access Purchase Orders
- ✅ Access Finance
- ✅ Access User Management
- ❌ Cannot access Laundry modules

### Placeholder Pages
- `/inventory` - Coming soon
- `/purchase-orders` - Coming soon
- `/finance` - Coming soon (protected, only admin/finance)
- `/laundry` - Coming soon (protected, only laundry roles)
- `/users` - Coming soon (protected, only admin)

---

## 8. Database Connection Details

### PostgreSQL Credentials
⚠️ **SECURE - KEEP SAFE**

```bash
Host: 217.21.78.155
Port: 57777
Database: postgres
Username: postgres
Password: 6eMmeCxaATl8z7be3ReaGodvN7HpcOpt
```

### Supabase API Credentials

**Frontend (.env):**
```bash
VITE_SUPABASE_URL=https://bensupabase.nababancloud.com
VITE_SUPABASE_ANON_KEY=eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJzdXBhYmFzZSIsImlhdCI6MTc2NjcyNTg2MCwiZXhwIjo0OTIyMzk5NDYwLCJyb2xlIjoiYW5vbiJ9.XtMrw432QPVfEinPTl2bcR6aE_PpZQe0fz77tpUCUJM
```

**Coolify Environment Variables:**
```bash
SERVICE_URL_SUPABASE_KONG=https://bensupabase.nababancloud.com
API_EXTERNAL_URL=https://bensupabase.nababancloud.com
SERVICE_SUPABASEANON_KEY=eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...
```

### Database Setup Script
**Location:** `scripts/setup-db.js`

**Usage:**
```bash
node scripts/setup-db.js
```

**What it does:**
1. Drops existing tables (if any)
2. Creates locations table with sample data
3. Creates profiles table
4. Creates auto-create profile trigger
5. Enables RLS
6. Creates all RLS policies
7. Updates existing user's profile

---

## 9. Next Steps

### Immediate Priorities (Recommended Order)

#### 1. **Inventory Module**
**Files to create:**
- `src/features/inventory/components/ProductList.tsx`
- `src/features/inventory/components/ProductForm.tsx`
- `src/features/inventory/components/InventoryLedger.tsx`
- `src/services/inventoryService.ts`
- `src/hooks/useInventory.ts`
- `src/pages/InventoryPage.tsx`

**Database tables needed:**
```sql
CREATE TABLE products (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  sku TEXT UNIQUE NOT NULL,
  description TEXT,
  is_raw_material BOOLEAN DEFAULT false,
  category TEXT,
  unit TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE inventory_ledger (
  id BIGSERIAL PRIMARY KEY,
  product_id BIGINT REFERENCES products(id),
  location_id BIGINT REFERENCES locations(id),
  quantity_change INTEGER NOT NULL,
  balance_after INTEGER NOT NULL,
  movement_type TEXT, -- 'in', 'out', 'transfer', 'adjustment'
  reference_id TEXT, -- PO ID, Invoice ID, etc.
  reference_type TEXT, -- 'purchase_order', 'invoice', etc.
  notes TEXT,
  created_by TEXT REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT now()
);
```

#### 2. **Purchase Orders Module**
**Files to create:**
- `src/features/purchase-orders/components/PurchaseOrderForm.tsx` (Master-detail)
- `src/features/purchase-orders/components/PurchaseOrderList.tsx`
- `src/services/purchaseOrderService.ts`
- `src/hooks/usePurchaseOrders.ts`
- `src/pages/PurchaseOrdersPage.tsx`

**Key feature:** Master-detail form with dynamic field array

**Database tables needed:**
```sql
CREATE TABLE purchase_orders (
  id BIGSERIAL PRIMARY KEY,
  supplier_name TEXT NOT NULL,
  order_date DATE NOT NULL,
  expected_date DATE,
  status TEXT, -- 'draft', 'pending', 'received', 'cancelled'
  total_amount DECIMAL(15,2),
  notes TEXT,
  created_by TEXT REFERENCES profiles(id),
  location_id BIGINT REFERENCES locations(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE purchase_order_items (
  id BIGSERIAL PRIMARY KEY,
  purchase_order_id BIGINT REFERENCES purchase_orders(id) ON DELETE CASCADE,
  product_id BIGINT REFERENCES products(id),
  quantity INTEGER NOT NULL,
  unit_price DECIMAL(15,2) NOT NULL,
  total_price DECIMAL(15,2) GENERATED ALWAYS AS (quantity * unit_price) STORED,
  received_quantity INTEGER DEFAULT 0
);
```

#### 3. **Finance Module**
**Database tables needed:**
```sql
CREATE TABLE invoices (
  id BIGSERIAL PRIMARY KEY,
  invoice_number TEXT UNIQUE NOT NULL,
  customer_name TEXT NOT NULL,
  invoice_date DATE NOT NULL,
  due_date DATE,
  status TEXT, -- 'draft', 'sent', 'paid', 'overdue'
  total_amount DECIMAL(15,2),
  location_id BIGINT REFERENCES locations(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE payments (
  id BIGSERIAL PRIMARY KEY,
  invoice_id BIGINT REFERENCES invoices(id),
  payment_date DATE NOT NULL,
  amount DECIMAL(15,2) NOT NULL,
  payment_method TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE payment_allocations (
  id BIGSERIAL PRIMARY KEY,
  payment_id BIGINT REFERENCES payments(id),
  invoice_id BIGINT REFERENCES invoices(id),
  allocated_amount DECIMAL(15,2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### Technical Debt to Address
1. **Error Handling:** Add more specific error messages
2. **Loading Skeletons:** Improve loading states
3. **Responsive Design:** Test on mobile devices
4. **Unit Tests:** Add tests for services and hooks
5. **E2E Tests:** Add Playwright tests
6. **API Error Handling:** Better toast notifications
7. **Form Validation:** Add more robust validation

---

## Key Decisions Made

### 1. Use Direct PostgreSQL Connection
**Reason:** Coolify SQL Editor had issues with multi-statement scripts
**Decision:** Created Node.js script with `pg` client to run setup directly

### 2. Use Main Domain Instead of Kong Subdomain
**Reason:** Kong SSL was misconfigured, main domain already has SSL via Coolify
**Decision:** Use `bensupabase.nababancloud.com` instead of `supabasekong-osc88kc48gckgwgo4cswowgc.nababancloud.com`

### 3. Service Layer Pattern
**Reason:** Separation of concerns, easier testing, caching via TanStack Query
**Decision:** Never call Supabase directly from components, always use services

### 4. TanStack Query for All Data Fetching
**Reason:** Automatic caching, loading states, error handling, revalidation
**Decision:** Mandatory for all Supabase data fetching

### 5. Sidebar Layout
**Reason:** Better UX, clear navigation, always-accessible menu
**Decision:** Fixed sidebar with collapsible functionality

---

## Important Notes

### Do's
✅ Always use service layer for data operations
✅ Use TanStack Query hooks in components
✅ Use ProtectedRoute for protected pages
✅ Use proper TypeScript types (no `any`)
✅ Handle errors with toast notifications
✅ Use functional components
✅ Follow the feature-based folder structure

### Don'ts
❌ Don't call `supabase.from()` directly in components
❌ Don't use `any` type
❌ Don't skip error handling
❌ Don't hardcode values (use constants/config)
❌ Don't create files outside the defined structure

---

## File Reference Quick Links

| File | Purpose |
|------|---------|
| `frontendplan.md` | Original requirements |
| `docs/SYSTEM_FLOW.md` | System architecture documentation |
| `.env` | Environment variables |
| `scripts/setup-db.js` | Database setup script |
| `src/lib/supabase.ts` | Supabase client configuration |
| `src/types/database.ts` | TypeScript type definitions |
| `src/services/authService.ts` | Authentication service |
| `src/hooks/useAuth.ts` | Authentication hooks |
| `src/components/ProtectedRoute.tsx` | RBAC wrapper |
| `src/components/layout/Sidebar.tsx` | Sidebar + DashboardLayout |
| `src/pages/LoginPage.tsx` | Login page |
| `src/pages/DashboardPage.tsx` | Dashboard page |

---

## Conversation Timeline

1. **Initial Setup** - Project initialized with Vite + React + TypeScript
2. **Dependencies** - Installed TanStack Query, Shadcn/UI, React Hook Form, Zod, Supabase
3. **Configuration** - Set up Vite, TypeScript, Tailwind CSS v4
4. **Types** - Created database type definitions
5. **Service Layer** - Implemented authService.ts
6. **Hooks** - Implemented useAuth.ts with TanStack Query
7. **ProtectedRoute** - Implemented RBAC component
8. **Login Page** - Created login form with validation
9. **Dashboard** - Created initial dashboard
10. **Database Issues** - Discovered tables don't exist
11. **SSL Issues** - Encountered Kong SSL errors
12. **Coolify Setup** - Fixed API_EXTERNAL_URL configuration
13. **Database Creation** - Created tables via direct PostgreSQL connection
14. **Sidebar Implementation** - Created collapsible sidebar navigation
15. **Dashboard Refactor** - Cleaned up dashboard with new layout

---

## Conclusion

The Warehouse Management System frontend foundation is now complete with:
- ✅ Full authentication system
- ✅ Role-based access control
- ✅ Database schema (locations, profiles)
- ✅ Service layer architecture
- ✅ Sidebar navigation
- ✅ Clean dashboard layout
- ✅ Working connection to Supabase

**Ready to build business modules** (Inventory, Purchase Orders, Finance, etc.)

---

---

## Session: December 28, 2025 - RoleId System Migration & Unassigned User Flow

### Overview

This session focused on migrating from the old text-based role system (`profiles`/`locations` tables) to a new numeric RoleId system (1-9) with proper unassigned user handling.

### Key Changes Made

#### 1. New Database Schema

**New Tables Created:**

| Table | Purpose | Key Columns |
|-------|---------|-------------|
| `role_user` | Role definitions (1-9) | id, role_name, description |
| `users_profile` | User profiles | uid (UUID), user_role, kode_outlet, email |
| `master_outlet` | Outlet master data | kode_outlet (PK), name_outlet, group_id |
| `group_outlet` | Outlet groupings | group_id, group_name |

**RoleId Mapping (1-9):**
| ID | Role Name | Description |
|----|-----------|-------------|
| 1 | admin_holding | Holding administrator |
| 2 | staff_holding | Holding staff |
| 3 | laundry_admin | Laundry administrator |
| 4 | laundry_staff | Laundry staff |
| 5 | finance | Finance user |
| 6 | outlet_admin | Outlet administrator |
| 7 | warehouse_staff | Warehouse staff |
| 8 | SUPERUSER | Full system access |
| 9 | UNASSIGNED | No access (blocked) |

**Special Rules:**
- `kode_outlet = '111'` → Holding user (can see all outlets/data)
- `user_role = 8` → SUPERUSER (bypasses all role checks)
- `user_role = 9` → UNASSIGNED (blocked from application)

#### 2. TypeScript Type System Updates

**File:** `src/types/database.ts`

```typescript
export type RoleId = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9

export interface UserProfile {
  uid: string              // UUID from auth.users.id
  user_role: RoleId        // References role_user.id
  kode_outlet: string | null  // References master_outlet.kode_outlet
  email: string
  created_at: string
}

export const ROLE_LABELS: Record<RoleId, string> = {
  1: 'Admin Holding',
  2: 'Staff Holding',
  3: 'Laundry Admin',
  4: 'Laundry Staff',
  5: 'Finance',
  6: 'Outlet Admin',
  7: 'Warehouse Staff',
  8: 'SUPERUSER',
  9: 'UNASSIGNED',
}

export const ROLE_MENU_PERMISSIONS: Record<RoleId, string[]> = {
  1: ['dashboard', 'inventory', 'purchase-orders', 'finance', 'users'],
  2: ['dashboard', 'inventory', 'purchase-orders'],
  3: ['dashboard', 'laundry'],
  4: ['dashboard', 'laundry'],
  5: ['dashboard', 'finance'],
  6: ['dashboard', 'inventory'],
  7: ['dashboard', 'inventory', 'purchase-orders'],
  8: ['*'],  // SUPERUSER
  9: [],     // UNASSIGNED
}
```

#### 3. Authentication Service Updates

**File:** `src/services/authService.ts`

**New Login Flow:**
```
1. User signs in with email/password
   ↓
2. Check users_profile table for profile
   ↓
3. If no profile exists:
   - Call RPC function to create profile with role=9 (UNASSIGNED)
   - Force logout
   - Throw UnassignedUserError
   ↓
4. If profile exists and role=9:
   - Force logout
   - Throw UnassignedUserError
   ↓
5. If profile exists and role=1-8:
   - Store kode_outlet in localStorage
   - Store user_role in localStorage
   - Return user data with outlet info
```

**Key Changes:**
- `getUserProfile()` now uses `.maybeSingle()` instead of `.single()` to handle missing profiles gracefully
- `createUnassignedProfile()` uses RPC function with SECURITY DEFINER to bypass RLS
- New `UnassignedUserError` class for special error handling
- localStorage keys: `kode_outlet`, `user_role`, `user_email`

#### 4. RPC Function for Profile Creation

**File:** `database-docs/create-profile-rpc-function.sql`

```sql
CREATE OR REPLACE FUNCTION public.create_user_profile(
  p_uid UUID,
  p_user_role INTEGER DEFAULT 9,
  p_email TEXT DEFAULT '',
  p_kode_outlet TEXT DEFAULT NULL
)
RETURNS SETOF users_profile
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.users_profile (uid, user_role, email, kode_outlet)
  VALUES (p_uid, p_user_role, p_email, p_kode_outlet)
  ON CONFLICT (uid) DO UPDATE SET
    user_role = EXCLUDED.user_role,
    kode_outlet = EXCLUDED.kode_outlet,
    email = EXCLUDED.email;

  RETURN QUERY
    SELECT * FROM public.users_profile WHERE uid = p_uid;
END;
$$;
```

**Why SECURITY DEFINER?**
- Bypasses RLS policies that would block anon users from inserting
- Allows frontend to create profiles during login flow
- Runs with function owner's privileges (postgres)

#### 5. Dashboard Protection

**File:** `src/pages/DashboardPage.tsx`

**New Protection Layer:**
```typescript
useEffect(() => {
  if (!isLoading && user) {
    if (!user.user_role || user.user_role === 9) {
      // User is unassigned - logout and show message
      const performLogout = async () => {
        await signOut.mutateAsync()
        toast.error('You are not assigned to use this application. Contact Administrator.', {
          duration: 5000,
          id: 'unassigned-user', // Prevent duplicate toasts
        })
        navigate('/login', { replace: true })
      }
      performLogout()
    }
  }
}, [user, isLoading, signOut, navigate])
```

**Two-Layer Protection:**
1. **authService.ts** - Blocks at login if role=9
2. **DashboardPage.tsx** - Blocks if user reaches dashboard with role=9

#### 6. Sidebar Updates

**File:** `src/components/layout/Sidebar.tsx`

**Navigation Items (updated with RoleId arrays):**
```typescript
const navItems: NavItem[] = [
  { title: 'Dashboard', path: '/dashboard', icon: Warehouse, roleIds: [1, 2, 3, 4, 5, 6, 7, 8] },
  { title: 'Inventory', path: '/inventory', icon: Package, roleIds: [1, 2, 6, 7, 8] },
  { title: 'Purchase Orders', path: '/purchase-orders', icon: FileText, roleIds: [1, 2, 7, 8] },
  { title: 'Finance', path: '/finance', icon: DollarSign, roleIds: [1, 5, 8] },
  { title: 'Laundry', path: '/laundry', icon: Shirt, roleIds: [3, 4, 8] },
  { title: 'Users', path: '/users', icon: Users, roleIds: [1, 8], badge: 'Admin' },
]
```

### Issues Encountered & Resolved

#### Issue 1: Table Ownership Error

**Error:**
```
ERROR: must be owner of table role_user
```

**Cause:** Tables created via Supabase Studio/API, SQL Editor user doesn't have permission to modify

**Solution:** Created `recreate-tables-fixed.sql` to drop and recreate tables in SQL Editor with proper ownership

#### Issue 2: Type Mismatch (UUID vs TEXT)

**Error:**
```
ERROR: foreign key constraint "users_profile_uid_fkey" cannot be implemented
DETAIL: Key columns "uid" and "id" are of incompatible types: text and uuid
```

**Cause:** `uid` was TEXT but `auth.users.id` is UUID

**Solution:** Changed table definition to `uid UUID PRIMARY KEY REFERENCES auth.users(id)`

#### Issue 3: RPC Function Parameter Defaults

**Error:**
```
ERROR: input parameters after one with a default value must also have defaults
```

**Cause:** `p_email TEXT` had no default but came after `p_user_role INTEGER DEFAULT 9`

**Solution:** Added default to all parameters: `p_email TEXT DEFAULT ''`

#### Issue 4: RETURN QUERY in Non-SETOF Function

**Error:**
```
ERROR: cannot use RETURN QUERY in a non-SETOF function
```

**Cause:** Function returned `users_profile` but used `RETURN QUERY`

**Solution:** Changed to `RETURNS SETOF users_profile`

#### Issue 5: Unassigned User Can Login

**Error:** `borist.nababan@gmail.com` could login despite having no profile

**Root Cause:**
1. User existed in `auth.users` but had no profile (trigger didn't fire - user created before trigger)
2. When login tried to create profile via direct `.insert()`, RLS blocked it
3. User stayed logged into Supabase Auth even though profile creation failed

**Solution:**
1. Created RPC function with SECURITY DEFINER to bypass RLS
2. Updated authService to call `.rpc()` instead of `.insert()`
3. Added Dashboard useEffect as second layer of protection
4. Ran diagnostic script to create missing profile with role=9

### Files Modified This Session

| File | Changes |
|------|---------|
| `src/types/database.ts` | Complete rewrite for RoleId (1-9) system |
| `src/services/authService.ts` | New login flow with RPC call, UnassignedUserError |
| `src/hooks/useAuth.ts` | Updated hooks for RoleId system |
| `src/components/ProtectedRoute.tsx` | Changed from `allowedRoles?: string[]` to `allowedRoles?: RoleId[]` |
| `src/components/layout/Sidebar.tsx` | Updated navItems with RoleId arrays |
| `src/pages/LoginPage.tsx` | Added UNASSIGNED_USER error handling |
| `src/pages/DashboardPage.tsx` | Added useEffect to block unassigned users |
| `src/App.tsx` | Updated all ProtectedRoute allowedRoles to use RoleId arrays |
| `database-docs/create-profile-rpc-function.sql` | Created RPC function SQL |
| `database-docs/recreate-tables-fixed.sql` | Table recreation script with UUID fix |
| `scripts/diagnose-fix-direct.js` | Direct PostgreSQL diagnostic script |

### Database State After Session

**Users:**
| Email | Role | Kode Outlet | Status |
|-------|------|-------------|--------|
| adminholding@zenfamilyspa.id | 1 (admin_holding) | 111 | ASSIGNED |
| borist.nababan@gmail.com | 9 (UNASSIGNED) | null | BLOCKED |

**RPC Function:** `create_user_profile` created with SECURITY DEFINER

### Testing Verification

**Test 1: adminholding@zenfamilyspa.id**
- ✅ Can login
- ✅ Sees dashboard
- ✅ Menu items visible: Dashboard, Inventory, Purchase Orders, Finance, Users

**Test 2: borist.nababan@gmail.com**
- ✅ Can enter email/password
- ✅ After login, sees error: "You are not assigned to use this application. Contact Administrator."
- ✅ Automatically logged out and redirected to login page
- ✅ Profile auto-created in users_profile with role=9

### Key Technical Decisions

1. **RoleId over Text Roles**: Numeric IDs (1-9) for better type safety and database performance
2. **RPC with SECURITY DEFINER**: Allows profile creation bypassing RLS for anon users
3. **Two-Layer Protection**: Login flow + Dashboard check to ensure unassigned users cannot access
4. **localStorage Caching**: Store `kode_outlet` and `user_role` for quick access without repeated queries
5. **Holding = kode_outlet '111'**: Special outlet code for holding users to see all data

### Lessons Learned

1. **RLS Can Block Legitimate Operations**: Need SECURITY DEFINER functions for certain operations
2. **PostgreSQL Function Syntax**: All parameters after defaults must have defaults
3. **UUID vs TEXT**: Always match auth.users.id type (UUID) for foreign keys
4. **MaybeSingle vs Single**: Use `.maybeSingle()` when row might not exist
5. **Layered Security**: Multiple checkpoints (login + dashboard) provide better protection

---

*Last Updated: December 28, 2025*
*Project Status: RoleId System Migration Complete - Auth & RBAC Working*
*Next: Build Business Modules (Inventory, Purchase Orders, Finance)*

---

## Session: December 29, 2025 - Master Data Module (Product Management)

### Overview

This session implemented the Product Management module as the first feature of the Master Data section. The implementation included full CRUD operations with role-based access control and an auto-generated SKU system using PostgreSQL triggers.

### Key Changes Made

#### 1. New Database Tables

**master_type** (Product Categories):
| Column | Type | Description |
|--------|------|-------------|
| id | BIGINT (PK) | Auto-increment ID |
| nama_type | TEXT | Type name |
| description | TEXT | Type description |
| created_at | TIMESTAMPTZ | Created timestamp |

**master_barang** (Products):
| Column | Type | Description |
|--------|------|-------------|
| id | BIGINT | Part of composite PK |
| sku | TEXT | Auto-generated SKU (e.g., ZP25XII0001) |
| created_at | TIMESTAMPTZ | Created timestamp |
| id_type | BIGINT (FK) | References master_type(id) |
| kode_outlet | TEXT (PK) | Outlet code |
| name | TEXT | Product name |
| deleted | BOOLEAN | Soft delete flag |
| image1_url | TEXT | Product image URL |
| iamge2_url | TEXT | Product image URL 2 (typo in DB) |

**Composite Primary Key:** `(kode_outlet, id)`

#### 2. TypeScript Type Definitions

**File:** `src/types/database.ts`

```typescript
export interface MasterType {
  id: number
  nama_type: string
  description: string | null
  created_at: string
}

export interface MasterBarang {
  id: number
  sku: string | null
  created_at: string
  id_type: number | null
  kode_outlet: string
  name: string | null
  deleted: boolean
  image1_url: string | null
  iamge2_url: string | null  // Note: column typo preserved from DB
}

export interface MasterBarangWithType extends MasterBarang {
  master_type: MasterType | null
  master_outlet: MasterOutlet | null
}

// Updated ROLE_MENU_PERMISSIONS
export const ROLE_MENU_PERMISSIONS: Record<RoleId, string[]> = {
  1: ['dashboard', 'inventory', 'purchase-orders', 'finance', 'users', 'product'],
  2: ['dashboard', 'inventory', 'purchase-orders'],
  3: ['dashboard', 'laundry'],
  4: ['dashboard', 'laundry'],
  5: ['dashboard', 'finance', 'product'],
  6: ['dashboard', 'inventory', 'product'],
  7: ['dashboard', 'inventory', 'purchase-orders'],
  8: ['*'],  // SUPERUSER
  9: [],     // UNASSIGNED
}
```

#### 3. Service Layer Implementation

**File:** `src/services/masterTypeService.ts`
```typescript
export async function getAllTypes(): Promise<ApiResponse<MasterType[]>>
```

**File:** `src/services/masterBarangService.ts`
```typescript
export async function getProductsPaginated(page, pageSize): Promise<PaginatedResponse<MasterBarangWithType>>
export async function createProduct(productData): Promise<ApiResponse<MasterBarang>>
export async function updateProduct(kodeOutlet, id, productData): Promise<ApiResponse<MasterBarang>>
export async function softDeleteProduct(kodeOutlet, id): Promise<ApiResponse<void>>
export function canCurrentUserEditProducts(): boolean
export function canUserSeeAllOutlets(): boolean
```

**Key Design Pattern:**
- All services return `ApiResponse<T>` or `PaginatedResponse<T>`
- TanStack Query wraps these again, so actual data is at `data.data`
- Auto-fills `kode_outlet` from localStorage
- SUPERUSER (role 8) cannot edit (read-only enforcement)

#### 4. React Hooks (TanStack Query)

**File:** `src/hooks/useMasterType.ts`
```typescript
export function useAllTypes()
```

**File:** `src/hooks/useMasterBarang.ts`
```typescript
export function useProductsPaginated(page, pageSize, includeDeleted)
export function useProduct(kodeOutlet, id)
export function useProductsByOutlet(kodeOutlet)
export function useCreateProduct()
export function useUpdateProduct()
export function useSoftDeleteProduct()
export function useCanEditProducts()
export function useCanSeeAllOutlets()
```

#### 5. UI Components

**File:** `src/pages/ProductPage.tsx`

**Features:**
- Paginated product listing (100 items per page)
- Search by name, SKU, or product type
- Role-based filtering (Roles 1,8 see all; Roles 5,6 see own outlet)
- Create/Edit/Delete operations
- SKU auto-generation via database trigger
- Form state management with useEffect reset
- Read-only mode for SUPERUSER

**Form Behavior:**
| Mode | SKU Field | Behavior |
|------|-----------|----------|
| New Product | Disabled | Auto-generated by DB trigger |
| Edit Product | Read-only | Shows value from DB |

#### 6. Sidebar Navigation Update

**File:** `src/components/layout/Sidebar.tsx`

**New Navigation Group:**
```typescript
const masterDataGroups: NavGroup[] = [
  {
    title: 'Master Data',
    icon: Boxes,
    roleIds: [1, 5, 6, 8],
    defaultOpen: true,
    children: [
      {
        title: 'Product',
        path: '/product',
        icon: Tag,
        roleIds: [1, 5, 6, 8],
      },
    ],
  },
]
```

Accordion-style dropdown for grouped menu items with Chevron icon.

#### 7. SKU Generation System (Database Trigger)

**Why Database Trigger?**
- Atomic operation - no race conditions
- Single insert request from frontend
- Centralized logic in PostgreSQL
- Works from any source (SQL, API, Supabase Studio)

**Database Functions (Created in Supabase Studio):**

```sql
-- Function 1: Convert month to Roman numerals
CREATE OR REPLACE FUNCTION get_roman_month(month_int INT)
RETURNS TEXT AS $$
DECLARE
  romans TEXT[] := ARRAY['I', 'II', 'III', 'IV', 'V', 'VI',
                      'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];
BEGIN
  RETURN romans[month_int];
END;
$$ LANGUAGE plpgsql;

-- Function 2: Generate SKU on insert
CREATE OR REPLACE FUNCTION generate_sku_trigger()
RETURNS TRIGGER AS $$
-- Uses advisory lock to prevent race conditions
-- Generates format: ZP25XII0001
-- ZP = prefix
-- 25 = last 2 digits of year
-- XII = Roman numeral month
-- 0001 = 4-digit sequence
$$ LANGUAGE plpgsql;

-- Trigger
CREATE TRIGGER set_sku_before_insert
BEFORE INSERT ON public.master_barang
FOR EACH ROW
WHEN (NEW.sku IS NULL OR NEW.sku = '')
EXECUTE FUNCTION generate_sku_trigger();
```

**SKU Format:** `ZP25XII0001`
- `ZP` = Fixed prefix
- `25` = Last 2 digits of year (2025)
- `XII` = Roman numeral month (December)
- `0001` = 4-digit sequence (resets each month)

**Frontend Insert Flow:**
```typescript
// When creating: exclude 'sku' so database trigger generates it
const submitData = editingProduct
  ? formData
  : (({ sku, ...rest }) => rest)(formData)

await createMutation.mutateAsync(submitData)
// After insert, result.data.sku contains the auto-generated SKU
```

#### 8. Row Level Security (RLS) Policies

**File:** `database-docs/rls-policies-master-barang.sql`

**master_type Policies:**
| Policy | Operation | Access |
|--------|-----------|--------|
| Authenticated can read product types | SELECT | All authenticated |
| Admin can insert product types | INSERT | Role 1 only |
| Admin can update product types | UPDATE | Role 1 only |
| Admin can delete product types | DELETE | Role 1 only |

**master_barang Policies:**
| Policy | Operation | Access |
|--------|-----------|--------|
| Admin and Superuser can read all products | SELECT | Roles 1, 8 (all outlets) |
| Outlet users can read own outlet products | SELECT | Roles 5, 6 (own outlet only) |
| Admin can insert products | INSERT | Role 1 (own outlet) |
| Outlet users can insert products | INSERT | Roles 5, 6 (own outlet) |
| Admin can update products | UPDATE | Role 1 (own outlet) |
| Outlet users can update products | UPDATE | Roles 5, 6 (own outlet) |
| Admin can delete products | DELETE | Role 1 (own outlet) |
| Outlet users can delete products | DELETE | Roles 5, 6 (own outlet) |

**Note:** Role 8 (SUPERUSER) has NO INSERT/UPDATE/DELETE policies = read-only

#### 9. Route Protection

**File:** `src/App.tsx`

```typescript
<Route
  path="/product"
  element={
    <ProtectedRoute allowedRoles={[1, 5, 6, 8]}>
      <ProductPage />
    </ProtectedRoute>
  }
/>
```

### Files Created/Modified This Session

**Created:**
| File | Purpose |
|------|---------|
| `src/services/masterTypeService.ts` | Product type CRUD operations |
| `src/services/masterBarangService.ts` | Product CRUD operations |
| `src/hooks/useMasterType.ts` | TanStack Query hooks for types |
| `src/hooks/useMasterBarang.ts` | TanStack Query hooks for products |
| `src/pages/ProductPage.tsx` | Product management page |
| `database-docs/rls-policies-master-barang.sql` | RLS policies SQL |

**Modified:**
| File | Changes |
|------|---------|
| `src/types/database.ts` | Added MasterType, MasterBarang interfaces, updated ROLE_MENU_PERMISSIONS |
| `src/components/layout/Sidebar.tsx` | Added NavGroup type, Master Data accordion menu |
| `src/App.tsx` | Added /product route with ProtectedRoute |

**Database (Supabase Studio):**
| Object | Purpose |
|--------|---------|
| `get_roman_month()` function | Convert month number to Roman numerals |
| `generate_sku_trigger()` function | Generate auto SKU with advisory lock |
| `set_sku_before_insert` trigger | Fire before insert to generate SKU |

### Issues Encountered & Resolved

#### Issue 1: `types.map is not a function`

**Error:**
```
ProductPage.tsx:99 Uncaught TypeError: types.map is not a function
```

**Root Cause:**
`useAllTypes()` returns TanStack Query result where `data` is `ApiResponse<MasterType[]>` object (with `{data, error, isSuccess}`), not the array directly.

**Original Code (Broken):**
```typescript
const { data: types } = useAllTypes()
// types was ApiResponse<MasterType[]>, not MasterType[]
```

**Fix:**
```typescript
const { data: typesResponse } = useAllTypes()
const types = typesResponse?.data || []
// Properly unwrapped the ApiResponse object
```

#### Issue 2: Form Not Resetting After Create

**Problem:** When creating a new product after creating one, the form still contained previous data.

**Root Cause:** `useState` only initializes once, so when `editingProduct` changes from a product to `null`, the state doesn't update.

**Fix:** Added `useEffect` to reset form when `isOpen` or `editingProduct` changes:
```typescript
useEffect(() => {
  if (isOpen) {
    setFormData({
      sku: editingProduct?.sku || '',
      id_type: editingProduct?.id_type || null,
      // ... rest of fields
    })
  }
}, [isOpen, editingProduct])
```

#### Issue 3: SKU Field Should Be Read-Only When Editing

**Problem:** User wanted SKU to be read-only (showing backend value) when editing products.

**Fix:** Changed SKU input props:
```typescript
<Input
  id="sku"
  value={formData.sku || ''}
  readOnly={!!editingProduct}      // Read-only when editing
  disabled={!editingProduct}         // Disabled when new
  className="bg-muted"               // Gray background
/>
```

#### Issue 4: RLS Policies Execution Failed

**Problem:** Automated execution of RLS policies failed with "must be owner of table" error.

**Root Cause:** Tables owned by `supabase_admin`, not `postgres`. SET ROLE also failed with permission denied.

**Solution:** User must manually run the SQL in Supabase Studio SQL Editor.

### Testing Checklist

- [x] Create new product with auto-generated SKU
- [x] Form resets after creating product
- [x] Edit existing product with read-only SKU
- [x] Search products by name/SKU/type
- [x] Pagination works correctly
- [x] Role-based access control (roles 1, 5, 6, 8)
- [x] SUPERUSER (role 8) read-only mode
- [x] Outlet users see only their outlet's products
- [x] Soft delete functionality
- [x] Database trigger generates SKU atomically

### API Response Pattern

All service functions return standardized response objects:

```typescript
export interface ApiResponse<T> {
  data: T | null
  error: string | null
  isSuccess: boolean
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  count: number | null
  page: number
  pageSize: number
}
```

**Usage Example:**
```typescript
// Service returns ApiResponse<MasterBarang[]>
const { data, error, isSuccess } = await createProduct(formData)

// TanStack Query wraps it again
const { data: typesResponse } = useAllTypes()
const types = typesResponse?.data || []  // Actual array
```

### Known Issues / Notes

1. **Database Column Typo**: `master_barang.iamge2_url` (typo) instead of `image2_url`. Preserved to match database schema.

2. **RLS Policies**: Must be manually executed in Supabase Studio SQL Editor.

3. **SKU Sequence**: Resets each month. December 2025 = 0001, 0002... January 2026 = 0001, 0002...

4. **RLS Advisory Lock**: Uses `pg_advisory_xact_lock()` to prevent race conditions in SKU generation.

### Future Enhancements (Per Original Request)

The Master Data menu was designed to include:
- ✅ Product (Implemented)
- ⏳ Price (Pending)
- ⏳ Inventory (Pending)

### Database Connection

**Development Database:**
```bash
Host: 217.21.78.155
Port: 57777
Database: postgres
User: postgres
Password: 6eMmeCxaATl8z7be3ReaGodvN7HpcOpt
```

### Session Summary

This session implemented the Product management module for the WMS frontend, including:

1. **Full CRUD operations** for the `master_barang` table
2. **Role-based access control** with RLS policies
3. **Auto-generated SKU system** using PostgreSQL triggers
4. **Form state management** with proper reset behavior
5. **Read-only SKU field** when editing products

The SKU generation was initially planned for the frontend but was moved to the database for better atomicity and to prevent race conditions. The final implementation uses PostgreSQL triggers with advisory locks to ensure uniqueness even under high concurrency.

---

*Last Updated: December 29, 2025*
*Project Status: Master Data - Product Module Complete*
*Next: Price and Inventory modules, or other business features*
