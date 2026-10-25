import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { config } from '../config';

// Allowed MIME types and corresponding extensions for secure uploads
export const ALLOWED_MIME_TYPES = new Set([
  'application/pdf',
  'text/plain',
  'text/markdown',
  'text/csv',
  'application/json',
  'image/png',
  'image/jpeg',
  'image/webp',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
]);

export interface SavedFileResult {
  storageKey: string;
  sizeBytes: number;
  checksum: string;
}

export class StorageService {
  private baseDir: string;

  constructor() {
  this.baseDir = config.storageDir;

  // Vercel serverless environment lo local folder create cheyyaku
  if (process.env.VERCEL !== '1') {
    this.ensureDirectoryExists();
  }
}

  private ensureDirectoryExists(): void {
    if (!fs.existsSync(this.baseDir)) {
      fs.mkdirSync(this.baseDir, { recursive: true });
    }
  }

  /**
   * Sanitizes user-supplied filenames to prevent header injection and directory traversal.
   */
  public sanitizeFilename(originalName: string): string {
    const basename = path.basename(originalName);
    // Remove null bytes, path traversal sequences, and dangerous characters
    return basename.replace(/[\x00-\x1f\x7f<>:"/\\|?*]/g, '_').trim() || 'document';
  }

  /**
   * Generates a safe storage key using UUID and safe extension.
   */
  public generateSafeKey(originalName: string): string {
    const ext = path.extname(originalName).toLowerCase().replace(/[^a-z0-9.]/g, '');
    const safeExt = ext.length > 0 && ext.length <= 10 ? ext : '.dat';
    const randomId = crypto.randomUUID();
    return `doc_${randomId}${safeExt}`;
  }

  /**
   * Validates that a file's MIME type and size are within policy.
   */
  public validateFile(mimeType: string, sizeBytes: number): { valid: boolean; error?: string } {
    if (sizeBytes > config.maxFileSizeBytes) {
      return {
        valid: false,
        error: `File size exceeds the permitted limit of ${config.maxFileSizeBytes / (1024 * 1024)}MB`,
      };
    }

    if (!ALLOWED_MIME_TYPES.has(mimeType)) {
      return {
        valid: false,
        error: `File type '${mimeType}' is not allowed for upload`,
      };
    }

    return { valid: true };
  }

  /**
   * Saves a buffer to private storage with a safe generated key.
   */
  public async saveFile(buffer: Buffer, originalName: string): Promise<SavedFileResult> {
    const storageKey = this.generateSafeKey(originalName);
    const resolvedPath = this.resolveSafePath(storageKey);

    const hash = crypto.createHash('sha256').update(buffer).digest('hex');

    await fs.promises.writeFile(resolvedPath, buffer);

    return {
      storageKey,
      sizeBytes: buffer.length,
      checksum: hash,
    };
  }

  /**
   * Resolves a storage key to an absolute path while guaranteeing path containment.
   */
  public resolveSafePath(storageKey: string): string {
    // Prevent path traversal
    if (storageKey.includes('..') || storageKey.includes('/') || storageKey.includes('\\')) {
      throw new Error('Invalid storage key: path traversal detected');
    }

    const resolved = path.resolve(this.baseDir, storageKey);
    // Ensure the resolved path is strictly within the private storage directory
    if (!resolved.startsWith(this.baseDir)) {
      throw new Error('Security violation: path traversal attempt');
    }

    return resolved;
  }

  /**
   * Reads or streams a file from private storage.
   */
  public getFileStream(storageKey: string): fs.ReadStream {
    const filePath = this.resolveSafePath(storageKey);
    if (!fs.existsSync(filePath)) {
      throw new Error('File not found in storage');
    }
    return fs.createReadStream(filePath);
  }

  /**
   * Deletes a file from private storage.
   */
  public async deleteFile(storageKey: string): Promise<void> {
    try {
      const filePath = this.resolveSafePath(storageKey);
      if (fs.existsSync(filePath)) {
        await fs.promises.unlink(filePath);
      }
    } catch (err) {
      console.error(`Failed to delete storage file ${storageKey}:`, err);
    }
  }
}

export const storageService = new StorageService();
