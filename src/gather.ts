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
    return gatherAll(startDir, startDir, gitignore);
  }
  return gatherByWhitelist(startDir, startDir, whitelist, gitignore);
}

export async function gatherAll(
  startDir: string,
  dirPath: string,
  gitignore: Ignore | null,
): Promise<CollectedItem[]> {
  const results: CollectedItem[] = [];

  try {
    if (await isDirectoryAssetsOnly(dirPath)) {
      return [{ type: 'dir-assets-only', path: dirPath }];
    }
  } catch (err) {
    console.error(`Error checking directory assets in ${dirPath}:`, err);

    throw err;
  }

  let items;
  try {
    items = await fs.readdir(dirPath, { withFileTypes: true });
  } catch (err) {
    console.error(`Error reading directory ${dirPath}:`, err);
    throw err;
  }

  for (const item of items) {
    const name = item.name;
    const fullPath = path.join(dirPath, name);
    const relativePath = path.relative(startDir, fullPath);

    if (
      IGNORE_LIST.has(name) ||
      isEnvFile(name) ||
      (gitignore && gitignore.ignores(relativePath))
    ) {
      continue;
    }

    if (item.isDirectory()) {
      try {
        const subResults = await gatherAll(startDir, fullPath, gitignore);
        results.push(...subResults);
      } catch (err) {
        console.error(`Error processing subdirectory ${fullPath}:`, err);

        throw err;
      }
    } else {
      results.push({ type: 'file', path: fullPath });
    }
  }

  return results;
}

export async function gatherByWhitelist(
  startDir: string,
  dirPath: string,
  whitelist: string[],
  gitignore: Ignore | null,
): Promise<CollectedItem[]> {
  const results: CollectedItem[] = [];

  if (!isDirNeeded(dirPath, whitelist)) {
    return results;
  }

  let items;
  try {
    items = await fs.readdir(dirPath, { withFileTypes: true });
  } catch (err) {
    console.error(`Error reading directory ${dirPath}:`, err);

    throw err;
  }

  for (const item of items) {
    const name = item.name;
    const fullPath = path.join(dirPath, name);
    const relativePath = path.relative(startDir, fullPath);

    if (
      IGNORE_LIST.has(name) ||
      isEnvFile(name) ||
      (gitignore && gitignore.ignores(relativePath))
    ) {
      continue;
    }

    if (item.isDirectory()) {
      try {
        const subResults = await gatherByWhitelist(startDir, fullPath, whitelist, gitignore);
        results.push(...subResults);
      } catch (err) {
        console.error(`Error processing subdirectory ${fullPath}:`, err);

        throw err;
      }
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
