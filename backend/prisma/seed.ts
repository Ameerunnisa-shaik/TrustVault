import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

const prisma = new PrismaClient();

async function main() {
  console.log('--- Seeding TrustVault Database ---');

  // Clear existing data in reverse order of relationships
  await prisma.auditLog.deleteMany();
  await prisma.documentPermission.deleteMany();
  await prisma.document.deleteMany();
  await prisma.membership.deleteMany();
  await prisma.company.deleteMany();
  await prisma.user.deleteMany();

  const passwordHash = await bcrypt.hash('Password123!', 10);

  // 1. Create Companies (Tenants)
  const acme = await prisma.company.create({
    data: {
      id: 'comp_acme_001',
      name: 'Acme Corporation',
      slug: 'acme-corp',
    },
  });

  const cyberdyne = await prisma.company.create({
    data: {
      id: 'comp_cyberdyne_002',
      name: 'CyberDyne Systems',
      slug: 'cyberdyne',
    },
  });

  console.log('Created companies:', acme.name, cyberdyne.name);

  // 2. Create Users
  const alice = await prisma.user.create({
    data: {
      id: 'user_alice_001',
      email: 'alice@acme.com',
      passwordHash,
      fullName: 'Alice Walker (Acme Admin)',
    },
  });

  const bob = await prisma.user.create({
    data: {
      id: 'user_bob_002',
      email: 'bob@acme.com',
      passwordHash,
      fullName: 'Bob Martinez (Acme Member)',
    },
  });

  const carol = await prisma.user.create({
    data: {
      id: 'user_carol_003',
      email: 'carol@acme.com',
      passwordHash,
      fullName: 'Carol Danvers (Acme Viewer)',
    },
  });

  const david = await prisma.user.create({
    data: {
      id: 'user_david_004',
      email: 'david@cyberdyne.com',
      passwordHash,
      fullName: 'David Vance (CyberDyne Admin)',
    },
  });

  const eve = await prisma.user.create({
    data: {
      id: 'user_eve_005',
      email: 'eve@cyberdyne.com',
      passwordHash,
      fullName: 'Eve Moneypenny (CyberDyne Member)',
    },
  });

  console.log('Created users: Alice, Bob, Carol, David, Eve');

  // 3. Create Workspace Memberships
  await prisma.membership.createMany({
    data: [
      { userId: alice.id, companyId: acme.id, role: 'ADMIN', status: 'ACTIVE' },
      { userId: bob.id, companyId: acme.id, role: 'MEMBER', status: 'ACTIVE' },
      { userId: carol.id, companyId: acme.id, role: 'VIEWER', status: 'ACTIVE' },
      { userId: david.id, companyId: cyberdyne.id, role: 'ADMIN', status: 'ACTIVE' },
      { userId: eve.id, companyId: cyberdyne.id, role: 'MEMBER', status: 'ACTIVE' },
    ],
  });

  console.log('Assigned tenant roles and memberships');

  // 4. Ensure private storage directory exists and seed physical test files
  const storageDir = path.resolve(__dirname, '../private_storage');
  if (!fs.existsSync(storageDir)) {
    fs.mkdirSync(storageDir, { recursive: true });
  }

  // Create sample document 1: Confidential Financial Report (Acme)
  const fileKey1 = 'doc_storage_' + crypto.randomUUID() + '.pdf';
  const fileContent1 = Buffer.from(
    '%PDF-1.4\n1 0 obj\n<< /Title (Acme Q3 Confidential Financial Audit Report) /Author (Alice) >>\nendobj\ntrailer\n<< /Root 1 0 R >>\n%%EOF'
  );
  fs.writeFileSync(path.join(storageDir, fileKey1), fileContent1);

  const doc1 = await prisma.document.create({
    data: {
      id: 'doc_acme_q3_report',
      companyId: acme.id,
      ownerId: alice.id,
      name: 'Q3 Financial Audit Report',
      originalName: 'Acme_Q3_Financial_Audit.pdf',
      mimeType: 'application/pdf',
      sizeBytes: fileContent1.length,
      storageKey: fileKey1,
      checksum: crypto.createHash('sha256').update(fileContent1).digest('hex'),
    },
  });

  // Create sample document 2: Architecture Blueprint (Acme)
  const fileKey2 = 'doc_storage_' + crypto.randomUUID() + '.txt';
  const fileContent2 = Buffer.from(
    'CONFIDENTIAL TRUSTVAULT SYSTEM ARCHITECTURE:\n- Zero Trust Multi-Tenant Model\n- Backend Enforced RBAC\n- Strict Explicit Document Grants'
  );
  fs.writeFileSync(path.join(storageDir, fileKey2), fileContent2);

  const doc2 = await prisma.document.create({
    data: {
      id: 'doc_acme_arch_spec',
      companyId: acme.id,
      ownerId: alice.id,
      name: 'System Architecture Specification',
      originalName: 'Architecture_Spec_v2.txt',
      mimeType: 'text/plain',
      sizeBytes: fileContent2.length,
      storageKey: fileKey2,
      checksum: crypto.createHash('sha256').update(fileContent2).digest('hex'),
    },
  });

  // Create sample document 3: CyberDyne Classified Blueprint (CyberDyne)
  const fileKey3 = 'doc_storage_' + crypto.randomUUID() + '.txt';
  const fileContent3 = Buffer.from(
    'CYBERDYNE SYSTEMS RESTRICTED - PROJECT NEURAL NET:\nDo not disclose to Acme Corp under any circumstances.'
  );
  fs.writeFileSync(path.join(storageDir, fileKey3), fileContent3);

  const doc3 = await prisma.document.create({
    data: {
      id: 'doc_cyberdyne_blueprint',
      companyId: cyberdyne.id,
      ownerId: david.id,
      name: 'Project Neural Net Blueprints',
      originalName: 'Neural_Net_Blueprints.txt',
      mimeType: 'text/plain',
      sizeBytes: fileContent3.length,
      storageKey: fileKey3,
      checksum: crypto.createHash('sha256').update(fileContent3).digest('hex'),
    },
  });

  console.log('Created sample documents and verified private file storage keys');

  // 5. Explicit Document-Level Permissions
  // Alice grants Bob DOWNLOAD permission on doc1
  await prisma.documentPermission.create({
    data: {
      documentId: doc1.id,
      userId: bob.id,
      permission: 'DOWNLOAD',
      grantedById: alice.id,
    },
  });

  // Alice grants Carol VIEW permission on doc1
  await prisma.documentPermission.create({
    data: {
      documentId: doc1.id,
      userId: carol.id,
      permission: 'VIEW',
      grantedById: alice.id,
    },
  });

  // Alice granted Carol VIEW on doc2, but it has been REVOKED
  await prisma.documentPermission.create({
    data: {
      documentId: doc2.id,
      userId: carol.id,
      permission: 'VIEW',
      grantedById: alice.id,
      revokedAt: new Date(),
    },
  });

  console.log('Created explicit document permissions (grants & revocations)');

  // 6. Audit Trail Events
  await prisma.auditLog.createMany({
    data: [
      {
        companyId: acme.id,
        actorId: alice.id,
        documentId: doc1.id,
        action: 'DOC_UPLOAD',
        outcome: 'SUCCESS',
        ipAddress: '127.0.0.1',
        metadata: JSON.stringify({ filename: doc1.originalName, size: doc1.sizeBytes }),
      },
      {
        companyId: acme.id,
        actorId: alice.id,
        documentId: doc1.id,
        action: 'DOC_SHARE',
        outcome: 'SUCCESS',
        ipAddress: '127.0.0.1',
        metadata: JSON.stringify({ recipientId: bob.id, recipientEmail: bob.email, permission: 'DOWNLOAD' }),
      },
      {
        companyId: acme.id,
        actorId: alice.id,
        documentId: doc2.id,
        action: 'DOC_REVOKE',
        outcome: 'SUCCESS',
        ipAddress: '127.0.0.1',
        metadata: JSON.stringify({ targetUserId: carol.id, reason: 'Project phase completed' }),
      },
      {
        companyId: acme.id,
        actorId: carol.id,
        documentId: doc2.id,
        action: 'DOC_ACCESS_ATTEMPT',
        outcome: 'DENIED',
        ipAddress: '127.0.0.1',
        metadata: JSON.stringify({ error: 'Permission was revoked' }),
      },
      {
        companyId: cyberdyne.id,
        actorId: david.id,
        documentId: doc3.id,
        action: 'DOC_UPLOAD',
        outcome: 'SUCCESS',
        ipAddress: '127.0.0.1',
        metadata: JSON.stringify({ filename: doc3.originalName, size: doc3.sizeBytes }),
      },
    ],
  });

  console.log('Populated realistic audit trail records');
  console.log('--- Database Seeding Complete ---');
}

main()
  .catch((e) => {
    console.error('Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
