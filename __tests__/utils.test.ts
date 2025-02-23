import fs from 'fs/promises';
import path from 'path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { parseGitignore } from '../src/utils';

describe('parseGitignore', () => {
  const tmpDir = path.join(__dirname, 'tempProject');

  beforeAll(async () => {
    await fs.mkdir(tmpDir, { recursive: true });
    await fs.writeFile(path.join(tmpDir, '.gitignore'), 'node_modules\ndist\n');
  });

  afterAll(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  it('should return an ignore instance when .gitignore exists', async () => {
    const ig = await parseGitignore(tmpDir);
    expect(ig).not.toBeNull();
    expect(ig?.ignores('node_modules')).toBe(true);
    expect(ig?.ignores('dist')).toBe(true);
  });

  it('should return null if .gitignore does not exist', async () => {
    const nonExistentDir = path.join(tmpDir, 'nonexistent');
    const ig = await parseGitignore(nonExistentDir);
    expect(ig).toBeNull();
  });
});
