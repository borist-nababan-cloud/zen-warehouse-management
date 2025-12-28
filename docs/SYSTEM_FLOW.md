# Warehouse Management System - System Flow & Architecture

## System Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         USER INTERFACE                          │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐      │
│  │  Login   │  │ Dashboard│  │Inventory │  │ Finance  │      │
│  │   Page   │  │   Page   │  │  Module  │  │  Module  │      │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘      │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                      AUTHENTICATION LAYER                        │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │  ProtectedRoute Component (Role-Based Access Control)     │ │
│  │  - Checks if user is authenticated                        │ │
│  │  - Checks if user has required role                       │ │
│  │  - Redirects unauthorized users                           │ │
│  └────────────────────────────────────────────────────────────┘ │
│                              ↓                                  │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │  useAuth Hook (TanStack Query)                            │ │
│  │  - getCurrentUser()                                       │ │
│  │  - useSignIn()                                            │ │
│  │  - useSignOut()                                           │ │
│  └────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                       SERVICE LAYER                              │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │  authService.ts                                           │ │
│  │  - signIn()           → Supabase Auth                    │ │
│  │  - signOut()          → Supabase Auth                    │ │
│  │  - getProfile()       → Supabase Database (profiles)     │ │
│  │  - updateProfile()    → Supabase Database (profiles)     │ │
│  └────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                      DATABASE LAYER                               │
│                    (Supabase PostgreSQL)                         │
│  ┌─────────────┐    ┌─────────────┐                            │
│  │   auth.users│───→│  profiles   │                            │
│  │             │    │             │                            │
│  │  (Supabase  │    │  id (PK)     │                            │
│  │   Auth)     │    │  email       │                            │
│  │             │    │  full_name   │                            │
│  │             │    │  role        │                            │
│  │             │    │  location_id │───→┌──────────────┐        │
│  └─────────────┘    └─────────────┘    │  locations   │        │
│                                         │              │        │
│                                         │  id (PK)     │        │
│                                         │  name        │        │
│                                         │  location_   │        │
│                                         │    code      │        │
│                                         │  location_   │        │
│                                         │    type      │        │
│                                         └──────────────┘        │
└─────────────────────────────────────────────────────────────────┘
```

---

## User Roles & Hierarchy

```
                    ┌──────────────────┐
                    │   ADMIN_HOLDING  │
                    │   (Super Admin)  │
                    └────────┬─────────┘
                             │
        ┌────────────────────┼────────────────────┐
        │                    │                    │
┌───────▼───────┐  ┌────────▼────────┐  ┌───────▼───────┐
│ STAFF_HOLDING  │  │     FINANCE     │  │ LAUNDRY_ADMIN  │
│ (Holding Staff)│  │  (Finance Mgr)  │  │ (Laundry Mgr)  │
└───────────────┘  └─────────────────┘  └───────────────┘
        │                    │
        │         ┌──────────┴──────────┐
        │         │                     │
┌───────▼───────┐ │           ┌─────────▼─────────┐
│ WAREHOUSE_     │ │           │  OUTLET_ADMIN     │
│    STAFF       │ │           │  (Outlet Mgr)     │
└───────────────┘ │           └───────────────────┘
                  │
        ┌─────────▼─────────┐
        │  LAUNDRY_STAFF    │
        │  (Laundry Worker) │
        └───────────────────┘
```

---

## Location Types & Hierarchy

```
                    ┌──────────────────┐
                    │     HOLDING      │
                    │    (HQ Jakarta)  │
                    └────────┬─────────┘
                             │
        ┌────────────────────┼────────────────────┐
        │                    │                    │
┌───────▼───────┐  ┌────────▼────────┐  ┌───────▼───────┐
│    WAREHOUSE   │  │     OUTLET      │  │    LAUNDRY     │
│ (Storage Area) │  │ (Sales Point)   │  │ (Laundry Area) │
└───────────────┘  └─────────────────┘  └───────────────┘
```

---

## Authentication Flow

```
┌──────────────┐
│ User enters  │
│ credentials  │
└──────┬───────┘
       │
       ▼
┌─────────────────────────────────────────────────────────┐
│  LoginPage.tsx (React Hook Form + Zod Validation)      │
│  - Validates email format                               │
│  - Validates password length (min 6 chars)              │
└────────┬────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────┐
│  useSignIn() Hook (TanStack Query Mutation)             │
│  - Calls authService.signIn()                          │
└────────┬────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────┐
│  authService.ts                                         │
│  - supabase.auth.signInWithPassword()                   │
│  - On success: getProfile(user.id)                      │
└────────┬────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────┐
│  Supabase Auth                                          │
│  - Validates email/password                             │
│  - Returns user session with JWT                        │
└────────┬────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────┐
│  getProfile() - Fetch from profiles table              │
│  - Includes nested location data                        │
│  - SELECT *, location:locations(*)                      │
└────────┬────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────┐
│  Dashboard Page                                         │
│  - Displays user info (name, role, location)           │
│  - Shows role-based menu options                        │
└─────────────────────────────────────────────────────────┘
```

---

## Role-Based Access Control (RBAC)

```
┌──────────────────────────────────────────────────────────────┐
│                    ProtectedRoute Component                   │
│                                                               │
│  1. Check Authentication                                      │
│     ├─ Not logged in → Redirect to /login                    │
│     └─ Logged in → Continue                                  │
│                                                               │
│  2. Check Role Authorization                                 │
│     ├─ Role allowed → Access granted                         │
│     └─ Role not allowed → Redirect to /unauthorized           │
│                                                               │
└──────────────────────────────────────────────────────────────┘

Example:
┌────────────────────────────────────────────────────────────┐
│  <ProtectedRoute allowedRoles={['admin_holding', 'finance']}> │
│    <FinancePage />  ← Only admin_holding and finance can access │
│  </ProtectedRoute>                                            │
└────────────────────────────────────────────────────────────┘
```

---

## Database Schema Relationships

```
┌─────────────────┐         ┌─────────────────┐
│   locations     │         │    profiles     │
│─────────────────│         │─────────────────│
│ id (BIGINT) PK  │◄────────│ location_id (FK)│
│ name            │         │ id (TEXT) PK    │──┐
│ location_code   │         │ email           │  │
│ location_type   │         │ full_name       │  │
│ is_active       │         │ role            │  │
│ created_at      │         │ phone           │  │
│ updated_at      │         │ is_active       │  │
└─────────────────┘         │ created_at      │  │
                            │ updated_at      │  │
                            └─────────────────┘  │
                                                 │
                                                 │
    ┌──────────────────────────────────────────┘
    │
    ▼
┌─────────────────┐
│   auth.users    │ (Supabase Auth - managed by Supabase)
│─────────────────│
│ id (UUID) PK    │
│ email           │
│ encrypted_pass  │
│ raw_user_meta_ │
│   data          │
└─────────────────┘

TRIGGER: on_auth_user_created
  - Fires when new user added to auth.users
  - Auto-creates row in profiles table
  - Sets default role = 'staff_holding'
```

---

## Current Data Setup

### Locations Table:
| id | name | location_code | location_type | is_active |
|----|------|---------------|---------------|-----------|
| 1  | HQ Jakarta | HQ01 | holding | true |

### Profiles Table:
| id | email | full_name | role | location_id | is_active |
|----|-------|-----------|------|-------------|-----------|
| 801ed3dd... | adminholding@zenfamilyspa.id | Admin Holding | admin_holding | 1 | true |

### User Roles Available:
1. `admin_holding` - Admin Holding (Full access)
2. `staff_holding` - Staff Holding (Limited HQ access)
3. `laundry_staff` - Laundry Staff
4. `laundry_admin` - Laundry Admin
5. `finance` - Finance Manager
6. `outlet_admin` - Outlet Manager
7. `warehouse_staff` - Warehouse Staff

### Location Types Available:
1. `holding` - Holding / HQ
2. `outlet` - Outlet / Sales Point
3. `laundry` - Laundry Area
4. `warehouse` - Warehouse / Storage

---

## Module Access Matrix

| Module | admin_holding | staff_holding | warehouse_staff | outlet_admin | laundry_staff | laundry_admin | finance |
|--------|---------------|---------------|-----------------|--------------|---------------|---------------|---------|
| Inventory Management | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| Purchase Orders | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Finance | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| Laundry Operations | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ | ❌ |
| User Management | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |

---

## API Endpoints (Supabase REST)

### Authentication:
- `POST /auth/v1/token?grant_type=password` - Sign in
- `POST /auth/v1/logout` - Sign out
- `GET /auth/v1/user` - Get current user

### Profiles:
- `GET /rest/v1/profiles?select=*,location:locations(*)` - Get profiles with location
- `PATCH /rest/v1/profiles?id=eq.{id}` - Update profile

### Locations:
- `GET /rest/v1/locations` - Get all locations
- `POST /rest/v1/locations` - Create location (authenticated)

---

## Technology Stack Summary

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Frontend Framework | React 18 + Vite | UI rendering |
| Language | TypeScript (Strict) | Type safety |
| State Management | TanStack Query v5 | Server state caching |
| Auth State | Zustand | Global auth state |
| UI Library | Shadcn/UI (Radix + Tailwind) | Component library |
| Forms | React Hook Form + Zod | Form validation |
| Backend | Supabase | Auth + Database |
| Database | PostgreSQL (via Supabase) | Data persistence |
| Icons | Lucide-React | Icon library |
| Routing | React Router v7 | Client-side routing |
| Notifications | Sonner (Toast) | User feedback |
