# TrustVault — Threat Model & Security Verification Report

**Date of Verification:** October 22, 2026  
**Application:** TrustVault (Multi-Tenant Document Sharing Platform)  
**Security Lead / Architect:** Antigravity AI Engineering & User Pair  
**Verification Status:** 10 / 10 Security Scenarios Formally Verified & Passing

---

## 1. Assets and Security Objectives

TrustVault is designed to protect three primary asset classes under an enterprise multi-tenant model:

1. **Confidential Customer Documents:** Proprietary PDFs, spreadsheets, blueprints, and records uploaded by enterprise organizations.
   - *Objective:* Complete confidentiality against cross-tenant unauthorized retrieval, path traversal, or direct object reference (IDOR).
2. **Access Control Grants & Permissions:** Dynamic permission records assigning `VIEW`, `DOWNLOAD`, `SHARE`, or `ADMIN` rights to specific users.
   - *Objective:* Integrity of permissions. Non-privileged users must not escalate privileges or grant permissions beyond their scope. Revocations must take effect instantaneously.
3. **Audit Trail History:** System telemetry logging authentication attempts, access grants, file downloads, and permission denials.
   - *Objective:* Tamper-resistance and non-repudiation. Audit records must be immutable (no update/delete APIs) and scoped strictly to authorized tenant administrators.

---

## 2. Trust Boundaries & Architecture Model

```
[ Unauthenticated Internet ]
           │
           │ TLS 1.3 (HTTPS) / Rate Limiting (30 req / 15 min on Auth)
           ▼
┌─────────────────────────────────────────────────────────────────┐
│ Trust Boundary 1: Edge & HTTP Gateway (Express + Helmet + CORS) │
└─────────────────────────────────┬───────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────┐
│ Trust Boundary 2: Authentication Middleware (requireAuth)       │
│ - JWT verification & HttpOnly cookie validation                 │
│ - Account status & identity resolution                          │
└─────────────────────────────────┬───────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────┐
│ Trust Boundary 3: Multi-Tenant Boundary (requireTenantMembership)│
│ - Validates user membership in requested companyId              │
│ - Enforces RBAC roles: ADMIN, MEMBER, VIEWER                    │
│ - Denies cross-tenant queries (prevents IDOR)                   │
└─────────────────────────────────┬───────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────┐
│ Trust Boundary 4: Document Authorization (requireDocumentAccess)│
│ - Verifies explicit DocumentPermission grant                    │
│ - Evaluates hierarchy: VIEW (1) < DOWNLOAD (2) < SHARE (3) < ADMIN (4)│
│ - Enforces immediate revocation check (revokedAt != null)       │
│ - Enforces time-bound expiration (expiresAt > now)              │
└──────────────────┬──────────────────────────────┬───────────────┘
                   │                              │
                   ▼                              ▼
┌─────────────────────────────────────┐  ┌────────────────────────┐
│ Private Storage Engine              │  │ Relational Database    │
│ - Outside web root                  │  │ - Foreign key cascaded │
│ - Random UUID storage keys          │  │ - Atomic transactions  │
│ - Path traversal protection (..,\)  │  │ - Immutable audit logs │
└─────────────────────────────────────┘  └────────────────────────┘
```

---

## 3. Threat Analysis & Mitigations

### Threat 1: Cross-Tenant Insecure Direct Object Reference (IDOR)
- **Scenario:** Attacker in Company B (e.g., CyberDyne) alters the `companyId` or `documentId` in their API request to read Acme Corporation's confidential audit report.
- **Vulnerability Category:** OWASP Top 10 A01:2021 — Broken Access Control.
- **TrustVault Mitigation:**
  1. The backend never trusts client-supplied tenant flags.
  2. The `requireDocumentAccess` middleware queries the document and resolves its owning `companyId`.
  3. It joins against the user's active `Membership` record for that specific company.
  4. If the user does not belong to that company, the request is immediately rejected with a `404 Not Found` (to avoid leaking existence) and logged as `CROSS_TENANT_DOCUMENT_ACCESS` (Outcome: `DENIED`).
- **Verification:** Verified by Automated Test 2.

### Threat 2: Direct File Download & Path Traversal
- **Scenario:** Malicious actor attempts to download files by requesting `/uploads/../../etc/passwd` or guessing storage filenames on a public web root.
- **Vulnerability Category:** OWASP Top 10 A01:2021 & Path Traversal (CWE-22).
- **TrustVault Mitigation:**
  1. No public web-accessible upload directory exists.
  2. Files are saved in a private folder with nonces: `doc_${crypto.randomUUID()}.${safeExt}`.
  3. Original filenames are stored only in database metadata and never used as filesystem paths.
  4. Path containment validation: `storageService.resolveSafePath()` asserts that the resolved absolute path begins strictly with the configured storage root, rejecting any `..`, null bytes, or slashes.
  5. File streaming occurs solely through an authenticated, permission-checked Express proxy.
- **Verification:** Verified by Automated Tests 1, 3, and 8.

### Threat 3: Privilege Escalation During Document Sharing
- **Scenario:** An Acme member with read-only (`VIEW`) or `DOWNLOAD` permission attempts to grant themselves or a collaborator `ADMIN` permission on a document.
- **Vulnerability Category:** OWASP Top 10 A01:2021 — Broken Access Control.
- **TrustVault Mitigation:**
  1. The `/share` endpoint requires at least `SHARE` or `ADMIN` permission.
  2. If a user possesses `SHARE` permission, they cannot grant `ADMIN` permission. Only document owners or workspace administrators can grant `ADMIN`.
  3. Attempted escalations trigger immediate `403 Forbidden` with code `PRIVILEGE_ESCALATION_DENIED` and an audit event.
- **Verification:** Verified by Automated Test 4.

### Threat 4: Stale Access After Revocation
- **Scenario:** An employee's access to a sensitive document is revoked, but they continue downloading files using cached tokens or previously retrieved file links.
- **Vulnerability Category:** Broken Access Control / Inadequate Session Invalidation.
- **TrustVault Mitigation:**
  1. Document downloads do not issue static signed URLs with long expirations.
  2. Every single download or preview stream verifies the current database state of `DocumentPermission`.
  3. If `revokedAt` is populated, subsequent requests are immediately rejected with `403 Forbidden` (`PERMISSION_REVOKED`).
- **Verification:** Verified by Automated Test 5.

### Threat 5: Audit Log Tampering or Deletion
- **Scenario:** An insider deletes audit log entries to obscure unauthorized download attempts.
- **Vulnerability Category:** OWASP Top 10 A09:2021 — Security Logging and Monitoring Failures.
- **TrustVault Mitigation:**
  1. The API exposes no `PUT`, `PATCH`, or `DELETE` endpoints for audit logs.
  2. Audit log creation is handled solely by internal server-side utility functions.
  3. Retrieval is restricted strictly to `Company Admin` roles and scoped by tenant `companyId`.
- **Verification:** Verified by Automated Test 7.

### Threat 6: Cross-Tenant Sharing Bypass
- **Scenario:** An attacker shares a company document with an external user from another organization.
- **Vulnerability Category:** Multi-Tenant Boundary Failure.
- **TrustVault Mitigation:**
  1. The sharing endpoint queries the recipient's email in the database and verifies their active `Membership` in the *same* `companyId`.
  2. If the recipient does not belong to the same workspace, sharing is rejected with `CROSS_TENANT_SHARE_DENIED` and an audit alert is logged.
- **Verification:** Verified in sharing controller validation.

---

## 4. Actual Automated Test Verification Results

All tests were executed against the live Express application, Prisma ORM, and private storage engine using `vitest run`.

| Test # | Requirement / Scenario | Expected Result | Actual Result | Status |
|---|---|---|---|---|
| **1** | Unauthenticated user accessing protected document (AC-01) | HTTP 401 Unauthorized (`UNAUTHENTICATED`) | HTTP 401 Unauthorized | **PASS** |
| **2** | Cross-tenant document access / IDOR attempt (AC-02 / FR-18) | HTTP 404/403 + Denied Audit Event | HTTP 404 + Audit logged | **PASS** |
| **3** | Direct download attempt by unshared member (AC-03) | HTTP 403 Forbidden (`PERMISSION_DENIED`) | HTTP 403 Forbidden | **PASS** |
| **4** | Privilege escalation during sharing (AC-06) | HTTP 403 Forbidden (`PRIVILEGE_ESCALATION_DENIED`) | HTTP 403 Forbidden | **PASS** |
| **5** | Access attempt using revoked grant (AC-05 / FR-13) | HTTP 403 Forbidden (`PERMISSION_REVOKED`) | HTTP 403 Forbidden | **PASS** |
| **6** | Viewer attempting restricted upload/rename (FR-07 / FR-19) | HTTP 403 Forbidden (`INSUFFICIENT_ROLE`) | HTTP 403 Forbidden | **PASS** |
| **7** | Unauthorized audit log access or modification (AC-09 / FR-16) | HTTP 403 on view, 404/405 on deletion | Denied & Immutable | **PASS** |
| **8** | Malicious / invalid file upload rejection (AC-07 / FR-08) | HTTP 400 Bad Request (`INVALID_FILE`) | HTTP 400 Bad Request | **PASS** |
| **9** | Denied security attempts produce attributable audit logs (AC-08 / FR-15) | Audit log count incremented with `DENIED` | Audit logged with actor IP | **PASS** |
| **10** | Authorized user performing permitted download (AC-10) | HTTP 200 OK + Streamed file bytes | HTTP 200 Streamed | **PASS** |

**Summary: 10 Passed, 0 Failed, 0 Skipped.**
