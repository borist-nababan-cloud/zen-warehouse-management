# Database Schema Analysis
**Date:** December 28, 2025
**Analyzed By:** Claude Code

---

## Executive Summary

The current database contains a **mixed schema** with both old (unused) and new (active) tables. This analysis provides recommendations for migrating to the new user control system using `role_user`, `users_profile`, `master_outlet`, and `group_outlet` tables.

---

## Current Schema Structure

### Tables Identified

| Table | Status | Purpose |
|-------|--------|---------|
| `role_user` | **NEW - Active** | Role definitions (1-9) |
| `users_profile` | **NEW - Active** | User profiles with outlet assignment |
| `master_outlet` | **NEW - Active** | Outlet master data |
| `group_outlet` | **NEW - Active** | Outlet grouping |
| `master_type` | **NEW - Active** | Product type/category master data |
| `master_bareng` | **NEW - Active** | Product/item master data with images |
| `profiles` | **OLD - Legacy** | Previous user profiles (to be deprecated) |
| `locations` | **OLD - Legacy** | Previous location system (to be deprecated) |

### Schema Visual Overview

```
auth.users (Supabase Auth)
    │
    ▼
┌─────────────┐     ┌──────────────┐     ┌──────────────┐
│users_profile│────▶│  role_user   │     │master_outlet │
├─────────────┤     ├──────────────┤     ├──────────────┤
│ id (PK)     │     │ id (PK)      │     │ name_outlet  │
│ user_id     │────▶│ role_name    │     │ alamat       │
│ role_id     │────▶│ created_at   │     │ no_telp      │
│ kode_susifel│     └──────────────┘     │ location     │
│ email       │                          │ province     │
│ created_at  │            ┌─────────────┤ outlet_group_│
└─────────────┘            │             │ id (FK)      │
           │               │             └──────────────┘
           │               │                     │
           │               │                     ▼
           │               │            ┌──────────────┐
           │               └───────────▶│group_outlet  │
           │                            ├──────────────┤
           ▼                            │ group_id (PK)│
┌─────────────┐     ┌──────────────┐    │ group_name   │
│master_bareng│     │  master_type │    └──────────────┘
├─────────────┤     ├──────────────┤
│ id (PK)     │     │ id (PK)      │
│ kiu         │     │ name_type    │
│ is_type     │────▶│ description  │
│ kode_outlet │     │ created_at   │
│ nama        │     └──────────────┘
│ deleted     │
│ image_url   │
│ image2_url  │
│ created_at  │
└─────────────┘
```

---

## New Schema Details

### 1. `role_user` Table
**Purpose:** Stores role definitions and permissions

| Column | Type | Description |
|--------|------|-------------|
| id | **PRIMARY KEY** | Auto-increment role ID |
| role_name | TEXT | Name of the role |
| created_at | TIMESTAMPTZ | Timestamp |

**Proposed Role ID System (1-9):**
```
1  - admin_holding      (Full access, holding scope)
2  - staff_holding      (Limited access, holding scope)
3  - laundry_admin      (Laundry module admin)
4  - laundry_staff      (Laundry module staff)
5  - finance            (Finance module access)
6  - outlet_admin       (Outlet management)
7  - warehouse_staff    (Warehouse operations)
8  - SUPERUSER          (ALL ACCESS, no outlet restriction)
9  - UNASSIGNED         (Default for new users, should be blocked)
```

### 2. `users_profile` Table
**Purpose:** Links auth users to roles and outlets

| Column | Type | Description |
|--------|------|-------------|
| id | **PRIMARY KEY** | Auto-increment ID |
| user_id | INTEGER (FK) | References `profiles.id` (legacy) or `auth.users.id` |
| role_id | INTEGER (FK) | References `role_user.id` |
| kode_susifel | TEXT | Outlet code (custom field) |
| email | TEXT | User email |
| created_at | TIMESTAMPTZ | Timestamp |

**⚠️ NOTE:** The schema image shows `user_id` and `role_id` as column names, but the frontend code was written using `uid` and `user_role`. Need to verify actual database structure.

**Expected Structure (from frontend code):**
| Column | Type | Description |
|--------|------|-------------|
| uid | UUID (FK) | References `auth.users.id` |
| user_role | INTEGER (FK) | References `role_user.id` (1-9) |
| kode_outlet | TEXT | References `master_outlet.kode_outlet` |
| email | TEXT | User email |

**Special Rules:**
- `user_role = 9` (UNASSIGNED) → User should be blocked from app
- `user_role = 8` (SUPERUSER) → All access, `kode_outlet` is ignored
- `kode_outlet = '111'` → Holding/Headquarters (sees all data)

### 3. `master_outlet` Table
**Purpose:** Master data for all outlets

| Column | Type | Description |
|--------|------|-------------|
| name_outlet | TEXT | Outlet name |
| alamat | TEXT | Address |
| no_telp | TEXT | Phone number |
| location | TEXT | Location description |
| province | TEXT | Province |
| outlet_group_id | INTEGER (FK) | References `group_outlet.group_id` |
| created_at | TIMESTAMPTZ | Timestamp |

**⚠️ NOTE:** Schema image doesn't show `kode_outlet` as PK, but documentation references it. Need to verify actual primary key.

**Expected Structure (from documentation):**
| Column | Type | Description |
|--------|------|-------------|
| kode_outlet | **PRIMARY KEY** | Unique outlet code |
| name_outlet | TEXT | Outlet name |
| alamat | TEXT | Address |
| no_telp | TEXT | Phone number |
| no_wa | TEXT | WhatsApp number |
| location | TEXT | Location description |
| province | TEXT | Province |
| outlet_group_id | INTEGER (FK) | References `group_outlet.group_id` |

### 4. `group_outlet` Table
**Purpose:** Groups outlets for management

| Column | Type | Description |
|--------|------|-------------|
| group_id | **PRIMARY KEY** | Auto-increment group ID |
| group_name | TEXT | Group name |
| created_at | TIMESTAMPTZ | Timestamp |

### 5. `master_type` Table
**Purpose:** Product type/category master data

| Column | Type | Description |
|--------|------|-------------|
| id | **PRIMARY KEY** | Auto-increment type ID |
| name_type | TEXT | Type/category name |
| description | TEXT | Type description |
| created_at | TIMESTAMPTZ | Timestamp |

**Usage:** Referenced by `master_bareng.is_type` for product categorization.

### 6. `master_bareng` Table
**Purpose:** Product/item master data with images

| Column | Type | Description |
|--------|------|-------------|
| id | **PRIMARY KEY** | Auto-increment product ID |
| kiu | TEXT | Unique product code/SKU |
| is_type | INTEGER (FK) | References `master_type.id` |
| kode_outlet | TEXT | Outlet code assignment |
| nama | TEXT | Product name |
| deleted | BOOLEAN | Soft delete flag |
| image_url | TEXT | Primary image URL |
| image2_url | TEXT | Secondary image URL |
| created_at | TIMESTAMPTZ | Timestamp |

**Usage:** This is the main product inventory master table. Products can be assigned to specific outlets via `kode_outlet`.

---

## Proposed Login Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│                         LOGIN FLOW                                  │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  1. User enters email/password                                      │
│     ↓                                                               │
│  2. Supabase Auth: supabase.auth.signInWithPassword()              │
│     ↓                                                               │
│  3. Check users_profile table                                       │
│     ┌─────────────────────────────────────┐                        │
│     │ CASE 1: Record NOT EXISTS           │                        │
│     │ ─────────────────────────────────   │                        │
│     │ • INSERT into users_profile:        │                        │
│     │   - uid = auth.uid()                │                        │
│     │   - user_role = 9 (UNASSIGNED)      │                        │
│     │   - email = auth.user.email         │                        │
│     │   - kode_outlet = NULL              │                        │
│     │ • Show toast: "You are not assigned │                        │
│     │   for use this application. Contact │                        │
│     │   Administrator"                    │                        │
│     │ • Force logout                      │                        │
│     └─────────────────────────────────────┘                        │
│     ┌─────────────────────────────────────┐                        │
│     │ CASE 2: Record EXISTS               │                        │
│     │ ─────────────────────────           │                        │
│     │ IF user_role = 9 (UNASSIGNED):      │                        │
│     │   • Show toast: "Not assigned...    │                        │
│     │     Contact Administrator"          │                        │
│     │   • Force logout                    │                        │
│     │                                    │                        │
│     │ IF user_role = 8 (SUPERUSER):       │                        │
│     │   • Grant ALL permissions           │                        │
│     │   • Skip outlet filtering           │                        │
│     │   • Store: {role: 8, kode_outlet: null}                     │
│     │                                    │                        │
│     │ IF user_role = 1-7 (ASSIGNED):      │                        │
│     │   • Check permissions by role       │                        │
│     │   • Store kode_outlet for filtering │                        │
│     │   • Store: {role, kode_outlet}      │                        │
│     │                                    │                        │
│     │ IF kode_outlet = '111' (HOLDING):   │                        │
│     │   • Can see data from ALL outlets  │                        │
│     └─────────────────────────────────────┘                        │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Required Schema Changes

### 1. Add Foreign Key Constraints

```sql
-- users_profile should reference auth.users
ALTER TABLE users_profile
ADD CONSTRAINT fk_users_profile_auth
FOREIGN KEY (uid) REFERENCES auth.users(id) ON DELETE CASCADE;

-- users_profile.user_role should reference role_user.id
ALTER TABLE users_profile
ADD CONSTRAINT fk_users_profile_role
FOREIGN KEY (user_role) REFERENCES role_user(id);

-- users_profile.kode_outlet should reference master_outlet.kode_outlet
ALTER TABLE users_profile
ADD CONSTRAINT fk_users_profile_outlet
FOREIGN KEY (kode_outlet) REFERENCES master_outlet(kode_outlet);

-- master_outlet.outlet_group_id should reference group_outlet.group_id
ALTER TABLE master_outlet
ADD CONSTRAINT fk_outlet_group
FOREIGN KEY (outlet_group_id) REFERENCES group_outlet(group_id);
```

### 2. Create Trigger for Auto-Profile Creation

```sql
-- This trigger creates a users_profile entry with role=9 when auth user is created
CREATE OR REPLACE FUNCTION public.handle_new_user_auto()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users_profile (uid, user_role, email, kode_outlet)
  VALUES (NEW.id, 9, NEW.email, NULL);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger
CREATE TRIGGER on_auth_user_created_auto
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user_auto();
```

### 3. Enable RLS (Row Level Security)

```sql
ALTER TABLE users_profile ENABLE ROW LEVEL SECURITY;
ALTER TABLE master_outlet ENABLE ROW LEVEL SECURITY;
ALTER TABLE role_user ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_outlet ENABLE ROW LEVEL SECURITY;

-- Policy: Users can read their own profile
CREATE POLICY "Users can read own profile"
ON users_profile FOR SELECT
USING (auth.uid()::text = uid);

-- Policy: Service role can insert profiles
CREATE POLICY "Service can insert profiles"
ON users_profile FOR INSERT
WITH CHECK (true);

-- Policy: Authenticated can read outlets
CREATE POLICY "Authenticated can read outlets"
ON master_outlet FOR SELECT
TO authenticated
USING (true);
```

---

## Frontend Implementation Changes

### 1. Update TypeScript Types

```typescript
// src/types/database.ts - Update to new schema

export interface RoleUser {
  id: number;          // 1-9
  role_name: string;
  created_at: string;
}

export interface UserProfile {
  uid: string;         // References auth.users.id
  user_role: number;   // References role_user.id (1-9)
  kode_outlet: string; // References master_outlet.kode_outlet, '111' = holding
  email: string;
  created_at: string;
}

export interface MasterOutlet {
  kode_outlet: string;      // Primary key
  name_outlet: string;
  alamat: string;
  no_telp: string;
  no_wa: string;
  location: string;
  province: string;
  outlet_group_id: number;  // References group_outlet.group_id
}

export interface GroupOutlet {
  group_id: number;
  group_name: string;
  created_at: string;
}

// NEW: Product type master
export interface MasterType {
  id: number;
  name_type: string;
  description: string;
  created_at: string;
}

// NEW: Product/item master (main inventory table)
export interface MasterBareng {
  id: number;
  kiu: string;              // SKU/Product code
  is_type: number;          // References master_type.id
  kode_outlet: string;      // Outlet assignment
  nama: string;             // Product name
  deleted: boolean;
  image_url: string;
  image2_url: string;
  created_at: string;
}
```

### 2. Update Auth Service

```typescript
// src/services/authService.ts - Updated flow

export async function signIn(credentials: SignInCredentials) {
  const { data, error } = await supabase.auth.signInWithPassword(credentials);

  if (error) throw error;

  // Check users_profile
  const { data: profile, error: profileError } = await supabase
    .from('users_profile')
    .select('*')
    .eq('uid', data.user.id)
    .single();

  if (profileError || !profile) {
    // Auto-insert with role=9 (UNASSIGNED)
    await supabase.from('users_profile').insert({
      uid: data.user.id,
      user_role: 9,
      email: data.user.email,
      kode_outlet: null,
    });

    await supabase.auth.signOut();
    throw new Error('NOT_ASSIGNED');
  }

  if (profile.user_role === 9) {
    await supabase.auth.signOut();
    throw new Error('NOT_ASSIGNED');
  }

  // Store in localStorage
  localStorage.setItem('kode_outlet', profile.kode_outlet || '');
  localStorage.setItem('user_role', profile.user_role.toString());

  return { user: data.user, profile };
}
```

### 3. Update ProtectedRoute for Role-Based Access

```typescript
// src/components/ProtectedRoute.tsx - Updated with new role system

const ROLE_PERMISSIONS = {
  1: ['dashboard', 'inventory', 'purchase-orders', 'finance', 'users'],      // admin_holding
  2: ['dashboard', 'inventory', 'purchase-orders'],                           // staff_holding
  3: ['dashboard', 'laundry'],                                                // laundry_admin
  4: ['dashboard', 'laundry'],                                                // laundry_staff
  5: ['dashboard', 'finance'],                                                // finance
  6: ['dashboard', 'inventory'],                                              // outlet_admin
  7: ['dashboard', 'inventory'],                                              // warehouse_staff
  8: ['*'],                                                                   // SUPERUSER - all access
  9: [],                                                                      // UNASSIGNED - no access
};

export function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const userRole = parseInt(localStorage.getItem('user_role') || '0');
  const isSuperuser = userRole === 8;

  // SUPERUSER has access to everything
  if (isSuperuser) return children;

  // Check if user has permission
  const hasPermission = allowedRoles?.includes(userRole);
  if (!hasPermission) return <Navigate to="/unauthorized" />;

  return children;
}
```

---

## Schema Discrepancies Found ⚠️

### Issue 1: `users_profile` Column Names

| Schema Image | Frontend Code |
|--------------|---------------|
| `id` (PK) | `uid` (UUID) |
| `user_id` | N/A |
| `role_id` | `user_role` |
| `kode_susifel` | `kode_outlet` |

**Action Required:** Query actual database structure to verify correct column names.

### Issue 2: `master_outlet` Primary Key

Schema image doesn't show `kode_outlet` column, but frontend code and documentation reference it as the primary key.

**Action Required:** Verify if `kode_outlet` exists in actual table.

### Issue 3: Legacy vs New Tables

The schema still shows legacy tables (`profiles`, `locations`) that should have been deprecated.

**Action Required:** Confirm if migration to new schema is complete.

---

## Questions & Clarifications Needed

### 1. Role Permissions Matrix
Please confirm the exact permissions for each role (1-7):

| Role ID | Role Name | Dashboard | Inventory | PO | Finance | Laundry | Users |
|---------|-----------|-----------|-----------|----|---------|---------|-------|
| 1 | admin_holding | ✅ | ✅ | ✅ | ✅ | ❌ | ✅ |
| 2 | staff_holding | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| 3 | laundry_admin | ✅ | ❌ | ❌ | ❌ | ✅ | ❌ |
| 4 | laundry_staff | ✅ | ❌ | ❌ | ❌ | ✅ | ❌ |
| 5 | finance | ✅ | ❌ | ❌ | ✅ | ❌ | ❌ |
| 6 | outlet_admin | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| 7 | warehouse_staff | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| 8 | SUPERUSER | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| 9 | UNASSIGNED | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |

### 2. Data Filtering Rules
- When `kode_outlet = '111'` (Holding), should user see:
  - [ ] All outlets' data combined?
  - [ ] Filtered view per outlet?
  - [ ] Outlet selector dropdown?

### 3. Transaction Table Relations
For transaction tables (invoices, purchase orders, etc.):
- Should they use `kode_outlet` (TEXT) as foreign key to `master_outlet`?
- Or use a different reference system?

### 4. Legacy Tables Cleanup
- Should we drop `profile` and `locations` tables after migration?
- Or keep them for backup?

### 5. Admin Workflow
For assigning users:
- How will admin assign roles and outlets to users?
- Via Supabase Studio directly?
- Or build a User Management page in the app?

---

## Recommended Next Steps

### Phase 0: Verify Actual Database Structure 🔴 CRITICAL
1. ⏳ Query actual database to confirm column names for `users_profile`
2. ⏳ Query actual database to confirm `master_outlet` has `kode_outlet` PK
3. ⏳ Resolve discrepancies between schema image and frontend code
4. ⏳ Decide: keep legacy tables or migrate completely?

### Phase 1: Database Schema Setup
1. ✅ Review and confirm role definitions (1-9)
2. ✅ Add foreign key constraints
3. ✅ Create auto-profile trigger
4. ✅ Set up RLS policies
5. ⏳ Seed initial data:
   - Insert roles 1-9 into `role_user`
   - Create sample outlets in `master_outlet`
   - Create outlet groups in `group_outlet`
   - Create product types in `master_type`
   - Create sample products in `master_bareng`

### Phase 2: Frontend Updates
1. ⏳ Update TypeScript types (add MasterType, MasterBareng)
2. ⏳ Create services for master data:
   - `masterTypeService.ts` - CRUD for product types
   - `masterBarengService.ts` - CRUD for products
   - `masterOutletService.ts` - CRUD for outlets
3. ⏳ Create hooks for master data
4. ⏳ Build Inventory module using `master_bareng` as product table

### Phase 3: Build Business Modules
1. ⏳ **Inventory Module** - Use `master_bareng` as products
2. ⏳ **Purchase Orders** - Create new tables
3. ⏳ **Finance** - Create new tables

### Phase 4: Testing
1. ⏳ Test unassigned user flow (role 9)
2. ⏳ Test superuser access (role 8)
3. ⏳ Test regular user access (roles 1-7)
4. ⏳ Test outlet filtering (kode_outlet)

---

## New Tables Summary

| Table | Purpose | Next Action |
|-------|---------|-------------|
| `master_type` | Product categories | Seed with initial types |
| `master_bareng` | Product master data | Build Inventory module |

---

## Conclusion

The database schema now includes:
- ✅ Role-based access control (1-9 system)
- ✅ Outlet-based data filtering
- ✅ Product type master (`master_type`)
- ✅ Product/item master (`master_bareng`) - **This is the main inventory table**
- ✅ Outlet master (`master_outlet`)
- ✅ Outlet grouping (`group_outlet`)

**Key Discovery:** `master_bareng` is the product/inventory master table with:
- SKU code (`kiu`)
- Product type reference (`is_type`)
- Outlet assignment (`kode_outlet`)
- Image support (`image_url`, `image2_url`)
- Soft delete (`deleted` flag)

**Critical Actions Needed:**
1. 🔴 Verify actual database column names (discrepancies found)
2. 🔴 Update frontend TypeScript types if needed
3. 🟡 Build Inventory module using `master_bareng`

---

*Analysis completed: December 28, 2025*
*Last Updated: Added master_type and master_bareng tables*
