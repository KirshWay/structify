import fs from 'fs/promises';
import { Ignore } from 'ignore';
import path from 'path';
import { IGNORE_LIST, isEnvFile } from './constants.js';
import { isDirectoryAssetsOnly } from './resourceCheck.js';

export type CollectedItem = {
  type: 'file' | 'dir-assets-only';
  path: string;
};

export async function readDirectoryRecursive(
  startDir: string,
  whitelist: string[],
  gitignore: Ignore | null,
): Promise<CollectedItem[]> {
  if (whitelist.length === 0) {
    return gatherAll(startDir, gitignore);
  }
  return gatherByWhitelist(startDir, whitelist, gitignore);
}

export async function gatherAll(
  dirPath: string,
  gitignore: Ignore | null,
): Promise<CollectedItem[]> {
  const results: CollectedItem[] = [];

  if (await isDirectoryAssetsOnly(dirPath)) {
    return [{ type: 'dir-assets-only', path: dirPath }];
  }

  const items = await fs.readdir(dirPath, { withFileTypes: true });

  for (const item of items) {
    const name = item.name;
    const fullPath = path.join(dirPath, name);

    if (IGNORE_LIST.has(name)) continue;

    if (isEnvFile(name)) continue;

    if (gitignore && gitignore.ignores(path.relative(dirPath, fullPath))) continue;

    if (item.isDirectory()) {
      const subResults = await gatherAll(fullPath, gitignore);
      results.push(...subResults);
    } else {
      results.push({ type: 'file', path: fullPath });
    }
  }

  return results;
}

export async function gatherByWhitelist(
  dirPath: string,
  whitelist: string[],
  gitignore: Ignore | null,
): Promise<CollectedItem[]> {
  const results: CollectedItem[] = [];

  if (!isDirNeeded(dirPath, whitelist)) {
    return results;
  }

  const items = await fs.readdir(dirPath, { withFileTypes: true });

  for (const item of items) {
    const name = item.name;
    const fullPath = path.join(dirPath, name);

    if (IGNORE_LIST.has(name)) continue;

    if (isEnvFile(name)) continue;

    if (gitignore && gitignore.ignores(path.relative(dirPath, fullPath))) {
      continue;
    }

    if (item.isDirectory()) {
      const subResults = await gatherByWhitelist(fullPath, whitelist, gitignore);
      results.push(...subResults);
    } else if (isFileInWhitelist(fullPath, whitelist)) {
      results.push({ type: 'file', path: fullPath });
    }
  }

  return results;
}

function isDirNeeded(dirPath: string, whitelist: string[]): boolean {
  if (whitelist.length === 0) {
    return true;
  }
  for (const allowedPath of whitelist) {
    if (allowedPath === dirPath) {
      return true;
    }
    if (allowedPath.startsWith(dirPath + path.sep)) {
      return true;
    }
  }
  return false;
}

function isFileInWhitelist(filePath: string, whitelist: string[]): boolean {
  if (whitelist.length === 0) {
    return true;
  }
  for (const allowed of whitelist) {
    if (filePath === allowed) {
      return true;
    }
    if (filePath.startsWith(allowed + path.sep)) {
      return true;
    }
  }
  return false;
}
