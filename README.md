# TrustVault — Secure Multi-Tenant Document Sharing Platform

TrustVault is an enterprise-grade document sharing platform built to provide confidential file sharing with strict multi-tenant isolation, role-based access control, explicit document-level permissions, and an immutable audit trail.

Built as an individual hackathon project adhering strictly to zero-trust principles: **Security is enforced on the server for every single API request, not through frontend route hiding.**

---

## 1. Key Features

- **Strict Multi-Tenant Isolation:** Users belong to distinct company workspaces (e.g. Acme Corporation, CyberDyne Systems). All queries strictly enforce tenant boundaries. Cross-tenant tampering and IDOR attempts are rejected with 404/403 status codes.
- **Explicit Document-Level Access Control:** No reliance on folder-only inheritance. Every document access (read, preview, download, update, delete, share, revoke) requires an explicit, unrevoked grant (`VIEW`, `DOWNLOAD`, `SHARE`, `ADMIN`).
- **Immediate Revocation Enforcement:** When an administrator or sharer revokes access, all subsequent read and download requests are instantly terminated.
- **Private Storage Architecture:** Confidential files are stored outside the web root with cryptographically generated UUIDs (`doc_<uuid>.<ext>`), SHA-256 integrity checksums, and path traversal protection (`..`, `/`, `\`).
- **Tamper-Resistant Audit Trail:** Automatic backend audit logging of logins, uploads, downloads, sharing grants, revocations, and denied access attempts with actor ID, IP address, timestamp, and safe metadata. Ordinary users cannot edit or delete audit logs.
- **Modern SaaS Dashboard:** Elegant interface with a soft cream, warm beige, and subtle brown accent palette across 12 comprehensive pages with desktop, tablet, and mobile responsiveness.

---

## 2. Technology Stack

### Frontend
- **Framework:** React 18 with Vite
- **Language:** TypeScript
- **Styling:** Tailwind CSS (custom warm beige & cream theme)
- **Routing:** React Router v6
- **API Client:** Axios (with cookie credentials and auto-injected headers)
- **Icons:** Lucide React

### Backend
- **Runtime:** Node.js v20+ / Express.js
- **Language:** TypeScript
- **ORM:** Prisma ORM
- **Database:** SQLite (default for zero-friction standalone evaluation) / PostgreSQL (production-ready)
- **Validation:** Zod schema validation
- **Security:** Helmet, CORS with credentials, express-rate-limit, bcryptjs password hashing, JWT HttpOnly sessions
- **File Processing:** Multer memory storage & private disk streaming

### Testing
- **Test Framework:** Vitest 2.x & Supertest (10 automated security scenarios)

---

## 3. Project Architecture

```
trustvault/
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma       # Relational models (User, Company, Membership, Document, Permission, AuditLog)
│   │   └── seed.ts             # Realistic multi-tenant test seed data
│   ├── private_storage/        # Isolated folder storing encrypted/UUID files outside web root
│   ├── src/
│   │   ├── config.ts           # Environment & security config
│   │   ├── db.ts               # Prisma client singleton
│   │   ├── types/              # TypeScript definitions & Express context augmentations
│   │   ├── utils/              # Security (bcrypt, JWT) and Audit logger
│   │   ├── services/           # Private storage engine (path traversal protection, UUID keys)
│   │   ├── middleware/         # requireAuth, requireTenantMembership, requireDocumentAccess, validate
│   │   ├── routes/             # auth, workspace, document, share, and audit-log endpoints
│   │   ├── __tests__/          # Vitest automated security test suite (10 verification scenarios)
│   │   └── index.ts            # Express server entry point
│   ├── .env.example
│   ├── package.json
│   └── tsconfig.json
│
├── frontend/
│   ├── src/
│   │   ├── api/client.ts       # Axios instance with auth & tenant headers
│   │   ├── context/AuthContext # User session & workspace switcher
│   │   ├── components/         # Navbar, Sidebar, Modal, Badge, LoadingSpinner, EmptyState
│   │   ├── pages/              # 12 views (Landing, Login, Register, Dashboard, Documents, Detail,
│   │   │                       #  UploadModal, ShareModal, AuditLogs, Members, Profile, 404, 403)
│   │   ├── index.css           # Tailwind custom tokens
│   │   └── App.tsx             # Protected routing
│   ├── package.json
│   ├── vite.config.ts
│   └── tailwind.config.js
│
├── README.md                   # Complete documentation
├── THREATS.md                  # Threat model & automated verification results
└── PROMPTS.md                  # Development history and prompts log
```

---

## 4. Quick Start & Installation

### Prerequisites
- Node.js v18+ and npm installed.

### Setup Instructions

1. **Clone or Navigate to the Project:**
   ```powershell
   cd C:\Users\DELL\.gemini\antigravity\scratch\trustvault
   ```

2. **Backend Setup:**
   ```powershell
   cd backend
   npm install
   npx prisma generate
   npx prisma db push
   npx tsx prisma/seed.ts
   ```

3. **Frontend Setup:**
   ```powershell
   cd ../frontend
   npm install
   ```

---

## 5. Running the Application

### Option A: Run Backend and Frontend Concurrently
From the project root:
```powershell
# Terminal 1: Backend API
cd backend
npm run dev

# Terminal 2: Frontend Vite App
cd frontend
npm run dev
```

The frontend will run at: **http://localhost:5173**  
The backend API will run at: **http://localhost:5000**

---

## 6. Pre-Seeded Test Credentials

Use these pre-seeded accounts to demonstrate role-based access control and tenant isolation:

| User | Email | Password | Organization | Role / Capabilities |
|---|---|---|---|---|
| **Alice Walker** | `alice@acme.com` | `Password123!` | Acme Corporation | **Company Admin** (Full workspace & audit log access) |
| **Bob Martinez** | `bob@acme.com` | `Password123!` | Acme Corporation | **Member** (Has explicit DOWNLOAD grant on Q3 Financials) |
| **Carol Danvers** | `carol@acme.com` | `Password123!` | Acme Corporation | **Viewer** (Read-only; access revoked on Architecture Spec) |
| **David Vance** | `david@cyberdyne.com` | `Password123!` | CyberDyne Systems | **Company Admin** (Different Tenant: isolated from Acme) |

> 💡 **Demo Tip:** The login page features **1-click quick fill buttons** for Alice, Bob, Carol, and David so you can seamlessly demonstrate cross-tenant isolation and role differences.

---

## 7. Running the Security Test Suite

Execute the 10 automated security verification tests:
```powershell
cd backend
npm run test
```

Expected result:
```
✓ src/__tests__/security.test.ts (10 tests)
Test Files  1 passed (1)
     Tests  10 passed (10)
```

The test suite verifies:
1. Unauthenticated users cannot access protected documents (401).
2. CyberDyne users cannot access Acme documents by manipulating IDs (404/403).
3. Unshared users cannot download files via direct API calls (403).
4. Users cannot escalate privileges during document sharing (403).
5. Revoked users are immediately blocked from downloading/viewing (403).
6. Viewers cannot upload or rename documents (403).
7. Unauthorized users cannot view or delete audit logs (403/404).
8. Invalid MIME types and oversized files are rejected (400).
9. Denied security requests trigger attributable audit records in the database.
10. Valid users can download and view their authorized files (200).

---

## 8. API Specification

| Endpoint | Method | Required Auth / Role | Description |
|---|---|---|---|
| `/api/auth/register` | `POST` | Public | Register new user and organization workspace |
| `/api/auth/login` | `POST` | Public | Sign in and receive JWT in HttpOnly cookie & response |
| `/api/auth/logout` | `POST` | Authenticated | Invalidate session cookie |
| `/api/auth/me` | `GET` | Authenticated | Retrieve current user profile and memberships |
| `/api/auth/profile` | `PUT` | Authenticated | Update full name or change password |
| `/api/workspaces` | `GET` | Authenticated | List all workspaces user belongs to |
| `/api/workspaces` | `POST` | Authenticated | Create a new company workspace |
| `/api/workspaces/:companyId` | `GET` | Workspace Member | Get live workspace statistics & recent activity |
| `/api/workspaces/:companyId/members` | `GET` | Workspace Member | List company members |
| `/api/workspaces/:companyId/members` | `POST` | Company Admin | Add registered user to workspace |
| `/api/workspaces/:companyId/members/:userId` | `PATCH` | Company Admin | Update member role (ADMIN, MEMBER, VIEWER) |
| `/api/workspaces/:companyId/members/:userId` | `DELETE` | Company Admin | Remove member from workspace |
| `/api/documents` | `GET` | Workspace Member | List all authorized documents for the user |
| `/api/documents/upload` | `POST` | Admin / Member | Upload confidential document (stored in private storage) |
| `/api/documents/:id` | `GET` | VIEW permission | Get document metadata and check permissions |
| `/api/documents/:id/preview` | `GET` | VIEW permission | Stream document preview inline |
| `/api/documents/:id/download` | `GET` | DOWNLOAD permission | Securely stream file attachment |
| `/api/documents/:id` | `PATCH` | ADMIN permission | Rename document |
| `/api/documents/:id` | `DELETE` | ADMIN permission | Delete document and remove private storage file |
| `/api/documents/:id/share` | `POST` | SHARE permission | Grant explicit user-level permission |
| `/api/documents/:id/permissions`| `GET` | SHARE permission | List current and revoked grants for document |
| `/api/documents/:id/revoke/:userId` | `POST` | SHARE permission | Immediately revoke access for target user |
| `/api/audit-logs` | `GET` | Company Admin | Query filtered, paginated audit records |

---

## 9. Environment Configuration

Example backend configuration (`backend/.env`):
```ini
PORT=5000
NODE_ENV=development
DATABASE_URL="file:./dev.db" # Or "postgresql://postgres:secret@localhost:5432/trustvault?schema=public"
JWT_SECRET=your_secure_random_jwt_secret_key
JWT_EXPIRES_IN=24h
COOKIE_SECRET=your_cookie_signing_secret
CORS_ORIGIN=http://localhost:5173
STORAGE_DIR=./private_storage
MAX_FILE_SIZE_BYTES=20971520 # 20MB
```

---

## 10. Production Deployment Guide

1. **Database:** Set `DATABASE_URL` to your production PostgreSQL connection string in `backend/.env`. Change `provider = "sqlite"` to `provider = "postgresql"` in `prisma/schema.prisma` and run `npx prisma migrate deploy`.
2. **Environment Variables:** Provide unique, high-entropy secrets for `JWT_SECRET` and `COOKIE_SECRET`.
3. **Storage:** In containerized or serverless deployments, mount a persistent private volume at `STORAGE_DIR` or connect an S3-compatible object store.
4. **Build & Start:**
   ```powershell
   # Build backend
   cd backend && npm run build
   # Build frontend
   cd ../frontend && npm run build
   # Run production backend
   cd ../backend && npm start
   ```

---

## 11. Known Limitations & Future Enhancements

- **Object Storage Cloud Provider:** The current version uses the high-performance local private storage engine with cryptographically random UUID identifiers. In a distributed multi-region cluster, the `StorageService` can be backed by an S3 bucket with server-side SSE-KMS encryption.
- **Temporary Access Granularity:** The database schema and backend permission middleware fully enforce `expiresAt` checks. Future UI iterations can add countdown badges for expiring grants.
