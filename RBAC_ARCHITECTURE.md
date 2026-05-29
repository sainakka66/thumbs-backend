# RBAC Architecture

## Overview

Role-based access control uses normalized tables (`roles`, `permissions`, `role_permissions`) with runtime permission resolution and backward-compatible legacy role strings on `users.role`.

## Database

```
users.role_id → roles.id
role_permissions → permissions.slug
```

Seed roles: `ADMIN`, `MANAGER`, `SALESPERSON`, `DELIVERY_AGENT`.

## Backend flow

```
Request → verifyToken (JWT)
        → loadBusinessUser (DB user + permission Set)
        → requirePermission('module.action')  [optional per route]
        → handler
```

- `lib/rbac/loadBusinessUser.js` — loads user, resolves slug, caches permissions 5 min
- `lib/rbac/requirePermission.js` — ADMIN bypass; OR logic for multiple slugs
- `lib/rbac/roleMap.js` — maps `admin`/`user`/`distributor` to enterprise slugs

Payments mount uses the same `loadBusinessUser` for consistent `req.roleSlug`.

## Frontend flow

```
Login → store token, role, permissions[]
     → AuthContext.hasPermission(slug)
     → filterNav(NAV_ITEMS) in Sidebar / BottomNav
     → PermissionRoute wraps sensitive pages
```

Files:

- `frontend/src/lib/rbac.js` — nav definitions + `canAccess`
- `frontend/src/context/AuthContext.jsx` — permissions state
- `frontend/src/components/auth/PermissionRoute.jsx`

## Security checks

- JWT required on all business routes
- Account status: banned/suspended/deleted blocked at `loadBusinessUser`
- Delivery agent row-level filter: `assigned_user_id = current user`
- Admin payment routes: `requireRole('ADMIN')`

## Deployment note

Run `npm run migrate:business` before enabling strict RBAC in production. Until migration runs, fallback permission sets apply from `permissionCache.fallbackPermissions()`.
