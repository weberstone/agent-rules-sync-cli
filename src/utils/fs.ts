/**
 * File system helpers.
 *
 * Thin async wrappers around `node:fs/promises`. All file I/O in the
 * application goes through these functions — never import `fs` directly
 * in other modules. This makes it easy to add logging, error handling,
 * or swap implementations without touching every file.
 */

import fs from 'node:fs/promises';

/** Read a UTF-8 text file. Throws on error (caller handles ENOENT etc.). */
export async function readTextFile(filePath: string): Promise<string> {
  return fs.readFile(filePath, 'utf-8');
}

/** Write a UTF-8 text file, overwriting if it exists. */
export async function writeTextFile(filePath: string, content: string): Promise<void> {
  return fs.writeFile(filePath, content, 'utf-8');
}

/** Create a directory recursively (like `mkdir -p`). No-op if it already exists. */
export async function ensureDir(dirPath: string): Promise<void> {
  await fs.mkdir(dirPath, { recursive: true });
}

/** Check whether a file or directory exists at the given path. */
export async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.stat(filePath);
    return true;
  } catch {
    return false;
  }
}

/**
 * Type guard for POSIX ENOENT errors (file/directory not found).
 * Use to distinguish "not found" (expected) from real errors like EACCES.
 */
export function isEnoent(err: unknown): boolean {
  return (err as NodeJS.ErrnoException).code === 'ENOENT';
}
