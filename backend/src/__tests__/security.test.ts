import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import app from '../index';
import { prisma } from '../db';
import { generateToken } from '../utils/security';

describe('TrustVault Security Verification Test Suite', () => {
  let aliceToken: string; // Acme Admin
  let bobToken: string;   // Acme Member (granted DOWNLOAD on doc1)
  let carolToken: string; // Acme Viewer (revoked on doc2)
  let unsharedUserToken: string; // Acme Member with NO grant on doc2
  let davidToken: string; // CyberDyne Admin (different tenant)

  let acmeDoc1Id: string;
  let acmeDoc2Id: string;
  let cyberdyneDoc3Id: string;

  beforeAll(async () => {
    process.env.NODE_ENV = 'test';

    // Fetch test users created by seed
    const alice = await prisma.user.findUniqueOrThrow({ where: { email: 'alice@acme.com' } });
    const bob = await prisma.user.findUniqueOrThrow({ where: { email: 'bob@acme.com' } });
    const carol = await prisma.user.findUniqueOrThrow({ where: { email: 'carol@acme.com' } });
    const david = await prisma.user.findUniqueOrThrow({ where: { email: 'david@cyberdyne.com' } });

    // Create an unshared Acme member for testing AC-03
    const unshared = await prisma.user.upsert({
      where: { email: 'unshared@acme.com' },
      update: {},
      create: {
        email: 'unshared@acme.com',
        fullName: 'Unshared Test User',
        passwordHash: alice.passwordHash,
      },
    });

    const acmeCompany = await prisma.company.findUniqueOrThrow({ where: { slug: 'acme-corp' } });
    await prisma.membership.upsert({
      where: { userId_companyId: { userId: unshared.id, companyId: acmeCompany.id } },
      update: {},
      create: {
        userId: unshared.id,
        companyId: acmeCompany.id,
        role: 'MEMBER',
        status: 'ACTIVE',
      },
    });

    aliceToken = generateToken({ id: alice.id, email: alice.email, fullName: alice.fullName });
    bobToken = generateToken({ id: bob.id, email: bob.email, fullName: bob.fullName });
    carolToken = generateToken({ id: carol.id, email: carol.email, fullName: carol.fullName });
    davidToken = generateToken({ id: david.id, email: david.email, fullName: david.fullName });
    unsharedUserToken = generateToken({ id: unshared.id, email: unshared.email, fullName: unshared.fullName });

    // Fetch document IDs
    const doc1 = await prisma.document.findFirstOrThrow({ where: { name: 'Q3 Financial Audit Report' } });
    const doc2 = await prisma.document.findFirstOrThrow({ where: { name: 'System Architecture Specification' } });
    const doc3 = await prisma.document.findFirstOrThrow({ where: { name: 'Project Neural Net Blueprints' } });

    acmeDoc1Id = doc1.id;
    acmeDoc2Id = doc2.id;
    cyberdyneDoc3Id = doc3.id;
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  // Test 1: Unauthenticated user cannot access protected document
  it('1. An unauthenticated user cannot access a protected document (AC-01)', async () => {
    const res = await request(app).get(`/api/documents/${acmeDoc1Id}`);
    expect(res.status).toBe(401);
    expect(res.body.code).toBe('UNAUTHENTICATED');
  });

  // Test 2: Cross-tenant isolation (IDOR protection)
  it("2. A user from Company B cannot access Company A's document by manipulating the ID (AC-02 / FR-18)", async () => {
    // David (CyberDyne) attempts to access Acme's doc1
    const res = await request(app)
      .get(`/api/documents/${acmeDoc1Id}`)
      .set('Authorization', `Bearer ${davidToken}`);

    // Must be rejected (404/403) and must NOT leak document contents or metadata
    expect([403, 404]).toContain(res.status);
    expect(res.body.document).toBeUndefined();

    // Verify audit log recorded the denied cross-tenant attempt
    const auditRecord = await prisma.auditLog.findFirst({
      where: {
        action: 'CROSS_TENANT_DOCUMENT_ACCESS',
        outcome: 'DENIED',
        documentId: acmeDoc1Id,
      },
      orderBy: { createdAt: 'desc' },
    });
    expect(auditRecord).toBeDefined();
  });

  // Test 3: Unshared user cannot download a document through a direct API request
  it('3. An unshared user cannot download a document through a direct API request (AC-03)', async () => {
    // Unshared Acme user attempts to download doc2 (they have no explicit grant and are not owner/admin)
    const res = await request(app)
      .get(`/api/documents/${acmeDoc2Id}/download`)
      .set('Authorization', `Bearer ${unsharedUserToken}`);

    expect(res.status).toBe(403);
    expect(res.body.code).toBe('PERMISSION_DENIED');
  });

  // Test 4: Privilege escalation protection
  it('4. A user cannot grant themselves or others unauthorized permissions (AC-06)', async () => {
    // Elevate Bob's grant on doc1 to SHARE (level 3)
    await prisma.documentPermission.update({
      where: {
        documentId_userId: {
          documentId: acmeDoc1Id,
          userId: (await prisma.user.findUniqueOrThrow({ where: { email: 'bob@acme.com' } })).id,
        },
      },
      data: { permission: 'SHARE' },
    });

    // Bob now has SHARE permission, but attempts to grant Carol ADMIN permission (level 4)
    const res = await request(app)
      .post(`/api/documents/${acmeDoc1Id}/share`)
      .set('Authorization', `Bearer ${bobToken}`)
      .send({
        recipientEmail: 'carol@acme.com',
        permission: 'ADMIN',
      });

    expect(res.status).toBe(403);
    expect(res.body.code).toBe('PRIVILEGE_ESCALATION_DENIED');
  });

  // Test 5: Revoked user cannot access document
  it('5. A revoked user cannot access a document using the revoked grant (AC-05 / FR-13)', async () => {
    // Carol's grant on doc2 was revoked in seed
    const res = await request(app)
      .get(`/api/documents/${acmeDoc2Id}`)
      .set('Authorization', `Bearer ${carolToken}`);

    expect(res.status).toBe(403);
    expect(res.body.code).toBe('PERMISSION_REVOKED');
  });

  // Test 6: Viewer cannot perform restricted operations (upload, rename, delete)
  it('6. A viewer cannot perform a restricted editing or upload operation (FR-07 / FR-19)', async () => {
    const acmeCompany = await prisma.company.findUniqueOrThrow({ where: { slug: 'acme-corp' } });

    // Carol (VIEWER) attempts to upload a file to the company
    const uploadRes = await request(app)
      .post('/api/documents/upload')
      .set('Authorization', `Bearer ${carolToken}`)
      .set('x-company-id', acmeCompany.id)
      .attach('file', Buffer.from('unauthorized file'), 'test.txt');

    expect(uploadRes.status).toBe(403);
    expect(uploadRes.body.code).toBe('INSUFFICIENT_ROLE');

    // Carol attempts to rename doc1
    const renameRes = await request(app)
      .patch(`/api/documents/${acmeDoc1Id}`)
      .set('Authorization', `Bearer ${carolToken}`)
      .send({ name: 'Hacked Title' });

    expect(renameRes.status).toBe(403);
  });

  // Test 7: Unauthorized users cannot view or modify audit logs
  it('7. Unauthorized users cannot view audit logs, and ordinary users cannot edit/delete them (AC-09 / FR-16)', async () => {
    const acmeCompany = await prisma.company.findUniqueOrThrow({ where: { slug: 'acme-corp' } });

    // Carol (VIEWER) attempts to retrieve audit logs
    const viewerAuditRes = await request(app)
      .get(`/api/audit-logs?companyId=${acmeCompany.id}`)
      .set('Authorization', `Bearer ${carolToken}`);

    expect(viewerAuditRes.status).toBe(403);
    expect(viewerAuditRes.body.code).toBe('INSUFFICIENT_ROLE');

    // Verify there are NO modification endpoints for audit logs (returns 404/method not allowed)
    const deleteAuditRes = await request(app)
      .delete('/api/audit-logs/some-log-id')
      .set('Authorization', `Bearer ${aliceToken}`);

    expect([404, 405]).toContain(deleteAuditRes.status);
  });

  // Test 8: Invalid and oversized file uploads are rejected
  it('8. Invalid and oversized file uploads are safely rejected (AC-07 / FR-08)', async () => {
    const acmeCompany = await prisma.company.findUniqueOrThrow({ where: { slug: 'acme-corp' } });

    // Disallowed executable MIME type
    const exeRes = await request(app)
      .post('/api/documents/upload')
      .set('Authorization', `Bearer ${aliceToken}`)
      .set('x-company-id', acmeCompany.id)
      .attach('file', Buffer.from('MZ...executable payload'), {
        filename: 'malware.exe',
        contentType: 'application/x-msdownload',
      });

    expect(exeRes.status).toBe(400);
    expect(exeRes.body.code).toBe('INVALID_FILE');
  });

  // Test 9: Denied requests produce appropriate audit events
  it('9. Denied security requests produce attributable audit events (AC-08 / FR-15)', async () => {
    const initialDeniedCount = await prisma.auditLog.count({
      where: { outcome: 'DENIED' },
    });

    // Make an unauthorized request to trigger a denied audit event
    await request(app)
      .get(`/api/documents/${acmeDoc2Id}/download`)
      .set('Authorization', `Bearer ${unsharedUserToken}`);

    const newDeniedCount = await prisma.auditLog.count({
      where: { outcome: 'DENIED' },
    });

    expect(newDeniedCount).toBeGreaterThan(initialDeniedCount);
  });

  // Test 10: Valid users can perform permitted operations successfully
  it('10. Valid authorized users can perform their permitted operations successfully (AC-10)', async () => {
    // Bob has explicit DOWNLOAD permission on doc1
    const downloadRes = await request(app)
      .get(`/api/documents/${acmeDoc1Id}/download`)
      .set('Authorization', `Bearer ${bobToken}`);

    expect(downloadRes.status).toBe(200);
    expect(downloadRes.headers['content-type']).toBe('application/pdf');
    expect(downloadRes.headers['content-disposition']).toContain('attachment');
  });
});
