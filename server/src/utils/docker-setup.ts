import * as fs from 'fs/promises';
import * as path from 'path';

/**
 * Ensure Docker execution environment is properly configured
 */
export async function ensureDockerEnvironment(): Promise<void> {
  const baseDir = '/tmp/codesaga';
  
  try {
    // Create base directory with proper permissions
    await fs.mkdir(baseDir, { recursive: true, mode: 0o755 });
    
    // Verify directory is writable
    await fs.access(baseDir, fs.constants.W_OK);
    
    console.log(`[Docker Setup] Base directory ready: ${baseDir}`);
  } catch (error) {
    console.error('[Docker Setup] Failed to create base directory:', error);
    throw new Error(`Cannot create Docker execution directory: ${baseDir}`);
  }
}

/**
 * Cleanup old execution directories
 */
export async function cleanupOldExecutions(): Promise<void> {
  const baseDir = '/tmp/codesaga';
  
  try {
    const entries = await fs.readdir(baseDir, { withFileTypes: true });
    const now = Date.now();
    const maxAge = 3600000; // 1 hour
    
    for (const entry of entries) {
      if (entry.isDirectory() && entry.name.startsWith('exec-')) {
        const dirPath = path.join(baseDir, entry.name);
        try {
          const stats = await fs.stat(dirPath);
          if (now - stats.mtimeMs > maxAge) {
            await fs.rm(dirPath, { recursive: true, force: true });
            console.log(`[Docker Cleanup] Removed old directory: ${entry.name}`);
          }
        } catch {
          // Ignore errors for individual directories
        }
      }
    }
  } catch (error) {
    // Base directory doesn't exist yet, ignore
  }
}
